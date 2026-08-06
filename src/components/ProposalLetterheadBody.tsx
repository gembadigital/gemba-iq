import React from "react";
import { Proposal } from "../types/proposal";

// Extracted from ProposalManagementView.tsx's "B2B Letterhead Preview" modal
// (originally a local, unexported function in that file) so the exact same
// styled A4 HTML/CSS document (the thing "Yazdır"/window.print() shows) can
// also be captured off-screen via html2canvas-pro anywhere in the app that
// needs a real, branded PDF of a proposal — not just ProposalManagementView.
//
// This is shared with OpportunityDrawerExtension.tsx's ProposalContractSection
// (the "Fırsat" drawer's embedded proposal panel), which used to have its own,
// completely separate hand-drawn jsPDF renderer with no knowledge of the
// proposal's real content, letterhead colors, or uploaded cover/page images —
// the exact same bug class previously fixed here (see commit history: "pdf
// görüntüsü yeşil başka bir şablon çıkıyor").
export default function ProposalLetterheadBody({
  doc,
  t,
  formatSystemNumber,
}: {
  doc: Proposal;
  t: (s: string) => string;
  formatSystemNumber: (n: number) => string;
}) {
  // Kullanıcı talebi ("teklif yönet sayfasındaki teklif pdf... anlaşılır
  // değil... sadece page.png şablonuna müşteri adı ve kontakt kişinin
  // yazdığı alan ve teklif içeriğini göstersin. geri kalan cover page ve
  // tanımlara gerek yok."): html2canvas-pro yakalaması güvenilir olmadığında
  // (25s timeout / DOM hazır değil) bu belge eski jsPDF üretecine
  // (proposalPdf.ts) düşüyordu — o üretec HTML formatlı description/
  // methodology/projectPlan/timeline alanlarını hiç ayrıştırmadan ham metin
  // olarak çiziyordu (`<h2>PROJE TANIMI...</h2>` gibi etiketlerin harf harf
  // göründüğü kırık çıktı) ve kendi jenerik ince renkli çubuk "kapağını"
  // kullanıyordu. Kalıcı çözüm: bu bileşenden "kapak" (coverImage/coverPage
  // özel başlık) ve "tanımlar" (Description/Methodology/Project Plan/
  // Timeline — projenin amacı/kapsamı gibi serbest metin AI çıktısı barındıran
  // bölümler) tamamen kaldırıldı. Sayfa arka planı artık teklifin kendi
  // page.png şablonu (doc.pageImage — ServicesView'daki sihirbazda seçilen
  // hizmetin yüklediği aynı marka şablonu, proposal oluşturulurken zaten
  // kaydediliyor) üzerine tam sayfa (background-size: 100% 100%) olarak
  // uygulanıyor; şablon yüklenmemişse genel /page.png'ye (boş/şeffaf) düşer.
  // Kalan içerik sadece: müşteri adı + ilgili kişi, hizmetler, fiyatlandırma
  // tablosu, toplamlar, şartlar ve imza alanları — kullanıcının "geri kalan
  // cover page ve tanımlara gerek yok" ifadesiyle SADECE bu iki bölüm grubunu
  // (kapak ve tanımlar) hariç tuttuğu, diğer her şeyin (fiyat/şartlar/imza)
  // kaldığı şeklinde yorumlandı.
  const pageTemplateUrl = doc.pageImage || "/page.png";

  return (
    <div
      className="bg-white dark:bg-zinc-900 border border-slate-200 rounded-lg p-10 max-w-4xl mx-auto shadow space-y-6 text-sm text-slate-800 dark:text-zinc-200 leading-relaxed font-sans relative"
      style={{
        backgroundImage: `url(${pageTemplateUrl})`,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#ffffff",
      }}
    >

      {/* Müşteri adı + ilgili kişi (kullanıcının açıkça istediği tek "başlık" alanı) */}
      <div className="text-center py-4 space-y-1 border-b pb-5">
        <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-zinc-100 uppercase font-mono">
          {doc.proposalSubject}
        </h1>
        <p className="text-[11px] text-slate-450 uppercase font-mono tracking-wider">
          {t("Prepared For:")} <strong>{doc.companyName}</strong> | {t("Attn:")} {doc.contactPerson}
        </p>
      </div>

      {/* Services Grid */}
      <div className="space-y-2">
        <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("5. Services Involved")}</h4>
        <div className="grid grid-cols-2 gap-2">
          {(doc.services || []).map((s) => (
            <div key={s} className="bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300">
              ✓ {s}
            </div>
          ))}
        </div>
      </div>

      {/* Options and budgets table */}
      <div className="space-y-3">
        <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("6. Pricing Packages Options")}</h4>
        <div className="overflow-x-auto w-full border border-slate-200 dark:border-zinc-800 rounded-xl">
          <table className="w-full text-xs table-auto border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-850 border-b text-[10px] font-mono text-slate-450 uppercase">
                <th className="p-3 text-left font-bold">{t("Selection")}</th>
                <th className="p-3 text-right font-bold">{t("Man-Days")}</th>
                <th className="p-3 text-right font-bold">{t("Daily Rate")}</th>
                <th className="p-3 text-right font-bold">{t("Expenses Allowance")}</th>
                <th className="p-3 text-right font-bold">{t("Option Est")}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(doc.options).map((key) => {
                const opt = doc.options[key];
                // Kullanıcı hatası düzeltmesi: artık gerçek satır bazlı
                // hizmet kalemleri (opt.rows) varsa bunlar birebir gösterilir
                // ve toplam bu satırlardan hesaplanır — sihirbazın kendi
                // önizlemesindeki içerik/tutar ile birebir aynı. Eski
                // kayıtlarda rows yoksa (geriye dönük uyumluluk) özet
                // satıra geri düşülür.
                const hasRows = Array.isArray(opt.rows) && opt.rows.length > 0;
                const total = hasRows
                  ? (opt.rows || []).reduce((sum, r) => sum + r.dailyRate * r.manDays, 0) + (opt.expenses || 0)
                  : opt.manDays * opt.dailyRate + opt.expenses;
                return (
                  <React.Fragment key={key}>
                    <tr className="border-b border-slate-100 dark:border-zinc-800/60 bg-slate-50/70 dark:bg-zinc-850/40">
                      {hasRows ? (
                        <td className="p-3 font-bold text-slate-800 dark:text-zinc-100" colSpan={5}>{key}</td>
                      ) : (
                        <>
                          <td className="p-3 font-bold text-slate-800 dark:text-zinc-100">{key}</td>
                          <td className="p-3 text-right font-semibold text-slate-700 dark:text-zinc-300">{formatSystemNumber(opt.manDays)} Days</td>
                          <td className="p-3 text-right text-slate-700 dark:text-zinc-300">{doc.currency} {formatSystemNumber(opt.dailyRate)}</td>
                          <td className="p-3 text-right text-slate-700 dark:text-zinc-300">{doc.currency} {formatSystemNumber(opt.expenses)}</td>
                          <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">{doc.currency} {formatSystemNumber(total)}</td>
                        </>
                      )}
                    </tr>
                    {hasRows && (opt.rows || []).map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                        <td className="p-3 pl-6 text-slate-700 dark:text-zinc-300">{row.item}</td>
                        <td className="p-3 text-right text-slate-700 dark:text-zinc-300">{formatSystemNumber(row.manDays)} Days</td>
                        <td className="p-3 text-right text-slate-700 dark:text-zinc-300">{doc.currency} {formatSystemNumber(row.dailyRate)}</td>
                        <td className="p-3 text-right text-slate-400">—</td>
                        <td className="p-3 text-right font-semibold text-slate-700 dark:text-zinc-300">{doc.currency} {formatSystemNumber(row.dailyRate * row.manDays)}</td>
                      </tr>
                    ))}
                    {hasRows && (
                      <tr className="border-b border-slate-200 dark:border-zinc-800 bg-emerald-50/20 dark:bg-emerald-950/10">
                        <td className="p-3 text-right font-bold text-slate-600 dark:text-zinc-300" colSpan={4}>{t("Option Est")}</td>
                        <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">{doc.currency} {formatSystemNumber(total)}</td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculations Card */}
      <div className="bg-emerald-50/30 dark:bg-[#111] p-4 rounded-xl border border-emerald-100 select-none text-right font-mono space-y-1">
        <p className="text-xs text-slate-500">{t("Proposal Net Subtotal:")} {doc.currency} {formatSystemNumber(doc.totalBudget)}</p>
        <p className="text-xs text-slate-500">{t("VAT surcharge (20%):")} {doc.currency} {formatSystemNumber(doc.taxes)}</p>
        <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
          {t("Grand Total Proposal Offer:")} {doc.currency} {formatSystemNumber(doc.grandTotal)}
        </h4>
      </div>

      {/* Terms and Conditions */}
      {doc.terms && (
        <div className="space-y-2">
          <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("7. Terms, Conditions & Scope Protections")}</h4>
          <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: doc.terms }} />
        </div>
      )}

      {/* Sign lines */}
      <div className="grid grid-cols-2 gap-4 pt-10 text-xs border-t">
        <div className="space-y-4">
          <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("8. Authorization & Signatures")}</h4>
          <p className="text-slate-400 font-mono text-[9px] uppercase">{t("Advisor Authorization")}</p>
          <div className="h-10 border-b border-dashed"></div>
          <p><strong>{t("Gemba Partner Officer")}</strong></p>
        </div>
        <div className="space-y-4 pt-[24px]">
          <p className="text-slate-400 font-mono text-[9px] uppercase">{t("Client Representative")}</p>
          <div className="h-10 border-b border-dashed"></div>
          <p><strong>{t("{company} authorized representative").replace("{company}", doc.companyName)}</strong></p>
        </div>
      </div>

    </div>
  );
}
