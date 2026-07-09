export type DocumentFolderKey =
  | "companies"
  | "proposals"
  | "contracts"
  | "presentations"
  | "technical"
  | "marketing"
  | "finance"
  | "hr"
  | "quality"
  | "other";

export interface EnterpriseDocument {
  id: string;
  organization_id: string;
  company_id: string | null;
  deal_id: string | null;
  proposal_id: string | null;
  uploader_id: string;
  filename: string;
  original_filename: string;
  extension: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  folder: DocumentFolderKey;
  version: number;
  document_group_id: string;
  tags: string[];
  description: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  uploader_name?: string | null;
}

export interface DocumentUploadInput {
  file: File;
  folder: DocumentFolderKey;
  companyId?: string;
  dealId?: string;
  proposalId?: string;
  tags?: string[];
  description?: string;
  documentGroupId?: string;
}

export interface DocumentListFilters {
  folder?: DocumentFolderKey;
  companyId?: string;
  dealId?: string;
  proposalId?: string;
  extension?: string;
  uploaderId?: string;
  tag?: string;
  search?: string;
  sortBy?: "date" | "size" | "name";
  sortDir?: "asc" | "desc";
}

export interface UploadProgressState {
  fileId: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}
