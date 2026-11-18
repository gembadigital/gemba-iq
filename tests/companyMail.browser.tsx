import React, { useState } from 'react'; import { createRoot } from 'react-dom/client';
import CompanyOutlookArchive from '../src/components/company-tabs/CompanyOutlookArchive'; import { LanguageProvider } from '../src/lib/LanguageContext';
const params = new URLSearchParams(location.search);
(window as any).mailArchiveFixture = { messages: [], approved: false, phase: 0, fail: false, imports: 0, detailCalls: 0 };
document.documentElement.classList.add('gemba-stitch-skin','saas-layout'); if (params.has('dark')) document.documentElement.classList.add('dark');
function App() { const [key,setKey] = useState(0); return <LanguageProvider><main data-mail-instance={key} style={{padding:16,maxWidth:1000,margin:'auto',minWidth:0}}><h1 data-crm-heading="page">Örnek müşteri · E-postalar</h1><CompanyOutlookArchive key={key} companyId="example-company" /><button id="remount" onClick={()=>setKey(k=>k+1)}>Bileşeni yeniden aç</button></main></LanguageProvider>; }
createRoot(document.getElementById('root')!).render(<App />);
const sleep = (ms=40) => new Promise(r=>setTimeout(r,ms));
const wait = async(fn:()=>boolean) => {for(let i=0;i<100;i++){if(fn())return;await sleep();}throw Error('UI condition timed out');};
const expect = (v:unknown,label:string) => {if(!v)throw Error(label);};
const syncButton = () => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.includes('Outlook’u eşitle'))!;
async function run() {
  const checks:any[]=[]; const check=async(name:string,fn:()=>Promise<void>)=>{try{await fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,error:String(e)});}};
  await wait(()=>!!syncButton()&&!syncButton().disabled);
  await check('Initial scope visible without silently importing mail',async()=>{expect(document.body.textContent?.includes('client@customer.test'),'Missing contact scope');expect((window as any).mailArchiveFixture.imports===0,'Imported before first click');});
  await check('Manual import drains both pages and reloads saved messages',async()=>{syncButton().click();await wait(()=>!!syncButton()&&!syncButton().disabled&&(window as any).mailArchiveFixture.phase===2&&document.querySelectorAll('article').length===2);expect((window as any).mailArchiveFixture.phase===2,'Pagination stopped early');expect(document.querySelectorAll('article').length===2,'Stored first page missing');expect(document.body.textContent?.includes('3 yeni ileti kaydedildi'),'Wrong import success count');});
  await check('Expand fetches full text safely as plain text',async()=>{document.querySelector<HTMLButtonElement>('article button')!.click();await wait(()=>!!document.body.textContent?.includes('Tam ileti içeriği'));expect((window as any).mailArchiveFixture.detailCalls===1,'Detail was not read');expect(!document.querySelector('article img'),'Unsafe HTML rendered');});
  await check('Older saved correspondence can be loaded without duplicate rows',async()=>{[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.includes('Önceki yazışmaları yükle'))!.click();await wait(()=>document.querySelectorAll('article').length===3);});
  await check('Sync failure retains archived messages and never shows completion',async()=>{(window as any).mailArchiveFixture.fail=true;syncButton().click();await wait(()=>!!document.querySelector('[role=alert]'));expect(document.querySelectorAll('article').length>=2,'Archive disappeared on failure');expect(!document.querySelector('[role=status]')?.textContent?.includes('tamamlandı'),'Failure marked complete');(window as any).mailArchiveFixture.fail=false;});
  await check('Remount keeps stored correspondence; repeated sync adds nothing',async()=>{document.getElementById('remount')!.click();await wait(()=>!!document.querySelector('[data-mail-instance="1"]')&&!!syncButton()&&!syncButton().disabled&&document.querySelectorAll('article').length===2);expect(document.querySelectorAll('article').length===2,'Saved page disappeared');expect((window as any).mailArchiveFixture.imports===3,'Repeated import duplicated data');});
  await check('No page overflow with long addresses and Turkish subjects',async()=>{expect(document.documentElement.scrollWidth<=innerWidth+1,'Horizontal page overflow');});
  const out=document.createElement('pre');out.id='mail-test-results';out.textContent=JSON.stringify({passed:checks.filter(c=>c.passed).length,total:checks.length,checks},null,2);document.body.append(out);
}
if(params.has('test'))run().catch(e=>{const p=document.createElement('pre');p.id='mail-test-results';p.textContent=JSON.stringify({error:String(e)});document.body.append(p);});
