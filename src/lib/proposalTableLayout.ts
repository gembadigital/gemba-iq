// DOM-based pagination shared by the proposal wizard and its visual checks.
// Measurements use the complete table, so wrapping, colgroup widths and
// repeated headers have exactly the same geometry as the final output.
export const PROPOSAL_TABLE_TIERS = [
  { fontSize: "9pt", headerFontSize: "9pt", cellPadding: "4px 5px", lineHeight: "1.3" },
  { fontSize: "8.5pt", headerFontSize: "8.5pt", cellPadding: "3px 4px", lineHeight: "1.2" },
  { fontSize: "8pt", headerFontSize: "8pt", cellPadding: "2px 3px", lineHeight: "1.15" },
];

export function styleProposalActivityTables(rawHtml: string, tier = PROPOSAL_TABLE_TIERS[0]): string {
  if (!rawHtml) return "<p style='font-style:italic;color:#64748b'>Faaliyet tablosu bulunmamaktadır.</p>";
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  for (const table of Array.from(doc.querySelectorAll("table"))) {
    table.removeAttribute("width");
    table.removeAttribute("height");
    table.setAttribute("style", `width:100%!important;max-width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;font-family:Arial,sans-serif!important;font-size:${tier.fontSize}!important;margin:0!important`);
    for (const row of Array.from(table.rows)) {
      row.removeAttribute("height");
      row.style.cssText = "height:auto!important;min-height:0!important;max-height:none!important;break-inside:avoid";
    }
    for (const head of Array.from(table.querySelectorAll<HTMLElement>("thead"))) head.style.cssText = "position:static!important;z-index:auto!important";
    const cols = Array.from(table.querySelectorAll<HTMLTableColElement>("colgroup > col"));
    const widths = cols.map(col => parseFloat(col.style.width || col.getAttribute("width") || "0"));
    const total = widths.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
    for (const group of Array.from(table.querySelectorAll<HTMLElement>("colgroup"))) { group.removeAttribute("width"); group.removeAttribute("style"); }
    if (cols.length && total > 0 && widths.every(value => Number.isFinite(value) && value > 0)) {
      cols.forEach((col, i) => { col.removeAttribute("width"); col.style.cssText = `width:${widths[i] / total * 100}%!important`; });
    } else if (cols.length) {
      cols.forEach(col => { col.removeAttribute("width"); col.removeAttribute("style"); });
    } else if (!cols.length && table.rows[0] && Array.from(table.rows[0].cells).every(cell => cell.colSpan === 1)) {
      // Give descriptions room while keeping No / effort / week columns compact.
      const weights = Array.from(table.rows[0].cells).map(cell => {
        const text = (cell.textContent || "").toLocaleLowerCase("tr-TR");
        return /faaliyet|adım|içerik|açıklama|detay|konu/.test(text) ? 5 : /adam|efor|hafta|sıra\s*no|^no\.?$|^gün$/.test(text) ? .8 : 2;
      });
      const sum = weights.reduce((a, b) => a + b, 0);
      const group = doc.createElement("colgroup");
      weights.forEach(weight => { const col = doc.createElement("col"); col.style.setProperty("width", `${weight / sum * 100}%`, "important"); group.appendChild(col); });
      table.insertBefore(group, table.firstChild);
    }
    for (const cell of Array.from(table.querySelectorAll("th,td"))) {
      const heading = cell.tagName === "TH";
      cell.removeAttribute("width");
      cell.removeAttribute("height");
      cell.setAttribute("style", `border:1px solid #cbd5e1!important;padding:${tier.cellPadding}!important;line-height:${tier.lineHeight}!important;text-align:left!important;font-family:Arial,sans-serif!important;font-size:${heading ? tier.headerFontSize : tier.fontSize}!important;font-weight:${heading ? "bold" : "normal"}!important;vertical-align:top!important;overflow-wrap:anywhere!important;word-break:normal!important;white-space:normal!important;${heading ? "background:#f1f5f9!important;color:#1e293b!important" : ""}`);
      for (const element of Array.from(cell.querySelectorAll<HTMLElement>("*"))) {
        for (const name of ["width", "min-width", "max-width", "height", "min-height", "max-height", "white-space", "font", "font-size", "line-height", "margin", "padding"]) element.style.removeProperty(name);
        element.removeAttribute("width");
        element.removeAttribute("height");
        element.style.setProperty("font-size", "inherit", "important");
        element.style.setProperty("line-height", "inherit", "important");
        element.style.setProperty("margin", "0", "important");
        element.style.setProperty("padding", /^(UL|OL)$/.test(element.tagName) ? "0 0 0 14px" : "0", "important");
      }
    }
  }
  return doc.body.innerHTML;
}

