import {
  STATUTORY_TRIGGERS_LIST,
  ROUTING_MATRIX_RULES,
  SUPPORTING_DOCUMENT_SCHEDULE,
  resolveApprovers,
  getShortTriggerName,
  derivePermitStatus,
  INITIAL_NOPS,
  checkIslandBlackout,
  calculateDocumentDeadline
} from '../src/lib/nopData';
import { hasNopPermission } from '../src/lib/nopPermissions';
import {
  NOTIFICATION_TRIGGER_CATALOG,
  dispatchNopNotification,
  loadStoredNotifications,
  clearStoredNotifications,
  loadStoredNotificationSettings
} from '../src/lib/nopNotifications';
import {
  isValidSingaporeUen,
  isValidSingaporePhone,
  isValidEmail
} from '../src/lib/nopValidators';

let pass = 0, fail = 0;
const rows: string[] = [];
const T = (id: string, desc: string, ok: boolean, actual: string, expected: string) => {
  ok ? pass++ : fail++;
  rows.push(`${ok ? 'PASS' : 'FAIL'}|${id}|${desc}|${expected}|${actual}`);
};

// ---- TS-01 & TS-02 FORM & SUBMISSION ----
const baseline = SUPPORTING_DOCUMENT_SCHEDULE.filter(d => d.category === 'Baseline').map(d => d.name);
T('T01-01', 'Co du 3 tai lieu Baseline theo FRD §4.4.1', baseline.length === 3, String(baseline.length), '3');

const badFmt = SUPPORTING_DOCUMENT_SCHEDULE.filter(d => d.allowedFormats.some(f => !['PDF', 'PNG', 'JPG', 'BMP', 'GIF'].includes(f)));
T('T01-02', 'Dinh dang file chap nhan PDF/PNG/JPG/BMP/GIF (T01)', badFmt.length === 0, badFmt.length ? 'co dinh dang loi' : 'dung', 'dung');

// ---- N-01 / N-02 / N-05 REGRESSION VALIDATORS & DEFAULT VALUES ----
const validUens = ['199801234K', '201512345D', '53312345A', 'T05LL1103B', 'S12FC1234A', 'R12AB3456C'];
const invalidUens = ['199801234', '199801234KK', '5331234A', 'ABC12345X', '123456789', ''];
const uenValidCheck = validUens.every(u => isValidSingaporeUen(u)) && invalidUens.every(u => !isValidSingaporeUen(u));
T('N01-01', 'isValidSingaporeUen chap nhan 9/10 ky tu va tien to Singapore hop le (N-01)', uenValidCheck, uenValidCheck ? 'dung tat ca test vectors' : 'that bai', 'dung tat ca test vectors');

const validPhones = ['+65 9123 4567', '+65 91234567', '9123 4567', '91234567', '81234567', '+65 8123 4567', '67890123', '+65 6789 0123'];
const invalidPhones = ['+65 1234 5678', '12345678', '9123456', '912345678', '+65 9123 4567 8', 'abc'];
const phoneValidCheck = validPhones.every(p => isValidSingaporePhone(p)) && invalidPhones.every(p => !isValidSingaporePhone(p));
T('N02-01', 'isValidSingaporePhone chap nhan +65, khoang trang, dau 6/8/9 (N-02)', phoneValidCheck, phoneValidCheck ? 'dung tat ca test vectors' : 'that bai', 'dung tat ca test vectors');

const validEmails = ['david.tan@kimseng.sg', 'sales@bnk.com', 'user.name+tag@sub.domain.org', 'test@sentosa.gov.sg'];
const invalidEmails = ['user@domainXcom', 'user @domain.com', 'user@domain.', 'user@.com', '@domain.com', 'user@domain.c'];
const emailValidCheck = validEmails.every(e => isValidEmail(e)) && invalidEmails.every(e => !isValidEmail(e));
T('N05-01', 'isValidEmail bat buoc co dau cham ngan domain va TLD >= 2 ky tu (N-05)', emailValidCheck, emailValidCheck ? 'dung tat ca test vectors' : 'that bai', 'dung tat ca test vectors');

// Form initial state automated pre-validation test
const formDefaults = {
  companyUen: '199801234K',
  applicantPhone: '+65 9123 4567',
  applicantEmail: 'david.tan@kimseng.sg'
};
const defaultsPass = isValidSingaporeUen(formDefaults.companyUen) && isValidSingaporePhone(formDefaults.applicantPhone) && isValidEmail(formDefaults.applicantEmail);
T('N01-02', 'Form initial default values pass all validator rules immediately', defaultsPass, defaultsPass ? 'true' : 'false', 'true');

