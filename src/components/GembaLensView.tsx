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

// ─── SEKTÖREL ÜRÜN MALİYET MODELLEMESİ (verbatim from source app) ──────────
// Girilen sektör/ürün grubu serbest metnine göre (anahtar kelime eşleşmesi),
// tesisin tipik maliyet yapısını (malzeme/işçilik/enerji/bakım/genel gider)
// ciro yüzdesi olarak tahmin eder. Kullanıcı bu oranları elle de düzenleyebilir.
interface SectorCostStructure {
  title: string;
  malzeme: number;
  iscilik: number;
  enerji: number;
  bakim: number;
  genel: number;
}

function getSectorCostStructure(sectorStr: string, productStr: string): SectorCostStructure {
  const sec = (sectorStr || "").toLowerCase();
  const prod = (productStr || "").toLowerCase();

  if (sec.includes("oto") || sec.includes("tasit") || sec.includes("parca") || prod.includes("oto") || prod.includes("yedek")) {
    return { title: "Otomotiv Yan Sanayi & Yedek Parça", malzeme: 55, iscilik: 15, enerji: 8, bakim: 7, genel: 15 };
  } else if (sec.includes("gida") || sec.includes("icecek") || sec.includes("unlu") || prod.includes("gida") || prod.includes("ambalaj")) {
    return { title: "Gıda, İçecek & Ambalaj", malzeme: 60, iscilik: 12, enerji: 10, bakim: 6, genel: 12 };
  } else if (sec.includes("mobilya") || sec.includes("ahsap") || prod.includes("mobilya") || prod.includes("kabin") || prod.includes("panel")) {
    return { title: "Mobilya & Ahşap İşleme", malzeme: 50, iscilik: 20, enerji: 6, bakim: 5, genel: 19 };
  } else if (sec.includes("plastik") || sec.includes("enjeksiyon") || prod.includes("plastik") || prod.includes("kalip")) {
    return { title: "Plastik Enjeksiyon ve Kalıplama", malzeme: 45, iscilik: 15, enerji: 20, bakim: 8, genel: 12 };
  } else if (sec.includes("tekstil") || sec.includes("konfeksiyon") || prod.includes("kumas") || prod.includes("dikim")) {
    return { title: "Tekstil & Hazır Giyim Sanayi", malzeme: 40, iscilik: 30, enerji: 10, bakim: 4, genel: 16 };
  } else if (sec.includes("maden") || sec.includes("mermer") || sec.includes("tas") || sec.includes("kaya") || prod.includes("maden") || prod.includes("mermer") || prod.includes("blok")) {
    return { title: "Madencilik, Mermer & Taş Ocakçılığı", malzeme: 20, iscilik: 18, enerji: 32, bakim: 18, genel: 12 };
  } else if (sec.includes("cimento") || sec.includes("cam") || sec.includes("seramik") || sec.includes("tugla") || prod.includes("cimento") || prod.includes("cam") || prod.includes("seramik")) {
    return { title: "Çimento, Cam & Seramik Sanayi", malzeme: 30, iscilik: 15, enerji: 35, bakim: 12, genel: 8 };
  } else if (sec.includes("kimya") || sec.includes("boya") || sec.includes("petrol") || sec.includes("ilac") || prod.includes("kimya") || prod.includes("boya")) {
    return { title: "Kimya, Boya & Petrol Ürünleri", malzeme: 65, iscilik: 10, enerji: 12, bakim: 5, genel: 8 };
  }
  return { title: "Metal, Makine ve Genel Endüstriyel İmalat", malzeme: 50, iscilik: 18, enerji: 10, bakim: 7, genel: 15 };
}

