import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { Sparkles, Star, ShieldCheck, ChevronRight, RefreshCw, Layers, Award } from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";
import { CrmDb } from "../../lib/CrmDb";

interface CompanyOpexTabProps {
  companyId: string;
  lang: "TR" | "EN";
  companyName: string;
  onLogTimelineEvent?: (title: string, desc: string, type: string) => void;
}

interface OpexScores {
  s5: number;
  vsm: number;
  muda: number;
  oee: number;
  visual: number;
  standard: number;
}

export default function CompanyOpexTab({
  companyId,
  lang: _langProp,
  companyName,
  onLogTimelineEvent
}: CompanyOpexTabProps) {
  const { t } = useLanguage();
  const scoreKey = `crm_company_opex_${companyId}`;

  // State
  const [scores, setScores] = useState<OpexScores>(() =>
    CrmDb.getKv<OpexScores>(scoreKey, { s5: 3, vsm: 2, muda: 3, oee: 2, visual: 3, standard: 2 })
  );

  // Save changes
  useEffect(() => {
    CrmDb.setKv(scoreKey, scores);
  }, [scores, scoreKey]);

  const handleScoreChange = (pillar: keyof OpexScores, val: number) => {
    const oldScore = scores[pillar];
    if (oldScore === val) return;

    const updated = { ...scores, [pillar]: val };
    setScores(updated);

    const pillarNames: Record<keyof OpexScores, string> = {
      s5: t("5S System"),
      vsm: t("Value Stream Mapping"),
      muda: t("Muda Minimization"),
      oee: t("OEE Monitoring"),
      visual: t("Visual Management"),
      standard: t("Standard Work")
    };

    if (onLogTimelineEvent) {
      onLogTimelineEvent(
        t("OPEX Diagnostic Updated"),
        `${pillarNames[pillar]} puanı ${oldScore}/5 seviyesinden ${val}/5 seviyesine güncellendi.`,
        "opex"
      );
    }
  };

  // Calculations
  const overallScore = useMemo(() => {
    const sum = scores.s5 + scores.vsm + scores.muda + scores.oee + scores.visual + scores.standard;
    return Math.round((sum / 30) * 100);
  }, [scores]);

  const maturityLevel = useMemo(() => {
    if (overallScore >= 81) return {
      name: t("World-Class Lean"),
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
      description: t("Fully synchronized flow, zero-loss operational discipline, and highly flexible production.")
    };
    if (overallScore >= 61) return {
      name: t("Optimized / Lean"),
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20",
      description: t("Standardized operational control points, low waste generation, and structured Kaizen teams.")
    };
    if (overallScore >= 41) return {
      name: t("Standardized & Stable"),
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
      description: t("Foundational SOPs are documented. However, bottleneck buffers and speed losses remain.")
    };
    if (overallScore >= 21) return {
      name: t("Developing / Defined"),
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20",
      description: t("Reactive problem solving is active. Systematic lean guidelines are newly introduced.")
    };
    return {
      name: t("Reactive / Ad-hoc"),
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/20",
      description: t("No stable standards. Output is dictated by daily firefighting, high setups, and scrap.")
    };
  }, [overallScore, t]);

  // Recharts Data Mapping
  const chartData = useMemo(() => {
    return [
      { name: t("5S System"), A: scores.s5, fullMark: 5 },
      { name: t("Value Stream"), A: scores.vsm, fullMark: 5 },
      { name: t("Muda Min."), A: scores.muda, fullMark: 5 },
      { name: t("OEE Tracking"), A: scores.oee, fullMark: 5 },
      { name: t("Visual Mgmt"), A: scores.visual, fullMark: 5 },
      { name: t("Standard Work"), A: scores.standard, fullMark: 5 }
    ];
  }, [scores, t]);

  // AI Diagnostic Advisor
  const aiAdvice = useMemo(() => {
    const list = [
      { pillar: "s5", score: scores.s5, name: "5S", adviseTR: "Kırmızı Etiket (Red-tagging) kampanyası başlatarak kullanılmayan makine ekipman ve kalıpları ayıklayın.", adviseEN: "Initiate a factory-wide Red-tagging blitz to isolate clutter, idle parts, and unused dies." },
      { pillar: "vsm", score: scores.vsm, name: "VSM", adviseTR: "Tedarikçiden müşteriye giden değer akışını çizip, malzeme ve bilgi akışındaki darboğazları belirleyin.", adviseEN: "Map the material and information stream to pinpoint layout buffer stagnation." },
      { pillar: "muda", score: scores.muda, name: "Muda", adviseTR: "Taşıma israfını azaltmak için U-tipi hücresel montaj hattı yerleşim projesini değerlendirin.", adviseEN: "Re-layout assembly lines into U-shaped cells to minimize operator travel distance." },
      { pillar: "oee", score: scores.oee, name: "OEE", adviseTR: "Kritik darboğaz istasyonlarında sensör entegrasyonu yaparak duruş kodlarını dijital olarak toplayın.", adviseEN: "Deploy digital IoT downtime tracking sensors on the primary bottleneck work-center." },
      { pillar: "visual", score: scores.visual, name: "Visual", adviseTR: "Operatörlerin performansını anlık izleyebileceği Andon panoları ve renkli zemin çizgileri uygulayın.", adviseEN: "Implement direct color-coded floor routing and real-time electronic Andon dashboards." },
      { pillar: "standard", score: scores.standard, name: "Standard", adviseTR: "İş döngü sürelerini (cycle time) standardize edip, her operatör için standart iş talimatı (SOP) asın.", adviseEN: "Perform cyclic video study, capture bottleneck cycle times, and draft dynamic SOP cards." }
    ];

    // Find the 2 lowest scoring items
    const sorted = [...list].sort((a, b) => a.score - b.score);
    return sorted.slice(0, 2);
  }, [scores]);

  const renderStarsSelector = (pillar: keyof OpexScores, currentVal: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleScoreChange(pillar, star)}
            className="p-0.5 hover:scale-115 transition-transform text-slate-300 dark:text-zinc-800 cursor-pointer"
          >
            <Star
              className={`w-4 h-4 ${
                star <= currentVal 
                  ? "text-amber-500 fill-amber-500" 
                  : "text-slate-300 dark:text-zinc-700 hover:text-amber-400"
              }`}
            />
          </button>
        ))}
        <span className="ml-2 font-mono font-bold text-slate-700 dark:text-zinc-300 text-xs">
          {currentVal}/5
        </span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans text-xs">
      
      {/* LEFT: Assessment Sliders Matrix (7 columns) */}
      <div className="lg:col-span-7 space-y-4">
        
        {/* Core Matrix Card */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
            <Award className="w-4 h-4 text-violet-500" />
            <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
              {t("Lean Maturity Assessment Matrix")}
            </h4>
          </div>

          <div className="space-y-4">
            
            {/* 5S */}
            <div className="p-3 bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/50 rounded-lg space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-850 dark:text-zinc-200">{t("1. 5S System & Housekeeping")}</span>
                {renderStarsSelector("s5", scores.s5)}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                {t("Sorting, straightening, shining, standardizing, and sustaining. Floor organization.")}
              </p>
            </div>

            {/* VSM */}
            <div className="p-3 bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/50 rounded-lg space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-850 dark:text-zinc-200">{t("2. Value Stream Mapping (VSM)")}</span>
                {renderStarsSelector("vsm", scores.vsm)}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                {t("Mapping material and information flow across cycle buffers to isolate stagnation spots.")}
              </p>
            </div>

            {/* Muda */}
            <div className="p-3 bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/50 rounded-lg space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-850 dark:text-zinc-200">{t("3. Muda Minimization (Waste Elimination)")}</span>
                {renderStarsSelector("muda", scores.muda)}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                {t("Elimination of transport, inventory, excess motion, waiting, overproduction, defects.")}
              </p>
            </div>

            {/* OEE */}
            <div className="p-3 bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/50 rounded-lg space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-850 dark:text-zinc-200">{t("4. Overall Equipment Effectiveness (OEE)")}</span>
                {renderStarsSelector("oee", scores.oee)}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                {t("Availability, performance, quality ratios calculated on automated critical bottlenecks.")}
              </p>
            </div>

            {/* Visual Mgmt */}
            <div className="p-3 bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/50 rounded-lg space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-850 dark:text-zinc-200">{t("5. Visual Management & Andon")}</span>
                {renderStarsSelector("visual", scores.visual)}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                {t("Direct shopfloor floor indicators, target boards, and automated sound-light alerts.")}
              </p>
            </div>

            {/* Standard Work */}
            <div className="p-3 bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/50 rounded-lg space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-850 dark:text-zinc-200">{t("6. Standard Work (SOP)")}</span>
                {renderStarsSelector("standard", scores.standard)}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                {t("Cycle-time stabilization, standard operating procedures, and balanced work loads.")}
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* RIGHT: Visual Radar Chart & AI Recommendations (5 columns) */}
      <div className="lg:col-span-5 space-y-4">
        
        {/* Maturity Index Circle / Banner */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4 text-center">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
            {t("OVERALL OPERATIONAL RATING")}
          </span>
          
          <div className="relative inline-flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-slate-50 dark:border-zinc-900 flex items-center justify-center">
              <div className="text-center">
                <span className="text-3xl font-extrabold text-slate-850 dark:text-white font-mono block leading-none">{overallScore}</span>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">/100</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className={`inline-block px-3.5 py-1 text-[11px] font-mono font-extrabold rounded-full uppercase tracking-wider ${maturityLevel.color}`}>
              {maturityLevel.name}
            </span>
            <p className="text-slate-500 dark:text-zinc-400 leading-normal max-w-sm mx-auto pt-1 text-[11px]">
              {maturityLevel.description}
            </p>
          </div>
        </div>

        {/* Radar Chart representation */}
        <div className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] h-[250px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }} />
              <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#94a3b8', fontSize: 8 }} />
              <Radar
                name={companyName}
                dataKey="A"
                stroke="#6366f1"
                fill="#818cf8"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dynamic AI advice box */}
        <div className="bg-gradient-to-r from-emerald-950/20 to-teal-950/15 border border-emerald-500/20 rounded-2xl p-4.5 space-y-3.5 relative overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase block tracking-wider">
                {t("AI LEAN CONSULTANT")}
              </span>
              <h5 className="text-xs font-extrabold uppercase text-slate-800 dark:text-zinc-200 mt-0.5 font-display">
                {t("Tailored Waste Action Plan")}
              </h5>
            </div>
          </div>

          <div className="space-y-3">
            {aiAdvice.map((adv, index) => (
              <div key={adv.pillar} className="flex gap-2.5 items-start text-xs font-sans">
                <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-slate-800 dark:text-zinc-200 block text-[11px]">{t("{name} Improvement").replace("{name}", adv.name)}</span>
                  <p className="text-slate-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                    {lang === "TR" ? adv.adviseTR : adv.adviseEN}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
