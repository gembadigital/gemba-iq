import { getSupabase } from "./supabaseClient";
import { getActiveOrganizationId, getTenantActorName } from "./tenantStorage";
import { persistProposals } from "./crmSupabaseService";
import { CrmDb } from "./CrmDb";
import { applyPlaceholders, extractPlaceholdersFromTemplate } from "./proposalPlaceholderEngine";
import { generateProposalPdfBlob } from "./proposalPdf";
import { uploadBlobDocument } from "./enterpriseDocumentService";
import type {
  Proposal,
  ProposalApprovalStatus,
  ProposalAuditLog,
  ProposalTemplate,
  ProposalTimelineEvent,
  ProposalVersion,
} from "../types/proposal";

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

export function mapStatusToApproval(status: string): ProposalApprovalStatus {
  if (status === "Accepted") return "Approved";
  if (status === "Sent") return "Sent";
  if (status === "Rejected") return "Rejected";
  return "Draft";
}

export function mapApprovalToStatus(approval: ProposalApprovalStatus): Proposal["status"] {
  if (approval === "Approved") return "Accepted";
  if (approval === "Sent") return "Sent";
  if (approval === "Rejected") return "Rejected";
  return "Draft";
}

function enrichProposal(proposal: Proposal): Proposal {
  return {
    ...proposal,
    approvalStatus: proposal.approvalStatus || mapStatusToApproval(proposal.status),
    dealId: proposal.dealId,
    contactId: proposal.contactId,
    versions: proposal.versions || [],
    timelineEvents: proposal.timelineEvents || [],
    auditLog: proposal.auditLog || [],
  };
}

export async function generateNextProposalNumber(): Promise<{ sequenceNo: number; proposalNumber: string }> {
  const client = await requireClient();
  const organizationId = await requireOrgId();

  const { data: existing } = await client
    .from("proposal_number_sequences")
    .select("last_sequence")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const nextSeq = (existing?.last_sequence || 0) + 1;
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const proposalNumber = `${yy}${mm}-${nextSeq}`;

  await client.from("proposal_number_sequences").upsert({
    organization_id: organizationId,
    last_sequence: nextSeq,
  });

  return { sequenceNo: nextSeq, proposalNumber };
}

export async function logProposalAudit(
  proposalId: string,
  action: string,
  details: Record<string, unknown> = {}
): Promise<ProposalAuditLog> {
  const client = await requireClient();
  const organizationId = await requireOrgId();
  const userId = await requireUserId();
  const actorName = getTenantActorName();

  const entry: ProposalAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    proposalId,
    action,
    actorName,
    details,
    createdAt: new Date().toISOString(),
  };

  const { error } = await client.from("proposal_audit_logs").insert({
    id: entry.id,
    organization_id: organizationId,
    proposal_id: proposalId,
    created_by: userId,
    action,
    actor_name: actorName,
    details,
  });

  if (error) throw new Error(error.message);
  return entry;
}

