import React,{useEffect,useState} from 'react';
import {useOrganization} from '../lib/OrganizationContext';
import {useLanguage} from '../lib/LanguageContext';
import {fetchPersonalProviderStatus,savePersonalProviderKey,removePersonalProviderKey,testPersonalProviderKey,type PersonalProvider,type ProviderStatus} from '../lib/personalProviderCredentials';
import {useConfirm} from '../lib/useConfirm';
import {ConfirmModal} from './shared/ConfirmModal';
const providers:PersonalProvider[]=['gemini','tavily'];
export default function PersonalProviderSettings(){
 const {organizationId,actorEmail}=useOrganization();const {lang}=useLanguage();const L=(tr:string,en:string)=>lang==='TR'?tr:en;
 const [status,setStatus]=useState<ProviderStatus[]>([]),[keys,setKeys]=useState({gemini:'',tavily:''}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');const {confirm,confirmProps}=useConfirm();
 useEffect(()=>{let cancelled=false;setLoading(true);setKeys({gemini:'',tavily:''});setStatus([]);setError('');fetchPersonalProviderStatus().then(r=>{if(!cancelled)setStatus(r.providers);}).catch(()=>{if(!cancelled)setError(L('Kişisel API ayarları yüklenemedi. Sayfayı yeniden açın.','Personal API settings could not be loaded. Reopen this page.'));}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[organizationId]);
 async function act(provider:PersonalProvider,operation:'save'|'remove'|'test'){
  if(busy)return;
  if(operation==='remove'&&!await confirm({title:L('Kişisel anahtarı kaldır','Remove personal key'),message:L('Yalnızca bu kullanıcı ve organizasyon için saklanan anahtar kaldırılacak. Ortak Gemba IQ anahtarına geçiş yapılmayacak.','Only your key in this organization will be removed. The shared Gemba IQ key will not be used.'),confirmLabel:L('Kaldır','Remove'),cancelLabel:L('Vazgeç','Cancel'),danger:true}))return;
  setBusy(provider);setError('');setMessage('');
  try {
   if(operation==='test'){const r=await testPersonalProviderKey(provider);setMessage(r.message);const next=await fetchPersonalProviderStatus();setStatus(next.providers);}
   else{const r=operation==='save'?await savePersonalProviderKey(provider,keys[provider].trim()):await removePersonalProviderKey(provider);setStatus(r.providers);setKeys(v=>({...v,[provider]:''}));setMessage(L(operation==='save'?'Kişisel API anahtarı kaydedildi.':'Kişisel API anahtarı kaldırıldı.',operation==='save'?'Personal API key saved.':'Personal API key removed.'));}
  }catch(e){setError(e instanceof Error?e.message:L('İşlem tamamlanamadı.','Operation failed.'));}finally{setBusy('');}
 }
 return <section data-crm-card="padded" className="space-y-4 p-5" data-personal-provider-settings>
  <h3 data-crm-heading="section">{L('Kişisel API Anahtarları','Personal API Keys')}</h3>
  <p className="text-sm">{L('Anahtarlar yalnızca kendi hesabınız ve açık organizasyon için kullanılır. Gemba IQ’nun ortak Gemini veya Tavily anahtarı kullanılmaz. Kullanım kendi sağlayıcı hesabınızın kotasından düşer. Supabase’e giriş yapmanız gerekmez.','Keys are used only for your account in the current organization. Shared Gemba IQ Gemini or Tavily keys are never used. Usage belongs to your provider account. You do not need to access Supabase.')}</p>
  <p className="text-xs break-all">{actorEmail}</p>
  {loading?<p role="status">{L('Yükleniyor…','Loading…')}</p>:providers.map(provider=>{const entry=status.find(s=>s.provider===provider),name=provider==='gemini'?'Google Gemini':'Tavily';return <div key={provider} className="border rounded-lg p-4 space-y-3" data-provider={provider}>
   <h4 data-crm-heading="section">{name}</h4>
   <p className="text-xs">{entry?.configured?L(`Kayıtlı · ••••${entry.lastFour}`,`Saved · ••••${entry.lastFour}`):L('Anahtar kayıtlı değil.','No key saved.')}{entry?.validatedAt?' · '+L('Erişim testi yapıldı','Access tested'):''}</p>
   <label data-crm-label="" className="block" htmlFor={'personal-key-'+provider}>{L(entry?.configured?'Yeni anahtar ile değiştir':'API anahtarınız',entry?.configured?'Replace with a new key':'Your API key')}</label>
   <input data-crm-field="" id={'personal-key-'+provider} type="password" autoComplete="new-password" spellCheck={false} disabled={!!busy||!!error&&!status.length} value={keys[provider]} onChange={e=>setKeys(v=>({...v,[provider]:e.target.value}))} className="w-full" placeholder={L('Anahtarı buraya yapıştırın','Paste your key here')}/>
   <div className="flex flex-wrap gap-2">
    <button data-crm-button="" type="button" disabled={!!busy||!keys[provider].trim()||!!error&&!status.length} onClick={()=>void act(provider,'save')} className="bg-blue-650 text-white px-4 py-2">{L('Kaydet','Save')}</button>
    <button data-crm-button="" data-crm-variant="secondary" type="button" disabled={!!busy||!entry?.configured} onClick={()=>void act(provider,'test')} className="px-4 py-2">{L('Erişimi Test Et','Test Access')}</button>
    <button data-crm-button="" data-crm-variant="secondary" type="button" disabled={!!busy||!entry?.configured} onClick={()=>void act(provider,'remove')} className="px-4 py-2">{L('Kaldır','Remove')}</button>
   </div>
   <p className="text-xs">{L('Tam anahtar yeniden gösterilmez. Test, sağlayıcıya erişimi kontrol eder; model üretimi veya web araması yapmaz.','The full key is never shown again. The test checks provider access; it does not generate model output or search the web.')}</p>
  </div>})}
  {message&&<p role="status" className="text-sm">{message}</p>}{error&&<p role="alert" className="text-sm text-rose-600">{error}</p>}
  <ConfirmModal {...confirmProps}/>
 </section>;
}
