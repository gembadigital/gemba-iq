import React, { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Send,
  Edit3,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  Save,
  ChevronDown,
  Building2,
  Bot,
  MessageSquare,
  UserCog,
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { CrmDb } from "../lib/CrmDb";
import { getTenantActorName } from "../lib/tenantStorage";
import {
  approveAndSendOutreachDraft,
  fetchOutreachDrafts,
  rejectOutreachDraft,
  updateOutreachDraftContent,
  type OutreachDraft,
  type OutreachStatus,
} from "../lib/outreachService";

const OUTREACH_TEMPLATE_KEY = "outreach_template";

interface OutreachTemplate {
  subject: string;
  bodyHtml: string;
}

const DEFAULT_TEMPLATE: OutreachTemplate = {
  subject: "Gemba Partner - Yeniden Görüşelim mi?",
  bodyHtml:
    "<p>Merhaba,</p><p>Bir süredir görüşmediğimizi fark ettim, kısa bir güncelleme için müsait olduğunuzda görüşmek isteriz.</p><p>Saygılarımızla,</p>",
};

const SOURCE_LABELS: Record<string, string> = {
  "deal-scan": "Fırsat taraması",
  "lead-scan": "Aday Profili taraması",
  "manual-telegram": "Manuel — Telegram",
  "manual-panel": "Manuel — Panel",
};

const STATUS_STYLES: Record<OutreachStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
  approved: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50",
  sent: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50",
  rejected: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function OutreachApprovalView() {
  const { t } = useLanguage();
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OutreachStatus | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<OutreachDraft | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [rejectingDraft, setRejectingDraft] = useState<OutreachDraft | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [template, setTemplate] = useState<OutreachTemplate>(DEFAULT_TEMPLATE);
  const [templateSaved, setTemplateSaved] = useState(false);

  useEffect(() => {
    const stored = CrmDb.getKv<OutreachTemplate>(OUTREACH_TEMPLATE_KEY, DEFAULT_TEMPLATE);
    setTemplate(stored);
  }, []);

  const loadDrafts = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const rows = await fetchOutreachDrafts();
      setDrafts(rows);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const companyName = (draft: OutreachDraft): string => {
    if (!draft.companyId) return "—";
    const company = CrmDb.getCompanyById(draft.companyId);
    return company?.name || "—";
  };

  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const haystack = [
        companyName(d),
        d.subject,
        ...(d.recipients || []).map((r) => `${r.name} ${r.email}`),
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, statusFilter, searchTerm]);

  const pendingCount = drafts.filter((d) => d.status === "pending").length;

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredDrafts.filter((d) => d.status === "pending").map((d) => d.id) : []);
  };

  const handleSend = async (draft: OutreachDraft) => {
    setBusyId(draft.id);
    setErrorMessage(null);
    try {
      await approveAndSendOutreachDraft(draft.id, getTenantActorName());
      await loadDrafts();
      setSelectedIds((prev) => prev.filter((x) => x !== draft.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkSend = async () => {
    const targets = drafts.filter((d) => selectedIds.includes(d.id) && d.status === "pending");
    for (const draft of targets) {
      // eslint-disable-next-line no-await-in-loop
      await handleSend(draft);
    }
  };

  const openEdit = (draft: OutreachDraft) => {
    setEditingDraft(draft);
    setEditSubject(draft.subject);
    setEditBody(draft.bodyHtml);
  };

  const saveEdit = async () => {
    if (!editingDraft) return;
    setBusyId(editingDraft.id);
    try {
      await updateOutreachDraftContent(editingDraft.id, editSubject, editBody);
      setEditingDraft(null);
      await loadDrafts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (draft: OutreachDraft) => {
    setRejectingDraft(draft);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectingDraft) return;
    setBusyId(rejectingDraft.id);
    try {
      await rejectOutreachDraft(rejectingDraft.id, rejectReason || t("No reason given"));
      setRejectingDraft(null);
      await loadDrafts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyId(null);
    }
  };

  const saveTemplate = () => {
    CrmDb.setKv(OUTREACH_TEMPLATE_KEY, template);
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-600/10 rounded-lg text-green-600">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">{t("Re-engagement Approval List")}</h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
              {t("{count} draft(s) awaiting approval").replace("{count}", String(pendingCount))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTemplateEditor((v) => !v)}
            className="px-3 py-1.5 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            {t("Template")}
          </button>
          <button
            type="button"
            onClick={loadDrafts}
            className="p-1.5 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-all"
            title={t("Refresh")}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold px-4 py-3 rounded-xl">
          {errorMessage}
        </div>
      )}

      {/* Template editor */}
      {showTemplateEditor && (
        <div className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-200">
            <Bot className="w-3.5 h-3.5 text-green-600" />
            {t("Default Outreach Template")}
            <span className="text-[10px] font-normal text-slate-400 font-mono ml-1">
              {t("Used by the agent when drafting new outreach emails")}
            </span>
          </div>
          <input
            type="text"
            value={template.subject}
            onChange={(e) => setTemplate((prev) => ({ ...prev, subject: e.target.value }))}
            placeholder={t("Subject")}
            className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
          />
          <textarea
            value={template.bodyHtml}
            onChange={(e) => setTemplate((prev) => ({ ...prev, bodyHtml: e.target.value }))}
            placeholder={t("Body (HTML)")}
            rows={6}
            className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 font-mono"
          />
          <div className="flex items-center justify-end gap-2">
            {templateSaved && <span className="text-[11px] font-bold text-green-600">{t("Saved")}</span>}
            <button
              type="button"
              onClick={saveTemplate}
              className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              {t("Save Template")}
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={t("Search company, recipient, subject...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 w-64 font-sans"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs select-none">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OutreachStatus | "all")}
              className="bg-transparent border-none text-[11px] font-semibold focus:outline-none cursor-pointer"
            >
              <option value="pending">{t("Pending")}</option>
              <option value="approved">{t("Approved")}</option>
              <option value="sent">{t("Sent")}</option>
              <option value="rejected">{t("Rejected")}</option>
              <option value="all">{t("All")}</option>
            </select>
          </div>
        </div>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handleBulkSend}
            disabled={busyId !== null}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            {t("Send Selected")} ({selectedIds.length})
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-[#151515] rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 text-[10px] uppercase tracking-wider font-mono font-bold text-slate-400 select-none">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredDrafts.filter((d) => d.status === "pending").length > 0 &&
                      selectedIds.length === filteredDrafts.filter((d) => d.status === "pending").length
                    }
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="cursor-pointer"
                  />
                </th>
                <th className="p-4">{t("Company")}</th>
                <th className="p-4">{t("Recipients")}</th>
                <th className="p-4">{t("Subject")}</th>
                <th className="p-4">{t("Source")}</th>
                <th className="p-4">{t("Status")}</th>
                <th className="p-4">{t("Created")}</th>
                <th className="p-4 text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-slate-400 font-mono">
                    {t("Loading...")}
                  </td>
                </tr>
              )}
              {!loading && filteredDrafts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-slate-400 font-mono">
                    {t("No outreach drafts found.")}
                  </td>
                </tr>
              )}
              {!loading &&
                filteredDrafts.map((draft) => (
                  <React.Fragment key={draft.id}>
                    <tr className="border-b border-slate-50 dark:border-zinc-800/60 hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4">
                        {draft.status === "pending" && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(draft.id)}
                            onChange={(e) => toggleSelect(draft.id, e.target.checked)}
                            className="cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {companyName(draft)}
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-zinc-300">
                        {(draft.recipients || []).map((r) => r.name || r.email).join(", ") || "—"}
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-zinc-300 max-w-xs">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === draft.id ? null : draft.id)}
                          className="text-left hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span className="truncate">{draft.subject}</span>
                          <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${expandedId === draft.id ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                      <td className="p-4 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                        {t(SOURCE_LABELS[draft.source] || draft.source)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[draft.status]}`}
                        >
                          {t(draft.status)}
                        </span>
                      </td>
                      <td className="p-4 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                        {draft.createdAt ? new Date(draft.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {draft.status === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSend(draft)}
                                disabled={busyId === draft.id}
                                title={t("Send")}
                                className="p-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg cursor-pointer transition-all"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(draft)}
                                title={t("Edit")}
                                className="p-1.5 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-lg cursor-pointer transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openReject(draft)}
                                title={t("Reject")}
                                className="p-1.5 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer transition-all"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {draft.status === "sent" && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {t("Sent")}
                            </span>
                          )}
                          {draft.status === "rejected" && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500" title={draft.rejectedReason}>
                              <XCircle className="w-3.5 h-3.5" />
                              {t("Rejected")}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === draft.id && (
                      <tr className="bg-slate-50/60 dark:bg-zinc-900/40">
                        <td colSpan={8} className="p-4">
                          <div className="text-xs text-slate-600 dark:text-zinc-300 whitespace-pre-wrap max-w-3xl">
                            {stripHtml(draft.bodyHtml)}
                          </div>
                          {draft.approvedBy && (
                            <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <UserCog className="w-3 h-3" />
                              {t("Approved by")}: {draft.approvedBy}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editingDraft && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl w-full max-w-lg p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-zinc-100">
              <MessageSquare className="w-4 h-4 text-green-600" />
              {t("Edit Draft")}
            </div>
            <input
              type="text"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
            />
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={8}
              className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 font-mono"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={busyId === editingDraft.id}
                className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {t("Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectingDraft && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-zinc-100">
              <Ban className="w-4 h-4 text-rose-600" />
              {t("Reject Draft")}
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder={t("Reason (optional)")}
              className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRejectingDraft(null)}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={busyId === rejectingDraft.id}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {t("Confirm Reject")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono px-1">
        <Clock className="w-3 h-3" />
        {t("Sending always requires your explicit approval here — the AI agent cannot send on its own.")}
      </div>
    </div>
  );
}
