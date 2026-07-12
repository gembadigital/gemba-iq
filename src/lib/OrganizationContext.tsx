import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";
import type { Organization, OrganizationMember, OrganizationRole, Profile, WelcomeWizardData } from "../types/organization";
import {
  completeWelcomeWizard,
  fetchOrganizationBootstrap,
  needsOnboarding as checkNeedsOnboarding,
} from "./organizationService";
import {
  acceptOrganizationInvitation,
  recordProfileLogin,
} from "./invitationService";
import {
  canInviteUsers,
  clearPendingInvitationToken,
  getPendingInvitationToken,
} from "./invitationConstants";
import { setActiveOrganizationContext } from "./tenantStorage";
import { getAppRole, isAdminRole, type AppRole } from "./roleHelpers";

interface OrganizationContextValue {
  profile: Profile | null;
  organization: Organization | null;
  membership: OrganizationMember | null;
  organizationId: string | null;
  memberRole: OrganizationRole | null;
  appRole: AppRole;
  isAdmin: boolean;
  canInviteUsers: boolean;
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

const ORG_BOOTSTRAP_TIMEOUT_MS = 10_000;

function getUserInvitationToken(user: { user_metadata?: Record<string, unknown> } | null): string | null {
  const token = user?.user_metadata?.invitation_token;
  return typeof token === "string" && token.trim() ? token.trim() : null;
}

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadSeq = useRef(0);

  const loadOrganization = useCallback(async () => {
    const seq = ++loadSeq.current;

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
      let bootstrap = await withTimeout(
        fetchOrganizationBootstrap(user.id),
        ORG_BOOTSTRAP_TIMEOUT_MS,
        "Organization profile load timed out."
      );
      if (seq !== loadSeq.current) return;

      const pendingToken = getPendingInvitationToken() || getUserInvitationToken(user);

      if (!bootstrap.membership && pendingToken) {
        try {
          await acceptOrganizationInvitation(pendingToken, {
            fullName: (user.user_metadata?.full_name as string | undefined) || undefined,
          });
          clearPendingInvitationToken();
          bootstrap = await withTimeout(
            fetchOrganizationBootstrap(user.id),
            ORG_BOOTSTRAP_TIMEOUT_MS,
            "Organization profile load timed out."
          );
          if (seq !== loadSeq.current) return;
        } catch {
          // Join page will surface invitation errors if auto-accept fails.
        }
      } else if (bootstrap.membership && pendingToken) {
        clearPendingInvitationToken();
      }

      setProfile(bootstrap.profile);
      setOrganization(bootstrap.organization);
      setMembership(bootstrap.membership);

      if (bootstrap.membership) {
        void recordProfileLogin();
      }

      if (bootstrap.organization) {
        syncLegacyOrgSettings(bootstrap.organization, bootstrap.profile, user.email ?? "");
        const nextLang =
          bootstrap.profile?.language === "TR" || bootstrap.profile?.language === "EN"
            ? bootstrap.profile.language
            : bootstrap.organization.language === "TR" || bootstrap.organization.language === "EN"
              ? bootstrap.organization.language
              : null;
        if (nextLang) {
          setLang(nextLang);
        }
      }
    } catch (err) {
      if (seq !== loadSeq.current) return;
      const message = err instanceof Error ? err.message : "Failed to load organization.";
      setError(message);
      setProfile(null);
      setOrganization(null);
      setMembership(null);
    } finally {
      if (seq === loadSeq.current) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void loadOrganization();
  }, [authLoading, loadOrganization]);

  const completeOnboarding = useCallback(
    async (data: WelcomeWizardData) => {
      setError(null);
      try {
        const pendingToken = getPendingInvitationToken() || getUserInvitationToken(user);
        if (pendingToken) {
          await acceptOrganizationInvitation(pendingToken, {
            fullName: data.fullName,
            jobTitle: data.jobTitle,
            phone: data.phone,
            country: data.country,
            language: data.language,
          });
          clearPendingInvitationToken();
        } else {
          await completeWelcomeWizard(data);
        }
        await loadOrganization();
        return { error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to complete onboarding.";
        setError(message);
        return { error: message };
      }
    },
    [loadOrganization, user]
  );

  const value = useMemo<OrganizationContextValue>(() => {
    const actorName =
      profile?.full_name?.trim() ||
      (user?.user_metadata?.full_name as string | undefined)?.trim() ||
      user?.email?.split("@")[0] ||
      "User";

    const actorEmail = user?.email ?? "";
    const companyName = organization?.name ?? "Organization";
    const memberRole = membership?.role ?? null;
    const appRole = getAppRole(memberRole);
    const isAdmin = isAdminRole(memberRole);
    const organizationId = organization?.id ?? null;
    const needsOnboarding = !!user && !loading && checkNeedsOnboarding({ profile, organization, membership });

    return {
      profile,
      organization,
      membership,
      organizationId,
      memberRole,
      appRole,
      isAdmin,
      canInviteUsers: canInviteUsers(memberRole),
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
