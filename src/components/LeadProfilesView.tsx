import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../lib/LanguageContext";
import * as XLSX from "xlsx";
import {
  Users,
  Upload,
  Download,
  Save,
  Plus,
  Trash2,
  Search,
  ArrowRightLeft,
  Check,
  Sparkles,
  Database,
  Filter,
  CheckCircle,
  X,
  FileSpreadsheet,
  Edit,
  ArrowUpDown,
  FileText,
  Maximize2,
  Minimize2,
  Mail
} from "lucide-react";
import { LeadProfile, Recipient } from "../types";
import EmailLeadDiscoveryView from "./EmailLeadDiscoveryView";
import CompanyAutocomplete from "./CompanyAutocomplete";
import { CrmDb } from "../lib/CrmDb";
import { getActiveOrganizationId } from "../lib/tenantStorage";
import { useOrganization } from "../lib/OrganizationContext";
import { ConfirmModal } from "./shared/ConfirmModal";
import { useConfirm } from "../lib/useConfirm";

const LEAD_PROFILES_KEY = "crm_lead_profiles";
// Must match the key TargetAccountsView.tsx / AISalesAssistant.tsx / CompaniesView.tsx read from.
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

interface LeadProfilesViewProps {
  onPushToMailMerge: (newRecs: Recipient[]) => void;
  currentMailMergeCount: number;
}