// ---- TS-03 DATA INTEGRITY & STATUTORY TRIGGERS ----
T('TS03-01', 'So luong Work Involvement khop FRD §4.2.2',
  STATUTORY_TRIGGERS_LIST.length === 14, String(STATUTORY_TRIGGERS_LIST.length), '14');

const frdTriggers = ['6 metres', '7.5 metres', '1 hour', 'closure of a lane', 'land level', '2,000', 'girth', 'High-Risk', 'Confined Space', 'Height Above 30', 'Seafront', 'Excavation Work', 'Retaining Wall', 'Others'];
const missing = frdTriggers.filter(k => !STATUTORY_TRIGGERS_LIST.some(t => t.includes(k)));
T('TS03-02', 'Day du 14 trigger FRD (khong thieu muc nao)', missing.length === 0,
  missing.length ? `thieu: ${missing.join(', ')}` : 'du', 'du 14');

const fallback = STATUTORY_TRIGGERS_LIST.filter(t => getShortTriggerName(t) === 'Statutory Trigger');
T('TS03-03', 'getShortTriggerName phu het danh sach trigger', fallback.length === 0,
  fallback.length ? `${fallback.length} roi fallback` : '0 fallback', '0 fallback');

const seedTr = [...new Set(INITIAL_NOPS.flatMap(n => n.triggers))];
const seedFb = seedTr.filter(t => getShortTriggerName(t) === 'Statutory Trigger');
T('TS03-04', 'getShortTriggerName phu het trigger trong seed data', seedFb.length === 0,
  seedFb.length ? `${seedFb.length} roi fallback: ${seedFb.map(s => s.slice(0, 32)).join(' ; ')}` : '0 fallback', '0 fallback');

const orphanSeed = seedTr.filter(t => !STATUTORY_TRIGGERS_LIST.some(l => l.slice(0, 25) === t.slice(0, 25)));
T('TS03-05', 'Seed data chi dung trigger co trong danh sach', orphanSeed.length === 0,
  orphanSeed.length ? `${orphanSeed.length} trigger la` : '0', '0');

T('TS03-06', 'Routing matrix phu het moi trigger',
  ROUTING_MATRIX_RULES.length >= STATUTORY_TRIGGERS_LIST.length,
  `${ROUTING_MATRIX_RULES.length} rule / ${STATUTORY_TRIGGERS_LIST.length} trigger`, '>= so trigger');

// ---- TS-03B ROUTING CORRECTNESS ----
const expectRoute: Record<string, string> = {
  'Sentosa Express': 'Sentosa Express',
  'Cableway': 'Ropeway',
  'closure of a lane': 'Traffic',
  'excavation': 'Geotechnical',
  'Vegetation': 'Landscape',
  'Confined Space': 'Safety',
  'Retaining Wall': 'Civil',
  'Others': 'Ops Admin',
};
let routeBad: string[] = [];
for (const [needle, expect] of Object.entries(expectRoute)) {
  const trig = STATUTORY_TRIGGERS_LIST.find(t => t.toLowerCase().includes(needle.toLowerCase()));
  if (!trig) { routeBad.push(`${needle}: KHONG CO TRIGGER`); continue; }
  const got = resolveApprovers([trig]).map(a => a.domain).join('+');
  if (!got.includes(expect)) routeBad.push(`"${needle}" -> ${got}`);
}
T('TS03-07', 'Dinh tuyen dung phong ban cho 8 trigger trong yeu', routeBad.length === 0,
  routeBad.length ? routeBad.join(' ; ') : 'dung het', 'dung het');

const noApprover = STATUTORY_TRIGGERS_LIST.filter(t => {
  const a = resolveApprovers([t]); return a.length === 1 && a[0].domain === 'Operations Resilience & WSH';
});
T('TS03-08', 'Khong trigger nao roi vao fallback approver', noApprover.length === 0,
  noApprover.length ? `${noApprover.length}: ${noApprover.map(s => s.slice(0, 30)).join(' ; ')}` : '0', '0');

// multi-trigger must not collapse
const multi = resolveApprovers([
  STATUTORY_TRIGGERS_LIST.find(t => t.includes('closure of a lane'))!,
  STATUTORY_TRIGGERS_LIST.find(t => t.toLowerCase().includes('excavation'))!
]);
T('TS03-09', '2 trigger khac nhau => 2 buoc duyet rieng biet', multi.length === 2,
  `${multi.length} buoc: ${multi.map(a => a.domain).join(' + ')}`, '2 buoc');

