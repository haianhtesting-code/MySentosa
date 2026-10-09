import { chromium } from 'playwright';
const B='http://localhost:3100';
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await br.newContext({viewport:{width:1500,height:1050}});
const p=await ctx.newPage(); p.__d=[]; p.on('dialog',async d=>{p.__d.push(d.message());await d.accept();});
const go=async u=>{await p.goto(B+u,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2200);};
const setRole=async r=>{await p.locator('select').filter({hasText:/Technical Approver/}).first().selectOption({label:r});await p.waitForTimeout(1100);};
await go('/nops/portal'); await setRole('Applicant (Contractor)');
await p.locator('button',{hasText:/Submit New NOP Application/}).first().click(); await p.waitForTimeout(1000);
await p.locator('textarea').first().fill('QAQ3 confined');
const ins=p.locator('.modal-content input[type=text]');
for(let i=0;i<await ins.count();i++){const el=ins.nth(i); if(!(await el.inputValue())) await el.fill('QA');}
await p.locator('button',{hasText:/Next Step/}).first().click(); await p.waitForTimeout(800);
await p.locator('.modal-content label').filter({hasText:/Confined Space Work/}).first().locator('input').check();
await p.locator('button',{hasText:/Next Step/}).first().click(); await p.waitForTimeout(800);
await p.locator('.modal-content button',{hasText:/Submit NOP Application/}).first().click(); await p.waitForTimeout(1800);
const id=p.__d.slice(-1)[0].match(/SEN\/NP\/\S+/)[0];
await go('/nops/approvals'); await setRole('Liaison Officer');
await p.locator('button',{hasText:/LO Pre-screening/}).first().click(); await p.waitForTimeout(900);
await p.locator('button',{hasText:/Clear for Approval/}).first().click(); await p.waitForTimeout(1800);
await setRole('Technical Approver');
await p.locator('button',{hasText:/Approver Clearances/}).first().click(); await p.waitForTimeout(2000);
const res=await p.evaluate(()=>{
  const cards=Array.from(document.querySelectorAll('div.card'));
  return { totalCards:cards.length,
    refs:cards.map(c=>(c.textContent||'').match(/SEN\/NP\/\d{8}\/\d{3}/)?.[0]).filter(Boolean),
    allDeptBtn:(Array.from(document.querySelectorAll('button')).find(b=>/All Departments/.test(b.textContent||''))||{}).textContent };
});
console.log('Ho so vua tao:', id);
console.log('Badge         :', res.allDeptBtn);
console.log('So div.card   :', res.totalCards, '| refs:', [...new Set(res.refs)].join(', '));
await p.screenshot({path:'/tmp/shots/qa_queue3.png', fullPage:true});
await br.close();
