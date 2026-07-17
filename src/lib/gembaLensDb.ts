// Gemba Lens — saha tespit / olgunluk değerlendirme veri katmanı.
//
// Bu modül, ayrı bir "Gemba Partner Saha Tespit" uygulamasından (kendi
// localStorage tabanlı db.ts'i, kendi Company modeli, tek kullanıcılı) tam
// entegrasyon kararıyla Gemba IQ'ya taşınıyor. Buradaki en önemli mimari
// fark: o uygulama kendi ayrı "Company" kaydını tutuyordu — burada öyle bir
// şey YOK. Her assessment/operation/observation/saving kaydı, doğrudan
// Gemba IQ'nun gerçek şirket kartına (CompaniesView Company.id) companyId
// üzerinden bağlanıyor. Ayrı bir Gemba Lens şirket listesi yok; şirket
// seçimi her zaman CrmDb.getCompanies()'ten yapılır.
//
// Kalıcılık: RevenueManagementView.tsx'in kendi crm_revenue_* anahtarlarını
// CrmDb.getKv/setKv ile organizasyon bazlı sakladığı desenin birebir aynısı
// kullanılıyor — Supabase'e organizasyon başına, gerçek zamanlı senkronlu.
//
// Not (bilinçli tasarım kararı): kaynak uygulamada olduğu gibi, bir şirket
// için tek bir "güncel" Assessment/OperationData kaydı tutuluyor (aynı
// companyId'ye tekrar kaydetme, üzerine yazar). Bu, kaynak uygulamanın
// kendi semantiğiyle birebir aynı (saha ziyareti geçmişi/versiyonlama
// kapsam dışı — istenirse ayrı bir iş olarak eklenebilir).

import { CrmDb } from "./CrmDb";

export interface GembaLensAssessment {
  assessmentId: string;
  companyId: string; // Gemba IQ CompaniesView Company.id
  overallScore: number; // 0-51 (17 kriter x 0-3 puan)
  potentialSaving: number;
  investmentNeed: number;
  paybackPeriod: number;
  notes: string;
  createdDate: string;
  updatedDate: string;
}

export interface GembaLensOperationData {
  companyId: string;
  // Sektörel ürün maliyet modellemesi girdileri
  sektor: string;
  urunGrubu: string;
  // Temel saha girdileri
  setupMachineCount: string;
  annualVolume: string;
  productionUnit: string;
  turnoverLira: string;
  plannedEfficiency: string;
  actualEfficiency: string;
  copqRate: string;
  scrapRate: string;
  reworkRate: string;
  overtimeRate: string;
  leadTime: string;
  oee: string;
  coveredArea: string;
  operatorsCount: string;
  setupFrequency: string;
  setupDuration: string;
  affectedOpsSetup: string;
  grossLaborCost: string;

  // İşçilik maliyeti sihirbazı
  wizardGrossSalary: string;
  wizardSgkRate: number;
  wizardYemek: string;
  wizardServis: string;
  wizardSeveranceRate: number;
  wizardLeaveRate: number;
  wizardSideBenefits: string;

  // Maliyet dağılım oranları
  costPropMaterial: string;
  costPropLabor: string;
  costPropEnergy: string;
  costPropMaintenance: string;
  costPropOverhead: string;
  costPropProfit: string;

  // 17 kriterlik puanlama (1-17 -> 0-3)
  scores: Record<number, number>;
  // Saha AI danışman sohbet geçmişi
  chatMessages: { role: "user" | "assistant"; content: string }[];
}

export interface GembaLensObservation {
  observationId: string;
  companyId: string;
  category: string;
  finding: string;
  improvement: string;
  photo?: string;
  priority: string; // 'Düşük' | 'Orta' | 'Yüksek' | 'Kritik'
  impact: string; // 'Düşük' | 'Orta' | 'Yüksek'
  createdDate: string;
}

