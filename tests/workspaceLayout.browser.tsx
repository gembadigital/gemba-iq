import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
import App from '../src/App';import ProposalFormModal from '../src/components/ProposalFormModal';import{LanguageProvider}from'../src/lib/LanguageContext';
class PreviewBoundary extends React.Component<{children:React.ReactNode},{error:string}> {
 state={error:''};static getDerivedStateFromError(error:Error){return{error:error.message};}
 render(){return this.state.error?<p role="alert">Önizleme hatası: {this.state.error}</p>:this.props.children;}
}
const query=new URLSearchParams(location.search);
localStorage.setItem('system_language','TR');localStorage.setItem('theme',query.has('dark')?'dark':'light');localStorage.setItem('sidebar-collapsed','false');
window.fetch=async()=>new Response('{}',{status:503});
const company={id:'demo-company',name:'Örnek Endüstri A.Ş.',accountOwner:'Örnek Kullanıcı',industry:'Manufacturing',customerStatus:'Customer',customFields:{},isoCertifications:[]};
const base:any={id:'demo-proposal',sequenceNo:71,proposalNumber:'2611-71',companyId:company.id,companyName:company.name,proposalSubject:'Yalın Dönüşüm Programı',contactPerson:'Müşteri Yetkilisi',contactEmail:'customer@example.test',date:'2026-11-11',owner:'Örnek Kullanıcı',createdBy:'Örnek Kullanıcı',currency:'₺',status:'Sent',approvalStatus:'Sent',currentVersion:'v1.0',versions:[],description:'Örnek teklif kapsamı',services:['Lean Transformation'],options:{'Option 1':{name:'Standart program',training:true,consulting:true,workshop:false,manDays:8,dailyRate:30000,expenses:0,rows:[{id:'r',item:'Danışmanlık',dailyRate:30000,manDays:8}]}},totalBudget:240000,taxes:48000,grandTotal:288000,coverPage:'Müşteriye özel teklif tanıtımı',activityTableHtml:'<table><tr><td>Özel faz</td></tr></table>',terms:'Özel teklif koşulları',lastUpdate:'2026-11-11T08:00:00Z'};
const fixtures:any={companies:[company],kv:{crm_admin_org_settings:{defaultCurrency:'TRY (₺)'}},proposals:[base,{...base,id:'demo-2',sequenceNo:72,proposalNumber:'2611-72',proposalSubject:'Süreç Geliştirme ve Saha Uygulamaları',status:'Accepted',approvalStatus:'Approved'},{...base,id:'demo-3',sequenceNo:73,proposalNumber:'2611-73',proposalSubject:'Operasyonel Mükemmellik Değerlendirmesi',status:'Draft',approvalStatus:'Draft'}]};
(window as any).workspaceFixture=fixtures;
const root=createRoot(document.getElementById('root')!);
if(query.has('editor')) root.render(<PreviewBoundary><LanguageProvider><ProposalFormModal isOpen onClose={()=>{}} onSave={p=>{fixtures.saved=p}} initialProposal={base} companies={[company as any]} onAddCompany={()=>{}} /></LanguageProvider></PreviewBoundary>);
else root.render(<PreviewBoundary><MemoryRouter><LanguageProvider><App /></LanguageProvider></MemoryRouter></PreviewBoundary>);
const delay=(ms=150)=>new Promise(r=>setTimeout(r,ms));
const results:string[]=[];const expect=(ok:any,label:string)=>{if(!ok)throw Error(label);results.push(label);};
function aligned(selector:string,axis:'left'|'right'|'center'='left'){
 const rects=Array.from(document.querySelectorAll<HTMLElement>(selector)).map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
 const values=rects.map(r=>axis==='center'?r.left+r.width/2:r[axis]);return values.length>5&&Math.max(...values)-Math.min(...values)<1.5;
}
async function test(){
 await document.fonts.ready;await delay(300);
 expect(aligned('[data-ui-sidebar] [data-ui-nav-icon]'),'Ana, alt, aktif ve pasif satırlarda ikonlar aynı sütunda');
 expect(aligned('[data-ui-sidebar] [data-ui-nav-label]'),'Tüm menü metinleri aynı başlangıç çizgisinde');
 expect(aligned('[data-ui-sidebar] [data-ui-nav-chevron]','right'),'Altı menü açma oku aynı sağ sütunda');
 const labels=Array.from(document.querySelectorAll<HTMLElement>('[data-ui-nav-label]'));
 expect(labels.every(el=>el.scrollWidth<=el.clientWidth+1),'Uzun Türkçe başlıklar yatay kesilmiyor');
 const sidebar=document.querySelector<HTMLElement>('[data-ui-sidebar]')!;
 document.getElementById('btn-collapse-sidebar')!.click();await delay(350);
 expect(sidebar.dataset.collapsed==='true'&&aligned('[data-ui-sidebar] [data-ui-nav-icon]','center'),'Dar menüde bütün ikonların merkezi aynı');
 document.getElementById('btn-collapse-sidebar')!.click();await delay(350);
 const group=document.querySelector<HTMLButtonElement>('[data-ui-nav-group][aria-label="Şirketler ve Hedefler"]')||document.querySelector<HTMLButtonElement>('[data-ui-nav-group]')!;
 const expanded=group.getAttribute('aria-expanded');group.click();await delay();
 expect(group.getAttribute('aria-expanded')!==expanded,'Menü açma/kapatma işlevi korunuyor');group.click();await delay();
 expect(aligned('[data-ui-sidebar] [data-ui-nav-icon]'),'Yeniden açılan menüde hizalar korunuyor');
 const sourceBefore=JSON.stringify(fixtures.proposals);
 root.render(<PreviewBoundary><LanguageProvider><ProposalFormModal isOpen onClose={()=>{fixtures.closed=true}} onSave={p=>{fixtures.saved=p}} initialProposal={base} companies={[company as any]} onAddCompany={()=>{}} /></LanguageProvider></PreviewBoundary>);await delay();
 const submit=document.querySelector<HTMLButtonElement>('.crm-dialog-footer button[type="submit"]')!;
 expect(!!submit.form&&submit.form===document.querySelector('form'),'Sabit alt çubuktaki Kaydet düğmesi aynı forma bağlı');
 const dialog=document.querySelector<HTMLElement>('.crm-dialog')!;
 const footer=document.querySelector<HTMLElement>('.crm-dialog-footer')!;
 expect(footer.getBoundingClientRect().bottom<=innerHeight&&footer.getBoundingClientRect().bottom<=dialog.getBoundingClientRect().bottom+1,'Kayıt eylemleri kaydırılan formdan bağımsız görünür');
 submit.click();await delay();
 expect(fixtures.saved?.proposalSubject===base.proposalSubject&&fixtures.saved.companyId===base.companyId&&fixtures.saved.contactPerson===base.contactPerson,'Form gönderimi kayıtlı müşteri ve teklif alanlarını koruyor');
 expect(JSON.stringify(fixtures.saved.options)===JSON.stringify(base.options),'Görsel düzen fiyat kalemlerini değiştirmiyor');
 expect(JSON.stringify(fixtures.proposals)===sourceBefore,'Görsel test kaynak teklif listesini değiştirmiyor');
 const panel=document.createElement('div');panel.id='layout-report';panel.setAttribute('role','status');panel.style.cssText='position:fixed;top:0;left:0;z-index:9999;background:white;color:#166534;font:14px Arial;padding:12px';panel.textContent=`GEÇTİ: ${results.length} düzen ve form testi`;document.body.append(panel);
}
if(query.has('test'))test().catch(err=>{const el=document.createElement('p');el.style.cssText='position:fixed;top:0;left:0;z-index:9999;background:white;color:red;padding:12px';el.textContent='BAŞARISIZ: '+err.message;document.body.append(el);console.error(err);});
