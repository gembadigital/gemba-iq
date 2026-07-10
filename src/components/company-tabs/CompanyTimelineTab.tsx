import React, { useState, useMemo } from "react";
import { CrmDb, CrmActivity, CrmEmail, CrmDocument } from "../../lib/CrmDb";
import { Proposal } from "../../types/proposal";
import {
  Phone,
  Video,
  Mail,
  FileText,
  Paperclip,
  Calendar,
  AlertCircle,
  Plus,
  Clock,
  Sparkles,
  Layers,
  CheckCircle,
  Trash2,
  Minimize2,
  FileCheck2,
  Activity,
  Award,
  X
} from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";

interface CompanyTimelineTabProps {
  companyId: string;
  lang: "TR" | "EN";
  companyName: string;
  industry: string;
}

interface UnifiedTimelineItem {
  id: string;
  type: "call" | "meeting" | "email" | "proposal" | "document" | "note" | "task" | "system" | "opex" | "site_visit";
  title: string;
  description: string;
  date: string; // ISO string or short date
  user: string;
  result?: string;
  metadata?: any;
}

export default function CompanyTimelineTab({
  companyId,
  lang: _langProp,
  companyName,
  industry
}: CompanyTimelineTabProps) {
  const { t, lang } = useLanguage();
  const [activities, setActivities] = useState<CrmActivity[]>(() => CrmDb.getActivitiesByCompany(companyId));
  const [emails, setEmails] = useState<CrmEmail[]>(() => CrmDb.getEmailsByCompany(companyId));
  const [documents, setDocuments] = useState<CrmDocument[]>(() => CrmDb.getDocumentsByCompany(companyId));
  const [proposals, setProposals] = useState<Proposal[]>(() => CrmDb.getProposalsByCompany(companyId) as any[]);
  
  // Log Activity Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState({
    type: "call" as "call" | "meeting" | "task" | "note" | "site_visit",
    title: "",
    description: "",
    result: "",
    user: "Atakan Zehir"
  });

  const reloadAll = () => {
    setActivities(CrmDb.getActivitiesByCompany(companyId));
    setEmails(CrmDb.getEmailsByCompany(companyId));
    setDocuments(CrmDb.getDocumentsByCompany(companyId));
    setProposals(CrmDb.getProposalsByCompany(companyId) as any[]);
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title) {
      alert(t("Please enter a title!"));
      return;
    }

    CrmDb.createActivity({
      companyId,
      type: formState.type === "site_visit" ? "meeting" : formState.type,
      title: formState.title,
      description: formState.description,
      result: formState.result,
      user: formState.user,
      date: new Date().toISOString()
    });

    // Also track as audit log
    const auditLogsKey = `crm_company_audit_logs_${companyId}`;
    const savedLogs = localStorage.getItem(auditLogsKey);
    const list = savedLogs ? JSON.parse(savedLogs) : [];
    list.unshift({
      id: `audit-${Date.now()}`,
      field: "Activity Logged",
      oldValue: "",
      newValue: `${formState.type.toUpperCase()}: ${formState.title}`,
      user: formState.user,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(auditLogsKey, JSON.stringify(list));

    setIsFormOpen(false);
    setFormState({
      type: "call",
      title: "",
      description: "",
      result: "",
      user: "Atakan Zehir"
    });
    reloadAll();
  };

  // Compile and merge all records into a single sorted timeline
  const timelineItems = useMemo<UnifiedTimelineItem[]>(() => {
    const items: UnifiedTimelineItem[] = [];

    // 1. Add standard activities
    activities.forEach((act) => {
      // Map custom type note/task/call/meeting
      let timelineType: UnifiedTimelineItem["type"] = "system";
      if (act.type === "call") timelineType = "call";
      else if (act.type === "meeting") timelineType = "meeting";
      else if (act.type === "task") timelineType = "task";
      else if (act.type === "note") timelineType = "note";
      else if (act.type === "system") timelineType = "system";

      items.push({
        id: act.id,
        type: timelineType,
        title: act.title,
        description: act.description,
        date: act.date || new Date().toISOString(),
        user: act.user || "GP Consultant",
        result: act.result
      });
    });

    // 2. Add emails
    emails.forEach((em) => {
      items.push({
        id: em.id,
        type: "email",
        title: em.isIncoming 
          ? t("Incoming Email: {subject}").replace("{subject}", em.subject)
          : t("Sent Email: {subject}").replace("{subject}", em.subject),
        description: em.body,
        date: em.date,
        user: em.isIncoming ? em.sender : t("Your Agent"),
        metadata: { recipient: em.recipient }
      });
    });

    // 3. Add documents
    documents.forEach((doc) => {
      items.push({
        id: doc.id,
        type: "document",
        title: t("Document Uploaded: {name}").replace("{name}", doc.name),
        description: `${t("Type:")} ${doc.type} • ${t("Size:")} ${doc.size}`,
        date: doc.date || new Date().toISOString(),
        user: "GP Core DB"
      });
    });

    // 4. Add proposals
    proposals.forEach((prop) => {
      // Create milestones based on proposal status
      const formattedDate = prop.date || new Date().toISOString().split("T")[0];
      items.push({
        id: `prop-sent-${prop.id}`,
        type: "proposal",
        title: t("Proposal Sent: #{number}").replace("{number}", prop.proposalNumber),
        description: `${prop.title} - ${t("Total Amount:")} ${prop.totalCost || t("N/A")}`,
        date: formattedDate + "T10:00:00.000Z",
        user: "GP Wizard",
        metadata: { status: prop.status }
      });

      if (prop.status === "Approved" || prop.status === "Accepted" || prop.status === "Signed") {
        items.push({
          id: `prop-ok-${prop.id}`,
          type: "opex",
          title: t("Proposal Accepted: #{number}").replace("{number}", prop.proposalNumber),
          description: t("Client approved proposal. Moving to implementation phase."),
          date: new Date(new Date(formattedDate).getTime() + 2 * 24 * 3600 * 1000).toISOString(),
          user: "Client Approver"
        });
      } else if (prop.status === "Rejected" || prop.status === "Declined") {
        items.push({
          id: `prop-fail-${prop.id}`,
          type: "system",
          title: t("Proposal Declined: #{number}").replace("{number}", prop.proposalNumber),
          description: t("Proposal not approved due to budget or methodology constraints."),
          date: new Date(new Date(formattedDate).getTime() + 3 * 24 * 3600 * 1000).toISOString(),
          user: "Client Board"
        });
      }
    });

    // 5. Add custom audit logs as timeline changes
    const auditLogsKey = `crm_company_audit_logs_${companyId}`;
    const savedLogs = localStorage.getItem(auditLogsKey);
    if (savedLogs) {
      try {
        const logs = JSON.parse(savedLogs);
        logs.forEach((log: any) => {
          items.push({
            id: log.id,
            type: "system",
            title: t("System Update: {field}").replace("{field}", log.field),
            description: log.newValue 
              ? t("Updated from '{old}' to '{new}'.").replace("{old}", log.oldValue).replace("{new}", log.newValue)
              : log.field,
            date: log.timestamp || new Date().toISOString(),
            user: log.user || "GP Admin"
          });
        });
      } catch (err) {
        console.error("Error reading audits", err);
      }
    }

    // Sort descending chronologically
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activities, emails, documents, proposals, companyId, t]);

  // Dynamic Contextual AI advice based on company's industry
  const aiRecommendation = useMemo(() => {
    if (industry === "Automotive") {
      return {
        focus: t("Molding & Assembly Flow (OEE)"),
        text: t("Given high automotive tier-1 demands, prioritizing a SMED (Single Minute Exchange of Die) cycle is recommended to stabilize OEE targets above 85%. Value stream mapping indicates buffer inventory waits are the main source of Muda.")
      };
    } else if (industry === "Textiles") {
      return {
        focus: t("Scrap Minimization & Energy Audit"),
        text: t("Yarn production displays a 3% raw material wastage pattern. A comprehensive air-leak audit (minimizing waste Muda) and cyclic yarn inspection project should be proposed to recover operational yields.")
      };
    } else {
      return {
        focus: t("Value Stream Mapping & Cell Layout"),
        text: t("To enhance the product travel cycle, a transition towards custom Cellular Assembly units is advised. Digitized Andon visual indicators will assist operators in real-time speed stabilization.")
      };
    }
  }, [industry, t]);

  const getTimelineIcon = (type: UnifiedTimelineItem["type"]) => {
    switch (type) {
      case "call":
        return <Phone className="w-4 h-4 text-emerald-500" />;
      case "meeting":
        return <Video className="w-4 h-4 text-blue-500" />;
      case "email":
        return <Mail className="w-4 h-4 text-indigo-500" />;
      case "proposal":
        return <FileCheck2 className="w-4 h-4 text-amber-500" />;
      case "document":
        return <Paperclip className="w-4 h-4 text-[#0078D4]" />;
      case "note":
        return <FileText className="w-4 h-4 text-purple-500" />;
      case "task":
        return <CheckCircle className="w-4 h-4 text-teal-500" />;
      case "opex":
        return <Award className="w-4 h-4 text-violet-500" />;
      case "site_visit":
        return <Activity className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans text-xs">
      
      {/* LEFT: Timeline chronological feed (8 columns) */}
      <div className="lg:col-span-8 space-y-4">
        
        {/* Action Header and Quick Log Activator */}
        <div className="flex items-center justify-between bg-white dark:bg-[#151515] p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
            {t("Chronological Activity Timeline")}
          </h4>
          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("Log Activity")}</span>
          </button>
        </div>

        {/* Log Activity Inline Form */}
        {isFormOpen && (
          <form
            onSubmit={handleCreateActivity}
            className="p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-800 rounded-xl space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-zinc-800 pb-1.5">
              <span className="font-bold text-slate-700 dark:text-zinc-200">{t("Log Phone Call / Meeting")}</span>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Type")}</label>
                <select
                  value={formState.type}
                  onChange={(e: any) => setFormState({ ...formState, type: e.target.value })}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                >
                  <option value="call">{t("Phone Call")}</option>
                  <option value="meeting">{t("Meeting / Audit")}</option>
                  <option value="task">{t("Task / Action Item")}</option>
                  <option value="note">{t("Consultant Note")}</option>
                  <option value="site_visit">{t("Site Gemba Visit")}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Activity Title *")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("e.g. Discussed SMED process diagnostic scope")}
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Brief Details")}</label>
              <textarea
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder={t("Key notes, identified wastes, follow-ups...")}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Outcome")}</label>
                <input
                  type="text"
                  placeholder={t("e.g. Positive, follow up next Monday")}
                  value={formState.result}
                  onChange={(e) => setFormState({ ...formState, result: e.target.value })}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Logged By")}</label>
                <input
                  type="text"
                  value={formState.user}
                  onChange={(e) => setFormState({ ...formState, user: e.target.value })}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-dashed border-slate-200 dark:border-zinc-800 pt-2.5">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer"
              >
                {t("Save Log")}
              </button>
            </div>
          </form>
        )}

        {/* Timeline Feed Container */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {timelineItems.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span className="text-slate-400 block">
                {t("No timeline events recorded for this account yet.")}
              </span>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-100 dark:border-zinc-800 pl-5.5 ml-3 space-y-6">
              {timelineItems.map((item) => (
                <div key={item.id} className="relative group/timeline animate-fadeIn text-xs font-sans">
                  
                  {/* Bullet Node Icon */}
                  <div className="absolute -left-[35px] top-1 w-6.5 h-6.5 rounded-full bg-white dark:bg-[#151515] border border-slate-200 dark:border-zinc-700 flex items-center justify-center shadow-xs">
                    {getTimelineIcon(item.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                      <span className="font-extrabold text-slate-800 dark:text-zinc-100 text-xs">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-450 dark:text-zinc-500 font-mono flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(item.date).toLocaleString(lang === "TR" ? "tr-TR" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>

                    <p className="text-slate-650 dark:text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap max-w-3xl pr-1 text-xs">
                      {item.description}
                    </p>

                    {item.result && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded bg-emerald-50 dark:bg-emerald-950/20 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                        <CheckCircle className="w-3 h-3" />
                        <span><b>{t("Outcome:")}</b> {item.result}</span>
                      </div>
                    )}

                    <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono mt-1.5">
                      {t("Logged By:")} <span className="font-bold text-slate-500 dark:text-zinc-400">{item.user}</span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT: Contextual AI Smart recommendation & stats (4 columns) */}
      <div className="lg:col-span-4 space-y-4">
        
        {/* AI Recommendations Panel */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-xl space-y-4 border border-indigo-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-white shrink-0 pointer-events-none">
            <Sparkles className="w-36 h-36" />
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg shrink-0">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-300 uppercase block">
                Gemba partner AI
              </span>
              <h5 className="text-xs font-extrabold uppercase text-indigo-50 font-display mt-0.5">
                {t("Corporate AI Wizard Insights")}
              </h5>
            </div>
          </div>

          <div className="bg-black/25 border border-indigo-500/15 p-3.5 rounded-xl space-y-2 text-xs">
            <div className="text-indigo-300 font-extrabold uppercase font-mono tracking-wide text-[9px]">
              {t("Strategic Focus Area:")}
            </div>
            <div className="font-bold text-white text-xs">{aiRecommendation.focus}</div>
            <p className="text-slate-200 leading-relaxed font-sans mt-1 text-[11px]">
              {aiRecommendation.text}
            </p>
          </div>

          <p className="text-[9px] text-indigo-200/60 font-mono leading-tight">
            * {t("Recommendation sets dynamically adjust based on headcount scaling, sector layout patterns, and operational indexes.")}
          </p>
        </div>

        {/* Operational Timeline Stats Card */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
          <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider font-mono">
            {t("Activity Density Stats")}
          </h4>

          <div className="space-y-2 text-xs font-sans text-slate-700 dark:text-zinc-355">
            <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-zinc-850">
              <span className="text-slate-405">{t("Phone Calls:")}</span>
              <span className="font-bold font-mono text-emerald-650">{activities.filter(a => a.type === "call").length}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-zinc-850">
              <span className="text-slate-405">{t("Meetings / Diagnostics:")}</span>
              <span className="font-bold font-mono text-blue-600">{activities.filter(a => a.type === "meeting").length}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-zinc-850">
              <span className="text-slate-405">{t("Emails Exchanged:")}</span>
              <span className="font-bold font-mono text-indigo-500">{emails.length}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-zinc-850">
              <span className="text-slate-405">{t("Active Proposals:")}</span>
              <span className="font-bold font-mono text-amber-600">{proposals.length}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-405">{t("Attached Documents:")}</span>
              <span className="font-bold font-mono text-blue-500">{documents.length}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
