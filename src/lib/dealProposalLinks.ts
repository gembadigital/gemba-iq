import type { Proposal } from '../types/proposal';
type DealReference = { id: string; companyId?: string; proposalNumber?: string };
/** Stable deal IDs take precedence. Same-company proposals are not all the same opportunity. */
export function relatedDealProposals(proposals: Proposal[], deal: DealReference, includeDeleted = false): Proposal[] {
  return proposals.filter(p => {
    if (!includeDeleted && p.isDeleted) return false;
    if (p.companyId && deal.companyId && p.companyId !== deal.companyId) return false;
    if (p.dealId) return p.dealId === deal.id;
    return Boolean(deal.proposalNumber && p.proposalNumber === deal.proposalNumber);
  }).sort((a,b) => Number(b.proposalNumber === deal.proposalNumber) - Number(a.proposalNumber === deal.proposalNumber) || (b.date || '').localeCompare(a.date || ''));
}
