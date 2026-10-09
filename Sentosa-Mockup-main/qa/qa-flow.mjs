import { chromium } from 'playwright';
const B='http://localhost:3100';
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await br.newContext({viewport:{width:1500,height:1050}});
const p=await ctx.newPage(); p.__d=[];
p.on('dialog',async d=>{p.__d.push(d.message()); await d.accept();});
const go=async u=>{await p.goto(B+u,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2200);};
const setRole=async r=>{await p.locator('select').filter({hasText:/Technical Approver/}).first().selectOption({label:r});await p.waitForTimeout(1100);};
const rec=async()=>p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('sdc_nops_master_data_v3')||'[]');
  const n=d.find(x=>(x.workDescription||'').startsWith('QAFLOW')); return n?{id:n.id,app:n.applicationStatus,permit:n.permitStatus,
  lo:n.loPreScreenStatus,steps:n.domainApprovals.map(a=>`${a.domain}=${a.status}`)}:null;});

await go('/nops/portal'); await setRole('Applicant (Contractor)');
await p.locator('button',{hasText:/Submit New NOP Application/}).first().click(); await p.waitForTimeout(1000);
await p.locator('textarea').first().fill('QAFLOW confined space only');
const ins=p.locator('.modal-content input[type=text]');
for(let i=0;i<await ins.count();i++){const el=ins.nth(i); if(!(await el.inputValue())) await el.fill('QA');}
await p.locator('button',{hasText:/Next Step/}).first().click(); await p.waitForTimeout(800);
await p.locator('.modal-content label').filter({hasText:/Confined Space Work/}).first().locator('input').check();
await p.locator('button',{hasText:/Next Step/}).first().click(); await p.waitForTimeout(800);
await p.locator('.modal-content button',{hasText:/Submit NOP Application/}).first().click(); await p.waitForTimeout(2000);
console.log('1. Sau khi nop :', JSON.stringify(await rec()));

await go('/nops/approvals'); await setRole('Liaison Officer');
await p.locator('button',{hasText:/LO Pre-screening/}).first().click(); await p.waitForTimeout(1000);
await p.locator('button',{hasText:/Clear for Approval/}).first().click(); await p.waitForTimeout(2000);
console.log('2. Sau LO clear :', JSON.stringify(await rec()));
console.log('   dialog:', p.__d.slice(-1)[0]?.slice(0,120)||'(khong co)');

await setRole('Technical Approver');
await p.locator('button',{hasText:/Approver Clearances/}).first().click(); await p.waitForTimeout(1200);
for (let i=0;i<8;i++){
  const r=await rec(); if(!r || !r.steps.some(s=>s.endsWith('Pending'))) break;
  // find the card containing our reference and click its endorse
  const card=p.locator('div.card').filter({hasText:r.id}).first();
  const btn=(await card.count())? card.locator('button').filter({hasText:/Endorse & Grant/}).first()
                                : p.locator('button').filter({hasText:/Endorse & Grant/}).first();
  if(!(await btn.count())) { console.log('   khong tim thay nut Endorse cho', r.id); break; }
  await btn.click(); await p.waitForTimeout(1800);
}
console.log('3. Sau khi duyet :', JSON.stringify(await rec()));
const f=await rec();
console.log(f?.app==='Approved' ? '✅ Luong nop->LO->duyet->cap phep HOAN CHINH' : '❌ Luong khong hoan tat: app='+f?.app);
await br.close();
