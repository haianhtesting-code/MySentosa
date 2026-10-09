// Sentosa No Objection Permit (NOP) — Notification Engine & 26 Triggers Catalog
import { STORAGE_KEY } from "./nopData";
import { getUsers } from "./users";

export interface NOPNotification {
  id: string;
  triggerCode: string;
  triggerName: string;
  nopId: string;
  companyName: string;
  recipientRole: string;
  recipientEmail: string;
  channel: "Email" | "SMS" | "In-App" | "Multi-channel" | "SMS & Email";
  subject: string;
  content: string;
  status: "Sent" | "Delivered" | "Queued" | "Failed";
  dispatchedAt: string;
  isMandatory?: boolean;
}

export interface NotificationTriggerDefinition {
  id: string;
  code: string;
  event: string;
  name: string;
  category: "Submission" | "Pre-screening" | "Routing" | "Approval" | "Revision" | "IPA Fast-Track" | "Lifecycle" | "Enforcement" | "SLA & Escalation" | "Blackout" | "Optional";
  recipients: string[];
  timing: string;
  channel: string;
  actionRequired: string;
  description: string;
  isMandatory: boolean;
}

/**
 * 26 STATUTORY NOTIFICATION TRIGGERS ACCORDING TO FRD §8.1
 */
export const NOTIFICATION_TRIGGERS_CONFIG: NotificationTriggerDefinition[] = [
  {
    id: "NOTIF-01",
    code: "NOP_NOTIF_01",
    name: "Application Submission Confirmation",
    event: "Application submitted",
    category: "Submission",
    recipients: ["Applicant (Contractor PIC)", "SDC Liaison Officer"],
    timing: "Immediate upon submit",
    channel: "Email",
    actionRequired: "Acknowledge receipt and prepare for pre-screening",
    description: "Applicant receives confirmation with NOP Reference ID. Assigned LO notified of pending pre-screening.",
    isMandatory: true
  },
  {
    id: "NOTIF-02",
    code: "NOP_NOTIF_02",
    name: "Application Cleared for Technical Review",
    event: "LO Pre-screen passed",
    category: "Pre-screening",
    recipients: ["Applicant", "Assigned Technical Approver Groups"],
    timing: "Immediate upon LO clearance",
    channel: "Email",
    actionRequired: "Review technical domain clearances within SLA",
    description: "LO clears dossier. Technical approver groups receive statutory review package.",
    isMandatory: true
  },
  {
    id: "NOTIF-03",
    code: "NOP_NOTIF_03",
    name: "Pending Technical Review Action",
    event: "Approval step pending",
    category: "Routing",
    recipients: ["Assigned Approver Group Members"],
    timing: "Immediate upon routing step activation",
    channel: "Email",
    actionRequired: "Record statutory domain clearance decision",
    description: "Sent to all authorised members of the designated Approver Group for that trigger.",
    isMandatory: true
  },
  {
    id: "NOTIF-04",
    code: "NOP_NOTIF_04",
    name: "Clarification / Revision Requested",
    event: "Changes requested",
    category: "Revision",
    recipients: ["Applicant (Contractor PIC)"],
    timing: "Immediate upon revision request",
    channel: "Email",
    actionRequired: "Revise application details and resubmit dossier",
    description: "Detailed remarks dispatched to contractor specifying missing documents or technical adjustments.",
    isMandatory: true
  },
  {
    id: "NOTIF-05",
    code: "NOP_NOTIF_05",
    name: "Application Resubmitted by Contractor",
    event: "Application resubmitted",
    category: "Submission",
    recipients: ["SDC Liaison Officer"],
    timing: "Immediate upon resubmission",
    channel: "Email",
    actionRequired: "Conduct pre-screening on revised dossier",
    description: "Resubmitted application returns to Liaison Officer queue before further approver routing.",
    isMandatory: true
  },
  {
    id: "NOTIF-06",
    code: "NOP_NOTIF_06",
    name: "In-Principle Approval (IPA) Requested",
    event: "IPA requested (Urgent Fast-track)",
    category: "IPA Fast-Track",
    recipients: ["Duty Manager"],
    timing: "Immediate upon urgent submission (< 7 days)",
    channel: "Email",
    actionRequired: "Coordinate fast-track clearance and issue IPA with deferred document deadline",
    description: "Urgent permit flagged for Duty Manager fast-track coordination and conditional authorization.",
    isMandatory: true
  },
  {
    id: "NOTIF-07",
    code: "NOP_NOTIF_07",
    name: "In-Principle Approval (IPA) Granted",
    event: "IPA granted",
    category: "IPA Fast-Track",
    recipients: ["Applicant", "Liaison Officer", "Duty Manager", "Rangers", "IIOC"],
    timing: "Immediate upon IPA grant",
    channel: "Email",
    actionRequired: "Mobilize site setup and upload deferred documents within continuous 24h deadline",
    description: "Authorizes site entry with specified conditions; starts document completion countdown.",
    isMandatory: true
  },
  {
    id: "NOTIF-08",
    code: "NOP_NOTIF_08",
    name: "Final Permit Authorization Issued",
    event: "Full Approval granted / Permit Issued",
    category: "Approval",
    recipients: ["Applicant", "Liaison Officer", "Rangers", "IIOC", "Operations Admin"],
    timing: "Immediate upon final approval",
    channel: "Email",
    actionRequired: "Download and display official QR permit dossier on site",
    description: "All statutory domain clearances endorsed. Official electronic permit and QR code issued.",
    isMandatory: true
  },
  {
    id: "NOTIF-09",
    code: "NOP_NOTIF_09",
    name: "Application Voluntary Withdrawal Notice",
    event: "Application withdrawn",
    category: "Lifecycle",
    recipients: ["Applicant", "SDC Liaison Officer", "Assigned Approvers"],
    timing: "Immediate upon withdrawal",
    channel: "Email",
    actionRequired: "Remove pending tasks and archive application",
    description: "Applicant has withdrawn unapproved application. All pending approval steps cancelled.",
    isMandatory: true
  },
  {
    id: "NOTIF-10",
    code: "NOP_NOTIF_10",
    name: "Permit Cancellation Request Received",
    event: "Cancellation requested",
    category: "Lifecycle",
    recipients: ["SDC Liaison Officer"],
    timing: "Immediate upon cancellation request",
    channel: "Email",
    actionRequired: "Conduct pre-screening for permit cancellation",
    description: "Contractor requested permit cancellation. Sent to LO to initiate cancellation review.",
    isMandatory: true
  },
  {
    id: "NOTIF-11",
    code: "NOP_NOTIF_11",
    name: "Permit Cancellation Approved",
    event: "Cancellation approved",
    category: "Lifecycle",
    recipients: ["Applicant", "Liaison Officer", "Approvers", "IIOC"],
    timing: "Immediate upon cancellation approval",
    channel: "Email",
    actionRequired: "Cease site access and close out records",
    description: "Permit formally marked as Cancelled across Central Registry and access control systems.",
    isMandatory: true
  },
  {
    id: "NOTIF-12",
    code: "NOP_NOTIF_12",
    name: "Stop-Work Order / Suspension Enacted",
    event: "Suspension enacted",
    category: "Enforcement",
    recipients: ["Applicant", "Liaison Officer", "Duty Manager", "Rangers", "IIOC"],
    timing: "Immediate upon suspension enactment",
    channel: "Email",
    actionRequired: "Immediate cease of all work; 1-touch acknowledgment required",
    description: "Emergency or safety stop-work order issued due to non-compliance or island incident.",
    isMandatory: true
  },
  {
    id: "NOTIF-13",
    code: "NOP_NOTIF_13",
    name: "Lifting of Suspension Requested",
    event: "Lifting of Suspension Request by Applicant",
    category: "Lifecycle",
    recipients: ["SDC Liaison Officer", "Approver"],
    timing: "Immediate upon lifting request",
    channel: "Email",
    actionRequired: "Verify safety rectification and initiate joint re-inspection",
    description: "Contractor has submitted rectification proof and requested lifting of stop-work suspension.",
    isMandatory: true
  },
  {
    id: "NOTIF-14",
    code: "NOP_NOTIF_14",
    name: "Stop-Work Suspension Lifted (Resumption)",
    event: "Suspension lifted / Works resume",
    category: "Enforcement",
    recipients: ["Applicant", "Liaison Officer", "Approvers", "IIOC", "Rangers"],
    timing: "Immediate upon suspension lifted",
    channel: "Email",
    actionRequired: "Resume authorized works if validity state is Active",
    description: "Suspension cleared. Works authorized to resume provided permit has not expired.",
    isMandatory: true
  },
  {
    id: "NOTIF-15",
    code: "NOP_NOTIF_15",
    name: "Permit Revocation Notice",
    event: "Permit Revoked",
    category: "Enforcement",
    recipients: ["Applicant", "Liaison Officer", "Approvers", "IIOC", "Duty Manager"],
    timing: "Immediate upon revocation",
    channel: "Email",
    actionRequired: "Permanent site vacating and mandatory reinstatement",
    description: "Formal revocation of permit due to critical breach. Work authorization permanently terminated.",
    isMandatory: true
  },
  {
    id: "NOTIF-16",
    code: "NOP_NOTIF_16",
    name: "Permit Extension Request Received",
    event: "Extension requested",
    category: "Lifecycle",
    recipients: ["SDC Liaison Officer"],
    timing: "Immediate upon extension request",
    channel: "Email",
    actionRequired: "Review proposed revised end date and justification",
    description: "Contractor submitted validity extension request (max 1 month) prior to expiration.",
    isMandatory: true
  },
  {
    id: "NOTIF-17",
    code: "NOP_NOTIF_17",
    name: "Permit Extension Decision",
    event: "Extension approved or rejected",
    category: "Lifecycle",
    recipients: ["Applicant", "SDC Liaison Officer", "IIOC"],
    timing: "Immediate upon extension decision",
    channel: "Email",
    actionRequired: "Update site operational schedule and personnel muster",
    description: "Permit validity end date extended and validity recalculated in Central Registry.",
    isMandatory: true
  },
  {
    id: "NOTIF-18",
    code: "NOP_NOTIF_18",
    name: "Approver Action Overdue Reminder",
    event: "Approver action overdue",
    category: "SLA & Escalation",
    recipients: ["Assigned Approver"],
    timing: "At configured reminder period elapsed",
    channel: "Email",
    actionRequired: "Expedite pending domain approval decision",
    description: "Sent to Approver when review time passes configured reminder threshold.",
    isMandatory: true
  },
  {
    id: "NOTIF-19",
    code: "NOP_NOTIF_19",
    name: "Repeated Approver Inaction Escalation",
    event: "Repeated Approver inaction",
    category: "SLA & Escalation",
    recipients: ["Assigned Approver", "Designated Approver Group Manager", "Operations Admin"],
    timing: "At configured escalation threshold",
    channel: "Email",
    actionRequired: "Intervene to reassign step or expedite decision",
    description: "Escalates overdue step to designated manager when approver fails to act repeatedly.",
    isMandatory: true
  },
  {
    id: "NOTIF-20",
    code: "NOP_NOTIF_20",
    name: "Urgent NOP Document-Completion Deadline Missed",
    event: "Urgent NOP document-completion deadline missed",
    category: "SLA & Escalation",
    recipients: ["Applicant", "Liaison Officer", "Approvers who granted IPA"],
    timing: "At document deadline expiry (D+0)",
    channel: "Email",
    actionRequired: "Submit overdue deferred documents immediately or review enforcement",
    description: "Flags Overdue status on IPA permit when deferred documents are not submitted within N continuous days.",
    isMandatory: true
  },
  {
    id: "NOTIF-21",
    code: "NOP_NOTIF_21",
    name: "Overdue Documents Recurring Reminder",
    event: "Urgent NOP documents remain overdue",
    category: "SLA & Escalation",
    recipients: ["Applicant", "Liaison Officer", "Approvers who granted IPA"],
    timing: "At configured recurring interval until complete",
    channel: "Email",
    actionRequired: "Expedite outstanding deferred submissions",
    description: "Repeated reminder sent to applicant and stakeholders until all deferred documents are submitted.",
    isMandatory: true
  },
  {
    id: "NOTIF-22",
    code: "NOP_NOTIF_22",
    name: "Deferred Document Submitted for Review",
    event: "Deferred document submitted for review",
    category: "IPA Fast-Track",
    recipients: ["Responsible Approver Group"],
    timing: "Immediate upon deferred document upload",
    channel: "Email",
    actionRequired: "Review and Accept or Require Correction on deferred document",
    description: "Routes submitted deferred document to responsible technical approver for compliance verification.",
    isMandatory: true
  },
  {
    id: "NOTIF-23",
    code: "NOP_NOTIF_23",
    name: "Deferred Document Correction Required",
    event: "Deferred document requires correction",
    category: "IPA Fast-Track",
    recipients: ["Applicant (Contractor PIC)"],
    timing: "Immediate upon approver correction request",
    channel: "Email",
    actionRequired: "Rectify and re-upload compliant document",
    description: "Approver requested corrections. Retains Documents Outstanding status until compliant file uploaded.",
    isMandatory: true
  },
  {
    id: "NOTIF-24",
    code: "NOP_NOTIF_24",
    name: "Urgent NOP Documents Complete",
    event: "Urgent NOP documents complete",
    category: "IPA Fast-Track",
    recipients: ["Applicant", "Liaison Officer", "Approvers who granted IPA"],
    timing: "Immediate upon all deferred docs accepted",
    channel: "Email",
    actionRequired: "None (Compliance satisfied)",
    description: "All required deferred documents submitted and accepted. Removes Overdue warning and stops reminders.",
    isMandatory: true
  },
  {
    id: "NOTIF-25",
    code: "NOP_NOTIF_25",
    name: "New Blackout Window Advisory for Approved Permits",
    event: "New blackout date affects Approved NOP",
    category: "Blackout",
    recipients: ["Affected Approved Permit Applicants", "SDC Liaison Officer"],
    timing: "Upon island blackout creation",
    channel: "Email",
    actionRequired: "Coordinate noise/machinery schedule during moratorium window",
    description: "Identifies existing approved permits overlapping new blackout dates/zones without auto-suspending them.",
    isMandatory: true
  },
  {
    id: "NOTIF-26",
    code: "NOP_NOTIF_26",
    name: "Permit Expiration Impending Reminder",
    event: "Permit validity expiring within lead time",
    category: "Lifecycle",
    recipients: ["Applicant", "SDC Liaison Officer"],
    timing: "At configured expiry lead time (default D-3)",
    channel: "Email",
    actionRequired: "Submit Request Extension or prepare site handover",
    description: "Notifies contractor to apply for extension if works are ongoing before validity expires.",
    isMandatory: true
  },
  {
    id: "NOTIF-27",
    code: "NOP_NOTIF_27",
    name: "Draft Application Inactive Reminder",
    event: "Draft application inactive",
    category: "Submission",
    recipients: ["Applicant (Contractor)"],
    timing: "After 7 days of draft inactivity",
    channel: "Email",
    actionRequired: "Complete and submit application or delete draft",
    description: "Reminds applicant of unsubmitted draft with last updated date and resume link.",
    isMandatory: false
  }
];

