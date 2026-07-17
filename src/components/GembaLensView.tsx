import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { CrmDb } from "../lib/CrmDb";
import { Company } from "./CompaniesView";
import { Deal } from "./DealManagementView";
import {
  GembaLensDb,
  GembaLensOperationData,
  GembaLensObservation,
} from "../lib/gembaLensDb";
import {
  Search,
  Building,
  ArrowLeft,
  Target,
  Gauge,
  TrendingUp,
  Coins,
  Award,
  ClipboardCheck,
  Plus,
  Trash2,
  Save,
  FileText,
  CheckCircle2,
  Sparkles,
  Layers,
  Bot,
  Send,
} from "lucide-react";

// ─── GEMBA LENS — FIELD ASSESSMENT & OPPORTUNITY SCORING ────────────────────
//
// Ported from the standalone "Gemba Partner Saha Tespit" tool per the user's
// "Tam entegrasyon" (full integration) decision. Key differences from the
// source app, all intentional:
//
// 1. No separate company model — every assessment is bound to a real Gemba
//    IQ Company.id (see gembaLensDb.ts). Company selection always reads from
//    CrmDb.getCompanies().
// 2. Single-currency (₺) simplification of the source app's multi-currency
//    EUR/USD/TRY day-rate + FX engine. Gemba IQ has no live FX helper and
//    Revenue Management already treats ₺ as the working currency, so the
//    daily consulting rate here is a plain editable ₺ figure (with the same
//    105-156/≥157 man-day volume discount tiers and 30.000 ₺ floor as the
//    source app) rather than reintroducing FX conversion.
// 3. The opportunity/COPQ pool is computed from the same core loss formulas
//    (COPQ, setup/changeover loss, efficiency-gap loss) as the source app's
//    totalLossExpected, then bracketed to the same 20%-30% recoverable range
//    the source app's 15-bucket scaled breakdown converges to (its "Option 4"
//    target). This keeps the headline numbers faithful without reproducing
//    the full per-category scaling engine.
// 4. "Teklif Oluştur" does not reimplement the Proposal wizard. It creates/
//    updates a real Deal (Fırsat) with the recommended package embedded, then
//    hands off to the existing ServicesView proposal wizard via the same
//    `crm_wizard_preselected_company` KV handoff already used by the Deal
//    drawer's own "Teklif Oluştur" button (OpportunityDrawerExtension.tsx).

interface GembaLensViewProps {
  onNavigateToTab?: (tab: string) => void;
}

// ─── 17-CRITERIA MATURITY MODEL (verbatim from source app) ─────────────────
interface Criterion {
  no: number;
  cat: string;
  text: string;
}
interface CriterionGroup {
  group: string;
  desc: string;
  icon: string;
  items: Criterion[];
}