export default function LeadProfilesView({
  onPushToMailMerge,
  currentMailMergeCount
}: LeadProfilesViewProps) {
  const { lang, t } = useLanguage();
  const { actorName } = useOrganization();
  const { confirm, confirmProps } = useConfirm();
  // Profiles Storage State
  const [profiles, setProfiles] = useState<LeadProfile[]>([]);

  // Tab control: "leads-registry" vs "email-discovery" (Contacted List)
  const [currentActiveSubTab, setCurrentActiveSubTab] = useState<"leads-registry" | "email-discovery">("leads-registry");

  // Interactive Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Custom interactive feedbacks
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New manual profile model state
  const [newProfile, setNewProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    department: "",
    address: "",
    industry: "",
    leadDemand: "",
    leadStatus: "New",
    leadSegment: "Cold",
    customField1: "",
    customField2: "",
    deliveryStatus: "idle",
    openCount: 0
  });

  // Edit lead modal/inline state
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LeadProfile | null>(null);

  // Wide View layout state
  const [isWide, setIsWide] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Close wide screen mode on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsWide(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load the active organization's shared lead registry from the CRM snapshot.
  useEffect(() => {
    setProfiles(CrmDb.getKv<LeadProfile[]>(LEAD_PROFILES_KEY, []));
  }, []);

  // Persist the registry through the active organization's CRM auxiliary record.
  const updateProfilesAndPersist = (updated: LeadProfile[]) => {
    const organizationId = getActiveOrganizationId();
    const scopedProfiles = updated.map((profile) => ({
      ...profile,
      organization_id: organizationId || profile.organization_id,
    }));
    setProfiles(scopedProfiles);
    CrmDb.setKv(LEAD_PROFILES_KEY, scopedProfiles);
  };

  const triggerToast = (msg: string, type: "success" | "info" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfile.email.trim() || !newProfile.firstName.trim() || !newProfile.lastName.trim()) {
      triggerToast(t("First Name, Last Name and Email Address are strictly required."), "error");
      return;
    }

    const added: LeadProfile = {
      id: `lead_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      no: profiles.length + 1,
      firstName: newProfile.firstName.trim(),
      lastName: newProfile.lastName.trim(),
      email: newProfile.email.trim(),
      company: newProfile.company.trim(),
      department: newProfile.department.trim(),
      address: newProfile.address.trim(),
      industry: newProfile.industry.trim(),
      leadDemand: newProfile.leadDemand,
      leadStatus: newProfile.leadStatus,
      leadSegment: newProfile.leadSegment,
      customField1: newProfile.customField1.trim(),
      customField2: newProfile.customField2.trim(),
      deliveryStatus: newProfile.deliveryStatus,
      openCount: newProfile.openCount,
      organization_id: getActiveOrganizationId() || undefined,
      addedBy: actorName,
    };

    const updatedList = [...profiles, added];
    updateProfilesAndPersist(updatedList);
    
    // Clear inputs and close accordion
    setNewProfile({
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      department: "",
      address: "",
      industry: "",
      leadDemand: "",
      leadStatus: "New",
      leadSegment: "Cold",
      customField1: "",
      customField2: "",
      deliveryStatus: "idle",
      openCount: 0
    });
    setIsAddingLead(false);
    triggerToast(t("Added {name} to Lead profiles registry").replace("{name}", `${added.firstName} ${added.lastName}`), "success");
  };

  const handleManualSaveAll = () => {
    updateProfilesAndPersist(profiles);
    triggerToast(t("Lead profile database committed & saved securely."), "success");
  };

  // Inline action editing
  const startEditingProfile = (profile: LeadProfile) => {
    setEditingProfileId(profile.id);
    setEditForm({ ...profile });
  };

  const saveEditedProfile = () => {
    if (!editForm) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      triggerToast(t("First Name, Last Name, and Email are validation prerequisites."), "error");
      return;
    }

    const updated = profiles.map(p => p.id === editForm.id ? editForm : p);
    updateProfilesAndPersist(updated);
    setEditingProfileId(null);
    setEditForm(null);
    triggerToast(t("Lead details updated successfully."), "success");
  };

  const deleteSingleProfile = async (id: string) => {
    const profile = profiles.find(p => p.id === id);
    const ok = await confirm({
      title: t("Delete Lead"),
      message: t("Are you sure you want to delete {name}?").replace("{name}", profile ? `${profile.firstName} ${profile.lastName}` : ""),
      confirmLabel: t("Delete"),
      cancelLabel: t("Cancel"),
      danger: true,
    });
    if (!ok) return;
    const remaining = profiles.filter(p => p.id !== id);
    // Standardize 'no' sequence values
    const standardized = remaining.map((p, idx) => ({ ...p, no: idx + 1 }));
    updateProfilesAndPersist(standardized);
    triggerToast(t("Profile removed from database."), "info");
  };

  const deleteSelectedProfiles = async () => {
    const remaining = profiles.filter(p => !p.isSelected);
    if (profiles.length === remaining.length) {
      triggerToast(t("No items selected to delete."), "info");
      return;
    }
    const ok = await confirm({
      title: t("Delete Selected"),
      message: t("Are you sure you want to permanently delete {count} selected lead profile(s)?").replace("{count}", String(profiles.length - remaining.length)),
      confirmLabel: t("Delete"),
      cancelLabel: t("Cancel"),
      danger: true,
    });
    if (!ok) return;
    const standardized = remaining.map((p, idx) => ({ ...p, no: idx + 1 }));
    updateProfilesAndPersist(standardized);
    triggerToast(t("Bulk deleted selected records successfully."), "success");
  };

  // Checkbox interactions
  const toggleSelectProfile = (id: string) => {
    const updated = profiles.map(p => p.id === id ? { ...p, isSelected: !p.isSelected } : p);
    setProfiles(updated); // Avoid persistent save on checkbox select
  };

  const toggleSelectAll = () => {
    const someUnselected = filteredProfiles.some(p => !p.isSelected);
    const updated = profiles.map(p => {
      const isFiltered = filteredProfiles.some(f => f.id === p.id);
      if (isFiltered) {
        return { ...p, isSelected: someUnselected };
      }
      return p;
    });
    setProfiles(updated);
  };

  // EXPORT OUT TO EXCEL-FRIENDLY CSV
  const handleExportCSV = () => {
    if (profiles.length === 0) {
      triggerToast(t("No leads available in registry to export."), "error");
      return;
    }

    // Semicolon-delimited headers exactly matching user specs:
    // ID;No;First Name;Last Name;Email Address;Company;Department;Address;Industry;Lead Demand;Lead Status;Lead Segment;Custom Field 1;Custom Field 2;Delivery Status;Open Count
    const headers = [
      "ID", "No", "First Name", "Last Name", "Email Address", "Company", "Department",
      "Address", "Industry", "Lead Demand", "Lead Status", "Lead Segment",
      "Custom Field 1", "Custom Field 2", "Delivery Status", "Open Count"
    ];

    const rows = profiles.map(p => [
      p.id,
      p.no,
      p.firstName || "",
      p.lastName || "",
      p.email || "",
      p.company || "",
      p.department || "",
      p.address || "",
      p.industry || "",
      p.leadDemand || "",
      p.leadStatus || "",
      p.leadSegment || "",
      p.customField1 || "",
      p.customField2 || "",
      p.deliveryStatus || "idle",
      p.openCount || 0
    ]);

    const fileContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => {
        const strVal = String(cell);
        // Escape semicolons and double quotes
        if (strVal.includes(";") || strVal.includes('"') || strVal.includes("\n")) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(";"))
    ].join("\n");

    // Add UTF-8 BOM so Excel opens it with perfect non-ascii characters
    const blob = new Blob(["\uFEFF" + fileContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `lead_profiles_database_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    triggerToast(t("Profiles database exported successfully as semicolon-delimited CSV."), "success");
  };

  // EXPORT TO EXCEL XLS
  const handleExportXLS = () => {
    if (profiles.length === 0) {
      triggerToast(t("No leads available in registry to export."), "error");
      return;
    }

    try {
      let html = `<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\" xmlns=\"http://www.w3.org/TR/REC-html40\">`;
      html += `<head><meta charset=\"utf-8\"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Leads</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
      html += `<table border=\"1\">`;
      
      html += `<tr style=\"background-color: #0078D4; color: #ffffff; font-weight: bold;\">`;
      const headers = [
        "ID", "No", "First Name", "Last Name", "Email Address", "Company", "Department",
        "Address", "Industry", "Lead Demand", "Lead Status", "Lead Segment",
        "Custom Field 1", "Custom Field 2", "Delivery Status", "Open Count"
      ];
      headers.forEach(h => {
        html += `<th>${h}</th>`;
      });
      html += `</tr>`;

      filteredProfiles.forEach(p => {
        html += `<tr>`;
        const row = [
          p.id,
          p.no,
          p.firstName || "",
          p.lastName || "",
          p.email || "",
          p.company || "",
          p.department || "",
          p.address || "",
          p.industry || "",
          p.leadDemand || "",
          p.leadStatus || "",
          p.leadSegment || "",
          p.customField1 || "",
          p.customField2 || "",
          p.deliveryStatus || "idle",
          p.openCount || 0
        ];
        row.forEach(val => {
          html += `<td>${String(val)}</td>`;
        });
        html += `</tr>`;
      });

      html += `</table></body></html>`;

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `lead_profiles_${new Date().toISOString().split('T')[0]}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast(t("Lead profiles database exported successfully in .xls format."), "success");
    } catch (err) {
      console.error("XLS Export failed", err);
      triggerToast(t("Export to .xls failed."), "error");
    }
  };

  // PARSE IMPORT SPREADSHEEET
  const handleSpreadsheetImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const workbook = XLSX.read(bstr, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

          if (rawRows.length < 2) {
            throw new Error(t("Spreadsheet file is missing headers or record data rows."));
          }

          // Read headers case-insensitively to map properly
          const originalHeaders = rawRows[0].map((h: any) => String(h || "").trim());
          const records: LeadProfile[] = [];

          // Helper to find indices of headers
          const findIndexByNames = (names: string[]) => {
            return originalHeaders.findIndex((h) =>
              names.some((name) => h.toLowerCase().replace(/[\s_;:-]+/g, "") === name.toLowerCase().replace(/[\s_;:-]+/g, ""))
            );
          };

          const idIdx = findIndexByNames(["id"]);
          const noIdx = findIndexByNames(["no"]);
          const fnIdx = findIndexByNames(["firstname", "first", "ad", "adi"]);
          const lnIdx = findIndexByNames(["lastname", "last", "soyad", "soyadi"]);
          const emailIdx = findIndexByNames(["emailaddress", "email", "mail", "eposta"]);
          const compIdx = findIndexByNames(["company", "sirket", "firma"]);
          const deptIdx = findIndexByNames(["department", "departman", "bolum"]);
          const addrIdx = findIndexByNames(["address", "adres"]);
          const indIdx = findIndexByNames(["industry", "sector", "sektor"]);
          const demIdx = findIndexByNames(["leaddemand", "demand", "talep"]);
          const statIdx = findIndexByNames(["leadstatus", "status", "durum"]);
          const segIdx = findIndexByNames(["leadsegment", "segment"]);
          const custom1Idx = findIndexByNames(["customfield1", "custom1", "ozel1"]);
          const custom2Idx = findIndexByNames(["customfield2", "custom2", "ozel2"]);
          const deliveryIdx = findIndexByNames(["deliverystatus", "deliveryStatus", "gonderimDurumu"]);
          const openIdx = findIndexByNames(["opencount", "openCount", "acmaSayisi"]);

          // Parse records
          for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (row.length === 0 || !row[Math.max(0, fnIdx, emailIdx)]) continue; // Skip empty rows

            const emailVal = emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : "";
            const fnVal = fnIdx !== -1 && row[fnIdx] ? String(row[fnIdx]).trim() : "";
            const lnVal = lnIdx !== -1 && row[lnIdx] ? String(row[lnIdx]).trim() : "";

            if (!emailVal) continue; // Email is critical

            records.push({
              id: idIdx !== -1 && row[idIdx] ? String(row[idIdx]) : `lead_imp_${Date.now()}_${i}_${Math.floor(Math.random() * 100)}`,
              no: noIdx !== -1 && row[noIdx] ? Number(row[noIdx]) : records.length + 1,
              firstName: fnVal,
              lastName: lnVal,
              email: emailVal,
              company: compIdx !== -1 && row[compIdx] ? String(row[compIdx]).trim() : "",
              department: deptIdx !== -1 && row[deptIdx] ? String(row[deptIdx]).trim() : "",
              address: addrIdx !== -1 && row[addrIdx] ? String(row[addrIdx]).trim() : "",
              industry: indIdx !== -1 && row[indIdx] ? String(row[indIdx]).trim() : "",
              leadDemand: demIdx !== -1 && row[demIdx] ? String(row[demIdx]).trim() : "",
              leadStatus: statIdx !== -1 && row[statIdx] ? String(row[statIdx]).trim() : "New",
              leadSegment: segIdx !== -1 && row[segIdx] ? String(row[segIdx]).trim() : "Cold",
              customField1: custom1Idx !== -1 && row[custom1Idx] ? String(row[custom1Idx]).trim() : "",
              customField2: custom2Idx !== -1 && row[custom2Idx] ? String(row[custom2Idx]).trim() : "",
              deliveryStatus: deliveryIdx !== -1 && row[deliveryIdx] ? String(row[deliveryIdx]).trim() : "idle",
              openCount: openIdx !== -1 && row[openIdx] ? Number(row[openIdx]) : 0,
              addedBy: actorName
            });
          }

          // Merge imported records into the profiles state
          const updated = [...profiles];
          let addedCount = 0;

          records.forEach(rec => {
            const matchIndex = updated.findIndex(p => p.email.toLowerCase() === rec.email.toLowerCase());
            if (matchIndex !== -1) {
              // Update existing record
              updated[matchIndex] = {
                ...updated[matchIndex],
                ...rec,
                id: updated[matchIndex].id, // Maintain internal ID
                no: updated[matchIndex].no,  // Maintain internal No sequency
                addedBy: updated[matchIndex].addedBy || rec.addedBy // Keep original owner on re-import
              };
            } else {
              // Append new record
              rec.no = updated.length + 1;
              updated.push(rec);
              addedCount++;
            }
          });

          updateProfilesAndPersist(updated);
          triggerToast(t("Successfully parsed. Updated {updated} and added {added} brand new Lead profiles!").replace("{updated}", String(records.length - addedCount)).replace("{added}", String(addedCount)), "success");
        } catch (excelErr: any) {
          console.error(excelErr);
          setImportError(t("Bad spreadsheet structure: {error}").replace("{error}", excelErr.message));
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      setImportError(err.message || t("Failed loading selected dataset file."));
    }

    // Reset input target
    if (e.target) e.target.value = "";
  };

  // MULTIPLE TRANSFER INTEGRATION logic: Map and emit selected leads to Mail Merge outgoing queue!
  const handleTransferToRecipientList = () => {
    const selectedLeads = profiles.filter(p => p.isSelected);
    if (selectedLeads.length === 0) {
      triggerToast(t("No lead profiles are currently selected. Tick checkboxes on the left side first."), "error");
      return;
    }

    // Map LeadProfile fields into Recipient fields
    const mappedRecipients: Recipient[] = selectedLeads.map(p => ({
      id: `rec_${Date.now()}_${Math.floor(Math.random() * 10000)}_${p.no}`,
      FirstName: p.firstName,
      LastName: p.lastName,
      Email: p.email,
      Company: p.company,
      Department: p.department,
      Address: p.address,
      Industry: p.industry,          // Maps standard Excel Industry
      ScheduledDate: "",             // Empty ready-to-run queue date
      CustomField1: p.customField1,  // Map Custom Field 1
      CustomField2: p.customField2,  // Map Custom Field 2
      CustomField3: p.leadDemand,    // Map Lead Demand to custom field 3
      status: "idle",
      openCount: 0
    }));

    // Trigger parent callback
    onPushToMailMerge(mappedRecipients);

    // Unselect transferred rows to make user state clean
    const resetSelection = profiles.map(p => ({ ...p, isSelected: false }));
    setProfiles(resetSelection);

    triggerToast(t("Successfully transferred {count} profiles directly into Mail Merge queue! Heading there...").replace("{count}", String(mappedRecipients.length)), "success");
  };

  // Compute stats counters
  const totalCount = profiles.length;
  const hotLeadsCount = profiles.filter(p => p.leadSegment?.toLowerCase() === "hot lead" || p.leadSegment?.toLowerCase() === "hot").length;
  const newLeadsCount = profiles.filter(p => p.leadStatus?.toLowerCase() === "new").length;
  const selectedCount = profiles.filter(p => p.isSelected).length;

  // Search filtering logics
  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = 
      p.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.leadSegment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || p.leadStatus?.toLowerCase() === statusFilter.toLowerCase();
    const matchesSegment = !segmentFilter || p.leadSegment?.toLowerCase() === segmentFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSegment;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredProfiles.length / pageSize) || 1;
  const paginatedProfiles = filteredProfiles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div id="lead-profiles-view-root" className="space-y-6">
      
      {/* Toast Alert pop notification overlay */}
      {toast && (
        <div id="toast-notify" className={`fixed bottom-6 right-6 z-50 p-4 rounded-lg shadow-xl border flex items-center gap-3 animate-bounce max-w-sm ${
          toast.type === "success" 
            ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
            : toast.type === "error"
            ? "bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200"
        }`}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Tab Switcher Navigation - Fits perfectly and makes the selected tab look like a completely new page */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 pb-px relative z-10 no-print">
        <button
          type="button"
          onClick={() => setCurrentActiveSubTab("leads-registry")}
          className={`px-5 py-3 text-xs font-bold tracking-tight border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            currentActiveSubTab === "leads-registry"
              ? "border-[#0078D4] text-[#0078D4] dark:border-indigo-400 dark:text-indigo-400 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          <Database className="w-4 h-4 text-emerald-500" />
          <span>{t("Master Lead Database")}</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentActiveSubTab("email-discovery")}
          className={`px-5 py-3 text-xs font-bold tracking-tight border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            currentActiveSubTab === "email-discovery"
              ? "border-indigo-600 text-indigo-650 dark:border-indigo-400 dark:text-indigo-400 font-extrabold"
              : "border-transparent text-slate-500 hover:text-indigo-650 dark:hover:text-zinc-200"
          }`}
        >
          <Mail className="w-4 h-4 text-indigo-500" />
          <span>{t("Contacted List (Email Lead Discovery)")}</span>
          <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
            {t("New")}
          </span>
        </button>
      </div>

      {currentActiveSubTab === "email-discovery" ? (
        <EmailLeadDiscoveryView 
          onAddLeadsToMaster={(newLeads) => {
            const updated = [...profiles];
            newLeads.forEach(l => {
              if (!updated.some(exist => exist.email.toLowerCase() === l.email.toLowerCase())) {
                l.no = updated.length + 1;
                updated.push(l);
              }
            });
            updateProfilesAndPersist(updated);
            triggerToast(t("Duplicate check completed, {count} leads transferred to master database!").replace("{count}", String(newLeads.length)));
          }}
          onAddCompaniesToMaster={(companyName, domain, industry, contact) => {
            try {
              // Item 8: domain veya unvana göre var olan bir şirket kartı ara —
              // varsa yeni bir kopya oluşturmak yerine ona bağlanıyoruz.
              const normalizedDomain = (domain || "").toLowerCase().replace(/^www\./, "").trim();
              const existingCompanies = CrmDb.getCompanies() as any[];
              let company = existingCompanies.find((c: any) => {
                const cWebsite = String(c.website || "")
                  .toLowerCase()
                  .replace(/^https?:\/\//, "")
                  .replace(/^www\./, "")
                  .replace(/\/$/, "");
                return (normalizedDomain && cWebsite === normalizedDomain) ||
                  c.name.toLowerCase().trim() === companyName.toLowerCase().trim();
              });

              if (!company) {
                company = CrmDb.createCompany({
                  name: companyName,
                  website: domain,
                  customerStatus: "Lead",
                  industry: industry || "Manufacturing",
                  accountOwner: actorName,
                  shift: "1 Shift",
                  digitalInfrastructure: "ERP",
                  healthScore: 75,
                });
              }

              // Keşfedilen kontak kişisini şirket kartına bağlı Contact olarak
              // kaydet (aynı email zaten kayıtlıysa tekrar eklenmiyor).
              if (contact?.email && company) {
                const existingContacts = CrmDb.getContactsByCompany(company.id);
                if (!existingContacts.some(c => c.email.toLowerCase() === contact.email.toLowerCase())) {
                  const nameParts = (contact.name || contact.email.split("@")[0]).trim().split(" ");
                  CrmDb.createContact({
                    companyId: company.id,
                    firstName: nameParts[0] || "Yetkili",
                    lastName: nameParts.slice(1).join(" "),
                    email: contact.email,
                    department: contact.jobTitle || "",
                    leadStatus: "New",
                  });
                }

                // Keşfedilen e-postayı da şirketin Email tabına işle.
                CrmDb.createEmail({
                  companyId: company.id,
                  sender: contact.isIncoming ? contact.email : actorName,
                  recipient: contact.isIncoming ? actorName : contact.email,
                  subject: contact.isIncoming
                    ? `E-posta Aday Keşfi: Gelen İlk Temas (${contact.name || contact.email})`
                    : `E-posta Aday Keşfi: Giden İlk Temas (${contact.name || contact.email})`,
                  body: contact.snippet || "",
                  date: contact.date || new Date().toISOString(),
                  isIncoming: contact.isIncoming,
                });
              }
            } catch (err) {
              console.error("Failed to add discovered company:", err);
            }
          }}
          onAddTargetAccount={(companyName, domain) => {
            try {
              const parsed = CrmDb.getKv<any[]>(TARGET_ACCOUNTS_KEY, []);
              if (!parsed.some((t: any) => t.companyName?.toLowerCase() === companyName.toLowerCase())) {
                parsed.push({
                  id: `target_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                  organization_id: getActiveOrganizationId() || undefined,
                  companyName,
                  websiteUrl: domain,
                  industryTag: "",
                  companySize: "",
                  locationMain: "",
                  aiAnalysisSummary: "",
                  draftTemplates: "",
                  analysisSource: "Email Lead Discovery",
                  analysisDate: new Date().toISOString(),
                  riskScore: 0,
                  rawOutput: "",
                  no: parsed.length + 1,
                });
                CrmDb.setKv(TARGET_ACCOUNTS_KEY, parsed);
              }
            } catch (err) {
              console.error("Failed to add discovered target account:", err);
            }
          }}
        />
      ) : (
        <>
          {/* Title Header with Metrics Ribbon */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#1b1a19] p-6 border border-[#EDEBE9] dark:border-[#323130] rounded shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0078D4] dark:text-brand-300" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{t("Lead Database & Profile Manager")}</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            {t("Maintain your master prospecting database with full fields matching Excel structures. Update segments, analyze open engagement metrics, and batch transfer qualified leads directly into your Mail Merge Builder campaign in real-time.")}
          </p>
        </div>

        {/* Action Belt */}
        <div className="flex flex-wrap items-center gap-2">
          {/* File Upload Element */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleSpreadsheetImportChange}
            className="hidden"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>{t("Import Sheet")}</span>
          </button>

          {/* Item 11: tek tip indirme butonu — tıklayınca CSV/Excel seçenekleri açılır
              (eskiden ayrı "Export CSV" ve "Download XLS" butonları vardı). */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(prev => !prev)}
              className="text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>{t("Download list")}</span>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded shadow-lg z-20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { handleExportCSV(); setShowExportMenu(false); }}
                    className="w-full text-left text-xs font-semibold px-3 py-2 hover:bg-slate-50 dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    CSV (.csv)
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleExportXLS(); setShowExportMenu(false); }}
                    className="w-full text-left text-xs font-semibold px-3 py-2 hover:bg-slate-50 dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 cursor-pointer border-t border-[#EDEBE9] dark:border-[#323130]"
                  >
                    Excel (.xls)
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleManualSaveAll}
            className="text-xs font-bold bg-white hover:bg-slate-50 dark:bg-[#1b1a19] dark:hover:bg-[#252423] text-[#0078D4] dark:text-brand-300 px-3 py-2 border border-[#0078D4]/30 rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{t("Save List")}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingLead(!isAddingLead)}
            className="text-xs font-bold bg-[#0078D4] hover:bg-[#005a9e] text-white px-3.5 py-2.5 rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingLead ? t("Cancel New") : t("Add Lead Record")}</span>
          </button>
        </div>
      </div>

      {/* Inline diagnostic block */}
      {importError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900 rounded text-xs text-rose-800 dark:text-rose-300 flex items-center gap-3">
          <button type="button" onClick={() => setImportError(null)} aria-label={t("Close")} className="flex-shrink-0 hover:opacity-80 cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
          <span>{importError}</span>
        </div>
      )}

      {/* Bento Stats Ribbons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{t("Grand Total Database")}</span>
          <div className="text-xl font-bold text-[#0078D4] mt-1">{t("{count} leads").replace("{count}", String(totalCount))}</div>
          <p className="text-[10px] text-slate-450 mt-1">{t("In-Memory synced")}</p>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{t("Hot Leads")}</span>
          <div className="text-xl font-bold text-orange-600 mt-1">{t("{count} prospects").replace("{count}", String(hotLeadsCount))}</div>
          <p className="text-[10px] text-slate-450 mt-1">{t("Highest priority engagement")}</p>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{t("Uncontacted / New")}</span>
          <div className="text-xl font-bold text-indigo-500 mt-1">{t("{count} items").replace("{count}", String(newLeadsCount))}</div>
          <p className="text-[10px] text-slate-450 mt-1">{t("Awaiting outbox dispatch")}</p>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] shadow-sm">
          <span className="text-[10px] font-bold text-slate-450 uppercase">{t("Current Selected leads")}</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">{t("{count} leads").replace("{count}", String(selectedCount))}</div>
          <p className="text-[10px] text-slate-450 mt-1">{t("Ready for sending list")}</p>
        </div>

        <div className="bg-[#f0f8ff] dark:bg-blue-950/20 p-4 rounded border border-blue-200 dark:border-blue-900 shadow-sm col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-[#0078D4] dark:text-brand-300 uppercase">{t("Mail Merge Outbox")}</span>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{t("{count} active").replace("{count}", String(currentMailMergeCount))}</div>
          <p className="text-[10px] text-slate-500 mt-1">{t("Active compiler state")}</p>
        </div>
      </div>

      {/* Main Database Table & Control Panel */}
      <div className={isWide 
        ? "fixed inset-0 z-50 bg-[#FAF9F8] dark:bg-[#121110] p-6 overflow-y-auto flex flex-col space-y-4 animate-fadeIn" 
        : "bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded shadow-sm overflow-hidden"
      }>

        {/* TOP OF THE LIST ACTIONS ROW: Ekran genişletme oku (Minimize2/Maximize2) and Export XLS (Download) */}
        <div className="px-4 py-3 border-b border-[#EDEBE9] dark:border-[#323130] bg-[#FAF9F8] dark:bg-[#201f1e] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-[#0078D4]" />
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
              {t("Customer / Lead Candidate List")}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* 1. Ekran Genişletme oku — ikon-only, ikinci mükerrer buton (eskiden filtre
                topbarında da vardı) kaldırıldı, tek genişletme kontrolü burada kalıyor. */}
            <button
              type="button"
              onClick={() => setIsWide(!isWide)}
              className="bg-white hover:bg-slate-50 dark:bg-[#252423] dark:hover:bg-[#323130] text-[#0078D4] dark:text-brand-300 p-1.5 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center justify-center cursor-pointer transition-all shadow-sm hover:scale-[1.02]"
              title={isWide ? t("Shrink Screen") : t("Expand Screen")}
            >
              {isWide ? <Minimize2 className="w-4 h-4 text-rose-500" /> : <Maximize2 className="w-4 h-4 text-indigo-500" />}
            </button>
          </div>
        </div>

        {/* If wide screen, render a pristine visual header with close button */}
        {isWide && (
          <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-3 flex-shrink-0 px-4 pt-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0078D4]" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">{t("Lead Database Studio (Expanded Mode)")}</h3>
            </div>
          </div>
        )}

        {/* Manual Lead append slider layout inside the container so it works in both regular and wide views */}
        {isAddingLead && (
          <form onSubmit={handleManualAddSubmit} className="bg-white dark:bg-[#1b1a19] border border-[#0078D4]/20 rounded p-6 shadow-md animate-fadeIn space-y-4">
            <div className="border-b border-[#EDEBE9] dark:border-[#323130] pb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-705 uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>{t("Input Manual Profile Candidate")}</span>
              </h3>
              <button type="button" onClick={() => setIsAddingLead(false)} className="text-slate-400 hover:text-slate-600" aria-label={t("Close")}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("First Name *")}</label>
                <input
                  type="text"
                  placeholder="Sofia"
                  value={newProfile.firstName}
                  onChange={e => setNewProfile({ ...newProfile, firstName: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Last Name *")}</label>
                <input
                  type="text"
                  placeholder="Vargas"
                  value={newProfile.lastName}
                  onChange={e => setNewProfile({ ...newProfile, lastName: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Email Address *")}</label>
                <input
                  type="email"
                  placeholder="s.vargas@corporate.com"
                  value={newProfile.email}
                  onChange={e => setNewProfile({ ...newProfile, email: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Company")}</label>
                <CompanyAutocomplete
                  value={newProfile.company}
                  onChange={company => setNewProfile({ ...newProfile, company: company.name })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Department")}</label>
                <input
                  type="text"
                  placeholder="Enterprise DevOps"
                  value={newProfile.department}
                  onChange={e => setNewProfile({ ...newProfile, department: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Address")}</label>
                <input
                  type="text"
                  placeholder="Bermuda Way, Austin"
                  value={newProfile.address}
                  onChange={e => setNewProfile({ ...newProfile, address: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Industry")}</label>
                <input
                  type="text"
                  placeholder="Cybersecurity Solutions"
                  value={newProfile.industry}
                  onChange={e => setNewProfile({ ...newProfile, industry: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Requested Service Type")}</label>
                <input
                  type="text"
                  placeholder={t("e.g. Standard Audit, Enterprise...")}
                  value={newProfile.leadDemand}
                  onChange={e => setNewProfile({ ...newProfile, leadDemand: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Lead Status")}</label>
                <select
                  value={newProfile.leadStatus}
                  onChange={e => setNewProfile({ ...newProfile, leadStatus: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none"
                >
                  <option value="New">{t("New")}</option>
                  <option value="Contacted">{t("Contacted")}</option>
                  <option value="Nurturing">{t("Nurturing")}</option>
                  <option value="Disqualified">{t("Disqualified")}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Lead Segment")}</label>
                <select
                  value={newProfile.leadSegment}
                  onChange={e => setNewProfile({ ...newProfile, leadSegment: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none"
                >
                  <option value="Hot Lead">{t("Hot Lead")}</option>
                  <option value="Warm Lead">{t("Warm Lead")}</option>
                  <option value="Cold">{t("Cold")}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Custom Field 1")}</label>
                <input
                  type="text"
                  placeholder="Partner priority log"
                  value={newProfile.customField1}
                  onChange={e => setNewProfile({ ...newProfile, customField1: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Custom Field 2")}</label>
                <input
                  type="text"
                  placeholder="Optional tag key"
                  value={newProfile.customField2}
                  onChange={e => setNewProfile({ ...newProfile, customField2: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#EDEBE9] dark:border-[#323130] pt-4 mt-2">
              <button
                type="button"
                onClick={() => setIsAddingLead(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-650 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded cursor-pointer bg-[#faf9f8] dark:bg-[#252423]"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{t("Confirm & Append")}</span>
              </button>
            </div>
          </form>
        )}
        
        {/* Table Filter Topbar */}
        <div className="p-4 border-b border-[#EDEBE9] dark:border-[#323130] bg-[#fbfbfb] dark:bg-[#1b1a19]/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={t("Search leads, sectors, or segments...")}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-xs rounded pl-9 pr-4 py-2 w-64 outline-none focus:border-[#0078D4]"
              />
            </div>

            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-xs p-1.5 rounded outline-none text-slate-600 dark:text-slate-200"
              >
                <option value="">{t("-- Lead Status --")}</option>
                <option value="New">{t("New")}</option>
                <option value="Contacted">{t("Contacted")}</option>
                <option value="Nurturing">{t("Nurturing")}</option>
                <option value="Disqualified">{t("Disqualified")}</option>
              </select>
            </div>

            <select
              value={segmentFilter}
              onChange={e => setSegmentFilter(e.target.value)}
              className="bg-white dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-xs p-1.5 rounded outline-none text-slate-600 dark:text-slate-200"
            >
              <option value="">{t("-- Segment --")}</option>
              <option value="Hot Lead">{t("Hot Lead")}</option>
              <option value="Warm Lead">{t("Warm Lead")}</option>
              <option value="Cold">{t("Cold")}</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleTransferToRecipientList}
              disabled={selectedCount === 0}
              className={`text-xs font-bold px-4 py-2 border rounded flex items-center gap-1.5 transition-all shadow-sm ${
                selectedCount > 0
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-650 cursor-pointer"
                  : "bg-slate-50 dark:bg-[#252423] text-slate-400 border-[#EDEBE9] dark:border-[#323130] cursor-not-allowed opacity-60"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{t("Transfer to Recipient List ({count})").replace("{count}", String(selectedCount))}</span>
            </button>

            <button
              type="button"
              onClick={() => void deleteSelectedProfiles()}
              disabled={selectedCount === 0}
              className={`text-xs font-bold px-3 py-2 border rounded flex items-center gap-1 cursor-pointer transition-all ${
                selectedCount > 0
                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900"
                  : "bg-slate-50 dark:bg-[#252423] text-slate-400 border-[#EDEBE9] dark:border-[#323130] cursor-not-allowed opacity-60"
              }`}
              title={t("Delete selected leads permanently")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t("Delete")}</span>
            </button>
          </div>
        </div>

        {/* Dense Excel-Style Multi-Field Grid View */}
        <div className="overflow-auto max-h-[calc(100vh-380px)] min-h-[240px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#FAF9F8] dark:bg-[#201f1e] text-[10px] font-bold text-slate-450 uppercase border-b border-[#EDEBE9] dark:border-[#323130] tracking-wider select-none">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredProfiles.length > 0 && filteredProfiles.every(p => p.isSelected)}
                    onChange={toggleSelectAll}
                    className="rounded text-[#0078D4] cursor-pointer"
                  />
                </th>
                <th className="p-3 w-14">{t("No")}</th>
                <th className="p-3">{t("First Name")}</th>
                <th className="p-3">{t("Last Name")}</th>
                <th className="p-3">{t("Email Address")}</th>
                <th className="p-3">{t("Company")}</th>
                <th className="p-3 whitespace-nowrap">{t("Added By")}</th>
                <th className="p-3">{t("Department")}</th>
                <th className="p-3">{t("Address")}</th>
                <th className="p-3">{t("Industry")}</th>
                <th className="p-3">{t("Requested Service Type")}</th>
                <th className="p-3">{t("Lead Status")}</th>
                <th className="p-3">{t("Lead Segment")}</th>
                <th className="p-3">{t("Custom Field 1")}</th>
                <th className="p-3">{t("Custom Field 2")}</th>
                <th className="p-3 text-center">{t("Delivery")}</th>
                <th className="p-3 text-center">{t("Opens")}</th>
                <th className="p-3 text-center w-20">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEBE9] dark:divide-[#323130] text-xs">
              {paginatedProfiles.length > 0 ? (
                paginatedProfiles.map((p) => {
                  const isEditing = editingProfileId === p.id;
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#FAF9F8] dark:hover:bg-[#201f1e]/40 transition-colors ${
                        p.isSelected ? "bg-[#f5fafe] dark:bg-[#1c3854]/20" : ""
                      }`}
                    >
                      {/* Checkbox select */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={!!p.isSelected}
                          onChange={() => toggleSelectProfile(p.id)}
                          className="rounded text-[#0078D4] cursor-pointer"
                        />
                      </td>

                      {/* No */}
                      <td className="p-3 font-mono font-medium text-slate-400 select-none">
                        {p.no}
                      </td>

                      {/* First Name */}
                      <td className="p-3 whitespace-nowrap">
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.firstName}
                            onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border border-slate-300 dark:border-[#323130] rounded w-24 outline-none"
                          />
                        ) : (
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{p.firstName}</span>
                        )}
                      </td>

                      {/* Last Name */}
                      <td className="p-3 whitespace-nowrap">
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.lastName}
                            onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border border-slate-300 dark:border-[#323130] rounded w-24 outline-none"
                          />
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300">{p.lastName}</span>
                        )}
                      </td>

                      {/* Email Address */}
                      <td className="p-3 font-mono text-[11px]">
                        {isEditing && editForm ? (
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border border-slate-300 dark:border-[#323130] rounded w-48 outline-none"
                          />
                        ) : (
                          <span className="text-[#0078D4] hover:underline cursor-pointer">{p.email}</span>
                        )}
                      </td>

                      {/* Company */}
                      <td className="p-3 whitespace-nowrap min-w-[12rem]">
                        {isEditing && editForm ? (
                          <CompanyAutocomplete
                            value={editForm.company}
                            onChange={company => setEditForm({ ...editForm, company: company.name })}
                          />
                        ) : (
                          <span>{p.company || "-"}</span>
                        )}
                      </td>

                      {/* Added By */}
                      <td className="p-3 text-[11px] text-slate-500 whitespace-nowrap">
                        {p.addedBy || "-"}
                      </td>

                      {/* Department */}
                      <td className="p-3 text-[11px] text-slate-500 whitespace-nowrap">
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.department}
                            onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border border-slate-300 dark:border-[#323130] rounded w-28 outline-none"
                          />
                        ) : (
                          p.department || "-"
                        )}
                      </td>

                      {/* Address */}
                      <td className="p-3 text-[11px] text-slate-500 max-w-[120px] truncate" title={p.address}>
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.address}
                            onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border border-slate-300 dark:border-[#323130] rounded w-32 outline-none"
                          />
                        ) : (
                          p.address || "-"
                        )}
                      </td>

                      {/* Industry */}
                      <td className="p-3 text-[11px] whitespace-nowrap text-slate-500">
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.industry}
                            onChange={e => setEditForm({ ...editForm, industry: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border border-slate-300 dark:border-[#323130] rounded w-32 outline-none"
                          />
                        ) : (
                          p.industry || "-"
                        )}
                      </td>

                      {/* Lead Demand */}
                      <td className="p-3 whitespace-nowrap">
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            placeholder={t("Service Type...")}
                            value={editForm.leadDemand || ""}
                            onChange={e => setEditForm({ ...editForm, leadDemand: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border border-slate-300 dark:border-[#323130] rounded w-32 outline-none"
                          />
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            !p.leadDemand
                              ? "text-slate-450 bg-slate-100/50 dark:bg-slate-800/10"
                              : p.leadDemand === "High"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                              : p.leadDemand === "Medium"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20"
                              : p.leadDemand === "Low"
                              ? "bg-slate-50 text-slate-600 dark:bg-slate-900"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-200"
                          }`}>
                            {p.leadDemand || "-"}
                          </span>
                        )}
                      </td>

                      {/* Lead Status */}
                      <td className="p-3 whitespace-nowrap">
                        {isEditing && editForm ? (
                          <select
                            value={editForm.leadStatus}
                            onChange={e => setEditForm({ ...editForm, leadStatus: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border rounded"
                          >
                            <option value="New">{t("New")}</option>
                            <option value="Contacted">{t("Contacted")}</option>
                            <option value="Nurturing">{t("Nurturing")}</option>
                            <option value="Disqualified">{t("Disqualified")}</option>
                          </select>
                        ) : (
                          <span className="font-semibold text-slate-600 dark:text-slate-300">{t(p.leadStatus)}</span>
                        )}
                      </td>

                      {/* Lead Segment */}
                      <td className="p-3 whitespace-nowrap">
                        {isEditing && editForm ? (
                          <select
                            value={editForm.leadSegment}
                            onChange={e => setEditForm({ ...editForm, leadSegment: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border rounded text-[11px]"
                          >
                            <option value="Hot Lead">{t("Hot Lead")}</option>
                            <option value="Warm Lead">{t("Warm Lead")}</option>
                            <option value="Cold">{t("Cold")}</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.leadSegment === "Hot Lead" || p.leadSegment === "Hot"
                              ? "bg-[#FFE7E7] text-[#A80000] dark:bg-red-950/40 dark:text-red-300"
                              : p.leadSegment === "Warm Lead" || p.leadSegment === "Warm"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/20"
                              : "bg-[#F3F2F1] text-slate-600 dark:bg-[#2c2b2a]"
                          }`}>
                            {t(p.leadSegment)}
                          </span>
                        )}
                      </td>

                      {/* Custom Field 1 */}
                      <td className="p-3 text-[11px] text-slate-550 max-w-[120px] truncate" title={p.customField1}>
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.customField1}
                            onChange={e => setEditForm({ ...editForm, customField1: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border border-slate-300 dark:border-[#323130] rounded w-32 outline-none"
                          />
                        ) : (
                          p.customField1 || "-"
                        )}
                      </td>

                      {/* Custom Field 2 */}
                      <td className="p-3 text-[11px] text-slate-550 max-w-[120px] truncate" title={p.customField2}>
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.customField2}
                            onChange={e => setEditForm({ ...editForm, customField2: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border border-slate-300 dark:border-[#323130] rounded w-32 outline-none"
                          />
                        ) : (
                          p.customField2 || "-"
                        )}
                      </td>

                      {/* Delivery Status */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {isEditing && editForm ? (
                          <select
                            value={editForm.deliveryStatus}
                            onChange={e => setEditForm({ ...editForm, deliveryStatus: e.target.value })}
                            className="bg-white dark:bg-[#252423] p-1 border rounded text-[11px]"
                          >
                            <option value="idle">{t("idle")}</option>
                            <option value="success">{t("success")}</option>
                            <option value="failed">{t("failed")}</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold ${
                            p.deliveryStatus === "success"
                              ? "text-green-600"
                              : p.deliveryStatus === "failed"
                              ? "text-rose-500 font-extrabold"
                              : "text-slate-400 font-medium"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              p.deliveryStatus === "success"
                                ? "bg-green-500"
                                : p.deliveryStatus === "failed"
                                ? "bg-rose-500"
                                : "bg-slate-300"
                            }`} />
                            <span>{t(p.deliveryStatus || "idle")}</span>
                          </span>
                        )}
                      </td>

                      {/* Open Count */}
                      <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {isEditing && editForm ? (
                          <input
                            type="number"
                            value={editForm.openCount}
                            onChange={e => setEditForm({ ...editForm, openCount: parseInt(e.target.value, 10) || 0 })}
                            className="bg-white dark:bg-[#252423] p-1 border rounded w-16 text-center outline-none"
                          />
                        ) : (
                          p.openCount || 0
                        )}
                      </td>

                      {/* Action trigger columns */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={saveEditedProfile}
                                className="p-1 text-emerald-600 hover:text-emerald-700 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                title={t("Save Profile details")}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProfileId(null);
                                  setEditForm(null);
                                }}
                                className="p-1 text-slate-405 hover:text-slate-600"
                                title={t("Exit edit mode")}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditingProfile(p)}
                                className="p-1 text-[#0078D4] hover:text-[#005a9e] rounded hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                title={t("Edit inline fields")}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteSingleProfile(p.id)}
                                className="p-1 text-rose-500 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/25"
                                title={t("Delete Lead")}
                                aria-label={`${t("Delete Lead")}: ${p.firstName} ${p.lastName}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={18} className="p-10 text-center text-slate-400">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-2.5 animate-pulse" />
                    <p className="font-semibold text-xs text-slate-500">{t("No lead profiles match your current search constraints.")}</p>
                    <p className="text-[10px] text-slate-405 mt-1">{t("Import an excel file or click \"Add Lead\" to build your database stack")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination belt */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#EDEBE9] dark:border-[#323130] flex items-center justify-between gap-4 text-xs select-none">
            <span className="text-slate-505 font-medium">
              {t("Showing {start} to {end} of {total} leads").replace("{start}", String((currentPage - 1) * pageSize + 1)).replace("{end}", String(Math.min(currentPage * pageSize, filteredProfiles.length))).replace("{total}", String(filteredProfiles.length))}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className={`px-3 py-1.5 rounded border border-[#EDEBE9] dark:border-[#323130] text-slate-650 ${
                  currentPage === 1
                    ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-[#1b1a19]"
                    : "hover:bg-slate-50 dark:hover:bg-[#252423] cursor-pointer"
                }`}
              >
                {t("Previous")}
              </button>
              
              {getCompactPageNumbers(currentPage, totalPages).map((token, idx) =>
                token === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 select-none">
                    …
                  </span>
                ) : (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setCurrentPage(token as number)}
                    className={`px-3 py-1.5 rounded border font-semibold ${
                      currentPage === token
                        ? "bg-[#0078D4] border-[#0078D4] text-white"
                        : "border-[#EDEBE9] dark:border-[#323130] text-slate-650 hover:bg-slate-50 dark:hover:bg-[#252423] cursor-pointer"
                    }`}
                  >
                    {token}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                title={t("Next")}
                className={`px-3 py-1.5 rounded border border-[#EDEBE9] dark:border-[#323130] text-slate-650 font-bold ${
                  currentPage === totalPages
                    ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-[#1b1a19]"
                    : "hover:bg-slate-50 dark:hover:bg-[#252423] cursor-pointer"
                }`}
              >
                {"»"}
              </button>
            </div>
          </div>
        )}

      </div>
      </>
      )}

      <ConfirmModal {...confirmProps} />
    </div>
  );
}
