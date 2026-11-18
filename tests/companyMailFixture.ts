export const mailOwner = '11111111-1111-4111-8111-111111111111';
export function companyMailFixture() {
  let clock = 0;
  const version = () => new Date(Date.now() + ++clock).toISOString();
  const tables: Record<string, any[]> = {
    companies: [{ id: 'company-1', organization_id: 'org-1' }, { id: 'foreign-company', organization_id: 'org-2' }],
    contacts: [{ company_id: 'company-1', organization_id: 'org-1', data: { email: ' Client@Customer.test ' } }, { company_id: 'company-1', organization_id: 'org-1', data: { email: 'second@customer.test' } }],
    user_mailbox_connections: [{ user_id: mailOwner, default_mailbox: true, status: 'Connected', mailbox_address: 'owner@example.test' }],
    company_email_messages: [], company_email_sync_state: [],
  };
  const fixture: any = { tables, failArchive: false, conflictState: false, calls: [] };
  fixture.context = { organizationId: 'org-1', user: { id: mailOwner, email: 'owner@example.test', email_confirmed_at: '2026-01-01' }, adminClient: {
    from(table) {
      let operation = '', payload: any, opts: any = {}, fields = '*', returning = false, single = false, window: number[] | null = null;
      const filters: ((row: any) => boolean)[] = [], orders: { key: string; ascending: boolean }[] = [];
      const execute = () => {
        if (fixture.failArchive && table === 'company_email_messages' && operation === 'upsert') return { error: { message: 'Simulated write failure' }, data: null };
        let rows = tables[table].filter(r => filters.every(f => f(r)));
        if (operation === 'update') {
          if (fixture.conflictState && table === 'company_email_sync_state') rows = [];
          rows.forEach(r => Object.assign(r, structuredClone(payload)));
        } else if (operation === 'upsert') {
          rows = [];
          for (const row of Array.isArray(payload) ? payload : [payload]) {
            const keys = opts.onConflict.split(','); const existing = tables[table].find(r => keys.every(k => r[k] === row[k]));
            if (existing && opts.ignoreDuplicates) continue;
            if (existing) { Object.assign(existing, row); rows.push(existing); } else {
              const value = { id: crypto.randomUUID(), next_link: null, scanned_count: 0, completed_at: null, capped: false, updated_at: version(), ...structuredClone(row) };
              tables[table].push(value); rows.push(value);
            }
          }
        }
        if (operation === 'select') { rows = [...rows]; for (const o of [...orders].reverse()) rows.sort((a, b) => String(a[o.key]).localeCompare(String(b[o.key])) * (o.ascending ? 1 : -1)); if (window) rows = rows.slice(window[0], window[1] + 1); }
        const projected = rows.map(r => fields === '*' ? structuredClone(r) : Object.fromEntries(fields.split(',').map(k => [k, r[k]])));
        return { error: null, data: operation !== 'select' && !returning ? null : single ? projected[0] || null : projected };
      };
      const query: any = {
        select(value = '*') { fields = value; returning = true; return query; },
        eq(key, value) { filters.push(r => r[key] === value); return query; }, in(key, values) { filters.push(r => values.includes(r[key])); return query; },
        order(key, options) { orders.push({ key, ascending: options.ascending }); return query; }, range(start, end) { window = [start, end]; return query; },
        maybeSingle() { single = true; return Promise.resolve(execute()); }, then(resolve) { return Promise.resolve(execute()).then(resolve); },
      };
      // Like Supabase, filters are unavailable until select/update/upsert.
      return { select(value = '*') { operation = 'select'; fields = value; return query; }, update(value) { operation = 'update'; payload = value; return query; }, upsert(value, options) { operation = 'upsert'; payload = value; opts = options; return query; } };
    },
  } };
  return fixture;
}
