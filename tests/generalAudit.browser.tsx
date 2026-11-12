import React from 'react';
import type { Root } from 'react-dom/client';
import { LanguageProvider } from '../src/lib/LanguageContext';
import SalesDashboardView from '../src/components/SalesDashboardView';
import CompanyRevenueTab from '../src/components/company-tabs/CompanyRevenueTab';
import CampaignManagerView from '../src/components/CampaignManagerView';
import CompaniesView from '../src/components/CompaniesView';
import ContractManagerView from '../src/components/ContractManagerView';
import AdministrationCenter from '../src/components/AdministrationCenter';

// Actual components, isolated CRM transport; no live writes or emails.
export async function runGeneralAudit(root: Root, fixtures: any) {
  const results: string[] = [];
  const pause = () => new Promise(r => setTimeout(r, 180));
  const check = (ok: unknown, label: string) => { if (!ok) throw Error(label); results.push(label); };
  let sequence = 0;
  const render = async (node: React.ReactNode) => {
    root.render(<LanguageProvider key={++sequence}>{node}</LanguageProvider>); await pause();
  };
  const click = async (pattern: RegExp) => {
    const button = Array.from(document.querySelectorAll('button')).find(b => pattern.test(b.textContent || ''));
    if (!button) throw Error('Düğme bulunamadı: ' + pattern);
    button.click(); await pause();
  };
  const setNumber = async (input: HTMLInputElement, value: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true })); await pause();
  };
  await render(<SalesDashboardView deals={[]} />);
  await click(/Hedef.*(Düzenle|Ayarla)|Adjust.*Target|Hedefleri/i);
  const targetInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]'));
  check(targetInputs.length === 3 && targetInputs.every(i => i.value === '0'), 'Kaydedilmemiş satış hedefleri örnek rakamlarla doldurulmuyor');
  for (const [i, value] of ['123', '456', '789'].entries()) await setNumber(targetInputs[i], value);
  await click(/Save administrative Targets|hedefleri kaydet/i);
  check(fixtures.kv.crm_sales_dashboard_targets?.monthly === 123, 'Hedef Kaydet düğmesi CRM kayıt katmanına yazıyor');
  await render(<SalesDashboardView deals={[]} />);
  await click(/Hedef.*(Düzenle|Ayarla)|Adjust.*Target|Hedefleri/i);
  check(Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]')).map(i => i.value).join(',') === '123,456,789', 'Ekran yeniden açılınca üç satış hedefi korunuyor');
  fixtures.persistenceError = true;
  await click(/Save administrative Targets|hedefleri kaydet/i);
  check(document.querySelector('[role="alert"]')?.textContent?.includes('kayıt sunucusu hatası') && document.querySelectorAll('input[type="number"]').length === 3, 'Kayıt hatası görünür; hedef penceresi başarı göstermeden açık kalıyor');
  fixtures.persistenceError = false;
  const now = new Date();
  const formatDate = (d: Date) => `${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}`;
  const minimalDeal = {companyName:'Dönem kontrolü',dealName:'Dönem',stage:'Lead Identified',owner:'Kontrol',winProbability:0,currentStageDuration:0};
  await render(<SalesDashboardView deals={[
    {...minimalDeal,id:'this-month',opportunityValue:11000,expectedCloseDate:formatDate(now)},
    {...minimalDeal,id:'last-year',opportunityValue:22000,expectedCloseDate:formatDate(new Date(now.getFullYear()-1,now.getMonth(),now.getDate()))},
    {...minimalDeal,id:'last-month',opportunityValue:33000,expectedCloseDate:formatDate(new Date(now.getFullYear(),now.getMonth()-1,1))},
  ] as any} />);
  await click(/^Filtreler$/);
  await click(new RegExp(now.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})));
  const periodValue = document.querySelector('.sales-kpis > div')?.textContent || '';
  check(periodValue.includes('11.000') && !periodValue.includes('66.000'), 'Bu ay filtresi güncel ayı kullanıyor ve önceki yılın aynı ayını dışlıyor');

  delete fixtures.kv.crm_company_billing_audit;
  await render(<CompanyRevenueTab companyId="audit" companyName="Kontrol müşterisi" lang="TR" />);
  check(!('crm_company_billing_audit' in fixtures.kv), 'Finansal Ciro sekmesini açmak örnek ödeme planını veritabanına yazmıyor');
  check(!document.body.textContent?.includes('50.000') && !document.body.textContent?.includes('Kaizen Blitz'), 'Boş müşteride sahte sözleşme tutarı veya faz gösterilmiyor');
  fixtures.kv.crm_company_billing_audit = [];
  await render(<CompanyRevenueTab companyId="audit" companyName="Kontrol müşterisi" lang="TR" />);
  check(fixtures.kv.crm_company_billing_audit.length === 0, 'Kaydedilmiş boş ödeme planı yeniden örnek kayıtlarla doldurulmuyor');

  delete fixtures.kv.crm_linkedin_posts; delete fixtures.kv.crm_email_campaigns;
  await render(<CampaignManagerView />);
  check(fixtures.kv.crm_linkedin_posts.length === 0 && fixtures.kv.crm_email_campaigns.length === 0, 'Boş kampanya ekranı örnek gönderi veya gönderim üretmiyor');
  const scheduled = {id:'audit-post',channel:'Gemba Lean',text:'Gerçek plan',tags:[],date:'2020-01-01',time:'09:00',imageUrl:'',status:'SCHEDULED',reactions:0,comments:0,reposts:0};
  fixtures.kv.crm_linkedin_posts = [scheduled];
  await render(<CampaignManagerView />);
  await new Promise(r => setTimeout(r, 16000));
  check(fixtures.kv.crm_linkedin_posts[0].status === 'SCHEDULED' && fixtures.kv.crm_linkedin_posts[0].reactions === 0, 'Süresi geçen yayın planı sahte başarıya veya rastgele etkileşime dönüşmüyor');
  fixtures.companies = [{id:'audit-company',name:'Eksik alanlı müşteri',customerStatus:'Lead',industry:'',accountOwner:'',customFields:{}}];
  await render(<CompaniesView />);
  check(!document.body.textContent?.includes('1.2M') && !document.body.textContent?.includes('Bursa, TR') && !document.body.textContent?.includes('Serial Batch'), 'Eksik müşteri alanları sahte ciro, şehir veya üretim tipi göstermiyor');
  await click(/Yeni Şirket Ekle/);
  const companyForm = document.querySelector('form[data-crm-modal]')!;
  const fill = async (label: RegExp, value: string) => {
    const node = Array.from(companyForm.querySelectorAll('label')).find(e => label.test(e.textContent || ''));
    const input = node?.parentElement?.querySelector<HTMLInputElement>('input');
    if (!input) throw Error('Form alanı bulunamadı: ' + label);
    await setNumber(input,value);
  };
  await fill(/Şirket Adı|Company Name/i, 'Yeni alan kontrol müşterisi');
  await fill(/Telefon|Phone/i, '+90 216 555 12 34');
  await fill(/Web/i, 'https://example.test');
  (companyForm.querySelector('button[type="submit"]') as HTMLButtonElement).click(); await pause();
  check(fixtures.createdCompany?.phone === '+90 216 555 12 34' && fixtures.createdCompany?.website === 'https://example.test', 'Yeni müşteri formu girilen telefon ve web alanlarını kayıt çağrısına aktarıyor');
  fixtures.kv.crm_contract_date = '2025-05-14';fixtures.kv.crm_contract_currency = 'EUR';
  await render(<ContractManagerView />);
  check(fixtures.kv.crm_contract_date === '2025-05-14' && fixtures.kv.crm_contract_currency === 'EUR', 'Sözleşme açılırken kayıtlı tarih ve para birimi bugüne/TRY değerine dönmüyor');
  delete fixtures.kv.crm_admin_audit_logs;
  await render(<AdministrationCenter onClose={()=>{}} />);
  check(fixtures.kv.crm_admin_audit_logs?.length === 0, 'Yönetim ekranı örnek güvenlik/kullanıcı geçmişi oluşturmuyor');
  fixtures.persistenceError = true;
  await click(/Değişiklikleri Kaydet/);
  check(document.body.textContent?.includes('kayıt sunucusu hatası') && !document.body.textContent?.includes('✓ Kaydedildi'), 'Organizasyon kaydı başarısızken Kaydedildi mesajı gösterilmiyor');
  fixtures.persistenceError = false;

  const report = document.createElement('pre');report.id='audit-result';report.textContent='GEÇTİ: '+results.length+' kontrol\n'+results.join('\n');document.body.append(report);
}
