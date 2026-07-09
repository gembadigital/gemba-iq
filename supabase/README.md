# Supabase organization setup

Apply the multi-tenant foundation before first login with onboarding.

## Apply migration

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard) for your project.
2. Paste and run the contents of `migrations/001_organizations.sql`.

This creates:

- `organizations` — tenant workspace (company name, country, language, phone)
- `profiles` — user profile linked to `auth.users`
- `organization_members` — membership with `owner` role for the founding user
- `create_organization_with_owner` RPC used by the Welcome Wizard
- Row Level Security policies scoped to the user's organization

## First-time user flow

1. User registers and verifies email.
2. On first login, `OrganizationContext` finds no profile/membership.
3. `WelcomeWizard` collects full name, company, job title, phone, country, language.
4. Completing the wizard calls `create_organization_with_owner`, which creates the organization, profile, and owner membership.

## Existing users

Users who already have a profile and organization membership skip the wizard and load their organization automatically.

## Future modules

When adding Supabase tables for Companies, Deals, Contacts, Projects, Documents, or Campaigns, include `organization_id` and apply the RLS template at the bottom of `001_organizations.sql`.
