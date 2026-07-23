import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Lock,
  ChevronDown,
  ChevronRight,
  Upload,
  Trash2,
  Plus,
  FileText,
  Download,
  Info,
} from "lucide-react";
import { CrmDb } from "../lib/CrmDb";
import { uploadBlobDocument, getSignedDownloadUrl } from "../lib/enterpriseDocumentService";
import {
  Consultant,
  ProjectAssignment,
  Invoice as RevenueInvoice,
  INITIAL_CONSULTANTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_INVOICES as REVENUE_INITIAL_INVOICES,
} from "../data/revenueData";
import {
  PLGroupKey,
  PLPeriodMode,
  PLPeriod,
  RecurringCostEntry,
  categoriesForGroup,
  groupLabel,
  entryAppliesToMonth,
  entryDisplayLabel,
  REVENUE_CATEGORIES,
  PROJECT_EXPENSE_CATEGORIES,
  CONSULTANT_INVOICE_CATEGORY,
  ALL_INVOICE_CATEGORIES,
  PLInvoiceRecord,
  PLInvoiceCategoryKey,
  computeVatAmount,
  computeKdvSummary,
  mapServiceTypeToRevenueCategory,
  buildPeriods,
  generateMonthOptions,
  formatMonthLabel,
  formatTRY,
  formatPercentOfNet,
  formatVarianceAmount,
  PL_CATEGORY_PLANS_KEY,
  PL_CONSULTANT_PLANS_KEY,
  PL_RECURRING_ENTRIES_KEY,
  PL_INVOICES_KEY,
  revenueRowKey,
  expenseRowKey,
  getCategoryPlanForMonths,
} from "../data/managementPlData";

const PIN_CODE = "1234";

// Shared sticky-first-column styling for the P/L table. Needs an explicit
// solid background + z-index + a fixed width identical on every header/body
// cell — sticky positioning combined with border-collapse silently fails to
// paint an opaque background in some browsers, which let the scrolling
// period columns visually bleed through the frozen "Kalem" column. Table
// below therefore also uses border-separate instead of border-collapse.
const STICKY_COL_WIDTH = 236;
// Deliberately excludes background color — callers must always pass an
// explicit solid bg-* class alongside this (never leave it to inherit),
// otherwise the sticky column can render see-through over scrolled content.
const STICKY_CELL_CLASS = "sticky left-0 z-10 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.12)] dark:shadow-[4px_0_6px_-4px_rgba(0,0,0,0.5)] align-middle";

// Must match RevenueManagementView.tsx's REVENUE_INVOICES_KEY — this is the
// real, already-imported sales invoice ledger from Revenue Management. The
// Management P/L "Gerçekleşen" revenue figures are pulled from here
// automatically (mapped by serviceType), plus anything manually uploaded in
// the Fatura Yükleme tab for categories Revenue Management doesn't cover
// (e.g. Yazılım Geliri).
const REVENUE_MANAGEMENT_INVOICES_KEY = "crm_revenue_invoices";

// ---------------------------------------------------------------------------
// Seed / demo data — mirrors the exact example given when this page was
// specified (Haziran 2026: Net Satış Geliri Plan 1.500.000). Gerçekleşen for
// that month now comes from Revenue Management's own seeded invoices, so no
// separate seed invoice is needed here any more.
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORY_PLANS: Record<string, Record<string, number>> = {
  [revenueRowKey("consulting")]: { "2026-06": 1_500_000 },
};

// ---------------------------------------------------------------------------
// Pure calculation helpers (all operate over an arbitrary list of months, so
// they work identically for a single month, a multi-month range, or a
// 3-month quarter bucket)
// ---------------------------------------------------------------------------

// Two consultant names can look 100% identical on screen and still fail a
// strict `===` comparison: (1) Turkish "İ"/"I"/"ı"/"i" don't fold the same
// way under the default (non-locale) .toLowerCase(), and (2) a letter like
// "ç" can be stored as either one precomposed Unicode codepoint or as "c"
// plus a separate combining cedilla mark (NFC vs NFD normalization) — these
// render identically but are different byte sequences, most commonly caused
// by data typed on different keyboards/OSes or pasted from different
// sources (e.g. an Excel import vs. a manually-typed Danışman Master entry).
// Confirmed via the Veri Kontrolü panel as the actual cause of at least one
// real "isim eşleşmiyor" case ("Faik Çakır" not matching the Master list
// despite looking identical), so both name-matching call sites below now
// normalize through this before comparing.
function normalizeConsultantName(name: string): string {
  return name.normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR");
}

// Danışman Atamaları (ProjectAssignment) represent SCHEDULED/PLANNED work —
// you assign a consultant to a project for N days at a rate before that
// work is necessarily invoiced. Per user decision (2026-07-23): this now
// feeds the "Plan" column automatically instead of "Gerçekleşen", since the
// system has no separate budget/forecast data model for consultants —
// assignments are the closest real "plan" the system already has. Actual
// realized cost comes only from real invoices (see
// computeConsultantActualCostFromInvoicesForMonths /
// computeConsultantActualCostFromPLInvoicesForMonths below).
function computeConsultantPlannedCostForMonths(
  assignments: ProjectAssignment[],
  consultants: Consultant[],
  consultantId: string,
  months: string[]
): number {
  const consultant = consultants.find((c) => c.id === consultantId);
  return assignments
    .filter((a) => a.consultantId === consultantId && months.includes(a.month))
    .reduce((sum, a) => sum + a.allocatedDays * (a.consultantDailyRate ?? consultant?.dailyCost ?? 0), 0);
}

// Plan column value: a manual override in consultantPlans (entered via the
// editable Plan cell) always wins when present for a given month; otherwise
// it falls back to the assignment-based planned cost above.
function computeConsultantPlanForMonths(
  consultantPlans: Record<string, Record<string, number>>,
  assignments: ProjectAssignment[],
  consultants: Consultant[],
  consultantId: string,
  months: string[]
): number {
  return months.reduce((sum, m) => {
    const manual = consultantPlans[consultantId]?.[m];
    if (manual !== undefined && manual !== null) return sum + manual;
    return sum + computeConsultantPlannedCostForMonths(assignments, consultants, consultantId, [m]);
  }, 0);
}

// Many real Gelir Yönetimi workflows never fill in a formal "Danışman
// Atamaları" record — the consultant is only tagged directly on the
// imported invoice row (the "Kategori"/"Danışman" column, parsed into
// Invoice.consultantNames). Without this, a consultant with only
// invoice-level tagging and no assignment record showed ₺0 here even
// though real fatura data existed for them. Mirrors the split-evenly logic
// RevenueManagementView.tsx's own computeCostForCustomerInvoices() uses.
function computeConsultantActualCostFromInvoicesForMonths(
  revenueInvoices: RevenueInvoice[],
  consultants: Consultant[],
  consultantId: string,
  months: string[]
): number {
  const consultant = consultants.find((c) => c.id === consultantId);
  if (!consultant) return 0;
  const targetName = normalizeConsultantName(consultant.name);
  let cost = 0;
  revenueInvoices
    .filter((inv) => months.includes(inv.month) && (inv.consultantNames || []).length > 0)
    .forEach((inv) => {
      const names = (inv.consultantNames || []).filter(Boolean);
      const matchCount = names.filter((n) => normalizeConsultantName(n) === targetName).length;
      if (matchCount === 0) return;
      const perPersonDays = inv.deliveredDays / names.length;
      cost += perPersonDays * matchCount * consultant.dailyCost;
    });
  return cost;
}

