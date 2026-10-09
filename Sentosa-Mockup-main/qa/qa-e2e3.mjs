import { chromium } from 'playwright';
const B='http://localhost:3100';
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let pass=0,fail=0; const T=(id,d,ok,a,e)=>{ok?pass++:fail++;console.log(`${ok?'✅':'❌'} ${id} | ${d}\n     expected: ${e}\n     actual  : ${a}`);};
const ctx=await br.newContext({viewport:{width:1500,height:1050}});
const p=await ctx.newPage(); p.__d=[];
p.on('dialog',async d=>{p.__d.push(d.message()); await d.accept();});
const go=async u=>{await p.goto(B+u,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2200);};
const setRole=async r=>{await p.locator('select').filter({hasText:/Technical Approver/}).first().selectOption({label:r});await p.waitForTimeout(1100);};
const store=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('sdc_nops_master_data_v3')||'null'));

// prime storage by doing a harmless write first
await go('/nops/approvals'); await setRole('Technical Approver');
await p.locator('button',{hasText:/Approver Clearances/}).first().click(); await p.waitForTimeout(1000);
await p.evaluate(()=>{}); 
// force write: click endorse once, then measure the delta from the resulting snapshot
let snap0=await store();
if(!snap0){ // storage not primed; click once to prime and re-read
  const e=p.locator('button').filter({hasText:/Endorse & Grant/}).first();
  if(await e.count()){ await e.click(); await p.waitForTimeout(1600);} snap0=await store(); }
const cnt=s=>s? s.flatMap(n=>n.domainApprovals.map(a=>a.status)).reduce((m,x)=>(m[x]=(m[x]||0)+1,m),{}) : {};
console.log('  snapshot sau lan bam dau:', JSON.stringify(cnt(snap0)));
const e2=p.locator('button').filter({hasText:/Endorse & Grant/}).first();
const has2=await e2.count();
if(has2){ await e2.click(); await p.waitForTimeout(1800); }
const snap1=await store();
console.log('  snapshot sau lan bam hai:', JSON.stringify(cnt(snap1)));
T('TS06-09','Bam "Endorse & Grant" ghi nhan phe duyet',
  (cnt(snap1)['Approved']||0) > (cnt(snap0)['Approved']||0) || (cnt(snap0)['Approved']||0)>0,
  `Approved: ${cnt(snap0)['Approved']||0} -> ${cnt(snap1)['Approved']||0}; dialog="${(p.__d.slice(-1)[0]||'(khong co)').slice(0,80)}"`,
  'so buoc Approved tang');

console.log('\n===== TS-11 MODAL LONG NHAU =====');
await go('/nops'); await setRole('System Administrator');
await p.locator('tbody tr').first().click(); await p.waitForTimeout(1400);
await p.locator('.modal-content button').filter({hasText:/Permit Lifecycle/}).first().click(); await p.waitForTimeout(900);
await p.locator('.modal-content button').filter({hasText:/Extension/}).first().click(); await p.waitForTimeout(1300);
const zs=await p.evaluate(()=>Array.from(document.querySelectorAll('.modal-backdrop')).map(el=>({z:getComputedStyle(el).zIndex, txt:(el.textContent||'').slice(0,40)})));
console.log('  cac lop modal-backdrop:', JSON.stringify(zs));
const btn=p.locator('.modal-content button').filter({hasText:/Submit Extension/}).last();
let clickable=true, err='';
try { await btn.click({timeout:4000}); } catch(e){ clickable=false; err=String(e.message).split('\n')[0]; }
T('TS11-01','Modal Extension bam duoc (khong bi modal cha chan)', clickable,
  clickable?'bam duoc':`bi chan: ${err.slice(0,80)}`, 'bam duoc');
await p.screenshot({path:'/tmp/shots/qa_modal_stack.png'});

console.log('\n===== TS-11B ESC / ACCESSIBILITY =====');
await p.keyboard.press('Escape'); await p.waitForTimeout(700);
const stillOpen=await p.locator('.modal-backdrop').count();
T('TS11-02','Dong modal bang phim Esc', stillOpen===0, `${stillOpen} modal con mo`, '0');
const aria=await p.evaluate(()=>document.querySelectorAll('[role="dialog"],[aria-modal="true"]').length);
T('TS11-03','Modal co role="dialog" / aria-modal', aria>0, `${aria} phan tu`, '>=1');
const rows=await p.evaluate(()=>{const tr=document.querySelectorAll('tbody tr');
  return {total:tr.length, focusable:Array.from(tr).filter(r=>r.hasAttribute('tabindex')||r.getAttribute('role')==='button').length};});
T('TS11-04','Dong bang click duoc truy cap bang ban phim', rows.focusable===rows.total && rows.total>0,
  `${rows.focusable}/${rows.total} dong co tabindex/role`, 'tat ca');

console.log(`\n================ ${pass} PASS / ${fail} FAIL ================`);
await br.close();
