import React, { useState } from "react";
import { Company, CustomFieldDefinition } from "./CompaniesView";
import { useLanguage } from "../lib/LanguageContext";
import { getSystemCurrency } from "../lib/currencyHelper";
import { CrmDb } from "../lib/CrmDb";
import {
  Building,
  Phone,
  Globe,
  DollarSign,
  Users,
  Briefcase,
  Clock,
  Layers,
  Edit2,
  Trash2,
  Mail,
  Paperclip,
  Award,
  ArrowLeft,
  X,
  FileCheck2
} from "lucide-react";

// Sub-tabs modular components imports
import CompanyOverviewTab from "./company-tabs/CompanyOverviewTab";
import CompanyContactsTab from "./company-tabs/CompanyContactsTab";
import CompanyTimelineTab from "./company-tabs/CompanyTimelineTab";
import CompanyEmailsTab from "./company-tabs/CompanyEmailsTab";
import CompanyDocumentsTab from "./company-tabs/CompanyDocumentsTab";
import CompanyOpexTab from "./company-tabs/CompanyOpexTab";
import CompanyRevenueTab from "./company-tabs/CompanyRevenueTab";

export interface CompanyDetailViewProps {
  company: Company;
  onClose: () => void;
  onUpdateCompany: (updated: Company, fieldChanged?: string, oldValue?: string, newValue?: string) => void;
  onDeleteCompany?: (id: string, name: string) => void;
  onOpenEditForm?: (company: Company) => void;
  customFieldDefs: CustomFieldDefinition[];
  lang: "TR" | "EN";
  showCloseButtonOnly?: boolean; // If true, renders an 'X' close button instead of 'Back to List'
}

