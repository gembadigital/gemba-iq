import type { DocumentFolderKey } from "../types/enterpriseDocument";

export const DOCUMENTS_BUCKET = "organization-documents";
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "csv",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "zip",
]);

export const DOCUMENT_FOLDERS: Array<{
  key: DocumentFolderKey;
  labelEN: string;
  labelTR: string;
}> = [
  { key: "companies", labelEN: "Company Documents", labelTR: "Şirket Belgeleri" },
  { key: "proposals", labelEN: "Proposals", labelTR: "Teklifler" },
  { key: "contracts", labelEN: "Contracts", labelTR: "Sözleşmeler" },
  { key: "presentations", labelEN: "Presentations", labelTR: "Sunumlar" },
  { key: "technical", labelEN: "Technical Files", labelTR: "Teknik Dosyalar" },
  { key: "marketing", labelEN: "Marketing", labelTR: "Pazarlama" },
  { key: "finance", labelEN: "Financial", labelTR: "Finans" },
  { key: "hr", labelEN: "HR", labelTR: "İK" },
  { key: "quality", labelEN: "Quality", labelTR: "Kalite" },
  { key: "other", labelEN: "Other", labelTR: "Diğer" },
];

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  zip: "application/zip",
};

export function getExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  return parts.pop()!.toLowerCase();
}

export function getMimeType(filename: string, fallback?: string): string {
  const ext = getExtension(filename);
  return MIME_BY_EXTENSION[ext] || fallback || "application/octet-stream";
}

export function validateUploadFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File exceeds the 100 MB upload limit.";
  }
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `File type .${ext || "unknown"} is not allowed.`;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageExtension(ext: string): boolean {
  return ["png", "jpg", "jpeg", "webp"].includes(ext.toLowerCase());
}

export function isPdfExtension(ext: string): boolean {
  return ext.toLowerCase() === "pdf";
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
}

export function folderLabel(key: DocumentFolderKey, lang: "TR" | "EN"): string {
  const folder = DOCUMENT_FOLDERS.find((item) => item.key === key);
  if (!folder) return key;
  return lang === "TR" ? folder.labelTR : folder.labelEN;
}
