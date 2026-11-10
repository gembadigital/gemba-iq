import { buildProposalDocument, type ProposalDocument } from '../src/lib/proposalDocument';
import { renderElementToPdfBase64 } from '../src/lib/htmlToPdf';
import cards from '../src/data/serviceCatalog.json';
const ready = cards.filter(c => c.definitionStatus === 'ready');
const fixtures = new Map<string, ProposalDocument>();
const terms = 'KDV: Teklif tutarına ayrıca gösterildiği şekilde uygulanır.\nMasraflar: Kayıtlı teklif koşulları geçerlidir.\nFaturalandırma: Kayıtlı faturalandırma koşulları geçerlidir.\nÖdeme: Kayıtlı ödeme koşulları geçerlidir.\nTeklif geçerlilik süresi: Kayıtlı süre geçerlidir.';
for (const card of ready) fixtures.set(card.code, {
 proposalNumber:'TEST-307',date:'2026-11-09',companyName:'ÖRNEK MÜŞTERİ',contactPerson:'Müşteri Yetkilisi',proposalSubject:card.name,
 serviceName:card.name,serviceCode:card.code,currency:'₺',coverPage:card.defaultCoverPage,description:'',activityTableHtml:card.activityTableHtml,terms,
 options:{'Option 1':{name:'SPC eğitim programı',desc:'Eğitim ve uygulama çalışmaları',duration:'2 gün',training:true,consulting:false,workshop:false,expenses:0,manDays:2,dailyRate:40000,rows:[{id:'a',item:'SPC eğitimi',manDays:1,dailyRate:40000},{id:'b',item:'SPC uygulaması',manDays:1,dailyRate:40000}]}}
});
const base=fixtures.get('307')!;
const approvedTerms="1. KDV:\nTeklifte belirtilen fiyatlara KDV dahil değildir. Yürürlükteki KDV oranı fatura tutarına ayrıca ilave edilir.\n2. Ulaşım ve Konaklama Giderleri:\nTeklif fiyatları yalnızca hizmet bedelini kapsamaktadır. İl dışında gerçekleştirilecek çalışmalara ilişkin ulaşım, konaklama ve ilgili seyahat giderleri müşteri firmaya aittir.\n3. Faturalandırma:\nEğitim ve danışmanlık hizmetleri, ilgili ay içerisinde gerçekleştirilen eğitim veya danışmanlık günleri esas alınarak aylık olarak faturalandırılır. Tek seferlik eğitimlerde faturalandırma, eğitimin tamamlanmasının ardından yapılır.\n4. Ödeme Koşulları:\nFatura bedeli, fatura tarihinden itibaren en geç 14 (on dört) takvim günü içerisinde banka havalesi/EFT yoluyla ödenir.\n5. Teklif Geçerlilik Süresi:\nTeklifte belirtilen fiyat ve koşullar, teklif tarihinden itibaren 30 (otuz) gün süreyle geçerlidir.\n6. Eğitim ve Çalışma Takvimi:\nEğitim ve danışmanlık tarihleri, tarafların karşılıklı mutabakatıyla belirlenir. Planlanan çalışmaların ertelenmesi veya iptal edilmesi taleplerinin en az 5 (beş) iş günü öncesinden yazılı olarak bildirilmesi gerekmektedir.\n7. Hizmet Kapsamı:\nTeklifte belirtilen hizmet kapsamı, süre ve adam-gün miktarları esas alınır. Kapsam dışındaki ilave çalışmalar, tarafların karşılıklı mutabakatıyla ayrıca fiyatlandırılır.\n8. Teklif Onayı:\nTeklifin müşteri tarafından yazılı olarak onaylanmasıyla çalışma planlama süreci başlatılır. Hizmetin uygulanmasına ilişkin detaylı koşullar, gerekli görülmesi halinde taraflar arasında ayrıca düzenlenecek hizmet sözleşmesiyle belirlenir.";
fixtures.set('ONAYLI-HUKUK',{...base,companyName:'MARSHALL BOYA',contactPerson:'Semanur Demirel',terms:approvedTerms});
fixtures.set('YETKİLİ-YOK',{...base,contactPerson:''});
const lean=fixtures.get('201')!;
const pasted=lean.activityTableHtml!.replaceAll('<tr>', '<tr style="height:120px">').replaceAll('<td>', '<td width="800"><p style="font:18pt Arial;margin:18px;padding:12px">').replaceAll('</td>', '</p></td>');
fixtures.set('WORD-GENİŞ',{...lean,activityTableHtml:pasted});
fixtures.set('BİRDEN-ÇOK-TABLO',{...base,activityTableHtml:'<h3>İlk aşama</h3><table><tr><th>Adım</th></tr><tr><td>BİRİNCİ-TABLO-KORUNUR</td></tr></table><p>Aşamalar arasındaki not.</p><table><tr><th>İkinci aşama</th></tr><tr><td>İKİNCİ-TABLO-KORUNUR</td></tr></table>'});
fixtures.set('TABLOSUZ',{...base,activityTableHtml:'',options:{}});
fixtures.set('UZUN',{...base,coverPage:base.coverPage+'\n'+Array.from({length:900},(_,i)=>`tanım${i}`).join(' '),terms:terms+'\nÖdeme: '+Array.from({length:1000},(_,i)=>`koşul${i}`).join(' '),options:{...base.options,'Option 2':{...base.options['Option 1'],name:'İkinci seçenek',desc:'Uzun fiyat tablosu',rows:Array.from({length:90},(_,i)=>({id:String(i),item:`HİZMET-${i} `+'W'.repeat(120),dailyRate:123.45,manDays:1}))}}});
fixtures.set('ESKİ-KAYIT',{...base,coverPage:'<h2>Eski tanım</h2><p>Tüm içerik korunur.</p>',activityTableHtml:undefined,methodology:'<h2>Eski fazlar</h2><table><tr><th>Adım</th></tr><tr><td>SON FAALİYET</td></tr></table>',options:{Eski:{training:false,consulting:true,workshop:false,expenses:500,manDays:3,dailyRate:2000}},terms:'<h2>Ödeme</h2><p>ESKİ KOŞULLAR KORUNUR.</p>'});
fixtures.set('GÜVENLİ-METİN',{...base,companyName:'<img src=x onerror="alert(1)">',contactPerson:'A & B',coverPage:'<h3 onclick="alert(1)">Güvenli başlık</h3><script>alert(1)</script><p>Güvenli metin</p>',activityTableHtml:'',terms:'<h3>Ödeme</h3><p onclick="alert(1)">Koşul korunur.</p>'});
const host=document.getElementById('pages')!;
const report=[];
function inspect(code:string,doc:ProposalDocument){
 host.innerHTML=buildProposalDocument(doc);
 const pages=Array.from(host.querySelectorAll<HTMLElement>('.a4-page'));
 const sections=pages.map(p=>p.dataset.section!);
 const order={cover:0,introduction:1,activity:2,pricing:3,legal:4,signature:5};
 const ordered=sections.every((s,i)=>!i||order[s]>=order[sections[i-1]]);
 const overflow=Array.from(host.querySelectorAll<HTMLElement>('.proposal-content')).some(box=>box.scrollHeight>box.clientHeight+2||Array.from(box.querySelectorAll<HTMLElement>('*')).some(el=>el.scrollWidth>el.clientWidth+3 || el.getBoundingClientRect().bottom>box.getBoundingClientRect().bottom+2));
 const overflowSections=Array.from(host.querySelectorAll<HTMLElement>('.proposal-content')).filter(box=>box.scrollHeight>box.clientHeight+2||Array.from(box.querySelectorAll<HTMLElement>('*')).some(el=>el.scrollWidth>el.clientWidth+3||el.getBoundingClientRect().bottom>box.getBoundingClientRect().bottom+2)).map(box=>box.closest<HTMLElement>('.a4-page')!.dataset.section);
 const signature=host.querySelector<HTMLElement>('[data-signatures]')!;
 const signatureBottom=Math.abs(signature.getBoundingClientRect().bottom-signature.closest('.proposal-content')!.getBoundingClientRect().bottom)<2;
 const text=host.textContent!.replace(/\s+/g,' ');
 const signs=host.querySelectorAll('[data-signatures]').length===1 && pages.at(-1)!.contains(signature);
 const optional=code!=='TABLOSUZ'||!sections.includes('activity');
 const pricing=code!=='307'||(text.includes('80.000,00')&&text.includes('16.000,00')&&text.includes('96.000,00'));
 const long=code!=='UZUN'||(text.includes('tanım899')&&text.includes('koşul999')&&text.includes('HİZMET-89'));
 const legacy=code!=='ESKİ-KAYIT'||text.includes('SON FAALİYET')&&text.includes('ESKİ KOŞULLAR KORUNUR.')&&text.includes('6.500,00');
 const input=new DOMParser().parseFromString(doc.activityTableHtml||'','text/html');
 const allCells=Array.from(input.querySelectorAll('tbody td')).every(el=>text.includes(el.textContent!.replace(/\s+/g,' ').trim()));
 const activityWords=(root:ParentNode)=>Array.from(root.querySelectorAll('tbody td')).filter(c=>!c.closest('table[data-proposal-note]')).map(c=>c.textContent!.trim()).join(' ').replace(/\s+/g,' ').trim();
 const activityHost=document.createElement('div');activityHost.innerHTML=Array.from(host.querySelectorAll('.a4-page[data-section="activity"] .proposal-section-body')).map(x=>x.innerHTML).join('');
 const exactActivity=doc.activityTableHtml==null||activityWords(input)===activityWords(activityHost);
 const safe=!host.querySelector('script,[onclick],[onerror]');
 const activityPages=sections.filter(s=>s==='activity').length;
 const twoPages=(!ready.some(c=>c.code===code)&&code!=='WORD-GENİŞ')||activityPages<=2;
 const packed=code!=='BİRDEN-ÇOK-TABLO'||activityPages===1&&text.includes('BİRİNCİ-TABLO-KORUNUR')&&text.includes('İKİNCİ-TABLO-KORUNUR')&&text.includes('Aşamalar arasındaki not.');
 const approval=host.querySelector('[data-customer-approval]');
 const customer=code!=='ONAYLI-HUKUK'||approval?.textContent?.includes('MARSHALL BOYA')&&approval?.textContent?.includes('Sn. Semanur Demirel');
 const emptyAuthority=code!=='YETKİLİ-YOK'||approval?.textContent?.includes('Yetkili: ____________________');
 const compactLegal=code!=='ONAYLI-HUKUK'||sections.filter(s=>s==='legal').length===1&&!sections.includes('signature')&&Array.from({length:8},(_,i)=>i+1).every(n=>Array.from(host.querySelectorAll('.a4-page[data-section="legal"] h3')).some(h=>h.textContent?.startsWith(n+'. ')));
 const ok=customer&&emptyAuthority&&compactLegal&&exactActivity&&twoPages&&packed&&safe&&ordered&&!overflow&&signatureBottom&&signs&&optional&&pricing&&long&&legacy&&allCells;
 report.push({code,pages:pages.length,customer,emptyAuthority,compactLegal,activityPages,twoPages,packed,exactActivity,ordered,overflow,overflowSections,signatureBottom,signs,optional,pricing,long,legacy,allCells,safe,ok});
}
for(const [code,doc] of fixtures)inspect(code,doc);
document.getElementById('status')!.textContent=report.every(r=>r.ok)?`GEÇTİ: ${report.length} belge testi`:`BAŞARISIZ: ${JSON.stringify(report.filter(r=>!r.ok))}`;
document.getElementById('results')!.textContent=JSON.stringify(report);
const select=document.getElementById('service') as HTMLSelectElement;
for(const key of fixtures.keys())select.add(new Option(key,key));
function show(){host.innerHTML=buildProposalDocument(fixtures.get(select.value)!); const view=new URLSearchParams(location.search).get('view'); if(view==='activity'||view==='legal')host.querySelectorAll<HTMLElement>('.a4-page').forEach(p=>{if(p.dataset.section!==view)p.remove()});}
select.value=new URLSearchParams(location.search).get('service')||'307';select.addEventListener('change',show);show();
document.getElementById('capture')!.addEventListener('click',async()=>{
 document.getElementById('pdf-status')!.textContent='PDF hazırlanıyor';
 const expected=host.querySelectorAll('.a4-page').length;
 const result=await renderElementToPdfBase64(host,'test.pdf');
 const raw=result?atob(result.base64):'';
 const count=(raw.match(/\/Type \/Page\b/g)||[]).length;
 document.getElementById('pdf-status')!.textContent=raw.startsWith('%PDF')&&count===expected?`PDF GEÇTİ: ${count} sayfa`:`PDF BAŞARISIZ: ${count}/${expected}`;
});
