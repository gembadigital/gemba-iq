import type { Proposal } from "../types/proposal";
import type { Company } from "../components/CompaniesView";
import type { Deal } from "../components/DealManagementView";
import type { Contact } from "./CrmDb";
import { formatSystemNumber } from "./currencyHelper";

export const PROPOSAL_PLACEHOLDERS = [
  "{{company_name}}",
  "{{contact_person}}",
  "{{contact_email}}",
  "{{proposal_number}}",
  "{{proposal_subject}}",
  "{{proposal_date}}",
  "{{owner}}",
  "{{currency}}",
  "{{grand_total}}",
  "{{total_budget}}",
  "{{taxes}}",
  "{{current_version}}",
  "{{deal_name}}",
  "{{description}}",
  "{{services}}",
  "{{methodology}}",
  "{{project_plan}}",
  "{{timeline}}",
  "{{terms}}",
  "{{cover_page}}",
] as const;

export interface PlaceholderContext {
  proposal: Proposal;
  company?: Company | null;
  contact?: Contact | null;
  deal?: Deal | null;
}

export function buildPlaceholderMap(ctx: PlaceholderContext): Record<string, string> {
  const { proposal, company, contact, deal } = ctx;
  const services = (proposal.services || []).join(", ");

  return {
    "{{company_name}}": proposal.companyName || company?.name || "",
    "{{contact_person}}": proposal.contactPerson || (contact ? `${contact.firstName} ${contact.lastName}`.trim() : ""),
    "{{contact_email}}": proposal.contactEmail || contact?.email || "",
    "{{proposal_number}}": proposal.proposalNumber || "",
    "{{proposal_subject}}": proposal.proposalSubject || "",
    "{{proposal_date}}": proposal.date || "",
    "{{owner}}": proposal.owner || "",
    "{{currency}}": proposal.currency || "",
    "{{grand_total}}": `${proposal.currency || ""} ${formatSystemNumber((proposal.grandTotal || 0))}`,
    "{{total_budget}}": `${proposal.currency || ""} ${formatSystemNumber((proposal.totalBudget || 0))}`,
    "{{taxes}}": `${proposal.currency || ""} ${formatSystemNumber((proposal.taxes || 0))}`,
    "{{current_version}}": proposal.currentVersion || "V1",
    "{{deal_name}}": deal?.dealName || deal?.companyName || "",
    "{{description}}": proposal.description || "",
    "{{services}}": services,
    "{{methodology}}": proposal.methodology || "",
    "{{project_plan}}": proposal.projectPlan || "",
    "{{timeline}}": proposal.timeline || "",
    "{{terms}}": proposal.terms || "",
    "{{cover_page}}": proposal.coverPage || proposal.proposalSubject || "",
  };
}

export function applyPlaceholders(template: string, ctx: PlaceholderContext): string {
  const map = buildPlaceholderMap(ctx);
  let result = template;
  for (const [key, value] of Object.entries(map)) {
    result = result.split(key).join(value);
  }
  return result;
}

export function extractPlaceholdersFromTemplate(template: string): string[] {
  const matches = template.match(/\{\{[a-z_]+\}\}/g) || [];
  return [...new Set(matches)];
}
