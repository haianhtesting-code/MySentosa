import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runApproverReminderScan, runDocumentAndExpiryReminderScan } from "@/lib/nopReminderEngine";
import { loadStoredNotifications, DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/nopNotifications";
import { NOPApplication } from "@/lib/nopData";
import { installBrowserGlobals, uninstallBrowserGlobals } from "./testBrowserGlobals";

// Both scans persist de-duplication state to localStorage, and
// dispatchNopNotification only writes to localStorage when `window` exists —
// so we install the in-memory browser shim and read the real dispatched
// notifications back out, rather than mocking dispatchNopNotification.
function notificationsFor(nopId: string, triggerCode: string) {
  return loadStoredNotifications().filter((n) => n.nopId === nopId && n.triggerCode === triggerCode);
}

function makeNop(overrides: Partial<NOPApplication>): NOPApplication {
  return {
    id: "SEN/NP/20260920/999",
    companyName: "Test Contractor Pte Ltd",
    companyUen: "199801234K",
    applicantName: "Test Applicant",
    applicantPhone: "+65 9000 0000",
    applicantEmail: "applicant@testco.sg",
    workDescription: "Test works",
    durationCategory: "Ad-hoc Work",
    location: "Test Location",
    zone: "Sector 1 (North Siloso)",
    startDateTime: "2026-09-01T08:00:00",
    endDateTime: "2026-12-01T18:00:00",
    workingHours: "08:00 - 18:00",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Draft",
    permitStatus: "Upcoming",
    ipaStatus: "N/A",
    documentCompletion: "Documents Outstanding",
    triggers: [],
    documents: [],
    workers: [],
    sdcLiaisonOfficer: "Test LO",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [],
    submittedAt: "2026-09-19 12:00",
    ...overrides
  } as unknown as NOPApplication;
}

describe("runApproverReminderScan", () => {
  beforeEach(() => installBrowserGlobals());
  afterEach(() => uninstallBrowserGlobals());

  // FRD §8.3 / T18: a reminder is dispatched once a configured reminder
  // interval (default 24h) has elapsed on a still-pending approval step.
  it("dispatches NOTIF-18 once for an approval step overdue past the reminder interval, and does not double-dispatch on a repeat scan with identical state", () => {
    const now = new Date("2026-09-20T12:00:00");
    const nop = makeNop({
      id: "SEN/NP/RE-01",
      applicationStatus: "Under Review",
      submittedAt: "2026-09-19 06:00", // 30h before `now`: past the 24h reminder interval, short of the 48h escalation threshold
      domainApprovals: [
        { domain: "WSH Safety Approver", approverName: "Wong Siew Leng", approverRole: "Head, WSH", status: "Pending" }
      ]
    });

    const first = runApproverReminderScan([nop], DEFAULT_NOTIFICATION_SETTINGS, now);
    expect(first.remindersSent).toBe(1);
    expect(first.escalationsSent).toBe(0);
    expect(notificationsFor(nop.id, "NOTIF-18")).toHaveLength(1);

    // Re-running the scan with the exact same NOP state and "now" must not re-dispatch.
    const second = runApproverReminderScan([nop], DEFAULT_NOTIFICATION_SETTINGS, now);
    expect(second.remindersSent).toBe(0);
    expect(notificationsFor(nop.id, "NOTIF-18")).toHaveLength(1);
  });

  // FRD §8.3 / T19: once the escalation threshold (default 48h) is reached,
  // an escalation is dispatched once to the approver + designated manager.
  it("dispatches NOTIF-19 escalation once a step passes the escalation threshold, and only once", () => {
    const now = new Date("2026-09-21T12:00:00");
    const nop = makeNop({
      id: "SEN/NP/RE-02",
      applicationStatus: "Under Review",
      submittedAt: "2026-09-19 06:00", // 54h before `now`: past the 48h escalation threshold
      domainApprovals: [
        { domain: "WSH Safety Approver", approverName: "Wong Siew Leng", approverRole: "Head, WSH", status: "Pending" }
      ]
    });

    const first = runApproverReminderScan([nop], DEFAULT_NOTIFICATION_SETTINGS, now);
    expect(first.escalationsSent).toBe(1);
    expect(notificationsFor(nop.id, "NOTIF-19")).toHaveLength(1);

    const second = runApproverReminderScan([nop], DEFAULT_NOTIFICATION_SETTINGS, now);
    expect(second.escalationsSent).toBe(0);
    expect(notificationsFor(nop.id, "NOTIF-19")).toHaveLength(1);
  });

  it("dispatches nothing for a NOP with no pending approval steps or not Under Review", () => {
    const now = new Date("2026-09-25T12:00:00");
    const approvedNop = makeNop({
      id: "SEN/NP/RE-03",
      applicationStatus: "Approved",
      submittedAt: "2026-09-01 06:00",
      domainApprovals: [{ domain: "WSH Safety Approver", approverName: "Wong Siew Leng", approverRole: "Head, WSH", status: "Approved" }]
    });
    const result = runApproverReminderScan([approvedNop], DEFAULT_NOTIFICATION_SETTINGS, now);
    expect(result.scannedSteps).toBe(0);
    expect(result.remindersSent).toBe(0);
    expect(result.escalationsSent).toBe(0);
  });
});

describe("runDocumentAndExpiryReminderScan", () => {
  beforeEach(() => installBrowserGlobals());
  afterEach(() => uninstallBrowserGlobals());

  // FRD NOTIF-20: Urgent NOP document-completion deadline missed.
  it("dispatches NOTIF-20 exactly once for a NOP past its document deadline with documents still outstanding", () => {
    const now = new Date("2026-09-20T12:00:00");
    const nop = makeNop({
      id: "SEN/NP/DE-01",
      applicationStatus: "Approved",
      isUrgent: true,
      ipaStatus: "Granted",
      documentCompletion: "Overdue",
      documentDeadline: "2026-09-19T18:00:00", // in the past relative to `now`
      startDateTime: "2026-09-15T08:00:00",
      endDateTime: "2026-12-01T18:00:00" // far from expiry, so NOTIF-26 does not also fire
    });

    const first = runDocumentAndExpiryReminderScan([nop], DEFAULT_NOTIFICATION_SETTINGS, now);
    expect(first.deadlineMissedRemindersSent).toBe(1);
    expect(notificationsFor(nop.id, "NOTIF-20")).toHaveLength(1);

    const second = runDocumentAndExpiryReminderScan([nop], DEFAULT_NOTIFICATION_SETTINGS, now);
    expect(second.deadlineMissedRemindersSent).toBe(0);
    expect(notificationsFor(nop.id, "NOTIF-20")).toHaveLength(1);
  });

  // FRD NOTIF-26: permit validity approaching expiry within the configured lead time (default 3 days).
  it("dispatches NOTIF-26 exactly once for an Approved permit within the expiry lead window", () => {
    const now = new Date("2026-09-20T12:00:00");
    const nop = makeNop({
      id: "SEN/NP/DE-02",
      applicationStatus: "Approved",
      documentCompletion: "Documents Complete",
      startDateTime: "2026-09-01T08:00:00",
      endDateTime: "2026-09-22T12:00:00" // 2 days out, within the default 3-day lead time
    });

    const first = runDocumentAndExpiryReminderScan([nop], DEFAULT_NOTIFICATION_SETTINGS, now);
    expect(first.expiryRemindersSent).toBe(1);
    expect(notificationsFor(nop.id, "NOTIF-26")).toHaveLength(1);

    const second = runDocumentAndExpiryReminderScan([nop], DEFAULT_NOTIFICATION_SETTINGS, now);
    expect(second.expiryRemindersSent).toBe(0);
    expect(notificationsFor(nop.id, "NOTIF-26")).toHaveLength(1);
  });

  it("dispatches nothing for a NOP with no matching condition (Draft, no IPA, validity far from expiry)", () => {
    const now = new Date("2026-09-20T12:00:00");
    const nop = makeNop({
      id: "SEN/NP/DE-03",
      applicationStatus: "Draft",
      ipaStatus: "N/A",
      documentCompletion: "Documents Outstanding",
      startDateTime: "2026-11-01T08:00:00",
      endDateTime: "2026-12-01T18:00:00"
    });
    const result = runDocumentAndExpiryReminderScan([nop], DEFAULT_NOTIFICATION_SETTINGS, now);
    expect(result.deadlineMissedRemindersSent).toBe(0);
    expect(result.expiryRemindersSent).toBe(0);
    expect(notificationsFor(nop.id, "NOTIF-20")).toHaveLength(0);
    expect(notificationsFor(nop.id, "NOTIF-26")).toHaveLength(0);
  });
});
