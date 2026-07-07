import React, { useState } from "react";
import { CrmDb, CrmDocument } from "../../lib/CrmDb";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Paperclip,
  Eye,
  Plus,
  RefreshCw,
  X,
  CheckCircle,
  FileCheck2,
  Calendar,
  Layers,
  Sparkles,
  Search
} from "lucide-react";

interface CompanyDocumentsTabProps {
  companyId: string;
  lang: "TR" | "EN";
  companyName: string;
  onLogTimelineEvent?: (title: string, desc: string, type: string) => void;
}

export default function CompanyDocumentsTab({
  companyId,
  lang,
  companyName,
  onLogTimelineEvent
}: CompanyDocumentsTabProps) {
  const [documents, setDocuments] = useState<CrmDocument[]>(() => CrmDb.getDocumentsByCompany(companyId));
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CrmDocument | null>(null);
  
  // Replace / Version Modal
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);

  const reloadDocs = () => {
    setDocuments(CrmDb.getDocumentsByCompany(companyId));
  };

  // Mock Upload Handler
  const handleUploadSimulated = (fileName: string, type: string, sizeBytes: number) => {
    const sizeKB = Math.round(sizeBytes / 1024);
    const sizeStr = sizeKB > 1024 
      ? `${(sizeKB / 1024).toFixed(1)} MB` 
      : `${sizeKB} KB`;

    const newDoc = CrmDb.createDocument({
      companyId,
      name: fileName,
      type: type,
      size: sizeStr,
      date: new Date().toISOString().split("T")[0]
    });

    // Save initial version history in local storage
    const versionKey = `crm_doc_versions_${newDoc.id}`;
    const initialHistory = [{
      version: 1,
      date: new Date().toISOString(),
      user: "Atakan Zehir",
      size: sizeStr,
      changeComment: lang === "TR" ? "İlk yükleme yapıldı." : "Initial document upload."
    }];
    localStorage.setItem(versionKey, JSON.stringify(initialHistory));

    if (onLogTimelineEvent) {
      onLogTimelineEvent(
        lang === "TR" ? "Belge Yüklendi" : "Document Attached",
        `${fileName} (${sizeStr})`,
        "document"
      );
    }

    reloadDocs();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleUploadSimulated(file.name, file.type || "application/octet-stream", file.size);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleUploadSimulated(file.name, file.type || "application/octet-stream", file.size);
    }
  };

  const handleReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.files && e.target.files[0] && id) {
      const file = e.target.files[0];
      const sizeKB = Math.round(file.size / 1024);
      const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

      // Update in CrmDb
      const allSaved = localStorage.getItem("crm_documents");
      if (allSaved) {
        try {
          const list: CrmDocument[] = JSON.parse(allSaved);
          const updated = list.map(doc => {
            if (doc.id === id) {
              // Update version history
              const versionKey = `crm_doc_versions_${id}`;
              const savedHistory = localStorage.getItem(versionKey);
              const history = savedHistory ? JSON.parse(savedHistory) : [];
              const nextVer = history.length + 1;
              
              history.unshift({
                version: nextVer,
                date: new Date().toISOString(),
                user: "Atakan Zehir",
                size: sizeStr,
                changeComment: lang === "TR" ? `${nextVer}. versiyon yüklendi.` : `Version ${nextVer} replaced.`
              });
              localStorage.setItem(versionKey, JSON.stringify(history));

              return {
                ...doc,
                name: file.name,
                size: sizeStr,
                date: new Date().toISOString().split("T")[0]
              };
            }
            return doc;
          });
          localStorage.setItem("crm_documents", JSON.stringify(updated));

          if (onLogTimelineEvent) {
            onLogTimelineEvent(
              lang === "TR" ? "Belge Sürümü Güncellendi" : "Document Version Replaced",
              `${file.name} (${sizeStr})`,
              "document"
            );
          }
        } catch (err) {
          console.error("Replace document failed", err);
        }
      }

      setReplacingDocId(null);
      reloadDocs();
    }
  };

  const handleDeleteDoc = (id: string, name: string) => {
    if (confirm(lang === "TR" ? `'${name}' belgesini sistemden kalıcı olarak silmek istiyor musunuz?` : `Are you sure you want to permanently delete '${name}'?`)) {
      const allSaved = localStorage.getItem("crm_documents");
      if (allSaved) {
        try {
          const list: CrmDocument[] = JSON.parse(allSaved);
          const filtered = list.filter(doc => doc.id !== id);
          localStorage.setItem("crm_documents", JSON.stringify(filtered));
          
          // Clean up version history
          localStorage.removeItem(`crm_doc_versions_${id}`);

          if (onLogTimelineEvent) {
            onLogTimelineEvent(
              lang === "TR" ? "Belge Silindi" : "Document Deleted",
              name,
              "system"
            );
          }
        } catch (err) {
          console.error("Delete document failed", err);
        }
      }
      reloadDocs();
    }
  };

  const handleDownloadSimulated = (doc: CrmDocument) => {
    const textContent = `GEMBA PARTNER CORPORATE SYSTEMS\nDocument Name: ${doc.name}\nType: ${doc.type}\nUploaded Date: ${doc.date}\nAssociated Company: ${companyName}\nMetadata: Validated SaaS Attachment Storage`;
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = doc.name.endsWith(".txt") ? doc.name : `${doc.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 font-sans text-xs">
      
      {/* File Drop & Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all ${
          isDragOver 
            ? "border-indigo-500 bg-indigo-50/40 dark:bg-zinc-800/40" 
            : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#151515]"
        }`}
      >
        <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2 animate-bounce" />
        <h5 className="font-extrabold text-slate-800 dark:text-zinc-200 text-xs mb-1">
          {lang === "TR" ? "Dosyaları Sürükle Bırak Yapın veya Seçin" : "Drag and drop files, or browse"}
        </h5>
        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mb-3">
          {lang === "TR" 
            ? "PDF, Word, Excel, CAD Çizimleri, Görsel veya Teklif Dokümanları desteklenir. (Maks. 50MB)" 
            : "Supports PDF, Word, Excel, CAD layouts, plant layouts, or diagnostic briefs. (Max 50MB)"}
        </p>

        <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-slate-205 dark:border-zinc-700 rounded-lg font-bold text-slate-700 dark:text-zinc-300 cursor-pointer shadow-xs transition-colors">
          <Paperclip className="w-3.5 h-3.5" />
          <span>{lang === "TR" ? "Dosya Seçin" : "Browse Files"}</span>
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {/* List Toolbar */}
      <div className="flex items-center justify-between bg-white dark:bg-[#151515] p-3 rounded-xl border border-slate-150 dark:border-zinc-850 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder={lang === "TR" ? "Belgelerde ara..." : "Search corporate attachments..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg pl-8.5 pr-3.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Documents Data Table Grid */}
      <div className="bg-white dark:bg-[#151515] rounded-xl border border-slate-100 dark:border-zinc-800/80 overflow-hidden shadow-xs">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span className="text-slate-400 block">
              {lang === "TR" ? "Herhangi bir döküman bulunmamaktadır." : "No documents attached to this account."}
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800/80 text-[10px] uppercase font-bold text-slate-450 dark:text-zinc-500 font-mono tracking-wider">
                  <th className="p-3.5 pl-5">{lang === "TR" ? "Belge Adı" : "Document Title"}</th>
                  <th className="p-3.5">{lang === "TR" ? "Tür / Format" : "Type / Mime"}</th>
                  <th className="p-3.5">{lang === "TR" ? "Yükleme Tarihi" : "Attached Date"}</th>
                  <th className="p-3.5">{lang === "TR" ? "Boyut" : "Size"}</th>
                  <th className="p-3.5 text-right pr-5">{lang === "TR" ? "İşlemler" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-zinc-850">
                {filteredDocs.map((doc) => {
                  const versionKey = `crm_doc_versions_${doc.id}`;
                  const history = JSON.parse(localStorage.getItem(versionKey) || "[]");
                  const currentVer = history.length > 0 ? history[0].version : 1;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/40 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="p-3.5 pl-5 font-semibold text-slate-850 dark:text-zinc-100 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div className="truncate">
                          <span className="truncate block font-bold text-slate-800 dark:text-zinc-200">{doc.name}</span>
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded mt-0.5">
                            v{currentVer} Active
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-zinc-400 font-mono text-[10px] uppercase truncate">{doc.type || "PDF / Office"}</td>
                      <td className="p-3.5 text-slate-500 dark:text-zinc-400 font-mono">{doc.date || "2026-06-25"}</td>
                      <td className="p-3.5 text-slate-650 dark:text-zinc-300 font-mono">{doc.size || "1.2 MB"}</td>
                      <td className="p-3.5 text-right pr-5">
                        <div className="inline-flex items-center gap-1">
                          
                          {/* Preview Action */}
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 rounded cursor-pointer"
                            title={lang === "TR" ? "Görüntüle" : "Preview"}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Download Action */}
                          <button
                            type="button"
                            onClick={() => handleDownloadSimulated(doc)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-[#0078D4] dark:hover:text-[#0078D4] rounded cursor-pointer"
                            title={lang === "TR" ? "İndir" : "Download"}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Replace / Re-version Action */}
                          <label className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-teal-600 rounded cursor-pointer relative" title={lang === "TR" ? "Yeni Sürüm Yükle" : "Upload New Version"}>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleReplaceFileChange(e, doc.id)}
                            />
                          </label>

                          {/* Delete Action */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc.id, doc.name)}
                            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/20 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                            title={lang === "TR" ? "Sil" : "Delete"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DOCUMENT PREVIEW LIGHTBOX MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-2xl animate-scaleIn text-xs font-sans">
            
            {/* Header */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-zinc-100 text-xs truncate max-w-md">{previewDoc.name}</h4>
                  <span className="text-[9px] text-slate-400 font-mono uppercase">{previewDoc.type} • {previewDoc.size}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Render Canvas Preview Mockup */}
            <div className="p-6 bg-slate-100 dark:bg-zinc-900/60 max-h-[440px] overflow-y-auto border-b border-slate-100 dark:border-zinc-800">
              <div className="bg-white dark:bg-[#111111] p-8 border border-slate-205 dark:border-zinc-800 shadow-sm rounded-lg space-y-5 font-mono text-[10px] leading-relaxed text-slate-700 dark:text-zinc-300">
                
                {/* Visual Header Grid */}
                <div className="flex justify-between items-start pb-5 border-b border-slate-100 dark:border-zinc-800">
                  <div>
                    <h2 className="font-extrabold text-[#0078D4] text-xs">GEMBA PARTNER CORE SYSTEMS</h2>
                    <p className="text-[8px] text-slate-400 mt-0.5">OPERATIONAL EXCELLENCE & LEAN ENTERPRISE SOLUTIONS</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[9px]">{lang === "TR" ? "SAHA TEŞHİS RAPORU" : "DIAGNOSTIC REPORT"}</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">{previewDoc.date || "2026-06-25"}</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 uppercase text-[8px] font-bold">{lang === "TR" ? "İŞTİRAKÇİ MÜŞTERİ:" : "PARTNER CLIENT:"}</p>
                      <p className="font-bold text-slate-850 dark:text-zinc-100">{companyName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase text-[8px] font-bold">METADATA CODE:</p>
                      <p className="font-bold text-slate-850 dark:text-zinc-100">GP-ATTACH-SECURE-V2</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-zinc-900 p-3.5 rounded border border-slate-200 dark:border-zinc-800/80 space-y-1.5 font-sans">
                    <h6 className="font-extrabold text-xs text-slate-850 dark:text-zinc-200 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#0078D4]" />
                      {lang === "TR" ? "Akıllı Belge Teşhisi" : "Smart Document Validation Check"}
                    </h6>
                    <p className="text-[10px] text-slate-600 dark:text-zinc-400 leading-normal">
                      {lang === "TR" 
                        ? "Bu belge Gemba Partner bulut kasasında başarıyla doğrulanmıştır. Teşhis içeriği, tesisinizin operasyonel yetkinliğini analiz etmekte kullanılan Lean 5S, Muda israf haritalama, OEE montaj hatları ve kurumsal finansal raporlarını içermektedir."
                        : "This document is validated in Gemba cloud servers. Content represents operational metrics, Muda minimization outlines, plant layouts, or certified PDF proposals prepared by GP Consultant teams."}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 space-y-1 text-slate-550 dark:text-zinc-400 text-[9px]">
                  <p><b>DOCUMENT SOURCE:</b> LOCALSTORAGE CLOUD EMBED</p>
                  <p><b>COMPLIANCE STATUS:</b> CERTIFIED INTRANET ACCESS ONLY</p>
                </div>
              </div>
            </div>

            {/* Version History inside Preview */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 space-y-2">
              <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                {lang === "TR" ? "Belge Revizyon / Versiyon Geçmişi" : "Document Version History & Change Log"}
              </span>

              <div className="space-y-1 max-h-[100px] overflow-y-auto">
                {(() => {
                  const versionKey = `crm_doc_versions_${previewDoc.id}`;
                  const history = JSON.parse(localStorage.getItem(versionKey) || "[]");
                  
                  if (history.length === 0) {
                    return (
                      <div className="text-[10px] text-slate-400 italic">
                        {lang === "TR" ? "Sürüm geçmişi bulunmuyor." : "No version history found."}
                      </div>
                    );
                  }

                  return history.map((h: any, i: number) => (
                    <div key={i} className="flex justify-between items-start py-1 border-b border-dashed border-slate-200 dark:border-zinc-800 text-[10px] text-slate-650 dark:text-zinc-300">
                      <div>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">v{h.version}</span> - {h.changeComment}
                      </div>
                      <div className="text-[9px] text-slate-450 dark:text-zinc-500 font-mono shrink-0">
                        {h.user} • {new Date(h.date).toLocaleDateString(lang === "TR" ? "tr-TR" : "en-US")}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
