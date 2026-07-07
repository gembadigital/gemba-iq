import React, { useState } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { DashboardStats, AuditLog } from "../types";
import {
  LayoutDashboard,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  Settings,
  Flame,
  ArrowRight,
  TrendingUp,
  Radio
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from "recharts";

interface DashboardViewProps {
  stats: DashboardStats;
  logs: AuditLog[];
  onNavigateToDesigner: () => void;
  trackingService: string;
  setTrackingService: (val: string) => void;
}

export default function DashboardView({
  stats,
  logs,
  onNavigateToDesigner,
  trackingService,
  setTrackingService
}: DashboardViewProps) {
  const { lang, t } = useLanguage();
  // Configured tracking toggle
  const isTrackingActive = trackingService !== "none";

  // Mock chart data from audit logs or placeholders if empty
  const chartData = logs.length > 0
    ? [...logs].reverse().map(log => ({
        name: log.subject.length > 15 ? log.subject.substring(0, 15) + "..." : log.subject,
        Success: log.successCount,
        Failed: log.failedCount,
        Total: log.recipientCount
      }))
    : [
        { name: "Campaign 1", Success: 12, Failed: 1, Total: 13 },
        { name: "Campaign 2", Success: 38, Failed: 2, Total: 40 },
        { name: "Campaign 3", Success: 45, Failed: 0, Total: 45 },
        { name: "Campaign 4", Success: 22, Failed: 3, Total: 25 },
        { name: "Campaign 5", Success: 49, Failed: 1, Total: 50 }
      ];

  return (
    <div className="space-y-6">
      {/* Upper Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 font-display">
            {lang === "TR" ? "Genel Bakış" : "Overview"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === "TR" 
              ? "M365 Entegre Kampanya Metrikleri ve Performans Denetimi"
              : "M365 Integrated Campaign Metrics and Performance Auditing"}
          </p>
        </div>
        <button
          id="dashboard-new-campaign"
          onClick={onNavigateToDesigner}
          className="flex items-center gap-2 bg-[#0078D4] hover:bg-[#006cc0] text-white text-xs font-bold px-4 py-2.5 rounded shadow-sm transition-all cursor-pointer"
        >
          <Mail className="w-4 h-4" />
          {lang === "TR" ? "Yeni Kampanya" : "New Campaign"}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "TR" ? "Toplam Kampanya" : "Total Campaigns"}
            </span>
            <LayoutDashboard className="w-4.5 h-4.5 text-[#0078D4]" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalCampaigns}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {lang === "TR" ? "Tablolardan işlendi" : "Processed from spreadsheets"}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "TR" ? "E-postalar" : "Emails Sent"}
            </span>
            <Mail className="w-4.5 h-4.5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalEmailsSent}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {lang === "TR" ? "Graph API aktarımları" : "Graph API transfers"}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "TR" ? "Başarı Oranı" : "Success Rate"}
            </span>
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-green-400">{stats.successRate.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {lang === "TR" ? "Teslimat derecesi" : "Delivery rating"}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 text-slate-350">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "TR" ? "Açılma Oranı" : "Open Rate"}
            </span>
            <Eye className="w-4.5 h-4.5 text-[#0078D4]" />
          </div>
          {isTrackingActive ? (
            <div className="text-2xl font-bold text-[#0078D4] dark:text-brand-300">
              {stats.openRate.toFixed(1)}%
            </div>
          ) : (
            <div className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-955/20 px-2 py-1 rounded inline-block">
              {lang === "TR" ? "Bağlı Değil" : "Not Connected"}
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-1">
            {isTrackingActive 
              ? `${lang === "TR" ? "Servis" : "Service"}: ${trackingService.toUpperCase()}` 
              : (lang === "TR" ? "Piksel gerekli" : "Pixel required")}
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "TR" ? "Son Senk" : "Last Sync"}
            </span>
            <Calendar className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
            {stats.lastCampaignDate ? new Date(stats.lastCampaignDate).toLocaleDateString() : (lang === "TR" ? "Hiçbir zaman" : "Never")}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats.lastCampaignDate 
              ? new Date(stats.lastCampaignDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              : (lang === "TR" ? "Kayıt yok" : "No logs")}
          </div>
        </div>
      </div>

      {/* Grid of Chart and Tracking Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recharts Graphical Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0078D4]" />
                Campaign Performance History
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Delivery audits for the five most recent campaign batches</p>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDEBE9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#323130" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(27, 26, 25, 0.95)",
                    border: "1px solid #323130",
                    borderRadius: "4px",
                    color: "#fff"
                  }}
                  itemStyle={{ fontSize: "11px" }}
                  labelStyle={{ fontSize: "11px", fontWeight: "bold" }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="Success" fill="#10b981" maxBarSize={30} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Failed" fill="#ef4444" maxBarSize={30} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tracking Services Settings panel */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EDEBE9] dark:border-[#323130] pb-3">
              <Radio className="w-4.5 h-4.5 text-[#0078D4] animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Email Tracking Pixels</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Hook external auditing nodes</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Connected Nodes</span>
              
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: "none", name: "No Open Tracking (Direct)", desc: "Delivery check only" },
                  { id: "mailtrack", name: "Mailtrack Integration", desc: "Embed Mailtrack micro-pixels" },
                  { id: "sendgrid", name: "SendGrid Webhooks", desc: "Enterprise bounce / audit webhook" },
                  { id: "brevo", name: "Brevo Audit Engine", desc: "Campaign reporting bridge" },
                  { id: "custom", name: "Custom Pixels", desc: "Self-hosted webhook triggers" }
                ].map(service => (
                  <button
                    id={`track-service-${service.id}`}
                    key={service.id}
                    onClick={() => setTrackingService(service.id)}
                    className={`text-left p-2 rounded border text-xs font-medium transition-all flex items-center justify-between ${
                      trackingService === service.id
                        ? "bg-[#f3f9fe] border-[#b8daf7] text-[#0078D4] dark:bg-blue-950/20 dark:border-brand-900/60 dark:text-brand-300 shadow-xs font-bold"
                        : "border-[#EDEBE9] dark:border-[#323130] text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{service.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{service.desc}</div>
                    </div>
                    {trackingService === service.id && (
                      <span className="w-2 h-2 rounded-full bg-[#0078D4]"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EDEBE9] dark:border-[#323130]">
            {!isTrackingActive ? (
              <div className="bg-amber-50 dark:bg-amber-955/20 text-amber-800 dark:text-amber-400 p-3 rounded text-xs flex gap-2 border border-amber-200/50 dark:border-amber-900/40">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5" />
                <p>
                  <strong>Tracking pixel not configured.</strong> Recipient open rates will not be tracked. Ensure you enable a callback pixel node above.
                </p>
              </div>
            ) : (
              <div className="bg-[#f3f9fe] dark:bg-blue-950/20 text-[#0078D4] dark:text-brand-300 p-2.5 rounded text-xs leading-relaxed border border-[#ddebf7] dark:border-brand-900/40 font-medium">
                <strong>{trackingService.toUpperCase()} Pixel Node Active.</strong> Mail merges will automatically append a tracking pixel link at the footer of outgoing HTML.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
