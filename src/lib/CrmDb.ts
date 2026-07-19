import { Company } from "../components/CompaniesView";
import { Deal, ProjectRecord } from "../components/DealManagementView";
import type { Task, TaskColumn, TaskNotification, NotificationSettings } from "../components/TasksView";
import { Proposal } from "../types/proposal";
import type { LeadProfile } from "../types";
import { getTenantActorName, getActiveOrganizationId } from "./tenantStorage";
import {
  type CrmSnapshot,
  type OrgAuxiliaryData,
  loadOrganizationCrm,
  persistAuxiliary,
  persistCompanies,
  persistContacts,
  persistDeals,
  persistProposals,
  persistTasks,
} from "./crmSupabaseService";

export interface Contact {
  id: string;
  organization_id?: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  leadStatus: string;
  leadSegment: string;
  isSelected?: boolean;
}

export interface CrmEmail {
  id: string;
  organization_id?: string;
  companyId: string;
  dealId?: string;
  proposalId?: string;
  projectId?: string;
  sender: string;
  recipient: string;
  date: string;
  subject: string;
  body: string;
  attachments?: string[];
  isIncoming?: boolean;
}

export interface CrmDocument {
  id: string;
  organization_id?: string;
  companyId: string;
  dealId?: string;
  proposalId?: string;
  projectId?: string;
  name: string;
  type: string;
  size: string;
  date: string;
  link?: string;
  content?: string;
}

export interface CrmActivity {
  id: string;
  organization_id?: string;
  companyId: string;
  dealId?: string;
  proposalId?: string;
  projectId?: string;
  type: "meeting" | "call" | "email" | "task" | "note" | "system";
  title: string;
  description: string;
  date: string;
  user: string;
  result?: string;
}

type CrmCache = {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  proposals: Proposal[];
  projects: ProjectRecord[];
  emails: CrmEmail[];
  activities: CrmActivity[];
  documents: CrmDocument[];
  tasks: Task[];
  auxiliary: OrgAuxiliaryData;
  loaded: boolean;
};

const cache: CrmCache = {
  companies: [],
  contacts: [],
  deals: [],
  proposals: [],
  projects: [],
  emails: [],
  activities: [],
  documents: [],
  tasks: [],
  auxiliary: {
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
  },
  loaded: false,
};

function persistSoon(fn: () => Promise<void>) {
  void fn().catch((err) => console.error("CRM persist failed:", err));
}

// Aday Profilleri (Lead Profiles) sayfasının kullandığı tek merkezi
// kişi/rehber listesi. Şirket kartı (sorumlu/personel), Hedef Müşteri,
// Fırsat ve Süreç Yönetimi, Teklif Yönetimi/Oluştur gibi uygulamanın her
// köşesinde bir isim+email girildiğinde CrmDb.upsertLeadProfile() ile
// buraya da otomatik kaydediliyor — kullanıcı bunu "kişi listemiz" olarak
// yönetmek istedi.
const LEAD_PROFILES_KEY = "crm_lead_profiles";

function syncAuxiliaryFromCache() {
  cache.auxiliary.emails = cache.emails;
  cache.auxiliary.activities = cache.activities;
  cache.auxiliary.projects = cache.projects;
  cache.auxiliary.crmDocuments = cache.documents;
}

function applySnapshot(snapshot: CrmSnapshot) {
  cache.companies = snapshot.companies.map((c) => ({ ...c, customFields: c.customFields || {} }));
  cache.contacts = snapshot.contacts;
  cache.deals = snapshot.deals;
  cache.proposals = snapshot.proposals;
  cache.tasks = snapshot.tasks;
  cache.auxiliary = snapshot.auxiliary;
  cache.emails = snapshot.auxiliary.emails || [];
  cache.activities = snapshot.auxiliary.activities || [];
  cache.projects = snapshot.auxiliary.projects || [];
  cache.documents = snapshot.auxiliary.crmDocuments || [];
  cache.loaded = true;
}

function joinDealsWithCompanies(deals: Deal[]): Deal[] {
  const companies = cache.companies;
  return deals.map((deal) => {
    const next = { ...deal };
    let companyId = next.companyId;
    if (!companyId && next.companyName) {
      const comp = companies.find(
        (c) => c.name.toLowerCase().trim() === next.companyName.toLowerCase().trim()
      );
      if (comp) companyId = comp.id;
    }
    if (companyId) {
      const comp = companies.find((c) => c.id === companyId);
      if (comp) {
        next.companyId = companyId;
        next.companyName = comp.name;
        next.industry = comp.industry;
      }
    }
    return next;
  });
}

