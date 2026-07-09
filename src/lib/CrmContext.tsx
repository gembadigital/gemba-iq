import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AuthLoadingScreen from "../components/auth/AuthLoadingScreen";
import { CrmDb } from "./CrmDb";
import { useOrganization } from "./OrganizationContext";

interface CrmContextValue {
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CrmContext = createContext<CrmContextValue | undefined>(undefined);

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const { organizationId, loading: orgLoading } = useOrganization();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCrm = useCallback(async () => {
    if (!organizationId) {
      CrmDb.resetCache();
      setReady(false);
      return;
    }
    setError(null);
    try {
      await CrmDb.hydrateFromSupabase();
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load CRM data.");
      setReady(false);
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
