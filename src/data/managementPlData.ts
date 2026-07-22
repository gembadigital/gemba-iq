// Management P/L (Yönetim P/L) — data model, constants, and pure calculation
// helpers for src/components/ManagementPLView.tsx.
//
// This page is a Turkish, internal management-accounting report (not a
// statutory/GAAP income statement), so labels are kept in plain Turkish
// rather than routed through the bilingual t()/dictionary system.

// ---------------------------------------------------------------------------
// Recurring / range-based manual cost entries
// (Sabit Giderler / Finansman Giderleri / Vergiler tabs)
// ---------------------------------------------------------------------------

export type PLGroupKey = "fixed" | "financing" | "tax";

export interface FixedCostCategoryDef {
  key: string;
  label: string;
  allowMultiplePeople: boolean; // "Personel 1 / 2 / ..." pattern
  allowCustomLabel?: boolean; // "Diğer..." categories ask for a short description
}

export const FIXED_EXPENSE_CATEGORIES: FixedCostCategoryDef[] = [
  { key: "office_salaries", label: "Ofis Personel Maaşları", allowMultiplePeople: true },
  { key: "management_salaries", label: "Yönetim Maaşları", allowMultiplePeople: true },
  { key: "sgk", label: "SGK", allowMultiplePeople: false },
  { key: "office_rent", label: "Ofis Kirası", allowMultiplePeople: false },
  { key: "accounting", label: "Muhasebe", allowMultiplePeople: false },
  { key: "software_licenses", label: "Yazılım Lisansları", allowMultiplePeople: false },
  { key: "marketing", label: "Pazarlama", allowMultiplePeople: false },
  { key: "vehicle", label: "Araç Giderleri", allowMultiplePeople: false },
  { key: "general_travel", label: "Genel Seyahat Giderleri", allowMultiplePeople: false },
  { key: "bank_fees", label: "Banka Masrafları", allowMultiplePeople: false },
  { key: "dues", label: "Aidatlar", allowMultiplePeople: false },
  { key: "office_expenses", label: "Ofis Giderleri", allowMultiplePeople: false },
  { key: "other_general", label: "Diğer Genel Giderler", allowMultiplePeople: false, allowCustomLabel: true },
];

export const FINANCING_EXPENSE_CATEGORIES: FixedCostCategoryDef[] = [
  { key: "interest", label: "Faiz", allowMultiplePeople: false },
  { key: "fx_loss", label: "Kur Farkı", allowMultiplePeople: false },
  { key: "other_financing", label: "Diğer Finansman Giderleri", allowMultiplePeople: false, allowCustomLabel: true },
];

export const TAX_CATEGORIES: FixedCostCategoryDef[] = [
  { key: "corporate_tax", label: "Kurumlar Vergisi", allowMultiplePeople: false },
  { key: "provisional_tax", label: "Geçici Vergi", allowMultiplePeople: false },
  { key: "withholding_tax", label: "Stopaj", allowMultiplePeople: false },
  { key: "other_tax", label: "Diğer Vergiler", allowMultiplePeople: false, allowCustomLabel: true },
];

export function categoriesForGroup(groupKey: PLGroupKey): FixedCostCategoryDef[] {
  if (groupKey === "fixed") return FIXED_EXPENSE_CATEGORIES;
  if (groupKey === "financing") return FINANCING_EXPENSE_CATEGORIES;
  return TAX_CATEGORIES;
}

export function groupLabel(groupKey: PLGroupKey): string {
  if (groupKey === "fixed") return "Sabit Giderler (Genel Yönetim Giderleri)";
  if (groupKey === "financing") return "Finansman Giderleri";
  return "Vergiler";
}

export interface RecurringCostEntry {
  id: string;
  groupKey: PLGroupKey;
  categoryKey: string;
  personLabel?: string; // e.g. "Personel 1" — only for allowMultiplePeople categories
  customLabel?: string; // free-text description for "Diğer..." categories
  mode: "recurring" | "range"; // "süreklilik" vs "tarih aralığı"
  startMonth: string; // "YYYY-MM"
  endMonth?: string; // required when mode === "range"
  amountPlan: number;
  amountActual: number;
}

export function entryAppliesToMonth(entry: RecurringCostEntry, month: string): boolean {
  if (entry.mode === "recurring") {
    return month >= entry.startMonth;
  }
  const end = entry.endMonth || entry.startMonth;
  return month >= entry.startMonth && month <= end;
}

export function entryDisplayLabel(entry: RecurringCostEntry): string {
  if (entry.personLabel) return entry.personLabel;
  if (entry.customLabel) return entry.customLabel;
  const def = categoriesForGroup(entry.groupKey).find((c) => c.key === entry.categoryKey);
  return def?.label || entry.categoryKey;
}

// ---------------------------------------------------------------------------
// Net Satış Gelirleri (revenue) categories
// ---------------------------------------------------------------------------