export default function CompanyDetailView({
  company,
  onClose,
  onUpdateCompany,
  onDeleteCompany,
  onOpenEditForm,
  customFieldDefs,
  lang,
  showCloseButtonOnly = false
}: CompanyDetailViewProps) {
  const [detailTab, setDetailTab] = useState("overview");
  const { t } = useLanguage();

  // Localization utilities for database fields
  const getTranslatedValue = (value: string | undefined, field: string) => {
    if (!value) return t("Not specified");
    if (lang !== "TR") return value;
    
    const translations: { [key: string]: string } = {
      // Status
      "Prospect": "Potansiyel Müşteri",
      "Active Customer": "Aktif Müşteri",
      "Existing Customer": "Mevcut Müşteri",
      "Inactive": "Pasif",
      "Lost Customer": "Kaybedilen Müşteri",
      "Former Customer": "Eski Müşteri",
      "Archived": "Arşivlenmiş",
      "Implementation": "Kurulum Aşamasında",
      "Nurturing": "Yenileme Takibinde",
      "Lead": "Aday Müşteri",
      "Customer": "Müşteri",
      "Subscriber": "Takipçi",
      "Opportunity": "Satış Fırsatı",
      "Evangelist": "Marka Elçisi"
    };
    return translations[value] || value;
  };

  // Sync state if selectedCompany properties are modified inside sub-tabs
  const handleUpdateCompanyDirect = (
    updated: Company,
    fieldChanged?: string,
    oldValue?: string,
    newValue?: string
  ) => {
    // 1. Update the CRM DB
    const allCompanies = CrmDb.getCompanies();
    const index = allCompanies.findIndex(c => c.id === updated.id);
    if (index !== -1) {
      allCompanies[index] = updated;
      CrmDb.saveCompanies(allCompanies);
    }

    // 2. Log system audit if changed
    if (fieldChanged && oldValue !== newValue) {
      const key = `crm_company_audit_logs_${updated.id}`;
      const logs = CrmDb.getKv<any[]>(key, []);
      logs.unshift({
        id: `audit-${Date.now()}`,
        field: fieldChanged,
        oldValue: oldValue || "N/A",
        newValue: newValue || "N/A",
        user: "Atakan Zehir",
        timestamp: new Date().toISOString()
      });
      CrmDb.setKv(key, logs);
    }

    // 3. Notify parent component
    onUpdateCompany(updated, fieldChanged, oldValue, newValue);
  };

  // Timeline logged activities helper
  const handleLogTimelineDirect = (title: string, desc: string, type: any) => {
    CrmDb.createActivity({
      companyId: company.id,
      title,
      description: desc,
      type,
      date: new Date().toLocaleDateString("tr-TR"),
      user: "Atakan Zehir"
    });
  };

  return (
    <div className="bg-[#FAF9F8] dark:bg-[#0B0B0C] min-h-screen p-5 rounded-2xl border border-slate-100 dark:border-zinc-900/60 shadow-lg space-y-4 animate-slideIn">
      
      {/* Header Action breadcrumb */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-900/60 pb-4">
        
        <div className="flex items-start gap-3 w-full md:w-auto">
          {showCloseButtonOnly ? (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
              title={t("Close")}
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
              title={t("Back to Registry")}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white font-display">
                {company.name}
              </h2>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${
                company.customerStatus === "Active Customer" || company.customerStatus === "Existing Customer"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                  : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400"
              }`}>
                {getTranslatedValue(company.customerStatus, "customerStatus")}
              </span>
              <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 rounded font-bold text-[9px] font-mono">
                {company.accountOwner}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-455 dark:text-zinc-400 font-sans">
              {company.website && (
                <a href={`https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#0078D4] hover:underline font-mono text-[#0078D4]">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{company.website}</span>
                </a>
              )}
              {company.phone && (
                <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{company.phone}</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{company.industry} • {company.sector || "General"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick action triggers */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto md:ml-0">
          {onOpenEditForm && (
            <button
              type="button"
              onClick={() => onOpenEditForm(company)}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-205 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors text-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{t("Edit Company Profile")}</span>
            </button>
          )}

          {onDeleteCompany && (
            <button
              type="button"
              onClick={() => onDeleteCompany(company.id, company.name)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t("Remove Company")}</span>
            </button>
          )}
        </div>

      </div>

      {/* CRM Navigation Tabs selectors (10 TAB) */}
      <div className="overflow-x-auto border-b border-slate-100 dark:border-zinc-900/60 pb-1 flex items-center gap-1 scrollbar-thin z-10 sticky top-0 bg-[#FAF9F8] dark:bg-[#0B0B0C] pt-1">
        {[
          { id: "overview", label: t("Overview"), icon: <Building className="w-3.5 h-3.5" /> },
          { id: "contacts", label: t("Contacts"), icon: <Users className="w-3.5 h-3.5" /> },
          { id: "activities", label: t("Activities Feed"), icon: <Clock className="w-3.5 h-3.5" /> },
          { id: "opportunities", label: t("Opportunities"), icon: <Briefcase className="w-3.5 h-3.5" /> },
          { id: "proposals", label: t("Proposals"), icon: <FileCheck2 className="w-3.5 h-3.5" /> },
          { id: "emails", label: t("Emails Hub"), icon: <Mail className="w-3.5 h-3.5" /> },
          { id: "documents", label: t("Documents"), icon: <Paperclip className="w-3.5 h-3.5" /> },
          { id: "opex", label: t("Lean Opex Matrix"), icon: <Award className="w-3.5 h-3.5" /> },
          { id: "revenue", label: t("Revenue Ledger"), icon: <DollarSign className="w-3.5 h-3.5" /> },
          { id: "audit", label: t("Audit Log History"), icon: <Layers className="w-3.5 h-3.5" /> }
        ].map((tab) => {
          const active = detailTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDetailTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer shrink-0 ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100/50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Active Tab */}
      <div className="bg-[#FAF9F8] dark:bg-[#0B0B0C] min-h-[380px] rounded-xl pt-2 animate-fadeIn">
        
        {/* Tab 1: Overview */}
        {detailTab === "overview" && (
          <CompanyOverviewTab
            company={company}
            customFieldDefs={customFieldDefs}
            lang={lang}
            getTranslatedValue={getTranslatedValue}
            onUpdateCompany={handleUpdateCompanyDirect}
          />
        )}

        {/* Tab 2: Contacts */}
        {detailTab === "contacts" && (
          <CompanyContactsTab
            companyId={company.id}
            lang={lang}
            onLogTimelineEvent={handleLogTimelineDirect}
          />
        )}

        {/* Tab 3: Activities & Timeline */}
        {detailTab === "activities" && (
          <CompanyTimelineTab
            companyId={company.id}
            lang={lang}
            companyName={company.name}
            industry={company.industry}
          />
        )}

        {/* Tab 4: Opportunities List */}
        {detailTab === "opportunities" && (
          <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-zinc-800 pb-2">
              <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider font-mono">
                {t("Linked Opportunity Pipeline")}
              </h4>
            </div>

            {CrmDb.getDealsByCompany(company.id).length === 0 ? (
              <div className="p-10 text-center">
                <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span className="text-slate-405">{t("No deals registered for this account yet.")}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                      <th className="p-3 pl-4">{t("Deal Name")}</th>
                      <th className="p-3">{t("Stage")}</th>
                      <th className="p-3">{t("Win Probability")}</th>
                      <th className="p-3">{t("Close Date")}</th>
                      <th className="p-3 text-right pr-4">{t("Opportunity Value")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-zinc-850">
                    {CrmDb.getDealsByCompany(company.id).map((deal: any) => (
                      <tr key={deal.id} className="hover:bg-slate-50/40 dark:hover:bg-zinc-900/40">
                        <td className="p-3 pl-4 font-bold text-slate-800 dark:text-zinc-200">{deal.dealName || deal.contactPerson}</td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400">
                            {deal.stage}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold">{deal.winProbability || 50}%</td>
                        <td className="p-3 font-mono text-slate-500">{deal.expectedCloseDate}</td>
                        <td className="p-3 text-right pr-4 font-extrabold text-slate-800 dark:text-zinc-100 font-mono">
                          {getSystemCurrency().symbol}{(deal.opportunityValue || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Proposals List */}
        {detailTab === "proposals" && (
          <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-zinc-800 pb-2">
              <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider font-mono">
                {t("Linked Proposal History")}
              </h4>
            </div>

            {CrmDb.getProposalsByCompany(company.id).length === 0 ? (
              <div className="p-10 text-center">
                <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span className="text-slate-450">{t("No proposals registered for this company yet.")}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                      <th className="p-3 pl-4">{t("Proposal Number")}</th>
                      <th className="p-3">{t("Title")}</th>
                      <th className="p-3">{t("Date")}</th>
                      <th className="p-3">{t("Status")}</th>
                      <th className="p-3 text-right pr-4">{t("Total Amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-zinc-850">
                    {CrmDb.getProposalsByCompany(company.id).map((prop: any) => (
                      <tr key={prop.id} className="hover:bg-slate-50/40 dark:hover:bg-zinc-900/40">
                        <td className="p-3 pl-4 font-extrabold text-[#0078D4] font-mono">#{prop.proposalNumber}</td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-zinc-200">{prop.title}</td>
                        <td className="p-3 font-mono text-slate-500">{prop.date || "2026-06-15"}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                            prop.status === "Approved" || prop.status === "Accepted"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                              : prop.status === "Draft"
                                ? "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
                                : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                          }`}>
                            {prop.status}
                          </span>
                        </td>
                        <td className="p-3 text-right pr-4 font-extrabold text-slate-800 dark:text-zinc-100 font-mono">{prop.totalCost || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Emails Hub */}
        {detailTab === "emails" && (
          <CompanyEmailsTab
            companyId={company.id}
            lang={lang}
            companyName={company.name}
            contactPersonName={CrmDb.getContactsByCompany(company.id)[0]?.firstName || "Yetkili"}
            contactEmail={CrmDb.getContactsByCompany(company.id)[0]?.email || ""}
            onLogTimelineEvent={handleLogTimelineDirect}
          />
        )}

        {/* Tab 7: Documents Attachments */}
        {detailTab === "documents" && (
          <CompanyDocumentsTab
            companyId={company.id}
            lang={lang}
            companyName={company.name}
            onLogTimelineEvent={handleLogTimelineDirect}
          />
        )}

        {/* Tab 8: Lean Opex Matrix */}
        {detailTab === "opex" && (
          <CompanyOpexTab
            companyId={company.id}
            lang={lang}
            companyName={company.name}
            onLogTimelineEvent={handleLogTimelineDirect}
          />
        )}

        {/* Tab 9: Financial Revenue Ledger */}
        {detailTab === "revenue" && (
          <CompanyRevenueTab
            companyId={company.id}
            lang={lang}
            companyName={company.name}
            onLogTimelineEvent={handleLogTimelineDirect}
          />
        )}

        {/* Tab 10: Audit Log / Change History */}
        {detailTab === "audit" && (
          <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-zinc-800 pb-2">
              <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider font-mono">
                {t("Field Change Audit & History Ledger")}
              </h4>
            </div>

            {(() => {
              const logs = CrmDb.getKv<any[]>(`crm_company_audit_logs_${company.id}`, []);

              if (logs.length === 0) {
                return (
                  <div className="p-10 text-center text-slate-400">
                    {t("No change audit logs registered for this company profile yet.")}
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto border border-slate-100 dark:border-zinc-800 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-150 dark:border-zinc-850 text-[10px] font-mono uppercase font-bold text-slate-400">
                        <th className="p-3 pl-4">{t("Field / Property")}</th>
                        <th className="p-3">{t("Old Value")}</th>
                        <th className="p-3">{t("New Value")}</th>
                        <th className="p-3">{t("User")}</th>
                        <th className="p-3 text-right pr-4">{t("Timestamp")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-zinc-850 text-slate-700 dark:text-zinc-300">
                      {logs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                          <td className="p-3 pl-4 font-bold text-slate-800 dark:text-zinc-200">{log.field}</td>
                          <td className="p-3 font-mono text-rose-500 bg-rose-50/10 line-through truncate max-w-[150px]">{log.oldValue}</td>
                          <td className="p-3 font-mono text-emerald-600 bg-emerald-50/10 truncate max-w-[150px] font-bold">{log.newValue}</td>
                          <td className="p-3 font-semibold">{log.user || "Atakan Zehir"}</td>
                          <td className="p-3 text-right pr-4 font-mono text-[10px] text-slate-400">
                            {new Date(log.timestamp).toLocaleString(lang === "TR" ? "tr-TR" : "en-US")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

      </div>

    </div>
  );
}
