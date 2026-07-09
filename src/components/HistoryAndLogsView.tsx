import React, { useState } from "react";
import { Campaign, MailboxSession } from "../types";
import { generateCampaignReport } from "../utils/pdfGenerator";
import { useLanguage } from "../lib/LanguageContext";
import {
  FileText,
  Calendar,
  Download,
  Trash2,
  Mail,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Radio,
  Clock,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface HistoryAndLogsViewProps {
  logs: Campaign[];
  onDeleteLog: (id: string) => void;
  session: MailboxSession | null;
}

export default function HistoryAndLogsView({ logs, onDeleteLog, session }: HistoryAndLogsViewProps) {
  const { t } = useLanguage();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    logs.length > 0 ? logs[0].id : null
  );

  const selectedCampaign = logs.find((l) => l.id === selectedCampaignId);

  const handleDownloadPDF = (campaign: Campaign) => {
    const doc = generateCampaignReport(campaign, session);
    doc.save(`smart_mailmerge_report_${campaign.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-white dark:bg-[#1b1a19] p-5 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-955/40 dark:text-blue-400 rounded-lg">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-zinc-100 font-sans">{t("Campaign Audit Logs")}</h2>
            <p className="text-xs text-slate-505 dark:text-slate-400 font-sans">{t("Audit dispatch records, open-rate metrics, and historical metadata database stored locally.")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Index of past campaigns */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0078D4]" />
              {t("Historical Audit List")}
            </h3>
            <p className="text-xs text-slate-505 dark:text-slate-400 mt-1">{t("Campaign databases persisted in local storage")}</p>
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-[#F3F2F1]/30 dark:bg-[#252423]/10 border border-dashed border-[#EDEBE9] dark:border-[#323130] rounded text-center">
              <Mail className="w-8 h-8 text-slate-400 mb-2 animate-bounce" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t("No campaigns launched yet")}</p>
              <p className="text-[10px] text-slate-405 dark:text-slate-450 mt-1">{t("Your mail merge operations will be logged here.")}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-thin">
              {logs.map((log) => {
                const dateStr = new Date(log.date).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                });
                const timeStr = new Date(log.date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                });

                const isSelected = selectedCampaignId === log.id;

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedCampaignId(log.id)}
                    className={`flex items-center justify-between gap-3 p-3 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#f3f9fe] border-[#0078D4] dark:bg-blue-955/20 dark:border-[#0078D4]"
                        : "border-[#EDEBE9] dark:border-[#323130] hover:bg-[#F3F2F1]/60 dark:hover:bg-[#252423]/30"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateStr}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">{timeStr}</span>
                      </div>
                      <h4 className={`text-xs font-bold truncate mt-1 ${isSelected ? "text-slate-900 dark:text-brand-300" : "text-slate-700 dark:text-slate-300"}`}>
                        {log.subject}
                      </h4>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-medium">
                        <span>{t("Recipients:")} <strong>{log.recipients.length}</strong></span>
                        <span className="text-emerald-650 dark:text-emerald-400">{t("Delivered:")} <strong>{log.successCount}</strong></span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        id={`btn-log-download-${log.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(log);
                        }}
                        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-855 text-slate-400 hover:text-[#0078D4] border border-transparent hover:border-[#EDEBE9] transition-all"
                        title={t("Download PDF Archive")}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-log-delete-${log.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLog(log.id);
                          if (selectedCampaignId === log.id) {
                            setSelectedCampaignId(logs.find((l) => l.id !== log.id)?.id || null);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-850 text-slate-400 hover:text-rose-500 border border-transparent hover:border-[#EDEBE9] transition-all"
                        title={t("Delete Campaign log")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audit Detail Inspector panel */}
        <div className="lg:col-span-7 space-y-6">
          {selectedCampaign ? (
            <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between gap-4 border-b border-[#EDEBE9] dark:border-[#323130] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {t("Campaign Audit performance report")}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">ID: {selectedCampaign.id}</p>
                </div>
                <button
                  id="btn-audit-download"
                  onClick={() => handleDownloadPDF(selectedCampaign)}
                  className="flex items-center gap-1.5 text-xs text-[#0078D4] dark:text-brand-300 border border-[#EDEBE9] dark:border-[#323130] hover:bg-[#F3F2F1] px-3 py-1.5 rounded font-bold transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t("Download Report PDF")}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#F3F2F1] dark:bg-[#11100f] p-3 rounded border border-[#EDEBE9] dark:border-[#323130] text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("Audited Batch")}</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 block">
                    {selectedCampaign.recipients.length} {t("recipients")}
                  </span>
                </div>
                <div className="bg-[#F3F2F1] dark:bg-[#11100f] p-3 rounded border border-[#EDEBE9] dark:border-[#323130] text-center">
                  <span className="text-[10px] font-bold text-slate-405 uppercase tracking-wider block">{t("Success transfers")}</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-450 mt-1 block">
                    {selectedCampaign.successCount} {t("sends")}
                  </span>
                </div>
                <div className="bg-[#F3F2F1] dark:bg-[#11100f] p-3 rounded border border-[#EDEBE9] dark:border-[#323130] text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("Fail Bounces")}</span>
                  <span className={`text-sm font-bold mt-1 block ${selectedCampaign.failedCount > 0 ? "text-rose-600" : "text-slate-500"}`}>
                    {selectedCampaign.failedCount} {t("failed")}
                  </span>
                </div>
              </div>

              {/* Campaign info block */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("General details")}</label>
                <div className="p-4 bg-[#F3F2F1]/30 dark:bg-[#252423]/10 border border-[#EDEBE9] dark:border-[#323130] rounded text-xs space-y-2 leading-relaxed">
                  <p className="text-slate-650 dark:text-slate-350">
                    <strong className="text-slate-850 dark:text-slate-100 font-bold">{t("Subject Lines:")}</strong> {selectedCampaign.subject}
                  </p>
                  <p className="text-slate-650 dark:text-slate-350">
                    <strong className="text-slate-850 dark:text-slate-100 font-bold">{t("Attachments:")}</strong>{" "}
                    {selectedCampaign.attachments.length > 0
                      ? selectedCampaign.attachments.map((a) => a.name).join(", ")
                      : t("None included")}
                  </p>
                  <p className="text-slate-650 dark:text-slate-350">
                    <strong className="text-slate-850 dark:text-slate-100 font-bold">{t("Open Auditing Node:")}</strong>{" "}
                    {selectedCampaign.trackingConnected
                      ? `${t("Pixel connected")} (${selectedCampaign.trackingService?.toUpperCase()})`
                      : t("No pixel tracking service activated")}
                  </p>
                  {selectedCampaign.trackingConnected && (
                    <p className="text-slate-650 dark:text-slate-350">
                      <strong className="text-slate-850 dark:text-slate-100 font-bold">{t("Total Opens Audited:")}</strong>{" "}
                      <span className="text-[#0078D4] dark:text-brand-350 font-bold">
                        {selectedCampaign.openCount} {t("email views documented")}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Individual logs check */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("Recipient logs")}</label>
                <div className="border border-[#EDEBE9] dark:border-[#323130] rounded overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#F3F2F1] dark:bg-[#11100f] text-slate-500 font-bold border-b border-[#EDEBE9] dark:border-[#323130]">
                      <tr>
                        <th className="p-2.5">{t("Email address")}</th>
                        <th className="p-2.5">{t("Outcome")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDEBE9] dark:divide-[#323130] text-slate-605 dark:text-slate-300">
                      {selectedCampaign.recipients.map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#F3F2F1]/30">
                          <td className="p-2.5 font-mono text-[11px] truncate max-w-[200px]">{rec.Email}</td>
                          <td className="p-2.5">
                            {rec.status === "success" ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px]">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                {t("Delivered")} {selectedCampaign.trackingConnected && `(Opened: ${rec.openCount})`}
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold flex items-center gap-1 text-[10px]">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                {t("Failed:")} {rec.errorMessage?.substring(0, 30) || "Unknown Error"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-6 shadow-sm h-64 flex flex-col items-center justify-center text-center">
              <FileText className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs text-slate-505 font-bold">{t("Select a historical campaign log to review performance statistics and audit lists.")}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
