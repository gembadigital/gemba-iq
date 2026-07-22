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
import { Consultant, ProjectAssignment, INITIAL_CONSULTANTS, INITIAL_ASSIGNMENTS } from "../data/revenueData";
import {
  PLGroupKey,
  RecurringCostEntry,
  categoriesForGroup,
  groupLabel,
  entryAppliesToMonth,
  entryDisplayLabel,
  REVENUE_CATEGORIES,
  PROJECT_EXPENSE_CATEGORIES,
  ALL_INVOICE_CATEGORIES,
  PLInvoiceRecord,
  PLInvoiceCategoryKey,
  computeVatAmount,
  computeKdvSummary,
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
  getCategoryPlan,
} from "../data/managementPlData";

const PIN_CODE = "1234";

// ---------------------------------------------------------------------------
// Seed / demo data — mirrors the exact example given when this page was
// specified (Haziran 2026: Net Satış Geliri Plan 1.500.000, Gerçekleşen
// 1.650.000). Replaced organically as the user edits plans / uploads real
// invoices; both are just KV-backed state with these as the fallback.
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORY_PLANS: Record<string, Record<string, number>> = {
  [revenueRowKey("consulting")]: { "2026-06": 1_500_000 },
};

const DEFAULT_SEED_INVOICES: PLInvoiceRecord[] = [
  {
    id: "pl-inv-seed-1",
    fileName: "Örnek Fatura - Haziran 2026.pdf",
    uploadedAt: "2026-06-28T00:00:00.000Z",
    month: "2026-06",
    amount: 1_650_000,
    vatRate: 20,
    tevkifatEnabled: false,
    tevkifatFraction: "",
    vatAmount: 330_000,
    direction: "revenue",
    category: "consulting",
    description: "Örnek veri — gerçek faturalarınızı yükleyerek bunun yerine geçirin.",
  },
];

// ---------------------------------------------------------------------------
// Pure calculation helpers
// ---------------------------------------------------------------------------

function computeConsultantActualCost(
  assignments: ProjectAssignment[],
  consultants: Consultant[],
  consultantId: string,
  month: string
): number {
  const consultant = consultants.find((c) => c.id === consultantId);
  return assignments
    .filter((a) => a.consultantId === consultantId && a.month === month)
    .reduce((sum, a) => sum + a.allocatedDays * (a.consultantDailyRate ?? consultant?.dailyCost ?? 0), 0);
}

function computeCategoryActualFromInvoices(
  invoices: PLInvoiceRecord[],
  category: string,
  direction: "revenue" | "expense",
  month: string
): number {
  return invoices
    .filter((i) => i.category === category && i.direction === direction && i.month === month)
    .reduce((sum, i) => sum + i.amount, 0);
}

interface PLRow {
  key: string;
  label: string;
  plan: number;
  actual: number;
  tone?: "revenue" | "expense" | "profit" | "final";
  isTotal?: boolean;
  children?: PLRow[];
  editable?: { onSave: (v: number) => void };
  onNavigate?: () => void;
}

