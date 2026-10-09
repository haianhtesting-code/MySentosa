import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  NOPApplication,
  RoutingMatrixRule,
  derivePermitStatus,
  isWorkAuthorized,
  reapplyRoutingToPendingSteps,
  STORAGE_KEY,
  INITIAL_NOPS
} from "@/lib/nopData";
import {
  canAccessNopRecord,
  isContactVisible,
  maskContactPhone,
  hasNopPermission,
  canDecideRequestWithSoD
} from "@/lib/nopPermissions";
import {
  dispatchNopNotification,
  loadStoredNotifications,
  clearStoredNotifications,
  saveStoredNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS
} from "@/lib/nopNotifications";
import {
  runApproverReminderScan,
  runDocumentAndExpiryReminderScan,
  loadReminderState,
  resetClock
} from "@/lib/nopReminderEngine";
import { getUsers } from "@/lib/users";
import { installBrowserGlobals, uninstallBrowserGlobals } from "./testBrowserGlobals";

describe("NOP Issues v2 Comprehensive QA Verification", () => {
  beforeEach(() => {
    installBrowserGlobals();
    resetClock();
  });

  afterEach(() => {
    uninstallBrowserGlobals();
  });

  const kimSengNop: NOPApplication = {
    id: "SEN/NP/20260919/002",
    companyName: "Kim Seng Construction Pte Ltd",
    companyUen: "199801234K",
    applicantName: "David Tan",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "david.tan@kimseng.sg",
    workDescription: "Test work",
    durationCategory: "Ad-hoc Work",
    location: "Siloso Beach Walk",
    zone: "Sector 1 (North Siloso)",
    startDateTime: "2026-09-20T08:00:00+08:00",
    endDateTime: "2026-10-20T18:00:00+08:00",
    workingHours: "08:00 – 18:00",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Under Review",
    permitStatus: "Upcoming",
    ipaStatus: "N/A",
    documentCompletion: "Documents Complete",
    triggers: ["Excavation Work"],
    documents: [],
    workers: [],
    sdcLiaisonOfficer: "Jonathan Teo (Liaison Officer, Sentosa Express)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "Sentosa Express Rail Operations", approverName: "Tan Kian Seng", approverRole: "General Manager (Sentosa Express)", departmentId: "express", status: "Pending", pendingSince: "2026-09-19T14:00:00.000Z" }
    ],
    submittedAt: "2026-09-19 10:00"
  };

  describe("1. Permissions, Scoping & Segregation of Duties", () => {
    it("P0-04 / SEC-05: Scopes record access by company and owner", () => {
      expect(canAccessNopRecord({ role: "Applicant (Contractor)", username: "David Tan", company: "Kim Seng Construction Pte Ltd" }, kimSengNop)).toBe(true);
      expect(canAccessNopRecord({ role: "Applicant (Contractor)", username: "Kenneth Low", company: "Huationg Contractor Pte Ltd" }, kimSengNop)).toBe(false);
      expect(canAccessNopRecord({ role: "Liaison Officer", username: "Jonathan Teo" }, kimSengNop)).toBe(true);
      expect(canAccessNopRecord({ role: "Liaison Officer", username: "Gary Ng" }, kimSengNop)).toBe(false);
      expect(canAccessNopRecord({ role: "Technical Approver", username: "Tan Kian Seng" }, kimSengNop)).toBe(true);
      expect(canAccessNopRecord({ role: "Technical Approver", username: "Audrey Seah" }, kimSengNop)).toBe(false);
      expect(canAccessNopRecord({ role: "NOP Operations Admin", username: "Ops Admin Lee" }, kimSengNop)).toBe(true);
    });

    it("SEC-01: Enforces Segregation of Duties (SoD) on requests", () => {
      const requestWithClearer = {
        status: "Under Approver Review" as const,
        clearedBy: "Jonathan Teo",
        clearedAt: "2026-09-20T10:00:00Z"
      };

      expect(canDecideRequestWithSoD(requestWithClearer, "Jonathan Teo")).toBe(false);
      expect(canDecideRequestWithSoD(requestWithClearer, "Tan Kian Seng")).toBe(true);
    });

    it("SEC-15: Masks contacts for unauthorized viewers", () => {
      expect(isContactVisible({ role: "NOP Operations Admin", username: "Ops Admin" }, kimSengNop)).toBe(true);
      expect(isContactVisible({ role: "Liaison Officer", username: "Jonathan Teo" }, kimSengNop)).toBe(true);
      expect(isContactVisible({ role: "Technical Approver", username: "Tan Kian Seng" }, kimSengNop)).toBe(true);
      expect(isContactVisible({ role: "Duty Manager", username: "DM Gan" }, kimSengNop)).toBe(true);

      expect(isContactVisible({ role: "NOP Business Owner", username: "Director NOP" }, kimSengNop)).toBe(false);
      expect(isContactVisible({ role: "SDC Stakeholder / Operational Viewer (incl. OR Team)", username: "Analyst Sarah" }, kimSengNop)).toBe(false);

      expect(maskContactPhone("+65 9123 4567")).toBe("+** **** 4567");
    });
  });

  describe("2. Approval Workflows, State Transitions & Routing Rules", () => {
    it("CFG-01 & CFG-02: Reapplies routing strictly to targetRuleId without cross-group pollution", () => {
      const mockApp: NOPApplication = {
        ...kimSengNop,
        id: "TEST-CFG-001",
        applicationStatus: "Under Review",
        domainApprovals: [
          { domain: "Working at Height", ruleId: "RULE-001", approverGroup: "WSH Safety & Operations Oversight Group", approverRole: "Head (Workplace Safety & Health)", approverName: "Old Approver", status: "Pending" },
          { domain: "Confined Space", ruleId: "RULE-002", approverGroup: "WSH Safety & Operations Oversight Group", approverRole: "Confined Space Specialist", approverName: "Confined Space Approver", status: "Pending" }
        ]
      };

      const updatedRule: RoutingMatrixRule = {
        id: "RULE-001",
        trigger: "Working at Height",
        approverGroup: "WSH Safety & Operations Oversight Group",
        primaryApprover: "Head (Workplace Safety & Health)",
        officerName: "Wong Siew Leng",
        active: true,
        departmentId: "wsh",
        standardSla: "3 Working Days",
        urgentSla: "1 Working Day",
        areaOfResponsibility: "WSH Safety"
      };

      const { applications, reassignments } = reapplyRoutingToPendingSteps([mockApp], [updatedRule], "RULE-001");
      expect(applications[0].domainApprovals![0].approverName).toBe("Wong Siew Leng");
      expect(applications[0].domainApprovals![1].approverName).toBe("Confined Space Approver");
      expect(reassignments.length).toBe(1);
    });

    it("NEW-08: Cancellation rejection dispatches NOTIF-11 to applicant without stop-work (NOTIF-12)", () => {
      clearStoredNotifications();

      const notif = dispatchNopNotification({
        triggerCode: "NOTIF-11",
        nopId: "SEN/NP/20260919/002",
        recipientRole: "Applicant (Contractor PIC)",
        recipientEmail: "david.tan@kimseng.sg",
        subject: "Cancellation Request Rejected: SEN/NP/20260919/002",
        content: "Cancellation request for permit SEN/NP/20260919/002 has been rejected."
      });

      expect(notif.triggerCode).toBe("NOTIF-11");
      expect(notif.subject).toContain("Rejected");

      const stored = loadStoredNotifications();
      expect(stored.some(n => n.triggerCode === "NOTIF-12")).toBe(false);
      expect(stored[0].recipientEmail).toBe("david.tan@kimseng.sg");
    });
  });

  describe("3. Notification Dispatch & Email Resolution", () => {
    it("NEW-09 & NTF-04: Resolves real user emails from users.ts", () => {
      const users = getUsers();
      const garyUser = users.find(u => u.name === "Gary Ng");
      expect(garyUser?.email).toBe("gary.ng@sdc.gov.sg");

      const jonathanUser = users.find(u => u.name === "Jonathan Teo");
      expect(jonathanUser?.email).toBe("jonathan.teo@sdc.gov.sg");
    });

    it("NTF-03: Resolves IIOC and Ranger emails from distributionLists", () => {
      clearStoredNotifications();

      dispatchNopNotification({
        triggerCode: "NOTIF-12",
        nopId: "SEN/NP/20260919/002",
        recipientRole: "Applicant (Contractor PIC)",
        recipientEmail: "david.tan@kimseng.sg",
        subject: "Stop-Work Order Issued",
        content: "Stop-work order enacted for safety."
      });

      const stored = loadStoredNotifications();
      const iiocNotif = stored.find(n => n.recipientRole.includes("IIOC"));
      const rangerNotif = stored.find(n => n.recipientRole.includes("Ranger"));

      expect(iiocNotif).toBeDefined();
      expect(iiocNotif?.recipientEmail).toBe("iioc.command@sdc.gov.sg");

      expect(rangerNotif).toBeDefined();
      expect(rangerNotif?.recipientEmail).toBe("rangers.lead@sdc.gov.sg");
    });
  });

  describe("4. Reminder Engine & Statutory Timers", () => {
    it("NTF-09: Tracks reminder wait times from step.pendingSince", () => {
      const now = new Date("2026-09-22T10:00:00.000Z");
      const app: NOPApplication = {
        id: "TEST-NOP-001",
        companyName: "Test Co",
        companyUen: "12345678A",
        applicantName: "Test Applicant",
        applicantPhone: "+65 9111 2222",
        applicantEmail: "test@applicant.sg",
        workDescription: "Urgent Rail Test",
        durationCategory: "Ad-hoc Work",
        location: "Test Loc",
        zone: "Sector 1",
        startDateTime: "2026-09-23T08:00:00+08:00",
        endDateTime: "2026-09-24T18:00:00+08:00",
        workingHours: "08:00 – 18:00",
        isUrgent: false,
        hasBlackoutOverlap: false,
        applicationStatus: "Under Review",
        permitStatus: "Upcoming",
        ipaStatus: "N/A",
        documentCompletion: "Documents Complete",
        triggers: ["Excavation Work"],
        documents: [],
        workers: [],
        sdcLiaisonOfficer: "Gary Ng",
        loPreScreenStatus: "Cleared for Approval",
        domainApprovals: [
          {
            domain: "Sentosa Express Rail Operations",
            approverName: "Tan Kian Seng",
            approverRole: "General Manager (Sentosa Express)",
            departmentId: "express",
            status: "Pending",
            pendingSince: "2026-09-20T10:00:00.000Z"
          }
        ],
        submittedAt: "2026-09-15 10:00"
      };

      const result = runApproverReminderScan([app], {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        approverReminderIntervalHours: 24,
        approverEscalationThresholdHours: 48
      }, now);

      expect(result.scannedSteps).toBe(1);
      expect(result.remindersSent).toBe(1);
      expect(result.escalationsSent).toBe(1);

      const reminderState = loadReminderState();
      const stateKeys = Object.keys(reminderState);
      expect(stateKeys.length).toBe(1);
      expect(reminderState[stateKeys[0]].remindersSent).toBe(2);
    });

    it("NTF-02: Recurring overdue reminder triggers only for Overdue and stops on Documents Complete", () => {
      const now = new Date("2026-09-25T10:00:00.000Z");
      const overdueApp: NOPApplication = {
        id: "TEST-OVERDUE-001",
        companyName: "Urgent Excavation Co",
        companyUen: "12345678B",
        applicantName: "Contractor Lead",
        applicantPhone: "+65 9111 3333",
        applicantEmail: "contractor@lead.sg",
        workDescription: "Urgent Culvert Trenching",
        durationCategory: "Ad-hoc Work",
        location: "Test Area",
        zone: "Sector 1",
        startDateTime: "2026-09-20T08:00:00+08:00",
        endDateTime: "2026-09-30T18:00:00+08:00",
        workingHours: "08:00 – 18:00",
        isUrgent: true,
        hasBlackoutOverlap: false,
        applicationStatus: "Approved",
        permitStatus: "Active",
        ipaStatus: "Granted",
        documentDeadline: "2026-09-23T18:00:00Z",
        documentCompletion: "Overdue",
        triggers: ["Excavation Work"],
        documents: [],
        workers: [],
        sdcLiaisonOfficer: "Gary Ng",
        loPreScreenStatus: "Cleared for Approval",
        domainApprovals: [],
        submittedAt: "2026-09-20 08:00"
      };

      clearStoredNotifications();
      runDocumentAndExpiryReminderScan([overdueApp], DEFAULT_NOTIFICATION_SETTINGS, now);

      const notifsAfterOverdue = loadStoredNotifications();
      expect(notifsAfterOverdue.some(n => n.triggerCode === "NOTIF-21")).toBe(true);

      overdueApp.documentCompletion = "Documents Complete";
      clearStoredNotifications();
      runDocumentAndExpiryReminderScan([overdueApp], DEFAULT_NOTIFICATION_SETTINGS, now);

      const notifsAfterComplete = loadStoredNotifications();
      expect(notifsAfterComplete.some(n => n.triggerCode === "NOTIF-21")).toBe(false);
    });

    it("NTF-08: NOTIF-27 honors configured draftInactivityThresholdDays", () => {
      const now = new Date("2026-09-20T10:00:00.000Z");
      const draftApp: NOPApplication = {
        id: "DRAFT-005",
        companyName: "Inactive Contractor",
        companyUen: "99887766K",
        applicantName: "Draft Creator",
        applicantPhone: "+65 9111 4444",
        applicantEmail: "draft@creator.sg",
        workDescription: "Draft works",
        durationCategory: "Ad-hoc Work",
        location: "Siloso Beach",
        zone: "Sector 1",
        startDateTime: "2026-10-01T08:00:00+08:00",
        endDateTime: "2026-10-02T18:00:00+08:00",
        workingHours: "08:00 – 18:00",
        isUrgent: false,
        hasBlackoutOverlap: false,
        applicationStatus: "Draft",
        permitStatus: "Upcoming",
        ipaStatus: "N/A",
        documentCompletion: "Documents Complete",
        triggers: [],
        documents: [],
        workers: [],
        sdcLiaisonOfficer: "Gary Ng",
        loPreScreenStatus: "Pending Pre-screening",
        domainApprovals: [],
        createdAt: "2026-09-10 10:00",
        submittedAt: "2026-09-10 10:00"
      };

      clearStoredNotifications();

      runDocumentAndExpiryReminderScan([draftApp], {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        draftInactivityThresholdDays: 5
      }, now);

      const stored = loadStoredNotifications();
      const notif27 = stored.find(n => n.triggerCode === "NOTIF-27");
      expect(notif27).toBeDefined();
      expect(notif27?.content).toContain("5 days");
    });
  });
});