export const NOTIFICATION_TRIGGER_CATALOG = NOTIFICATION_TRIGGERS_CONFIG;
export type StoredNotification = NOPNotification;

/**
 * NOTIFICATION CONFIGURATION ENGINE
 */
export interface NotificationSettingsConfig {
  deferredDocumentDaysN: number; // continuous 24h days, default 3
  expiryReminderLeadDays: number; // default 3
  approverReminderIntervalHours: number; // default 24h
  approverEscalationThresholdHours: number; // default 48h
  overdueRecurringIntervalHours: number; // default 24h
  draftInactivityThresholdDays?: number; // default 7
  designatedManagers: Record<string, string>; // Domain/Group -> Manager Name & Email
  distributionLists: { id: string; name: string; roles: string[]; emails: string[] }[];
  optionalNotificationsEnabled: Record<string, boolean>; // triggerCode -> enabled
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsConfig = {
  deferredDocumentDaysN: 3,
  expiryReminderLeadDays: 3,
  approverReminderIntervalHours: 24,
  approverEscalationThresholdHours: 48,
  overdueRecurringIntervalHours: 24,
  draftInactivityThresholdDays: 7,
  designatedManagers: {
    "Sentosa Express Engineering Group": "David Koh (GM Sentosa Express - gm.express@sentosaexpress.sg)",
    "Mount Faber Ropeway Safety Team": "Shirley Wong (Head Cableway Safety - shirley.wong@mountfaber.com.sg)",
    "Traffic Management & Safety Committee": "Vincent Tan (Snr Mgr Traffic - firdaus.m@sdc.gov.sg)",
    "C&S PE Structural Review Panel": "Er. Raymond Lee (Chief Structural Engineer - ng.bh@peboard.gov.sg)",
    "Landscape & Environmental Directorate": "Dr. Sarah Lin (Director Arboriculture - audrey.seah@sdc.gov.sg)",
    "Arboriculture & Heritage Conservation Council": "Audrey Seah (Head Arboriculture - audrey.seah@sdc.gov.sg)",
    "WSH Safety & Operations Oversight Group": "Marcus Teo (Head WSH Directorate - wong.sl@sdc.gov.sg)",
    "Coastal & Maritime Engineering Group": "Capt. David Koh (Principal Marine Specialist - david.koh@mpa.gov.sg)",
    "Geotechnical & Utilities Protection Team": "Er. Dr. Goh Teck Soon (Geotechnical Lead - goh.ts@geotech.gov.sg)",
    "Precinct Operations Management Team": "Patrick Lim (Head Precinct Operations - gary.precinct@sdc.gov.sg)",
    "Precinct Operations Management Group": "Patrick Lim (Head Precinct Operations - gary.precinct@sdc.gov.sg)",
    "SDC Central Operations Group": "Daniel Lim (Director Island Operations - daniel.lim@sdc.gov.sg)"
  },
  distributionLists: [
    { id: "DL-01", name: "Island Incident Operations Centre (IIOC)", roles: ["IIOC Command", "Duty Manager"], emails: ["iioc.command@sdc.gov.sg"] },
    { id: "DL-02", name: "Sentosa Ranger Patrol Roster", roles: ["Rangers Command"], emails: ["rangers.lead@sdc.gov.sg"] },
    { id: "DL-03", name: "Technical Approver Leads", roles: ["Technical Approvers"], emails: ["approvers.lead@sdc.gov.sg"] }
  ],
  optionalNotificationsEnabled: {
    "NOTIF-27": true,
    "OPT_NIGHT_WORK": true,
    "OPT_HIGH_RISK": true,
    "OPT_DAILY_MUSTER": true
  }
};

let notifSettingsCache: string | null = null;
let notifCache: string | null = null;
const NOTIF_SETTINGS_STORAGE_KEY = "sdc_nop_notification_settings_v1";

export function loadStoredNotificationSettings(): NotificationSettingsConfig {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = notifSettingsCache;
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveStoredNotificationSettings(settings: NotificationSettingsConfig): void {
  if (typeof window === "undefined") return;
  try {
    notifSettingsCache = JSON.stringify(settings);
  } catch (err) {
    console.error("Failed to save notification settings", err);
  }
}

export const INITIAL_NOTIFICATIONS: NOPNotification[] = [
  {
    id: "notif-001",
    triggerCode: "NOTIF-01",
    triggerName: "Application Submission Confirmation",
    nopId: "SEN/NP/20260918/001",
    companyName: "Kim Seng Construction Pte Ltd",
    recipientRole: "Applicant (Contractor)",
    recipientEmail: "david.tan@kimseng.sg",
    channel: "Email",
    subject: "NOP Application SEN/NP/20260918/001 Submitted — Pending LO Pre-screening",
    content: "Your application for Sentosa Express track protection zone works has been received and assigned to Gary Ng (Senior Facilities Manager, IFM) for statutory pre-screening.",
    status: "Delivered",
    dispatchedAt: "2026-09-18 09:30"
  },
  {
    id: "notif-002",
    triggerCode: "NOTIF-03",
    triggerName: "Pending Technical Review Action",
    nopId: "SEN/NP/20260918/001",
    companyName: "Kim Seng Construction Pte Ltd",
    recipientRole: "Technical Approver",
    recipientEmail: "gm.express@sentosa.gov.sg",
    channel: "Email",
    subject: "Action Required: Technical Review for NOP SEN/NP/20260918/001 (Sentosa Express Track Protection)",
    content: "SDC LO has cleared application SEN/NP/20260918/001. Please review track protection method statement and provide statutory endorsement within 48 hours SLA.",
    status: "Delivered",
    dispatchedAt: "2026-09-18 10:15"
  },
  {
    id: "notif-003",
    triggerCode: "NOTIF-07",
    triggerName: "In-Principle Approval (IPA) Granted",
    nopId: "SEN/NP/20260917/003",
    companyName: "Jurong Engineering Works Pte Ltd",
    recipientRole: "Applicant (Contractor)",
    recipientEmail: "tan.ahkow@jeworks.com.sg",
    channel: "Email",
    subject: "In-Principle Approval (IPA) Issued for NOP SEN/NP/20260917/003 (Urgent Excavation)",
    content: "Duty Manager has granted In-Principle Approval. You may commence site preparation works. Outstanding PE certification and Soil Investigation report must be submitted within 3 calendar days (Deadline: 2026-09-20 18:00 SGT).",
    status: "Delivered",
    dispatchedAt: "2026-09-17 11:45"
  }
];

const NOTIF_STORAGE_KEY = "sdc_nop_notifications_v1";

export function loadStoredNotifications(): NOPNotification[] {
  if (typeof window === "undefined") return INITIAL_NOTIFICATIONS;
  try {
    const raw = notifCache;
    if (!raw) {
      notifCache = JSON.stringify(INITIAL_NOTIFICATIONS);
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveStoredNotifications(notifs: NOPNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    notifCache = JSON.stringify(notifs);
  } catch (err) {
    console.error("Failed to save notifications", err);
  }
}

export function clearStoredNotifications(): void {
  if (typeof window === "undefined") return;
  try {
    notifCache = null;
  } catch (err) {
    console.error("Failed to clear notifications", err);
  }
}

export function dispatchNopNotification(params: {
  triggerCode: string;
  nopId: string;
  companyName?: string;
  recipientRole?: string;
  recipientEmail?: string;
  subject?: string;
  content?: string;
  channel?: "Email" | "SMS" | "In-App" | "Multi-channel" | "SMS & Email";
  status?: "Sent" | "Delivered" | "Queued" | "Failed";
}): NOPNotification {
  const cfg = loadStoredNotificationSettings();
  if (cfg.optionalNotificationsEnabled && cfg.optionalNotificationsEnabled[params.triggerCode] === false) {
    return {
      id: `notif-${Date.now()}-suppressed`,
      triggerCode: params.triggerCode,
      triggerName: "Suppressed Notification",
      nopId: params.nopId,
      companyName: params.companyName || "Contractor Entity",
      recipientRole: "Suppressed",
      recipientEmail: "suppressed@sentosa.gov.sg",
      channel: "Email",
      subject: "Suppressed",
      content: "Suppressed",
      status: "Queued",
      dispatchedAt: new Date().toISOString().replace("T", " ").substring(0, 16)
    };
  }

  const catalogEntry = NOTIFICATION_TRIGGERS_CONFIG.find((t) => t.id === params.triggerCode);
  const triggerName = catalogEntry?.name || "Statutory Workflow Notification";

  // Resolve NOP details (NEW-09: uses STORAGE_KEY and getUsers())
  let nopCompanyName = params.companyName;
  let nopApplicantEmail = params.recipientEmail;
  let loEmail = "gary.ng@sdc.gov.sg";
  let hasAssignedLo = false;
  let approverEmails: string[] = [];

  const allUsers = getUsers();
  const loUsers = allUsers.filter((u) => u.role === "Liaison Officer");
  if (loUsers.length > 0) {
    const defaultLo = loUsers.find((u) => u.name.toLowerCase().includes("gary")) || loUsers[0];
    loEmail = defaultLo.email;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = null;
      if (raw) {
        const nops = JSON.parse(raw);
        const n = nops.find((item: any) => item.id === params.nopId);
        if (n) {
          nopCompanyName = nopCompanyName || n.companyName;
          nopApplicantEmail = nopApplicantEmail || n.applicantEmail;
          if (n.sdcLiaisonOfficer) {
            hasAssignedLo = true;
            const loName = n.sdcLiaisonOfficer.toLowerCase();
            const matchedUser = loUsers.find(
              (u) => loName.includes(u.name.toLowerCase()) || u.name.toLowerCase().includes(loName)
            );
            if (matchedUser) {
              loEmail = matchedUser.email;
            } else {
              const emailInStr = n.sdcLiaisonOfficer.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
              if (emailInStr) loEmail = emailInStr;
            }
          }
          if (n.domainApprovals && Array.isArray(n.domainApprovals)) {
            approverEmails = n.domainApprovals
              .map((a: any) => {
                const apprName = (a.approverName || "").toLowerCase();
                const matchedApprUser = allUsers.find(
                  (u) => u.role === "Technical Approver" && (apprName.includes(u.name.toLowerCase()) || u.name.toLowerCase().includes(apprName))
                );
                if (matchedApprUser) return matchedApprUser.email;
                const matchedDeptUser = allUsers.find(
                  (u) => u.role === "Technical Approver" && (
                    (a.approverGroup && (u.department.toLowerCase().includes(a.approverGroup.toLowerCase()) || u.orgUnit.toLowerCase().includes(a.approverGroup.toLowerCase()))) ||
                    (a.domain && (u.department.toLowerCase().includes(a.domain.toLowerCase()) || u.orgUnit.toLowerCase().includes(a.domain.toLowerCase())))
                  )
                );
                if (matchedDeptUser) return matchedDeptUser.email;
                return `${(a.approverGroup || a.approverName || "approver").toLowerCase().replace(/[^a-z0-9]+/g, ".")}@sdc.gov.sg`;
              })
              .filter(Boolean);
            approverEmails = Array.from(new Set(approverEmails));
          }
        }
      }
    } catch {}
  }

  // Resolve recipient
  let recipientRole = params.recipientRole || catalogEntry?.recipients[0] || "Stakeholder";
  let recipientEmail = params.recipientEmail || nopApplicantEmail || "operations.nop@sdc.gov.sg";

  // NTF-04: NOTIF-05, 10, 13, 16 route to assigned LO
  if (["NOTIF-05", "NOTIF-10", "NOTIF-13", "NOTIF-16"].includes(params.triggerCode)) {
    recipientRole = "SDC Liaison Officer";
    recipientEmail = loEmail;
  }

  // NTF-06: NOTIF-01 and NOTIF-09 route to applicant
  if (["NOTIF-01", "NOTIF-09"].includes(params.triggerCode)) {
    recipientRole = "Applicant (Contractor PIC)";
    recipientEmail = nopApplicantEmail || "applicant@kimseng.sg";
  }

  let finalContent = params.content || `Action occurred on application ${params.nopId} under event: ${triggerName}.`;
  if (!finalContent.includes("/nops/")) {
    finalContent += `\nPermit dossier: /nops/${params.nopId}`;
  }

  const newNotif: NOPNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    triggerCode: params.triggerCode,
    triggerName,
    nopId: params.nopId,
    companyName: nopCompanyName || "Contractor Entity",
    recipientRole,
    recipientEmail,
    channel: "Email",
    subject: params.subject || `[${params.triggerCode}] NOP Notification: ${params.nopId}`,
    content: finalContent,
    status: params.status || "Sent",
    dispatchedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    isMandatory: catalogEntry?.isMandatory ?? true
  };

  if (typeof window !== "undefined") {
    const existing = loadStoredNotifications();
    const updated = [newNotif, ...existing];

    // NTF-04 & NTF-08: NOTIF-17, 20, 21, 25, 26 also dispatch a record to assigned LO if an assigned LO exists on the record
    if (["NOTIF-17", "NOTIF-20", "NOTIF-21", "NOTIF-25", "NOTIF-26"].includes(params.triggerCode) && hasAssignedLo && recipientEmail !== loEmail) {
      const loNotif: NOPNotification = {
        ...newNotif,
        id: `notif-lo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipientRole: "SDC Liaison Officer",
        recipientEmail: loEmail
      };
      updated.unshift(loNotif);
    }

    // NTF-03, NTF-07 & NTF-08: NOTIF-12 (suspend) and NOTIF-15 (revoke) also dispatch to IIOC and Rangers resolved from distribution lists
    if (["NOTIF-12", "NOTIF-15"].includes(params.triggerCode)) {
      const iiocDl = cfg.distributionLists?.find(dl => dl.id === "DL-01" || dl.name.toLowerCase().includes("iioc"));
      const iiocEmail = (iiocDl && iiocDl.emails.length > 0) ? iiocDl.emails.join(", ") : "iioc.command@sdc.gov.sg";

      const rangerDl = cfg.distributionLists?.find(dl => dl.id === "DL-02" || dl.name.toLowerCase().includes("ranger"));
      const rangerEmail = (rangerDl && rangerDl.emails.length > 0) ? rangerDl.emails.join(", ") : "rangers.lead@sdc.gov.sg";

      const iiocNotif: NOPNotification = {
        ...newNotif,
        id: `notif-iioc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipientRole: iiocDl?.name || "Island Incident Operations Centre (IIOC)",
        recipientEmail: iiocEmail
      };
      const rangerNotif: NOPNotification = {
        ...newNotif,
        id: `notif-ranger-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipientRole: rangerDl?.name || "Sentosa Ranger Operations",
        recipientEmail: rangerEmail
      };
      updated.unshift(iiocNotif, rangerNotif);
    }

    // NTF-08: NOTIF-09 also dispatches to all assigned approvers
    if (params.triggerCode === "NOTIF-09" && approverEmails.length > 0) {
      const approverNotif: NOPNotification = {
        ...newNotif,
        id: `notif-appr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipientRole: "Assigned Technical Approvers",
        recipientEmail: approverEmails.join(", ")
      };
      updated.unshift(approverNotif);
    }

    saveStoredNotifications(updated);
  }

  return newNotif;
}

// Note: the reminder & escalation sweep (FRD §8.3 / I-13) is implemented once,
// correctly, in `src/lib/nopReminderEngine.ts` (`runApproverReminderScan`),
// which uses the right trigger codes (NOTIF-18 / NOTIF-19) and de-duplicates
// per approval step via persisted state. An earlier duplicate implementation
// that lived here (`checkAndTriggerEscalations`) used the wrong trigger codes,
// had no de-duplication, and hardcoded recipient emails — it has been removed
// (D-01/D-02/D-03, 21/09/2026) in favor of the single correct engine.
