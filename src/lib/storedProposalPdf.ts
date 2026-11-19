import { listDocuments, getSignedDownloadUrl, getDocumentById } from './enterpriseDocumentService';
import type { EnterpriseDocument } from '../types/enterpriseDocument';
import type { Proposal } from '../types/proposal';

/** Open the saved artifact for this revision, never a newly rendered catalogue. */
export function selectStoredProposalPdf(documents: EnterpriseDocument[], proposal: Pick<Proposal, 'id' | 'currentVersion'>): EnterpriseDocument | undefined {
  const version = proposal.currentVersion.trim().toLowerCase().replace(/^v/, '');
  return documents.filter(doc => {
    if (doc.proposal_id !== proposal.id || doc.is_deleted || doc.extension?.toLowerCase() !== 'pdf') return false;
    const tags = doc.tags || [];
    return tags.some(tag => tag.trim().toLowerCase().replace(/^v/, '') === version)
      || doc.filename.toLowerCase().includes(`_v${version}_`);
  }).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id))[0];
}

export async function loadStoredProposalPdf(proposal: Pick<Proposal, 'id' | 'currentVersion' | 'pdfDocumentLinks'>): Promise<string> {
  const linkedId = proposal.pdfDocumentLinks?.[proposal.currentVersion];
  if (linkedId) {
    const linked = await getDocumentById(linkedId);
    if (!selectStoredProposalPdf([linked], proposal)) {
      throw new Error("Teklifin kayıtlı PDF bağlantısı geçersiz. Başka bir belge gösterilmedi.");
    }
    return getSignedDownloadUrl(linked);
  }
  // Older proposals predate permanent links. Only read their stored revision;
  // never render or upload a replacement when opening a proposal.
  const documents = await listDocuments({ proposalId: proposal.id });
  const document = selectStoredProposalPdf(documents, proposal);
  if (!document) throw new Error(`${proposal.currentVersion} sürümü için kayıtlı teklif PDF’i bulunamadı. Teklif sihirbazından bu sürümün PDF’ini kaydedin.`);
  return getSignedDownloadUrl(document);
}
