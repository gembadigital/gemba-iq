export interface Consultant {
  id: string;
  name: string;
  title: string;
  department: string;
  dailyCost: number;
  dailySalesRate: number;
  employmentType: "Full-Time" | "Part-Time" | "Contractor";
  status: "Active" | "Inactive";
  internalCostRatio?: number; // e.g. 50%
}

export interface ConsultantCapacity {
  id: string;
  consultantId: string;
  month: string; // "2026-06", "2026-07" etc.
  workingDays: number;
  vacation: number;
  training: number;
  sickLeave: number;
  internalProjects: number;
  manDaysPerWeek?: number; // Turkish: man-day/week (Standard: 5)
}

export interface ProjectAssignment {
  id: string;
  customerName: string;
  projectName: string;
  serviceType: "Lean Manufacturing" | "MTM" | "Yamazumi" | "OEE" | "Capacity Planning" | "Training" | "Workshop" | "Assessment" | "Other";
  consultantId: string;
  allocatedDays: number;
  month: string; // "2026-06"
  startDate: string;
  endDate: string;
  customerDailyRate: number;
  consultantDailyRate?: number;
  revenueSharePercent?: number; // e.g. 30%
  isOngoing?: boolean; // Turkish: devam eden proje
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // auto-generated on import — no invoice-code column is required from the source file
  customerName: string;
  invoiceDate: string; // real date parsed from the imported file's date column when present ("Düzenleme Tarihi" or similar)
  month: string; // "2026-06" — derived from invoiceDate, not from whichever month/range happened to be selected at import time
  amount: number; // canonical revenue basis = pre-VAT subtotal ("Ara Toplam" / "Fatura Toplamı")
  deliveredDays: number;
  serviceType: string; // legacy/manual field kept for backward compatibility with older imports and the manual entry form; the Methodology / Service Line Margins chart no longer relies on this — it sources service lines from accepted Proposals instead
  status: "Paid" | "Outstanding";
  unitPrice?: number;
  vatRate?: number; // VAT % (KDV, e.g. 20)
  vatAmount?: number; // Computed KDV Bedeli
  grandTotal?: number; // VAT-included total ("Genel Toplam" / "KDV Dahil Toplam")
  consultantNames?: string[]; // Consultant name(s) recorded directly on this invoice row (e.g. the "Kategori"/"Danışman" column). Multiple names on one row (e.g. "Faik Çakır +Güray Yurdakul") share the delivered days evenly. Used to match the real Consultant Master daily cost for an exact (non-estimated) margin.
  tevkifatFraction?: string; // Partial VAT withholding fraction read from a dedicated "Tevkifat" column (e.g. "9/10" — buyer withholds 9/10 of the calculated KDV, seller only invoices the remaining 1/10). When present, vatRate already reflects this (e.g. 20% base × 1/10 payable = 2%). Kept as raw text so it can be shown/edited on the invoice row.
}

export const INITIAL_CONSULTANTS: Consultant[] = [
  {
    id: "c-1",
    name: "Atakan Zehir",
    title: "Senior Director",
    department: "Lean & Commercial Excellence",
    dailyCost: 10000,
    dailySalesRate: 25000,
    employmentType: "Full-Time",
    status: "Active"
  },
  {
    id: "c-2",
    name: "Hakan Morsallı",
    title: "Commercial Excellence Leader",
    department: "Sales Strategy",
    dailyCost: 8500,
    dailySalesRate: 22000,
    employmentType: "Full-Time",
    status: "Active"
  },
  {
    id: "c-3",
    name: "Güray Yurdakul",
    title: "MTM Master Trainer",
    department: "Industrial Engineering",
    dailyCost: 8000,
    dailySalesRate: 20000,
    employmentType: "Full-Time",
    status: "Active"
  },
  {
    id: "c-4",
    name: "Faik Suat Çakır",
    title: "OEE Specialist",
    department: "Operational Excellence",
    dailyCost: 7500,
    dailySalesRate: 18000,
    employmentType: "Full-Time",
    status: "Active"
  },
  {
    id: "c-5",
    name: "Harun Aksoy",
    title: "Senior IE Analyst",
    department: "Industrial Engineering",
    dailyCost: 6500,
    dailySalesRate: 16000,
    employmentType: "Full-Time",
    status: "Active"
  },
  {
    id: "c-6",
    name: "Kemal Doğan",
    title: "Kaizen Coach",
    department: "Operational Excellence",
    dailyCost: 6000,
    dailySalesRate: 15000,
    employmentType: "Full-Time",
    status: "Active"
  },
  {
    id: "c-7",
    name: "Gökhan Kuzu",
    title: "Continuous Improvement Engineer",
    department: "Operational Excellence",
    dailyCost: 5500,
    dailySalesRate: 14000,
    employmentType: "Full-Time",
    status: "Active"
  }
];