const CRITERIA: CriterionGroup[] = [
  {
    group: "Yönetim & Strateji",
    desc: "Hedef yayılımı, metrik yönetim ve kurumsal takip mekanizmaları",
    icon: "🎯",
    items: [
      { no: 1, cat: "Yönetim Süreçlerinin İzlenebilirliği", text: "Hedef yönetimi ve takip sistemi kurulmuştur. Yönetim süreçleri ölçülebilir şekilde izlenmektedir." },
      { no: 2, cat: "Operasyonel Faaliyet Raporlama", text: "Operasyonel süreçlerin takibi için bir birim kurulmuş, faaliyetler raporlarla takip edilmektedir." },
    ],
  },
  {
    group: "Üretim & Akış",
    desc: "Darboğaz yönetimi, OEE verimlilik takipleri ve operasyonel kayıplar",
    icon: "⚙️",
    items: [
      { no: 3, cat: "Değer Akışının Yönetimi", text: "Darboğazlar tespit edilip yönetilmektedir. Güncel akış iyileştirme çalışmaları yürütülmektedir." },
      { no: 4, cat: "Problem Çözme Takip", text: "Üretim verimliliğini etkileyen en büyük problemler takip edilip iyileştirilmektedir." },
      { no: 5, cat: "Operasyonel Maliyetlerin Takibi", text: "OEE ve alt kırılımları takip edilmekte, verimlilik problemleri iyileştirme programlarıyla çözülmektedir." },
      { no: 6, cat: "Maliyet Metrikleri Kontrolü", text: "Hurda, hata, fazla mesai, enerji, makine duruşları gibi maliyet unsurları metriklerle kontrol altındadır." },
    ],
  },
  {
    group: "Görsel Fabrika & 5S",
    desc: "Saha düzeni, görsel kontrol enstrümanları ve iş güvenliği kültürü",
    icon: "👁️",
    items: [
      { no: 7, cat: "Görsel Fabrika Kurulumu", text: "Görsel yönetim enstrümanları devreye alınmış, görsel ve işitsel kontrol sistemleri uygulanmaktadır." },
      { no: 8, cat: "5S Standartları", text: "5S adımları devreye alınmış, malzeme akışları ve alan tanımları belirli, hücre/hat içleri düzenlidir." },
      { no: 9, cat: "İş Sağlığı ve Güvenliği", text: "İş güvenliği faaliyetleri organizasyonla yönetilmektedir. Hedefler belirlenmiş, riskler takip edilmektedir." },
    ],
  },
  {
    group: "Standart İş & WIP",
    desc: "Hat denkleme süreçleri, çevrim süreleri ve ara stok hassasiyeti",
    icon: "📊",
    items: [
      { no: 10, cat: "Standart İş Uygulamaları", text: "Proseslerde standart iş uygulamaları görünmektedir, hat denge çalışmaları yapılmaktadır." },
      { no: 11, cat: "Kapasite & Çevrim Analizi", text: "Çevrim süreleri belirli, saatlik kapasite bazında üretim kayıp analizleri yapılabilmektedir." },
      { no: 12, cat: "Akış & WIP Yönetimi", text: "Üretim akışı belirli, tek parça akışına uygun yapı vardır. Tüm ara stoklar takip edilmektedir." },
    ],
  },
  {
    group: "Saha Liderliği & Sürekli Gelişim",
    desc: "Takım lideri gelişimleri, Kaizen fikir havuzu ve problem giderme",
    icon: "🌱",
    items: [
      { no: 13, cat: "Saha Örgüt Yapısı", text: "Saha yönetimi için organizasyon kurulmuş, liderlerle birlikte mikro yönetim sağlanmaktadır." },
      { no: 14, cat: "Sürekli Gelişim Yaklaşımı", text: "Kaizen ve öneri sistemi uygulamaları mevcuttur. Önerilerin değerlendirildiği bir sistem kurulmuştur." },
      { no: 15, cat: "İleri İyileştirme Araçları", text: "Problem çözme çalışmaları ve 6 Sigma gibi temel iyileştirme araçları kullanılmaktadır." },
    ],
  },
  {
    group: "Bakım Yönetimi",
    desc: "Üretim hattı otonom bakım adımları, duruşlar ve MTTR / MTBF hedefleri",
    icon: "🔧",
    items: [
      { no: 16, cat: "Planlı Bakım Yönetimi", text: "Bakım süreçleri tanımlanmış, MTTR/MTBF hedefleriyle yönetilmektedir. Organizasyon yapısı kurulmuştur." },
      { no: 17, cat: "Otonom Bakım Çalışmaları", text: "Otonom bakım uygulamaları devreye alınmış, çalışanlar tarafından ekipman iyileştirme çalışmaları yapılmaktadır." },
    ],
  },
];

const SCORE_LABELS = ["Yok", "Başlangıç Seviyesi", "Gelişmekte", "Olgun / Sistematik"];

interface ProgramOption {
  name: string;
  ag: number; // adam-gün / yıl
}
interface ProgramConfig {
  min: number;
  max: number;
  levelLabel: string;
  op1: ProgramOption;
  op2: ProgramOption;
}

// Verbatim from source app (score out of 51 = 17 criteria x 0-3).
const PROGRAMS: ProgramConfig[] = [
  { min: 0, max: 12, levelLabel: "Seviye 1 — Çok Düşük Olgunluk", op1: { name: "Dönüşüm Liderliği Programı", ag: 156 }, op2: { name: "Hızlandırılmış Program", ag: 104 } },
  { min: 13, max: 25, levelLabel: "Seviye 2 — Düşük Olgunluk", op1: { name: "Hızlandırılmış Program", ag: 104 }, op2: { name: "Standart Gelişim Programı", ag: 52 } },
  { min: 26, max: 40, levelLabel: "Seviye 3 — Orta Olgunluk", op1: { name: "Standart Gelişim Programı", ag: 52 }, op2: { name: "Mevcut Değil", ag: 0 } },
  { min: 41, max: 51, levelLabel: "Seviye 4 — Yüksek Olgunluk", op1: { name: "Eğitim ve Koçluk Programı", ag: 24 }, op2: { name: "Mevcut Değil", ag: 0 } },
];

