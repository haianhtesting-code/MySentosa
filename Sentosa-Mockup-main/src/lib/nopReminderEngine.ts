// Sentosa NOP Module — Approver reminder & escalation engine
// Closes I-13: turns the configured reminder interval and escalation threshold
// into notifications that are actually dispatched, instead of settings that
// are only stored.
//
// The mockup has no background server, so the scan runs when the NOP screens
// mount and whenever the operator advances the demo clock.

import { NOPApplication, derivePermitStatus } from "./nopData";
import {
  NotificationSettingsConfig,
  loadStoredNotificationSettings,
  dispatchNopNotification
} from "./nopNotifications";
import { recordNopAudit } from "./nopAudit";
import { getUsers } from "./users";

let reminderStateCache: string | null = null;
let clockOffsetCache: string | null = null;
let docExpiryStateCache: string | null = null;
const REMINDER_STATE_KEY = "sdc_nop_reminder_state_v1";
const CLOCK_OFFSET_KEY = "sdc_nop_clock_offset_ms";
const DOC_EXPIRY_STATE_KEY = "sdc_nop_doc_expiry_reminder_state_v1";

export interface ReminderStepState {
  remindersSent: number;
  lastRemindedAt?: string;
  escalatedAt?: string;
  firstPendingAt?: string;
}

export type ReminderState = Record<string, ReminderStepState>;

const stepKey = (nopId: string, domain: string) => `${nopId}::${domain}`;

export function loadReminderState(): ReminderState {
  if (typeof window === "undefined") return {};
  try {
    const raw = reminderStateCache;
    return raw ? (JSON.parse(raw) as ReminderState) : {};
  } catch {
    return {};
  }
}

export function saveReminderState(state: ReminderState): void {
  if (typeof window === "undefined") return;
  try {
    reminderStateCache = JSON.stringify(state);
  } catch {}
}

/** Demo clock offset in milliseconds, used to fast-forward without waiting. */
export function getClockOffsetMs(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(clockOffsetCache || "0") || 0;
  } catch {
    return 0;
  }
}

export function setClockOffsetMs(ms: number): void {
  if (typeof window === "undefined") return;
  try {
    clockOffsetCache = String(Math.max(0, ms));
  } catch {}
}

export function advanceClockHours(hours: number): number {
  const next = getClockOffsetMs() + hours * 3600_000;
  setClockOffsetMs(next);
  return next;
}

export function resetClock(): void {
  setClockOffsetMs(0);
}

/** Effective "now" for the engine: real time plus any demo offset. */
export function engineNow(): Date {
  return new Date(Date.now() + getClockOffsetMs());
}

function parseWhen(value?: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/^Saved as Draft on\s+/i, "").trim();
  const t = new Date(cleaned.replace(" ", "T")).getTime();
  return isNaN(t) ? null : t;
}

/** When the approval step started waiting. */
function pendingSince(nop: NOPApplication): number | null {
  return parseWhen(nop.updatedAt) ?? parseWhen(nop.submittedAt) ?? parseWhen(nop.createdAt);
}

export interface ReminderScanResult {
  scannedSteps: number;
  remindersSent: number;
  escalationsSent: number;
  details: {
    nopId: string;
    domain: string;
    approver: string;
    hoursWaiting: number;
    action: "reminder" | "escalation";
  }[];
}

/**
 * Scans every approval step still awaiting a decision and dispatches:
 *  - a reminder each time a further `approverReminderIntervalHours` elapses
 *  - one escalation to the approver and the designated manager once
 *    `approverEscalationThresholdHours` is reached
 * Reminders stop as soon as the step leaves the review stage.
 */