// ─── KAYIP KATEGORİLERİ VE ÖNERİLEN YALIN ARAÇLAR (verbatim from RoiAnalyzer.tsx) ───
// totalCopqPool, saha girdilerine göre 6 ana kayıp kovasına dağıtılır; her kovanın
// hizmet çalışmasıyla ne kadar (sabit oran) azaltılabileceği ve hangi yalın aracın
// bunu sağladığı burada tanımlıdır — "kayıpları maliyet modeline göre dizip, hizmet
// çalışmasının bunları ne kadar azaltacağını hesaplama" kısmı budur.
interface LossBucketDef {
  key: "durus" | "kalite" | "mesai" | "hurda" | "iscilik" | "kapasite";
  label: string;
  reductionRatio: number; // hedef/mevcut (ör. 0.75 = %25 azaltım)
  tool: string;
  desc: string;
}
const LOSS_BUCKETS: LossBucketDef[] = [
  { key: "durus", label: "Duruşlar", reductionRatio: 0.75, tool: "SMED & TPM", desc: "Sürekli İyileştirme ile Arıza & Model Değişimi" },
  { key: "kalite", label: "Kalite", reductionRatio: 0.75, tool: "Poka-Yoke & Kalite Kaizen", desc: "Tamir ve Hatalı Parça Üretim Yükü" },
  { key: "mesai", label: "Fazla Mesai", reductionRatio: 0.65, tool: "Hat Dengeleme & Standart İş", desc: "Dengesiz Vardiya & Yoğun Mesai Yükü" },
  { key: "hurda", label: "Hurda", reductionRatio: 0.80, tool: "Süreç Kontrol & Standardizasyon", desc: "Hatalı Malzeme ve Toz/Sıvı Fireleri" },
  { key: "iscilik", label: "İşçilik", reductionRatio: 0.75, tool: "5S & Standart İş", desc: "Mavi Yaka Verimsizlik ve Hazırlık Kaybı" },
  { key: "kapasite", label: "Kapasite", reductionRatio: 0.70, tool: "OEE Takip & Darboğaz Çözümü", desc: "Ekipman Doyum & Kullanım Kaybı" },
];