export function paginateProposalTables(rawHtml: string, widthPx: number, heightPx: number): string[] {
  if (typeof document === "undefined") return [rawHtml];
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  // Keep headings and notes around tables in their original order, too.
  const tables: HTMLTableElement[] = [];
  const collect = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "TABLE") {
      tables.push(node as HTMLTableElement);
    } else if (node.nodeType === Node.ELEMENT_NODE && (node as Element).querySelector("table")) {
      node.childNodes.forEach(collect);
    } else if (node.textContent?.trim()) {
      const table = doc.createElement("table");
      table.dataset.proposalNote = "true";
      table.style.cssText = "width:100%;table-layout:fixed;border-collapse:collapse;font-family:Arial,sans-serif;font-size:9pt;overflow-wrap:anywhere";
      const cell = table.createTBody().insertRow().insertCell();
      cell.style.cssText = "padding:0;border:0;overflow-wrap:anywhere";
      cell.appendChild(node.cloneNode(true));
      tables.push(table);
    }
  };
  doc.body.childNodes.forEach(collect);
  if (!tables.length) return [rawHtml];

  const probe = document.createElement("div");
  Object.assign(probe.style, {
    position: "fixed", left: "-99999px", top: "0", width: `${widthPx}px`,
    visibility: "hidden", fontFamily: "Arial, sans-serif", display: "flow-root",
  });
  document.body.appendChild(probe);
  const pages: string[] = [];

  try {
    for (const source of tables) {
      const shell = source.cloneNode(false) as HTMLTableElement;
      for (const child of Array.from(source.children)) {
        if (["CAPTION", "COLGROUP", "THEAD"].includes(child.tagName)) shell.appendChild(child.cloneNode(true));
      }
      // Word tables without <thead> still get a repeating header when their
      // first row consists of header cells.
      const rows = Array.from(source.rows).filter(row => !row.closest("thead"));
      if (!source.tHead && rows[0]?.querySelector("th")) {
        shell.createTHead().appendChild(rows.shift()!.cloneNode(true));
      }
      const body = shell.createTBody();
      probe.replaceChildren(shell);

      const flush = () => {
        if (body.rows.length) {
          pages.push(shell.outerHTML);
          body.replaceChildren();
        }
      };

      // Expand vertical merges into a stable grid. Continuation cells keep
      // their label but not numeric totals, which must occur only once.
      const spans = new Map<number, { cell: HTMLTableCellElement; remaining: number }>();
      const normalizedRows = rows.map(original => {
        const row = original.cloneNode(false) as HTMLTableRowElement;
        const cells = Array.from(original.cells);
        let column = 0;
        while (cells.length || spans.has(column)) {
          const span = spans.get(column);
          if (span) {
            const cell = span.cell.cloneNode(true) as HTMLTableCellElement;
            cell.removeAttribute("rowspan");
            if (/^[\d\s.,%/+\-]+$/.test(cell.textContent || "")) cell.textContent = "";
            row.appendChild(cell);
            if (--span.remaining === 0) spans.delete(column);
            column += cell.colSpan || 1;
          } else {
            const cell = cells.shift()!;
            const clone = cell.cloneNode(true) as HTMLTableCellElement;
            clone.removeAttribute("rowspan");
            if (cell.rowSpan > 1) spans.set(column, { cell, remaining: cell.rowSpan - 1 });
            row.appendChild(clone);
            column += cell.colSpan || 1;
          }
        }
        return row;
      });

      for (const row of normalizedRows) {
        body.appendChild(row);
        if (shell.getBoundingClientRect().height <= heightPx) continue;
        row.remove();
        flush();
        body.appendChild(row);
        if (shell.getBoundingClientRect().height <= heightPx) continue;

        // A single pasted cell may be taller than a whole page. Split its
        // text into consecutive rows instead of clipping the content.
        row.remove();
        const pending = Array.from(row.cells).map(cell => (cell.textContent || "").split(/\s+/).filter(Boolean));
        while (pending.some(words => words.length)) {
          const part = row.cloneNode(true) as HTMLTableRowElement;
          const counts = pending.map(() => 0);
          Array.from(part.cells).forEach(cell => { cell.textContent = ""; });
          body.appendChild(part);
          let changed = true;
          while (changed) {
            changed = false;
            pending.forEach((words, i) => {
              if (counts[i] >= words.length) return;
              const cell = part.cells[i];
              cell.textContent = words.slice(0, counts[i] + 1).join(" ");
              if (shell.getBoundingClientRect().height <= heightPx) {
                counts[i]++;
                changed = true;
              } else {
                cell.textContent = words.slice(0, counts[i]).join(" ");
              }
            });
          }
          if (!counts.some(Boolean)) throw new Error("Tablo başlığı veya tek satırı sayfa alanına sığmıyor. Tablo genişliğini ve yazı boyutunu kontrol edin.");
          pending.forEach((words, i) => words.splice(0, counts[i]));
          if (pending.some(words => words.length)) flush();
        }
      }
      flush();
    }
    // A second short Word table or note should share the remaining page space.
    const packed: string[] = [];
    let current = "";
    for (const html of pages) {
      const combined = current + (current ? '<div style="height:8px!important;flex-shrink:0"></div>' : "") + html;
      probe.innerHTML = combined;
      if (current && probe.getBoundingClientRect().height > heightPx) { packed.push(current); current = html; }
      else current = combined;
    }
    if (current) packed.push(current);
    return packed.length ? packed : [rawHtml];
  } finally {
    probe.remove();
  }
}

// Select the largest readable style that meets the two-page activity target.
// Unbounded custom content is never clipped or removed just to meet a page count.
export function paginateProposalActivityTables(rawHtml: string, widthPx: number, heightPx: number): string[] {
  let pages: string[] = [];
  for (const tier of PROPOSAL_TABLE_TIERS) {
    pages = paginateProposalTables(styleProposalActivityTables(rawHtml, tier), widthPx, heightPx);
    if (pages.length <= 2) return pages;
  }
  return pages;
}
