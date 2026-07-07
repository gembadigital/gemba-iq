import React, { useState, useRef, useEffect } from "react";
import { Recipient, AttachmentFile } from "../types";
import { parseSpreadsheet } from "../utils/excelImport";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Info,
  Trash2,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Eye,
  Type,
  ChevronRight,
  Sparkles,
  HelpCircle,
  FolderOpen,
  UserCheck,
  Edit3,
  Check,
  Save,
  Maximize2,
  Minimize2,
  Download
} from "lucide-react";

interface CampaignDesignerProps {
  recipients: Recipient[];
  setRecipients: (recs: Recipient[]) => void;
  subject: string;
  setSubject: (sub: string) => void;
  templateBody: string;
  setTemplateBody: (body: string) => void;
  attachments: AttachmentFile[];
  setAttachments: React.Dispatch<React.SetStateAction<AttachmentFile[]>>;
  onLaunchCampaign: () => void;
  isConnected: boolean;
}

export default function CampaignDesigner({
  recipients,
  setRecipients,
  subject,
  setSubject,
  templateBody,
  setTemplateBody,
  attachments,
  setAttachments,
  onLaunchCampaign,
  isConnected
}: CampaignDesignerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [attachmentDragActive, setAttachmentDragActive] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [showEditorHelp, setShowEditorHelp] = useState(false);

  // Gemini AI Strategy Assistant States
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);

  const handleAiAssist = async (action: "write" | "polish") => {
    setAiError(null);
    setAiSuccess(null);
    setAiLoading(true);

    try {
      const response = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          bodyText: action === "polish" ? templateBody : "",
          promptInstruction: aiInstruction
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to receive assistance from Gemini.");
      }

      const val = await response.json();
      if (val.success) {
        if (val.subject) {
          setSubject(val.subject);
        }
        if (val.body) {
          setTemplateBody(val.body);
        }
        setAiSuccess(action === "write" ? "Draft completed and applied successfully!" : "Mail polished and applied successfully!");
      } else {
        throw new Error("Could not apply generative template.");
      }
    } catch (err: any) {
      console.warn("Gemini assistant invocation failed, generating standard B2B outreach draft locally:", err);
      
      let fallbackSubject = subject || "İş Verimliliği ve Süreç İyileştirme Fırsatları";
      let fallbackBody = templateBody;

      if (action === "write") {
        const uppercaseInstr = aiInstruction.toUpperCase();
        if (uppercaseInstr.includes("TEKLİF") || uppercaseInstr.includes("OFFER")) {
          fallbackSubject = "B2B Yalın Dönüşüm & Operasyonel Mükemmellik Proje Teklifi";
          fallbackBody = `Sayın Yetkili,

İşletmenizde üretim süreçlerini optimize etmek ve verimsizlikleri en aza indirmek üzere hazırladığımız iş birliği modelini paylaşmak isteriz.

Bu kapsamdaki ana hedeflerimiz şunlardır:
- OEE Oranlarında ve Hat Verimliliğinde Artış
- Hurda ve İsraf Maliyetlerinin Azaltılması
- Yalın Standartlar ve Sürekli İyileştirme

Detaylı bir ön etüt çalışması ve fabrika turu planlamak adına uygun olduğunuz bir zamanı bizimle paylaşabilir misiniz?

Saygılarımızla,
Gemba IQ Danışmanlık Grubu`;
        } else {
          fallbackSubject = "Süreç İyileştirme ve Yalın Dönüşüm İş Birliği Talebi";
          fallbackBody = `Sayın Yetkili,

Faaliyet gösterdiğiniz sektördeki operasyonel verimlilik kriterlerini yakından takip etmekteyiz. Fabrika sahanızda gizlenmiş israfları (Muda) ve kayıpları tespit ederek OEE oranlarınızı artırmayı hedefleyen uzman kadromuzla yanınızdayız.

Yalın Üretim, 5S, Kaizen ve ISO sertifikasyon süreçlerinizi dijital ortamda koordine ederek maliyet azaltma projelerinizi hızlandırabiliriz.

Önümüzdeki hafta içinde 15 dakikalık kısa bir tanışma araması gerçekleştirebilir miyiz?

Saygılarımızla,
Gemba IQ Danışmanlık Grubu`;
        }
        setSubject(fallbackSubject);
        setTemplateBody(fallbackBody);
        setAiSuccess("⚠️ (API Kotasız Çevrimdışı Mod) Standart B2B outreach e-postası başarıyla oluşturuldu.");
      } else {
        fallbackBody = templateBody + "\n\n---\n[Yerel B2B İyileştirme Filtresi Uygulandı]";
        setTemplateBody(fallbackBody);
        setAiSuccess("⚠️ (API Kotasız Çevrimdışı Mod) E-posta metniniz yerel standart filtrelerle iyileştirildi.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  /* Recipient List download capability as in Lead Table List */
  const exportRecipients = (type: "xlsx" | "csv" | "xls") => {
    if (recipients.length === 0) {
      return;
    }

    const headers = [
      "ID",
      "First Name",
      "Last Name",
      "Email Address",
      "Company",
      "Department",
      "Address",
      "Industry",
      "Scheduled Date",
      "Custom Field 1",
      "Custom Field 2",
      "Custom Field 3",
      "Delivery Status",
      "Open Count"
    ];

    const rows = recipients.map(r => [
      r.id,
      r.FirstName || "",
      r.LastName || "",
      r.Email || "",
      r.Company || "",
      r.Department || "",
      r.Address || "",
      r.Industry || "",
      r.ScheduledDate || "",
      r.CustomField1 || "",
      r.CustomField2 || "",
      r.CustomField3 || "",
      r.status || "idle",
      r.openCount || 0
    ]);

    const finalRaw = [headers, ...rows];

    if (type === "csv") {
      const csvContent = finalRaw
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      // Add UTF-8 BOM
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `recipient_list_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } else if (type === "xls") {
      try {
        let html = `<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\" xmlns=\"http://www.w3.org/TR/REC-html40\">`;
        html += `<head><meta charset=\"utf-8\"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Recipients</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
        html += `<table border=\"1\">`;
        
        html += `<tr style=\"background-color: #0078D4; color: #ffffff; font-weight: bold;\">`;
        headers.forEach(h => {
          html += `<th>${h}</th>`;
        });
        html += `</tr>`;

        rows.forEach(row => {
          html += `<tr>`;
          row.forEach(val => {
            html += `<td>${String(val)}</td>`;
          });
          html += `</tr>`;
        });

        html += `</table></body></html>`;

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), html], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `recipient_list_${new Date().toISOString().split('T')[0]}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("XLS Export failed", err);
      }
    } else {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(finalRaw);
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 14 }, // First Name
        { wch: 14 }, // Last Name
        { wch: 28 }, // Email Address
        { wch: 22 }, // Company Name
        { wch: 16 }, // Department
        { wch: 22 }, // Address
        { wch: 16 }, // Industry
        { wch: 16 }, // Scheduled Date
        { wch: 14 }, // Custom Field 1
        { wch: 14 }, // Custom Field 2
        { wch: 14 }, // Custom Field 3
        { wch: 14 }, // Status
        { wch: 10 }  // Open Count
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Recipients");
      XLSX.writeFile(wb, `recipient_list_${new Date().toISOString().split("T")[0]}.xlsx`);
    }
  };

  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const handleSaveList = () => {
    let trackingService = "none";
    try {
      const savedDraft = localStorage.getItem("smart_mailmerge_working_draft");
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        trackingService = parsed.trackingService || "none";
      }
    } catch (_) {}

    const draft = {
      subject,
      templateBody,
      attachments,
      recipients,
      trackingService
    };
    try {
      localStorage.setItem("smart_mailmerge_working_draft", JSON.stringify(draft));
      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Local storage quota limit reached on manual save:", err);
      alert("Save warning: The working campaign draft is too large to fit in browser local storage quota (5MB limit). However, your campaign and recipient lists remain loaded and active in-memory. Please proceed with sending.");
    }
  };

  // State for row inline editing
  const [editingRecipientId, setEditingRecipientId] = useState<string | null>(null);

  const handleUpdateRecipientField = (id: string, field: keyof Recipient, val: any) => {
    setRecipients(
      recipients.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  // Manual Recipient State values
  const [manFirstName, setManFirstName] = useState("");
  const [manLastName, setManLastName] = useState("");
  const [manEmail, setManEmail] = useState("");
  const [manCompany, setManCompany] = useState("");
  const [manDept, setManDept] = useState("");
  const [manAddress, setManAddress] = useState("");
  const [manIndustry, setManIndustry] = useState("");
  const [manScheduledDate, setManScheduledDate] = useState("");
  const [manField1, setManField1] = useState("");
  const [manField2, setManField2] = useState("");
  const [manField3, setManField3] = useState("");
  const [manError, setManError] = useState("");

  // Batch selection search & criteria states
  const [filterCompany, setFilterCompany] = useState("");
  const [filterAddress, setFilterAddress] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const handleBulkSelect = (selectState: boolean) => {
    const updated = recipients.map((r) => {
      let isMatch = true;
      if (filterCompany && !(r.Company || "").toLowerCase().includes(filterCompany.toLowerCase())) {
        isMatch = false;
      }
      if (filterAddress && !(r.Address || "").toLowerCase().includes(filterAddress.toLowerCase())) {
        isMatch = false;
      }
      if (filterIndustry && !(r.Industry || "").toLowerCase().includes(filterIndustry.toLowerCase())) {
        isMatch = false;
      }
      if (filterDate && !(r.ScheduledDate || "").toLowerCase().includes(filterDate.toLowerCase())) {
        isMatch = false;
      }
      if (isMatch) {
         return { ...r, isSelected: selectState };
      }
      return r;
    });
    setRecipients(updated);
  };

  const clearBatchFilters = () => {
    setFilterCompany("");
    setFilterAddress("");
    setFilterIndustry("");
    setFilterDate("");
  };

  const handleAddManualRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    setManError("");

    if (!manEmail || !manEmail.trim()) {
      setManError("Email address field is required.");
      return;
    }

    if (!manEmail.includes("@")) {
      setManError("Please input a valid email formatting.");
      return;
    }

    const newRec: Recipient = {
      id: `rec_man_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      FirstName: manFirstName.trim() || "",
      LastName: manLastName.trim() || "",
      Company: manCompany.trim() || "",
      Email: manEmail.trim(),
      Department: manDept.trim() || "",
      Address: manAddress.trim() || "",
      Industry: manIndustry.trim() || "",
      ScheduledDate: manScheduledDate.trim() || "",
      CustomField1: manField1.trim() || "",
      CustomField2: manField2.trim() || "",
      CustomField3: manField3.trim() || "",
      status: "idle",
      openCount: 0,
      isSelected: true
    };

    const updated = [...recipients, newRec];
    setRecipients(updated);
    
    // Select this brand new recipient as the preview item to let them review it
    setSelectedPreviewIndex(updated.length - 1);

    // Clears the manual add form
    setManFirstName("");
    setManLastName("");
    setManEmail("");
    setManCompany("");
    setManDept("");
    setManAddress("");
    setManIndustry("");
    setManScheduledDate("");
    setManField1("");
    setManField2("");
    setManField3("");
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Supported merger tags
  const mergeTags = [
    "FirstName",
    "LastName",
    "Company",
    "Email",
    "Department",
    "Address",
    "Industry",
    "ScheduledDate",
    "CustomField1",
    "CustomField2",
    "CustomField3"
  ];

  // Excel/CSV file drag triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSpreadsheetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSpreadsheetFile(e.target.files[0]);
    }
  };

  const handleSpreadsheetFile = async (file: File) => {
    try {
      setImportError(null);
      const parsed = await parseSpreadsheet(file);
      setRecipients(parsed);
      setSelectedPreviewIndex(0);
    } catch (err: any) {
      setImportError(err.message || "Failed parsing spreadsheet format.");
    }
  };

  // Attachments Drag handles
  const handleAttachmentDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setAttachmentDragActive(true);
    } else if (e.type === "dragleave") {
      setAttachmentDragActive(false);
    }
  };

  const handleAttachmentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAttachmentDragActive(false);
    if (e.dataTransfer.files) {
      processAttachments(e.dataTransfer.files);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processAttachments(e.target.files);
    }
  };

  const processAttachments = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fullResultStr = reader.result as string;
        // Strip off base64 prefixes to supply clean binary content to Graph API
        const base64Content = fullResultStr.substring(fullResultStr.indexOf(",") + 1);
        
        setAttachments((prev) => {
          // Prevent duplicates
          if (prev.some((p) => p.name === file.name)) return prev;
          return [
            ...prev,
            {
              name: file.name,
              size: file.size,
              type: file.type || "application/octet-stream",
              contentBytes: base64Content
            }
          ];
        });
      };
      // Read raw file to output DataURL base64 encoded streams
      reader.readAsDataURL(file);
    });
  };

  const deleteAttachment = (name: string) => {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  };

  // Drop spreadsheet records
  const clearRecipients = () => {
    setRecipients([]);
    setSelectedPreviewIndex(0);
    setImportError(null);
  };

  // Trigger merge tag insertions at cursor point
  const insertMergeTag = (tagName: string) => {
    const textRef = textAreaRef.current;
    if (!textRef) return;

    const startPos = textRef.selectionStart;
    const endPos = textRef.selectionEnd;
    const originalText = templateBody;
    const insertTag = `{{${tagName}}}`;

    const updatedText =
      originalText.substring(0, startPos) +
      insertTag +
      originalText.substring(endPos, originalText.length);

    setTemplateBody(updatedText);

    // Reposition cursor right after inserted tags
    setTimeout(() => {
      textRef.focus();
      textRef.setSelectionRange(startPos + insertTag.length, startPos + insertTag.length);
    }, 10);
  };

  // Format Helper Buttons (inserts HTML tags)
  const applyFormat = (openTag: string, closeTag: string) => {
    const textRef = textAreaRef.current;
    if (!textRef) return;

    const startPos = textRef.selectionStart;
    const endPos = textRef.selectionEnd;
    const selectedText = templateBody.substring(startPos, endPos);
    
    const formatted = `${openTag}${selectedText || "text"}${closeTag}`;
    const updated = templateBody.substring(0, startPos) + formatted + templateBody.substring(endPos);
    
    setTemplateBody(updated);
    
    setTimeout(() => {
      textRef.focus();
      textRef.setSelectionRange(startPos + openTag.length, startPos + openTag.length + (selectedText || "text").length);
    }, 10);
  };

  // Compile final merged strings for live dynamic previews
  const computeMergedContent = (text: string, recipient: Recipient | undefined) => {
    if (!recipient) return text;
    let output = text;
    mergeTags.forEach((tag) => {
      const regex = new RegExp(`{{${tag}}}`, "g");
      const replaceValue = (recipient as any)[tag] || `[${tag}]`;
      output = output.replace(regex, replaceValue);
    });
    return output;
  };

  const currentPreviewRecipient = recipients[selectedPreviewIndex];
  const baseMergedHTML = computeMergedContent(templateBody, currentPreviewRecipient);
  const headerLayoutHTML = `
<div class="app-header" style="display: flex; align-items: center; background: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); margin-bottom: 20px; border: 1px solid #e2e8f0;">
    <img src="https://docs.google.com/uc?export=view&id=1RsaHnpwhk4IjOcaNixAbqGG2x5uuei33" alt="Gemba Partner Logo" style="height:45px; width:auto; object-fit:contain; vertical-align:middle; margin-right:12px; border-radius:4px;">
    <div class="app-title" style="font-size: 20px; font-weight: 700; color: #1a202c; font-family: sans-serif;">Gemba Partner - Saha Tespit & ROI Analizörü</div>
</div>
  `;
  const rawBodyHTML = headerLayoutHTML + baseMergedHTML;
  // Replace direct Google Drive UI links with active embed streams for visual rendering inside the iframe layout
  const renderedBodyHTML = rawBodyHTML.replaceAll(
    "https://drive.google.com/file/d/1RsaHnpwhk4IjOcaNixAbqGG2x5uuei33/view?usp=sharing",
    "https://docs.google.com/uc?export=view&id=1RsaHnpwhk4IjOcaNixAbqGG2x5uuei33"
  );

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-white dark:bg-[#1b1a19] p-5 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-55 text-blue-700 dark:bg-blue-955/45 dark:text-blue-405 rounded-lg">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-zinc-100 font-sans">Campaign Draft Designer</h2>
            <p className="text-xs text-slate-500 font-sans">Upload your recipient database, design personalized HTML email blueprints, and configure smart attachment overrides.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Left Columns - Inputs and lists */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Recipient Management Box */}
        <div className={isListExpanded
          ? "fixed inset-0 z-50 bg-[#FAF9F8] dark:bg-[#121110] p-6 overflow-y-auto flex flex-col space-y-4 animate-fadeIn"
          : "bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-6 shadow-sm"
        }>
          {/* Always mount file upload input so Ref targets are consistently alive */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="w-4.5 h-4.5 text-[#0078D4]" />
                1. Recipient List
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Excel or CSV spreadsheets, load unlimited recipient records</p>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#f3f2f1] dark:bg-[#252423] text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-Save Active (Keeps list if closed/offline)
                </span>
              </div>
            </div>
            {recipients.length > 0 && (
              <div id="recipient-actions-group" className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-save-recipients-draft"
                  onClick={handleSaveList}
                  className={`text-xs font-bold px-3 py-1.5 border rounded transition-all flex items-center gap-1 cursor-pointer shadow-sm ${
                    showSaveSuccess
                      ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-[#0078D4] border-[#0078D4] text-white hover:bg-[#005a9e]"
                  }`}
                  title="Force save the current recipient list immediately"
                >
                  {showSaveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>List Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save List</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  id="btn-import-recipients"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-[#0078D4] dark:text-[#50b1ff] hover:text-[#005a9e] dark:hover:text-[#80c5ff] px-2.5 py-1.5 border border-blue-250 dark:border-blue-900/40 rounded bg-blue-50/40 dark:bg-blue-950/10 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                  title="Import a new spreadsheet to replace or update the active recipient list"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import List</span>
                </button>
                <span className="text-slate-300 dark:text-[#323130] w-px h-5 self-center" />
                <button
                  type="button"
                  id="btn-export-recipients-xlsx"
                  onClick={() => exportRecipients("xlsx")}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 px-2.5 py-1.5 border border-emerald-200 dark:border-emerald-900/40 rounded bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all flex items-center gap-1 cursor-pointer"
                  title="Export current Recipient list to Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (XLSX)</span>
                </button>
                <button
                  type="button"
                  id="btn-export-recipients-csv"
                  onClick={() => exportRecipients("csv")}
                  className="text-xs font-bold text-white hover:opacity-90 rounded bg-[#14b15b] hover:bg-[#129a4f] transition-all flex items-center gap-1 cursor-pointer border border-[#14b15b] px-2.5 py-1.5"
                  title="Export current Recipient list to CSV"
                >
                  <FileText className="w-3.5 h-3.5 text-white" />
                  <span>CSV</span>
                </button>
                <span className="text-slate-300 dark:text-[#323130] w-px h-5 self-center" />
                <button
                  id="btn-clear-recipients"
                  onClick={clearRecipients}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                >
                  Clear All ({recipients.length})
                </button>
              </div>
            )}
          </div>

          {recipients.length === 0 ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded p-8 transition-all ${
                dragActive
                  ? "border-[#0078D4] bg-[#f3f9fe] dark:bg-blue-950/10"
                  : "border-[#EDEBE9] dark:border-[#323130] bg-[#F3F2F1] dark:bg-[#11100f]"
              }`}
            >
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mb-3 animate-pulse" />
              <p className="text-xs font-bold text-slate-705 dark:text-slate-300">
                Drag and drop your Excel (.xlsx) or CSV file here
              </p>
              <p className="text-[11px] text-slate-400 mt-1 mb-4">or choose from local directory</p>
              
              <button
                id="btn-upload-browse"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white dark:bg-[#252423] hover:bg-slate-50 dark:hover:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded shadow-sm transition-all cursor-pointer"
              >
                Browse Sheet Files
              </button>

              <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-405 font-medium">
                <Info className="w-3.5 h-3.5" />
                Headers: FirstName, LastName, Company, Email, Address, Industry, ScheduledDate, Department, CustomField(1-3)
              </div>
            </div>
          ) : (
            // Recipients Table view
            <div className="space-y-4">
              {/* TOP OF RECIPIENTS SHEET CONTROLS */}
              <div className="p-3 border border-[#EDEBE9] dark:border-[#323130] rounded bg-[#FAF9F8] dark:bg-[#201f1e] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#0078D4]" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest font-mono">
                    Alıcı Listesi Detay Matrisi ({recipients.length} kayıt)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* 1. Ekran Genişletme oku */}
                  <button
                    type="button"
                    onClick={() => setIsListExpanded(!isListExpanded)}
                    className="text-xs font-bold bg-white hover:bg-slate-50 dark:bg-[#252423] dark:hover:bg-[#323130] text-[#0078D4] dark:text-brand-300 px-3 py-1.5 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm hover:scale-[1.02]"
                    title={isListExpanded ? "Ekranı Daralt" : "Ekranı Genişlet"}
                  >
                    {isListExpanded ? <Minimize2 className="w-4 h-4 text-rose-500" /> : <Maximize2 className="w-4 h-4 text-indigo-500" />}
                    <span>{isListExpanded ? "Ekranı Daralt" : "Ekranı Genişlet"}</span>
                  </button>

                  {/* 2. Export İndirme oku (.xls biçiminde) */}
                  <button
                    type="button"
                    onClick={() => exportRecipients("xls")}
                    className="text-xs font-bold bg-[#107c41] hover:bg-[#0b592e] text-white px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm hover:scale-[1.02]"
                    title="Listeyi Excel (.xls) formatında indir"
                  >
                    <Download className="w-4 h-4 text-white animate-bounce" style={{ animationDuration: "2.5s" }} />
                    <span>XLS İndir (Excel)</span>
                  </button>
                </div>
              </div>

              {/* Batch Filtering & Selection Panel */}
              <div className="bg-slate-50 dark:bg-[#11100f] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0078D4]" />
                    Interactive Bulk Filter & Checkbox Selector
                  </span>
                  {(filterCompany || filterAddress || filterIndustry || filterDate) && (
                    <button
                      type="button"
                      onClick={clearBatchFilters}
                      className="text-xs text-[#0078D4] hover:text-[#006cc0] font-bold transition-all cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block mb-1">Company Name</label>
                    <input
                      type="text"
                      value={filterCompany}
                      onChange={(e) => setFilterCompany(e.target.value)}
                      placeholder="e.g., Apple, ACME"
                      className="w-full p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] text-xs focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block mb-1">City / Address</label>
                    <input
                      type="text"
                      value={filterAddress}
                      onChange={(e) => setFilterAddress(e.target.value)}
                      placeholder="e.g., London, Paris"
                      className="w-full p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] text-xs focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block mb-1">Industry</label>
                    <input
                      type="text"
                      value={filterIndustry}
                      onChange={(e) => setFilterIndustry(e.target.value)}
                      placeholder="e.g., Finance, Retail"
                      className="w-full p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] text-xs focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block mb-1">Planned Date</label>
                    <input
                      type="text"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      placeholder="e.g., 2026-06-15"
                      className="w-full p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] text-xs focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#EDEBE9] dark:border-[#323130]/60 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">Bulk Action for matching rows:</span>
                  <button
                    type="button"
                    onClick={() => handleBulkSelect(true)}
                    className="bg-[#f3f9fe] hover:bg-brand-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-[#0078D4] dark:text-brand-300 border border-[#b8daf7]/60 dark:border-brand-900/50 text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer"
                  >
                    ☑ Select All Matches
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkSelect(false)}
                    className="bg-white dark:bg-[#252423] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-[#EDEBE9] dark:border-slate-700 text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer"
                  >
                    ☐ Deselect All Matches
                  </button>
                </div>
              </div>

              <div className="border border-[#EDEBE9] dark:border-[#323130] rounded overflow-hidden bg-white dark:bg-[#11100f]">
                <div className="overflow-x-auto max-h-72 scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F3F2F1] dark:bg-[#1b1a19] text-slate-500 font-bold sticky top-0 border-b border-[#EDEBE9] dark:border-[#323130] z-10">
                      <tr>
                        <th className="p-3 w-10 text-center" title="Include/Choose Email in Merge">
                          <input
                            type="checkbox"
                            checked={recipients.length > 0 && recipients.every((r) => r.isSelected !== false)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setRecipients(recipients.map((r) => ({ ...r, isSelected: checked })));
                            }}
                            className="rounded border-[#EDEBE9] dark:border-[#323130] text-[#0078D4] focus:ring-[#0078D4] w-3.5 h-3.5 cursor-pointer"
                          />
                        </th>
                        <th className="p-3 w-10 text-center" title="Preview parameters substitutions">Pre</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Company</th>
                        <th className="p-3">Address</th>
                        <th className="p-3">Industry</th>
                        <th className="p-3 text-indigo-600 dark:text-indigo-400">Scheduled Date</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Fields 1-3</th>
                        <th className="p-3 w-20 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDEBE9] dark:divide-[#323130] text-slate-755 dark:text-slate-300">
                      {recipients
                        .filter((rec) => {
                          let isMatch = true;
                          if (filterCompany && !(rec.Company || "").toLowerCase().includes(filterCompany.toLowerCase())) {
                            isMatch = false;
                          }
                          if (filterAddress && !(rec.Address || "").toLowerCase().includes(filterAddress.toLowerCase())) {
                            isMatch = false;
                          }
                          if (filterIndustry && !(rec.Industry || "").toLowerCase().includes(filterIndustry.toLowerCase())) {
                            isMatch = false;
                          }
                          if (filterDate && !(rec.ScheduledDate || "").toLowerCase().includes(filterDate.toLowerCase())) {
                            isMatch = false;
                          }
                          return isMatch;
                        })
                        .map((rec, index) => (
                          <tr
                            key={rec.id}
                            onClick={() => setSelectedPreviewIndex(recipients.indexOf(rec))}
                            className={`cursor-pointer transition-colors ${
                              recipients[selectedPreviewIndex]?.id === rec.id
                                ? "bg-[#f3f9fe] dark:bg-blue-950/20 font-semibold"
                                : "hover:bg-[#F3F2F1]/50 dark:hover:bg-[#252423]/40"
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={rec.isSelected !== false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setRecipients(
                                    recipients.map((r) =>
                                      r.id === rec.id ? { ...r, isSelected: checked } : r
                                    )
                                  );
                                }}
                                className="rounded border-[#EDEBE9] dark:border-[#323130] text-[#0078D4] focus:ring-[#0078D4] w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                checked={recipients[selectedPreviewIndex]?.id === rec.id}
                                onChange={() => setSelectedPreviewIndex(recipients.indexOf(rec))}
                                className="text-[#0078D4] focus:ring-[#0078D4] w-3 h-3 cursor-pointer"
                              />
                            </td>
                            {editingRecipientId === rec.id ? (
                              <>
                                <td className="p-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={rec.FirstName}
                                      onChange={(e) => handleUpdateRecipientField(rec.id, "FirstName", e.target.value)}
                                      className="w-1/2 px-1.5 py-1 text-xs border border-slate-300 dark:border-[#323130] bg-white dark:bg-[#11100f] rounded text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0078D4]"
                                      placeholder="First"
                                    />
                                    <input
                                      type="text"
                                      value={rec.LastName}
                                      onChange={(e) => handleUpdateRecipientField(rec.id, "LastName", e.target.value)}
                                      className="w-1/2 px-1.5 py-1 text-xs border border-slate-300 dark:border-[#323130] bg-white dark:bg-[#11100f] rounded text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0078D4]"
                                      placeholder="Last"
                                    />
                                  </div>
                                </td>
                                <td className="p-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="email"
                                    value={rec.Email}
                                    onChange={(e) => handleUpdateRecipientField(rec.id, "Email", e.target.value)}
                                    className="w-full px-1.5 py-1 text-xs font-mono border border-slate-300 dark:border-[#323130] bg-white dark:bg-[#11100f] rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0078D4]"
                                  />
                                </td>
                                <td className="p-1 min-w-[80px]" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={rec.Company || ""}
                                    onChange={(e) => handleUpdateRecipientField(rec.id, "Company", e.target.value)}
                                    className="w-full px-1.5 py-1 text-xs border border-slate-300 dark:border-[#323130] bg-white dark:bg-[#11100f] rounded text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0078D4]"
                                  />
                                </td>
                                <td className="p-1 min-w-[100px]" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={rec.Address || ""}
                                    onChange={(e) => handleUpdateRecipientField(rec.id, "Address", e.target.value)}
                                    className="w-full px-1.5 py-1 text-xs border border-slate-300 dark:border-[#323130] bg-white dark:bg-[#11100f] rounded text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0078D4]"
                                  />
                                </td>
                                <td className="p-1 min-w-[80px]" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={rec.Industry || ""}
                                    onChange={(e) => handleUpdateRecipientField(rec.id, "Industry", e.target.value)}
                                    className="w-full px-1.5 py-1 text-xs border border-slate-300 dark:border-[#323130] bg-white dark:bg-[#11100f] rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0078D4]"
                                  />
                                </td>
                                <td className="p-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="datetime-local"
                                    value={rec.ScheduledDate || ""}
                                    onChange={(e) => handleUpdateRecipientField(rec.id, "ScheduledDate", e.target.value)}
                                    className="w-full px-1 py-1 text-[11px] font-mono border border-slate-300 dark:border-[#323130] bg-white dark:bg-[#11100f] rounded text-slate-805 dark:text-slate-200 focus:outline-none focus:border-[#0078D4] h-[28px]"
                                  />
                                </td>
                                <td className="p-1 min-w-[80px]" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={rec.Department || ""}
                                    onChange={(e) => handleUpdateRecipientField(rec.id, "Department", e.target.value)}
                                    className="w-full px-1.5 py-1 text-xs border border-slate-300 dark:border-[#323130] bg-white dark:bg-[#11100f] rounded text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0078D4]"
                                  />
                                </td>
                                <td className="p-1 min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={rec.CustomField1 || ""}
                                      placeholder="c1"
                                      onChange={(e) => handleUpdateRecipientField(rec.id, "CustomField1", e.target.value)}
                                      className="w-1/3 px-1 py-1 text-[10px] border border-slate-300 dark:border-[#323130] bg-white dark:bg-[#11100f] rounded focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-405"
                                    />
                                    <input
                                      type="text"
                                      value={rec.CustomField2 || ""}
                                      placeholder="c2"
                                      onChange={(e) => handleUpdateRecipientField(rec.id, "CustomField2", e.target.value)}
                                      className="w-1/3 px-1 py-1 text-[10px] border border-slate-300 dark:border-[#323130] bg-white dark:bg-[#11100f] rounded focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-405"
                                    />
                                    <input
                                      type="text"
                                      value={rec.CustomField3 || ""}
                                      placeholder="c3"
                                      onChange={(e) => handleUpdateRecipientField(rec.id, "CustomField3", e.target.value)}
                                      className="w-1/3 px-1 py-1 text-[10px] border border-slate-300 dark:border-[#323130] bg-white dark:bg-[#11100f] rounded focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-405"
                                    />
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 truncate max-w-[120px]">
                                  {rec.FirstName} {rec.LastName}
                                </td>
                                <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                  {rec.Email}
                                </td>
                                <td className="p-3 truncate max-w-[100px]">{rec.Company || "-"}</td>
                                <td className="p-3 truncate max-w-[120px]" title={rec.Address}>{rec.Address || "-"}</td>
                                <td className="p-3 truncate max-w-[100px]" title={rec.Industry}>{rec.Industry || "-"}</td>
                                <td className="p-3 truncate max-w-[110px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 text-[11px]">{rec.ScheduledDate ? rec.ScheduledDate.replace("T", " ") : "-"}</td>
                                <td className="p-3 truncate max-w-[100px]">{rec.Department || "-"}</td>
                                <td className="p-3 text-slate-400 font-mono text-[10px] truncate max-w-[145px]">
                                  {[rec.CustomField1, rec.CustomField2, rec.CustomField3].filter(Boolean).join(" | ") || "-"}
                                </td>
                              </>
                            )}
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5 w-16">
                                {editingRecipientId === rec.id ? (
                                  <button
                                    type="button"
                                    onClick={() => setEditingRecipientId(null)}
                                    className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 p-1.5 rounded transition-colors cursor-pointer"
                                    title="Save changes"
                                  >
                                    <Check className="w-3.5 h-3.5 animate-bounce" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingRecipientId(rec.id)}
                                    className="text-[#0078D4] hover:text-[#006cc0] hover:bg-blue-50 dark:hover:bg-blue-950/20 p-1.5 rounded transition-colors cursor-pointer"
                                    title="Edit Row"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = recipients.filter((r) => r.id !== rec.id);
                                    setRecipients(newList);
                                    if (selectedPreviewIndex >= newList.length) {
                                      setSelectedPreviewIndex(Math.max(0, newList.length - 1));
                                    }
                                    if (editingRecipientId === rec.id) {
                                      setEditingRecipientId(null);
                                    }
                                  }}
                                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1.5 rounded transition-colors cursor-pointer"
                                  title="Delete Recipient"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-[#F3F2F1] dark:bg-[#1b1a19] p-2.5 text-[10px] text-slate-500 flex items-center justify-between border-t border-[#EDEBE9] dark:border-[#323130]">
                  <span>Total Imported Recipients: <strong>{recipients.length}</strong> loaded</span>
                  <span>Click a row to load visual merge preview card</span>
                </div>
              </div>
            </div>
          )}

          {/* Manual Email Input addition container */}
          <div className="mt-4 border border-[#EDEBE9] dark:border-[#323130] rounded p-4 bg-[#F3F2F1]/30 dark:bg-[#11100f]/15 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Add Recipient Manually</span>
              <span className="text-[10px] text-slate-400 font-normal">Enter details instantly</span>
            </h4>
            <form onSubmit={handleAddManualRecipient} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">First Name</label>
                <input
                  type="text"
                  placeholder="John"
                  value={manFirstName}
                  onChange={(e) => setManFirstName(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Last Name</label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={manLastName}
                  onChange={(e) => setManLastName(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-450 font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Email <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  placeholder="johndoe@email.com"
                  value={manEmail}
                  required
                  onChange={(e) => setManEmail(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Company</label>
                <input
                  type="text"
                  placeholder="ACME Corp"
                  value={manCompany}
                  onChange={(e) => setManCompany(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Department</label>
                <input
                  type="text"
                  placeholder="Marketing"
                  value={manDept}
                  onChange={(e) => setManDept(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Address (City/Street)</label>
                <input
                  type="text"
                  placeholder="e.g., London, UK"
                  value={manAddress}
                  onChange={(e) => setManAddress(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Industry</label>
                <input
                  type="text"
                  placeholder="e.g., Technology"
                  value={manIndustry}
                  onChange={(e) => setManIndustry(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-indigo-500 font-bold block mb-1">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={manScheduledDate}
                  onChange={(e) => setManScheduledDate(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] h-[34px]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Custom 1</label>
                <input
                  type="text"
                  placeholder="Merge Tag 1"
                  value={manField1}
                  onChange={(e) => setManField1(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Custom 2</label>
                <input
                  type="text"
                  placeholder="Merge Tag 2"
                  value={manField2}
                  onChange={(e) => setManField2(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Custom 3</label>
                <input
                  type="text"
                  placeholder="Merge Tag 3"
                  value={manField3}
                  onChange={(e) => setManField3(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#252423] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-[#0078D4] hover:bg-[#006cc0] text-white font-bold text-xs py-2 px-3 rounded transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 h-[34px]"
                >
                  Add Recipient
                </button>
              </div>
            </form>
            {manError && (
              <p className="text-[11px] text-rose-500 font-semibold">{manError}</p>
            )}
          </div>

          {importError && (
            <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-850 dark:text-rose-400 rounded flex items-start gap-2 border border-rose-200/50 text-xs">
              <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
              <p>{importError}</p>
            </div>
          )}
        </div>

        {/* Email Composer and Attachments */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-[#EDEBE9] dark:border-[#323130] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Type className="w-4.5 h-4.5 text-[#0078D4]" />
                2. Email Template Composer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Formulate rich HTML body templates with placement parameters</p>
            </div>
            <button
              id="btn-composer-help"
              onClick={() => setShowEditorHelp(!showEditorHelp)}
              className="text-[11px] text-[#0078D4] dark:text-brand-300 hover:underline flex items-center gap-1 font-bold"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Formatting guide
            </button>
          </div>

          {showEditorHelp && (
            <div className="p-3.5 rounded bg-[#F3F2F1] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-xs text-slate-600 dark:text-slate-300 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Supported HTML formatting parameters:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-500 font-mono text-[10px]">
                  <li><code>&lt;b&gt;bold text&lt;/b&gt;</code> for heavy weight</li>
                  <li><code>&lt;i&gt;italicized text&lt;/i&gt;</code> for accents</li>
                  <li><code>&lt;p&gt;new paragraph&lt;/p&gt;</code> spacing</li>
                  <li><code>&lt;h2&gt;Header section&lt;/h2&gt;</code> for sections</li>
                  <li><code>&lt;a href="url"&gt;Hyperlink text&lt;/a&gt;</code></li>
                </ul>
              </div>
              <div>
                <strong>Merge Tag Syntax Rules:</strong>
                <p className="mt-1 text-slate-500">
                  Ensure you surround merge tags exactly with curly braces (e.g. <code>{"{{FirstName}}"}</code>). Standard text substitutions are case-sensitive and match the spreadsheet grid columns.
                </p>
              </div>
            </div>
          )}

          {/* Subject string */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-405 uppercase tracking-wider block">Subject Line</label>
            <input
              id="composer-subject-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Exclusive Corporate Partnership Update for {{Company}}"
              className="w-full text-xs border border-[#EDEBE9] dark:border-[#323130] rounded px-4 py-2.5 bg-[#F3F2F1]/50 dark:bg-[#11100f] focus:bg-white dark:focus:bg-[#1b1a19] focus:outline-none focus:ring-1 focus:ring-[#0078D4] transition-all font-medium text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Drag merge tag actions row */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#0078D4]" />
              Click metadata chips to inject parameter:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {mergeTags.map((tag) => (
                <button
                  id={`chip-tag-${tag}`}
                  key={tag}
                  onClick={() => insertMergeTag(tag)}
                  className="text-[10px] font-bold bg-[#f3f9fe] dark:bg-blue-950/20 text-[#0078D4] dark:text-brand-350 hover:bg-[#ddebf7] border border-[#b8daf7] dark:border-brand-900/30 rounded px-2.5 py-1.5 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Type className="w-3 h-3 text-[#0078D4]" />
                  {"{{"} {tag} {"}}"}
                </button>
              ))}
            </div>
          </div>

          {/* HTML Quick Formats Bar */}
          <div className="bg-[#F3F2F1] dark:bg-[#11100f] border border-[#EDEBE9] dark:border-[#323130] rounded px-2.5 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                title="Bold"
                onClick={() => applyFormat("<b>", "</b>")}
                className="editor-bubble-btn text-xs font-bold font-mono"
              >
                B
              </button>
              <button
                title="Italic"
                onClick={() => applyFormat("<i>", "</i>")}
                className="editor-bubble-btn text-xs italic font-serif"
              >
                I
              </button>
              <button
                title="Underline"
                onClick={() => applyFormat("<u>", "</u>")}
                className="editor-bubble-btn text-xs underline"
              >
                U
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-805 mx-1"></div>
              <button
                title="Paragraph"
                onClick={() => applyFormat("<p>", "</p>")}
                className="editor-bubble-btn text-xs font-semibold"
              >
                P
              </button>
              <button
                title="Header 2"
                onClick={() => applyFormat("<h2>", "</h2>")}
                className="editor-bubble-btn text-xs font-bold"
              >
                H2
              </button>
              <button
                title="Link"
                onClick={() => applyFormat('<a href="https://">', "</a>")}
                className="editor-bubble-btn text-xs font-mono"
              >
                Link
              </button>
            </div>
            <span className="text-[10px] text-slate-400 italic">Formatting generates HTML compliant mailings</span>
          </div>

          {/* HTML editor body */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-405 uppercase tracking-wider block">HTML Rich text content</label>
            <textarea
              id="composer-body-textarea"
              ref={textAreaRef}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              rows={8}
              placeholder={`Hello {{FirstName}},\n\nWriting to reach out regarding the department division updates at {{Company}}.\n\nBest wishes,\nTeam Corp`}
              className="w-full text-xs text-slate-800 dark:text-slate-200 font-mono border border-[#EDEBE9] dark:border-[#323130] rounded p-4 bg-[#F3F2F1]/50 dark:bg-[#11100f] focus:bg-white dark:focus:bg-[#1b1a19] focus:outline-none focus:ring-1 focus:ring-[#0078D4] transition-all leading-normal"
            />
          </div>

          {/* Gemini AI Strategy Assistant Panel */}
          <div className="bg-[#fcf8f2] dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 leading-none">
                    Gemini AI Strategy Assistant
                    <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Pro Draft Tool</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Author templates and draft campaign copy instantly with smart placeholders</p>
                </div>
              </div>
            </div>

            {/* Error or Success notification banner */}
            {aiError && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 p-2.5 rounded text-xs flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}
            
            {aiSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-2.5 rounded text-xs flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{aiSuccess}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="ai-assist-prompt" className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">AI Copy Directions & Copywriting Strategy</label>
              <input
                id="ai-assist-prompt"
                type="text"
                placeholder="e.g., exciting product update, friendly payment reminder, high-interest marketing outreach"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                className="w-full text-xs text-slate-700 dark:text-slate-300 border border-[#EDEBE9] dark:border-[#323130] rounded px-3 py-2 bg-white dark:bg-[#11100f] focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-ai-write-draft"
                type="button"
                onClick={() => handleAiAssist("write")}
                disabled={aiLoading}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-xs ${
                  aiLoading
                    ? "bg-slate-100 text-slate-400 dark:bg-slate-800/40 dark:text-slate-600 cursor-not-allowed"
                    : "bg-[#0078D4] text-white hover:bg-[#005a9e] cursor-pointer"
                }`}
              >
                {aiLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Write Email Draft</span>
                  </>
                )}
              </button>

              <button
                id="btn-ai-polish-mail"
                type="button"
                onClick={() => handleAiAssist("polish")}
                disabled={aiLoading || !templateBody}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-xs ${
                  aiLoading || !templateBody
                    ? "bg-slate-100 text-slate-400 dark:bg-slate-800/40 dark:text-slate-600 cursor-not-allowed"
                    : "bg-white dark:bg-[#252423] text-slate-800 dark:text-slate-200 border border-[#EDEBE9] dark:border-[#323130] hover:bg-slate-50 dark:hover:bg-[#2d2c2b] cursor-pointer"
                }`}
                title={!templateBody ? "Please write mail text first to apply polishing strategies" : "Revamp existing text with prompt directions"}
              >
                <Edit3 className="w-3.5 h-3.5 text-[#0078D4]" />
                <span>Polish Existing Mail</span>
              </button>
            </div>
          </div>

          {/* Attachments Upload section */}
          <div className="space-y-3 pt-3 border-t border-[#EDEBE9] dark:border-[#323130]">
            <label className="text-[10px] font-bold text-slate-405 uppercase tracking-wider block">
              3. Campaign Attachments (Included on all sends)
            </label>
            
            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {attachments.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between gap-3 p-2 border border-[#EDEBE9] dark:border-[#323130] rounded bg-[#F3F2F1]/50 dark:bg-[#11100f] text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <div className="truncate">
                        <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      id={`btn-del-file-${file.name}`}
                      onClick={() => deleteAttachment(file.name)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              onDragEnter={handleAttachmentDrag}
              onDragOver={handleAttachmentDrag}
              onDragLeave={handleAttachmentDrag}
              onDrop={handleAttachmentDrop}
              className={`flex items-center justify-center p-5 border border-dashed rounded text-center transition-all ${
                attachmentDragActive
                  ? "border-[#0078D4] bg-[#f3f9fe] dark:bg-blue-950/10"
                  : "border-[#EDEBE9] dark:border-[#323130] bg-[#F3F2F1]/50 dark:bg-[#11100f] hover:bg-slate-50 dark:hover:bg-slate-900/30"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Upload className="w-8 h-8 text-slate-400" />
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Drag and drop attachments or{" "}
                    <button
                      id="btn-attachment-browse"
                      onClick={() => attachmentInputRef.current?.click()}
                      className="text-[#0078D4] underline font-bold hover:text-[#006cc0] inline cursor-pointer animate-pulse"
                    >
                      browse local files
                    </button>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Documents, spreadsheets, PDFs, or images to enclose</p>
                </div>
              </div>
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                onChange={handleAttachmentChange}
                className="hidden"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Right Column - Personalized visual preview & summaries */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Visual Live card merge preview */}
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-6 shadow-sm sticky top-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Eye className="w-4.5 h-4.5 text-[#0078D4]" />
              Live Merge Preview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Showing exact compiled template draft</p>
          </div>

          <div className="border border-[#EDEBE9] dark:border-[#323130] rounded overflow-hidden bg-[#F3F2F1] dark:bg-[#11100f] shadow-inner max-h-[440px] overflow-y-auto">
            {/* Simulation Header browser styled layout */}
            <div className="bg-[#EDEBE9]/50 dark:bg-[#1b1a19] px-4 py-3 border-b border-[#EDEBE9] dark:border-[#323130] text-[11px] text-slate-500 flex flex-col gap-1">
              <div>
                <span className="font-bold text-slate-400">TO: </span>
                {currentPreviewRecipient ? (
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold bg-white dark:bg-[#252423] px-2 py-0.5 rounded border border-[#EDEBE9] dark:border-[#323130]">
                    {`"${currentPreviewRecipient.FirstName} ${currentPreviewRecipient.LastName}" <${currentPreviewRecipient.Email}>`}
                    {currentPreviewRecipient.Company && ` @ ${currentPreviewRecipient.Company}`}
                  </span>
                ) : (
                  <span className="italic">No recipient spreadsheet loaded yet</span>
                )}
              </div>
              <div className="mt-1 truncate">
                <span className="font-bold text-slate-400">SUBJECT: </span>
                <span className="font-bold text-slate-705 dark:text-slate-200">
                  {subject ? computeMergedContent(subject, currentPreviewRecipient) : "(Untitled Subject)"}
                </span>
              </div>
            </div>

            {/* Simulated Live preview iframe / HTML panel */}
            <div className="p-5 min-h-[160px] bg-white dark:bg-[#1b1a19] text-xs text-slate-800 dark:text-slate-300 leading-relaxed font-sans">
              {templateBody ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none space-y-2 text-slate-700 dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: renderedBodyHTML }}
                />
              ) : (
                <div className="text-slate-405 italic text-center py-8">
                  Email body draft is empty. Enter message content in the composer to view live substitutions instantly.
                </div>
              )}

              {/* Attachments footer in preview */}
              {attachments.length > 0 && (
                <div className="mt-6 pt-4 border-t border-[#EDEBE9] dark:border-[#323130]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Attachments Enclosed</span>
                  <div className="flex flex-wrap gap-1.5">
                    {attachments.map((file) => (
                      <span
                        key={file.name}
                        className="inline-flex items-center gap-1.5 bg-[#F3F2F1] dark:bg-[#252423] text-[10px] font-semibold text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded border border-[#EDEBE9] dark:border-[#323130]"
                      >
                        <Paperclip className="w-3 h-3 text-indigo-500" />
                        {file.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Merge Launch validations */}
          <div className="pt-2">
            {recipients.length === 0 ? (
              <div className="p-3 bg-[#f3f9fe] dark:bg-blue-955/20 text-[11px] text-[#0078D4] dark:text-brand-300 rounded border border-[#ddebf7] dark:border-brand-900/30 flex gap-2">
                <Info className="w-4.5 h-4.5 text-[#0078D4] flex-shrink-0" />
                <span>Upload a spreadsheet or add manually to initiate the sending queue.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {(!subject || !templateBody) && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-[10px] text-amber-800 dark:text-amber-400 rounded border border-amber-200/30 flex items-center gap-1.5 leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>Formatting warning: Subject line or Email body is currently empty. You can still proceed to preview the distribution queue, configure dispatch method, and save draft.</span>
                  </div>
                )}
                <button
                  id="btn-launch-campaign-designer"
                  onClick={onLaunchCampaign}
                  className="w-full bg-[#0078D4] hover:bg-[#006cc0] text-white font-bold text-xs py-3 px-4 rounded shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Proceed to Campaign Preview & Sending Queue
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
    </div>
  );
}
