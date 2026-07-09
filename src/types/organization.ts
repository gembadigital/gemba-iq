export type OrganizationRole = "owner" | "member";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  language: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  job_title: string | null;
  phone: string | null;
  country: string | null;
  language: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
}

/** Base shape for all future tenant-scoped records */
export interface TenantScoped {
  organization_id: string;
}

export interface WelcomeWizardData {
  fullName: string;
  companyName: string;
  jobTitle: string;
  phone: string;
  country: string;
  language: "TR" | "EN";
}
