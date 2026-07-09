import { getSupabase } from "./supabaseClient";
import { getActiveOrganizationId } from "./OrganizationContext";
import {
  DOCUMENTS_BUCKET,
  getExtension,
  getMimeType,
  sanitizeFilename,
  validateUploadFile,
} from "./documentConstants";
import type {
  DocumentFolderKey,
  DocumentListFilters,
  DocumentUploadInput,
  EnterpriseDocument,
} from "../types/enterpriseDocument";

async function requireClient() {
  const client = getSupabase();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }
  return client;
}

async function requireOrgId(): Promise<string> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error("No active organization found.");
  }
  return orgId;
}

async function requireUserId(): Promise<string> {
  const client = await requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("You must be signed in to manage documents.");
  }
  return user.id;
}

function buildStoragePath(
  organizationId: string,
  folder: DocumentFolderKey,
  documentGroupId: string,
  version: number,
  filename: string
): string {
  return `${organizationId}/${folder}/${documentGroupId}/v${version}_${sanitizeFilename(filename)}`;
}

function applyFilters(documents: EnterpriseDocument[], filters: DocumentListFilters): EnterpriseDocument[] {
  let result = [...documents];

  if (filters.folder) {
    result = result.filter((doc) => doc.folder === filters.folder);
  }
  if (filters.companyId) {
    result = result.filter((doc) => doc.company_id === filters.companyId);
  }
  if (filters.dealId) {
    result = result.filter((doc) => doc.deal_id === filters.dealId);
  }
  if (filters.proposalId) {
    result = result.filter((doc) => doc.proposal_id === filters.proposalId);
  }
  if (filters.extension) {
    result = result.filter((doc) => doc.extension === filters.extension.toLowerCase());
  }
  if (filters.uploaderId) {
    result = result.filter((doc) => doc.uploader_id === filters.uploaderId);
  }
  if (filters.tag) {
    const tag = filters.tag.toLowerCase();
    result = result.filter((doc) => doc.tags.some((item) => item.toLowerCase().includes(tag)));
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (doc) =>
        doc.filename.toLowerCase().includes(q) ||
        doc.original_filename.toLowerCase().includes(q) ||
        (doc.description || "").toLowerCase().includes(q) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  const sortBy = filters.sortBy || "date";
  const sortDir = filters.sortDir || "desc";
  result.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") cmp = a.filename.localeCompare(b.filename);
    else if (sortBy === "size") cmp = a.file_size - b.file_size;
    else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Keep only latest version per document group in main list
  const latestByGroup = new Map<string, EnterpriseDocument>();
  for (const doc of result) {
    const existing = latestByGroup.get(doc.document_group_id);
    if (!existing || doc.version > existing.version) {
      latestByGroup.set(doc.document_group_id, doc);
    }
  }

  return Array.from(latestByGroup.values()).sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") cmp = a.filename.localeCompare(b.filename);
    else if (sortBy === "size") cmp = a.file_size - b.file_size;
    else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortDir === "asc" ? cmp : -cmp;
  });
}

export async function listDocuments(filters: DocumentListFilters = {}): Promise<EnterpriseDocument[]> {
  const client = await requireClient();
  const organizationId = await requireOrgId();

  const { data, error } = await client
    .from("documents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const docs = (data as EnterpriseDocument[]) || [];
  const uploaderIds = [...new Set(docs.map((doc) => doc.uploader_id))];
  if (uploaderIds.length > 0) {
    const { data: profiles } = await client
      .from("profiles")
      .select("id, full_name")
      .in("id", uploaderIds);
    const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));
    docs.forEach((doc) => {
      doc.uploader_name = profileMap.get(doc.uploader_id) || null;
    });
  }

  return applyFilters(docs, filters);
}

