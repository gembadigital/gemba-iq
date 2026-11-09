import type { Proposal } from "../types/proposal";
import type { Invoice } from "../data/revenueData";

export function normalizeRevenueCompany(value: string): string {
  return (value || "").toLocaleLowerCase("tr-TR").replace(/ı/g, "i")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

// Accounting exports supply both the legal name and an explicit short
// name. Use those supplied aliases without rewriting either source name.
export function findAcceptedRevenueProposals(customerName: string, invoices: Invoice[], proposals: Proposal[], invoiceDate?: string, descriptions: string[] = []): Proposal[] {
  const legal = normalizeRevenueCompany(customerName);
  if (!legal) return [];
  const aliases = [legal, ...invoices.filter(inv => normalizeRevenueCompany(inv.customerName) === legal)
    .map(inv => normalizeRevenueCompany(inv.customerShortName || ""))].filter(Boolean);
  const eligible = proposals.filter(proposal => {
    if (proposal.status !== "Accepted" || proposal.isDeleted) return false;
    // An invoice issued before this proposal existed is historical billing,
    // not realized revenue against that later accepted proposal.
    if (invoiceDate && /^\d{4}-\d{2}-\d{2}/.test(proposal.date || "") && proposal.date.slice(0, 10) > invoiceDate) return false;
    const name = normalizeRevenueCompany(proposal.companyName);
    if (!name) return false;
    return aliases.some(alias => name === alias || name.startsWith(alias + " ") || alias.startsWith(name + " "));
  });
  if (eligible.length < 2 || !descriptions.length) return eligible;
  const text = normalizeRevenueCompany(descriptions.join(" "));
  const generic = new Set(["hizmet", "hizmeti", "bedeli", "egitim", "egitimi", "egitmi", "uygulama", "uygulamasi", "workshop", "proje", "projesi", "faz", "opsiyon", "surec", "surecleri", "analiz", "analizi", "raporlama", "teorik", "genel", "temel"]);
  const scored = eligible.map(proposal => {
    const tokens = new Set((proposal.services || []).flatMap(service => normalizeRevenueCompany(service).split(" "))
      .filter(token => token.length >= 3 && !generic.has(token) && !/^\d+$/.test(token)));
    const words = new Set(text.split(" "));
    return { proposal, score: [...tokens].filter(token => words.has(token)).length };
  });
  const maximum = Math.max(...scored.map(item => item.score));
  const best = scored.filter(item => item.score === maximum);
  // Prefer a unique service explicitly named in the invoice. Otherwise
  // retain the established proportional allocation among eligible offers.
  return maximum > 0 && best.length === 1 ? [best[0].proposal] : eligible;
}
