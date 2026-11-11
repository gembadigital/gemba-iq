import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import CrmSaveStatus from "../components/CrmSaveStatus";
import AuthLoadingScreen from "../components/auth/AuthLoadingScreen";
import { CrmDb } from "./CrmDb";
import { useOrganization } from "./OrganizationContext";

const CRM_LOAD_TIMEOUT_MS = 12_000;

interface CrmContextValue {
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CrmContext = createContext<CrmContextValue | undefined>(undefined);

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const { organizationId, loading: orgLoading } = useOrganization();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadSeq = useRef(0);
  const cacheOrganization = useRef<string | null>(null);

  const loadCrm = useCallback(async () => {
    const seq = ++loadSeq.current;

    if (!organizationId) {
      CrmDb.resetCache();
      setError(null);
      setReady(true);
      return;
    }

    if (cacheOrganization.current !== organizationId) {
      CrmDb.resetCache();
      cacheOrganization.current = organizationId;
    }
    setReady(false);
    setError(null);

    try {
      await withTimeout(
        CrmDb.hydrateFromSupabase(organizationId),
        CRM_LOAD_TIMEOUT_MS,
        "CRM data load timed out."
      );
      if (seq !== loadSeq.current) return;
      setReady(true);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      console.error("CRM hydration failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load CRM data.");
      setReady(true);
    }
  }, [organizationId]);

  useEffect(() => {
    if (orgLoading) return;
    void loadCrm();
  }, [orgLoading, loadCrm]);

  const value = useMemo(
    () => ({
      ready,
      error,
      refresh: loadCrm,
    }),
    [ready, error, loadCrm]
  );

  if (orgLoading || !ready) {
    return <AuthLoadingScreen />;
  }

  if (error && !CrmDb.isLoaded()) return <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
    <h1 className="text-lg font-bold">CRM verileri yüklenemedi</h1>
    <p>{error}</p><p>Mevcut kayıtları korumak için veriler yüklenene kadar düzenleme kapalı.</p>
    <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-white" onClick={() => { void loadCrm(); }}>Yeniden dene</button>
  </div>;
  return <CrmContext.Provider value={value}><CrmSaveStatus />{children}</CrmContext.Provider>;
}

export function useCrm() {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error("useCrm must be used within a CrmProvider");
  }
  return context;
}