// ---- TS-04 STATUS MODEL & BUSINESS RULES ----
const now = new Date('2026-09-18T12:00:00Z');
const mk = (o: any) => ({ applicationStatus: 'Approved', ...o });
const c = [
  ['TS04-01', 'Ngay bat dau trong tuong lai => Upcoming', mk({ startDateTime: '2026-10-01T00:00:00Z', endDateTime: '2026-10-10T00:00:00Z', permitStatus: 'Upcoming' }), 'Upcoming'],
  ['TS04-02', 'Dang trong han => Active', mk({ startDateTime: '2026-09-01T00:00:00Z', endDateTime: '2026-09-30T00:00:00Z', permitStatus: 'Upcoming' }), 'Active'],
  ['TS04-03', 'Da qua han => Expired', mk({ startDateTime: '2026-08-01T00:00:00Z', endDateTime: '2026-08-10T00:00:00Z', permitStatus: 'Active' }), 'Expired'],
  ['TS04-04', 'Suspended con trong han => Suspended', mk({ startDateTime: '2026-09-01T00:00:00Z', endDateTime: '2026-09-30T00:00:00Z', permitStatus: 'Suspended' }), 'Suspended'],
  ['TS04-05', 'Suspended da qua han => Expired (FRD §3.4.6)', mk({ startDateTime: '2026-08-01T00:00:00Z', endDateTime: '2026-08-10T00:00:00Z', permitStatus: 'Suspended' }), 'Expired'],
  ['TS04-06', 'Revoked giu nguyen du con han', mk({ startDateTime: '2026-09-01T00:00:00Z', endDateTime: '2026-09-30T00:00:00Z', permitStatus: 'Revoked' }), 'Revoked'],
  ['TS04-07', 'Bien: now == startDateTime => Active', mk({ startDateTime: '2026-09-18T12:00:00Z', endDateTime: '2026-09-30T00:00:00Z', permitStatus: 'Upcoming' }), 'Active'],
  ['TS04-08', 'Bien: now == endDateTime => Active (chua het han)', mk({ startDateTime: '2026-09-01T00:00:00Z', endDateTime: '2026-09-18T12:00:00Z', permitStatus: 'Active' }), 'Active'],
] as const;
c.forEach(([id, d, inp, exp]) => { const got = derivePermitStatus(inp as any, now); T(id as string, d as string, got === exp, got, exp as string); });

// ---- T06: APPLICATION STATUS PURITY ----
const invalidAppStatuses = INITIAL_NOPS.filter(n => (n.applicationStatus as string) === 'Pending Review' || (n.applicationStatus as string) === 'Submitted');
T('T06-01', 'Khong con trang thai Pending Review/Submitted trong ApplicationStatus (T06)', invalidAppStatuses.length === 0,
  invalidAppStatuses.length ? `${invalidAppStatuses.length} ban ghi sai` : '0', '0');

// ---- N-06: DRAFT RECORD IN SEED DATA ----
const draftRecords = INITIAL_NOPS.filter(n => n.applicationStatus === 'Draft');
T('N06-01', 'Co it nhat 1 ban ghi Draft trong INITIAL_NOPS de demo luong nhap ngay lan dau (N-06)', draftRecords.length >= 1, String(draftRecords.length), '>= 1');

// ---- T23: AUTOMATIC ISLAND-WIDE WEEKEND & HOLIDAY BLACKOUTS ----
const weekendCheck = checkIslandBlackout('2026-10-04'); // Sunday
const weekdayCheck = checkIslandBlackout('2026-10-07'); // Wednesday
const holidayCheck = checkIslandBlackout('2026-05-01'); // Labour Day
T('T23-01', 'Weekend duoc nhan dien la island-wide blackout tu dong (T23)', weekendCheck.isBlackout && !!weekendCheck.isWeekend, 'isBlackout: true', 'isBlackout: true');
T('T23-02', 'Ngay thuong khong phai blackout', !weekdayCheck.isBlackout, 'isBlackout: false', 'isBlackout: false');
T('T23-03', 'Singapore Public Holiday duoc nhan dien la blackout tu dong (T23)', holidayCheck.isBlackout && !!holidayCheck.isHoliday, 'isBlackout: true', 'isBlackout: true');

// ---- T26: DOCUMENT COMPLETION DEADLINE ----
const sampleIpaDate = '2026-09-17T10:00:00.000Z';
const calculatedDeadline = calculateDocumentDeadline(sampleIpaDate, 3);
const expectedDeadline = new Date(new Date(sampleIpaDate).getTime() + 3 * 24 * 3600 * 1000).toISOString();
T('T26-01', 'Tinh deadline tài liệu hoàn thành theo N continuous 24h days (T26)',
  calculatedDeadline === expectedDeadline, calculatedDeadline, expectedDeadline);

