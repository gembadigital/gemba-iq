# Supabase organization setup

Apply the multi-tenant foundation before first login with onboarding.

## Apply migrations

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard) for your project.
2. Run `migrations/001_organizations.sql`.
3. Run `migrations/002_invitations.sql`.
4. Run `migrations/003_documents.sql`.

This creates:

- `organizations`, `profiles`, `organization_members`
- `invitations` with owner/admin-managed invites
- `documents` table and `organization-documents` storage bucket
- RPCs for onboarding, inviting, accepting, and listing members
- Row Level Security scoped to each organization

## Environment variables

Client (Vercel + local `.env`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`

Server (Vercel + local `.env`) for Supabase Auth invitation emails:

- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL` (e.g. `https://your-app.vercel.app`)

Without the service role key, invitations are still created in the database and the admin UI shows a copyable `/join?token=...` link.

## First-time owner flow

1. User registers and verifies email.
2. On first login, `OrganizationContext` finds no profile/membership.
3. `WelcomeWizard` creates the organization, profile, and owner membership.

## Invitation flow

1. Owner or Admin opens **Administration → Users & Permissions**.
2. They invite a user by email and role.
3. The app creates an `invitations` row and sends a Supabase Auth invite email when configured.
4. The invitee opens `/join?token=...`, signs in or registers with the invited email.
5. `accept_organization_invitation` creates their profile and organization membership.
6. They skip organization creation and enter the app directly.

## Roles

- `owner`, `admin`, `manager`, `sales`, `consultant`, `viewer`
- Only `owner` and `admin` can send or cancel invitations.

## Future modules

When adding Supabase tables for Companies, Deals, Contacts, Projects, Documents, or Campaigns, include `organization_id` and apply the RLS template at the bottom of `001_organizations.sql`.
