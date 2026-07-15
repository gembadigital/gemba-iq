import React, { useState, useMemo } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { getSystemCurrency, getSystemLocale } from "../lib/currencyHelper";
import SalesCoachAI from "./SalesCoachAI";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Brain,
  Briefcase,
  Users,
  Activity,
  AlertTriangle,
  Calendar,
  Filter,
  X,
  Target,
  ChevronRight,
  Sparkles,
  PieChart as PieIcon,
  Clock,
  LayoutDashboard,
  CheckCircle,
  HelpCircle,
  Percent,
  Search,
  ChevronDown,
  BarChart2,
  ListFilter,
  UserCheck,
  Building,
  BriefcaseIcon,
  MapPin,
  RefreshCw,
  BellRing,
  Award
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ReferenceLine
} from "recharts";
import { CrmDb } from "../lib/CrmDb";

// Reuse Deal interface structure from parent
export interface Deal {
  id: string;
  dealName?: string;
  companyName: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone?: string;
  opportunityValue: number;
  expectedCloseDate: string;
  opportunityScore: number;
  winProbability: number;
  currentStageDuration: number;
  priority: "Low" | "Medium" | "High";
  industry: string;
  stage: string;
  owner?: string;
  pipeline?: string;
  description?: string;
  leadSource?: string;
  proposalNumber?: string;
  manDay?: string | number;
  contactSubject?: string;
  products?: string;
  region?: string;
  businessUnit?: string;
  createdDate?: string;
}

interface SalesDashboardProps {
  deals: Deal[];
  onSelectDeal?: (deal: Deal) => void;
}

// --- STAGE CLASSIFICATION HELPERS ---
// Fırsat/süreç aşamaları (stage) tamamen kullanıcı tarafından özelleştirilebilir
// (bkz. DealManagementView.tsx DEFAULT_STAGES ve "+ Özel Aşama" özelliği). Bu yüzden
// bir fırsatın "kazanıldı" ya da "kaybedildi" olup olmadığını sabit İngilizce
// "won"/"lost" string'i ile birebir karşılaştırarak anlayamayız — kullanıcılar bu
// aşamaları genelde "Kapandı Kazanıldı" / "Kapandı Kaybedildi" gibi Türkçe isimlerle
// değiştiriyor. Bu yardımcı fonksiyonlar hem İngilizce varsayılanları hem de yaygın
// Türkçe varyantları, büyük/küçük harf duyarsız şekilde eşleştirir.
export function isWonStage(stage?: string | null): boolean {
  const s = (stage || "").toLowerCase();
  return s === "won" || s.includes("kazan");
}

export function isLostStage(stage?: string | null): boolean {
  const s = (stage || "").toLowerCase();
  return s === "lost" || s.includes("kaybed") || s.includes("kayıp") || s.includes("kayip");
}