// ---- TS-07 RBAC MATRIX & T38 ROLES ----
const rb: [string, string, boolean][] = [
  ['Applicant (Contractor)', 'nop.apply', true],
  ['Applicant (Contractor)', 'nop.endorse_clearance', false],
  ['Applicant (Contractor)', 'nop.prescreen', false],
  ['Liaison Officer', 'nop.clear_for_approval', true],
  ['Liaison Officer', 'nop.revoke_permit', false],
  ['Technical Approver', 'nop.endorse_clearance', true],
  ['Technical Approver', 'nop.prescreen', false],
  ['Technical Approver', 'nop.clear_for_approval', false],
  ['Duty Manager', 'nop.grant_ipa', true],
  ['Responder (Ranger)', 'nop.endorse_clearance', false],
  ['System Administrator', 'nop.config_moratorium', false],
  ['System Administrator', 'nop.export_xlsx', false],
  ['System Administrator', 'nop.grant_ipa', false],
  ['SDC Stakeholder / Operational Viewer (incl. OR Team)', 'nop.export_xlsx', true],
  ['Stakeholder Manager', 'nop.apply', true],
  ['Stakeholder Manager', 'nop.endorse_clearance', false]
];
let rbBad: string[] = [];
rb.forEach(([r, p, exp]) => { const got = hasNopPermission(r as any, p as any); if (got !== exp) rbBad.push(`${r}/${p}=${got}(exp ${exp})`); });
T('TS07-01', 'Bang phan quyen nop.* dung tat ca cac ca kiem tra vai tro FRD §2.1 (T38)', rbBad.length === 0, rbBad.length ? rbBad.join(' ; ') : 'dung het', 'dung het');

const ids = INITIAL_NOPS.map(n => n.id);
T('TS04-11', 'Seed data khong co ma trung', new Set(ids).size === ids.length,
  `${ids.length} ban ghi / ${new Set(ids).size} ma`, 'bang nhau');
const officialIds = INITIAL_NOPS.filter(n => n.applicationStatus !== 'Draft').map(n => n.id);
const badFmtId = officialIds.filter(i => !/^SEN\/NP\/\d{8}\/\d{3}$/.test(i));
T('TS04-12', 'Ma tham chieu dung dinh dang SEN/NP/YYYYMMDD/NNN', badFmtId.length === 0,
  badFmtId.length ? badFmtId.join(',') : 'dung', 'dung');

// ---- TS-08 NOTIFICATION TRIGGERS (FRD §8.1 / T41 / T42) ----
T('TS08-01', 'Catalog co day du 26+ notification triggers theo FRD §8.1 (T41/T42)',
  NOTIFICATION_TRIGGER_CATALOG.length >= 26, String(NOTIFICATION_TRIGGER_CATALOG.length), '>= 26');

const notifPrefixes = ['NOTIF-01', 'NOTIF-06', 'NOTIF-12', 'NOTIF-18', 'NOTIF-24', 'NOTIF-25', 'NOTIF-26'];
const missingNotifs = notifPrefixes.filter(p => !NOTIFICATION_TRIGGER_CATALOG.some(n => n.id === p));
T('TS08-02', 'Dinh danh notification trigger dung chuan NOTIF-01 den NOTIF-26',
  missingNotifs.length === 0, missingNotifs.length ? `Thieu: ${missingNotifs.join(', ')}` : 'du', 'du');

// Test Notification Dispatch with status
const testNotif = dispatchNopNotification({
  triggerCode: 'NOTIF-01',
  nopId: 'SEN/NP/20260918/999',
  companyName: 'Test Contractor',
  recipientEmail: 'contractor@test.sg',
  subject: 'NOP Application SEN/NP/20260918/999 Submitted'
});
T('TS08-03', 'Notification dispatch tao record thanh cong voi subject va delivery status (T43)',
  testNotif !== null && testNotif.status === 'Sent' && testNotif.subject.includes('SEN/NP/20260918/999'),
  testNotif ? `${testNotif.status} - ${testNotif.triggerCode}` : 'null', 'Sent - NOTIF-01');

// ---- TS-05 APPROVER GROUPS (§5.3 / T11) ----
const rulesWithoutGroup = ROUTING_MATRIX_RULES.filter(r => !r.approverGroup || r.approverGroup.trim() === '');
T('TS05-01', 'Tat ca 14 routing matrix rules deu gan Approver Group (T11)',
  rulesWithoutGroup.length === 0,
  rulesWithoutGroup.length ? `${rulesWithoutGroup.length} rule thieu group` : '100% co group', '100% co group');

console.log('ID|KET QUA|MO TA|MONG DOI|THUC TE');
rows.forEach(r => {
  const [s, id, d, e, a] = r.split('|');
  console.log(`${s === 'PASS' ? '✅' : '❌'} ${id} | ${d}\n     expected: ${e}\n     actual  : ${a}`);
});
console.log(`\n=== UNIT: ${pass} PASS / ${fail} FAIL / ${pass + fail} total ===`);
