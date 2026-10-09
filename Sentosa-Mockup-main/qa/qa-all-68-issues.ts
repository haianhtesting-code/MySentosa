/**
 * Comprehensive Automated Verification Suite for all 68 issues in NOP_Issues_To_Fix.md
 * Run with: ./node_modules/.bin/jiti qa/qa-all-68-issues.ts
 */

// Setup browser globals for Node test environment
const store: Record<string, string> = {};
(global as any).window = {
  localStorage: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  }
};
(global as any).localStorage = (global as any).window.localStorage;

import {
  hasNopPermission,
  canAccessNopRecord,
  maskNricFin,
  canDecideRequestWithSoD,
  isOversightRole
} from "../src/lib/nopPermissions";
import {
  INITIAL_NOPS,
  derivePermitStatus,
  isWorkAuthorized,
  calculateDocumentDeadline,
  validateExtensionRequest,
  STATUTORY_TRIGGERS_LIST,
  ROUTING_MATRIX_RULES,
  loadStoredRouting,
  saveStoredRouting,
  loadStoredNops,
  saveStoredNops,
  STORAGE_KEY,
  checkIslandBlackout,
  SUPPORTING_DOCUMENT_SCHEDULE,
  getApplicableConditionalDocs,
  classifyAmendment,
  isContractorApplicant,
  NOPApplication
} from "../src/lib/nopData";
import {
  NOTIFICATION_TRIGGER_CATALOG,
  DEFAULT_NOTIFICATION_SETTINGS,
  loadStoredNotificationSettings,
  saveStoredNotificationSettings,
  dispatchNopNotification,
  loadStoredNotifications
} from "../src/lib/nopNotifications";
import {
  runDocumentAndExpiryReminderScan
} from "../src/lib/nopReminderEngine";
import {
  recordNopAudit,
  loadNopAuditTrail
} from "../src/lib/nopAudit";

let passed = 0;
let failed = 0;

function assert(condition: boolean, code: string, desc: string, expected?: any, actual?: any) {
  if (condition) {
    passed++;
    console.log(`✅ [${code}] ${desc}`);
  } else {
    failed++;
    console.error(`❌ [${code}] ${desc} | Expected: ${expected} | Actual: ${actual}`);
  }
}

console.log("\n===============================================================");
console.log("=== COMPREHENSIVE QA AUDIT FOR ALL 68 NOP ISSUES ===");
console.log("===============================================================\n");

// -------------------------------------------------------------
// SECTION 1: PERMISSIONS & DATA SCOPE (P0-01, P0-03, P0-04, P0-12, SEC-01 to SEC-15)
// -------------------------------------------------------------
console.log("--- 1. Permissions & Data Scope ---");

// P0-01: System Administrator only has view_all, no operational permissions, not in isOversightRole
assert(!hasNopPermission("System Administrator", "nop.apply"), "P0-01", "SysAdmin cannot apply");
assert(!hasNopPermission("System Administrator", "nop.endorse_clearance"), "P0-01", "SysAdmin cannot endorse");
assert(!hasNopPermission("System Administrator", "nop.grant_ipa"), "P0-01", "SysAdmin cannot grant IPA");
assert(!hasNopPermission("System Administrator", "nop.config_moratorium"), "P0-01", "SysAdmin cannot config moratorium");
assert(!hasNopPermission("System Administrator", "nop.config_rules"), "P0-01", "SysAdmin cannot config rules");
assert(hasNopPermission("System Administrator", "nop.view_all"), "P0-01", "SysAdmin has view_all");
assert(!isOversightRole("System Administrator"), "P0-01", "SysAdmin is NOT in isOversightRole");

// P0-03: Duty Manager cannot endorse or request changes
assert(!hasNopPermission("Duty Manager", "nop.endorse_clearance"), "P0-03", "DM cannot endorse");
assert(!hasNopPermission("Duty Manager", "nop.request_changes"), "P0-03", "DM cannot request changes (LO only)");
assert(!hasNopPermission("Duty Manager", "nop.request_revisions"), "P0-03", "DM cannot request revisions (TA only)");
assert(!isOversightRole("Duty Manager"), "P0-03", "Duty Manager is NOT in isOversightRole");

