import React, { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Search,
  Building2,
  Users2,
  MapPin,
  ShieldAlert,
  Mail,
  Copy,
  Check,
  Plus,
  Trash2,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Loader2,
  TrendingUp,
  Cpu,
  Target,
  Linkedin,
  CornerDownRight,
  Sliders,
  Send,
  Zap,
  Info,
  ShieldCheck,
  AlertCircle,
  Maximize2,
  Minimize2
} from "lucide-react";
import { LeadProfile, TargetAccount } from "../types";
import { CrmDb } from "../lib/CrmDb";
import { getActiveOrganizationId } from "../lib/tenantStorage";

const LEAD_PROFILES_KEY = "crm_lead_profiles";
// Must match the key TargetAccountsView.tsx reads from, otherwise records pushed
// here never show up on the Target Accounts screen.
const TARGET_ACCOUNTS_KEY = "crm_target_accounts";

interface ResearchSource {
  title: string;
  url: string;
  domain?: string;
  publishedDate?: string;
}

interface SavedAnalysis {
  id: string;
  timestamp: string;
  companyInput: string;
  rawOutput: string;
  sources: ResearchSource[];
  parsed: {
    companySummary: string;
    financialData: string;
    emailDiscovery: string;
    decisionMakers: string;
    opportunityAnalysis: string;
  };
}

interface AISalesAssistantProps {
  onOpenSettings?: () => void;
}

const NOT_FOUND_SUMMARY = "Doğrulanabilir bilgi bulunamadı.";
const NOT_FOUND_FINANCIAL = "Finansal veri bulunamadı.";
const NOT_FOUND_EMAIL = "E-posta adresi tespit edilemedi.";
const NOT_FOUND_DECISION_MAKERS = "Karar verici bilgisi bulunamadı.";
const NOT_FOUND_OPPORTUNITY =
  "Yeterli veri bulunamadığı için fırsat analizi oluşturulamadı.";
const TAVILY_KEY_MESSAGE =
  "Tavily API anahtarı bulunamadı. Lütfen Sistem Ayarları > API Anahtarları bölümünden Tavily API Key giriniz.";

function getBusinessErrorMessage(
  data?: Record<string, unknown>,
  fallback = "Araştırma tamamlanamadı. Lütfen tekrar deneyin."
): string {
  if (data?.code === "TAVILY_API_KEY_MISSING") return TAVILY_KEY_MESSAGE;
  if (data?.code === "TAVILY_SEARCH_FAILED") {
    return "İnternet araştırması gerçekleştirilemedi.";
  }
  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error;
  }
  return fallback;
}

function toUserFacingError(err: any): string {
  if (err?.data && typeof err.data === "object") {
    return getBusinessErrorMessage(err.data as Record<string, unknown>);
  }
  const msg = String(err?.message || "");
  if (
    msg.includes("JSON değil") ||
    msg.includes("Unexpected token") ||
    msg.includes("stack") ||
    msg.length > 220
  ) {
    return "Araştırma tamamlanamadı. Lütfen tekrar deneyin.";
  }
  return msg || "Araştırma tamamlanamadı. Lütfen tekrar deneyin.";
}

async function parseJsonApiResponse(resp: Response): Promise<Record<string, unknown>> {
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    await resp.text();
    throw new Error("Sunucu yanıtı işlenemedi. Lütfen tekrar deneyin.");
  }
  const data = await resp.json();
  if (!resp.ok) {
    const message = getBusinessErrorMessage(data as Record<string, unknown>);
    throw Object.assign(new Error(message), { data, status: resp.status });
  }
  return data;
}

function getTavilyApiKey(): string {
  return localStorage.getItem("tavily_api_key")?.trim() || "";
}

