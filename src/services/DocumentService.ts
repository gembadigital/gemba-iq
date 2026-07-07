import { CrmDb, CrmDocument } from "../lib/CrmDb";

export interface DocumentMetadata {
  id: string;
  customerId: string; // matches companyId
  opportunityId?: string; // matches dealId
  proposalId?: string;
  projectId?: string;
  module: string; // "Company" | "Opportunity" | "Proposal" | "Project"
  documentType: string; // e.g. "Proposal", "Contract", "Meeting Notes", "Presentation", "Invoice", "Drawing", "Image", "Spreadsheet", "PDF", "Email Attachment", "Other"
  displayName: string;
  originalFileName: string;
  storageProvider: "LOCAL" | "SHAREPOINT" | "ONEDRIVE" | "AZURE";
  storageStatus: "Pending External Storage" | "Synced" | "Local Only";
  storagePath: string; // Customer / Customer ID / Opportunities / Opportunity ID / Documents / Document Type / File
  storageReference: string; // unique blob ref or GUID
  version: number;
  revision: number;
  fileExtension: string;
  mimeType: string;
  fileSize: string;
  tags: string[];
  uploadedBy: string;
  uploadDate: string;
  lastModified: string;
  deleted: boolean;
  deletedBy?: string;
  deletedDate?: string;
  description?: string;
  comments?: string;
  fileContent?: string; // base64 representation of the file for local preview & download
  isCurrent: boolean;
  parentId?: string; // points to version 1 document id for grouping
}

export interface DocTypeDefinition {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
}

export interface DocumentAuditLog {
  id: string;
  user: string;
  timestamp: string;
  action: "Upload" | "Rename" | "Delete" | "Restore" | "Download" | "Preview" | "Replace" | "Version Created" | "Storage Changed";
  documentId: string;
  documentName: string;
  result: "Success" | "Failure";
  details?: string;
}

const DEFAULT_DOC_TYPES: DocTypeDefinition[] = [
  { id: "dt-1", name: "Proposal", description: "Müşteri teklif dosyaları ve sunumları", isCustom: false },
  { id: "dt-2", name: "Contract", description: "Resmi sözleşmeler, NDA ve protokoller", isCustom: false },
  { id: "dt-3", name: "Meeting Notes", description: "Gemba yürüyüşü, toplantı ve mülakat notları", isCustom: false },
  { id: "dt-4", name: "Presentation", description: "Yalın dönüşüm ve eğitim sunumları", isCustom: false },
  { id: "dt-5", name: "Invoice", description: "Hizmet faturaları ve bütçe planları", isCustom: false },
  { id: "dt-6", name: "Drawing", description: "Yerleşim planları, akış şemaları ve çizimler", isCustom: false },
  { id: "dt-7", name: "Image", description: "Saha fotoğrafları, israf tespit görselleri", isCustom: false },
  { id: "dt-8", name: "Spreadsheet", description: "Kalkülasyonlar, VSM verileri ve analiz tabloları", isCustom: false },
  { id: "dt-9", name: "PDF", description: "Dışarıdan gelen genel PDF dökümanları", isCustom: false },
  { id: "dt-10", name: "Email Attachment", description: "E-posta ile iletilen ek belgeler", isCustom: false },
  { id: "dt-11", name: "Other", description: "Diğer kategorize edilmemiş belgeler", isCustom: false },
];

