import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";
import type { Organization, OrganizationMember, Profile, WelcomeWizardData } from "../types/organization";
import {
  completeWelcomeWizard,
  fetchOrganizationBootstrap,
  needsOnboarding as checkNeedsOnboarding,
} from "./organizationService";
import { setActiveOrganizationContext } from "./tenantStorage";

interface OrganizationContextValue {
  profile: Profile | null;
  organization: Organization | null;
  membership: OrganizationMember | null;
  organizationId: string | null;
  loading: boolean;
  needsOnboarding: boolean;
  error: string | null;
  completeOnboarding: (data: WelcomeWizardData) => Promise<{ error: string | null }>;
  refreshOrganization: () => Promise<void>;
  actorName: string;
  actorEmail: string;
  companyName: string;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

function syncLegacyOrgSettings(
  organization: Organization,
  profile: Profile | null,
  actorEmail: string
) {
  try {
    const existing = localStorage.getItem("admin_org_settings");
    const parsed = existing ? JSON.parse(existing) : {};
    const merged = {
      ...parsed,
      name: organization.name,
      phone: organization.phone || parsed.phone || "",
      defaultLanguage: organization.language || parsed.defaultLanguage || "TR",
      defaultCurrency: parsed.defaultCurrency || "EUR (€)",
    };
    localStorage.setItem("admin_org_settings", JSON.stringify(merged));
    setActiveOrganizationContext(
      organization.id,
      profile?.full_name?.trim() || organization.name,
      actorEmail
    );
    if (profile?.language) {
      localStorage.setItem("system_language", profile.language);
    }
  } catch {
    // ignore localStorage sync errors
  }
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { setLang } = useLanguage();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganization = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setOrganization(null);
      setMembership(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bootstrap = await fetchOrganizationBootstrap(user.id);
      setProfile(bootstrap.profile);
      setOrganization(bootstrap.organization);
      setMembership(bootstrap.membership);

      if (bootstrap.organization) {
        syncLegacyOrgSettings(bootstrap.organization, bootstrap.profile, user.email ?? "");
        if (bootstrap.profile?.language === "TR" || bootstrap.profile?.language === "EN") {
          setLang(bootstrap.profile.language);
        } else if (bootstrap.organization.language === "TR" || bootstrap.organization.language === "EN") {
          setLang(bootstrap.organization.language);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load organization.";
      setError(message);
      setProfile(null);
      setOrganization(null);
      setMembership(null);
    } finally {
      setLoading(false);
    }
  }, [user, setLang]);

  useEffect(() => {
    if (authLoading) return;
    void loadOrganization();
  }, [authLoading, loadOrganization]);

  const completeOnboarding = useCallback(
    async (data: WelcomeWizardData) => {
      setError(null);
      try {
        await completeWelcomeWizard(data);
        await loadOrganization();
        return { error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to complete onboarding.";
        setError(message);
        return { error: message };
      }
    },
    [loadOrganization]
  );

  const value = useMemo<OrganizationContextValue>(() => {
    const actorName =
      profile?.full_name?.trim() ||
      (user?.user_metadata?.full_name as string | undefined)?.trim() ||
      user?.email?.split("@")[0] ||
      "User";

    const actorEmail = user?.email ?? "";
    const companyName = organization?.name ?? "Organization";
    const needsOnboarding = !!user && !loading && checkNeedsOnboarding({ profile, organization, membership });

    return {
      profile,
      organization,
      membership,
      organizationId: organization?.id ?? null,
      loading: authLoading || loading,
      needsOnboarding,
      error,
      completeOnboarding,
      refreshOrganization: loadOrganization,
      actorName,
      actorEmail,
      companyName,
    };
  }, [
    profile,
    organization,
    membership,
    user,
    authLoading,
    loading,
    error,
    completeOnboarding,
    loadOrganization,
  ]);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}

export { getActiveOrganizationId } from "./tenantStorage";
