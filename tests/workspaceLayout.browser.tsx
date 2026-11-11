import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
import App from '../src/App';import AdministrationCenter from '../src/components/AdministrationCenter';import UserAccountSettings from '../src/components/UserAccountSettings';import AuthLayout,{AuthField,AuthButton} from '../src/components/auth/AuthLayout';import ProposalFormModal from '../src/components/ProposalFormModal';import{LanguageProvider}from'../src/lib/LanguageContext';
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
if(query.has('dense')) {
 const longName='Örnek Anadolu Endüstriyel Üretim ve Teknoloji Sanayi Ticaret A.Ş.';
 fixtures.companies=Array.from({length:12},(_,i)=>({...company,id:'demo-company-'+i,name:longName+' '+(i+1),phone:'+90 216 555 00 00',website:'https://ornek-endustri.example.test',address:'Organize Sanayi Bölgesi Uzun Cadde No:123 İstanbul',customerStatus:'Customer'}));
 fixtures.proposals=Array.from({length:18},(_,i)=>({...base,id:'demo-proposal-'+i,companyId:fixtures.companies[i%12].id,companyName:fixtures.companies[i%12].name,sequenceNo:70+i,proposalNumber:'2611-'+(70+i),proposalSubject:'Operasyonel Mükemmellik ve Yalın Dönüşüm Programı — Üretim, Kalite ve İç Lojistik Süreçlerinin Geliştirilmesi',owner:'Örnek Uzun İsimli Sorumlu',createdBy:'Örnek Teklif Hazırlayan',status:['Accepted','Sent','Draft'][i%3]}));
 fixtures.deals=Array.from({length:9},(_,i)=>({id:'deal-'+i,companyId:fixtures.companies[i].id,companyName:fixtures.companies[i].name,dealName:'Üretim ve İç Lojistik Süreçlerinin İyileştirilmesi',contactPerson:'Müşteri Yetkilisi Uzun Soyadı',contactEmail:'yetkili@example.test',opportunityValue:1250000,expectedCloseDate:'2026-12-15',opportunityScore:80,winProbability:60,currentStageDuration:3,priority:'High',industry:'Manufacturing',opexScore:70,stage:'Lead Identified',owner:'Örnek Uzun İsimli Sorumlu',description:'Birden fazla fabrika ve üretim hattını kapsayan süreç geliştirme programı',proposalNumber:'2611-'+(70+i)}));
 fixtures.tasks=Array.from({length:8},(_,i)=>({id:'task-'+i,title:'Müşteri için uzun kapsamlı operasyonel mükemmellik teklifini incele ve toplantı hazırla '+i,description:'Üretim ve kalite ekipleriyle kapsamın değerlendirilmesi ve takip toplantısı',status:'not_started',assignee:'Örnek Uzun İsimli Sorumlu',dueDate:'2026-12-15',priority:'High'}));
 fixtures.contacts=fixtures.companies.map((c:any,i:number)=>({id:'contact-'+i,companyId:c.id,firstName:'Örnek Yetkili',lastName:'Uzun Soyadı',email:'yetkili'+i+'@example.test',phone:'+90 216 555 00 00',title:'Operasyonel Mükemmellik ve Üretim Direktörü'}));
 fixtures.kv.crm_lead_profiles=fixtures.companies.map((c:any,i:number)=>({id:'lead-'+i,no:i+1,firstName:'Örnek Yetkili',lastName:'Uzun Soyadı',email:'yetkili'+i+'@example.test',company:c.name,department:'Operasyonel Mükemmellik ve Üretim',address:c.address,industry:'Manufacturing',leadDemand:'Yalın dönüşüm ve iç lojistik iyileştirme',leadStatus:'New',leadSegment:'A',customField1:'',customField2:'',deliveryStatus:'Pending',openCount:0}));
 fixtures.kv.crm_target_accounts=fixtures.companies.map((c:any,i:number)=>({id:'target-'+i,no:i+1,companyName:c.name,websiteUrl:c.website,industryTag:'Manufacturing',companySize:'500–1000',locationMain:'İstanbul Organize Sanayi Bölgesi',aiAnalysisSummary:'Üretim ve kalite süreçlerinde sürekli iyileştirme fırsatları',draftTemplates:'',analysisSource:'Örnek veri',analysisDate:'2026-11-11',riskScore:65,rawOutput:'',contactName:'Örnek',contactSurname:'Yetkili',contactEmail:'yetkili@example.test',bdPipelineStage:'Yeni'}));
 fixtures.kv.crm_revenue_consultants=[{id:'consultant-1',name:'Örnek Uzun İsimli Danışman',title:'Kıdemli Operasyonel Mükemmellik Danışmanı',department:'Üretim ve Kalite',dailyCost:12000,dailySalesRate:42000,employmentType:'Full-Time',status:'Active'}];
 fixtures.kv.crm_revenue_invoices=fixtures.companies.map((c:any,i:number)=>({id:'invoice-'+i,invoiceNumber:'ORNEK20260000'+i,customerName:c.name,invoiceDate:'2026-11-10',month:'2026-11',amount:420000,deliveredDays:10,serviceType:'Training',status:'Outstanding',vatRate:20,vatAmount:84000}));
}
(window as any).workspaceFixture=fixtures;
const root=createRoot(document.getElementById('root')!);
if(query.get('screen')) root.render(<PreviewBoundary><LanguageProvider><div style={{padding:16}}>{query.get('screen')==='admin'?<AdministrationCenter onClose={()=>{}} />:query.get('screen')==='account'?<UserAccountSettings onClose={()=>{}} darkMode={false} onToggleTheme={()=>{}} />:<AuthLayout title="Gemba IQ hesabınıza giriş yapın" subtitle="Çalışma alanınıza güvenle bağlanın"><AuthField id="email" label="E-posta" value="" onChange={()=>{}} /><div style={{marginTop:16}}><AuthButton>Giriş yap</AuthButton></div></AuthLayout>}</div></LanguageProvider></PreviewBoundary>);
else if(query.has('editor')) root.render(<PreviewBoundary><LanguageProvider><ProposalFormModal isOpen onClose={()=>{}} onSave={p=>{fixtures.saved=p}} initialProposal={base} companies={[company as any]} onAddCompany={()=>{}} /></LanguageProvider></PreviewBoundary>);
else root.render(<PreviewBoundary><MemoryRouter><LanguageProvider><App /></LanguageProvider></MemoryRouter></PreviewBoundary>);
const delay=(ms=150)=>new Promise(r=>setTimeout(r,ms));
const results:string[]=[];const expect=(ok:any,label:string)=>{if(!ok)throw Error(label);results.push(label);};
function aligned(selector:string,axis:'left'|'right'|'center'='left'){
 const rects=Array.from(document.querySelectorAll<HTMLElement>(selector)).map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
 const values=rects.map(r=>axis==='center'?r.left+r.width/2:r[axis]);return values.length>5&&Math.max(...values)-Math.min(...values)<1.5;
}
async function test(){
 await document.fonts.ready;await delay(300);
 expect(document.querySelectorAll('[data-ui-nav-group][aria-expanded="true"]').length===1&&document.getElementById('sidebar-nav-proposal-management'),'İlk yüklemede yalnızca etkin sayfanın ana menüsü açık');
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
 const groups=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-ui-nav-group]'));
 const openGroups=()=>groups.filter(el=>el.getAttribute('aria-expanded')==='true');
 expect(openGroups().length<=1,'Aynı anda en fazla bir ana bölüm açık');
 for(const item of groups){
   if(item.getAttribute('aria-expanded')==='true'){item.click();await delay();}
   item.click();await delay();
   expect(openGroups().length===1&&openGroups()[0]===item,'Başka ana menü açılınca önceki kapanıyor: '+item.getAttribute('aria-label'));
 }
 groups[groups.length-1].click();await delay();
 expect(openGroups().length===0,'Açık ana menü yeniden tıklanarak kapanabiliyor');
 const deals=groups.find(el=>el.getAttribute('aria-label')==='Fırsat ve Süreç Yönetimi')!;
 deals.click();await delay();document.getElementById('sidebar-nav-proposal-management')!.click();await delay();
 expect(openGroups().length===1&&openGroups()[0]===deals,'Alt sayfaya geçerken çalışılan ana menü açık kalıyor');
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
