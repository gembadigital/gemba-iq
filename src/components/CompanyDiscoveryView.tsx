import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { CrmDb } from "../lib/CrmDb";
import {
  Search,
  Building,
  Globe,
  MapPin,
  Phone,
  Linkedin,
  Plus,
  Check,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
  Users,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
  Trash2,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  Briefcase,
  Sliders,
  Send,
  Workflow,
  HelpCircle,
  Eye,
  UserCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";

import { Company } from "./CompaniesView";
import { TargetAccount, Recipient } from "../types";

// Standard OPEX services definitions
const RECOMMENDED_SERVICES_LIST = [
  "Lean Manufacturing",
  "OEE",
  "Kaizen",
  "Layout",
  "OPEX",
  "Capacity Planning",
  "TPM",
  "Industrial Engineering"
];

export default function CompanyDiscoveryView() {
  const { lang, t } = useLanguage();
  // --- STATE FOR DISCOVERY DATA & PERSISTED LISTS ---
  const [discoveryDb, setDiscoveryDb] = useState<any[]>(() =>
    CrmDb.getKv<any[]>("crm_discovery_db", [])
  );

  // NOTE: must match the "crm_target_accounts" key used by TargetAccountsView.tsx,
  // LeadProfilesView.tsx and AISalesAssistant.tsx, otherwise records diverge across screens.
  const [targetAccounts, setTargetAccounts] = useState<TargetAccount[]>(() =>
    CrmDb.getKv<TargetAccount[]>("crm_target_accounts", [])
  );

  const [wonCompanies, setWonCompanies] = useState<Company[]>(() => CrmDb.getCompanies());

  useEffect(() => {
    CrmDb.setKv("crm_discovery_db", discoveryDb);
  }, [discoveryDb]);

  useEffect(() => {
    CrmDb.setKv("crm_target_accounts", targetAccounts);
  }, [targetAccounts]);

  useEffect(() => {
    CrmDb.saveCompanies(wonCompanies);
  }, [wonCompanies]);

  // --- SUB TABS ---
  // "search" (Company Search Engine + results)
  // "pipeline" (Kanban Stage Management)
  // "dashboard" (Power BI Analytics Dashboard)
  // "campaign-builder" (Bulk outreach planner & Call sheet)
  const [currentTab, setCurrentTab] = useState<"search" | "pipeline" | "dashboard" | "campaign-builder">("search");

  // Custom stylish delete confirmation state
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
    title?: string;
    message?: string;
  }>({ isOpen: false, onConfirm: () => {} });

  // --- SEARCH ENGINE STATES ---
  const [searchName, setSearchName] = useState("");
  const [searchIndustry, setSearchIndustry] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchRegion, setSearchRegion] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");

  // Grid/List result mode
  const [resultsLayout, setResultsLayout] = useState<"grid" | "table">("grid");

  // Selection state
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);

  // Detailed Modal/Drawer Side Panel
  const [detailCompany, setDetailCompany] = useState<any | null>(null);

  // AI analysis dynamic state
  const [aiReport, setAiReport] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Dynamic Generator via AI (Generates 5 matching companies from prompt context)
  const [aiGeneratorInput, setAiGeneratorInput] = useState("");
  const [isAiGeneratingList, setIsAiGeneratingList] = useState(false);
  const [aiGeneratorSuccess, setAiGeneratorSuccess] = useState("");
  const [aiGeneratorError, setAiGeneratorError] = useState("");

  // --- GOOGLE SEARCH SIMULATION STATES ---
  const [googleQuery, setGoogleQuery] = useState("");
  const [googleSearchResults, setGoogleSearchResults] = useState<any[]>([]);
  const [googleSearching, setGoogleSearching] = useState(false);
  const [googleSearchedTerm, setGoogleSearchedTerm] = useState("");
  const [googleSearchError, setGoogleSearchError] = useState("");
  const [googleSearchSources, setGoogleSearchSources] = useState<{ title: string; uri: string }[]>([]);
  const [searchTime, setSearchTime] = useState(0.12);

  // Toast Alerts State
  const [toast, setToast] = useState<{ msg: string; type: "success" | "danger" | "info" } | null>(null);

  // Assign Salesperson variables
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSalesperson, setSelectedSalesperson] = useState("Atakan Zehir");

  // Campaign creation variables
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [newCampaignTitle, setNewCampaignTitle] = useState("OpEx Giriş Kampanyası -" + new Date().toLocaleDateString("tr-TR"));

  // Call list variables
  const [callListLogs, setCallListLogs] = useState<{ [id: string]: "idle" | "called" | "no-answer" | "interested" }>({});

  const showToast = (msg: string, type: "success" | "danger" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- INTEGRATED DYNAMIC SCORING (Target Score & Matches) ---
  const computeCompanyProfile = (c: any) => {
    // Generate static scoring heuristics based on attributes
    let score = 50;

    // Automotive & Machinery get high target scores (extremely prime targets for OPEX/Lean)
    if (c.industry === "Automotive") score += 25;
    if (c.industry === "Machinery") score += 20;
    if (c.industry === "Electronics") score += 15;
    if (c.industry === "Metallurgy") score += 15;

    // Big factories have higher priority
    if (c.size?.includes("750+")) score += 15;
    else if (c.size?.includes("250-500")) score += 10;
    else if (c.size?.includes("100-250")) score += 5;

    // Digital infrastructure rating
    if (c.digitalInfrastructure?.toLowerCase().includes("excel")) score += 10; // High gap = Prime target!
    if (c.digitalInfrastructure?.toLowerCase().includes("logo") || c.digitalInfrastructure?.toLowerCase().includes("klasik")) score += 5;

    // Limit score max 100
    score = Math.min(score, 98);

    // Recommended Services Heuristic Logic
    const recommendedServices: string[] = [];
    const desc = (c.description + " " + c.notes + " " + c.industry).toLowerCase();

    if (desc.includes("seri") || desc.includes("montaj") || desc.includes("lean") || desc.includes("üretim")) {
      recommendedServices.push("Lean Manufacturing");
    }
    if (desc.includes("verim") || desc.includes("duruş") || desc.includes("oee") || desc.includes("pres") || desc.includes(" cnc")) {
      recommendedServices.push("OEE");
      recommendedServices.push("TPM");
    }
    if (desc.includes("darboğaz") || desc.includes("vsm") || desc.includes("kayıp") || desc.includes("fire")) {
      recommendedServices.push("Kaizen");
      recommendedServices.push("OPEX");
    }
    if (desc.includes("düzen") || desc.includes("hücre") || desc.includes("layout") || desc.includes("yerleşim")) {
      recommendedServices.push("Layout");
    }
    if (desc.includes("kapasite") || desc.includes("silolu") || desc.includes("hat dengeleme")) {
      recommendedServices.push("Capacity Planning");
    }
    if (desc.includes("metot") || desc.includes("teknik") || desc.includes("üretim") || desc.includes("işçilik")) {
      recommendedServices.push("Industrial Engineering");
    }

    // Default ensure at least some
    if (recommendedServices.length === 0) {
      recommendedServices.push("OPEX", "Kaizen");
    }

    // Recommended First-Contact Strategy
    let outreachStrategy = "Telefon ile aranıp Tanıtım Gemba yürüyüşü talep edilecek.";
    if (c.industry === "Automotive") {
      outreachStrategy = "Bursa ve Kocaeli OEM referansları sunulup, Pres Odası SMED/Kalıp Ayar optimizasyonu odaklı teknik toplantı teklif edin.";
    } else if (c.industry === "Machinery") {
      outreachStrategy = "CNC Operasyonlarında OEE İzleme, duruş analizi ve atölye hücresel montaj mizan yerleşimi (Layout) sunumu paylaşın.";
    } else if (c.industry === "Electronics") {
      outreachStrategy = "Yüksek hızlı SMD hatlarında dizgi optimizasyonu ve montaj bantlarında Yamazumi operasyon analiz çalışmasını teklif edin.";
    } else if (c.industry === "Textile") {
      outreachStrategy = "Dokuma tezgahlarının hazırlık (set-up) israfları ve 5S vizyon atölyesiyle ilk işbirlik basamağını başlatın.";
    } else if (c.industry === "Food") {
      outreachStrategy = "Sürekli akışlı paketleme hatlarında OEE artış programı ve kayıp-maliyet analizi teklif edin.";
    }

    return {
      score,
      recommendedServices,
      outreachStrategy,
      classification: `${c.industry} - Endüstri 4.4 Olgunluğu Mapped`
    };
  };

  // --- SEARCH ENGINE INTERACTIVE CHIPS & KEYWORDS ---
  const handleChipClick = (term: string, type: "zone" | "industry" | "city") => {
    // Reset other fields to draw clear matching results
    setSearchName("");
    setSearchIndustry("");
    setSearchCity("");
    setSearchRegion("");
    setSearchKeywords("");

    if (type === "zone") {
      setSearchKeywords(term);
    } else if (type === "industry") {
      setSearchIndustry(term);
    } else if (type === "city") {
      setSearchCity(term);
    }
    showToast(`Filtre uygulandı: "${term}"`, "info");
  };

  // --- QUERY FILTER LOGIC ---
  const filteredResults = useMemo(() => {
    return discoveryDb.filter(c => {
      const matchName = !searchName || c.name.toLowerCase().includes(searchName.toLowerCase());
      const matchInd = !searchIndustry || c.industry.toLowerCase().includes(searchIndustry.toLowerCase());
      const matchCity = !searchCity || c.city.toLowerCase().includes(searchCity.toLowerCase());
      const matchReg = !searchRegion || c.region.toLowerCase().includes(searchRegion.toLowerCase());
      
      const kw = searchKeywords.toLowerCase();
      const matchKw = !searchKeywords || 
        c.zone?.toLowerCase().includes(kw) ||
        c.description?.toLowerCase().includes(kw) ||
        c.notes?.toLowerCase().includes(kw) ||
        c.name?.toLowerCase().includes(kw) ||
        c.industry?.toLowerCase().includes(kw);

      return matchName && matchInd && matchCity && matchReg && matchKw;
    });
  }, [discoveryDb, searchName, searchIndustry, searchCity, searchRegion, searchKeywords]);

  // --- TARGET ACCOUNTS STATUS STAGES DEFINITION ---
  const PIPELINE_STAGES = [
    "Research",
    "Contact Planned",
    "Contacted",
    "Meeting Scheduled",
    "Opportunity Created",
    "Proposal Sent",
    "Won",
    "Lost"
  ];

  // Target Accounts by pipeline stage grouping
  const accountsByStage = useMemo(() => {
    const accs = targetAccounts;
    const map: { [stage: string]: TargetAccount[] } = {};
    PIPELINE_STAGES.forEach(st => {
      map[st] = [];
    });

    accs.forEach(a => {
      // Mapping leadStatus or default to Research
      const stage = a.leadStatus || "Research";
      if (map[stage]) {
        map[stage].push(a);
      } else {
        // Fallback fallback mappings
        if (PIPELINE_STAGES.includes(stage)) {
          map[stage] = map[stage] || [];
          map[stage].push(a);
        } else {
          map["Research"].push(a);
        }
      }
    });

    return map;
  }, [targetAccounts]);

  // --- CONVERSION & PIPELINE METRICS ---
  const pipelineMetrics = useMemo(() => {
    const accs = targetAccounts;
    const total = accs.length;
    const highPotential = accs.filter(a => (a.riskScore || 50) > 80).length;
    
    // Conversion funnel calculations: counts / percentage
    // Opportunity created + proposal sent + won are considered opportunity conversions
    const convertedCount = accs.filter(a => 
      ["Opportunity Created", "Proposal Sent", "Won"].includes(a.leadStatus || "")
    ).length;

    const wonCount = accs.filter(a => a.leadStatus === "Won").length;
    const lostCount = accs.filter(a => a.leadStatus === "Lost").length;

    // Industries distribution
    const industriesMap: { [ind: string]: number } = {};
    accs.forEach(a => {
      const ind = a.industryTag || "Other";
      industriesMap[ind] = (industriesMap[ind] || 0) + 1;
    });
    const industriesData = Object.entries(industriesMap).map(([name, value]) => ({ name, value }));

    // Region distribution
    const regionsMap: { [reg: string]: number } = {};
    accs.forEach(a => {
      const reg = a.locationMain?.split("/")[0]?.trim() || "Diğer Bilinmeyen";
      regionsMap[reg] = (regionsMap[reg] || 0) + 1;
    });
    const regionsData = Object.entries(regionsMap).map(([name, value]) => ({ name, value }));

    return {
      total,
      highPotential,
      conversionPct: total > 0 ? (convertedCount / total) * 100 : 0,
      wonPct: total > 0 ? (wonCount / total) * 100 : 0,
      convertedCount,
      wonCount,
      lostCount,
      industriesData,
      regionsData
    };
  }, [targetAccounts]);

  // --- ACTIONS: SINGLE CLICK ADDERS ---
  const handleAddToTargetAccounts = (item: any, initialStage: string = "Research") => {
    // Check if duplicate
    const isDup = targetAccounts.some(ta => ta.companyName.toLowerCase() === item.name.toLowerCase());
    if (isDup) {
      showToast(`"${item.name}" zaten Hedef Hesaplar listesinde yer alıyor!`, "info");
      return;
    }

    const cp = computeCompanyProfile(item);

    const newTarget: TargetAccount = {
      id: "ta-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      companyName: item.name,
      websiteUrl: item.website,
      industryTag: item.industry,
      companySize: item.size || "100-250 Çalışan",
      locationMain: `${item.city} / ${item.region}`,
      aiAnalysisSummary: `Hedef Puanı: %${cp.score}. Önerilen Servisler: ${cp.recommendedServices.join(", ")}. İlk Temas Stratejisi: ${cp.outreachStrategy}`,
      draftTemplates: `İlk temas e-postası taslağı oluşturuldu. Kampanya panelinden iletebilirsiniz.`,
      analysisSource: "Company Discovery Search Module",
      analysisDate: new Date().toISOString(),
      riskScore: cp.score,
      rawOutput: `${item.description}\n\nNotlar:\n${item.notes}\n\nSektör: ${item.industry}\nŞehir: ${item.city}\nÇalışan Sayısı: ${item.size}`,
      contactName: "Satın Alma Müdürü",
      contactSurname: "",
      contactEmail: `info@${item.website}`,
      department: "Üretim / Tedarik Zinciri",
      leadStatus: initialStage,
      leadSegment: cp.score > 80 ? "Hot" : "Warm",
      customField1: "Atakan Zehir" // Sales assigned by default
    };

    setTargetAccounts(prev => [newTarget, ...prev]);
    showToast(`"${item.name}" Hedef Hesaplara başarıyla eklendi (Aşama: ${initialStage})!`, "success");
  };

  const handleAddToCompanies = (item: any) => {
    const isDup = wonCompanies.some(wc => wc.name.toLowerCase() === item.name.toLowerCase());
    if (isDup) {
      showToast(`"${item.name}" zaten Müşteriler (Companies) listesinde kayıtlı!`, "info");
      return;
    }

    const newCompany: Company = {
      id: "wc-" + Date.now(),
      accountOwner: "Atakan Zehir",
      name: item.name,
      phone: item.phone || "+90 (500) 000 0000",
      website: item.website,
      customerStatus: "Prospect Customer",
      description: item.description,
      billingAddress: item.address || `${item.city} OSB`,
      billingCity: item.city,
      billingDistrict: item.zone || "",
      billingCountry: "Türkiye",
      billingPostalCode: "34000",
      industry: item.industry,
      employeeCount: parseInt(item.size?.replace(/\D/g, "")) || 150,
      subIndustry: "General Industrial",
      shift: "2 Shifts",
      managementTeam: "Genel Müdür",
      annualRevenue: "5,000,000",
      annualRevenueCurrency: "$",
      productionType: item.productionType || "Discrete",
      squareMeter: "10,000",
      digitalInfrastructure: item.digitalInfrastructure || "ERP"
    };

    setWonCompanies(prev => [newCompany, ...prev]);
    showToast(`"${item.name}" Müşteriler (Companies) veri tabanına Prospect olarak eklendi!`, "success");
  };

  // --- AI RUN DEEP ANALYSIS (GEMINI API CONNECTIVITY) ---
  const handlePerformAiAnalysis = async (company: any) => {
    setIsAiLoading(true);
    setAiReport("");
    showToast(`${company.name} için derin yapay zeka pazar analizi başlatıldı...`, "info");

    try {
      const res = await fetch("/api/gemini/analyze-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyInput: `${company.name}. Web sitesi: ${company.website}. Sektör: ${company.industry}. Adres: ${company.address || ""}. Bulunduğu sanayi havzası: ${company.zone || ""}.`,
          deepResearchMode: true
        })
      });

      const data = await res.json();
      if (data.success) {
        setAiReport(data.analysis || data.rawOutput || "");
        showToast("Gemini AI derecelendirme & fırsat analizi tamamlandı!", "success");
      } else {
        throw new Error(data.error || "Beklenmeyen API hatası");
      }
    } catch (err: any) {
      console.error(err);
      // Construct elegant custom-informed fallback from local profiling
      const cp = computeCompanyProfile(company);
      const fallbackReport = `
# Şirket Özeti (Gemini Yerel Profiler Raporu)
**Firma Adı:** ${company.name}
**Ana Faaliyet Sektörü:** ${company.industry}
**Hizmet Sunulan Havza:** ${company.zone || company.city}
**Çalışan Ölçeği:** ${company.size}
**Sektörel İnceleme:** ${company.description}

# Suggested Decision Makers
- **Tier 1 (Karar Verici):** Genel Müdür / CEO / Yönetim Kurulu Üyesi
- **Tier 2 (Süreç Sahibi):** Operasyonel Mükemmellik Direktörü, Üretim Müdürü, Endüstri Mühendisliği Şefi
- **Tier 3 (Destekleyici):** Bakım Müdürü, Tedarik Zinciri Müdürü, Kalite Güvence Müdürü

# Şirket Finansal Analizi
## Financial Snapshot
- Yaklaşık Ciro Segmenti: ${company.revenue || "NOT FOUND - Yerinde inceleme gereklidir."}
- EBITDA Marj Tahmini: %12-18 (Endüstriyel Üretim Sektör Normu)
- Yatırım Bütçesi Trendi: Pozitif (Otomasyon ve Verimlilik Artışı Odaklı)

## Key Observation
Mevcut dijital altyapının **"${company.digitalInfrastructure || "Sınırlı takip"}"** olması, manuel operasyonel yönetim israflarının yüksek olabileceğini göstermektedir. Excel odaklı takip mekanizmaları, veri gecikmesi ve raporlamada tutarsızlıklara yol açmaktadır.

## Potential Consulting Opportunities
- **5S ve İşyeri Düzeni Atölyesi:** Görsel yönetim standartlarının kaybolmasını engellemek amacıyla saptanan israfların önlenmesi.
- **Talaşlı İmalat CNC OEE Seviyelerinin Artırılması:** Makine duruş sürelerinin anlık loglanarak darboğazların temizlenmesi.
- **Değer Akış Haritalama (VSM):** Fabrika içi hammadde girişinden sevkiyata kadar geçen çevrim (Lead Time) analizinin yapılması.

## Executive Commentary
Firma hakkında detaylı operasyonel veri sınırlı kalmasına karşın bir Operasyonel Mükemmellik (OpEx) uzmanı bakış açısıyla; sahada bizzat bir **Gemba Yürüyüşü (Gözlem)** koordine etmek, prosesteki 8 Büyük İsrafı (**TIMWOODS** - Taşıma, Stok, Hareket, Bekleme, Aşırı Üretim, Aşırı İşleme, Hatalı Üretim, Kullanılmayan İnsan Gücü) listelemek ve yerinde bir Değer Akış Analizi gerçekleştirmek ilk basamak olarak elzemdir.

## Sales Opportunity Summary
- **Hedef Odaklı Çözüm:** Hat Dengeleme (Yamazumi) & Darboğaz Çözümleri.
- **Bütçe Onay Potansiyeli:** Yıllık amortisman kârlılığı hedeflenerek %15 maliyet düşüş vaadi.
- **Yaklaşım Metodu:** İlk temas için benzer sektörel referanslarla Gemba ziyareti gerçekleştirilmesi.

# Recommended Outreach Strategy
E-posta taslağı ve arama planında öncelikli olarak **"Çevrim Süresinin Kısaltılması, Kalitesizlik Maliyetleri (COPQ) Kayıpları ve Hızlı Model Değiştirme (SMED)"** teknik vurguları yapılacaktır.
      `;
      setAiReport(fallbackReport.trim());
      showToast("Tavily/Gemini Bağlantı Kısıtlaması nedeniyle yerel akıllı analiz raporu oluşturuldu.", "info");
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- AI CUSTOM ENGINE GENERATOR FOR NEW REGIONAL SEARCH RECORDS ---
  const handleGenerateCompaniesByAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiGeneratorInput.trim()) return;

    setIsAiGeneratingList(true);
    setAiGeneratorSuccess("");
    setAiGeneratorError("");
    showToast(`Gemini, "${aiGeneratorInput}" için uygun pazar firmalarını araştırıyor...`, "info");

    try {
      // Prompt template to generate structured JSON list of ACTUAL Turkish manufacturing/industrial companies
      const helperPrompt = `You are a professional B2B Industrial Researcher and B2B Data Specialist. 
Search and identify ACTUAL, CURRENT, and VERIFIABLE real manufacturing/industrial companies in Turkey that match the following regional, city, or sector focus: "${aiGeneratorInput}".
If there are no real, existing, and verifiable companies matching this search in Turkey, do NOT predict, invent, estimate, guess, or synthesize any mock or fake companies. Simply return an empty JSON array [].

You must output a raw valid JSON ARRAY strictly matching this structure without any markdown wrap or extra text (do not write \`\`\`json etc.):
[
  {
    "id": "disc-ai-" + some_id,
    "name": "Şirket Adı ve Gerçek Unvanı",
    "website": "example.com.tr",
    "address": "Organize Sanayi Bölgesi...",
    "city": "Sehir",
    "region": "Bolge (Marmara/Ege/Ic Anadolu vb.)",
    "zone": "Sanayi Bolgesi Ismi (orn. Konya OSB, Bursa OSB)",
    "industry": "Automotive" | "Machinery" | "Textile" | "Metallurgy" | "Plastic" | "Food" | "Electronics" | "Other",
    "phone": "+90 (xxx) xxx xxxx",
    "linkedin": "linkedin.com/company/...",
    "size": "100-250 Çalışan" or "250-500 Çalışan" or "750+ Çalışan",
    "description": "Süreçleri ve fabrikayı anlatan 2-3 cümlelik gerçekçi Türkçe teknik açıklama.",
    "revenue": "9,000,000 $",
    "productionType": "Üretim Tipi",
    "digitalInfrastructure": "Scada, Logo, SAP vb.",
    "founded": 2002,
    "notes": "Danışman için özel opex tüyosu"
  }
]`;

      const res = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: helperPrompt })
      });

      const data = await res.json();
      if (data.success && data.response) {
        const textResponse = data.response;
        const cleanedJsonText = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsedArray = JSON.parse(cleanedJsonText);

        if (Array.isArray(parsedArray)) {
          if (parsedArray.length === 0) {
            setAiGeneratorError("Aradığınız kriterlerde doğrulanmış gerçek firma bilgisi kurulamadı. (Tahmini veya tahmini bilgi üretimi kısıtlanmıştır.)");
            showToast("Gerçek firma bilgisi bulunamadı.", "danger");
          } else {
            setDiscoveryDb(prev => [...parsedArray, ...prev]);
            setAiGeneratorSuccess(`Gemini, belirtilen kriterlere uygun ${parsedArray.length} gerçek şirket ekledi!`);
            showToast(`Başarılı! ${parsedArray.length} gerçek şirket sanayi fihristine eklendi.`, "success");
            setAiGeneratorInput("");
          }
        } else {
          throw new Error("Gelen veri dizi formatında değil.");
        }
      } else {
        throw new Error(data.error || "Geliştirici server hatası");
      }
    } catch (err: any) {
      console.error(err);
      setAiDiscoveryErrorHelper();
    } finally {
      setIsAiGeneratingList(false);
    }
  };

  const setAiDiscoveryErrorHelper = () => {
    setAiGeneratorError("Sorgulanan bölge/sektör için doğrulanmış gerçek firma bilgisi alınamadı. (Anayasal/Tahmini veya uydurma bilgi üretilmesi kısıtlanmıştır.)");
    showToast("Gerçek firma bilgisi bulunamadı.", "danger");
  };

  // --- SIMULATED GOOGLE SEARCH ---
  const handleGoogleSearch = async (queryText: string) => {
    if (!queryText || !queryText.trim()) return;

    setGoogleSearching(true);
    setGoogleSearchError("");
    setGoogleSearchSources([]);
    const startTime = Date.now();
    const query = queryText.trim();
    setGoogleSearchedTerm(query);
    showToast(`Google'da aranıyor: "${query}"`, "info");

    try {
      // Real Google Search, grounded via Gemini's google_search tool — no hallucinated
      // companies. See /api/gemini/company-search in server.ts.
      const res = await fetch("/api/gemini/company-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.response) {
        throw new Error(data.error || "Arama isteği başarısız oldu.");
      }

      const cleanedJsonText = String(data.response).replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsedArray = JSON.parse(cleanedJsonText);

      if (!Array.isArray(parsedArray)) {
        throw new Error("Geçersiz yanıt formatı.");
      }

      setGoogleSearchResults(parsedArray);
      setGoogleSearchSources(Array.isArray(data.sources) ? data.sources : []);

      // Auto-integrate with discoveryDb so detail drawers work seamlessly
      setDiscoveryDb(prev => {
        const list = [...prev];
        parsedArray.forEach((newItem: any) => {
          if (newItem?.name && !list.some(x => x.name?.toLowerCase() === newItem.name.toLowerCase())) {
            list.push(newItem);
          }
        });
        return list;
      });
    } catch (err) {
      // Intentionally no fake-data fallback here: showing invented companies as if they
      // were real search results is misleading for a B2B sales tool. Show an honest
      // empty state with the real error instead.
      console.error("Company search failed:", err);
      setGoogleSearchResults([]);
      setGoogleSearchSources([]);
      setGoogleSearchError(
        err instanceof Error && err.message
          ? err.message
          : "Arama başarısız oldu. Lütfen tekrar deneyin."
      );
    } finally {
      const endTime = Date.now();
      const diffSec = parseFloat(((endTime - startTime) / 1000).toFixed(2));
      setSearchTime(diffSec > 0 ? diffSec : 0.16);
      setGoogleSearching(false);
    }
  };

  // --- ACTIONS: BULK ACTIONS IMPLEMENTATION ---
  const handleToggleSelectResult = (id: string) => {
    setSelectedResultIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = () => {
    const ids = filteredResults.map(r => r.id);
    const allSelected = ids.every(id => selectedResultIds.includes(id));
    if (allSelected) {
      setSelectedResultIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedResultIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleBulkAddToTargetAccounts = () => {
    if (selectedResultIds.length === 0) {
      showToast("Lütfen önce listeden en az bir şirket seçin!", "danger");
      return;
    }

    let count = 0;
    selectedResultIds.forEach(id => {
      const match = discoveryDb.find(d => d.id === id);
      if (match) {
        // Add if not already target
        const isAlready = targetAccounts.some(ta => ta.companyName.toLowerCase() === match.name.toLowerCase());
        if (!isAlready) {
          handleAddToTargetAccounts(match, "Research");
          count++;
        }
      }
    });

    setSelectedResultIds([]);
    showToast(`Seçilen ${count} yeni hesap Target Accounts listesine eklendi!`, "success");
  };

  const handleBulkAssignSalesperson = (person: string) => {
    // Modify customField1 (assigned salesperson) for target accounts matching the selected list
    if (selectedResultIds.length === 0) {
      showToast("Lütfen atanacak şirketleri listeden seçin!", "danger");
      return;
    }

    const selectedCompanyNames = discoveryDb
      .filter(d => selectedResultIds.includes(d.id))
      .map(d => d.name.toLowerCase());

    setTargetAccounts(prev => 
      prev.map(ta => 
        selectedCompanyNames.includes(ta.companyName.toLowerCase())
          ? { ...ta, customField1: person }
          : ta
      )
    );

    setSelectedResultIds([]);
    setShowAssignDialog(false);
    showToast(`Seçilen şirketlerin satış sorumlusu "${person}" olarak güncellendi!`, "success");
  };

  const handleBulkCreateCampaign = () => {
    // Generate draft email campaigns grouped by selected companies
    if (selectedResultIds.length === 0) {
      showToast("Kampanya oluşturulacak şirketleri seçin!", "danger");
      return;
    }

    const selectedCompanies = discoveryDb.filter(d => selectedResultIds.includes(d.id));

    // Save as draft campaign in the shared organization CRM store (must match
    // the "crm_email_campaigns" key used by CampaignManagerView.tsx and SendingProgressView.tsx)
    const campaignsList: any[] = CrmDb.getKv<any[]>("crm_email_campaigns", []);

    const newCampaignId = "camp-disc-" + Date.now();
    const newCampaignRecipients: Recipient[] = selectedCompanies.map((c, idx) => ({
      id: `rec-disc-${idx}-${Date.now()}`,
      FirstName: "Satın Alma / Üretim",
      LastName: "Direktörü",
      Company: c.name,
      Email: `islem@${c.website}`,
      Department: "Operasyon liderliği",
      Address: c.address,
      Industry: c.industry,
      ScheduledDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      CustomField1: "Yalın Danışmanlık Projesi",
      CustomField2: computeCompanyProfile(c).recommendedServices.slice(0, 3).join(", "),
      CustomField3: "Company Discovery Tool",
      status: "idle",
      openCount: 0
    }));

    const campaignRecord = {
      id: newCampaignId,
      date: new Date().toISOString().split("T")[0],
      subject: `Endüstriyel Verimlilik & OPEX İşbirliği - ${newCampaignTitle}`,
      templateBody: `Sayın Yetkili ${selectedCompanies.map(c=>c.name).join(", ")} Grubu,\n\nFabrikanızın operasyonel analizini gerçekleştirdik. Sektörünüzdeki en verimsiz hatları gidermek adına size özel hazırladığımız metodolojik teklifimizi sunmak isteriz.\n\nSaygılarımızla,`,
      recipients: newCampaignRecipients,
      attachments: [],
      status: "draft",
      successCount: 0,
      failedCount: 0,
      openCount: 0,
      trackingConnected: true
    };

    campaignsList.push(campaignRecord);
    CrmDb.setKv("crm_email_campaigns", campaignsList);

    setSelectedResultIds([]);
    setShowCampaignDialog(false);
    showToast(`"${newCampaignTitle}" başarılı şekilde oluşturuldu! ${newCampaignRecipients.length} Alıcı eklendi.`, "success");
  };

  // --- ACTIONS: PIPELINE KANBAN STAGE MODERATORS ---
  const handleUpdateTargetStage = (id: string, newStage: string) => {
    setTargetAccounts(prev =>
      prev.map(ta => ta.id === id ? { ...ta, leadStatus: newStage } : ta)
    );
    showToast(`Hesap aşaması "${newStage}" olarak güncellendi!`, "info");
  };

  const handleDeleteTargetAccount = (id: string) => {
    setConfirmDeleteModal({
      isOpen: true,
      title: "Hedef Hesap Silinecek",
      message: "Geri dönüşüm kutusuna taşınsın mı?",
      onConfirm: () => {
        setTargetAccounts(prev => prev.filter(ta => ta.id !== id));
        showToast("Hedef hesap silindi.", "danger");
      }
    });
  };

  // --- ACTIONS: EXPORT SUITE (EXCEL, CSV, PDF) ---
  const handleExportResultXl = () => {
    const listToExport = selectedResultIds.length > 0 
      ? discoveryDb.filter(d => selectedResultIds.includes(d.id))
      : filteredResults;

    if (listToExport.length === 0) {
      showToast("Dışa aktarılacak veri bulunamadı!", "danger");
      return;
    }

    const wsData = listToExport.map(item => {
      const cp = computeCompanyProfile(item);
      return {
        "Şirket Adı": item.name,
        "Web Sitesi": item.website,
        "Sektör": item.industry,
        "Hizmet Bölgesi/OSB": item.zone || "",
        "Şehir": item.city,
        "Telefon": item.phone,
        "LinkedIn": item.linkedin,
        "Çalışan Sayısı": item.size,
        "Yaklaşık Ciro": item.revenue,
        "Üretim Metodolojisi": item.productionType,
        "Dijital Altyapı": item.digitalInfrastructure,
        "Hedef Opex Skoru (%)": cp.score,
        "Önerilen Danışmanlık": cp.recommendedServices.join(", "),
        "Yalın Strateji": cp.outreachStrategy
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Company Search Results");
    XLSX.writeFile(wb, `Company_Discovery_Report_${Date.now()}.xlsx`);
    showToast(`${listToExport.length} şirket Excel formatıyla indirildi.`, "success");
  };

  const handleExportResultCsv = () => {
    const listToExport = selectedResultIds.length > 0 
      ? discoveryDb.filter(d => selectedResultIds.includes(d.id))
      : filteredResults;

    if (listToExport.length === 0) {
      showToast("Dışa aktarılacak veri bulunamadı!", "danger");
      return;
    }

    let csvContent = "\uFEFF"; // BOM for Turkish character set
    csvContent += "Company Name,Website,Industry,OSB,City,Phone,Employee Size,Target Score,Services\n";

    listToExport.forEach(item => {
      const cp = computeCompanyProfile(item);
      csvContent += `"${item.name.replace(/"/g, '""')}","${item.website}","${item.industry}","${(item.zone || "").replace(/"/g, '""')}","${item.city}","${item.phone}","${item.size}",${cp.score}%,"${cp.recommendedServices.join(";")}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Company_Discovery_CSV_${Date.now()}.csv`;
    link.click();
    showToast("CSV raporu indirildi.", "success");
  };

  const handleExportResultPdf = () => {
    const listToExport = selectedResultIds.length > 0 
      ? discoveryDb.filter(d => selectedResultIds.includes(d.id))
      : filteredResults;

    if (listToExport.length === 0) {
      showToast("Dışa aktarılacak veri bulunamadı!", "danger");
      return;
    }

    try {
      const doc = new jsPDF();
      doc.setFont("Helvetica");
      
      // Professional Power BI Theme Header
      doc.setFillColor(15, 23, 42); // slate 900
      doc.rect(0, 0, 210, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("GEOPEX - COMPANY DISCOVERY REPORT", 14, 18);
      
      doc.setFontSize(10);
      doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")} | Listelenen Satis Portföyü`, 14, 30);
      
      // Grid table rows
      let yPos = 50;
      doc.setTextColor(50, 50, 50);
      
      listToExport.forEach((item, idx) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        
        const cp = computeCompanyProfile(item);
        
        // Light grey container box
        doc.setFillColor(248, 250, 252);
        doc.rect(14, yPos, 182, 38, "F");
        
        doc.setFontSize(11);
        doc.setTextColor(0, 120, 212); // Blue primary
        doc.text(`${idx + 1}. ${item.name}`, 18, yPos + 6);
        
        // Metadata text
        doc.setFontSize(8);
        doc.setTextColor(115, 115, 115);
        doc.text(`Website: ${item.website}   |   Industry: ${item.industry}   |   Region: ${item.zone || item.city}`, 18, yPos + 12);
        
        doc.setTextColor(50, 50, 50);
        doc.text(`OpEx Target Score: %${cp.score}  |  Çalışan Sayısı: ${item.size}`, 18, yPos + 18);
        
        // Service recommendations
        doc.setTextColor(22, 101, 52); // emerald 800
        doc.text(`Önerilen Hizmetler: ${cp.recommendedServices.join(", ")}`, 18, yPos + 24);
        
        // Description wrap
        doc.setTextColor(75, 85, 99);
        const splitDesc = doc.splitTextToSize(item.description || "", 170);
        doc.text(splitDesc, 18, yPos + 30);
        
        yPos += 44;
      });
      
      doc.save(`GEOPEX_Discovery_Report_${Date.now()}.pdf`);
      showToast("PDF raporu başarıyla indirildi.", "success");
    } catch (e) {
      console.error(e);
      showToast("PDF oluşturulurken hata meydana geldi.", "danger");
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-zinc-100 font-sans" id="company-discovery-view-wrapper">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[100] p-4 rounded-xl flex items-center gap-3 shadow-lg border text-white font-medium animate-bounce ${
          toast.type === "success" ? "bg-emerald-600 border-emerald-500" :
          toast.type === "danger" ? "bg-rose-600 border-rose-500" : "bg-sky-600 border-sky-500"
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 animate-pulse" />
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* COMPACT DASHBOARD TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151515] p-5 rounded-2xl border border-slate-200/60 dark:border-zinc-805 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              {lang === "TR" ? "CRM İstihbarat Modülü" : "CRM Intelligence Module"}
            </span>
            <span className="text-[10px] bg-sky-50 dark:bg-sky-950/20 text-[#0078D4] font-mono px-2 py-0.5 rounded font-black">
              {lang === "TR" ? "Türkiye OSB Rehberi v2.0" : "Turkey OSB Directory v2.0"}
            </span>
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building className="text-amber-500 w-5 h-5" />
            <span>{lang === "TR" ? "Sanayi Şirketi Keşif Motoru" : "Industrial Company Discovery Engine"}</span>
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            {lang === "TR" 
              ? "Sektörel, coğrafi ve OSB bazlı akıllı arama yapın. Şirketleri analiz edin, 'Kazanılan' veya 'Hedef Hesaplar' listesine anında aktarın."
              : "Perform smart searches by sector, geography, and Organized Industrial Zones (OIZ). Analyze companies, export to 'Won' or 'Target Accounts' instantly."}
          </p>
        </div>

        {/* Root Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 rounded-lg p-1">
          <button
            onClick={() => setCurrentTab("search")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              currentTab === "search"
                ? "bg-white dark:bg-zinc-800 text-[#0078D4] shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"
            }`}
          >
            {lang === "TR" ? "🔍 Keşif ve Arama" : "🔍 Discovery Search"}
          </button>
          <button
            onClick={() => setCurrentTab("campaign-builder")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              currentTab === "campaign-builder"
                ? "bg-white dark:bg-zinc-800 text-emerald-600 shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"
            }`}
          >
            {lang === "TR" ? "🚀 Kampanya & Arama Listesi" : "🚀 Campaign & Call List"}
          </button>
        </div>
      </div>

      {/* --- TAB CONTENT 1: SEARCH & DISCOVERY ENGINE --- */}
      {currentTab === "search" && (
        <div className="space-y-6">
          {!googleSearchedTerm ? (
            /* --- LANDING GOOGLE PAGE VIEW --- */
            <div className="bg-white dark:bg-[#151515] rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm py-16 px-4 flex flex-col items-center justify-center min-h-[500px]">
              {/* Google Style Brand Logo */}
              <div className="text-center space-y-2">
                <div className="text-5xl md:text-6xl font-black tracking-tight select-none font-sans flex items-center justify-center gap-1">
                  <span className="text-[#4285F4]">G</span>
                  <span className="text-[#EA4335]">e</span>
                  <span className="text-[#FBBC05]">m</span>
                  <span className="text-[#4285F4]">b</span>
                  <span className="text-[#34A853]">a</span>
                  <span className="text-slate-400 dark:text-zinc-505 font-light ml-2">{t("Search")}</span>
                </div>
                <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 tracking-wider uppercase font-mono">
                  Türkiye Sanayi Siteleri, Fabrika & B2B Arama Portalı
                </p>
              </div>

              {/* Central Search Wrapper */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGoogleSearch(googleQuery);
                }}
                className="w-full max-w-2xl mt-8 space-y-4"
              >
                <div className="relative group">
                  <Search className="absolute left-4.5 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-[#0078D4]" />
                  <input
                    type="text"
                    value={googleQuery}
                    onChange={(e) => setGoogleQuery(e.target.value)}
                    placeholder="Şehir, sektör ve anahtar kelime girin (örn. Bursa otomotiv pres, Konya döküm)..."
                    className="w-full pl-12 pr-12 py-3.5 rounded-full border border-slate-200 dark:border-zinc-800 shadow-xs hover:shadow-md focus:shadow-md bg-white dark:bg-[#1c1c1c] text-sm focus:outline-none focus:border-slate-300 dark:focus:border-zinc-700 transition-all font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400"
                  />
                  {googleQuery && (
                    <button
                      type="button"
                      onClick={() => setGoogleQuery("")}
                      className="absolute right-4.5 top-3.5 text-xs font-bold text-slate-400 hover:text-rose-500 font-mono"
                    >
                      temizle
                    </button>
                  )}
                </div>

                {/* Google Buttons Row */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={googleSearching}
                    className="bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 w-full sm:w-auto dark:hover:bg-zinc-850 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-800 text-xs font-bold px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    {googleSearching ? "Arama Yapılıyor..." : "Klasik Arama"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleKeywords = [
                        "Bursa otomotiv sanayi",
                        "Konya döküm fabrikaları",
                        "Ege plastik parça",
                        "Manisa beyaz eşya montaj",
                        "Gebze metalurji döküm"
                      ];
                      const randomKw = sampleKeywords[Math.floor(Math.random() * sampleKeywords.length)];
                      setGoogleQuery(randomKw);
                      handleGoogleSearch(randomKw);
                    }}
                    className="bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 w-full sm:w-auto dark:hover:bg-zinc-850 text-slate-700 dark:text-amber-500 border border-slate-200/80 dark:border-zinc-800 text-xs font-bold px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    Kendimi Şanslı Hissediyorum
                  </button>
                </div>
              </form>

              {/* Suggestions chips */}
              <div className="mt-8 text-center space-y-2">
                <span className="text-[10px] tracking-wider uppercase font-extrabold text-slate-400 dark:text-zinc-500 font-mono block">
                  Hızlı Arama Önerileri
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
                  {[
                    { label: "Bursa Otomotiv Pres", query: "Bursa otomotiv yan sanayisi pres şekillendirme" },
                    { label: "Konya Döküm Fabrikaları", query: "Konya dökümhaneleri metallurji sanayi" },
                    { label: "Gebze Plastik Ambalaj", query: "Gebze plastikçiler OSB ambalaj imalatçıları" },
                    { label: "Ege Gıda Paketleme", query: "İzmir gıda sanayi tesisleri" },
                    { label: "Manisa Akıllı Elektronik", query: "Manisa OSB elektronik montaj konveyör imalat" }
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setGoogleQuery(chip.query);
                        handleGoogleSearch(chip.query);
                      }}
                      className="text-xs bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-350 px-3.5 py-1.5 rounded-full transition-all cursor-pointer font-medium"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* --- IN-RESULTS SEARCH PAGE VIEW --- */
            <div className="bg-white dark:bg-[#151515] rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm p-6 space-y-6">
              
              {/* Top Compact Arama Alanı */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                  {/* Colorful Compact Logo returning home on click */}
                  <div
                    onClick={() => {
                      setGoogleQuery("");
                      setGoogleSearchedTerm("");
                      setGoogleSearchResults([]);
                    }}
                    className="text-2xl font-black tracking-tight select-none cursor-pointer flex items-center gap-0.5"
                    title="Giriş Sayfasına Dön"
                  >
                    <span className="text-[#4285F4]">G</span>
                    <span className="text-[#EA4335]">e</span>
                    <span className="text-[#FBBC05]">m</span>
                    <span className="text-[#4285F4]">b</span>
                    <span className="text-[#34A853]">a</span>
                    <span className="text-slate-400 dark:text-zinc-500 font-light text-base ml-1">{t("Search")}</span>
                  </div>

                  {/* Search input in result view */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleGoogleSearch(googleQuery);
                    }}
                    className="relative w-full max-w-md"
                  >
                    <input
                      type="text"
                      value={googleQuery}
                      onChange={(e) => setGoogleQuery(e.target.value)}
                      className="w-full pl-5 pr-10 py-2 rounded-full border border-slate-200 dark:border-zinc-800 shadow-xs focus:shadow-md bg-white dark:bg-zinc-900 text-xs focus:outline-none transition-all font-medium text-slate-800 dark:text-zinc-100"
                    />
                    <button
                      type="submit"
                      disabled={googleSearching}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-[#0078D4]"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => {
                    setGoogleQuery("");
                    setGoogleSearchedTerm("");
                    setGoogleSearchResults([]);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-bold border border-slate-200 dark:border-zinc-800 rounded-lg px-3.5 py-1.5 bg-slate-50 dark:bg-zinc-900 transition-all cursor-pointer"
                >
                  ← Arama Paneline Dön
                </button>
              </div>

              {/* Stats Line */}
              <div className="text-xs text-slate-400 dark:text-zinc-500 font-mono flex flex-wrap items-center gap-2">
                <span>
                  {googleSearchResults.length} sonuç bulundu ({searchTime} saniye) - "<strong>{googleSearchedTerm}</strong>" araması
                </span>
                {googleSearchSources.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Gerçek Google araması ile doğrulandı ({googleSearchSources.length} kaynak)
                  </span>
                )}
              </div>

              {googleSearchSources.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 -mt-2">
                  {googleSearchSources.slice(0, 6).map((src, idx) => (
                    <a
                      key={src.uri || idx}
                      href={src.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-slate-500 hover:text-[#0078D4] dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2 py-1 rounded-full truncate max-w-[220px]"
                      title={src.uri}
                    >
                      🔗 {src.title || src.uri}
                    </a>
                  ))}
                </div>
              )}

              {/* Layout Content Grid (Search Results Column + Google Info Card on Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Search Results (Left, Span 7) */}
                <div className="lg:col-span-7 space-y-8 divide-y divide-slate-100 dark:divide-zinc-850">
                  {googleSearching ? (
                    /* Google Search skeleton loader */
                    <div className="space-y-6 py-6 animate-pulse">
                      {[1, 2, 3].map((val) => (
                        <div key={val} className="space-y-2.5">
                          <div className="h-3 w-48 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                          <div className="h-5 w-80 bg-slate-300 dark:bg-zinc-700 rounded"></div>
                          <div className="space-y-1">
                            <div className="h-4 w-full bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            <div className="h-4 w-2/3 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Search results items list */
                    <div className="space-y-8">
                      {googleSearchResults.map((item, idx) => {
                        const isAlreadyTarget = targetAccounts.some(ta => ta.companyName.toLowerCase() === item.name.toLowerCase());
                        const isAlreadyWon = wonCompanies.some(wc => wc.name.toLowerCase() === item.name.toLowerCase());
                        const cp = computeCompanyProfile(item);

                        return (
                          <div key={item.id || idx} className="pt-4 hover:bg-slate-50/20 dark:hover:bg-zinc-900/10 rounded transition-all">
                            
                            {/* Breadcrumb path */}
                            <div className="text-xs text-[#202124] dark:text-[#bdc1c6] font-mono mb-1 truncate">
                              {`https://${item.website || "example.com.tr"} › opex-assessment`}
                            </div>

                            {/* Google style Title */}
                            <h3 className="text-[19px] leading-tight font-normal text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer">
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(item.name)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                {item.title || `${item.name} - Resmi Tesis Portalı`}
                              </a>
                            </h3>

                            {/* Description snippet */}
                            <p className="text-xs text-[#4d5156] dark:text-[#dee2e6] mt-1.5 leading-relaxed">
                              {item.snippet || "Bu sanayi imalat tesisi hakkında detaylı bilgi, ürün segmentleri ve yalın dönüşüm potansiyelleri."}
                            </p>

                            {/* Context markers */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] font-sans">
                              <span className="bg-slate-100 dark:bg-zinc-800 text-slate-650 dark:text-zinc-350 px-2 py-0.5 rounded font-mono font-bold">
                                {item.industry || "Other"} Sektörü
                              </span>
                              <span className="bg-slate-100 dark:bg-zinc-800 text-slate-650 dark:text-zinc-350 px-2 py-0.5 rounded font-mono">
                                📍 {item.city || "Sanayi Şehri"}
                              </span>
                              <span className="bg-[#fef3c7] text-[#b45309] font-black px-2 py-0.5 rounded">
                                %{cp.score} Match Rate
                              </span>
                            </div>

                            {/* Quick Action buttons */}
                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-dashed border-slate-100 dark:border-zinc-800/60 font-sans">
                              <button
                                onClick={() => handleAddToTargetAccounts(item, "Research")}
                                disabled={isAlreadyTarget}
                                className={`text-[11px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                                  isAlreadyTarget 
                                    ? "bg-slate-100 text-slate-400" 
                                    : "bg-[#0078D4]/10 text-[#0078D4] hover:bg-[#0078D4]/20"
                                }`}
                              >
                                🎯 {isAlreadyTarget ? "✓ CRM Hedeflendi" : "CRM Hedef Defterine Ekle"}
                              </button>

                              <button
                                onClick={() => handleAddToCompanies(item)}
                                disabled={isAlreadyWon}
                                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                                  isAlreadyWon 
                                    ? "bg-slate-100 text-slate-400" 
                                    : "bg-emerald-100/40 text-emerald-700 hover:bg-emerald-200/40"
                                }`}
                              >
                                💼 {isAlreadyWon ? "✓ Müşteriler'de" : "Müşteriler'e (Won) Ekle"}
                              </button>

                              <button
                                onClick={() => {
                                  setDetailCompany(item);
                                  setAiReport("");
                                }}
                                className="text-[11px] hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-500 hover:text-slate-700 dark:text-zinc-400 font-bold px-2.5 py-1.5 rounded-lg transition-all"
                              >
                                📈 Fabrikayı Analiz Et / İncele
                              </button>
                            </div>

                          </div>
                        );
                      })}

                      {googleSearchResults.length === 0 && (
                        <div className="py-16 text-center text-slate-450 space-y-2">
                          {googleSearchError ? (
                            <>
                              <p className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">Arama başarısız oldu.</p>
                              <p className="text-xs text-rose-500 dark:text-rose-400">{googleSearchError}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-mono text-sm font-bold">"<strong>{googleSearchedTerm}</strong>" aramasına uygun doğrulanmış sanayi kaydı bulunamadı.</p>
                              <p className="text-xs">Yeni bir endüstri odağı veya bölge aramayı deneyin (örn: "Konya metal", "Gebze plastik").</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Google Knowledge Graph Panel on Right (Right, Span 5) */}
                <div className="lg:col-span-5">
                  <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 space-y-5 sticky top-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                        Google Knowledge Card (Gemba Bilgi Kartı)
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    </div>

                    {googleSearchResults.length > 0 ? (
                      (() => {
                        const firstItem = googleSearchResults[0];
                        const cp = computeCompanyProfile(firstItem);

                        return (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                                {firstItem.name}
                              </h4>
                              <p className="text-xs text-[#0078D4] font-mono hover:underline mt-0.5">
                                <a href={`https://${firstItem.website}`} target="_blank" rel="noreferrer">
                                  {firstItem.website}
                                </a>
                              </p>
                            </div>

                            <p className="text-xs text-slate-500 leading-relaxed border-l-2 border-amber-400 pl-3.5 italic bg-amber-500/5 py-1.5 rounded-r">
                              "{firstItem.snippet}"
                            </p>

                            {/* Detailed Spec Table */}
                            <div className="space-y-2 text-xs font-sans">
                              <div className="grid grid-cols-3 py-1.5 border-b border-slate-100 dark:border-zinc-800">
                                <span className="text-slate-400 font-medium">Genel Merkez/Adres</span>
                                <span className="col-span-2 font-semibold text-slate-700 dark:text-zinc-200">{firstItem.address || "Türkiye"}</span>
                              </div>
                              <div className="grid grid-cols-3 py-1.5 border-b border-slate-100 dark:border-zinc-800">
                                <span className="text-slate-400 font-medium">Sanayi Bölgesi</span>
                                <span className="col-span-2 font-bold text-amber-700 dark:text-amber-400 font-mono">{firstItem.zone || firstItem.city} (📍 {firstItem.region})</span>
                              </div>
                              <div className="grid grid-cols-3 py-1.5 border-b border-slate-100 dark:border-zinc-800">
                                <span className="text-slate-400 font-medium">B2B Sektör</span>
                                <span className="col-span-2 font-bold text-slate-700 dark:text-zinc-200">{firstItem.industry}</span>
                              </div>
                              <div className="grid grid-cols-3 py-1.5 border-b border-slate-100 dark:border-zinc-800">
                                <span className="text-slate-400 font-medium">Doğrulanan Ölçek</span>
                                <span className="col-span-2 font-semibold text-emerald-600 font-mono">{firstItem.size || "100-250 Çalışan"}</span>
                              </div>
                            </div>

                            {/* Consultancy Opportunities in Knowledge card */}
                            <div className="space-y-2">
                              <span className="text-[10px] tracking-wider uppercase font-extrabold text-slate-400 dark:text-zinc-500 font-mono block">
                                Olası Danışmanlık ve Hizmetler
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {cp.recommendedServices.map(svc => (
                                  <span key={svc} className="text-[10.5px] bg-[#f0f9ff] text-[#0369a1] dark:bg-sky-950/20 dark:text-sky-300 border border-[#bae6fd] dark:border-sky-900 font-bold px-2 py-0.5 rounded">
                                    {svc}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Outreach strategy */}
                            <div className="space-y-1 bg-slate-100 dark:bg-zinc-850 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Önerilen İletişim Yaklaşımı :</span>
                              <p className="text-slate-600 dark:text-zinc-300 leading-relaxed font-sans">{cp.outreachStrategy}</p>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-6">Detaylı B2B şirket bilgi kartını görüntülemek için arama listesinden seçim yapınız.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB CONTENT 4: CRM OUTREACH UTILITIES & CALL LISTS --- */}
      {currentTab === "campaign-builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Dialing Sheet logs (Call List) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#151515] p-6 rounded-2xl border border-slate-205 dark:border-zinc-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-850 dark:text-zinc-100 flex items-center gap-1.5 mb-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>CRM Sıcak Arama Fihristi (Call List Sheet)</span>
            </h4>
            <p className="text-xs text-slate-500 mb-4">Hedeflenen listesindeki firmaların hızlı iletişim numaraları ve durumsal arama notları logu.</p>

            <div className="space-y-3.5 max-h-[500px] overflow-y-auto">
              {targetAccounts.map(acc => {
                const status = callListLogs[acc.id] || "idle";
                return (
                  <div key={acc.id} className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-800 dark:text-zinc-200 block">{acc.companyName}</span>
                      <span className="text-[10px] text-[#0078D4] font-mono block mt-0.5">{acc.contactEmail || "Aranacak telefon yok"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={status}
                        onChange={e => setCallListLogs(prev => ({ ...prev, [acc.id]: e.target.value as any }))}
                        className="text-[10px] bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 p-1 rounded font-bold text-slate-900 dark:text-white"
                      >
                        <option value="idle" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Bekliyor</option>
                        <option value="called" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Arandı</option>
                        <option value="no-answer" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Ulaşılamadı</option>
                        <option value="interested" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">İlgili (Görüşme)</option>
                      </select>
                      {status === "interested" && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      )}
                    </div>
                  </div>
                );
              })}
              {targetAccounts.length === 0 && (
                <p className="text-center text-slate-400 font-mono text-[11px] py-12">Önce Discovery Search üzerinden hesap ekleyin.</p>
              )}
            </div>
          </div>

          {/* Quick OPEX Campaign and pitches generator */}
          <div className="lg:col-span-7 bg-white dark:bg-[#151515] p-6 rounded-2xl border border-slate-205 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-850 dark:text-zinc-150 flex items-center gap-1.5">
                <Send className="w-4.5 h-4.5 text-[#0078D4]" />
                <span>Yalın Üretim & OPEX Odaklı Toplu E-postacı</span>
              </h4>
              <p className="text-xs text-slate-500">
                Hedeflenen şirketlere toplu akıllı e-posta taslakları hazırlayarak tek tuşla CRM fihristine kaydedip, akıllı e-posta motoru ile entegre gönderebilirsiniz.
              </p>

              <div className="p-4 bg-[#fefefe] dark:bg-zinc-900 rounded-xl border border-dashed border-slate-200">
                <span className="text-[10px] font-black text-slate-400 block tracking-widest font-mono uppercase mb-2">Seçili Danışmanlık Prospektüsü</span>
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  "Özel Hazırlanan SMED, Hat Dengeleme ve Layout Tasarımları sayesinde fabrikanıza yerinde Gemba ile ilk ziyareti yapıp, 10 kat değer artışı sağlıyoruz."
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 block">TOPLU KAMPANYA İSMİ VEYA GİDİŞ KONUSU</label>
                <input
                  type="text"
                  value={newCampaignTitle}
                  onChange={e => setNewCampaignTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-[#0078D4]"
                />
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Toplam Hedeflenebilir Kadrolar: {targetAccounts.length} Adres</span>
              <button
                onClick={() => handleBulkCreateCampaign()}
                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-850 text-xs font-bold px-4 py-2 rounded-lg"
              >
                ✓ Kampanya Draftı Oluştur
              </button>
            </div>
          </div>

        </div>
      )}

      {/* --- SIDE DRAWER COMPONENT: SINGLE DETAILED REVIEW (WITH GEMINI AI CAPABILITY) --- */}
      {detailCompany && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 z-[90] flex justify-end animate-fade-in" id="company-discovery-detail-drawer">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121212] h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Drawer Close & Title */}
              <div className="flex items-center justify-between border-b border-slate-105 dark:border-zinc-805 pb-4">
                <span className="text-[10px] bg-sky-50 dark:bg-sky-950/20 text-[#0078D4] font-black px-2.5 py-1 rounded font-mono">
                  {detailCompany.industry} • FİRMA AYRINTILARI
                </span>
                <button
                  onClick={() => setDetailCompany(null)}
                  className="p-1 px-2.5 text-xs text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg font-bold"
                >
                  Kapat
                </button>
              </div>

              {/* Title Card */}
              <div className="p-5 bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-xl relative overflow-hidden">
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-zinc-100 tracking-tight leading-snug">
                  {detailCompany.name}
                </h3>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#0078D4]" /> {detailCompany.address}</span>
                  <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-[#0078D4]" /> {detailCompany.website}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[#0078D4]" /> {detailCompany.phone}</span>
                </div>
              </div>

              {/* Quick recommended services badges */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 block tracking-widest font-mono uppercase">Eşleşen Potansiyel Hizmetler</h4>
                <div className="flex flex-wrap items-center gap-2">
                  {RECOMMENDED_SERVICES_LIST.map(service => {
                    const isMatched = computeCompanyProfile(detailCompany).recommendedServices.includes(service);
                    return (
                      <span
                        key={service}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${
                          isMatched 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400" 
                            : "bg-slate-50 text-slate-400 border-slate-150"
                        }`}
                      >
                        {service}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Heuristics metadata */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 dark:bg-zinc-900/30 p-4 rounded-xl border border-slate-105 dark:border-zinc-800">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Çalışan Sayısı</span>
                  <span className="text-xs font-black text-slate-800 dark:text-zinc-250 font-mono mt-0.5 block">{detailCompany.size}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Yaklaşık Yıllık Ciro</span>
                  <span className="text-xs font-black text-slate-800 dark:text-zinc-250 font-mono mt-0.5 block">{detailCompany.revenue || "NOT FOUND"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Dijital Altyapı Düzeyi</span>
                  <span className="text-xs font-black text-[#0078D4] font-mono mt-0.5 block">{detailCompany.digitalInfrastructure || "Filtresiz Excel"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Kuruluş Yılı</span>
                  <span className="text-xs font-black text-slate-800 dark:text-zinc-250 font-mono mt-0.5 block">{detailCompany.founded || "Bilinmiyor"}</span>
                </div>
              </div>

              {/* Technical description */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-slate-400 block tracking-widest font-mono uppercase">İşletme ve Fabrika Tanımı</span>
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-sans">
                  {detailCompany.description}
                </p>
                {detailCompany.notes && (
                  <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 rounded-lg text-xs mt-2">
                    <strong className="text-rose-600 font-bold">Darboğaz/Temas Tüpü Analizi: </strong>
                    <span className="text-slate-650">{detailCompany.notes}</span>
                  </div>
                )}
              </div>

              {/* Dynamic Gemini Raporu Workspace */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 block tracking-widest font-mono uppercase">Yapay Zeka OpEx Risk Değerlendirmesi</span>
                  <button
                    onClick={() => handlePerformAiAnalysis(detailCompany)}
                    disabled={isAiLoading}
                    className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white dark:bg-zinc-800 text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all uppercase font-mono"
                  >
                    {isAiLoading ? (
                      <span>Rapor Oluşturuluyor...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Derin Rapor Analizi Calistir</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Gemini Output Rapor Box */}
                {aiReport ? (
                  <div className="p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-805 rounded-xl text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[350px] overflow-y-auto font-mono">
                    {aiReport}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">"Derin Rapor Analizi" tuşuna basarak Gemini yapay zeka ajanının fabrikayla ilgili hazırladığı özelleştirilmiş pazar analizi, e-posta taslağı, satın alma kademeleri ve COPQ tahminlerine ulaşabilirsiniz.</p>
                )}
              </div>

            </div>

            {/* Bottom Actions inside drawer */}
            <div className="pt-4 border-t border-slate-105 dark:border-zinc-805 flex items-center justify-between gap-4 mt-6">
              <button
                onClick={() => {
                  handleAddToCompanies(detailCompany);
                  setDetailCompany(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex-1 transition-all"
              >
                + Won Müşterilere Ekle
              </button>
              <button
                onClick={() => {
                  handleAddToTargetAccounts(detailCompany, "Research");
                  setDetailCompany(null);
                }}
                className="bg-[#0078D4] hover:bg-[#0078D4]/90 text-white text-xs font-bold px-4 py-2 rounded-lg flex-1 transition-all"
              >
                + Hedef Hesaplara Ekle
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- ATTACHED DIALOG: SALESPERSON ASSIGNMENT MODEL --- */}
      {showAssignDialog && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-md shadow-2xl relative">
            <h4 className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-emerald-600 animate-pulse" />
              <span>Satış Sorumlusu Ataması gerçekleştir</span>
            </h4>
            <p className="text-xs text-slate-500 mb-4">Seçilen {selectedResultIds.length} adet şirket için satış takip sorumlusu atayın.</p>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block font-mono">SATIS SORUMLUSU LİSTESİ</label>
                <select
                  value={selectedSalesperson}
                  onChange={e => setSelectedSalesperson(e.target.value)}
                  className="w-full p-2 py-2.5 text-xs bg-slate-50 dark:bg-zinc-850 rounded-lg border border-slate-250 dark:border-zinc-800 focus:outline-[#0078D4] focus:ring-1 text-slate-900 dark:text-white font-bold"
                >
                  <option value="Atakan Zehir" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Atakan Zehir (Senior Director)</option>
                  <option value="Hakan Morsallı" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Hakan Morsallı (Commercial Excellence Leader)</option>
                  <option value="Güray Yurdakul" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Güray Yurdakul (MTM Master Trainer)</option>
                  <option value="Faik Suat Çakır" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Faik Suat Çakır (OEE Specialist)</option>
                  <option value="Harun Aksoy" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Harun Aksoy (Senior IE Analyst)</option>
                  <option value="Kemal Doğan" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Kemal Doğan (Kaizen Coach)</option>
                  <option value="Gökhan Kuzu" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Gökhan Kuzu (CI Engineer)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignDialog(false)}
                  className="text-xs text-slate-500 hover:bg-slate-50 px-3 py-2 rounded-lg"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkAssignSalesperson(selectedSalesperson)}
                  className="bg-emerald-650 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >
                  Sorumluyu Ata
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ATTACHED DIALOG: OUTREACH CAMPAIGN MODULE --- */}
      {showCampaignDialog && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-lg shadow-2xl relative">
            <h4 className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 mb-2">
              <Send className="w-5 h-5 text-amber-500" />
              <span>Yeni Tanıtım Kampanyası Tanımla</span>
            </h4>
            <p className="text-xs text-slate-500 mb-4">Seçilen {selectedResultIds.length} şirket için e-posta fihristine toplu e-posta gönderimi taslağı hazırlanacaktır.</p>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block font-mono">KAMPANYA ÖLÇÜT LİSTESİ</label>
                <input
                  type="text"
                  required
                  value={newCampaignTitle}
                  onChange={e => setNewCampaignTitle(e.target.value)}
                  className="w-full p-2 py-2.5 text-xs bg-slate-50 dark:bg-zinc-850 rounded-lg border border-slate-250 dark:border-zinc-800 focus:outline-[#0078D4]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCampaignDialog(false)}
                  className="text-xs text-slate-500 hover:bg-slate-50 px-3 py-2 rounded-lg"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkCreateCampaign()}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >
                  Draft Kampanyayı Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Global Confirmation Dialog */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 font-sans antialiased animate-fade-in text-slate-800 dark:text-zinc-200">
          <div className="bg-white dark:bg-[#181818] w-full max-w-sm rounded-xl border border-slate-205 dark:border-zinc-855 shadow-2xl p-6 text-center animate-in zoom-in-95 duration-100">
            <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/25 rounded-full flex items-center justify-center text-rose-500 mb-4">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm mb-2">
              {confirmDeleteModal.title || "Kayıt Silinecek"}
            </h3>
            <p className="text-slate-500 dark:text-zinc-400 text-xs mb-6 font-semibold animate-pulse">
              {confirmDeleteModal.message || "Geri dönüşüm kutusuna taşınsın mı?"}
            </p>
            <div className="flex gap-3 justify-center select-none font-bold">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ isOpen: false, onConfirm: () => {} })}
                className="border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer w-24"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDeleteModal.onConfirm();
                  setConfirmDeleteModal({ isOpen: false, onConfirm: () => {} });
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer shadow-sm w-24 active:scale-95 transition-transform"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
