import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Target,
  TrendingUp,
  Briefcase,
  BarChart2,
  Search,
  Award,
  LayoutDashboard,
  Sparkles,
  Plus,
  Trash2,
  X,
  Check,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Clock,
  AlertTriangle,
  Loader2,
  Save,
  Edit,
  DollarSign,
  CheckCircle,
  Percent,
  Users,
  Flag,
  MoreVertical,
  GripVertical,
  Mail,
  MapPin,
  ExternalLink,
  Building2,
  User,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TargetAccount,
  TargetContact,
  StrategicGoal,
  MarketingKeyResult,
  MarketingReportInsight,
} from "../types";
import { useLanguage } from "../lib/LanguageContext";
import { useOrganization } from "../lib/OrganizationContext";
import { CrmDb, normalizeTrKey, deduplicateTargetAccounts } from "../lib/CrmDb";
import { getActiveOrganizationId } from "../lib/tenantStorage";
import { ConfirmModal } from "./shared/ConfirmModal";
import { useConfirm } from "../lib/useConfirm";
import { isWonStage, isLostStage } from "./SalesDashboardView";
import type { Company } from "./CompaniesView";
import type { Deal } from "./DealManagementView";
import type { Proposal } from "../types/proposal";

// Aynı anahtar TargetAccountsView.tsx ile paylaşılıyor — "Hedef Pazar & Rakip
// Haritası" ve "İş Geliştirme Pipeline'ı" sayfaları AYRI bir hedef firma
// veritabanı OLUŞTURMUYOR, mevcut Target Accounts kaydını (rakip/analiz/
// pipeline aşaması alanlarıyla genişletilmiş halini) kullanıyor. Böylece bir
// firma iki kez girilmiyor.
const TARGET_ACCOUNTS_KEY = "crm_target_accounts";
const DELETED_ACCOUNTS_KEY = "crm_deleted_target_accounts";
const STRATEGIC_GOALS_KEY = "crm_strategic_goals";
const REPORT_INSIGHTS_KEY = "crm_marketing_report_insights";

// İş Geliştirme Pipeline'ı — Fırsat Yönetimi Kanban panosuyla AYNI yapı/format
// (stage ekleme/gizleme/silme/yeniden adlandırma, sürükle-bırak) kullanır.
// Son aşama ("Toplantı Yapıldı") artık pipeline'ın sonu DEĞİL — bu aşamaya
// ulaşan bir hedef firma otomatik olarak Fırsat Yönetimi'ne (Deal Management)
// transfer edilir (soğuk temastan sıcak temasa geçiş). Bu yüzden eski
// "Saha Ziyareti" / "Teklife Dönüştü" / "Kaybedildi" aşamaları kaldırıldı —
// bunlar artık Fırsat Yönetimi'nin kendi pipeline'ına ait.
const BD_PIPELINE_STAGES = [
  "Yeni",
  "LinkedIn Bağlantı",
  "Mesaj Gönderildi",
  "Mail Gönderildi",
  "Telefon Görüşmesi",
  "Toplantı Planlandı",
  "Toplantı Yapıldı",
] as const;

const BD_STAGES_KEY = "crm_bd_pipeline_stages_v2";
const BD_STAGE_META_KEY = "crm_bd_pipeline_stage_metadata_v2";

const BD_INITIAL_STAGE_METADATA: Record<string, { collapsed: boolean; description: string }> = {
  "Yeni": { collapsed: false, description: "Sektör eşleşmesiyle bulunan yeni hedef/rakip firma" },
  "LinkedIn Bağlantı": { collapsed: false, description: "Karar vericiyle LinkedIn üzerinden bağlantı kuruldu" },
  "Mesaj Gönderildi": { collapsed: false, description: "İlk mesaj/InMail gönderildi" },
  "Mail Gönderildi": { collapsed: false, description: "Soğuk e-posta gönderildi" },
  "Telefon Görüşmesi": { collapsed: false, description: "Telefonla ilk temas kuruldu" },
  "Toplantı Planlandı": { collapsed: false, description: "Görüşme/toplantı tarihi netleşti" },
  "Toplantı Yapıldı": { collapsed: false, description: "Görüşme tamamlandı — Fırsat Yönetimi'ne otomatik transfer edilir" },
};

export type MarketingSubTab =
  | "overview"
  | "industry-intel"
  | "target-market"
  | "bd-pipeline"
  | "growth-health"
  | "digital-intel"
  | "kpi-okr";

const CHART_COLORS = {
  blue: "#0078D4",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  indigo: "#6366f1",
  purple: "#8b5cf6",
};

const PIE_COLORS = [CHART_COLORS.blue, CHART_COLORS.emerald, CHART_COLORS.amber, CHART_COLORS.rose, CHART_COLORS.indigo, CHART_COLORS.purple, "#14b8a6", "#f97316"];

