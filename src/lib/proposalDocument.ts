import { financialSectionPages, FINANCIAL_LAYOUT, FINANCIAL_TITLE } from "./proposalFinancialLayout";
import { proposalContentKey } from "./proposalSnapshot";
import DOMPurify from "dompurify";
import { convertCurrencyToTurkishWords } from "./currencyWords";
import type { Proposal, ProposalOption } from "../types/proposal";
import { serviceDefinitionBlocks } from "./serviceDefinition";
import { paginateProposalTables, paginateProposalActivityTables } from "./proposalTableLayout";

export type ProposalDocument = Pick<Proposal, "documentHtml" | "documentSource" | "proposalNumber" | "date" | "companyName" | "contactPerson" | "proposalSubject" | "currency" | "options" | "coverPage" | "terms" | "coverImage" | "pageImage" | "activityTableHtml" | "serviceName" | "serviceCode" | "methodology" | "projectPlan" | "timeline" | "description">;
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const mm = (n: number) => n * 96 / 25.4;
const WIDTH = mm(170), HEIGHT = mm(223);
const heading = (text: string) => `<h3 style="font:700 11pt/1.35 Arial;color:#b91c1c;margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid #cbd5e1;overflow-wrap:anywhere">${escape(text)}</h3>`;

const DOCUMENT_STYLE = `<style>.a4-page{width:210mm;height:297mm;box-sizing:border-box;position:relative;background:white;color:#1e293b;font-family:Arial,sans-serif;margin:0 auto 30px;overflow-wrap:anywhere;flex-shrink:0}.a4-page *{box-sizing:border-box}.proposal-content{position:relative;z-index:1;height:223mm;width:170mm;display:flex;flex-direction:column}.proposal-content>h3{flex-shrink:0}.proposal-section-body{display:flex;flex-direction:column;flex:1;min-height:0}.proposal-section-body>table{flex-shrink:0}@media print{@page{size:A4;margin:0}.a4-page{margin:0!important;break-after:page;box-shadow:none!important;print-color-adjust:exact}.a4-page:last-child{break-after:auto}.a4-page div{background:transparent!important}}</style>`;

// Legacy records can contain rich HTML; new catalog definitions are plain
// text. Normalize both into readable blocks without printing literal tags.
export function proposalTextBlocks(raw = "", legal = false): string[] {
  const parsed = new DOMParser().parseFromString(DOMPurify.sanitize(raw), "text/html");
  parsed.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(el => el.replaceWith(`\n### ${el.textContent}\n`));
  parsed.querySelectorAll("br").forEach(el => el.replaceWith("\n"));
  parsed.querySelectorAll("p,div,li,tr").forEach(el => el.append("\n"));
  let text = parsed.body.textContent || "";
  if (legal) {
    // Compact numbered clauses; preserve the approved wording and numbers.
    const blocks: string[] = [];
    const label = /^(?:KDV|Masraflar|Ulaşım ve Konaklama Giderleri|Faturalandırma|Ödeme(?: Koşulları)?|Teklif [Gg]eçerlilik [Ss]üresi|Geçerlilik|Eğitim ve Çalışma Takvimi|Hizmet Kapsamı|Teklif Onayı|Gizlilik|Fikri mülkiyet|İptal|Sorumluluk|Yetkili mahkeme)$/i;
    const title = (value: string) => `<h3 style="font:700 10pt/1.3 Arial!important;color:#111827!important;margin:7px 0 2px!important;padding:0!important;border:0!important;overflow-wrap:anywhere;break-after:avoid">${escape(value)}</h3>`;
    const paragraph = (value: string) => `<p style="font:10pt/1.35 Arial!important;color:#111827!important;margin:0 0 4px!important;padding:0!important;overflow-wrap:anywhere">${escape(value)}</p>`;
    for (const raw of text.split(/[\r\n]+/)) {
      const line = raw.trim();
      if (!line) continue;
      const explicit = /^#{1,6}\s+/.test(line);
      const content = line.replace(/^#{1,6}\s+/, "");
      const clause = content.match(/^((?:\d+[.)]\s*)?)([^:：]{1,100})[:：]\s*(.*)$/);
      if (clause && (clause[1] || label.test(clause[2].trim()))) {
        blocks.push(title(clause[1] + clause[2].trim() + ":"));
        if (clause[3]) blocks.push(paragraph(clause[3]));
      } else if (explicit || label.test(content) || /^\d+[.)]\s+.{1,80}:?$/.test(content)) blocks.push(title(content));
      else blocks.push(paragraph(content));
    }
    return blocks;
  }
  return serviceDefinitionBlocks(text);
}

