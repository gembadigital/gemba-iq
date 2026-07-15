import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { useLanguage } from "../lib/LanguageContext";
import { getSystemCurrency } from "../lib/currencyHelper";
import { CrmDb, Contact, CrmEmail, CrmDocument, CrmActivity } from "../lib/CrmDb";
import CompanyAutocomplete from "./CompanyAutocomplete";
import {
  Building,
  Phone,
  Globe,
  DollarSign,
  Users,
  CheckCircle,
  TrendingUp,
  Plus,
  X,
  Edit2,
  Trash2,
  Settings,
  MoreVertical,
  Briefcase,
  Search,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  Layers,
  HelpCircle,
  Minimize2,
  Maximize2,
  Download,
  Upload,
  Mail,
  FileText,
  Paperclip,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  User,
  Check,
  AlertCircle,
  FileCheck2,
  Lock,
  Heart,
  BarChart2,
  Activity,
  Award
} from "lucide-react";

// Sub-tabs modular components imports
import CompanyOverviewTab from "./company-tabs/CompanyOverviewTab";
import CompanyContactsTab from "./company-tabs/CompanyContactsTab";
import CompanyTimelineTab from "./company-tabs/CompanyTimelineTab";
import CompanyEmailsTab from "./company-tabs/CompanyEmailsTab";
import CompanyDocumentsTab from "./company-tabs/CompanyDocumentsTab";
import CompanyOpexTab from "./company-tabs/CompanyOpexTab";
import CompanyRevenueTab from "./company-tabs/CompanyRevenueTab";
import CompanyDetailView from "./CompanyDetailView";
import { TargetAccount } from "../types";
import { getActiveOrganizationId } from "../lib/tenantStorage";

// Must match the key TargetAccountsView.tsx / AISalesAssistant.tsx read from.
const TARGET_ACCOUNTS_KEY = "crm_target_accounts";

// Builds a compact page-number list (e.g. 1, 2, 3, ..., 12) instead of one
// button per page, which becomes an unusable long row once there are many
// pages of records.
function getCompactPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, 2, 3, totalPages]);
  pages.add(Math.max(1, currentPage - 1));
  pages.add(currentPage);
  pages.add(Math.min(totalPages, currentPage + 1));

  const sorted = Array.from(pages).filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  sorted.forEach((page, idx) => {
    if (idx > 0 && page - sorted[idx - 1] > 1) {
      result.push("...");
    }
    result.push(page);
  });
  return result;
}

// Interface definitions (exported for cross-component compatibility)
export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: "text" | "number" | "dropdown" | "checkbox" | "date" | "currency" | "textarea";
  options?: string[]; // for dropdown
}

export interface Company {
  id: string;
  organization_id?: string;
  name: string;
  phone?: string;
  website?: string;
  customerStatus: string; // Active Customer, Prospect, Lead, Inactive, lost
  industry: string; // Automotive, Textiles, Manufacturing, etc.
  sector?: string; // sub-sector
  employeeCount?: number;
  annualRevenue?: string;
  annualRevenueCurrency?: string; // ₺, $, €
  accountOwner: string; // Atakan Zehir, GP Sales
  billingAddress?: string;
  billingCity?: string;
  billingDistrict?: string;
  billingCountry?: string;
  billingPostalCode?: string;
  shift: string; // 1 Shift, 2 Shifts, 3 Shifts
  productionType?: string;
  squareMeter?: string;
  digitalInfrastructure: string;
  description?: string;
  managementTeam?: string;
  taxOffice?: string;
  taxNo?: string;
  healthScore?: number; // 1-100
  subIndustry?: string;
  lifecycleStage?: string;
  customFields?: { [key: string]: string }; // Custom field values
}

