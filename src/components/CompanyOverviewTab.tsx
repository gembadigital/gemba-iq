import React from "react";
import { Company, CustomFieldDefinition } from "../CompaniesView";
import { Building, Phone, Globe, DollarSign, Users, CheckCircle, TrendingUp, MapPin, Layers, Sparkles, Shield } from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";

interface CompanyOverviewTabProps {
  company: Company;
  customFieldDefs: CustomFieldDefinition[];
  lang: "TR" | "EN";
  getTranslatedValue: (val: string | undefined, field: string) => string;
  onUpdateCompany: (updated: Company, fieldChanged?: string, oldValue?: string, newValue?: string) => void;
}

// Kullanıcı talebi: "müşteri kartı Özet detaylar segmesi form gibi olmalı,
// kalemle tıklayıp edit yapma fonksiyonuna gerek yok." — sekmenin tamamı
// artık her zaman düzenlenebilir düz bir form: kalem ikonuna tıklayıp
// "edit moduna girme" adımı kaldırıldı. Değerler input/select/textarea
// olarak doğrudan gösteriliyor; değişiklik onBlur'da (select'te onChange'de)
// otomatik kaydediliyor.
export default function CompanyOverviewTab({
  company,
  customFieldDefs,
  lang: _langProp,
  getTranslatedValue,
  onUpdateCompany
}: CompanyOverviewTabProps) {
  const { t } = useLanguage();

  const ISO_CERT_OPTIONS = ["ISO 9001", "TS16949", "ISO 14001", "AS 9100", "Diğer"];

  const handleFieldChange = (field: keyof Company | string, rawValue: string, isCustom = false) => {
    const oldValue = isCustom ? String(company.customFields?.[field] || "") : String(company[field as keyof Company] || "");
    const newValue = rawValue.trim();

    if (oldValue === newValue) return;

    let updatedCompany: Company = { ...company };

    if (isCustom) {
      updatedCompany.customFields = {
        ...(company.customFields || {}),
        [field]: newValue
      };
    } else if (field === "employeeCount") {
      (updatedCompany[field as keyof Company] as any) = Number(newValue) || 0;
    } else {
      (updatedCompany[field as keyof Company] as any) = newValue;
    }

    const label = isCustom
      ? (customFieldDefs.find(d => d.id === field)?.name || field)
      : String(field);

    onUpdateCompany(updatedCompany, label, oldValue, newValue);
  };

  const handleToggleIso = (opt: string) => {
    const current = company.isoCertifications || [];
    const updated = current.includes(opt) ? current.filter((o) => o !== opt) : [...current, opt];
    const updatedCompany: Company = {
      ...company,
      isoCertifications: updated,
      isoCertificationOther: updated.includes("Diğer") ? (company.isoCertificationOther || "") : ""
    };
    onUpdateCompany(updatedCompany, t("ISO Certification & Compliance"), current.join(", "), updated.join(", "));
  };

  const handleIsoOtherBlur = (rawValue: string) => {
    const newValue = rawValue.trim();
    if (newValue === (company.isoCertificationOther || "")) return;
    const updatedCompany: Company = { ...company, isoCertificationOther: newValue };
    onUpdateCompany(
      updatedCompany,
      `${t("ISO Certification & Compliance")} - ${t("Other")}`,
      company.isoCertificationOther || "",
      newValue
    );
  };

  const renderFormField = (
    label: string,
    field: keyof Company | string,
    value: string,
    type: "text" | "number" | "select" | "textarea" = "text",
    options: string[] = [],
    isCustom = false
  ) => {
    return (
      <div className="p-2.5 bg-slate-50/50 dark:bg-zinc-900/40 rounded-lg border border-slate-100 dark:border-zinc-800/50 font-sans text-xs">
        <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 font-mono block mb-1">
          {label}
        </label>

        {type === "select" ? (
          <select
            defaultValue={value}
            onChange={(e) => handleFieldChange(field, e.target.value, isCustom)}
            className="w-full p-1.5 bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {getTranslatedValue(opt, String(field))}
              </option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            key={`${String(field)}-${value}`}
            defaultValue={value}
            onBlur={(e) => handleFieldChange(field, e.target.value, isCustom)}
            className="w-full p-1.5 bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-blue-400 min-h-[70px] resize-y"
          />
        ) : (
          <input
            key={`${String(field)}-${value}`}
            type={type === "number" ? "number" : "text"}
            defaultValue={value}
            onBlur={(e) => handleFieldChange(field, e.target.value, isCustom)}
            className="w-full p-1.5 bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
          />
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
      
      {/* LEFT: Core Corporate Registry Details (7 columns) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
            <Building className="w-4 h-4 text-[#0078D4]" />
            <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
              {t("Company Profile & Identity")}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {renderFormField(t("Company Name"), "name", company.name)}
            {renderFormField(
              t("Account Status"),
              "customerStatus",
              company.customerStatus,
              "select",
              ["Prospect", "Active Customer", "Existing Customer", "Inactive", "Lost Customer", "Former Customer", "Archived", "Implementation", "Nurturing", "Lead"]
            )}
            {renderFormField(
              t("Lifecycle Stage"),
              "lifecycleStage",
              company.lifecycleStage || "Customer",
              "select",
              ["Lead", "Subscriber", "Opportunity", "Customer", "Evangelist"]
            )}
            {renderFormField(t("Account Owner"), "accountOwner", company.accountOwner)}
            {renderFormField(t("Phone"), "phone", company.phone || "")}
            {renderFormField(t("Website"), "website", company.website || "")}
            {renderFormField(
              t("Annual Revenue"),
              "annualRevenue",
              company.annualRevenue || ""
            )}
            {renderFormField(
              t("Headcount (Employees)"),
              "employeeCount",
              company.employeeCount ? String(company.employeeCount) : "0",
              "number"
            )}
            {renderFormField(
              t("Industry Group"),
              "industry",
              company.industry,
              "select",
              ["Automotive", "Textiles", "Manufacturing", "General Manufacturing", "Technology / Software", "E-Commerce / Retail", "Finance / Banking", "Lojistik / Dağıtım", "Enerji / Altyapı", "Eğitim / Danışmanlık", "Sağlık / İlaç", "Diğer Sektörler"]
            )}
          </div>
          
          <div className="space-y-1">
            {renderFormField(
              t("Sector Segment / Niche"),
              "sector",
              company.sector || "",
              "text"
            )}
          </div>

          <div className="space-y-1">
            {renderFormField(
              t("Executive Description"),
              "description",
              company.description || "",
              "textarea"
            )}
          </div>
        </div>

        {/* Address and Tax Information Card */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
            <MapPin className="w-4 h-4 text-[#0078D4]" />
            <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
              {t("Location & Billing Details")}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {renderFormField(t("HQ City"), "billingCity", company.billingCity || "")}
            {renderFormField(t("District"), "billingDistrict", company.billingDistrict || "")}
            {renderFormField(t("Postal Code"), "billingPostalCode", company.billingPostalCode || "")}
            {renderFormField(t("Country"), "billingCountry", company.billingCountry || "Türkiye")}
            {renderFormField(t("Tax Office"), "taxOffice", company.taxOffice || "")}
            {renderFormField(t("Tax ID / No"), "taxNo", company.taxNo || "")}
          </div>
          <div className="space-y-1">
            {renderFormField(t("Full Address"), "billingAddress", company.billingAddress || "", "textarea")}
          </div>
        </div>
      </div>

      {/* RIGHT: Technical Operations & Lean profile (5 columns) */}
      <div className="lg:col-span-5 space-y-4">
        
        {/* Plant Attributes & Lean Profile Card */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
              {t("Plant & Lean Production Profile")}
            </h4>
          </div>

          <div className="space-y-3">
            {renderFormField(
              t("Shift Pattern"),
              "shift",
              company.shift,
              "select",
              ["1 Shift", "2 Shifts", "3 Shifts", "4 Shifts (Continuous)"]
            )}
            {renderFormField(
              t("Production Flow Type"),
              "productionType",
              company.productionType || "",
              "text"
            )}
            {renderFormField(
              t("Plant Area (sqm)"),
              "squareMeter",
              company.squareMeter || "",
              "text"
            )}
            {renderFormField(
              t("Production Capacity"),
              "productionCapacity",
              company.productionCapacity || "",
              "text"
            )}
            {renderFormField(
              t("Digital & ERP Backend"),
              "digitalInfrastructure",
              company.digitalInfrastructure,
              "text"
            )}
            {renderFormField(
              t("Executive Management"),
              "managementTeam",
              company.managementTeam || "",
              "text"
            )}
          </div>
        </div>

        {/* ISO Certification & Compliance Card (Item 2: "Sahip Olunan
            Belgeler") — artık her zaman düzenlenebilir bir onay kutusu
            listesi olarak gösteriliyor, ayrı bir "kalem" edit modu yok. */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
            <Shield className="w-4 h-4 text-blue-500" />
            <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
              {t("ISO Certification & Compliance")}
            </h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {ISO_CERT_OPTIONS.map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                  (company.isoCertifications || []).includes(opt)
                    ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
                    : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={(company.isoCertifications || []).includes(opt)}
                  onChange={() => handleToggleIso(opt)}
                  className="accent-blue-600 w-3.5 h-3.5"
                />
                {opt === "Diğer" ? t("Other") : opt}
              </label>
            ))}
          </div>

          {(company.isoCertifications || []).includes("Diğer") && (
            <input
              type="text"
              key={`iso-other-${company.isoCertificationOther || ""}`}
              defaultValue={company.isoCertificationOther || ""}
              onBlur={(e) => handleIsoOtherBlur(e.target.value)}
              placeholder={t("Specify other certification...")}
              className="w-full p-1.5 bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
            />
          )}
        </div>

        {/* Custom Fields Card */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
            <Layers className="w-4 h-4 text-purple-500" />
            <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
              {t("Custom Corporate Fields")}
            </h4>
          </div>

          {customFieldDefs.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg">
              <span className="text-[11px] text-slate-400">
                {t("No custom fields defined yet. Add them using 'Customize Fields' on the list page.")}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {customFieldDefs.map((def) => {
                const val = String(company.customFields?.[def.id] ?? "");
                return (
                  <div key={def.id}>
                    {renderFormField(
                      def.name,
                      def.id,
                      val,
                      def.type === "number" ? "number" : def.type === "dropdown" ? "select" : "text",
                      def.options || [],
                      true
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
