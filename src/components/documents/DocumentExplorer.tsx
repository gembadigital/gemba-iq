import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  File,
  FileImage,
  FileText,
  Folder,
  History,
  Loader2,
  MoveRight,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";
import { useOrganization } from "../../lib/OrganizationContext";
import {
  ALLOWED_EXTENSIONS,
  DOCUMENT_FOLDERS,
  formatFileSize,
  folderLabel,
  isImageExtension,
  isPdfExtension,
} from "../../lib/documentConstants";
import {
  copyDocument,
  deleteDocument,
  getDocumentVersions,
  getSignedDownloadUrl,
  listDocuments,
  moveDocument,
  renameDocument,
  uploadDocument,
  uploadDocumentVersion,
} from "../../lib/enterpriseDocumentService";
import type {
  DocumentFolderKey,
  DocumentListFilters,
  EnterpriseDocument,
  UploadProgressState,
} from "../../types/enterpriseDocument";

interface DocumentExplorerProps {
  companyId?: string;
  companyName?: string;
  initialFolder?: DocumentFolderKey;
  compact?: boolean;
}

export default function DocumentExplorer({
  companyId,
  companyName,
  initialFolder = "companies",
  compact = false,
}: DocumentExplorerProps) {
  const { lang } = useLanguage();
  const { actorName } = useOrganization();
  const tr = lang === "TR";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<EnterpriseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<DocumentFolderKey>(
    companyId ? "companies" : initialFolder
  );
  const [selectedDoc, setSelectedDoc] = useState<EnterpriseDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [versions, setVersions] = useState<EnterpriseDocument[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadProgressState[]>([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [uploaderFilter, setUploaderFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "size" | "name">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [renameValue, setRenameValue] = useState("");
  const [moveFolder, setMoveFolder] = useState<DocumentFolderKey>("other");
  const [actionModal, setActionModal] = useState<"rename" | "move" | null>(null);

  const filters = useMemo<DocumentListFilters>(
    () => ({
      folder: selectedFolder,
      companyId,
      search,
      extension: typeFilter || undefined,
      uploaderId: uploaderFilter || undefined,
      tag: tagFilter || undefined,
      sortBy,
      sortDir,
    }),
    [selectedFolder, companyId, search, typeFilter, uploaderFilter, tagFilter, sortBy, sortDir]
  );

  const uploaders = useMemo(
    () => [...new Set(documents.map((doc) => doc.uploader_id))],
    [documents]
  );

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDocuments(filters);
      setDocuments(data);
      if (selectedDoc && !data.find((doc) => doc.id === selectedDoc.id)) {
        setSelectedDoc(null);
        setPreviewUrl(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [filters, selectedDoc]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    void (async () => {
      if (!selectedDoc) {
        setPreviewUrl(null);
        return;
      }
      try {
        const url = await getSignedDownloadUrl(selectedDoc);
        if (!active) return;
        objectUrl = url;
        setPreviewUrl(url);
      } catch {
        if (active) setPreviewUrl(null);
      }
    })();

    return () => {
      active = false;
      if (objectUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedDoc]);

  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const nextUploads: UploadProgressState[] = fileArray.map((file) => ({
      fileId: crypto.randomUUID(),
      fileName: file.name,
      progress: 0,
      status: "uploading",
    }));
    setUploads(nextUploads);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const uploadId = nextUploads[i].fileId;
      try {
        await uploadDocument(
          {
            file,
            folder: selectedFolder,
            companyId,
            tags: companyId ? ["company"] : [],
            description: companyName ? `${companyName} document` : undefined,
          },
          (progress) => {
            setUploads((prev) =>
              prev.map((item) => (item.fileId === uploadId ? { ...item, progress } : item))
            );
          }
        );
        setUploads((prev) =>
          prev.map((item) =>
            item.fileId === uploadId ? { ...item, progress: 100, status: "completed" } : item
          )
        );
      } catch (err) {
        setUploads((prev) =>
          prev.map((item) =>
            item.fileId === uploadId
              ? {
                  ...item,
                  status: "error",
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : item
          )
        );
      }
    }

    await loadDocuments();
    window.setTimeout(() => setUploads([]), 2500);
  };

  const handleDownload = async (doc: EnterpriseDocument) => {
    const url = await getSignedDownloadUrl(doc);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = doc.filename;
    anchor.click();
  };

  const openVersions = async (doc: EnterpriseDocument) => {
    const history = await getDocumentVersions(doc.document_group_id);
    setVersions(history);
    setShowVersions(true);
  };

  const handleRename = async () => {
    if (!selectedDoc || !renameValue.trim()) return;
    await renameDocument(selectedDoc.id, renameValue.trim());
    setActionModal(null);
    await loadDocuments();
  };

  const handleMove = async () => {
    if (!selectedDoc) return;
    await moveDocument(selectedDoc.id, moveFolder);
    setActionModal(null);
    await loadDocuments();
  };

  const handleCopy = async (doc: EnterpriseDocument) => {
    await copyDocument(doc.id, selectedFolder);
    await loadDocuments();
  };

  const handleDelete = async (doc: EnterpriseDocument) => {
    if (!window.confirm(tr ? "Bu belge silinsin mi?" : "Delete this document?")) return;
    await deleteDocument(doc.id);
    if (selectedDoc?.id === doc.id) {
      setSelectedDoc(null);
      setPreviewUrl(null);
    }
    await loadDocuments();
  };

  const handleNewVersion = async (file: File) => {
    if (!selectedDoc) return;
    await uploadDocumentVersion(selectedDoc.id, file, (progress) => {
      setUploads([
        {
          fileId: selectedDoc.id,
          fileName: file.name,
          progress,
          status: "uploading",
        },
      ]);
    });
    setUploads([]);
    await loadDocuments();
  };

  return (
    <div
      className={`grid gap-4 ${
        compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)_360px]"
      }`}
    >
      {!compact && (
        <aside className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f11] p-3 h-fit">
          <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {tr ? "Klasörler" : "Folders"}
          </p>
          <div className="mt-2 space-y-1">
            {DOCUMENT_FOLDERS.map((folder) => (
              <button
                key={folder.key}
                type="button"
                onClick={() => setSelectedFolder(folder.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                  selectedFolder === folder.key
                    ? "bg-[#1E3A5F]/10 text-[#1E3A5F] dark:text-indigo-300 font-semibold"
                    : "text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900"
                }`}
              >
                <Folder className="w-4 h-4 shrink-0" />
                <span className="truncate">{folderLabel(folder.key, lang)}</span>
              </button>
            ))}
          </div>
        </aside>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f11] overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                {companyName
                  ? `${companyName} ${tr ? "Belgeleri" : "Documents"}`
                  : tr
                    ? "Kurumsal Belgeler"
                    : "Enterprise Documents"}
              </h2>
              <p className="text-xs text-slate-500">
                {tr ? "SharePoint tarzı belge yönetimi" : "SharePoint-style document management"} · {actorName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {compact && (
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value as DocumentFolderKey)}
                  className="text-xs rounded-xl border border-slate-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-900"
                >
                  {DOCUMENT_FOLDERS.map((folder) => (
                    <option key={folder.key} value={folder.key}>
                      {folderLabel(folder.key, lang)}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E3A5F] text-white text-xs font-bold"
              >
                <Upload className="w-4 h-4" />
                {tr ? "Yükle" : "Upload"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept={Array.from(ALLOWED_EXTENSIONS)
                  .map((ext) => `.${ext}`)
                  .join(",")}
                onChange={(e) => {
                  if (e.target.files) void handleUploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr ? "Ara..." : "Search..."}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm bg-white dark:bg-zinc-900"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm rounded-xl border border-slate-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-900"
            >
              <option value="">{tr ? "Tüm tipler" : "All types"}</option>
              {Array.from(ALLOWED_EXTENSIONS).map((ext) => (
                <option key={ext} value={ext}>
                  .{ext}
                </option>
              ))}
            </select>
            <select
              value={uploaderFilter}
              onChange={(e) => setUploaderFilter(e.target.value)}
              className="text-sm rounded-xl border border-slate-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-900"
            >
              <option value="">{tr ? "Tüm yükleyenler" : "All uploaders"}</option>
              {uploaders.map((id) => (
                <option key={id} value={id}>
                  {documents.find((doc) => doc.uploader_id === id)?.uploader_name || id.slice(0, 8)}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "size" | "name")}
                className="flex-1 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-900"
              >
                <option value="date">{tr ? "Tarih" : "Date"}</option>
                <option value="size">{tr ? "Boyut" : "Size"}</option>
                <option value="name">{tr ? "Ad" : "Name"}</option>
              </select>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
                className="w-24 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-900"
              >
                <option value="desc">↓</option>
                <option value="asc">↑</option>
              </select>
            </div>
          </div>
          <input
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder={tr ? "Etiket filtrele" : "Filter by tag"}
            className="w-full text-sm rounded-xl border border-slate-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-900"
          />
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files.length > 0) void handleUploadFiles(e.dataTransfer.files);
          }}
          className={`p-4 min-h-[360px] ${isDragOver ? "bg-[#1E3A5F]/5" : ""}`}
        >
          {uploads.length > 0 && (
            <div className="mb-4 space-y-2">
              {uploads.map((upload) => (
                <div key={upload.fileId} className="rounded-xl border border-slate-200 dark:border-zinc-800 p-3">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium truncate">{upload.fileName}</span>
                    <span>{upload.status === "error" ? upload.error : `${upload.progress}%`}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        upload.status === "error" ? "bg-rose-500" : "bg-[#1E3A5F]"
                      }`}
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {tr ? "Belgeler yükleniyor..." : "Loading documents..."}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Upload className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p>{tr ? "Henüz belge yok. Sürükleyip bırakın veya yükleyin." : "No documents yet. Drag & drop or upload."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  className={`text-left rounded-2xl border p-4 transition-all hover:shadow-sm ${
                    selectedDoc?.id === doc.id
                      ? "border-[#1E3A5F] bg-[#1E3A5F]/5"
                      : "border-slate-200 dark:border-zinc-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                      {isImageExtension(doc.extension) ? (
                        <FileImage className="w-5 h-5 text-emerald-600" />
                      ) : isPdfExtension(doc.extension) ? (
                        <FileText className="w-5 h-5 text-rose-600" />
                      ) : (
                        <File className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-900 dark:text-zinc-100 truncate">{doc.filename}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatFileSize(doc.file_size)} · v{doc.version} · {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">
                        {doc.uploader_name || doc.uploader_id.slice(0, 8)}
                        {doc.tags.length > 0 ? ` · ${doc.tags.join(", ")}` : ""}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {!compact && (
        <aside className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f11] p-4 h-fit xl:sticky xl:top-4">
          {!selectedDoc ? (
            <div className="text-sm text-slate-500 py-16 text-center">
              {tr ? "Önizleme için bir belge seçin" : "Select a document to preview"}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 break-words">{selectedDoc.filename}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {folderLabel(selectedDoc.folder, lang)} · v{selectedDoc.version}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 min-h-[220px] overflow-hidden">
                {previewUrl && isImageExtension(selectedDoc.extension) && (
                  <img src={previewUrl} alt={selectedDoc.filename} className="w-full h-[220px] object-contain" />
                )}
                {previewUrl && isPdfExtension(selectedDoc.extension) && (
                  <iframe src={previewUrl} title={selectedDoc.filename} className="w-full h-[220px]" />
                )}
                {previewUrl && !isImageExtension(selectedDoc.extension) && !isPdfExtension(selectedDoc.extension) && (
                  <div className="h-[220px] flex items-center justify-center text-sm text-slate-500">
                    {tr ? "Bu dosya türü için önizleme yok" : "No preview available for this file type"}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload(selectedDoc)}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  {tr ? "İndir" : "Download"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenameValue(selectedDoc.filename);
                    setActionModal("rename");
                  }}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {tr ? "Yeniden Adlandır" : "Rename"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoveFolder(selectedDoc.folder);
                    setActionModal("move");
                  }}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold"
                >
                  <MoveRight className="w-3.5 h-3.5" />
                  {tr ? "Taşı" : "Move"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy(selectedDoc)}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {tr ? "Kopyala" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => void openVersions(selectedDoc)}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold"
                >
                  <History className="w-3.5 h-3.5" />
                  {tr ? "Sürümler" : "Versions"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(selectedDoc)}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {tr ? "Sil" : "Delete"}
                </button>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-500">{tr ? "Yeni sürüm yükle" : "Upload new version"}</span>
                <input
                  type="file"
                  className="mt-1 block w-full text-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleNewVersion(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
        </aside>
      )}

      {actionModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100">
              {actionModal === "rename"
                ? tr
                  ? "Yeniden Adlandır"
                  : "Rename"
                : tr
                  ? "Taşı"
                  : "Move"}
            </h3>
            {actionModal === "rename" ? (
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 px-3 py-2 text-sm"
              />
            ) : (
              <select
                value={moveFolder}
                onChange={(e) => setMoveFolder(e.target.value as DocumentFolderKey)}
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 px-3 py-2 text-sm"
              >
                {DOCUMENT_FOLDERS.map((folder) => (
                  <option key={folder.key} value={folder.key}>
                    {folderLabel(folder.key, lang)}
                  </option>
                ))}
              </select>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setActionModal(null)} className="px-4 py-2 rounded-xl border text-sm">
                {tr ? "İptal" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => void (actionModal === "rename" ? handleRename() : handleMove())}
                className="px-4 py-2 rounded-xl bg-[#1E3A5F] text-white text-sm font-semibold"
              >
                {tr ? "Kaydet" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{tr ? "Sürüm Geçmişi" : "Version History"}</h3>
              <button type="button" onClick={() => setShowVersions(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-zinc-800 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">v{version.version} · {version.filename}</p>
                    <p className="text-xs text-slate-500">{new Date(version.created_at).toLocaleString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDownload(version)}
                    className="text-xs font-semibold text-[#1E3A5F]"
                  >
                    {tr ? "İndir" : "Download"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
