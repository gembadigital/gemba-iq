import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Target,
  TrendingUp,
  Briefcase,
  BookOpen,
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
  MarketingCompetitor,
  MarketingPlaybook,
  StrategicGoal,
  MarketingKeyResult,
  MarketingReportInsight,
} from "../types";
import { useLanguage } from "../lib/LanguageContext";
import { useOrganization } from "../lib/OrganizationContext";
import { CrmDb } from "../lib/CrmDb";
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
const PLAYBOOKS_KEY = "crm_marketing_playbooks";
const STRATEGIC_GOALS_KEY = "crm_strategic_goals";
const REPORT_INSIGHTS_KEY = "crm_marketing_report_insights";

const BD_PIPELINE_STAGES = [
  "Yeni",
  "LinkedIn Bağlantı",
  "Mesaj Gönderildi",
  "Mail Gönderildi",
  "Telefon Görüşmesi",
  "Toplantı Planlandı",
  "Saha Ziyareti",
  "Teklife Dönüştü",
  "Kaybedildi",
] as const;

export type MarketingSubTab =
  | "overview"
  | "industry-intel"
  | "target-market"
  | "bd-pipeline"
  | "playbooks"
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

const formatCurrencyShort = (value: number): string => {
  if (!value) return "₺0";
  if (value >= 1000000) return `₺${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₺${(value / 1000).toFixed(0)}K`;
  return `₺${value.toFixed(0)}`;
};

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
  const [playbooks, setPlaybooks] = useState<MarketingPlaybook[]>([]);
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [reportInsights, setReportInsights] = useState<MarketingReportInsight[]>([]);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);
  const triggerToast = (msg: string, type: "success" | "info" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setAccounts(CrmDb.getKv<TargetAccount[]>(TARGET_ACCOUNTS_KEY, []));
    setCompanies(CrmDb.getCompanies());
    setDeals(CrmDb.getDeals());
    setProposals(CrmDb.getProposals());
    setPlaybooks(CrmDb.getKv<MarketingPlaybook[]>(PLAYBOOKS_KEY, []));
    setGoals(CrmDb.getKv<StrategicGoal[]>(STRATEGIC_GOALS_KEY, []));
    setReportInsights(CrmDb.getKv<MarketingReportInsight[]>(REPORT_INSIGHTS_KEY, []));
  }, []);

  const persistAccounts = (updated: TargetAccount[]) => {
    const organizationId = getActiveOrganizationId();
    const scoped = updated.map((a) => ({ ...a, organization_id: organizationId || a.organization_id }));
    setAccounts(scoped);
    CrmDb.setKv(TARGET_ACCOUNTS_KEY, scoped);
  };
  const persistPlaybooks = (updated: MarketingPlaybook[]) => {
    setPlaybooks(updated);
    CrmDb.setKv(PLAYBOOKS_KEY, updated);
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
  const pipelineByStage = useMemo(() => {
    const map: Record<string, TargetAccount[]> = {};
    BD_PIPELINE_STAGES.forEach((s) => {
      map[s] = [];
    });
    accounts.forEach((a) => {
      const stage = a.bdPipelineStage && (BD_PIPELINE_STAGES as readonly string[]).includes(a.bdPipelineStage) ? a.bdPipelineStage : "Yeni";
      map[stage].push(a);
    });
    return map;
  }, [accounts]);

  const funnelChartData = useMemo(
    () => BD_PIPELINE_STAGES.map((s) => ({ stage: t(s), count: pipelineByStage[s].length })),
    [pipelineByStage, t]
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

  // --- Hedef Pazar & Rakip Haritası state/handlers ---
  const [newTargetForm, setNewTargetForm] = useState({
    companyName: "",
    industryTag: "",
    websiteUrl: "",
    contactName: "",
    contactEmail: "",
    analysisNotes: "",
  });
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [targetSectorFilter, setTargetSectorFilter] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [newCompetitorDraft, setNewCompetitorDraft] = useState<Record<string, string>>({});

  const handleAddTargetCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetForm.companyName.trim()) {
      triggerToast(t("Company name is strictly required."), "error");
      return;
    }
    const added: TargetAccount = {
      id: `target_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      no: accounts.length + 1,
      companyName: newTargetForm.companyName.trim(),
      websiteUrl: newTargetForm.websiteUrl.trim() || `https://www.${newTargetForm.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      industryTag: newTargetForm.industryTag.trim() || t("General Industry"),
      companySize: "",
      locationMain: "",
      contactName: newTargetForm.contactName.trim(),
      contactEmail: newTargetForm.contactEmail.trim(),
      leadStatus: "New",
      leadSegment: "Cold",
      riskScore: 70,
      aiAnalysisSummary: "",
      draftTemplates: "",
      analysisSource: "Marketing Hub Manual Entry",
      analysisDate: new Date().toLocaleString("tr-TR"),
      rawOutput: "",
      analysisNotes: newTargetForm.analysisNotes.trim(),
      bdPipelineStage: "Yeni",
      competitors: [],
    };
    persistAccounts([...accounts, added]);
    setNewTargetForm({ companyName: "", industryTag: "", websiteUrl: "", contactName: "", contactEmail: "", analysisNotes: "" });
    setShowAddTarget(false);
    triggerToast(t("Added {name} to Target Accounts registry").replace("{name}", added.companyName), "success");
  };

  const updateAccountField = (id: string, patch: Partial<TargetAccount>) => {
    persistAccounts(accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const addCompetitor = (accountId: string) => {
    const name = (newCompetitorDraft[accountId] || "").trim();
    if (!name) return;
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const competitor: MarketingCompetitor = { id: `comp_${Date.now()}`, name };
    updateAccountField(accountId, { competitors: [...(account.competitors || []), competitor] });
    setNewCompetitorDraft({ ...newCompetitorDraft, [accountId]: "" });
  };

  const removeCompetitor = (accountId: string, competitorId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    updateAccountField(accountId, { competitors: (account.competitors || []).filter((c) => c.id !== competitorId) });
  };

  const deleteTargetAccount = async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    const ok = await confirm({
      title: t("Remove Target"),
      message: t("Are you sure you want to delete {name} and all associated proposals/deals?").replace("{name}", account?.companyName || ""),
      confirmLabel: t("Delete"),
      cancelLabel: t("Cancel"),
      danger: true,
    });
    if (!ok) return;
    persistAccounts(accounts.filter((a) => a.id !== id));
    triggerToast(t("Account removed from database."), "info");
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
  const handleStageChange = (accountId: string, newStage: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const patch: Partial<TargetAccount> = { bdPipelineStage: newStage };
    if (newStage !== "Yeni") {
      patch.lastContactDate = new Date().toISOString().split("T")[0];
    }
    updateAccountField(accountId, patch);
    if (newStage === "Teklife Dönüştü") {
      triggerToast(t("Great! Now create the real opportunity/proposal record in Deal Management for this company."), "success");
    }
  };

  // --- Sektör Oyun Kitapları CRUD ---
  const [showAddPlaybook, setShowAddPlaybook] = useState(false);
  const [playbookForm, setPlaybookForm] = useState({
    industryTag: "",
    title: "",
    content: "",
    talkingPoints: "",
    commonObjections: "",
    caseStudyRefs: "",
  });
  const [editingPlaybookId, setEditingPlaybookId] = useState<string | null>(null);
  const [playbookSectorFilter, setPlaybookSectorFilter] = useState("");

  const resetPlaybookForm = () =>
    setPlaybookForm({ industryTag: "", title: "", content: "", talkingPoints: "", commonObjections: "", caseStudyRefs: "" });

  const handleSavePlaybook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playbookForm.title.trim() || !playbookForm.industryTag.trim()) {
      triggerToast(t("Title and industry are required."), "error");
      return;
    }
    const now = new Date().toISOString();
    if (editingPlaybookId) {
      persistPlaybooks(playbooks.map((p) => (p.id === editingPlaybookId ? { ...p, ...playbookForm, updatedAt: now } : p)));
      triggerToast(t("Playbook updated."), "success");
    } else {
      const added: MarketingPlaybook = {
        id: `playbook_${Date.now()}`,
        ...playbookForm,
        createdAt: now,
        updatedAt: now,
        createdBy: actorName || "",
      };
      persistPlaybooks([added, ...playbooks]);
      triggerToast(t("Playbook created."), "success");
    }
    resetPlaybookForm();
    setEditingPlaybookId(null);
    setShowAddPlaybook(false);
  };

  const startEditPlaybook = (p: MarketingPlaybook) => {
    setPlaybookForm({
      industryTag: p.industryTag,
      title: p.title,
      content: p.content,
      talkingPoints: p.talkingPoints || "",
      commonObjections: p.commonObjections || "",
      caseStudyRefs: p.caseStudyRefs || "",
    });
    setEditingPlaybookId(p.id);
    setShowAddPlaybook(true);
  };

  const deletePlaybook = async (id: string) => {
    const ok = await confirm({
      title: t("Delete Playbook"),
      message: t("Are you sure you want to delete this playbook?"),
      confirmLabel: t("Delete"),
      cancelLabel: t("Cancel"),
      danger: true,
    });
    if (!ok) return;
    persistPlaybooks(playbooks.filter((p) => p.id !== id));
    triggerToast(t("Playbook deleted."), "info");
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
      key: "playbooks",
      label: "Industry Playbooks",
      description: "Sector-specific talking points, objections, and case studies.",
      icon: <BookOpen className="w-5 h-5 flex-shrink-0" />,
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
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-lg shadow-xl border flex items-center gap-3 animate-bounce max-w-sm ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : toast.type === "error"
              ? "bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
              : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200"
          }`}
        >
          <Check className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-semibold">{toast.msg}</span>
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
                accounts.filter(
                  (a) => a.bdPipelineStage && a.bdPipelineStage !== "Yeni" && a.bdPipelineStage !== "Kaybedildi" && a.bdPipelineStage !== "Teklife Dönüştü"
                ).length
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
            <KpiCard label={t("Active Playbooks")} value={String(playbooks.length)} sub={t("Industry playbooks")} icon={<BookOpen className="w-4 h-4" />} />
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
              label={t("Competitors")}
              value={String(accounts.reduce((sum, a) => sum + (a.competitors?.length || 0), 0))}
              icon={<Users className="w-4 h-4" />}
              accentColor="text-rose-500"
            />
            <KpiCard label={t("Sectors Tracked")} value={String(industryStats.length)} icon={<TrendingUp className="w-4 h-4" />} />
          </div>

          <div className="bg-white dark:bg-[#1b1a19] p-4 border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
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
            </div>
            <div className="flex items-center gap-2">
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab("deal-management")}
                  className="text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center gap-1.5 cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{t("Deal Management")}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAddTarget(!showAddTarget)}
                className="text-xs font-bold bg-[#0078D4] hover:bg-[#106ebe] text-white px-3 py-2 rounded flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddTarget ? t("Cancel") : t("Add Target Company")}</span>
              </button>
            </div>
          </div>

          {showAddTarget && (
            <form onSubmit={handleAddTargetCompany} className="bg-white dark:bg-[#1b1a19] border border-[#0078D4]/20 rounded-2xl p-5 shadow-md space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Company Name *")}</label>
                  <input
                    type="text"
                    value={newTargetForm.companyName}
                    onChange={(e) => setNewTargetForm({ ...newTargetForm, companyName: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Industry / Sector")}</label>
                  <input
                    type="text"
                    list="marketing-sector-suggestions"
                    value={newTargetForm.industryTag}
                    onChange={(e) => setNewTargetForm({ ...newTargetForm, industryTag: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                  />
                  <datalist id="marketing-sector-suggestions">
                    {industryStats.map((row) => (
                      <option key={row.industry} value={row.industry} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Website URL")}</label>
                  <input
                    type="text"
                    value={newTargetForm.websiteUrl}
                    onChange={(e) => setNewTargetForm({ ...newTargetForm, websiteUrl: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Contact Name")}</label>
                  <input
                    type="text"
                    value={newTargetForm.contactName}
                    onChange={(e) => setNewTargetForm({ ...newTargetForm, contactName: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Contact Email")}</label>
                  <input
                    type="email"
                    value={newTargetForm.contactEmail}
                    onChange={(e) => setNewTargetForm({ ...newTargetForm, contactEmail: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Company Analysis Notes")}</label>
                  <textarea
                    value={newTargetForm.analysisNotes}
                    onChange={(e) => setNewTargetForm({ ...newTargetForm, analysisNotes: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none h-16 resize-none focus:border-[#0078D4]"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded flex items-center gap-1 cursor-pointer">
                  <Check className="w-4 h-4" />
                  <span>{t("Append Target Company")}</span>
                </button>
              </div>
            </form>
          )}

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
                    className="flex items-center justify-between text-xs bg-white dark:bg-[#1b1a19] p-2 rounded border border-amber-100 dark:border-amber-900/50"
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

          <div className="space-y-3">
            {filteredAccounts.map((account) => {
              const isExpanded = expandedAccountId === account.id;
              return (
                <div key={account.id} className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs overflow-hidden">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedAccountId(isExpanded ? null : account.id)}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{account.companyName}</div>
                      <div className="text-[10px] text-slate-450 mt-0.5">
                        {account.industryTag} · {t(account.bdPipelineStage || "Yeni")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTargetAccount(account.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="p-4 border-t border-[#EDEBE9] dark:border-[#323130] space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Company Analysis Notes")}</label>
                          <textarea
                            defaultValue={account.analysisNotes || ""}
                            onBlur={(e) => updateAccountField(account.id, { analysisNotes: e.target.value })}
                            className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none h-20 resize-none focus:border-[#0078D4]"
                          />
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Next Review / Contact Date")}</label>
                            <input
                              type="date"
                              defaultValue={account.nextReviewDate || ""}
                              onBlur={(e) => updateAccountField(account.id, { nextReviewDate: e.target.value })}
                              className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => createReviewReminderTask(account)}
                            className="text-[11px] font-bold text-[#0078D4] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {t("Create Reminder Task")}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">{t("Competitors")}</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(account.competitors || []).map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            >
                              {c.name}
                              <button type="button" onClick={() => removeCompetitor(account.id, c.id)} className="cursor-pointer hover:text-rose-900">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          {(account.competitors || []).length === 0 && <span className="text-slate-400 text-[11px]">{t("No competitors added yet.")}</span>}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={t("Competitor name")}
                            value={newCompetitorDraft[account.id] || ""}
                            onChange={(e) => setNewCompetitorDraft({ ...newCompetitorDraft, [account.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addCompetitor(account.id);
                              }
                            }}
                            className="flex-1 p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                          />
                          <button
                            type="button"
                            onClick={() => addCompetitor(account.id)}
                            className="text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded cursor-pointer"
                          >
                            {t("Add")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {accounts.length === 0 && (
              <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-8 text-center text-xs text-slate-400">
                {t("No target companies yet. Add your first one above.")}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "bd-pipeline" && (
        <div className="space-y-4">
          <ChartCard title={t("Business Development Funnel")} subtitle={t("Target companies by pipeline stage")} height="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelChartData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="stage" fontSize={9} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis fontSize={9} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name={t("Target Companies")} fill={CHART_COLORS.indigo} radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              {t("Move a target company through the outreach pipeline. Changing stage automatically logs the contact date.")}
            </p>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab("deal-management")}
                className="text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center gap-1.5 cursor-pointer flex-shrink-0"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>{t("Deal Management")}</span>
              </button>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {BD_PIPELINE_STAGES.map((stage) => (
              <div key={stage} className="flex-shrink-0 w-64 bg-[#FAF9F8] dark:bg-[#201f1e] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl">
                <div className="p-3 border-b border-[#EDEBE9] dark:border-[#323130] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{t(stage)}</span>
                  <span className="text-[10px] bg-slate-200 dark:bg-[#323130] text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5">
                    {pipelineByStage[stage].length}
                  </span>
                </div>
                <div className="p-2 space-y-2 min-h-[80px]">
                  {pipelineByStage[stage].map((account) => (
                    <div key={account.id} className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 shadow-sm space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{account.companyName}</div>
                      <div className="text-[10px] text-slate-450">{account.industryTag}</div>
                      <select
                        value={stage}
                        onChange={(e) => handleStageChange(account.id, e.target.value)}
                        className="w-full text-[10px] p-1.5 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none cursor-pointer"
                      >
                        {BD_PIPELINE_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {t(s)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === "playbooks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <select
              value={playbookSectorFilter}
              onChange={(e) => setPlaybookSectorFilter(e.target.value)}
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
              onClick={() => {
                resetPlaybookForm();
                setEditingPlaybookId(null);
                setShowAddPlaybook(!showAddPlaybook);
              }}
              className="text-xs font-bold bg-[#0078D4] hover:bg-[#106ebe] text-white px-3 py-2 rounded flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddPlaybook ? t("Cancel") : t("New Playbook")}</span>
            </button>
          </div>

          {showAddPlaybook && (
            <form onSubmit={handleSavePlaybook} className="bg-white dark:bg-[#1b1a19] border border-[#0078D4]/20 rounded-2xl p-5 shadow-md space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Industry / Sector *")}</label>
                  <input
                    type="text"
                    list="marketing-sector-suggestions-pb"
                    value={playbookForm.industryTag}
                    onChange={(e) => setPlaybookForm({ ...playbookForm, industryTag: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    required
                  />
                  <datalist id="marketing-sector-suggestions-pb">
                    {industryStats.map((row) => (
                      <option key={row.industry} value={row.industry} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Playbook Title *")}</label>
                  <input
                    type="text"
                    value={playbookForm.title}
                    onChange={(e) => setPlaybookForm({ ...playbookForm, title: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Playbook Content")}</label>
                  <textarea
                    value={playbookForm.content}
                    onChange={(e) => setPlaybookForm({ ...playbookForm, content: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none h-24 resize-none focus:border-[#0078D4]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Key Talking Points")}</label>
                  <textarea
                    value={playbookForm.talkingPoints}
                    onChange={(e) => setPlaybookForm({ ...playbookForm, talkingPoints: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none h-16 resize-none focus:border-[#0078D4]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Common Objections")}</label>
                  <textarea
                    value={playbookForm.commonObjections}
                    onChange={(e) => setPlaybookForm({ ...playbookForm, commonObjections: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none h-16 resize-none focus:border-[#0078D4]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t("Case Study References")}</label>
                  <input
                    type="text"
                    value={playbookForm.caseStudyRefs}
                    onChange={(e) => setPlaybookForm({ ...playbookForm, caseStudyRefs: e.target.value })}
                    className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded flex items-center gap-1 cursor-pointer">
                  <Save className="w-4 h-4" />
                  <span>{editingPlaybookId ? t("Update Playbook") : t("Save Playbook")}</span>
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playbooks
              .filter((p) => !playbookSectorFilter || p.industryTag === playbookSectorFilter)
              .map((p) => (
                <div key={p.id} className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{p.title}</div>
                      <div className="text-[10px] text-[#0078D4] font-semibold mt-0.5">{p.industryTag}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => startEditPlaybook(p)} className="text-slate-400 hover:text-[#0078D4] cursor-pointer p-1">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => deletePlaybook(p.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {p.content && <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-4">{p.content}</p>}
                </div>
              ))}
            {playbooks.length === 0 && (
              <div className="md:col-span-2 bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-8 text-center text-xs text-slate-400">
                {t("No playbooks yet. Create your first one above.")}
              </div>
            )}
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
    </div>
  );
}
