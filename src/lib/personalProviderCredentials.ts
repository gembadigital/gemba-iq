import { organizationFetch } from './organizationFetch';
export type PersonalProvider='gemini'|'tavily';
export interface ProviderStatus {provider:PersonalProvider;configured:boolean;lastFour:string;updatedAt:string;validatedAt:string;}
export interface ProviderStatusList {providers:ProviderStatus[];}
async function request(method:string,body?:Record<string,unknown>) {
 const response=await organizationFetch('/api/user/mailbox?action=api-credentials',{method,cache:'no-store',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'API ayarı tamamlanamadı.');return result;
}
export async function fetchPersonalProviderStatus():Promise<ProviderStatusList>{return request('GET');}
export async function savePersonalProviderKey(provider:PersonalProvider,apiKey:string):Promise<ProviderStatusList>{return request('POST',{provider,apiKey});}
export async function removePersonalProviderKey(provider:PersonalProvider):Promise<ProviderStatusList>{return request('DELETE',{provider});}
export async function testPersonalProviderKey(provider:PersonalProvider):Promise<{success:boolean;message:string}>{return request('POST',{provider,operation:'test'});}