export type PLRevenueCategoryKey = "consulting" | "training" | "software" | "other_service";

export const REVENUE_CATEGORIES: { key: PLRevenueCategoryKey; label: string }[] = [
  { key: "consulting", label: "Danışmanlık Geliri" },
  { key: "training", label: "Eğitim Geliri" },
  { key: "software", label: "Yazılım Geliri" },
  { key: "other_service", label: "Diğer Hizmet Gelirleri" },
];

// Diğer Proje Giderleri (direct, non-consultant project expense categories)
export type PLProjectExpenseCategoryKey = "transport" | "accommodation" | "organization" | "opex_software";

export const PROJECT_EXPENSE_CATEGORIES: { key: PLProjectExpenseCategoryKey; label: string }[] = [
  { key: "transport", label: "Ulaşım Giderleri" },
  { key: "accommodation", label: "Konaklama" },
  { key: "organization", label: "Organizasyon" },
  { key: "opex_software", label: "Yazılım Maliyetleri" },
];

export type PLInvoiceCategoryKey = PLRevenueCategoryKey | PLProjectExpenseCategoryKey;

// Maps a Revenue Management Invoice's free-text serviceType (Yamazumi, MTM,
// OEE, Lean Manufacturing, Capacity Planning, Training, Workshop,
// Assessment, Other, ...) onto one of the 4 Management P/L revenue
// categories, so real sales invoices already recorded in Revenue Management
// can feed the P/L table's "Gerçekleşen" column automatically.
export function mapServiceTypeToRevenueCategory(serviceType: string | undefined): PLRevenueCategoryKey {
  const t = (serviceType || "").toLowerCase();
  if (t.includes("training") || t.includes("workshop") || t.includes("eğitim") || t.includes("egitim")) return "training";
  if (t.includes("software") || t.includes("yazılım") || t.includes("yazilim")) return "software";
  if (t.includes("other") || t.includes("diğer") || t.includes("diger")) return "other_service";
  return "consulting";
}

export const ALL_INVOICE_CATEGORIES: { key: PLInvoiceCategoryKey; label: string; direction: "revenue" | "expense" }[] = [
  ...REVENUE_CATEGORIES.map((c) => ({ ...c, direction: "revenue" as const })),
  ...PROJECT_EXPENSE_CATEGORIES.map((c) => ({ ...c, direction: "expense" as const })),
];

// ---------------------------------------------------------------------------
// Uploaded invoice ledger (e-arşiv / e-fatura upload + categorization panel)
// ---------------------------------------------------------------------------

export interface PLInvoiceRecord {
  id: string;
  fileName: string;
  documentId?: string; // EnterpriseDocument id, when a real file was uploaded via enterpriseDocumentService
  storagePath?: string; // EnterpriseDocument.storage_path — used to re-derive a signed download URL later
  uploadedAt: string; // ISO
  month: string; // "YYYY-MM"
  amount: number; // pre-VAT (net) amount — the P/L revenue/expense basis
  vatRate: number; // nominal KDV %, e.g. 20
  tevkifatEnabled: boolean;
  tevkifatFraction: string; // e.g. "9/10" — buyer-withheld fraction of calculated KDV
  vatAmount: number; // KDV actually invoiced/payable by the seller after tevkifat, if any
  direction: "revenue" | "expense";
  category: PLInvoiceCategoryKey | "uncategorized";
  description?: string;
}

export function computeVatAmount(amount: number, vatRate: number, tevkifatEnabled: boolean, tevkifatFraction: string): number {
  const grossVat = amount * (vatRate / 100);
  if (!tevkifatEnabled) return grossVat;
  const parts = tevkifatFraction.split("/").map((p) => parseFloat(p.trim()));
  if (parts.length !== 2 || !parts[0] || !parts[1]) return grossVat;
  const [withheld, base] = parts;
  const sellerFraction = Math.max(0, (base - withheld) / base);
  return grossVat * sellerFraction;
}

export interface KdvSummary {
  hesaplanan: number; // output VAT on revenue invoices this month
  indirilecek: number; // input VAT on expense invoices this month
  odenecek: number; // payable this month
  devreden: number; // carried forward (credit) this month
}

export function computeKdvSummary(invoices: PLInvoiceRecord[], month: string): KdvSummary {
  const monthInvoices = invoices.filter((i) => i.month === month);
  const hesaplanan = monthInvoices.filter((i) => i.direction === "revenue").reduce((s, i) => s + (i.vatAmount || 0), 0);
  const indirilecek = monthInvoices.filter((i) => i.direction === "expense").reduce((s, i) => s + (i.vatAmount || 0), 0);
  const net = hesaplanan - indirilecek;
  return {
    hesaplanan,
    indirilecek,
    odenecek: net > 0 ? net : 0,
    devreden: net < 0 ? -net : 0,
  };
}

// ---------------------------------------------------------------------------
// Month helpers
// ---------------------------------------------------------------------------