export const INITIAL_CAPACITIES: ConsultantCapacity[] = [
  // June 2026 Capacities
  { id: "cap-1-1", consultantId: "c-1", month: "2026-06", workingDays: 22, vacation: 1, training: 0, sickLeave: 0, internalProjects: 1 },
  { id: "cap-1-2", consultantId: "c-2", month: "2026-06", workingDays: 22, vacation: 0, training: 1, sickLeave: 0, internalProjects: 2 },
  { id: "cap-1-3", consultantId: "c-3", month: "2026-06", workingDays: 22, vacation: 2, training: 0, sickLeave: 0, internalProjects: 1 },
  { id: "cap-1-4", consultantId: "c-4", month: "2026-06", workingDays: 22, vacation: 0, training: 1, sickLeave: 1, internalProjects: 0 },
  { id: "cap-1-5", consultantId: "c-5", month: "2026-06", workingDays: 22, vacation: 0, training: 0, sickLeave: 0, internalProjects: 0 },
  { id: "cap-1-6", consultantId: "c-6", month: "2026-06", workingDays: 22, vacation: 1, training: 2, sickLeave: 0, internalProjects: 1 },
  { id: "cap-1-7", consultantId: "c-7", month: "2026-06", workingDays: 22, vacation: 0, training: 0, sickLeave: 0, internalProjects: 0 },

  // July 2026 Capacities
  { id: "cap-2-1", consultantId: "c-1", month: "2026-07", workingDays: 23, vacation: 2, training: 0, sickLeave: 0, internalProjects: 1 },
  { id: "cap-2-2", consultantId: "c-2", month: "2026-07", workingDays: 23, vacation: 1, training: 1, sickLeave: 0, internalProjects: 1 },
  { id: "cap-2-3", consultantId: "c-3", month: "2026-07", workingDays: 23, vacation: 3, training: 0, sickLeave: 0, internalProjects: 0 },
  { id: "cap-2-4", consultantId: "c-4", month: "2026-07", workingDays: 23, vacation: 0, training: 2, sickLeave: 0, internalProjects: 0 },
  { id: "cap-2-5", consultantId: "c-5", month: "2026-07", workingDays: 23, vacation: 0, training: 0, sickLeave: 1, internalProjects: 1 },
  { id: "cap-2-6", consultantId: "c-6", month: "2026-07", workingDays: 23, vacation: 2, training: 0, sickLeave: 0, internalProjects: 2 },
  { id: "cap-2-7", consultantId: "c-7", month: "2026-07", workingDays: 23, vacation: 1, training: 1, sickLeave: 0, internalProjects: 0 }
];

