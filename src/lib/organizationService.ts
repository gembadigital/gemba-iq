import { getSupabase } from "./supabaseClient";
import type { Organization, OrganizationMember, Profile, WelcomeWizardData } from "../types/organization";

export interface OrganizationBootstrap {
  profile: Profile | null;
  organization: Organization | null;
  membership: OrganizationMember | null;
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

  const { data: membership, error: membershipError } = await client
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  let organization: Organization | null = null;
  if (membership?.organization_id) {
    const { data: org, error: orgError } = await client
      .from("organizations")
      .select("*")
      .eq("id", membership.organization_id)
      .maybeSingle();

    if (orgError) {
      throw new Error(orgError.message);
    }
    organization = org as Organization | null;
  }

  return {
    profile: (profile as Profile | null) ?? null,
    organization,
    membership: (membership as OrganizationMember | null) ?? null,
  };
}

export async function completeWelcomeWizard(data: WelcomeWizardData): Promise<string> {
  const client = getSupabase();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const { data: orgId, error } = await client.rpc("create_organization_with_owner", {
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
