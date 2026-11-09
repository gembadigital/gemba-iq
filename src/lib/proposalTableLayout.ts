// DOM-based pagination shared by the proposal wizard and its visual checks.
// Measurements use the complete table, so wrapping, colgroup widths and
// repeated headers have exactly the same geometry as the final output.
export const PROPOSAL_TABLE_TIERS = [
  { fontSize: "9pt", headerFontSize: "9pt", cellPadding: "4px 5px", lineHeight: "1.3" },
  { fontSize: "8.5pt", headerFontSize: "8.5pt", cellPadding: "3px 4px", lineHeight: "1.25" },
];

export function styleProposalActivityTables(rawHtml: string, tier = PROPOSAL_TABLE_TIERS[0]): string {
  if (!rawHtml) return "<p style='font-style:italic;color:#64748b'>Faaliyet tablosu bulunmamaktadır.</p>";
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  for (const table of Array.from(doc.querySelectorAll("table"))) {
    table.removeAttribute("width");
    table.setAttribute("style", `width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;font-family:Arial,sans-serif;font-size:${tier.fontSize};margin:0`);
    for (const cell of Array.from(table.querySelectorAll("th,td"))) {
      const heading = cell.tagName === "TH";
      // Word may paste pixel widths on cells or nested paragraphs/spans.
      cell.removeAttribute("width");
      cell.removeAttribute("height");
      cell.setAttribute("style", `border:1px solid #cbd5e1;padding:${tier.cellPadding};line-height:${tier.lineHeight};text-align:left;font-family:Arial,sans-serif;font-size:${heading ? tier.headerFontSize : tier.fontSize};font-weight:${heading ? "bold" : "normal"};vertical-align:top;overflow-wrap:anywhere;word-break:normal;white-space:normal;${heading ? "background:#f1f5f9;color:#1e293b" : ""}`);
      for (const element of Array.from(cell.querySelectorAll<HTMLElement>("*"))) {
        for (const name of ["width", "min-width", "max-width", "height", "min-height", "white-space", "font-size", "line-height"]) element.style.removeProperty(name);
        element.removeAttribute("width");
        element.removeAttribute("height");
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
    return pages.length ? pages : [rawHtml];
  } finally {
    probe.remove();
  }
}