export function runApproverReminderScan(
  applications: NOPApplication[],
  settings?: NotificationSettingsConfig,
  now?: Date
): ReminderScanResult {
  const cfg = settings || loadStoredNotificationSettings();
  const current = (now || engineNow()).getTime();
  const state = loadReminderState();
  const result: ReminderScanResult = { scannedSteps: 0, remindersSent: 0, escalationsSent: 0, details: [] };

  const intervalMs = Math.max(1, cfg.approverReminderIntervalHours) * 3600_000;
  const escalationMs = Math.max(1, cfg.approverEscalationThresholdHours) * 3600_000;

  const liveKeys = new Set<string>();

  applications.forEach((nop) => {
    if (nop.applicationStatus !== "Under Review") return;
    (nop.domainApprovals || []).forEach((step) => {
      if (step.status !== "Pending") return;
      result.scannedSteps += 1;

      const key = stepKey(nop.id, step.domain);
      liveKeys.add(key);

      const allUsers = getUsers();
      let apprEmail = "";
      const apprName = (step.approverName || "").toLowerCase();
      const matchedApprUser = allUsers.find(
        (u) => u.role === "Technical Approver" && (apprName.includes(u.name.toLowerCase()) || u.name.toLowerCase().includes(apprName))
      );
      if (matchedApprUser) {
        apprEmail = matchedApprUser.email;
      } else {
        const matchedDeptUser = allUsers.find(
          (u) => u.role === "Technical Approver" && (
            (step.approverGroup && (u.department.toLowerCase().includes(step.approverGroup.toLowerCase()) || u.orgUnit.toLowerCase().includes(step.approverGroup.toLowerCase()))) ||
            (step.domain && (u.department.toLowerCase().includes(step.domain.toLowerCase()) || u.orgUnit.toLowerCase().includes(step.domain.toLowerCase())))
          )
        );
        if (matchedDeptUser) {
          apprEmail = matchedDeptUser.email;
        } else {
          apprEmail = `${(step.approverGroup || step.approverName || "approver").toLowerCase().replace(/[^a-z0-9]+/g, ".")}@sdc.gov.sg`;
        }
      }

      const entry: ReminderStepState = state[key] || { remindersSent: 0 };
      if (!entry.firstPendingAt) {
        entry.firstPendingAt = (step as any).pendingSince || nop.submittedAt || nop.createdAt || new Date(current).toISOString();
      }
      const stepSinceMs = entry.firstPendingAt ? new Date(entry.firstPendingAt).getTime() : current;
      const waited = current - stepSinceMs;
      if (waited <= 0) return;
      const hoursWaiting = Math.floor(waited / 3600_000);

      // Reminder: one per elapsed interval, never more than one per scan.
      const due = Math.floor(waited / intervalMs);
      if (due > entry.remindersSent) {
        entry.remindersSent = due;
        entry.lastRemindedAt = new Date(current).toISOString();
        dispatchNopNotification({
          triggerCode: "NOTIF-18",
          nopId: nop.id,
          companyName: nop.companyName,
          recipientRole: step.approverRole || "Technical Approver",
          recipientEmail: apprEmail,
          subject: `Approval action outstanding: ${nop.id}`,
          content: `${step.domain} clearance has been awaiting a decision for ${hoursWaiting}h. Reminder ${due} of the configured ${cfg.approverReminderIntervalHours}h cycle.`
        });
        result.remindersSent += 1;
        result.details.push({ nopId: nop.id, domain: step.domain, approver: step.approverName, hoursWaiting, action: "reminder" });
      }

      // Escalation: once only, to the approver and the designated manager.
      if (waited >= escalationMs && !entry.escalatedAt) {
        entry.escalatedAt = new Date(current).toISOString();
        const manager =
          cfg.designatedManagers[step.approverGroup || ""] ||
          cfg.designatedManagers[step.domain || ""] ||
          cfg.designatedManagers["SDC Central Operations Group"] ||
          "Daniel Lim (Director Island Operations - daniel.lim@sdc.gov.sg)";
        const mgrEmail = manager.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || "daniel.lim@sdc.gov.sg";

        dispatchNopNotification({
          triggerCode: "NOTIF-19",
          nopId: nop.id,
          companyName: nop.companyName,
          recipientRole: `${step.approverRole || "Technical Approver"} & ${manager}`,
          recipientEmail: `${apprEmail}, ${mgrEmail}`,
          subject: `Escalation: ${nop.id} clearance overdue beyond ${cfg.approverEscalationThresholdHours}h`,
          content: `${step.domain} clearance has been outstanding for ${hoursWaiting}h, past the ${cfg.approverEscalationThresholdHours}h escalation threshold. Escalated to designated manager: ${manager}.\nPermit dossier: /nops/${nop.id}`
        });
        result.escalationsSent += 1;
        result.details.push({ nopId: nop.id, domain: step.domain, approver: step.approverName, hoursWaiting, action: "escalation" });
      }

      state[key] = entry;
    });
  });

  // Steps that left the review stage stop reminding and drop their state.
  Object.keys(state).forEach((k) => {
    if (!liveKeys.has(k)) delete state[k];
  });

  saveReminderState(state);
  return result;
}