const DESCS: Record<string, string> = {
  "Standart Gelişim Programı": "Darboğaz alanlar üzerinde temel yalın tekniklerin uygulanması ile pilot projeler öncelikli olarak devreye alınır. İsraf kaynaklarını kurutup ilk büyük verimlilik ve hız kazanımlarını sahada somutlaştırmaya odaklanır. [Ziyaret Frekansı: 1 adam gün / hafta - 52 Adam gün / yıl]",
  "Hızlandırılmış Program": "Değer Akış Haritalama (VSM), SMED Hızlı Kalıp Değişim Metotları, Hücresel İmalat Akış Tasarımları, Hat Dengeleme Analizleri öncelikli olarak devreye alınır. Temel saha yönetim çalışmalarına ağırlık verilir. [Ziyaret Frekansı: 2 adam gün / hafta - 104 Adam gün / yıl]",
  "Dönüşüm Liderliği Programı": "Akış çalışmaları ve darboğaz yönetimi ile birlikte sürecin tüm alanlara yaygınlaştırılması sağlanır. Saha yöneticilerinin liderliği ön plana alınır. Kurumsal sahiplenmeyi geliştirerek kazanımların kalıcı bir kültüre dönüşmesini garanti altına alır. [Ziyaret Frekansı: 3 adam gün / hafta - 156 Adam gün / yıl]",
  "Eğitim ve Koçluk Programı": "Gelişmiş operasyonel performansın sürdürülebilirliği, liderlik yetkinlikleri ve sürekli gelişim (Kaizen) kültürü için özel mentorluk, hedeflere göre yönetim ve koçluk programları. [Ziyaret Frekansı: Esnek / Danışan Odaklı - 24 Adam gün / yıl]",
  "Mevcut Değil": "Bu düzeydeki operasyonel olgunluk seviyesi için alternatif bir çalışma planlanmamıştır.",
};

function getProgram(score: number): ProgramConfig {
  return PROGRAMS.find((p) => score >= p.min && score <= p.max) || PROGRAMS[PROGRAMS.length - 1];
}

