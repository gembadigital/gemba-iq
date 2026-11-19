import { AsyncLocalStorage } from 'node:async_hooks';
import { GoogleGenAI } from '@google/genai';
const credentials = new AsyncLocalStorage();
export function withPersonalKeys(keys, work) { return credentials.run({ keys, client: null }, work); }
export function personalProviderKey(provider, required = false) {
 const key = credentials.getStore()?.keys?.[provider];
 if (!key && required) throw Object.assign(new Error(`Hesabım → Kişisel API Anahtarları bölümüne kendi ${provider === 'gemini' ? 'Gemini' : 'Tavily'} anahtarınızı kaydedin.`),{status:403});
 return key || '';
}
export function providerFailure(status) {
 return status===401||status===403||status===400 ? 'Kişisel API anahtarı geçersiz veya bu işlem için yetkisiz.' : status===429 ? 'Kişisel API hesabınızın kotası veya istek limiti aşıldı.' : status===404 ? 'İstenen model kişisel API hesabınızda kullanılamıyor.' : 'Kişisel API sağlayıcısına erişilemedi. Lütfen tekrar deneyin.';
}
export function personalGeminiClient() {
 const store=credentials.getStore(); const apiKey=personalProviderKey('gemini',true);
 if (!store.client) {
  const sdk=new GoogleGenAI({apiKey});
  store.client={models:{generateContent:async params=>{try{return await sdk.models.generateContent(params);}catch(error){throw Object.assign(new Error(providerFailure(error?.status)),{status:error?.status||502});}}}};
 }
 return store.client;
}
