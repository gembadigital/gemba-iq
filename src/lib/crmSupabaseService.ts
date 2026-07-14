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
