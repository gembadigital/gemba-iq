import type { Proposal } from "../types/proposal";
import { paginateProposalTables } from "./proposalTableLayout";

type Party = Pick<Proposal, "companyName" | "contactPerson" | "date" | "proposalNumber">;
const escape = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export const FINANCIAL_LAYOUT = "catalog-201-v1";
export const FINANCIAL_TITLE = "2. FİNANSAL DEĞERLENDİRME & TEKLİF SEÇENEKLERİ";
const optionStyle = "font:700 10pt/1.35 Arial!important;color:#b91c1c!important;text-transform:uppercase;margin:0 0 4px!important;padding:0!important;border:0!important;overflow-wrap:anywhere";
const callout = (html: string) => `<div data-financial-option style="border-left:3px solid #e5e7eb;padding:2px 0 2px 9px!important;margin:0 0 12px!important;overflow-wrap:anywhere">${html}</div>`;

export function financialHeader(doc: Party): string {
  const date = /^\d{4}-\d{2}-\d{2}/.test(doc.date) ? doc.date.slice(0, 10).split("-").reverse().join(".") : doc.date;
  const contact = doc.contactPerson?.trim();
  const recipient = contact ? (/^(sn\.?|sayın)\s/i.test(contact) ? contact : `Sn. ${contact}`) : "____________________";
  return `<div data-proposal-party style="border:1px solid #e5e7eb;border-radius:4px;padding:6px 12px!important;margin:0 0 16px!important"><table style="width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;margin:0!important"><colgroup><col style="width:20%"><col style="width:5%"><col style="width:75%"></colgroup><tbody>${[["FİRMA", doc.companyName], ["KİME", recipient], ["TARİH VE<br>NO", `${date || ""} / ${doc.proposalNumber || ""}`]].map(([label, value], i) => `<tr style="height:auto!important;min-height:0!important;background:${i ? "#fafbfc" : "#fff"}!important"><td style="border:0!important;border-bottom:1px solid #d1d5db!important;padding:9px 8px!important;font:700 10pt/1.35 Arial!important;vertical-align:middle!important;white-space:normal!important;color:#374151!important">${label}</td><td style="border:0!important;border-bottom:1px solid #d1d5db!important;padding:9px 0!important;font:700 10pt/1.35 Arial!important;vertical-align:middle!important;color:#374151!important">:</td><td style="border:0!important;border-bottom:1px solid #d1d5db!important;padding:9px 8px!important;font:400 10pt/1.35 Arial!important;vertical-align:middle!important;white-space:normal!important;overflow-wrap:anywhere!important;color:#374151!important">${escape(value)}</td></tr>`).join("")}</tbody></table></div><h3 data-financial-heading style="font:700 11pt/1.4 Arial!important;color:#374151!important;margin:0 0 10px!important;padding:0!important;border:0!important;overflow-wrap:anywhere">${escape(FINANCIAL_TITLE)}</h3>`;
}

