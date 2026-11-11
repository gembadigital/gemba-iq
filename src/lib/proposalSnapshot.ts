import type { Proposal, ProposalOption, ProposalOptionRow } from "../types/proposal";

export function nextProposalVersion(current?: string): string {
  if (!current) return "v1.0";
  const match = /^v?(\d+)\.(\d+)$/i.exec(current);
  if (!match) throw new Error("Teklif sürüm numarası geçersiz.");
  return `v${Number(match[1])}.${Number(match[2]) + 1}`;
}

// Only rendered fields participate. Calculated option summaries and row IDs
// cannot invalidate an otherwise identical saved document.
export function proposalContentKey(doc: Record<string, any>): string {
  const fields = ["proposalNumber", "date", "companyName", "contactPerson", "proposalSubject", "currency",
    "coverPage", "activityTableHtml", "terms", "serviceName", "serviceCode", "coverImage", "pageImage"];
  return JSON.stringify([
    ...fields.map(key => doc[key] ?? ""),
    Object.entries(doc.options || {}).map(([key, value]: [string, any]) => [key,
      value.name ?? "", value.desc ?? "", value.duration ?? "",
      (value.rows || []).map((r: any) => [r.item ?? "", r.dailyRate ?? 0, r.manDays ?? 0])]),
  ]);
}

// The copy is an unsaved wizard draft: no source mutation, document links,
// audit history, acceptance state or opportunity ID carries over.
export function copyProposalForWizard(source: Proposal, proposals: Proposal[], today = new Date()): Proposal {
  const copy = structuredClone(source);
  const sequenceNo = Math.max(43, ...proposals.map(p => Math.max(p.sequenceNo || 0,
    Number(p.proposalNumber.split("-").pop()) || 0))) + 1;
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { dealId, dealName, timelineEvents, auditLog, rejectedReason, cancelledReason, lossReason,
    lossReasonNote, nextContactReminderStart, nextContactReminderEnd, documentHtml, documentSource, ...content } = copy;
  const draft: Proposal = { ...content, id: "", sequenceNo, proposalNumber: `${date.slice(2, 4)}${date.slice(5, 7)}-${sequenceNo}`,
    date, status: "Draft", approvalStatus: "Draft", isDraft: true, isDeleted: false,
    currentVersion: "v1.0", versions: [], lastUpdate: "" };
  if (source.documentHtml && source.documentSource === proposalContentKey(source)) {
    const displayDate = (value: string) => value.split("-").reverse().join(".");
    draft.documentHtml = source.documentHtml.split(source.proposalNumber).join(draft.proposalNumber)
      .split(displayDate(source.date)).join(displayDate(date));
    draft.documentSource = proposalContentKey(draft);
  }
  return draft;
}

export function proposalOptionRows(option?: ProposalOption): ProposalOptionRow[] {
  if (!option) return [];
  if (Array.isArray(option.rows)) return structuredClone(option.rows);
  // Older records have only rate × effort, so retain that saved amount.
  return [{ id: "legacy-row", item: option.name || "Hizmet", dailyRate: option.dailyRate ?? 0, manDays: option.manDays ?? 0 }];
}
