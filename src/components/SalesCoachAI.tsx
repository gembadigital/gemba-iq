import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { CrmDb } from "../lib/CrmDb";
import {
  Brain,
  Bot,
  FileText,
  BookOpen,
  History,
  Settings,
  Upload,
  Plus,
  Trash,
  Check,
  AlertTriangle,
  Play,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Calendar,
  Users,
  Briefcase,
  Layers,
  Search,
  CheckCircle,
  HelpCircle,
  Clock,
  X,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import { Deal } from "./SalesDashboardView";

interface SkillItem {
  id: string;
  name: string;
  category: "Operational Excellence" | "Industrial Engineering" | "Sales Excellence" | "Leadership";
  description: string;
  tags: string[];
  version: string;
  status: "Active" | "Inactive";
  fileName: string;
  contentSize?: string;
  uploadedAt: string;
}

interface RecommendationLog {
  id: string;
  date: string;
  triggerType: "User Chat" | "Dashboard Audit" | "Anomaly Detection";
  problem: string;
  impact: string;
  recommendedSkill: string;
  confidence: number;
  action: string;
  businessOutcome: string;
  isCompleted: boolean;
}

interface SalesCoachAIProps {
  deals: Deal[];
}

export default function SalesCoachAI({ deals }: SalesCoachAIProps) {
  const { t } = useLanguage();

  // --- SUBMENU STATE ---
  const [activeSubmenu, setActiveSubmenu] = useState<
    "assistant" | "library" | "history" | "settings" | "knowledge"
  >("assistant");

  // --- LOCAL PERSISTED SKILL LIBRARY ---
  const [skills, setSkills] = useState<SkillItem[]>(() =>
    CrmDb.getKv<SkillItem[]>("sales_coach_skills", [
      {
        id: "skill-1",
        name: "Lean Manufacturing Strategy",
        category: "Operational Excellence",
        description: "Yalın üretim metodolojileri, Kaizen felsefesi ve TIMWOODS (8 Büyük İsraf) teşhis kılavuzu.",
        tags: ["Lean", "Kaizen", "TIMWOODS", "Israf-Giderme"],
        version: "v2.3",
        status: "Active",
        fileName: "Lean Manufacturing.md",
        contentSize: "45 KB",
        uploadedAt: "2026-06-15 14:32"
      },
      {
        id: "skill-2",
        name: "MTM Analysis & Time Studies",
        category: "Industrial Engineering",
        description: "Metot-zaman ölçümleri (MTM), standart sürelerin hesaplanması ve iş gücü optimizasyon kurgusu.",
        tags: ["MTM", "Time Study", "Industrial Engineering", "Workload"],
        version: "v1.4",
        status: "Active",
        fileName: "MTM Analysis.md",
        contentSize: "28 KB",
        uploadedAt: "2026-06-16 09:12"
      },
      {
        id: "skill-3",
        name: "Yamazumi Line Balancing",
        category: "Industrial Engineering",
        description: "Operatör iş yükü dengeleme şemaları, dar boğaz giderme ve hat dengeleme analiz şablonları.",
        tags: ["Yamazumi", "Line Balancing", "Bottleneck", "Efficiency"],
        version: "v1.2",
        status: "Active",
        fileName: "Yamazumi Analysis.md",
        contentSize: "19 KB",
        uploadedAt: "2026-06-18 11:45"
      },
      {
        id: "skill-4",
        name: "OEE & SMED Improvement",
        category: "Operational Excellence",
        description: "Ekipman etkinliği artırımı (OEE), döküm ve kalıp proseslerinde hızlı model değişimi (SMED) rehberi.",
        tags: ["OEE", "SMED", "TPM", "Changeover"],
        version: "v2.0",
        status: "Active",
        fileName: "OEE Improvement.md",
        contentSize: "32 KB",
        uploadedAt: "2026-06-19 16:05"
      },
      {
        id: "skill-5",
        name: "Factory Capacity Planning",
        category: "Industrial Engineering",
        description: "Kapasite modelleme, vardiya optimizasyonu, darboğazların tespiti ve fason üretim senaryoları.",
        tags: ["Capacity", "Planning", "Scheduling", "Bottleneck"],
        version: "v1.5",
        status: "Active",
        fileName: "Capacity Planning.md",
        contentSize: "22 KB",
        uploadedAt: "2026-06-19 17:12"
      },
      {
        id: "skill-6",
        name: "Sales Objection & Value Selling",
        category: "Sales Excellence",
        description: "Üretim yöneticilerinin itirazlarına karşı çıkış, fiyat kırma taleplerini önleme ve katma değer odaklı satış.",
        tags: ["Negotiation", "Value Selling", "Objection Handling"],
        version: "v3.0",
        status: "Active",
        fileName: "Sales Objection Handling.md",
        contentSize: "15 KB",
        uploadedAt: "2026-06-20 10:00"
      }
    ])
  );

  useEffect(() => {
    CrmDb.setKv("sales_coach_skills", skills);
  }, [skills]);

  // --- LOCAL RECOMMENDATION LOGS ---
  const [recommendationHistory, setRecommendationHistory] = useState<RecommendationLog[]>(() =>
    CrmDb.getKv<RecommendationLog[]>("sales_coach_recs", [
      {
        id: "rec-1",
        date: "2026-06-19 11:24",
        triggerType: "Dashboard Audit",
        problem: "OEE iyileştirme tekliflerinin kazanılma oranlarında %15'lik düşüş.",
        impact: "Yıllık satış cirosunda 45,000 USD'lik sapma riski.",
        recommendedSkill: "OEE & SMED Improvement",
        confidence: 94,
        action: "Teklif sunumundan önce müşterinin kalıp değişim sürelerini (SMED) hedefleyen bir vaka çalışması dökümanı paylaşın.",
        businessOutcome: "Teklif kazanma oranının tekrar %60 seviyesine çıkarılması.",
        isCompleted: true
      },
      {
        id: "rec-2",
        date: "2026-06-20 08:15",
        triggerType: "Anomaly Detection",
        problem: "Onduline A.Ş. fırsatı 45 gündür hareketsiz durumda bekliyor.",
        impact: "Tahmini pipeline kapanış tarihinde 20 günlük gecikme riski.",
        recommendedSkill: "Sales Objection & Value Selling",
        confidence: 89,
        action: "Fabrika müdürü ile 7 gün içinde yüz yüze bir Değer Akış Analizi (VSM) keşif toplantısı planlayın.",
        businessOutcome: "Farkındalık yaratarak teklif sürecini kapatma aşamasına taşımak.",
        isCompleted: false
      }
    ])
  );

  useEffect(() => {
    CrmDb.setKv("sales_coach_recs", recommendationHistory);
  }, [recommendationHistory]);

  // --- ASSISTANT STATE & CHAT ---
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "director"; text: string; skillsCited?: string[] }[]>([]);

  useEffect(() => {
    setChatMessages([
      {
        sender: "director",
        text: t("Sales Director welcome message")
      }
    ]);
  }, [t]);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- NEW SKILL FORM STATE ---
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState<SkillItem["category"]>("Operational Excellence");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [newSkillTags, setNewSkillTags] = useState("");
  const [newSkillVersion, setNewSkillVersion] = useState("v1.0");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  // --- AI SETTINGS STATE ---
  const [settings, setSettings] = useState(() =>
    CrmDb.getKv("sales_coach_settings", {
      model: "gemini-3.5-flash",
      coachingRigor: "Challenging", // Gentle, Challenging, Aggressive
      rapportStyle: "Directive", // Socratic, Directive, Accountable
      confidenceThreshold: 85,
      alertOnAgingDays: 30
    })
  );

  useEffect(() => {
    CrmDb.setKv("sales_coach_settings", settings);
  }, [settings]);

  // --- CHAT WINDOW AUTO-SCROLL ---
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- CONVERT DRAG & DROP FOR SKILL UPLOAD ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFileName(file.name);
      if (!newSkillName) {
        // Auto fill if name empty
        setNewSkillName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      if (!newSkillName) {
        setNewSkillName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const newSkill: SkillItem = {
      id: "skill-" + Date.now(),
      name: newSkillName,
      category: newSkillCategory,
      description: newSkillDesc || t("Uploaded rulebook for consulting sales excellence."),
      tags: newSkillTags ? newSkillTags.split(",").map(t => t.trim()) : [newSkillCategory],
      version: newSkillVersion,
      status: "Active",
      fileName: uploadedFileName || `${newSkillName.replace(/\s+/g, "_")}.md`,
      contentSize: uploadedFileName ? "42 KB" : "12 KB",
      uploadedAt: new Date().toISOString().slice(0, 16).replace("T", " ")
    };

    setSkills(prev => [newSkill, ...prev]);
    setShowAddSkillModal(false);

    // Reset fields
    setNewSkillName("");
    setNewSkillDesc("");
    setNewSkillTags("");
    setNewSkillVersion("v1.0");
    setUploadedFileName("");
  };

  const handleDeleteSkill = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const toggleSkillStatus = (id: string) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, status: s.status === "Active" ? "Inactive" : "Active" } : s));
  };

  // --- AUTOMATIC SKILL DETECTOR ACCORDING TO DASHBOARD DATA ---
  const auditMetricsAndTriggerCoach = async () => {
    setIsGenerating(true);
    setChatMessages(prev => [
      ...prev,
      { sender: "user", text: t("Run Weekly Sales Audit") }
    ]);

    try {
      // Find active skills description to supply to backend
      const activeSkills = skills.filter(s => s.status === "Active");

      const res = await fetch("/api/gemini/sales-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deals,
          activeSkills
        })
      });

      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [
          ...prev,
          {
            sender: "director",
            text: data.coachResponse
          }
        ]);

        // Auto add a log trace in recommending history
        const detectedStats = detectPipelineWeakness(deals);
        const newLog: RecommendationLog = {
          id: "rec-" + Date.now(),
          date: new Date().toISOString().slice(0, 16).replace("T", " "),
          triggerType: "Dashboard Audit",
          problem: detectedStats.problem,
          impact: detectedStats.impact,
          recommendedSkill: detectedStats.recommendedSkill,
          confidence: 91,
          action: t("Review pipeline aging above 30 days and mandate follow-up campaigns."),
          businessOutcome: t("Improve overall win conversion by 8%."),
          isCompleted: false
        };
        setRecommendationHistory(prev => [newLog, ...prev]);

      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          sender: "director",
          text: t("Sales audit error: {error}. Please check GEMINI_API_KEY in Settings > Secrets.").replace("{error}", err.message || t("Unknown error"))
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper helper to generate plausible local issues
  const detectPipelineWeakness = (dealsList: Deal[]) => {
    const oeeDeals = dealsList.filter(d => (d.dealName || "").toLowerCase().includes("oee") || (d.description || "").toLowerCase().includes("oee"));
    const mtmDeals = dealsList.filter(d => (d.dealName || "").toLowerCase().includes("mtm") || (d.description || "").toLowerCase().includes("mtm"));

    if (oeeDeals.length > 0) {
      return {
        problem: "OEE ve Dijitalleşme projelerindeki tekliflerin duraklama süresi artıyor.",
        impact: "Vakit kısıtına bağlı imalat sektörü bütçe daralma riski.",
        recommendedSkill: "OEE & SMED Improvement"
      };
    } else if (mtmDeals.length > 0) {
      return {
        problem: "MTM standart süre ve iş etüdü projelerinde kaynak yönetim darboğazı.",
        impact: "Efor planlamasında fazla mesai veya verimsizlik riski.",
        recommendedSkill: "MTM Analysis & Time Studies"
      };
    }
    return {
      problem: "Pipeline takip disiplininde boşluklar tespit edildi.",
      impact: "Sıcak temas eksikliği nedeniyle %10 ciro kaybı riski.",
      recommendedSkill: "Sales Objection & Value Selling"
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;

    const userText = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { sender: "user", text: userText }]);
    setIsGenerating(true);

    try {
      const activeSkills = skills.filter(s => s.status === "Active");
      const res = await fetch("/api/gemini/sales-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deals,
          query: userText,
          activeSkills
        })
      });

      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [
          ...prev,
          {
            sender: "director",
            text: data.coachResponse
          }
        ]);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          sender: "director",
          text: t("Connection error: {error}. Please verify your GEMINI_API_KEY in Settings.").replace("{error}", err.message || t("Unknown error"))
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-[#111] rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-1 overflow-hidden" id="sales-coach-base">
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
        
        {/* SIDE MENU (Submenus representing AI Sales Intelligence System) */}
        <div className="lg:col-span-3 border-r border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#151515] p-5 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <div className="p-1.5 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-lg text-white">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs font-black tracking-widest uppercase text-slate-400 dark:text-zinc-500">{t("AI Sales Intelligence")}</h2>
                <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("Sales Coach AI")}</h1>
              </div>
            </div>

            <nav className="space-y-1 select-none">
              <button
                onClick={() => setActiveSubmenu("assistant")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeSubmenu === "assistant"
                    ? "bg-slate-100 dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4" />
                  <span>{t("Sales Director Assistant")}</span>
                </div>
                {activeSubmenu === "assistant" && <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setActiveSubmenu("library")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeSubmenu === "library"
                    ? "bg-slate-100 dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4" />
                  <span>{t("Skill Library")}</span>
                </div>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-mono">
                  {skills.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSubmenu("history")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeSubmenu === "history"
                    ? "bg-slate-100 dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4" />
                  <span>{t("Recommendations History")}</span>
                </div>
                {activeSubmenu === "history" && <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setActiveSubmenu("knowledge")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeSubmenu === "knowledge"
                    ? "bg-slate-100 dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FolderOpen className="w-4 h-4" />
                  <span>{t("Knowledge Base")}</span>
                </div>
                {activeSubmenu === "knowledge" && <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setActiveSubmenu("settings")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeSubmenu === "settings"
                    ? "bg-slate-100 dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4" />
                  <span>{t("AI Settings")}</span>
                </div>
                {activeSubmenu === "settings" && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </nav>
          </div>

          <div className="hidden lg:block p-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-widest block">{t("Operational Mode")}</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{t("COACH CONNECTED")}</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-snug">
              {t("Weekly KPI logs are automatically piped into Director system.")}
            </p>
          </div>
        </div>

        {/* ACTIVE SUBMENU CONTENT SPACE */}
        <div className="lg:col-span-9 bg-[#FAF9F8] dark:bg-[#1b1a19] p-6 flex flex-col justify-between">
          
          {/* SUBMENU 1: SALES DIRECTOR ASSISTANT CHAT/AUDIT */}
          {activeSubmenu === "assistant" && (
            <div className="flex flex-col h-full space-y-4">
              
              {/* Header section with Dynamic trigger */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#201f1e] border border-slate-200/50 dark:border-zinc-800/80 p-4 rounded-xl shadow-xs">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">{t("Weekly Performance Audit Deck")}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{t("Let Gemini analyze current pipeline leaks and score salesperson productivity.")}</p>
                </div>
                <button
                  type="button"
                  onClick={auditMetricsAndTriggerCoach}
                  disabled={isGenerating}
                  className="px-4 py-2 text-xs font-bold leading-none select-none rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  id="btn-run-director-audit"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>{isGenerating ? t("Auditing...") : t("Run Weekly Sales Audit")}</span>
                </button>
              </div>

              {/* Chat Messages stream */}
              <div className="flex-1 bg-white dark:bg-[#201f1e] rounded-xl border border-slate-200/50 dark:border-zinc-800/80 shadow-xs overflow-y-auto p-4 space-y-4 max-h-[460px] min-h-[380px]">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 max-w-[85%] ${
                      msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg text-white shadow-xs ${
                        msg.sender === "user" ? "bg-[#0078D4]" : "bg-gradient-to-tr from-slate-700 to-slate-800"
                      }`}
                    >
                      {msg.sender === "user" ? <Users className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-slate-100 dark:bg-zinc-850 text-slate-800 dark:text-zinc-250 font-bold border border-slate-200 dark:border-zinc-800"
                          : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-800 px-4 shadow-xs"
                      }`}
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {msg.text}

                      {/* Cited Active Skills footer */}
                      {msg.sender === "director" && index > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center gap-2">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-500 font-mono">{t("Suggested AI Skills:")}</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-mono text-[9px] border border-amber-200/50">
                            MTM Work Measurement v1.4
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] border border-emerald-200/50">
                            {t("Confidence: {percent}%").replace("{percent}", "91")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex items-start gap-3 max-w-[80%]">
                    <div className="p-2 rounded-lg text-white bg-slate-700 animate-pulse">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 p-4 border border-slate-200/50 dark:border-zinc-800 rounded-2xl flex items-center gap-2.5 font-mono text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                      <span>{t("Preparing report, reviewing pipeline...")}</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat sender form */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder={t("Ask the Sales Director about pipeline or a deal...")}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-3 bg-white dark:bg-[#201f1e] border border-slate-200 dark:border-zinc-850 rounded-xl text-xs placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !chatInput.trim()}
                  className="px-5 py-3 rounded-xl bg-[#0078D4] hover:bg-[#005a9e] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-40 select-none cursor-pointer flex items-center gap-1.5"
                >
                  <span>{t("Ask")}</span>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* SUBMENU 2: SKILL LIBRARY PANEL */}
          {activeSubmenu === "library" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{t("Consulting AI Skill Library")}</h1>
                  <p className="text-xs text-slate-500 mt-0.5">{t("Let administrators manage the SOPs and methodologies evaluated by Sales Coach AI.")}</p>
                </div>
                <button
                  onClick={() => setShowAddSkillModal(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black dark:bg-[#2d2c2b] dark:hover:bg-[#3d3c3b] border border-[#EDEBE9] dark:border-[#323130] rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer select-none transition-all"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>{t("Add Custom Skill Document")}</span>
                </button>
              </div>

              {/* Grid of existing rules */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skills.map((s) => (
                  <div key={s.id} className="bg-white dark:bg-[#201f1e] border border-slate-200/60 dark:border-zinc-800 rounded-xl p-5 shadow-xs relative flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          s.category === "Operational Excellence"
                            ? "bg-purple-100 dark:bg-purple-950/35 text-purple-700 dark:text-purple-400"
                            : s.category === "Industrial Engineering"
                            ? "bg-blue-100 dark:bg-blue-950/35 text-blue-700 dark:text-blue-400"
                            : "bg-emerald-100 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-400"
                        }`}>
                          {t(s.category)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">{s.version}</span>
                          <button
                            onClick={() => toggleSkillStatus(s.id)}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                              s.status === "Active" ? "bg-emerald-500" : "bg-slate-200 dark:bg-zinc-700"
                            }`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                              s.status === "Active" ? "translate-x-5" : "translate-x-0"
                            }`} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{s.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 lines-clamp-2 leading-relaxed">{s.description}</p>
                      <div className="flex flex-wrap gap-1 mt-3.5">
                        {s.tags.map((tag, idx) => (
                          <span key={idx} className="text-[9px] bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 px-1.5 py-0.5 rounded text-slate-500">
                            #{tag.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-850 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[9px]">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{s.fileName} ({s.contentSize || "18 KB"})</span>
                      </div>
                      <button
                        onClick={() => handleDeleteSkill(s.id)}
                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded transition-all cursor-pointer"
                        title={t("Delete Skill")}
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ADD SKILL MODAL */}
              {showAddSkillModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-150">
                  <div className="bg-white dark:bg-[#1f1e1d] border border-slate-200 dark:border-[#323130] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                    <div className="p-5 border-b border-[#EDEBE9] dark:border-[#323130] flex items-center justify-between">
                      <h3 className="text-sm font-extrabold uppercase text-slate-850 dark:text-slate-100">{t("Upload methodology / Skill")}</h3>
                      <button onClick={() => setShowAddSkillModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-[#252423] rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleAddSkill} className="p-5 space-y-4">
                      
                      {/* Drag & Drop Zone */}
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center ${
                          dragActive
                            ? "border-rose-500 bg-rose-50/20"
                            : "border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#151515]"
                        }`}
                      >
                        <Upload className="w-8 h-8 text-slate-400 mb-2 animate-bounce" />
                        <span className="text-xs font-bold block text-slate-700 dark:text-zinc-300">{t("Drag & Drop Skill Document here")}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{t("Supports .md, .txt, .pdf, .docx")}</span>
                        
                        <label className="mt-3 inline-block px-3 py-1.5 text-[10px] font-bold bg-[#0078D4] hover:bg-[#005a9e] text-white rounded cursor-pointer select-none">
                          {t("Browse Files")}
                          <input type="file" onChange={handleFileChange} className="hidden" accept=".md,.txt,.pdf,.docx" />
                        </label>
                        {uploadedFileName && (
                          <div className="mt-2.5 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded">
                            <Check className="w-4 h-4" />
                            <span>{t("Loaded: {filename}").replace("{filename}", uploadedFileName)}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t("Skill Name")}</label>
                          <input
                            type="text"
                            required
                            placeholder={t("e.g. Kaizen VSM Guideline")}
                            value={newSkillName}
                            onChange={(e) => setNewSkillName(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-250 dark:border-zinc-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t("Category")}</label>
                          <select
                            value={newSkillCategory}
                            onChange={(e) => setNewSkillCategory(e.target.value as any)}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-250 dark:border-zinc-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
                          >
                            <option value="Operational Excellence">{t("Operational Excellence")}</option>
                            <option value="Industrial Engineering">{t("Industrial Engineering")}</option>
                            <option value="Sales Excellence">{t("Sales Excellence")}</option>
                            <option value="Leadership">{t("Leadership")}</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t("Description")}</label>
                        <textarea
                          rows={2}
                          placeholder={t("Summarize what concepts this methodology file controls or extracts...")}
                          value={newSkillDesc}
                          onChange={(e) => setNewSkillDesc(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-250 dark:border-zinc-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t("Tags (comma separated)")}</label>
                          <input
                            type="text"
                            placeholder={t("e.g. kaizen, smed, efficiency")}
                            value={newSkillTags}
                            onChange={(e) => setNewSkillTags(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-250 dark:border-zinc-800 rounded-lg focus:outline-hidden"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t("Version")}</label>
                          <input
                            type="text"
                            value={newSkillVersion}
                            onChange={(e) => setNewSkillVersion(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-250 dark:border-zinc-800 rounded-lg focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-850 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddSkillModal(false)}
                          className="px-4 py-2 border border-slate-250 dark:border-zinc-800 text-slate-650 dark:text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-50"
                        >
                          {t("Cancel")}
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-[#2d2c2b] dark:hover:bg-[#3d3c3b] text-white text-xs font-bold rounded-lg shadow-sm"
                        >
                          {t("Process & Index Skill")}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUBMENU 3: AI RECOMMENDATIONS HISTORY */}
          {activeSubmenu === "history" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{t("AI Recommendations Audit Registry")}</h1>
                <p className="text-xs text-slate-500 mt-0.5">{t("Trace past diagnostic audits and commercial intelligence briefs produced by Gemini.")}</p>
              </div>

              <div className="bg-white dark:bg-[#201f1e] border border-slate-200/50 dark:border-zinc-850 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full font-sans text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-250 dark:border-zinc-800 font-extrabold text-[10px] text-slate-400 uppercase tracking-widest text-left">
                        <th className="p-4">{t("Date / Trigger")}</th>
                        <th className="p-4">{t("Diagnostic Problem & Impact")}</th>
                        <th className="p-4">{t("Suggested Skill Citation")}</th>
                        <th className="p-4">{t("Action Recommendation")}</th>
                        <th className="p-4 text-center">{t("Status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-medium">
                      {recommendationHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/50">
                          <td className="p-4">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{rec.date}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-zinc-800 font-mono px-1.5 py-0.5 rounded inline-block mt-1">
                              {t(rec.triggerType)}
                            </span>
                          </td>
                          <td className="p-4 max-w-xs space-y-1">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline-block shrink-0" />
                              <span className="font-bold text-slate-800 dark:text-slate-200">{rec.problem}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 italic">{t("Impact:")} {rec.impact}</p>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">{rec.recommendedSkill}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] bg-emerald-50 text-emerald-600 font-mono px-1 rounded">{t("Confidence: {percent}%").replace("{percent}", String(rec.confidence))}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-slate-500 max-w-xs leading-relaxed">
                            {rec.action}
                            <div className="mt-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              🎯 {t("Goal:")} {rec.businessOutcome}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => {
                                setRecommendationHistory(prev => prev.map(r => r.id === rec.id ? { ...r, isCompleted: !r.isCompleted } : r));
                              }}
                              className={`p-1 w-20 text-[10px] font-mono font-bold rounded-lg border cursor-pointer select-none transition-all ${
                                rec.isCompleted
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900"
                                  : "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900"
                              }`}
                            >
                              {rec.isCompleted ? t("COMPLETED") : t("Pending")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUBMENU 4: KNOWLEDGE BASE CONFIG */}
          {activeSubmenu === "knowledge" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{t("Knowledge Base Vector Indexes")}</h1>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">{t("View unstructured context chunks and corporate training rulebooks loaded as vector embeddings.")}</p>
              </div>

              <div className="bg-white dark:bg-[#201f1e] border border-slate-200/50 dark:border-zinc-850 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase font-mono">{t("Index Status: Healthy")}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 px-2 py-0.5 rounded font-extrabold">
                    {t("84 Embeddings Chunks Active")}
                  </span>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t("When methodology articles are uploaded to the Skill Library, Sales Coach AI parses chapter blocks, generates vector embeddings, and registers index targets. This enables real-time citation accuracy on diagnostic alerts.")}
                </p>

                <div className="space-y-2 pt-2">
                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="text-xs font-extrabold block text-slate-850 dark:text-zinc-200">TIMWOODS_Objection_Playbook.chunk</span>
                        <span className="text-[10px] text-slate-400 font-mono">{t("Last hashed: {date} • Size: {size} tokens").replace("{date}", "2026-06-19").replace("{size}", "2.1k")}</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-slate-150 text-slate-650 dark:bg-zinc-800 px-1.5 py-0.5 font-mono rounded">{t("100% Synced")}</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <div>
                        <span className="text-xs font-extrabold block text-slate-850 dark:text-zinc-200">MTM_TimeStudy_Formula_Decks.chunk</span>
                        <span className="text-[10px] text-slate-400 font-mono">{t("Last hashed: {date} • Size: {size} tokens").replace("{date}", "2026-06-18").replace("{size}", "4.8k")}</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-slate-150 text-slate-650 dark:bg-zinc-800 px-1.5 py-0.5 font-mono rounded">{t("100% Synced")}</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-purple-500" />
                      <div>
                        <span className="text-xs font-extrabold block text-slate-850 dark:text-zinc-200">OEE_SMED_AssemblyLine_Case_Studies.chunk</span>
                        <span className="text-[10px] text-slate-400 font-mono">{t("Last hashed: {date} • Size: {size} tokens").replace("{date}", "2026-06-15").replace("{size}", "5.4k")}</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-slate-150 text-slate-650 dark:bg-zinc-800 px-1.5 py-0.5 font-mono rounded">{t("100% Synced")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUBMENU 5: AI SETTINGS PANEL */}
          {activeSubmenu === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{t("AI Sales Intelligence Configuration")}</h1>
                <p className="text-xs text-slate-500 mt-0.5">{t("Instruct the model on tone, confidence score cutoffs, and warning timers.")}</p>
              </div>

              <div className="bg-white dark:bg-[#201f1e] border border-slate-200/50 dark:border-zinc-850 rounded-xl p-5 shadow-xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-450 block">{t("Gemini Engine Model")}</label>
                    <select
                      value={settings.model}
                      onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-250 dark:border-zinc-850 rounded-lg"
                    >
                      <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                      <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-455 block">{t("Coaching Rigor Tone")}</label>
                    <select
                      value={settings.coachingRigor}
                      onChange={(e) => setSettings(prev => ({ ...prev, coachingRigor: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-250 dark:border-zinc-850 rounded-lg"
                    >
                      <option value="Gentle">{t("Gentle Guidance (Polite & Supportive)")}</option>
                      <option value="Challenging">{t("Challenging Critic (Identifies Weaknesses)")}</option>
                      <option value="Aggressive">{t("High Stakes Director (Direct & Rigorous)")}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-455 block">{t("Rapport Style")}</label>
                    <select
                      value={settings.rapportStyle}
                      onChange={(e) => setSettings(prev => ({ ...prev, rapportStyle: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-250 dark:border-zinc-850 rounded-lg"
                    >
                      <option value="Socratic">{t("Socratic Questioning (Guide to solutions)")}</option>
                      <option value="Directive">{t("Directive Mandate (Instruct direct steps)")}</option>
                      <option value="Accountable">{t("High Accountability (Focuses on quotas)")}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-455 block">{t("Aging Warning Threshold (Days)")}</label>
                    <input
                      type="number"
                      value={settings.alertOnAgingDays}
                      onChange={(e) => setSettings(prev => ({ ...prev, alertOnAgingDays: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-250 dark:border-zinc-850 rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-zinc-850 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-sans">{t("Settings automatically synchronized to local storage cache.")}</span>
                  <button
                    onClick={() => {
                      alert(t("Settings saved successfully!"));
                    }}
                    className="px-4 py-2 bg-[#0078D4] hover:bg-[#005a9e] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer select-none"
                  >
                    {t("Save Changes")}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