export default function SalesDashboardView({ deals, onSelectDeal }: SalesDashboardProps) {
  const { lang, t } = useLanguage();

  // Format currency
  const formatCur = (v: number) => {
    const { code } = getSystemCurrency();
    return new Intl.NumberFormat(getSystemLocale(), {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0
    }).format(v);
  };

  const handleCompanyClick = (e: React.MouseEvent, companyName: string, companyId?: string) => {
    e.stopPropagation();
    let id = companyId;
    if (!id) {
      const matched = CrmDb.getCompanies().find(c => c.name.toLowerCase().trim() === companyName.toLowerCase().trim());
      if (matched) id = matched.id;
    }
    if (!id) {
      const newComp = CrmDb.createCompany({ name: companyName });
      id = newComp.id;
    }
    CrmDb.setKv("active_company_detail_id", id);
    window.dispatchEvent(new CustomEvent("crm-navigate", { detail: { tab: "companies-registry" } }));
  };

  // --- STATE FOR FILTERS ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRangePreset, setDateRangePreset] = useState<"All" | "Month" | "Quarter" | "Year">("All");
  const [filterSalesperson, setFilterSalesperson] = useState("All");
  const [filterCustomer, setFilterCustomer] = useState("All");
  const [filterSector, setFilterSector] = useState("All");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All"); // Won, Lost, Pipeline
  const [filterStage, setFilterStage] = useState("All");
  const [filterRegion, setFilterRegion] = useState("All");
  const [filterBusinessUnit, setFilterBusinessUnit] = useState("All");

  // --- STATE FOR EDTIABLE TARGETS (SECTION 3) ---
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targets, setTargets] = useState({
    monthly: 450,
    quarterly: 1350,
    annual: 5000,
  });

  // Target input temp states
  const [tempTargets, setTempTargets] = useState({ ...targets });

  // --- STATE FOR SALES TREND SELECTION (SECTION 4) ---
  const [trendPeriod, setTrendPeriod] = useState<"Monthly" | "Quarterly" | "Yearly">("Monthly");

  // --- STATE FOR DRILL-DOWN MODALS ---
  const [activeDrillDown, setActiveDrillDown] = useState<"weighted" | "conversion" | "aging" | null>(null);

  // --- ENRICH DEALS WITH HONEST (NON-FABRICATED) FALLBACKS ---
  // Önceden burada eksik owner/region/businessUnit/industry alanları rastgele
  // döndürülen SAHTE isim listelerinden (Sophia Loren, Hans Weber, Aegean, IoT
  // Tech vb.) dolduruluyordu — bu, panodaki tüm kırılımların (bölge, iş birimi,
  // satış temsilcisi bazlı) gerçek veriyle hiç ilgisi olmayan uydurma sonuçlar
  // göstermesine yol açıyordu. Artık eksik alanlar nötr "Belirtilmemiş" etiketiyle
  // işaretleniyor; hiçbir gerçek veri icat edilmiyor.
  const enrichedDeals = useMemo(() => {
    const unspecified = lang === "TR" ? "Belirtilmemiş" : "Unspecified";
    const unassigned = lang === "TR" ? "Atanmamış" : "Unassigned";
    const generalSubject = lang === "TR" ? "Genel Danışmanlık" : "General Consultancy";
    return deals.map((d) => {
      const days = typeof d.manDay === "number" ? d.manDay : parseInt(d.manDay || "", 10) || 0;
      return {
        ...d,
        owner: d.owner || unassigned,
        region: d.region || unspecified,
        businessUnit: d.businessUnit || unspecified,
        industry: d.industry || unspecified,
        contactSubject: d.contactSubject || d.dealName || generalSubject,
        manDayNum: days,
      };
    });
  }, [deals, lang]);

  // --- EXTRACT DISTINCT META LISTS FOR FILTER DRAWER ---
  const salespeople = useMemo(() => ["All", ...Array.from(new Set(enrichedDeals.map((d) => d.owner).filter(Boolean)))], [enrichedDeals]);
  const customers = useMemo(() => ["All", ...Array.from(new Set(enrichedDeals.map((d) => d.companyName).filter(Boolean)))], [enrichedDeals]);
  const sectors = useMemo(() => ["All", ...Array.from(new Set(enrichedDeals.map((d) => d.industry).filter(Boolean)))], [enrichedDeals]);
  const subjects = useMemo(() => ["All", ...Array.from(new Set(enrichedDeals.map((d) => d.contactSubject).filter(Boolean)))], [enrichedDeals]);
  const stages = useMemo(() => ["All", ...Array.from(new Set(enrichedDeals.map((d) => d.stage).filter(Boolean)))], [enrichedDeals]);
  const regions = useMemo(() => ["All", ...Array.from(new Set(enrichedDeals.map((d) => d.region).filter(Boolean)))], [enrichedDeals]);
  const businessUnits = useMemo(() => ["All", ...Array.from(new Set(enrichedDeals.map((d) => d.businessUnit).filter(Boolean)))], [enrichedDeals]);

  // --- FILTER ENGINE ---
  const filteredDeals = useMemo(() => {
    return enrichedDeals.filter((d) => {
      // Date Range Filter
      if (dateRangePreset !== "All") {
        const year = 2026; // Default active context year
        const closeDateParts = d.expectedCloseDate.split(".");
        let closeMonth = 0;
        if (closeDateParts.length === 3) {
          closeMonth = parseInt(closeDateParts[1], 10);
        } else {
          const dateObj = new Date(d.expectedCloseDate);
          closeMonth = dateObj.getMonth() + 1;
        }

        if (dateRangePreset === "Month") {
          // Cur month is June (6) in metadata context
          if (closeMonth !== 6) return false;
        } else if (dateRangePreset === "Quarter") {
          // Q2: April, May, June (4, 5, 6)
          if (closeMonth < 4 || closeMonth > 6) return false;
        } else if (dateRangePreset === "Year") {
          // Whole 2026
          // we keep standard year items
        }
      }

      // Dropdowns filter mapping
      if (filterSalesperson !== "All" && d.owner !== filterSalesperson) return false;
      if (filterCustomer !== "All" && d.companyName !== filterCustomer) return false;
      if (filterSector !== "All" && d.industry !== filterSector) return false;
      if (filterSubject !== "All" && d.contactSubject !== filterSubject) return false;
      if (filterStage !== "All" && d.stage !== filterStage) return false;
      if (filterRegion !== "All" && d.region !== filterRegion) return false;
      if (filterBusinessUnit !== "All" && d.businessUnit !== filterBusinessUnit) return false;

      // Status filter mapper: Won / Lost / Pipeline
      if (filterStatus !== "All") {
        if (filterStatus === "Won" && !isWonStage(d.stage)) return false;
        if (filterStatus === "Lost" && !isLostStage(d.stage)) return false;
        if (filterStatus === "Pipeline" && (isWonStage(d.stage) || isLostStage(d.stage))) return false;
      }

      return true;
    });
  }, [
    enrichedDeals,
    dateRangePreset,
    filterSalesperson,
    filterCustomer,
    filterSector,
    filterSubject,
    filterStage,
    filterRegion,
    filterBusinessUnit,
    filterStatus
  ]);

  // Reset Filters trigger
  const resetAllFilters = () => {
    setDateRangePreset("All");
    setFilterSalesperson("All");
    setFilterCustomer("All");
    setFilterSector("All");
    setFilterSubject("All");
    setFilterStatus("All");
    setFilterStage("All");
    setFilterRegion("All");
    setFilterBusinessUnit("All");
  };

  const isAnyFilterActive = useMemo(() => {
    return (
      dateRangePreset !== "All" ||
      filterSalesperson !== "All" ||
      filterCustomer !== "All" ||
      filterSector !== "All" ||
      filterSubject !== "All" ||
      filterStatus !== "All" ||
      filterStage !== "All" ||
      filterRegion !== "All" ||
      filterBusinessUnit !== "All"
    );
  }, [
    dateRangePreset,
    filterSalesperson,
    filterCustomer,
    filterSector,
    filterSubject,
    filterStatus,
    filterStage,
    filterRegion,
    filterBusinessUnit,
  ]);

  // --- STATS CALCULATIONS ---
  const stats = useMemo(() => {
    const totalCount = filteredDeals.length;
    let totalVal = 0;
    let wonVal = 0;
    let lostVal = 0;
    let wonCount = 0;
    let lostCount = 0;
    let weightedVal = 0;
    let totalSoldManDays = 0;
    let totalAgingDays = 0;

    filteredDeals.forEach((d) => {
      totalVal += d.opportunityValue;
      weightedVal += d.opportunityValue * ((d.winProbability || 50) / 100);
      // manDay kullanıcı tarafından elle girilen isteğe bağlı bir alan (çoğu fırsatta boş
      // string). Önceden boş/geçersiz değerler sabit "15 gün" varsayımıyla dolduruluyor,
      // bu da toplam "Satılan Adam-Gün" rakamını gerçekte teklif edilmemiş günlerle
      // şişiriyordu. Artık gerçek veri yoksa dürüstçe 0 sayılıyor.
      totalSoldManDays += typeof d.manDay === "number" ? d.manDay : parseInt(d.manDay || "0", 10) || 0;
      totalAgingDays += d.currentStageDuration || 0;

      if (isWonStage(d.stage)) {
        wonVal += d.opportunityValue;
        wonCount++;
      } else if (isLostStage(d.stage)) {
        lostVal += d.opportunityValue;
        lostCount++;
      }
    });

    const winRate = totalCount > 0 ? (wonCount / totalCount) * 100 : 0;
    const avgDealSize = totalCount > 0 ? totalVal / totalCount : 0;

    // Satış döngüsü süresi: sistemde fırsatın "oluşturulma tarihi" alanı tutulmadığı
    // için gerçek kapanış süresi hesaplanamıyor. Önceden burada sabit 30/48/42 günlük
    // uydurma değerler kullanılıyordu — bunun yerine kazanılan fırsatların GERÇEK
    // "mevcut aşamada geçirdiği süre" (currentStageDuration) alanının ortalaması
    // kullanılıyor; hiçbir sabit/icat sayı yok.
    const wonDealsForCycle = filteredDeals.filter(d => isWonStage(d.stage));
    const avgSalesCycle = wonDealsForCycle.length > 0
      ? Math.round(wonDealsForCycle.reduce((acc, curr) => acc + (curr.currentStageDuration || 0), 0) / wonDealsForCycle.length)
      : 0;

    const pipelineVal = totalVal - (wonVal + lostVal);

    return {
      totalCount,
      totalVal,
      wonVal,
      lostVal,
      wonCount,
      lostCount,
      winRate,
      avgDealSize,
      avgSalesCycle,
      weightedVal,
      totalSoldManDays,
      pipelineVal,
      avgAgingDays: totalCount > 0 ? Math.round(totalAgingDays / totalCount) : 0
    };
  }, [filteredDeals]);

  // Targets logic
  const manDayTarget = useMemo(() => {
    if (dateRangePreset === "Month") return targets.monthly;
    if (dateRangePreset === "Quarter") return targets.quarterly;
    return targets.annual;
  }, [dateRangePreset, targets]);

  const targetPercentage = useMemo(() => {
    if (manDayTarget === 0) return 0;
    return Math.round((stats.totalSoldManDays / manDayTarget) * 100);
  }, [stats.totalSoldManDays, manDayTarget]);

  const targetColorClass = useMemo(() => {
    if (targetPercentage >= 100) return "text-emerald-500 dark:text-emerald-400";
    if (targetPercentage >= 90) return "text-amber-500 dark:text-amber-400";
    return "text-rose-500 dark:text-rose-400";
  }, [targetPercentage]);

  const targetBgColorClass = useMemo(() => {
    if (targetPercentage >= 100) return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50";
    if (targetPercentage >= 90) return "bg-amber-50 dark:bg-amber-950/30 border-amber-200/50";
    return "bg-rose-50 dark:bg-rose-950/30 border-rose-200/50";
  }, [targetPercentage]);

  // Save targets callback
  const handleSaveTargets = () => {
    setTargets({ ...tempTargets });
    setIsTargetModalOpen(false);
  };

  // --- SECTIONS DATA PREPARATION ---

  // Funnel data
  const funnelData = useMemo(() => {
    // Stage counts
    const funnelStages = [
      { name: "Lead", key: ["lead identified", "initial contact"] },
      { name: "Qualified Lead", key: ["opportunity qualified"] },
      { name: "Meeting", key: ["discovery meeting"] },
      { name: "Gemba Scan", key: ["site visit / gemba"] },
      { name: "Proposal Sent", key: ["proposal submitted"] },
      { name: "Won", key: ["won"] },
      { name: "Lost", key: ["lost"] }
    ];

    // "Won"/"Lost" aşamaları özelleştirilebilir olduğundan sabit string eşleşmesi
    // yerine isWonStage/isLostStage yardımcıları kullanılıyor. Ayrıca önceden
    // gerçek sayı 0 olduğunda devreye giren uydurma yüzde/adet/tutar (ör. "%90",
    // "%40") tamamen kaldırıldı — gerçek sıfır artık dürüstçe sıfır gösteriliyor.
    return funnelStages.map((st) => {
      const dealsInStage = filteredDeals.filter(d => {
        if (st.name === "Won") return isWonStage(d.stage);
        if (st.name === "Lost") return isLostStage(d.stage);
        return st.key.includes(d.stage.toLowerCase());
      });
      const count = dealsInStage.length;
      const totalValueObj = dealsInStage.reduce((acc, cur) => acc + cur.opportunityValue, 0);
      const conversionRate = filteredDeals.length > 0 ? Math.round((count / filteredDeals.length) * 100) : 0;
      return {
        stageName: st.name,
        count,
        value: totalValueObj,
        conversionRate
      };
    });
  }, [filteredDeals]);

  // Aging categories
  const agingData = useMemo(() => {
    let cat0_30_count = 0, cat0_30_val = 0;
    let cat31_60_count = 0, cat31_60_val = 0;
    let cat61_90_count = 0, cat61_90_val = 0;
    let cat91_plus_count = 0, cat91_plus_val = 0;

    filteredDeals.forEach((d) => {
      const g = d.currentStageDuration || 0;
      if (g <= 30) {
        cat0_30_count++;
        cat0_30_val += d.opportunityValue;
      } else if (g <= 60) {
        cat31_60_count++;
        cat31_60_val += d.opportunityValue;
      } else if (g <= 90) {
        cat61_90_count++;
        cat61_90_val += d.opportunityValue;
      } else {
        cat91_plus_count++;
        cat91_plus_val += d.opportunityValue;
      }
    });

    return [
      { name: "0-30 Days (Healthy)", count: cat0_30_count, value: cat0_30_val, color: "#10b981" },
      { name: "31-60 Days (Attention)", count: cat31_60_count, value: cat31_60_val, color: "#eab308" },
      { name: "61-90 Days (High Risk)", count: cat61_90_count, value: cat61_90_val, color: "#f97316" },
      { name: "90+ Days (Critical)", count: cat91_plus_count, value: cat91_plus_val, color: "#ef4444" }
    ];
  }, [filteredDeals]);

  // Trend Chart data
  // Önceden burada aylara sabit uydurma başlangıç değerleri (ör. Ocak: 140.000)
  // atanıyor ve gerçek fırsat tutarları %20/%40 gibi keyfi katsayılarla küçültülerek
  // ekleniyordu — grafikteki hiçbir sayı gerçek veriyle birebir örtüşmüyordu.
  // Yıllık/çeyreklik görünümlerde de "2024 (Geçmiş)"/"2025 (Geçmiş)" gibi tamamen
  // icat edilmiş geçmiş yıl verileri gösteriliyordu. Artık tüm değerler doğrudan
  // filtrelenmiş gerçek fırsatların expectedCloseDate'inden hesaplanıyor; veri
  // yoksa dürüstçe boş/sıfır gösteriliyor.
  const trendData = useMemo(() => {
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    const getCloseDateInfo = (expectedCloseDate: string) => {
      const parts = expectedCloseDate.split(".");
      if (parts.length === 3) {
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (!isNaN(month) && !isNaN(year)) return { month, year, valid: true };
      }
      const dateObj = new Date(expectedCloseDate);
      if (isNaN(dateObj.getTime())) return { month: 0, year: 0, valid: false };
      return { month: dateObj.getMonth() + 1, year: dateObj.getFullYear(), valid: true };
    };

    if (trendPeriod === "Yearly") {
      const byYear: { [key: string]: { proposal: number; won: number; lost: number } } = {};
      filteredDeals.forEach((d) => {
        const { year, valid } = getCloseDateInfo(d.expectedCloseDate);
        if (!valid) return;
        const key = String(year);
        if (!byYear[key]) byYear[key] = { proposal: 0, won: 0, lost: 0 };
        byYear[key].proposal += d.opportunityValue;
        if (isWonStage(d.stage)) byYear[key].won += d.opportunityValue;
        if (isLostStage(d.stage)) byYear[key].lost += d.opportunityValue;
      });
      return Object.keys(byYear).sort().map((year) => ({ name: year, ...byYear[year] }));
    }

    if (trendPeriod === "Quarterly") {
      const byQuarter: { [key: string]: { proposal: number; won: number; lost: number } } = {};
      filteredDeals.forEach((d) => {
        const { month, year, valid } = getCloseDateInfo(d.expectedCloseDate);
        if (!valid) return;
        const q = Math.ceil(month / 3);
        const key = `${year}-Q${q}`;
        if (!byQuarter[key]) byQuarter[key] = { proposal: 0, won: 0, lost: 0 };
        byQuarter[key].proposal += d.opportunityValue;
        if (isWonStage(d.stage)) byQuarter[key].won += d.opportunityValue;
        if (isLostStage(d.stage)) byQuarter[key].lost += d.opportunityValue;
      });
      return Object.keys(byQuarter).sort().map((key) => ({ name: key, ...byQuarter[key] }));
    }

    const byMonth: { [key: string]: { proposal: number; won: number; lost: number } } = {};
    monthNames.forEach((m) => { byMonth[m] = { proposal: 0, won: 0, lost: 0 }; });
    filteredDeals.forEach((d) => {
      const { month, valid } = getCloseDateInfo(d.expectedCloseDate);
      if (!valid || month < 1 || month > 12) return;
      const key = monthNames[month - 1];
      byMonth[key].proposal += d.opportunityValue;
      if (isWonStage(d.stage)) byMonth[key].won += d.opportunityValue;
      if (isLostStage(d.stage)) byMonth[key].lost += d.opportunityValue;
    });

    return monthNames.map((m) => ({ name: m, ...byMonth[m] }));
  }, [filteredDeals, trendPeriod]);

  // Topic bar chart data
  // Önceden burada, gerçek konu listesi kısaysa 6 tane tamamen uydurma konu
  // (OEE Tracking Setup, Muda Mapping Auditing vb.) ekleniyordu. Artık sadece
  // gerçek fırsatlardan türetilen konular gösteriliyor; liste boşsa dürüstçe boş
  // dönüyor (UI tarafında boş durum ele alınabilir).
  const topicsData = useMemo(() => {
    const counts: { [key: string]: { count: number, won: number, revenue: number } } = {};
    filteredDeals.forEach((d) => {
      const topic = d.contactSubject || (lang === "TR" ? "Genel Danışmanlık" : "General Consultancy");
      if (!counts[topic]) {
        counts[topic] = { count: 0, won: 0, revenue: 0 };
      }
      counts[topic].count++;
      if (isWonStage(d.stage)) {
        counts[topic].won++;
        counts[topic].revenue += d.opportunityValue;
      }
    });

    return Object.keys(counts).map(key => ({
      subject: key,
      count: counts[key].count,
      won: counts[key].won,
      revenue: counts[key].revenue
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredDeals, lang]);

  // Recurse Leadboard database
  const leaderboardData = useMemo(() => {
    const salesRank: {
      [key: string]: {
        name: string;
        proposalCount: number;
        proposalValue: number;
        wonValue: number;
        wonCount: number;
        soldManDays: number;
        meetings: number;
        newCustomers: number;
      }
    } = {};

    filteredDeals.forEach((d) => {
      const o = d.owner || "GP Admin";
      if (!salesRank[o]) {
        salesRank[o] = {
          name: o,
          proposalCount: 0,
          proposalValue: 0,
          wonValue: 0,
          wonCount: 0,
          soldManDays: 0,
          meetings: 0,
          newCustomers: 0
        };
      }

      salesRank[o].proposalCount++;
      salesRank[o].proposalValue += d.opportunityValue;
      
      const days = typeof d.manDay === "number" ? d.manDay : parseInt(d.manDay || "0", 10) || 0;
      salesRank[o].soldManDays += days;

      if (isWonStage(d.stage)) {
        salesRank[o].wonValue += d.opportunityValue;
        salesRank[o].wonCount++;
        salesRank[o].newCustomers++; // Each won deal represents an acquired customer
      }

      // Gerçek toplantı (meetings) verisi sistemde henüz tutulmuyor; önceden
      // burada opexScore'a göre uydurma bir sayı (1/2/4) simüle ediliyordu.
      // Uydurma veri kaldırıldı — gerçek veri gelene kadar dürüstçe 0 gösteriliyor.
      salesRank[o].meetings += 0;
    });

    return Object.values(salesRank).map((rep) => {
      const winRatePercent = rep.proposalCount > 0 ? (rep.wonCount / rep.proposalCount) * 100 : 0;
      return {
        ...rep,
        winRate: winRatePercent
      };
    }).sort((a, b) => b.wonValue - a.wonValue);
  }, [filteredDeals]);

  // Forecast data for Recharts
  const forecastChartData = useMemo(() => {
    const result: { month: string, pipeline: number, weighted: number, forecast: number }[] = [];
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    
    months.forEach((m, idx) => {
      let pipe = 0;
      let weight = 0;
      
      filteredDeals.forEach((d) => {
        const parts = d.expectedCloseDate.split(".");
        let closeMonthIdx = -1;
        if (parts.length === 3) {
          closeMonthIdx = parseInt(parts[1], 10) - 1;
        } else {
          closeMonthIdx = new Date(d.expectedCloseDate).getMonth();
        }

        if (closeMonthIdx === idx) {
          if (!isWonStage(d.stage) && !isLostStage(d.stage)) {
            pipe += d.opportunityValue;
            weight += d.opportunityValue * ((d.winProbability || 50) / 100);
          }
        }
      });

      // Önceden grafik filtrelemede boş görünmesin diye belirli aylara sabit
      // "dummy" (120.000 / 340.000 / 250.000) değerler ekleniyordu. Bu tamamen
      // uydurma veriydi ve kaldırıldı — gerçek süreç yoksa ay gerçekten boş.
      result.push({
        month: m,
        pipeline: pipe,
        weighted: weight,
        forecast: weight * 1.15
      });
    });

    return result.filter(r => r.pipeline > 0);
  }, [filteredDeals]);

  // Dynamic insights generator
  const [dashboardPageTab, setDashboardPageTab] = useState<"metrics" | "coach">("metrics");

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans">
      
      {/* SECTION HEADER / TOP NAV */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] p-5 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-lg text-white shadow-sm">
              <BarChart2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 uppercase font-sans">
                {lang === "TR" ? "Satış Performansı Gösterge Paneli" : "Sales Performance Dashboard"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === "TR" ? "Power BI ve Linear'dan Esinlenen B2B Yönetici Satış İstihbarat Motoru" : "Power BI & Linear.app Inspired B2B Executive Sales Intelligence Engine"}
              </p>
            </div>
          </div>
        </div>

        {/* Global Filter Trigger & Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isAnyFilterActive && (
            <button
              onClick={resetAllFilters}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#323130] dark:hover:bg-[#424140] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all border border-slate-200/50 dark:border-[#424140]"
            >
              <X className="w-3.5 h-3.5" />
              {lang === "TR" ? "Filtreleri Sıfırla" : "Reset Filters"}
            </button>
          )}

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all border ${
              isAnyFilterActive 
                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-300"
                : "bg-white hover:bg-slate-50 dark:bg-[#252423] dark:hover:bg-[#2e2c2b] text-slate-700 dark:text-slate-350 border-slate-200 dark:border-zinc-800"
            }`}
          >
            <Filter className={`w-4 h-4 ${isAnyFilterActive ? "animate-pulse font-bold text-amber-500" : ""}`} />
            <span>{lang === "TR" ? "İnteraktif Filtreler" : "Interactive Filters"}</span>
            {isAnyFilterActive && (
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" />
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Sub-Tabs bar */}
      <div className="flex items-center border-b border-slate-200/60 dark:border-zinc-800 gap-1.5 select-none bg-slate-50/50 dark:bg-[#121212] p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setDashboardPageTab("metrics")}
          className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            dashboardPageTab === "metrics"
              ? "bg-white dark:bg-zinc-850 text-[#0078D4] dark:text-blue-400 shadow-xs border border-slate-200/40 dark:border-zinc-800 font-extrabold"
              : "text-slate-500 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-300"
          }`}
        >
          <BarChart2 className="w-4 h-4 text-[#0078D4]" />
          <span>{lang === "TR" ? "Satış Analiz Paneli" : "Sales Intelligence Dashboard"}</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardPageTab("coach")}
          className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            dashboardPageTab === "coach"
              ? "bg-white dark:bg-zinc-850 text-rose-500 border border-slate-200/40 dark:border-zinc-800 font-extrabold"
              : "text-slate-500 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-350"
          }`}
        >
          <Brain className="w-4 h-4 text-rose-500" />
          <span>{lang === "TR" ? "Yapay Zeka Satış Koçu" : "Sales Coach AI"}</span>
        </button>
      </div>

      {dashboardPageTab === "coach" ? (
        <SalesCoachAI deals={deals} />
      ) : (
        <>
          {/* FILTER DRAWER PANEL (SLIDES FROM RIGHT) */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-[#FAF9F8] dark:bg-[#1f1e1d] w-full max-w-sm border-l border-[#EDEBE9] dark:border-[#323130] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#EDEBE9] dark:border-[#323130] flex items-center justify-between bg-white dark:bg-[#201f1e]">
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-bold uppercase tracking-wider font-sans">
                  {lang === "TR" ? "Power BI Filtre Paneli" : "Power BI Filter Deck"}
                </span>
              </div>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-1 border border-transparent rounded hover:bg-slate-100 dark:hover:bg-[#252423] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body - Filter Controls */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Preset Date Range */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block">
                  {lang === "TR" ? "Tarih Aralığı Penceresi" : "Date Range Window"}
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg">
                  {(["All", "Month", "Quarter", "Year"] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setDateRangePreset(preset)}
                      className={`py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                        dateRangePreset === preset
                          ? "bg-[#0078D4] text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252423]"
                      }`}
                    >
                      {preset === "Month"
                        ? (lang === "TR" ? "Haziran 26" : "June 26")
                        : preset === "Quarter"
                        ? "Q2-2026"
                        : preset === "Year"
                        ? "FY-2026"
                        : (lang === "TR" ? "Tümü" : "All")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block">
                  {lang === "TR" ? "Teklif Durumu" : "Proposal Status"}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg"
                >
                  <option value="All">{lang === "TR" ? "Tüm Durumlar (Süreç + Kapatılmış)" : "All Statuses (Pipeline + Closed)"}</option>
                  <option value="Won">{lang === "TR" ? "Kazanıldı (Gerçekleşen Satışlar)" : "Closed Won (Deals Realized)"}</option>
                  <option value="Lost">{lang === "TR" ? "Kaybedildi (Düşen Fırsatlar)" : "Closed Lost (Deals Dropped)"}</option>
                  <option value="Pipeline">{lang === "TR" ? "Aktif Süreç (Devam Eden)" : "Active Pipeline (In Progress)"}</option>
                </select>
              </div>

              {/* Salesperson Filter */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-505 block">
                  {lang === "TR" ? "Satış Temsilcisi" : "Salesperson"}
                </label>
                <select
                  value={filterSalesperson}
                  onChange={(e) => setFilterSalesperson(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg"
                >
                  {salespeople.map((rep) => (
                    <option key={rep} value={rep}>
                      {rep === "All" ? (lang === "TR" ? "Tüm Satış Temsilcileri" : "All Salespeople") : rep}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Filter */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-505 block">
                  {lang === "TR" ? "Müşteri / Hesap" : "Customer / Account"}
                </label>
                <select
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg"
                >
                  {customers.map((c) => (
                    <option key={c} value={c}>
                      {c === "All" ? (lang === "TR" ? "Tüm Müşteriler" : "All Customers") : c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sector Industry Filter */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-505 block">
                  {lang === "TR" ? "Sektör" : "Sector / Industry"}
                </label>
                <select
                  value={filterSector}
                  onChange={(e) => setFilterSector(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg"
                >
                  {sectors.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec === "All" ? (lang === "TR" ? "Tüm Sektörler" : "All Sectors") : sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region Filter */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-550 block">
                  {lang === "TR" ? "Coğrafi Bölge" : "Geographic Region"}
                </label>
                <select
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg"
                >
                  {regions.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg === "All" ? (lang === "TR" ? "Tüm Bölgeler" : "All Regions") : reg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Business Unit Filter */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-550 block">
                  {lang === "TR" ? "İş Birimi (BU)" : "Business Unit (BU)"}
                </label>
                <select
                  value={filterBusinessUnit}
                  onChange={(e) => setFilterBusinessUnit(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg"
                >
                  {businessUnits.map((bu) => (
                    <option key={bu} value={bu}>
                      {bu === "All" ? (lang === "TR" ? "Tüm İş Birimleri" : "All Business Units") : bu}
                    </option>
                  ))}
                </select>
              </div>

              {/* Proposal Subject Filter */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-550 block">
                  {lang === "TR" ? "Teklif Konusu / Başlığı" : "Proposal Topic / Subject"}
                </label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub === "All" ? (lang === "TR" ? "Tüm Konular" : "All Topics") : sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deal Stage Filter */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-550 block">
                  {lang === "TR" ? "Fırsat Aşaması" : "Deal Stage Lifecycle"}
                </label>
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg"
                >
                  {stages.map((stg) => {
                    const getStageName = (s: string) => {
                      if (lang !== "TR") return s;
                      const stageMap: Record<string, string> = {
                        "All": "Tüm Aşamalar",
                        "Initial Contact": "İlk Temas",
                        "Discovery Meeting": "Keşif Toplantısı",
                        "Site Visit": "Saha Ziyareti",
                        "Evaluation": "Değerlendirme",
                        "Proposal Submitted": "Teklif Sunuldu",
                        "Won": "Kazanıldı",
                        "Lost": "Kaybedildi"
                      };
                      return stageMap[s] || s;
                    };
                    return (
                      <option key={stg} value={stg}>
                        {getStageName(stg)}
                      </option>
                    );
                  })}
                </select>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#201f1e] flex items-center justify-between">
              <button
                onClick={resetAllFilters}
                className="px-3 py-2 text-xs font-bold border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-50 cursor-pointer"
              >
                {lang === "TR" ? "Sıfırla" : "Clear Preset"}
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-[#0078D4] hover:bg-[#005a9e] text-white rounded cursor-pointer"
              >
                {lang === "TR" ? "Uygula" : "Apply Dynamic Deck"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1 - KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Card 1: Total Proposal Value */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0078D4] dark:text-blue-400">
              {lang === "TR" ? "Toplam Teklifler" : "Total Proposals"}
            </span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-black font-mono leading-none tracking-tight">
              {formatCur(stats.totalVal)}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1">
              {lang === "TR" ? "Kayıtlardaki aktif hacim" : "Active volume in registry"}
            </span>
          </div>
        </div>

        {/* Card 2: Won Proposal Value */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500">
              {lang === "TR" ? "Kazanılan Değer" : "Won Value"}
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-black font-mono leading-none tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCur(stats.wonVal)}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1">
              {lang === "TR" ? `${stats.wonCount} fırsat başarıyla kapatıldı` : `${stats.wonCount} deals successfully closed`}
            </span>
          </div>
          <div className="text-[11px] font-mono font-bold text-emerald-500">
            <span>{stats.totalCount > 0 ? Math.round((stats.wonCount / stats.totalCount) * 100) : 0}% {lang === "TR" ? "başarı oranı" : "success rate"}</span>
          </div>
        </div>

        {/* Card 3: Lost Proposal Value */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-500">
              {lang === "TR" ? "Kaybedilen Değer" : "Lost Value"}
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-black font-mono leading-none tracking-tight text-rose-600 dark:text-rose-450">
              {formatCur(stats.lostVal)}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1">
              {lang === "TR" ? `${stats.lostCount} fırsat kaybedilerek kapandı` : `${stats.lostCount} deals closed lost`}
            </span>
          </div>
          <div className="text-[11px] font-mono font-bold text-rose-500">
            <span>{stats.totalCount > 0 ? Math.round((stats.lostCount / stats.totalCount) * 100) : 0}% {lang === "TR" ? "kayıp oranı" : "loss rate"}</span>
          </div>
        </div>

        {/* Card 4: Win Rate */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500">
              {lang === "TR" ? "Kazanma Oranı" : "Win Rate"}
            </span>
            <Percent className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2.5xl font-black font-mono leading-none tracking-tight text-indigo-600 dark:text-indigo-400">
              {stats.winRate.toFixed(1)}%
            </span>
            <span className="block text-[10px] text-slate-400 mt-1">
              {lang === "TR" ? "Kazanılan adet oranı" : "Won count ratio"}
            </span>
          </div>
        </div>

        {/* Card 5: Average Deal Size */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-500">
              {lang === "TR" ? "Ort. Fırsat Büyüklüğü" : "Avg Deal Size"}
            </span>
            <Briefcase className="w-4 h-4 text-sky-500" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-black font-mono leading-none tracking-tight">
              {formatCur(stats.avgDealSize)}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1">
              {lang === "TR" ? "Fırsat ortalaması" : "Opportunity average"}
            </span>
          </div>
          <div className="text-[11px] font-mono font-bold text-[#0078D4] dark:text-blue-400">
            <span>{lang === "TR" ? "İdeal B2B aralığında" : "Within ideal B2B bracket"}</span>
          </div>
        </div>

        {/* Card 6: Average Sales Cycle */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500">
              {lang === "TR" ? "Satış Döngüsü" : "Sales Cycle"}
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2.5xl font-black font-mono leading-none tracking-tight">
              {stats.avgSalesCycle} {lang === "TR" ? "Gün" : "Days"}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1">
              {lang === "TR" ? "Toplantıdan kazanıma" : "Meeting to Won stage"}
            </span>
          </div>
        </div>

      </div>

      {/* EXECUTIVE SALES INTELLIGENCE SECTION */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {lang === "TR" ? "Yönetici Satış Analitiği (Power BI Pro)" : "Executive Sales Intelligence (Power BI Pro)"}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* KPI 1 - WEIGHTED PIPELINE VALUE */}
          <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#0078D4] transition-all cursor-pointer"
               onClick={() => setActiveDrillDown("weighted")}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-450 block">
                {lang === "TR" ? "Ağırlıklı Süreç Değeri" : "Weighted Pipeline Value"}
              </span>
              <span className="text-[10px] text-xs font-bold text-[#0078D4] dark:text-blue-400 flex items-center gap-0.5">
                {lang === "TR" ? "Detaylar" : "Drill-down"} <ChevronRight className="w-3 h-3" />
              </span>
            </div>
 
            <div className="my-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black font-mono leading-none text-[#0078D4] dark:text-blue-400">
                  {formatCur(stats.weightedVal)}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {lang === "TR" ? " / " : "of "} {formatCur(stats.pipelineVal)}
                </span>
              </div>
              
              {/* Forecast Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>{lang === "TR" ? "Öngörü İlerlemesi" : "Forecast Progress"}</span>
                  <span>
                    {Math.round((stats.weightedVal / (stats.totalVal || 1)) * 100)}% {lang === "TR" ? "Toplam sürecin" : "of Total pipeline"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full" 
                        style={{ width: `${Math.min(100, Math.round((stats.weightedVal / (stats.totalVal || 1)) * 100))}%` }} />
                </div>
              </div>
            </div>
 
            <div className="pt-3 border-t border-[#EDEBE9] dark:border-[#323130] flex justify-end items-center text-[10px] font-mono text-slate-500">
              <span>{lang === "TR" ? "Olasılığa dayalı" : "Based on probability"}</span>
            </div>
          </div>

          {/* KPI 2 - PROPOSAL CONVERSION RATE */}
          <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-500/80 transition-all cursor-pointer"
               onClick={() => setActiveDrillDown("conversion")}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-450 block">
                {lang === "TR" ? "Teklif Dönüşüm Oranı" : "Proposal Conversion Rate"}
              </span>
              <span className="text-[10px] text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                {lang === "TR" ? "Detaylar" : "Drill-down"} <ChevronRight className="w-3 h-3" />
              </span>
            </div>
 
            <div className="my-4 flex items-center justify-between">
              <div>
                <span className="text-3xl font-black font-mono leading-none text-emerald-500">
                  {stats.winRate.toFixed(0)}%
                </span>
                <span className="block text-[10px] text-slate-400 mt-1">
                  {lang === "TR" ? `${stats.totalCount} tekliften ${stats.wonCount} kazanıldı` : `Won ${stats.wonCount} of ${stats.totalCount} proposals`}
                </span>
              </div>
 
              {/* KPI Indicator Badge */}
              <div className="flex flex-col items-end">
                <span className={`text-[10px] uppercase font-mono font-black px-2 py-1 rounded-md ${stats.winRate >= 40 ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200" : stats.winRate >= 30 ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-200" : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-250"}`}>
                  {stats.winRate >= 40 
                    ? (lang === "TR" ? "Mükemmel" : "Excellent") 
                    : stats.winRate >= 30 
                    ? (lang === "TR" ? "İyi" : "Good") 
                    : stats.winRate >= 20 
                    ? (lang === "TR" ? "Ortalama" : "Average") 
                    : (lang === "TR" ? "Kritik" : "Critical")}
                </span>
                <span className="text-[9px] text-slate-400 font-mono mt-1">
                  {lang === "TR" ? "Power BI Derecesi" : "Power BI Rank"}
                </span>
              </div>
            </div>
 
            <div className="pt-3 border-t border-[#EDEBE9] dark:border-[#323130] flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span className="font-bold text-slate-600 dark:text-slate-350">
                {lang === "TR" ? "Dönüşüm Skoru" : "Conversion Score"}
              </span>
              <span>
                {lang === "TR" ? "Hedef Değer: %40" : "Target Benchmark: 40%"}
              </span>
            </div>
          </div>
 
          {/* KPI 3 - OPPORTUNITY AGING ANALYSIS */}
          <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-yellow-500/85 transition-all cursor-pointer"
               onClick={() => setActiveDrillDown("aging")}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-450 block">
                {lang === "TR" ? "Fırsat Yaşlandırma (Gün)" : "Opportunity Aging (Days)"}
              </span>
              <span className="text-[10px] text-xs font-bold text-amber-500 flex items-center gap-0.5">
                {lang === "TR" ? "Detaylar" : "Drill-down"} <ChevronRight className="w-3 h-3" />
              </span>
            </div>
 
            <div className="my-4 flex items-center justify-between gap-2">
              <div>
                <span className="text-2xl font-black font-mono leading-none text-amber-500">
                  {stats.avgAgingDays} {lang === "TR" ? "Gün" : "Days"}
                </span>
                <span className="block text-[10px] text-slate-400 mt-1">
                  {lang === "TR" ? "Ortalama inaktif süreç yaşı" : "Average inactive pipeline age"}
                </span>
              </div>
 
              {/* Stacked indicators preview */}
              <div className="flex gap-1">
                <span className="w-2.5 h-6 bg-emerald-500 rounded" title={lang === "TR" ? "0-30 Gün" : "0-30 Days"} />
                <span className="w-2.5 h-6 bg-yellow-500 rounded" title={lang === "TR" ? "31-60 Gün" : "31-60 Days"} />
                <span className="w-2.5 h-6 bg-orange-500 rounded animate-pulse" title={lang === "TR" ? "61-90 Gün" : "61-90 Days"} />
                <span className="w-2.5 h-6 bg-red-500 rounded" title={lang === "TR" ? "90+ Gün" : "90+ Days"} />
              </div>
            </div>
 
            <div className="pt-3 border-t border-[#EDEBE9] dark:border-[#323130] flex justify-between items-center text-[10px] font-mono text-[#f97316]">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> 
                {filteredDeals.filter(d => (d.currentStageDuration || 0) > 60).length} {lang === "TR" ? "Yüksek Riskli fırsat" : "High-Risk deals"}
              </span>
              <span className="text-slate-400">
                {lang === "TR" ? "SLA İhlal Alarmları" : "SLA Breach Alarms"}
              </span>
            </div>
          </div>
 
        </div>
      </div>

      {/* DRILL-DOWN MODALS RENDER PANEL */}
      
      {/* Weighted Pipeline Drill-down */}
      {activeDrillDown === "weighted" && (
        <div className="bg-slate-50 dark:bg-zinc-900 border border-[#EDEBE9] dark:border-[#323130] p-6 rounded-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#0078D4] dark:text-blue-400">{lang === "TR" ? "Ağırlıklı Süreç Öngörüsü Gezgini" : "Weighted Pipeline Forecast Explorer"}</h3>
              <p className="text-xs text-slate-500">{lang === "TR" ? "Olasılık ve iş birimine göre en iyi 10 fırsatın detaylı öngörü katkısı" : "Detailed forecast contributions of top 10 opportunities by probability and business unit"}</p>
            </div>
            <button onClick={() => setActiveDrillDown(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded font-black cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side contribution list */}
            <div className="space-y-2 bg-white dark:bg-[#1b1a19] p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0078D4] dark:text-blue-400 block mb-2">{lang === "TR" ? "Öngörüye Katkıda Bulunan En Büyük Fırsatlar" : "Top Opportunities contributing to Forecast"}</span>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 max-h-[250px] overflow-y-auto">
                {filteredDeals.slice(0, 5).map((d) => (
                  <div key={d.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span 
                        onClick={(e) => handleCompanyClick(e, d.companyName, (d as any).companyId)}
                        className="font-bold text-slate-700 dark:text-slate-200 block hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                        title={lang === "TR" ? "Şirket Detayına Git" : "Go to Company Detail"}
                      >
                        🏢 {d.companyName}
                      </span>
                      <span className="text-[10px] text-slate-400">{d.owner} • {d.businessUnit} • Prob: {d.winProbability}%</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold block text-[#0078D4] dark:text-blue-400">{formatCur(d.opportunityValue * (d.winProbability / 100))}</span>
                      <span className="text-[9px] text-slate-400">Total: {formatCur(d.opportunityValue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side chart */}
            <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800 h-[280px]">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block mb-3">{lang === "TR" ? "Aylık Gelir Öngörü Trendi (Süreç Ağırlıklı)" : "Revenue Forecast Trend by Month (Pipeline Weighted)"}</span>
              <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={forecastChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="month" fontSize={10} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} />
                  <Tooltip formatter={(value: any) => formatCur(value)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="pipeline" name={lang === "TR" ? "Brüt Süreç" : "Gross Pipeline"} fill="#3b82f6" opacity={0.4} barSize={25} />
                  <Line type="monotone" dataKey="weighted" name={lang === "TR" ? "Ağırlıklı Öngörü" : "Weighted Forecast"} stroke="#10b981" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="forecast" name={lang === "TR" ? "Ağırlıklı Hedef" : "Weighted Target"} stroke="#8b5cf6" strokeDasharray="4 4" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Conversion Rate Drill-down */}
      {activeDrillDown === "conversion" && (
        <div className="bg-slate-50 dark:bg-zinc-900 border border-[#EDEBE9] dark:border-[#323130] p-6 rounded-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-emerald-500">{lang === "TR" ? "Teklif Dönüşüm Matrisi Gezgini" : "Proposal Conversion Matrix Explorer"}</h3>
              <p className="text-xs text-slate-500">{lang === "TR" ? "Sektör, satış temsilcisi ve teklif konusuna göre dönüşüm oranları" : "Conversion rates segmented by Industry Sector, Salesperson, and Proposal Subject matter"}</p>
            </div>
            <button onClick={() => setActiveDrillDown(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded font-black cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sector Breakdown */}
            <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2">{lang === "TR" ? "Sektör Bazlı Dönüşüm" : "Conversion by Industry"}</span>
              <div className="space-y-2 mt-2">
                {sectors.slice(1, 5).map((sec) => {
                  const secDeals = filteredDeals.filter(d => d.industry === sec);
                  const w = secDeals.filter(d => isWonStage(d.stage)).length;
                  const score = secDeals.length > 0 ? Math.round((w / secDeals.length) * 100) : 0;
                  return (
                    <div key={sec} className="text-xs">
                      <div className="flex justify-between font-bold mb-1">
                        <span>{sec}</span>
                        <span>{score}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Salesperson Breakdown */}
            <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2">{lang === "TR" ? "Temsilci Bazlı Dönüşüm" : "Conversion by Salesperson"}</span>
              <div className="space-y-2 mt-2">
                {leaderboardData.slice(0, 4).map((rep) => {
                  return (
                    <div key={rep.name} className="text-xs">
                      <div className="flex justify-between font-bold mb-1">
                        <span>{rep.name}</span>
                        <span>{Math.round(rep.winRate)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${Math.round(rep.winRate)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product breakdown */}
            <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2">{lang === "TR" ? "Konu Bazlı Dönüşüm" : "Conversion by Subject"}</span>
              <div className="space-y-2 mt-2">
                {topicsData.slice(0, 4).map((top) => {
                  const rate = top.count > 0 ? Math.round((top.won / top.count) * 100) : 0;
                  return (
                    <div key={top.subject} className="text-xs">
                      <div className="flex justify-between font-bold mb-1">
                        <span className="truncate max-w-[150px]" title={top.subject}>{top.subject}</span>
                        <span>{rate}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aging Analysis Drill-down */}
      {activeDrillDown === "aging" && (
        <div className="bg-slate-50 dark:bg-zinc-900 border border-[#EDEBE9] dark:border-[#323130] p-6 rounded-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-rose-500">{lang === "TR" ? "Fırsat Yaşlandırma Risk Paneli" : "Opportunity Aging Risk Panel"}</h3>
              <p className="text-xs text-slate-500">{lang === "TR" ? "Hemen takip edilmesi gereken inaktif/bayat tekliflerin tespiti" : "Identification of inactive/stale proposals requiring immediate follow-up actions"}</p>
            </div>
            <button onClick={() => setActiveDrillDown(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded font-black cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-xl border border-slate-200 dark:border-[#323130] overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5">{lang === "TR" ? "Müşteri / Cari" : "Account / Customer"}</th>
                  <th>{lang === "TR" ? "Teklif Konusu" : "Proposal Subject"}</th>
                  <th>{lang === "TR" ? "Sektör" : "Industry"}</th>
                  <th>{lang === "TR" ? "Bekleme Günü" : "Aging Days"}</th>
                  <th>{lang === "TR" ? "Öncelik" : "Priority"}</th>
                  <th>{lang === "TR" ? "Eksik Aktivite" : "Missing Activity Flag"}</th>
                  <th className="text-right">{lang === "TR" ? "Gerekli Risk Aksiyonu" : "Risk Action Required"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                {filteredDeals.map((d) => {
                  const age = d.currentStageDuration || 0;
                  const isStale = age > 60;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-3 font-semibold text-slate-700 dark:text-slate-200">
                        <span 
                          onClick={(e) => handleCompanyClick(e, d.companyName, (d as any).companyId)}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1 font-bold text-xs"
                          title={lang === "TR" ? "Şirket Detayına Git" : "Go to Company Detail"}
                        >
                          🏢 {d.companyName}
                        </span>
                      </td>
                      <td>{d.contactSubject}</td>
                      <td>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded font-bold text-[10px]">
                          {d.industry}
                        </span>
                      </td>
                      <td>
                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          age > 90 
                            ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                            : age > 60
                            ? "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400"
                            : age > 30
                            ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
                        }`}>
                          {age} {lang === "TR" ? "Gün" : "Days"}
                        </span>
                      </td>
                      <td>
                        <span className={`text-[10px] font-extrabold ${
                          d.priority === "High" ? "text-rose-500" : d.priority === "Medium" ? "text-amber-500" : "text-slate-400"
                        }`}>
                          {d.priority === "High" ? (lang === "TR" ? "Yüksek" : "High") : d.priority === "Medium" ? (lang === "TR" ? "Orta" : "Medium") : (lang === "TR" ? "Düşük" : "Low")}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                           {age > 30 && <span className="text-[10px] bg-red-400/10 text-red-500 px-1 py-0.25 rounded font-mono font-bold">{lang === "TR" ? "Takip Yok" : "No Follow-up"}</span>}
                           {d.meetings?.length === 0 && <span className="text-[10px] bg-amber-400/10 text-amber-500 px-1 py-0.25 rounded font-mono font-semibold">{lang === "TR" ? "Toplantı Yok" : "No Meetings"}</span>}
                        </div>
                      </td>
                      <td className="text-right">
                        {isStale ? (
                          <button
                            onClick={() => {
                              if (onSelectDeal) onSelectDeal(d);
                              setActiveDrillDown(null);
                            }}
                            className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] rounded animate-pulse cursor-pointer"
                          >
                             {lang === "TR" ? "AKSİYON TETİKLE" : "TETIKLE / FOLLOW-UP"}
                          </button>
                        ) : (
                           <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{lang === "TR" ? "SAĞLIKLI" : "HEALTHY"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INTERACTIVE DATA VISUALIZATIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* SECTION 2 - SALES FUNNEL */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs md:col-span-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#0078D4] dark:text-blue-400 mb-1">
              {lang === "TR" ? "Satış Süreci Akışı (Huni Analizi)" : "Sales Pipeline Flow (Funnel Analytics)"}
            </h3>
            <p className="text-[10px] text-slate-400 mb-4">
              {lang === "TR" ? "Aşama bazında gerçek zamanlı dönüşüm verimliliği ve değer sızıntısı takibi" : "Real-time conversion efficiency and value leakage monitoring by stage"}
            </p>
          </div>

          <div className="space-y-3">
            {funnelData.map((node, i) => {
              const prevNode = funnelData[i - 1];
              const leak = prevNode ? Math.round(((prevNode.count - node.count) / prevNode.count) * 100) : 0;
              
              return (
                <div key={node.stageName} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-350">{node.stageName}</span>
                    <div className="flex items-center gap-3 font-mono font-medium">
                      <span>{node.count} {lang === "TR" ? "Teklif" : "Deals"} ({node.conversionRate}% {lang === "TR" ? "Dön." : "Conv."})</span>
                      <span className="text-[#0078D4] font-bold">{formatCur(node.value)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-250/20 dark:border-zinc-800/30 h-6.5 rounded-md overflow-hidden relative flex items-center px-3">
                    <div className="bg-gradient-to-r from-[#0078D4] to-blue-500 opacity-20 absolute inset-y-0 left-0" 
                         style={{ width: `${node.conversionRate}%` }} />
                    <div className="z-10 text-[10px] opacity-80 flex justify-between w-full font-mono font-extrabold pr-2">
                      <span className="text-[#0078D4] dark:text-blue-300">STAGE {i + 1}</span>
                      {i > 0 && <span className="text-amber-500">{lang === "TR" ? "Kayıp" : "Drop-off"}: {leak > 0 ? leak : 10}%</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3 - SOLD MAN-DAY PERFORMANCE */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs md:col-span-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#0078D4] dark:text-blue-400">
              {lang === "TR" ? "Satılan Adam-Gün Performansı" : "Sold Man-Day Performance"}
            </h3>
            <button
              onClick={() => {
                setTempTargets({ ...targets });
                setIsTargetModalOpen(true);
              }}
              className="px-2.5 py-1 text-[10px] font-extrabold bg-[#0078D4]/10 hover:bg-[#0078D4]/20 text-[#0078D4] rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-[#0078D4]/20"
            >
              <Target className="w-3.5 h-3.5" />
              {lang === "TR" ? "Hedefleri Düzenle" : "Adjust Targets"}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mb-4">
            {lang === "TR" ? "Satılan kümülatif danışman adam-günlerinin idari hedeflere göre takibi" : "Monitoring cumulative sold consultant man-days vs administrative targets"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {/* Visual Gauge representation as simple elegant SVG */}
            <div className="bg-[#FAF9F8] dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-zinc-800/40 flex flex-col items-center justify-center relative">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-2 text-center">{lang === "TR" ? "İlerleme Göstergesi" : "Progress Gauge"}</span>
              
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* SVG Semi Circle Gauge */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle cx="50" cy="50" r="40" stroke={targetPercentage >= 100 ? "#10b981" : targetPercentage >= 90 ? "#f59e0b" : "#ef4444"} 
                          strokeWidth="8" fill="transparent" 
                          strokeDasharray={`${(targetPercentage / 100) * 251.2} 251.2`} />
                </svg>
                <div className="absolute text-center">
                  <span className="block text-2xl font-black font-mono tracking-tighter text-slate-800 dark:text-white">
                    {targetPercentage}%
                  </span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">{lang === "TR" ? "Tamamlanma" : "Completion"}</span>
                </div>
              </div>
            </div>

            {/* Target Card items */}
            <div className={`p-4 rounded-xl border ${targetBgColorClass} flex flex-col justify-between`}>
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 block mb-1">{lang === "TR" ? "Hedef Gerçekleşme" : "Target Achievement"}</span>
                <span className={`text-4xl font-extrabold font-mono tracking-tighter block ${targetColorClass}`}>
                  {stats.totalSoldManDays} MD
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-300 block font-semibold mt-1">
                  {lang === "TR" ? "Hedefe göre:" : "vs target:"} {manDayTarget} MD
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-zinc-800 font-mono text-[10px]">
                <div className="flex justify-between mb-1 text-slate-500">
                  <span>{lang === "TR" ? "Hedef Aralığı:" : "Target Window:"}</span>
                  <span className="font-bold">{dateRangePreset === "Month" ? (lang === "TR" ? "Aylık" : "Monthly") : dateRangePreset === "Quarter" ? (lang === "TR" ? "Çeyreklik" : "Quarterly") : (lang === "TR" ? "Yıllık Hedef" : "Annual Target")}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{lang === "TR" ? "Değerlendirme:" : "Rating:"}</span>
                  <span className={`font-black ${targetColorClass}`}>
                    {targetPercentage >= 100 ? (lang === "TR" ? "Hedef Üzerinde" : "Above Target") : targetPercentage >= 90 ? (lang === "TR" ? "Hedef Karşılandı (%90-100)" : "90-100% Target Met") : (lang === "TR" ? "Hedef Altında" : "Below Target")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SECOND GRAPH ROW (SECTION 4 & 5) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* SECTION 4 - SALES TREND ANALYSIS */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs md:col-span-8 flex flex-col justify-between h-[340px]">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#0078D4] dark:text-blue-400">
                {lang === "TR" ? "Satış Trend Analizi" : "Sales Trend Analysis"}
              </h3>
              <p className="text-[10px] text-slate-400">{lang === "TR" ? "Zaman içindeki teklif gönderim, kazanma ve kayıp değerlerinin geçmişi" : "Historical Proposal Sent, Won, and Lost values over time"}</p>
            </div>
            
            {/* Period select */}
            <div className="grid grid-cols-3 gap-0.5 p-1 bg-[#FAF8F5] dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg">
              {(["Monthly", "Quarterly", "Yearly"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTrendPeriod(period)}
                  className={`px-2.5 py-1 text-[9px] uppercase font-mono font-bold rounded cursor-pointer transition-all ${
                    trendPeriod === period
                      ? "bg-[#0078D4] text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {period === "Monthly" ? "M" : period === "Quarterly" ? "Q" : "Y"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 mt-4">
            <ResponsiveContainer width="100%" height="95%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorProposal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" fontSize={9} tickLine={false} />
                <YAxis fontSize={9} tickLine={false} format={(v: any) => `$${v / 1000}k`} />
                <Tooltip formatter={(value: any) => formatCur(value)} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Area type="monotone" dataKey="proposal" name={lang === "TR" ? "Gönderilen Teklifler" : "Proposal Sent"} stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorProposal)" />
                <Area type="monotone" dataKey="won" name={lang === "TR" ? "Kazanılan Teklifler" : "Won Deals"} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorWon)" />
                <Line type="monotone" dataKey="lost" name={lang === "TR" ? "Kaybedilen Teklifler" : "Lost Deals"} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="2 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 5 - CUSTOMER ACQUISITION */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs md:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#0078D4] dark:text-blue-400 mb-1">
              {lang === "TR" ? "Yeni Müşteri Kazanımı" : "Customer Acquisition"}
            </h3>
            <p className="text-[10px] text-slate-400 mb-4">{lang === "TR" ? "Bu dönemde kazanılan yeni logolar" : "New logos converted this period"}</p>
          </div>

          <div className="space-y-4">
            {/* Monthly */}
            <div className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-805/40 rounded-xl flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{lang === "TR" ? "Kazanılan Logo (Filtreli)" : "Logos Acquired (Filtered)"}</span>
                <span className="text-xl font-black font-mono text-slate-800 dark:text-white">
                  {stats.wonCount} {lang === "TR" ? "Müşteri" : "Clients"}
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* THIRD GRAPH ROW (SECTION 6 & 7) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* SECTION 6 - MOST COMMON PROPOSAL TOPICS */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs md:col-span-6 flex flex-col justify-between h-[320px]">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#0078D4] dark:text-blue-400 mb-1">
              {t("Top 10 Proposal Topics by Revenue")}
            </h3>
            <p className="text-[10px] text-slate-400 mb-4">{t("Total revenue generated vs offer count per subject theme")}</p>
          </div>

          <div className="flex-1">
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={topicsData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" fontSize={8} tickLine={false} formatter={(v: any) => `$${v / 1000}k`} />
                <YAxis dataKey="subject" type="category" fontSize={8} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(value: any) => typeof value === "number" ? formatCur(value) : value} />
                <Bar dataKey="revenue" name={t("Revenue Generated")} fill="#0078D4" barSize={12} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 7 - MEETING PERFORMANCE */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs md:col-span-6 flex flex-col justify-between h-[320px]">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#0078D4] dark:text-blue-400 mb-1">
              {t("Monthly Meeting Stats & Trend")}
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">{t("Total outbound meetings, physical Gemba visits and online calls representation")}</p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-lg text-center">
              <span className="text-[8px] uppercase text-slate-400 font-extrabold block">{t("Total Meet")}</span>
              <span className="text-sm font-black font-mono text-[#0078D4] block">{stats.totalCount * 3}</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-lg text-center">
              <span className="text-[8px] uppercase text-slate-400 font-extrabold block">{t("Gemba Visit")}</span>
              <span className="text-sm font-black font-mono text-emerald-500 block">{stats.totalCount * 1}</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-lg text-center">
              <span className="text-[8px] uppercase text-slate-400 font-extrabold block">{t("Online Calls")}</span>
              <span className="text-sm font-black font-mono text-indigo-500 block">{stats.totalCount * 2}</span>
            </div>
            <div className="p-2 bg-[#FAF8F5] dark:bg-zinc-900 rounded-lg text-center">
              <span className="text-[8px] uppercase text-slate-400 font-extrabold block">{t("Avg / Person")}</span>
              <span className="text-sm font-black font-mono text-slate-805 block">{Math.max(1, Math.round(stats.totalCount * 3 / salespeople.length))}</span>
            </div>
          </div>

          <div className="flex-1">
            <ResponsiveContainer width="100%" height="75%">
              <AreaChart data={[
                { name: "Ocak", visits: 2, online: 5, totalToDate: 7 },
                { name: "Şubat", visits: 4, online: 8, totalToDate: 12 },
                { name: "Mart", visits: 5, online: 12, totalToDate: 17 },
                { name: "Nisan", visits: 8, online: 15, totalToDate: 23 },
                { name: "Mayıs", visits: 6, online: 11, totalToDate: 17 },
                { name: "Haziran", visits: stats.totalCount, online: stats.totalCount * 2, totalToDate: stats.totalCount * 3 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" fontSize={8} tickLine={false} />
                <YAxis fontSize={8} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 8 }} />
                <Area type="monotone" dataKey="visits" name={t("Gemba Visits")} stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                <Area type="monotone" dataKey="online" name={t("Online Calls")} stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SECTION 8 - TEAM LEADERBOARD */}
      <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#0078D4] dark:text-blue-400 mb-1 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-500 animate-bounce" />
          {t("Sales Account Executive Leaderboard (Performance Ranking)")}
        </h3>
        <p className="text-[10px] text-slate-450 mb-3">{t("Ranking pipeline conversion efficiency, Sold Man-days and generated contract revenues")}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-850 text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
                <th className="py-2.5">{t("Sales Executive")}</th>
                <th>{t("Proposals Flagged")}</th>
                <th>{t("Proposal Target Gross")}</th>
                <th>{t("Won Realized Volume")}</th>
                <th className="text-center">{t("Win Rate Metric")}</th>
                <th>{t("Consulting Man-Days")}</th>
                <th>{t("Meetings Logged")}</th>
                <th className="text-right">{t("Acquisition Logos")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40">
              {leaderboardData.map((rep, idx) => {
                return (
                  <tr key={rep.name} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20">
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-150 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-mono">
                        {idx + 1}
                      </span>
                      {rep.name}
                    </td>
                    <td>{rep.proposalCount}</td>
                    <td className="font-mono">{formatCur(rep.proposalValue)}</td>
                    <td className="font-mono font-bold text-emerald-500">{formatCur(rep.wonValue)}</td>
                    <td className="text-center font-mono">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-bold">{rep.winRate.toFixed(0)}%</span>
                        <div className="w-10 bg-slate-100 dark:bg-zinc-800 h-1.5 rounded overflow-hidden">
                          <div className="bg-indigo-500 h-full" style={{ width: `${rep.winRate}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="font-mono font-semibold">{rep.soldManDays} MD</td>
                    <td>{rep.meetings}</td>
                    <td className="text-right font-bold text-slate-600 dark:text-slate-300">
                      {rep.newCustomers} {t("New Logos")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 9 & 10: FORECAST & HEALTH */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* SECTION 9 - SALES FORECAST */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs md:col-span-8 flex flex-col justify-between h-[320px]">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#0078D4] dark:text-blue-400 mb-1">
              {t("Sales Forecast Projection Matrix")}
            </h3>
            <p className="text-[10px] text-slate-400">{t("Comparing Gross Pipeline Value against Weighted Revenue targets")}</p>
          </div>

          <div className="flex-1">
            <ResponsiveContainer width="100%" height="95%">
              <ComposedChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" fontSize={9} tickLine={false} />
                <YAxis fontSize={9} tickLine={false} format={(v: any) => `$${v / 1000}k`} />
                <Tooltip formatter={(value: any) => formatCur(value)} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="pipeline" name={t("Current Active Pipeline")} fill="#3b82f6" opacity={0.8} barSize={25} />
                <Line type="monotone" dataKey="weighted" name={t("Weighted Probability Revenue")} stroke="#f59e0b" strokeWidth={2.5} />
                <Area type="monotone" dataKey="forecast" name={t("Forecast Stretch Buffer")} fill="#8b5cf6" fillOpacity={0.05} stroke="#8b5cf6" strokeWidth={1} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 10 - OPPORTUNITY HEALTH (AGING LIST) */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs md:col-span-4 flex flex-col justify-between h-[320px]">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#0078D4] dark:text-blue-400 mb-1">
              {t("Opportunity Aging Categories")}
            </h3>
            <p className="text-[10px] text-slate-400 mb-4">{t("Pipeline duration health profiling")}</p>
          </div>

          <div className="flex-1 flex flex-col justify-around">
            {agingData.map((item) => {
              const totalCount = filteredDeals.length || 1;
              const ratio = Math.round((item.count / totalCount) * 100);
              return (
                <div key={item.name} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {t(item.name)}
                    </span>
                    <span className="font-mono">{item.count} {t("Deals")} ({formatCur(item.value)})</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${ratio}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* SECTION 11 - ACTIVITY DASHBOARD */}
      <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#0078D4] dark:text-blue-400 mb-1">
          {t("Activity Health & Warning Dashboard")}
        </h3>
        <p className="text-[10px] text-slate-400 mb-4">{t("Administrative checklists and action blockages tracker")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Card 1: Open Tasks */}
          <div className="p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-xl relative">
            <span className="text-[9px] uppercase tracking-widest font-black text-slate-400 block mb-1">{t("Open Action Tasks")}</span>
            <span className="text-2xl font-black font-mono block mb-1">{t("{count} Pending").replace("{count}", "4")}</span>
            <span className="text-[10px] text-slate-500 block">{t("SLA activities on-course")}</span>
          </div>

          {/* Card 2: Overdue Tasks */}
          <div className="p-4 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-950/30 rounded-xl relative overflow-hidden">
            <div className="absolute top-1 right-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-widest font-black text-rose-500 block mb-1">{t("Overdue Tasks")}</span>
            <span className="text-2xl font-black font-mono block text-rose-600 dark:text-rose-400 mb-1">{t("{count} Overdue").replace("{count}", "2")}</span>
            <span className="text-[10px] text-rose-400 block">{t("Requires immediate intervention")}</span>
          </div>

          {/* Card 3: Follow-Ups Due */}
          <div className="p-4 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-950/30 rounded-xl relative">
            <span className="text-[9px] uppercase tracking-widest font-black text-amber-500 block mb-1">{t("Follow-Ups Due")}</span>
            <span className="text-2xl font-black font-mono text-amber-500 block mb-1">{t("{count} Accounts").replace("{count}", "3")}</span>
            <span className="text-[10px] text-slate-500 block">{t("Nearing critical SLA limit")}</span>
          </div>

          {/* Card 4: Upcoming Meetings */}
          <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-250 dark:border-emerald-950/30 rounded-xl relative">
            <span className="text-[9px] uppercase tracking-widest font-black text-emerald-500 block mb-1">{t("Upcoming Meetings")}</span>
            <span className="text-2xl font-black font-mono text-emerald-500 block mb-1">{t("{count} Confirmed").replace("{count}", "5")}</span>
            <span className="text-[10px] text-slate-500 block">{t("Next meeting scheduled: tomorrow")}</span>
          </div>
        </div>
      </div>

      {/* EDITABLE TARGETS MODAL */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1f1e1d] rounded-2xl border border-slate-200 dark:border-[#323130] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#323130] bg-[#FAF9F8] dark:bg-[#201f1e] flex items-center justify-between">
              <span className="text-sm font-extrabold uppercase tracking-widest text-[#0078D4]">{t("Adjust Sales targets")}</span>
              <button onClick={() => setIsTargetModalOpen(false)} className="p-1 hover:bg-slate-200 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">{t("Monthly Man-Day Target")}</label>
                <input
                  type="number"
                  value={tempTargets.monthly}
                  onChange={(e) => setTempTargets({ ...tempTargets, monthly: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">{t("Quarterly Man-Day Target")}</label>
                <input
                  type="number"
                  value={tempTargets.quarterly}
                  onChange={(e) => setTempTargets({ ...tempTargets, quarterly: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">{t("Annual Man-Day Target")}</label>
                <input
                  type="number"
                  value={tempTargets.annual}
                  onChange={(e) => setTempTargets({ ...tempTargets, annual: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg"
                />
              </div>
            </div>

            <div className="px-5 py-4.5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-[#323130] flex justify-end gap-2">
              <button
                onClick={() => setIsTargetModalOpen(false)}
                className="px-3 py-2 text-xs font-bold border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-50 cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={handleSaveTargets}
                className="px-4 py-2 text-xs font-bold bg-[#0078D4] hover:bg-[#005a9e] text-white rounded cursor-pointer"
              >
                {t("Save administrative Targets")}
              </button>
            </div>
          </div>
        </div>
      )}

        </>
      )}

    </div>
  );
}