export async function getDocumentVersions(documentGroupId: string): Promise<EnterpriseDocument[]> {
  const client = await requireClient();
  const organizationId = await requireOrgId();

  const { data, error } = await client
    .from("documents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("document_group_id", documentGroupId)
    .eq("is_deleted", false)
    .order("version", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as EnterpriseDocument[]) || [];
}

export async function uploadDocument(
  input: DocumentUploadInput,
  onProgress?: (progress: number) => void
): Promise<EnterpriseDocument> {
  const validationError = validateUploadFile(input.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const client = await requireClient();
  const organizationId = await requireOrgId();
  const uploaderId = await requireUserId();

  let documentGroupId = input.documentGroupId || crypto.randomUUID();
  let version = 1;

  if (input.documentGroupId) {
    const versions = await getDocumentVersions(input.documentGroupId);
    version = (versions[0]?.version || 0) + 1;
  }

  const extension = getExtension(input.file.name);
  const mimeType = input.file.type || getMimeType(input.file.name);
  const storagePath = buildStoragePath(
    organizationId,
    input.folder,
    documentGroupId,
    version,
    input.file.name
  );

  onProgress?.(10);
  const { error: uploadError } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeType,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  onProgress?.(80);

  const payload = {
    organization_id: organizationId,
    company_id: input.companyId || null,
    deal_id: input.dealId || null,
    proposal_id: input.proposalId || null,
    uploader_id: uploaderId,
    filename: input.file.name,
    original_filename: input.file.name,
    extension,
    mime_type: mimeType,
    file_size: input.file.size,
    storage_path: storagePath,
    folder: input.folder,
    version,
    document_group_id: documentGroupId,
    tags: input.tags || [],
    description: input.description || null,
    is_deleted: false,
  };

  const { data, error } = await client.from("documents").insert(payload).select("*").single();
  if (error) {
    await client.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  onProgress?.(100);
  return data as EnterpriseDocument;
}

export async function uploadBlobDocument(params: {
  blob: Blob;
  filename: string;
  folder: DocumentFolderKey;
  companyId?: string;
  dealId?: string;
  proposalId?: string;
  tags?: string[];
  description?: string;
}): Promise<EnterpriseDocument> {
  const file = new File([params.blob], params.filename, {
    type: params.blob.type || getMimeType(params.filename),
  });
  return uploadDocument({
    file,
    folder: params.folder,
    companyId: params.companyId,
    dealId: params.dealId,
    proposalId: params.proposalId,
    tags: params.tags,
    description: params.description,
  });
}

export async function getSignedDownloadUrl(document: EnterpriseDocument, expiresIn = 3600): Promise<string> {
  const client = await requireClient();
  const { data, error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(document.storage_path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Failed to create download URL.");
  }

  return data.signedUrl;
}

export async function renameDocument(documentId: string, newFilename: string): Promise<EnterpriseDocument> {
  const client = await requireClient();
  const trimmed = newFilename.trim();
  if (!trimmed) {
    throw new Error("Filename is required.");
  }

  const { data, error } = await client
    .from("documents")
    .update({ filename: trimmed })
    .eq("id", documentId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as EnterpriseDocument;
}

export async function updateDocumentMetadata(
  documentId: string,
  updates: { description?: string; tags?: string[] }
): Promise<EnterpriseDocument> {
  const client = await requireClient();
  const { data, error } = await client
    .from("documents")
    .update(updates)
    .eq("id", documentId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as EnterpriseDocument;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const client = await requireClient();

  const { error } = await client
    .from("documents")
    .update({ is_deleted: true })
    .eq("id", documentId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function moveDocument(documentId: string, targetFolder: DocumentFolderKey): Promise<EnterpriseDocument> {
  const client = await requireClient();
  const organizationId = await requireOrgId();

  const { data: doc, error: fetchError } = await client
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error(fetchError?.message || "Document not found.");
  }

  const current = doc as EnterpriseDocument;
  const newPath = buildStoragePath(
    organizationId,
    targetFolder,
    current.document_group_id,
    current.version,
    current.filename
  );

  const { error: moveError } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .move(current.storage_path, newPath);

  if (moveError) {
    throw new Error(moveError.message);
  }

  const { data, error } = await client
    .from("documents")
    .update({ folder: targetFolder, storage_path: newPath })
    .eq("id", documentId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as EnterpriseDocument;
}

export async function copyDocument(
  documentId: string,
  targetFolder?: DocumentFolderKey
): Promise<EnterpriseDocument> {
  const client = await requireClient();
  const organizationId = await requireOrgId();
  const uploaderId = await requireUserId();

  const { data: doc, error: fetchError } = await client
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error(fetchError?.message || "Document not found.");
  }

  const source = doc as EnterpriseDocument;
  const folder = targetFolder || source.folder;
  const newGroupId = crypto.randomUUID();
  const copyName = source.filename.replace(/(\.[^.]+)?$/, " (copy)$1");
  const storagePath = buildStoragePath(organizationId, folder, newGroupId, 1, copyName);

  const { data: downloaded, error: downloadError } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .download(source.storage_path);

  if (downloadError || !downloaded) {
    throw new Error(downloadError?.message || "Failed to download source document.");
  }

  const { error: uploadError } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, downloaded, {
      cacheControl: "3600",
      upsert: false,
      contentType: source.mime_type,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await client
    .from("documents")
    .insert({
      organization_id: organizationId,
      company_id: source.company_id,
      deal_id: source.deal_id,
      proposal_id: source.proposal_id,
      uploader_id: uploaderId,
      filename: copyName,
      original_filename: source.original_filename,
      extension: source.extension,
      mime_type: source.mime_type,
      file_size: source.file_size,
      storage_path: storagePath,
      folder,
      version: 1,
      document_group_id: newGroupId,
      tags: source.tags,
      description: source.description,
      is_deleted: false,
    })
    .select("*")
    .single();

  if (error) {
    await client.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  return data as EnterpriseDocument;
}

export async function uploadDocumentVersion(
  documentId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<EnterpriseDocument> {
  const client = await requireClient();
  const { data: doc, error } = await client.from("documents").select("*").eq("id", documentId).single();
  if (error || !doc) {
    throw new Error(error?.message || "Document not found.");
  }

  const current = doc as EnterpriseDocument;
  return uploadDocument(
    {
      file,
      folder: current.folder,
      companyId: current.company_id || undefined,
      dealId: current.deal_id || undefined,
      proposalId: current.proposal_id || undefined,
      tags: current.tags,
      description: current.description || undefined,
      documentGroupId: current.document_group_id,
    },
    onProgress
  );
}

export async function findProposalDocument(proposalId: string): Promise<EnterpriseDocument | null> {
  const client = await requireClient();
  const organizationId = await requireOrgId();

  const { data, error } = await client
    .from("documents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("proposal_id", proposalId)
    .eq("folder", "proposals")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as EnterpriseDocument) || null;
}

export async function saveProposalPdfDocument(params: {
  blob: Blob;
  proposalId: string;
  companyId?: string;
  proposalNumber: string;
  companyName: string;
}): Promise<EnterpriseDocument | null> {
  try {
    const existing = await findProposalDocument(params.proposalId);
    if (existing) {
      return existing;
    }

    const filename = `Proposal_${params.proposalNumber}_${params.companyName.replace(/[^a-zA-Z0-9_-]+/g, "_")}.pdf`;
    return await uploadBlobDocument({
      blob: params.blob,
      filename,
      folder: "proposals",
      companyId: params.companyId,
      proposalId: params.proposalId,
      tags: ["proposal", "auto-generated"],
      description: `Auto-generated proposal PDF for ${params.companyName}`,
    });
  } catch (err) {
    console.error("Failed to auto-save proposal PDF:", err);
    return null;
  }
}
