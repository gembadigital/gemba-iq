import { calendarError } from './calendarValidation.js';

// Registry is admin-controlled organization settings, never user_metadata or
// a mailbox address supplied by the browser. Membership must still be current.
export async function getCalendarOwners(context) {
  const { adminClient, user } = context;
  if (!user?.id || !user.email_confirmed_at) throw calendarError('Doğrulanmış kullanıcı oturumu gereklidir.', 403);
  const orgId = context.organizationId;
  if (!orgId) throw calendarError('Aktif organizasyon üyeliği gereklidir.', 403);
  const setting = await adminClient.from('organization_settings').select('microsoft_graph_application').eq('organization_id', orgId).maybeSingle();
  if (setting.error) throw calendarError('Takvim paylaşımı okunamadı.', 503);
  const sharing = setting.data?.microsoft_graph_application?.calendar_sharing;
  const approved = sharing?.enabled === true && sharing?.mode === 'titles_times' && Array.isArray(sharing?.user_ids)
    ? [...new Set(sharing.user_ids.filter(id => typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)))].slice(0, 10) : [];
  const candidates = approved.includes(user.id) ? approved : [user.id];
  const [members, profiles, connections] = await Promise.all([
    adminClient.from('organization_members').select('user_id').eq('organization_id', orgId).in('user_id', candidates),
    adminClient.from('profiles').select('id,full_name').in('id', candidates),
    adminClient.from('user_mailbox_connections').select('user_id,mailbox_address,status').eq('default_mailbox', true).in('user_id', candidates),
  ]);
  if (members.error || profiles.error || connections.error) throw calendarError('Takvim hesapları doğrulanamadı.', 503);
  const currentMembers = new Set((members.data || []).map(m => m.user_id));
  return Promise.all(candidates.filter(id => currentMembers.has(id)).map(async (id, index) => {
    const identity = id === user.id ? { data: { user }, error: null } : await adminClient.auth.admin.getUserById(id);
    const account = identity.error ? null : identity.data?.user;
    const mailbox = (connections.data || []).find(c => c.user_id === id);
    const email = String(account?.email || '').trim().toLowerCase();
    const address = String(mailbox?.mailbox_address || '').trim().toLowerCase();
    return { userId: id, ownerName: (profiles.data || []).find(p => p.id === id)?.full_name || (id === user.id ? 'Ben' : 'Ekip üyesi'),
      isOwn: id === user.id, colorIndex: index, available: !!account?.email_confirmed_at && !account?.banned_until && !!email && email === address && mailbox?.status === 'Connected',
      mailboxAddress: email === address ? address : '' };
  }));
}

export function selectCalendarOwners(owners, requested = 'self') {
  if (typeof requested !== 'string') throw calendarError('Geçersiz takvim seçimi.');
  if (requested === 'all') return owners;
  const selected = owners.find(owner => requested === 'self' ? owner.isOwn : owner.userId === requested);
  if (!selected) throw calendarError('Bu takvimi görüntüleme yetkiniz yok.', 403);
  return [selected];
}

export function assertCalendarWriteOwner(context, body) {
  if (body?.ownerId && body.ownerId !== context.user?.id) throw calendarError('Başka bir kullanıcının takvimi değiştirilemez.', 403);
}