// ─── FORMATTING HELPERS ──────────────────────────────────────────────────
function parseNum(v: string | undefined): number {
  if (!v) return 0;
  return Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;
}
function fmtTL(v: number): string {
  return `₺${Math.round(v).toLocaleString("tr-TR")}`;
}
function todayDMY(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

const DAILY_RATE_KEY = "crm_gembalens_daily_rate";

export default function GembaLensView({ onNavigateToTab }: GembaLensViewProps) {
  const { t } = useLanguage();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"data" | "scoring" | "results" | "findings" | "chat">("data");

  const [op, setOp] = useState<GembaLensOperationData | null>(null);
  const [observations, setObservations] = useState<GembaLensObservation[]>([]);
  const [assessedIds, setAssessedIds] = useState<Set<string>>(new Set());

  const [dailyRate, setDailyRate] = useState<number>(() => CrmDb.getKv<number>(DAILY_RATE_KEY, 25000));

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [newObs, setNewObs] = useState({ category: "", finding: "", improvement: "", priority: "Orta", impact: "Orta" });

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    setCompanies(CrmDb.getCompanies());
    const all = CrmDb.getKv<{ companyId: string }[]>("crm_gembalens_assessments", []);
    setAssessedIds(new Set(all.map((a) => a.companyId)));
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) {
      setOp(null);
      setObservations([]);
      return;
    }
    setOp(GembaLensDb.getOrCreateOperation(selectedCompanyId));
    setObservations(GembaLensDb.getObservations(selectedCompanyId));
    setActiveSection("data");
    setStatusMsg(null);
  }, [selectedCompanyId]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.industry || "").toLowerCase().includes(q)
    );
  }, [companies, search]);

  const totalScore = useMemo(() => {
    if (!op) return 0;
    return Object.values(op.scores).reduce((sum, v) => sum + (v || 0), 0);
  }, [op]);

  const program = useMemo(() => getProgram(totalScore), [totalScore]);

  // ─── FINANCIAL ENGINE (see file header for source-fidelity notes) ───────
  const calc = useMemo(() => {
    if (!op || !selectedCompany) return null;

    const turnoverNum = parseNum(op.turnoverLira || selectedCompany.annualRevenue);
    const copqRateNum = Number(op.copqRate) || 0;
    const copqLossMin = turnoverNum * (copqRateNum / 100);

    const grossLaborCostNum = parseNum(op.grossLaborCost);
    const setupMachineCountNum = Number(op.setupMachineCount) || 1;
    const setupFrequencyNum = Number(op.setupFrequency) || 0;
    const setupDurationNum = Number(op.setupDuration) || 0;
    const affectedOpsSetupNum = Number(op.affectedOpsSetup) || 0;

    const annualSetupsCount = Math.round(setupFrequencyNum * 52 * setupMachineCountNum);
    const annualSetupHours = Math.round(((setupDurationNum / 60) * annualSetupsCount) * 10) / 10;
    const setupLaborLoss = Math.round(annualSetupHours * affectedOpsSetupNum * (grossLaborCostNum / 180));
    const hourlyTurnoverRate = setupMachineCountNum > 0 ? turnoverNum / setupMachineCountNum / (300 * 24) : 0;
    const setupOpportunityLoss = Math.round(annualSetupHours * hourlyTurnoverRate * 1.35);

    const plannedEffNum = Number(op.plannedEfficiency) || 0;
    const actualEffNum = Number(op.actualEfficiency) || 0;
    const operatorsCountNum = Number(op.operatorsCount) || 0;
    const efficiencyGap = Math.max(0, plannedEffNum - actualEffNum);
    const annualOperatorHoursPaid = operatorsCountNum * 180 * 12;
    const lostLaborHours = Math.round(annualOperatorHoursPaid * (efficiencyGap / 100));
    const inefficiencyLaborLoss = Math.round(lostLaborHours * (grossLaborCostNum / 180));
    const inefficiencyOverheadLoss = Math.round(inefficiencyLaborLoss * 1.65);

    const totalLossExpected =
      Math.round(copqLossMin * 1.25) +
      Math.round(setupLaborLoss + setupOpportunityLoss * 0.6) +
      Math.round(inefficiencyLaborLoss + inefficiencyOverheadLoss * 0.5);

    const opportunityMin = Math.round(totalLossExpected * 0.2);
    const opportunityMax = Math.round(totalLossExpected * 0.3);
    const annualSaving = Math.round((opportunityMin + opportunityMax) / 2);

    // Daily consulting rate: same volume-discount tiers/floor as source app,
    // single-currency (₺).
    const ag = program.op1.ag;
    let rate = dailyRate;
    if (ag >= 105 && ag <= 156) rate = dailyRate * 0.9;
    else if (ag >= 157) rate = dailyRate * 0.85;
    const floor = 30000;
    if (rate < floor) rate = dailyRate <= floor ? dailyRate : floor;
    rate = Math.round(rate / 500) * 500;

    const investmentNeed = rate * ag;
    const paybackMonths = annualSaving > 0 ? Math.round((investmentNeed / (annualSaving / 12)) * 10) / 10 : 0;
    const roiPercent = investmentNeed > 0 ? Math.round(((annualSaving - investmentNeed) / investmentNeed) * 100) : 0;

    return {
      turnoverNum,
      copqLossMin,
      copqLossMax: Math.round(copqLossMin * 1.45),
      setupLaborLoss,
      inefficiencyLaborLoss,
      totalLossExpected,
      opportunityMin,
      opportunityMax,
      annualSaving,
      dailyRateEffective: rate,
      investmentNeed,
      paybackMonths,
      roiPercent,
    };
  }, [op, selectedCompany, program, dailyRate]);

  // ─── ACTIONS ──────────────────────────────────────────────────────────
  const handleScoreChange = (criterionNo: number, value: number) => {
    if (!op) return;
    setOp({ ...op, scores: { ...op.scores, [criterionNo]: value } });
  };

  const handleSaveOperation = () => {
    if (!op || !selectedCompanyId || !calc) return;
    GembaLensDb.saveOperation(op);
    CrmDb.setKv(DAILY_RATE_KEY, dailyRate);
    const assessment = GembaLensDb.saveAssessment(selectedCompanyId, {
      overallScore: totalScore,
      potentialSaving: calc.annualSaving,
      investmentNeed: calc.investmentNeed,
      paybackPeriod: calc.paybackMonths,
    });

    // Sync back onto the real Company card (healthScore 0-100 scaled from
    // the 0-51 maturity score; annualRevenue kept in sync with the field
    // data entered here).
    const allCompanies = CrmDb.getCompanies();
    const updated = allCompanies.map((c) =>
      c.id === selectedCompanyId
        ? {
            ...c,
            healthScore: Math.round((totalScore / 51) * 100),
            annualRevenue: op.turnoverLira || c.annualRevenue,
          }
        : c
    );
    CrmDb.saveCompanies(updated);
    setCompanies(updated);
    setAssessedIds((prev) => new Set(prev).add(selectedCompanyId));
    setStatusMsg(t("Assessment saved. Company health score and revenue have been synced."));
    void assessment;
  };

  const handleAddObservation = () => {
    if (!selectedCompanyId || !newObs.finding.trim()) return;
    const created = GembaLensDb.addObservation(
      selectedCompanyId,
      newObs.category || "Genel",
      newObs.finding,
      newObs.improvement,
      newObs.priority,
      newObs.impact
    );
    setObservations((prev) => [...prev, created]);
    setNewObs({ category: "", finding: "", improvement: "", priority: "Orta", impact: "Orta" });
  };

  const handleDeleteObservation = (id: string) => {
    GembaLensDb.deleteObservation(id);
    setObservations((prev) => prev.filter((o) => o.observationId !== id));
  };

  const handleCreateProposal = () => {
    if (!op || !selectedCompany || !calc || !selectedCompanyId) return;

    // Save first so the Deal reflects the latest numbers.
    handleSaveOperation();

    const firstManager = (selectedCompany.managementTeam || "").split(",")[0]?.split("(")[0]?.trim();
    const contactPerson = firstManager || selectedCompany.name;

    const deals = CrmDb.getDeals();
    const existing = deals.find((d) => d.companyId === selectedCompanyId && d.leadSource === "Gemba Lens Saha Tespiti");

    const description = `Gemba Lens saha tespiti sonucu: "${program.op1.name}" önerildi (${program.op1.ag} adam gün/yıl). Olgunluk puanı: ${totalScore}/51 (${program.levelLabel}). Tahmini yıllık kazanım: ${fmtTL(calc.annualSaving)}, tahmini yıllık yatırım: ${fmtTL(calc.investmentNeed)}.`;

    const deal: Deal = {
      id: existing?.id || `deal-gembalens-${selectedCompanyId}`,
      companyId: selectedCompanyId,
      companyName: selectedCompany.name,
      contactPerson,
      contactEmail: existing?.contactEmail || "",
      contactPhone: existing?.contactPhone || selectedCompany.phone || "",
      opportunityValue: calc.investmentNeed,
      expectedCloseDate: existing?.expectedCloseDate || todayDMY(30),
      opportunityScore: Math.min(100, Math.round((totalScore / 51) * 100) + 10),
      winProbability: existing?.winProbability ?? 40,
      currentStageDuration: existing?.currentStageDuration ?? 1,
      priority: totalScore <= 25 ? "High" : "Medium",
      industry: selectedCompany.industry,
      opexScore: Math.round((totalScore / 51) * 100),
      stage: existing?.stage || "Lead Identified",
      owner: existing?.owner || "GP",
      pipeline: existing?.pipeline || "Sales Pipeline Standard",
      description,
      leadSource: "Gemba Lens Saha Tespiti",
      manDay: String(program.op1.ag),
      leanMaturityLevel: program.levelLabel,
      leanMaturityDesc: DESCS[program.op1.name] || "",
      stageHistory: existing?.stageHistory?.length
        ? existing.stageHistory
        : [{ stage: "Lead Identified", date: todayDMY(), notes: "Gemba Lens saha tespiti ile otomatik oluşturuldu." }],
    };

    CrmDb.saveDeals([...deals.filter((d) => d.id !== deal.id), deal]);

    CrmDb.setKv("crm_wizard_preselected_company", {
      id: selectedCompanyId,
      companyName: selectedCompany.name,
      contactPerson,
      contactEmail: deal.contactEmail || "",
    });

    setStatusMsg(t("Deal created and synced. Redirecting to Proposal Wizard..."));

    setTimeout(() => {
      if (onNavigateToTab) {
        onNavigateToTab("create-proposal");
      } else {
        window.dispatchEvent(new CustomEvent("change-tab", { detail: "create-proposal" }));
      }
    }, 700);
  };

  const handleSendChat = async () => {
    if (!op || !selectedCompanyId || !calc || !chatInput.trim() || chatLoading) return;
    const message = chatInput.trim();
    const history = op.chatMessages;
    const userMsg = { role: "user" as const, content: message };
    const nextHistory = [...history, userMsg];
    setOp({ ...op, chatMessages: nextHistory });
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    const context = [
      `Şirket: ${selectedCompany?.name} (${selectedCompany?.industry || "-"})`,
      `Olgunluk Puanı: ${totalScore}/51 — ${program.levelLabel}`,
      `Önerilen Paket: ${program.op1.name} (${program.op1.ag} adam gün/yıl)`,
      `Yıllık Ciro: ${fmtTL(calc.turnoverNum)}`,
      `Tahmini Kalitesizlik Maliyeti: ${fmtTL(calc.copqLossMin)} - ${fmtTL(calc.copqLossMax)}`,
      `İyileştirme Fırsat Havuzu: ${fmtTL(calc.opportunityMin)} - ${fmtTL(calc.opportunityMax)}`,
      `Tahmini Yıllık Net Kazanım: ${fmtTL(calc.annualSaving)}`,
      `Tahmini Yıllık Yatırım: ${fmtTL(calc.investmentNeed)}`,
      `Geri Ödeme Süresi: ${calc.paybackMonths} ay, ROI: %${calc.roiPercent}`,
    ].join("\n");

    try {
      const res = await fetch("/api/gemini/gemba-lens-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, context }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Saha AI Danışmanı şu anda yanıt veremiyor.");
      }
      const assistantMsg = { role: "assistant" as const, content: data.reply };
      const finalHistory = [...nextHistory, assistantMsg];
      setOp((prev) => (prev ? { ...prev, chatMessages: finalHistory } : prev));
      GembaLensDb.saveOperation({ ...op, chatMessages: finalHistory });
    } catch (err: any) {
      setChatError(err.message || "Saha AI Danışmanı şu anda yanıt veremiyor.");
    } finally {
      setChatLoading(false);
    }
  };

  // ─── RENDER: COMPANY LIST ────────────────────────────────────────────
  if (!selectedCompanyId) {
    return (
      <div className="space-y-5">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Gemba Lens</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400">{t("Field Assessment & Opportunity Scoring")}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4">
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search companies...")}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {filteredCompanies.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              {t("No companies found. Add companies first from Customers.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCompanies.map((c) => {
                const assessed = assessedIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCompanyId(c.id)}
                    className="text-left p-4 rounded-lg border border-slate-200 dark:border-zinc-700 hover:border-emerald-400 hover:shadow-sm transition-all bg-white dark:bg-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="font-semibold text-sm text-slate-900 dark:text-zinc-100 truncate">{c.name}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400 mb-2 truncate">{c.industry}</div>
                    {assessed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> {t("Assessed")}
                        {typeof c.healthScore === "number" ? ` · ${c.healthScore}/100` : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full">
                        {t("Not assessed yet")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: ASSESSMENT WORKSPACE ────────────────────────────────────
  if (!op || !calc || !selectedCompany) return null;

  const TABS: { id: typeof activeSection; label: string; icon: React.ReactNode }[] = [
    { id: "data", label: t("Field Data"), icon: <Layers className="w-4 h-4" /> },
    { id: "scoring", label: t("Maturity Scoring"), icon: <Gauge className="w-4 h-4" /> },
    { id: "results", label: t("Results & Proposal"), icon: <TrendingUp className="w-4 h-4" /> },
    { id: "findings", label: t("Field Findings"), icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: "chat", label: t("AI Field Advisor"), icon: <Bot className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSelectedCompanyId(null)}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-zinc-800 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 truncate">{selectedCompany.name}</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400">Gemba Lens · {t("Field Assessment & Opportunity Scoring")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-slate-400">{t("Overall Maturity Score")}</div>
              <div className="text-xl font-extrabold text-emerald-600">
                {totalScore}<span className="text-sm text-slate-400 font-medium"> / 51</span>
              </div>
            </div>
          </div>
        </div>
        {statusMsg && (
          <div className="mt-3 text-sm bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {statusMsg}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-1.5 flex gap-1 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeSection === tab.id
                ? "bg-emerald-600 text-white"
                : "text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* FIELD DATA */}
      {activeSection === "data" && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label={t("Annual Revenue (₺)")} value={op.turnoverLira} onChange={(v) => setOp({ ...op, turnoverLira: v })} placeholder={selectedCompany.annualRevenue || "0"} />
            <Field label={t("Cost of Poor Quality Rate (%)")} value={op.copqRate} onChange={(v) => setOp({ ...op, copqRate: v })} />
            <Field label={t("Scrap Rate (%)")} value={op.scrapRate} onChange={(v) => setOp({ ...op, scrapRate: v })} />
            <Field label={t("Rework Rate (%)")} value={op.reworkRate} onChange={(v) => setOp({ ...op, reworkRate: v })} />
            <Field label={t("Overtime Rate (%)")} value={op.overtimeRate} onChange={(v) => setOp({ ...op, overtimeRate: v })} />
            <Field label={t("Planned Efficiency (%)")} value={op.plannedEfficiency} onChange={(v) => setOp({ ...op, plannedEfficiency: v })} />
            <Field label={t("Actual Efficiency (%)")} value={op.actualEfficiency} onChange={(v) => setOp({ ...op, actualEfficiency: v })} />
            <Field label={t("Total Operator Count")} value={op.operatorsCount} onChange={(v) => setOp({ ...op, operatorsCount: v })} />
            <Field label={t("Monthly Gross Labor Cost (₺)")} value={op.grossLaborCost} onChange={(v) => setOp({ ...op, grossLaborCost: v })} />
            <Field label={t("Machine/Setup Count")} value={op.setupMachineCount} onChange={(v) => setOp({ ...op, setupMachineCount: v })} />
            <Field label={t("Setup Frequency (per week)")} value={op.setupFrequency} onChange={(v) => setOp({ ...op, setupFrequency: v })} />
            <Field label={t("Setup Duration (minutes)")} value={op.setupDuration} onChange={(v) => setOp({ ...op, setupDuration: v })} />
            <Field label={t("Operators Affected by Setup")} value={op.affectedOpsSetup} onChange={(v) => setOp({ ...op, affectedOpsSetup: v })} />
            <Field label={t("Daily Consulting Rate (₺)")} value={String(dailyRate)} onChange={(v) => setDailyRate(Number(v.replace(/\D/g, "")) || 0)} />
          </div>
          <button
            onClick={handleSaveOperation}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
          >
            <Save className="w-4 h-4" /> {t("Save Field Data")}
          </button>
        </div>
      )}

      {/* SCORING */}
      {activeSection === "scoring" && (
        <div className="space-y-4">
          {CRITERIA.map((group) => (
            <div key={group.group} className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{group.icon}</span>
                <h3 className="font-bold text-slate-900 dark:text-zinc-100">{group.group}</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">{group.desc}</p>
              <div className="space-y-4">
                {group.items.map((item) => (
                  <div key={item.no} className="border-t border-slate-100 dark:border-zinc-800 pt-3 first:border-t-0 first:pt-0">
                    <div className="font-semibold text-sm text-slate-800 dark:text-zinc-200 mb-1">{item.cat}</div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mb-2">{item.text}</p>
                    <div className="flex gap-2 flex-wrap">
                      {SCORE_LABELS.map((label, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleScoreChange(item.no, idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            (op.scores[item.no] || 0) === idx
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-emerald-300"
                          }`}
                        >
                          {idx} · {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={handleSaveOperation}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
          >
            <Save className="w-4 h-4" /> {t("Save Assessment")}
          </button>
        </div>
      )}

      {/* RESULTS & PROPOSAL */}
      {activeSection === "results" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-zinc-100">{t("Recommended Package")}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">{program.levelLabel} · {totalScore}/51</div>
                <div className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-1">{program.op1.name}</div>
                <div className="text-sm text-slate-600 dark:text-zinc-300 mb-2">{program.op1.ag} {t("Man-days / Year")}</div>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{DESCS[program.op1.name]}</p>
              </div>
              {program.op2.name !== "Mevcut Değil" && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700">
                  <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">{t("Alternative Package")}</div>
                  <div className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-1">{program.op2.name}</div>
                  <div className="text-sm text-slate-600 dark:text-zinc-300 mb-2">{program.op2.ag} {t("Man-days / Year")}</div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">{DESCS[program.op2.name]}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={<Coins className="w-4 h-4" />} label={t("Estimated Cost of Poor Quality")} value={`${fmtTL(calc.copqLossMin)} - ${fmtTL(calc.copqLossMax)}`} />
            <StatCard icon={<TrendingUp className="w-4 h-4" />} label={t("Improvement Opportunity Pool")} value={`${fmtTL(calc.opportunityMin)} - ${fmtTL(calc.opportunityMax)}`} />
            <StatCard icon={<Sparkles className="w-4 h-4" />} label={t("Estimated Annual Net Gain")} value={fmtTL(calc.annualSaving)} highlight />
            <StatCard icon={<Coins className="w-4 h-4" />} label={t("Estimated Annual Investment")} value={fmtTL(calc.investmentNeed)} />
            <StatCard icon={<TrendingUp className="w-4 h-4" />} label={t("Return on Investment")} value={`%${calc.roiPercent}`} />
            <StatCard icon={<Gauge className="w-4 h-4" />} label={t("Payback Period")} value={`${calc.paybackMonths} ${t("months")}`} />
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-zinc-100">{t("Create Proposal from This Package")}</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">{t("This will create a linked Deal and take you to the Proposal Wizard.")}</p>
            <button
              onClick={handleCreateProposal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
            >
              <FileText className="w-4 h-4" /> {t("Create Proposal from This Package")}
            </button>
          </div>
        </div>
      )}

      {/* FIELD FINDINGS */}
      {activeSection === "findings" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 mb-4">{t("Add Finding")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                value={newObs.category}
                onChange={(e) => setNewObs({ ...newObs, category: e.target.value })}
                placeholder={t("Category")}
                className="px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-zinc-100"
              />
              <div className="flex gap-2">
                <select
                  value={newObs.priority}
                  onChange={(e) => setNewObs({ ...newObs, priority: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="Düşük">{t("Low")}</option>
                  <option value="Orta">{t("Medium")}</option>
                  <option value="Yüksek">{t("High")}</option>
                </select>
                <select
                  value={newObs.impact}
                  onChange={(e) => setNewObs({ ...newObs, impact: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="Düşük">{t("Low")}</option>
                  <option value="Orta">{t("Medium")}</option>
                  <option value="Yüksek">{t("High")}</option>
                </select>
              </div>
            </div>
            <textarea
              value={newObs.finding}
              onChange={(e) => setNewObs({ ...newObs, finding: e.target.value })}
              placeholder={t("Finding")}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-zinc-100 mb-3"
            />
            <textarea
              value={newObs.improvement}
              onChange={(e) => setNewObs({ ...newObs, improvement: e.target.value })}
              placeholder={t("Suggested Improvement")}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-zinc-100 mb-3"
            />
            <button
              onClick={handleAddObservation}
              disabled={!newObs.finding.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" /> {t("Add Finding")}
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5">
            {observations.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">{t("No findings recorded yet.")}</div>
            ) : (
              <div className="space-y-3">
                {observations.map((o) => (
                  <div key={o.observationId} className="p-3 rounded-lg border border-slate-100 dark:border-zinc-800 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full">{o.category}</span>
                        <span className="text-xs text-slate-400">{t("Priority")}: {t(o.priority === "Yüksek" ? "High" : o.priority === "Düşük" ? "Low" : "Medium")}</span>
                      </div>
                      <div className="text-sm text-slate-800 dark:text-zinc-200">{o.finding}</div>
                      {o.improvement && <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">→ {o.improvement}</div>}
                    </div>
                    <button
                      onClick={() => handleDeleteObservation(o.observationId)}
                      className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI FIELD ADVISOR */}
      {activeSection === "chat" && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 flex flex-col" style={{ minHeight: 480 }}>
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 dark:text-zinc-100">{t("AI Field Advisor")}</h3>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto mb-4 pr-1" style={{ maxHeight: 420 }}>
            {op.chatMessages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-zinc-800 text-slate-400 rounded-bl-sm">…</div>
              </div>
            )}
          </div>
          {chatError && <div className="text-xs text-red-600 mb-2">{chatError}</div>}
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder={t("Ask about this assessment...")}
              className="flex-1 px-3 py-2.5 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || chatLoading}
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-zinc-100"
      />
    </label>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        highlight
          ? "bg-emerald-600 border-emerald-600 text-white"
          : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100"
      }`}
    >
      <div className={`flex items-center gap-2 text-xs font-medium mb-2 ${highlight ? "text-emerald-100" : "text-slate-500 dark:text-zinc-400"}`}>
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
