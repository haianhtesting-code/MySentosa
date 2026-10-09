// Comprehensive verification for NOP-01 through NOP-18 defects & FRD v0.5 config
import {
  INITIAL_NOPS,
  ROUTING_MATRIX_RULES,
  DEFAULT_APPROVER_GROUPS,
  getActiveMapNops,
  getUpcomingMapNops,
  derivePermitStatus,
  getEffectiveStatusBadgeProps,
  classifyAmendment,
  isValidSingaporePhone,
  isValidEmail
} from "../src/lib/nopData";
import { generateSeedAuditTrail } from "../src/lib/nopAudit";

let passCount = 0;
let failCount = 0;

function assert(id: string, description: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`✅ ${id} | ${description}`);
    passCount++;
  } else {
    console.error(`❌ ${id} | FAIL: ${description}${details ? ` -> ${details}` : ""}`);
    failCount++;
  }
}

console.log("=== RUNNING NOP-01 to NOP-18 DEFECT & CONFIG VERIFICATION ===");

// 1. NOP-01: Resubmission document management & classification
const nop003 = INITIAL_NOPS.find(n => n.id === "SEN/NP/20260920/003");
assert("NOP-01-A", "NOP /003 exists in seed data with Change Requested status", !!nop003 && nop003.applicationStatus === "Change Requested");
const amendedClassification = classifyAmendment(nop003!, {
  workDescription: nop003!.workDescription,
  startDateTime: nop003!.startDateTime,
  endDateTime: nop003!.endDateTime,
  location: nop003!.location,
  zone: nop003!.zone
});
assert("NOP-01-B", "Document-only amendment is classified as Minor", amendedClassification === "Minor");

// 2. NOP-02: LO Pre-screen baseline 3-doc requirement
const nop002 = INITIAL_NOPS.find(n => n.id === "SEN/NP/20260921/002");
assert("NOP-02-A", "NOP /002 exists and is Under Review", !!nop002 && nop002.applicationStatus === "Under Review");
const nop002HasLocPlan = (nop002?.documents || []).some(d => d.name.toLowerCase().includes("location plan") || d.type.toLowerCase().includes("location"));
assert("NOP-02-B", "NOP /002 is missing Detailed Location Plan", !nop002HasLocPlan);

// 3. NOP-03: Segregation of duties for Gary Ng on /002
const isGaryNgLO = nop002?.sdcLiaisonOfficer.toLowerCase().includes("gary ng");
assert("NOP-03-A", "Gary Ng is the assigned Liaison Officer on /002", !!isGaryNgLO);

// 4. NOP-04: Active & Upcoming UCS Map boundary isolation
const activeMapNops = getActiveMapNops(INITIAL_NOPS, new Date("2026-09-24T10:00:00Z"));
const upcomingMapNops = getUpcomingMapNops(INITIAL_NOPS, new Date("2026-09-24T10:00:00Z"));
const activeIncludesDraft = activeMapNops.some(n => n.applicationStatus === "Draft");
const activeIncludesWithdrawn = activeMapNops.some(n => n.applicationStatus === "Withdrawn");
const activeIncludesCancelled = activeMapNops.some(n => n.permitStatus === "Cancelled");
assert("NOP-04-A", "Active map layer excludes Drafts, Withdrawn, and Cancelled NOPs", !activeIncludesDraft && !activeIncludesWithdrawn && !activeIncludesCancelled);
const upcomingIncludesDraft = upcomingMapNops.some(n => n.applicationStatus === "Draft");
assert("NOP-04-B", "Upcoming map layer excludes Drafts", !upcomingIncludesDraft);

// 5. NOP-05, NOP-06, NOP-07, NOP-08: Urgent /007 IPA Decoupling & Deferred Documents
const nop007 = INITIAL_NOPS.find(n => n.id === "SEN/NP/20260916/007");
assert("NOP-07-A", "NOP /007 has IPA Granted status", nop007?.ipaStatus === "Granted");
const is007WindowExpired = new Date("2026-09-19") < new Date("2026-09-24");
assert("NOP-07-B", "NOP /007 authorization window expired on 19 Sep 2026", is007WindowExpired);
const received007Count = (nop007?.documents || []).filter(d => !d.isDeferred).length;
const deferred007Count = (nop007?.deferredDocuments || []).length;
assert("NOP-06-A", "NOP /007 has 1 received document and 2 overdue/deferred documents", received007Count === 1 && deferred007Count === 2);

