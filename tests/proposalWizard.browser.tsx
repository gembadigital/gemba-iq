import React from 'react';import{createRoot}from'react-dom/client';
import ProposalManagementView from '../src/components/ProposalManagementView';
import ServicesView from '../src/components/ServicesView';
import ProposalActionsMenu from '../src/components/ProposalActionsMenu';
import{LanguageProvider}from'../src/lib/LanguageContext';
import {buildProposalDocument} from '../src/lib/proposalDocument';
import {proposalContentKey} from '../src/lib/proposalSnapshot';
const source:any={id:'source',sequenceNo:70,proposalNumber:'2611-70',companyId:'customer',companyName:'Test Müşteri',date:'2026-11-10',currentVersion:'v1.1',status:'Sent',owner:'İç Temsilci',contactPerson:'Müşteri Yetkilisi',contactEmail:'test@example.test',proposalSubject:'MÜŞTERİYE ÖZEL KONU',currency:'₺',serviceCode:'201',serviceName:'Yalın dönüşüm',coverPage:'MÜŞTERİYE ÖZEL KAPAK',activityTableHtml:'<table><tbody><tr><td>ÖZEL FAZ</td></tr></tbody></table>',terms:'ÖZEL KOŞULLAR',coverImage:'/cover.png',pageImage:'/page.png',options:{'Option 1':{name:'ÖZEL PROGRAM',desc:'',duration:'12 ay',rows:[{id:'r',item:'Özel faz',dailyRate:32500,manDays:4}],training:true,consulting:true,workshop:false,expenses:0,dailyRate:32500,manDays:4}},versions:[{version:'v1.1'}],services:['Özel faz'],totalBudget:130000,taxes:26000,grandTotal:156000};
source.versions=[{version:"v1.1",date:source.date,owner:source.owner,subject:source.proposalSubject,currency:source.currency,options:source.options,services:source.services,totalBudget:source.totalBudget,taxes:source.taxes,grandTotal:source.grandTotal}];
const cards=[{id:'first',code:'101',name:'Katalog ilk hizmet',defaultCoverPage:'KATALOG KAPAĞI',defaultTermsAndConditions:'KATALOG KOŞULU'},{id:'lean',code:'201',name:'Yalın dönüşüm',defaultCoverPage:'KATALOG 201',activityTableHtml:'<p>KATALOG FAZI</p>',option1Active:true,option1Name:'KATALOG PROGRAMI',option1Desc:'KATALOG AÇIKLAMASI',option1Rows:[{id:'catalog',item:'Katalog fazı',dailyRate:42000,manDays:25}],option2Active:false,option3Active:false}];
(window as any).testDb={kv:{crm_service_cards:cards,crm_persistent_general_terms:'GLOBAL KOŞUL',crm_revise_proposal_id:'source'},proposals:[structuredClone(source)],deals:[],pdfs:[],fail:false};
const db=(window as any).testDb;const report:string[]=[];
const sleep=(n=120)=>new Promise(r=>setTimeout(r,n));
const expect=(ok:any,message:string)=>{if(!ok)throw Error(message);report.push('GEÇTİ: '+message);document.getElementById('results')!.textContent=report.join('\n');};
const root=createRoot(document.getElementById('root')!);
const render=()=>root.render(<LanguageProvider><ServicesView defaultTab="wizard" /></LanguageProvider>);
const buttons=()=>Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
async function click(text:string){const b=buttons().find(b=>b.textContent?.trim()===text);if(!b)throw Error('Buton bulunamadı: '+text);b.click();await sleep();}
async function preview(){await click('İleri');await click('İleri');await click('İleri');}
async function save(){const b=buttons().find(b=>/Create Proposal & Save to CRM|Teklif Oluştur ve CRM|Yeni sürüm olarak kaydet|CRM.e Kaydet/.test(b.textContent||''));if(!b)throw Error('Kaydet butonu yok: '+buttons().map(b=>b.textContent).join('|'));b.click();await sleep(220);}
async function reopen(copy=false){db.kv[copy?'crm_copy_proposal_id':'crm_revise_proposal_id']='source';window.dispatchEvent(new CustomEvent('crm-navigate'));await sleep();}
async function run(){
 render();await sleep(400);await preview();
 let page=document.querySelector('#proposal-wizard-flow-wrapper')!.textContent!;
 expect(page.includes('ÖZEL PROGRAM')&&page.includes('MÜŞTERİYE ÖZEL KAPAK')&&page.includes('ÖZEL KOŞULLAR'),'İlk açılışta müşteri kaydı kataloğu ve global şartları geçersiz kılar');
 expect(!page.includes('KATALOG PROGRAMI')&&!page.includes('KATALOG 201')&&!page.includes('GLOBAL KOŞUL'),'Katalog içeriği müşteri belgesine sızmaz');
 expect(!/\{\{[^}]+\}\}/.test(page),'Sihirbaz etiketlerinde placeholder yok');
 await save();expect(db.proposals[0].currentVersion==='v1.2','İlk revizyon aynı kaydı v1.2 olarak kaydeder');
 expect(db.proposals.length===1&&db.proposals[0].options['Option 1'].rows[0].dailyRate===32500,'Müşterinin fiyatı ve tek opsiyonu korunur');
 expect(db.proposals[0].proposalSubject==='MÜŞTERİYE ÖZEL KONU','Kayıtlı teklif konusu e-posta varsayılanıyla ezilmez');
 expect(!db.proposals[0].options['Option 2']&&!db.proposals[0].options['Option 3'],'Eksik opsiyonlara eski örnek satırlar eklenmez');
 expect(db.pdfs.length===1&&db.pdfs[0].documentHtml===db.proposals[0].documentHtml,'PDF ve kayıt aynı belge anlık görüntüsünü kullanır');
 await reopen();await preview();await save();expect(db.proposals[0].currentVersion==='v1.3'&&db.proposals.length===1,'İkinci kez revize edip kaydetme aynı kaydı v1.3 yapar');
 await save();expect(db.proposals[0].currentVersion==='v1.4'&&db.proposals.length===1,'Aynı sihirbaz oturumunda yeniden kayıt yeni sürüm oluşturur');
 await click('Metni Elle Düzenle');const area=Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea')).find(a=>a.value.includes('a4-page'))!;
 const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!;setter.call(area,area.value.replace('MÜŞTERİYE ÖZEL KAPAK','ELLE DÜZENLENEN KAPAK'));area.dispatchEvent(new Event('input',{bubbles:true}));await sleep();await click('Metni Kilitle / Sabitle');await save();
 expect(db.proposals[0].documentHtml.includes('ELLE DÜZENLENEN KAPAK'),'Önizlemedeki elle düzenleme sabitleme ve kayıtta korunur');
 await reopen();await preview();expect(document.querySelector('#proposal-wizard-flow-wrapper')!.textContent!.includes('ELLE DÜZENLENEN KAPAK'),'Elle düzenlenen belge ikinci açılışta aynı kalır');
 const before=JSON.stringify(db.proposals);db.fail=true;await save();expect(JSON.stringify(db.proposals)===before,'Başarısız kayıt veritabanını değiştirmez');expect(document.body.textContent!.includes('TEST: kayıt başarısız'),'Başarısız kayıt hata bildirimi gösterir');db.fail=false;
 await reopen(true);await preview();await save();expect(db.proposals.length===2&&db.proposals[0].id!=='source'&&db.proposals[0].proposalNumber==='2611-71'&&db.proposals[0].currentVersion==='v1.0','Kopya yeni numarayla bağımsız ilk sürüm olarak kaydedilir');
 expect(JSON.stringify(db.proposals.find(p=>p.id==='source'))===before.slice(1,-1),'Kopyalama kaynak teklifi değiştirmez');expect(db.proposals[0].documentHtml.includes('ELLE DÜZENLENEN KAPAK')&&db.proposals[0].documentHtml.includes('2611-71'),'Kopyada elle düzenlenen içerik korunur ve belge numarası yenilenir');
 root.render(<ProposalActionsMenu proposalNumber="TEST" actions={[{label:'Kopya oluştur',icon:null,run:()=>{}},{label:'PDF indir',icon:null,run:()=>{}}]} />);await sleep();await click('İşlemler');expect(document.querySelectorAll('[role="menuitem"]').length===2,'İşlemler menüsü portal içinde açılır');
 const menu=document.querySelector('[role="menu"]')!;menu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await sleep();expect(!document.querySelector('[role="menu"]'),'Escape menüyü kapatır');
 root.render(<LanguageProvider><ProposalManagementView /></LanguageProvider>);await sleep();
 const latest=JSON.stringify(db.proposals);
 const versions=Array.from(document.querySelectorAll<HTMLSelectElement>('select')).find(s=>Array.from(s.options).some(o=>o.value==='v1.1'))!;
 Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value')!.set!.call(versions,'v1.1');versions.dispatchEvent(new Event('change',{bubbles:true}));await sleep();
 expect(JSON.stringify(db.proposals)===latest,'Eski sürümü görüntülemek aktif teklif kaydının üzerine yazmaz');
 document.getElementById('status')!.textContent=`GEÇTİ: ${report.length} teklif iş akışı testi`;
}
if(new URLSearchParams(location.search).has('preview')) { document.getElementById('status')!.remove(); document.getElementById('results')!.remove();root.render(<LanguageProvider><ProposalManagementView /></LanguageProvider>); } else run().catch(err=>{document.getElementById('status')!.textContent='BAŞARISIZ: '+err.message;console.error(err)});
