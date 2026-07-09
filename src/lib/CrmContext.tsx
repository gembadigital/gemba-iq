import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

  const loadCrm = useCallback(async () => {
    const seq = ++loadSeq.current;

    if (!organizationId) {
      CrmDb.resetCache();
      setError(null);
      setReady(true);
      return;
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
      CrmDb.resetCache();
      setError(err instanceof Error ? err.message : "Failed to load CRM data.");
      // Proceed with an empty in-memory cache so the app is never blocked.
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

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error("useCrm must be used within a CrmProvider");
  }
  return context;
}