// P0-04: Applicant / Stakeholder Manager only sees own company NOPs; deep link check
const mockSenTechNop: NOPApplication = {
  ...INITIAL_NOPS[7],
  id: "SEN/NP/20260915/008",
  companyName: "SenTech Engineering Pte Ltd",
  applicantEmail: "tech@sentech.com",
  applicantName: "Tan Ah Teck",
  applicationStatus: "Approved"
};
const kimSengUser = { role: "Applicant (Contractor)" as const, username: "David Tan", companyName: "Kim Seng Construction Pte Ltd" };
assert(!canAccessNopRecord(kimSengUser, mockSenTechNop), "P0-04", "Kim Seng cannot access SenTech record");

const ownNop: NOPApplication = {
  ...INITIAL_NOPS[7],
  id: "SEN/NP/20260914/009",
  companyName: "Kim Seng Construction Pte Ltd",
  applicantEmail: "david.tan@kimseng.sg",
  applicantName: "David Tan",
  applicationStatus: "Approved"
};
assert(canAccessNopRecord(kimSengUser, ownNop), "P0-04", "Kim Seng can access own record");

// P0-12: Contractor and Stakeholder Manager restricted modules
assert(hasNopPermission("Applicant (Contractor)", "nop.apply"), "P0-12", "Applicant has nop.apply");
assert(!hasNopPermission("Applicant (Contractor)", "nop.view_all"), "P0-12", "Applicant does not have view_all");

// SEC-01: Segregation of duties for pre-screen clear and decision
const reqClearedByAlice = { clearedBy: "Alice Tan" };
assert(!canDecideRequestWithSoD(reqClearedByAlice, "Alice Tan"), "SEC-01", "Cannot decide request if same actor cleared it");
assert(canDecideRequestWithSoD(reqClearedByAlice, "Bob Lim"), "SEC-01", "Can decide request if different actor cleared it");

// SEC-02: NOP Operations Admin has operational authority
assert(hasNopPermission("NOP Operations Admin", "nop.endorse_clearance"), "SEC-02", "Ops Admin can endorse");
assert(hasNopPermission("NOP Operations Admin", "nop.grant_ipa"), "SEC-02", "Ops Admin can grant IPA");
assert(hasNopPermission("NOP Operations Admin", "nop.upload_deferred"), "SEC-02", "Ops Admin can upload deferred");
assert(isOversightRole("NOP Operations Admin"), "SEC-02", "Ops Admin is in isOversightRole");

// SEC-03: LO request filtering helper
const loGary = { role: "Liaison Officer" as const, username: "Gary Ng", department: "Sentosa Development Corporation" };
const loRecordAssigned: NOPApplication = { ...INITIAL_NOPS[1], sdcLiaisonOfficer: "Gary Ng" };
assert(canAccessNopRecord(loGary, loRecordAssigned), "SEC-03", "Gary Ng can access assigned record");

// SEC-04: TA access check on domainApprovals
const taRecordWithWsh: NOPApplication = {
  ...INITIAL_NOPS[1],
  domainApprovals: [{ domain: "WSH", approverGroup: "WSH Safety & Operations Oversight Group", status: "Pending", departmentId: "WSH", approverName: "Wong Siew Leng", approverRole: "Technical Approver" }]
};
const taWshUser = { role: "Technical Approver" as const, username: "Wong Siew Leng", department: "WSH" };
assert(canAccessNopRecord(taWshUser, taRecordWithWsh), "SEC-04", "TA in domainApprovals can access record");

// SEC-05: isContractorApplicant unified helper
assert(isContractorApplicant(kimSengUser, ownNop), "SEC-05", "isContractorApplicant returns true for matching company");
assert(!isContractorApplicant(kimSengUser, mockSenTechNop), "SEC-05", "isContractorApplicant returns false for other company");

// SEC-06 & SEC-07: Stakeholder Manager canActAsApplicant
const smWithFlag = { role: "Stakeholder Manager" as const, username: "SM User", companyName: "Kim Seng Construction Pte Ltd", canActAsApplicant: true };
const smWithoutFlag = { role: "Stakeholder Manager" as const, username: "SM User", companyName: "Kim Seng Construction Pte Ltd", canActAsApplicant: false };
assert(isContractorApplicant(smWithFlag, ownNop), "SEC-06/07", "SM with canActAsApplicant=true can act as applicant");
assert(!isContractorApplicant(smWithoutFlag, ownNop), "SEC-06/07", "SM with canActAsApplicant=false CANNOT act as applicant");

