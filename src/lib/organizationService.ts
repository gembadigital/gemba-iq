import { getSupabase } from "./supabaseClient";
import { getActiveOrganizationId } from './tenantStorage';
import type { Organization, OrganizationMember, Profile, WelcomeWizardData } from "../types/organization";

export interface OrganizationBootstrap {
  profile: Profile | null;
  organization: Organization | null;
  membership: OrganizationMember | null;
  workspaces?: { organization: Organization; membership: OrganizationMember }[];
  isSuperadmin?: boolean;
  aiEnabled?: boolean;
}

export async function fetchOrganizationBootstrap(userId: string): Promise<OrganizationBootstrap> {
  const client = getSupabase();
  if (!client) {
    return { profile: null, organization: null, membership: null };
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: memberships, error: membershipError } = await client
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .order('created_at', { ascending: true });

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const { data: orgs, error: orgError } = memberships?.length
    ? await client.from('organizations').select('*').in('id', memberships.map(m => m.organization_id))
    : { data: [], error: null };
  if (orgError) throw new Error(orgError.message);
  const { data: isSuperadmin, error: accessError } = await client.rpc('is_platform_superadmin');
  if (accessError) throw new Error(accessError.message);
  if ((memberships?.length || 0) > 1 && !isSuperadmin) throw new Error('Birden fazla organizasyon üyeliği için superadmin yetkisi gerekir.');
  const membership = memberships?.find(m => m.organization_id === getActiveOrganizationId()) || memberships?.[0] || null;
  const organization = orgs?.find(o => o.id === membership?.organization_id) || null;

  const { data: rules, error: rulesError } = organization
    ? await client.from('organization_access_rules').select('ai_enabled').eq('organization_id', organization.id).maybeSingle()
    : { data: null, error: null };
  if (rulesError) throw new Error(rulesError.message);
  return {
    aiEnabled: rules?.ai_enabled === true,
    profile: (profile as Profile | null) ?? null,
    organization,
    membership: (membership as OrganizationMember | null) ?? null,
    workspaces: (memberships || []).flatMap(m => {
      const org = orgs?.find(o => o.id === m.organization_id);
      return org ? [{ organization: org as Organization, membership: m as OrganizationMember }] : [];
    }),
    isSuperadmin: isSuperadmin === true,
  };
}

export async function completeWelcomeWizard(data: WelcomeWizardData): Promise<string> {
  const client = getSupabase();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const { data: orgId, error } = await client.rpc("create_organization_with_admin", {
    p_full_name: data.fullName.trim(),
    p_company_name: data.companyName.trim(),
    p_job_title: data.jobTitle.trim(),
    p_phone: data.phone.trim(),
    p_country: data.country.trim(),
    p_language: data.language,
  });

  if (error) {
    throw new Error(error.message);
  }

  return orgId as string;
}

export function needsOnboarding(bootstrap: OrganizationBootstrap): boolean {
  return !bootstrap.profile || !bootstrap.organization || !bootstrap.membership;
}
