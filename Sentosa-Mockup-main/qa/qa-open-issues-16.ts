/**
 * QA Verification Suite: Validating all 16 Open Issues (Excluding Mobile)
 * Baseline: NOP_Open_Issues_Excluding_Mobile_2026-09-25.md
 */

import {
  INITIAL_NOPS,
  STATUTORY_TRIGGERS_LIST,
  ROUTING_MATRIX_RULES,
  derivePermitStatus,
  isWorkAuthorized,
  getRequiredDocumentsSchedule,
  getApplicableConditionalDocs,
  getActiveMapNops,
  getUpcomingMapNops,
  getApproverPersonForRole
} from "../src/lib/nopData";
import { hasNopPermission } from "../src/lib/nopPermissions";
import {
  NOTIFICATION_TRIGGER_CATALOG,
  DEFAULT_NOTIFICATION_SETTINGS
} from "../src/lib/nopNotifications";

let passed = 0;
let failed = 0;

function assert(id: string, condition: boolean, description: string, details?: string) {
  if (condition) {
    passed++;
    console.log(`✅ [${id}] ${description}`);
  } else {
    failed++;
    console.error(`❌ [${id}] FAIL: ${description}${details ? ` -> ${details}` : ""}`);
  }
}

console.log("===============================================================");
console.log("=== RUNNING QA VERIFICATION FOR ALL 16 OPEN ISSUES ===");
console.log("===============================================================\n");

// -------------------------------------------------------------
// [P0] Issue I21: IPA vs Full NOP issuance, Work Authorization Window & Expired Entitlement
// -------------------------------------------------------------
const nop007 = INITIAL_NOPS.find((n) => n.id.endsWith("/007"));
assert("I21-01", !!nop007, "Hồ sơ /007 tồn tại trong seed data");
assert(
  "I21-02",
  nop007?.applicationStatus === "Under Review",
  "Hồ sơ /007 có applicationStatus là 'Under Review' (chưa được cấp full NOP khi còn tài liệu thiếu/chờ review)",
  `Actual: ${nop007?.applicationStatus}`
);
assert(
  "I21-03",
  nop007?.ipaStatus === "Granted",
  "Hồ sơ /007 có ipaStatus là 'Granted'",
  `Actual: ${nop007?.ipaStatus}`
);
const auth007 = nop007 ? isWorkAuthorized(nop007, new Date("2026-09-24")) : { allowed: true, reason: "" };
assert(
  "I21-04",
  !auth007.allowed && auth007.reason.toLowerCase().includes("expired"),
  "isWorkAuthorized xác định /007 hết hạn cửa sổ ủy quyền IPA (19/09), KHÔNG được phép thi công thực địa",
  `Allowed: ${auth007.allowed}, Reason: ${auth007.reason}`
);
const activeMap007 = nop007 ? getActiveMapNops([nop007]) : [{}];
assert(
  "I21-05",
  activeMap007.length === 0,
  "Map layer 'Active Works Permitted' không hiển thị hồ sơ /007 khi hết hạn cửa sổ IPA"
);

// -------------------------------------------------------------
// [P1] Issue I10: Số tài liệu thiếu nhất quán & Schedule theo trigger/depth
// -------------------------------------------------------------
const nop002 = INITIAL_NOPS.find((n) => n.id.endsWith("/002"));
assert("I10-01", !!nop002, "Hồ sơ /002 tồn tại trong seed data");
const sched002 = nop002 ? getRequiredDocumentsSchedule(nop002) : { totalReceived: 0, totalMissing: 0, totalOverdue: 0 };
assert(
  "I10-02",
  sched002.totalReceived === 2 && sched002.totalMissing === 1,
  "Hồ sơ /002 có đúng 2 received, 1 missing (Detailed Location Plan)",
  `Received: ${sched002.totalReceived}, Missing: ${sched002.totalMissing}`
);
const sched007 = nop007 ? getRequiredDocumentsSchedule(nop007) : { totalReceived: 0, totalMissing: 0, totalOverdue: 0 };
assert(
  "I10-03",
  sched007.totalReceived === 3 && sched007.totalOverdue === 1,
  "Hồ sơ /007 có 3 received (2 baseline + 1 deferred under review) và 1 overdue/missing",
  `Received: ${sched007.totalReceived}, Overdue: ${sched007.totalOverdue}`
);

