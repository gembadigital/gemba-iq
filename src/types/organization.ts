import type {
  InvitationStatus,
  OrganizationRole,
} from "../lib/invitationConstants";

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
  last_login_at?: string | null;
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

export interface Invitation {
  id: string;
  organization_id: string;
  invited_email: string;
  role: OrganizationRole;
  invited_by: string;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

export interface InvitationPreview {
  id: string;
  invited_email: string;
  role: OrganizationRole;
  status: InvitationStatus;
  expires_at: string;
  organization_name: string;
  is_expired: boolean;
}

export interface OrganizationDirectoryMember {
  membership_id: string;
  user_id: string;
  role: OrganizationRole;
  joined_at: string;
  full_name: string | null;
  job_title: string | null;
  email: string;
  last_login: string | null;
  status: "active";
}

export interface OrganizationDirectoryInvitation {
  id: string;
  invited_email: string;
  role: OrganizationRole;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
  invited_by: string;
  invited_by_name: string | null;
}

export interface OrganizationDirectory {
  members: OrganizationDirectoryMember[];
  invitations: OrganizationDirectoryInvitation[];
}

export interface CreatedInvitationResult {
  id: string;
  token: string;
  invited_email: string;
  role: OrganizationRole;
  status: InvitationStatus;
  expires_at: string;
  organization_id: string;
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

export interface AcceptInvitationData {
  fullName?: string;
  jobTitle?: string;
  phone?: string;
  country?: string;
  language?: "TR" | "EN";
}