function joinProposalsWithCompanies(proposals: Proposal[]): Proposal[] {
  const companies = cache.companies;
  return proposals.map((proposal) => {
    const next = { ...proposal };
    if (next.companyId) {
      const comp = companies.find((c) => c.id === next.companyId);
      if (comp) next.companyName = comp.name;
    }
    return next;
  });
}

export const CrmDb = {
  isLoaded(): boolean {
    return cache.loaded;
  },

  async hydrateFromSupabase(organizationId?: string): Promise<void> {
    const snapshot = await loadOrganizationCrm(organizationId);
    applySnapshot(snapshot);
  },

  resetCache(): void {
    cache.loaded = false;
    cache.companies = [];
    cache.contacts = [];
    cache.deals = [];
    cache.proposals = [];
    cache.projects = [];
    cache.emails = [];
    cache.activities = [];
    cache.documents = [];
    cache.tasks = [];
  },

  getKv<T>(key: string, fallback: T): T {
    const value = cache.auxiliary.kvStore[key];
    return (value as T) ?? fallback;
  },

  setKv(key: string, value: unknown): void {
    cache.auxiliary.kvStore[key] = value;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getTaskColumns(): TaskColumn[] {
    return cache.auxiliary.taskColumns || [];
  },

  saveTaskColumns(columns: TaskColumn[]): void {
    cache.auxiliary.taskColumns = columns;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getCrmUsers(): string[] {
    return cache.auxiliary.crmUsers || [];
  },

  saveCrmUsers(users: string[]): void {
    cache.auxiliary.crmUsers = users;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getNotificationSettings(): NotificationSettings | null {
    return cache.auxiliary.notificationSettings;
  },

  saveNotificationSettings(settings: NotificationSettings): void {
    cache.auxiliary.notificationSettings = settings;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getTaskNotifications(): TaskNotification[] {
    return cache.auxiliary.taskNotifications || [];
  },

  saveTaskNotifications(notifications: TaskNotification[]): void {
    cache.auxiliary.taskNotifications = notifications;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getPipelineStages(): string[] | null {
    return cache.auxiliary.pipelineStages;
  },

  savePipelineStages(stages: string[]): void {
    cache.auxiliary.pipelineStages = stages;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getStageMetadata(): Record<string, unknown> | null {
    return cache.auxiliary.stageMetadata;
  },

  saveStageMetadata(metadata: Record<string, unknown>): void {
    cache.auxiliary.stageMetadata = metadata;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getLeadSources(): string[] | null {
    return cache.auxiliary.leadSources;
  },

  saveLeadSources(sources: string[]): void {
    cache.auxiliary.leadSources = sources;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getCompanyCustomFieldDefs(): unknown[] {
    return cache.auxiliary.companyCustomFieldDefs || [];
  },

  saveCompanyCustomFieldDefs(defs: unknown[]): void {
    cache.auxiliary.companyCustomFieldDefs = defs;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getCompanies(): Company[] {
    return cache.companies.map((c) => ({ ...c, customFields: c.customFields || {} }));
  },

  saveCompanies(companies: Company[]) {
    cache.companies = companies.map((c) => ({ ...c, customFields: c.customFields || {} }));
    this.propagateCompanyChanges(cache.companies);
    persistSoon(() => persistCompanies(cache.companies));
  },

  getCompanyById(companyId: string): Company | undefined {
    return this.getCompanies().find((c) => c.id === companyId);
  },

  createCompany(companyData: Partial<Company>): Company {
    const companies = this.getCompanies();
    const existing = companies.find(
      (c) => c.name && c.name.toLowerCase().trim() === (companyData.name || "").toLowerCase().trim()
    );
    if (existing) return existing;

    const newCompany: Company = {
      id: companyData.id || `company-${Date.now()}`,
      accountOwner: companyData.accountOwner || getTenantActorName(),
      name: companyData.name || "Yeni Şirket",
      phone: companyData.phone || "",
      website: companyData.website || "",
      customerStatus: companyData.customerStatus || "Lead",
      description: companyData.description || "",
      billingAddress: companyData.billingAddress || "",
      billingCity: companyData.billingCity || "",
      billingDistrict: companyData.billingDistrict || "",
      billingCountry: companyData.billingCountry || "Türkiye",
      billingPostalCode: companyData.billingPostalCode || "",
      taxOffice: companyData.taxOffice || "",
      taxNo: companyData.taxNo || "",
      industry: companyData.industry || "General Manufacturing",
      employeeCount: companyData.employeeCount || 0,
      subIndustry: companyData.subIndustry || "",
      shift: companyData.shift || "1 Shift",
      managementTeam: companyData.managementTeam || "",
      annualRevenue: companyData.annualRevenue || "0",
      annualRevenueCurrency: companyData.annualRevenueCurrency || "₺",
      productionType: companyData.productionType || "",
      squareMeter: companyData.squareMeter || "",
      digitalInfrastructure: companyData.digitalInfrastructure || "",
      customFields: companyData.customFields || {},
    };

    companies.push(newCompany);
    this.saveCompanies(companies);

    if (companyData.managementTeam) {
      const parts = companyData.managementTeam.split(",");
      parts.forEach((p) => {
        const namePart = p.split("(")[0].trim();
        if (namePart) {
          const nameWords = namePart.split(" ");
          const firstName = nameWords[0] || "Yetkili";
          const lastName = nameWords.slice(1).join(" ") || "";
          this.createContact({
            companyId: newCompany.id,
            firstName,
            lastName,
            email: `${firstName.toLowerCase()}@${newCompany.website || "company.com"}`,
            phone: newCompany.phone,
            department: "Management",
            leadStatus: "Active",
          });
        }
      });
    }

    return newCompany;
  },

  getContacts(): Contact[] {
    return [...cache.contacts];
  },

  saveContacts(contacts: Contact[]) {
    cache.contacts = contacts;
    persistSoon(() => persistContacts(cache.contacts));
  },

  getContactsByCompany(companyId: string): Contact[] {
    return this.getContacts().filter((c) => c.companyId === companyId);
  },

  createContact(contactData: Partial<Contact>): Contact {
    const contacts = this.getContacts();
    const newContact: Contact = {
      id: contactData.id || `contact-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId: contactData.companyId || "",
      firstName: contactData.firstName || "Yeni",
      lastName: contactData.lastName || "Kişi",
      email: contactData.email || "",
      phone: contactData.phone || "",
      department: contactData.department || "Operations",
      leadStatus: contactData.leadStatus || "New",
      leadSegment: contactData.leadSegment || "Standard",
    };
    contacts.push(newContact);
    this.saveContacts(contacts);
    return newContact;
  },

  // Uygulamanın herhangi bir yerinde (şirket kartı sorumlu/personel,
  // Hedef Müşteri, Fırsat/Teklif kişi alanları) bir isim+email girildiğinde
  // çağrılır; e-posta zaten Aday Profilleri'nde varsa kaydı ezmeden eksik
  // alanları (şirket/departman/adres/sektör) tamamlar, yoksa yeni bir
  // kayıt olarak ekler. Geçersiz/boş e-posta veya isimsiz girişlerde
  // sessizce hiçbir şey yapmaz (null döner).
  upsertLeadProfile(input: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email: string | undefined;
    company?: string;
    department?: string;
    industry?: string;
    address?: string;
  }): LeadProfile | null {
    const email = (input.email || "").trim();
    if (!email || !email.includes("@")) return null;

    let firstName = (input.firstName || "").trim();
    let lastName = (input.lastName || "").trim();
    if (!firstName && !lastName && input.fullName) {
      const words = input.fullName.trim().split(/\s+/).filter(Boolean);
      firstName = words[0] || "";
      lastName = words.slice(1).join(" ");
    }
    if (!firstName && !lastName) return null;

    const leads = CrmDb.getKv<LeadProfile[]>(LEAD_PROFILES_KEY, []);
    const idx = leads.findIndex((l) => (l.email || "").trim().toLowerCase() === email.toLowerCase());

    if (idx >= 0) {
      const existing = leads[idx];
      const merged: LeadProfile = {
        ...existing,
        firstName: existing.firstName || firstName,
        lastName: existing.lastName || lastName,
        company: existing.company || input.company || "",
        department: existing.department || input.department || "",
        industry: existing.industry || input.industry || "",
        address: existing.address || input.address || "",
      };
      leads[idx] = merged;
      CrmDb.setKv(LEAD_PROFILES_KEY, leads);
      return merged;
    }

    const newLead: LeadProfile = {
      id: `lead_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: getActiveOrganizationId() || undefined,
      no: leads.length + 1,
      firstName,
      lastName,
      email,
      company: input.company || "",
      department: input.department || "",
      address: input.address || "",
      industry: input.industry || "",
      leadDemand: "",
      leadStatus: "New",
      leadSegment: "Cold",
      customField1: "",
      customField2: "",
      deliveryStatus: "idle",
      openCount: 0,
    };
    leads.push(newLead);
    this.setKv(LEAD_PROFILES_KEY, leads);
    return newLead;
  },

  getDeals(): Deal[] {
    return joinDealsWithCompanies(cache.deals);
  },

  saveDeals(deals: Deal[]) {
    const companies = this.getCompanies();
    const processed = deals.map((deal) => {
      const next = { ...deal };
      let companyId = next.companyId;
      if (!companyId && next.companyName) {
        const comp = companies.find(
          (c) => (c.name ?? "").toLowerCase().trim() === (next.companyName ?? "").toLowerCase().trim()
        );
        companyId = comp ? comp.id : this.createCompany({ name: next.companyName }).id;
        next.companyId = companyId;
      }
      return next;
    });
    cache.deals = processed;
    persistSoon(() => persistDeals(cache.deals));
  },

  getDealsByCompany(companyId: string): Deal[] {
    return this.getDeals().filter((d) => d.companyId === companyId);
  },

  getProposals(): Proposal[] {
    return joinProposalsWithCompanies(cache.proposals);
  },

  saveProposals(proposals: Proposal[]) {
    cache.proposals = proposals;
    persistSoon(() => persistProposals(cache.proposals));
  },

  getProposalsByCompany(companyId: string): Proposal[] {
    return this.getProposals().filter((p) => p.companyId === companyId);
  },

  getProjects(): ProjectRecord[] {
    const companies = this.getCompanies();
    return cache.projects.map((project) => {
      const next = { ...project };
      if ((next as ProjectRecord & { companyId?: string }).companyId) {
        const comp = companies.find((c) => c.id === (next as ProjectRecord & { companyId?: string }).companyId);
        if (comp) next.companyName = comp.name;
      }
      return next;
    });
  },

  saveProjects(projects: ProjectRecord[]) {
    cache.projects = projects;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getProjectsByCompany(companyId: string): ProjectRecord[] {
    return this.getProjects().filter((p) => (p as ProjectRecord & { companyId?: string }).companyId === companyId);
  },

  getEmails(): CrmEmail[] {
    return [...cache.emails];
  },

  saveEmails(emails: CrmEmail[]) {
    cache.emails = emails;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getEmailsByCompany(companyId: string): CrmEmail[] {
    return this.getEmails().filter((e) => e.companyId === companyId);
  },

  getEmailsByDeal(dealId: string): CrmEmail[] {
    return this.getEmails().filter((e) => e.dealId === dealId);
  },

  getEmailsByProject(projectId: string): CrmEmail[] {
    return this.getEmails().filter((e) => e.projectId === projectId);
  },

  createEmail(emailData: Partial<CrmEmail>): CrmEmail {
    const emails = this.getEmails();
    const newEmail: CrmEmail = {
      id: emailData.id || `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId: emailData.companyId || "",
      dealId: emailData.dealId,
      proposalId: emailData.proposalId,
      projectId: emailData.projectId,
      sender: emailData.sender || "info@gembapartner.com",
      recipient: emailData.recipient || "",
      date: emailData.date || new Date().toISOString(),
      subject: emailData.subject || "No Subject",
      body: emailData.body || "",
      attachments: emailData.attachments,
      isIncoming: emailData.isIncoming || false,
    };
    emails.unshift(newEmail);
    this.saveEmails(emails);
    return newEmail;
  },

  getDocuments(): CrmDocument[] {
    return [...cache.documents];
  },

  saveDocuments(docs: CrmDocument[]) {
    cache.documents = docs;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getDocumentsByCompany(companyId: string): CrmDocument[] {
    return this.getDocuments().filter((d) => d.companyId === companyId);
  },

  createDocument(docData: Partial<CrmDocument>): CrmDocument {
    const docs = this.getDocuments();
    const newDoc: CrmDocument = {
      id: docData.id || `doc-${Date.now()}`,
      companyId: docData.companyId || "",
      dealId: docData.dealId,
      proposalId: docData.proposalId,
      projectId: docData.projectId,
      name: docData.name || "Unnamed Document",
      type: docData.type || "Attachment",
      size: docData.size || "100 KB",
      date: docData.date || new Date().toISOString().split("T")[0],
      link: docData.link,
      content: docData.content,
    };
    docs.unshift(newDoc);
    this.saveDocuments(docs);
    return newDoc;
  },

  getActivities(): CrmActivity[] {
    return [...cache.activities];
  },

  saveActivities(activities: CrmActivity[]) {
    cache.activities = activities;
    syncAuxiliaryFromCache();
    persistSoon(() => persistAuxiliary(cache.auxiliary));
  },

  getActivitiesByCompany(companyId: string): CrmActivity[] {
    return this.getActivities().filter((a) => a.companyId === companyId);
  },

  getActivitiesByDeal(dealId: string): CrmActivity[] {
    return this.getActivities().filter((a) => a.dealId === dealId);
  },

  createActivity(activityData: Partial<CrmActivity>): CrmActivity {
    const activities = this.getActivities();
    const newActivity: CrmActivity = {
      id: activityData.id || `act-${Date.now()}`,
      companyId: activityData.companyId || "",
      dealId: activityData.dealId,
      proposalId: activityData.proposalId,
      projectId: activityData.projectId,
      type: activityData.type || "system",
      title: activityData.title || "Activity logged",
      description: activityData.description || "",
      date: activityData.date || new Date().toISOString(),
      user: activityData.user || getTenantActorName(),
      result: activityData.result,
    };
    activities.unshift(newActivity);
    this.saveActivities(activities);
    return newActivity;
  },

  getTasks(): Task[] {
    return [...cache.tasks];
  },

  saveTasks(tasks: Task[]) {
    cache.tasks = tasks;
    persistSoon(() => persistTasks(cache.tasks));
  },

  createTask(taskData: Partial<Task>): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      id: taskData.id || `task-${Date.now()}`,
      title: taskData.title || "New Task",
      description: taskData.description || "",
      status: taskData.status || "not_started",
      assignee: taskData.assignee || getTenantActorName(),
      dueDate: taskData.dueDate || new Date().toISOString().split("T")[0],
      priority: taskData.priority || "Medium",
    };
    tasks.push(newTask);
    this.saveTasks(tasks);
    return newTask;
  },

  propagateCompanyChanges(companies: Company[]) {
    const deals = this.getDeals();
    let dealsUpdated = false;
    const nextDeals = deals.map((deal) => {
      if (deal.companyId) {
        const company = companies.find((c) => c.id === deal.companyId);
        if (company && (deal.companyName !== company.name || deal.industry !== company.industry)) {
          dealsUpdated = true;
          return { ...deal, companyName: company.name, industry: company.industry };
        }
      }
      return deal;
    });
    if (dealsUpdated) this.saveDeals(nextDeals);

    const proposals = this.getProposals();
    let proposalsUpdated = false;
    const nextProposals = proposals.map((proposal) => {
      if (proposal.companyId) {
        const company = companies.find((c) => c.id === proposal.companyId);
        if (company && proposal.companyName !== company.name) {
          proposalsUpdated = true;
          return { ...proposal, companyName: company.name };
        }
      }
      return proposal;
    });
    if (proposalsUpdated) this.saveProposals(nextProposals);

    const projects = this.getProjects();
    let projectsUpdated = false;
    const nextProjects = projects.map((project) => {
      const companyId = (project as ProjectRecord & { companyId?: string }).companyId;
      if (companyId) {
        const company = companies.find((c) => c.id === companyId);
        if (company && project.companyName !== company.name) {
          projectsUpdated = true;
          return { ...project, companyName: company.name };
        }
      }
      return project;
    });
    if (projectsUpdated) this.saveProjects(nextProjects);
  },

  autocompleteCompanies(query: string): Company[] {
    if (!query) return [];
    const companies = this.getCompanies();
    const cleanQuery = query.toLowerCase().trim();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(cleanQuery) ||
        (c.website && c.website.toLowerCase().includes(cleanQuery))
    );
  },
};

export async function hydrateCrmCache(): Promise<void> {
  await CrmDb.hydrateFromSupabase();
}
