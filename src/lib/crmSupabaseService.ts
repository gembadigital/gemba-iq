import { getSupabase } from "./supabaseClient";
import { getActiveOrganizationId } from "./tenantStorage";
import type { Company } from "../components/CompaniesView";
import type { Deal, ProjectRecord } from "../components/DealManagementView";
import type { Task, TaskColumn, TaskNotification, NotificationSettings } from "../components/TasksView";
import type { Proposal } from "../types/proposal";
import type { Contact, CrmActivity, CrmDocument, CrmEmail } from "./CrmDb";

export const AUXILIARY_COMPANY_ID = "__org_auxiliary__";

export interface OrgAuxiliaryData {
  emails: CrmEmail[];
  activities: CrmActivity[];
  projects: ProjectRecord[];
  crmDocuments: CrmDocument[];
  taskColumns: TaskColumn[];
  crmUsers: string[];
  notificationSettings: NotificationSettings | null;
  taskNotifications: TaskNotification[];
  pipelineStages: string[] | null;
  stageMetadata: Record<string, unknown> | null;
  leadSources: string[] | null;
  companyCustomFieldDefs: unknown[] | null;
  kvStore: Record<string, unknown>;
}

export interface CrmSnapshot {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  proposals: Proposal[];
  tasks: Task[];
  auxiliary: OrgAuxiliaryData;
}

type Row = {
  id: string;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  data: Record<string, unknown>;
  company_id?: string | null;
  deal_id?: string | null;
  contact_id?: string | null;
};

async function requireClient() {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured.");
  return client;
}

async function requireOrgId(): Promise<string> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error("No active organization found.");
  return orgId;
}

async function requireUserId(): Promise<string> {
  const client = await requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return user.id;
}

function emptyAuxiliary(): OrgAuxiliaryData {
  return {
    emails: [],
    activities: [],
    projects: [],
    crmDocuments: [],
    taskColumns: [],
    crmUsers: [],
    notificationSettings: null,
    taskNotifications: [],
    pipelineStages: null,
    stageMetadata: null,
    leadSources: null,
    companyCustomFieldDefs: null,
    kvStore: {},
  };
}

function rowToCompany(row: Row): Company {
  const data = row.data as unknown as Company;
  return { ...data, id: row.id, organization_id: row.organization_id };
}

function rowToContact(row: Row): Contact {
  const data = row.data as unknown as Contact;
  return {
    ...data,
    id: row.id,
    organization_id: row.organization_id,
    companyId: row.company_id || data.companyId,
  };
}

function rowToDeal(row: Row): Deal {
  const data = row.data as unknown as Deal;
  return {
    ...data,
    id: row.id,
    organization_id: row.organization_id,
    companyId: row.company_id || data.companyId,
  };
}

function rowToProposal(row: Row): Proposal {
  const data = row.data as unknown as Proposal;
  return {
    ...data,
    id: row.id,
    organization_id: row.organization_id,
    companyId: row.company_id || data.companyId,
    dealId: row.deal_id || data.dealId,
    contactId: row.contact_id || data.contactId,
  };
}

function rowToTask(row: Row): Task {
  const data = row.data as unknown as Task;
  return { ...data, id: row.id };
}