export async function addProposalTimelineEvent(
  proposalId: string,
  eventType: string,
  title: string,
  description?: string,
  metadata: Record<string, unknown> = {}
): Promise<ProposalTimelineEvent> {
  const client = await requireClient();
  const organizationId = await requireOrgId();
  const userId = await requireUserId();

  const event: ProposalTimelineEvent = {
    id: `timeline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    proposalId,
    eventType,
    title,
    description,
    metadata,
    createdAt: new Date().toISOString(),
  };

  const { error } = await client.from("proposal_timeline_events").insert({
    id: event.id,
    organization_id: organizationId,
    proposal_id: proposalId,
    created_by: userId,
    event_type: eventType,
    title,
    description: description || null,
    metadata,
  });

  if (error) throw new Error(error.message);
  return event;
}

export async function fetchProposalTimeline(proposalId: string): Promise<ProposalTimelineEvent[]> {
  const client = await requireClient();
  const organizationId = await requireOrgId();

  const { data, error } = await client
    .from("proposal_timeline_events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data as Array<Record<string, unknown>>) || []).map((row) => ({
    id: row.id as string,
    proposalId: row.proposal_id as string,
    eventType: row.event_type as string,
    title: row.title as string,
    description: (row.description as string) || undefined,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
  }));
}

export async function fetchProposalAuditLog(proposalId: string): Promise<ProposalAuditLog[]> {
  const client = await requireClient();
  const organizationId = await requireOrgId();

  const { data, error } = await client
    .from("proposal_audit_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data as Array<Record<string, unknown>>) || []).map((row) => ({
    id: row.id as string,
    proposalId: row.proposal_id as string,
    action: row.action as string,
    actorName: (row.actor_name as string) || undefined,
    details: (row.details as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
  }));
}

export async function listProposalTemplates(): Promise<ProposalTemplate[]> {
  const client = await requireClient();
  const organizationId = await requireOrgId();

  const { data, error } = await client
    .from("proposal_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data as Array<Record<string, unknown>>) || []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    templateType: (row.template_type as "word" | "section") || "word",
    content: (row.content as string) || "",
    placeholders: (row.placeholders as string[]) || [],
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function saveProposalTemplate(
  template: Partial<ProposalTemplate> & { name: string; content: string }
): Promise<ProposalTemplate> {
  const client = await requireClient();
  const organizationId = await requireOrgId();
  const userId = await requireUserId();

  const id = template.id || `tpl-${Date.now()}`;
  const placeholders = extractPlaceholdersFromTemplate(template.content);

  const { data, error } = await client
    .from("proposal_templates")
    .upsert({
      id,
      organization_id: organizationId,
      created_by: userId,
      name: template.name,
      description: template.description || null,
      template_type: template.templateType || "word",
      content: template.content,
      placeholders,
      is_default: template.isDefault || false,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    templateType: (row.template_type as "word" | "section") || "word",
    content: (row.content as string) || "",
    placeholders: (row.placeholders as string[]) || [],
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function deleteProposalTemplate(templateId: string): Promise<void> {
  const client = await requireClient();
  const { error } = await client.from("proposal_templates").delete().eq("id", templateId);
  if (error) throw new Error(error.message);
}

export function renderProposalWordContent(proposal: Proposal, templateContent?: string): string {
  const company = CrmDb.getCompanyById(proposal.companyId);
  const contact = proposal.contactId
    ? CrmDb.getContacts().find((c) => c.id === proposal.contactId)
    : CrmDb.getContactsByCompany(proposal.companyId).find(
        (c) => `${c.firstName} ${c.lastName}`.trim() === proposal.contactPerson
      );
  const deal = proposal.dealId ? CrmDb.getDeals().find((d) => d.id === proposal.dealId) : undefined;

  const base = templateContent || buildDefaultWordTemplate(proposal);
  return applyPlaceholders(base, { proposal, company, contact, deal });
}

function buildDefaultWordTemplate(proposal: Proposal): string {
  return `
<h1>{{cover_page}}</h1>
<p><strong>Reference:</strong> {{proposal_number}} | <strong>Version:</strong> {{current_version}}</p>
<p><strong>Client:</strong> {{company_name}}</p>
<p><strong>Attention:</strong> {{contact_person}} ({{contact_email}})</p>
<p><strong>Deal:</strong> {{deal_name}}</p>
<p><strong>Date:</strong> {{proposal_date}}</p>
<h2>Executive Summary</h2>
<p>{{description}}</p>
<h2>Services</h2>
<p>{{services}}</p>
<h2>Methodology</h2>
<p>{{methodology}}</p>
<h2>Project Plan</h2>
<p>{{project_plan}}</p>
<h2>Timeline</h2>
<p>{{timeline}}</p>
<h2>Commercial Terms</h2>
<p>{{terms}}</p>
<h2>Grand Total</h2>
<p>{{grand_total}}</p>
`;
}

export async function persistProposalWithEnterpriseData(proposal: Proposal): Promise<Proposal> {
  const enriched = enrichProposal(proposal);
  const proposals = CrmDb.getProposals();
  const exists = proposals.find((p) => p.id === enriched.id);
  const next = exists
    ? proposals.map((p) => (p.id === enriched.id ? enriched : p))
    : [...proposals, enriched];
  CrmDb.saveProposals(next);
  await persistProposals(next);
  return enriched;
}

export async function createEnterpriseProposal(proposalData: Proposal): Promise<Proposal> {
  const numbering = await generateNextProposalNumber();
  const initialVersion: ProposalVersion = {
    version: "V1",
    date: new Date().toISOString(),
    reason: "Initial quotation",
    changes: "Created",
    owner: proposalData.owner,
    subject: proposalData.proposalSubject,
    currency: proposalData.currency,
    options: proposalData.options,
    services: proposalData.services,
    totalBudget: proposalData.totalBudget,
    taxes: proposalData.taxes,
    grandTotal: proposalData.grandTotal,
    coverPage: proposalData.coverPage,
    methodology: proposalData.methodology,
    projectPlan: proposalData.projectPlan,
    timeline: proposalData.timeline,
    terms: proposalData.terms,
    coverImage: proposalData.coverImage,
    pageImage: proposalData.pageImage,
  };

  const proposal: Proposal = enrichProposal({
    ...proposalData,
    id: proposalData.id || `prop-${Date.now()}`,
    sequenceNo: numbering.sequenceNo,
    proposalNumber: numbering.proposalNumber,
    currentVersion: "V1",
    versions: [initialVersion],
    status: "Draft",
    approvalStatus: "Draft",
    createdBy: getTenantActorName(),
    lastUpdate: new Date().toLocaleString(),
  });

  await persistProposalWithEnterpriseData(proposal);
  await logProposalAudit(proposal.id, "created", { proposalNumber: proposal.proposalNumber });
  await addProposalTimelineEvent(
    proposal.id,
    "created",
    "Quotation created",
    `Proposal ${proposal.proposalNumber} created as Draft`
  );

  return proposal;
}

export async function updateEnterpriseProposal(proposal: Proposal): Promise<Proposal> {
  const enriched = enrichProposal({ ...proposal, lastUpdate: new Date().toLocaleString() });
  await persistProposalWithEnterpriseData(enriched);
  await logProposalAudit(enriched.id, "updated", { version: enriched.currentVersion });
  await addProposalTimelineEvent(enriched.id, "updated", "Quotation updated");
  return enriched;
}

export async function createProposalRevision(
  proposal: Proposal,
  reason: string,
  changes: string
): Promise<Proposal> {
  const currentVerNumber = parseInt(proposal.currentVersion.replace("V", "")) || 1;
  const nextVerStr = `V${currentVerNumber + 1}`;

  const newVersion: ProposalVersion = {
    version: nextVerStr,
    date: new Date().toISOString(),
    reason,
    changes,
    owner: proposal.owner,
    subject: proposal.proposalSubject,
    currency: proposal.currency,
    options: { ...proposal.options },
    services: [...proposal.services],
    totalBudget: proposal.totalBudget,
    taxes: proposal.taxes,
    grandTotal: proposal.grandTotal,
    coverPage: proposal.coverPage,
    methodology: proposal.methodology,
    projectPlan: proposal.projectPlan,
    timeline: proposal.timeline,
    terms: proposal.terms,
  };

  const updated: Proposal = enrichProposal({
    ...proposal,
    currentVersion: nextVerStr,
    versions: [...(proposal.versions || []), newVersion],
    status: "Revision Requested",
    approvalStatus: "Draft",
    lastUpdate: new Date().toLocaleString(),
  });

  await persistProposalWithEnterpriseData(updated);
  await logProposalAudit(updated.id, "revision_created", { version: nextVerStr, reason });
  await addProposalTimelineEvent(updated.id, "revision", `Revision ${nextVerStr}`, reason, { changes });

  return updated;
}

export async function setProposalApprovalStatus(
  proposal: Proposal,
  approvalStatus: ProposalApprovalStatus,
  notes?: string
): Promise<Proposal> {
  const updated: Proposal = enrichProposal({
    ...proposal,
    approvalStatus,
    status: mapApprovalToStatus(approvalStatus),
    lastUpdate: new Date().toLocaleString(),
    notes: notes || proposal.notes,
    rejectedReason: approvalStatus === "Rejected" ? notes : proposal.rejectedReason,
  });

  await persistProposalWithEnterpriseData(updated);
  await logProposalAudit(updated.id, `status_${approvalStatus.toLowerCase()}`, { notes });
  await addProposalTimelineEvent(
    updated.id,
    approvalStatus.toLowerCase(),
    `Status changed to ${approvalStatus}`,
    notes
  );

  return updated;
}

export async function sendProposalEmail(
  proposal: Proposal,
  emailData: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
    attachments?: string[];
  }
): Promise<Proposal> {
  const updated = await setProposalApprovalStatus(proposal, "Sent");

  if (proposal.dealId) {
    const deals = CrmDb.getDeals();
    const dealIdx = deals.findIndex((d) => d.id === proposal.dealId);
    if (dealIdx !== -1) {
      const updatedDeals = [...deals];
      updatedDeals[dealIdx] = {
        ...updatedDeals[dealIdx],
        stage: "Proposal Submitted",
        dealEmails: [
          ...(updatedDeals[dealIdx].dealEmails || []),
          {
            id: `email-${Date.now()}`,
            sender: getTenantActorName(),
            recipient: emailData.to,
            date: new Date().toLocaleString(),
            subject: emailData.subject,
            body: emailData.body.replace(/<[^>]*>/g, ""),
            attachments: emailData.attachments,
          },
        ],
      };
      CrmDb.saveDeals(updatedDeals);
    }
  }

  await logProposalAudit(updated.id, "email_sent", emailData as unknown as Record<string, unknown>);
  await addProposalTimelineEvent(updated.id, "email_sent", "Quotation emailed", emailData.subject, {
    to: emailData.to,
  });

  return updated;
}

export async function storeProposalPdf(proposal: Proposal, lang: string): Promise<void> {
  const blob = generateProposalPdfBlob(proposal, lang);
  const filename = `Proposal_${proposal.proposalNumber}_${proposal.currentVersion}_${proposal.companyName.replace(/[^a-zA-Z0-9_-]+/g, "_")}.pdf`;

  await uploadBlobDocument({
    blob,
    filename,
    folder: "proposals",
    companyId: proposal.companyId,
    dealId: proposal.dealId,
    proposalId: proposal.id,
    tags: ["proposal", "auto-generated", proposal.currentVersion],
    description: `Auto-generated proposal PDF ${proposal.proposalNumber} ${proposal.currentVersion}`,
  });

  await logProposalAudit(proposal.id, "pdf_stored", {
    filename,
    version: proposal.currentVersion,
  });
  await addProposalTimelineEvent(proposal.id, "pdf_generated", "PDF stored in Documents", filename);
}

export async function loadProposalEnterpriseMeta(proposalId: string): Promise<{
  timeline: ProposalTimelineEvent[];
  auditLog: ProposalAuditLog[];
}> {
  const [timeline, auditLog] = await Promise.all([
    fetchProposalTimeline(proposalId),
    fetchProposalAuditLog(proposalId),
  ]);
  return { timeline, auditLog };
}

export async function deleteEnterpriseProposal(proposalId: string): Promise<void> {
  const proposals = CrmDb.getProposals().filter((p) => p.id !== proposalId);
  CrmDb.saveProposals(proposals);
  await persistProposals(proposals);
  await logProposalAudit(proposalId, "deleted");
}
