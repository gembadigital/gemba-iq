import { getRequestContext } from './organizationMailbox.js';
export async function assertAiAccess(request) {
 const context = await getRequestContext(request);
 const result = await context.adminClient.from('organization_access_rules').select('ai_enabled').eq('organization_id',context.organizationId).maybeSingle();
 if (result.error) throw Object.assign(new Error('Organizasyon ayarları doğrulanamadı.'),{status:503});
 if (result.data?.ai_enabled !== true) throw Object.assign(new Error('Bu organizasyonda yapay zekâ API erişimi kapalı.'),{status:403});
 return context;
}
