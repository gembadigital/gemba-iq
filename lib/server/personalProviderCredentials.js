import { getRequestContext } from './organizationMailbox.js';
import { providerFailure } from './personalAiRuntime.js';
const providers=['gemini','tavily'];
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export async function credentialContext(request) {
 const context=await getRequestContext(request);
 if (!context.user.email_confirmed_at) throw fail('Doğrulanmış kullanıcı hesabı gereklidir.',403);
 return context;
}
export async function readPersonalKeys(context) {
 const result=await context.adminClient.rpc('read_user_provider_secrets',{p_organization_id:context.organizationId,p_user_id:context.user.id});
 if(result.error) throw fail('Kişisel API anahtarları okunamadı.',503);
 return Object.fromEntries((result.data||[]).map(row=>[row.provider,row.api_key]));
}
async function status(context) {
 const result=await context.adminClient.from('user_provider_credentials').select('provider,last_four,updated_at,validated_at').eq('organization_id',context.organizationId).eq('user_id',context.user.id);
 if(result.error)throw fail('API ayarları yüklenemedi.',503);
 return {providers:providers.map(provider=>{const row=(result.data||[]).find(r=>r.provider===provider);return {provider,configured:!!row,lastFour:row?.last_four||'',updatedAt:row?.updated_at||'',validatedAt:row?.validated_at||''};})};
}
async function testKey(context,provider) {
 const keys=await readPersonalKeys(context);const key=keys[provider];if(!key)throw fail('Önce kişisel API anahtarınızı kaydedin.');
 const current=await context.adminClient.from('user_provider_credentials').select('updated_at').eq('organization_id',context.organizationId).eq('user_id',context.user.id).eq('provider',provider).maybeSingle();
 if(current.error||!current.data)throw fail('Anahtar durumu doğrulanamadı.',503);
 let result;
 try {result=await fetch(provider==='gemini'?'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1':'https://api.tavily.com/usage',{
  headers:provider==='gemini'?{'x-goog-api-key':key}:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(12000),redirect:'error'});
 }catch{throw fail('API sağlayıcısına ulaşılamadı.',502);}
 await result.body?.cancel();
 if(!result.ok)throw fail(providerFailure(result.status),result.status===429?429:400);
 const update=await context.adminClient.from('user_provider_credentials').update({validated_at:new Date().toISOString()}).eq('organization_id',context.organizationId).eq('user_id',context.user.id).eq('provider',provider).eq('updated_at',current.data.updated_at).select('provider');
 if(update.error||!update.data?.length)throw fail('Anahtar test sırasında değişti; yeniden test edin.',409);
 return {success:true,message:'Sağlayıcıya erişim doğrulandı. Model üretimi veya web araması yapılmadı.'};
}
export async function personalCredentialsHandler(request,response) {
 response.setHeader('Cache-Control','private, no-store');
 try {
  if(!['GET','POST','DELETE'].includes(request.method))return response.status(405).json({error:'Method not allowed'});
  const context=await credentialContext(request);
  if(request.method==='GET')return response.status(200).json(await status(context));
  const provider=request.body?.provider;
  if(!providers.includes(provider))throw fail('Geçersiz API sağlayıcısı.');
  if(request.method==='POST'&&request.body?.operation==='test')return response.status(200).json(await testKey(context,provider));
  const key=request.method==='DELETE'?null:String(request.body?.apiKey||'').trim();
  if(key!==null&&(key.length<20||key.length>512||/[\s\x00-\x1f\x7f]/.test(key)))throw fail('Geçerli bir API anahtarı girin.');
  const result=await context.adminClient.rpc('write_user_provider_secret',{p_organization_id:context.organizationId,p_user_id:context.user.id,p_provider:provider,p_key:key});
  if(result.error)throw fail('API anahtarı kaydedilemedi. Mevcut anahtar korunmuştur.',503);
  return response.status(200).json(await status(context));
 }catch(error){return response.status(error.status||503).json({error:error.status?error.message:'API ayarı tamamlanamadı.'});}
}
