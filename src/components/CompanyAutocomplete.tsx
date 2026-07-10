import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, Building, Globe, Phone, MapPin, X, Check } from "lucide-react";
import { CrmDb } from "../lib/CrmDb";
import { Company } from "./CompaniesView";
import { useLanguage } from "../lib/LanguageContext";

interface CompanyAutocompleteProps {
  value: string; // can be company name or ID
  onChange: (company: Company) => void;
  placeholder?: string;
  className?: string;
}

export default function CompanyAutocomplete({
  value,
  onChange,
  placeholder = "Type company name...",
  className = ""
}: CompanyAutocompleteProps) {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Form state for creating a new company
  const [newCompanyForm, setNewCompanyForm] = useState({
    name: "",
    website: "",
    phone: "",
    industry: "",
    employeeCount: 50,
    annualRevenue: "1,000,000",
    annualRevenueCurrency: "₺" as "₺" | "$" | "€",
    customerStatus: "Lead",
    billingAddress: "",
    billingCity: "",
    managementTeam: "",
    digitalInfrastructure: ""
  });

  // Sync with prop value
  useEffect(() => {
    if (value) {
      // If it's an ID, find the name
      const comp = CrmDb.getCompanyById(value);
      if (comp) {
        setInputValue(comp.name);
      } else {
        // Assume it's a name
        const companies = CrmDb.getCompanies();
        const found = companies.find(c => c.name.toLowerCase().trim() === value.toLowerCase().trim());
        if (found) {
          setInputValue(found.name);
        } else {
          setInputValue(value);
        }
      }
    } else {
      setInputValue("");
    }
  }, [value]);

  // Handle outside click to close suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update suggestions based on input value
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }
    const matches = CrmDb.autocompleteCompanies(inputValue);
    setSuggestions(matches);
  }, [inputValue]);

  const handleSelect = (company: Company) => {
    setInputValue(company.name);
    setIsOpen(false);
    onChange(company);
  };

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyForm.name) return;

    // Call database to create company (it will check duplicates and save)
    const created = CrmDb.createCompany({
      name: newCompanyForm.name,
      website: newCompanyForm.website,
      phone: newCompanyForm.phone,
      industry: newCompanyForm.industry || "General Manufacturing",
      employeeCount: Number(newCompanyForm.employeeCount) || 0,
      annualRevenue: newCompanyForm.annualRevenue,
      annualRevenueCurrency: newCompanyForm.annualRevenueCurrency,
      customerStatus: newCompanyForm.customerStatus,
      billingAddress: newCompanyForm.billingAddress,
      billingCity: newCompanyForm.billingCity,
      managementTeam: newCompanyForm.managementTeam,
      digitalInfrastructure: newCompanyForm.digitalInfrastructure,
      customFields: {}
    });

    // Notify parent component
    onChange(created);
    setInputValue(created.name);
    setIsModalOpen(false);
  };

  const openCreationModal = () => {
    setNewCompanyForm({
      name: inputValue,
      website: "",
      phone: "",
      industry: "Manufacturing",
      employeeCount: 100,
      annualRevenue: "5,000,000",
      annualRevenueCurrency: "€",
      customerStatus: "Lead",
      billingAddress: "",
      billingCity: "İstanbul",
      managementTeam: "John Doe (Managing Director)",
      digitalInfrastructure: "ERP system, CRM"
    });
    setIsOpen(false);
    setIsModalOpen(true);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            // If user clears the input, notify parent with an empty-like selection
            if (!e.target.value) {
              onChange({ id: "", name: "" } as any);
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || t("Type company name...")}
          className="w-full p-2 pl-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 rounded outline-none text-xs text-slate-800 dark:text-zinc-100 transition-all focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>

      {isOpen && inputValue.trim() && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-[#141414] border border-slate-200 dark:border-zinc-800 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 animate-in fade-in duration-100 p-1">
          {suggestions.length > 0 ? (
            <div className="space-y-0.5">
              {suggestions.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-slate-55 dark:hover:bg-zinc-800/60 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.industry} • {c.billingCity || "TR"}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded uppercase font-mono">
                    {t("Select")}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center">
              <p className="text-xs text-slate-400 mb-2">{t("No company found")}</p>
              <button
                type="button"
                onClick={openCreationModal}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-zinc-800 hover:bg-indigo-100 dark:hover:bg-zinc-700 text-indigo-650 dark:text-zinc-200 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("Create New Company")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* CREATE NEW COMPANY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                  {t("Create New Company")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompanySubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">{t("Company Name *")}</label>
                  <input
                    type="text"
                    required
                    value={newCompanyForm.name}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, name: e.target.value })}
                    className="w-full p-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded outline-none text-xs mt-1 text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={t("e.g. Acme Corporation")}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">{t("Website")}</label>
                  <input
                    type="text"
                    value={newCompanyForm.website}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, website: e.target.value })}
                    className="w-full p-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded outline-none text-xs mt-1 text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500"
                    placeholder={t("e.g. acme.com")}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">{t("Phone")}</label>
                  <input
                    type="text"
                    value={newCompanyForm.phone}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded outline-none text-xs mt-1 text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500"
                    placeholder={t("e.g. +90 (212) 555 4433")}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">{t("Industry")}</label>
                  <input
                    type="text"
                    value={newCompanyForm.industry}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, industry: e.target.value })}
                    className="w-full p-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded outline-none text-xs mt-1 text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500"
                    placeholder={t("e.g. Automotive, Textiles")}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">{t("Employee Count")}</label>
                  <input
                    type="number"
                    value={newCompanyForm.employeeCount}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, employeeCount: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded outline-none text-xs mt-1 text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">{t("Annual Revenue")}</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={newCompanyForm.annualRevenue}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, annualRevenue: e.target.value })}
                      className="w-full p-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded outline-none text-xs text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500"
                    />
                    <select
                      value={newCompanyForm.annualRevenueCurrency}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, annualRevenueCurrency: e.target.value as any })}
                      className="p-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded outline-none text-xs font-bold text-slate-700 dark:text-zinc-305"
                    >
                      <option value="₺">₺</option>
                      <option value="$">$</option>
                      <option value="€">€</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">{t("Customer Status")}</label>
                  <select
                    value={newCompanyForm.customerStatus}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, customerStatus: e.target.value })}
                    className="w-full p-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded outline-none text-xs mt-1 text-slate-850 dark:text-zinc-200 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Lead">{t("Lead")}</option>
                    <option value="Contacted">{t("Contacted")}</option>
                    <option value="Proposal Phase">{t("Proposal Phase")}</option>
                    <option value="Implementation">{t("Implementation")}</option>
                    <option value="Active Customer">{t("Active Customer")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">{t("Billing City")}</label>
                  <input
                    type="text"
                    value={newCompanyForm.billingCity}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, billingCity: e.target.value })}
                    className="w-full p-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded outline-none text-xs mt-1 text-slate-850 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500"
                    placeholder={t("e.g. Bursa, İstanbul")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">{t("Billing Address")}</label>
                <textarea
                  value={newCompanyForm.billingAddress}
                  onChange={(e) => setNewCompanyForm({ ...newCompanyForm, billingAddress: e.target.value })}
                  rows={2}
                  className="w-full p-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded outline-none text-xs mt-1 text-slate-850 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500"
                  placeholder={t("Full billing address...")}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">{t("Management Team (Comma Separated)")}</label>
                <input
                  type="text"
                  value={newCompanyForm.managementTeam}
                  onChange={(e) => setNewCompanyForm({ ...newCompanyForm, managementTeam: e.target.value })}
                  className="w-full p-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded outline-none text-xs mt-1 text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500"
                  placeholder={t("e.g. John Doe (CEO), Jane Smith (COO)")}
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/60 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-xs text-slate-600 dark:text-zinc-350 rounded-xl transition-all cursor-pointer"
                >
                  {t("Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {t("Create & Select Company")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