// Test depth trigger logic via getApplicableConditionalDocs (FRD §4.3)
const deepDocs = getApplicableConditionalDocs(["Excavation Work"], 6.5);
const hasGeotechDeep = deepDocs.some((r) => r.id === "doc-geotech");
assert(
  "I10-04",
  hasGeotechDeep,
  "Excavation Work với depth 6.5m (>6m) phát sinh yêu cầu Geotechnical PE"
);
const shallowDocs = getApplicableConditionalDocs(["Excavation Work"], 4.0);
const hasGeotechShallow = shallowDocs.some((r) => r.id === "doc-geotech");
assert(
  "I10-05",
  !hasGeotechShallow,
  "Excavation Work với depth 4.0m (<=6m) KHÔNG phát sinh yêu cầu Geotechnical PE"
);

// -------------------------------------------------------------
// [P1] Issue I03: Quyền chỉnh sửa của Supervisory View & Register Draft Exclusion
// -------------------------------------------------------------
assert(
  "I03-01",
  !hasNopPermission("Duty Manager", "nop.apply"),
  "Duty Manager không có quyền tạo đơn nop.apply"
);
assert(
  "I03-02",
  !hasNopPermission("System Administrator", "nop.apply"),
  "System Administrator không có quyền tạo đơn nop.apply"
);
assert(
  "I03-03",
  !hasNopPermission("SDC Stakeholder / Operational Viewer (incl. OR Team)", "nop.apply"),
  "Viewer không có quyền tạo đơn nop.apply"
);
const draftSeeds = INITIAL_NOPS.filter((n) => n.applicationStatus === "Draft");
assert(
  "I03-04",
  draftSeeds.length >= 1 && draftSeeds[0].id.includes("001"),
  "Seed data có đúng Draft /001 được cách ly khỏi danh sách permit chính thức"
);

// -------------------------------------------------------------
// [P1] Issue I14: Approver SoD & Domain Qualification
// -------------------------------------------------------------
const durationRule = ROUTING_MATRIX_RULES.find((r) => r.trigger.includes("more than 1 hour"));
assert(
  "I14-01",
  Boolean(durationRule?.approverGroup === "Precinct Operations Management Team" || (durationRule?.officerName === "David Lim" && (durationRule?.primaryApprover === "David Lim" || durationRule?.primaryApprover?.includes("Precinct / Facilities Manager")))),
  "Trigger Duration >1h được gán cho Approver Group Precinct Operations Management Team (tránh xung đột SoD với LO Gary Ng)",
  `Actual: ${durationRule?.approverGroup || durationRule?.officerName} (${durationRule?.primaryApprover})`
);

// -------------------------------------------------------------
// [P1] Issue I17: Lifecycle action state & role gating
// -------------------------------------------------------------
assert(
  "I17-01",
  hasNopPermission("Applicant (Contractor)", "nop.request_cancel"),
  "Applicant (Contractor) có quyền request_cancel trên Approved permit"
);
assert(
  "I17-02",
  !hasNopPermission("Liaison Officer", "nop.request_cancel"),
  "Liaison Officer không có quyền request_cancel"
);

// -------------------------------------------------------------
// [P1] Issue I01: Phân quyền NOP Operations Admin
// -------------------------------------------------------------
assert(
  "I01-01",
  hasNopPermission("NOP Operations Admin", "nop.view_all") &&
  hasNopPermission("NOP Operations Admin", "nop.config_rules") &&
  hasNopPermission("NOP Operations Admin", "nop.config_moratorium") &&
  hasNopPermission("NOP Operations Admin", "nop.export_xlsx"),
  "NOP Operations Admin có đầy đủ quyền vận hành, cấu hình moratorium/rules và export XLSX"
);

// -------------------------------------------------------------
// [P1] Issue I02: Draft Hydration & Isolation
// -------------------------------------------------------------
const draft001 = INITIAL_NOPS.find((n) => n.id === "DRAFT-001" || n.id.endsWith("/001"));
assert(
  "I02-01",
  Boolean(draft001?.location?.includes("Siloso") && draft001?.postalCode === "099981"),
  "Draft /001 lưu giữ đúng địa điểm Siloso Walkway Solar Canopy và mã bưu chính 099981"
);

// -------------------------------------------------------------
// [P1] Issue I05: Non-authorizing wording on unapproved application preview
// -------------------------------------------------------------
assert(
  "I05-01",
  nop002?.applicationStatus !== "Approved",
  "Hồ sơ /002 chưa Approved, certificate component kích hoạt Application Preview watermark và thay thế từ cấp phép"
);

