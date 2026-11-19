export const ownerId = '11111111-1111-4111-8111-111111111111';
export const peerId = '22222222-2222-4222-8222-222222222222';
export const outsiderId = '33333333-3333-4333-8333-333333333333';

export function calendarDirectoryFixture() {
  const users = [
    { id: ownerId, email: 'owner@example.test', email_confirmed_at: '2026-01-01' },
    { id: peerId, email: 'peer@example.test', email_confirmed_at: '2026-01-01' },
    { id: outsiderId, email: 'third@example.test', email_confirmed_at: '2026-01-01' },
  ];
  const tables: Record<string, any[]> = {
    organization_members: users.map(u => ({ user_id: u.id, organization_id: 'org-1' })),
    organization_settings: [{ organization_id: 'org-1', microsoft_graph_application: { calendar_sharing: { enabled: true, mode: 'titles_times', user_ids: [ownerId, peerId] } } }],
    profiles: [{ id: ownerId, full_name: 'Örnek Kullanıcı' }, { id: peerId, full_name: 'Örnek Ekip Arkadaşı' }, { id: outsiderId, full_name: 'Üçüncü Üye' }],
    user_mailbox_connections: users.map(u => ({ user_id: u.id, mailbox_address: u.email, default_mailbox: true, status: 'Connected' })),
  };
  const adminClient: any = {
    from(table: string) {
      const filters: ((row: any) => boolean)[] = [];
      const data = () => tables[table].filter(row => filters.every(f => f(row)));
      const query: any = { select: () => query, eq: (field, value) => { filters.push(row => row[field] === value); return query; }, in: (field, values) => { filters.push(row => values.includes(row[field])); return query; }, order: () => query, limit: () => query,
        maybeSingle: async () => ({ data: data()[0] || null, error: null }), then: resolve => Promise.resolve({ data: data(), error: null }).then(resolve) };
      return query;
    },
    auth: { admin: { getUserById: async id => ({ data: { user: users.find(u => u.id === id) }, error: null }) } },
  };
  return { users, tables, context: { organizationId: 'org-1', user: users[0], adminClient, mailbox: { mailbox_address: users[0].email } } };
}