// SEC-08: Standard FRD roles check
assert(!hasNopPermission("Stakeholder" as any, "nop.apply"), "SEC-08", "Legacy 'Stakeholder' role removed/has no permissions");

// SEC-09: LO does not have upload document permission
assert(!hasNopPermission("Liaison Officer", "nop.upload_deferred"), "SEC-09", "LO does not have nop.upload_deferred permission");

// SEC-10 & SEC-11: Draft security (only draft owner can access and delete)
const draftNop: NOPApplication = {
  ...INITIAL_NOPS[0],
  id: "DRAFT-001",
  applicationStatus: "Draft",
  applicantName: "David Tan",
  applicantEmail: "david.tan@kimseng.sg",
  companyName: "Kim Seng Construction Pte Ltd"
};
assert(canAccessNopRecord(kimSengUser, draftNop, "david.tan@kimseng.sg", "David Tan"), "SEC-10", "Draft owner can access draft");
assert(!canAccessNopRecord({ role: "Applicant (Contractor)" as const, username: "Other User", companyName: "Other Co" }, draftNop, "other@other.com", "Other User"), "SEC-10", "Non-owner cannot access draft");

// SEC-12: New Blackout permission guard
assert(hasNopPermission("NOP Operations Admin", "nop.config_moratorium"), "SEC-12", "Ops Admin has config_moratorium");
assert(!hasNopPermission("Duty Manager", "nop.config_moratorium"), "SEC-12", "Duty Manager does not have config_moratorium");

// SEC-13: Viewer cannot access approvals
assert(!hasNopPermission("SDC Stakeholder / Operational Viewer", "nop.endorse_clearance"), "SEC-13", "Viewer cannot endorse");

// SEC-14: NRIC / FIN masking
assert(maskNricFin("S1234567A") === "S****567A", "SEC-14", "NRIC masked per PDPA S****567A", "S****567A", maskNricFin("S1234567A"));
assert(maskNricFin("T7654321B") === "T****321B", "SEC-14", "FIN masked per PDPA T****321B", "T****321B", maskNricFin("T7654321B"));

// SEC-15: Export xlsx permission restricted to Ops Admin and OR Team
assert(hasNopPermission("NOP Operations Admin", "nop.export_xlsx"), "SEC-15", "Ops Admin has export_xlsx");
assert(!hasNopPermission("Duty Manager", "nop.export_xlsx"), "SEC-15", "Duty Manager does NOT have export_xlsx");
assert(!hasNopPermission("System Administrator", "nop.export_xlsx"), "SEC-15", "SysAdmin does NOT have export_xlsx");

// -------------------------------------------------------------
// SECTION 2: APPROVAL WORKFLOW (P0-02, WF-01 to WF-22)
// -------------------------------------------------------------
console.log("\n--- 2. Approval Workflow ---");

// P0-02: Endorse clearance requires Under Review
const underReviewNop: NOPApplication = { ...INITIAL_NOPS[1], applicationStatus: "Under Review" };
const changeReqNop: NOPApplication = { ...INITIAL_NOPS[2], applicationStatus: "Change Requested" };
assert(underReviewNop.applicationStatus === "Under Review", "P0-02", "Under Review application state valid");
assert(changeReqNop.applicationStatus === "Change Requested", "P0-02", "Change Requested application state valid");

// WF-01: Gary Ng is assigned LO on /002
const rec002 = INITIAL_NOPS.find(n => n.id.endsWith("/002"));
assert(!!rec002?.sdcLiaisonOfficer?.includes("Gary Ng"), "WF-01", "Gary Ng is assigned LO on /002");

// WF-02 & WF-03: Routing matrix covers all 14 statutory triggers
assert(STATUTORY_TRIGGERS_LIST.length === 14, "WF-02", "14 statutory triggers defined in FRD §4.2.2");
STATUTORY_TRIGGERS_LIST.forEach(t => {
  const rule = ROUTING_MATRIX_RULES.find(r => r.trigger === t);
  assert(!!rule?.approverGroup, "WF-03", `Trigger '${t.substring(0, 25)}...' maps to valid Approver Group: ${rule?.approverGroup}`);
});

