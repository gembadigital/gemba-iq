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
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 rounded-lg p-10 max-w-4xl mx-auto shadow space-y-6 text-sm text-slate-800 dark:text-zinc-200 leading-relaxed font-sans relative">

      {/* Custom Page Letterhead Header if present */}
      {doc.pageImage && (
        <div className="absolute top-4 right-4 max-h-12 overflow-hidden opacity-80">
          <img src={doc.pageImage} alt="page letterhead" referrerPolicy="no-referrer" className="h-10 object-contain" />
        </div>
      )}

      {/* Cover Image or Standard Header */}
      {doc.coverImage ? (
        <div className="border-b pb-5 flex flex-col items-center justify-center gap-2">
          <img src={doc.coverImage} alt="cover letterhead" referrerPolicy="no-referrer" className="max-h-48 object-contain" />
          <div className="text-center text-[10px] text-slate-450 font-mono mt-2">
            <p>{t("Date:")} {doc.date} | {t("Ref:")} PROP-{doc.proposalNumber} | {t("Status:")} {doc.status}</p>
          </div>
        </div>
      ) : (
        /* Header Logo */
        <div className="border-b pb-5 flex justify-between items-start">
          <div>
            <h3 className="font-black text-emerald-600 tracking-widest text-lg">GEMBA PARTNER</h3>
            <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mt-0.5">{t("Lean Operations & Strategy Advisory Group")}</p>
          </div>
          <div className="text-right text-[10px] text-slate-450 font-mono">
            <p>{t("Date:")} {doc.date}</p>
            <p>{t("Ref:")} PROP-{doc.proposalNumber}</p>
            <p>{t("Status:")} {doc.status}</p>
          </div>
        </div>
      )}

      {/* Custom Headline / Cover Text */}
      {doc.coverPage && (
        <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-xl border-l-4 border-l-purple-600 text-center">
          <h2 className="text-md font-extrabold text-purple-800 dark:text-purple-400 font-mono">
            {doc.coverPage}
          </h2>
        </div>
      )}

      {/* Cover Headline */}
      <div className="text-center py-4 space-y-1">
        <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-zinc-100 uppercase font-mono">
          {doc.proposalSubject}
        </h1>
        <p className="text-[11px] text-slate-450 uppercase font-mono tracking-wider">
          {t("Prepared For:")} <strong>{doc.companyName}</strong> | {t("Attn:")} {doc.contactPerson}
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2 border-l-4 border-l-emerald-500 pl-4 bg-slate-50 dark:bg-black/10 py-2">
        <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("1. Opportunity Focus Statement")}</h4>
        <p className="text-xs italic text-slate-600 dark:text-zinc-350">{doc.description || t("Field walkthrough on bottleneck areas.")}</p>
      </div>

      {/* Methodology (Render HTML tables securely) */}
      {doc.methodology && (
        <div className="space-y-2">
          <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("2. Lean Methodology & Structural Approach")}</h4>
          <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: doc.methodology }} />
        </div>
      )}

      {/* Project Plan (Render HTML tables securely) */}
      {doc.projectPlan && (
        <div className="space-y-2">
          <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("3. Phase-by-Phase Project Plan")}</h4>
          <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: doc.projectPlan }} />
        </div>
      )}

      {/* Timeline (Render HTML tables securely) */}
      {doc.timeline && (
        <div className="space-y-2">
          <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("4. Timeline & Sprints Milestones")}</h4>
          <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: doc.timeline }} />
        </div>
      )}

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
                const total = opt.manDays * opt.dailyRate + opt.expenses;
                return (
                  <tr key={key} className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="p-3 font-bold text-slate-800 dark:text-zinc-100">{key}</td>
                    <td className="p-3 text-right font-semibold text-slate-700 dark:text-zinc-300">{formatSystemNumber(opt.manDays)} Days</td>
                    <td className="p-3 text-right text-slate-700 dark:text-zinc-300">{doc.currency} {formatSystemNumber(opt.dailyRate)}</td>
                    <td className="p-3 text-right text-slate-700 dark:text-zinc-300">{doc.currency} {formatSystemNumber(opt.expenses)}</td>
                    <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">{doc.currency} {formatSystemNumber(total)}</td>
                  </tr>
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
