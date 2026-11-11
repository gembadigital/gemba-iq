import React, { useEffect, useState } from "react";
import { CrmDb } from "../lib/CrmDb";

export default function CrmSaveStatus() {
  const [status, setStatus] = useState(CrmDb.getSyncStatus);
  useEffect(() => {
    const update = () => setStatus(CrmDb.getSyncStatus());
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const current = CrmDb.getSyncStatus();
      if (current.pending || current.error) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("crm-save-status", update);
    window.addEventListener("beforeunload", beforeUnload);
    update();
    return () => { window.removeEventListener("crm-save-status", update); window.removeEventListener("beforeunload", beforeUnload); };
  }, []);
  if (status.error) return <div role="alert" className="fixed bottom-4 left-4 right-4 z-[250] flex flex-wrap items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-lg">
    <div className="min-w-0 flex-1"><strong>Değişiklikler sunucuya kaydedilemedi.</strong><p>{status.error} Bu sayfayı kapatmadan önce kaydı yeniden deneyin.</p></div>
    <button type="button" disabled={status.pending > 0} className="rounded-lg border border-red-300 bg-white px-3 py-2 font-semibold disabled:opacity-50" onClick={() => { void CrmDb.retryFailedWrites().catch(() => undefined); }}>Kaydı yeniden dene</button>
  </div>;
  if (!status.pending) return null;
  return <div role="status" className="fixed bottom-4 right-4 z-[250] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-lg">Değişiklikler kaydediliyor…</div>;
}