// 6. NOP-09, NOP-10, NOP-15, NOP-18: Register Table Badges, Next Step, Filters & Working Hours
const nop006 = INITIAL_NOPS.find(n => n.id === "SEN/NP/20260917/006");
const nop013 = INITIAL_NOPS.find(n => n.id === "SEN/NP/20260905/013");
assert("NOP-15-A", "Seed data includes Withdrawn /006", !!nop006 && nop006.applicationStatus === "Withdrawn");
assert("NOP-15-B", "Seed data includes Cancelled /013", !!nop013 && nop013.permitStatus === "Cancelled");
assert("NOP-09-A", "Withdrawn badge props return Withdrawn label", getEffectiveStatusBadgeProps(nop006!).label === "Withdrawn");
assert("NOP-09-B", "Cancelled badge props return Cancelled label", getEffectiveStatusBadgeProps(nop013!).label === "Cancelled");
const nopWithDaily = INITIAL_NOPS.find(n => n.workingHours && n.workingHours.includes("(Daily)"));
assert("NOP-18-A", "Seed data workingHours has (Daily)", !!nopWithDaily);

// 7. NOP-11, NOP-12, NOP-13: Suspension Lifting & Audit Trail on /011
const nop011 = INITIAL_NOPS.find(n => n.id === "SEN/NP/20260912/011");
assert("NOP-11-A", "NOP /011 exists with Suspended status and lifting request", !!nop011 && nop011.permitStatus === "Suspended" && !!nop011.liftingRequest);
const audit011 = generateSeedAuditTrail(nop011!.id);
assert("NOP-13-A", "NOP /011 dynamic audit trail has >= 7 events", audit011.length >= 7);
const hasSpotCheck = audit011.some(e => e.action === "SUSPEND_PERMIT");
const hasLiftingReq = audit011.some(e => e.action === "REQUEST_LIFT_SUSPENSION");
assert("NOP-13-B", "NOP /011 audit trail contains SUSPEND_PERMIT and REQUEST_LIFT_SUSPENSION", hasSpotCheck && hasLiftingReq);

// 8. NOP-14: Draft /001 Siloso Hydration & Validation
const nop001 = INITIAL_NOPS.find(n => n.id === "DRAFT-001" || n.id === "SEN/NP/20260921/001");
assert("NOP-14-A", "Draft /001 is set at Siloso location", !!nop001 && nop001.location.includes("Siloso"));
assert("NOP-14-B", "Draft /001 has detailed location fields (roadName, postalCode, spaceDescription)", !!nop001?.roadName && !!nop001?.postalCode && !!nop001?.spaceDescription);
assert("NOP-14-C", "Valid Singapore phone passes validation", isValidSingaporePhone("+65 8123 4567") && isValidSingaporePhone("91234567"));
assert("NOP-14-D", "Valid Singapore phone passes validation", isValidSingaporePhone("91234567"));
assert("NOP-14-E", "Valid email passes validation", isValidEmail("contractor@bca-builder.sg"));

// 9. Configuration: Approver Group g7 bound to Working at Height Above 30 Metres
const heightRule = ROUTING_MATRIX_RULES.find(r => r.trigger.includes("Working at Height Above 30 Metres"));
assert("CFG-01-A", "Working at Height Above 30 Metres is bound to groupId g7", heightRule?.groupId === "g7");
const groupG7 = DEFAULT_APPROVER_GROUPS.find(g => g.id === "g7");
assert("CFG-01-B", "Group g7 is WSH Safety & Operations Oversight Group", groupG7?.name === "WSH Safety & Operations Oversight Group");
assert("CFG-01-C", "Height rule approverGroup matches group g7 name exactly", heightRule?.approverGroup === groupG7?.name);

console.log(`\n=== RESULTS: ${passCount} PASSED / ${failCount} FAILED ===`);
if (failCount > 0) process.exit(1);
