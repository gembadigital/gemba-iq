import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Users,
  ChevronRight,
  RefreshCw,
  FileText,
  Briefcase,
  BarChart2,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  CheckSquare,
  Calendar,
  Zap,
  Globe,
  Search,
  Building2,
  X,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { CrmDb } from "../lib/CrmDb";
import { generateWeeklyAiPlan, syncPlanTaskStatuses } from "../lib/aiMarketingCoachEngine";
import type { AiCoachWeeklyPlan, AiCoachTask, AiCoachAlert } from "../types/aiCoach";

interface AiMarketingCoachViewProps {
  onNavigateToTab?: (tab: string) => void;
}

export default function AiMarketingCoachView({ onNavigateToTab }: AiMarketingCoachViewProps) {
  const { t } = useLanguage();
  const [weeklyPlan, setWeeklyPlan] = useState<AiCoachWeeklyPlan | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeUserTab, setActiveUserTab] = useState<"Atakan" | "Ersin">("Atakan");
  const [showReportModal, setShowReportModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);

  const triggerToast = (msg: string, type: "success" | "info" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadOrGeneratePlan();
  }, []);

  const loadOrGeneratePlan = (force: boolean = false) => {
    if (force) setIsRegenerating(true);
    setTimeout(() => {
      const plan = generateWeeklyAiPlan(force);
      setWeeklyPlan(plan);
      setIsRegenerating(false);
      if (force) {
        triggerToast(t("Haftalık AI aksiyon planı canlı verilerle yeniden oluşturuldu!"), "success");
      }
    }, force ? 600 : 0);
  };

  const handleToggleTaskStatus = (task: AiCoachTask) => {
    if (!weeklyPlan) return;

    const newStatus = task.status === "completed" ? "not_started" : "completed";
    
    // Sync with CrmDb Task Management
    const taskIdToUpdate = task.syncedTaskId || task.id;
    CrmDb.upsertTask({
      id: taskIdToUpdate,
      title: task.title,
      description: task.description,
      status: newStatus,
      assignee: task.assignedTo,
      dueDate: task.dueDate,
      priority: task.priority,
    });

    // Refresh UI plan
    const updatedPlan = syncPlanTaskStatuses(weeklyPlan);
    setWeeklyPlan({ ...updatedPlan });

    triggerToast(
      newStatus === "completed"
        ? t("Görev tamamlandı ve Görev Yönetimi (Tasks) ile senkronize edildi! ✓")
        : t("Görev durumu güncellendi."),
      "success"
    );
  };

  if (!weeklyPlan) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#0078D4]" />
        <span>{t("AI Marketing Coach canlı CRM verilerini analiz ediyor...")}</span>
      </div>
    );
  }

  const {
    weekYearLabel,
    targetCount,
    completedCount,
    successRate,
    openOpportunitiesValue,
    criticalAlertCount,
    priorityTasks,
    userWorkloads,
    alerts,
    executiveReport,
    aiManagerNote,
  } = weeklyPlan;

  const currentWorkload = userWorkloads[activeUserTab] || userWorkloads["Atakan"];

  return (
    <div id="ai-marketing-coach-root" className="space-y-5 animate-fade-in">
      {/* Toast Alert pop notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-bounce max-w-md bg-slate-900 text-white border-slate-700">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-white dark:bg-[#1b1a19] p-6 border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-[#0078D4] to-emerald-500" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 border border-amber-200 dark:border-amber-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>AI Marketing Coach</span>
              </span>
              <span className="text-xs font-mono font-bold bg-blue-50 text-[#0078D4] dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                {weekYearLabel}
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                2 Kişilik Ticari Ekip Yönetimi
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              {t("Pazarlama & İş Geliştirme AI Yönetici Paneli")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              {t("Mevcut müşteri, fırsat, teklif ve hedef firma verilerinizi analiz ederek haftalık aksiyon planı oluşturan, görev dağıtan ve gerçekleşmeyen hedefleri takip eden akıllı AI yöneticiniz.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3.5 py-2.5 border border-[#EDEBE9] dark:border-[#323130] rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs"
            >
              <FileText className="w-4 h-4 text-[#0078D4]" />
              <span>{t("AI Yönetici Raporu")}</span>
            </button>

            <button
              type="button"
              onClick={() => loadOrGeneratePlan(true)}
              disabled={isRegenerating}
              className="text-xs font-bold bg-[#0078D4] hover:bg-[#106ebe] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} />
              <span>{isRegenerating ? t("Analiz Ediliyor...") : t("Yeni AI Planı Oluştur")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Manager Note Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-amber-50/40 to-emerald-50/30 dark:from-blue-950/30 dark:via-amber-950/20 dark:to-emerald-950/20 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/50 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <span className="font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono text-[10px] block">
            {t("AI YÖNETİCİ NOTU & YOL HARİTASI")}
          </span>
          <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
            "{aiManagerNote}"
          </p>
        </div>
      </div>

      {/* KPI Ribbon Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-2xl border border-[#EDEBE9] dark:border-[#323130] shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{t("Bu Haftanın Hedefleri")}</span>
          <div className="text-xl font-extrabold text-[#0078D4] dark:text-brand-400 mt-1 flex items-center justify-between">
            <span>{targetCount} {t("görev")}</span>
            <Target className="w-5 h-5 opacity-40" />
          </div>
          <p className="text-[10px] text-slate-450 mt-1">{t("Öncelikli aksiyon planı")}</p>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-2xl border border-[#EDEBE9] dark:border-[#323130] shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{t("Gerçekleşen Görevler")}</span>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center justify-between">
            <span>{completedCount} / {targetCount}</span>
            <CheckCircle className="w-5 h-5 opacity-40" />
          </div>
          <p className="text-[10px] text-slate-450 mt-1">{t("Task Management senkronlu")}</p>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-2xl border border-[#EDEBE9] dark:border-[#323130] shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{t("Hedef Başarı Oranı")}</span>
          <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 flex items-center justify-between">
            <span>%{successRate}</span>
            <TrendingUp className="w-5 h-5 opacity-40" />
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${successRate}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-2xl border border-[#EDEBE9] dark:border-[#323130] shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{t("Açık Fırsat Hacmi")}</span>
          <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 flex items-center justify-between">
            <span>₺{openOpportunitiesValue ? (openOpportunitiesValue / 1000).toFixed(0) + "K" : "0"}</span>
            <DollarSign className="w-5 h-5 opacity-40" />
          </div>
          <p className="text-[10px] text-slate-450 mt-1">{t("Takipteki tüm fırsatlar")}</p>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-2xl border border-[#EDEBE9] dark:border-[#323130] shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{t("AI Yönetici Uyarıları")}</span>
          <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 flex items-center justify-between">
            <span>{criticalAlertCount} {t("uyarı")}</span>
            <ShieldAlert className="w-5 h-5 opacity-40" />
          </div>
          <p className="text-[10px] text-slate-450 mt-1">{t("Kritik gecikme & riskler")}</p>
        </div>
      </div>

      {/* Executive Alerts Banner (If critical alerts exist) */}
      {alerts.length > 0 && (
        <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-rose-200/80 dark:border-rose-900/80 pb-2">
            <span className="font-extrabold text-rose-800 dark:text-rose-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              {t("Kritik AI Uyarıları & Aksiyon Bekleyen Durumlar")} ({alerts.length})
            </span>
            <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded">
              {t("Öncelikli Aksiyon Gerektirir")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {alerts.map((alt) => (
              <div key={alt.id} className="bg-white dark:bg-[#201f1e] p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {alt.title}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-rose-600 dark:text-rose-400 uppercase bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                    {alt.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">{alt.message}</p>
                <div className="text-[9px] font-mono text-slate-400 pt-1 flex items-center gap-1">
                  <span>📊 {alt.sourceJustification}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Priority Actions (Left 7 cols) & Team Workload Breakdown (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Priority Actions List (Ranked 1 to 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-[#1b1a19] p-5 border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono">
                  {t("Haftalık Öncelikli Aksiyon Planı (AI Tarafından Sıralanmış)")}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                {priorityTasks.length} {t("Kritik Görev")}
              </span>
            </div>

            <div className="space-y-3">
              {priorityTasks.map((task, idx) => {
                const isCompleted = task.status === "completed";
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all duration-200 space-y-2.5 ${
                      isCompleted
                        ? "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60"
                        : "bg-white dark:bg-[#201f1e] border-[#EDEBE9] dark:border-[#323130] hover:border-[#0078D4] dark:hover:border-blue-500 shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task)}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${
                            isCompleted
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 dark:border-slate-600 hover:border-[#0078D4]"
                          }`}
                        >
                          {isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                        </button>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-extrabold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                              #{idx + 1} {t("Öncelik")}
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {task.categoryLabel}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                task.priority === "High"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                              }`}
                            >
                              {task.priority === "High" ? "Yüksek" : "Orta"}
                            </span>
                          </div>

                          <h4 className={`text-xs font-bold ${isCompleted ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                            {task.title}
                          </h4>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {task.description}
                          </p>

                          {/* Data Source Justification Banner */}
                          <div className="bg-[#FAF9F8] dark:bg-[#252423] p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1.5 mt-2">
                            <span className="text-[#0078D4] font-bold">🔍 Canlı Veri Gerekçesi:</span>
                            <span className="truncate">{task.sourceJustification}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-mono font-bold text-[#0078D4] dark:text-brand-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                          👤 {task.assignedTo}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          📅 {task.dayOfWeek}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: 2-Person Team Weekly Workload & Schedule (Atakan & Ersin) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#1b1a19] p-5 border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0078D4]" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono">
                  {t("Ekip Görev Dağılımı & Günlük Plan")}
                </h3>
              </div>

              {/* User Selector Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(["Atakan", "Ersin"] as const).map((user) => (
                  <button
                    key={user}
                    type="button"
                    onClick={() => setActiveUserTab(user)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      activeUserTab === user
                        ? "bg-white dark:bg-[#252423] text-[#0078D4] dark:text-brand-300 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                    }`}
                  >
                    👤 {user}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected User Header */}
            <div className="bg-[#FAF9F8] dark:bg-[#201f1e] p-3.5 rounded-xl border border-[#EDEBE9] dark:border-[#323130] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0078D4]" />
                  {currentWorkload.userName} — {t("Haftalık Aksiyon Listesi")}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  {currentWorkload.assignedCount} {t("Görev Atandı")}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                <span className="text-slate-400 font-mono uppercase">{t("Odak Alanları")}:</span>
                {currentWorkload.focusAreas.map((area) => (
                  <span key={area} className="bg-white dark:bg-black/20 text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Daily Schedule (Pazartesi -> Cuma) */}
            <div className="space-y-3">
              {(["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"] as const).map((day) => {
                const dayTasks = currentWorkload.tasks.filter((t) => t.dayOfWeek === day);
                return (
                  <div key={day} className="border border-slate-200/70 dark:border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1.5">
                      <span className="font-bold text-xs text-[#0078D4] dark:text-brand-300 font-mono flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {day}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{dayTasks.length} {t("görev")}</span>
                    </div>

                    <div className="space-y-1.5">
                      {dayTasks.map((tk) => {
                        const isDone = tk.status === "completed";
                        return (
                          <div
                            key={tk.id}
                            className="flex items-start gap-2 bg-[#FAF9F8] dark:bg-[#252423] p-2 rounded-lg text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleTaskStatus(tk)}
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${
                                isDone ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 dark:border-slate-700"
                              }`}
                            >
                              {isDone && <CheckCircle className="w-3 h-3" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <span className={`font-semibold block ${isDone ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                                {tk.title}
                              </span>
                              <span className="text-[10px] text-slate-450 block truncate mt-0.5">{tk.targetGoal || tk.description}</span>
                            </div>
                          </div>
                        );
                      })}

                      {dayTasks.length === 0 && (
                        <p className="text-[10px] text-slate-400 italic py-1">{t("Bu gün için atanmış görev bulunmuyor.")}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Marketing, Web/SEO & Customer Competitors Strategic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Mevcut Müşteri Rakipleri Hedefleme */}
        <div className="bg-white dark:bg-[#1b1a19] p-5 border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-2.5">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0078D4]" />
              {t("Müşteri Rakipleri Hedefleme")}
            </span>
            <span className="text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded">
              Sektörel Fırsat
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t("Mevcut müşterilerinizin sektöründeki rakip firmaları otomatik analiz ederek hedef pazar havuzuna ve BD Pipeline'a aksiyon olarak aktarır.")}
          </p>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab("marketing-target-market")}
              className="text-xs font-bold text-[#0078D4] hover:underline flex items-center gap-1 cursor-pointer pt-1"
            >
              <span>{t("Hedef Pazar & Rakip Haritası'na Git")}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Card 2: Pazarlama & LinkedIn Kampanyaları */}
        <div className="bg-white dark:bg-[#1b1a19] p-5 border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-2.5">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              {t("Pazarlama & Dijital Kampanya")}
            </span>
            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded">
              Otomatik Öneri
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t("Firma yoğunluğu yüksek olan imalat ve sanayi sektörleri için LinkedIn duyuru ve e-posta tanıtım kampanyalarını otomatik kurgular.")}
          </p>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab("marketing-digital-intel")}
              className="text-xs font-bold text-[#0078D4] hover:underline flex items-center gap-1 cursor-pointer pt-1"
            >
              <span>{t("Dijital Pazarlama Modülü'ne Git")}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Card 3: SEO & Web İçerik Aksiyonları */}
        <div className="bg-white dark:bg-[#1b1a19] p-5 border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-2.5">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              {t("Web & SEO İçerik Stratejisi")}
            </span>
            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded">
              Organik Büyüme
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t("Google arama gösterimleri artan ancak henüz içeriği yazılmamış anahtar kelimeleri tespit edip SEO blog görevleri oluşturur.")}
          </p>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab("marketing-industry-intel")}
              className="text-xs font-bold text-[#0078D4] hover:underline flex items-center gap-1 cursor-pointer pt-1"
            >
              <span>{t("Sektörel İntel Modülü'ne Git")}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* AI Executive Weekly Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-2xl shadow-2xl p-6 space-y-5 text-xs max-w-3xl w-full max-h-[90vh] overflow-y-auto my-auto relative border-t-4 border-t-[#0078D4]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0078D4]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {t("AI Marketing Manager — Haftalık Yönetici Raporu")}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">{weekYearLabel} Değerlendirmesi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 1: Geçen Hafta Özeti */}
            <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 space-y-2.5">
              <h4 className="font-extrabold text-xs text-blue-900 dark:text-blue-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#0078D4]" />
                1. GEÇEN HAFTA DEĞERLENDİRMESİ
              </h4>
              <ul className="space-y-1 text-slate-700 dark:text-slate-200 list-disc list-inside">
                {executiveReport.lastWeekSummary.accomplishedHighlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
                {executiveReport.lastWeekSummary.salesProgress.map((s, i) => (
                  <li key={`s-${i}`}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Section 2: Bu Hafta Öncelikleri */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 space-y-2.5">
              <h4 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                2. BU HAFTANIN EN ÖNEMLİ 5 ÖNCELİĞİ
              </h4>
              <div className="space-y-1.5 font-semibold text-slate-800 dark:text-slate-100">
                {executiveReport.thisWeekFocus.topPriorities.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[10px] flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Yönetici Uyarıları */}
            <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 space-y-2.5">
              <h4 className="font-extrabold text-xs text-rose-900 dark:text-rose-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                3. YÖNETİCİ UYARILARI & KRİTİK RİSKLER
              </h4>
              <ul className="space-y-1 text-slate-700 dark:text-slate-200 list-disc list-inside">
                {executiveReport.executiveAlerts.criticalProposals.map((cp, i) => (
                  <li key={i} className="text-rose-700 dark:text-rose-300 font-semibold">Cevapsız Teklif: {cp}</li>
                ))}
                {executiveReport.executiveAlerts.targetDeviations.map((td, i) => (
                  <li key={`td-${i}`}>{td}</li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="border-t border-[#EDEBE9] dark:border-[#323130] pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-[#0078D4] hover:bg-[#106ebe] text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
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