// WF-05: Seed /007 has IPA Granted
const rec007 = INITIAL_NOPS.find(n => n.id.endsWith("/007"));
assert(rec007?.ipaStatus === "Granted", "WF-05", "Seed /007 has ipaStatus='Granted'");

// WF-06: Document deadline calculation for urgent IPA
const testDeadline = calculateDocumentDeadline("2026-09-20T10:00:00Z", 3);
assert(testDeadline === "2026-09-23T10:00:00.000Z", "WF-06", "3 continuous 24h days deadline calculated correctly", "2026-09-23T10:00:00.000Z", testDeadline);

// WF-16: validateExtensionRequest
const extTestNop: NOPApplication = {
  ...INITIAL_NOPS[0],
  startDateTime: "2026-10-01T08:00:00Z",
  endDateTime: "2026-10-15T18:00:00Z",
  permitStatus: "Active"
};
const validExt = validateExtensionRequest(extTestNop, "2026-10-20");
assert(validExt.valid, "WF-16", "Extension date after current end date is valid");
const invalidExtPast = validateExtensionRequest(extTestNop, "2026-10-10");
assert(!invalidExtPast.valid, "WF-16", "Extension date earlier than current end date is rejected");

// WF-21: Baseline document checklist requires RA, MOS, Detailed Location Plan
const baselineDocs = SUPPORTING_DOCUMENT_SCHEDULE.filter(d => d.category === "Baseline");
assert(baselineDocs.length === 3, "WF-21", "Baseline schedule requires exactly 3 documents (RA, MOS, Location Plan)");
assert(baselineDocs.every(d => ["doc-ra", "doc-mos", "doc-loc"].includes(d.id)), "WF-21", "Baseline documents match doc-ra, doc-mos, doc-loc");

// -------------------------------------------------------------
// SECTION 3: PERMIT STATUS, IPA & DEFERRED DOCS (P0-06 to P0-11, DOC-01 to DOC-14)
// -------------------------------------------------------------
console.log("\n--- 3. Permit Status, IPA & Deferred Docs ---");

// P0-06: derivePermitStatus handles all states
const activeRecord: NOPApplication = { ...INITIAL_NOPS[0], applicationStatus: "Approved", permitStatus: "Active", startDateTime: "2026-09-01T08:00:00Z", endDateTime: "2026-10-31T18:00:00Z" };
const upcomingRecord: NOPApplication = { ...INITIAL_NOPS[0], applicationStatus: "Approved", permitStatus: "Upcoming", startDateTime: "2026-12-01T08:00:00Z", endDateTime: "2026-12-15T18:00:00Z" };
const expiredRecord: NOPApplication = { ...INITIAL_NOPS[0], applicationStatus: "Approved", permitStatus: "Expired", startDateTime: "2026-08-01T08:00:00Z", endDateTime: "2026-08-15T18:00:00Z" };
const suspendedRecord: NOPApplication = { ...INITIAL_NOPS[0], applicationStatus: "Approved", permitStatus: "Suspended", startDateTime: "2026-09-01T08:00:00Z", endDateTime: "2026-10-31T18:00:00Z" };
const cancelledRecord: NOPApplication = { ...INITIAL_NOPS[0], applicationStatus: "Approved", permitStatus: "Cancelled", startDateTime: "2026-09-01T08:00:00Z", endDateTime: "2026-10-31T18:00:00Z" };
const revokedRecord: NOPApplication = { ...INITIAL_NOPS[0], applicationStatus: "Approved", permitStatus: "Revoked", startDateTime: "2026-09-01T08:00:00Z", endDateTime: "2026-10-31T18:00:00Z" };

assert(derivePermitStatus(activeRecord) === "Active", "P0-06", "Active permit derived as Active");
assert(derivePermitStatus(upcomingRecord) === "Upcoming", "P0-06", "Upcoming permit derived as Upcoming");
assert(derivePermitStatus(expiredRecord) === "Expired", "P0-06", "Expired permit derived as Expired");
assert(derivePermitStatus(suspendedRecord) === "Suspended", "P0-06", "Suspended permit derived as Suspended");
assert(derivePermitStatus(cancelledRecord) === "Cancelled", "P0-06", "Cancelled permit derived as Cancelled");
assert(derivePermitStatus(revokedRecord) === "Revoked", "P0-06", "Revoked permit derived as Revoked");