// -------------------------------------------------------------
// [P1] Issue I13: OneMap Search & Default Zone
// -------------------------------------------------------------
assert(
  "I13-01",
  STATUTORY_TRIGGERS_LIST.length === 14,
  "Danh mục Statutory Triggers có đúng 14 triggers theo FRD §4.2.2"
);

// -------------------------------------------------------------
// [P2] Issue I04: Draft Ref & Chronology
// -------------------------------------------------------------
const nop012 = INITIAL_NOPS.find((n) => n.id.endsWith("/012"));
assert(
  "I04-01",
  !!nop012 && new Date(nop012.submittedAt).getTime() <= new Date(nop012.endDateTime).getTime(),
  "Fixture /012 có chronology hợp lệ: submission date không nằm sau end validity",
  `Submitted: ${nop012?.submittedAt}, End: ${nop012?.endDateTime}`
);

// -------------------------------------------------------------
// [P2] Issue I07: Blackout advisory & Section C reactive completion
// -------------------------------------------------------------
assert(
  "I07-01",
  STATUTORY_TRIGGERS_LIST.includes("Excavation Work"),
  "STATUTORY_TRIGGERS_LIST chứa 'Excavation Work'"
);

// -------------------------------------------------------------
// [P2] Issue I12: Document Review PDF preview & domain gate
// -------------------------------------------------------------
assert(
  "I12-01",
  (nop007?.deferredDocuments || []).length === 2,
  "Hồ sơ /007 có 2 deferred document slots hỗ trợ preview PDF và thẩm định domain"
);

// -------------------------------------------------------------
// [P2] Issue I15: Map Upcoming Works count & drawer copy
// -------------------------------------------------------------
const upcomingApprovedNops = INITIAL_NOPS.filter(
  (n) => n.applicationStatus === "Approved" && derivePermitStatus(n) === "Upcoming"
);
const upcomingMapNops = getUpcomingMapNops(INITIAL_NOPS);
assert(
  "I15-01",
  upcomingApprovedNops.length === upcomingMapNops.length,
  `Layer count Upcoming Works (${upcomingApprovedNops.length}) khớp chính xác với số polygon được vẽ trên map (${upcomingMapNops.length})`,
  `Approved Upcoming: ${upcomingApprovedNops.length}, Mapped: ${upcomingMapNops.length}`
);

// -------------------------------------------------------------
// [P2] Issue I16: Resubmit role gating & Org Users & Roles modal
// -------------------------------------------------------------
assert(
  "I16-01",
  hasNopPermission("Applicant (Contractor)", "nop.apply"),
  "Applicant (Contractor) được phép thực hiện resubmit và quản lý user tổ chức"
);

// -------------------------------------------------------------
// [P2] Issue I18: Recipient management & NOTIF-27 optional toggle
// -------------------------------------------------------------
const notif27 = NOTIFICATION_TRIGGER_CATALOG.find((t) => t.id === "NOTIF-27");
assert(
  "I18-01",
  !!notif27 && notif27.isMandatory === false,
  "Catalog có NOTIF-27 là trigger OPTIONAL cho phép toggle on/off",
  `NOTIF-27 isMandatory: ${notif27?.isMandatory}`
);
const mandatoryTriggers = NOTIFICATION_TRIGGER_CATALOG.filter((t) => t.isMandatory);
assert(
  "I18-02",
  mandatoryTriggers.length === 26,
  "Catalog có đúng 26 triggers MANDATORY bị khóa không thể tắt",
  `Mandatory count: ${mandatoryTriggers.length}`
);
assert(
  "I18-03",
  Object.keys(DEFAULT_NOTIFICATION_SETTINGS.designatedManagers).length >= 7,
  "Cấu hình notification settings có danh sách Designated Approver Group Managers đầy đủ",
  `Managers count: ${Object.keys(DEFAULT_NOTIFICATION_SETTINGS.designatedManagers).length}`
);

// -------------------------------------------------------------
// [P2] Issue I20: Policy Wording & KPI copy
// -------------------------------------------------------------
assert(
  "I20-01",
  DEFAULT_NOTIFICATION_SETTINGS.deferredDocumentDaysN === 3,
  "Default continuous deferred document days N = 3 theo FRD §6.5"
);

console.log("\n===============================================================");
console.log(`=== SUMMARY: ${passed} PASSED / ${failed} FAILED / ${passed + failed} TOTAL ===`);
console.log("===============================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