export default function CompaniesView() {
  const { lang, t } = useLanguage();

  // File import refs
  const csvImportInputRef = useRef<HTMLInputElement>(null);
  const xlsImportInputRef = useRef<HTMLInputElement>(null);

  // File import parser function
  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        const importedCompanies: Company[] = rawRows.map((row: any, index) => {
          const getVal = (englishKeys: string[], turkishKeys: string[], fallbackVal = "") => {
            const keys = [...englishKeys, ...turkishKeys].map(k => k.toLowerCase().trim());
            for (const rawKey of Object.keys(row)) {
              const cleanKey = rawKey.toLowerCase().trim();
              if (keys.includes(cleanKey)) {
                return String(row[rawKey] ?? "").trim();
              }
            }
            return fallbackVal;
          };

          const name = getVal(["company name", "company", "name"], ["şirket adı", "şirket", "ad", "isim"]);
          if (!name) return null;

          return {
            id: `company-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
            name,
            phone: getVal(["phone", "tel"], ["telefon", "tel no"]),
            website: getVal(["website", "web"], ["web sitesi", "internet sitesi"]),
            customerStatus: getVal(["status", "customerstatus", "customer status"], ["müşteri durumu", "durum"], "Lead"),
            industry: getVal(["industry", "sector group"], ["sektör", "ana sektör"], "Manufacturing"),
            sector: getVal(["sub-industry", "sub industry", "sector segment"], ["alt sektör", "segment"]),
            employeeCount: Number(getVal(["employee count", "employees", "headcount"], ["çalışan sayısı", "çalışan"], "50")) || 50,
            annualRevenue: getVal(["annual revenue", "revenue"], ["ciro", "ciro değeri"], "1,000,000"),
            annualRevenueCurrency: getVal(["currency"], ["para birimi"], "₺"),
            accountOwner: getVal(["account owner", "owner"], ["hesap temsilcisi", "sorumlu"], "Atakan Zehir"),
            billingAddress: getVal(["address", "billing address"], ["açık adres", "adres"]),
            billingCity: getVal(["city", "billing city"], ["şehir", "il"], "Bursa"),
            billingDistrict: getVal(["district", "billing district"], ["ilçe"], "Nilüfer"),
            billingCountry: getVal(["country", "billing country"], ["ülke"], "Türkiye"),
            billingPostalCode: getVal(["postal code", "zip", "billing postal code"], ["posta kodu"]),
            shift: getVal(["shift", "shift pattern"], ["vardiya", "vardiya düzeni"], "1 Shift"),
            productionType: getVal(["production type", "production flow"], ["üretim tipi", "üretim akış tipi"], "Serial Batch"),
            squareMeter: getVal(["square meters", "square meter", "area"], ["fabrika alanı", "m2", "metrekare"], "2500"),
            digitalInfrastructure: getVal(["digital infrastructure", "erp"], ["dijital altyapı", "erp altyapısı"], "ERP"),
            description: getVal(["description", "info"], ["açıklama", "not"]),
            taxOffice: getVal(["tax office"], ["vergi dairesi"]),
            taxNo: getVal(["tax no", "tax number", "tax id"], ["vergi no", "vergi numarası"]),
            healthScore: Number(getVal(["health score", "health"], ["sağlık skoru"], "75")) || 75,
            customFields: {}
          };
        }).filter(Boolean) as Company[];

        if (importedCompanies.length === 0) {
          alert(t("No valid company records found to import. Please check column headers."));
          return;
        }

        const updatedList = [...importedCompanies, ...companies];
        setCompanies(updatedList);
        CrmDb.saveCompanies(updatedList);
        
        alert(t("{count} companies successfully imported!").replace("{count}", String(importedCompanies.length)));
      } catch (err: any) {
        console.error(err);
        alert(t("Error reading file: {error}").replace("{error}", err.message));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // State Management
  const [companies, setCompanies] = useState<Company[]>(() => CrmDb.getCompanies() as any[]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [detailTab, setDetailTab] = useState<string>("overview");

  // Custom Fields Configurations
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>(() => {
    const saved = CrmDb.getCompanyCustomFieldDefs();
    return (saved as CustomFieldDefinition[]) || [];
  });
  const [isFieldCustomizerOpen, setIsFieldCustomizerOpen] = useState(false);
  const [newFieldForm, setNewFieldForm] = useState<Partial<CustomFieldDefinition>>({
    name: "",
    type: "text",
    options: []
  });

  // Create/Edit Company Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formState, setFormState] = useState<Partial<Company>>({
    name: "",
    phone: "",
    website: "",
    customerStatus: "Lead",
    industry: "Manufacturing",
    sector: "",
    employeeCount: 50,
    annualRevenue: "1,000,000",
    annualRevenueCurrency: "₺",
    accountOwner: "Atakan Zehir",
    billingAddress: "",
    billingCity: "Bursa",
    billingDistrict: "Nilüfer",
    billingCountry: "Türkiye",
    billingPostalCode: "",
    shift: "1 Shift",
    productionType: "Serial Batch",
    squareMeter: "2500",
    digitalInfrastructure: "ERP",
    description: "",
    managementTeam: "",
    taxOffice: "",
    taxNo: "",
    healthScore: 75,
    customFields: {}
  });

  // Table Grid Control States (Sorting, Filters, Pagination, Multi-select)
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  
  const [sortBy, setSortBy] = useState<keyof Company>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");

  // Sticky header table list container toggle
  const [isFullWidthTable, setIsFullWidthTable] = useState(false);

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

  // Sync to local storage
  useEffect(() => {
    CrmDb.saveCompanies(companies as any);
  }, [companies]);

  useEffect(() => {
    CrmDb.saveCompanyCustomFieldDefs(customFieldDefs);
  }, [customFieldDefs]);

  // Handle external search or deep navigation links
  useEffect(() => {
    const reload = () => {
      const latest = CrmDb.getCompanies() as any[];
      setCompanies(latest);
      
      const targetId = CrmDb.getKv("crm_active_target_id", "") || CrmDb.getKv("active_company_detail_id", "");
      if (targetId) {
        const found = latest.find(c => c.id === targetId);
        if (found) {
          setSelectedCompany(found);
          setDetailTab("overview");
        }
        CrmDb.setKv("crm_active_target_id", "");
        CrmDb.setKv("active_company_detail_id", "");
      }
    };
    reload();
    window.addEventListener("crm-navigate", reload);
    return () => window.removeEventListener("crm-navigate", reload);
  }, []);

  // Sync state if selectedCompany properties are modified inside sub-tabs
  const handleUpdateCompanyDirect = (
    updated: Company,
    fieldChanged?: string,
    oldValue?: string,
    newValue?: string
  ) => {
    setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedCompany(updated);

    // If change details are supplied, log a system audit event automatically!
    if (fieldChanged && oldValue !== newValue) {
      logAudit(updated.id, fieldChanged, oldValue || "N/A", newValue || "N/A", "Atakan Zehir");
    }
  };

  // Log Change History / Audit log persistent structure
  const logAudit = (companyId: string, field: string, oldVal: string, newVal: string, user: string) => {
    const key = `crm_company_audit_logs_${companyId}`;
    const logs = CrmDb.getKv<any[]>(key, []);
    
    logs.unshift({
      id: `audit-${Date.now()}`,
      field,
      oldValue: oldVal,
      newValue: newVal,
      user,
      timestamp: new Date().toISOString()
    });
    
    CrmDb.setKv(key, logs);
  };

  // Timeline logged activities helper
  const handleLogTimelineDirect = (title: string, desc: string, type: string) => {
    if (!selectedCompany) return;
    CrmDb.createActivity({
      companyId: selectedCompany.id,
      type: type as any,
      title,
      description: desc,
      user: "Atakan Zehir",
      date: new Date().toISOString()
    });
  };

  // Sort & Filter logic
  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    // Search Term Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(term) ||
        (c.industry && c.industry.toLowerCase().includes(term)) ||
        (c.accountOwner && c.accountOwner.toLowerCase().includes(term)) ||
        (c.billingCity && c.billingCity.toLowerCase().includes(term))
      );
    }

    // Dropdown Filters
    if (industryFilter !== "All") {
      result = result.filter(c => c.industry === industryFilter);
    }
    if (statusFilter !== "All") {
      result = result.filter(c => c.customerStatus === statusFilter);
    }
    if (ownerFilter !== "All") {
      result = result.filter(c => c.accountOwner === ownerFilter);
    }

    // Sort Result
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB as string || "").toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [companies, searchTerm, industryFilter, statusFilter, ownerFilter, sortBy, sortOrder]);

  // Paginated chunk
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCompanies, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  // Sorting Handler
  const handleSort = (field: keyof Company) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Checkbox multi-select helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const ids = paginatedCompanies.map(c => c.id);
      setSelectedCompanyIds(ids);
    } else {
      setSelectedCompanyIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCompanyIds(prev => [...prev, id]);
    } else {
      setSelectedCompanyIds(prev => prev.filter(x => x !== id));
    }
  };

  // Bulk Actions execution
  const handleExecuteBulkAction = () => {
    if (selectedCompanyIds.length === 0) {
      alert(t("Please select at least one company!"));
      return;
    }

    if (bulkAction === "delete") {
      if (confirm(t("Are you sure you want to permanently delete selected {count} companies?").replace("{count}", String(selectedCompanyIds.length)))) {
        setCompanies(prev => prev.filter(c => !selectedCompanyIds.includes(c.id)));
        setSelectedCompanyIds([]);
        setBulkAction("");
      }
    } else if (bulkAction.startsWith("status:")) {
      const targetStatus = bulkAction.replace("status:", "");
      setCompanies(prev => prev.map(c => {
        if (selectedCompanyIds.includes(c.id)) {
          logAudit(c.id, "Account Status", c.customerStatus, targetStatus, "Atakan Zehir (Bulk)");
          return { ...c, customerStatus: targetStatus };
        }
        return c;
      }));
      setSelectedCompanyIds([]);
      setBulkAction("");
    } else if (bulkAction.startsWith("owner:")) {
      const targetOwner = bulkAction.replace("owner:", "");
      setCompanies(prev => prev.map(c => {
        if (selectedCompanyIds.includes(c.id)) {
          logAudit(c.id, "Account Owner", c.accountOwner, targetOwner, "Atakan Zehir (Bulk)");
          return { ...c, accountOwner: targetOwner };
        }
        return c;
      }));
      setSelectedCompanyIds([]);
      setBulkAction("");
    } else if (bulkAction === "target_accounts") {
      const selectedCompanies = companies.filter(c => selectedCompanyIds.includes(c.id));
      const existing = CrmDb.getKv<TargetAccount[]>(TARGET_ACCOUNTS_KEY, []);
      const existingNames = new Set(existing.map(a => a.companyName.toLowerCase().trim()));

      const newTargetAccounts: TargetAccount[] = selectedCompanies
        .filter(c => !existingNames.has(c.name.toLowerCase().trim()))
        .map((c, idx) => ({
          id: `target_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
          organization_id: getActiveOrganizationId() || undefined,
          companyName: c.name,
          websiteUrl: c.website || "",
          industryTag: c.industry || "",
          companySize: c.employeeCount ? String(c.employeeCount) : "",
          locationMain: [c.billingCity, c.billingCountry].filter(Boolean).join(", "),
          aiAnalysisSummary: "",
          draftTemplates: "",
          analysisSource: "Manual (Companies list)",
          analysisDate: new Date().toISOString(),
          riskScore: 0,
          rawOutput: "",
          no: existing.length + idx + 1,
        }));

      const skippedCount = selectedCompanies.length - newTargetAccounts.length;
      if (newTargetAccounts.length > 0) {
        CrmDb.setKv(TARGET_ACCOUNTS_KEY, [...existing, ...newTargetAccounts]);
      }
      alert(
        skippedCount > 0
          ? t("{added} companies moved to Target Accounts. {skipped} were already there.")
              .replace("{added}", String(newTargetAccounts.length))
              .replace("{skipped}", String(skippedCount))
          : t("{count} companies moved to Target Accounts.").replace("{count}", String(newTargetAccounts.length))
      );
      setSelectedCompanyIds([]);
      setBulkAction("");
    }
  };

  // Create / Edit modal submit action
  const handleSaveCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name) {
      alert(t("Company Name is required!"));
      return;
    }

    if (editingCompany) {
      // Edit
      setCompanies(prev => prev.map(c => {
        if (c.id === editingCompany.id) {
          const merged = { ...c, ...formState, id: editingCompany.id } as Company;
          if (selectedCompany && selectedCompany.id === editingCompany.id) {
            setSelectedCompany(merged);
          }
          return merged;
        }
        return c;
      }));
      logAudit(editingCompany.id, "Profile Updated", "Form Edit", "Modified all properties", "Atakan Zehir");
    } else {
      // Create relational linking inside CrmDb
      const newComp = CrmDb.createCompany({
        name: formState.name!,
        phone: formState.phone,
        website: formState.website,
        customerStatus: formState.customerStatus || "Lead",
        industry: formState.industry || "Manufacturing",
        accountOwner: formState.accountOwner || "Atakan Zehir",
        billingCity: formState.billingCity,
        billingDistrict: formState.billingDistrict,
        billingAddress: formState.billingAddress,
        shift: formState.shift || "1 Shift",
        digitalInfrastructure: formState.digitalInfrastructure || "ERP",
        description: formState.description,
        managementTeam: formState.managementTeam,
        taxOffice: formState.taxOffice,
        taxNo: formState.taxNo,
        healthScore: Number(formState.healthScore) || 75,
        customFields: formState.customFields || {}
      }) as unknown as Company;

      // Append custom fields
      newComp.customFields = formState.customFields || {};
      setCompanies(prev => [newComp, ...prev]);
    }

    setIsFormOpen(false);
    setEditingCompany(null);
  };

  const handleOpenAddForm = () => {
    setEditingCompany(null);
    setFormState({
      name: "",
      phone: "",
      website: "",
      customerStatus: "Lead",
      industry: "Manufacturing",
      sector: "",
      employeeCount: 50,
      annualRevenue: "1,000,000",
      annualRevenueCurrency: "₺",
      accountOwner: "Atakan Zehir",
      billingAddress: "",
      billingCity: "Bursa",
      billingDistrict: "Nilüfer",
      billingCountry: "Türkiye",
      billingPostalCode: "",
      shift: "1 Shift",
      productionType: "Serial Batch",
      squareMeter: "2500",
      digitalInfrastructure: "ERP",
      description: "",
      managementTeam: "",
      taxOffice: "",
      taxNo: "",
      healthScore: 75,
      customFields: {}
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (c: Company) => {
    setEditingCompany(c);
    setFormState({ ...c });
    setIsFormOpen(true);
  };

  const handleDeleteCompany = (id: string, name: string) => {
    if (confirm(t("Are you sure you want to delete {name} and all associated proposals/deals?").replace("{name}", name))) {
      setCompanies(prev => prev.filter(c => c.id !== id));
      setSelectedCompanyIds(prev => prev.filter(x => x !== id));
      if (selectedCompany?.id === id) {
        setSelectedCompany(null);
      }
    }
  };

  // Custom Fields definition addition
  const handleAddCustomFieldDef = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldForm.name) return;

    const def: CustomFieldDefinition = {
      id: `custom_field_${Date.now()}`,
      name: newFieldForm.name,
      type: newFieldForm.type || "text",
      options: newFieldForm.options || []
    };

    setCustomFieldDefs(prev => [...prev, def]);
    setNewFieldForm({ name: "", type: "text", options: [] });
  };

  const handleDeleteCustomFieldDef = (id: string) => {
    if (confirm(t("Delete this custom field definition?"))) {
      setCustomFieldDefs(prev => prev.filter(d => d.id !== id));
    }
  };

  // Export CSV/XLS legacy actions
  const handleExportCSV = () => {
    try {
      let csvContent = "";
      const headers = [
        "Company Name", "Phone", "Website", "Status", "Industry", "Sub-Industry",
        "Employee Count", "Annual Revenue", "Currency", "Account Owner", "Address",
        "City", "District", "Country", "Postal Code", "Shift", "Production Type",
        "Square Meters", "Digital Infrastructure", "Description"
      ];
      csvContent += headers.join(",") + "\n";

      filteredCompanies.forEach(c => {
        const row = [
          c.name, c.phone, c.website, c.customerStatus, c.industry, c.sector,
          String(c.employeeCount || 0), c.annualRevenue, c.annualRevenueCurrency, c.accountOwner,
          c.billingAddress, c.billingCity, c.billingDistrict, c.billingCountry, c.billingPostalCode,
          c.shift, c.productionType, c.squareMeter, c.digitalInfrastructure, c.description
        ];
        csvContent += row.map(val => `"${(val || "").replace(/"/g, '""')}"`).join(",") + "\n";
      });

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GP_Companies_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportXLS = () => {
    try {
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
      html += `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Companies</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
      html += `<table border="1">`;
      
      html += `<tr style="background-color: #0078D4; color: #ffffff; font-weight: bold;">`;
      const headers = [
        "Company Name", "Phone", "Website", "Status", "Industry", "Sub-Industry",
        "Employee Count", "Annual Revenue", "Currency", "Account Owner", "Address",
        "City", "District", "Country", "Postal Code", "Shift", "Production Type",
        "Square Meters", "Digital Infrastructure", "Description"
      ];
      headers.forEach(h => { html += `<th>${h}</th>`; });
      html += `</tr>`;

      filteredCompanies.forEach(c => {
        html += `<tr>`;
        const row = [
          c.name, c.phone, c.website, c.customerStatus, c.industry, c.sector,
          String(c.employeeCount || 0), c.annualRevenue, c.annualRevenueCurrency, c.accountOwner,
          c.billingAddress, c.billingCity, c.billingDistrict, c.billingCountry, c.billingPostalCode,
          c.shift, c.productionType, c.squareMeter, c.digitalInfrastructure, c.description
        ];
        row.forEach(val => { html += `<td>${val || ""}</td>`; });
        html += `</tr>`;
      });

      html += `</table></body></html>`;

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GP_Companies_${new Date().toISOString().split("T")[0]}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-5 font-sans bg-[#F8F9FA] dark:bg-zinc-950 min-h-screen text-xs space-y-4">
      
      {/* -------------------------------------------------------------
          1. COMPANIES LIST PAGE TABLE VIEW
          ------------------------------------------------------------- */}
      {!selectedCompany && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Page Title & Actions Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                <Building className="w-5.5 h-5.5 text-[#0078D4]" />
                <span>{t("Client Portfolio & Accounts")}</span>
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 font-sans">
                {t("The relational single source of truth master ledger for lean manufacturing diagnostics, activities, and billing.")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsFieldCustomizerOpen(true)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-205 dark:border-zinc-800 text-slate-650 dark:text-zinc-300 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{t("Custom Fields")}</span>
              </button>
              
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t("Add Enterprise Company")}</span>
              </button>
            </div>
          </div>

          {/* Filters, Search, and Bulk Actions Toolbar */}
          <div className="bg-white dark:bg-[#131313] p-4 rounded-xl border border-slate-100 dark:border-zinc-900/80 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-3">
            
            <div className="flex flex-col lg:flex-row gap-3">
              
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={t("Search corporate grid...")}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#0078D4]"
                />
              </div>

              {/* Grid Filter select options */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 shrink-0">
                <select
                  value={industryFilter}
                  onChange={(e) => { setIndustryFilter(e.target.value); setCurrentPage(1); }}
                  className="p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none"
                >
                  <option value="All">{t("All Industries")}</option>
                  <option value="Manufacturing">{t("Manufacturing")}</option>
                  <option value="Automotive">{t("Automotive")}</option>
                  <option value="Textiles">{t("Textiles")}</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none"
                >
                  <option value="All">{t("All Statuses")}</option>
                  <option value="Lead">{t("Lead")}</option>
                  <option value="Prospect">{t("Prospect")}</option>
                  <option value="Active Customer">{t("Active")}</option>
                </select>

                <select
                  value={ownerFilter}
                  onChange={(e) => { setOwnerFilter(e.target.value); setCurrentPage(1); }}
                  className="p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none col-span-2 md:col-span-1"
                >
                  <option value="All">{t("All Owners")}</option>
                  <option value="Atakan Zehir">Atakan Zehir</option>
                  <option value="GP Sales">GP Sales</option>
                </select>
              </div>

            </div>

            {/* Bulk Actions and Export Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-dashed border-slate-100 dark:border-zinc-800 pt-3">
              
              {/* Bulk Actions Dropdown */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {selectedCompanyIds.length} {t("Selected")}
                </span>

                <select
                  disabled={selectedCompanyIds.length === 0}
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="p-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-zinc-300 text-[11px] disabled:opacity-50"
                >
                  <option value="">{t("-- Choose Bulk Action --")}</option>
                  <option value="delete">{t("Delete Selected")}</option>
                  <option value="status:Active Customer">{t("Set Status: Active")}</option>
                  <option value="status:Prospect">{t("Set Status: Prospect")}</option>
                  <option value="owner:Atakan Zehir">{t("Assign Owner: Atakan")}</option>
                  <option value="target_accounts">{t("Move to Target Accounts")}</option>
                </select>

                <button
                  type="button"
                  disabled={!bulkAction || selectedCompanyIds.length === 0}
                  onClick={handleExecuteBulkAction}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg font-bold disabled:opacity-50 text-[11px] cursor-pointer shrink-0"
                >
                  {t("Apply")}
                </button>
              </div>

              {/* Wide View toggle & Exports/Imports */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 ml-auto w-full sm:w-auto justify-end">
                {/* Hidden File Inputs for Import */}
                <input
                  type="file"
                  ref={csvImportInputRef}
                  style={{ display: "none" }}
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportFile(file);
                      e.target.value = "";
                    }
                  }}
                />
                <input
                  type="file"
                  ref={xlsImportInputRef}
                  style={{ display: "none" }}
                  accept=".xls,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportFile(file);
                      e.target.value = "";
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => setIsFullWidthTable(!isFullWidthTable)}
                  className={`p-1.5 rounded border transition-colors cursor-pointer hidden md:block ${
                    isFullWidthTable 
                      ? "bg-slate-200 border-slate-300 text-slate-750" 
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                  title={t("Toggle Full-Width Grid")}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Import Buttons */}
                <span className="text-[10px] font-mono font-black text-slate-400 dark:text-zinc-500 uppercase ml-1">
                  {t("IMPORT:")}
                </span>
                <div className="inline-flex rounded-lg border border-slate-205 dark:border-zinc-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => csvImportInputRef.current?.click()}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-550 hover:text-slate-800 dark:hover:text-zinc-350 border-r border-slate-205 dark:border-zinc-800 cursor-pointer text-[10px] font-bold flex items-center gap-1"
                    title={t("Import from CSV File")}
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-550" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => xlsImportInputRef.current?.click()}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-550 hover:text-slate-800 dark:hover:text-zinc-355 cursor-pointer text-[10px] font-bold flex items-center gap-1"
                    title={t("Import from Excel File")}
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-550" />
                    <span>EXCEL</span>
                  </button>
                </div>

                {/* Export Buttons */}
                <span className="text-[10px] font-mono font-black text-slate-400 dark:text-zinc-500 uppercase ml-1">
                  {t("EXPORT:")}
                </span>
                <div className="inline-flex rounded-lg border border-slate-205 dark:border-zinc-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300 border-r border-slate-205 dark:border-zinc-800 cursor-pointer text-[10px] font-bold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportXLS}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300 cursor-pointer text-[10px] font-bold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>EXCEL</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Companies Grid Table */}
          <div className="bg-white dark:bg-[#131313] rounded-xl border border-slate-100 dark:border-zinc-900/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-380px)] min-h-[240px]">
              <table className="w-full text-left border-collapse text-xs font-sans min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-900/80 border-b border-slate-150 dark:border-zinc-850/80 text-[10px] uppercase font-black text-slate-450 dark:text-zinc-500 font-mono tracking-wider sticky top-0 z-10">
                    <th className="p-3 pl-5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedCompanyIds.length === paginatedCompanies.length && paginatedCompanies.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="p-3 cursor-pointer select-none hover:bg-slate-100/50" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">
                        <span>{t("Company Name")}</span>
                        {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                      </div>
                    </th>
                    <th className="p-3 cursor-pointer select-none hover:bg-slate-100/50" onClick={() => handleSort("industry")}>
                      <div className="flex items-center gap-1">
                        <span>{t("Industry")}</span>
                        {sortBy === "industry" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                      </div>
                    </th>
                    <th className="p-3">{t("Location")}</th>
                    <th className="p-3 cursor-pointer select-none hover:bg-slate-100/50" onClick={() => handleSort("employeeCount")}>
                      <div className="flex items-center gap-1">
                        <span>{t("Employees")}</span>
                        {sortBy === "employeeCount" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                      </div>
                    </th>
                    <th className="p-3">{t("Revenue Pattern")}</th>
                    <th className="p-3">{t("Status")}</th>
                    <th className="p-3">{t("Account Owner")}</th>
                    <th className="p-3 cursor-pointer select-none hover:bg-slate-100/50" onClick={() => handleSort("healthScore")}>
                      <div className="flex items-center gap-1">
                        <span>{t("Health Score")}</span>
                        {sortBy === "healthScore" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                      </div>
                    </th>
                    <th className="p-3 text-right pr-5">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                  {paginatedCompanies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="p-3 pl-5">
                        <input
                          type="checkbox"
                          checked={selectedCompanyIds.includes(c.id)}
                          onChange={(e) => handleSelectRow(c.id, e.target.checked)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => { setSelectedCompany(c); setDetailTab("overview"); }}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline font-extrabold text-slate-800 dark:text-zinc-200 cursor-pointer text-left block text-[13px]"
                        >
                          {c.name}
                        </button>
                        {c.website && (
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{c.website}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-650 dark:text-zinc-400">{c.industry}</span>
                        {c.sector && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">{c.sector}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-zinc-400">
                        {c.billingCity ? `${c.billingCity}, ${c.billingDistrict || ""}` : (t("Bursa, TR"))}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-zinc-350">{c.employeeCount || 50}</td>
                      <td className="p-3">
                        <span className="font-extrabold text-slate-800 dark:text-zinc-200 font-mono">
                          {c.annualRevenue ? `${getSystemCurrency().symbol}${c.annualRevenue}` : `${getSystemCurrency().symbol}1.2M`}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{c.productionType || "Serial Batch"}</span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wide ${
                          c.customerStatus === "Active Customer" || c.customerStatus === "Existing Customer"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : c.customerStatus === "Prospect" || c.customerStatus === "Lead"
                              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400"
                              : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-450"
                        }`}>
                          {getTranslatedValue(c.customerStatus, "customerStatus")}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-zinc-300">{c.accountOwner || "Atakan Zehir"}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold text-xs ${
                            (c.healthScore || 75) >= 80 ? "text-emerald-500" : (c.healthScore || 75) >= 60 ? "text-amber-500" : "text-rose-500"
                          }`}>
                            {c.healthScore || 75}%
                          </span>
                          <div className="w-12 bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full ${
                                (c.healthScore || 75) >= 80 ? "bg-emerald-500" : (c.healthScore || 75) >= 60 ? "bg-amber-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${c.healthScore || 75}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right pr-5">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(c)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-800 text-slate-550 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer"
                            title={t("Edit Profile")}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompany(c.id, c.name)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 rounded cursor-pointer"
                            title={t("Delete Company")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3.5 border-t border-slate-100 dark:border-zinc-850/80 bg-slate-50 dark:bg-zinc-900/40 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-450 dark:text-zinc-500">
                  {t("Showing {start}-{end} of {total} companies")
                    .replace("{start}", String((currentPage - 1) * itemsPerPage + 1))
                    .replace("{end}", String(Math.min(currentPage * itemsPerPage, filteredCompanies.length)))
                    .replace("{total}", String(filteredCompanies.length))}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded text-[11px] disabled:opacity-50 cursor-pointer font-bold"
                  >
                    {t("Previous")}
                  </button>
                  {getCompactPageNumbers(currentPage, totalPages).map((token, idx) =>
                    token === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 select-none text-[11px]">
                        …
                      </span>
                    ) : (
                      <button
                        key={token}
                        type="button"
                        onClick={() => setCurrentPage(token as number)}
                        className={`px-2 py-1 rounded text-[11px] font-mono font-bold cursor-pointer ${
                          currentPage === token
                            ? "bg-indigo-600 text-white"
                            : "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        {token}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    title={t("Next")}
                    className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded text-[11px] disabled:opacity-50 cursor-pointer font-bold"
                  >
                    {"»"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          2. MASTER COMPANY DETAIL PERSISTENT PAGE VIEW (SLIDING TAB ENGINE)
          ------------------------------------------------------------- */}
      {selectedCompany && (
        <CompanyDetailView
          company={selectedCompany}
          onClose={() => { setSelectedCompany(null); setCompanies(CrmDb.getCompanies() as any[]); }}
          onUpdateCompany={handleUpdateCompanyDirect}
          onDeleteCompany={handleDeleteCompany}
          onOpenEditForm={handleOpenEditForm}
          customFieldDefs={customFieldDefs}
          lang={lang}
        />
      )}

      {/* -------------------------------------------------------------
          3. FULL PROFILE CREATE & EDIT SLIDING MODAL FORM
          ------------------------------------------------------------- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCompanySubmit}
            className="bg-white dark:bg-[#121212] border border-slate-205 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn text-xs"
          >
            
            <div className="p-4 bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800/80 flex justify-between items-center">
              <span className="font-extrabold text-slate-800 dark:text-zinc-150 text-sm flex items-center gap-2">
                <Building className="w-5 h-5 text-[#0078D4]" />
                {editingCompany 
                  ? t("Edit Account Profile: {name}").replace("{name}", editingCompany.name)
                  : (t("Create Enterprise Client Record"))}
              </span>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Company Name *")}</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                    {t("Customer Status")}
                  </label>
                  <select
                    value={formState.customerStatus}
                    onChange={(e) => setFormState({ ...formState, customerStatus: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none"
                  >
                    <option value="Lead">{t("Lead")}</option>
                    <option value="Prospect">{t("Prospect")}</option>
                    <option value="Active Customer">{t("Active Customer")}</option>
                    <option value="Inactive">{t("Inactive")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Phone")}</label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Web Site")}</label>
                  <input
                    type="text"
                    placeholder={t("example.com")}
                    value={formState.website}
                    onChange={(e) => setFormState({ ...formState, website: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                    {t("Industry")}
                  </label>
                  <select
                    value={formState.industry}
                    onChange={(e) => setFormState({ ...formState, industry: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none"
                  >
                    <option value="Manufacturing">{t("Manufacturing")}</option>
                    <option value="Automotive">{t("Automotive")}</option>
                    <option value="Textiles">{t("Textiles")}</option>
                    <option value="Technology / Software">{t("Technology / Software")}</option>
                    <option value="Other">{t("Other")}</option>
                  </select>
                </div>

                {(formState.industry === "Other" || formState.industry === "Diğer" || formState.industry === "diğer") && (
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                      {t("Custom Industry Explanation *")}
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.sector || ""}
                      onChange={(e) => setFormState({ ...formState, sector: e.target.value })}
                      placeholder={t("e.g. Defense, Food, Pharma...")}
                      className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                    {t("Account Owner")}
                  </label>
                  <input
                    type="text"
                    value={formState.accountOwner}
                    onChange={(e) => setFormState({ ...formState, accountOwner: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                    {t("City")}
                  </label>
                  <input
                    type="text"
                    value={formState.billingCity || ""}
                    onChange={(e) => setFormState({ ...formState, billingCity: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                    {t("District")}
                  </label>
                  <input
                    type="text"
                    value={formState.billingDistrict || ""}
                    onChange={(e) => setFormState({ ...formState, billingDistrict: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                    {t("Tax Office")}
                  </label>
                  <input
                    type="text"
                    value={formState.taxOffice || ""}
                    onChange={(e) => setFormState({ ...formState, taxOffice: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                    {t("Tax Number")}
                  </label>
                  <input
                    type="text"
                    value={formState.taxNo || ""}
                    onChange={(e) => setFormState({ ...formState, taxNo: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none text-xs"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                    {t("Address")}
                  </label>
                  <textarea
                    value={formState.billingAddress || ""}
                    onChange={(e) => setFormState({ ...formState, billingAddress: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none text-xs min-h-[50px] resize-y"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Açıklama</label>
                <textarea
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-2 focus:outline-none min-h-[60px]"
                />
              </div>

              {/* Custom fields form inputs */}
              {customFieldDefs.length > 0 && (
                <div className="border-t border-slate-100 dark:border-zinc-800 pt-3 space-y-3">
                  <h5 className="font-bold uppercase tracking-wider text-[10px] text-slate-400 font-mono">Custom field inputs</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customFieldDefs.map(def => {
                      const curVal = formState.customFields?.[def.id] || "";
                      return (
                        <div key={def.id}>
                          <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{def.name}</label>
                          <input
                            type="text"
                            value={curVal}
                            onChange={(e) => {
                              const updatedCustoms = {
                                ...(formState.customFields || {}),
                                [def.id]: e.target.value
                              };
                              setFormState({ ...formState, customFields: updatedCustoms });
                            }}
                            className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800/80 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
              >
                {t("Confirm Profile")}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* -------------------------------------------------------------
          4. CUSTOM FIELD DEFINITION CONFIGURATION MODAL
          ------------------------------------------------------------- */}
      {isFieldCustomizerOpen && (
        <div className="fixed inset-0 z-55 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] border border-slate-205 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl animate-scaleIn text-xs">
            
            <div className="p-4 bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                {t("Manage Custom CRM Fields")}
              </span>
              <button
                type="button"
                onClick={() => setIsFieldCustomizerOpen(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              {/* Form to add definition */}
              <form onSubmit={handleAddCustomFieldDef} className="bg-slate-50 dark:bg-zinc-900 p-3.5 border border-slate-150 dark:border-zinc-850 rounded-xl space-y-3">
                <span className="font-bold text-[10px] uppercase font-mono tracking-wider block text-slate-400">{t("Add custom column")}</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">{t("Field Label *")}</label>
                    <input
                      type="text"
                      required
                      placeholder={t("e.g. ERP Vendor, ISO Cert")}
                      value={newFieldForm.name || ""}
                      onChange={(e) => setNewFieldForm({ ...newFieldForm, name: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">{t("Type")}</label>
                    <select
                      value={newFieldForm.type}
                      onChange={(e: any) => setNewFieldForm({ ...newFieldForm, type: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 focus:outline-none"
                    >
                      <option value="text">{t("Text string")}</option>
                      <option value="number">{t("Numeric index")}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer"
                >
                  {t("Add Custom Field")}
                </button>
              </form>

              {/* List of current custom definitions */}
              <div className="space-y-2">
                <span className="font-bold text-[10px] uppercase font-mono tracking-wider block text-slate-400">{t("Current dynamic definitions")}</span>
                
                {customFieldDefs.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-4">{t("No custom fields defined yet.")}</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-zinc-850 max-h-[200px] overflow-y-auto pr-1">
                    {customFieldDefs.map(def => (
                      <div key={def.id} className="flex justify-between items-center py-2">
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-zinc-200">{def.name}</span>
                          <span className="text-[9px] font-mono text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded ml-2 uppercase">
                            {def.type}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomFieldDef(def.id)}
                          className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/20 text-rose-600 rounded cursor-pointer"
                          title={t("Delete definition")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsFieldCustomizerOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
              >
                {t("Close Customizer")}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
