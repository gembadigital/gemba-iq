import { getSupabase } from "./supabaseClient";
import { getActiveOrganizationId } from "./tenantStorage";
import type { Company } from "../components/CompaniesView";
import type { Deal, ProjectRecord } from "../components/DealManagementView";
import type { Task, TaskColumn, TaskNotification, NotificationSettings } from "../components/TasksView";
import type { Proposal } from "../types/proposal";
import type { Contact, CrmActivity, CrmDocument, CrmEmail } from "./CrmDb";
import {
  diffAgainstBaseline,
  findConflicts,
  isSuspiciousBulkDelete,
  mergeKvStore,
  pickAuxField,
  stableStringify,
  type RowBaseline,
} from "./syncMerge";

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

type CrmTable = "companies" | "contacts" | "deals" | "proposals" | "tasks";

// Veri kaybı koruması (bkz. syncMerge.ts): her tablo için bu istemcinin
// "bildiği" sunucu durumu — yüklenirken/yazılırken güncellenir. Yazma yalnızca
// bu durumdan FARKLI satırlara yapılır; silme yalnızca bu durumda bilinen
// satırlar için yapılır. Böylece eski/eksik bir cache başkasının kayıtlarını
// ne ezebilir ne silebilir.
const rowBaselines: Record<CrmTable, RowBaseline> = {
  companies: new Map(),
  contacts: new Map(),
  deals: new Map(),
  proposals: new Map(),
  tasks: new Map(),
};

interface AuxBaseline {
  kv: Record<string, unknown>; // istemcinin yüklediği kv anahtarlarının derin kopyası
  fieldSigs: Record<string, string>; // kv dışı üst düzey alanların imzası
}
let auxBaseline: AuxBaseline = { kv: {}, fieldSigs: {} };

function deepClone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function buildBaseline<T extends { id: string }>(rows: Row[], map: (row: Row) => T): RowBaseline {
  const baseline: RowBaseline = new Map();
  for (const row of rows) {
    baseline.set(row.id, { sig: stableStringify(map(row)), updatedAt: row.updated_at || null });
  }
  return baseline;
}

function mergeIntoBaseline<T extends { id: string }>(
  table: CrmTable,
  changedRows: Row[],
  map: (row: Row) => T,
  currentIds: Set<string>
) {
  const baseline = rowBaselines[table];
  for (const row of changedRows) {
    baseline.set(row.id, { sig: stableStringify(map(row)), updatedAt: row.updated_at || null });
  }
  for (const id of Array.from(baseline.keys())) {
    if (!currentIds.has(id)) baseline.delete(id);
  }
}

function setAuxBaselineFrom(auxiliary: OrgAuxiliaryData) {
  const fieldSigs: Record<string, string> = {};
  for (const [field, value] of Object.entries(auxiliary)) {
    if (field === "kvStore") continue;
    fieldSigs[field] = stableStringify(value);
  }
  auxBaseline = { kv: deepClone(auxiliary.kvStore || {}), fieldSigs };
}