const STAGE_ACCENT_COLORS = [
  { topBorder: "border-t-blue-500", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" },
  { topBorder: "border-t-indigo-500", text: "text-indigo-600 dark:text-indigo-400", badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300" },
  { topBorder: "border-t-purple-500", text: "text-purple-600 dark:text-purple-400", badge: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300" },
  { topBorder: "border-t-amber-500", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
  { topBorder: "border-t-emerald-500", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
];

const formatCurrencyShort = (value: number): string => {
  if (!value) return "₺0";
  if (value >= 1000000) return `₺${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₺${(value / 1000).toFixed(0)}K`;
  return `₺${value.toFixed(0)}`;
};

export function getTargetPrimaryContact(
  account: TargetAccount,
  fallbackTitle = "Kalite / Operasyon Direktörü",
  fallbackDept = "Operasyonel Mükemmellik"
) {
  const firstArrayContact = account.contacts && account.contacts.length > 0 ? account.contacts[0] : null;
  const firstName = account.contactName || (firstArrayContact ? firstArrayContact.fullName.split(" ")[0] : "");
  const lastName = account.contactSurname || (firstArrayContact ? firstArrayContact.fullName.split(" ").slice(1).join(" ") : "");
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || firstArrayContact?.fullName || fallbackTitle;
  const email = account.contactEmail || firstArrayContact?.email || `opex@${(account.companyName || "").toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  const department = account.department || firstArrayContact?.department || firstArrayContact?.title || fallbackDept;
  return { firstName, lastName, fullName, email, department };
}

export function getRelationshipStatus(
  account: TargetAccount,
  companies: Company[] = []
): "Hedef" | "Görüşülüyor" | "Müşteri" {
  const isCustomer = companies.some((c) => normalizeTrKey(c.name) === normalizeTrKey(account.companyName));
  if (isCustomer) return "Müşteri";
  if (account.bdPipelineStage && account.bdPipelineStage !== "Yeni") return "Görüşülüyor";
  return "Hedef";
}

interface MarketingHubViewProps {
  initialSubTab?: MarketingSubTab;
  onNavigateToTab?: (tab: string) => void;
}

export default function MarketingHubView({ initialSubTab, onNavigateToTab }: MarketingHubViewProps) {
  const { t } = useLanguage();
  const { actorName, actorEmail } = useOrganization();
  const { confirm, confirmProps } = useConfirm();

  // Sayfa artık App.tsx'in sol menüsündeki ayrı bir sidebar girişiyle
  // yönetiliyor (her bölüm kendi activeTab değerine sahip) — bu yüzden
  // component her navigasyonda `key` ile yeniden mount ediliyor ve
  // initialSubTab prop'undan başlangıç durumunu alıyor.
  const [activeSubTab] = useState<MarketingSubTab>(initialSubTab || "overview");
  const [accounts, setAccounts] = useState<TargetAccount[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [reportInsights, setReportInsights] = useState<MarketingReportInsight[]>([]);
  const [deletedAccounts, setDeletedAccounts] = useState<TargetAccount[]>([]);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "info" | "error";
    onUndo?: () => void;
    undoLabel?: string;
  } | null>(null);

  // BD Pipeline States
  const [bdActiveStages, setBdActiveStages] = useState<string[]>(() => {
    const saved = CrmDb.getKv<string[]>(BD_STAGES_KEY, []);
    return saved && saved.length > 0 ? saved : [...BD_PIPELINE_STAGES];
  });
  const [bdStageMetadata, setBdStageMetadata] = useState<Record<string, { collapsed: boolean; description: string }>>(() => {
    const saved = CrmDb.getKv<Record<string, { collapsed: boolean; description: string }>>(BD_STAGE_META_KEY, {});
    return saved && Object.keys(saved).length > 0 ? saved : { ...BD_INITIAL_STAGE_METADATA };
  });
  const [bdActiveStageMenu, setBdActiveStageMenu] = useState<string | null>(null);
  const [bdIsAddingStage, setBdIsAddingStage] = useState(false);
  const [bdNewStageName, setBdNewStageName] = useState("");
  const [bdRenamingStage, setBdRenamingStage] = useState<string | null>(null);
  const [bdRenameValue, setBdRenameValue] = useState("");
  const [bdDeletingStage, setBdDeletingStage] = useState<string | null>(null);
  const [bdDeleteMigrationTarget, setBdDeleteMigrationTarget] = useState("");
  const [bdKanbanSearch, setBdKanbanSearch] = useState("");

  // Target Accounts & Competitor Map States
  const [startMode, setStartMode] = useState<"customer" | "manual">("customer");
  const [selectedSourceCompanyId, setSelectedSourceCompanyId] = useState<string>("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetFormDraft, setTargetFormDraft] = useState({
    companyName: "",
    industryTag: "",
    subIndustry: "",
    city: "",
    websiteUrl: "",
    analysisNotes: "",
    contactFullName: "",
    contactTitle: "",
    contactPhone: "",
    contactEmail: "",
    contactLinkedin: "",
  });
  const [targetSectorFilter, setTargetSectorFilter] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [contactDraftByAccount, setContactDraftByAccount] = useState<Record<string, Partial<TargetContact>>>({});
  const [showContactFormFor, setShowContactFormFor] = useState<string | null>(null);
  const [pendingLeadPrompt, setPendingLeadPrompt] = useState<{ accountId: string; contactId: string } | null>(null);

  const triggerToast = (
    msg: string,
    type: "success" | "info" | "error" = "success",
    onUndo?: () => void,
    undoLabel?: string
  ) => {
    setToast({ msg, type, onUndo, undoLabel });
    setTimeout(() => setToast(null), onUndo ? 6500 : 3500);
  };

  useEffect(() => {
    const raw = CrmDb.getKv<TargetAccount[]>(TARGET_ACCOUNTS_KEY, []);
    const clean = deduplicateTargetAccounts(raw);
    setAccounts(clean);
    if (raw.length !== clean.length) {
      CrmDb.setKv(TARGET_ACCOUNTS_KEY, clean);
    }
    setDeletedAccounts(CrmDb.getKv<TargetAccount[]>(DELETED_ACCOUNTS_KEY, []));
    setCompanies(CrmDb.getCompanies());
    setDeals(CrmDb.getDeals());
    setProposals(CrmDb.getProposals());
    setGoals(CrmDb.getKv<StrategicGoal[]>(STRATEGIC_GOALS_KEY, []));
    setReportInsights(CrmDb.getKv<MarketingReportInsight[]>(REPORT_INSIGHTS_KEY, []));
  }, []);

  const persistAccounts = (updated: TargetAccount[]) => {
    const clean = deduplicateTargetAccounts(updated);
    const organizationId = getActiveOrganizationId();
    const scoped = clean.map((a) => ({ ...a, organization_id: organizationId || a.organization_id }));
    setAccounts(scoped);
    CrmDb.setKv(TARGET_ACCOUNTS_KEY, scoped);
  };
  const persistGoals = (updated: StrategicGoal[]) => {
    setGoals(updated);
    CrmDb.setKv(STRATEGIC_GOALS_KEY, updated);
  };
  const persistReportInsights = (updated: MarketingReportInsight[]) => {
    setReportInsights(updated);
    CrmDb.setKv(REPORT_INSIGHTS_KEY, updated);
  };

  // --- Sektör Zekası: mevcut Companies + Deals verisinden otomatik hesaplanır ---
  const industryStats = useMemo(() => {
    const map: Record<
      string,
      { industry: string; customerCount: number; wonDeals: number; lostDeals: number; wonValue: number; dealCount: number }
    > = {};

    companies.forEach((c) => {
      const key = (c.industry || t("Other")).trim() || t("Other");
      if (!map[key]) map[key] = { industry: key, customerCount: 0, wonDeals: 0, lostDeals: 0, wonValue: 0, dealCount: 0 };
      map[key].customerCount += 1;
    });

    deals.forEach((d) => {
      const key = (d.industry || t("Other")).trim() || t("Other");
      if (!map[key]) map[key] = { industry: key, customerCount: 0, wonDeals: 0, lostDeals: 0, wonValue: 0, dealCount: 0 };
      map[key].dealCount += 1;
      if (isWonStage(d.stage)) {
        map[key].wonDeals += 1;
        map[key].wonValue += Number(d.wonRecord?.contractValue || d.opportunityValue || 0);
      } else if (isLostStage(d.stage)) {
        map[key].lostDeals += 1;
      }
    });

    return Object.values(map)
      .map((row) => ({
        ...row,
        winRate: row.wonDeals + row.lostDeals > 0 ? (row.wonDeals / (row.wonDeals + row.lostDeals)) * 100 : 0,
        avgDealSize: row.wonDeals > 0 ? row.wonValue / row.wonDeals : 0,
      }))
      .sort((a, b) => b.customerCount + b.wonValue / 100000 - (a.customerCount + a.wonValue / 100000));
  }, [companies, deals, t]);

  const industryChartData = useMemo(
    () =>
      industryStats.slice(0, 8).map((row) => ({
        name: row.industry.length > 14 ? `${row.industry.slice(0, 13)}…` : row.industry,
        [t("Customers")]: row.customerCount,
        [t("Win Rate")]: Math.round(row.winRate),
      })),
    [industryStats, t]
  );

  // --- Kayıp Analizi (Win/Loss): mevcut Deal.lossReason + Proposal.lossReason'dan ---
  const lossAnalysis = useMemo(() => {
    const reasonMap: Record<string, number> = {};
    let totalWon = 0;
    let totalLost = 0;

    deals.forEach((d) => {
      if (isWonStage(d.stage)) totalWon += 1;
      if (isLostStage(d.stage)) {
        totalLost += 1;
        const reason = d.lossReason || d.lostRecord?.lostReason || t("Not specified");
        reasonMap[reason] = (reasonMap[reason] || 0) + 1;
      }
    });
    proposals.forEach((p) => {
      if (p.status === "Rejected" || p.status === "Cancelled") {
        totalLost += 1;
        const reason = (p as any).lossReason || (p as any).rejectedReason || (p as any).cancelledReason || t("Not specified");
        reasonMap[reason] = (reasonMap[reason] || 0) + 1;
      }
      if (p.status === "Accepted") totalWon += 1;
    });

    const rows = Object.entries(reasonMap)
      .map(([reason, count]) => ({ reason, count, pct: totalLost > 0 ? (count / totalLost) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);

    return { rows, totalWon, totalLost, winRate: totalWon + totalLost > 0 ? (totalWon / (totalWon + totalLost)) * 100 : 0 };
  }, [deals, proposals, t]);

  const winLossDonutData = useMemo(
    () => [
      { name: t("Won"), value: lossAnalysis.totalWon, color: CHART_COLORS.emerald },
      { name: t("Lost"), value: lossAnalysis.totalLost, color: CHART_COLORS.rose },
    ],
    [lossAnalysis, t]
  );

  const lossReasonChartData = useMemo(
    () => lossAnalysis.rows.slice(0, 8).map((r) => ({ name: t(r.reason), count: r.count })),
    [lossAnalysis, t]
  );

  // --- İş Geliştirme Pipeline'ı: Target Account.bdPipelineStage'e göre grupla ---

  useEffect(() => {
    CrmDb.setKv(BD_STAGES_KEY, bdActiveStages);
  }, [bdActiveStages]);
  useEffect(() => {
    CrmDb.setKv(BD_STAGE_META_KEY, bdStageMetadata);
  }, [bdStageMetadata]);

  // --- İş Geliştirme Pipeline'ı: Target Account.bdPipelineStage'e göre grupla ---
  const pipelineByStage = useMemo(() => {
    const map: Record<string, TargetAccount[]> = {};
    bdActiveStages.forEach((s) => {
      map[s] = [];
    });
    const firstStage = bdActiveStages[0] || "Yeni";
    const q = bdKanbanSearch.trim().toLowerCase();

    accounts.forEach((a) => {
      const stage = a.bdPipelineStage && bdActiveStages.includes(a.bdPipelineStage) ? a.bdPipelineStage : firstStage;
      if (!map[stage]) map[stage] = [];

      if (q) {
        const primaryContact = getTargetPrimaryContact(a);
        const match =
          a.companyName.toLowerCase().includes(q) ||
          (a.industryTag && a.industryTag.toLowerCase().includes(q)) ||
          (a.city && a.city.toLowerCase().includes(q)) ||
          (primaryContact.fullName && primaryContact.fullName.toLowerCase().includes(q)) ||
          (primaryContact.email && primaryContact.email.toLowerCase().includes(q));
        if (match) map[stage].push(a);
      } else {
        map[stage].push(a);
      }
    });
    return map;
  }, [accounts, bdActiveStages, bdKanbanSearch]);

  const bdPipelineStats = useMemo(() => {
    const total = accounts.length;
    const highOpp = accounts.filter((a) => (a.riskScore || 70) >= 75).length;
    const promoted = accounts.filter((a) => Boolean(a.promotedToDealId)).length;
    const avgScore = total > 0 ? Math.round(accounts.reduce((acc, a) => acc + (a.riskScore || 70), 0) / total) : 70;
    return { total, highOpp, promoted, avgScore };
  }, [accounts]);

  // Dönüşüm hunisi: pipeline aşamaları + son adım olarak Fırsat Yönetimi'ne
  // otomatik transfer edilen (soğuk temastan sıcak temasa geçen) firma
  // sayısı — sistemin bu geçişin performansını izleyebilmesi için.
  const promotedToDealCount = useMemo(() => accounts.filter((a) => a.promotedToDealId).length, [accounts]);

  const funnelChartData = useMemo(
    () => [
      ...bdActiveStages.map((s) => ({ stage: t(s), count: (pipelineByStage[s] || []).length })),
      { stage: t("→ Deal Management"), count: promotedToDealCount },
    ],
    [pipelineByStage, bdActiveStages, promotedToDealCount, t]
  );

  const reviewPendingAccounts = useMemo(() => {
    const horizon = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    return accounts
      .filter((a) => a.nextReviewDate && a.nextReviewDate <= horizon)
      .sort((a, b) => (a.nextReviewDate || "").localeCompare(b.nextReviewDate || ""));
  }, [accounts]);

  // --- Büyüme Sağlığı: mevcut Companies + Deals verisinden hesaplanır ---
  const growthHealth = useMemo(() => {
    const activeCustomers = companies.filter((c) => {
      const status = (c.customerStatus || "").toLowerCase();
      return status !== "kaybedildi" && status !== "lost" && status !== "churned";
    }).length;
    const wonDeals = deals.filter((d) => isWonStage(d.stage));
    const lostDeals = deals.filter((d) => isLostStage(d.stage));
    const openDeals = deals.filter((d) => !isWonStage(d.stage) && !isLostStage(d.stage));
    const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.opportunityValue || 0), 0);
    const avgCycleDays =
      wonDeals.length > 0 ? wonDeals.reduce((sum, d) => sum + Number(d.currentStageDuration || 0), 0) / wonDeals.length : 0;
    const riskyCustomers = companies.filter((c) => typeof c.healthScore === "number" && c.healthScore < 50);
    const stageValueMap: Record<string, number> = {};
    openDeals.forEach((d) => {
      stageValueMap[d.stage] = (stageValueMap[d.stage] || 0) + Number(d.opportunityValue || 0);
    });
    return { activeCustomers, wonCount: wonDeals.length, lostCount: lostDeals.length, pipelineValue, avgCycleDays, riskyCustomers, stageValueMap };
  }, [companies, deals]);

  const stageValueChartData = useMemo(
    () =>
      Object.entries(growthHealth.stageValueMap)
        .sort((a, b) => b[1] - a[1])
        .map(([stage, value]) => ({ stage: stage.length > 16 ? `${stage.slice(0, 15)}…` : stage, value })),
    [growthHealth]
  );

  const wonLostDonutData = useMemo(
    () => [
      { name: t("Won"), value: growthHealth.wonCount, color: CHART_COLORS.emerald },
      { name: t("Lost"), value: growthHealth.lostCount, color: CHART_COLORS.rose },
    ],
    [growthHealth, t]
  );

  // --- Hedef Pazar & Rakip Haritası state/handlers (v2) ---

  const selectedSourceCompany = useMemo(
    () => companies.find((c) => c.id === selectedSourceCompanyId) || null,
    [companies, selectedSourceCompanyId]
  );

  // Otomatik tamamlama önerileri — yazılan metne göre en fazla 8 eşleşen
  // müşteri gösterilir, tüm liste bir kerede getirilmez.
  const customerSuggestions = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return companies.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [companies, customerSearchQuery]);

  const handleSelectSourceCompany = (company: Company) => {
    setSelectedSourceCompanyId(company.id);
    setCustomerSearchQuery(company.name);
    setShowCustomerSuggestions(false);
  };

  const handleClearSourceCompany = () => {
    setSelectedSourceCompanyId("");
    setCustomerSearchQuery("");
    setShowCustomerSuggestions(false);
  };

  // Seçenek 1 (Mevcut Müşteri Üzerinden) otomatik doldurma: referans
  // projeler kazanılan fırsatlardan, kullanılan hizmetler kabul edilen
  // tekliflerin services[] alanından türetilir — Company kaydında bu alanlar
  // ayrıca tutulmuyor, mevcut Deal/Proposal verisinden hesaplanır (veri
  // tekrarı yok).
  const selectedCompanyIntel = useMemo(() => {
    if (!selectedSourceCompany) return { referenceProjects: [] as string[], servicesUsed: [] as string[] };
    const companyDeals = deals.filter(
      (d) => (d.companyId && d.companyId === selectedSourceCompany.id) || normalizeTrKey(d.companyName) === normalizeTrKey(selectedSourceCompany.name)
    );
    const referenceProjects = Array.from(
      new Set(
        companyDeals
          .filter((d) => isWonStage(d.stage))
          .map((d) => d.dealName)
          .filter((n): n is string => Boolean(n && n.trim()))
      )
    ).slice(0, 6);
    const companyProposals = proposals.filter(
      (p) => (p.companyId && p.companyId === selectedSourceCompany.id) || normalizeTrKey(p.companyName) === normalizeTrKey(selectedSourceCompany.name)
    );
    const servicesUsed = Array.from(new Set(companyProposals.flatMap((p) => p.services || []).filter(Boolean))).slice(0, 8);
    return { referenceProjects, servicesUsed };
  }, [selectedSourceCompany, deals, proposals]);

  // Rakip Haritası: seçili müşteriyle AYNI sektördeki (TR karakter
  // duyarsız) tüm hedef firma kayıtları — bu sayede rakip listesi ayrı bir
  // veri modeline değil, mevcut crm_target_accounts kaydına dayanır.
  const competitorsForSelectedCompany = useMemo(() => {
    if (!selectedSourceCompany) return [];
    const key = normalizeTrKey(selectedSourceCompany.industry);
    if (!key) return [];
    return accounts.filter((a) => normalizeTrKey(a.industryTag) === key);
  }, [accounts, selectedSourceCompany]);

  // (getTargetPrimaryContact & getRelationshipStatus top-level module seviyesine taşındı)

  const resetTargetForm = () =>
    setTargetFormDraft({
      companyName: "",
      industryTag: "",
      subIndustry: "",
      city: "",
      websiteUrl: "",
      analysisNotes: "",
      contactFullName: "",
      contactTitle: "",
      contactPhone: "",
      contactEmail: "",
      contactLinkedin: "",
    });

  const handleCreateTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFormDraft.companyName.trim()) {
      triggerToast(t("Company name is strictly required."), "error");
      return;
    }
    const isFromCustomer = startMode === "customer" && !!selectedSourceCompany;
    const industryTag = isFromCustomer
      ? selectedSourceCompany!.industry || t("General Industry")
      : targetFormDraft.industryTag.trim() || t("General Industry");

    // Hızlı formda ilk kontakt bilgisi de girildiyse, firmayla birlikte tek
    // adımda bir TargetContact oluşturulur (rakip analizi yapmadan doğrudan
    // hedef firma + kontakt ekleme akışı).
    const now = new Date().toISOString();
    const firstContact: TargetContact | null = targetFormDraft.contactFullName.trim()
      ? {
          id: `contact_${Date.now()}`,
          fullName: targetFormDraft.contactFullName.trim(),
          title: targetFormDraft.contactTitle.trim(),
          department: "",
          phone: targetFormDraft.contactPhone.trim(),
          email: targetFormDraft.contactEmail.trim(),
          linkedin: targetFormDraft.contactLinkedin.trim(),
          source: isFromCustomer ? t("Competitor Map") : "",
          status: "Bulundu",
          createdAt: now,
          updatedAt: now,
        }
      : null;

    // Hedef Firma Listesinde aynı firma var mı kontrol et (TR karakter duyarsız)
    const inputKey = normalizeTrKey(targetFormDraft.companyName);
    const existingIndex = accounts.findIndex((a) => normalizeTrKey(a.companyName) === inputKey);

    if (existingIndex !== -1) {
      const existing = accounts[existingIndex];
      const updatedAccount: TargetAccount = {
        ...existing,
        websiteUrl: targetFormDraft.websiteUrl.trim() || existing.websiteUrl,
        industryTag: industryTag || existing.industryTag,
        subIndustry: isFromCustomer
          ? selectedSourceCompany!.subIndustry || existing.subIndustry
          : targetFormDraft.subIndustry.trim() || existing.subIndustry,
        city: isFromCustomer
          ? selectedSourceCompany!.billingCity || existing.city
          : targetFormDraft.city.trim() || existing.city,
        analysisNotes: targetFormDraft.analysisNotes.trim()
          ? existing.analysisNotes
            ? `${existing.analysisNotes}\n${targetFormDraft.analysisNotes.trim()}`
            : targetFormDraft.analysisNotes.trim()
          : existing.analysisNotes,
        discoveredFromCompanyId: isFromCustomer ? selectedSourceCompany!.id : existing.discoveredFromCompanyId,
        discoveredFromCompanyName: isFromCustomer ? selectedSourceCompany!.name : existing.discoveredFromCompanyName,
      };

      if (firstContact) {
        const existingContacts = existing.contacts || [];
        const contactExists = existingContacts.some(
          (c) =>
            (firstContact.email && c.email?.toLowerCase().trim() === firstContact.email.toLowerCase().trim()) ||
            normalizeTrKey(c.fullName) === normalizeTrKey(firstContact.fullName)
        );
        if (!contactExists) {
          updatedAccount.contacts = [...existingContacts, firstContact];
        }
      }

      const updatedList = accounts.map((a, idx) => (idx === existingIndex ? updatedAccount : a));
      persistAccounts(updatedList);
      resetTargetForm();
      setShowTargetForm(false);
      setExpandedAccountId(existing.id);

      triggerToast(
        t("'{name}' is already in Target Accounts registry. Existing record loaded & updated.").replace("{name}", existing.companyName),
        "info"
      );

      if (firstContact) {
        setPendingLeadPrompt({ accountId: existing.id, contactId: firstContact.id });
      }
      return;
    }

    const added: TargetAccount = {
      id: `target_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      no: accounts.length + 1,
      companyName: targetFormDraft.companyName.trim(),
      websiteUrl: targetFormDraft.websiteUrl.trim() || `https://www.${targetFormDraft.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      industryTag,
      subIndustry: isFromCustomer ? selectedSourceCompany!.subIndustry || "" : targetFormDraft.subIndustry.trim(),
      city: isFromCustomer ? selectedSourceCompany!.billingCity || targetFormDraft.city.trim() : targetFormDraft.city.trim(),
      companySize: "",
      locationMain: "",
      leadStatus: "New",
      leadSegment: "Cold",
      riskScore: 70,
      aiAnalysisSummary: "",
      draftTemplates: "",
      analysisSource: isFromCustomer ? "Marketing Hub — Rakip Haritası" : "Marketing Hub Manual Entry",
      analysisDate: new Date().toLocaleString("tr-TR"),
      rawOutput: "",
      analysisNotes: targetFormDraft.analysisNotes.trim(),
      bdPipelineStage: bdActiveStages[0] || "Yeni",
      sourceType: isFromCustomer ? "customer" : "manual",
      discoveredFromCompanyId: isFromCustomer ? selectedSourceCompany!.id : undefined,
      discoveredFromCompanyName: isFromCustomer ? selectedSourceCompany!.name : undefined,
      contacts: firstContact ? [firstContact] : [],
    };
    persistAccounts([...accounts, added]);
    resetTargetForm();
    setShowTargetForm(false);
    setExpandedAccountId(added.id);
    triggerToast(t("Added {name} to Target Accounts registry").replace("{name}", added.companyName), "success");
    if (firstContact) {
      setPendingLeadPrompt({ accountId: added.id, contactId: firstContact.id });
    }
  };

  const updateAccountField = (id: string, patch: Partial<TargetAccount>) => {
    persistAccounts(accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  // --- Kontakt Yönetimi (v2) ---
  const openContactForm = (accountId: string) => {
    setShowContactFormFor(accountId);
    setContactDraftByAccount({ ...contactDraftByAccount, [accountId]: { status: "Araştırılıyor" } });
  };

  const updateContactDraft = (accountId: string, patch: Partial<TargetContact>) => {
    setContactDraftByAccount({
      ...contactDraftByAccount,
      [accountId]: { ...(contactDraftByAccount[accountId] || { status: "Araştırılıyor" }), ...patch },
    });
  };

  const handleAddContact = (accountId: string) => {
    const draft = contactDraftByAccount[accountId];
    if (!draft?.fullName?.trim()) {
      triggerToast(t("Contact full name is required."), "error");
      return;
    }
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const now = new Date().toISOString();
    const contact: TargetContact = {
      id: `contact_${Date.now()}`,
      fullName: draft.fullName.trim(),
      title: draft.title?.trim() || "",
      department: draft.department?.trim() || "",
      phone: draft.phone?.trim() || "",
      email: draft.email?.trim() || "",
      linkedin: draft.linkedin?.trim() || "",
      source: draft.source?.trim() || "",
      status: draft.status || "Araştırılıyor",
      createdAt: now,
      updatedAt: now,
    };
    updateAccountField(accountId, {
      contacts: [...(account.contacts || []), contact],
      lastContactDate: new Date().toISOString().split("T")[0],
    });
    setContactDraftByAccount({ ...contactDraftByAccount, [accountId]: { status: "Araştırılıyor" } });
    setShowContactFormFor(null);
    setPendingLeadPrompt({ accountId, contactId: contact.id });
  };

  const updateContact = (accountId: string, contactId: string, patch: Partial<TargetContact>) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    updateAccountField(accountId, {
      contacts: (account.contacts || []).map((c) => (c.id === contactId ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)),
    });
  };

  const deleteContact = async (accountId: string, contactId: string) => {
    const ok = await confirm({
      title: t("Delete Contact"),
      message: t("Are you sure you want to delete this contact?"),
      confirmLabel: t("Delete"),
      cancelLabel: t("Cancel"),
      danger: true,
    });
    if (!ok) return;
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    updateAccountField(accountId, { contacts: (account.contacts || []).filter((c) => c.id !== contactId) });
  };

  // Kontakt lead adayına dönüştürülür: mevcut CrmDb.upsertLeadProfile
  // e-postaya göre eşleşir, firma tekrar oluşturulmaz (Lead.company sadece
  // isim referansı), aynı e-posta varsa var olan Lead kaydı güncellenir.
  const convertContactToLead = (accountId: string, contactId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    const contact = account?.contacts?.find((c) => c.id === contactId);
    if (!account || !contact) return;
    if (!contact.email?.trim()) {
      triggerToast(t("An email address is required to create a lead."), "error");
      return;
    }
    const nameParts = contact.fullName.trim().split(" ");
    const firstName = nameParts[0] || contact.fullName;
    const lastName = nameParts.slice(1).join(" ");
    const result = CrmDb.upsertLeadProfile({
      firstName,
      lastName,
      fullName: contact.fullName,
      email: contact.email.trim(),
      company: account.companyName,
      department: contact.department || "",
      industry: account.industryTag,
    });
    if (!result) {
      triggerToast(t("Could not create lead — check the email address."), "error");
      return;
    }
    updateContact(accountId, contactId, { leadProfileId: result.id, convertedToLeadAt: new Date().toISOString() });
    setPendingLeadPrompt(null);
    triggerToast(t("Lead created and added to Lead Profiles."), "success");
  };

  const deleteTargetAccount = async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (!account) return;
    const ok = await confirm({
      title: t("Remove Target"),
      message: t("Are you sure you want to delete {name}? You can undo or restore it later from Trash.").replace("{name}", account.companyName || ""),
      confirmLabel: t("Delete"),
      cancelLabel: t("Cancel"),
      danger: true,
    });
    if (!ok) return;

    const updated = accounts.filter((a) => a.id !== id);
    persistAccounts(updated);

    const updatedDeleted = [account, ...deletedAccounts.filter((d) => d.id !== id)];
    setDeletedAccounts(updatedDeleted);
    CrmDb.setKv(DELETED_ACCOUNTS_KEY, updatedDeleted);

    if (expandedAccountId === id) {
      setExpandedAccountId(null);
    }

    triggerToast(
      t("'{name}' silindi.").replace("{name}", account.companyName),
      "info",
      () => restoreTargetAccount(account),
      t("Geri Al")
    );
  };

  const restoreTargetAccount = (accountToRestore: TargetAccount) => {
    const restored = deduplicateTargetAccounts([accountToRestore, ...accounts]);
    persistAccounts(restored);

    const updatedDeleted = deletedAccounts.filter((d) => d.id !== accountToRestore.id);
    setDeletedAccounts(updatedDeleted);
    CrmDb.setKv(DELETED_ACCOUNTS_KEY, updatedDeleted);

    triggerToast(t("'{name}' başarıyla geri yüklendi!").replace("{name}", accountToRestore.companyName), "success");
  };

  const createReviewReminderTask = (account: TargetAccount) => {
    if (!account.nextReviewDate) {
      triggerToast(t("Please set a reminder date first."), "error");
      return;
    }
    CrmDb.upsertTask({
      id: `bd-review-${account.id}`,
      title: `${t("Review/contact target company")}: ${account.companyName}`,
      description: account.reviewNote || t("Time to review this target account and consider contact."),
      status: "not_started",
      assignee: actorName || "",
      assigneeEmail: actorEmail || "",
      dueDate: account.nextReviewDate,
      priority: "Medium",
    });
    triggerToast(t("Reminder task created."), "success");
  };

  // --- İş Geliştirme Pipeline'ı handlers ---
  const formatTrDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.${d.getFullYear()}`;
  };

  // Pipeline'ın son aşamasına ("Toplantı Yapıldı") ulaşan bir hedef firma
  // soğuk temastan sıcak temasa geçer — Fırsat Yönetimi'nde otomatik bir Deal
  // kaydı oluşturulur (CrmDb.createDeal yok, Deal Management'taki gerçek
  // "yeni fırsat" akışıyla aynı minimal-geçerli alan seti elle dolduruluyor).
  const promoteAccountToDeal = (account: TargetAccount): Deal => {
    const contacts = account.contacts || [];
    const bestContact = contacts.find((c) => c.status === "Görüşme Yapıldı") || contacts[contacts.length - 1] || null;
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + 30);
    const newDeal: Deal = {
      id: `deal_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      companyId: account.discoveredFromCompanyId,
      dealName: `${account.companyName} ${t("Opportunity")}`,
      companyName: account.companyName,
      contactPerson: bestContact?.fullName || account.companyName,
      contactEmail: bestContact?.email || undefined,
      contactPhone: bestContact?.phone || undefined,
      opportunityValue: 25000,
      expectedCloseDate: formatTrDate(closeDate),
      opportunityScore: 75,
      winProbability: 50,
      currentStageDuration: 1,
      priority: "Medium",
      industry: account.industryTag || t("General Industry"),
      opexScore: 72,
      stage: "Lead Identified",
      owner: actorName || "GP",
      pipeline: "Sales Pipeline Standard",
      leadSource: "İş Geliştirme Pipeline'ı (Soğuk Temas)",
      description: account.analysisNotes || "",
      dealEmails: [],
      activities: [
        {
          id: `act_${Date.now()}`,
          date: new Date().toLocaleDateString("tr-TR"),
          title: t("Transferred from Business Development Pipeline (cold contact)"),
          type: "system",
        },
      ],
      stageHistory: [
        {
          stage: "Lead Identified",
          date: new Date().toLocaleDateString("tr-TR"),
          notes: t("Automatically transferred from the Business Development Pipeline."),
        },
      ],
    };
    return newDeal;
  };

  const handleStageChange = (accountId: string, newStage: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const patch: Partial<TargetAccount> = { bdPipelineStage: newStage };
    const firstStage = bdActiveStages[0];
    if (newStage !== firstStage) {
      patch.lastContactDate = new Date().toISOString().split("T")[0];
    }
    const finalStage = bdActiveStages[bdActiveStages.length - 1];
    if (newStage === finalStage && bdActiveStages.length > 0 && !account.promotedToDealId) {
      const newDeal = promoteAccountToDeal({ ...account, ...patch });
      const existingDeals = CrmDb.getDeals();
      const updatedDeals = [...existingDeals, newDeal];
      CrmDb.saveDeals(updatedDeals);
      setDeals(updatedDeals);
      patch.promotedToDealId = newDeal.id;
      patch.promotedToDealAt = new Date().toISOString();
      triggerToast(
        t("{name} completed the final pipeline stage and was automatically promoted to Deal Management (cold → warm contact).").replace(
          "{name}",
          account.companyName
        ),
        "success"
      );
    }
    updateAccountField(accountId, patch);
  };

  // --- Aşama yönetimi (ekleme / yeniden adlandırma / gizleme / silme) —
  // Fırsat Yönetimi Kanban panosundaki menüyle AYNI davranış. ---
  const toggleBdCollapseStage = (stage: string) => {
    setBdStageMetadata((prev) => ({
      ...prev,
      [stage]: { ...(prev[stage] || { collapsed: false, description: "" }), collapsed: !prev[stage]?.collapsed },
    }));
  };

  const handleBdAddStage = () => {
    const name = bdNewStageName.trim();
    if (!name) return;
    if (bdActiveStages.includes(name)) {
      triggerToast(t("This stage already exists."), "error");
      return;
    }
    setBdActiveStages((prev) => [...prev, name]);
    setBdStageMetadata((prev) => ({ ...prev, [name]: { collapsed: false, description: "" } }));
    setBdNewStageName("");
    setBdIsAddingStage(false);
  };

  const handleBdRenameStage = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    setBdRenamingStage(null);
    if (!trimmed || trimmed === oldName) return;
    if (bdActiveStages.includes(trimmed)) {
      triggerToast(t("This stage already exists."), "error");
      return;
    }
    setBdActiveStages((prev) => prev.map((s) => (s === oldName ? trimmed : s)));
    setBdStageMetadata((prev) => {
      const updated = { ...prev };
      updated[trimmed] = updated[oldName] || { collapsed: false, description: "" };
      delete updated[oldName];
      return updated;
    });
    persistAccounts(accounts.map((a) => ((a.bdPipelineStage || bdActiveStages[0]) === oldName ? { ...a, bdPipelineStage: trimmed } : a)));
  };

  const handleBdDeleteStage = (stage: string) => {
    setBdDeletingStage(stage);
    const others = bdActiveStages.filter((s) => s !== stage);
    setBdDeleteMigrationTarget(others[0] || "");
  };

  const handleBdConfirmDeleteStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bdDeletingStage) return;
    const stageToDelete = bdDeletingStage;
    setBdActiveStages((prev) => prev.filter((s) => s !== stageToDelete));
    const affected = accounts.filter((a) => (a.bdPipelineStage || bdActiveStages[0]) === stageToDelete);
    if (affected.length > 0 && bdDeleteMigrationTarget) {
      persistAccounts(
        accounts.map((a) => ((a.bdPipelineStage || bdActiveStages[0]) === stageToDelete ? { ...a, bdPipelineStage: bdDeleteMigrationTarget } : a))
      );
    }
    setBdStageMetadata((prev) => {
      const updated = { ...prev };
      delete updated[stageToDelete];
      return updated;
    });
    setBdDeletingStage(null);
  };

  // --- Sürükle-bırak (native HTML5 D&D — Fırsat Yönetimi ile aynı yöntem) ---
  const handleBdColumnDragStart = (e: React.DragEvent, stage: string) => {
    e.dataTransfer.setData("text/bd-column-stage", stage);
  };
  const handleBdColumnDrop = (e: React.DragEvent, targetStage: string) => {
    const draggedStage = e.dataTransfer.getData("text/bd-column-stage");
    if (!draggedStage || draggedStage === targetStage) return;
    const oldIndex = bdActiveStages.indexOf(draggedStage);
    const newIndex = bdActiveStages.indexOf(targetStage);
    if (oldIndex === -1 || newIndex === -1) return;
    const updated = [...bdActiveStages];
    updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, draggedStage);
    setBdActiveStages(updated);
  };
  const handleBdCardDragStart = (e: React.DragEvent, accountId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/bd-account-id", accountId);
  };
  const handleBdCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleBdCardDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const accountId = e.dataTransfer.getData("text/bd-account-id");
    if (!accountId) return;
    const account = accounts.find((a) => a.id === accountId);
    if (!account || (account.bdPipelineStage || bdActiveStages[0]) === targetStage) return;
    handleStageChange(accountId, targetStage);
  };

  // --- Stratejik Hedefler & OKR CRUD ---
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalForm, setGoalForm] = useState<{
    title: string;
    ownerName: string;
    period: string;
    status: StrategicGoal["status"];
    keyResults: MarketingKeyResult[];
  }>({ title: "", ownerName: "", period: "", status: "Devam Ediyor", keyResults: [] });
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const resetGoalForm = () => setGoalForm({ title: "", ownerName: "", period: "", status: "Devam Ediyor", keyResults: [] });

  const addKeyResultDraft = () => {
    setGoalForm({
      ...goalForm,
      keyResults: [...goalForm.keyResults, { id: `kr_${Date.now()}`, description: "", targetValue: 100, currentValue: 0, unit: "" }],
    });
  };
  const updateKeyResultDraft = (id: string, patch: Partial<MarketingKeyResult>) => {
    setGoalForm({ ...goalForm, keyResults: goalForm.keyResults.map((k) => (k.id === id ? { ...k, ...patch } : k)) });
  };
  const removeKeyResultDraft = (id: string) => {
    setGoalForm({ ...goalForm, keyResults: goalForm.keyResults.filter((k) => k.id !== id) });
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.title.trim() || !goalForm.period.trim()) {
      triggerToast(t("Objective title and period are required."), "error");
      return;
    }
    const now = new Date().toISOString();
    if (editingGoalId) {
      persistGoals(goals.map((g) => (g.id === editingGoalId ? { ...g, ...goalForm, updatedAt: now } : g)));
      triggerToast(t("Goal updated."), "success");
    } else {
      const added: StrategicGoal = { id: `goal_${Date.now()}`, ...goalForm, createdAt: now, updatedAt: now };
      persistGoals([added, ...goals]);
      triggerToast(t("Goal created."), "success");
    }
    resetGoalForm();
    setEditingGoalId(null);
    setShowAddGoal(false);
  };

  const startEditGoal = (g: StrategicGoal) => {
    setGoalForm({ title: g.title, ownerName: g.ownerName || "", period: g.period, status: g.status, keyResults: g.keyResults });
    setEditingGoalId(g.id);
    setShowAddGoal(true);
  };

  const deleteGoal = async (id: string) => {
    const ok = await confirm({
      title: t("Delete Goal"),
      message: t("Are you sure you want to delete this strategic goal?"),
      confirmLabel: t("Delete"),
      cancelLabel: t("Cancel"),
      danger: true,
    });
    if (!ok) return;
    persistGoals(goals.filter((g) => g.id !== id));
    triggerToast(t("Goal deleted."), "info");
  };

  // --- Dijital Pazarlama Zekası: rapor yükleme + Gemini analizi ---
  const [reportText, setReportText] = useState("");
  const [reportFileName, setReportFileName] = useState("");
  const [reportSourceType, setReportSourceType] = useState("Google Analytics");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    keywords: string[];
    blogTopics: string[];
    strategyActions: string[];
    rawSummary: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleReportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReportFileName(file.name);
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const workbook = XLSX.read(bstr, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
          setReportText(csvText.slice(0, 30000));
        } catch {
          triggerToast(t("Could not read spreadsheet contents."), "error");
        }
      };
      reader.readAsBinaryString(file);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setReportText(String(evt.target?.result || "").slice(0, 30000));
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = "";
  };

  const handleAnalyzeReport = async () => {
    if (!reportText.trim()) {
      triggerToast(t("Please paste or upload report content first."), "error");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    try {
      const res = await fetch("/api/gemini/marketing-report-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportText,
          fileName: reportFileName || t("Pasted content"),
          sourceType: reportSourceType,
          industryContext: industryStats.slice(0, 5).map((r) => r.industry).join(", "),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t("Analysis failed."));
      setAnalysisResult(data);
      const insight: MarketingReportInsight = {
        id: `insight_${Date.now()}`,
        fileName: reportFileName || t("Pasted content"),
        uploadedAt: new Date().toISOString(),
        sourceType: reportSourceType,
        keywords: data.keywords || [],
        blogTopics: data.blogTopics || [],
        strategyActions: data.strategyActions || [],
        rawSummary: data.rawSummary || "",
      };
      persistReportInsights([insight, ...reportInsights]);
      triggerToast(t("Report analyzed successfully."), "success");
    } catch (err: any) {
      setAnalysisError(err.message || t("Analysis failed."));
      triggerToast(err.message || t("Analysis failed."), "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteInsight = async (id: string) => {
    const ok = await confirm({
      title: t("Delete"),
      message: t("Delete this saved analysis?"),
      confirmLabel: t("Delete"),
      cancelLabel: t("Cancel"),
      danger: true,
    });
    if (!ok) return;
    persistReportInsights(reportInsights.filter((i) => i.id !== id));
  };

  // --- Ortak "Power BI" tarzı görsel bileşenler (SalesDashboardView.tsx'in
  // KPI kart + grafik kart deseniyle aynı: rounded-2xl, uppercase tracking
  // etiket, font-black font-mono değer, ResponsiveContainer grafikler) ---
  const KpiCard = ({
    label,
    value,
    sub,
    icon,
    accentColor = "text-[#0078D4] dark:text-blue-400",
    valueColor,
  }: {
    label: string;
    value: string;
    sub?: string;
    icon?: React.ReactNode;
    accentColor?: string;
    valueColor?: string;
  }) => (
    <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between text-slate-400">
        <span className={`text-[10px] font-extrabold uppercase tracking-widest ${accentColor}`}>{label}</span>
        {icon && <div className={accentColor}>{icon}</div>}
      </div>
      <div className="my-2.5">
        <span className={`text-xl md:text-2xl font-black font-mono leading-none tracking-tight ${valueColor || ""}`}>{value}</span>
        {sub && <span className="block text-[10px] text-slate-400 mt-1">{sub}</span>}
      </div>
    </div>
  );

  const ChartCard = ({
    title,
    subtitle,
    children,
    className = "",
    height = "h-[300px]",
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    height?: string;
  }) => (
    <div className={`bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs flex flex-col ${height} ${className}`}>
      <h3 className="text-xs font-black uppercase tracking-widest text-[#0078D4] dark:text-blue-400 mb-1">{title}</h3>
      {subtitle && <p className="text-[10px] text-slate-400 mb-3">{subtitle}</p>}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );

  const subTabs: { key: MarketingSubTab; label: string; description: string; icon: React.ReactNode }[] = [
    {
      key: "overview",
      label: "Marketing Hub Overview",
      description: "All Marketing & Business Development sections at a glance.",
      icon: <LayoutDashboard className="w-5 h-5 flex-shrink-0" />,
    },
    {
      key: "industry-intel",
      label: "Industry Intelligence",
      description: "Automatically computed from your existing customer and deal data.",
      icon: <TrendingUp className="w-5 h-5 flex-shrink-0" />,
    },
    {
      key: "target-market",
      label: "Target Market & Competitor Map",
      description: "Target companies, competitors, and review reminders per sector.",
      icon: <Target className="w-5 h-5 flex-shrink-0" />,
    },
    {
      key: "bd-pipeline",
      label: "Business Development Pipeline",
      description: "Move a target company through the outreach pipeline.",
      icon: <Briefcase className="w-5 h-5 flex-shrink-0" />,
    },
    {
      key: "growth-health",
      label: "Growth Health",
      description: "Customer, pipeline, and sales-cycle health indicators.",
      icon: <BarChart2 className="w-5 h-5 flex-shrink-0" />,
    },
    {
      key: "digital-intel",
      label: "Digital Marketing Intelligence",
      description: "Upload a report and get keyword, blog, and strategy suggestions.",
      icon: <Search className="w-5 h-5 flex-shrink-0" />,
    },
    {
      key: "kpi-okr",
      label: "BD KPIs, Win/Loss & OKR",
      description: "Win/loss breakdown and strategic goals & OKR tracking.",
      icon: <Award className="w-5 h-5 flex-shrink-0" />,
    },
  ];

  const currentTabDef = subTabs.find((s) => s.key === activeSubTab) || subTabs[0];

  const filteredAccounts = accounts
    .filter((a) => !targetSectorFilter || a.industryTag === targetSectorFilter)
    .filter((a) => !targetSearch || a.companyName.toLowerCase().includes(targetSearch.toLowerCase()));

  return (
    <div id="marketing-hub-view-root" className="space-y-4">
      {toast && (
        <div
          id="marketing-hub-toast"
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-bounce max-w-md ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : toast.type === "error"
              ? "bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
              : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200"
          }`}
        >
          <Check className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-semibold flex-1">{toast.msg}</span>
          {toast.onUndo && (
            <button
              type="button"
              onClick={() => {
                toast.onUndo?.();
                setToast(null);
              }}
              className="px-3 py-1 bg-[#0078D4] hover:bg-[#106ebe] text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 shrink-0 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{toast.undoLabel || t("Geri Al")}</span>
            </button>
          )}
        </div>
      )}

      <ConfirmModal {...confirmProps} />

      {/* Sayfa başlığı — navigasyon artık sol menüde (App.tsx), burada sadece
          hangi bölümde olunduğunu gösteren kompakt bir başlık var. */}
      <div className="bg-white dark:bg-[#1b1a19] p-5 border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs flex items-center gap-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-[#0078D4] to-emerald-500" />
        <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] dark:bg-[#1E3A5F]/30 flex items-center justify-center text-[#0078D4] dark:text-blue-400 flex-shrink-0">
          {currentTabDef.icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t(currentTabDef.label)}</h2>
          <p className="text-[11px] text-slate-500 truncate">{t(currentTabDef.description)}</p>
        </div>
      </div>

      {activeSubTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label={t("Sectors Tracked")}
              value={String(industryStats.length)}
              sub={t("Industry intelligence")}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KpiCard
              label={t("Target Companies")}
              value={String(accounts.length)}
              sub={t("In target market registry")}
              icon={<Target className="w-4 h-4" />}
            />
            <KpiCard
              label={t("Active in BD Pipeline")}
              value={String(
                accounts.filter((a) => {
                  const stage = a.bdPipelineStage || bdActiveStages[0];
                  return stage !== bdActiveStages[0] && !a.promotedToDealId;
                }).length
              )}
              sub={t("Currently being worked")}
              icon={<Briefcase className="w-4 h-4" />}
              accentColor="text-indigo-500"
            />
            <KpiCard
              label={t("Pending Review/Contact")}
              value={String(reviewPendingAccounts.length)}
              sub={t("Due within 7 days")}
              icon={<Clock className="w-4 h-4" />}
              accentColor="text-amber-500"
              valueColor="text-amber-600 dark:text-amber-400"
            />
            <KpiCard
              label={t("Overall Win Rate")}
              value={`%${lossAnalysis.winRate.toFixed(0)}`}
              sub={t("Won vs Lost")}
              icon={<Percent className="w-4 h-4" />}
              accentColor="text-emerald-500"
              valueColor="text-emerald-600 dark:text-emerald-400"
            />
            <KpiCard
              label={t("Leads Generated")}
              value={String(accounts.reduce((sum, a) => sum + (a.contacts?.filter((c) => c.leadProfileId).length || 0), 0))}
              sub={t("Contacts converted to leads")}
              icon={<Users className="w-4 h-4" />}
            />
            <KpiCard
              label={t("Open Pipeline Value")}
              value={formatCurrencyShort(growthHealth.pipelineValue)}
              sub={t("Open opportunities")}
              icon={<DollarSign className="w-4 h-4" />}
            />
            <KpiCard
              label={t("Active OKRs")}
              value={String(goals.filter((g) => g.status === "Devam Ediyor").length)}
              sub={t("Strategic goals in progress")}
              icon={<Flag className="w-4 h-4" />}
              accentColor="text-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <ChartCard
              title={t("Top Sectors by Strength")}
              subtitle={t("Customer count and win rate per sector")}
              className="lg:col-span-7"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={industryChartData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" fontSize={9} tickLine={false} />
                  <YAxis yAxisId="left" fontSize={9} tickLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" fontSize={9} tickLine={false} unit="%" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar yAxisId="left" dataKey={t("Customers")} fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} barSize={22} />
                  <Line yAxisId="right" type="monotone" dataKey={t("Win Rate")} stroke={CHART_COLORS.emerald} strokeWidth={2.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("Win / Loss Analysis")} subtitle={t("Won vs Lost")} className="lg:col-span-5">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={winLossDonutData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3}>
                    {winLossDonutData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {activeSubTab === "industry-intel" && (
        <div className="space-y-4">
          <ChartCard
            title={t("Industry Intelligence")}
            subtitle={t("Automatically computed from your existing customer and deal data — no manual entry required.")}
            height="h-[340px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={industryChartData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" fontSize={9} tickLine={false} />
                <YAxis yAxisId="left" fontSize={9} tickLine={false} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" fontSize={9} tickLine={false} unit="%" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar yAxisId="left" dataKey={t("Customers")} fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} barSize={22} />
                <Line yAxisId="right" type="monotone" dataKey={t("Win Rate")} stroke={CHART_COLORS.emerald} strokeWidth={2.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF9F8] dark:bg-[#201f1e] text-[10px] font-bold text-slate-450 uppercase border-b border-[#EDEBE9] dark:border-[#323130]">
                    <th className="p-3">{t("Industry")}</th>
                    <th className="p-3">{t("Customers")}</th>
                    <th className="p-3">{t("Deals")}</th>
                    <th className="p-3">{t("Win Rate")}</th>
                    <th className="p-3">{t("Won Value")}</th>
                    <th className="p-3">{t("Avg Deal Size")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEBE9] dark:divide-[#323130]">
                  {industryStats.map((row) => (
                    <tr key={row.industry}>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{row.industry}</td>
                      <td className="p-3">{row.customerCount}</td>
                      <td className="p-3">{row.dealCount}</td>
                      <td className="p-3">%{row.winRate.toFixed(0)}</td>
                      <td className="p-3">{formatCurrencyShort(row.wonValue)}</td>
                      <td className="p-3">{formatCurrencyShort(row.avgDealSize)}</td>
                    </tr>
                  ))}
                  {industryStats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        {t("No industry data available yet.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "target-market" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label={t("Target Companies")} value={String(accounts.length)} icon={<Target className="w-4 h-4" />} />
            <KpiCard
              label={t("Pending Review/Contact")}
              value={String(reviewPendingAccounts.length)}
              icon={<Clock className="w-4 h-4" />}
              accentColor="text-amber-500"
              valueColor="text-amber-600 dark:text-amber-400"
            />
            <KpiCard
              label={t("Contacts")}
              value={String(accounts.reduce((sum, a) => sum + (a.contacts?.length || 0), 0))}
              icon={<Users className="w-4 h-4" />}
              accentColor="text-rose-500"
            />
            <KpiCard label={t("Sectors Tracked")} value={String(industryStats.length)} icon={<TrendingUp className="w-4 h-4" />} />
          </div>

          {/* 1. Başlangıç Seçimi */}
          <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStartMode("customer")}
                className={`text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5 cursor-pointer border ${
                  startMode === "customer"
                    ? "bg-[#0078D4] border-[#0078D4] text-white"
                    : "bg-[#FAF9F8] dark:bg-[#252423] border-[#EDEBE9] dark:border-[#323130] text-slate-600 dark:text-slate-300"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t("Via Existing Customer")}</span>
              </button>
              <button
                type="button"
                onClick={() => setStartMode("manual")}
                className={`text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5 cursor-pointer border ${
                  startMode === "manual"
                    ? "bg-[#0078D4] border-[#0078D4] text-white"
                    : "bg-[#FAF9F8] dark:bg-[#252423] border-[#EDEBE9] dark:border-[#323130] text-slate-600 dark:text-slate-300"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t("New Target Company")}</span>
              </button>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab("deal-management")}
                  className="ml-auto text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center gap-1.5 cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{t("Deal Management")}</span>
                </button>
              )}
            </div>

            {startMode === "customer" && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Select Customer")}</label>
                  <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerSuggestions(true);
                        if (selectedSourceCompanyId) setSelectedSourceCompanyId("");
                      }}
                      onFocus={() => setShowCustomerSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 150)}
                      placeholder={t("Type a customer name...")}
                      className="w-full p-2 pl-9 pr-8 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none text-xs focus:border-[#0078D4]"
                    />
                    {selectedSourceCompanyId && (
                      <button
                        type="button"
                        onMouseDown={handleClearSourceCompany}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {showCustomerSuggestions && customerSearchQuery.trim() && !selectedSourceCompanyId && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {customerSuggestions.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onMouseDown={() => handleSelectSourceCompany(c)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-[#FAF9F8] dark:hover:bg-[#252423] cursor-pointer flex items-center justify-between gap-2"
                          >
                            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{c.name}</span>
                            {c.industry && <span className="text-[10px] text-slate-400 flex-shrink-0">{c.industry}</span>}
                          </button>
                        ))}
                        {customerSuggestions.length === 0 && (
                          <div className="px-3 py-2 text-[11px] text-slate-400">{t("No matching customers found.")}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {selectedSourceCompany && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#FAF9F8] dark:bg-[#201f1e] rounded-xl p-4 border border-[#EDEBE9] dark:border-[#323130]">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{t("Sector")}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSourceCompany.industry || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{t("Sub-Sector")}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSourceCompany.subIndustry || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{t("Production Type")}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSourceCompany.productionType || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{t("Location")}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSourceCompany.billingCity || "—"}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{t("Services Used")}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {selectedCompanyIntel.servicesUsed.length > 0 ? selectedCompanyIntel.servicesUsed.join(", ") : "—"}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{t("Reference Projects")}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {selectedCompanyIntel.referenceProjects.length > 0 ? selectedCompanyIntel.referenceProjects.join(", ") : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">
                        {t("Competitor Map")}{" "}
                        <span className="text-slate-400 font-normal normal-case">
                          ({t("companies operating in the same sector")}: {selectedSourceCompany.industry})
                        </span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          resetTargetForm();
                          setShowTargetForm(!showTargetForm);
                        }}
                        className="text-xs font-bold bg-[#0078D4] hover:bg-[#106ebe] text-white px-3 py-2 rounded flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{showTargetForm ? t("Cancel") : t("Add New Competitor")}</span>
                      </button>
                    </div>

                    <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#FAF9F8] dark:bg-[#201f1e] text-[10px] font-bold text-slate-450 uppercase border-b border-[#EDEBE9] dark:border-[#323130]">
                            <th className="p-3">{t("Company Name")}</th>
                            <th className="p-3">{t("City")}</th>
                            <th className="p-3">{t("Contact Name")}</th>
                            <th className="p-3">{t("Contact Email")}</th>
                            <th className="p-3">{t("Status")}</th>
                            <th className="p-3">{t("Contact Count")}</th>
                            <th className="p-3">{t("Last Action")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EDEBE9] dark:divide-[#323130]">
                          {competitorsForSelectedCompany.map((account) => {
                            const status = getRelationshipStatus(account, companies);
                            const primaryContact = getTargetPrimaryContact(account);
                            const contactCount = (account.contacts?.length || 0) || (account.contactEmail ? 1 : 0);
                            return (
                              <tr
                                key={account.id}
                                onClick={() => setExpandedAccountId(account.id)}
                                className="cursor-pointer hover:bg-[#FAF9F8] dark:hover:bg-[#201f1e]"
                              >
                                <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{account.companyName}</td>
                                <td className="p-3">{account.city || account.locationMain || "—"}</td>
                                <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{primaryContact.fullName}</td>
                                <td className="p-3 font-mono text-[#0078D4] dark:text-brand-400 font-semibold">{primaryContact.email}</td>
                                <td className="p-3">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      status === "Müşteri"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                        : status === "Görüşülüyor"
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                    }`}
                                  >
                                    {t(status)}
                                  </span>
                                </td>
                                <td className="p-3 font-mono font-bold text-[#0078D4]">{contactCount}</td>
                                <td className="p-3">{account.lastContactDate || account.analysisDate || "—"}</td>
                              </tr>
                            );
                          })}
                          {competitorsForSelectedCompany.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-slate-400">
                                {t("No competitors tracked in this sector yet. Add one above.")}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {(startMode === "manual" || (startMode === "customer" && showTargetForm)) && (
              <form
                onSubmit={handleCreateTarget}
                className="bg-[#FAF9F8] dark:bg-[#201f1e] border border-[#0078D4]/20 rounded-xl p-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Company Name *")}</label>
                    <input
                      type="text"
                      list="existing-target-accounts-list"
                      value={targetFormDraft.companyName}
                      onChange={(e) => setTargetFormDraft({ ...targetFormDraft, companyName: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      required
                    />
                    <datalist id="existing-target-accounts-list">
                      {accounts.map((a) => (
                        <option key={a.id} value={a.companyName}>
                          {a.companyName} ({a.industryTag || t("Target Company")})
                        </option>
                      ))}
                    </datalist>
                  </div>
                  {startMode === "manual" ? (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Industry / Sector")}</label>
                      <input
                        type="text"
                        list="marketing-sector-suggestions"
                        value={targetFormDraft.industryTag}
                        onChange={(e) => setTargetFormDraft({ ...targetFormDraft, industryTag: e.target.value })}
                        className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      />
                      <datalist id="marketing-sector-suggestions">
                        {industryStats.map((row) => (
                          <option key={row.industry} value={row.industry} />
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Sector")}</label>
                      <input
                        type="text"
                        value={selectedSourceCompany?.industry || ""}
                        disabled
                        className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-slate-100 dark:bg-[#323130] rounded outline-none text-slate-500"
                      />
                    </div>
                  )}
                  {startMode === "manual" && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Sub-Sector")}</label>
                      <input
                        type="text"
                        value={targetFormDraft.subIndustry}
                        onChange={(e) => setTargetFormDraft({ ...targetFormDraft, subIndustry: e.target.value })}
                        className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("City")}</label>
                    <input
                      type="text"
                      value={targetFormDraft.city}
                      onChange={(e) => setTargetFormDraft({ ...targetFormDraft, city: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Website URL")}</label>
                    <input
                      type="text"
                      value={targetFormDraft.websiteUrl}
                      onChange={(e) => setTargetFormDraft({ ...targetFormDraft, websiteUrl: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Note")}</label>
                    <textarea
                      value={targetFormDraft.analysisNotes}
                      onChange={(e) => setTargetFormDraft({ ...targetFormDraft, analysisNotes: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none h-16 resize-none focus:border-[#0078D4]"
                    />
                  </div>
                </div>

                {/* Rakip analizi yapmadan doğrudan hedef firma + ilk kontakt
                    ekleyebilme — firma kaydıyla birlikte tek adımda kaydedilir,
                    e-posta girildiyse lead adayına dönüştürme istemi açılır. */}
                <div className="border-t border-[#EDEBE9] dark:border-[#323130] pt-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">{t("First Contact (optional)")}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder={t("Full Name")}
                      value={targetFormDraft.contactFullName}
                      onChange={(e) => setTargetFormDraft({ ...targetFormDraft, contactFullName: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                    <input
                      type="text"
                      placeholder={t("Title")}
                      value={targetFormDraft.contactTitle}
                      onChange={(e) => setTargetFormDraft({ ...targetFormDraft, contactTitle: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                    <input
                      type="text"
                      placeholder={t("Phone")}
                      value={targetFormDraft.contactPhone}
                      onChange={(e) => setTargetFormDraft({ ...targetFormDraft, contactPhone: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                    <input
                      type="email"
                      placeholder={t("Email")}
                      value={targetFormDraft.contactEmail}
                      onChange={(e) => setTargetFormDraft({ ...targetFormDraft, contactEmail: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                    <input
                      type="text"
                      placeholder={t("LinkedIn")}
                      value={targetFormDraft.contactLinkedin}
                      onChange={(e) => setTargetFormDraft({ ...targetFormDraft, contactLinkedin: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4] sm:col-span-2"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {t("If you provide an email, you'll be asked whether to create this contact as a lead.")}
                  </p>
                </div>

                <div className="flex justify-end">
                  <button type="submit" className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded flex items-center gap-1 cursor-pointer">
                    <Check className="w-4 h-4" />
                    <span>{t("Append Target Company")}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {reviewPendingAccounts.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {t("Pending Review / Contact")}
              </h3>
              <div className="space-y-1.5">
                {reviewPendingAccounts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setExpandedAccountId(a.id)}
                    className="flex items-center justify-between text-xs bg-white dark:bg-[#1b1a19] p-2 rounded border border-amber-100 dark:border-amber-900/50 cursor-pointer"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {a.companyName} <span className="text-slate-400 font-normal">— {a.industryTag}</span>
                    </span>
                    <span className="text-amber-700 dark:text-amber-400">{a.nextReviewDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* (expandedAccountId modal diyaloğu tüm sekmelerde çalışacak şekilde bileşen sonuna taşındı) */}

          {/* Tüm Hedef Firmalar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{t("All Target Companies")}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={t("Search target companies...")}
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                    className="bg-[#faf9f8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-xs rounded pl-9 pr-4 py-2 w-56 outline-none focus:border-[#0078D4]"
                  />
                </div>
                <select
                  value={targetSectorFilter}
                  onChange={(e) => setTargetSectorFilter(e.target.value)}
                  className="bg-[#faf9f8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-xs p-2 rounded outline-none"
                >
                  <option value="">{t("-- All Sectors --")}</option>
                  {industryStats.map((row) => (
                    <option key={row.industry} value={row.industry}>
                      {row.industry}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowDeletedModal(true)}
                  className="text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  title={t("Silinen hedef firmaları görüntüle ve geri yükle")}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t("Çöp Kutusu / Silinenler")} ({deletedAccounts.length})</span>
                </button>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF9F8] dark:bg-[#201f1e] text-[10px] font-bold text-slate-450 uppercase border-b border-[#EDEBE9] dark:border-[#323130]">
                    <th className="p-3">{t("Company Name")}</th>
                    <th className="p-3">{t("Sector")}</th>
                    <th className="p-3">{t("Contact Name")}</th>
                    <th className="p-3">{t("Contact Email")}</th>
                    <th className="p-3">{t("Status")}</th>
                    <th className="p-3">{t("Contact Count")}</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEBE9] dark:divide-[#323130]">
                  {filteredAccounts.map((account) => {
                    const status = getRelationshipStatus(account, companies);
                    const primaryContact = getTargetPrimaryContact(account);
                    const contactCount = (account.contacts?.length || 0) || (account.contactEmail ? 1 : 0);
                    return (
                      <tr key={account.id} onClick={() => setExpandedAccountId(account.id)} className="cursor-pointer hover:bg-[#FAF9F8] dark:hover:bg-[#201f1e]">
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{account.companyName}</td>
                        <td className="p-3">{account.industryTag}</td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{primaryContact.fullName}</td>
                        <td className="p-3 font-mono text-[#0078D4] dark:text-brand-400 font-semibold">{primaryContact.email}</td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              status === "Müşteri"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : status === "Görüşülüyor"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {t(status)}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-[#0078D4]">{contactCount}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedAccountId(account.id);
                              }}
                              className="text-slate-400 hover:text-[#0078D4] dark:hover:text-brand-400 cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title={t("Düzenle")}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTargetAccount(account.id);
                              }}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              title={t("Sil")}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        {t("No target companies yet. Add your first one above.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "bd-pipeline" && (
        <div className="space-y-5 animate-fade-in">
          {/* 2026 UI/UX Modern KPI Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">{t("Pipeline Target Companies")}</span>
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100 block mt-1">{bdPipelineStats.total}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0078D4] dark:text-brand-400 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">{t("Avg Opportunity Score")}</span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">% {bdPipelineStats.avgScore}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">{t("Promoted to Deals")}</span>
                <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 block mt-1">{bdPipelineStats.promoted}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">{t("High Opportunity Leads")}</span>
                <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 block mt-1">{bdPipelineStats.highOpp}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Top Control Bar & Live Search */}
          <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={t("Live search company, contact name, email, or city in Kanban...")}
                  value={bdKanbanSearch}
                  onChange={(e) => setBdKanbanSearch(e.target.value)}
                  className="w-full bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-xs rounded-xl pl-9 pr-8 py-2 outline-none focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                />
                {bdKanbanSearch && (
                  <button type="button" onClick={() => setBdKanbanSearch("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-500 hidden sm:inline-block">
                {t("Showing {count} companies in active stages").replace("{count}", String(accounts.length))}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBdIsAddingStage(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t("+ Custom Stage")}</span>
              </button>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab("deal-management")}
                  className="px-3.5 py-2 bg-[#FAF9F8] dark:bg-[#252423] hover:bg-[#EDEBE9] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 border border-[#EDEBE9] dark:border-[#323130] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Briefcase className="w-4 h-4 text-[#0078D4]" />
                  <span>{t("Deal Management")}</span>
                </button>
              )}
            </div>
          </div>

          {/* Custom Stage Modal / Input Form */}
          {bdIsAddingStage && (
            <div className="bg-[#FAF9F8] dark:bg-[#201f1e] border border-[#0078D4]/30 rounded-2xl p-4 flex items-center gap-3 shadow-md animate-fade-in">
              <input
                type="text"
                autoFocus
                value={bdNewStageName}
                onChange={(e) => setBdNewStageName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleBdAddStage();
                  if (e.key === "Escape") {
                    setBdIsAddingStage(false);
                    setBdNewStageName("");
                  }
                }}
                placeholder={t("New stage name (e.g., Demoseminar, Offer Sent)")}
                className="flex-1 p-2.5 text-xs border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded-xl outline-none focus:border-[#0078D4]"
              />
              <button type="button" onClick={handleBdAddStage} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl cursor-pointer">
                {t("Add Stage")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBdIsAddingStage(false);
                  setBdNewStageName("");
                }}
                className="text-xs font-bold text-slate-500 px-3 py-2.5 cursor-pointer"
              >
                {t("Cancel")}
              </button>
            </div>
          )}

          {/* Delete Stage Form */}
          {bdDeletingStage && (
            <form onSubmit={handleBdConfirmDeleteStage} className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 space-y-3 animate-fade-in">
              <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                {t("Delete stage")} "{t(bdDeletingStage)}"?
              </p>
              {(pipelineByStage[bdDeletingStage] || []).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-[11px] text-slate-600 dark:text-slate-300">{t("Move its companies to:")}</label>
                  <select
                    value={bdDeleteMigrationTarget}
                    onChange={(e) => setBdDeleteMigrationTarget(e.target.value)}
                    className="text-xs p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded-xl outline-none"
                  >
                    {bdActiveStages
                      .filter((s) => s !== bdDeletingStage)
                      .map((s) => (
                        <option key={s} value={s}>
                          {t(s)}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button type="submit" className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl cursor-pointer">
                  {t("Delete Stage")}
                </button>
                <button type="button" onClick={() => setBdDeletingStage(null)} className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer">
                  {t("Cancel")}
                </button>
              </div>
            </form>
          )}

          {/* 2026 UI/UX Kanban Columns Board Container */}
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[550px] scrollbar-thin">
            {bdActiveStages.map((stage, stageIndex) => {
              const stageAccounts = pipelineByStage[stage] || [];
              const isCollapsed = !!bdStageMetadata[stage]?.collapsed;
              const isFinalStage = stage === bdActiveStages[bdActiveStages.length - 1];
              const accentColor = STAGE_ACCENT_COLORS[stageIndex % STAGE_ACCENT_COLORS.length];

              return (
                <div
                  key={stage}
                  draggable
                  onDragStart={(e) => handleBdColumnDragStart(e, stage)}
                  onDragOver={handleBdCardDragOver}
                  onDrop={(e) => {
                    if (e.dataTransfer.types.includes("text/bd-column-stage")) {
                      handleBdColumnDrop(e, stage);
                    } else {
                      handleBdCardDrop(e, stage);
                    }
                  }}
                  className={`flex-shrink-0 ${
                    isCollapsed ? "w-14" : "w-72"
                  } bg-[#FAF9F8] dark:bg-[#1e1d1c] border border-[#EDEBE9] dark:border-[#323130] border-t-4 ${accentColor.topBorder} rounded-2xl shadow-sm transition-all duration-200 flex flex-col`}
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-[#EDEBE9] dark:border-[#323130] cursor-move select-none">
                    {isCollapsed ? (
                      <button type="button" onClick={() => toggleBdCollapseStage(stage)} className="w-full flex flex-col items-center gap-2 cursor-pointer py-2">
                        <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${accentColor.badge}`}>{stageAccounts.length}</span>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 [writing-mode:vertical-rl] whitespace-nowrap">{t(stage)}</span>
                      </button>
                    ) : bdRenamingStage === stage ? (
                      <input
                        type="text"
                        autoFocus
                        value={bdRenameValue}
                        onChange={(e) => setBdRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleBdRenameStage(stage, bdRenameValue);
                          if (e.key === "Escape") setBdRenamingStage(null);
                        }}
                        onBlur={() => handleBdRenameStage(stage, bdRenameValue)}
                        className="w-full text-xs font-bold p-1.5 border border-[#0078D4] bg-white dark:bg-[#252423] rounded-lg outline-none"
                      />
                    ) : (
                      <div className="relative">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-slate-400">{stageIndex + 1}.</span>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{t(stage)}</h4>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${accentColor.badge}`}>
                              {stageAccounts.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBdActiveStageMenu(bdActiveStageMenu === stage ? null : stage)}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer flex-shrink-0 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#323130]"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Stage Description / Final Tag Sub-header */}
                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-medium">
                          <span className="truncate">{bdStageMetadata[stage]?.description || t("Stage")}</span>
                          {isFinalStage && (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded flex-shrink-0">
                              → {t("Deal Transfer")}
                            </span>
                          )}
                        </div>

                        {/* Column Dropdown Menu */}
                        {bdActiveStageMenu === stage && (
                          <div className="absolute z-20 top-full right-0 mt-1 w-44 bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-xl shadow-xl p-1.5 space-y-1 text-xs animate-fade-in">
                            <button
                              type="button"
                              onClick={() => {
                                toggleBdCollapseStage(stage);
                                setBdActiveStageMenu(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-[#FAF9F8] dark:hover:bg-[#252423] rounded-lg cursor-pointer"
                            >
                              {t("Collapse Stage")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBdRenamingStage(stage);
                                setBdRenameValue(stage);
                                setBdActiveStageMenu(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-[#FAF9F8] dark:hover:bg-[#252423] rounded-lg cursor-pointer"
                            >
                              {t("Rename Stage")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleBdDeleteStage(stage);
                                setBdActiveStageMenu(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer font-semibold"
                            >
                              {t("Delete Stage")}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Column Cards Container */}
                  {!isCollapsed && (
                    <div className="p-2.5 space-y-2.5 min-h-[140px] max-h-[560px] overflow-y-auto w-full scrollbar-thin">
                      {stageAccounts.map((account) => {
                        const primaryContact = getTargetPrimaryContact(account);
                        return (
                          <div
                            key={account.id}
                            draggable
                            onDragStart={(e) => handleBdCardDragStart(e, account.id)}
                            className="group bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-xl p-3 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 space-y-2.5 cursor-grab active:cursor-grabbing border-l-4 border-l-[#0078D4]"
                          >
                            {/* Card Top Header: Drag Handle + Company Name + Gray Edit Icon */}
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0 cursor-grab" />
                                <h5
                                  onClick={() => setExpandedAccountId(account.id)}
                                  className="text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-[#0078D4] dark:hover:text-brand-400 cursor-pointer truncate"
                                  title={account.companyName}
                                >
                                  {account.companyName}
                                </h5>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedAccountId(account.id);
                                }}
                                className="text-slate-400 hover:text-[#0078D4] dark:hover:text-brand-400 cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                                title={t("Edit Target Account Details")}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Sector & City Pills */}
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-md truncate max-w-[140px]">
                                {account.industryTag || t("General Industry")}
                              </span>
                              {(account.city || account.locationMain) && (
                                <span className="text-slate-400 flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {account.city || account.locationMain}
                                </span>
                              )}
                            </div>

                            {/* Contact Info Card Block */}
                            <div className="bg-[#FAF9F8] dark:bg-[#252423] p-2 rounded-lg border border-slate-100 dark:border-slate-800/80 space-y-1 text-[10px]">
                              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold truncate">
                                <User className="w-3 h-3 text-[#0078D4] flex-shrink-0" />
                                <span className="truncate">{primaryContact.fullName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#0078D4] dark:text-brand-400 font-mono font-medium truncate">
                                <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />
                                <span className="truncate">{primaryContact.email}</span>
                              </div>
                            </div>

                            {/* Badges: Opportunity Score & Promoted Tag */}
                            <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                                % {account.riskScore || 70} {t("Opportunity Score")}
                              </span>

                              {account.promotedToDealId && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                  {t("Promoted to Deal")} ✓
                                </span>
                              )}
                            </div>

                            {/* 1-Click Quick Stage Advancement Footer */}
                            <div className="flex items-center justify-between border-t border-[#EDEBE9] dark:border-[#323130] pt-2 text-[10px] text-slate-400">
                              <button
                                type="button"
                                disabled={stageIndex === 0}
                                onClick={() => handleStageChange(account.id, bdActiveStages[stageIndex - 1])}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-500"
                                title={t("Move to Previous Stage")}
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>

                              <span className="font-mono text-[9px] font-bold text-slate-400">
                                {stageIndex + 1} / {bdActiveStages.length}
                              </span>

                              <button
                                type="button"
                                disabled={stageIndex === bdActiveStages.length - 1}
                                onClick={() => handleStageChange(account.id, bdActiveStages[stageIndex + 1])}
                                className="p-1 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-[#0078D4]"
                                title={t("Move to Next Stage")}
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {stageAccounts.length === 0 && (
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-slate-400 text-[11px] font-medium my-2">
                          <p>{t("Drag target company here")}</p>
                          <span className="text-[9px] text-slate-400 block mt-1">{t("or use quick add above")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubTab === "growth-health" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <KpiCard label={t("Active Customers")} value={String(growthHealth.activeCustomers)} icon={<Users className="w-4 h-4" />} />
            <KpiCard
              label={t("Won Deals")}
              value={String(growthHealth.wonCount)}
              icon={<CheckCircle className="w-4 h-4" />}
              accentColor="text-emerald-500"
              valueColor="text-emerald-600 dark:text-emerald-400"
            />
            <KpiCard
              label={t("Lost Deals")}
              value={String(growthHealth.lostCount)}
              icon={<AlertTriangle className="w-4 h-4" />}
              accentColor="text-rose-500"
              valueColor="text-rose-600 dark:text-rose-450"
            />
            <KpiCard label={t("Open Pipeline Value")} value={formatCurrencyShort(growthHealth.pipelineValue)} icon={<DollarSign className="w-4 h-4" />} />
            <KpiCard label={t("Avg Sales Cycle")} value={`${growthHealth.avgCycleDays.toFixed(0)} ${t("days")}`} icon={<Clock className="w-4 h-4" />} />
            <KpiCard
              label={t("At-Risk Customers")}
              value={String(growthHealth.riskyCustomers.length)}
              sub={t("Health score below 50")}
              icon={<AlertTriangle className="w-4 h-4" />}
              accentColor="text-amber-500"
              valueColor="text-amber-600 dark:text-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <ChartCard title={t("Open Pipeline Value by Stage")} className="lg:col-span-7">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageValueChartData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" fontSize={9} tickLine={false} tickFormatter={(v: any) => formatCurrencyShort(v)} />
                  <YAxis dataKey="stage" type="category" fontSize={9} axisLine={false} tickLine={false} width={110} />
                  <Tooltip formatter={(value: any) => formatCurrencyShort(Number(value))} />
                  <Bar dataKey="value" name={t("Open Pipeline Value")} fill={CHART_COLORS.blue} barSize={16} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {stageValueChartData.length === 0 && (
                <p className="text-xs text-slate-400 text-center mt-8">{t("No open pipeline.")}</p>
              )}
            </ChartCard>

            <ChartCard title={t("Won / Lost")} className="lg:col-span-5">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={wonLostDonutData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3}>
                    {wonLostDonutData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {growthHealth.riskyCustomers.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t("At-Risk Customers")}
              </h3>
              <div className="space-y-1.5">
                {growthHealth.riskyCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between text-xs bg-white dark:bg-[#1b1a19] p-2 rounded border border-amber-100 dark:border-amber-900/50"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{c.name}</span>
                    <span className="text-amber-700 dark:text-amber-400">
                      {t("Health Score")}: {c.healthScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "digital-intel" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1b1a19] p-5 border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs space-y-3">
            <p className="text-[11px] text-slate-500">
              {t(
                "Upload or paste an exported report (Google Analytics, Search Console, SEMrush, Ahrefs, or similar) and get keyword opportunities, blog topic ideas, and concrete strategy actions."
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Report Source")}</label>
                <select
                  value={reportSourceType}
                  onChange={(e) => setReportSourceType(e.target.value)}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none"
                >
                  <option value="Google Analytics">{t("Google Analytics")}</option>
                  <option value="Search Console">{t("Search Console")}</option>
                  <option value="SEMrush">{t("SEMrush")}</option>
                  <option value="Diğer">{t("Other")}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Upload File (.csv, .xlsx, .txt)")}</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  onChange={handleReportFileChange}
                  className="w-full text-[11px] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-[#EAF2FF] file:text-[#0078D4] file:text-[11px] file:font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Or Paste Report Content")}</label>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder={t("Paste the exported report text/data here...")}
                className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none h-32 resize-none focus:border-[#0078D4] text-xs"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAnalyzeReport}
                disabled={isAnalyzing}
                className={`text-xs font-bold px-4 py-2 rounded flex items-center gap-1.5 ${
                  isAnalyzing ? "bg-slate-200 dark:bg-[#323130] text-slate-400 cursor-not-allowed" : "bg-[#0078D4] hover:bg-[#106ebe] text-white cursor-pointer"
                }`}
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isAnalyzing ? t("Analyzing...") : t("Analyze with AI")}</span>
              </button>
            </div>
            {analysisError && <p className="text-[11px] text-rose-600">{analysisError}</p>}
          </div>

          {analysisResult && (
            <div className="bg-white dark:bg-[#1b1a19] border border-emerald-200 dark:border-emerald-900 rounded-2xl shadow-xs p-5 space-y-4">
              {analysisResult.rawSummary && <p className="text-xs text-slate-600 dark:text-slate-300 italic">{analysisResult.rawSummary}</p>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[10px] mb-2">{t("Keyword Opportunities")}</h4>
                  <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300">
                    {analysisResult.keywords.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[10px] mb-2">{t("Blog Topic Ideas")}</h4>
                  <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300">
                    {analysisResult.blogTopics.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[10px] mb-2">{t("Strategy Actions")}</h4>
                  <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300">
                    {analysisResult.strategyActions.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {reportInsights.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{t("Past Analyses")}</h3>
              {reportInsights.map((ins) => (
                <div key={ins.id} className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-700 dark:text-slate-200">{ins.fileName}</div>
                    <div className="text-[10px] text-slate-450">
                      {ins.sourceType} · {new Date(ins.uploadedAt).toLocaleDateString("tr-TR")}
                    </div>
                  </div>
                  <button type="button" onClick={() => deleteInsight(ins.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === "kpi-okr" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <KpiCard
              label={t("Won")}
              value={String(lossAnalysis.totalWon)}
              icon={<CheckCircle className="w-4 h-4" />}
              accentColor="text-emerald-500"
              valueColor="text-emerald-600 dark:text-emerald-400"
            />
            <KpiCard
              label={t("Lost")}
              value={String(lossAnalysis.totalLost)}
              icon={<AlertTriangle className="w-4 h-4" />}
              accentColor="text-rose-500"
              valueColor="text-rose-600 dark:text-rose-450"
            />
            <KpiCard label={t("Win Rate")} value={`%${lossAnalysis.winRate.toFixed(0)}`} icon={<Percent className="w-4 h-4" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <ChartCard title={t("Win / Loss Analysis")} className="lg:col-span-5">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={winLossDonutData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3}>
                    {winLossDonutData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("No loss data recorded yet.").length > 0 ? t("Win / Loss Analysis") : ""} subtitle={t("Top loss reasons")} className="lg:col-span-7">
              {lossReasonChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lossReasonChartData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" fontSize={9} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" fontSize={9} axisLine={false} tickLine={false} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" name={t("Lost")} fill={CHART_COLORS.rose} barSize={16} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-400 text-center mt-8">{t("No loss data recorded yet.")}</p>
              )}
            </ChartCard>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{t("Strategic Goals & OKR")}</h3>
              <button
                type="button"
                onClick={() => {
                  resetGoalForm();
                  setEditingGoalId(null);
                  setShowAddGoal(!showAddGoal);
                }}
                className="text-xs font-bold bg-[#0078D4] hover:bg-[#106ebe] text-white px-3 py-2 rounded flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddGoal ? t("Cancel") : t("New Goal")}</span>
              </button>
            </div>

            {showAddGoal && (
              <form onSubmit={handleSaveGoal} className="bg-white dark:bg-[#1b1a19] border border-[#0078D4]/20 rounded-2xl p-5 shadow-md space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Objective *")}</label>
                    <input
                      type="text"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Period *")}</label>
                    <input
                      type="text"
                      placeholder="2026-Q3"
                      value={goalForm.period}
                      onChange={(e) => setGoalForm({ ...goalForm, period: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Owner")}</label>
                    <input
                      type="text"
                      value={goalForm.ownerName}
                      onChange={(e) => setGoalForm({ ...goalForm, ownerName: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Status")}</label>
                    <select
                      value={goalForm.status}
                      onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value as StrategicGoal["status"] })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none"
                    >
                      <option value="Devam Ediyor">{t("Devam Ediyor")}</option>
                      <option value="Tamamlandı">{t("Tamamlandı")}</option>
                      <option value="Riskte">{t("Riskte")}</option>
                      <option value="Ertelendi">{t("Ertelendi")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t("Key Results")}</label>
                    <button type="button" onClick={addKeyResultDraft} className="text-[11px] font-bold text-[#0078D4] hover:underline cursor-pointer flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      {t("Add Key Result")}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {goalForm.keyResults.map((kr) => (
                      <div key={kr.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center bg-[#FAF9F8] dark:bg-[#201f1e] p-2 rounded">
                        <input
                          type="text"
                          placeholder={t("Description")}
                          value={kr.description}
                          onChange={(e) => updateKeyResultDraft(kr.id, { description: e.target.value })}
                          className="sm:col-span-2 p-1.5 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none"
                        />
                        <input
                          type="number"
                          placeholder={t("Target")}
                          value={kr.targetValue}
                          onChange={(e) => updateKeyResultDraft(kr.id, { targetValue: Number(e.target.value) })}
                          className="p-1.5 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none"
                        />
                        <input
                          type="number"
                          placeholder={t("Current")}
                          value={kr.currentValue}
                          onChange={(e) => updateKeyResultDraft(kr.id, { currentValue: Number(e.target.value) })}
                          className="p-1.5 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none"
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder={t("Unit")}
                            value={kr.unit || ""}
                            onChange={(e) => updateKeyResultDraft(kr.id, { unit: e.target.value })}
                            className="w-full p-1.5 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none"
                          />
                          <button type="button" onClick={() => removeKeyResultDraft(kr.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer flex-shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {goalForm.keyResults.length === 0 && <p className="text-[11px] text-slate-400">{t("No key results added yet.")}</p>}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit" className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded flex items-center gap-1 cursor-pointer">
                    <Save className="w-4 h-4" />
                    <span>{editingGoalId ? t("Update Goal") : t("Save Goal")}</span>
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((g) => (
                <div key={g.id} className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{g.title}</div>
                      <div className="text-[10px] text-slate-450 mt-0.5">
                        {g.period} {g.ownerName && `· ${g.ownerName}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          g.status === "Tamamlandı"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : g.status === "Riskte"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                            : g.status === "Ertelendi"
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                        }`}
                      >
                        {t(g.status)}
                      </span>
                      <button type="button" onClick={() => startEditGoal(g)} className="text-slate-400 hover:text-[#0078D4] cursor-pointer p-1">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => deleteGoal(g.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {g.keyResults.map((kr) => {
                      const pct = kr.targetValue > 0 ? Math.min(100, (kr.currentValue / kr.targetValue) * 100) : 0;
                      return (
                        <div key={kr.id}>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-600 dark:text-slate-300">{kr.description}</span>
                            <span className="text-slate-450">
                              {kr.currentValue}/{kr.targetValue} {kr.unit}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-[#323130] rounded-full overflow-hidden">
                            <div className="h-full bg-[#0078D4]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {g.keyResults.length === 0 && <p className="text-[11px] text-slate-400">{t("No key results defined.")}</p>}
                  </div>
                </div>
              ))}
              {goals.length === 0 && (
                <div className="md:col-span-2 bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-8 text-center text-xs text-slate-400">
                  {t("No strategic goals yet. Create your first OKR above.")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Global Target Company Edit Modal Overlay (Accessible across all sub-tabs including BD Pipeline) */}
      {expandedAccountId &&
        (() => {
          const account = accounts.find((a) => a.id === expandedAccountId);
          if (!account) return null;
          const status = getRelationshipStatus(account, companies);
          const primaryContact = getTargetPrimaryContact(account);
          const contactDraft = contactDraftByAccount[account.id] || { status: "Araştırılıyor" };

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
              <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-2xl p-6 space-y-5 text-xs max-w-3xl w-full max-h-[90vh] overflow-y-auto my-auto relative border-t-4 border-t-[#0078D4]">
                <div className="flex items-start justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-3">
                  <div className="space-y-1 flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-[#0078D4] dark:text-brand-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                        <Edit className="w-3.5 h-3.5" />
                        {t("Hedef Firma & Müşteri Kartı Düzenleme")}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          status === "Müşteri"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : status === "Görüşülüyor"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {t(status)}
                      </span>
                    </div>
                    <div className="pt-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Company Name")} *</label>
                      <input
                        type="text"
                        defaultValue={account.companyName || ""}
                        onBlur={(e) => {
                          const newName = e.target.value.trim();
                          if (newName && newName !== account.companyName) {
                            updateAccountField(account.id, { companyName: newName });
                          }
                        }}
                        className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded-xl outline-none focus:border-[#0078D4] font-bold text-sm text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    {account.discoveredFromCompanyName && (
                      <p className="text-[10px] text-slate-400">
                        {t("Discovered via")}: {account.discoveredFromCompanyName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        triggerToast(t("Firma ve müşteri kartı bilgileri başarıyla kaydedildi."), "success");
                        setExpandedAccountId(null);
                      }}
                      className="px-3.5 py-2 bg-[#0078D4] hover:bg-[#106ebe] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{t("Düzenlemeyi Kaydet")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTargetAccount(account.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      title={t("Delete Company")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedAccountId(null)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Highlights Summary Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#FAF9F8] dark:bg-[#201f1e] p-3 rounded-xl border border-[#EDEBE9] dark:border-[#323130]">
                  <div className="text-center p-1.5 border-r border-slate-200 dark:border-[#323130]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">{t("Opportunity Score")}</span>
                    <span className="text-sm font-extrabold text-[#0078D4] dark:text-brand-400 block mt-0.5">% {account.riskScore || 70}</span>
                  </div>
                  <div className="text-center p-1.5 border-r border-slate-200 dark:border-[#323130]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">{t("Company Size")}</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block mt-0.5 truncate">{account.companySize || account.employeeCountLabel || t("750+ Employees")}</span>
                  </div>
                  <div className="text-center p-1.5 border-r border-slate-200 dark:border-[#323130]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">{t("Main Location")}</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block mt-0.5 truncate">{account.locationMain || account.city || t("Not specified")}</span>
                  </div>
                  <div className="text-center p-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">{t("Lead Segment")}</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5 truncate">{account.leadSegment || "Cold"} ({account.leadStatus || "New"})</span>
                  </div>
                </div>

                {/* Status & Stage Revision Control Box */}
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-900/60 pb-2">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      {t("Firma Durum Revizyonu & Lead Aşaması")}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-white dark:bg-black/20 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      {t("Durumu İstediğiniz An Değiştirin")}
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">{t("İlişki Durumu (Status)")}</label>
                      <select
                        value={status}
                        onChange={(e) => {
                          const newRel = e.target.value;
                          if (newRel === "Müşteri") {
                            updateAccountField(account.id, { leadStatus: "Won", leadSegment: "Hot" });
                          } else if (newRel === "Görüşülüyor") {
                            updateAccountField(account.id, { leadStatus: "Contacted", leadSegment: "Warm" });
                          } else {
                            updateAccountField(account.id, { leadStatus: "New", leadSegment: "Cold" });
                          }
                          triggerToast(t("Firma durum revizyonu güncellendi."), "success");
                        }}
                        className="w-full p-2 border border-emerald-300 dark:border-emerald-800 rounded-lg bg-white dark:bg-[#252423] text-xs font-bold text-emerald-700 dark:text-emerald-400 outline-none cursor-pointer"
                      >
                        <option value="Hedef">{t("Hedef")}</option>
                        <option value="Görüşülüyor">{t("Görüşülüyor")}</option>
                        <option value="Müşteri">{t("Müşteri")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">{t("Lead Segmenti")}</label>
                      <select
                        value={account.leadSegment || "Cold"}
                        onChange={(e) => {
                          updateAccountField(account.id, { leadSegment: e.target.value as any });
                          triggerToast(t("Lead segmenti güncellendi."), "success");
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#252423] text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="Cold">Cold ({t("Soğuk")})</option>
                        <option value="Warm">Warm ({t("Ilık")})</option>
                        <option value="Hot">Hot ({t("Sıcak")})</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">{t("Pipeline Aşaması")}</label>
                      <select
                        value={account.bdPipelineStage || bdActiveStages[0]}
                        onChange={(e) => {
                          handleStageChange(account.id, e.target.value);
                          triggerToast(t("Pipeline aşaması güncellendi."), "success");
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#252423] text-xs font-semibold outline-none cursor-pointer"
                      >
                        {bdActiveStages.map((stg) => (
                          <option key={stg} value={stg}>
                            {t(stg)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Primary Target Stakeholder Contact Box (Hedef Hesaplar Eşleşmesi) */}
                <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/60 pb-2">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#0078D4]" />
                      {t("Target Stakeholder Contact Details (Primary Contact)")}
                    </span>
                    <span className="text-[10px] font-mono text-[#0078D4] dark:text-brand-400 font-bold bg-white dark:bg-black/20 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      {t("Synced with Target Accounts")}
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">{t("First Name")}</label>
                      <input
                        type="text"
                        defaultValue={account.contactName || primaryContact.firstName}
                        onBlur={(e) => updateAccountField(account.id, { contactName: e.target.value })}
                        placeholder={t("First Name")}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-[#252423] text-xs font-semibold outline-none focus:border-[#0078D4]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">{t("Surname")}</label>
                      <input
                        type="text"
                        defaultValue={account.contactSurname || primaryContact.lastName}
                        onBlur={(e) => updateAccountField(account.id, { contactSurname: e.target.value })}
                        placeholder={t("Surname")}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-[#252423] text-xs font-semibold outline-none focus:border-[#0078D4]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#0078D4] dark:text-brand-400 block mb-1">{t("Designated Contact Email")} *</label>
                      <input
                        type="email"
                        defaultValue={account.contactEmail || primaryContact.email}
                        onBlur={(e) => {
                          const newEmail = e.target.value;
                          updateAccountField(account.id, { contactEmail: newEmail });
                          if (newEmail.trim()) {
                            try {
                              CrmDb.upsertLeadProfile({
                                firstName: account.contactName || primaryContact.firstName,
                                lastName: account.contactSurname || primaryContact.lastName,
                                email: newEmail.trim(),
                                company: account.companyName,
                                department: account.department || primaryContact.department,
                                industry: account.industryTag,
                              });
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        placeholder="email@company.com"
                        className="w-full p-2 border border-[#0078D4] dark:border-brand-500 rounded bg-white dark:bg-[#252423] text-xs font-mono font-bold text-[#0078D4] dark:text-brand-400 outline-none focus:ring-1 focus:ring-[#0078D4]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">{t("Department / Role")}</label>
                      <input
                        type="text"
                        defaultValue={account.department || primaryContact.department}
                        onBlur={(e) => updateAccountField(account.id, { department: e.target.value })}
                        placeholder={t("Department")}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-[#252423] text-xs outline-none focus:border-[#0078D4]"
                      />
                    </div>
                  </div>
                </div>

                {/* Firma Bilgileri */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Website URL")}</label>
                    <input
                      type="text"
                      defaultValue={account.websiteUrl || ""}
                      onBlur={(e) => updateAccountField(account.id, { websiteUrl: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Industry / Sector")}</label>
                    <input
                      type="text"
                      defaultValue={account.industryTag || ""}
                      onBlur={(e) => updateAccountField(account.id, { industryTag: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Sub-Sector")}</label>
                    <input
                      type="text"
                      defaultValue={account.subIndustry || ""}
                      onBlur={(e) => updateAccountField(account.id, { subIndustry: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("City / Address")}</label>
                    <input
                      type="text"
                      defaultValue={account.city || account.locationMain || ""}
                      onBlur={(e) => updateAccountField(account.id, { city: e.target.value, locationMain: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Employee Count (optional)")}</label>
                    <input
                      type="text"
                      defaultValue={account.companySize || account.employeeCountLabel || ""}
                      onBlur={(e) => updateAccountField(account.id, { companySize: e.target.value, employeeCountLabel: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Next Review / Contact Date")}</label>
                    <input
                      type="date"
                      defaultValue={account.nextReviewDate || ""}
                      onBlur={(e) => updateAccountField(account.id, { nextReviewDate: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Company Analysis Notes")}</label>
                    <textarea
                      defaultValue={account.analysisNotes || ""}
                      onBlur={(e) => updateAccountField(account.id, { analysisNotes: e.target.value })}
                      className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none h-20 resize-none focus:border-[#0078D4]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => createReviewReminderTask(account)}
                  className="text-[11px] font-bold text-[#0078D4] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {t("Create Reminder Task")}
                </button>

                {/* Kontakt Yönetimi */}
                <div className="border-t border-[#EDEBE9] dark:border-[#323130] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t("Contact Management")}</label>
                    <button
                      type="button"
                      onClick={() => (showContactFormFor === account.id ? setShowContactFormFor(null) : openContactForm(account.id))}
                      className="text-[11px] font-bold text-[#0078D4] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {t("Add Contact")}
                    </button>
                  </div>

                  {showContactFormFor === account.id && (
                    <div className="bg-[#FAF9F8] dark:bg-[#201f1e] rounded-xl p-3 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder={t("Full Name *")}
                        value={contactDraft.fullName || ""}
                        onChange={(e) => updateContactDraft(account.id, { fullName: e.target.value })}
                        className="p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      />
                      <input
                        type="text"
                        placeholder={t("Title")}
                        value={contactDraft.title || ""}
                        onChange={(e) => updateContactDraft(account.id, { title: e.target.value })}
                        className="p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      />
                      <input
                        type="text"
                        placeholder={t("Department")}
                        value={contactDraft.department || ""}
                        onChange={(e) => updateContactDraft(account.id, { department: e.target.value })}
                        className="p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      />
                      <input
                        type="text"
                        placeholder={t("Phone")}
                        value={contactDraft.phone || ""}
                        onChange={(e) => updateContactDraft(account.id, { phone: e.target.value })}
                        className="p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      />
                      <input
                        type="email"
                        placeholder={t("Email")}
                        value={contactDraft.email || ""}
                        onChange={(e) => updateContactDraft(account.id, { email: e.target.value })}
                        className="p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      />
                      <input
                        type="text"
                        placeholder={t("LinkedIn")}
                        value={contactDraft.linkedin || ""}
                        onChange={(e) => updateContactDraft(account.id, { linkedin: e.target.value })}
                        className="p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      />
                      <input
                        type="text"
                        placeholder={t("Source")}
                        value={contactDraft.source || ""}
                        onChange={(e) => updateContactDraft(account.id, { source: e.target.value })}
                        className="p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                      />
                      <select
                        value={contactDraft.status || "Araştırılıyor"}
                        onChange={(e) => updateContactDraft(account.id, { status: e.target.value as TargetContact["status"] })}
                        className="p-2 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none"
                      >
                        {(["Araştırılıyor", "Bulundu", "Doğrulandı", "İlk Temas", "Görüşme Yapıldı"] as const).map((s) => (
                          <option key={s} value={s}>
                            {t(s)}
                          </option>
                        ))}
                      </select>
                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleAddContact(account.id)}
                          className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{t("Save Contact")}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {pendingLeadPrompt && pendingLeadPrompt.accountId === account.id && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 mb-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">{t("Create this contact as a lead?")}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => convertContactToLead(pendingLeadPrompt.accountId, pendingLeadPrompt.contactId)}
                          className="text-[11px] font-bold bg-[#0078D4] hover:bg-[#106ebe] text-white px-3 py-1.5 rounded cursor-pointer"
                        >
                          {t("Yes")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingLeadPrompt(null)}
                          className="text-[11px] font-bold bg-white dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded cursor-pointer"
                        >
                          {t("No")}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {(account.contacts || []).map((contact) => (
                      <div key={contact.id} className="bg-[#FAF9F8] dark:bg-[#201f1e] rounded-lg p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-slate-100">{contact.fullName}</span>
                            {contact.leadProfileId && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                {t("Lead")} ✓
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-450 mt-0.5">
                            {[contact.title, contact.department].filter(Boolean).join(" · ") || "—"}
                          </div>
                          <div className="text-[10px] text-slate-450 mt-0.5 flex flex-wrap gap-x-3">
                            {contact.email && <span>{contact.email}</span>}
                            {contact.phone && <span>{contact.phone}</span>}
                            {contact.linkedin && <span>{contact.linkedin}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <select
                            value={contact.status}
                            onChange={(e) => updateContact(account.id, contact.id, { status: e.target.value as TargetContact["status"] })}
                            className="text-[10px] p-1.5 border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] rounded outline-none cursor-pointer"
                          >
                            {(["Araştırılıyor", "Bulundu", "Doğrulandı", "İlk Temas", "Görüşme Yapıldı"] as const).map((s) => (
                              <option key={s} value={s}>
                                {t(s)}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-2">
                            {!contact.leadProfileId && (
                              <button
                                type="button"
                                onClick={() => convertContactToLead(account.id, contact.id)}
                                className="text-[10px] font-bold text-[#0078D4] hover:underline cursor-pointer"
                              >
                                {t("Create Lead")}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteContact(account.id, contact.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(account.contacts || []).length === 0 && (
                      <p className="text-slate-400 text-[11px]">{t("No contacts added yet.")}</p>
                    )}
                  </div>
                </div>

                {/* Footer Save & Complete Action */}
                <div className="border-t border-[#EDEBE9] dark:border-[#323130] pt-4 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">ID: {account.id}</span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerToast(t("Firma ve müşteri kartı bilgileri başarıyla kaydedildi."), "success");
                      setExpandedAccountId(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t("Tamamla & Kaydet")}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      {/* Trash Bin Modal / Silinen Firmalar */}
      {showDeletedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-2xl p-6 space-y-4 text-xs max-w-2xl w-full max-h-[85vh] overflow-y-auto my-auto relative border-t-4 border-t-amber-500">
            <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("Silinen Hedef Firmalar (Çöp Kutusu)")}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  {deletedAccounts.length} {t("firma")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeletedModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {deletedAccounts.map((acc) => (
                <div key={acc.id} className="bg-[#FAF9F8] dark:bg-[#201f1e] p-3 rounded-xl border border-[#EDEBE9] dark:border-[#323130] flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs">{acc.companyName}</h5>
                    <p className="text-[10px] text-slate-400">
                      {[acc.industryTag, acc.city || acc.locationMain, acc.contactName ? `${acc.contactName} ${acc.contactSurname || ""}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreTargetAccount(acc)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t("Geri Yükle")}</span>
                  </button>
                </div>
              ))}

              {deletedAccounts.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {t("Silinen firma bulunmuyor. Çöp kutunuz temiz!")}
                </div>
              )}
            </div>

            <div className="border-t border-[#EDEBE9] dark:border-[#323130] pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDeletedModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                {t("Kapat")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
