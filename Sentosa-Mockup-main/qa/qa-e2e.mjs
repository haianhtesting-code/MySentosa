import { chromium } from 'playwright';
const B='http://localhost:3100';
const br = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass=0, fail=0, warn=0;
const T=(id,d,ok,actual,expected)=>{ ok===true?pass++:ok===null?warn++:fail++;
  console.log(`${ok===true?'✅':ok===null?'⚠️ ':'❌'} ${id} | ${d}\n     expected: ${expected}\n     actual  : ${actual}`); };

const newPage = async () => {
  const ctx = await br.newContext({ viewport:{width:1500,height:1000}, acceptDownloads:true });
  const p = await ctx.newPage(); p.__dialogs=[]; p.__errors=[];
  p.on('dialog', async d=>{ p.__dialogs.push(d.message()); await d.accept(); });
  p.on('pageerror', e=>p.__errors.push(e.message));
  p.go = async u => { await p.goto(B+u,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2200); };
  p.setRole = async r => { await p.locator('select').filter({hasText:/Technical Approver/}).first().selectOption({label:r}); await p.waitForTimeout(1100); };
  p.store = () => p.evaluate(()=>JSON.parse(localStorage.getItem('sdc_nops_master_data_v3')||'[]'));
  return p;
};
// wizard helper
async function submitApp(p, {desc, triggers=[], startOffsetDays=null, attachDocs=false}) {
  await p.locator('button',{hasText:/Submit New NOP Application/}).first().click(); await p.waitForTimeout(1000);
  await p.locator('textarea').first().fill(desc);
  const ins=p.locator('.modal-content input[type=text]');
  for(let i=0;i<await ins.count();i++){const el=ins.nth(i); if(!(await el.inputValue())) await el.fill('QA');}
  if (startOffsetDays!==null){
    const d=new Date(Date.now()+startOffsetDays*86400000).toISOString().slice(0,10);
    const e=new Date(Date.now()+(startOffsetDays+20)*86400000).toISOString().slice(0,10);
    const dates=p.locator('.modal-content input[type=date]');
    await dates.nth(0).fill(d); await dates.nth(1).fill(e);
  }
  await p.locator('button',{hasText:/Next Step/}).first().click(); await p.waitForTimeout(800);
  const cbs=p.locator('.modal-content label').filter({has:p.locator('input[type=checkbox]')});
  for (const t of triggers){ const el=cbs.filter({hasText:t}).first(); if(await el.count()) await el.locator('input').check(); }
  await p.locator('button',{hasText:/Next Step/}).first().click(); await p.waitForTimeout(900);
  const sub=p.locator('.modal-content button',{hasText:/Submit NOP Application/}).first();
  const enabled = await sub.count() ? await sub.isEnabled() : false;
  if (await sub.count()) await sub.click();
  await p.waitForTimeout(2000);
  return { submitEnabled: enabled, dialog: p.__dialogs.slice(-1)[0]||'' };
}

console.log('===== TS-02 SMOKE =====');
{ const p=await newPage();
  for (const [id,path,h1] of [['TS02-01','/nops','Official Register'],['TS02-02','/nops/approvals','Review Queue'],
      ['TS02-03','/nops/portal','Contractor'],['TS02-04','/nops/map','Work Boundary Map'],['TS02-05','/nops/settings','Administration']]) {
    await p.go(path);
    const h=(await p.locator('h1').first().textContent().catch(()=>''))||'';
    const jsErr=p.__errors.length;
    T(id,`Trang ${path} render & khong loi JS`, h.includes(h1)&&jsErr===0, `h1="${h.trim().slice(0,45)}" jsErrors=${jsErr}`, `chua "${h1}", 0 loi JS`);
  }
  await p.context().close(); }

console.log('\n===== TS-05 NOP SUBMISSION =====');
{ const p=await newPage(); await p.go('/nops/portal'); await p.setRole('Applicant (Contractor)');
  // TS05-01 mandatory Space validation
  await p.locator('button',{hasText:/Submit New NOP Application/}).first().click(); await p.waitForTimeout(900);
  await p.locator('textarea').first().fill('QA mandatory check');
  await p.locator('button',{hasText:/Next Step/}).first().click(); await p.waitForTimeout(900);
  const stillStep1 = (await p.locator('.modal-content h3').first().textContent()).includes('Step 1');
  T('TS05-01','Chan sang buoc 2 khi thieu Unit/Space', stillStep1 && p.__dialogs.length>0,
    `dialog="${(p.__dialogs.slice(-1)[0]||'').slice(0,70)}"`, 'bi chan + co canh bao');
  await p.locator('.modal-content button',{hasText:/^Cancel$/}).first().click().catch(()=>{}); await p.waitForTimeout(600);
  await p.context().close(); }