export const INITIAL_ASSIGNMENTS: ProjectAssignment[] = [
  {
    id: "pa-1",
    customerName: "Vestel Beyaz Eşya",
    projectName: "Assembly Line Yamazumi Balancing",
    serviceType: "Yamazumi",
    consultantId: "c-3",
    allocatedDays: 12,
    month: "2026-06",
    startDate: "2026-06-01",
    endDate: "2026-06-15",
    customerDailyRate: 20000,
    consultantDailyRate: 8000
  },
  {
    id: "pa-2",
    customerName: "Tofaş Fiat",
    projectName: "Press Shop OEE Improvement & SMED",
    serviceType: "OEE",
    consultantId: "c-4",
    allocatedDays: 14,
    month: "2026-06",
    startDate: "2026-06-05",
    endDate: "2026-06-25",
    customerDailyRate: 18050,
    consultantDailyRate: 7500
  },
  {
    id: "pa-3",
    customerName: "Ford Otosan",
    projectName: "MTM-UAS Workplace Standard Time Study",
    serviceType: "MTM",
    consultantId: "c-5",
    allocatedDays: 18,
    month: "2026-06",
    startDate: "2026-06-02",
    endDate: "2026-06-28",
    customerDailyRate: 16000,
    revenueSharePercent: 35
  },
  {
    id: "pa-4",
    customerName: "Arçelik A.Ş.",
    projectName: "Lean Flow Design Study",
    serviceType: "Lean Manufacturing",
    consultantId: "c-1",
    allocatedDays: 10,
    month: "2026-06",
    startDate: "2026-06-10",
    endDate: "2026-06-22",
    customerDailyRate: 25000,
    consultantDailyRate: 10000
  },
  {
    id: "pa-5",
    customerName: "Şişecam Düzcam",
    projectName: "Factory Capacity & Bottleneck Analysis",
    serviceType: "Capacity Planning",
    consultantId: "c-2",
    allocatedDays: 15,
    month: "2026-06",
    startDate: "2026-06-01",
    endDate: "2026-06-20",
    customerDailyRate: 22000,
    consultantDailyRate: 8500
  },
  {
    id: "pa-6",
    customerName: "Kordsa",
    projectName: "Lean Operator Training Workshop",
    serviceType: "Training",
    consultantId: "c-6",
    allocatedDays: 6,
    month: "2026-06",
    startDate: "2026-06-12",
    endDate: "2026-06-18",
    customerDailyRate: 15000,
    consultantDailyRate: 6000
  },
  {
    id: "pa-7",
    customerName: "Onduline A.Ş.",
    projectName: "Kaizen Quick Assessment",
    serviceType: "Assessment",
    consultantId: "c-7",
    allocatedDays: 15,
    month: "2026-06",
    startDate: "2026-06-03",
    endDate: "2026-06-21",
    customerDailyRate: 14000,
    consultantDailyRate: 5500
  },

  // July 2026 Assignments (Planned)
  {
    id: "pa-8",
    customerName: "Vestel Beyaz Eşya",
    projectName: "Assembly Line Yamazumi Phase II",
    serviceType: "Yamazumi",
    consultantId: "c-3",
    allocatedDays: 8,
    month: "2026-07",
    startDate: "2026-07-02",
    endDate: "2026-07-12",
    customerDailyRate: 20000,
    consultantDailyRate: 8000
  },
  {
    id: "pa-9",
    customerName: "Onduline A.Ş.",
    projectName: "OEE Implementation Phase I",
    serviceType: "OEE",
    consultantId: "c-4",
    allocatedDays: 20,
    month: "2026-07",
    startDate: "2026-07-01",
    endDate: "2026-07-28",
    customerDailyRate: 18000,
    consultantDailyRate: 7500
  },
  {
    id: "pa-10",
    customerName: "Kordsa",
    projectName: "Value Stream Mapping (VSM) Assessment",
    serviceType: "Lean Manufacturing", // Lean standard mapping
    consultantId: "c-6",
    allocatedDays: 14,
    month: "2026-07",
    startDate: "2026-07-05",
    endDate: "2026-07-22",
    customerDailyRate: 15000,
    consultantDailyRate: 6000
  },
  {
    id: "pa-11",
    customerName: "Bosch Rexroth",
    projectName: "MTM-1 Standard Formulation Workshop",
    serviceType: "MTM",
    consultantId: "c-5",
    allocatedDays: 22,
    month: "2026-07",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    customerDailyRate: 17000,
    revenueSharePercent: 30
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  { id: "inv-1", invoiceNumber: "INV-2026-001", customerName: "Vestel Beyaz Eşya", invoiceDate: "2026-06-15", month: "2026-06", amount: 240000, deliveredDays: 12, serviceType: "Yamazumi", status: "Paid" },
  { id: "inv-2", invoiceNumber: "INV-2026-002", customerName: "Tofaş Fiat", invoiceDate: "2026-06-25", month: "2026-06", amount: 252700, deliveredDays: 14, serviceType: "OEE", status: "Paid" },
  { id: "inv-3", invoiceNumber: "INV-2026-003", customerName: "Ford Otosan", invoiceDate: "2026-06-28", month: "2026-06", amount: 288000, deliveredDays: 18, serviceType: "MTM", status: "Outstanding" },
  { id: "inv-4", invoiceNumber: "INV-2026-004", customerName: "Arçelik A.Ş.", invoiceDate: "2026-06-22", month: "2026-06", amount: 250000, deliveredDays: 10, serviceType: "Lean Manufacturing", status: "Paid" },
  { id: "inv-5", invoiceNumber: "INV-2026-005", customerName: "Şişecam Düzcam", invoiceDate: "2026-06-20", month: "2026-06", amount: 330000, deliveredDays: 15, serviceType: "Capacity Planning", status: "Paid" },
  { id: "inv-6", invoiceNumber: "INV-2026-006", customerName: "Kordsa", invoiceDate: "2026-06-18", month: "2026-06", amount: 90000, deliveredDays: 6, serviceType: "Training", status: "Paid" },
  { id: "inv-7", invoiceNumber: "INV-2026-007", customerName: "Onduline A.Ş.", invoiceDate: "2026-06-21", month: "2026-06", amount: 210000, deliveredDays: 15, serviceType: "Assessment", status: "Outstanding" }
];

export const SERVICE_TYPES_LIST = [
  "Lean Manufacturing",
  "MTM",
  "Yamazumi",
  "OEE",
  "Capacity Planning",
  "Training",
  "Workshop",
  "Assessment",
  "Other"
];
