import React, { useState, useEffect } from "react";
import { X, Plus, Sparkles, Check, Calculator, AlertTriangle } from "lucide-react";
import { Proposal, ProposalOption, PRE_POPULATED_TEMPLATES, ProposalTemplate } from "../types/proposal";
import { Company } from "./CompaniesView";
import CompanyAutocomplete from "./CompanyAutocomplete";
import { useLanguage } from "../lib/LanguageContext";
import { CrmDb } from "../lib/CrmDb";
import { formatSystemNumber } from "../lib/currencyHelper";

interface ProposalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proposal: Proposal) => void;
  initialProposal?: Proposal | null;
  companies: Company[];
  onAddCompany: (company: Company) => void;
  wordTemplates?: ProposalTemplate[];
}

export default function ProposalFormModal({
  isOpen,
  onClose,
  onSave,
  initialProposal,
  companies,
  onAddCompany,
  wordTemplates = [],
}: ProposalFormModalProps) {
  const { lang, t } = useLanguage();
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedDealId, setSelectedDealId] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedWordTemplateId, setSelectedWordTemplateId] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [showAddCompanyInline, setShowAddCompanyInline] = useState(false);

  // Quick company form states
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyContact, setNewCompanyContact] = useState("");
  const [newCompanyEmail, setNewCompanyEmail] = useState("");

  // Main Form States
  const [proposalSubject, setProposalSubject] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [date, setDate] = useState("");
  const [currency, setCurrency] = useState<"₺" | "$" | "€">("₺");
  const [owner, setOwner] = useState("GP (Gemba Partner)");
  const [description, setDescription] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Services available
  const servicesList = [
    "OPEX Assessment",
    "Lean Transformation",
    "5S Training",
    "Problem Solving Training",
    "TPM",
    "OEE Improvement",
    "FMEA Training",
    "VSM Workshop",
    "Kaizen Workshop",
  ];

  // Template parts
  const [coverPage, setCoverPage] = useState("");
  const [methodology, setMethodology] = useState("");
  const [projectPlan, setProjectPlan] = useState("");
  const [timeline, setTimeline] = useState("");
  const [terms, setTerms] = useState("");

  // Custom document backgrounds and AI Table Builder
  const [coverImage, setCoverImage] = useState("");
  const [pageImage, setPageImage] = useState("");
  const [rawPastedHtml, setRawPastedHtml] = useState("");
  const [targetFieldForAi, setTargetFieldForAi] = useState<"methodology" | "projectPlan" | "timeline" | "terms">("projectPlan");
  const [isAiConverting, setIsAiConverting] = useState(false);

  // Option packages: Option 1, Option 2, Option 3, Option 4
  const defaultOption = (): ProposalOption => ({
    training: false,
    consulting: false,
    workshop: false,
    manDays: 0,
    dailyRate: 0,
    expenses: 0,
  });

  const [options, setOptions] = useState<{ [key: string]: ProposalOption }>({
    "Option 1": defaultOption(),
    "Option 2": defaultOption(),
    "Option 3": defaultOption(),
    "Option 4": defaultOption(),
  });

  const [activeOptions, setActiveOptions] = useState<{ [key: string]: boolean }>({
    "Option 1": true,
    "Option 2": false,
    "Option 3": false,
    "Option 4": false,
  });

  // Load initial value or set defaults
  useEffect(() => {
    if (isOpen) {
      if (initialProposal) {
        setSelectedCompanyId(initialProposal.companyId);
        setSelectedDealId(initialProposal.dealId || "");
        setSelectedContactId(initialProposal.contactId || "");
        setSelectedWordTemplateId(initialProposal.wordTemplateId || "");
        setProposalSubject(initialProposal.proposalSubject);
        setContactPerson(initialProposal.contactPerson);
        setContactEmail(initialProposal.contactEmail || "");
        setDate(initialProposal.date);
        setCurrency(initialProposal.currency);
        setOwner(initialProposal.owner);
        setDescription(initialProposal.description || "");
        setSelectedServices(initialProposal.services || []);
        setOptions(initialProposal.options);
        
        // Active options
        const active: { [key: string]: boolean } = {};
        Object.keys(initialProposal.options).forEach((key) => {
          const opt = initialProposal.options[key];
          active[key] = opt.manDays > 0 || opt.dailyRate > 0 || opt.training || opt.consulting || opt.workshop;
        });
        // Make sure at least option 1 is active
        if (!active["Option 1"]) active["Option 1"] = true;
        setActiveOptions(active);

        // Load templates from current version or pre-populated
        if (initialProposal.versions && initialProposal.versions.length > 0) {
          const latestVer = initialProposal.versions.find(v => v.version === initialProposal.currentVersion) || initialProposal.versions[0];
          setCoverPage(initialProposal.coverPage || latestVer.coverPage || initialProposal.proposalSubject || PRE_POPULATED_TEMPLATES["Default"].coverPage);
          setMethodology(initialProposal.methodology || latestVer.methodology || PRE_POPULATED_TEMPLATES["Default"].methodology);
          setProjectPlan(initialProposal.projectPlan || latestVer.projectPlan || PRE_POPULATED_TEMPLATES["Default"].projectPlan);
          setTimeline(initialProposal.timeline || latestVer.timeline || PRE_POPULATED_TEMPLATES["Default"].timeline);
          setTerms(initialProposal.terms || latestVer.terms || PRE_POPULATED_TEMPLATES["Default"].terms);
          setCoverImage(initialProposal.coverImage || latestVer.coverImage || "");
          setPageImage(initialProposal.pageImage || latestVer.pageImage || "");
        } else {
          setCoverPage(initialProposal.coverPage || initialProposal.proposalSubject || PRE_POPULATED_TEMPLATES["Default"].coverPage);
          setMethodology(initialProposal.methodology || PRE_POPULATED_TEMPLATES["Default"].methodology);
          setProjectPlan(initialProposal.projectPlan || PRE_POPULATED_TEMPLATES["Default"].projectPlan);
          setTimeline(initialProposal.timeline || PRE_POPULATED_TEMPLATES["Default"].timeline);
          setTerms(initialProposal.terms || PRE_POPULATED_TEMPLATES["Default"].terms);
          setCoverImage(initialProposal.coverImage || "");
          setPageImage(initialProposal.pageImage || "");
        }
      } else {
        // Defaults
        setSelectedCompanyId("");
        setSelectedDealId("");
        setSelectedContactId("");
        setSelectedWordTemplateId("");
        setProposalSubject("");
        setContactPerson("");
        setContactEmail("");
        const today = new Date();
        const formattedDate = `${String(today.getDate()).padStart(2, "0")}.${String(
          today.getMonth() + 1
        ).padStart(2, "0")}.${today.getFullYear()}`;
        setDate(formattedDate);
        setCurrency("₺");
        setOwner("GP (Gemba Partner)");
        setDescription("");
        setSelectedServices([]);
        setOptions({
          "Option 1": defaultOption(),
          "Option 2": defaultOption(),
          "Option 3": defaultOption(),
          "Option 4": defaultOption(),
        });
        setActiveOptions({
          "Option 1": true,
          "Option 2": false,
          "Option 3": false,
          "Option 4": false,
        });
        setCoverPage(PRE_POPULATED_TEMPLATES["Default"].coverPage);
        setMethodology(PRE_POPULATED_TEMPLATES["Default"].methodology);
        setProjectPlan(PRE_POPULATED_TEMPLATES["Default"].projectPlan);
        setTimeline(PRE_POPULATED_TEMPLATES["Default"].timeline);
        setTerms(PRE_POPULATED_TEMPLATES["Default"].terms);
        setCoverImage("");
        setPageImage("");
      }
      setShowAddCompanyInline(false);
      setNewCompanyName("");
      setNewCompanyContact("");
      setNewCompanyEmail("");
    }
  }, [isOpen, initialProposal]);

  // Hook template change to first selected service
  useEffect(() => {
    if (!initialProposal && selectedServices.length > 0) {
      const mainService = selectedServices[0];
      const template = PRE_POPULATED_TEMPLATES[mainService] || PRE_POPULATED_TEMPLATES["Default"];
      setCoverPage(template.coverPage);
      setMethodology(template.methodology);
      setProjectPlan(template.projectPlan);
      setTimeline(template.timeline);
      setTerms(template.terms);
    }
  }, [selectedServices, initialProposal]);

  const handleToggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "cover" | "page") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("png")) {
      alert(t("Please upload a PNG file only."));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === "cover") {
        setCoverImage(base64String);
      } else {
        setPageImage(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAiTableConvert = async () => {
    if (!rawPastedHtml.trim()) {
      alert(t("Please paste the content to convert in the box."));
      return;
    }
    setIsAiConverting(true);
    try {
      const response = await fetch("/api/gemini/convert-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedContent: rawPastedHtml }),
      });
      if (!response.ok) {
        throw new Error("API sunucu hatası oluştu.");
      }
      const data = await response.json();
      if (data.htmlTable) {
        if (targetFieldForAi === "methodology") setMethodology(data.htmlTable);
        else if (targetFieldForAi === "projectPlan") setProjectPlan(data.htmlTable);
        else if (targetFieldForAi === "timeline") setTimeline(data.htmlTable);
        else if (targetFieldForAi === "terms") setTerms(data.htmlTable);
        
        setRawPastedHtml("");
        alert(t("AI successfully converted the pasted content into a gorgeous HTML table and populated the selected field!"));
      } else {
        throw new Error("Yapay zekadan geçerli bir tablo alınamadı.");
      }
    } catch (err: any) {
      console.error(err);
      alert((t("Conversion error: ")) + (err.message || "Unknown error"));
    } finally {
      setIsAiConverting(false);
    }
  };

  const handleOptionChange = (optionName: string, field: keyof ProposalOption, value: any) => {
    setOptions((prev) => ({
      ...prev,
      [optionName]: {
        ...prev[optionName],
        [field]: value,
      },
    }));
  };

  const handleQuickAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    const newComp: Company = {
      id: `company-${Date.now()}`,
      name: newCompanyName,
      accountOwner: "GP",
      phone: "",
      website: "",
      customerStatus: "Lead",
      description: "Quick created for proposal integration.",
      billingAddress: "",
      billingCity: "Bursa",
      billingDistrict: "",
      billingCountry: "TR",
      billingPostalCode: "",
      industry: "Manufacturing",
      employeeCount: 100,
      subIndustry: "Automotive",
      shift: "3 Shifts",
      managementTeam: "",
      annualRevenue: "0",
      annualRevenueCurrency: "₺",
      productionType: "",
      squareMeter: "",
      digitalInfrastructure: "",
      customFields: {
        contactName: newCompanyContact || "N/A",
        contactEmail: newCompanyEmail || "N/A"
      }
    };

    onAddCompany(newComp);
    setSelectedCompanyId(newComp.id);
    setContactPerson(newCompanyContact || "N/A");
    setContactEmail(newCompanyEmail || "N/A");
    setShowAddCompanyInline(false);
  };

  // Sync contact details if existing company selected
  useEffect(() => {
    if (selectedCompanyId) {
      const comp = companies.find((c) => c.id === selectedCompanyId);
      if (comp && !selectedContactId) {
        setContactPerson(comp.customFields?.contactName || comp.name + " Representative");
        setContactEmail(comp.customFields?.contactEmail || "contact@gembapartner.com");
      }
    }
  }, [selectedCompanyId, companies, selectedContactId]);

  const companyDeals = selectedCompanyId
    ? CrmDb.getDeals().filter((d) => d.companyId === selectedCompanyId || d.companyName === companies.find((c) => c.id === selectedCompanyId)?.name)
    : [];
  const companyContacts = selectedCompanyId ? CrmDb.getContactsByCompany(selectedCompanyId) : [];

  useEffect(() => {
    if (selectedContactId) {
      const contact = companyContacts.find((c) => c.id === selectedContactId);
      if (contact) {
        setContactPerson(`${contact.firstName} ${contact.lastName}`.trim());
        setContactEmail(contact.email || contactEmail);
      }
    }
  }, [selectedContactId, companyContacts]);

  const calculateOptionTotal = (opt: ProposalOption): number => {
    return opt.manDays * opt.dailyRate + opt.expenses;
  };

  const currentActiveOptionKeys = Object.keys(activeOptions).filter((k) => activeOptions[k]);

  const calculateOverallTotal = (): number => {
    return currentActiveOptionKeys.reduce((sum, key) => sum + calculateOptionTotal(options[key]), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      alert(t("Please select a target Company."));
      return;
    }
    const company = companies.find((c) => c.id === selectedCompanyId);
    if (!company) return;

    const linkedDeal = selectedDealId ? CrmDb.getDeals().find((d) => d.id === selectedDealId) : undefined;

    // Filter and build pure option set
    const finalOptions: { [key: string]: ProposalOption } = {};
    currentActiveOptionKeys.forEach((key) => {
      finalOptions[key] = options[key];
    });

    const totalBudget = calculateOverallTotal();
    const taxes = totalBudget * 0.20; // 20% VAT
    const grandTotal = totalBudget + taxes;

    const proposalData: Proposal = {
      id: initialProposal?.id || `prop-${Date.now()}`,
      sequenceNo: initialProposal?.sequenceNo || 0,
      proposalNumber: initialProposal?.proposalNumber || "",
      companyId: selectedCompanyId,
      companyName: company.name,
      dealId: selectedDealId || undefined,
      dealName: linkedDeal?.dealName,
      contactId: selectedContactId || undefined,
      wordTemplateId: selectedWordTemplateId || undefined,
      contactPerson,
      contactEmail,
      proposalSubject,
      date,
      currency,
      owner,
      description,
      status: initialProposal?.status || "Draft",
      services: selectedServices,
      options: finalOptions,
      totalBudget,
      taxes,
      grandTotal,
      currentVersion: initialProposal?.currentVersion || "V1",
      versions: initialProposal?.versions ? initialProposal.versions.map(v => {
        if (v.version === initialProposal.currentVersion) {
          return {
            ...v,
            subject: proposalSubject,
            currency: currency,
            options: finalOptions,
            services: selectedServices,
            totalBudget,
            taxes,
            grandTotal,
            coverPage,
            methodology,
            projectPlan,
            timeline,
            terms,
            coverImage,
            pageImage,
          };
        }
        return v;
      }) : [
        {
          version: "V1",
          date: new Date().toISOString(),
          reason: "Initial submission",
          changes: "Baseline proposal document created.",
          owner: owner,
          subject: proposalSubject,
          currency: currency,
          options: finalOptions,
          services: selectedServices,
          totalBudget,
          taxes,
          grandTotal,
          coverPage,
          methodology,
          projectPlan,
          timeline,
          terms,
          coverImage,
          pageImage,
        },
      ],
      createdBy: initialProposal?.createdBy || owner,
      lastUpdate: new Date().toISOString(),
      coverPage,
      methodology,
      projectPlan,
      timeline,
      terms,
      coverImage,
      pageImage,
    };

    onSave(proposalData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto px-4 py-8">
      <div className="bg-white dark:bg-[#1e1d1c] rounded-xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-5xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-605 to-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                {initialProposal ? t("Edit Opportunity / Proposal") : t("Create Opportunity / Proposal")}
              </h3>
              <p className="text-[10px] text-emerald-100">
                {t("Establish corporate bids with custom options and templates")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 px-1.5 hover:bg-black/15 rounded text-white text-xs font-bold cursor-pointer transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* Section 1: Company Lookup */}
          <div className="bg-slate-50 dark:bg-black/15 p-4 rounded-xl border border-slate-150 dark:border-zinc-850 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-700 dark:text-zinc-200 uppercase tracking-widest font-mono text-[10px]">{t("1. Client Registry Association")}</span>
              <button
                type="button"
                onClick={() => setShowAddCompanyInline(!showAddCompanyInline)}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Quick Add Company
              </button>
            </div>

            {showAddCompanyInline && (
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-emerald-100 dark:border-green-950 space-y-3">
                <p className="font-bold text-[10px] text-emerald-800 dark:text-emerald-400">{t("Quick Company Registration")}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold">{t("COMPANY NAME *")}</label>
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      className="w-full p-2 border border-slate-200 bg-white dark:bg-zinc-800 rounded outline-none"
                      placeholder={t("e.g. ABC Textiles Ltd.")}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold">{t("CONTACT PERSON")}</label>
                    <input
                      type="text"
                      value={newCompanyContact}
                      onChange={(e) => setNewCompanyContact(e.target.value)}
                      className="w-full p-2 border border-slate-200 bg-white dark:bg-zinc-800 rounded outline-none"
                      placeholder={t("John Doe")}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold">{t("CONTACT EMAIL")}</label>
                    <input
                      type="email"
                      value={newCompanyEmail}
                      onChange={(e) => setNewCompanyEmail(e.target.value)}
                      className="w-full p-2 border border-slate-200 bg-white dark:bg-zinc-800 rounded outline-none"
                      placeholder={t("john@abctextiles.com")}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCompanyInline(false)}
                    className="p-1 px-3 bg-slate-100 dark:bg-zinc-800 text-slate-650 hover:bg-slate-200 rounded font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAddCompany}
                    className="p-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer"
                  >
                    Save &amp; Bind
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Select Target Company *")}</label>
                <div className="mt-1">
                  <CompanyAutocomplete
                    value={selectedCompanyId}
                    onChange={(company) => {
                      setSelectedCompanyId(company.id);
                      if (company.id && !companies.some(c => c.id === company.id)) {
                        onAddCompany(company);
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono mt-1 md:mt-0">{t("Contact Person")}</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none mt-1"
                  placeholder={t("Contact Name")}
                />
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono mt-1 md:mt-0">{t("Contact Email")}</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none mt-1"
                  placeholder={t("contact@company.com")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Linked Deal")}</label>
                <select
                  value={selectedDealId}
                  onChange={(e) => setSelectedDealId(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none mt-1"
                  disabled={!selectedCompanyId}
                >
                  <option value="">{t("-- No deal --")}</option>
                  {companyDeals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dealName || d.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("CRM Contact")}</label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none mt-1"
                  disabled={!selectedCompanyId}
                >
                  <option value="">{t("-- Manual contact --")}</option>
                  {companyContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Word Template")}</label>
                <select
                  value={selectedWordTemplateId}
                  onChange={(e) => setSelectedWordTemplateId(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none mt-1"
                >
                  <option value="">{t("-- Default template --")}</option>
                  {wordTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Header Info */}
          <div className="bg-slate-50 dark:bg-black/15 p-4 rounded-xl border border-slate-150 dark:border-zinc-850 space-y-4">
            <span className="font-extrabold text-slate-700 dark:text-zinc-200 uppercase tracking-widest font-mono text-[10px]">{t("2. Commercial Cover & Scope Details")}</span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Proposal Subject *")}</label>
                <input
                  required
                  type="text"
                  value={proposalSubject}
                  onChange={(e) => setProposalSubject(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none mt-1"
                  placeholder={t("Subject of consulting / training proposal...")}
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Proposal date *")}</label>
                <input
                  required
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none mt-1"
                  placeholder={t("DD.MM.YYYY")}
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Proposal Currency")}</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none mt-1 font-bold text-emerald-600 dark:text-emerald-400"
                >
                  <option value="₺">₺ TRY</option>
                  <option value="$">$ USD</option>
                  <option value="€">€ EUR</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Sales Owner")}</label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none mt-1"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Short Description / Focus Opportunities")}</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none mt-1"
                  placeholder={t("A few words about continuous improvement and wastes targeted.")}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Selected Services */}
          <div className="bg-slate-50 dark:bg-black/15 p-4 rounded-xl border border-slate-150 dark:border-zinc-850 space-y-3">
            <span className="font-extrabold text-slate-700 dark:text-zinc-200 uppercase tracking-widest font-mono text-[10px]">{t("3. Operational Excellence Services Enveloped")}</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
              {servicesList.map((srv) => {
                const active = selectedServices.includes(srv);
                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => handleToggleService(srv)}
                    className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      active
                        ? "bg-emerald-50 dark:bg-green-955/20 border-emerald-500 text-emerald-800 dark:text-emerald-450 font-bold shadow-sm"
                        : "bg-white dark:bg-zinc-800 border-slate-150 dark:border-zinc-700 text-slate-650 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-750"
                    }`}
                  >
                    <span>{srv}</span>
                    {active && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Document Merging Templates */}
          <div className="bg-slate-50 dark:bg-black/15 p-4 rounded-xl border border-slate-150 dark:border-zinc-850 space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-slate-700 dark:text-zinc-200 uppercase tracking-widest font-mono text-[10px]">{t("4. Document Content Builder Templates")}</span>
              <span className="text-[10px] text-green-600 font-bold bg-green-55/15 px-2 py-0.5 rounded-full">{t("✨ AI Enabled")}</span>
            </div>

            <div className="space-y-4 pt-1">
              {/* Custom PNG Letterhead Background Template Uploaders */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 rounded-lg space-y-2.5">
                <span className="font-bold text-[10px] text-slate-500 uppercase font-mono block">{t("🖼️ Custom Document Letterhead Backgrounds (PNG)")}</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Cover.png upload */}
                  <div className="border border-dashed border-slate-250 dark:border-zinc-700 rounded-lg p-2.5 space-y-2 bg-[#fafafa] dark:bg-zinc-850">
                    <label className="block text-[9px] text-slate-450 font-bold uppercase font-mono">{t("First Page Letterhead (cover.png)")}</label>
                    {coverImage ? (
                      <div className="space-y-1.5">
                        <div className="relative h-14 bg-white dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                          <img src={coverImage} alt="cover.png" referrerPolicy="no-referrer" className="h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setCoverImage("")}
                            className="absolute top-1 right-1 bg-rose-600 text-white p-0.5 rounded hover:bg-rose-750 transition-colors cursor-pointer text-[9px] font-bold px-1"
                          >
                            {t("× Remove")}
                          </button>
                        </div>
                        <p className="text-[8px] text-emerald-600 font-bold">{t("✓ Custom cover.png uploaded successfully")}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/png"
                          id="cover-img-input"
                          onChange={(e) => handleImageUpload(e, "cover")}
                          className="hidden"
                        />
                        <label
                          htmlFor="cover-img-input"
                          className="flex-1 text-center py-2 px-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-750 hover:bg-slate-100 rounded text-[10px] font-bold text-slate-600 dark:text-zinc-350 cursor-pointer transition-all"
                        >
                          {t("📁 Choose cover.png")}
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Page.png upload */}
                  <div className="border border-dashed border-slate-250 dark:border-zinc-700 rounded-lg p-2.5 space-y-2 bg-[#fafafa] dark:bg-zinc-850">
                    <label className="block text-[9px] text-slate-450 font-bold uppercase font-mono">{t("Inner Pages Letterhead (page.png)")}</label>
                    {pageImage ? (
                      <div className="space-y-1.5">
                        <div className="relative h-14 bg-white dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                          <img src={pageImage} alt="page.png" referrerPolicy="no-referrer" className="h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setPageImage("")}
                            className="absolute top-1 right-1 bg-rose-600 text-white p-0.5 rounded hover:bg-rose-750 transition-colors cursor-pointer text-[9px] font-bold px-1"
                          >
                            {t("× Remove")}
                          </button>
                        </div>
                        <p className="text-[8px] text-emerald-600 font-bold">{t("✓ Custom page.png uploaded successfully")}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/png"
                          id="page-img-input"
                          onChange={(e) => handleImageUpload(e, "page")}
                          className="hidden"
                        />
                        <label
                          htmlFor="page-img-input"
                          className="flex-1 text-center py-2 px-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-750 hover:bg-slate-100 rounded text-[10px] font-bold text-slate-600 dark:text-zinc-350 cursor-pointer transition-all"
                        >
                          {t("📁 Choose page.png")}
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Base Document Text Areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Lean Methodology Description")}</label>
                  <textarea
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none h-20 mt-1 text-xs text-slate-700 dark:text-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Project Plan Phases")}</label>
                  <textarea
                    value={projectPlan}
                    onChange={(e) => setProjectPlan(e.target.value)}
                    className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none h-20 mt-1 text-xs text-slate-700 dark:text-zinc-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Timeline & Sprints Milestone")}</label>
                  <textarea
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none h-20 mt-1 text-xs text-slate-700 dark:text-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-bold uppercase font-mono">{t("Financial Terms & Scope Protections")}</label>
                  <textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded outline-none h-20 mt-1 text-xs text-slate-700 dark:text-zinc-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Option Budgets (Option 1 - 4) */}
          <div className="bg-slate-50 dark:bg-black/15 p-4 rounded-xl border border-slate-150 dark:border-zinc-850 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-700 dark:text-zinc-200 uppercase tracking-widest font-mono text-[10px]">{t("5. Flexible Package Configurator (Option 1 - 4)")}</span>
              <div className="flex items-center gap-2">
                {["Option 2", "Option 3", "Option 4"].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveOptions((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      activeOptions[key]
                        ? "bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                        : "bg-emerald-50 dark:bg-green-955/20 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {activeOptions[key] ? t("Deactivate {key}").replace("{key}", key) : t("+ Activate {key}").replace("{key}", key)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(options)
                .filter((key) => activeOptions[key])
                .map((key) => {
                  const opt = options[key];
                  const budgetTotal = calculateOptionTotal(opt);
                  
                  return (
                    <div key={key} className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 p-4 rounded-xl space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b pb-1.5 dark:border-zinc-800">
                        <span className="font-extrabold text-slate-700 dark:text-zinc-300">{key} {t("Package")}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={opt.training}
                              onChange={(e) => handleOptionChange(key, "training", e.target.checked)}
                              className="accent-emerald-600 rounded"
                            />
                            Training
                          </label>
                          <label className="flex items-center gap-1 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={opt.consulting}
                              onChange={(e) => handleOptionChange(key, "consulting", e.target.checked)}
                              className="accent-emerald-600 rounded"
                            />
                            Consulting
                          </label>
                          <label className="flex items-center gap-1 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={opt.workshop}
                              onChange={(e) => handleOptionChange(key, "workshop", e.target.checked)}
                              className="accent-emerald-600 rounded"
                            />
                            Workshop
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[8px] text-slate-400 font-mono">{t("MAN-DAYS")}</label>
                          <input
                            type="number"
                            min="0"
                            value={opt.manDays}
                            onChange={(e) => handleOptionChange(key, "manDays", parseInt(e.target.value) || 0)}
                            className="w-full p-1.5 border border-slate-150 bg-slate-50 dark:bg-zinc-800 rounded text-center outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-400 font-mono">{t("DAILY RATE")}</label>
                          <input
                            type="number"
                            min="0"
                            value={opt.dailyRate}
                            onChange={(e) => handleOptionChange(key, "dailyRate", parseInt(e.target.value) || 0)}
                            className="w-full p-1.5 border border-slate-150 bg-slate-50 dark:bg-zinc-800 rounded text-center outline-none font-bold text-slate-700 dark:text-zinc-350"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-400 font-mono">{t("EXPENSES")} ({currency})</label>
                          <input
                            type="number"
                            min="0"
                            value={opt.expenses}
                            onChange={(e) => handleOptionChange(key, "expenses", parseInt(e.target.value) || 0)}
                            className="w-full p-1.5 border border-slate-150 bg-slate-50 dark:bg-zinc-800 rounded text-center outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-dashed dark:border-zinc-800">
                        <span className="text-[10px] text-slate-400">{t("Option Estimator Sum:")}</span>
                        <span className="font-extrabold text-xs text-slate-800 dark:text-zinc-100">
                          {currency} {formatSystemNumber(budgetTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Section 6: Unified Summary and Calculations Panel */}
          <div className="bg-emerald-50/40 dark:bg-green-955/5 p-4 rounded-xl border border-emerald-100 dark:border-green-950 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="blog text-[9px] text-emerald-700 font-bold uppercase">{t("Dynamic Financial Rollup Summary")}</span>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-700 dark:text-zinc-200 mt-0.5">
                  <span>{t("Subtotal:")} {currency} {formatSystemNumber(calculateOverallTotal())}</span>
                  <span className="text-slate-400">|</span>
                  <span>{t("VAT (20%):")} {currency} {formatSystemNumber((calculateOverallTotal() * 0.2))}</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-600/10 px-4 py-2 rounded-lg text-right border border-emerald-500/20 shadow-xs shrink-0">
              <span className="block text-[9px] text-emerald-700 font-bold">{t("GRAND TOTAL OFFER")}</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {currency} {formatSystemNumber((calculateOverallTotal() * 1.2))}
              </span>
            </div>
          </div>

          {/* Bottom Dialog Action Panel */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-650 dark:text-zinc-400 border border-slate-200 rounded-lg font-bold cursor-pointer transition-all"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" /> {t("Save Opportunity & Proposal")}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