/** CrmDb, birleştirilmiş kv değerini cache'e uyguladıktan sonra baseline'ı günceller. */
export function setAuxKvBaseline(key: string, value: unknown) {
  auxBaseline.kv[key] = deepClone(value);
}

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

  const contactRows = (contactsRes.data as Row[]) || [];
  const dealRows = (dealsRes.data as Row[]) || [];
  const proposalRows = (proposalsRes.data as Row[]) || [];
  const taskRows = ((tasksRes.data as Row[]) || []).filter((row) => !row.id.startsWith("__"));

  rowBaselines.companies = buildBaseline(companyRows.filter((row) => row.id !== AUXILIARY_COMPANY_ID), rowToCompany);
  rowBaselines.contacts = buildBaseline(contactRows, rowToContact);
  rowBaselines.deals = buildBaseline(dealRows, rowToDeal);
  rowBaselines.proposals = buildBaseline(proposalRows, rowToProposal);
  rowBaselines.tasks = buildBaseline(taskRows, rowToTask);
  setAuxBaselineFrom(auxiliary);

  return {
    companies,
    contacts: contactRows.map(rowToContact),
    deals: dealRows.map(rowToDeal),
    proposals: proposalRows.map(rowToProposal),
    tasks: taskRows.map(rowToTask),
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

  // İstemci saati ile Supabase sunucu saati arasındaki fark yüzünden bir satırın
  // updated_at değeri `since`'ten önce görünüp hiç çekilmeyebiliyordu (cache
  // sonsuza dek eski kalır, sonraki kayıt onu ezerdi). 2 dk geri çekerek
  // örtüşen pencere kullanıyoruz; fazladan birkaç satır çekmek ucuzdur.
  const sinceWithOverlap = new Date(new Date(sinceIso).getTime() - 2 * 60 * 1000).toISOString();

  const [
    companiesRes, contactsRes, dealsRes, proposalsRes, tasksRes,
    companyIdsRes, contactIdsRes, dealIdsRes, proposalIdsRes, taskIdsRes,
  ] = await Promise.all([
    client.from("companies").select("*").eq("organization_id", orgId).gt("updated_at", sinceWithOverlap),
    client.from("contacts").select("*").eq("organization_id", orgId).gt("updated_at", sinceWithOverlap),
    client.from("deals").select("*").eq("organization_id", orgId).gt("updated_at", sinceWithOverlap),
    client.from("proposals").select("*").eq("organization_id", orgId).gt("updated_at", sinceWithOverlap),
    client.from("tasks").select("*").eq("organization_id", orgId).gt("updated_at", sinceWithOverlap),
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

  const contactRows = (contactsRes.data as Row[]) || [];
  const dealRows = (dealsRes.data as Row[]) || [];
  const proposalRows = (proposalsRes.data as Row[]) || [];
  const taskRows = ((tasksRes.data as Row[]) || []).filter((row) => !row.id.startsWith("__"));

  mergeIntoBaseline("companies", companyRows.filter((row) => row.id !== AUXILIARY_COMPANY_ID), rowToCompany, idSet(companyIdsRes));
  mergeIntoBaseline("contacts", contactRows, rowToContact, idSet(contactIdsRes));
  mergeIntoBaseline("deals", dealRows, rowToDeal, idSet(dealIdsRes));
  mergeIntoBaseline("proposals", proposalRows, rowToProposal, idSet(proposalIdsRes));
  mergeIntoBaseline("tasks", taskRows, rowToTask, idSet(taskIdsRes));
  if (auxiliary) setAuxBaselineFrom(auxiliary);

  return {
    companies,
    contacts: contactRows.map(rowToContact),
    deals: dealRows.map(rowToDeal),
    proposals: proposalRows.map(rowToProposal),
    tasks: taskRows.map(rowToTask),
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

export interface PersistResult {
  /** Başka biri tarafından değiştirildiği için YAZILMAYAN satırlar (sunucu sürümü kazanır). */
  conflictIds: string[];
  /** Toplu silme koruması yüzünden engellenen silme sayısı. */
  blockedDeletes: number;
}

// Aynı tablo için kayıtlar sıraya alınır: ikinci çağrı, birincinin güncellediği
// baseline'ı görmeden çalışırsa kendi yazdığımız satırlar sahte "çakışma" olur.
const writeQueues = new Map<string, Promise<unknown>>();
function enqueueWrite<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(key) || Promise.resolve();
  const next = previous.catch(() => undefined).then(fn);
  writeQueues.set(key, next);
  return next;
}

const UPSERT_CHUNK = 100;

async function persistTable<T extends { id: string }>(
  table: CrmTable,
  items: T[],
  toRow: (item: T, organizationId: string, createdBy: string) => Record<string, unknown>
): Promise<PersistResult> {
  return enqueueWrite(table, async () => {
    const organizationId = await requireOrgId();
    const createdBy = await requireUserId();
    const client = await requireClient();
    const baseline = rowBaselines[table];
    const result: PersistResult = { conflictIds: [], blockedDeletes: 0 };

    const { changed, removedIds } = diffAgainstBaseline(items, baseline);

    if (changed.length > 0) {
      // Başkası (başka sekme/kullanıcı/OpenClaw API) bu satırları yüklediğimizden
      // beri değiştirdiyse sunucu sürümünü EZME — sonraki senkron onu getirir.
      const knownIds = changed.filter((c) => baseline.has(c.id)).map((c) => c.id);
      const serverRows: { id: string; updated_at: string }[] = [];
      for (let i = 0; i < knownIds.length; i += UPSERT_CHUNK) {
        const { data, error } = await client
          .from(table)
          .select("id, updated_at")
          .eq("organization_id", organizationId)
          .in("id", knownIds.slice(i, i + UPSERT_CHUNK));
        if (error) throw new Error(error.message);
        serverRows.push(...((data as { id: string; updated_at: string }[]) || []));
      }
      const conflicts = new Set(findConflicts(changed, baseline, serverRows));
      result.conflictIds = Array.from(conflicts);
      const toWrite = changed.filter((c) => !conflicts.has(c.id));

      for (let i = 0; i < toWrite.length; i += UPSERT_CHUNK) {
        const chunk = toWrite.slice(i, i + UPSERT_CHUNK);
        const rows = chunk.map((item) => toRow(item, organizationId, createdBy));
        const { data, error } = await client.from(table).upsert(rows, { onConflict: "id" }).select("id, updated_at");
        if (error) throw new Error(error.message);
        const updatedById = new Map(((data as { id: string; updated_at: string }[]) || []).map((r) => [r.id, r.updated_at]));
        for (const item of chunk) {
          baseline.set(item.id, { sig: stableStringify(item), updatedAt: updatedById.get(item.id) || null });
        }
      }
    }

    if (removedIds.length > 0) {
      if (isSuspiciousBulkDelete(removedIds.length, baseline.size)) {
        // Boş/yarım yüklenmiş bir cache tabloyu silmesin. Cache'i sunucudan
        // yeniden yüklemesi için çağırana haber verilir.
        console.error(
          `CRM: ${table} için ${removedIds.length}/${baseline.size} satırlık toplu silme engellendi (veri kaybı koruması).`
        );
        result.blockedDeletes = removedIds.length;
      } else {
        const { error } = await client
          .from(table)
          .delete()
          .eq("organization_id", organizationId)
          .in("id", removedIds);
        if (error) throw new Error(error.message);
        for (const id of removedIds) baseline.delete(id);
      }
    }

    return result;
  });
}

export async function persistCompanies(companies: Company[]) {
  return persistTable("companies", companies, (company, organizationId, createdBy) => ({
    id: company.id,
    organization_id: organizationId,
    created_by: createdBy,
    data: company,
  }));
}

export async function persistContacts(contacts: Contact[]) {
  return persistTable("contacts", contacts, (contact, organizationId, createdBy) => ({
    id: contact.id,
    organization_id: organizationId,
    company_id: contact.companyId,
    created_by: createdBy,
    data: contact,
  }));
}

export async function persistDeals(deals: Deal[]) {
  return persistTable("deals", deals, (deal, organizationId, createdBy) => ({
    id: deal.id,
    organization_id: organizationId,
    company_id: deal.companyId || null,
    created_by: createdBy,
    data: deal,
  }));
}

export async function persistProposals(proposals: Proposal[]) {
  return persistTable("proposals", proposals, (proposal, organizationId, createdBy) => ({
    id: proposal.id,
    organization_id: organizationId,
    company_id: proposal.companyId,
    deal_id: proposal.dealId || null,
    contact_id: proposal.contactId || null,
    created_by: createdBy,
    data: proposal,
  }));
}

export async function persistTasks(tasks: Task[]) {
  return persistTable("tasks", tasks, (task, organizationId, createdBy) => ({
    id: task.id,
    organization_id: organizationId,
    company_id: (task as Task & { companyId?: string }).companyId || null,
    deal_id: (task as Task & { dealId?: string }).dealId || null,
    created_by: createdBy,
    data: task,
  }));
}

export interface AuxPersistResult {
  /** Yazılan (birleştirilmiş) kv değerleri — yalnızca dirty anahtarlar. */
  mergedKv: Record<string, unknown>;
  /** Çağrı anında gönderilen kv değerlerinin imzası (cache hâlâ aynı mı diye). */
  sentSigs: Record<string, string>;
  /** Gönderilen değer = kopyası (birleşme sonucu cache'e uygulanmazsa baseline için). */
  sentKv: Record<string, unknown>;
  skipped: boolean;
}

const AUX_FIELDS: (keyof OrgAuxiliaryData)[] = [
  "emails",
  "activities",
  "projects",
  "crmDocuments",
  "taskColumns",
  "crmUsers",
  "notificationSettings",
  "taskNotifications",
  "pipelineStages",
  "stageMetadata",
  "leadSources",
  "companyCustomFieldDefs",
];

// __org_auxiliary__ satırı tek JSON blob'u. Yazma:
//  1) sunucudaki GÜNCEL blob okunur (updated_at ile birlikte),
//  2) kv'de yalnızca bu oturumda değişen (dirty) anahtarlar uygulanır; id'li
//     diziler (hedef hesaplar, aday profilleri ...) üç yönlü birleştirilir,
//  3) kv dışı alanlar istemci DEĞİŞTİRMEDİYSE sunucudaki değer korunur,
//  4) yazma updated_at karşılaştırmalı (compare-and-swap); araya başkası
//     girerse blob yeniden okunup birleştirme tekrarlanır.
export async function persistAuxiliary(auxiliary: OrgAuxiliaryData, dirtyKvKeys: string[] = []): Promise<AuxPersistResult> {
  // Çağrı anının anlık görüntüsü: await'ler sırasında cache değişebilir.
  const mineKv: Record<string, unknown> = {};
  const sentSigs: Record<string, string> = {};
  for (const key of dirtyKvKeys) {
    if (key in auxiliary.kvStore) {
      mineKv[key] = deepClone(auxiliary.kvStore[key]);
      sentSigs[key] = stableStringify(auxiliary.kvStore[key]);
    }
  }
  const mineFields: Record<string, unknown> = {};
  for (const field of AUX_FIELDS) mineFields[field] = deepClone(auxiliary[field]);

  return enqueueWrite("auxiliary", async () => {
    const organizationId = await requireOrgId();
    const createdBy = await requireUserId();
    const client = await requireClient();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data: existing, error } = await client
        .from("companies")
        .select("data, updated_at")
        .eq("id", AUXILIARY_COMPANY_ID)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error) throw new Error(error.message);

      const serverData = ((existing as { data?: Partial<OrgAuxiliaryData> } | null)?.data) || {};
      const { merged, changedByMerge } = mergeKvStore(
        (serverData.kvStore as Record<string, unknown>) || {},
        mineKv,
        auxBaseline.kv,
        Object.keys(mineKv)
      );
      void changedByMerge;

      const nextData: Record<string, unknown> = { ...serverData };
      for (const field of AUX_FIELDS) {
        nextData[field] = pickAuxField(
          field,
          mineFields[field],
          auxBaseline.fieldSigs,
          (serverData as Record<string, unknown>)[field],
          field in serverData
        );
      }
      nextData.kvStore = merged;

      const mergedKv: Record<string, unknown> = {};
      for (const key of Object.keys(mineKv)) mergedKv[key] = merged[key];
      const buildResult = (skipped: boolean): AuxPersistResult => ({ mergedKv, sentSigs, sentKv: mineKv, skipped });

      if (existing && stableStringify(nextData) === stableStringify(serverData)) {
        // Sunucudaki blob zaten istenen halde: gereksiz yazma yok.
        return buildResult(true);
      }

      if (!existing) {
        const { error: insertError } = await client.from("companies").upsert(
          [{ id: AUXILIARY_COMPANY_ID, organization_id: organizationId, created_by: createdBy, data: nextData }],
          { onConflict: "id" }
        );
        if (insertError) throw new Error(insertError.message);
      } else {
        // Son denemede updated_at kilidi bırakılır: blob az önce taze okunup
        // birleştirildi, kalan yarış penceresi milisaniyeler; ama olası bir
        // zaman damgası biçim uyuşmazlığı kv kayıtlarını tamamen durdurmamalı.
        const useCas = attempt < 3;
        let updateQuery = client
          .from("companies")
          .update({ data: nextData })
          .eq("id", AUXILIARY_COMPANY_ID)
          .eq("organization_id", organizationId);
        if (useCas) updateQuery = updateQuery.eq("updated_at", (existing as { updated_at: string }).updated_at);
        const { data: updated, error: updateError } = await updateQuery.select("id");
        if (updateError) throw new Error(updateError.message);
        if (!updated || updated.length === 0) continue; // araya başkası girdi: yeniden oku + birleştir
      }

      // İstemcinin değiştirdiği kv dışı alanlar artık sunucuyla aynı.
      for (const field of AUX_FIELDS) {
        if (stableStringify(nextData[field]) === stableStringify(mineFields[field])) {
          auxBaseline.fieldSigs[field] = stableStringify(mineFields[field]);
        }
      }
      return buildResult(false);
    }
    throw new Error("CRM auxiliary kaydı sürekli çakıştı; yazma vazgeçildi (veri korundu).");
  });
}