// 12 fırsat kategorisi, 3 gruba ayrılır; her biri bir kayıp kovasından (base) pay
// alır ve olgunluk puanına göre daralan/genişleyen bir min%-max% aralığı uygular.
interface OpportunityCategoryDef {
  key: string;
  label: string;
  base: LossBucketDef["key"];
  defaultMin: number;
  defaultMax: number;
}
const OPPORTUNITY_GROUPS: { group: string; items: OpportunityCategoryDef[] }[] = [
  {
    group: "Doğrudan Maliyet Azaltma",
    items: [
      { key: "sc", label: "Hurda Maliyeti", base: "kalite", defaultMin: 15, defaultMax: 50 },
      { key: "fm", label: "Fire & Malzeme Kayıpları", base: "hurda", defaultMin: 12, defaultMax: 45 },
      { key: "mes", label: "Fazla Mesai Azaltımı", base: "mesai", defaultMin: 15, defaultMax: 50 },
      { key: "yi", label: "Yeniden İşleme (Rework)", base: "kalite", defaultMin: 10, defaultMax: 40 },
      { key: "ov", label: "Operasyonel Verimsizlik", base: "iscilik", defaultMin: 10, defaultMax: 45 },
    ],
  },
  {
    group: "Kapasite Yaratma",
    items: [
      { key: "setup", label: "Setup Süreleri (SMED)", base: "durus", defaultMin: 15, defaultMax: 55 },
      { key: "pd", label: "Plansız Duruşların Önlenmesi", base: "kapasite", defaultMin: 10, defaultMax: 45 },
      { key: "oee", label: "OEE İyileştirmesi", base: "kapasite", defaultMin: 15, defaultMax: 55 },
      { key: "opv", label: "Operatör Verimliliği", base: "iscilik", defaultMin: 12, defaultMax: 50 },
    ],
  },
  {
    group: "Stratejik Operasyonel Kazanç",
    items: [
      { key: "lt", label: "Lead Time (Sipariş Çevrimi)", base: "kapasite", defaultMin: 10, defaultMax: 40 },
      { key: "wip", label: "WIP (Yarı Mamul) Azaltımı", base: "kapasite", defaultMin: 10, defaultMax: 40 },
      { key: "sp", label: "Sevkiyat Performansı", base: "kapasite", defaultMin: 10, defaultMax: 30 },
    ],
  },
];

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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"data" | "cost" | "scoring" | "results" | "findings" | "chat">("data");

  const [op, setOp] = useState<GembaLensOperationData | null>(null);
  const [observations, setObservations] = useState<GembaLensObservation[]>([]);
  const [assessedIds, setAssessedIds] = useState<Set<string>>(new Set());

  const [dailyRate, setDailyRate] = useState<number>(() => CrmDb.getKv<number>(DAILY_RATE_KEY, 25000));

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [newObs, setNewObs] = useState({ category: "", finding: "", improvement: "", priority: "Orta", impact: "Orta" });

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Tracks whether the user has manually edited the sector cost-structure
  // ratios this session, so the sector auto-fill effect below stops
  // overwriting their edits. Reset whenever a different company is loaded.
  const [costPropTouched, setCostPropTouched] = useState(false);

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
    setCostPropTouched(false);
  }, [selectedCompanyId]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const totalScore = useMemo(() => {
    if (!op) return 0;
    return Object.values(op.scores).reduce((sum, v) => sum + (v || 0), 0);
  }, [op]);

  const program = useMemo(() => getProgram(totalScore), [totalScore]);

  const sectorCostStructure = useMemo(
    () => (op ? getSectorCostStructure(op.sektor, op.urunGrubu) : getSectorCostStructure("", "")),
    [op?.sektor, op?.urunGrubu]
  );

  // Auto-fill cost proportions from the sector benchmark whenever sector/product
  // changes (matches source app's useEffect — 0.9 scaling on the 5 cost buckets
  // leaves room for a fixed 10% profit margin, i.e. malzeme+iscilik+enerji+
  // bakim+genel+kar = 100%). Only overwrites while the user hasn't already
  // customized the figures this session (tracked via costPropTouched).
  useEffect(() => {
    if (!op || costPropTouched) return;
    const structure = sectorCostStructure;
    const scaled = (v: number) => (Math.round(v * 0.9 * 10) / 10).toString();
    setOp((prev) =>
      prev
        ? {
            ...prev,
            costPropMaterial: scaled(structure.malzeme),
            costPropLabor: scaled(structure.iscilik),
            costPropEnergy: scaled(structure.enerji),
            costPropMaintenance: scaled(structure.bakim),
            costPropOverhead: scaled(structure.genel),
            costPropProfit: "10",
          }
        : prev
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorCostStructure]);

  const handleResetCostStructure = () => {
    if (!op) return;
    const structure = sectorCostStructure;
    const scaled = (v: number) => (Math.round(v * 0.9 * 10) / 10).toString();
    setOp({
      ...op,
      costPropMaterial: scaled(structure.malzeme),
      costPropLabor: scaled(structure.iscilik),
      costPropEnergy: scaled(structure.enerji),
      costPropMaintenance: scaled(structure.bakim),
      costPropOverhead: scaled(structure.genel),
      costPropProfit: "10",
    });
    setCostPropTouched(false);
  };

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

    // ─── Sektörel ürün maliyet yapısı (₺) ────────────────────────────────
    const scrapRateNum = Number(op.scrapRate) || 0;
    const reworkRateNum = Number(op.reworkRate) || 0;
    const overtimeRateNum = Number(op.overtimeRate) || 0;
    const oeeNum = Number(op.oee) || 0;

    const materialCostTL = turnoverNum * ((Number(op.costPropMaterial) || 0) / 100);
    const laborCostTL = turnoverNum * ((Number(op.costPropLabor) || 0) / 100);
    const energyCostTL = turnoverNum * ((Number(op.costPropEnergy) || 0) / 100);
    const maintenanceCostTL = turnoverNum * ((Number(op.costPropMaintenance) || 0) / 100);
    const overheadCostTL = turnoverNum * ((Number(op.costPropOverhead) || 0) / 100);
    const operatingProfitTL = turnoverNum * ((Number(op.costPropProfit) || 0) / 100);
    const costStructureSumPct =
      Math.round(
        ((Number(op.costPropMaterial) || 0) +
          (Number(op.costPropLabor) || 0) +
          (Number(op.costPropEnergy) || 0) +
          (Number(op.costPropMaintenance) || 0) +
          (Number(op.costPropOverhead) || 0) +
          (Number(op.costPropProfit) || 0)) *
          10
      ) / 10;

    // ─── Kayıpları maliyet modeline göre 6 kovaya dağıtma (verbatim) ──────
    const totalCopqPool = totalLossExpected;
    const w1 = Math.max(15, 35 - (oeeNum > 0 ? oeeNum * 0.3 : 20)); // Duruşlar
    const w2 = Math.max(10, Math.min(30, reworkRateNum * 2.5)); // Kalite
    const w3 = Math.max(5, Math.min(30, overtimeRateNum * 1.5)); // Fazla Mesai
    const w4 = Math.max(10, Math.min(25, scrapRateNum * 3.5)); // Hurda
    const w5 = Math.max(10, Math.min(25, (plannedEffNum - actualEffNum) * 1.2)); // İşçilik
    const w6 = Math.max(15, 40 - (oeeNum > 0 ? oeeNum * 0.35 : 20)); // Kapasite
    const sumW = w1 + w2 + w3 + w4 + w5 + w6;

    const lossDurus = Math.round(totalCopqPool * (w1 / sumW));
    const lossKalite = Math.round(totalCopqPool * (w2 / sumW));
    const lossMesai = Math.round(totalCopqPool * (w3 / sumW));
    const lossHurda = Math.round(totalCopqPool * (w4 / sumW));
    const lossIscilik = Math.round(totalCopqPool * (w5 / sumW));
    const lossKapasite = totalCopqPool - (lossDurus + lossKalite + lossMesai + lossHurda + lossIscilik);

    const lossByBucket: Record<LossBucketDef["key"], number> = {
      durus: lossDurus,
      kalite: lossKalite,
      mesai: lossMesai,
      hurda: lossHurda,
      iscilik: lossIscilik,
      kapasite: lossKapasite,
    };

    // Hizmet çalışmasının her kovayı ne kadar azaltacağı (sabit oranlar + isimli yalın araç)
    const lossReductionTable = LOSS_BUCKETS.map((bucket) => {
      const current = lossByBucket[bucket.key];
      const target = Math.round(current * bucket.reductionRatio);
      return {
        ...bucket,
        current,
        target,
        saving: current - target,
        reductionPercent: Math.round((1 - bucket.reductionRatio) * 100),
      };
    });

    // Olgunluk puanına göre daralan/genişleyen fırsat aralığı
    const scorePct = Math.round((totalScore / 51) * 100);
    const getAdjustedRatios = (defaultMin: number, defaultMax: number) => {
      let minVal = defaultMin;
      let maxVal = defaultMax;
      if (scorePct <= 20) {
        minVal = defaultMin + 10;
        maxVal = defaultMax - 10;
        if (maxVal < minVal + 15) maxVal = minVal + 15;
      } else if (scorePct <= 30) {
        minVal = defaultMin + 5;
        maxVal = defaultMax - 15;
        if (maxVal < minVal + 15) maxVal = minVal + 15;
      } else {
        minVal = defaultMin;
        maxVal = defaultMin + 10;
      }
      const spread = maxVal - minVal;
      if (spread < 10) maxVal = minVal + 10;
      if (spread > 50) maxVal = minVal + 50;
      return { minPct: minVal, maxPct: maxVal };
    };

    // 12 fırsat kategorisi: ham (raw) min/max hesapla, sonra toplamı Option-4
    // hedefine (totalCopqPool'un %20-30'u) tam oturacak şekilde ölçekle.
    const rawCategories = OPPORTUNITY_GROUPS.flatMap((g) =>
      g.items.map((item) => {
        const ratio = getAdjustedRatios(item.defaultMin, item.defaultMax);
        const base = lossByBucket[item.base];
        return {
          ...item,
          group: g.group,
          ratio,
          rawMin: base * (ratio.minPct / 100),
          rawMax: base * (ratio.maxPct / 100),
        };
      })
    );

    const rawTotalMin = rawCategories.reduce((s, c) => s + c.rawMin, 0);
    const rawTotalMax = rawCategories.reduce((s, c) => s + c.rawMax, 0);
    const opportunityMin = Math.round(totalCopqPool * 0.2);
    const opportunityMax = Math.round(totalCopqPool * 0.3);
    const scaleMin = rawTotalMin > 0 ? opportunityMin / rawTotalMin : 0.2;
    const scaleMax = rawTotalMax > 0 ? opportunityMax / rawTotalMax : 0.3;

    const opportunityCategories = rawCategories.map((c) => ({
      key: c.key,
      label: c.label,
      group: c.group,
      minPct: c.ratio.minPct,
      maxPct: c.ratio.maxPct,
      min: Math.round(c.rawMin * scaleMin),
      max: Math.round(c.rawMax * scaleMax),
    }));

    const opportunityByGroup = OPPORTUNITY_GROUPS.map((g) => {
      const items = opportunityCategories.filter((c) => c.group === g.group);
      return {
        group: g.group,
        items,
        min: items.reduce((s, i) => s + i.min, 0),
        max: items.reduce((s, i) => s + i.max, 0),
      };
    });

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
      materialCostTL,
      laborCostTL,
      energyCostTL,
      maintenanceCostTL,
      overheadCostTL,
      operatingProfitTL,
      costStructureSumPct,
      lossReductionTable,
      opportunityByGroup,
    };
  }, [op, selectedCompany, program, dailyRate, totalScore]);

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

    const topLossLines = calc.lossReductionTable
      .slice()
      .sort((a, b) => b.saving - a.saving)
      .slice(0, 3)
      .map((r) => `${r.label} (${r.tool}): ${fmtTL(r.saving)}/yıl`)
      .join("; ");
    const description = `Gemba Lens saha tespiti sonucu: "${program.op1.name}" önerildi (${program.op1.ag} adam gün/yıl). Olgunluk puanı: ${totalScore}/51 (${program.levelLabel}). Sektör: ${sectorCostStructure.title}. Tahmini yıllık kazanım: ${fmtTL(calc.annualSaving)}, tahmini yıllık yatırım: ${fmtTL(calc.investmentNeed)}. En büyük kayıp azaltım fırsatları: ${topLossLines}.`;

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
      `Sektör Benchmarkı: ${sectorCostStructure.title}`,
      `Maliyet Yapısı: Malzeme %${op.costPropMaterial}, İşçilik %${op.costPropLabor}, Enerji %${op.costPropEnergy}, Bakım %${op.costPropMaintenance}, Genel Gider %${op.costPropOverhead}, Kar %${op.costPropProfit}`,
      `Olgunluk Puanı: ${totalScore}/51 — ${program.levelLabel}`,
      `Önerilen Paket: ${program.op1.name} (${program.op1.ag} adam gün/yıl)`,
      `Yıllık Ciro: ${fmtTL(calc.turnoverNum)}`,
      `Tahmini Kalitesizlik Maliyeti: ${fmtTL(calc.copqLossMin)} - ${fmtTL(calc.copqLossMax)}`,
      `Kayıp Dağılımı (mevcut → hedef, yalın araç): ${calc.lossReductionTable.map((r) => `${r.label} ${fmtTL(r.current)}→${fmtTL(r.target)} (${r.tool})`).join("; ")}`,
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

  // ─── RENDER: COMPANY SELECTOR (dropdown, not a card grid) ────────────
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

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 max-w-xl">
          <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2">{t("Select a company")}</label>
          <div className="relative">
            <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value=""
              onChange={(e) => e.target.value && setSelectedCompanyId(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-zinc-100 appearance-none"
            >
              <option value="" disabled>
                {companies.length === 0 ? t("No companies found. Add companies first from Customers.") : t("Search companies...")}
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {assessedIds.has(c.id)
                    ? ` — ${t("Assessed")}${typeof c.healthScore === "number" ? ` (${c.healthScore}/100)` : ""}`
                    : ` — ${t("Not assessed yet")}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: ASSESSMENT WORKSPACE ────────────────────────────────────
  if (!op || !calc || !selectedCompany) return null;

  const TABS: { id: typeof activeSection; label: string; icon: React.ReactNode }[] = [
    { id: "data", label: t("Field Data"), icon: <Layers className="w-4 h-4" /> },
    { id: "cost", label: t("Cost Structure"), icon: <Coins className="w-4 h-4" /> },
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
            <Field label={t("OEE (%)")} value={op.oee} onChange={(v) => setOp({ ...op, oee: v })} />
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

      {/* SECTOR-BASED PRODUCT COST STRUCTURE */}
      {activeSection === "cost" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-zinc-100">{t("Sector-Based Product Cost Structure")}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Field label={t("Sector")} value={op.sektor} onChange={(v) => { setOp({ ...op, sektor: v }); setCostPropTouched(false); }} placeholder={t("e.g. Automotive, Food, Textile...")} />
              <Field label={t("Product Group")} value={op.urunGrubu} onChange={(v) => { setOp({ ...op, urunGrubu: v }); setCostPropTouched(false); }} placeholder={t("e.g. auto parts, packaging...")} />
            </div>
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                {t("Matched sector benchmark")}: <strong className="text-slate-800 dark:text-zinc-200">{sectorCostStructure.title}</strong>
              </p>
              <button
                onClick={handleResetCostStructure}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 px-3 py-1.5 rounded-lg"
              >
                {t("Reset to Sector Defaults")}
              </button>
            </div>
            {calc.costStructureSumPct !== 100 && (
              <div className="mb-3 text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-2">
                {t("Cost ratios currently sum to")} <strong>%{calc.costStructureSumPct}</strong> — {t("aim for %100 for full budget accuracy.")}
              </div>
            )}
            <div className="overflow-hidden border border-slate-200 dark:border-zinc-800 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                    <th className="p-2.5 font-semibold text-slate-600 dark:text-zinc-300">{t("Cost Item")}</th>
                    <th className="p-2.5 font-semibold text-slate-600 dark:text-zinc-300 text-center">{t("Ratio (%)")}</th>
                    <th className="p-2.5 font-semibold text-slate-600 dark:text-zinc-300 text-right">{t("Amount (₺)")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {[
                    { label: t("Direct Material"), key: "costPropMaterial" as const, amount: calc.materialCostTL },
                    { label: t("Direct Labor"), key: "costPropLabor" as const, amount: calc.laborCostTL },
                    { label: t("Energy"), key: "costPropEnergy" as const, amount: calc.energyCostTL },
                    { label: t("Maintenance"), key: "costPropMaintenance" as const, amount: calc.maintenanceCostTL },
                    { label: t("Overhead"), key: "costPropOverhead" as const, amount: calc.overheadCostTL },
                  ].map((row) => (
                    <tr key={row.key}>
                      <td className="p-2.5 font-medium text-slate-800 dark:text-zinc-200">{row.label}</td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={op[row.key]}
                          onChange={(e) => { setOp({ ...op, [row.key]: e.target.value }); setCostPropTouched(true); }}
                          className="w-20 text-center border border-slate-200 dark:border-zinc-700 rounded-md py-1 bg-white dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </td>
                      <td className="p-2.5 text-right font-semibold text-slate-700 dark:text-zinc-300">{fmtTL(row.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50/50 dark:bg-emerald-950/30">
                    <td className="p-2.5 font-semibold text-emerald-800 dark:text-emerald-400">{t("Operating Profit (Est.)")}</td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        step="0.1"
                        value={op.costPropProfit}
                        onChange={(e) => { setOp({ ...op, costPropProfit: e.target.value }); setCostPropTouched(true); }}
                        className="w-20 text-center border border-slate-200 dark:border-zinc-700 rounded-md py-1 bg-white dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">{fmtTL(calc.operatingProfitTL)}</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-zinc-800 font-bold">
                    <td className="p-2.5 text-slate-900 dark:text-zinc-100">{t("Total (Revenue)")}</td>
                    <td className="p-2.5 text-center text-slate-900 dark:text-zinc-100">%{calc.costStructureSumPct}</td>
                    <td className="p-2.5 text-right text-slate-900 dark:text-zinc-100">{fmtTL(calc.turnoverNum)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
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
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-zinc-100">{t("Loss Reduction by Category")}</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
              {t("Total quality-loss pool distributed across 6 categories based on your field inputs, with the expected reduction and lean tool for each.")}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[560px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                    <th className="p-2.5 font-semibold text-slate-600 dark:text-zinc-300">{t("Category")}</th>
                    <th className="p-2.5 font-semibold text-slate-600 dark:text-zinc-300 text-right">{t("Current Annual Cost")}</th>
                    <th className="p-2.5 font-semibold text-slate-600 dark:text-zinc-300 text-right">{t("Target After Service")}</th>
                    <th className="p-2.5 font-semibold text-slate-600 dark:text-zinc-300 text-center">{t("Reduction")}</th>
                    <th className="p-2.5 font-semibold text-slate-600 dark:text-zinc-300">{t("Lean Tool")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {calc.lossReductionTable.map((row) => (
                    <tr key={row.key}>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-800 dark:text-zinc-200">{row.label}</div>
                        <div className="text-xs text-slate-400">{row.desc}</div>
                      </td>
                      <td className="p-2.5 text-right font-medium text-slate-700 dark:text-zinc-300">{fmtTL(row.current)}</td>
                      <td className="p-2.5 text-right font-medium text-emerald-700 dark:text-emerald-400">{fmtTL(row.target)}</td>
                      <td className="p-2.5 text-center">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          -%{row.reductionPercent}
                        </span>
                      </td>
                      <td className="p-2.5 text-xs text-slate-500 dark:text-zinc-400">{row.tool}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-zinc-800 font-bold">
                    <td className="p-2.5 text-slate-900 dark:text-zinc-100">{t("Total")}</td>
                    <td className="p-2.5 text-right text-slate-900 dark:text-zinc-100">{fmtTL(calc.totalLossExpected)}</td>
                    <td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400">
                      {fmtTL(calc.lossReductionTable.reduce((s, r) => s + r.target, 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-zinc-100">{t("Improvement Opportunity Pool by Category")}</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
              {t("The same total opportunity pool, broken down into 12 named categories across 3 improvement groups.")}
            </p>
            <div className="space-y-4">
              {calc.opportunityByGroup.map((group) => (
                <div key={group.group}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">{group.group}</h4>
                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      {fmtTL(group.min)} - {fmtTL(group.max)}
                    </span>
                  </div>
                  <div className="overflow-hidden border border-slate-100 dark:border-zinc-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {group.items.map((item) => (
                          <tr key={item.key}>
                            <td className="p-2 text-slate-700 dark:text-zinc-300 font-medium">{item.label}</td>
                            <td className="p-2 text-slate-400 text-center">%{item.minPct}-%{item.maxPct}</td>
                            <td className="p-2 text-right text-slate-800 dark:text-zinc-200 font-semibold">
                              {fmtTL(item.min)} - {fmtTL(item.max)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
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