export function generateMonthOptions(): string[] {
  const now = new Date();
  const startYear = now.getFullYear() - 1;
  const endYear = now.getFullYear() + 1;
  const months: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      months.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }
  return months;
}

const MONTH_LABELS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_LABELS_TR[idx] || m} ${y}`;
}

export function formatMonthLabelShort(month: string): string {
  const [y, m] = month.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${(MONTH_LABELS_TR[idx] || m).slice(0, 3)} ${y.slice(2)}`;
}

// ---------------------------------------------------------------------------
// Reporting periods — a "period" is a labeled bucket of one or more months.
// Used so the P/L table can show either a single month, several months
// side-by-side ("ay ay ayrı"), or one aggregated quarter.
// ---------------------------------------------------------------------------

export type PLPeriodMode = "single" | "range" | "quarter";

export interface PLPeriod {
  key: string;
  label: string;
  shortLabel: string;
  months: string[];
}

export function monthsBetween(start: string, end: string): string[] {
  const [sy, sm] = start.split("-").map((v) => parseInt(v, 10));
  const [ey, em] = end.split("-").map((v) => parseInt(v, 10));
  const months: string[] = [];
  let y = sy;
  let m = sm;
  let guard = 0;
  const startIdx = sy * 12 + sm;
  const endIdx = ey * 12 + em;
  if (endIdx < startIdx) return [start];
  while (y * 12 + m <= endIdx && guard < 60) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    guard += 1;
  }
  return months;
}

export function quarterMonths(year: number, quarterIndex: number): string[] {
  const startMonth = (quarterIndex - 1) * 3 + 1;
  return [0, 1, 2].map((i) => `${year}-${String(startMonth + i).padStart(2, "0")}`);
}

export function buildPeriods(
  mode: PLPeriodMode,
  selectedMonth: string,
  rangeStart: string,
  rangeEnd: string,
  quarterYear: number,
  quarterIndex: number
): PLPeriod[] {
  if (mode === "quarter") {
    const months = quarterMonths(quarterYear, quarterIndex);
    return [
      {
        key: `${quarterYear}-Q${quarterIndex}`,
        label: `Ç${quarterIndex} ${quarterYear} (${formatMonthLabel(months[0])} – ${formatMonthLabel(months[2])})`,
        shortLabel: `Ç${quarterIndex} ${quarterYear}`,
        months,
      },
    ];
  }
  if (mode === "range") {
    const months = monthsBetween(rangeStart, rangeEnd);
    const periods: PLPeriod[] = months.map((m) => ({
      key: m,
      label: formatMonthLabel(m),
      shortLabel: formatMonthLabelShort(m),
      months: [m],
    }));
    if (periods.length > 1) {
      periods.push({ key: "range-total", label: "Toplam", shortLabel: "Toplam", months });
    }
    return periods;
  }
  return [{ key: selectedMonth, label: formatMonthLabel(selectedMonth), shortLabel: formatMonthLabelShort(selectedMonth), months: [selectedMonth] }];
}

// ---------------------------------------------------------------------------
// Currency / number formatting (always TRY on this page, regardless of the
// organization's configurable display currency elsewhere in the app)
// ---------------------------------------------------------------------------

export function formatTRY(v: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v || 0);
}

export function formatPercentOfNet(part: number, whole: number): string {
  if (!whole) return "—";
  return `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format((part / whole) * 100)}`;
}

export function formatVarianceAmount(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}${formatTRY(Math.abs(v))}`;
}

// ---------------------------------------------------------------------------
// KV storage keys used by this feature (Supabase-backed, org-scoped via CrmDb.getKv/setKv)
// ---------------------------------------------------------------------------

export const PL_CATEGORY_PLANS_KEY = "crm_pl_category_plans"; // Record<rowKey, Record<month, number>>
export const PL_CONSULTANT_PLANS_KEY = "crm_pl_consultant_plans"; // Record<consultantId, Record<month, number>>
export const PL_RECURRING_ENTRIES_KEY = "crm_pl_recurring_entries"; // RecurringCostEntry[]
export const PL_INVOICES_KEY = "crm_pl_invoices"; // PLInvoiceRecord[]

export function revenueRowKey(categoryKey: string): string {
  return `revenue:${categoryKey}`;
}

export function expenseRowKey(categoryKey: string): string {
  return `expense:${categoryKey}`;
}

export function getCategoryPlan(plans: Record<string, Record<string, number>>, rowKey: string, month: string): number {
  return plans[rowKey]?.[month] ?? 0;
}

export function getCategoryPlanForMonths(plans: Record<string, Record<string, number>>, rowKey: string, months: string[]): number {
  return months.reduce((s, m) => s + getCategoryPlan(plans, rowKey, m), 0);
}

export function getConsultantPlanForMonths(plans: Record<string, Record<string, number>>, consultantId: string, months: string[]): number {
  return months.reduce((s, m) => s + (plans[consultantId]?.[m] ?? 0), 0);
}