export async function loadOrganizationCrm(organizationId?: string): Promise<CrmSnapshot> {
  const client = await requireClient();
  const orgId = organizationId || getActiveOrganizationId();
  if (!orgId) {
    throw new Error("No active organization found.");
  }

  const [companiesRes, contactsRes, dealsRes, proposalsRes, tasksRes] = await Promise.all([
    client.from("companies").select("*").eq("organization_id", orgId),
    client.from("contacts").select("*").eq("organization_id", orgId),
    client.from("deals").select("*").eq("organization_id", orgId),
    client.from("proposals").select("*").eq("organization_id", orgId),
    client.from("tasks").select("*").eq("organization_id", orgId),
  ]);

  for (const res of [companiesRes, contactsRes, dealsRes, proposalsRes, tasksRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const companyRows = (companiesRes.data as Row[]) || [];
  const auxiliaryRow = companyRows.find((row) => row.id === AUXILIARY_COMPANY_ID);
  const companies = companyRows
    .filter((row) => row.id !== AUXILIARY_COMPANY_ID)
    .map(rowToCompany);

  const auxiliary: OrgAuxiliaryData = auxiliaryRow
    ? { ...emptyAuxiliary(), ...(auxiliaryRow.data as Partial<OrgAuxiliaryData>) }
    : emptyAuxiliary();

  return {
    companies,
    contacts: ((contactsRes.data as Row[]) || []).map(rowToContact),
    deals: ((dealsRes.data as Row[]) || []).map(rowToDeal),
    proposals: ((proposalsRes.data as Row[]) || []).map(rowToProposal),
    tasks: ((tasksRes.data as Row[]) || [])
      .filter((row) => !row.id.startsWith("__"))
      .map(rowToTask),
    auxiliary,
  };
}

export interface CrmDelta {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  proposals: Proposal[];
  tasks: Task[];
  // null = the auxiliary row's updated_at did not move since `since` — caller
  // should leave its cached auxiliary data as-is.
  auxiliary: OrgAuxiliaryData | null;
  // Full current id set per table, used only to detect rows deleted since
  // `since` (a delta query can never see a row that no longer exists).
  currentIds: {
    companies: Set<string>;
    contacts: Set<string>;
    deals: Set<string>;
    proposals: Set<string>;
    tasks: Set<string>;
  };
  syncedAt: string;
}

// Egress fix (Supabase Free plan quota exceeded — 12 GB/month against a 5 GB
// quota, 12-day cycle to re-exhaust it): loadOrganizationCrm() above re-pulls
// every row's full `data` jsonb payload on every call, and was being called
// unconditionally every 3 minutes per open tab (see App.tsx runScan). This
// delta variant pulls only rows whose `updated_at` moved since the caller's
// last successful sync (all 5 CRM tables already carry `updated_at` with an
// auto-update trigger — supabase/migrations/004_crm.sql — so no schema change
// is needed for this). The first load per organization still goes through
// loadOrganizationCrm() in full; this is only for the periodic re-sync.
//
// Deletions: a delta query is structurally blind to rows that no longer
// exist, so they'd never get removed from the client cache on their own. A
// tombstone/soft-delete column would need a migration AND rewiring every
// existing hard-delete call site (persistCompanies/Contacts/Deals/Proposals'
// deleteMissingIds below) to stop hard-deleting — a much bigger, riskier
// change for what is otherwise a quick egress fix. Instead this runs five
// id-only reads (`select("id")`, no `data` column) alongside the delta query
// and hands back the full current id set per table; the caller diffs that
// against its cache to drop anything missing. An id-only read is negligible
// next to a `data`-payload read — `data` jsonb bodies are what make these
// rows large; `id` is a short text/uuid column — so this adds only a few KB
// per sync even on a large table, nowhere near enough to matter against the
// GB-scale problem this delta mechanism is already fixing.
export async function loadOrganizationCrmDelta(sinceIso: string, organizationId?: string): Promise<CrmDelta> {
  const client = await requireClient();
  const orgId = organizationId || getActiveOrganizationId();
  if (!orgId) {
    throw new Error("No active organization found.");
  }

  // Captured before issuing any query below: conservative on purpose. A write
  // that lands in the gap between this timestamp and the queries resolving
  // just gets re-fetched by the *next* delta cycle (since its updated_at will
  // still be > this syncedAt once that cycle's `since` is this value) —
  // better to occasionally re-fetch one row than to risk ever missing one.
  const syncedAt = new Date().toISOString();

  const [
    companiesRes, contactsRes, dealsRes, proposalsRes, tasksRes,
    companyIdsRes, contactIdsRes, dealIdsRes, proposalIdsRes, taskIdsRes,
  ] = await Promise.all([
    client.from("companies").select("*").eq("organization_id", orgId).gt("updated_at", sinceIso),
    client.from("contacts").select("*").eq("organization_id", orgId).gt("updated_at", sinceIso),
    client.from("deals").select("*").eq("organization_id", orgId).gt("updated_at", sinceIso),
    client.from("proposals").select("*").eq("organization_id", orgId).gt("updated_at", sinceIso),
    client.from("tasks").select("*").eq("organization_id", orgId).gt("updated_at", sinceIso),
    client.from("companies").select("id").eq("organization_id", orgId),
    client.from("contacts").select("id").eq("organization_id", orgId),
    client.from("deals").select("id").eq("organization_id", orgId),
    client.from("proposals").select("id").eq("organization_id", orgId),
    client.from("tasks").select("id").eq("organization_id", orgId),
  ]);

  for (const res of [
    companiesRes, contactsRes, dealsRes, proposalsRes, tasksRes,
    companyIdsRes, contactIdsRes, dealIdsRes, proposalIdsRes, taskIdsRes,
  ]) {
    if (res.error) throw new Error(res.error.message);
  }

  const companyRows = (companiesRes.data as Row[]) || [];
  const auxiliaryRow = companyRows.find((row) => row.id === AUXILIARY_COMPANY_ID);
  const companies = companyRows.filter((row) => row.id !== AUXILIARY_COMPANY_ID).map(rowToCompany);
  const auxiliary: OrgAuxiliaryData | null = auxiliaryRow
    ? { ...emptyAuxiliary(), ...(auxiliaryRow.data as Partial<OrgAuxiliaryData>) }
    : null;

  const idSet = (res: typeof companyIdsRes) => new Set(((res.data as { id: string }[]) || []).map((r) => r.id));

  return {
    companies,
    contacts: ((contactsRes.data as Row[]) || []).map(rowToContact),
    deals: ((dealsRes.data as Row[]) || []).map(rowToDeal),
    proposals: ((proposalsRes.data as Row[]) || []).map(rowToProposal),
    tasks: ((tasksRes.data as Row[]) || [])
      .filter((row) => !row.id.startsWith("__"))
      .map(rowToTask),
    auxiliary,
    currentIds: {
      companies: idSet(companyIdsRes),
      contacts: idSet(contactIdsRes),
      deals: idSet(dealIdsRes),
      proposals: idSet(proposalIdsRes),
      tasks: idSet(taskIdsRes),
    },
    syncedAt,
  };
}

async function upsertRows(
  table: "companies" | "contacts" | "deals" | "proposals" | "tasks",
  rows: Record<string, unknown>[]
) {
  if (rows.length === 0) return;
  const client = await requireClient();
  const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

async function deleteMissingIds(
  table: "companies" | "contacts" | "deals" | "proposals" | "tasks",
  keepIds: string[],
  extraKeepIds: string[] = []
) {
  const client = await requireClient();
  const organizationId = await requireOrgId();
  const { data, error } = await client
    .from(table)
    .select("id")
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);

  const keep = new Set([...keepIds, ...extraKeepIds]);
  const toDelete = ((data as { id: string }[]) || [])
    .map((row) => row.id)
    .filter((id) => !keep.has(id));

  if (toDelete.length === 0) return;
  const { error: deleteError } = await client.from(table).delete().in("id", toDelete);
  if (deleteError) throw new Error(deleteError.message);
}

export async function persistCompanies(companies: Company[]) {
  const organizationId = await requireOrgId();
  const createdBy = await requireUserId();
  const rows = companies.map((company) => ({
    id: company.id,
    organization_id: organizationId,
    created_by: createdBy,
    data: company,
  }));
  await upsertRows("companies", rows);
  await deleteMissingIds("companies", companies.map((c) => c.id), [AUXILIARY_COMPANY_ID]);
}

export async function persistContacts(contacts: Contact[]) {
  const organizationId = await requireOrgId();
  const createdBy = await requireUserId();
  const rows = contacts.map((contact) => ({
    id: contact.id,
    organization_id: organizationId,
    company_id: contact.companyId,
    created_by: createdBy,
    data: contact,
  }));
  await upsertRows("contacts", rows);
  await deleteMissingIds("contacts", contacts.map((c) => c.id));
}

export async function persistDeals(deals: Deal[]) {
  const organizationId = await requireOrgId();
  const createdBy = await requireUserId();
  const rows = deals.map((deal) => ({
    id: deal.id,
    organization_id: organizationId,
    company_id: deal.companyId || null,
    created_by: createdBy,
    data: deal,
  }));
  await upsertRows("deals", rows);
  await deleteMissingIds("deals", deals.map((d) => d.id));
}

export async function persistProposals(proposals: Proposal[]) {
  const organizationId = await requireOrgId();
  const createdBy = await requireUserId();
  const rows = proposals.map((proposal) => ({
    id: proposal.id,
    organization_id: organizationId,
    company_id: proposal.companyId,
    deal_id: proposal.dealId || null,
    contact_id: proposal.contactId || null,
    created_by: createdBy,
    data: proposal,
  }));
  await upsertRows("proposals", rows);
  await deleteMissingIds("proposals", proposals.map((p) => p.id));
}

export async function persistTasks(tasks: Task[]) {
  const organizationId = await requireOrgId();
  const createdBy = await requireUserId();
  const rows = tasks.map((task) => ({
    id: task.id,
    organization_id: organizationId,
    company_id: (task as Task & { companyId?: string }).companyId || null,
    deal_id: (task as Task & { dealId?: string }).dealId || null,
    created_by: createdBy,
    data: task,
  }));
  await upsertRows("tasks", rows);
  await deleteMissingIds("tasks", tasks.map((t) => t.id));
}

export async function persistAuxiliary(auxiliary: OrgAuxiliaryData) {
  const organizationId = await requireOrgId();
  const createdBy = await requireUserId();
  await upsertRows("companies", [
    {
      id: AUXILIARY_COMPANY_ID,
      organization_id: organizationId,
      created_by: createdBy,
      data: auxiliary,
    },
  ]);
}
