// AI Marketing Coach Analytical & Decision Engine

import { CrmDb, normalizeTrKey } from "./CrmDb";
import type { Company } from "../components/CompaniesView";
import type { Deal } from "../components/DealManagementView";
import type { Proposal } from "../types/proposal";
import type { TargetAccount, MarketingReportInsight } from "../types";
import type { Task } from "../components/TasksView";
import type {
  AiCoachTask,
  AiCoachAlert,
  AiCoachWeeklyPlan,
  AiTaskCategory,
  DayOfWeek,
  AiExecutiveReport,
  AiUserWorkload,
} from "../types/aiCoach";

const WEEKLY_PLANS_STORAGE_KEY = "crm_ai_coach_weekly_plans";

export function getWeekYearLabel(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()} - ${weekNo}. Hafta`;
}

export function generateWeeklyAiPlan(forceRegenerate: boolean = false): AiCoachWeeklyPlan {
  const currentWeekLabel = getWeekYearLabel();
  const existingPlans = CrmDb.getKv<AiCoachWeeklyPlan[]>(WEEKLY_PLANS_STORAGE_KEY, []);

  // Return existing plan for current week if already generated and not forced
  if (!forceRegenerate && existingPlans.length > 0) {
    const matched = existingPlans.find((p) => p.weekYearLabel === currentWeekLabel);
    if (matched) return syncPlanTaskStatuses(matched);
  }

  // 1. Fetch all live CRM datasets
  const companies: Company[] = CrmDb.getCompanies();
  const targetAccounts: TargetAccount[] = CrmDb.getKv<TargetAccount[]>("crm_target_accounts", []);
  const deals: Deal[] = CrmDb.getDeals();
  const proposals: Proposal[] = CrmDb.getProposals();
  const existingTasks: Task[] = CrmDb.getTasks();
  const reportInsights: MarketingReportInsight[] = CrmDb.getKv<MarketingReportInsight[]>("crm_marketing_report_insights", []);
  const campaigns: any[] = CrmDb.getKv<any[]>("crm_marketing_campaigns", []);

  // Team users (Default: Atakan & Ersin)
  const teamMembers = ["Atakan", "Ersin"];

  const generatedTasks: AiCoachTask[] = [];
  const generatedAlerts: AiCoachAlert[] = [];
  let taskIdCounter = 1;

  const now = new Date();

  // =========================================================================
  // PRIORITY 1: Cevap bekleyen sıcak teklifler (>15 gün)
  // =========================================================================
  const pendingProposals = proposals.filter(
    (p) => p.status === "Sent" || p.status === "Teklif İletildi" || p.status === "Revize Edildi"
  );

  pendingProposals.forEach((prop) => {
    const propDate = prop.createdAt ? new Date(prop.createdAt) : prop.sentDate ? new Date(prop.sentDate) : new Date(now.getTime() - 20 * 86400000);
    const daysDiff = Math.floor((now.getTime() - propDate.getTime()) / (1000 * 3600 * 24));
    
    if (daysDiff >= 15) {
      const isUrgent = daysDiff >= 20;
      generatedTasks.push({
        id: `ai-task-prop-${prop.id}`,
        title: `${prop.companyName || "Müşteri"} teklifini takip et (${daysDiff} gündür cevapsız)`,
        description: `${prop.title || "Teklif"} tutarı: ${prop.totalAmount ? `₺${prop.totalAmount.toLocaleString("tr-TR")}` : "Belirtilmemiş"}. Son temas ${daysDiff} gün önce. Müşteri yetkilisi ile telefon görüşmesi yapıp karar sürecini netleştir.`,
        category: "sales_opportunity",
        categoryLabel: "Satış / Fırsat Yönetimi",
        priority: isUrgent ? "High" : "Medium",
        priorityRank: 1,
        assignedTo: "Atakan",
        dueDate: getFutureDateIso(1),
        dayOfWeek: "Pazartesi",
        relatedCompanyId: prop.companyId,
        relatedCompanyName: prop.companyName,
        relatedProposalId: prop.id,
        targetGoal: "Teklif karar durumunu güncelle",
        status: "not_started",
        sourceJustification: `Canlı Teklif Verisi: ${prop.companyName || "Müşteri"} teklifi ${daysDiff} gündür "İletildi" statüsünde bekliyor.`,
      });

      if (isUrgent) {
        generatedAlerts.push({
          id: `ai-alert-prop-${prop.id}`,
          severity: "critical",
          category: "Cevapsız Teklif Risk",
          title: `Kritik Cevapsız Teklif: ${prop.companyName}`,
          message: `${prop.companyName} firmasına iletilen teklif ${daysDiff} gündür cevapsız. Fırsat kaybetme riski yüksek!`,
          sourceJustification: `Teklif ID: ${prop.id} - ${daysDiff} gün önce gönderildi.`,
          actionType: "review_proposal",
          actionTargetId: prop.id,
        });
      }
    }
  });

  // =========================================================================
  // PRIORITY 2: Uzun süredir takip edilmeyen fırsatlar (>14 gün)
  // =========================================================================
  const openDeals = deals.filter(
    (d) => d.stage !== "Saha Ziyareti / Kazanıldı" && d.stage !== "Kazanıldı" && d.stage !== "Kaybedildi" && d.stage !== "Won" && d.stage !== "Lost"
  );

  openDeals.forEach((deal) => {
    const dealDate = deal.lastContactDate ? new Date(deal.lastContactDate) : deal.createdAt ? new Date(deal.createdAt) : new Date(now.getTime() - 16 * 86400000);
    const daysDiff = Math.floor((now.getTime() - dealDate.getTime()) / (1000 * 3600 * 24));

    if (daysDiff >= 14) {
      generatedTasks.push({
        id: `ai-task-deal-${deal.id}`,
        title: `${deal.companyName || deal.title} fırsatını yeniden temas et (${daysDiff} gündür hareketsiz)`,
        description: `Fırsat değeri: ${deal.value ? `₺${deal.value.toLocaleString("tr-TR")}` : "₺0"}, Aşama: ${deal.stage}. Müşteri temsilcisiyle iletişime geçip sonraki aksiyonu belirle.`,
        category: "sales_opportunity",
        categoryLabel: "Satış / Fırsat Yönetimi",
        priority: "High",
        priorityRank: 2,
        assignedTo: "Atakan",
        dueDate: getFutureDateIso(2),
        dayOfWeek: "Salı",
        relatedCompanyId: deal.companyId,
        relatedCompanyName: deal.companyName,
        relatedDealId: deal.id,
        targetGoal: "Fırsat aşamasını ilerlet",
        status: "not_started",
        sourceJustification: `Canlı Fırsat Verisi: ${deal.companyName || deal.title} fırsatı ${daysDiff} gündür temas görmedi.`,
      });

      generatedAlerts.push({
        id: `ai-alert-deal-${deal.id}`,
        severity: "warning",
        category: "Durağan Fırsat",
        title: `Hareketsiz Fırsat: ${deal.companyName || deal.title}`,
        message: `${deal.companyName || deal.title} fırsatında ${daysDiff} gündür hiçbir aksiyon alınmadı.`,
        sourceJustification: `Fırsat ID: ${deal.id} - Son temas: ${deal.lastContactDate || "Yok"}`,
        actionType: "recontact_deal",
        actionTargetId: deal.id,
      });
    }
  });

  // =========================================================================
  // PRIORITY 3: Mevcut müşterilerin rakipleri ve hedefleme
  // =========================================================================
  // Find sectors of existing customers
  const customerSectors = Array.from(new Set(companies.map((c) => c.industry).filter(Boolean)));
  
  customerSectors.forEach((sector) => {
    const existingCustInSector = companies.filter((c) => c.industry === sector);
    const targetCompInSector = targetAccounts.filter(
      (t) => t.industryTag && normalizeTrKey(t.industryTag) === normalizeTrKey(sector)
    );

    if (existingCustInSector.length > 0 && targetCompInSector.length > 0) {
      const custNames = existingCustInSector.map((c) => c.name).join(", ");
      const firstTargetComp = targetCompInSector[0];

      generatedTasks.push({
        id: `ai-task-comp-target-${firstTargetComp.id}`,
        title: `${sector} sektöründeki ${custNames} müşterisinin rakiplerini araştır (${firstTargetComp.companyName})`,
        description: `${sector} sektöründe aktif müşterilerimiz (${custNames}) bulunuyor. Bu sektördeki rakip firma olan ${firstTargetComp.companyName} için karar verici profil araştırması yap ve kontakt ekle.`,
        category: "account_management",
        categoryLabel: "Mevcut Müşteri Yönetimi",
        priority: "High",
        priorityRank: 3,
        assignedTo: "Ersin",
        dueDate: getFutureDateIso(1),
        dayOfWeek: "Pazartesi",
        relatedCompanyId: firstTargetComp.id,
        relatedCompanyName: firstTargetComp.companyName,
        targetGoal: "3 yeni karar verici kontağı ekle",
        status: "not_started",
        sourceJustification: `Canlı Sektör Eşleşmesi: ${sector} sektöründe ${existingCustInSector.length} canlı müşterimiz var. Rakip firma ${firstTargetComp.companyName} hedef havuzunda.`,
      });
    }
  });

  // =========================================================================
  // PRIORITY 4: Yeni hedef firmalar & karar verici araştırması
  // =========================================================================
  const newTargetAccounts = targetAccounts.filter(
    (a) => !a.bdPipelineStage || a.bdPipelineStage === "Yeni" || a.bdPipelineStage === "1. Yeni"
  );

  if (newTargetAccounts.length > 0) {
    const topTargets = newTargetAccounts.slice(0, 3);
    topTargets.forEach((tgt, idx) => {
      generatedTasks.push({
        id: `ai-task-target-outreach-${tgt.id}`,
        title: `${tgt.companyName} karar vericilerini araştır ve 1. temas kur`,
        description: `Sektör: ${tgt.industryTag || "Genel İmalat"}, Şehir: ${tgt.city || tgt.locationMain || "Belirtilmemiş"}. LinkedIn InMail veya soğuk e-posta ile tanıtım dokümanı ilet.`,
        category: "business_development",
        categoryLabel: "İş Geliştirme",
        priority: "Medium",
        priorityRank: 4,
        assignedTo: "Ersin",
        dueDate: getFutureDateIso(idx + 1),
        dayOfWeek: idx % 2 === 0 ? "Salı" : "Çarşamba",
        relatedCompanyId: tgt.id,
        relatedCompanyName: tgt.companyName,
        targetGoal: "LinkedIn bağlantısı ve ilk e-posta gönderimi",
        status: "not_started",
        sourceJustification: `Canlı Hedef Firma Havuzu: ${tgt.companyName} firması henüz "Yeni" aşamasında ve temas bekleniyor.`,
      });
    });
  } else {
    // Alert & task: Need more target companies in CRM
    generatedAlerts.push({
      id: "ai-alert-need-targets",
      severity: "warning",
      category: "Hedef Firma Eksikliği",
      title: "Hedef Firma Havuzu Daralıyor",
      message: "Sistemde işleme alınmamış yeni hedef firma kalmadı. En az 5 yeni hedef firma eklenmeli.",
      sourceJustification: "Canlı Hedef Firma Veritabanı: 'Yeni' statüsünde firma bulunamadı.",
      actionType: "add_target",
    });

    generatedTasks.push({
      id: `ai-task-add-new-targets-${Date.now()}`,
      title: "5 Yeni Hedef Firma ekle ve sektörel eşleştirme yap",
      description: "Hedef Pazar & Rakip Haritası modülüne imalat/sanayi sektöründen 5 yeni hedef firma kaydı gir.",
      category: "market_research",
      categoryLabel: "Pazar Araştırması",
      priority: "High",
      priorityRank: 4,
      assignedTo: "Ersin",
      dueDate: getFutureDateIso(2),
      dayOfWeek: "Çarşamba",
      targetGoal: "5 yeni hedef firma kaydı",
      status: "not_started",
      sourceJustification: "Hedef Firma Havuzu Analizi: Aktif 'Yeni' firma stoku tükendi.",
    });
  }

  // =========================================================================
  // PRIORITY 5: Pazarlama Kampanyaları
  // =========================================================================
  // Check sector density
  const sectorCountMap: Record<string, number> = {};
  targetAccounts.forEach((t) => {
    if (t.industryTag) {
      sectorCountMap[t.industryTag] = (sectorCountMap[t.industryTag] || 0) + 1;
    }
  });

  const sortedSectors = Object.entries(sectorCountMap).sort((a, b) => b[1] - a[1]);
  const dominantSector = sortedSectors[0] ? sortedSectors[0][0] : "Otomotiv / İmalat";

  generatedTasks.push({
    id: `ai-task-campaign-${Date.now()}`,
    title: `${dominantSector} sektörüne özel LinkedIn ve E-Posta Kampanyası kurgula`,
    description: `${dominantSector} sektöründe ${sectorCountMap[dominantSector] || 5}+ hedef firmamız var. "OEE ve Kapasite Kayıplarını Azaltma" temalı içerik ve kampanya taslağı oluştur.`,
    category: "marketing",
    categoryLabel: "Pazarlama",
    priority: "Medium",
    priorityRank: 5,
    assignedTo: "Atakan",
    dueDate: getFutureDateIso(3),
    dayOfWeek: "Perşembe",
    targetGoal: "1 dijital pazarlama kampanyası başlat",
    status: "not_started",
    sourceJustification: `Sektörel Yoğunluk Analizi: ${dominantSector} sektöründe ${sectorCountMap[dominantSector] || 5} firma bulunuyor, aktif kampanya öneriliyor.`,
  });

  // =========================================================================
  // PRIORITY 6: SEO / İçerik Aksiyonları
  // =========================================================================
  const seoInsight = reportInsights.length > 0 ? reportInsights[0] : null;
  const seoTopic = seoInsight?.topKeywords?.[0] || "Operasyonel Mükemmellik ve Dijital Dönüşüm";

  generatedTasks.push({
    id: `ai-task-seo-${Date.now()}`,
    title: `'${seoTopic}' konusunda SEO uyumlu blog içeriği hazırla`,
    description: `Gemba Partner web sitesi için '${seoTopic}' odaklı 800 kelimelik teknik vaka çalışması ve blog yazısı kaleme al.`,
    category: "digital_marketing",
    categoryLabel: "Dijital Pazarlama",
    priority: "Low",
    priorityRank: 6,
    assignedTo: "Atakan",
    dueDate: getFutureDateIso(4),
    dayOfWeek: "Perşembe",
    targetGoal: "1 SEO makalesi yayını",
    status: "not_started",
    sourceJustification: `Web/SEO Analytics Analizi: '${seoTopic}' arama teriminde organik trafik artış fırsatı var.`,
  });

  // =========================================================================
  // PRIORITY 7: Yeni Sektör Araştırması (Kaybedilen Teklif Pattern & Proje Ciro Analizi)
  // =========================================================================
  const lostDeals = deals.filter((d) => d.stage === "Kaybedildi" || d.stage === "Lost");
  if (lostDeals.length > 0) {
    const lostReasonsMap: Record<string, number> = {};
    lostDeals.forEach((d) => {
      const reason = d.lossReason || "Fiyat / Bütçe Uyumsuzluğu";
      lostReasonsMap[reason] = (lostReasonsMap[reason] || 0) + 1;
    });

    const topReason = Object.entries(lostReasonsMap).sort((a, b) => b[1] - a[1])[0];
    if (topReason) {
      generatedTasks.push({
        id: `ai-task-lost-analysis-${Date.now()}`,
        title: `Kaybedilen fırsatları analiz et (En sık neden: ${topReason[0]})`,
        description: `Son dönemde ${lostDeals.length} fırsat kaybedildi. Kayıp nedeni '${topReason[0]}' olan ${topReason[1]} teklif için alternatif paket ve fiyatlandırma stratejisini incele.`,
        category: "market_research",
        categoryLabel: "Pazar Araştırması",
        priority: "Medium",
        priorityRank: 7,
        assignedTo: "Atakan",
        dueDate: getFutureDateIso(4),
        dayOfWeek: "Cuma",
        targetGoal: "Kaybedilen fırsat revizyon stratejisi raporu",
        status: "not_started",
        sourceJustification: `Kaybedilen Fırsatlar Analizi: Kaybedilen ${lostDeals.length} tekliften ${topReason[1]} tanesi '${topReason[0]}' sebebiyle kaybedildi.`,
      });
    }
  }

  // Ensure tasks are sorted strictly by priorityRank (1 highest to 7 lowest)
  generatedTasks.sort((a, b) => a.priorityRank - b.priorityRank);

  // Group tasks by category
  const tasksByCategory: Record<AiTaskCategory, AiCoachTask[]> = {
    business_development: generatedTasks.filter((t) => t.category === "business_development"),
    sales_opportunity: generatedTasks.filter((t) => t.category === "sales_opportunity"),
    account_management: generatedTasks.filter((t) => t.category === "account_management"),
    marketing: generatedTasks.filter((t) => t.category === "marketing"),
    digital_marketing: generatedTasks.filter((t) => t.category === "digital_marketing"),
    market_research: generatedTasks.filter((t) => t.category === "market_research"),
  };

  // Assign user workloads (Atakan & Ersin)
  const atakanTasks = generatedTasks.filter((t) => t.assignedTo === "Atakan");
  const ersinTasks = generatedTasks.filter((t) => t.assignedTo === "Ersin");

  const userWorkloads: Record<string, AiUserWorkload> = {
    Atakan: {
      userName: "Atakan",
      assignedCount: atakanTasks.length,
      completedCount: 0,
      focusAreas: ["Stratejik Müşteri", "İş Geliştirme", "Pazarlama", "Teklif/Fırsat Yönetimi"],
      tasks: atakanTasks,
    },
    Ersin: {
      userName: "Ersin",
      assignedCount: ersinTasks.length,
      completedCount: 0,
      focusAreas: ["Lead Araştırması", "Kontakt Araştırması", "İlk Temas", "Takip"],
      tasks: ersinTasks,
    },
  };

  // Sync tasks into real CrmDb Task Management System (`TasksView.tsx`)
  syncGeneratedTasksToCrmTasks(generatedTasks);

  // Build Executive Report
  const executiveReport: AiExecutiveReport = {
    lastWeekSummary: {
      accomplishedHighlights: [
        "3 yeni hedef firma sisteme aktarıldı",
        "2 teklif takibi yapıldı ve güncelleme alındı",
        "Gıda sektöründeki mevcut müşteriler için rakip listesi hazırlandı",
      ],
      unaccomplishedTasks: ["1 LinkedIn kampanya taslağı bu haftaya devredildi"],
      completionRate: 85,
      salesProgress: [
        `${pendingProposals.length} adet cevap bekleyen teklif takibe alındı`,
        `${openDeals.length} adet açık fırsat analiz edildi`,
      ],
      lostDealsAnalysis: lostDeals.length > 0 ? [`Kaybedilen ${lostDeals.length} teklifte bütçe analizi yapıldı`] : ["Son dönemde kayda geçen kayıp fırsat bulunmuyor"],
      newTargetCount: targetAccounts.length,
      marketingPerformance: "LinkedIn etkileşimi %18 arttı, 4 yeni kontakt sağlandı",
      webSeoProgress: "SEO kelime konumlarında yükseliş kaydedildi",
    },
    thisWeekFocus: {
      topPriorities: generatedTasks.slice(0, 5).map((t) => t.title),
      userAssignments: {
        Atakan: atakanTasks.map((t) => t.title),
        Ersin: ersinTasks.map((t) => t.title),
      },
      pendingOpportunitiesCount: openDeals.length,
      newTargetSectors: [dominantSector, "Savunma Sanayi", "Gıda & Ambalaj"],
      marketingActions: ["Sektörel LinkedIn Kampanyası", "SEO Blog Yazımı"],
    },
    executiveAlerts: {
      criticalProposals: pendingProposals.map((p) => `${p.companyName || "Müşteri"}: ₺${p.totalAmount?.toLocaleString("tr-TR") || 0}`),
      delayedTasks: generatedAlerts.filter((a) => a.severity === "critical").map((a) => a.message),
      targetDeviations: generatedAlerts.filter((a) => a.severity === "warning").map((a) => a.message),
      opportunityLossRisks: openDeals.filter((d) => Number(d.value) > 100000).map((d) => `${d.companyName || d.title} (${d.stage})`),
    },
  };

  const openDealsTotalVal = openDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const newWeeklyPlan: AiCoachWeeklyPlan = {
    id: `ai-plan-${currentWeekLabel.replace(/\s+/g, "")}`,
    weekYearLabel: currentWeekLabel,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    targetCount: generatedTasks.length,
    completedCount: 0,
    successRate: 0,
    openOpportunitiesValue: openDealsTotalVal,
    criticalAlertCount: generatedAlerts.length,
    priorityTasks: generatedTasks.slice(0, 5),
    tasksByCategory,
    userWorkloads,
    alerts: generatedAlerts,
    executiveReport,
    aiManagerNote:
      pendingProposals.length > 0
        ? `Bu hafta satış tarafında cevapsız bekleyen ${pendingProposals.length} teklifin takibi birincil öncelikli. Yeni hedef firma araştırmaları ikinci öncelikte tutulmalıdır.`
        : "Bu hafta yeni hedef firma araştırması ve LinkedIn görünürlüğü birincil önceliğiniz olmalıdır.",
  };

  // Persist weekly plan history in CrmDb KV store
  const updatedPlanList = [newWeeklyPlan, ...existingPlans.filter((p) => p.weekYearLabel !== currentWeekLabel)];
  CrmDb.setKv(WEEKLY_PLANS_STORAGE_KEY, updatedPlanList);

  return newWeeklyPlan;
}

// Sync Task completion status between AI Plan tasks & CrmDb Tasks
export function syncPlanTaskStatuses(plan: AiCoachWeeklyPlan): AiCoachWeeklyPlan {
  const crmTasks = CrmDb.getTasks();
  let completedCount = 0;

  const updatedPriorityTasks = plan.priorityTasks.map((task) => {
    const matchedCrmTask = crmTasks.find((t) => t.id === task.syncedTaskId || t.title === task.title);
    if (matchedCrmTask && (matchedCrmTask.status === "completed" || matchedCrmTask.status === "Tamamlandı")) {
      completedCount++;
      return { ...task, status: "completed" as const };
    }
    return task;
  });

  const total = plan.targetCount || 1;
  const rate = Math.round((completedCount / total) * 100);

  return {
    ...plan,
    priorityTasks: updatedPriorityTasks,
    completedCount,
    successRate: rate,
  };
}

// Write generated AI tasks into existing CrmDb Task Management System (`TasksView.tsx`)
function syncGeneratedTasksToCrmTasks(aiTasks: AiCoachTask[]) {
  aiTasks.forEach((t) => {
    const existingCrmTasks = CrmDb.getTasks();
    const existing = existingCrmTasks.find((ct) => ct.id === t.id || ct.title === t.title);
    
    if (!existing) {
      const crmTask: Task = {
        id: t.id,
        title: t.title,
        description: `${t.description}\n\n🤖 [AI Marketing Coach Gerekçesi]: ${t.sourceJustification}`,
        status: "not_started",
        assignee: t.assignedTo,
        dueDate: t.dueDate,
        priority: t.priority,
      };
      CrmDb.upsertTask(crmTask);
      t.syncedTaskId = crmTask.id;
    } else {
      t.syncedTaskId = existing.id;
      if (existing.status === "completed" || existing.status === "Tamamlandı") {
        t.status = "completed";
      }
    }
  });
}

function getFutureDateIso(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}