// Both newly assembled proposals and saved HTML use the same measured layout.
// Saved option descriptions, table cells and free text are retained verbatim.
export function financialSectionPages(doc: Party, raw: string, width: number, height: number,
  paginateText: (blocks: string[], height: number) => string[]): string[] {
  const body = new DOMParser().parseFromString(raw, "text/html").body;
  body.querySelectorAll<HTMLElement>("h3").forEach(el => { el.style.cssText = optionStyle; });
  body.querySelectorAll<HTMLElement>("p").forEach(el => {
    el.style.cssText = "font:9pt/1.45 Arial!important;margin:3px 0 6px!important;padding:0!important;color:#475569!important;overflow-wrap:anywhere";
    if (/^Yazıyla toplam tutar:/i.test(el.textContent?.trim() || "")) el.style.cssText += ";border:1px solid #e5e7eb!important;border-radius:3px;padding:6px!important;margin:9px 0!important;font-size:8pt!important";
    if (/^Seçenekler birbirinin alternatifidir/i.test(el.textContent?.trim() || "")) el.style.cssText += ";border-left:3px solid #e5e7eb!important;padding:4px 0 4px 8px!important;font-size:8pt!important";
  });
  body.querySelectorAll<HTMLElement>("table").forEach(table => {
    table.style.cssText = "width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;margin:0!important;font:9pt Arial!important";
    table.querySelectorAll<HTMLElement>("tr").forEach(row => { row.style.cssText = "height:auto!important;min-height:0!important"; });
    table.querySelectorAll<HTMLElement>("thead").forEach(head => { head.style.cssText = "position:static!important"; });
    table.querySelectorAll<HTMLTableCellElement>("th,td").forEach(cell => {
      const label = cell.textContent?.trim();
      if (cell.colSpan === 3 && label === "Ara toplam (KDV hariç)") cell.textContent = "Seçenek Ara Toplamı (KDV Hariç):";
      if (cell.colSpan === 3 && label === "KDV (%20)") cell.textContent = "KDV (%20):";
      if (cell.colSpan === 3 && label === "Toplam (KDV dahil)") cell.innerHTML = "<strong>SEÇENEK TOPLAM BÜTÇESİ (KDV DAHİL):</strong>";
      const align = cell.colSpan > 1 || cell.cellIndex === 1 || cell.cellIndex === 3 ? "right" : cell.cellIndex === 2 ? "center" : "left";
      cell.style.cssText = `border:1px solid #cbd5e1!important;padding:7px 6px!important;font:${cell.tagName === "TH" ? "700" : "400"} 9pt/1.35 Arial!important;vertical-align:top!important;white-space:normal!important;overflow-wrap:anywhere!important;text-align:${align}!important;${cell.tagName === "TH" ? "background:#f8fafc!important" : ""}`;
    });
  });
  const header = financialHeader(doc);
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;left:-99999px;top:0;visibility:hidden;width:${width}px;display:flow-root;font:9pt Arial`;
  document.body.appendChild(probe);
  const measure = (html: string) => { probe.innerHTML = html; return probe.getBoundingClientRect().height; };
  try {
    const available = height - measure(header) - 8;
    if (available < 100) throw new Error("Firma bilgileri teklif sayfasına sığmıyor.");
    const table = body.querySelector("table");
    const nodeHtml = (node: Node) => node.nodeType === Node.ELEMENT_NODE ? (node as Element).outerHTML : node.textContent?.trim() ? `<p>${escape(node.textContent)}</p>` : "";
    if (!table) return paginateText(Array.from(body.childNodes, nodeHtml).filter(Boolean), available - 12).map(html => header + callout(html));
    // Standard pricing pages have one table. Additional user-created tables
    // remain in the tail and are paginated rather than silently discarded.
    const prefix: string[] = [], suffix: string[] = [];
    let after = false;
    const collect = (node: Node) => {
      if (node === table) { after = true; return; }
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).contains(table)) {
        node.childNodes.forEach(collect); return;
      }
      (after ? suffix : prefix).push(nodeHtml(node));
    };
    body.childNodes.forEach(collect);
    const firstHeading = body.querySelector("h3");
    const repeatedHeading = firstHeading ? `<h3 style="${optionStyle}">${escape(firstHeading.textContent)}</h3>` : "";
    const prefixHtml = prefix.join("");
    const tail = suffix.join("");
    const prefixHeight = measure(callout(prefixHtml));
    const inline = prefixHeight <= available * .45;
    const tailInline = measure(tail) <= available * .25;
    const result: string[] = [];
    if (!inline && prefixHtml.trim()) {
      // Measure long paragraphs at the callout's actual inner width, including
      // its left rule/padding; using the full page width undercounts wrapping.
      const blocks = prefix.filter(Boolean).map(html => `<div style="width:${width - 12}px;max-width:100%;font:9pt/1.45 Arial">${html}</div>`);
      result.push(...paginateText(blocks, available - 24).map(html => header + callout(html)));
    }
    const budget = Math.max(100, available - measure(callout(inline ? prefixHtml : repeatedHeading)) - (tailInline ? measure(tail) : 0) - 12);
    const tables = paginateProposalTables(table.outerHTML, width, budget);
    tables.forEach((html, i) => result.push(header + callout(inline && !i ? prefixHtml : repeatedHeading) + html + (tailInline && i === tables.length - 1 ? tail : "")));
    if (!tailInline && tail.trim()) {
      const tailPages = paginateProposalTables(tail, width, available - 16);
      // Keep arbitrary notes, HTML tables and edited wording in their order.
      result.push(...tailPages.map(html => header + html));
    }
    return result;
  } finally { probe.remove(); }
}
