import { credentialContext, readPersonalKeys } from './personalProviderCredentials.js';
import { withPersonalKeys, personalProviderKey } from './personalAiRuntime.js';
export async function assertAiAccess(request) {
 const context=await credentialContext(request);
 const keys=await readPersonalKeys(context);
 return {context,keys};
}
export function withPersonalAiHandler(handler) {
 return async (request,response)=>{
  response.setHeader('Cache-Control','private, no-store');
  if(request.method!=='POST')return response.status(405).json({error:'Method not allowed'});
  try {
   const {keys}=await assertAiAccess(request);
   return await withPersonalKeys(keys,()=>{personalProviderKey('gemini',true);return handler(request,response);});
  } catch(error) {return response.status(error.status||503).json({error:error.status?error.message:'Kişisel AI işlemi tamamlanamadı.'});}
 };
}