/**
 * Per-NOP de-duplication state for the document-deadline / expiry scan below.
 * Mirrors the pattern used by `ReminderState` above (a persisted flag keyed
 * by record id, checked before dispatching so a re-run of the scan never
 * sends the same one-shot notification twice).
 */
export interface DocExpiryRecordState {
  documentDeadlineMissedAt?: string;
  expiryReminderSentAt?: string;
  lastOverdueRemindedAt?: string;
  draftInactiveRemindedAt?: string;
}

export type DocExpiryReminderState = Record<string, DocExpiryRecordState>;

export function loadDocExpiryReminderState(): DocExpiryReminderState {
  if (typeof window === "undefined") return {};
  try {
    const raw = docExpiryStateCache;
    return raw ? (JSON.parse(raw) as DocExpiryReminderState) : {};
  } catch {
    return {};
  }
}

export function saveDocExpiryReminderState(state: DocExpiryReminderState): void {
  if (typeof window === "undefined") return;
  try {
    docExpiryStateCache = JSON.stringify(state);
  } catch {}
}

export interface DocExpiryScanResult {
  scannedRecords: number;
  deadlineMissedRemindersSent: number;
  expiryRemindersSent: number;
  details: {
    nopId: string;
    action: "deadline-missed" | "expiry-reminder";
  }[];
}

// NOTIF-26's lead time is already a first-class, admin-configurable field
// (`expiryReminderLeadDays` on `NotificationSettingsConfig`, defined and
// defaulted in src/lib/nopNotifications.ts and already surfaced in the
// Settings > Notification Configuration tab) — no new config field needed
// here, we simply consume it the same way `deferredDocumentDaysN` is
// consumed by `calculateDocumentDeadline` elsewhere.

/**
 * Scans for two one-shot, time-based reminders not covered by
 * `runApproverReminderScan` (which only covers pending approval steps):
 *  - NOTIF-20: an Urgent NOP's IPA-granted document deadline has passed
 *    without documents being marked complete.
 *  - NOTIF-26: an Approved permit's validity end date is within the
 *    configured lead time of expiring.
 * Uses the same demo clock (`engineNow` / `getClockOffsetMs`) as
 * `runApproverReminderScan` so both scans agree on "now", and persists a
 * one-shot flag per NOP so re-running the scan (e.g. after advancing the
 * demo clock again) never re-dispatches the same reminder.
 */