{ const p=await newPage(); await p.go('/nops/portal'); await p.setRole('Applicant (Contractor)');
  const r = await submitApp(p,{desc:'QA-DOC no documents', triggers:[/closure of a lane or road/]});
  const rec=(await p.store()).find(n=>(n.workDescription||'').startsWith('QA-DOC'));
  T('TS05-02','Chan nop khi thieu tai lieu bat buoc (FRD §4.4.1)', rec===undefined,
    rec?`nop thanh cong voi ${rec.documents.length} tai lieu`:'bi chan', 'bi chan');
  await p.context().close(); }

{ const p=await newPage(); await p.go('/nops/portal'); await p.setRole('Applicant (Contractor)');
  for (const [id,off,expUrgent] of [['TS05-03',6,true],['TS05-04',7,false],['TS05-05',10,false]]) {
    await submitApp(p,{desc:`QA-URG-${off}`, triggers:[/Confined Space/], startOffsetDays:off});
    const rec=(await p.store()).find(n=>(n.workDescription||'')===`QA-URG-${off}`);
    T(id,`Phan loai Urgent khi bat dau sau ${off} ngay (FRD §4.7)`, rec? rec.isUrgent===expUrgent : null,
      rec?`isUrgent=${rec.isUrgent}`:'khong tao duoc ho so', `isUrgent=${expUrgent}`);
  }
  // TS05-06 duplicate reference number
  const ids=(await p.store()).map(n=>n.id); const dup=ids.filter((v,i)=>ids.indexOf(v)!==i);
  T('TS05-06','Ma tham chieu duy nhat sau nhieu lan nop', dup.length===0,
    dup.length?`TRUNG: ${[...new Set(dup)].join(', ')}`:'khong trung','khong trung');
  await p.context().close(); }

console.log('\n===== TS-06 WORKFLOW =====');
{ const p=await newPage(); await p.go('/nops/portal'); await p.setRole('Applicant (Contractor)');
  await submitApp(p,{desc:'QA-FLOW road+excavation', triggers:[/closure of a lane or road/,/excavation exceeding/]});
  let rec=(await p.store()).find(n=>(n.workDescription||'').startsWith('QA-FLOW'));
  T('TS06-01','Ho so moi nop vao hang doi LO, chua gan approver (FRD §5.1)',
    rec? (rec.loPreScreenStatus==='Pending Pre-screening' && rec.domainApprovals.length===0):false,
    rec?`lo=${rec.loPreScreenStatus}, approvers=${rec.domainApprovals.length}`:'khong tao duoc','Pending Pre-screening, 0 approver');
  T('TS06-02','Trang thai don theo mo hinh FRD §3.4.1',
    rec? ['Draft','Under Review','Change Requested','Approved','Withdrawn'].includes(rec.applicationStatus):false,
    rec?rec.applicationStatus:'-','mot trong 5 trang thai FRD');

  await p.go('/nops/approvals'); await p.setRole('Liaison Officer');
  await p.locator('button',{hasText:/LO Pre-screening/}).first().click(); await p.waitForTimeout(900);
  const cl=p.locator('button',{hasText:/Clear for Approval/}).first();
  T('TS06-03','Vai tro Liaison Officer thay nut Clear for Approval', await cl.count()>0, `${await cl.count()} nut`, '>=1');
  if (await cl.count()) { await cl.click(); await p.waitForTimeout(1800); }
  rec=(await p.store()).find(n=>(n.workDescription||'').startsWith('QA-FLOW'));
  const doms=(rec?.domainApprovals||[]).map(a=>a.domain);
  T('TS06-04','Dinh tuyen dung: Road Closure -> Traffic & Road Safety',
    doms.some(d=>/Traffic/i.test(d)), doms.join(' + ')||'(rong)', 'co Senior Manager (Traffic & Road Safety)');
  T('TS06-05','Dinh tuyen dung: Excavation -> Geotechnical PE',
    doms.some(d=>/Geotechnical/i.test(d)), doms.join(' + ')||'(rong)', 'co Geotechnical Specialist PE');

  await p.go('/nops/approvals'); await p.setRole('Technical Approver');
  await p.locator('button',{hasText:/Approver Clearances/}).first().click(); await p.waitForTimeout(1000);
  let guard=0;
  while (guard++<8) { const b=p.locator('button',{hasText:/Endorse & Grant|Endorse and Grant|Grant Department Clearance/}).first();
    if(!(await b.count())) break; await b.click(); await p.waitForTimeout(1500); }
  rec=(await p.store()).find(n=>(n.workDescription||'').startsWith('QA-FLOW'));
  T('TS06-06','Duyet het cac buoc => Application = Approved',
    rec?.applicationStatus==='Approved', `app=${rec?.applicationStatus}, steps=${(rec?.domainApprovals||[]).map(a=>a.status).join(',')}`, 'Approved');
  T('TS06-07','Permit sau khi duyet = Upcoming (ngay bat dau trong tuong lai)',
    rec? rec.permitStatus==='Upcoming':false, `permit=${rec?.permitStatus}`, 'Upcoming');
  await p.context().close(); }