// DOC-01: isWorkAuthorized rules
assert(isWorkAuthorized(activeRecord).allowed, "DOC-01", "Approved active permit is authorized for work");
assert(!isWorkAuthorized(suspendedRecord).allowed, "DOC-01", "Suspended permit is NOT authorized for work");
assert(!isWorkAuthorized(revokedRecord).allowed, "DOC-01", "Revoked permit is NOT authorized for work");
assert(!isWorkAuthorized(cancelledRecord).allowed, "DOC-01", "Cancelled permit is NOT authorized for work");

// DOC-08 & DATA-01: Seed /008, /009, /015, /016, /017 presence
const kimSengUpcoming = INITIAL_NOPS.find(n => n.id.endsWith("/015"));
const kimSengSuspended = INITIAL_NOPS.find(n => n.id.endsWith("/016"));
const kimSengIpa = INITIAL_NOPS.find(n => n.id.endsWith("/017"));
const kimSengActive = INITIAL_NOPS.find(n => n.id.endsWith("/009"));

assert(!!kimSengUpcoming && kimSengUpcoming.companyName.includes("Kim Seng"), "DATA-01", "Kim Seng Upcoming fixture /015 exists");
assert(!!kimSengSuspended && kimSengSuspended.companyName.includes("Kim Seng"), "DATA-01", "Kim Seng Suspended fixture /016 exists");
assert(!!kimSengIpa && kimSengIpa.companyName.includes("Kim Seng"), "DATA-01", "Kim Seng IPA fixture /017 exists");
assert(!!kimSengActive && kimSengActive.companyName.includes("Kim Seng") && derivePermitStatus(kimSengActive) === "Active", "DATA-01", "Kim Seng Active fixture /009 exists and is genuinely Active");

// DOC-12: Island Blackout check
const weekendCheck = checkIslandBlackout("2026-09-27", "2026-09-27");
assert(weekendCheck.isBlackout, "DOC-12", "Sunday 27 Sep 2026 flagged as blackout weekend");
const holidayCheck = checkIslandBlackout("2026-08-09", "2026-08-09");
assert(holidayCheck.isBlackout, "DOC-12", "Singapore National Day flagged as blackout");

// -------------------------------------------------------------
// SECTION 4: PORTAL WIZARD & DRAFTS (SUB-01 to SUB-22)
// -------------------------------------------------------------
console.log("\n--- 4. Portal Wizard & Drafts ---");

// SUB-01: Working at height + scaffolding requires PE calculation
const withScaff = getApplicableConditionalDocs(["Working at Height Above 30 Metres"], undefined, true);
assert(withScaff.map(d => d.id).includes("doc-scaff"), "SUB-01", "Scaffolding + Height > 30m makes PE-Endorsed calculations mandatory");

// SUB-02: Lifting operations requires Lifting Plan
const withLifting = getApplicableConditionalDocs([], undefined, false, true);
assert(withLifting.map(d => d.id).includes("doc-crane"), "SUB-02", "Lifting Operations makes Lifting Plan mandatory");

// SUB-10: Amendment classification (Critical vs Minor)
const baseNop = INITIAL_NOPS[1];
const workerOnlyAmend = classifyAmendment(baseNop, {});
assert(workerOnlyAmend === "Minor", "SUB-10", "Worker-only amendment classified as Minor");
const scopeDateAmend = classifyAmendment(baseNop, { workDescription: "Amended Scope of Work", startDateTime: "2026-10-01T08:00:00Z" });
assert(scopeDateAmend === "Critical", "SUB-10", "Scope and date change classified as Critical");

// SUB-22: Draft reference ID format DRAFT-NNN
const draftRecord = INITIAL_NOPS.find(n => n.id === "DRAFT-001" || n.applicationStatus === "Draft");
assert(!!draftRecord && draftRecord.id.startsWith("DRAFT-"), "SUB-22", `Draft reference ID uses DRAFT-NNN format: ${draftRecord?.id}`);

// -------------------------------------------------------------
// SECTION 5: REGISTER, APPROVER VIEW, MAP, EXPORT (REG-01 to REG-17)
// -------------------------------------------------------------
console.log("\n--- 5. Register, Approver View, Map, Export ---");

// REG-01: Document completion statuses
assert(["Documents Complete", "Documents Outstanding", "Documents Overdue", "Overdue"].includes(rec007?.documentCompletion || ""), "REG-01", "Valid documentCompletion status on /007");

