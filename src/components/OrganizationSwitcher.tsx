import React, { useState } from 'react';
import { useOrganization } from '../lib/OrganizationContext';
import { setActiveOrganizationContext } from '../lib/tenantStorage';
import { CrmDb } from '../lib/CrmDb';

export default function OrganizationSwitcher() {
  const { workspaces = [], isSuperadmin, organizationId, actorName, actorEmail, companyName } = useOrganization();
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function switchWorkspace() {
    if (!isSuperadmin || !workspaces.some(w => w.organization.id === target)) return;
    setBusy(true); setError('');
    try {
      // Never reset the cache while a previous workspace still has unsaved writes.
      await CrmDb.flushPendingWrites();
      setActiveOrganizationContext(target, actorName, actorEmail);
      // A full reload disposes forms, timers, component state and all caches together.
      window.location.reload();
    } catch {
      setError('Kaydedilemeyen değişiklikler var. Mevcut organizasyonda kayıt hatasını giderip tekrar deneyin.');
      setBusy(false);
    }
  }
  return <div className="px-3 pb-3 min-w-0" data-organization-switcher>
    <div className="text-xs truncate" title={companyName}>{companyName}</div>
    {isSuperadmin && workspaces.length > 1 && <>
      <label className="block mt-2 text-xs" htmlFor="workspace-select">Superadmin · Organizasyon</label>
      <select id="workspace-select" className="mt-1 w-full min-w-0 rounded-md border p-2 text-sm bg-transparent" value={target || organizationId || ''} disabled={busy} onChange={e => { setTarget(e.target.value); setError(''); }}>
        {workspaces.map(w => <option key={w.organization.id} value={w.organization.id}>{w.organization.name}</option>)}
      </select>
      {target && target !== organizationId && <div role="alert" className="mt-2 text-xs">
        <p>Açık formda henüz kaydetmediğiniz değişiklikleri önce kaydedin. Organizasyon değiştiğinde ekran yeniden açılacak.</p>
        <div className="flex gap-2 mt-2"><button type="button" disabled={busy} className="border rounded p-2" onClick={() => void switchWorkspace()}>{busy ? 'Kayıtlar bekleniyor…' : 'Organizasyona geç'}</button><button type="button" disabled={busy} onClick={() => setTarget('')}>Vazgeç</button></div>
      </div>}
      {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
    </>}
  </div>;
}
