import type { Company } from '../components/CompaniesView';
import type { Organization } from '../types/organization';

export function canUseCompanyDiscovery(org: Pick<Organization, 'slug' | 'country'> | null): boolean {
  return org?.slug !== 'gembapartner-de' && !['germany', 'almanya', 'deutschland', 'de'].includes((org?.country || '').toLowerCase());
}
export function newCustomerDraft(actor: string, country = 'Türkiye'): Company {
  return { id: `company-${crypto.randomUUID()}`, name: '', phone: '', website: '',
    customerStatus: 'Lead', lifecycleStage: 'Lead', accountOwner: actor, industry: '', billingCountry: country,
    annualRevenueCurrency: ['Germany','Almanya','Deutschland'].includes(country) ? '€' : '₺',
    customFields: {} } as Company;
}
