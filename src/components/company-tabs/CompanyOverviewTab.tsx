import React, { useState } from "react";
import { Company, CustomFieldDefinition } from "../CompaniesView";
import { Building, Phone, Globe, DollarSign, Users, CheckCircle, TrendingUp, Edit2, Check, X, MapPin, Layers, Sparkles, Shield } from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";

interface CompanyOverviewTabProps {
  company: Company;
  customFieldDefs: CustomFieldDefinition[];
  lang: "TR" | "EN";
  getTranslatedValue: (val: string | undefined, field: string) => string;
  onUpdateCompany: (updated: Company, fieldChanged?: string, oldValue?: string, newValue?: string) => void;
}

export default function CompanyOverviewTab({
  company,
  customFieldDefs,
  lang: _langProp,
  getTranslatedValue,
  onUpdateCompany
}: CompanyOverviewTabProps) {
  const { t } = useLanguage();
  // Inline edit state tracking which field is currently being edited
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");

  const handleStartEdit = (field: string, value: string) => {
    setEditingField(field);
    setTempValue(value);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setTempValue("");
  };

  const handleSaveEdit = (field: keyof Company | string, isCustom = false) => {
    const oldValue = isCustom ? String(company.customFields?.[field] || "") : String(company[field as keyof Company] || "");
    const newValue = tempValue.trim();

    if (oldValue === newValue) {
      setEditingField(null);
      return;
    }

    let updatedCompany: Company = { ...company };

    if (isCustom) {
      updatedCompany.customFields = {
        ...(company.customFields || {}),
        [field]: newValue
      };
    } else {
      // Handle type conversions
      if (field === "employeeCount" || field === "healthScore") {
        (updatedCompany[field as keyof Company] as any) = Number(newValue) || 0;
      } else {
        (updatedCompany[field as keyof Company] as any) = newValue;
      }
    }

    const label = isCustom 
      ? (customFieldDefs.find(d => d.id === field)?.name || field) 
      : String(field);

    onUpdateCompany(updatedCompany, label, oldValue, newValue);
    setEditingField(null);
    setTempValue("");
  };

  const renderEditableField = (
    label: string,
    field: keyof Company | string,
    value: string,
    type: "text" | "number" | "select" | "textarea" = "text",
    options: string[] = [],
    isCustom = false
  ) => {
    const isEditing = editingField === field;
    const displayVal = value || t("Not specified");

    return (
      <div className="group relative p-2.5 bg-slate-50/50 dark:bg-zinc-900/40 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-lg border border-slate-100 dark:border-zinc-800/50 transition-all font-sans text-xs">
        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 font-mono block mb-1">
          {label}
        </span>
        
        {isEditing ? (
          <div className="flex items-center gap-1.5 mt-1 animate-fadeIn">
            {type === "select" ? (
              <select
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="flex-1 p-1 bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
              >
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {getTranslatedValue(opt, String(field))}
                  </option>
                ))}
              </select>
            ) : type === "textarea" ? (
              <textarea
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="flex-1 p-1.5 bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded text-xs text-slate-800 dark:text-zinc-200 focus:outline-none min-h-[70px] resize-y"
              />
            ) : (
              <input
                type={type === "number" ? "number" : "text"}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="flex-1 p-1 bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                autoFocus
              />
            )}
            
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => handleSaveEdit(field, isCustom)}
                className="p-1 bg-emerald-500 text-white hover:bg-emerald-600 rounded transition-colors cursor-pointer"
                title={t("Save")}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1 bg-slate-200 dark:bg-zinc-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-zinc-700 rounded transition-colors cursor-pointer"
                title={t("Cancel")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="font-semibold text-slate-700 dark:text-zinc-200 truncate">
              {type === "select" ? getTranslatedValue(value, String(field)) : displayVal}
            </span>
            <button
              type="button"
              onClick={() => handleStartEdit(String(field), value)}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-all cursor-pointer"
              title={t("Edit")}
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
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
            {renderEditableField(t("Company Name"), "name", company.name)}
            {renderEditableField(
              t("Account Status"),
              "customerStatus",
              company.customerStatus,
              "select",
              ["Prospect", "Active Customer", "Existing Customer", "Inactive", "Lost Customer", "Former Customer", "Archived", "Implementation", "Nurturing", "Lead"]
            )}
            {renderEditableField(
              t("Lifecycle Stage"),
              "lifecycleStage",
              company.lifecycleStage || "Customer",
              "select",
              ["Lead", "Subscriber", "Opportunity", "Customer", "Evangelist"]
            )}
            {renderEditableField(t("Account Owner"), "accountOwner", company.accountOwner)}
            {renderEditableField(t("Phone"), "phone", company.phone || "")}
            {renderEditableField(t("Website"), "website", company.website || "")}
            {renderEditableField(
              t("Annual Revenue"),
              "annualRevenue",
              company.annualRevenue || ""
            )}
            {renderEditableField(
              t("Headcount (Employees)"),
              "employeeCount",
              company.employeeCount ? String(company.employeeCount) : "0",
              "number"
            )}
            {renderEditableField(
              t("Health Score (1-100)"),
              "healthScore",
              company.healthScore ? String(company.healthScore) : "75",
              "number"
            )}
            {renderEditableField(
              t("Industry Group"),
              "industry",
              company.industry,
              "select",
              ["Automotive", "Textiles", "Manufacturing", "General Manufacturing", "Technology / Software", "E-Commerce / Retail", "Finance / Banking", "Lojistik / Dağıtım", "Enerji / Altyapı", "Eğitim / Danışmanlık", "Sağlık / İlaç", "Diğer Sektörler"]
            )}
          </div>
          
          <div className="space-y-1">
            {renderEditableField(
              t("Sector Segment / Niche"),
              "sector",
              company.sector || "",
              "text"
            )}
          </div>

          <div className="space-y-1">
            {renderEditableField(
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
            {renderEditableField(t("HQ City"), "billingCity", company.billingCity || "")}
            {renderEditableField(t("District"), "billingDistrict", company.billingDistrict || "")}
            {renderEditableField(t("Postal Code"), "billingPostalCode", company.billingPostalCode || "")}
            {renderEditableField(t("Country"), "billingCountry", company.billingCountry || "Türkiye")}
            {renderEditableField(t("Tax Office"), "taxOffice", company.taxOffice || "")}
            {renderEditableField(t("Tax ID / No"), "taxNo", company.taxNo || "")}
          </div>
          <div className="space-y-1">
            {renderEditableField(t("Full Address"), "billingAddress", company.billingAddress || "", "textarea")}
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
            {renderEditableField(
              t("Shift Pattern"),
              "shift",
              company.shift,
              "select",
              ["1 Shift", "2 Shifts", "3 Shifts", "4 Shifts (Continuous)"]
            )}
            {renderEditableField(
              t("Production Flow Type"),
              "productionType",
              company.productionType || "",
              "text"
            )}
            {renderEditableField(
              t("Plant Area (sqm)"),
              "squareMeter",
              company.squareMeter || "",
              "text"
            )}
            {renderEditableField(
              t("Digital & ERP Backend"),
              "digitalInfrastructure",
              company.digitalInfrastructure,
              "text"
            )}
            {renderEditableField(
              t("Executive Management"),
              "managementTeam",
              company.managementTeam || "",
              "text"
            )}
          </div>
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
                    {renderEditableField(
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

        {/* Health Index Summary Widget */}
        <div className="bg-[#FAF9F8] dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">
                {t("Client Health Index")}
              </span>
              <div className="text-sm font-extrabold text-slate-700 dark:text-zinc-200 mt-0.5">
                {company.healthScore || 75}/100 {t("Score")}
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
            (company.healthScore || 75) >= 80 
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" 
              : (company.healthScore || 75) >= 60 
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400" 
                : "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
          }`}>
            {(company.healthScore || 75) >= 80 
              ? t("Healthy") 
              : (company.healthScore || 75) >= 60 
                ? t("Warning") 
                : t("At Risk")}
          </span>
        </div>
      </div>

    </div>
  );
}