console.log('\n===== TS-07 RBAC (UI) =====');
{ const p=await newPage(); await p.go('/nops/portal'); await p.setRole('Applicant (Contractor)');
  await submitApp(p,{desc:'QA-RBAC pending', triggers:[/Confined Space/]});
  await p.go('/nops/approvals');
  for (const [id,role,shouldSee] of [['TS07-02','Liaison Officer',true],['TS07-03','Technical Approver',false],['TS07-04','Duty Manager',false]]) {
    await p.setRole(role);
    await p.locator('button',{hasText:/LO Pre-screening/}).first().click().catch(()=>{}); await p.waitForTimeout(900);
    const n=await p.locator('button',{hasText:/Clear for Approval/}).count();
    T(id,`[${role}] ${shouldSee?'DUOC':'KHONG duoc'} thao tac LO pre-screening (SoD FRD §5.1)`,
      shouldSee? n>0 : n===0, `${n} nut Clear for Approval`, shouldSee?'>=1':'0');
  }
  await p.setRole('Applicant (Contractor)'); await p.waitForTimeout(800);
  const endorse=await p.locator('button',{hasText:/Endorse/}).count();
  T('TS07-05','[Applicant] khong thay nut Endorse Clearance', endorse===0, `${endorse} nut`, '0');
  await p.context().close(); }

console.log('\n===== TS-09 REGISTER & REPORT =====');
{ const p=await newPage(); await p.go('/nops');
  const rows0=await p.locator('tbody tr').count();
  await p.locator('input[placeholder*="Search"]').first().fill('Huationg'); await p.waitForTimeout(1200);
  const rows1=await p.locator('tbody tr').count();
  T('TS09-01','Tim kiem theo ten nha thau loc dung', rows1>0 && rows1<rows0, `${rows0} -> ${rows1} dong`, 'giam va > 0');
  await p.locator('input[placeholder*="Search"]').first().fill(''); await p.waitForTimeout(1000);
  const th=p.locator('thead th').first();
  await th.click().catch(()=>{}); await p.waitForTimeout(800);
  const sortable=await p.locator('thead th[role="button"], thead th button, thead th[aria-sort]').count();
  T('TS09-02','Cot bang co the sap xep (FRD §7.1)', sortable>0, `${sortable} cot co the sort`, '>=1');
  const dlp=p.waitForEvent('download',{timeout:6000}).catch(()=>null);
  await p.locator('button',{hasText:/Export CSV/}).first().click(); await p.waitForTimeout(2000);
  const f=await dlp;
  T('TS09-03','Export CSV tao file that (FRD §7.3)', !!f, f?`tai ve: ${f.suggestedFilename()}`:`khong co file. dialog="${(p.__dialogs.slice(-1)[0]||'').slice(0,60)}"`, 'co file CSV');
  await p.context().close(); }

console.log('\n===== TS-10 I18N & UI =====');
{ const p=await newPage(); const viRe=/Đề xuất|Cảnh báo|hồ sơ|Mặc định|chờ SDC|Xác nhận/;
  for (const [id,path] of [['TS10-01','/nops'],['TS10-02','/nops/approvals'],['TS10-03','/nops/portal'],['TS10-04','/nops/settings'],['TS10-05','/nops/map']]) {
    await p.go(path);
    const txt=await p.locator('body').innerText();
    const hits=[...new Set(txt.split('\n').filter(l=>viRe.test(l)))];
    T(id,`Trang ${path} khong co tieng Viet trong UI`, hits.length===0,
      hits.length?`${hits.length} dong: "${hits[0].slice(0,70)}"`:'sach', 'khong co');
  }
  await p.context().close(); }

console.log(`\n================ E2E: ${pass} PASS / ${fail} FAIL / ${warn} WARN ================`);
await br.close();
