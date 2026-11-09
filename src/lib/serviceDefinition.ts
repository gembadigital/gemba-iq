type DefinitionTarget = "screen" | "print";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!));

function isHeading(line: string): boolean {
  if (line.length > 180) return false;
  const letters = line.replace(/[^a-zA-ZĞÜŞİÖÇIğüşiöçı]/g, "");
  if (letters.length > 3 && letters === letters.toLocaleUpperCase("tr-TR")) return true;
  const name = line.replace(/^\d+[.)]\s*/, "").replace(/\s*[:;]\s*$/, "").toLocaleLowerCase("tr-TR");
  return /^(?:(?:proje|program|çalışma|çalışmanın|eğitim|eğitimin|projenin|programın)\s+)?(?:tanımı(?: ve kapsamı)?|tanıtımı|amacı|temel amacı|kapsamı|çıktıları|kazanımları|kazanımı|süresi)$/.test(name)
    || /^(?:hedeflenen çıktılar|hedeflenen kazanımlar|çalışma içeriği ve yetkinlik gelişimi|proje ekip üyeleri|gemba partner danışmanının rolü)$/.test(name)
    || /^OP\s*\d+\s*[–—:-]/i.test(line);
}

// Preserve the stored definition text. Both the catalog and the proposal
// renderer interpret its headings as real h3 elements, with identical
// section boundaries. Explicit h3 input is supported without rendering
// arbitrary HTML or event attributes from the editor.
export function serviceDefinitionBlocks(text: string, target: DefinitionTarget = "print"): string[] {
  const screen = target === "screen";
  const prepared = text.replace(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi,
    (_, heading: string) => `\n### ${heading.replace(/<[^>]*>/g, "").trim()}\n`);
  return prepared.split(/[\r\n]+/).flatMap(raw => {
    const line = raw.trim();
    if (!line) return [];
    const explicit = /^#{1,6}\s+/.test(line);
    const content = explicit ? line.replace(/^#{1,6}\s+/, "") : line;
    const safeText = escapeHtml(content);
    if (explicit || isHeading(content)) {
      return [`<h3 style="font-family:Arial,sans-serif;font-size:${screen ? "16px" : "11pt"};font-weight:700;line-height:1.35;color:#b91c1c;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;overflow-wrap:anywhere;break-after:avoid;page-break-after:avoid">${safeText}</h3>`];
    }
    const bullet = /^[•·]\s*/.test(content);
    return [`<p style="font-family:Arial,sans-serif;font-size:${screen ? "14px" : "9.5pt"};line-height:1.55;color:#334155;margin:0 0 ${bullet ? "5" : "10"}px;overflow-wrap:anywhere;${bullet ? "padding-left:14px;text-indent:-10px;" : ""}">${safeText}</p>`];
  });
}