export function runDocumentAndExpiryReminderScan(
  applications: NOPApplication[],
  settings?: NotificationSettingsConfig,
  now?: Date
): DocExpiryScanResult {
  const cfg = settings || loadStoredNotificationSettings();
  const current = (now || engineNow()).getTime();
  const state = loadDocExpiryReminderState();
  const result: DocExpiryScanResult = {
    scannedRecords: 0,
    deadlineMissedRemindersSent: 0,
    expiryRemindersSent: 0,
    details: []
  };

  const leadMs = Math.max(0, cfg.expiryReminderLeadDays) * 24 * 3600_000;

  applications.forEach((nop) => {
    result.scannedRecords += 1;
    const entry: DocExpiryRecordState = state[nop.id] || {};

    // NOTIF-20: Urgent NOP document-completion deadline missed.
    if (
      nop.ipaStatus === "Granted" &&
      nop.documentDeadline &&
      nop.documentCompletion !== "Documents Complete" &&
      !entry.documentDeadlineMissedAt
    ) {
      const deadlineMs = new Date(nop.documentDeadline).getTime();
      if (!Number.isNaN(deadlineMs) && current >= deadlineMs) {
        entry.documentDeadlineMissedAt = new Date(current).toISOString();
        dispatchNopNotification({
          triggerCode: "NOTIF-20",
          nopId: nop.id,
          companyName: nop.companyName,
          recipientRole: "Applicant (Contractor PIC)",
          recipientEmail: nop.applicantEmail,
          subject: `Deferred document deadline missed: ${nop.id}`,
          content: `In-Principle Approval was granted for ${nop.id} but deferred/outstanding documents were not marked complete by the ${nop.documentDeadline} deadline. Permit is flagged Overdue pending submission.`
        });
        recordNopAudit({
          nopId: nop.id,
          action: "DOCUMENT_DEADLINE_MISSED",
          actor: "System (Reminder Engine)",
          role: "System",
          comment: `Document-completion deadline (${nop.documentDeadline}) passed without Documents Complete status; NOTIF-20 dispatched.`
        });
        result.deadlineMissedRemindersSent += 1;
        result.details.push({ nopId: nop.id, action: "deadline-missed" });
      }
    }

    // NOTIF-26: Permit approaching expiry.
    const status = derivePermitStatus(nop, new Date(current));
    if (
      (status === "Active" || status === "Upcoming") &&
      nop.applicationStatus === "Approved" &&
      nop.endDateTime &&
      !entry.expiryReminderSentAt
    ) {
      const endMs = new Date(nop.endDateTime).getTime();
      if (!Number.isNaN(endMs) && endMs > current && endMs - current <= leadMs) {
        entry.expiryReminderSentAt = new Date(current).toISOString();
        dispatchNopNotification({
          triggerCode: "NOTIF-26",
          nopId: nop.id,
          companyName: nop.companyName,
          recipientRole: "Applicant (Contractor PIC)",
          recipientEmail: nop.applicantEmail,
          subject: `Permit validity expiring soon: ${nop.id}`,
          content: `Permit ${nop.id} validity ends ${nop.endDateTime}, within the configured ${cfg.expiryReminderLeadDays}-day lead time. Submit a Request Extension if works are ongoing, or prepare site handover.`
        });
        recordNopAudit({
          nopId: nop.id,
          action: "EXPIRY_REMINDER_SENT",
          actor: "System (Reminder Engine)",
          role: "System",
          comment: `Permit validity end date (${nop.endDateTime}) is within the ${cfg.expiryReminderLeadDays}-day expiry lead window; NOTIF-26 dispatched.`
        });
        result.expiryRemindersSent += 1;
        result.details.push({ nopId: nop.id, action: "expiry-reminder" });
      }
    }

    // When documents complete, clear overdue reminder tracking so no further reminders are sent (NTF-02)
    if (nop.documentCompletion === "Documents Complete") {
      delete entry.lastOverdueRemindedAt;
      delete entry.documentDeadlineMissedAt;
    }

    // NOTIF-21: Recurring overdue reminder for Overdue documents (NTF-02)
    if (
      nop.ipaStatus === "Granted" &&
      nop.documentCompletion === "Overdue"
    ) {
      const overdueIntervalMs = Math.max(1, cfg.overdueRecurringIntervalHours || 24) * 3600_000;
      const lastRemindedMs = entry.lastOverdueRemindedAt ? new Date(entry.lastOverdueRemindedAt).getTime() : 0;
      if (!lastRemindedMs || (current - lastRemindedMs >= overdueIntervalMs)) {
        entry.lastOverdueRemindedAt = new Date(current).toISOString();
        dispatchNopNotification({
          triggerCode: "NOTIF-21",
          nopId: nop.id,
          companyName: nop.companyName,
          recipientRole: "Applicant (Contractor PIC)",
          recipientEmail: nop.applicantEmail,
          subject: `STATUTORY OVERDUE NOTICE: Deferred Supporting Documents for Permit ${nop.id}`,
          content: `Deferred supporting documents remain overdue past the statutory continuous deadline for permit ${nop.id}. Upload outstanding documentation immediately via /nops/${nop.id} to maintain permit compliance.`
        });
      }
    }

    // NOTIF-27: Inactive Draft reminder based on configured inactivity threshold (NTF-08)
    if (nop.applicationStatus === "Draft" && !entry.draftInactiveRemindedAt) {
      const draftDateMs = parseWhen(nop.updatedAt) ?? parseWhen(nop.submittedAt) ?? parseWhen(nop.createdAt) ?? current;
      const inactivityDays = cfg.draftInactivityThresholdDays ?? 7;
      if (current - draftDateMs >= inactivityDays * 24 * 3600_000) {
        entry.draftInactiveRemindedAt = new Date(current).toISOString();
        dispatchNopNotification({
          triggerCode: "NOTIF-27",
          nopId: nop.id,
          companyName: nop.companyName,
          recipientRole: "Applicant (Contractor)",
          recipientEmail: nop.applicantEmail,
          subject: `Unsubmitted NOP Draft Inactivity Notice: ${nop.id}`,
          content: `Your draft NOP application ${nop.id} has had no activity for over ${inactivityDays} days. Please resume and complete your submission via /nops/portal or discard it.`
        });
      }
    }

    state[nop.id] = entry;
  });

  saveDocExpiryReminderState(state);
  return result;
}
