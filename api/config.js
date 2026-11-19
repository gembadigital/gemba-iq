import {getRequestContext} from '../lib/server/organizationMailbox.js';
import {assertMicrosoftOrganizationAccess} from '../lib/server/organizationAccess.js';
export default async function handler(request,response){
 response.setHeader('Cache-Control','private, no-store');
 let allowed=false;
 try{const context=await getRequestContext(request);await assertMicrosoftOrganizationAccess(context);allowed=true;}catch{}
 const hasClientKeys=allowed&&Boolean(process.env.AZURE_CLIENT_ID&&process.env.AZURE_CLIENT_SECRET&&process.env.AZURE_TENANT_ID);
 return response.status(200).json({hasClientKeys,clientId:allowed?process.env.AZURE_CLIENT_ID||'':'',tenantId:allowed?process.env.AZURE_TENANT_ID||'':'',redirectUri:'',appUrl:(process.env.APP_URL||'').replace(/\/$/,''),personalProviders:true,microsoftSetupRequired:!hasClientKeys});
}
