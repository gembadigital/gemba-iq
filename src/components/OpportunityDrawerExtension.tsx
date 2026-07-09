import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../lib/LanguageContext";
import {
  FileText,
  Trash2,
  Edit2,
  Copy,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Plus,
  X,
  Check,
  Calendar,
  AlertTriangle,
  Download,
  Eye,
  Send,
  Link as LinkIcon,
  Share2,
  FileSignature,
  Maximize2,
  Minimize2,
  Search,
  ZoomIn,
  ZoomOut,
  Printer,
  Upload,
  File,
  CheckCircle,
  HelpCircle,
  Clock,
  User,
  Undo
} from "lucide-react";
import { Proposal, ProposalVersion, ProposalOption } from "../types/proposal";
import { CrmDb } from "../lib/CrmDb";
import { Deal } from "./DealManagementView";
import { jsPDF } from "jspdf";

// Types used in this extension
export interface OpexNote {
  id: string;
  content: string;
  timestamp: string;
  author: string;
  version: number;
}

export interface OpexAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
  versions?: {
    id: string;
    name: string;
    size: string;
    uploadedBy: string;
    uploadedAt: string;
    version: number;
  }[];
}

export interface AuditLogEntry {
  id: string;
  user: string;
  date: string;
  time: string;
  action: string;
  previousValue?: string;
  newValue?: string;
}

// Helper to log an audit action
export function addAuditLog(
  deal: Deal,
  action: string,
  prevVal?: string,
  newVal?: string,
  user: string = "atakan.zehir@gmail.com"
): Deal {
  const now = new Date();
  const dateStr = now.toLocaleDateString("tr-TR");
  const timeStr = now.toLocaleTimeString("tr-TR");
  const newLog: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    user,
    date: dateStr,
    time: timeStr,
    action,
    previousValue: prevVal,
    newValue: newVal
  };
  const logs = (deal as any).auditTrail || [];
  return {
    ...deal,
    auditTrail: [newLog, ...logs]
  } as any;
}

// ========================================================
// 1. TIMELINE OF ACTIVITIES COMPONENT
// ========================================================
interface TimelineActivitiesProps {
  deal: Deal;
  onUpdateDeal: (updatedDeal: Deal) => void;
  lang: string;
  t: (key: string) => string;
}