function buildRecurringGroupRows(
  entries: RecurringCostEntry[],
  groupKey: PLGroupKey,
  month: string
): { rows: PLRow[]; planTotal: number; actualTotal: number } {
  const cats = categoriesForGroup(groupKey);
  const rows: PLRow[] = cats.map((cat) => {
    const catEntries = entries.filter(
      (e) => e.groupKey === groupKey && e.categoryKey === cat.key && entryAppliesToMonth(e, month)
    );
    const plan = catEntries.reduce((s, e) => s + e.amountPlan, 0);
    const actual = catEntries.reduce((s, e) => s + e.amountActual, 0);
    const children: PLRow[] | undefined =
      catEntries.length > 0
        ? catEntries.map((e) => ({
            key: `entry:${e.id}`,
            label: entryDisplayLabel(e),
            plan: e.amountPlan,
            actual: e.amountActual,
            tone: "expense" as const,
          }))
        : undefined;
    return {
      key: `${groupKey}:${cat.key}`,
      label: cat.label,
      plan,
      actual,
      tone: "expense" as const,
      children,
    };
  });
  const planTotal = rows.reduce((s, r) => s + r.plan, 0);
  const actualTotal = rows.reduce((s, r) => s + r.actual, 0);
  return { rows, planTotal, actualTotal };
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
        className="w-28 text-right rounded border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-right w-full hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded px-1.5 py-0.5 transition-colors"
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
  netSalesPlan,
  netSalesActual,
}: {
  row: PLRow;
  depth: number;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  netSalesPlan: number;
  netSalesActual: number;
}) {
  const hasChildren = !!row.children?.length;
  const isOpen = expanded.has(row.key);
  const variance = row.actual - row.plan;
  const variancePct = row.plan !== 0 ? (variance / Math.abs(row.plan)) * 100 : null;
  const favorable = row.tone === "expense" ? variance <= 0 : variance >= 0;

  let rowClasses = "hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors";
  if (row.isTotal) {
    if (row.tone === "final") {
      rowClasses =
        (row.actual >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/30") +
        " font-bold border-y border-emerald-100 dark:border-emerald-900/40";
    } else if (row.tone === "profit") {
      rowClasses =
        (row.actual >= 0 ? "bg-emerald-50/70 dark:bg-emerald-950/20" : "bg-rose-50/70 dark:bg-rose-950/20") +
        " font-semibold";
    } else {
      rowClasses = "bg-indigo-50/60 dark:bg-indigo-950/20 font-semibold";
    }
  }

  return (
    <>
      <tr className={rowClasses}>
        <td className="py-2.5 pr-3" style={{ paddingLeft: `${16 + depth * 20}px` }}>
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
              className={`${row.isTotal ? "text-[14px]" : "text-[13px]"} ${
                row.tone === "expense" && !row.isTotal ? "text-orange-700 dark:text-orange-400" : "text-slate-700 dark:text-zinc-200"
              } ${hasChildren && !row.isTotal ? "font-semibold" : ""}`}
            >
              {row.label}
            </span>
            {row.onNavigate && (
              <button type="button" onClick={row.onNavigate} className="ml-1 text-[11px] text-indigo-600 hover:underline shrink-0">
                Düzenle →
              </button>
            )}
          </div>
        </td>
        <td className="py-2.5 pr-2 text-right text-[13px] tabular-nums">
          {row.editable ? (
            <EditableAmountCell value={row.plan} onSave={row.editable.onSave} />
          ) : (
            <span className="px-1.5">{formatTRY(row.plan)}</span>
          )}
        </td>
        <td className="py-2.5 pr-4 text-right text-[11.5px] text-slate-400 dark:text-zinc-500 tabular-nums">
          {formatPercentOfNet(row.plan, netSalesPlan)}
        </td>
        <td className="py-2.5 pr-2 text-right text-[13px] tabular-nums font-medium">{formatTRY(row.actual)}</td>
        <td className="py-2.5 pr-4 text-right text-[11.5px] text-slate-400 dark:text-zinc-500 tabular-nums">
          {formatPercentOfNet(row.actual, netSalesActual)}
        </td>
        <td
          className={`py-2.5 pr-2 text-right text-[13px] tabular-nums font-medium ${
            favorable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {formatVarianceAmount(variance)}
        </td>
        <td
          className={`py-2.5 pr-4 text-right text-[12px] tabular-nums ${
            favorable ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {variancePct === null ? "—" : `${variancePct > 0 ? "+" : ""}${variancePct.toFixed(1)}%`}
        </td>
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
            netSalesPlan={netSalesPlan}
            netSalesActual={netSalesActual}
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

  const [consultants, setConsultants] = useState<Consultant[]>(INITIAL_CONSULTANTS);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>(INITIAL_ASSIGNMENTS);
  const [categoryPlans, setCategoryPlans] = useState<Record<string, Record<string, number>>>(DEFAULT_CATEGORY_PLANS);
  const [consultantPlans, setConsultantPlans] = useState<Record<string, Record<string, number>>>({});
  const [recurringEntries, setRecurringEntries] = useState<RecurringCostEntry[]>([]);
  const [invoices, setInvoices] = useState<PLInvoiceRecord[]>(DEFAULT_SEED_INVOICES);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(
    new Set(["revenue-group", "variable-opex-group", "fixed-group", "financing-group", "tax-group"])
  );

  const invoiceFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setConsultants(CrmDb.getKv<Consultant[]>("crm_revenue_consultants", INITIAL_CONSULTANTS));
    setAssignments(CrmDb.getKv<ProjectAssignment[]>("crm_revenue_assignments", INITIAL_ASSIGNMENTS));
    setCategoryPlans(CrmDb.getKv(PL_CATEGORY_PLANS_KEY, DEFAULT_CATEGORY_PLANS));
    setConsultantPlans(CrmDb.getKv(PL_CONSULTANT_PLANS_KEY, {}));
    setRecurringEntries(CrmDb.getKv(PL_RECURRING_ENTRIES_KEY, []));
    setInvoices(CrmDb.getKv(PL_INVOICES_KEY, DEFAULT_SEED_INVOICES));
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

  function updateCategoryPlan(rowKey: string, value: number) {
    setCategoryPlans((prev) => {
      const next = { ...prev, [rowKey]: { ...(prev[rowKey] || {}), [selectedMonth]: value } };
      CrmDb.setKv(PL_CATEGORY_PLANS_KEY, next);
      return next;
    });
  }

  function updateConsultantPlan(consultantId: string, value: number) {
    setConsultantPlans((prev) => {
      const next = { ...prev, [consultantId]: { ...(prev[consultantId] || {}), [selectedMonth]: value } };
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

  const plData = useMemo(() => {
    const revenueChildren: PLRow[] = REVENUE_CATEGORIES.map((cat) => {
      const rowKey = revenueRowKey(cat.key);
      return {
        key: rowKey,
        label: cat.label,
        plan: getCategoryPlan(categoryPlans, rowKey, selectedMonth),
        actual: computeCategoryActualFromInvoices(invoices, cat.key, "revenue", selectedMonth),
        tone: "revenue" as const,
        editable: { onSave: (v: number) => updateCategoryPlan(rowKey, v) },
      };
    });
    const netSalesPlan = revenueChildren.reduce((s, r) => s + r.plan, 0);
    const netSalesActual = revenueChildren.reduce((s, r) => s + r.actual, 0);

    const consultantChildren: PLRow[] = consultants
      .filter((c) => c.status === "Active")
      .map((c) => ({
        key: `consultant:${c.id}`,
        label: c.name,
        plan: consultantPlans[c.id]?.[selectedMonth] ?? 0,
        actual: computeConsultantActualCost(assignments, consultants, c.id, selectedMonth),
        tone: "expense" as const,
        editable: { onSave: (v: number) => updateConsultantPlan(c.id, v) },
      }));
    const consultantsPlanTotal = consultantChildren.reduce((s, r) => s + r.plan, 0);
    const consultantsActualTotal = consultantChildren.reduce((s, r) => s + r.actual, 0);

    const otherProjectExpenseChildren: PLRow[] = PROJECT_EXPENSE_CATEGORIES.map((cat) => {
      const rowKey = expenseRowKey(cat.key);
      return {
        key: rowKey,
        label: cat.label,
        plan: getCategoryPlan(categoryPlans, rowKey, selectedMonth),
        actual: computeCategoryActualFromInvoices(invoices, cat.key, "expense", selectedMonth),
        tone: "expense" as const,
        editable: { onSave: (v: number) => updateCategoryPlan(rowKey, v) },
      };
    });
    const otherProjectExpensePlanTotal = otherProjectExpenseChildren.reduce((s, r) => s + r.plan, 0);
    const otherProjectExpenseActualTotal = otherProjectExpenseChildren.reduce((s, r) => s + r.actual, 0);

    const variableOpexPlan = consultantsPlanTotal + otherProjectExpensePlanTotal;
    const variableOpexActual = consultantsActualTotal + otherProjectExpenseActualTotal;

    const grossProfitPlan = netSalesPlan - variableOpexPlan;
    const grossProfitActual = netSalesActual - variableOpexActual;

    const fixedGroup = buildRecurringGroupRows(recurringEntries, "fixed", selectedMonth);
    const operatingProfitPlan = grossProfitPlan - fixedGroup.planTotal;
    const operatingProfitActual = grossProfitActual - fixedGroup.actualTotal;

    const financingGroup = buildRecurringGroupRows(recurringEntries, "financing", selectedMonth);
    const taxGroup = buildRecurringGroupRows(recurringEntries, "tax", selectedMonth);

    const netProfitPlan = operatingProfitPlan - financingGroup.planTotal - taxGroup.planTotal;
    const netProfitActual = operatingProfitActual - financingGroup.actualTotal - taxGroup.actualTotal;

    const rows: PLRow[] = [
      {
        key: "revenue-group",
        label: "NET SATIŞ GELİRLERİ",
        plan: netSalesPlan,
        actual: netSalesActual,
        tone: "revenue",
        children: revenueChildren,
      },
      { key: "net-sales-total", label: "TOPLAM NET SATIŞ", plan: netSalesPlan, actual: netSalesActual, tone: "profit", isTotal: true },
      {
        key: "variable-opex-group",
        label: "DEĞİŞKEN OPERASYON GİDERLERİ (Direkt Proje Maliyetleri)",
        plan: variableOpexPlan,
        actual: variableOpexActual,
        tone: "expense",
        children: [
          {
            key: "consultants-group",
            label: "Danışman Maliyetleri",
            plan: consultantsPlanTotal,
            actual: consultantsActualTotal,
            tone: "expense",
            children: consultantChildren,
          },
          {
            key: "other-project-expense-group",
            label: "Diğer Proje Giderleri",
            plan: otherProjectExpensePlanTotal,
            actual: otherProjectExpenseActualTotal,
            tone: "expense",
            children: otherProjectExpenseChildren,
          },
        ],
      },
      { key: "gross-profit", label: "BRÜT KAR", plan: grossProfitPlan, actual: grossProfitActual, tone: "profit", isTotal: true },
      {
        key: "fixed-group",
        label: groupLabel("fixed"),
        plan: fixedGroup.planTotal,
        actual: fixedGroup.actualTotal,
        tone: "expense",
        children: fixedGroup.rows,
        onNavigate: () => setActiveSection("fixed"),
      },
      { key: "operating-profit", label: "FAALİYET KARI", plan: operatingProfitPlan, actual: operatingProfitActual, tone: "profit", isTotal: true },
      {
        key: "financing-group",
        label: groupLabel("financing"),
        plan: financingGroup.planTotal,
        actual: financingGroup.actualTotal,
        tone: "expense",
        children: financingGroup.rows,
        onNavigate: () => setActiveSection("financing"),
      },
      {
        key: "tax-group",
        label: groupLabel("tax"),
        plan: taxGroup.planTotal,
        actual: taxGroup.actualTotal,
        tone: "expense",
        children: taxGroup.rows,
        onNavigate: () => setActiveSection("tax"),
      },
      { key: "net-profit", label: "NET KAR", plan: netProfitPlan, actual: netProfitActual, tone: "final", isTotal: true },
    ];

    return { rows, netSalesPlan, netSalesActual };
  }, [categoryPlans, consultantPlans, consultants, assignments, invoices, recurringEntries, selectedMonth]);

  const kdvSummary = useMemo(() => computeKdvSummary(invoices, selectedMonth), [invoices, selectedMonth]);

  if (!pinOk) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-[17px] font-semibold text-slate-800 dark:text-zinc-100 mb-1">Yönetim P/L</h2>
          <p className="text-[12.5px] text-slate-400 dark:text-zinc-500 mb-5">Bu sayfaya erişmek için şifre gereklidir.</p>
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
            className={`w-full text-center tracking-[0.5em] text-lg rounded-lg border ${
              pinError ? "border-rose-400" : "border-slate-200 dark:border-zinc-700"
            } bg-transparent py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400`}
          />
          {pinError && <p className="text-[12px] text-rose-500 mb-3">Hatalı şifre, tekrar deneyin.</p>}
          <button
            type="button"
            onClick={handleUnlock}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13.5px] font-semibold py-2.5 transition-colors"
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
            Planlanan vs. Gerçekleşen — {formatMonthLabel(selectedMonth)}
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
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
            <table className="w-full border-collapse min-w-[860px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-zinc-500 border-b border-slate-200 dark:border-zinc-800">
                  <th className="text-left py-2.5 pl-4 font-semibold">Kalem</th>
                  <th className="text-right py-2.5 pr-2 font-semibold">Plan (₺)</th>
                  <th className="text-right py-2.5 pr-4 font-semibold">Plan %</th>
                  <th className="text-right py-2.5 pr-2 font-semibold">Gerçekleşen (₺)</th>
                  <th className="text-right py-2.5 pr-4 font-semibold">Gerçekleşen %</th>
                  <th className="text-right py-2.5 pr-2 font-semibold">Fark (₺)</th>
                  <th className="text-right py-2.5 pr-4 font-semibold">Fark %</th>
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
                    netSalesPlan={plData.netSalesPlan}
                    netSalesActual={plData.netSalesActual}
                  />
                ))}
              </tbody>
            </table>
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
                              {PROJECT_EXPENSE_CATEGORIES.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.label}
                                </option>
                              ))}
                            </optgroup>
                          </select>
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
                      <td colSpan={9} className="py-6 text-center text-slate-400 text-[12.5px]">
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
