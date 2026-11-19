function accessError(message, status = 403) { return Object.assign(new Error(message), { status }); }

export async function resolveOrganizationAccess(adminClient, user, request = {}) {
  if (!user?.id) throw accessError('Unauthorized', 401);
  const selected = request.headers?.['x-organization-id'];
  if (selected !== undefined && (typeof selected !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(selected))) {
    throw accessError('Geçersiz organizasyon.', 400);
  }
  let query = adminClient.from('organization_members').select('organization_id,role').eq('user_id', user.id);
  if (selected) query = query.eq('organization_id', selected);
  const result = await query;
  if (result.error) throw accessError('Organizasyon üyeliği doğrulanamadı.', 503);
  const members = result.data || [];
  if (!members.length) throw accessError('Bu organizasyona erişiminiz yok.');
  if (members.length !== 1) throw accessError('Aktif organizasyonu seçin.', 409);
  return { organizationId: members[0].organization_id, isAdmin: members[0].role === 'ADMIN' };
}

export async function assertMailboxDomain(context, address) {
  const result = await context.adminClient.from('organization_access_rules').select('email_domain').eq('organization_id', context.organizationId).maybeSingle();
  if (result.error) throw accessError('Organizasyon posta alanı doğrulanamadı.', 503);
  const domain = result.data?.email_domain;
  if (!domain || String(address || '').trim().toLowerCase().split('@')[1] !== domain) {
    throw accessError('Posta kutusu aktif organizasyonun e-posta alanına ait olmalıdır.');
  }
}

// Germany has a separate Microsoft tenant. Until that organization's own
// Azure application is configured, never route it through Turkey's app.
export async function assertMicrosoftOrganizationAccess(context) {
 const result=await context.adminClient.from('organization_access_rules').select('email_domain').eq('organization_id',context.organizationId).maybeSingle();
 if(result.error)throw accessError('Microsoft organizasyonu doğrulanamadı.',503);
 if(result.data?.email_domain!=='gembapartner.com')throw accessError('Bu organizasyon ayrı bir Microsoft kuruluşu kullanıyor. Kendi Microsoft uygulaması ve yönetici onayı yapılandırılmadan Outlook/takvim bağlantısı açılamaz; Türkiye uygulaması kullanılmaz.');
}