export const DocumentService = {
  // -------------------------------------------------------------
  // RETRIEVE ALL DOCUMENTS (METADATA)
  // -------------------------------------------------------------
  getDocuments(): DocumentMetadata[] {
    const saved = localStorage.getItem("enterprise_documents");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading enterprise documents", e);
      }
    }
    
    // Seed initial documents based on CrmDb.getDocuments() to keep parity
    const crmDocs = CrmDb.getDocuments();
    const initialDocs: DocumentMetadata[] = crmDocs.map(d => {
      const ext = d.name.split(".").pop() || "pdf";
      return {
        id: d.id,
        customerId: d.companyId,
        opportunityId: d.dealId,
        proposalId: d.proposalId,
        projectId: d.projectId,
        module: d.proposalId ? "Proposal" : d.dealId ? "Opportunity" : "Company",
        documentType: d.type === "Proposal" ? "Proposal" : d.type === "Invoice" ? "Invoice" : "Other",
        displayName: d.name,
        originalFileName: d.name,
        storageProvider: "LOCAL",
        storageStatus: "Pending External Storage",
        storagePath: `Customer/${d.companyId}/Documents/${d.name}`,
        storageReference: `ref-${d.id}`,
        version: 1,
        revision: 0,
        fileExtension: ext,
        mimeType: ext === "pdf" ? "application/pdf" : "application/octet-stream",
        fileSize: d.size,
        tags: ["Migration", d.type],
        uploadedBy: "System Migrator",
        uploadDate: d.date,
        lastModified: d.date,
        deleted: false,
        isCurrent: true,
        fileContent: "", // empty placeholder
        description: "Migrated from standard CRM repository."
      };
    });
    localStorage.setItem("enterprise_documents", JSON.stringify(initialDocs));
    return initialDocs;
  },

  saveDocuments(docs: DocumentMetadata[]) {
    localStorage.setItem("enterprise_documents", JSON.stringify(docs));
    
    // Re-sync with CrmDb for backward compatibility so other views still see them
    const activeCrmDocs: CrmDocument[] = docs
      .filter(d => !d.deleted && d.isCurrent)
      .map(d => ({
        id: d.id,
        companyId: d.customerId,
        dealId: d.opportunityId,
        proposalId: d.proposalId,
        projectId: d.projectId,
        name: d.displayName,
        type: d.documentType,
        size: d.fileSize,
        date: d.uploadDate,
        link: "#",
        content: d.fileContent
      }));
    localStorage.setItem("crm_documents", JSON.stringify(activeCrmDocs));
  },

  // Get active documents for a company
  getDocumentsByCompany(companyId: string, includeDeleted = false): DocumentMetadata[] {
    return this.getDocuments().filter(d => 
      d.customerId === companyId && 
      (includeDeleted ? true : !d.deleted)
    );
  },

  // -------------------------------------------------------------
  // CENTRALIZED UPLOAD HANDLER
  // -------------------------------------------------------------
  async uploadDocument(params: {
    customerId: string;
    opportunityId?: string;
    proposalId?: string;
    projectId?: string;
    module: string;
    documentType: string;
    displayName: string;
    originalFileName: string;
    fileSize: string;
    fileExtension: string;
    mimeType: string;
    fileContent: string; // base64 string
    uploadedBy: string;
    description?: string;
    tags?: string[];
    comments?: string;
    customStorageProvider?: "LOCAL" | "SHAREPOINT" | "ONEDRIVE" | "AZURE";
  }): Promise<DocumentMetadata> {
    const docs = this.getDocuments();

    // Check if cloud storage provider is configured and set as active default
    let selectedProvider: "LOCAL" | "SHAREPOINT" | "ONEDRIVE" | "AZURE" = "LOCAL";
    let storageStatus: "Pending External Storage" | "Synced" | "Local Only" = "Pending External Storage";

    const savedConnections = localStorage.getItem("admin_data_hub_connections");
    if (savedConnections) {
      try {
        const conns = JSON.parse(savedConnections);
        // Find if there is any enabled and default storage provider
        const activeDefault = conns.find((c: any) => c.enabled && c.defaultStorage);
        if (activeDefault) {
          if (activeDefault.provider.includes("SharePoint")) {
            selectedProvider = "SHAREPOINT";
            storageStatus = "Synced";
          } else if (activeDefault.provider.includes("OneDrive")) {
            selectedProvider = "ONEDRIVE";
            storageStatus = "Synced";
          } else if (activeDefault.provider.includes("Azure")) {
            selectedProvider = "AZURE";
            storageStatus = "Synced";
          }
        }
      } catch (err) {
        console.error("Error reading storage connections during upload:", err);
      }
    }

    if (params.customStorageProvider) {
      selectedProvider = params.customStorageProvider;
      storageStatus = selectedProvider === "LOCAL" ? "Pending External Storage" : "Synced";
    }

    // Abstract storage path builder
    const oppPathSegment = params.opportunityId ? `/Opportunities/${params.opportunityId}` : "";
    const propPathSegment = params.proposalId ? `/Proposals/${params.proposalId}` : "";
    const storagePath = `Customer/${params.customerId}${oppPathSegment}${propPathSegment}/Documents/${params.documentType}/${params.originalFileName}`;
    const storageReference = `${selectedProvider.toLowerCase()}-blob-${Math.floor(Math.random() * 900000 + 100000)}`;

    const dateStr = new Date().toISOString().split("T")[0];

    // VERSION MANAGEMENT: Look for existing non-deleted documents of same customer, module, and displayName or originalFileName
    const existingMatch = docs.find(d => 
      !d.deleted &&
      d.customerId === params.customerId &&
      d.module === params.module &&
      d.displayName.toLowerCase().trim() === params.displayName.toLowerCase().trim() &&
      d.isCurrent
    );

    let nextVersion = 1;
    let parentId: string | undefined;

    if (existingMatch) {
      nextVersion = existingMatch.version + 1;
      parentId = existingMatch.parentId || existingMatch.id;
      
      // Mark old version as no longer current
      existingMatch.isCurrent = false;
      existingMatch.lastModified = dateStr;

      this.logAction({
        user: params.uploadedBy,
        action: "Version Created",
        documentId: existingMatch.id,
        documentName: params.displayName,
        result: "Success",
        details: `Created version ${nextVersion} to replace version ${existingMatch.version}.`
      });
    }

    const newDoc: DocumentMetadata = {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerId: params.customerId,
      opportunityId: params.opportunityId,
      proposalId: params.proposalId,
      projectId: params.projectId,
      module: params.module,
      documentType: params.documentType,
      displayName: params.displayName,
      originalFileName: params.originalFileName,
      storageProvider: selectedProvider,
      storageStatus,
      storagePath,
      storageReference,
      version: nextVersion,
      revision: 0,
      fileExtension: params.fileExtension,
      mimeType: params.mimeType,
      fileSize: params.fileSize,
      tags: params.tags || [],
      uploadedBy: params.uploadedBy,
      uploadDate: dateStr,
      lastModified: dateStr,
      deleted: false,
      isCurrent: true,
      parentId,
      description: params.description || "",
      comments: params.comments || "",
      fileContent: params.fileContent
    };

    docs.unshift(newDoc);
    this.saveDocuments(docs);

    // Audit logs
    this.logAction({
      user: params.uploadedBy,
      action: "Upload",
      documentId: newDoc.id,
      documentName: newDoc.displayName,
      result: "Success",
      details: `Uploaded to ${selectedProvider} in Mode: ${selectedProvider === "LOCAL" ? "Local Metadata" : "External"}`
    });

    // Write to CRM activities timeline too
    CrmDb.createActivity({
      companyId: params.customerId,
      dealId: params.opportunityId,
      proposalId: params.proposalId,
      projectId: params.projectId,
      type: "system",
      title: `Belge Yüklendi (v${nextVersion}): ${newDoc.displayName}`,
      description: `Merkezi Depo üzerinden '${newDoc.documentType}' kategorisinde belge eklendi. Depolama Kanalı: ${selectedProvider}.`,
      user: params.uploadedBy
    });

    return newDoc;
  },

  // -------------------------------------------------------------
  // UPDATE DOCUMENT METADATA (RENAME, MOVE, MODIFY TAGS / COMMENTS)
  // -------------------------------------------------------------
  updateDocument(id: string, updates: Partial<DocumentMetadata>, user: string): DocumentMetadata {
    const docs = this.getDocuments();
    const docIndex = docs.findIndex(d => d.id === id);
    if (docIndex === -1) {
      throw new Error("Document not found");
    }

    const original = docs[docIndex];
    const isRename = updates.displayName && updates.displayName !== original.displayName;
    const isMove = updates.opportunityId !== undefined || updates.proposalId !== undefined || updates.projectId !== undefined;

    const updated = {
      ...original,
      ...updates,
      lastModified: new Date().toISOString().split("T")[0]
    };

    docs[docIndex] = updated;
    this.saveDocuments(docs);

    if (isRename) {
      this.logAction({
        user,
        action: "Rename",
        documentId: id,
        documentName: updated.displayName,
        result: "Success",
        details: `Renamed from '${original.displayName}' to '${updated.displayName}'`
      });
    }

    if (isMove) {
      this.logAction({
        user,
        action: "Replace",
        documentId: id,
        documentName: updated.displayName,
        result: "Success",
        details: `Moved document structure to Opportunity: ${updated.opportunityId || "None"}, Proposal: ${updated.proposalId || "None"}`
      });
    }

    return updated;
  },

  // -------------------------------------------------------------
  // SOFT DELETE & RESTORE ACTIONS
  // -------------------------------------------------------------
  deleteDocument(id: string, user: string): boolean {
    const docs = this.getDocuments();
    const doc = docs.find(d => d.id === id);
    if (!doc) return false;

    doc.deleted = true;
    doc.deletedBy = user;
    doc.deletedDate = new Date().toISOString().split("T")[0];

    this.saveDocuments(docs);

    this.logAction({
      user,
      action: "Delete",
      documentId: id,
      documentName: doc.displayName,
      result: "Success",
      details: "Soft deleted from document workspace."
    });

    CrmDb.createActivity({
      companyId: doc.customerId,
      dealId: doc.opportunityId,
      proposalId: doc.proposalId,
      projectId: doc.projectId,
      type: "system",
      title: `Belge Silindi: ${doc.displayName}`,
      description: `${user} tarafından belge çöp kutusuna taşındı (Soft Delete).`,
      user
    });

    return true;
  },

  restoreDocument(id: string, user: string): boolean {
    const docs = this.getDocuments();
    const doc = docs.find(d => d.id === id);
    if (!doc) return false;

    doc.deleted = false;
    doc.deletedBy = undefined;
    doc.deletedDate = undefined;

    this.saveDocuments(docs);

    this.logAction({
      user,
      action: "Restore",
      documentId: id,
      documentName: doc.displayName,
      result: "Success",
      details: "Restored document back to active workspace."
    });

    CrmDb.createActivity({
      companyId: doc.customerId,
      dealId: doc.opportunityId,
      proposalId: doc.proposalId,
      projectId: doc.projectId,
      type: "system",
      title: `Belge Geri Yüklendi: ${doc.displayName}`,
      description: `${user} tarafından belge arşivden kurtarıldı.`,
      user
    });

    return true;
  },

  // -------------------------------------------------------------
  // DOWNLOAD & PREVIEW TRIGGER RECORDING
  // -------------------------------------------------------------
  recordDownload(id: string, user: string) {
    const doc = this.getDocuments().find(d => d.id === id);
    if (doc) {
      this.logAction({
        user,
        action: "Download",
        documentId: id,
        documentName: doc.displayName,
        result: "Success",
        details: `Downloaded file from storage channel ${doc.storageProvider}`
      });
    }
  },

  recordPreview(id: string, user: string) {
    const doc = this.getDocuments().find(d => d.id === id);
    if (doc) {
      this.logAction({
        user,
        action: "Preview",
        documentId: id,
        documentName: doc.displayName,
        result: "Success",
        details: `Previewed file content inside CRM inline view`
      });
    }
  },

  // -------------------------------------------------------------
  // DOCUMENT VERSION HISTORY RETRIEVER
  // -------------------------------------------------------------
  getVersionHistory(documentId: string): DocumentMetadata[] {
    const allDocs = this.getDocuments();
    const target = allDocs.find(d => d.id === documentId);
    if (!target) return [];

    const rootId = target.parentId || target.id;
    // Find all documents that have this rootId OR are the root document
    return allDocs
      .filter(d => d.id === rootId || d.parentId === rootId)
      .sort((a, b) => b.version - a.version); // newest first
  },

  // -------------------------------------------------------------
  // DOCUMENT CATEGORY CUSTOMIZATIONS
  // -------------------------------------------------------------
  getDocTypes(): DocTypeDefinition[] {
    const saved = localStorage.getItem("enterprise_doc_types");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading custom doc types", e);
      }
    }
    localStorage.setItem("enterprise_doc_types", JSON.stringify(DEFAULT_DOC_TYPES));
    return DEFAULT_DOC_TYPES;
  },

  addDocType(name: string, description: string): DocTypeDefinition {
    const types = this.getDocTypes();
    const cleanName = name.trim();
    const existing = types.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) return existing;

    const newType: DocTypeDefinition = {
      id: `dt-${Date.now()}`,
      name: cleanName,
      description,
      isCustom: true
    };
    types.push(newType);
    localStorage.setItem("enterprise_doc_types", JSON.stringify(types));
    return newType;
  },

  deleteDocType(id: string): boolean {
    const types = this.getDocTypes();
    const target = types.find(t => t.id === id);
    if (!target || !target.isCustom) return false;

    const filtered = types.filter(t => t.id !== id);
    localStorage.setItem("enterprise_doc_types", JSON.stringify(filtered));
    return true;
  },

  // -------------------------------------------------------------
  // AUDIT LOG SERVICE
  // -------------------------------------------------------------
  getAuditLogs(): DocumentAuditLog[] {
    const saved = localStorage.getItem("enterprise_doc_audit_logs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing enterprise doc audit logs", e);
      }
    }
    return [];
  },

  logAction(log: Omit<DocumentAuditLog, "id" | "timestamp">) {
    const logs = this.getAuditLogs();
    const newLog: DocumentAuditLog = {
      ...log,
      id: `doclog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19)
    };
    logs.unshift(newLog);
    localStorage.setItem("enterprise_doc_audit_logs", JSON.stringify(logs.slice(0, 1000))); // Cap at 1000 logs
  }
};
