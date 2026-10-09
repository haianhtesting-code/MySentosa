import { chromium } from 'playwright';
const B='http://localhost:3100';
const br = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass=0,fail=0;
const T=(id,d,ok,a,e)=>{ ok?pass++:fail++; console.log(`${ok?'✅':'❌'} ${id} | ${d}\n     expected: ${e}\n     actual  : ${a}`);} ;
const ctx=await br.newContext({viewport:{width:1500,height:1050}});
const p=await ctx.newPage(); p.__d=[];
p.on('dialog',async d=>{p.__d.push(d.message()); await d.accept();});
p.on('pageerror',e=>console.log('  PAGEERROR:',e.message.slice(0,150)));
const go=async u=>{await p.goto(B+u,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2200);};
const setRole=async r=>{await p.locator('select').filter({hasText:/Technical Approver/}).first().selectOption({label:r}); await p.waitForTimeout(1100);};
const store=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('sdc_nops_master_data_v3')||'[]'));

console.log('===== TS-06B APPROVER ENDORSEMENT (chi tiet) =====');
await go('/nops/approvals'); await setRole('Technical Approver');
await p.locator('button',{hasText:/Approver Clearances/}).first().click(); await p.waitForTimeout(1200);
const deptTabs=(await p.locator('button').allTextContents()).map(s=>s.replace(/\s+/g,' ').trim()).filter(s=>/Departments|Express|Cableway|Traffic|Structural|WSH|Utilities/.test(s));
console.log('  Department tabs:', deptTabs.join(' | '));
const all=[...new Set((await p.locator('button').allTextContents()).map(s=>s.replace(/\s+/g,' ').trim()))].filter(Boolean);
console.log('  All buttons:', all.join(' | '));
const endorse=p.locator('button').filter({hasText:/Endorse/});
T('TS06-08','Co nut Endorse tren hang doi approver', await endorse.count()>0, `${await endorse.count()} nut`, '>=1');
const before=(await store()).flatMap(n=>n.domainApprovals.map(a=>a.status)).filter(s=>s==='Pending').length;
if (await endorse.count()) {
  await endorse.first().click(); await p.waitForTimeout(1800);
  await p.screenshot({path:'/tmp/shots/qa_endorse.png'});
  const modal=await p.locator('.modal-content').count();
  const mb=modal? [...new Set((await p.locator('.modal-content button').allTextContents()).map(s=>s.trim()))].filter(Boolean):[];
  console.log('  modal xuat hien:',modal>0,'| nut trong modal:', mb.join(' | ')||'(khong co)');
  if (mb.length){ const c=p.locator('.modal-content button').filter({hasText:/Confirm|Endorse|Grant|Submit/}).last();
    if(await c.count()){ await c.click(); await p.waitForTimeout(1600);} }
}
const after=(await store()).flatMap(n=>n.domainApprovals.map(a=>a.status)).filter(s=>s==='Pending').length;
T('TS06-09','Bam Endorse lam giam so buoc Pending', after<before, `Pending ${before} -> ${after}; dialog="${(p.__d.slice(-1)[0]||'').slice(0,90)}"`, 'giam');

console.log('\n===== TS-08 LIFECYCLE =====');
await go('/nops'); await setRole('System Administrator');
await p.locator('tbody tr').first().click(); await p.waitForTimeout(1500);
const tabs=[...new Set((await p.locator('.modal-content button').allTextContents()).map(s=>s.replace(/\s+/g,' ').trim()))].filter(Boolean);
console.log('  Dossier tabs:', tabs.join(' | '));
await p.locator('.modal-content button').filter({hasText:/Permit Lifecycle/}).first().click(); await p.waitForTimeout(1000);
const acts=[...new Set((await p.locator('.modal-content button').allTextContents()).map(s=>s.replace(/\s+/g,' ').trim()))]
  .filter(s=>/Extension|Suspension|Revoke|Cancel|Lift|Withdraw/i.test(s));
console.log('  Lifecycle actions:', acts.join(' | ')||'(none)');
T('TS08-01','Co hanh dong Revoke (FRD §6.3)', acts.some(a=>/Revoke/i.test(a)), acts.join(' | ')||'(none)','co Revoke');
T('TS08-02','Co hanh dong Cancel permit (FRD §6.3)', acts.some(a=>/Cancel/i.test(a)), acts.join(' | ')||'(none)','co Cancel');

// extension twice
let extRuns=[];
for (let k=1;k<=2;k++){
  const ext=p.locator('.modal-content button').filter({hasText:/Extension/}).first();
  if(!(await ext.count())) { extRuns.push(`lan ${k}: nut bien mat`); break; }
  await ext.click(); await p.waitForTimeout(1200);
  const d=p.locator('.modal-content input[type=date]').last();
  if(await d.count()) await d.fill(k===1?'2026-10-10':'2026-11-05');
  const ta=p.locator('.modal-content textarea').last(); if(await ta.count()) await ta.fill('QA extension '+k);
  const ok=p.locator('.modal-content button').filter({hasText:/Approve Extension|Submit|Confirm|Request Extension/}).last();
  if(await ok.count()){ await ok.click(); await p.waitForTimeout(1600); }
  const h=(await store()).find(n=>n.extensionHistory&&n.extensionHistory.length);
  extRuns.push(`lan ${k}: dialog="${(p.__d.slice(-1)[0]||'').slice(0,70)}" -> extensionHistory=${h?h.extensionHistory.length:0}`);
  const life=p.locator('.modal-content button').filter({hasText:/Permit Lifecycle/}).first();
  if(await life.count()) { await life.click(); await p.waitForTimeout(800); }
}
const finalExt=(await store()).find(n=>n.extensionHistory&&n.extensionHistory.length);
T('TS08-03','Chi cho gia han 1 lan duy nhat (FRD §6.2)', (finalExt?.extensionHistory.length||0)<=1,
  extRuns.join(' ; '), 'toi da 1 ban ghi extension');

// audit trail
await p.locator('.modal-content button').filter({hasText:/Audit Trail/}).first().click().catch(()=>{}); await p.waitForTimeout(1000);
const at=await p.locator('.modal-content').innerText();
T('TS08-04','Audit Trail ghi nhan hanh dong vua thuc hien (FRD §10)',
  !/No formal lifecycle events/i.test(at), /No formal lifecycle events/i.test(at)?'tab trong rong':'co ban ghi','co ban ghi audit');
await p.locator('.modal-content button').filter({hasText:/^Close$/}).first().click().catch(()=>{}); await p.waitForTimeout(700);

console.log('\n===== TS-08B WITHDRAW / REJECT =====');
await go('/nops/portal'); await setRole('Applicant (Contractor)');
const wd=p.locator('button').filter({hasText:/Withdraw/});
T('TS08-05','Applicant co nut Withdraw (FRD §5.1)', await wd.count()>0, `${await wd.count()} nut`,'>=1');
if(await wd.count()){ await wd.first().click(); await p.waitForTimeout(1500);
  const w=(await store()).find(n=>n.applicationStatus==='Withdrawn');
  T('TS08-06','Withdraw chuyen trang thai sang Withdrawn', !!w, w?`${w.id} = Withdrawn`:'khong doi trang thai','Withdrawn'); }

console.log(`\n================ ${pass} PASS / ${fail} FAIL ================`);
await br.close();