export default function AISalesAssistant({ onOpenSettings }: AISalesAssistantProps) {
  const { lang, t } = useLanguage();
  const [companyInput, setCompanyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasTavilyKey, setHasTavilyKey] = useState(() => !!getTavilyApiKey());
  
  // Storage of past analyses
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<SavedAnalysis | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visual" | "raw">("visual");

  // Expanded View states
  const [isFinancialExpanded, setIsFinancialExpanded] = useState<boolean>(false);
  const [isEmailWizardExpanded, setIsEmailWizardExpanded] = useState<boolean>(false);

  // Dynamic Email Pitch wizard states
  const [generatorMailType, setGeneratorMailType] = useState<"cold" | "warm">("cold");
  const [generatorTopic, setGeneratorTopic] = useState<string>("OEE (Ekipman Etkinliği) & Çevrim İyileştirme");
  const [generatorTone, setGeneratorTone] = useState<string>("Profesyonel & Danışmanlık Yaklaşımı");
  const [generatorExtraContext, setGeneratorExtraContext] = useState<string>("");
  const [generatorLoading, setGeneratorLoading] = useState<boolean>(false);
  const [generatedEmailResult, setGeneratedEmailResult] = useState<string>("");

  const handleGenerateCustomPitch = async () => {
    if (!activeAnalysis) return;
    setGeneratorLoading(true);
    setGeneratedEmailResult("");
    
    try {
      const resp = await fetch("/api/gemini/generate-custom-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: activeAnalysis.companyInput,
          mailType: generatorMailType,
          topic: generatorTopic,
          tone: generatorTone,
          extraContext: generatorExtraContext,
          researchContext: activeAnalysis.rawOutput,
        }),
      });

      if (!resp.ok) {
        throw new Error("API hatası oluştu.");
      }

      const data = await resp.json();
      if (data.success && data.text) {
        setGeneratedEmailResult(data.text);
        showToast("Özel e-posta şablonunuz başarıyla üretildi!", "success");
      } else {
        throw new Error(data.error || "Boş çıktı döndü.");
      }
    } catch (err: any) {
      console.error("Custom pitch generator failed:", err);
      showToast(err.message || "E-posta taslağı oluşturulamadı.", "error");
    } finally {
      setGeneratorLoading(false);
    }
  };

  const loadingMessages = [
    "Tavily arama motoru başlatılıyor...",
    "Şirket adı ve OpEx anahtar kelimeleri ile web taraması yapılıyor...",
    "Lean manufacturing, kaizen ve sürdürülebilirlik kaynakları taranıyor...",
    "Finansal raporlar, yatırımcı bilgileri ve ESG verileri toplanıyor...",
    "E-posta, iletişim ve yönetim kadrosu kaynakları analiz ediliyor...",
    "Gemini yalnızca Tavily sonuçlarını analiz ediyor...",
  ];

  useEffect(() => {
    const syncTavilyKey = () => setHasTavilyKey(!!getTavilyApiKey());
    syncTavilyKey();
    window.addEventListener("storage", syncTavilyKey);
    window.addEventListener("focus", syncTavilyKey);
    return () => {
      window.removeEventListener("storage", syncTavilyKey);
      window.removeEventListener("focus", syncTavilyKey);
    };
  }, []);

  // Rotate loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Load saved analyses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("smart_mailmerge_company_analyses_v3");
    if (saved) {
      try {
        const list = JSON.parse(saved);
        // Deduplicate and regenerate collision IDs to protect user against duplicate key runtime warnings
        const seenIds = new Set<string>();
        const sanitizedList = list.map((item: any) => {
          let uniqueId = item.id;
          if (!uniqueId || seenIds.has(uniqueId)) {
            uniqueId = (uniqueId || "analysis_").split("_")[0] + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
          }
          seenIds.add(uniqueId);
          const legacyParsed = item.parsed || {};
          const parsed = legacyParsed.financialData
            ? legacyParsed
            : {
                companySummary: legacyParsed.companySummary || NOT_FOUND_SUMMARY,
                financialData: legacyParsed.companyFinancialAnalysis || NOT_FOUND_FINANCIAL,
                emailDiscovery:
                  legacyParsed.estimatedEmailCandidates ||
                  legacyParsed.emailPatternAnalysis ||
                  NOT_FOUND_EMAIL,
                decisionMakers:
                  legacyParsed.suggestedDecisionMakers || NOT_FOUND_DECISION_MAKERS,
                opportunityAnalysis:
                  legacyParsed.recommendedOutreachStrategy || NOT_FOUND_OPPORTUNITY,
              };
          return { ...item, id: uniqueId, parsed };
        });
        setSavedAnalyses(sanitizedList);
        if (sanitizedList.length > 0) {
          setActiveAnalysis(sanitizedList[0]);
        }
        localStorage.setItem("smart_mailmerge_company_analyses_v3", JSON.stringify(sanitizedList));
      } catch (err) {
        console.error("Failed to load company analyses:", err);
      }
    } else {
      // Compatibility with older v2 data if available
      const legacy = localStorage.getItem("smart_mailmerge_company_analyses_v2");
      if (legacy) {
        try {
          const list = JSON.parse(legacy);
          const converted = list.map((item: any) => {
            if (item.parsed && item.parsed.companySummary) {
              return item;
            }
            return {
              id: item.id,
              timestamp: item.timestamp,
              companyInput: item.companyInput,
              rawOutput: item.rawOutput,
              sources: item.sources || [],
              parsed: parseScreenerOutput(item.rawOutput)
            };
          });
          setSavedAnalyses(converted);
          if (converted.length > 0) {
            setActiveAnalysis(converted[0]);
            localStorage.setItem("smart_mailmerge_company_analyses_v3", JSON.stringify(converted));
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const saveAnalysesList = (list: SavedAnalysis[]) => {
    setSavedAnalyses(list);
    localStorage.setItem("smart_mailmerge_company_analyses_v3", JSON.stringify(list));
  };

  const handleSearchCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyInput.trim()) return;

    const tavilyKey = getTavilyApiKey();
    if (!tavilyKey) {
      setHasTavilyKey(false);
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setError(null);
    setActiveTab("visual");

    try {
      const resp = await fetch("/api/gemini/analyze-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyInput: companyInput.trim(),
          tavilyApiKey: tavilyKey,
        }),
      });

      let data: Record<string, unknown>;
      try {
        data = await parseJsonApiResponse(resp);
      } catch (parseErr: any) {
        if (parseErr?.data?.code === "TAVILY_API_KEY_MISSING") {
          setHasTavilyKey(false);
          return;
        }
        throw parseErr;
      }

      if (!data.success || !data.parsed) {
        throw new Error(
          getBusinessErrorMessage(data as Record<string, unknown>)
        );
      }

      const parsedData = data.parsed as SavedAnalysis["parsed"];
      const rawOutput =
        typeof data.rawOutput === "string"
          ? data.rawOutput
          : [
              `# Şirket Özeti\n${parsedData.companySummary}`,
              `# Finansal Veriler\n${parsedData.financialData}`,
              `# E-posta Keşfi\n${parsedData.emailDiscovery}`,
              `# Karar Vericiler\n${parsedData.decisionMakers}`,
              `# Fırsat Analizi\n${parsedData.opportunityAnalysis}`,
            ].join("\n\n");

      const newAnalysis: SavedAnalysis = {
        id: "analysis_" + Date.now() + "_" + Math.floor(Math.random() * 1000000),
        timestamp: new Date().toLocaleString("tr-TR"),
        companyInput: companyInput.trim(),
        rawOutput,
        sources: (data.sources as ResearchSource[]) || [],
        parsed: parsedData,
      };

      const updatedList = [newAnalysis, ...savedAnalyses];
      saveAnalysesList(updatedList);
      setActiveAnalysis(newAnalysis);
      setCompanyInput("");
      if (data.partialGemini) {
        showToast(
          "İnternet araştırması tamamlandı. AI yorumu şu anda oluşturulamadı.",
          "success"
        );
      } else {
        showToast("Şirket araştırması başarıyla tamamlandı!", "success");
      }
    } catch (err: any) {
      console.error("Search company failed:", err);
      setError(toUserFacingError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedAnalyses.filter((item) => item.id !== id);
    saveAnalysesList(filtered);
    if (activeAnalysis?.id === id) {
      setActiveAnalysis(filtered.length > 0 ? filtered[0] : null);
    }
    showToast("Analiz geçmişten kaldırıldı.", "success");
  };

  const parseScreenerOutput = (text: string) => {
    const parsed = {
      companySummary: "",
      financialData: "",
      emailDiscovery: "",
      decisionMakers: "",
      opportunityAnalysis: "",
    };

    const sections = text.split(/(?=^#\s+)/m);
    sections.forEach((sec) => {
      const trimmed = sec.trim();
      if (!trimmed) return;
      const lines = trimmed.split("\n");
      const titleLine = lines[0].toLowerCase();
      const content = lines.slice(1).join("\n").trim();

      if (
        titleLine.includes("şirket özeti") ||
        titleLine.includes("company summary")
      ) {
        parsed.companySummary = content;
      } else if (
        titleLine.includes("finansal veriler") ||
        titleLine.includes("financial data") ||
        titleLine.includes("company financial")
      ) {
        parsed.financialData = content;
      } else if (
        titleLine.includes("e-posta keşfi") ||
        titleLine.includes("email discovery") ||
        titleLine.includes("email pattern") ||
        titleLine.includes("estimated email")
      ) {
        parsed.emailDiscovery = content;
      } else if (
        titleLine.includes("karar vericiler") ||
        titleLine.includes("decision makers") ||
        titleLine.includes("suggested decision")
      ) {
        parsed.decisionMakers = content;
      } else if (
        titleLine.includes("fırsat analizi") ||
        titleLine.includes("opportunity analysis") ||
        titleLine.includes("outreach strategy") ||
        titleLine.includes("recommended outreach")
      ) {
        parsed.opportunityAnalysis = parsed.opportunityAnalysis
          ? parsed.opportunityAnalysis + "\n\n" + content
          : content;
      }
    });

    if (!parsed.companySummary) parsed.companySummary = NOT_FOUND_SUMMARY;
    if (!parsed.financialData) parsed.financialData = NOT_FOUND_FINANCIAL;
    if (!parsed.emailDiscovery) parsed.emailDiscovery = NOT_FOUND_EMAIL;
    if (!parsed.decisionMakers)
      parsed.decisionMakers = NOT_FOUND_DECISION_MAKERS;
    if (!parsed.opportunityAnalysis)
      parsed.opportunityAnalysis = NOT_FOUND_OPPORTUNITY;

    return parsed;
  };

  const copyToClipboard = (text: string, id: string) => {
    let done = false;
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedSection(id);
          setTimeout(() => setCopiedSection(null), 2000);
          showToast("Panoya başarıyla kopyalandı!", "success");
        })
        .catch(() => {
          // Fallback to execCommand if permission rejected
          fallbackCopy(text, id);
        });
      done = true;
    }
    if (!done) {
      fallbackCopy(text, id);
    }
  };

  const fallbackCopy = (text: string, id: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (success) {
        setCopiedSection(id);
        setTimeout(() => setCopiedSection(null), 2000);
        showToast("Panoya başarıyla kopyalandı (Alternatif Mod)!", "success");
      } else {
        showToast("Kopyalama başarısız oldu. Lütfen metni seçip manuel kopyalayın.", "error");
      }
    } catch (err) {
      showToast("Kopyalama hatası.", "error");
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const extractVerifiedEmails = (emailSection: string): string[] => {
    if (
      !emailSection ||
      emailSection.includes(NOT_FOUND_EMAIL) ||
      emailSection.toLowerCase().includes("estimated email")
    ) {
      return [];
    }
    const matches = emailSection.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    );
    return matches ? [...new Set(matches)] : [];
  };

  const extractDecisionMakerName = (dmSection: string): { firstName: string; lastName: string; title: string } | null => {
    if (!dmSection || dmSection.includes(NOT_FOUND_DECISION_MAKERS)) return null;
    const line = dmSection.split("\n").find((l) => l.includes("|") && !l.toLowerCase().includes("tier"));
    if (!line) return null;
    const parts = line.split("|").map((p) => p.trim());
    const namePart = parts[0]?.replace(/^[-*•\s]+/, "") || "";
    const titlePart = parts[1] || "";
    const nameTokens = namePart.split(/\s+/).filter(Boolean);
    if (nameTokens.length < 2) return null;
    return {
      firstName: nameTokens[0],
      lastName: nameTokens.slice(1).join(" "),
      title: titlePart,
    };
  };

  const handlePushToLeadProfiles = () => {
    if (!activeAnalysis) return;

    const verifiedEmails = extractVerifiedEmails(activeAnalysis.parsed.emailDiscovery);
    if (!verifiedEmails.length) {
      showToast("E-posta adresi tespit edilemedi. Lead eklenemedi.", "error");
      return;
    }

    const dm = extractDecisionMakerName(activeAnalysis.parsed.decisionMakers);

    try {
      const currentProfiles = CrmDb.getKv<LeadProfile[]>(LEAD_PROFILES_KEY, []);

      const companyCapitalized =
        activeAnalysis.companyInput.charAt(0).toUpperCase() +
        activeAnalysis.companyInput.slice(1);

      const newLead: LeadProfile = {
        id: "lead_ai_" + Date.now() + "_" + Math.floor(Math.random() * 1000000),
        no: currentProfiles.length + 1,
        firstName: dm?.firstName || "—",
        lastName: dm?.lastName || "—",
        email: verifiedEmails[0],
        company: companyCapitalized,
        department: dm?.title || "Bilgi bulunamadı",
        address: "Bilgi bulunamadı",
        industry: "Bilgi bulunamadı",
        leadDemand: "Tavily Araştırması",
        leadStatus: "New",
        leadSegment: "Warm Lead",
        customField1: `AI Analiz Tarihi: ${activeAnalysis.timestamp}`,
        customField2: `Kaynak: Tavily Search API`,
        deliveryStatus: "idle",
        openCount: 0,
        organization_id: getActiveOrganizationId() || undefined,
      };

      const updated = [newLead, ...currentProfiles];
      CrmDb.setKv(LEAD_PROFILES_KEY, updated);

      showToast(`${companyCapitalized} Lead Profiles listesine eklendi!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Müşteri listesine eklenirken hata oluştu.", "error");
    }
  };

  const handlePushToTargetAccounts = () => {
    if (!activeAnalysis) return;

    const verifiedEmails = extractVerifiedEmails(activeAnalysis.parsed.emailDiscovery);
    const dm = extractDecisionMakerName(activeAnalysis.parsed.decisionMakers);

    try {
      const currentAccounts: TargetAccount[] = CrmDb.getKv<TargetAccount[]>(TARGET_ACCOUNTS_KEY, []);

      const inputStr = activeAnalysis.companyInput.trim().toLowerCase();
      let websiteUrl = "";
      if (inputStr.includes(".")) {
        websiteUrl = inputStr.startsWith("http") ? inputStr : `https://${inputStr}`;
      } else {
        const sourceUrl = activeAnalysis.sources[0]?.url;
        websiteUrl = sourceUrl || "";
      }

      if (websiteUrl) {
        const normalizedUrl = websiteUrl.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
        const isDuplicate = currentAccounts.some((acc) => {
          const existingNorm = acc.websiteUrl
            .toLowerCase()
            .replace(/^(https?:\/\/)?(www\.)?/, "");
          return existingNorm === normalizedUrl;
        });
        if (isDuplicate) {
          showToast("Bu şirket zaten hedef listenizde mevcut!", "error");
          return;
        }
      }

      const companyCapitalized =
        activeAnalysis.companyInput.charAt(0).toUpperCase() +
        activeAnalysis.companyInput.slice(1);

      const newAccount: TargetAccount = {
        id: "target_" + Date.now() + "_" + Math.floor(Math.random() * 1000000),
        no: currentAccounts.length + 1,
        companyName: companyCapitalized,
        websiteUrl: websiteUrl || "Bilgi bulunamadı",
        industryTag: activeAnalysis.parsed.companySummary.includes(NOT_FOUND_SUMMARY)
          ? "Bilgi bulunamadı"
          : activeAnalysis.parsed.companySummary.split("\n")[0]?.substring(0, 80) || "Bilgi bulunamadı",
        companySize: activeAnalysis.parsed.financialData.includes(NOT_FOUND_FINANCIAL)
          ? "Bilgi bulunamadı"
          : activeAnalysis.parsed.financialData.split("\n").find((l) => /çalışan|employee/i.test(l))?.substring(0, 60) || "Bilgi bulunamadı",
        locationMain: activeAnalysis.parsed.companySummary.includes(NOT_FOUND_SUMMARY)
          ? "Bilgi bulunamadı"
          : activeAnalysis.parsed.companySummary.split("\n").find((l) => /lokasyon|konum|location|fabrika/i.test(l))?.substring(0, 80) || "Bilgi bulunamadı",
        contactName: dm?.firstName || "—",
        contactSurname: dm?.lastName || "—",
        contactEmail: verifiedEmails[0] || "E-posta adresi tespit edilemedi.",
        department: dm?.title || "Bilgi bulunamadı",
        leadStatus: "New",
        leadSegment: "Warm Lead",
        aiAnalysisSummary:
          activeAnalysis.parsed.companySummary +
          "\n\n" +
          activeAnalysis.parsed.opportunityAnalysis,
        draftTemplates: activeAnalysis.parsed.opportunityAnalysis,
        analysisSource: "Tavily Search API + Gemini",
        analysisDate: activeAnalysis.timestamp,
        riskScore: 0,
        rawOutput: activeAnalysis.rawOutput,
      };

      const organizationId = getActiveOrganizationId();
      const updatedList = [
        { ...newAccount, organization_id: organizationId || newAccount.organization_id },
        ...currentAccounts,
      ];
      CrmDb.setKv(TARGET_ACCOUNTS_KEY, updatedList);

      showToast("Şirket hedef listesine kaydedildi!", "success");
    } catch (err) {
      console.error(err);
      showToast("Hedef listesine eklenirken bir hata oluştu.", "error");
    }
  };

  const TavilyMissingScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center">
      <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3">
        Tavily API anahtarı bulunamadı
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
        {TAVILY_KEY_MESSAGE}
      </p>
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="px-5 py-2.5 bg-[#0078D4] hover:bg-[#106ebe] text-white text-xs font-bold rounded-lg shadow transition-all cursor-pointer"
        >
          Ayarlara Git
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-[#1b1a19] rounded-xl border border-[#EDEBE9] dark:border-[#323130] shadow-sm overflow-hidden flex flex-col md:flex-row h-[760px] relative">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500 z-10" />
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-[#106ebe] dark:bg-brand-500 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-semibold"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT NAVIGATION COLUMN: Screening Form & History */}
      <div className="w-full md:w-80 border-r border-[#EDEBE9] dark:border-[#323130] bg-[#FAF9F8] dark:bg-[#201f1e] p-5 flex flex-col overflow-y-auto shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1 px-2 rounded bg-amber-500/10 text-amber-500 font-bold text-[9px] uppercase select-none tracking-wider font-mono">
              {lang === "TR" ? "Kıdemli Danışman" : "Veteran Consultant"}
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 font-display">
              <Sparkles className="w-4 h-4 text-brand-500 animate-pulse" />
              {lang === "TR" ? "Gemini Satış Asistanı" : "Gemini Sales Assistant"}
            </h3>
          </div>

          <p className="text-[11px] text-[#0078D4] dark:text-brand-405 leading-relaxed bg-blue-50/50 dark:bg-black/10 p-2.5 rounded-lg border border-blue-100 dark:border-[#323130] mb-5">
            Tavily Search API ile gerçek web kaynakları taranır. Gemini yalnızca bulunan verileri analiz eder; tahmin veya uydurma yapılmaz.
          </p>

          {!hasTavilyKey && (
            <div className="mb-4 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 text-[10px] text-amber-700 dark:text-amber-400">
              {TAVILY_KEY_MESSAGE}
            </div>
          )}

          <form onSubmit={handleSearchCompany} className="space-y-3 mb-6">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 font-mono">
                HEDEF ŞİRKET VEYA FABRİKA ADI
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  placeholder={t("e.g. Vestel, Kordsa, siseçam.com")}
                  disabled={loading || !hasTavilyKey}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white dark:bg-[#11100f] border border-[#D2D0CE] dark:border-[#323130] rounded-lg focus:outline-none focus:border-[#0078D4] dark:focus:border-brand-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !companyInput.trim() || !hasTavilyKey}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#0078D4] to-[#106ebe] text-white rounded-lg text-xs font-bold shadow hover:from-[#106ebe] hover:to-[#005a9e] focus:outline-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-2.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Tavily Araştırması Yapılıyor...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  Şirket Araştırması Başlat
                </>
              )}
            </button>
          </form>
        </div>

        {/* Saved Research History */}
        <div className="flex-1 flex flex-col min-h-[250px] border-t border-[#EDEBE9] dark:border-[#323130] pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              ÇÖZÜMLEME GEÇMİŞİ ({savedAnalyses.length})
            </span>
          </div>

          {savedAnalyses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#EDEBE9] dark:border-[#323130] rounded-lg bg-white/50 dark:bg-black/5">
              <TrendingUp className="w-6 h-6 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-sans">Henüz analiz geçmişi boş.</p>
            </div>
          ) : (
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[400px] pr-1">
              {savedAnalyses.map((item) => {
                const isActive = activeAnalysis?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveAnalysis(item)}
                    className={`group w-full text-left px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-between border ${
                      isActive
                        ? "bg-white dark:bg-[#11100f] border-[#0078D4] dark:border-brand-500 shadow-sm text-slate-800 dark:text-slate-100"
                        : "bg-white/40 hover:bg-white dark:bg-black/5 dark:hover:bg-[#11100f] border-transparent text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#0078D4]" : "bg-slate-300 dark:bg-slate-600"}`}></div>
                      <div className="truncate">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.companyInput.toUpperCase()}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono scale-95 origin-left">{item.timestamp}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteAnalysis(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                      title="Geçmişten Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT DISPLAY PANEL */}
      <div className="flex-1 bg-white dark:bg-[#1b1a19] flex flex-col overflow-hidden h-full">
        
        {/* State 1: Active Loading Grounding Tracker */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-black/10">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-[#106ebe]/10 border-t-[#106ebe] animate-spin flex items-center justify-center"></div>
              <Sparkles className="w-6 h-6 text-brand-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>

            <motion.div
              key={loadingStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center max-w-sm"
            >
              <h4 className="text-[10px] font-bold text-[#106ebe] dark:text-brand-400 mb-2 font-display uppercase tracking-widest font-mono">
                TAVILY + GEMINI ARAŞTIRMASI
              </h4>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 font-display leading-relaxed">
                {loadingMessages[loadingStep]}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                Yalnızca Tavily tarafından dönen gerçek kaynaklar analiz edilir. Tahmin veya uydurma yapılmaz.
              </p>
            </motion.div>
          </div>
        ) : !hasTavilyKey ? (
          <TavilyMissingScreen />
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto">
            <div className="bg-white dark:bg-[#201f1e] p-6 rounded-2xl border border-red-200 dark:border-red-950/20 shadow-lg text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-2">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Araştırma Tamamlanamadı</h4>
              <p className="text-xs text-red-500 dark:text-red-400 text-center max-w-md mb-6">{error}</p>
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-[#252423] hover:bg-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Yeniden Dene
              </button>
            </div>
          </div>
        ) : !activeAnalysis ? (
          /* Empty Workspace Welcome Greeting */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/20 dark:bg-black/5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0078D4] to-indigo-500 text-white flex items-center justify-center shadow-md mb-6">
              <TrendingUp className="w-8 h-8 animate-pulse" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-display tracking-tight mb-2">
              {t("Gemini Sales Assistant: B2B Business Developer")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-8">
              Şirket adını girerek Tavily Search API ile gerçek web kaynaklarını tarayın. Gemini yalnızca bulunan verileri analiz eder.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl text-left">
              <div className="p-4 bg-white dark:bg-[#201f1e] border border-[#EDEBE9] dark:border-[#323130] rounded-xl shadow-sm">
                <Building2 className="w-5 h-5 text-[#0078D4] mb-2.5" />
                <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">Şirket Özeti</h5>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  Kaynaklarda bulunan sektör, ürün ve lokasyon bilgileri özetlenir.
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-[#201f1e] border border-[#EDEBE9] dark:border-[#323130] rounded-xl shadow-sm">
                <Target className="w-5 h-5 text-indigo-500 mb-2.5" />
                <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">Karar Vericiler</h5>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  Yalnızca doğrulanabilir isim ve ünvanlar listelenir.
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-[#201f1e] border border-[#EDEBE9] dark:border-[#323130] rounded-xl shadow-sm">
                <Mail className="w-5 h-5 text-emerald-500 mb-2.5" />
                <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">E-posta Keşfi</h5>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  İnternette gerçekten bulunan e-posta adresleri listelenir.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Selected Analysis Content */
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            
            {/* Display Header */}
            <div className="px-6 py-4 border-b border-[#EDEBE9] dark:border-[#323130] bg-[#FAF9F8] dark:bg-[#201f1e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-display">
                    {activeAnalysis.companyInput.toUpperCase()} SATIŞ GELİŞTİRME RAPORU
                  </h4>
                  <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-black/10 border border-[#EDEBE9] dark:border-[#323130] px-2 py-0.5 rounded-full">
                    {activeAnalysis.timestamp}
                  </span>
                </div>
                <div className="text-[10px] mt-1 text-slate-400 flex items-center gap-1 font-sans">
                  <span>Tavily Search API kaynaklarına dayalı gerçek veri analizi.</span>
                  {activeAnalysis.sources.length > 0 && (
                    <span className="font-semibold text-[#0078D4] dark:text-brand-400 hover:underline cursor-pointer">
                      ({activeAnalysis.sources.length} kaynak taranmıştır)
                    </span>
                  )}
                </div>
              </div>

              {/* Top Controls Action row */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePushToTargetAccounts}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Target Accounts Listesine Gönder"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Müşteri Listesine Ekle
                </button>

                <div className="flex bg-slate-100 dark:bg-black/20 p-1 rounded-lg border border-[#EDEBE9] dark:border-[#323130]">
                  <button
                    onClick={() => setActiveTab("visual")}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      activeTab === "visual"
                        ? "bg-white dark:bg-[#252423] text-[#0078D4] dark:text-brand-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    }`}
                  >
                    Görsel Panel
                  </button>
                  <button
                    onClick={() => setActiveTab("raw")}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      activeTab === "raw"
                        ? "bg-white dark:bg-[#252423] text-[#0078D4] dark:text-brand-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    }`}
                  >
                    MD Çıktısı (Raw)
                  </button>
                </div>
              </div>
            </div>

            {/* Main scrollable grid of parsed contents */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#FAF9F8] dark:bg-[#11100f]/10">
              
              {activeTab === "raw" ? (
                /* Raw Markdown Text tab */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">HAM ANALİZ RAPORU (TAVILY)</span>
                    <button
                      onClick={() => copyToClipboard(activeAnalysis.rawOutput, "raw")}
                      className="text-slate-400 hover:text-[#0078D4] p-1.5 bg-white dark:bg-[#201f1e] hover:bg-slate-100 dark:hover:bg-[#252423] rounded-lg border border-[#EDEBE9] dark:border-[#323130] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedSection === "raw" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          Metin Kopyalandı!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Raporu Kopyala
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs p-4 bg-white dark:bg-[#11100f] border border-[#EDEBE9] dark:border-[#323130] rounded-xl text-slate-700 dark:text-slate-200 overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                    {activeAnalysis.rawOutput}
                  </pre>
                </div>
              ) : (
                /* Dynamic visual panel cards */
                <div className="space-y-6">
                  
                  {/* Company Summary */}
                  <div className="bg-white dark:bg-[#201f1e] rounded-xl border border-[#EDEBE9] dark:border-[#323130] shadow-sm overflow-hidden p-5">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-[#323130]">
                      <Building2 className="w-4 h-4 text-[#0078D4]" />
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                        # Şirket Özeti
                      </h5>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                      {activeAnalysis.parsed.companySummary}
                    </div>
                  </div>

                  {/* Financial Data */}
                  <div className="bg-white dark:bg-[#201f1e] rounded-xl border border-rose-500/10 dark:border-rose-500/20 shadow-sm overflow-hidden p-5">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-rose-100 dark:border-[#323130]">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-rose-500" />
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                          # Finansal Veriler
                        </h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsFinancialExpanded(true)}
                          className="text-[10px] text-slate-500 hover:text-rose-600 dark:hover:text-[#dfdfde] font-bold px-2 py-1 bg-white dark:bg-[#11100f] border border-[#D2D0CE] dark:border-[#323130] rounded cursor-pointer flex items-center gap-1 transition-all"
                          title="Ekranı Genişlet"
                        >
                          <Maximize2 className="w-3 h-3 text-rose-500" />
                          Genişlet
                        </button>
                        <button
                          onClick={() => copyToClipboard(activeAnalysis.parsed.financialData, "financial")}
                          className="text-[10px] text-slate-500 hover:text-[#0078D4] dark:hover:text-brand-400 font-bold px-2 py-1 bg-white dark:bg-[#11100f] border border-[#D2D0CE] dark:border-[#323130] rounded cursor-pointer flex items-center gap-1 transition-all"
                        >
                          {copiedSection === "financial" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          Kopyala
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans bg-slate-50/50 dark:bg-black/10 p-4 rounded-lg border border-slate-100 dark:border-[#323130]">
                      {activeAnalysis.parsed.financialData}
                    </div>
                  </div>

                  {/* Email Discovery */}
                  <div className="bg-white dark:bg-[#201f1e] rounded-xl border border-[#EDEBE9] dark:border-[#323130] shadow-sm overflow-hidden p-5">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EDEBE9] dark:border-[#323130]">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-rose-500" />
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                          # E-posta Keşfi
                        </h5>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded uppercase font-mono">Doğrulanmış Adresler</span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-200 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-black/30 p-4 rounded-xl border border-dashed border-[#EDEBE9] dark:border-[#323130]">
                      {activeAnalysis.parsed.emailDiscovery}
                    </div>
                  </div>

                  {/* Decision Makers */}
                  <div className="bg-white dark:bg-[#201f1e] rounded-xl border border-[#EDEBE9] dark:border-[#323130] shadow-sm overflow-hidden p-5">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-100 dark:border-[#323130]">
                      <Target className="w-4 h-4 text-indigo-500" />
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                        # Karar Vericiler
                      </h5>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans bg-slate-50/50 dark:bg-black/10 p-3 rounded-lg border border-slate-100 dark:border-[#323130]">
                      {activeAnalysis.parsed.decisionMakers}
                    </div>
                  </div>

                  {/* Opportunity Analysis */}
                  <div className="bg-[#FAF9F8] dark:bg-[#201f1e] rounded-xl border border-[#0078D4]/20 dark:border-brand-500/20 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#252423] dark:to-[#201f1e] border-b border-[#EDEBE9] dark:border-[#323130] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-emerald-500" />
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                          # Fırsat Analizi
                        </h5>
                      </div>
                      <button
                        onClick={() => copyToClipboard(activeAnalysis.parsed.opportunityAnalysis, "outreach")}
                        className="text-slate-500 hover:text-[#0078D4] dark:hover:text-brand-400 px-2.5 py-1 bg-white dark:bg-[#11100f] hover:bg-slate-50 border border-[#D2D0CE] dark:border-[#323130] rounded-md text-[9px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {copiedSection === "outreach" ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            Kopyalandı!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Kopyala
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-5">
                      <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans bg-white dark:bg-black/20 p-4 rounded-lg border border-slate-100 dark:border-[#323130]">
                        {activeAnalysis.parsed.opportunityAnalysis}
                      </div>
                    </div>
                  </div>

                  {/* B2B E-Posta Oluşturucu */}
                  <div className="bg-white dark:bg-[#201f1e] rounded-xl border border-indigo-200 dark:border-indigo-950/40 shadow-sm overflow-hidden p-5">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-indigo-100 dark:border-[#323130]">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                          # 📬 B2B E-POSTA SIHİRBAZI & TASLAK OLUŞTURUCU
                        </h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEmailWizardExpanded(true)}
                          className="text-[10px] text-slate-500 hover:text-indigo-600 dark:hover:text-[#dfdfde] font-bold px-2 py-1 bg-white dark:bg-[#11100f] border border-[#D2D0CE] dark:border-[#323130] rounded cursor-pointer flex items-center gap-1 transition-all"
                          title="Ekranı Genişlet"
                        >
                          <Maximize2 className="w-3 h-3 text-indigo-500" />
                          Genişlet
                        </button>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase font-mono">Özelleştirilebilir Taslaklar</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed font-sans">
                      Şirket analizine uygun, hedeflenen sürekli iyileştirme konularına ve iletişim tipine özel cold/warm e-posta taslakları üretin.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-4">
                      {/* Left configuration settings */}
                      <div className="md:col-span-5 space-y-4">
                        {/* 1. İletişim Tipi */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">1. İLETİŞİM ALANI</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setGeneratorMailType("cold")}
                              className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                                generatorMailType === "cold"
                                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                                  : "border-slate-200 dark:border-[#323130] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#252423] text-xs"
                              }`}
                            >
                              <div className="text-[11px]">Soğuk Temas (Cold)</div>
                              <div className="text-[8px] opacity-75 mt-0.5">İlk kez tanışma</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setGeneratorMailType("warm")}
                              className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                                generatorMailType === "warm"
                                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                                  : "border-slate-200 dark:border-[#323130] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#252423] text-xs"
                              }`}
                            >
                              <div className="text-[11px]">Sıcak Temas (Warm)</div>
                              <div className="text-[8px] opacity-75 mt-0.5">İlgi uyandıran teklif</div>
                            </button>
                          </div>
                        </div>

                        {/* 2. Odak Konusu */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">2. ODAK KONUSU SEÇİN</label>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {[
                              "OEE (Ekipman Etkinliği) & Çevrim İyileştirme",
                              "Envanter & Stok Devir Hızı Optimizasyonu",
                              "COPQ (Kötü Kalite Maliyeti) Azaltma",
                              "Kaizen, 5S & Hücresel Üretim Kurulumu",
                              "ISO & Süreç Standardizasyonu Danışmanlığı"
                            ].map((tp) => (
                              <button
                                key={tp}
                                type="button"
                                onClick={() => setGeneratorTopic(tp)}
                                className={`px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer border ${
                                  generatorTopic === tp
                                    ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                                    : "bg-slate-100 dark:bg-[#11100f]/40 hover:bg-slate-200 text-slate-600 dark:text-slate-300 border-transparent text-[9px]"
                                }`}
                              >
                                {tp.split(" (")[0]}
                              </button>
                            ))}
                          </div>

                          <input
                            type="text"
                            value={generatorTopic}
                            onChange={(e) => setGeneratorTopic(e.target.value)}
                            className="w-full text-xs bg-slate-50 dark:bg-black/20 text-slate-800 dark:text-slate-200 px-3 py-2 border border-slate-200 dark:border-[#323130] rounded-lg focus:outline-none focus:border-indigo-500"
                            placeholder={t("Or enter a different focus topic...")}
                          />
                        </div>

                        {/* 3. İletişim Tonu */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">3. İLETİŞİM TONU</label>
                          <select
                            value={generatorTone}
                            onChange={(e) => setGeneratorTone(e.target.value)}
                            className="w-full text-xs bg-slate-50 dark:bg-[#11100f] text-slate-900 dark:text-white px-3 py-2 border border-slate-200 dark:border-[#323130] rounded-lg focus:outline-none focus:border-indigo-500 font-bold"
                          >
                            <option value="Profesyonel & Danışmanlık Yaklaşımı" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Profesyonel & Danışmanlık Yaklaşımı</option>
                            <option value="Kararlı & Doğrudan (Kısa ve Net)" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Kararlı & Doğrudan (Kısa ve Net)</option>
                            <option value="Çözüm Odaklı (Saha Terimleri Ağırlıklı)" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Çözüm Odaklı (Saha Terimleri Ağırlıklı)</option>
                            <option value="Yalın & Mütevazı İş Geliştirici" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Yalın & Mütevazı İş Geliştirici</option>
                          </select>
                        </div>

                        {/* 4. Ekstra Notlar */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">4. EKSTRA NOTLAR (İSTEĞE BAĞLI)</label>
                          <textarea
                            value={generatorExtraContext}
                            onChange={(e) => setGeneratorExtraContext(e.target.value)}
                            className="w-full text-xs bg-slate-50 dark:bg-black/20 text-slate-800 dark:text-slate-200 px-3 py-2 border border-slate-200 dark:border-[#323130] rounded-lg focus:outline-none focus:border-indigo-500 h-16 resize-none"
                            placeholder={t("Facility size reference, shared connection, or waste point to highlight...")}
                          />
                        </div>

                        {/* Generate Button */}
                        <button
                          type="button"
                          onClick={handleGenerateCustomPitch}
                          disabled={generatorLoading}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
                        >
                          {generatorLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              E-Posta Taslağı Hazırlanıyor...
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              Yapay Zeka ile E-Posta Şablonu Oluştur
                            </>
                          )}
                        </button>
                      </div>

                      {/* Right feedback display output panel */}
                      <div className="md:col-span-7 flex flex-col justify-between border border-slate-100 dark:border-[#323130] bg-slate-50/50 dark:bg-black/20 rounded-xl p-4 min-h-[300px]">
                        {generatedEmailResult ? (
                          <div className="flex-1 flex flex-col justify-between h-full space-y-3">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded font-mono uppercase">TASLAK HAZIR</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(generatedEmailResult, "wizard_email")}
                                  className="text-slate-500 hover:text-indigo-600 dark:hover:text-brand-400 px-2.5 py-1 bg-white dark:bg-[#11100f] hover:bg-slate-50 border border-[#D2D0CE] dark:border-[#323130] rounded-md text-[9px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer font-mono"
                                >
                                  {copiedSection === "wizard_email" ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      Taslak Kopyalandı!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      E-Postayı Kopyala
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="text-xs p-3.5 bg-white dark:bg-[#11100f] border border-slate-200 dark:border-[#323130] rounded-lg text-slate-700 dark:text-slate-200 font-sans whitespace-pre-wrap leading-relaxed shadow-sm max-h-[295px] overflow-y-auto">
                                {generatedEmailResult}
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-sans text-right italic leading-none">
                              *Bu taslak {activeAnalysis.companyInput.toUpperCase()} hedefleri ve seçtiğiniz focuses esas alınarak dinamik türetilmiştir.
                            </p>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                            <Mail className="w-8 h-8 text-indigo-400/40 mb-3" />
                            <h6 className="text-xs font-bold text-slate-700 dark:text-slate-300">Taslak Henüz Oluşturulmadı</h6>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs mt-1">
                              Sol taraftaki ayarları (iletişim tipi, odak konusu ve ton seçeneği) belirleyerek "E-Posta Şablonu Oluştur" butonuna tıklayın.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sources Grounding Citation details footer panel */}
                  {activeAnalysis.sources.length > 0 && (
                    <div className="p-4 bg-slate-100/50 dark:bg-black/10 rounded-xl border border-[#EDEBE9] dark:border-[#323130]">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-3 font-mono">
                        Kaynaklar (Tavily Search API)
                      </span>
                      <div className="space-y-2">
                        {activeAnalysis.sources.map((src, index) => (
                          <a
                            key={index}
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block bg-white dark:bg-[#201f1e] hover:bg-slate-50 dark:hover:bg-[#252423] text-[10px] text-slate-700 dark:text-slate-300 px-3 py-2 rounded-md border border-[#EDEBE9] dark:border-[#323130] transition-colors"
                          >
                            <div className="flex items-center gap-1.5 text-[#0078D4] dark:text-brand-400 font-semibold truncate">
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{src.title}</span>
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                              {src.domain || src.url}
                              {src.publishedDate ? ` · ${src.publishedDate}` : ""}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        )}

        {/* MODAL OVERLAYS FOR SCREEN EXPANSION */}
        {isFinancialExpanded && activeAnalysis && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-8">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-5xl max-h-[92vh] rounded-2xl border border-rose-500/20 dark:border-rose-500/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-rose-100 dark:border-[#323130] bg-slate-50/50 dark:bg-black/25">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-rose-500" />
                  <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                    # Finansal Veriler (Genişletilmiş Rapor)
                  </h5>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(activeAnalysis.parsed.financialData, "financial")}
                    className="text-xs text-slate-600 dark:text-slate-300 hover:text-[#0078D4] dark:hover:text-brand-400 font-bold px-3 py-1.5 bg-white dark:bg-[#11100f] border border-[#D2D0CE] dark:border-[#323130] rounded-lg cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    {copiedSection === "financial" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-0.5 h-3.5" />}
                    Raporu Kopyala
                  </button>
                  <button
                    onClick={() => setIsFinancialExpanded(false)}
                    className="p-1 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-[#321111] dark:hover:bg-[#4a1c1c] border border-rose-200 dark:border-rose-950/40 rounded-lg text-xs font-bold font-mono text-rose-700 dark:text-rose-300 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    Kapat
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-[#1c1c1a]">
                
                {/* Main analysis text */}
                <div className="text-xs md:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans bg-slate-50/50 dark:bg-black/20 p-6 rounded-xl border border-slate-100 dark:border-[#323130] shadow-inner select-text">
                  {activeAnalysis.parsed.financialData}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* B2B EMAIL WIZARD SCREEN EXPANSION MODAL OVERLAY */}
        {isEmailWizardExpanded && activeAnalysis && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-8">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-6xl max-h-[92vh] rounded-2xl border border-indigo-500/20 dark:border-indigo-500/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-indigo-100 dark:border-[#323130] bg-slate-50/50 dark:bg-black/25">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                    # 📬 B2B E-POSTA SIHİRBAZI & TASLAK OLUŞTURUCU (Genişletilmiş Güçlü Editör)
                  </h5>
                </div>
                <button
                  onClick={() => setIsEmailWizardExpanded(false)}
                  className="p-1 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-[#1b1c32] dark:hover:bg-[#20224a] border border-indigo-100 dark:border-indigo-950/40 rounded-lg text-xs font-bold font-mono text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  Kapat
                </button>
              </div>

              {/* Body */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white dark:bg-[#1a1a1a] space-y-6">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans max-w-3xl">
                  Şirket analizine uygun, hedeflenen sürekli iyileştirme konularına ve iletişim tipine özel cold/warm e-posta taslakları üretin. OpEx metodolojisindeki zayıflıkları avantaja dönüştürecek stratejik şablon editörü.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Left Column Config */}
                  <div className="lg:col-span-5 space-y-5 bg-slate-50/50 dark:bg-black/15 p-5 rounded-xl border border-slate-100 dark:border-slate-800/45">
                    
                    {/* 1. İletişim Tipi */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block mb-2 font-mono">1. İLETİŞİM ALANI</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setGeneratorMailType("cold")}
                          className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                            generatorMailType === "cold"
                              ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                              : "border-slate-200 dark:border-[#323130] text-slate-500 hover:bg-slate-100 dark:hover:bg-[#252423] text-xs"
                          }`}
                        >
                          <div className="text-[12px]">Soğuk Temas (Cold)</div>
                          <div className="text-[9px] opacity-75 mt-0.5">İlk kez tanışma</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGeneratorMailType("warm")}
                          className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                            generatorMailType === "warm"
                              ? "border-indigo-500 bg-indigo-505/10 text-indigo-600 dark:text-indigo-400 font-bold"
                              : "border-slate-200 dark:border-[#323130] text-slate-500 hover:bg-slate-100 dark:hover:bg-[#252423] text-xs"
                          }`}
                        >
                          <div className="text-[12px]">Sıcak Temas (Warm)</div>
                          <div className="text-[9px] opacity-75 mt-0.5">İlgi uyandıran teklif</div>
                        </button>
                      </div>
                    </div>

                    {/* 2. Odak Konusu */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block mb-2 font-mono">2. ODAK KONUSU SEÇİN</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[
                          "OEE (Ekipman Etkinliği) & Çevrim İyileştirme",
                          "Envanter & Stok Devir Hızı Optimizasyonu",
                          "COPQ (Kötü Kalite Maliyeti) Azaltma",
                          "Kaizen, 5S & Hücresel Üretim Kurulumu",
                          "ISO & Süreç Standardizasyonu Danışmanlığı"
                        ].map((tp) => (
                          <button
                            key={tp}
                            type="button"
                            onClick={() => setGeneratorTopic(tp)}
                            className={`px-3 py-1.5 rounded text-[11px] font-medium transition-all cursor-pointer border ${
                              generatorTopic === tp
                                ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs"
                                : "bg-white dark:bg-[#11100f] hover:bg-slate-200/50 dark:hover:bg-[#252423] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-rose-950/20 text-[10px]"
                            }`}
                          >
                            {tp}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        value={generatorTopic}
                        onChange={(e) => setGeneratorTopic(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3 py-2.5 border border-slate-200 dark:border-[#323130] rounded-lg focus:outline-none focus:border-indigo-500"
                        placeholder={t("Or enter a different focus topic...")}
                      />
                    </div>

                    {/* 3. İletişim Tonu */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block mb-2 font-mono">3. İLETİŞİM TONU</label>
                      <select
                        value={generatorTone}
                        onChange={(e) => setGeneratorTone(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-[#11100f] text-slate-900 dark:text-white px-3 py-2.5 border border-slate-200 dark:border-[#323130] rounded-lg focus:outline-none focus:border-indigo-500 font-bold"
                      >
                        <option value="Profesyonel & Danışmanlık Yaklaşımı" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Profesyonel & Danışmanlık Yaklaşımı</option>
                        <option value="Kararlı & Doğrudan (Kısa ve Net)" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Kararlı & Doğrudan (Kısa ve Net)</option>
                        <option value="Çözüm Odaklı (Saha Terimleri Ağırlıklı)" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Çözüm Odaklı (Saha Terimleri Ağırlıklı)</option>
                        <option value="Yalın & Mütevazı İş Geliştirici" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">Yalın & Mütevazı İş Geliştirici</option>
                      </select>
                    </div>

                    {/* 4. Ekstra Notlar */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block mb-2 font-mono">4. EKSTRA NOTLAR (İSTEĞE BAĞLI)</label>
                      <textarea
                        value={generatorExtraContext}
                        onChange={(e) => setGeneratorExtraContext(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3 py-2.5 border border-slate-200 dark:border-[#323130] rounded-lg focus:outline-none focus:border-indigo-500 h-24 resize-none"
                        placeholder={t("Facility size reference, shared connection, or waste point to highlight...")}
                      />
                    </div>

                    {/* Generate Button */}
                    <button
                      type="button"
                      onClick={handleGenerateCustomPitch}
                      disabled={generatorLoading}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
                    >
                      {generatorLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Geniş Ayrıntılı Şablon Taslağı Hazırlanıyor...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Yapay Zeka ile E-Posta Şablonu Oluştur
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right Column Monitor */}
                  <div className="lg:col-span-7 flex flex-col justify-between border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-black/25 rounded-xl p-6 min-h-[450px]">
                    {generatedEmailResult ? (
                      <div className="flex-1 flex flex-col justify-between h-full space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded font-mono uppercase">E-POSTA TASLAĞI HAZIR</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(generatedEmailResult, "wizard_email")}
                              className="text-[#37352f] dark:text-[#dfdfde] hover:text-indigo-600 dark:hover:text-brand-400 px-3.5 py-1.5 bg-white dark:bg-[#11100f] hover:bg-slate-50 border border-[#D2D0CE] dark:border-[#323130] rounded-md text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer font-mono"
                            >
                              {copiedSection === "wizard_email" ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-500" />
                                  Kopyalandı!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Şablonu Kopyala
                                </>
                              )}
                            </button>
                          </div>
                          <div className="text-xs md:text-sm p-5 bg-white dark:bg-[#11100f] border border-slate-200 dark:border-[#323130] rounded-lg text-slate-700 dark:text-slate-200 font-sans whitespace-pre-wrap leading-relaxed shadow-xs max-h-[480px] overflow-y-auto select-text">
                            {generatedEmailResult}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans text-right italic leading-none block">
                          *Bu şablon {activeAnalysis.companyInput.toUpperCase()} hedefleri ve seçtiğiniz focuses esas alınarak dinamik türetilmiştir.
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <Mail className="w-16 h-16 text-indigo-400/40 mb-4 animate-bounce" />
                        <h6 className="text-sm font-bold text-slate-700 dark:text-slate-300">Taslak Henüz Oluşturulmadı</h6>
                        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-2 leading-relaxed">
                          Sol taraftaki ayarları (iletişim tipi, odak konusu ve ton seçeneği) belirleyerek "E-Posta Şablonu Oluştur" butonuna tıklayın.
                        </p>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