// Real DOM measurements are shared by the wizard, saved preview and PDF.
// Oversized paragraphs split at word boundaries; headings stay with text.
function paginateBlocks(blocks: string[], height: number): string[] {
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;left:-99999px;top:0;visibility:hidden;width:${WIDTH}px;font:9.5pt/1.55 Arial;display:flow-root;overflow-wrap:anywhere`;
  document.body.appendChild(probe);
  const pages: string[] = [];
  let current: string[] = [];
  const fits = (items: string[]) => { probe.innerHTML = items.join(""); return probe.getBoundingClientRect().height <= height; };
  const flush = () => { if (current.length) pages.push(current.join("")); current = []; };
  try {
    const pending = [...blocks];
    while (pending.length) {
      const block = pending.shift()!;
      const pair = /^<h3\b/.test(block) && pending.length ? [block, pending[0]] : [block];
      if (fits([...current, ...pair])) { current.push(block); continue; }
      if (current.length) flush();
      if (fits(pair)) { current.push(block); continue; }
      if (fits([block])) { current.push(block); continue; }
      const holder = document.createElement("div"); holder.innerHTML = block;
      const el = holder.firstElementChild as HTMLElement;
      const words = (el.textContent || "").split(/\s+/).filter(Boolean);
      while (words.length) {
        let low = 1, high = words.length, count = 0;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          el.textContent = words.slice(0, mid).join(" ");
          if (fits([el.outerHTML])) { count = mid; low = mid + 1; } else high = mid - 1;
        }
        if (!count) throw new Error("Teklif metni sayfaya sığmıyor.");
        el.textContent = words.splice(0, count).join(" ");
        current.push(el.outerHTML);
        if (words.length) flush();
      }
    }
    flush();
    return pages;
  } finally { probe.remove(); }
}

export function buildProposalDocument(doc: ProposalDocument): string {
  if (doc.documentHtml && doc.documentSource === proposalContentKey(doc)) {
    return updateSavedFinancialLayout(doc);
  }
  const pages: { section: string; title: string; html: string }[] = [];
  const addText = (section: string, title: string, blocks: string[]) => {
    paginateBlocks(blocks, HEIGHT - 48).forEach((html, i) => pages.push({ section, title: title + (i ? " (devamı)" : ""), html }));
  };
  const name = doc.serviceName || doc.proposalSubject;
  const intro = doc.coverPage ?? doc.description ?? "";
  const introBlocks = proposalTextBlocks(intro);
  addText("introduction", "TEKLİF TANITIMI", introBlocks.length ? introBlocks : ['<p style="font:9.5pt Arial;color:#64748b">Teklif tanıtımı henüz tanımlanmamıştır.</p>']);
  // Never fill an older proposal from today's mutable catalog. Recover only
  // the activity content actually stored on that particular proposal.
  const activity = doc.activityTableHtml ?? [doc.methodology, doc.projectPlan, doc.timeline].filter(Boolean).join("\n");
  if (activity?.trim()) {
    const safe = DOMPurify.sanitize(activity, { FORBID_TAGS: ["img", "style"], FORBID_ATTR: ["class", "id"] });
    if (new DOMParser().parseFromString(safe, "text/html").querySelector("table")) {
      paginateProposalActivityTables(safe, WIDTH, HEIGHT - 48).forEach((html, i) => pages.push({ section: "activity", title: "FAZLAR VE İÇERİK ADIMLARI" + (i ? " (devamı)" : ""), html }));
    } else addText("activity", "FAZLAR VE İÇERİK ADIMLARI", proposalTextBlocks(safe));
  }
  const money = (amount: number) => `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ${escape(doc.currency)}`;
  Object.entries(doc.options || {}).forEach(([key, opt]: [string, ProposalOption], index) => {
    const rows = opt.rows?.length ? opt.rows : [{ id: "legacy", item: opt.name || key, dailyRate: opt.dailyRate || 0, manDays: opt.manDays || 0 }];
    const subtotal = rows.reduce((sum, row) => sum + row.dailyRate * row.manDays, 0) + (opt.expenses || 0);
    const cell = (text: string, span = 1) => `<td colspan="${span}" style="border:1px solid #cbd5e1;padding:6px;font:9pt/1.35 Arial;overflow-wrap:anywhere;vertical-align:top">${text}</td>`;
    const table = `<table style="width:100%;table-layout:fixed;border-collapse:collapse;font:9pt Arial"><colgroup><col style="width:45%"><col style="width:22%"><col style="width:13%"><col style="width:20%"></colgroup><thead><tr>${["Hizmet kalemi", "Günlük ücret", "Efor (A/G)", "Bütçe"].map(s => `<th style="border:1px solid #cbd5e1;padding:6px;background:#f1f5f9;text-align:left;font:700 9pt Arial;overflow-wrap:anywhere">${s}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${cell(escape(row.item))}${cell(money(row.dailyRate))}${cell(escape(row.manDays))}${cell(money(row.dailyRate * row.manDays))}</tr>`).join("")}${opt.expenses ? `<tr>${cell("Masraflar", 3)}${cell(money(opt.expenses))}</tr>` : ""}<tr>${cell("Ara toplam (KDV hariç)", 3)}${cell(money(subtotal))}</tr><tr>${cell("KDV (%20)", 3)}${cell(money(subtotal * .2))}</tr><tr>${cell("<strong>Toplam (KDV dahil)</strong>", 3)}${cell(`<strong>${money(subtotal * 1.2)}</strong>`)}</tr></tbody></table>`;
    const optionNumber = key.match(/(?:Option|Opsiyon)\s*(\d+)/i)?.[1] || String(index + 1);
    const label = `SEÇENEK ${optionNumber}: ${opt.name || key}`;
    const details = proposalTextBlocks([opt.desc, opt.duration].filter(Boolean).join("\n"));
    const amountWords = `<p style="font:9pt/1.4 Arial;margin:8px 0">Yazıyla toplam tutar: ${escape(convertCurrencyToTurkishWords(subtotal * 1.2, doc.currency === "$" ? "USD" : doc.currency === "€" ? "EUR" : "TRY").replace("TürkLirası", "Türk lirası").replace(/ Adır\.$/, "."))}</p>`;
    const alternatives = Object.keys(doc.options).length > 1 ? `<p style="font:9pt/1.4 Arial;margin:8px 0;color:#475569">Seçenekler birbirinin alternatifidir. Onayda tercih edilen seçenek belirtilmelidir.</p>` : "";
    const body = heading(label) + details.join("") + table + amountWords + alternatives;
    financialSectionPages(doc, body, WIDTH, HEIGHT, paginateBlocks).forEach(html => pages.push({
      section: "pricing", title: FINANCIAL_TITLE, html,
    }));
  });
  const customerAuthority = doc.contactPerson?.trim();
  const authority = customerAuthority ? `Yetkili: ${/^(sn\.?|sayın)\s/i.test(customerAuthority) ? "" : "Sn. "}${escape(customerAuthority)}` : "Yetkili: ____________________";
  const signatureTitle = (text: string) => `<h3 style="font:700 9.5pt/1.3 Arial!important;color:#b91c1c!important;margin:0 0 5px!important;padding:0 0 4px!important;border-bottom:1px solid #cbd5e1!important">${text}</h3>`;
  const signatureLine = '<div style="height:38px!important;position:relative;border-bottom:1px dashed #cbd5e1"><span style="position:absolute;right:6px;bottom:5px;font:italic 7pt Arial;color:#94a3b8">İMZA / KAŞE</span></div>';
  const signatures = `<div data-signatures="true" style="display:flex!important;gap:28px!important;margin-top:auto!important;padding-top:18px!important;font:9pt/1.35 Arial;color:#1e293b"><div style="flex:1;min-width:0">${signatureTitle("TEKLİFİ HAZIRLAYAN")}<div style="min-height:34px;font-weight:700">Gemba Partner Mühendislik ve Yazılım A.Ş.</div>${signatureLine}</div><div data-customer-approval="true" style="flex:1;min-width:0;overflow-wrap:anywhere">${signatureTitle("MÜŞTERİ KABUL &amp; ONAY")}<div style="min-height:34px"><strong>${escape(doc.companyName)}</strong><div style="font:8pt/1.35 Arial;color:#64748b;margin-top:4px">${authority}</div></div>${signatureLine}</div></div>`;
  const legal = paginateBlocks(proposalTextBlocks(doc.terms || "", true), HEIGHT - 48);
  if (!legal.length) legal.push('<p style="font:9.5pt Arial;color:#64748b">Hukuki koşullar henüz tanımlanmamıştır.</p>');
  legal.forEach((html, i) => pages.push({ section: "legal", title: "3. TİCARİ VE HUKUKİ GENEL ŞARTLAR" + (i ? " (devamı)" : ""), html }));
  // Measure the complete legal content + signature, reserving the heading.
  const last = pages[pages.length - 1];
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;left:-99999px;visibility:hidden;width:${WIDTH}px;font:9.5pt/1.55 Arial;display:flow-root`;
  probe.innerHTML = last.html + signatures;
  document.body.appendChild(probe);
  const fitsSignatures = probe.getBoundingClientRect().height <= HEIGHT - 48;
  probe.remove();
  if (fitsSignatures) last.html += signatures;
  else pages.push({ section: "signature", title: "KABUL VE ONAY", html: signatures });
  const image = (src: string) => `<img alt="" src="${escape(src)}" style="position:absolute;inset:0;width:100%;height:100%;z-index:0" />`;
  const date = /^\d{4}-\d{2}-\d{2}/.test(doc.date) ? doc.date.slice(0, 10).split("-").reverse().join(".") : doc.date;
  const metadata = `<table style="width:100%;table-layout:fixed;border-collapse:collapse;font:11pt/1.6 Arial"><tbody>${[["FİRMA ADI", doc.companyName], ["TEKLİF KONUSU", name], ["TARİH / TEKLİF NO", `${date} / ${doc.proposalNumber}`]].map(([label, value]) => `<tr><td style="width:40%;padding:5px 0;font-weight:700;vertical-align:top">${label}</td><td style="padding:5px 0;overflow-wrap:anywhere">${escape(value)}</td></tr>`).join("")}</tbody></table>`;
  return `${DOCUMENT_STYLE}<div class="a4-page" data-section="cover">${image(doc.coverImage || "/cover.png")}<div style="position:absolute;top:160mm;left:25mm;right:25mm;text-align:center;font:700 18pt Arial">HİZMET TEKLİFİ</div><div style="position:absolute;top:195mm;left:35mm;right:25mm">${metadata}</div></div>${pages.map((page, i) => `<div class="a4-page" data-section="${page.section}" ${page.section === "pricing" ? `data-financial-layout="${FINANCIAL_LAYOUT}"` : ""} style="padding:38mm 20mm 36mm">${image(doc.pageImage || "/page.png")}<div class="proposal-content">${page.section === "pricing" ? "" : page.section === "legal" ? heading(page.title).replace("color:#b91c1c", "color:#334155!important") : heading(page.title)}<div class="proposal-section-body">${page.html}</div></div><div data-proposal-page-number style="position:absolute;bottom:31mm;left:20mm;right:20mm;text-align:right;font:8pt Arial;color:#64748b">${i + 2} / ${pages.length + 1}</div></div>`).join("")}`;
}