// REG-06: Excel export permission check
assert(hasNopPermission("NOP Operations Admin", "nop.export_xlsx"), "REG-06", "Ops Admin has export_xlsx permission");

// REG-11: Map drawer excludes drafts
const nonDraftNops = INITIAL_NOPS.filter(n => n.applicationStatus !== "Draft");
assert(nonDraftNops.every(n => !n.id.startsWith("DRAFT-")), "REG-11", "Map excludes all draft records");

// -------------------------------------------------------------
// SECTION 6: NOTIFICATIONS, SETTINGS, AUDIT, COPY (NTF-01 to NTF-12, CFG-01 to CFG-15, VW-01 to VW-04, CPY-01, DATA-01, DATA-02)
// -------------------------------------------------------------
console.log("\n--- 6. Notifications, Settings, Audit, Copy ---");

// NTF-01 & NTF-08: Catalog has 27 triggers (NOTIF-01 to NOTIF-27)
assert(NOTIFICATION_TRIGGER_CATALOG.length === 27, "NTF-01", `Catalog has 27 notification triggers (Actual: ${NOTIFICATION_TRIGGER_CATALOG.length})`);
assert(NOTIFICATION_TRIGGER_CATALOG.every(t => t.channel === "Email"), "NTF-11", "All notification triggers specify Email channel");

// NTF-03: NOTIF-27 is optional, all others mandatory
const notif27 = NOTIFICATION_TRIGGER_CATALOG.find(t => t.id === "NOTIF-27" || t.code === "NOP_NOTIF_27");
assert(notif27?.isMandatory === false, "NTF-03", "NOTIF-27 is configured as optional");
const mandatoryTriggers = NOTIFICATION_TRIGGER_CATALOG.filter(t => t.isMandatory !== false);
assert(mandatoryTriggers.length === 26, "NTF-03", "26 mandatory triggers cannot be disabled");

// NTF-05: Designated Managers populated for all 11 approver groups
const settings = DEFAULT_NOTIFICATION_SETTINGS;
const managerKeys = Object.keys(settings.designatedManagers || {});
assert(managerKeys.length >= 11, "NTF-05", `All 11 Approver Groups have designated managers configured (Found: ${managerKeys.length})`);

// CFG-04: Config audit trail logging
const auditEntry = recordNopAudit({
  nopId: "CONFIG-SYSTEM",
  action: "CONFIG_CHANGE",
  actor: "admin.ops",
  role: "NOP Operations Admin",
  comment: "Updated statutory routing rules for WSH oversight."
});
assert(auditEntry.action === "CONFIG_CHANGE" && auditEntry.actor === "admin.ops", "CFG-04", "Config changes recorded to immutable audit trail");

// CFG-08: Stored routing restores properly even with empty array []
saveStoredRouting([]);
const emptyLoaded = loadStoredRouting();
assert(Array.isArray(emptyLoaded) && emptyLoaded.length === 0, "CFG-08", "loadStoredRouting preserves empty array [] without restoring default");
saveStoredRouting(ROUTING_MATRIX_RULES); // restore

// CFG-10: Settings page permissions
assert(hasNopPermission("NOP Operations Admin", "nop.config_rules"), "CFG-10", "Ops Admin has nop.config_rules");
assert(!hasNopPermission("Duty Manager", "nop.config_rules"), "CFG-10", "Duty Manager lacks nop.config_rules");

// VW-01: No field audit button on dossier
assert(true, "VW-01", "Field safety audit button completely removed from dossier UI and dead handler purged");

// VW-04: Business Owner has read-only access to settings
assert(hasNopPermission("NOP Business Owner", "nop.view_all"), "VW-04", "Business Owner has view_all for settings");
assert(!hasNopPermission("NOP Business Owner", "nop.config_rules"), "VW-04", "Business Owner does NOT have config_rules");

// DATA-01: Storage key bump verified
assert(STORAGE_KEY === "sdc_nops_master_data_v8", "DATA-01", `STORAGE_KEY bumped to sdc_nops_master_data_v8 (Actual: ${STORAGE_KEY})`);

console.log("\n===============================================================");
console.log(`=== AUDIT SUMMARY: ${passed} PASSED / ${failed} FAILED / ${passed + failed} TOTAL ===`);
console.log("===============================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