export interface GembaLensSavingResult {
  savingId: string;
  companyId: string;
  savingType: string;
  currentCost: number;
  futureCost: number;
  annualSaving: number;
  roi: number;
  payback: number;
  co2Reduction: number;
  createdDate: string;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const KEYS = {
  ASSESSMENTS: "crm_gembalens_assessments",
  OPERATIONS: "crm_gembalens_operations",
  OBSERVATIONS: "crm_gembalens_observations",
  SAVINGS: "crm_gembalens_savings",
};

const DEFAULT_OPERATION_FIELDS: Omit<GembaLensOperationData, "companyId" | "scores" | "chatMessages"> = {
  sektor: "",
  urunGrubu: "",
  setupMachineCount: "5",
  annualVolume: "500.000",
  productionUnit: "Adet",
  turnoverLira: "",
  plannedEfficiency: "85",
  actualEfficiency: "62",
  copqRate: "4.5",
  scrapRate: "1.8",
  reworkRate: "2.7",
  overtimeRate: "8.5",
  leadTime: "12",
  oee: "58",
  coveredArea: "4.500",
  operatorsCount: "120",
  setupFrequency: "5",
  setupDuration: "45",
  affectedOpsSetup: "3",
  grossLaborCost: "48.000",
  wizardGrossSalary: "30.000",
  wizardSgkRate: 17.5,
  wizardYemek: "4.500",
  wizardServis: "3.500",
  wizardSeveranceRate: 8.33,
  wizardLeaveRate: 5.0,
  wizardSideBenefits: "2.000",
  costPropMaterial: "50",
  costPropLabor: "20",
  costPropEnergy: "10",
  costPropMaintenance: "10",
  costPropOverhead: "10",
  costPropProfit: "10",
};

function blankScores(): Record<number, number> {
  const scores: Record<number, number> = {};
  for (let i = 1; i <= 17; i++) scores[i] = 0;
  return scores;
}

export const GembaLensDb = {
  // --- Assessment ---
  getAssessment(companyId: string): GembaLensAssessment | null {
    const list = CrmDb.getKv<GembaLensAssessment[]>(KEYS.ASSESSMENTS, []);
    return list.find((a) => a.companyId === companyId) || null;
  },

  saveAssessment(companyId: string, fields: Partial<GembaLensAssessment>): GembaLensAssessment {
    const list = CrmDb.getKv<GembaLensAssessment[]>(KEYS.ASSESSMENTS, []);
    const now = new Date().toISOString();
    const idx = list.findIndex((a) => a.companyId === companyId);

    const updated: GembaLensAssessment = {
      assessmentId: idx > -1 ? list[idx].assessmentId : generateUUID(),
      companyId,
      overallScore: fields.overallScore ?? (idx > -1 ? list[idx].overallScore : 0),
      potentialSaving: fields.potentialSaving ?? (idx > -1 ? list[idx].potentialSaving : 0),
      investmentNeed: fields.investmentNeed ?? (idx > -1 ? list[idx].investmentNeed : 0),
      paybackPeriod: fields.paybackPeriod ?? (idx > -1 ? list[idx].paybackPeriod : 0),
      notes: fields.notes ?? (idx > -1 ? list[idx].notes : ""),
      createdDate: idx > -1 ? list[idx].createdDate : now,
      updatedDate: now,
    };

    if (idx > -1) list[idx] = updated;
    else list.push(updated);
    CrmDb.setKv(KEYS.ASSESSMENTS, list);
    return updated;
  },

  // --- Operation data (saha girdileri + puanlar + sohbet) ---
  getOperation(companyId: string): GembaLensOperationData | null {
    const list = CrmDb.getKv<GembaLensOperationData[]>(KEYS.OPERATIONS, []);
    return list.find((o) => o.companyId === companyId) || null;
  },

  getOrCreateOperation(companyId: string): GembaLensOperationData {
    const existing = this.getOperation(companyId);
    if (existing) return existing;
    const fresh: GembaLensOperationData = {
      companyId,
      ...DEFAULT_OPERATION_FIELDS,
      scores: blankScores(),
      chatMessages: [
        {
          role: "assistant",
          content: "Merhaba! Ben Gemba Digital Yapay Zeka Baş Danışmanınızım. Sorularınızı bekliyorum!",
        },
      ],
    };
    return fresh;
  },

  saveOperation(operation: GembaLensOperationData): void {
    const list = CrmDb.getKv<GembaLensOperationData[]>(KEYS.OPERATIONS, []);
    const idx = list.findIndex((o) => o.companyId === operation.companyId);
    if (idx > -1) list[idx] = operation;
    else list.push(operation);
    CrmDb.setKv(KEYS.OPERATIONS, list);
  },

  // --- Observations (saha bulguları) ---
  getObservations(companyId: string): GembaLensObservation[] {
    const list = CrmDb.getKv<GembaLensObservation[]>(KEYS.OBSERVATIONS, []);
    return list.filter((o) => o.companyId === companyId);
  },

  addObservation(
    companyId: string,
    category: string,
    finding: string,
    improvement: string,
    priority: string,
    impact: string,
    photo?: string
  ): GembaLensObservation {
    const list = CrmDb.getKv<GembaLensObservation[]>(KEYS.OBSERVATIONS, []);
    const newObs: GembaLensObservation = {
      observationId: generateUUID(),
      companyId,
      category,
      finding,
      improvement,
      priority,
      impact,
      photo,
      createdDate: new Date().toISOString(),
    };
    list.push(newObs);
    CrmDb.setKv(KEYS.OBSERVATIONS, list);
    return newObs;
  },

  updateObservation(observation: GembaLensObservation): void {
    const list = CrmDb.getKv<GembaLensObservation[]>(KEYS.OBSERVATIONS, []);
    const idx = list.findIndex((o) => o.observationId === observation.observationId);
    if (idx > -1) {
      list[idx] = observation;
      CrmDb.setKv(KEYS.OBSERVATIONS, list);
    }
  },

  deleteObservation(observationId: string): void {
    const list = CrmDb.getKv<GembaLensObservation[]>(KEYS.OBSERVATIONS, []);
    CrmDb.setKv(
      KEYS.OBSERVATIONS,
      list.filter((o) => o.observationId !== observationId)
    );
  },

  // --- Savings (ROI/geri kazanım sonuçları) ---
  getSavings(companyId: string): GembaLensSavingResult[] {
    const list = CrmDb.getKv<GembaLensSavingResult[]>(KEYS.SAVINGS, []);
    return list.filter((s) => s.companyId === companyId);
  },

  saveSavings(companyId: string, savingsList: GembaLensSavingResult[]): void {
    const all = CrmDb.getKv<GembaLensSavingResult[]>(KEYS.SAVINGS, []);
    const filtered = all.filter((s) => s.companyId !== companyId);
    filtered.push(...savingsList);
    CrmDb.setKv(KEYS.SAVINGS, filtered);
  },

  // --- Dashboard istatistikleri ---
  // Not: kaynak uygulamadaki gibi kendi "totalCompanies" saymaz — bu artık
  // gerçek CompaniesView listesinden gelir (bkz. GembaLensView.tsx). Burada
  // sadece Gemba Lens'e özgü toplamlar hesaplanır.
  getStats(companyIds: string[]): {
    totalAssessed: number;
    totalPotentialSaving: number;
    averageLeanScore: number;
    thisMonthAssessments: number;
  } {
    const assessments = CrmDb.getKv<GembaLensAssessment[]>(KEYS.ASSESSMENTS, []).filter((a) =>
      companyIds.includes(a.companyId)
    );

    let totalPotentialSaving = 0;
    let scoreSum = 0;
    let scoredCount = 0;

    assessments.forEach((a) => {
      totalPotentialSaving += a.potentialSaving || 0;
      if (a.overallScore > 0) {
        scoreSum += a.overallScore;
        scoredCount++;
      }
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const thisMonthStr = startOfMonth.toISOString().slice(0, 7);
    const thisMonthAssessments = assessments.filter((a) => a.updatedDate?.startsWith(thisMonthStr)).length;

    return {
      totalAssessed: assessments.length,
      totalPotentialSaving,
      averageLeanScore: scoredCount > 0 ? Math.round(scoreSum / scoredCount) : 0,
      thisMonthAssessments,
    };
  },
};