// Third cost source: a "Danışman Faturası" (consultant_fee) invoice uploaded
// directly in the Fatura Yükleme tab and tagged with a real consultantId —
// for invoices that never went through Revenue Management at all (e.g. a
// subcontractor/freelance invoice with no matching Danışman Atamaları or
// Revenue Management invoice row).
function computeConsultantActualCostFromPLInvoicesForMonths(plInvoices: PLInvoiceRecord[], consultantId: string, months: string[]): number {
  return plInvoices
    .filter((i) => i.category === "consultant_fee" && i.consultantId === consultantId && months.includes(i.month))
    .reduce((s, i) => s + i.amount, 0);
}

// "Gerçekleşen" (actual) is now purely real, invoiced spend — the
// assignment-based figure moved to the Plan column above (see comment
// there). Two real sources: a Revenue Management invoice tagged with this
// consultant's name, or a "Danışman Faturası" uploaded directly here.
function computeConsultantTotalActualCostForMonths(
  revenueInvoices: RevenueInvoice[],
  plInvoices: PLInvoiceRecord[],
  consultants: Consultant[],
  consultantId: string,
  months: string[]
): number {
  return (
    computeConsultantActualCostFromInvoicesForMonths(revenueInvoices, consultants, consultantId, months) +
    computeConsultantActualCostFromPLInvoicesForMonths(plInvoices, consultantId, months)
  );
}

function computeRevenueActualForCategory(
  revenueInvoices: RevenueInvoice[],
  plInvoices: PLInvoiceRecord[],
  categoryKey: string,
  months: string[]
): number {
  const fromSystem = revenueInvoices
    .filter((inv) => months.includes(inv.month) && mapServiceTypeToRevenueCategory(inv.serviceType) === categoryKey)
    .reduce((s, inv) => s + inv.amount, 0);
  const fromUploads = plInvoices
    .filter((i) => months.includes(i.month) && i.direction === "revenue" && i.category === categoryKey)
    .reduce((s, i) => s + i.amount, 0);
  return fromSystem + fromUploads;
}

function computeExpenseActualForCategory(plInvoices: PLInvoiceRecord[], categoryKey: string, months: string[]): number {
  return plInvoices
    .filter((i) => months.includes(i.month) && i.direction === "expense" && i.category === categoryKey)
    .reduce((s, i) => s + i.amount, 0);
}

interface PLValue {
  plan: number;
  actual: number;
}

interface PLRow {
  key: string;
  label: string;
  values: PLValue[]; // aligned index-for-index with the active `periods` array
  tone?: "revenue" | "expense" | "profit" | "final";
  isTotal?: boolean;
  children?: PLRow[];
  getEditable?: (periodIndex: number) => { onSave: (v: number) => void } | undefined;
  onNavigate?: () => void;
}

function sumValues(rows: PLRow[], periodCount: number): PLValue[] {
  return Array.from({ length: periodCount }, (_, i) =>
    rows.reduce((s, r) => ({ plan: s.plan + r.values[i].plan, actual: s.actual + r.values[i].actual }), { plan: 0, actual: 0 })
  );
}

function buildRecurringGroupRows(
  entries: RecurringCostEntry[],
  groupKey: PLGroupKey,
  periods: PLPeriod[]
): { rows: PLRow[]; totals: PLValue[] } {
  const cats = categoriesForGroup(groupKey);
  const rows: PLRow[] = cats.map((cat) => {
    const catEntries = entries.filter((e) => e.groupKey === groupKey && e.categoryKey === cat.key);
    const values: PLValue[] = periods.map((p) => {
      let plan = 0;
      let actual = 0;
      p.months.forEach((month) => {
        catEntries
          .filter((e) => entryAppliesToMonth(e, month))
          .forEach((e) => {
            plan += e.amountPlan;
            actual += e.amountActual;
          });
      });
      return { plan, actual };
    });
    const relevantEntries = catEntries.filter((e) => periods.some((p) => p.months.some((m) => entryAppliesToMonth(e, m))));
    const children: PLRow[] | undefined =
      relevantEntries.length > 0
        ? relevantEntries.map((e) => ({
            key: `entry:${e.id}`,
            label: entryDisplayLabel(e),
            tone: "expense" as const,
            values: periods.map((p) => {
              let plan = 0;
              let actual = 0;
              p.months.forEach((month) => {
                if (entryAppliesToMonth(e, month)) {
                  plan += e.amountPlan;
                  actual += e.amountActual;
                }
              });
              return { plan, actual };
            }),
          }))
        : undefined;
    return { key: `${groupKey}:${cat.key}`, label: cat.label, tone: "expense" as const, values, children };
  });
  return { rows, totals: sumValues(rows, periods.length) };
}

// ---------------------------------------------------------------------------
// Small presentational sub-components
// ---------------------------------------------------------------------------

function EditableAmountCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  if (editing) {
    return (
      <input
        type="number"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const n = parseFloat(draft);
          onSave(Number.isFinite(n) ? n : 0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="w-24 text-right rounded border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-[11.5px] focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-right w-full bg-transparent border-0 shadow-none appearance-none hover:bg-slate-100 dark:hover:bg-zinc-700/50 rounded px-1.5 py-0.5 transition-colors text-inherit"
      title="Düzenlemek için tıklayın"
    >
      {formatTRY(value)}
    </button>
  );
}

function PLTableRow({
  row,
  depth,
  expanded,
  onToggle,
  periods,
  netSalesValues,
  showPercent,
}: {
  row: PLRow;
  depth: number;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  periods: PLPeriod[];
  netSalesValues: PLValue[];
  showPercent: boolean;
}) {
  const hasChildren = !!row.children?.length;
  const isOpen = expanded.has(row.key);

  let rowBgClass = "bg-white dark:bg-zinc-900";
  let rowClasses = "hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors";
  if (row.isTotal) {
    const overallActual = row.values.reduce((s, v) => s + v.actual, 0);
    if (row.tone === "final") {
      rowBgClass = overallActual >= 0 ? "bg-emerald-50 dark:bg-emerald-950" : "bg-rose-50 dark:bg-rose-950";
      rowClasses = rowBgClass + " font-bold border-y border-emerald-100 dark:border-emerald-900";
    } else if (row.tone === "profit") {
      rowBgClass = overallActual >= 0 ? "bg-emerald-50 dark:bg-emerald-950" : "bg-rose-50 dark:bg-rose-950";
      rowClasses = rowBgClass + " font-semibold";
    } else {
      rowBgClass = "bg-indigo-50 dark:bg-indigo-950";
      rowClasses = rowBgClass + " font-semibold";
    }
  }

  return (
    <>
      <tr className={rowClasses}>
        <td
          className={`py-2 pr-3 align-middle ${STICKY_CELL_CLASS} ${rowBgClass}`}
          style={{ paddingLeft: `${14 + depth * 18}px`, width: STICKY_COL_WIDTH, minWidth: STICKY_COL_WIDTH, maxWidth: STICKY_COL_WIDTH }}
        >
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggle(row.key)}
                className="p-0.5 rounded hover:bg-slate-200/70 dark:hover:bg-zinc-700/50 shrink-0"
              >
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4 h-4 shrink-0" />
            )}
            <span
              className={`leading-snug ${row.isTotal ? "text-[13px]" : "text-[12px]"} ${
                row.tone === "expense" && !row.isTotal ? "text-orange-700 dark:text-orange-400" : "text-slate-700 dark:text-zinc-200"
              } ${hasChildren && !row.isTotal ? "font-semibold" : ""}`}
            >
              {row.label}
            </span>
            {row.onNavigate && (
              <button type="button" onClick={row.onNavigate} className="ml-1 text-[10.5px] text-indigo-600 hover:underline shrink-0">
                Düzenle →
              </button>
            )}
          </div>
        </td>
        {periods.map((period, i) => {
          const { plan, actual } = row.values[i];
          const variance = actual - plan;
          const variancePct = plan !== 0 ? (variance / Math.abs(plan)) * 100 : null;
          const favorable = row.tone === "expense" ? variance <= 0 : variance >= 0;
          const editable = row.getEditable?.(i);
          const net = netSalesValues[i];
          return (
            <React.Fragment key={period.key}>
              <td className="py-2 pr-2 pl-3 text-right align-middle text-[12px] tabular-nums border-l border-slate-100 dark:border-zinc-800/60 whitespace-nowrap">
                {editable ? <EditableAmountCell value={plan} onSave={editable.onSave} /> : <span className="px-1.5">{formatTRY(plan)}</span>}
              </td>
              {showPercent && (
                <td className="py-2 pr-4 text-right align-middle text-[10.5px] text-slate-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                  {formatPercentOfNet(plan, net.plan)}
                </td>
              )}
              <td className="py-2 pr-2 text-right align-middle text-[12px] tabular-nums font-medium whitespace-nowrap">{formatTRY(actual)}</td>
              {showPercent && (
                <td className="py-2 pr-4 text-right align-middle text-[10.5px] text-slate-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                  {formatPercentOfNet(actual, net.actual)}
                </td>
              )}
              <td
                className={`py-2 pr-2 text-right align-middle text-[12px] tabular-nums font-medium whitespace-nowrap ${
                  favorable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatVarianceAmount(variance)}
              </td>
              {showPercent && (
                <td className={`py-2 pr-4 text-right align-middle text-[11px] tabular-nums whitespace-nowrap ${favorable ? "text-emerald-500" : "text-rose-500"}`}>
                  {variancePct === null ? "—" : `${variancePct > 0 ? "+" : ""}${variancePct.toFixed(1)}%`}
                </td>
              )}
            </React.Fragment>
          );
        })}
      </tr>
      {hasChildren &&
        isOpen &&
        row.children!.map((child) => (
          <PLTableRow
            key={child.key}
            row={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            periods={periods}
            netSalesValues={netSalesValues}
            showPercent={showPercent}
          />
        ))}
    </>
  );
}

function RecurringTab({
  groupKey,
  entries,
  monthOptions,
  onAdd,
  onUpdate,
  onRemove,
}: {
  groupKey: PLGroupKey;
  entries: RecurringCostEntry[];
  monthOptions: string[];
  onAdd: (groupKey: PLGroupKey, categoryKey: string, allowMultiplePeople: boolean) => void;
  onUpdate: (id: string, patch: Partial<RecurringCostEntry>) => void;
  onRemove: (id: string) => void;
}) {
  const cats = categoriesForGroup(groupKey);
  return (
    <div className="space-y-4">
      {cats.map((cat) => {
        const catEntries = entries.filter((e) => e.groupKey === groupKey && e.categoryKey === cat.key);
        return (
          <div key={cat.key} className="rounded-xl border border-slate-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[14px] font-semibold text-slate-700 dark:text-zinc-200">{cat.label}</h4>
              <button
                type="button"
                onClick={() => onAdd(groupKey, cat.key, cat.allowMultiplePeople)}
                className="flex items-center gap-1 text-[12px] font-medium text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" /> Satır Ekle
              </button>
            </div>
            {catEntries.length === 0 ? (
              <p className="text-[12.5px] text-slate-400 dark:text-zinc-500">Henüz kayıt yok.</p>
            ) : (
              <div className="space-y-2">
                <div className="hidden md:grid grid-cols-12 gap-2 text-[10.5px] uppercase tracking-wide text-slate-400 dark:text-zinc-500 px-0.5">
                  <span className="col-span-3">Etiket</span>
                  <span className="col-span-2">Tip</span>
                  <span className="col-span-2">Başlangıç</span>
                  <span className="col-span-1">Bitiş</span>
                  <span className="col-span-1 text-right">Plan ₺</span>
                  <span className="col-span-2 text-right">Gerçekleşen ₺</span>
                  <span className="col-span-1" />
                </div>
                {catEntries.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-12 gap-2 items-center text-[12.5px]">
                    {cat.allowMultiplePeople || cat.allowCustomLabel ? (
                      <input
                        value={entry.personLabel ?? entry.customLabel ?? ""}
                        onChange={(e) =>
                          onUpdate(entry.id, cat.allowMultiplePeople ? { personLabel: e.target.value } : { customLabel: e.target.value })
                        }
                        placeholder={cat.allowMultiplePeople ? "Personel adı" : "Açıklama"}
                        className="col-span-3 rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-2 py-1"
                      />
                    ) : (
                      <span className="col-span-3 text-slate-500 dark:text-zinc-400 truncate">{cat.label}</span>
                    )}
                    <select
                      value={entry.mode}
                      onChange={(e) => onUpdate(entry.id, { mode: e.target.value as "recurring" | "range" })}
                      className="col-span-2 rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1.5 py-1"
                    >
                      <option value="recurring">Süreklilik</option>
                      <option value="range">Tarih Aralığı</option>
                    </select>
                    <select
                      value={entry.startMonth}
                      onChange={(e) => onUpdate(entry.id, { startMonth: e.target.value })}
                      className="col-span-2 rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1.5 py-1"
                    >
                      {monthOptions.map((m) => (
                        <option key={m} value={m}>
                          {formatMonthLabel(m)}
                        </option>
                      ))}
                    </select>
                    {entry.mode === "range" ? (
                      <select
                        value={entry.endMonth ?? entry.startMonth}
                        onChange={(e) => onUpdate(entry.id, { endMonth: e.target.value })}
                        className="col-span-1 rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1 py-1"
                      >
                        {monthOptions.map((m) => (
                          <option key={m} value={m}>
                            {formatMonthLabel(m)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="col-span-1" />
                    )}
                    <input
                      type="number"
                      value={entry.amountPlan}
                      onChange={(e) => onUpdate(entry.id, { amountPlan: parseFloat(e.target.value) || 0 })}
                      className="col-span-1 rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1.5 py-1 text-right"
                    />
                    <input
                      type="number"
                      value={entry.amountActual}
                      onChange={(e) => onUpdate(entry.id, { amountActual: parseFloat(e.target.value) || 0 })}
                      className="col-span-2 rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1.5 py-1 text-right"
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(entry.id)}
                      className="col-span-1 flex justify-end text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KdvStatCard({ label, value, tone }: { label: string; value: number; tone: "neutral" | "warn" | "info" }) {
  const toneClasses =
    tone === "warn"
      ? "border-orange-200 dark:border-orange-900/40 bg-orange-50/60 dark:bg-orange-950/20"
      : tone === "info"
      ? "border-sky-200 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/20"
      : "border-slate-200 dark:border-zinc-800";
  return (
    <div className={`rounded-xl border p-4 ${toneClasses}`}>
      <p className="text-[11.5px] uppercase tracking-wide text-slate-400 dark:text-zinc-500 mb-1.5">{label}</p>
      <p className="text-[19px] font-bold text-slate-800 dark:text-zinc-100 tabular-nums">{formatTRY(value)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

type PLSection = "pl" | "fixed" | "financing" | "tax" | "invoices" | "kdv";

const SECTIONS: { key: PLSection; label: string }[] = [
  { key: "pl", label: "P/L Tablosu" },
  { key: "fixed", label: "Sabit Giderler" },
  { key: "financing", label: "Finansman Giderleri" },
  { key: "tax", label: "Vergiler" },
  { key: "invoices", label: "Fatura Yükleme" },
  { key: "kdv", label: "KDV Yönetimi" },
];

export default function ManagementPLView() {
  const [pinOk, setPinOk] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState("2026-06");
  const [activeSection, setActiveSection] = useState<PLSection>("pl");

  const [periodMode, setPeriodMode] = useState<PLPeriodMode>("single");
  const [rangeStart, setRangeStart] = useState("2026-06");
  const [rangeEnd, setRangeEnd] = useState("2026-08");
  const [quarterYear, setQuarterYear] = useState(2026);
  const [quarterIndex, setQuarterIndex] = useState(2);

  const [consultants, setConsultants] = useState<Consultant[]>(INITIAL_CONSULTANTS);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>(INITIAL_ASSIGNMENTS);
  const [revenueInvoices, setRevenueInvoices] = useState<RevenueInvoice[]>(REVENUE_INITIAL_INVOICES);
  const [categoryPlans, setCategoryPlans] = useState<Record<string, Record<string, number>>>(DEFAULT_CATEGORY_PLANS);
  const [consultantPlans, setConsultantPlans] = useState<Record<string, Record<string, number>>>({});
  const [recurringEntries, setRecurringEntries] = useState<RecurringCostEntry[]>([]);
  const [invoices, setInvoices] = useState<PLInvoiceRecord[]>([]);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(
    new Set([
      "revenue-group",
      "variable-opex-group",
      "consultants-group",
      "other-project-expense-group",
      "fixed-group",
      "financing-group",
      "tax-group",
    ])
  );

  const invoiceFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setConsultants(CrmDb.getKv<Consultant[]>("crm_revenue_consultants", INITIAL_CONSULTANTS));
    setAssignments(CrmDb.getKv<ProjectAssignment[]>("crm_revenue_assignments", INITIAL_ASSIGNMENTS));
    setRevenueInvoices(CrmDb.getKv<RevenueInvoice[]>(REVENUE_MANAGEMENT_INVOICES_KEY, REVENUE_INITIAL_INVOICES));
    setCategoryPlans(CrmDb.getKv(PL_CATEGORY_PLANS_KEY, DEFAULT_CATEGORY_PLANS));
    setConsultantPlans(CrmDb.getKv(PL_CONSULTANT_PLANS_KEY, {}));
    setRecurringEntries(CrmDb.getKv(PL_RECURRING_ENTRIES_KEY, []));
    setInvoices(CrmDb.getKv(PL_INVOICES_KEY, []));
  }, []);

  function toggleRow(key: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleUnlock() {
    if (pinInput === PIN_CODE) {
      setPinOk(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  }

  function updateCategoryPlan(rowKey: string, month: string, value: number) {
    setCategoryPlans((prev) => {
      const next = { ...prev, [rowKey]: { ...(prev[rowKey] || {}), [month]: value } };
      CrmDb.setKv(PL_CATEGORY_PLANS_KEY, next);
      return next;
    });
  }

  function updateConsultantPlan(consultantId: string, month: string, value: number) {
    setConsultantPlans((prev) => {
      const next = { ...prev, [consultantId]: { ...(prev[consultantId] || {}), [month]: value } };
      CrmDb.setKv(PL_CONSULTANT_PLANS_KEY, next);
      return next;
    });
  }

  function addRecurringEntry(groupKey: PLGroupKey, categoryKey: string, allowMultiplePeople: boolean) {
    setRecurringEntries((prev) => {
      const existingForCat = prev.filter((e) => e.groupKey === groupKey && e.categoryKey === categoryKey);
      const newEntry: RecurringCostEntry = {
        id: crypto.randomUUID(),
        groupKey,
        categoryKey,
        personLabel: allowMultiplePeople ? `Personel ${existingForCat.length + 1}` : undefined,
        mode: "recurring",
        startMonth: selectedMonth,
        amountPlan: 0,
        amountActual: 0,
      };
      const next = [...prev, newEntry];
      CrmDb.setKv(PL_RECURRING_ENTRIES_KEY, next);
      return next;
    });
  }

  function updateRecurringEntry(id: string, patch: Partial<RecurringCostEntry>) {
    setRecurringEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
      CrmDb.setKv(PL_RECURRING_ENTRIES_KEY, next);
      return next;
    });
  }

  function removeRecurringEntry(id: string) {
    setRecurringEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      CrmDb.setKv(PL_RECURRING_ENTRIES_KEY, next);
      return next;
    });
  }

  async function handleInvoiceFiles(fileList: FileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      let storagePath: string | undefined;
      let documentId: string | undefined;
      try {
        const doc = await uploadBlobDocument({
          blob: file,
          filename: file.name,
          folder: "finance",
          tags: ["management-pl", selectedMonth],
          description: "Yönetim P/L fatura yüklemesi",
        });
        storagePath = doc.storage_path;
        documentId = doc.id;
      } catch (err) {
        console.error("Fatura dosyası yüklenemedi, sadece meta veri ile devam ediliyor.", err);
      }
      const record: PLInvoiceRecord = {
        id: crypto.randomUUID(),
        fileName: file.name,
        documentId,
        storagePath,
        uploadedAt: new Date().toISOString(),
        month: selectedMonth,
        amount: 0,
        vatRate: 20,
        tevkifatEnabled: false,
        tevkifatFraction: "",
        vatAmount: 0,
        direction: "expense",
        category: "uncategorized",
      };
      setInvoices((prev) => {
        const next = [...prev, record];
        CrmDb.setKv(PL_INVOICES_KEY, next);
        return next;
      });
    }
    if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = "";
  }

  function updateInvoice(id: string, patch: Partial<PLInvoiceRecord>) {
    setInvoices((prev) => {
      const next = prev.map((i) => {
        if (i.id !== id) return i;
        const merged = { ...i, ...patch };
        merged.vatAmount = computeVatAmount(merged.amount, merged.vatRate, merged.tevkifatEnabled, merged.tevkifatFraction);
        return merged;
      });
      CrmDb.setKv(PL_INVOICES_KEY, next);
      return next;
    });
  }

  function removeInvoice(id: string) {
    setInvoices((prev) => {
      const next = prev.filter((i) => i.id !== id);
      CrmDb.setKv(PL_INVOICES_KEY, next);
      return next;
    });
  }

  async function handleDownloadInvoice(inv: PLInvoiceRecord) {
    if (!inv.storagePath) return;
    try {
      const url = await getSignedDownloadUrl({ storage_path: inv.storagePath } as any);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("İndirme bağlantısı oluşturulamadı.", err);
    }
  }

  const periods = useMemo(
    () => buildPeriods(periodMode, selectedMonth, rangeStart, rangeEnd, quarterYear, quarterIndex),
    [periodMode, selectedMonth, rangeStart, rangeEnd, quarterYear, quarterIndex]
  );
  const showPercent = periods.length === 1;

  const plData = useMemo(() => {
    const revenueChildren: PLRow[] = REVENUE_CATEGORIES.map((cat) => {
      const rowKey = revenueRowKey(cat.key);
      return {
        key: rowKey,
        label: cat.label,
        tone: "revenue" as const,
        values: periods.map((p) => ({
          plan: getCategoryPlanForMonths(categoryPlans, rowKey, p.months),
          actual: computeRevenueActualForCategory(revenueInvoices, invoices, cat.key, p.months),
        })),
        getEditable: (i: number) =>
          periods[i].months.length === 1 ? { onSave: (v: number) => updateCategoryPlan(rowKey, periods[i].months[0], v) } : undefined,
      };
    });
    const netSalesValues = sumValues(revenueChildren, periods.length);

    // Union of every registered consultant (master list, so an Active
    // consultant with no assignment yet still shows a 0 row to plan against)
    // AND every consultantId actually referenced by an assignment in this
    // period — this second part matters because an assignment can point at
    // a consultant who is marked "Inactive" or was otherwise excluded from
    // an active-only filter, which previously made their real logged cost
    // silently disappear from both the line item and the category total.
    const relevantConsultantIds = Array.from(
      new Set<string>([...consultants.map((c) => c.id), ...assignments.map((a) => a.consultantId)])
    );
    const consultantChildren: PLRow[] = relevantConsultantIds
      // Keep every currently-Active consultant (even with zero activity, so
      // Plan can still be entered against them), plus any consultant/id
      // with real plan or actual data in the shown period regardless of
      // status — this is what surfaces a real logged cost for a consultant
      // who happens to be marked "Inactive" instead of silently dropping it.
      .filter((id) => {
        const consultant = consultants.find((c) => c.id === id);
        if (consultant?.status === "Active") return true;
        return periods.some((p) => {
          const plan = computeConsultantPlanForMonths(consultantPlans, assignments, consultants, id, p.months);
          const actual = computeConsultantTotalActualCostForMonths(revenueInvoices, invoices, consultants, id, p.months);
          return plan !== 0 || actual !== 0;
        });
      })
      .map((id) => {
        const consultant = consultants.find((c) => c.id === id);
        return {
          key: `consultant:${id}`,
          label: consultant?.name || `Danışman (${id})`,
          tone: "expense" as const,
          values: periods.map((p) => ({
            plan: computeConsultantPlanForMonths(consultantPlans, assignments, consultants, id, p.months),
            actual: computeConsultantTotalActualCostForMonths(revenueInvoices, invoices, consultants, id, p.months),
          })),
          getEditable: (i: number) =>
            periods[i].months.length === 1 ? { onSave: (v: number) => updateConsultantPlan(id, periods[i].months[0], v) } : undefined,
        };
      });
    const consultantsTotals = sumValues(consultantChildren, periods.length);

    const otherProjectExpenseChildren: PLRow[] = PROJECT_EXPENSE_CATEGORIES.map((cat) => {
      const rowKey = expenseRowKey(cat.key);
      return {
        key: rowKey,
        label: cat.label,
        tone: "expense" as const,
        values: periods.map((p) => ({
          plan: getCategoryPlanForMonths(categoryPlans, rowKey, p.months),
          actual: computeExpenseActualForCategory(invoices, cat.key, p.months),
        })),
        getEditable: (i: number) =>
          periods[i].months.length === 1 ? { onSave: (v: number) => updateCategoryPlan(rowKey, periods[i].months[0], v) } : undefined,
      };
    });
    const otherProjectExpenseTotals = sumValues(otherProjectExpenseChildren, periods.length);

    const variableOpexValues: PLValue[] = periods.map((_, i) => ({
      plan: consultantsTotals[i].plan + otherProjectExpenseTotals[i].plan,
      actual: consultantsTotals[i].actual + otherProjectExpenseTotals[i].actual,
    }));

    const grossProfitValues: PLValue[] = periods.map((_, i) => ({
      plan: netSalesValues[i].plan - variableOpexValues[i].plan,
      actual: netSalesValues[i].actual - variableOpexValues[i].actual,
    }));

    const fixedGroup = buildRecurringGroupRows(recurringEntries, "fixed", periods);
    const operatingProfitValues: PLValue[] = periods.map((_, i) => ({
      plan: grossProfitValues[i].plan - fixedGroup.totals[i].plan,
      actual: grossProfitValues[i].actual - fixedGroup.totals[i].actual,
    }));

    const financingGroup = buildRecurringGroupRows(recurringEntries, "financing", periods);
    const taxGroup = buildRecurringGroupRows(recurringEntries, "tax", periods);

    const netProfitValues: PLValue[] = periods.map((_, i) => ({
      plan: operatingProfitValues[i].plan - financingGroup.totals[i].plan - taxGroup.totals[i].plan,
      actual: operatingProfitValues[i].actual - financingGroup.totals[i].actual - taxGroup.totals[i].actual,
    }));

    const rows: PLRow[] = [
      { key: "revenue-group", label: "NET SATIŞ GELİRLERİ", tone: "revenue", values: netSalesValues, children: revenueChildren },
      { key: "net-sales-total", label: "TOPLAM NET SATIŞ", tone: "profit", isTotal: true, values: netSalesValues },
      {
        key: "variable-opex-group",
        label: "DEĞİŞKEN OPERASYON GİDERLERİ (Direkt Proje Maliyetleri)",
        tone: "expense",
        values: variableOpexValues,
        children: [
          {
            key: "consultants-group",
            label: "Danışman Maliyetleri",
            tone: "expense",
            values: consultantsTotals,
            children: consultantChildren,
          },
          {
            key: "other-project-expense-group",
            label: "Diğer Proje Giderleri",
            tone: "expense",
            values: otherProjectExpenseTotals,
            children: otherProjectExpenseChildren,
          },
        ],
      },
      { key: "gross-profit", label: "BRÜT KAR", tone: "profit", isTotal: true, values: grossProfitValues },
      {
        key: "fixed-group",
        label: groupLabel("fixed"),
        tone: "expense",
        values: fixedGroup.totals,
        children: fixedGroup.rows,
        onNavigate: () => setActiveSection("fixed"),
      },
      { key: "operating-profit", label: "FAALİYET KARI", tone: "profit", isTotal: true, values: operatingProfitValues },
      {
        key: "financing-group",
        label: groupLabel("financing"),
        tone: "expense",
        values: financingGroup.totals,
        children: financingGroup.rows,
        onNavigate: () => setActiveSection("financing"),
      },
      {
        key: "tax-group",
        label: groupLabel("tax"),
        tone: "expense",
        values: taxGroup.totals,
        children: taxGroup.rows,
        onNavigate: () => setActiveSection("tax"),
      },
      { key: "net-profit", label: "NET KAR", tone: "final", isTotal: true, values: netProfitValues },
    ];

    return { rows, netSalesValues };
  }, [categoryPlans, consultantPlans, consultants, assignments, invoices, revenueInvoices, recurringEntries, periods]);

  const kdvSummary = useMemo(() => computeKdvSummary(invoices, selectedMonth), [invoices, selectedMonth]);

  // Diagnostic snapshot of the raw source data behind the "Danışman
  // Maliyetleri" figures, scoped to whatever period is currently selected.
  // Added because ₺0 consultant costs were repeatedly reported even after
  // fixing the Active-only filter and adding the invoice-based cost source
  // — this makes the two remaining silent failure modes visible instead of
  // guessed at: (1) a matching invoice whose "Teslim Edilen Gün" field is
  // 0/blank, which zeroes the cost regardless of a correct name match, and
  // (2) a consultant name on an invoice that doesn't exactly match any name
  // in the Danışman Master list (typo, extra space, Turkish-character
  // difference), which silently drops that invoice from the calculation.
  const diagnostics = useMemo(() => {
    const periodMonths = Array.from(new Set(periods.flatMap((p) => p.months)));
    const invoicesInPeriod = revenueInvoices.filter((inv) => periodMonths.includes(inv.month));
    const invoicesWithNames = invoicesInPeriod.filter((inv) => (inv.consultantNames || []).some((n) => n && n.trim()));
    const invoicesWithNamesNoDays = invoicesWithNames.filter((inv) => !inv.deliveredDays || inv.deliveredDays <= 0);
    const assignmentsInPeriod = assignments.filter((a) => periodMonths.includes(a.month));
    const masterNames = new Set(consultants.map((c) => normalizeConsultantName(c.name)));
    const invoiceNamesSet = new Set<string>();
    invoicesWithNames.forEach((inv) => (inv.consultantNames || []).forEach((n) => n && n.trim() && invoiceNamesSet.add(n.trim())));
    const unmatchedNames = Array.from(invoiceNamesSet).filter((n) => !masterNames.has(normalizeConsultantName(n)));
    return {
      consultantCount: consultants.length,
      assignmentCount: assignments.length,
      assignmentsInPeriodCount: assignmentsInPeriod.length,
      invoiceCount: revenueInvoices.length,
      invoicesInPeriodCount: invoicesInPeriod.length,
      invoicesWithNamesCount: invoicesWithNames.length,
      invoicesWithNamesNoDaysCount: invoicesWithNamesNoDays.length,
      unmatchedNames,
    };
  }, [periods, revenueInvoices, assignments, consultants]);

  if (!pinOk) {
    // Root cause of the oversized card (found by reading index.css): a
    // global rule `[class*="p-6"]:not(button):not(input) { max-width: 1600px
    // !important; width: 100% !important; ... }` matches ANY element whose
    // className contains the substring "p-6" (or "p-8") ANYWHERE — this
    // card used Tailwind's "p-6" padding class, which silently tripped that
    // rule and forced it to full width regardless of max-w-sm or even an
    // inline maxWidth style (author-stylesheet !important beats a plain,
    // non-!important inline style). Padding is applied via inline style
    // instead of a "p-6"/"p-8" Tailwind class so the substring match never
    // fires at all, and max-width/width are then free to actually apply.
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div
          className="w-full mx-auto rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm text-center"
          style={{ maxWidth: 300, padding: 20 }}
        >
          <div className="w-9 h-9 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-3">
            <Lock className="w-4 h-4 text-indigo-600" />
          </div>
          <h2 className="text-[14.5px] font-semibold text-slate-800 dark:text-zinc-100 mb-1">Yönetim P/L</h2>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-3.5">Bu sayfaya erişmek için şifre gereklidir.</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setPinError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="••••"
            autoFocus
            className={`w-full text-center tracking-[0.4em] text-[15px] rounded-lg border ${
              pinError ? "border-rose-400" : "border-slate-200 dark:border-zinc-700"
            } bg-transparent py-1.5 mb-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400`}
          />
          {pinError && <p className="text-[11px] text-rose-500 mb-2.5">Hatalı şifre, tekrar deneyin.</p>}
          <button
            type="button"
            onClick={handleUnlock}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold py-1.5 transition-colors"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-slate-800 dark:text-zinc-100">
            Yönetim P/L <span className="text-slate-400 dark:text-zinc-500 font-medium text-[14px]">(Management P/L)</span>
          </h1>
          <p className="text-[12.5px] text-slate-400 dark:text-zinc-500 mt-0.5">
            Fatura Yükleme &amp; KDV Yönetimi ayı: {formatMonthLabel(selectedMonth)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-[13px] font-medium"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setPinOk(false);
              setPinInput("");
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 px-3 py-2 text-[12.5px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" /> Kilitle
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-zinc-800">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setActiveSection(s.key)}
            className={`px-3.5 py-2 text-[13px] font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              activeSection === s.key
                ? "border-indigo-600 text-indigo-700 dark:text-indigo-400"
                : "border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        {activeSection === "pl" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-zinc-700 p-1">
                {(["single", "range", "quarter"] as PLPeriodMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPeriodMode(mode)}
                    className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
                      periodMode === mode
                        ? "bg-indigo-600 text-white"
                        : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {mode === "single" ? "Tek Ay" : mode === "range" ? "Aralık (Ay Ay)" : "Çeyrek"}
                  </button>
                ))}
              </div>

              {periodMode === "single" && (
                <p className="text-[12px] text-slate-400 dark:text-zinc-500">
                  Üstteki ay seçimi kullanılıyor: <span className="font-medium text-slate-500 dark:text-zinc-400">{formatMonthLabel(selectedMonth)}</span>
                </p>
              )}

              {periodMode === "range" && (
                <div className="flex items-center gap-2 text-[12.5px]">
                  <span className="text-slate-400 dark:text-zinc-500">Başlangıç</span>
                  <select
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {formatMonthLabel(m)}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-400 dark:text-zinc-500">Bitiş</span>
                  <select
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {formatMonthLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {periodMode === "quarter" && (
                <div className="flex items-center gap-2 text-[12.5px]">
                  <input
                    type="number"
                    value={quarterYear}
                    onChange={(e) => setQuarterYear(parseInt(e.target.value, 10) || quarterYear)}
                    className="w-20 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5"
                  />
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuarterIndex(q)}
                        className={`px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
                          quarterIndex === q
                            ? "bg-indigo-600 text-white"
                            : "border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        Ç{q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 text-[12px] text-amber-900 dark:text-amber-200 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Veri Kontrolü — {periods.map((p) => p.shortLabel).join(", ")}
              </p>
              <p className="leading-relaxed">
                Danışman Master listesi: <b>{diagnostics.consultantCount}</b> kayıtlı · Danışman Atamaları:{" "}
                <b>{diagnostics.assignmentCount}</b> toplam, <b>{diagnostics.assignmentsInPeriodCount}</b> tanesi seçili
                dönemde · Gelir Yönetimi Faturaları: <b>{diagnostics.invoiceCount}</b> toplam,{" "}
                <b>{diagnostics.invoicesInPeriodCount}</b> tanesi seçili dönemde, <b>{diagnostics.invoicesWithNamesCount}</b>{" "}
                tanesinde danışman adı etiketi var.
              </p>
              {diagnostics.invoicesWithNamesNoDaysCount > 0 && (
                <p className="leading-relaxed text-rose-700 dark:text-rose-300">
                  ⚠ <b>{diagnostics.invoicesWithNamesNoDaysCount}</b> faturada danışman adı etiketlenmiş ama "Teslim Edilen
                  Gün" alanı 0/boş — gün sayısı olmadan maliyet 0 ₺ hesaplanır. Gelir Yönetimi → ilgili faturayı düzenle
                  ekranından gün sayısını girin.
                </p>
              )}
              {diagnostics.unmatchedNames.length > 0 && (
                <p className="leading-relaxed text-rose-700 dark:text-rose-300">
                  ⚠ Faturalarda geçen ama Danışman Master listesiyle birebir eşleşmeyen adlar:{" "}
                  <b>{diagnostics.unmatchedNames.join(", ")}</b>. Yazım farkı (fazladan boşluk, farklı karakter) eşleşmeyi
                  engeller — Master listedeki adla birebir aynı olmalı.
                </p>
              )}
              {diagnostics.invoicesWithNamesCount === 0 && diagnostics.assignmentsInPeriodCount === 0 && (
                <p className="leading-relaxed text-rose-700 dark:text-rose-300">
                  ⚠ Seçili dönemde ne danışman atama kaydı ne de danışman adı etiketli fatura bulunuyor — maliyetin ₺0
                  görünmesinin sebebi budur. Gelir Yönetimi'nde ilgili ay için faturanın "Danışman" kolonu dolu mu ve ay
                  etiketi doğru mu kontrol edin.
                </p>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
              <table className="w-full border-separate border-spacing-0 min-w-[860px]">
                <thead>
                  {periods.length > 1 && (
                    <tr className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                      <th
                        className={`py-1.5 pl-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 ${STICKY_CELL_CLASS}`}
                        style={{ width: STICKY_COL_WIDTH, minWidth: STICKY_COL_WIDTH, maxWidth: STICKY_COL_WIDTH }}
                      />
                      {periods.map((p) => (
                        <th
                          key={p.key}
                          colSpan={showPercent ? 6 : 3}
                          className="py-1.5 text-center font-semibold border-l border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60"
                        >
                          {p.shortLabel}
                        </th>
                      ))}
                    </tr>
                  )}
                  <tr className="text-[10.5px] uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                    <th
                      className={`text-left py-2 pl-4 font-semibold border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 ${STICKY_CELL_CLASS}`}
                      style={{ width: STICKY_COL_WIDTH, minWidth: STICKY_COL_WIDTH, maxWidth: STICKY_COL_WIDTH }}
                    >
                      Kalem
                    </th>
                    {periods.map((p) => (
                      <React.Fragment key={p.key}>
                        <th className="text-right py-2 pr-2 pl-3 font-semibold border-l border-b border-slate-100 dark:border-zinc-800/60 whitespace-nowrap">Plan (₺)</th>
                        {showPercent && <th className="text-right py-2 pr-4 font-semibold border-b border-slate-100 dark:border-zinc-800/60 whitespace-nowrap">Plan %</th>}
                        <th className="text-right py-2 pr-2 font-semibold border-b border-slate-100 dark:border-zinc-800/60 whitespace-nowrap">Gerçekleşen (₺)</th>
                        {showPercent && <th className="text-right py-2 pr-4 font-semibold border-b border-slate-100 dark:border-zinc-800/60 whitespace-nowrap">Gerçekleşen %</th>}
                        <th className="text-right py-2 pr-2 font-semibold border-b border-slate-100 dark:border-zinc-800/60 whitespace-nowrap">Fark (₺)</th>
                        {showPercent && <th className="text-right py-2 pr-4 font-semibold border-b border-slate-100 dark:border-zinc-800/60 whitespace-nowrap">Fark %</th>}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {plData.rows.map((row) => (
                    <PLTableRow
                      key={row.key}
                      row={row}
                      depth={0}
                      expanded={expandedRows}
                      onToggle={toggleRow}
                      periods={periods}
                      netSalesValues={plData.netSalesValues}
                      showPercent={showPercent}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === "fixed" && (
          <RecurringTab
            groupKey="fixed"
            entries={recurringEntries}
            monthOptions={monthOptions}
            onAdd={addRecurringEntry}
            onUpdate={updateRecurringEntry}
            onRemove={removeRecurringEntry}
          />
        )}

        {activeSection === "financing" && (
          <RecurringTab
            groupKey="financing"
            entries={recurringEntries}
            monthOptions={monthOptions}
            onAdd={addRecurringEntry}
            onUpdate={updateRecurringEntry}
            onRemove={removeRecurringEntry}
          />
        )}

        {activeSection === "tax" && (
          <RecurringTab
            groupKey="tax"
            entries={recurringEntries}
            monthOptions={monthOptions}
            onAdd={addRecurringEntry}
            onUpdate={updateRecurringEntry}
            onRemove={removeRecurringEntry}
          />
        )}

        {activeSection === "invoices" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/20 p-3 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-sky-800 dark:text-sky-300 leading-relaxed">
                Danışmanlık/Eğitim satış gelirleri ve danışman maliyetleri, Gelir Yönetimi'nde kayıtlı gerçek fatura ve atama
                verilerinden otomatik çekiliyor. Bu panel yalnızca buradaki sistemin kapsamadığı kalemler için: Yazılım/Diğer
                Hizmet gelirleri, Ulaşım/Konaklama/Organizasyon/Yazılım proje giderleri, ve Gelir Yönetimi'ne hiç girmemiş bir
                "Danışman Faturası" varsa (kategori olarak seçip danışmanı işaretleyin — doğrudan Danışman Maliyetleri'ne
                yazılır). Her satırda faturanın kime ait olduğunu (danışman veya tedarikçi/kişi) "Kime Ait" sütunundan girin.
              </p>
            </div>
            <div
              onClick={() => invoiceFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length) handleInvoiceFiles(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10 transition-colors"
            >
              <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
              <p className="text-[13px] text-slate-500 dark:text-zinc-400">
                E-arşiv / e-fatura dosyalarını sürükleyip bırakın veya tıklayıp seçin.
              </p>
              <input
                ref={invoiceFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleInvoiceFiles(e.target.files)}
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
              <table className="w-full min-w-[1020px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-[11px] uppercase text-slate-400 dark:text-zinc-500 border-b border-slate-200 dark:border-zinc-800">
                    <th className="text-left py-2 pl-3">Dosya</th>
                    <th className="text-left py-2 px-2">Ay</th>
                    <th className="text-left py-2 px-2">Kategori</th>
                    <th className="text-left py-2 px-2">Kime Ait</th>
                    <th className="text-right py-2 px-2">Tutar (₺, KDV Hariç)</th>
                    <th className="text-right py-2 px-2">KDV %</th>
                    <th className="text-center py-2 px-2">Tevkifat</th>
                    <th className="text-right py-2 px-2">KDV Tutarı</th>
                    <th className="text-left py-2 px-2">Açıklama</th>
                    <th className="py-2 pr-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {invoices
                    .slice()
                    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
                    .map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/40">
                        <td className="py-2 pl-3">
                          <div className="flex items-center gap-1.5 max-w-[170px]">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate" title={inv.fileName}>
                              {inv.fileName}
                            </span>
                            {inv.storagePath && (
                              <button
                                type="button"
                                onClick={() => handleDownloadInvoice(inv)}
                                className="text-indigo-500 hover:text-indigo-700 shrink-0"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={inv.month}
                            onChange={(e) => updateInvoice(inv.id, { month: e.target.value })}
                            className="rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1.5 py-1"
                          >
                            {monthOptions.map((m) => (
                              <option key={m} value={m}>
                                {formatMonthLabel(m)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={inv.category}
                            onChange={(e) => {
                              const key = e.target.value as PLInvoiceCategoryKey | "uncategorized";
                              const match = ALL_INVOICE_CATEGORIES.find((c) => c.key === key);
                              updateInvoice(inv.id, { category: key, direction: match ? match.direction : inv.direction });
                            }}
                            className="rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1.5 py-1"
                          >
                            <option value="uncategorized">Tanımlanmadı</option>
                            <optgroup label="Gelir">
                              {REVENUE_CATEGORIES.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.label}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Gider">
                              <option value={CONSULTANT_INVOICE_CATEGORY.key}>{CONSULTANT_INVOICE_CATEGORY.label}</option>
                              {PROJECT_EXPENSE_CATEGORIES.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.label}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          {inv.category === "consultant_fee" ? (
                            <select
                              value={inv.consultantId ?? ""}
                              onChange={(e) => {
                                const cId = e.target.value;
                                const c = consultants.find((x) => x.id === cId);
                                updateInvoice(inv.id, { consultantId: cId || undefined, vendorName: c?.name });
                              }}
                              className="rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1.5 py-1 max-w-[140px]"
                            >
                              <option value="">Danışman seçin...</option>
                              {consultants.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={inv.vendorName ?? ""}
                              onChange={(e) => updateInvoice(inv.id, { vendorName: e.target.value })}
                              placeholder="Tedarikçi/kişi..."
                              className="w-28 rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1.5 py-1"
                            />
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            value={inv.amount}
                            onChange={(e) => updateInvoice(inv.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="w-24 rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1.5 py-1 text-right"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            value={inv.vatRate}
                            onChange={(e) => updateInvoice(inv.id, { vatRate: parseFloat(e.target.value) || 0 })}
                            className="w-16 rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1.5 py-1 text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="checkbox"
                              checked={inv.tevkifatEnabled}
                              onChange={(e) => updateInvoice(inv.id, { tevkifatEnabled: e.target.checked })}
                            />
                            {inv.tevkifatEnabled && (
                              <input
                                value={inv.tevkifatFraction}
                                onChange={(e) => updateInvoice(inv.id, { tevkifatFraction: e.target.value })}
                                placeholder="9/10"
                                className="w-14 rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1 py-0.5 text-center text-[11px]"
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-medium">{formatTRY(inv.vatAmount)}</td>
                        <td className="py-2 px-2">
                          <input
                            value={inv.description ?? ""}
                            onChange={(e) => updateInvoice(inv.id, { description: e.target.value })}
                            placeholder="Not..."
                            className="w-32 rounded border border-slate-200 dark:border-zinc-700 bg-transparent px-1.5 py-1"
                          />
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <button type="button" onClick={() => removeInvoice(inv.id)} className="text-slate-400 hover:text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-slate-400 text-[12.5px]">
                        Henüz fatura yüklenmedi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === "kdv" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[12.5px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Bu kart yalnızca bilgilendirme amaçlıdır. KDV, gelir veya gider olarak hesaplanmaz ve Net Kâr hesaplamasına
                hiçbir şekilde dahil edilmez.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KdvStatCard label="Hesaplanan KDV" value={kdvSummary.hesaplanan} tone="neutral" />
              <KdvStatCard label="İndirilecek KDV" value={kdvSummary.indirilecek} tone="neutral" />
              <KdvStatCard label="Ödenecek KDV" value={kdvSummary.odenecek} tone="warn" />
              <KdvStatCard label="Devreden KDV" value={kdvSummary.devreden} tone="info" />
            </div>
            <p className="text-[11.5px] text-slate-400 dark:text-zinc-500">
              Hesaplama: Ödenecek/Devreden KDV = Hesaplanan KDV − İndirilecek KDV ({formatMonthLabel(selectedMonth)}).
              Tevkifatlı faturalarda KDV tutarı, satıcının beyan ettiği pay üzerinden hesaplanır. Kesin beyan için mali
              müşavirinizle teyit edin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