function updateSavedFinancialLayout(doc: ProposalDocument): string {
  const parsed = new DOMParser().parseFromString(DOMPurify.sanitize(doc.documentHtml!), "text/html");
  for (const page of Array.from(parsed.querySelectorAll<HTMLElement>('.a4-page[data-section="pricing"]'))) {
    if (page.dataset.financialLayout === FINANCIAL_LAYOUT) continue;
    const content = page.querySelector<HTMLElement>(".proposal-content");
    const body = page.querySelector<HTMLElement>(".proposal-section-body");
    if (!content || !body) continue;
    let raw = body.innerHTML;
    const oldHeading = content.querySelector(":scope > h3")?.textContent || "";
    if (/^SEÇENEK\s/i.test(oldHeading) && !body.querySelector("h3")) raw = heading(oldHeading) + raw;
    const fragments = financialSectionPages(doc, raw, WIDTH, HEIGHT, paginateBlocks);
    const replacements = fragments.map(html => {
      const clone = page.cloneNode(true) as HTMLElement;
      clone.dataset.financialLayout = FINANCIAL_LAYOUT;
      clone.querySelector(".proposal-content")!.innerHTML = `<div class="proposal-section-body">${html}</div>`;
      return clone;
    });
    page.replaceWith(...replacements);
  }
  const pages = Array.from(parsed.querySelectorAll<HTMLElement>(".a4-page"));
  pages.forEach((page, i) => {
    for (const footer of Array.from(page.children)) {
      const el = footer as HTMLElement;
      if (el.hasAttribute("data-proposal-page-number") || el.style.bottom === "31mm" && /^\s*\d+\s*\/\s*\d+\s*$/.test(el.textContent || "")) {
        el.setAttribute("data-proposal-page-number", ""); el.textContent = `${i + 1} / ${pages.length}`;
      }
    }
  });
  return DOCUMENT_STYLE + parsed.body.innerHTML;
}