export function TimelineActivitiesSection({ deal, onUpdateDeal, lang, t }: TimelineActivitiesProps) {
  const [newActTitle, setNewActTitle] = useState("");
  const [newActType, setNewActType] = useState("Toplantı");
  const [newActDate, setNewActDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [newActSummary, setNewActSummary] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSummary, setEditSummary] = useState("");

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateActivity = () => {
    if (!newActTitle.trim() || !newActSummary.trim()) return;
    const dateTr = newActDate.split("-").reverse().join(".");
    const newAct = {
      id: `act-${Date.now()}`,
      date: dateTr,
      title: newActTitle.trim(),
      type: newActType,
      summary: newActSummary.trim()
    };

    const currentActs = deal.activities || [];
    const updatedDeal = {
      ...deal,
      activities: [newAct, ...currentActs]
    };
    const loggedDeal = addAuditLog(
      updatedDeal,
      lang === "TR" ? "Yeni Aktivite Eklendi" : "New Activity Created",
      undefined,
      `${newAct.type}: ${newAct.title}`
    );
    onUpdateDeal(loggedDeal);

    // Reset fields
    setNewActTitle("");
    setNewActSummary("");
  };

  const handleStartEdit = (act: any) => {
    setEditingId(act.id);
    setEditTitle(act.title);
    setEditType(act.type || "Toplantı");
    // Parse "DD.MM.YYYY" back to "YYYY-MM-DD"
    if (act.date && act.date.includes(".")) {
      const parts = act.date.split(".");
      if (parts.length === 3) {
        setEditDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        setEditDate(act.date);
      }
    } else {
      setEditDate(act.date || "");
    }
    setEditSummary(act.summary || "");
    setActiveMenuId(null);
  };

  const handleSaveEdit = (id: string) => {
    const formattedDate = editDate.includes("-") ? editDate.split("-").reverse().join(".") : editDate;
    const updatedActs = (deal.activities || []).map((act: any) => {
      if (act.id === id) {
        return {
          ...act,
          title: editTitle,
          type: editType,
          date: formattedDate,
          summary: editSummary
        };
      }
      return act;
    });

    const updatedDeal = { ...deal, activities: updatedActs };
    const loggedDeal = addAuditLog(
      updatedDeal,
      lang === "TR" ? "Aktivite Düzenlendi" : "Activity Edited",
      undefined,
      editTitle
    );
    onUpdateDeal(loggedDeal);
    setEditingId(null);
  };

  const handleDeleteActivity = (id: string, title: string) => {
    const msg = lang === "TR"
      ? `Bu aktiviteyi silmek istediğinizden emin misiniz?\n"${title}"`
      : `Are you sure you want to delete this activity?\n"${title}"`;
    if (window.confirm(msg)) {
      const updatedActs = (deal.activities || []).filter((act: any) => act.id !== id);
      const updatedDeal = { ...deal, activities: updatedActs };
      const loggedDeal = addAuditLog(
        updatedDeal,
        lang === "TR" ? "Aktivite Silindi" : "Activity Deleted",
        title,
        undefined
      );
      onUpdateDeal(loggedDeal);
      setActiveMenuId(null);
    }
  };

  const handleDuplicate = (act: any) => {
    const newAct = {
      ...act,
      id: `act-dup-${Date.now()}`,
      title: `${act.title} (${lang === "TR" ? "Kopya" : "Copy"})`,
      date: new Date().toLocaleDateString("tr-TR")
    };
    const currentActs = deal.activities || [];
    const index = currentActs.findIndex((a: any) => a.id === act.id);
    const updated = [...currentActs];
    updated.splice(index + 1, 0, newAct);

    const updatedDeal = { ...deal, activities: updated };
    const loggedDeal = addAuditLog(
      updatedDeal,
      lang === "TR" ? "Aktivite Çoğaltıldı" : "Activity Duplicated",
      act.title,
      newAct.title
    );
    onUpdateDeal(loggedDeal);
    setActiveMenuId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const currentActs = [...(deal.activities || [])];
    const temp = currentActs[index];
    currentActs[index] = currentActs[index - 1];
    currentActs[index - 1] = temp;

    onUpdateDeal({ ...deal, activities: currentActs });
    setActiveMenuId(null);
  };

  const handleMoveDown = (index: number) => {
    const currentActs = [...(deal.activities || [])];
    if (index === currentActs.length - 1) return;
    const temp = currentActs[index];
    currentActs[index] = currentActs[index + 1];
    currentActs[index + 1] = temp;

    onUpdateDeal({ ...deal, activities: currentActs });
    setActiveMenuId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-100 text-xs">
      {/* Create Activity Form */}
      <div className="bg-slate-50 dark:bg-black/15 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-4">
        <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 font-sans">
          <Calendar className="w-4 h-4 text-emerald-600" />
          {lang === "TR" ? "📅 Yeni Görüşme / Aktivite Ekle" : "📅 Add New Meeting / Activity"}
        </span>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[8px] text-slate-450 uppercase font-mono font-bold mb-1">
              {lang === "TR" ? "Görüşme Konusu *" : "Meeting Subject *"}
            </label>
            <input 
              type="text" 
              required
              placeholder={lang === "TR" ? "Örn: SMED Hazırlık İstişaresi" : "e.g., SMED Prep Alignment"}
              value={newActTitle}
              onChange={(e) => setNewActTitle(e.target.value)}
              className="w-full p-2 bg-white dark:bg-zinc-850 border border-slate-250 dark:border-zinc-750 text-slate-800 dark:text-zinc-100 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[8px] text-slate-455 uppercase font-mono font-bold mb-1">
              {lang === "TR" ? "Aktivite Türü" : "Activity Type"}
            </label>
            <select 
              value={newActType}
              onChange={(e) => setNewActType(e.target.value)}
              className="w-full p-2 bg-white dark:bg-zinc-850 border border-slate-250 dark:border-zinc-750 text-slate-800 dark:text-zinc-100 rounded focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="Toplantı">🤝 {lang === "TR" ? "Toplantı (Meeting)" : "Meeting"}</option>
              <option value="Saha Ziyareti">🏬 {lang === "TR" ? "Saha Ziyareti (Gemba Walk)" : "Site Visit / Gemba"}</option>
              <option value="E-posta">✉️ {lang === "TR" ? "E-posta İletişimi" : "Email Communication"}</option>
              <option value="Telefon">📞 {lang === "TR" ? "Telefon Araması" : "Phone Call"}</option>
              <option value="Diğer">⚙️ {lang === "TR" ? "Diğer Operasyonel" : "Other Operational"}</option>
            </select>
          </div>

          <div>
            <label className="block text-[8px] text-slate-455 uppercase font-mono font-bold mb-1">
              {lang === "TR" ? "Görüşme Tarihi *" : "Meeting Date *"}
            </label>
            <input 
              type="date" 
              required
              value={newActDate}
              onChange={(e) => setNewActDate(e.target.value)}
              className="w-full p-2 bg-white dark:bg-zinc-850 border border-slate-255 dark:border-zinc-755 text-slate-800 dark:text-zinc-100 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[8px] text-slate-455 uppercase font-mono font-bold mb-1">
              {lang === "TR" ? "Yapılan Görüşmenin İçeriği / Özeti *" : "Summary / Meeting Content *"}
            </label>
            <textarea 
              rows={2}
              required
              placeholder={lang === "TR" ? "Kararları ve detayları buraya yazın..." : "Describe decisions and highlights..."}
              value={newActSummary}
              onChange={(e) => setNewActSummary(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-zinc-850 border border-slate-255 dark:border-zinc-755 text-slate-800 dark:text-zinc-100 rounded focus:ring-1 focus:ring-emerald-500 outline-none h-18 resize-none font-sans text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={!newActTitle.trim() || !newActSummary.trim()}
            onClick={handleCreateActivity}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg cursor-pointer shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase"
          >
            {lang === "TR" ? "+ Görüşmeyi Kronolojiye Ekle" : "+ Add Meeting to Timeline"}
          </button>
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-slate-50 dark:bg-black/15 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
        <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-100 block uppercase tracking-wide font-mono">
          {lang === "TR" ? "Yapılan Görüşmeler & Kronoloji" : "Meetings & Timeline History"}
        </span>

        {deal.activities && deal.activities.length > 0 ? (
          <div className="relative pl-4 space-y-4 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200 dark:before:bg-zinc-800">
            {deal.activities.map((a: any, idx: number) => (
              <div key={a.id} className="relative text-xs">
                {/* Timeline bullet */}
                <div className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-zinc-900 shadow-xs" />
                
                {editingId === a.id ? (
                  /* Edit Row Inline */
                  <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-slate-200 dark:border-zinc-700 space-y-2 mt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        value={editTitle} 
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="p-1 border rounded w-full dark:bg-zinc-800 dark:text-white"
                        placeholder="Title"
                      />
                      <input 
                        type="date" 
                        value={editDate} 
                        onChange={(e) => setEditDate(e.target.value)}
                        className="p-1 border rounded w-full dark:bg-zinc-800 dark:text-white font-mono"
                      />
                      <select 
                        value={editType} 
                        onChange={(e) => setEditType(e.target.value)}
                        className="p-1 border rounded w-full dark:bg-zinc-800 dark:text-white"
                      >
                        <option value="Toplantı">Toplantı</option>
                        <option value="Saha Ziyareti">Saha Ziyareti</option>
                        <option value="E-posta">E-posta</option>
                        <option value="Telefon">Telefon</option>
                        <option value="Diğer">Diğer</option>
                      </select>
                    </div>
                    <textarea 
                      value={editSummary} 
                      onChange={(e) => setEditSummary(e.target.value)}
                      className="p-1.5 border rounded w-full dark:bg-zinc-800 dark:text-white text-[11px]"
                      rows={2}
                      placeholder="Summary content..."
                    />
                    <div className="flex justify-end gap-2 text-[10px]">
                      <button 
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 rounded text-slate-700 dark:text-zinc-300 font-bold"
                      >
                        {t("İptal")}
                      </button>
                      <button 
                        onClick={() => handleSaveEdit(a.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
                      >
                        {t("Kaydet")}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal View with 3-Dot Menu */
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-1 py-0.5 rounded text-[9px] font-bold">
                          {a.type || "Görüşme"}
                        </span>
                        <span className="font-bold text-slate-850 dark:text-zinc-150 truncate max-w-[280px]">{a.title}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0 relative">
                        <span className="font-mono text-slate-400 dark:text-zinc-500 text-[9px] font-bold bg-slate-100 dark:bg-zinc-900/60 px-1.5 py-0.5 rounded">
                          {a.date}
                        </span>
                        
                        {/* 3 Dot Action Button */}
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === a.id ? null : a.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded hover:bg-slate-150/40 cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuId === a.id && (
                            <div 
                              ref={menuRef}
                              className="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-slate-150 dark:border-zinc-800 py-1 z-50 text-left font-sans text-[11px]"
                            >
                              <button
                                onClick={() => handleStartEdit(a)}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-850 flex items-center gap-1.5 font-medium text-slate-750 dark:text-zinc-200"
                              >
                                <Edit2 className="w-3 h-3 text-blue-500" />
                                <span>{lang === "TR" ? "Düzenle" : "Edit"}</span>
                              </button>
                              <button
                                onClick={() => handleDuplicate(a)}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-850 flex items-center gap-1.5 font-medium text-slate-750 dark:text-zinc-200"
                              >
                                <Copy className="w-3 h-3 text-emerald-500" />
                                <span>{lang === "TR" ? "Çoğalt" : "Duplicate"}</span>
                              </button>
                              <button
                                onClick={() => handleMoveUp(idx)}
                                disabled={idx === 0}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-850 flex items-center gap-1.5 font-medium text-slate-750 dark:text-zinc-200 disabled:opacity-40"
                              >
                                <ArrowUp className="w-3 h-3 text-indigo-500" />
                                <span>{lang === "TR" ? "Yukarı Taşı" : "Move Up"}</span>
                              </button>
                              <button
                                onClick={() => handleMoveDown(idx)}
                                disabled={idx === (deal.activities || []).length - 1}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-850 flex items-center gap-1.5 font-medium text-slate-750 dark:text-zinc-200 disabled:opacity-40"
                              >
                                <ArrowDown className="w-3 h-3 text-indigo-500" />
                                <span>{lang === "TR" ? "Aşağı Taşı" : "Move Down"}</span>
                              </button>
                              <div className="border-t border-slate-100 dark:border-zinc-800 my-0.5" />
                              <button
                                onClick={() => handleDeleteActivity(a.id, a.title)}
                                className="w-full px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-1.5 font-bold text-rose-600"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>{lang === "TR" ? "Sil" : "Delete"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {a.summary && (
                      <p className="p-2.5 bg-white dark:bg-[#111110] border border-slate-150 dark:border-zinc-805/50 rounded text-[11px] text-slate-600 dark:text-zinc-300 leading-normal pl-3 font-sans italic border-l-2 border-l-emerald-500">
                        <strong>{lang === "TR" ? "Özet:" : "Summary:"}</strong> {a.summary}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-450 text-center italic py-4">
            {lang === "TR" ? "Fırsata ait geçmiş aktivite bulunmamaktadır." : "No activities have been logged for this opportunity."}
          </p>
        )}
      </div>
    </div>
  );
}


// ========================================================
// 2. OPEX ASSESSMENT ENHANCEMENT COMPONENT
// ========================================================
interface OpexAssessmentProps {
  deal: Deal;
  onUpdateDeal: (updatedDeal: Deal) => void;
  lang: string;
  t: (key: string) => string;
  readOnly?: boolean;
}

export function OpexAssessmentSection({ deal, onUpdateDeal, lang, t, readOnly = false }: OpexAssessmentProps) {
  // Consultant Notes State
  const [notes, setNotes] = useState<OpexNote[]>(() => {
    return (deal as any).opexNotes || [
      {
        id: "note-1",
        content: "<div><b>İlk Saha Gözlemleri:</b> Fabrika montaj katında yüksek miktarda yarı mamul (WIP) birikimi gözlemlendi. Hat çağırma sinyalizasyonu (Kanban) bulunmamakta, operatörler manuel malzeme sevkiyatı yapmaktadır.</div>",
        timestamp: "28.06.2026 10:15:22",
        author: "atakan.zehir@gmail.com",
        version: 1
      }
    ];
  });

  const [editorContent, setEditorContent] = useState("");
  const [editorAuthor, setEditorAuthor] = useState("atakan.zehir@gmail.com");
  const [selectedNoteVersion, setSelectedNoteVersion] = useState<number | null>(null);
  
  // Attachments State
  const [attachments, setAttachments] = useState<OpexAttachment[]>(() => {
    return (deal as any).opexAttachments || [
      {
        id: "att-1",
        name: "Yalın_Durum_Muda_Analizi.pdf",
        size: "2.4 MB",
        type: "pdf",
        uploadedBy: "atakan.zehir@gmail.com",
        uploadedAt: "28.06.2026 11:30:00",
        version: 1
      }
    ];
  });

  const [maxFileSize, setMaxFileSize] = useState(15); // Configurable max size in MB
  const [dragActive, setDragActive] = useState(false);
  const [associatedProposalId, setAssociatedProposalId] = useState("General");
  const [previewFile, setPreviewFile] = useState<OpexAttachment | null>(null);

  // Associated proposals selector list
  const [proposalsList, setProposalsList] = useState<Proposal[]>([]);
  useEffect(() => {
    try {
      const parsed = CrmDb.getProposals();
      const filtered = parsed.filter(p => 
        p.companyName && deal.companyName &&
        (p.companyName.toLowerCase().trim() === deal.companyName.toLowerCase().trim() || p.companyId === deal.companyId)
      );
      setProposalsList(filtered);
    } catch (_) {}
  }, [deal]);

  // Sync back to deal on notes/attachments change
  const syncToDeal = (updatedNotes: OpexNote[], updatedAtts: OpexAttachment[]) => {
    const nextDeal = {
      ...deal,
      opexNotes: updatedNotes,
      opexAttachments: updatedAtts
    };
    onUpdateDeal(nextDeal);
  };

  // ContentEditable ref
  const editableRef = useRef<HTMLDivElement>(null);

  // Auto-save timer
  const autoSaveTimerRef = useRef<any>(null);

  const handleEditorChange = () => {
    if (!editableRef.current) return;
    const content = editableRef.current.innerHTML;
    setEditorContent(content);

    if (readOnly) return;

    // Trigger debounced auto-save (2 seconds delay)
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveNoteVersion(content, true);
    }, 2000);
  };

  const saveNoteVersion = (content: string, isAutoSave = false) => {
    if (!content.trim() || content === "<br>") return;
    
    // Check if the content is different from the latest version to avoid saving duplicates
    const latest = notes[0];
    if (latest && latest.content === content) return;

    const nextVer = (latest ? latest.version : 0) + 1;
    const now = new Date();
    const timestampStr = `${now.toLocaleDateString("tr-TR")} ${now.toLocaleTimeString("tr-TR")}`;
    
    const newNote: OpexNote = {
      id: `note-${Date.now()}`,
      content,
      timestamp: timestampStr,
      author: editorAuthor || "atakan.zehir@gmail.com",
      version: nextVer
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    
    const nextDeal = {
      ...deal,
      opexNotes: updated
    };
    // Also log audit
    const logged = addAuditLog(
      nextDeal,
      isAutoSave 
        ? `${lang === "TR" ? "Otomatik Kayıt" : "Auto Saved"}: Not Versiyon V${nextVer}` 
        : `${lang === "TR" ? "Not Versiyonu Kaydedildi" : "Note Version V" + nextVer + " Saved"}`,
      latest ? `V${latest.version}` : undefined,
      `V${nextVer}`
    );
    onUpdateDeal(logged);
  };

  const handleManualSave = () => {
    if (editableRef.current) {
      saveNoteVersion(editableRef.current.innerHTML, false);
      alert(lang === "TR" ? "Notunuz yeni bir versiyon olarak başarıyla kaydedildi!" : "Note successfully saved as a new version!");
    }
  };

  // Rich Text command triggers
  const execCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editableRef.current) {
      handleEditorChange();
    }
  };

  const insertTable = () => {
    const tableHtml = `
      <table class="w-full border-collapse border border-slate-300 dark:border-zinc-700 my-2 text-xs">
        <thead>
          <tr class="bg-slate-100 dark:bg-zinc-800">
            <th class="border border-slate-300 dark:border-zinc-700 p-1.5 font-bold">Kriter / Metric</th>
            <th class="border border-slate-300 dark:border-zinc-700 p-1.5 font-bold">Mevcut Durum / Current</th>
            <th class="border border-slate-300 dark:border-zinc-700 p-1.5 font-bold">Hedef / Target</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-slate-300 dark:border-zinc-700 p-1.5">Cycle Time (sn)</td>
            <td class="border border-slate-300 dark:border-zinc-700 p-1.5">120</td>
            <td class="border border-slate-300 dark:border-zinc-700 p-1.5">90</td>
          </tr>
        </tbody>
      </table>
    `;
    execCommand("insertHTML", tableHtml);
  };

  const insertLink = () => {
    const url = window.prompt("Bağlantı adresi girin (URL):", "https://");
    if (url) execCommand("createLink", url);
  };

  const insertImage = () => {
    const url = window.prompt("Görsel URL adresi girin:", "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300");
    if (url) execCommand("insertImage", url);
  };

  // Drag & Drop attachment handling
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
    if (readOnly) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadedFiles(e.target.files);
    }
  };

  const handleUploadedFiles = (fileList: FileList) => {
    if (readOnly) return;
    const uploaded = Array.from(fileList);
    let updatedAtts = [...attachments];

    uploaded.forEach((f) => {
      const sizeInMB = f.size / (1024 * 1024);
      if (sizeInMB > maxFileSize) {
        alert(
          lang === "TR"
            ? `Hata: "${f.name}" dosyası sınırı aşmaktadır (${sizeInMB.toFixed(1)} MB > Maksimum ${maxFileSize} MB)`
            : `Error: "${f.name}" file size exceeds limit (${sizeInMB.toFixed(1)} MB > Configured max ${maxFileSize} MB)`
        );
        return;
      }

      // Check if file already exists for Versioning!
      const existingIdx = updatedAtts.findIndex(a => a.name.toLowerCase() === f.name.toLowerCase());
      const now = new Date();
      const uploadedAtStr = `${now.toLocaleDateString("tr-TR")} ${now.toLocaleTimeString("tr-TR")}`;

      if (existingIdx > -1) {
        // Upgrade existing attachment version
        const existing = updatedAtts[existingIdx];
        const nextVer = existing.version + 1;
        const pastVersions = existing.versions || [];
        
        const updatedFile: OpexAttachment = {
          ...existing,
          version: nextVer,
          size: `${sizeInMB.toFixed(1)} MB`,
          uploadedAt: uploadedAtStr,
          uploadedBy: editorAuthor,
          versions: [
            {
              id: existing.id + "-" + existing.version,
              name: existing.name,
              size: existing.size,
              uploadedBy: existing.uploadedBy,
              uploadedAt: existing.uploadedAt,
              version: existing.version
            },
            ...pastVersions
          ]
        };
        updatedAtts[existingIdx] = updatedFile;
        alert(
          lang === "TR"
            ? `"${f.name}" dosyasının yeni bir versiyonu yüklenerek V${nextVer} seviyesine çıkarıldı!`
            : `"${f.name}" successfully updated to version V${nextVer}!`
        );
      } else {
        // Create new attachment
        const newAtt: OpexAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: f.name,
          size: `${sizeInMB.toFixed(1)} MB`,
          type: f.name.split(".").pop() || "bin",
          uploadedBy: editorAuthor,
          uploadedAt: uploadedAtStr,
          version: 1,
          versions: []
        };
        updatedAtts = [newAtt, ...updatedAtts];
      }
    });

    setAttachments(updatedAtts);
    syncToDeal(notes, updatedAtts);
    
    // Log Audit
    const logged = addAuditLog(
      deal,
      lang === "TR" ? "Yeni Ek Dosya Yüklendi" : "New Attachment Uploaded",
      undefined,
      uploaded.map(x => x.name).join(", ")
    );
    onUpdateDeal(logged);
  };

  const handleDeleteAttachment = (id: string, name: string) => {
    if (readOnly) return;
    const msg = lang === "TR" 
      ? `"${name}" dosyasını silmek istediğinizden emin misiniz?` 
      : `Are you sure you want to delete "${name}"?`;
    if (window.confirm(msg)) {
      const updated = attachments.filter(a => a.id !== id);
      setAttachments(updated);
      syncToDeal(notes, updated);

      const logged = addAuditLog(
        deal,
        lang === "TR" ? "Ek Dosya Silindi" : "Attachment Deleted",
        name,
        undefined
      );
      onUpdateDeal(logged);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-100 text-xs">
      
      {/* 2-Column Split: Notes Editor & Attachments Uploader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Rich Text Consultant Notes */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900/60 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-800 dark:text-zinc-150 uppercase tracking-wide font-sans text-xs">
                ✍️ {lang === "TR" ? "Saha Danışman Notları" : "Consultant Notes"}
              </span>
              <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 rounded text-[9px] font-mono font-bold animate-pulse">
                {lang === "TR" ? "Auto-Save Aktif" : "Auto-Save Active"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-slate-450 font-bold font-mono">Author:</label>
              <input 
                type="text" 
                value={editorAuthor}
                onChange={(e) => setEditorAuthor(e.target.value)}
                disabled={readOnly}
                className="p-1 text-[10px] rounded border dark:bg-zinc-800 dark:text-zinc-200 w-28 font-mono outline-none"
              />
            </div>
          </div>

          {/* Editor Format Toolbar */}
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-zinc-850 p-1.5 rounded-lg border border-slate-200/50 dark:border-zinc-750">
              <button onClick={() => execCommand("bold")} className="p-1 px-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded font-bold" title="Bold">B</button>
              <button onClick={() => execCommand("italic")} className="p-1 px-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded italic" title="Italic">I</button>
              <button onClick={() => execCommand("underline")} className="p-1 px-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded underline" title="Underline">U</button>
              <div className="w-[1px] h-4 bg-slate-300 dark:bg-zinc-700 mx-1" />
              <button onClick={() => execCommand("insertUnorderedList")} className="p-1 px-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded" title="Bullet List">• List</button>
              <button onClick={() => execCommand("insertOrderedList")} className="p-1 px-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded" title="Numbered List">1. List</button>
              <button onClick={insertTable} className="p-1 px-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded" title="Insert Table">📊 Table</button>
              <button onClick={insertLink} className="p-1 px-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded" title="Insert Link">🔗 Link</button>
              <button onClick={insertImage} className="p-1 px-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded" title="Insert Image">🖼️ Image</button>
            </div>
          )}

          {/* Editable Area */}
          <div 
            ref={editableRef}
            contentEditable={!readOnly}
            onInput={handleEditorChange}
            onBlur={() => {
              if (editableRef.current) {
                saveNoteVersion(editableRef.current.innerHTML, false);
              }
            }}
            className="w-full min-h-[160px] max-h-[300px] overflow-y-auto p-3 border border-slate-250 dark:border-zinc-755 bg-slate-50/20 dark:bg-[#121211] text-slate-800 dark:text-zinc-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed text-xs"
            placeholder={lang === "TR" ? "Gemba analiz notlarınızı buraya yazın..." : "Start typing consultant notes here..."}
            dangerouslySetInnerHTML={{ __html: editorContent || (notes[0] ? notes[0].content : "") }}
          />

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {lang === "TR" ? "Son kaydedilen versiyon: " : "Last saved: "} 
              <strong>V{notes[0] ? notes[0].version : 1}</strong> ({notes[0] ? notes[0].timestamp : "N/A"})
            </span>
            
            {!readOnly && (
              <button
                type="button"
                onClick={handleManualSave}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded cursor-pointer uppercase font-mono tracking-tight"
              >
                💾 {lang === "TR" ? "Versiyon Kaydet" : "Save Version"}
              </button>
            )}
          </div>

          {/* Note Versions History */}
          <div className="mt-4 border-t pt-3 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
              📜 {lang === "TR" ? "Not Revizyon Geçmişi" : "Notes Version History"}
            </span>

            <div className="max-h-[120px] overflow-y-auto space-y-1">
              {notes.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => {
                    setSelectedNoteVersion(n.version);
                    if (editableRef.current) {
                      editableRef.current.innerHTML = n.content;
                      setEditorContent(n.content);
                    }
                  }}
                  className={`p-2 border rounded flex items-center justify-between cursor-pointer transition-all ${
                    selectedNoteVersion === n.version 
                      ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500" 
                      : "border-slate-100 dark:border-zinc-800/80 bg-slate-50/20 dark:bg-black/10 hover:bg-slate-100/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">V{n.version}</span>
                    <span className="text-slate-500 font-mono text-[9px]">{n.timestamp}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">By: {n.author}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Attachments Area with Drag & Drop */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900/60 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-4">
          <span className="font-extrabold text-slate-800 dark:text-zinc-150 uppercase tracking-wide font-sans text-xs block">
            📎 {lang === "TR" ? "Saha Analiz Dokümanları" : "Attachments & Documents"}
          </span>

          {/* Configurable max size & Proposal associations */}
          <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-black/20 p-2 rounded-lg border border-slate-150 dark:border-zinc-800">
            <div>
              <label className="block text-slate-455 font-bold uppercase font-mono mb-1">Maks Dosya Boyutu (MB)</label>
              <input 
                type="number" 
                value={maxFileSize}
                min={1}
                max={100}
                onChange={(e) => setMaxFileSize(Number(e.target.value) || 10)}
                className="w-full p-1 bg-white dark:bg-zinc-800 border rounded font-mono outline-none text-center"
              />
            </div>

            <div>
              <label className="block text-slate-455 font-bold uppercase font-mono mb-1">Bağlı Teklif Versiyonu</label>
              <select
                value={associatedProposalId}
                onChange={(e) => setAssociatedProposalId(e.target.value)}
                className="w-full p-1 bg-white dark:bg-zinc-800 border rounded outline-none"
              >
                <option value="General">🏢 Opportunity (General)</option>
                {proposalsList.map(p => (
                  <option key={p.id} value={p.proposalNumber}>
                    Offer #{p.proposalNumber} ({p.currentVersion})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          {!readOnly && (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                dragActive 
                  ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10" 
                  : "border-slate-300 dark:border-zinc-700 hover:border-indigo-400 bg-slate-50/10 dark:bg-black/10"
              }`}
            >
              <input 
                type="file" 
                id="file-upload" 
                multiple 
                onChange={handleFileInputChange}
                className="hidden" 
              />
              <label htmlFor="file-upload" className="cursor-pointer space-y-2 block">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="font-bold text-slate-700 dark:text-zinc-300">
                  {lang === "TR" ? "Dosyaları sürükleyip bırakın veya göz atın" : "Drag & Drop files or browse"}
                </div>
                <div className="text-[10px] text-slate-450 font-sans font-medium">
                  {lang === "TR" ? "PDF, Excel, PowerPoint, Word, Görseller, ZIP (Maks " : "Supports PDF, Excel, PPT, Word, Images, ZIP (Max "} {maxFileSize}MB)
                </div>
              </label>
            </div>
          )}

          {/* List of Attachments */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
              📁 {lang === "TR" ? "Yüklenmiş Belgeler" : "Document Library"}
            </span>

            {attachments.length === 0 ? (
              <p className="text-[10px] text-slate-450 italic text-center py-2">
                {lang === "TR" ? "Yüklenmiş dosya bulunmamaktadır." : "No files attached."}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {attachments.map((att) => (
                  <div 
                    key={att.id}
                    className="p-2 border border-slate-150 dark:border-zinc-800 bg-white dark:bg-[#181817] rounded-lg flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded">
                        <File className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-750 dark:text-zinc-200 truncate block max-w-[150px]" title={att.name}>
                          {att.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-slate-400">
                          <span>{att.size}</span>
                          <span>•</span>
                          <span className="font-bold text-indigo-500">V{att.version}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setPreviewFile(att)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded transition-all cursor-pointer"
                        title="Preview File"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          alert(`💾 '${att.name}' indiriliyor (Simüle edildi). Boyut: ${att.size}`);
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded transition-all cursor-pointer"
                        title="Download File"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {!readOnly && (
                        <button
                          onClick={() => handleDeleteAttachment(att.id, att.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded transition-all cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* File Preview Modal overlay */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-150 text-sm flex items-center gap-1.5">
                <File className="text-indigo-600 w-4 h-4" />
                <span>🔍 Document Preview / Meta Info</span>
              </h3>
              <button onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-black/15 border rounded-lg text-center font-mono">
                <File className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <span className="font-bold text-xs text-slate-800 dark:text-zinc-100 block">{previewFile.name}</span>
                <span className="text-[10px] text-slate-450 block">Formatted Ext: .{previewFile.type}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-sans">
                <div className="p-2 bg-slate-50 dark:bg-black/10 rounded">
                  <span className="text-slate-450 block uppercase font-mono font-bold">Uploaded By</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{previewFile.uploadedBy}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-black/10 rounded">
                  <span className="text-slate-450 block uppercase font-mono font-bold">Uploaded At</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{previewFile.uploadedAt}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-black/10 rounded">
                  <span className="text-slate-450 block uppercase font-mono font-bold">Active Version</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">V{previewFile.version}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-black/10 rounded">
                  <span className="text-slate-450 block uppercase font-mono font-bold">File Size</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{previewFile.size}</span>
                </div>
              </div>

              {/* Document Version History */}
              {previewFile.versions && previewFile.versions.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Past Versions History Log:</span>
                  <div className="space-y-1 max-h-[80px] overflow-y-auto font-mono text-[9px]">
                    {previewFile.versions.map((pv, i) => (
                      <div key={i} className="p-1.5 border rounded bg-slate-50 dark:bg-black/15 flex items-center justify-between">
                        <span>Version V{pv.version} - {pv.size}</span>
                        <span className="text-slate-400">{pv.uploadedAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button 
                onClick={() => setPreviewFile(null)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-750 dark:text-zinc-200 rounded-lg text-xs font-bold"
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


// ========================================================
// 3. OFFICIAL PROPOSAL & CONTRACT TAB & PDF VIEWER
// ========================================================
interface ProposalContractProps {
  deal: Deal;
  onUpdateDeal: (updatedDeal: Deal) => void;
  lang: string;
  t: (key: string) => string;
  onNavigateToTab: (tab: string) => void;
  readOnly?: boolean;
}

export function ProposalContractSection({
  deal,
  onUpdateDeal,
  lang,
  t,
  onNavigateToTab,
  readOnly = false
}: ProposalContractProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>("");
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);

  // Revisions compare state
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareV1, setCompareV1] = useState<string>("");
  const [compareV2, setCompareV2] = useState<string>("");

  // Embedded PDF Viewer State
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfSearchQuery, setPdfSearchQuery] = useState("");
  const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);

  // New Revision Form States
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revNotes, setRevNotes] = useState("");
  const [revReason, setRevReason] = useState("");
  const [revDiscount, setRevDiscount] = useState(0);
  const [revAmount, setRevAmount] = useState(0);

  // Admin Recovery flag
  const [showDeletedProposals, setShowDeletedProposals] = useState(false);

  // Load associated proposals
  const loadProposals = () => {
    try {
      const parsed = CrmDb.getProposals();
      // Filter proposals associated with this deal
      let filtered = parsed.filter(p => 
        p.companyName && deal.companyName &&
        (p.companyName.toLowerCase().trim() === deal.companyName.toLowerCase().trim() || p.companyId === deal.companyId)
      );

      // Filter soft-deleted depending on Admin Recovery switch
      if (!showDeletedProposals) {
        filtered = filtered.filter(p => !(p as any).isDeleted);
      }

      setProposals(filtered);

      if (filtered.length > 0) {
        // Default to first active or match previous selected
        const stillExists = filtered.find(p => p.id === selectedProposalId);
        if (stillExists) {
          setActiveProposal(stillExists);
        } else {
          setActiveProposal(filtered[0]);
          setSelectedProposalId(filtered[0].id);
        }
      } else {
        setActiveProposal(null);
        setSelectedProposalId("");
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadProposals();
  }, [deal, showDeletedProposals]);

  const saveProposalsToStorage = (updatedList: Proposal[]) => {
    CrmDb.saveProposals(updatedList);
    // Reload state
    try {
      const parsed = CrmDb.getProposals();
      let filtered = parsed.filter(p => 
        p.companyName && deal.companyName &&
        (p.companyName.toLowerCase().trim() === deal.companyName.toLowerCase().trim() || p.companyId === deal.companyId)
      );
      if (!showDeletedProposals) {
        filtered = filtered.filter(p => !(p as any).isDeleted);
      }
      setProposals(filtered);
    } catch (_) {}
  };

  const handleSelectProposal = (id: string) => {
    setSelectedProposalId(id);
    const p = proposals.find(x => x.id === id);
    if (p) setActiveProposal(p);
  };

  // Navigates to Proposal Wizard preselected
  const handleOpenProposalWizard = () => {
    // Write pre-selected details for ServicesView Wizard
    CrmDb.setKv("crm_wizard_preselected_company", {
      id: deal.companyId || "comp-temp",
      companyName: deal.companyName,
      contactPerson: deal.contactPerson,
      contactEmail: deal.contactEmail || ""
    });

    if (onNavigateToTab) {
      onNavigateToTab("create-proposal");
    } else {
      window.dispatchEvent(new CustomEvent("change-tab", { detail: "create-proposal" }));
    }
  };

  // 1. View Embedded PDF
  const handleViewProposal = () => {
    setShowPdfViewer(true);
  };

  // 2. Download Real PDF
  const handleDownloadPDF = (prop: Proposal) => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      
      // Elegant Header
      doc.setFillColor("#0f172a");
      doc.rect(0, 0, 210, 8, "F");

      doc.setTextColor("#0f172a");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("GEMBA PARTNER OPERATIONAL EXCELLENCE B2B PORTAL", 15, 18);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor("#64748b");
      doc.text(`Official Proposal Documentation - Sync v10`, 15, 23);
      doc.line(15, 25, 195, 25);

      // Proposal Details
      doc.setTextColor("#1e293b");
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text(`PROPOSAL NUMBER: #${prop.proposalNumber}`, 15, 33);
      doc.text(`SUBJECT: ${prop.proposalSubject || "Lean Transformation"}`, 15, 39);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Prepared For: ${prop.companyName}`, 15, 47);
      doc.text(`Attention: ${prop.contactPerson} (${prop.contactEmail || "N/A"})`, 15, 52);
      doc.text(`Proposal Date: ${prop.date}`, 15, 57);
      doc.text(`Prepared By: ${prop.owner || "Gemba Partner Advisor"}`, 15, 62);
      doc.text(`Current Version: ${prop.currentVersion}`, 15, 67);

      // Service lines
      doc.setFont("Helvetica", "bold");
      doc.text(`SERVICES INCLUDED:`, 15, 75);
      doc.setFont("Helvetica", "normal");
      let y = 80;
      prop.services.forEach((s) => {
        doc.text(`- ${s}`, 20, y);
        y += 5;
      });

      // Pricing & totals
      y += 5;
      doc.setFont("Helvetica", "bold");
      doc.text(`FINANCIAL COMMERCIAL QUOTE:`, 15, y);
      doc.setFont("Helvetica", "normal");
      y += 5;
      doc.text(`Total Base Budget: ${prop.currency || "₺"}${prop.totalBudget.toLocaleString()}`, 20, y);
      y += 5;
      doc.text(`Discount Applied: ${prop.currency || "₺"}${(prop as any).discount || 0}`, 20, y);
      y += 5;
      doc.text(`Grand Total Amount (Inc Taxes): ${prop.currency || "₺"}${prop.grandTotal.toLocaleString()}`, 20, y);

      doc.save(`Proposal_${prop.proposalNumber}_${prop.currentVersion}.pdf`);

      // Add Audit
      const updated = addAuditLog(deal, lang === "TR" ? "Teklif PDF İndirildi" : "Proposal PDF Downloaded", prop.proposalNumber);
      onUpdateDeal(updated);
    } catch (err) {
      console.error(err);
      alert("Error generating PDF document download.");
    }
  };

  // 3. Create Proposal Revision
  const handleOpenRevisionModal = () => {
    if (!activeProposal) return;
    setRevNotes("");
    setRevReason("");
    setRevAmount(activeProposal.totalBudget);
    setRevDiscount(Number((activeProposal as any).discount || 0));
    setShowRevisionModal(true);
  };

  const handleSaveRevision = () => {
    if (!activeProposal) return;
    try {
      const savedList = CrmDb.getProposals();
      const propIdx = savedList.findIndex(p => p.id === activeProposal.id);
      
      if (propIdx > -1) {
        const propToUpdate = savedList[propIdx];
        const currentVerNum = parseInt(propToUpdate.currentVersion.replace("V", "")) || 1;
        const nextVerStr = `V${currentVerNum + 1}`;

        // Create new version object
        const newVerObj: ProposalVersion = {
          version: nextVerStr,
          date: new Date().toISOString(),
          reason: revReason || "Client revision scope request",
          changes: revNotes || "Pricing or discount adjusted.",
          owner: propToUpdate.owner,
          subject: propToUpdate.proposalSubject,
          currency: propToUpdate.currency,
          options: { ...propToUpdate.options },
          services: [...propToUpdate.services],
          totalBudget: revAmount,
          taxes: Math.round(revAmount * 0.2),
          grandTotal: Math.round(revAmount - revDiscount + (revAmount * 0.2))
        };

        // Update the main proposal object
        const nextProposal: Proposal = {
          ...propToUpdate,
          currentVersion: nextVerStr,
          totalBudget: revAmount,
          taxes: Math.round(revAmount * 0.2),
          grandTotal: Math.round(revAmount - revDiscount + (revAmount * 0.2)),
          status: "Revision Requested",
          versions: [...propToUpdate.versions, newVerObj],
          lastUpdate: new Date().toLocaleString()
        };
        (nextProposal as any).discount = revDiscount;

        savedList[propIdx] = nextProposal;
        saveProposalsToStorage(savedList);
        setActiveProposal(nextProposal);

        // Sync back to opportunity value!
        const nextDeal = {
          ...deal,
          opportunityValue: nextProposal.grandTotal,
          proposalNumber: nextProposal.proposalNumber
        };
        const logged = addAuditLog(
          nextDeal,
          lang === "TR" ? "Teklif Revizyonu Oluşturuldu" : "Proposal Revision Created",
          `V${currentVerNum}`,
          nextVerStr
        );
        onUpdateDeal(logged);
        setShowRevisionModal(false);
        alert(lang === "TR" ? "Yeni teklif revizyonu başarıyla tescil edildi!" : "Successfully created new proposal revision!");
      }
    } catch (_) {}
  };

  // 4. Duplicate Proposal
  const handleDuplicateProposal = (prop: Proposal) => {
    try {
      const savedList = CrmDb.getProposals();
      const nextSeq = savedList.length > 0 ? Math.max(...savedList.map((p) => p.sequenceNo)) + 1 : 101;
      
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const formattedNum = `${yy}${mm}-${nextSeq}`;

      const duplicated: Proposal = {
        ...prop,
        id: `prop-dup-${Date.now()}`,
        sequenceNo: nextSeq,
        proposalNumber: formattedNum,
        proposalSubject: `${prop.proposalSubject} (Duplicated)`,
        date: new Date().toLocaleDateString("tr-TR"),
        lastUpdate: new Date().toLocaleString(),
        status: "Draft"
      };

      const newList = [duplicated, ...savedList];
      saveProposalsToStorage(newList);
      loadProposals();

      const logged = addAuditLog(
        deal,
        lang === "TR" ? "Teklif Çoğaltıldı" : "Proposal Duplicated",
        prop.proposalNumber,
        formattedNum
      );
      onUpdateDeal(logged);
      alert(lang === "TR" ? "Teklif başarıyla kopyalandı!" : "Proposal duplicated successfully!");
    } catch (_) {}
  };

  // 5. Delete Proposal (SOFT DELETE)
  const handleDeleteProposal = (prop: Proposal) => {
    const msg = lang === "TR" 
      ? `Bu teklifi silmek istediğinizden emin misiniz?\nTeklif No: #${prop.proposalNumber}\n(Bu işlem soft-delete kurallarına göre yapılacak olup, yönetici tarafından kurtarılabilir.)`
      : `Are you sure you want to soft-delete this proposal?\nProposal No: #${prop.proposalNumber}\n(Admins will be able to recover this proposal.)`;
    if (window.confirm(msg)) {
      try {
        const savedList = CrmDb.getProposals();
        const updated = savedList.map(p => {
          if (p.id === prop.id) {
            return { ...p, isDeleted: true };
          }
          return p;
        });

        saveProposalsToStorage(updated);
        loadProposals();

        const logged = addAuditLog(
          deal,
          lang === "TR" ? "Teklif Silindi (Soft-Delete)" : "Proposal Soft-Deleted",
          prop.proposalNumber,
          undefined
        );
        onUpdateDeal(logged);
        alert(lang === "TR" ? "Teklif silindi (Kurtarılabilir Arşive Atıldı)." : "Proposal soft-deleted successfully.");
      } catch (_) {}
    }
  };

  // Recover proposal (Admin Only feature)
  const handleRecoverProposal = (propId: string) => {
    try {
      const savedList = CrmDb.getProposals();
      const updated = savedList.map(p => {
        if (p.id === propId) {
          return { ...p, isDeleted: false };
        }
        return p;
      });

      saveProposalsToStorage(updated);
      loadProposals();

      const logged = addAuditLog(
        deal,
        lang === "TR" ? "Teklif Geri Yüklendi" : "Proposal Recovered / Un-deleted",
        propId,
        undefined
      );
      onUpdateDeal(logged);
      alert(lang === "TR" ? "Teklif başarıyla geri yüklendi!" : "Proposal successfully recovered!");
    } catch (_) {}
  };

  // 6. Send Email Dispatch
  const handleSendEmail = () => {
    if (!activeProposal) return;
    const body = lang === "TR"
      ? `Sayın Yetkili,\n\nTalep ettiğiniz #${activeProposal.proposalNumber} nolu operasyonel gelişim teklifi hazır durumdadır.\n\nİncelemek için aşağıdaki bağlantıyı tıklayabilir veya ekli belgeyi indirebilirsiniz.\n\nGemba Partner Danışmanlık A.Ş.`
      : `Dear Representative,\n\nPlease find attached the official proposal #${activeProposal.proposalNumber} for your operational excellence program review.\n\nBest regards,\nGemba Partner`;
    
    // Simulate email send
    const logged = addAuditLog(
      deal,
      lang === "TR" ? "Teklif E-postası Gönderildi" : "Proposal Email Dispatched",
      undefined,
      activeProposal.proposalNumber
    );
    onUpdateDeal(logged);
    alert(lang === "TR" ? `Teklif e-postası başarıyla gönderildi!\nAlıcı: ${deal.contactEmail}` : `Proposal dispatched to ${deal.contactEmail} successfully!`);
  };

  // 7. Share Link
  const handleShareLink = () => {
    if (!activeProposal) return;
    const url = `https://gemba-partner.com/shared/proposal/${activeProposal.id}`;
    navigator.clipboard.writeText(url);
    alert(lang === "TR" ? "Paylaşım linki kopyalandı!" : "Shareable link copied to clipboard!");
    const logged = addAuditLog(deal, lang === "TR" ? "Teklif Linki Paylaşıldı" : "Proposal Link Shared", undefined, url);
    onUpdateDeal(logged);
  };

  // 8. Convert to Contract
  const handleConvertToContract = () => {
    if (!activeProposal) return;
    const msg = lang === "TR"
      ? "Bu teklifi resmi sözleşmeye dönüştürmek, fırsat aşamasını 'Kazanıldı' olarak güncellemek istiyor musunuz?"
      : "Convert this proposal to an official contract and update Opportunity Stage to 'Won'?";
    if (window.confirm(msg)) {
      const nextDeal = {
        ...deal,
        stage: "Won",
        opportunityValue: activeProposal.grandTotal,
        contractPm: deal.contactPerson,
        contractPmTc: "10000000000",
        contractSubject: activeProposal.proposalSubject,
        contractDate: new Date().toISOString().split("T")[0]
      };
      
      // Update proposal status
      try {
        const savedList = CrmDb.getProposals();
        const updated = savedList.map(p => {
          if (p.id === activeProposal.id) {
            return { ...p, status: "Accepted" as any };
          }
          return p;
        });
        saveProposalsToStorage(updated);
        loadProposals();
      } catch (_) {}

      const logged = addAuditLog(
        nextDeal,
        lang === "TR" ? "Sözleşmeye Dönüştürüldü (Kazanıldı)" : "Converted to Contract (Opportunity Won)",
        activeProposal.proposalNumber,
        "Won"
      );
      onUpdateDeal(logged);
      alert(lang === "TR" ? "Tebrikler! Fırsat Kazanıldı (Won) sütununa çekildi ve sözleşme akdedildi." : "Congratulations! Opportunity converted to contract and set to 'Won'.");
    }
  };

  const handleCompareVersions = () => {
    if (!activeProposal || activeProposal.versions.length < 2) {
      alert(lang === "TR" ? "Karşılaştırma için en az 2 versiyon olması gerekmektedir." : "At least 2 versions are required to compare.");
      return;
    }
    setCompareV1(activeProposal.versions[0].version);
    setCompareV2(activeProposal.versions[activeProposal.versions.length - 1].version);
    setShowCompareModal(true);
  };

  // Case 1: No official proposal has been created
  if (proposals.length === 0 && !showDeletedProposals) {
    return (
      <div className="space-y-5 animate-in fade-in duration-100 py-6 text-center text-xs">
        <div className="max-w-md mx-auto p-6 bg-slate-50 dark:bg-black/15 border border-dashed border-slate-250 dark:border-zinc-800 rounded-xl space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-150">
            {lang === "TR" ? "Sistemde Kayıtlı Resmi Teklif Bulunamadı" : "No Official Proposal Created"}
          </h4>
          <p className="text-slate-500 leading-relaxed text-[11px]">
            {lang === "TR" 
              ? "Bu fırsata ait herhangi bir resmi teklif belgesi veya revizyonu tescil edilmemiştir. Aşağıdaki butonu kullanarak doğrudan teklif oluşturma sihirbazına geçebilirsiniz."
              : "No official proposal or revision exists for this customer opportunity yet. Launch the wizard below to pre-fill opportunity details and generate one."}
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <button 
              type="button" 
              onClick={handleOpenProposalWizard}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === "TR" ? "Teklif Sihirbazını Aç" : "Open Proposal Wizard"}</span>
            </button>

            {/* Admin recover toggle */}
            <button
              onClick={() => setShowDeletedProposals(true)}
              className="text-[10px] text-slate-400 hover:text-indigo-500 hover:underline mt-2"
            >
              ⚙️ {lang === "TR" ? "Silinen Teklifleri Ara / Yönetici Geri Yükleme" : "Show Deleted Proposals (Admin Recovery)"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Proposal exists
  return (
    <div className="space-y-6 animate-in fade-in duration-100 text-xs">
      
      {/* Selector of multiple proposals or versions */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-black/15 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 gap-4">
        <div className="flex items-center gap-2 flex-1">
          <label className="font-bold text-slate-500 font-mono tracking-wide uppercase">
            {lang === "TR" ? "Teklif Seçin:" : "Select Offer:"}
          </label>
          <select
            value={selectedProposalId}
            onChange={(e) => handleSelectProposal(e.target.value)}
            className="p-1.5 bg-white dark:bg-zinc-850 border border-slate-250 dark:border-zinc-750 rounded text-xs text-slate-800 dark:text-zinc-200 outline-none flex-1 max-w-[280px]"
          >
            {proposals.map(p => (
              <option key={p.id} value={p.id}>
                #{p.proposalNumber} - {p.proposalSubject} { (p as any).isDeleted ? "🗑️ [Silindi]" : "" }
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Mode toggle */}
          <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer font-mono font-bold select-none">
            <input 
              type="checkbox" 
              checked={showDeletedProposals} 
              onChange={(e) => setShowDeletedProposals(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span>{lang === "TR" ? "Arşiv (Admin)" : "Archived Logs"}</span>
          </label>

          <button
            onClick={handleOpenProposalWizard}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === "TR" ? "Yeni Sihirbaz" : "New Wizard"}</span>
          </button>
        </div>
      </div>

      {activeProposal && (
        <div className="space-y-5">
          
          {/* Recovery warning if proposal is soft-deleted */}
          {(activeProposal as any).isDeleted && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg flex items-center justify-between font-bold">
              <span>🗑️ {lang === "TR" ? "Bu teklif soft-delete silinmiştir." : "This proposal has been soft-deleted."}</span>
              <button 
                onClick={() => handleRecoverProposal(activeProposal.id)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
              >
                <Undo className="w-3 h-3" />
                <span>{lang === "TR" ? "Geri Yükle" : "Recover / Un-delete"}</span>
              </button>
            </div>
          )}

          {/* Proposal Card Structure */}
          <div className="bg-slate-50 dark:bg-black/15 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-4">
            
            {/* Row 1: Number & Status Badges */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-zinc-150 text-sm">
                    {activeProposal.proposalSubject}
                  </h4>
                  <span className="font-mono text-[9px] text-slate-400 font-bold">
                    Offer Number: #{activeProposal.proposalNumber}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 font-mono">
                {/* Active version tag */}
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 rounded text-[9px] font-extrabold">
                  {activeProposal.currentVersion}
                </span>

                {/* Status tag */}
                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                  activeProposal.status === "Accepted"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : activeProposal.status === "Rejected"
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }`}>
                  {activeProposal.status}
                </span>
              </div>
            </div>

            {/* Row 2: Grid of Key Meta fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide font-mono">Customer Name</span>
                <span className="font-semibold text-slate-750 dark:text-zinc-200">{activeProposal.companyName}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide font-mono">Contact Person</span>
                <span className="font-semibold text-slate-750 dark:text-zinc-200">{activeProposal.contactPerson}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide font-mono">Proposal Date</span>
                <span className="font-semibold text-slate-750 dark:text-zinc-200">{activeProposal.date}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide font-mono">Valid Until</span>
                <span className="font-semibold text-slate-750 dark:text-zinc-200">
                  { (activeProposal as any).validUntil || new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("tr-TR") }
                </span>
              </div>
              
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide font-mono">Total Amount</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {activeProposal.currency || "₺"}{activeProposal.grandTotal.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide font-mono">Discount Applied</span>
                <span className="font-semibold text-slate-750 dark:text-zinc-200">
                  {activeProposal.currency || "₺"}{ ((activeProposal as any).discount || 0).toLocaleString() }
                </span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide font-mono">Prepared By</span>
                <span className="font-semibold text-slate-750 dark:text-zinc-200">{activeProposal.owner}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide font-mono">Approval Status</span>
                <span className="font-semibold text-amber-600 font-bold">Pending Approval</span>
              </div>
            </div>

            {/* Row 3: Services / scope details (automatically synchronized) */}
            <div className="border-t border-dashed border-slate-200 dark:border-zinc-800 pt-3 space-y-2">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide font-mono">Scope of Services included:</span>
              <div className="flex flex-wrap gap-1">
                {activeProposal.services.map((srv, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-md font-semibold flex items-center gap-1 text-[10.5px]">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>{srv}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Row 4: Interactive Proposal Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 dark:border-zinc-800 pt-3">
              <button
                onClick={handleViewProposal}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 text-[10.5px] uppercase"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{lang === "TR" ? "Teklifi İncele (Embedded)" : "View Proposal"}</span>
              </button>

              <button
                onClick={() => handleDownloadPDF(activeProposal)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 text-[10.5px] uppercase"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === "TR" ? "PDF İndir" : "Download PDF"}</span>
              </button>

              {!readOnly && (
                <>
                  <button
                    onClick={handleOpenRevisionModal}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 text-[10.5px] uppercase"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{lang === "TR" ? "Revizyon Oluştur" : "Create Revision"}</span>
                  </button>

                  <button
                    onClick={() => handleDuplicateProposal(activeProposal)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 text-[10.5px] uppercase"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === "TR" ? "Çoğalt" : "Duplicate"}</span>
                  </button>

                  <button
                    onClick={handleConvertToContract}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 text-[10.5px] uppercase"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>{lang === "TR" ? "Sözleşmeye Dönüştür" : "Convert to Contract"}</span>
                  </button>

                  <button
                    onClick={handleSendEmail}
                    className="p-1.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg cursor-pointer"
                    title="Send by Email"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                onClick={handleShareLink}
                className="p-1.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg cursor-pointer"
                title="Shareable Public Link"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              {!readOnly && !(activeProposal as any).isDeleted && (
                <button
                  onClick={() => handleDeleteProposal(activeProposal)}
                  className="p-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer ml-auto"
                  title="Soft Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

          {/* Revisions History Timeline & Version Comparison */}
          {activeProposal.versions && activeProposal.versions.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/40 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 dark:text-zinc-150 uppercase tracking-wide font-sans">
                  📜 {lang === "TR" ? "Teklif Sürüm Ağacı & Karşılaştırma" : "Proposal Version Management"}
                </span>

                {activeProposal.versions.length >= 2 && (
                  <button
                    onClick={handleCompareVersions}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline"
                  >
                    👉 {lang === "TR" ? "Sürümleri Karşılaştır" : "Compare Versions"}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {activeProposal.versions.map((ver, vIdx) => (
                  <div 
                    key={vIdx}
                    className="p-2.5 border border-slate-100 dark:border-zinc-800/80 bg-slate-50/10 dark:bg-black/10 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-sans">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-[11px] bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {ver.version}
                        </span>
                        <span className="font-bold text-slate-750 dark:text-zinc-200">{ver.subject}</span>
                      </div>
                      <p className="text-[10.5px] italic text-slate-500 font-sans">
                        <strong>Reason:</strong> {ver.reason} | <strong>Changes:</strong> {ver.changes}
                      </p>
                    </div>

                    <div className="text-right text-[10px] font-mono text-slate-400 shrink-0 space-y-0.5">
                      <span className="block font-bold text-slate-800 dark:text-zinc-100">
                        {activeProposal.currency || "₺"}{ver.grandTotal.toLocaleString()}
                      </span>
                      <span className="block">{new Date(ver.date).toLocaleDateString("tr-TR")} | By: {ver.owner || "GP"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail for the specific opportunity/proposal */}
          <div className="bg-white dark:bg-zinc-900/40 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
            <span className="font-extrabold text-slate-800 dark:text-zinc-150 uppercase tracking-wide font-sans block">
              📊 {lang === "TR" ? "Denetim İzi & İzlenebilirlik (Audit Trail)" : "Audit Trail & Full Traceability"}
            </span>

            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {((deal as any).auditTrail || []).map((log: AuditLogEntry) => (
                <div 
                  key={log.id} 
                  className="p-2 border border-slate-100 dark:border-zinc-805/40 bg-slate-50/20 dark:bg-black/15 rounded-lg flex items-start justify-between gap-3 text-[10.5px] font-sans"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1 rounded font-mono text-[9.5px]">
                        {log.action}
                      </span>
                      <span className="text-slate-450 font-mono text-[9px]">{log.date} {log.time}</span>
                    </div>

                    {log.previousValue !== undefined && (
                      <p className="text-[10px] text-slate-500">
                        <span className="font-bold font-mono">Prev:</span> <span className="line-through">{log.previousValue}</span> 
                        {log.newValue !== undefined && <> → <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">New:</span> {log.newValue}</>}
                      </p>
                    )}
                  </div>

                  <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1 rounded shrink-0">
                    User: {log.user}
                  </span>
                </div>
              ))}

              {(!(deal as any).auditTrail || (deal as any).auditTrail.length === 0) && (
                <p className="text-[10px] text-slate-450 italic text-center py-2">
                  No automated audit traces captured yet.
                </p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Embedded Premium PDF Viewer Drawer overlay */}
      {showPdfViewer && activeProposal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-[#1e1e1e] h-[90vh] shadow-2xl flex flex-col rounded-xl overflow-hidden border border-zinc-800 animate-in zoom-in-95 duration-100">
            
            {/* Viewer Toolbar Header */}
            <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="font-extrabold text-xs font-sans tracking-wide">
                  GEMBA PROPOSAL VIEWER - VERSION {activeProposal.currentVersion}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Search query input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                  <input 
                    type="text" 
                    placeholder="Search query..."
                    value={pdfSearchQuery}
                    onChange={(e) => setPdfSearchQuery(e.target.value)}
                    className="p-1 pl-8 bg-zinc-800 border border-zinc-700 text-xs text-white rounded outline-none w-36 font-sans focus:border-indigo-500"
                  />
                </div>

                {/* Zoom tools */}
                <div className="flex items-center gap-1.5 bg-zinc-800 p-0.5 rounded border border-zinc-700">
                  <button onClick={() => setPdfZoom(prev => Math.max(50, prev - 10))} className="p-1 hover:bg-zinc-700 rounded text-zinc-300">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono px-1 select-none">{pdfZoom}%</span>
                  <button onClick={() => setPdfZoom(prev => Math.min(200, prev + 10))} className="p-1 hover:bg-zinc-700 rounded text-zinc-300">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Print button */}
                <button 
                  onClick={() => window.print()}
                  className="p-1.5 hover:bg-zinc-800 rounded text-zinc-300 border border-zinc-700" 
                  title="Print proposal"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                {/* Download PDF button */}
                <button 
                  onClick={() => handleDownloadPDF(activeProposal)}
                  className="p-1.5 hover:bg-zinc-800 rounded text-zinc-300 border border-zinc-700" 
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Full Screen toggle */}
                <button 
                  onClick={() => setIsPdfFullScreen(!isPdfFullScreen)}
                  className="p-1.5 hover:bg-zinc-800 rounded text-zinc-300 border border-zinc-700" 
                  title="Toggle Full Screen"
                >
                  {isPdfFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                {/* Close */}
                <button 
                  onClick={() => {
                    setShowPdfViewer(false);
                    setIsPdfFullScreen(false);
                  }}
                  className="p-1 bg-rose-600 hover:bg-rose-700 rounded cursor-pointer"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Scrollable Virtual Canvas Paper */}
            <div className="flex-1 bg-zinc-850 overflow-auto p-8 flex justify-center items-start">
              <div 
                style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center" }}
                className="w-[210mm] min-h-[297mm] bg-white p-12 shadow-2xl rounded border border-zinc-200 text-zinc-850 font-sans flex flex-col justify-between transition-all"
              >
                {/* Interactive proposal print preview container */}
                <div>
                  {/* Watermark letterhead */}
                  <div className="border-b-2 border-zinc-800 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black tracking-tight text-zinc-900 font-sans">GEMBA PARTNER OPERATIONAL EXCELLENCE A.S.</h2>
                      <p className="text-[9px] text-zinc-500 uppercase font-mono font-bold">B2B CRM Enterprise Solutions Proposal Layout</p>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">Page 1 of 1</span>
                  </div>

                  <div className="mt-8 space-y-6">
                    <div className="text-center">
                      <h1 className="text-xl font-black text-zinc-950 uppercase font-sans tracking-tight">
                        {highlightText(activeProposal.proposalSubject || "Lean Operations Alignment", pdfSearchQuery)}
                      </h1>
                      <p className="text-[10px] text-zinc-400 font-mono mt-1">PROPOSAL REFERENCE: #{activeProposal.proposalNumber}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-zinc-100">
                      <div>
                        <span className="block text-[8px] uppercase font-mono font-bold text-zinc-400">Prepared For:</span>
                        <span className="font-extrabold text-zinc-800">{highlightText(activeProposal.companyName, pdfSearchQuery)}</span>
                        <span className="block text-zinc-500 mt-1">Attn: {highlightText(activeProposal.contactPerson, pdfSearchQuery)}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] uppercase font-mono font-bold text-zinc-400">Date & Validity:</span>
                        <span className="font-semibold text-zinc-800 block">Date: {activeProposal.date}</span>
                        <span className="font-semibold text-zinc-600 block">Valid Until: { (activeProposal as any).validUntil || "Next 30 Days" }</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-zinc-100">
                      <h3 className="text-xs font-bold uppercase tracking-wide font-mono text-zinc-500">1. Operational Focus & Scope:</h3>
                      <p className="text-[11px] leading-relaxed text-zinc-650 italic">
                        {lang === "TR" 
                          ? "İşbu teklif müşterimizin üretim katında saptanan israf katmanlarını minimize etmeyi, süreç standartizasyonunu güçlendirerek verimlilik çıktılarını yukarı taşımayı amaçlamaktadır."
                          : "This program aims to dismantle process silos, highlight core TIMWOODS wastes, and deploy standardized cellular practices for resilient productivity."}
                      </p>
                    </div>

                    <div className="space-y-3 pt-4">
                      <h3 className="text-xs font-bold uppercase tracking-wide font-mono text-zinc-500">2. Services & Engineering Catalogs Included:</h3>
                      <table className="w-full text-left border-collapse border border-zinc-200 text-xs">
                        <thead>
                          <tr className="bg-zinc-100 border-b border-zinc-200 font-bold text-zinc-700">
                            <th className="p-2">Service Catalog / Training Package</th>
                            <th className="p-2 text-right">Standard Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeProposal.services.map((srv, sIdx) => (
                            <tr key={sIdx} className="border-b border-zinc-150 text-zinc-650">
                              <td className="p-2 font-semibold">{highlightText(srv, pdfSearchQuery)}</td>
                              <td className="p-2 text-right font-mono">Included in package</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-2 pt-6 border-t border-zinc-200">
                      <h3 className="text-xs font-bold uppercase tracking-wide font-mono text-zinc-500">3. Commercial Terms & Values:</h3>
                      <div className="bg-zinc-50 p-4 rounded-lg space-y-2.5 font-sans">
                        <div className="flex justify-between text-xs text-zinc-600">
                          <span>Base Proposal Budget:</span>
                          <span className="font-mono font-semibold">{activeProposal.currency || "₺"}{activeProposal.totalBudget.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-zinc-600">
                          <span>Discount Applied:</span>
                          <span className="font-mono font-semibold">-{activeProposal.currency || "₺"}{ ((activeProposal as any).discount || 0).toLocaleString() }</span>
                        </div>
                        <div className="flex justify-between text-xs text-zinc-600">
                          <span>Taxes (VAT 20%):</span>
                          <span className="font-mono font-semibold">{activeProposal.currency || "₺"}{activeProposal.taxes.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-zinc-900 border-t pt-2.5">
                          <span>GRAND TOTAL DUE AMOUNT:</span>
                          <span className="font-mono">{activeProposal.currency || "₺"}{activeProposal.grandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer signatures */}
                <div className="border-t border-zinc-200 pt-8 mt-12 grid grid-cols-2 text-[10px] text-zinc-400">
                  <div className="space-y-4">
                    <span>Authorized Gemba Partner Representative</span>
                    <div className="pt-8 border-t border-dashed max-w-[150px]">
                      <span className="font-bold text-zinc-800">{activeProposal.owner}</span>
                      <p className="text-[9px]">Sales Director</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-right">
                    <span>Client Authorization & Signature</span>
                    <div className="pt-8 border-t border-dashed max-w-[150px] ml-auto">
                      <span className="font-bold text-zinc-800">{activeProposal.contactPerson}</span>
                      <p className="text-[9px]">Decision Maker</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Comparison Modal Popup */}
      {showCompareModal && activeProposal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-150 text-sm flex items-center gap-1.5 font-sans">
                <FileSignature className="text-indigo-600 w-4 h-4" />
                <span>📊 Proposal Version Side-by-Side Comparison</span>
              </h3>
              <button onClick={() => setShowCompareModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 grid grid-cols-2 gap-4 text-xs font-sans">
              <div className="p-3 bg-slate-50 dark:bg-black/15 rounded-lg border">
                <span className="block font-bold text-indigo-600 text-xs mb-1">Version A ({compareV1 || "V1"})</span>
                {(() => {
                  const ver = activeProposal.versions.find(v => v.version === compareV1) || activeProposal.versions[0];
                  if (!ver) return null;
                  return (
                    <div className="space-y-2">
                      <p><strong>Subject:</strong> {ver.subject}</p>
                      <p><strong>Grand Total:</strong> {activeProposal.currency || "₺"}{ver.grandTotal.toLocaleString()}</p>
                      <p><strong>Services Included:</strong></p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                        {ver.services.map((s, idx) => <li key={idx}>{s}</li>)}
                      </ul>
                      <p><strong>Revision Notes:</strong> {ver.changes}</p>
                    </div>
                  );
                })()}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-black/15 rounded-lg border">
                <span className="block font-bold text-emerald-600 text-xs mb-1">Version B ({compareV2 || "V2"})</span>
                {(() => {
                  const ver = activeProposal.versions.find(v => v.version === compareV2) || activeProposal.versions[activeProposal.versions.length - 1];
                  if (!ver) return null;
                  return (
                    <div className="space-y-2">
                      <p><strong>Subject:</strong> {ver.subject}</p>
                      <p><strong>Grand Total:</strong> {activeProposal.currency || "₺"}{ver.grandTotal.toLocaleString()}</p>
                      <p><strong>Services Included:</strong></p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                        {ver.services.map((s, idx) => <li key={idx}>{s}</li>)}
                      </ul>
                      <p><strong>Revision Notes:</strong> {ver.changes}</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button 
                onClick={() => setShowCompareModal(false)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-750 dark:text-zinc-200 rounded-lg text-xs font-bold"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Modal Popup */}
      {showRevisionModal && activeProposal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-150 text-sm flex items-center gap-1.5 font-sans">
                <Edit2 className="text-indigo-600 w-4 h-4" />
                <span>📝 Create Proposal Revision ({activeProposal.currentVersion} → V{(parseInt(activeProposal.currentVersion.replace("V", "")) || 1) + 1})</span>
              </h3>
              <button onClick={() => setShowRevisionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 font-sans text-xs">
              <div>
                <label className="block text-slate-455 uppercase font-mono font-bold mb-1">Revision Reason *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Scope alignment, rate adjustment"
                  value={revReason}
                  onChange={(e) => setRevReason(e.target.value)}
                  className="w-full p-2 border dark:bg-zinc-850 dark:border-zinc-700 rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-455 uppercase font-mono font-bold mb-1">Revision Notes & Scope Changes *</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Describe what has changed in this revision..."
                  value={revNotes}
                  onChange={(e) => setRevNotes(e.target.value)}
                  className="w-full p-2 border dark:bg-zinc-850 dark:border-zinc-700 rounded outline-none h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-455 uppercase font-mono font-bold mb-1">Base Budget Amount</label>
                  <input 
                    type="number" 
                    value={revAmount}
                    onChange={(e) => setRevAmount(Number(e.target.value) || 0)}
                    className="w-full p-2 border dark:bg-zinc-850 dark:border-zinc-700 rounded outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-455 uppercase font-mono font-bold mb-1">Discount Amount</label>
                  <input 
                    type="number" 
                    value={revDiscount}
                    onChange={(e) => setRevDiscount(Number(e.target.value) || 0)}
                    className="w-full p-2 border dark:bg-zinc-850 dark:border-zinc-700 rounded outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3 text-xs font-bold">
              <button 
                onClick={() => setShowRevisionModal(false)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-750 dark:text-zinc-200 rounded-lg"
              >
                {t("İptal")}
              </button>
              <button 
                onClick={handleSaveRevision}
                disabled={!revReason.trim() || !revNotes.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                Create Revision Leaf
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Simple highlighter helper function
function highlightText(text: string, query: string) {
  if (!query || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-600/60 dark:text-white px-0.5 rounded">{part}</mark> 
          : part
      )}
    </>
  );
}
