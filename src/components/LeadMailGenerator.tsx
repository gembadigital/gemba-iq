import React, { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";
import * as XLSX from "xlsx";
import {
  Sparkles,
  Trash2,
  ListPlus,
  ArrowRightLeft,
  FileSpreadsheet,
  Plus,
  Download,
  CheckCircle,
  HelpCircle,
  X,
  FileText,
  Edit,
  Check
} from "lucide-react";
import { Recipient } from "../types";

// Standardize lead interface for local usage
interface LeadRecord {
  uid: string;
  id: number;
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  address: string;
  sector: string; // Maps to Recipient's "Industry"
  saved: boolean;
}

interface LeadMailGeneratorProps {
  onPushToMailMerge: (newRecs: Recipient[]) => void;
  currentMailMergeCount: number;
}

export default function LeadMailGenerator({
  onPushToMailMerge,
  currentMailMergeCount
}: LeadMailGeneratorProps) {
  const { lang, t } = useLanguage();
  // List records state
  const [records, setRecords] = useState<LeadRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Form Inputs
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState("");
  const [emailFormat, setEmailFormat] = useState("ad.soyad");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [address, setAddress] = useState("");
  const [sector, setSector] = useState("");

  // Visual notices and feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info" | "error">("success");
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Load existing records from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("lead_mail_records");
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse saved lead records:", err);
      }
    }
  }, []);

  // Row Inline Edit logic
  const [editingLeadUid, setEditingLeadUid] = useState<string | null>(null);
  const [editCompany, setEditCompany] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const startEditing = (r: LeadRecord) => {
    setEditingLeadUid(r.uid);
    setEditCompany(r.company);
    setEditFirstName(r.firstName);
    setEditLastName(r.lastName);
    setEditEmail(r.email);
    setEditDepartment(r.department || "");
    setEditSector(r.sector || "");
    setEditAddress(r.address || "");
  };

  const cancelEditing = () => {
    setEditingLeadUid(null);
  };

  const saveEditedRecord = (uid: string) => {
    if (!editCompany.trim() || !editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      showToast("Company, First Name, Last Name, and Email are required.", "error");
      return;
    }

    const updated = records.map(r => {
      if (r.uid === uid) {
        return {
          ...r,
          company: editCompany.trim(),
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim(),
          department: editDepartment.trim(),
          sector: editSector.trim(),
          address: editAddress.trim(),
          saved: false // Mark as unsaved
        };
      }
      return r;
    });

    setRecords(updated);
    setHasUnsaved(true);
    setEditingLeadUid(null);
    showToast("Lead record updated successfully.", "success");
  };

  const showToast = (msg: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    const id = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => clearTimeout(id);
  };

  /* ── Character conversion algorithm ─────────────────── */
  const trLatin = (str: string): string => {
    if (!str) return "";
    return str.toLowerCase()
      .trim()
      .replace(/ç/g, "c").replace(/Ç/g, "c")
      .replace(/ş/g, "s").replace(/Ş/g, "s")
      .replace(/ğ/g, "g").replace(/Ğ/g, "g")
      .replace(/ü/g, "u").replace(/Ü/g, "u")
      .replace(/ö/g, "o").replace(/Ö/g, "o")
      .replace(/ı/g, "i").replace(/İ/g, "i");
  };

  /* Company domain automated guesser from name */
  const guessDomain = (companyName: string): string => {
    if (!companyName) return "";
    const clean = trLatin(companyName)
      .replace(/\b(a\.?ş\.?|ltd\.?|leş\.?|şti\.?|a\.?s\.?|inc\.?|llc\.?|gmbh|holding|medya|grup|insaat|ticaret|sanayi)\b/gi, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
    return clean ? `${clean}.com` : "";
  };

  /* Handle dynamic company input changes */
  const handleCompanyChange = (val: string) => {
    setCompany(val);
    const guessed = guessDomain(val);
    if (guessed) {
      setDomain(guessed);
    }
  };

  /* Format username structure algorithm based on rules */
  const buildUsername = (formatStr: string, fn: string, ln: string): string => {
    if (!formatStr) return "";
    const ad = trLatin(fn).replace(/\s+/g, "");
    const soyad = trLatin(ln).replace(/\s+/g, "");
    const a = ad[0] || "";
    const s = soyad[0] || "";

    // Convert to lowercase and trim
    let pattern = formatStr.toLowerCase().trim();

    // Map keywords to unique placeholder tokens to prevent nested collision
    pattern = pattern.replace(/first name/g, "\x01");
    pattern = pattern.replace(/last name/g, "\x02");
    pattern = pattern.replace(/soyad/g, "\x03");
    pattern = pattern.replace(/ad/g, "\x04");
    pattern = pattern.replace(/a/g, "\x05");
    pattern = pattern.replace(/s/g, "\x06");

    // Replace the placeholder tokens with actual values
    pattern = pattern.replace(/\x01/g, ad);
    pattern = pattern.replace(/\x02/g, soyad);
    pattern = pattern.replace(/\x03/g, soyad);
    pattern = pattern.replace(/\x04/g, ad);
    pattern = pattern.replace(/\x05/g, a);
    pattern = pattern.replace(/\x06/g, s);

    return pattern;
  };

  /* Build full dynamic email string */
  const buildEmailAddress = (formatStr: string, fn: string, ln: string, targetDomain: string): string => {
    const user = buildUsername(formatStr, fn, ln);
    if (!user || !targetDomain) return user || "";
    return `${user}@${targetDomain}`;
  };

  // Preview computed email during input keying
  const getPreviewEmail = (): string => {
    const activeFormat = emailFormat.trim() || "ad.soyad";
    const activeFn = firstName.trim() || "first";
    const activeLn = lastName.trim() || "last";
    const activeDom = domain.trim() || "domain.com";

    return buildEmailAddress(activeFormat, activeFn, activeLn, activeDom);
  };

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      showToast("Please fill in the First Name field.", "error");
      return;
    }
    if (!lastName.trim()) {
      showToast("Please fill in the Last Name field.", "error");
      return;
    }
    if (!company.trim()) {
      showToast("Please fill in the Company Name field.", "error");
      return;
    }

    const computedEmail = buildEmailAddress(
      emailFormat.trim() || "ad.soyad",
      firstName,
      lastName,
      domain.trim() || "domain.com"
    );

    const newRec: LeadRecord = {
      uid: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      id: records.length + 1,
      company: company.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: computedEmail,
      department: department.trim(),
      address: address.trim(),
      sector: sector.trim(),
      saved: false
    };

    const updated = [...records, newRec];
    setRecords(updated);
    setHasUnsaved(true);

    // Keep logical parameters of company, domain, format, sector, address, department to key multiple candidates
    setFirstName("");
    setLastName("");

    // Jump page to the last one if page sizing changes
    const totalPages = Math.ceil(updated.length / pageSize);
    setCurrentPage(totalPages || 1);

    showToast(`New record added: ${newRec.firstName} ${newRec.lastName}`, "success");
  };

  /* Delete Record operation */
  const handleDeleteRecord = (uid: string) => {
    const targetIdx = records.findIndex(r => r.uid === uid);
    if (targetIdx === -1) return;

    const targetName = `${records[targetIdx].firstName} ${records[targetIdx].lastName}`;
    const filtered = records.filter(r => r.uid !== uid);

    // Standardize IDs again based on sequence order position
    const normalized = filtered.map((r, i) => ({
      ...r,
      id: i + 1
    }));

    setRecords(normalized);
    setHasUnsaved(true);

    const totalPages = Math.ceil(normalized.length / pageSize) || 1;
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    showToast(`Record deleted: ${targetName}`, "info");
  };

  /* Save entire record sequence array locally */
  const handleSaveAll = () => {
    const mapped = records.map(r => ({ ...r, saved: true }));
    setRecords(mapped);
    localStorage.setItem("lead_mail_records", JSON.stringify(mapped));
    setHasUnsaved(false);
    showToast("Data list successfully saved to local storage.", "success");
  };

  /* Push generated records into active Mail Merge queue */
  const handleTransferToMailMerge = () => {
    if (records.length === 0) {
      showToast("There are no lead records to transfer.", "error");
      return;
    }

    // Convert to applet Recipient interface schema format
    const newItems: Recipient[] = records.map(r => ({
      id: `rec_generated_${Date.now()}_${r.id}_${Math.random().toString(36).substring(2, 5)}`,
      FirstName: r.firstName,
      LastName: r.lastName,
      Company: r.company,
      Email: r.email,
      Department: r.department,
      Address: r.address,
      Industry: r.sector, // sector matches industry
      ScheduledDate: "",
      CustomField1: "",
      CustomField2: "",
      CustomField3: "",
      status: "idle",
      openCount: 0,
      isSelected: true
    }));

    onPushToMailMerge(newItems);
    showToast(`${records.length} lead records successfully pushed to Gemba IQ Recipient List!`, "success");
  };

  /* Clear all parameters entirely */
  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all lead records and local storage cache?")) {
      setRecords([]);
      localStorage.removeItem("lead_mail_records");
      setHasUnsaved(false);
      setCurrentPage(1);
      showToast("Lead records have been successfully reset.", "info");
    }
  };

  /* XLSX / CSV download capability */
  const exportDataFile = (type: "xlsx" | "csv") => {
    if (records.length === 0) {
      showToast("No data to export.", "error");
      return;
    }

    const headers = ["ID", "Company Name", "First Name", "Last Name", "E-Mail", "Department", "Address", "Sector / Industry"];
    const rows = records.map(r => [
      r.id,
      r.company,
      r.firstName,
      r.lastName,
      r.email,
      r.department || "",
      r.address || "",
      r.sector || ""
    ]);

    const finalRaw = [headers, ...rows];

    if (type === "csv") {
      const csvContent = finalRaw
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      // Add UTF-8 BOM
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `lead_list_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast("CSV file exported successfully.", "success");
    } else {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(finalRaw);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 14 },
        { wch: 14 },
        { wch: 28 },
        { wch: 16 },
        { wch: 22 },
        { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, `lead_list_${new Date().toISOString().split("T")[0]}.xlsx`);
      showToast("Excel workbook (XLSX) exported successfully.", "success");
    }
  };

  // Pagination bounds
  const totalRecords = records.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const pageStartIdx = (currentPage - 1) * pageSize;
  const pageEndIdx = Math.min(pageStartIdx + pageSize, totalRecords);
  const currentViewRecords = records.slice(pageStartIdx, pageEndIdx);

  const getPageNumbers = () => {
    const arr = [];
    const delta = 2;
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
      arr.push(i);
    }
    if (arr[0] > 1) {
      arr.unshift(1);
    }
    if (arr[arr.length - 1] < totalPages) {
      arr.push(totalPages);
    }
    return arr;
  };

  return (
    <div className="space-y-6">
      
      {/* Toast popup message wrapper */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-lg shadow-xl animate-bounce">
          <CheckCircle className={`w-4 h-4 ${toastType === "success" ? "text-emerald-400" : "text-amber-400"}`} />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner view */}
      <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-xl shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0078D4]" />
            <span className="text-xs font-bold text-[#0078D4] tracking-widest uppercase">
              {lang === "TR" ? "Premium Jeneratör Seti" : "Premium Generator Suite"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-1 font-display">
            {lang === "TR" ? "Aday E-posta Oluşturucu — E-posta Şablon Yapıcı" : "Lead Mail Generator — Email Pattern Builder"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === "TR" ? "Ad ve şablon kurallarına göre e-posta adreslerini tahmin eden ve doğrudan kampanyanıza aktaran akıllı, otomatik e-posta tahmincisi." : "Intelligent, automated email predictor guessing address paths by name pattern rules and transferring directly to your campaign."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {records.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-950/40 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/25 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {lang === "TR" ? "Tüm Adayları Temizle" : "Clear All Leads"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Creation Form card */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-xl shadow-sm p-6 self-start">
          <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-3 mb-4">
            <span className="text-xs font-bold text-slate-705 dark:text-slate-200 uppercase tracking-widest block">
              Lead Creation Form
            </span>
            <div className="flex gap-1.5">
              {hasUnsaved && (
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200/40 dark:border-amber-900/30 animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleAddRecord} className="space-y-4">
            
            {/* Şirket Adı & Otomatik Domain */}
            <div className="grid grid-cols-1 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Gemba Partner"
                  value={company}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-[#fdfdfd] dark:bg-[#252423] font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Domain (Estimated)</label>
                <input
                  type="text"
                  placeholder="e.g. gembapartner.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-[#fdfdfd] dark:bg-[#252423] font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none"
                />
              </div>
            </div>

            {/* Email Pattern structure */}
            <div className="space-y-1 pt-1.5 border-t border-[#EDEBE9] dark:border-[#323130]/60">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0078D4] block">E-Mail Format Pattern</label>
                <button
                  type="button"
                  onClick={() => setEmailFormat("")}
                  className="text-[10px] text-rose-600 dark:text-rose-450 font-semibold hover:underline"
                >
                  Clear Pattern
                </button>
              </div>
              <input
                type="text"
                value={emailFormat}
                onChange={(e) => setEmailFormat(e.target.value)}
                placeholder="e.g. ad.soyad  or  adsoyad  or  a.soyad"
                className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-[#fdfdfd] dark:bg-[#252423] font-mono font-semibold text-indigo-600 dark:text-indigo-400 placeholder-indigo-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <div className="p-2.5 rounded bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-800 dark:text-amber-400 leading-tight block">
                <strong>Variables:</strong> <code>ad</code> / <code>first name</code> (full name), <code>soyad</code> / <code>last name</code> (last name), <code>a</code> (first letter of first name), <code>s</code> (first letter of last name). <br />
                <em>e.g. <code>a.soyad</code>, <code>ad_soyad</code>, <code>first name_last name</code>, <code>adsoyad</code></em>
              </div>
            </div>

            {/* Personal credentials */}
            <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-[#EDEBE9] dark:border-[#323130]/60">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">First Name</label>
                <input
                  type="text"
                  placeholder="e.g. John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-[#fdfdfd] dark:bg-[#252423] font-semibold text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-[#0078D4]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Last Name</label>
                <input
                  type="text"
                  placeholder="e.g. Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-[#fdfdfd] dark:bg-[#252423] font-semibold text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-[#0078D4]"
                  required
                />
              </div>
            </div>

            {/* Form standard fields: Department, Address & Sector */}
            <div className="space-y-3 pt-1 border-t border-[#EDEBE9] dark:border-[#323130]/60">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Sales, HR, Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-[#fdfdfd] dark:bg-[#252423] font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Sector / Industry</label>
                <input
                  type="text"
                  placeholder="e.g. Automotive, IT, Retail"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-[#fdfdfd] dark:bg-[#252423] font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Address</label>
                <input
                  type="text"
                  placeholder="e.g. London, UK"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-[#fdfdfd] dark:bg-[#252423] font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Dynamic Formula Output Preview banner */}
            <div className="p-3 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-150 dark:border-blue-900/40 rounded-lg">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#0078D4] block">Estimated E-Mail Address Preview</span>
              <div className="text-xs font-mono font-semibold text-[#0078D4] uppercase truncate mt-1">
                {getPreviewEmail()}
              </div>
            </div>

            <div className="pt-3 border-t border-[#EDEBE9] dark:border-[#323130] flex gap-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-1 bg-[#0078D4] hover:bg-[#005a9e] text-white py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Record
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                className="flex items-center justify-center border border-[#EDEBE9] dark:border-[#323130] hover:bg-slate-50 dark:hover:bg-[#252423]/40 text-slate-750 dark:text-slate-205 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
                title="Save List Domestically"
              >
                Save Draft
              </button>
            </div>

          </form>
        </div>

        {/* Right Side: Lead List data table overview with pagination */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-xl shadow-sm overflow-hidden flex flex-col justify-between min-h-[500px]">
          
          <div>
            {/* Table top toolbar headers */}
            <div className="p-5 border-b border-[#EDEBE9] dark:border-[#323130] flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                  Lead Table List ({records.length} Records)
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mail Merge builder list currently has <strong>{currentMailMergeCount}</strong> active recipients.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTransferToMailMerge}
                  disabled={records.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all ${
                    records.length === 0
                      ? "bg-slate-100 text-slate-400 dark:bg-slate-800/40 dark:text-slate-600 cursor-not-allowed"
                      : "bg-[#0078D4] text-white hover:bg-[#005a9e] cursor-pointer"
                  }`}
                  title="Forward all generated lead list records to Mail Merge recipients list"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Transfer to Recipient List ({records.length})
                </button>

                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#252423] p-1 rounded-lg border border-[#EDEBE9] dark:border-[#323130]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-[11px] font-bold bg-transparent border-none text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <div className="flex gap-1.5 bg-slate-50 dark:bg-[#252423] p-1 rounded-lg border border-[#EDEBE9] dark:border-[#323130]">
                  <button
                    onClick={() => exportDataFile("xlsx")}
                    disabled={records.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#0078D4] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Excel (XLSX)
                  </button>
                  <button
                    onClick={() => exportDataFile("csv")}
                    disabled={records.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none rounded"
                    style={{ backgroundColor: "#14b15b" }}
                  >
                    <FileText className="w-3.5 h-3.5 text-white" />
                    CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Table Container area */}
            <div className="overflow-x-auto">
              {totalRecords === 0 ? (
                <div className="text-center py-20 px-4 space-y-4">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/40 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <ListPlus className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">No Lead Records Yet</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      You can add custom company personnel targets from the creation form on the left.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-[#11100f] border-b border-[#EDEBE9] dark:border-[#323130] text-[10px] font-bold uppercase text-slate-400">
                      <th className="p-3 pl-4 w-[50px] text-center">#</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Full Name</th>
                      <th className="p-3">E-Mail Address</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Sector</th>
                      <th className="p-3">Address</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#323130]/40 text-xs">
                    {currentViewRecords.map((r) => {
                      const isEditing = editingLeadUid === r.uid;
                      return (
                        <tr
                          key={r.uid}
                          className={`transition-colors text-xs ${isEditing ? "bg-amber-50/20 dark:bg-amber-950/10" : "hover:bg-slate-50/55 dark:hover:bg-[#252423]/25"}`}
                        >
                          <td className="p-3 pl-4 text-center font-mono text-[11px] text-slate-400 font-medium">
                            {r.id}
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full text-xs font-semibold text-slate-850 dark:text-slate-100 bg-white dark:bg-[#11100f] border border-[#EDEBE9] dark:border-[#323130] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                                value={editCompany}
                                onChange={(e) => setEditCompany(e.target.value)}
                              />
                            ) : (
                              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                                {!r.saved && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"
                                    title="Unsaved draft changes"
                                  />
                                )}
                                <span className="truncate max-w-[120px]" title={r.company}>{r.company}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-200">
                            {isEditing ? (
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  className="w-1/2 text-xs bg-white dark:bg-[#11100f] border border-[#EDEBE9] dark:border-[#323130] rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                                  value={editFirstName}
                                  onChange={(e) => setEditFirstName(e.target.value)}
                                  placeholder="First"
                                />
                                <input
                                  type="text"
                                  className="w-1/2 text-xs bg-white dark:bg-[#11100f] border border-[#EDEBE9] dark:border-[#323130] rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                                  value={editLastName}
                                  onChange={(e) => setEditLastName(e.target.value)}
                                  placeholder="Last"
                                />
                              </div>
                            ) : (
                              <span>{r.firstName} {r.lastName}</span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-medium text-[#0078D4] dark:text-indigo-400 text-[11px]">
                            {isEditing ? (
                              <input
                                type="email"
                                className="w-full text-xs font-mono bg-white dark:bg-[#11100f] border border-[#EDEBE9] dark:border-[#323130] rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                              />
                            ) : (
                              <span>{r.email}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full text-xs bg-white dark:bg-[#11100f] border border-[#EDEBE9] dark:border-[#323130] rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                                value={editDepartment}
                                onChange={(e) => setEditDepartment(e.target.value)}
                              />
                            ) : (
                              <span>{r.department || <span className="text-slate-300">—</span>}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full text-xs bg-white dark:bg-[#11100f] border border-[#EDEBE9] dark:border-[#323130] rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                                value={editSector}
                                onChange={(e) => setEditSector(e.target.value)}
                              />
                            ) : (
                              <span>{r.sector || <span className="text-slate-300">—</span>}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-650 dark:text-slate-400 text-xs">
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full text-xs bg-white dark:bg-[#11100f] border border-[#EDEBE9] dark:border-[#323130] rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                              />
                            ) : (
                              <div className="truncate max-w-[140px]" title={r.address || "No address entered"}>
                                {r.address || <span className="text-slate-300">—</span>}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => saveEditedRecord(r.uid)}
                                  className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Save Changes"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Cancel Editing"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEditing(r)}
                                  className="p-1 text-[#0078D4] hover:text-[#005a9e] hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Edit Lead Record"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(r.uid)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Delete Lead Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Table Bottom Pagination area */}
          {totalRecords > 0 && (
            <div className="p-4 border-t border-[#EDEBE9] dark:border-[#323130] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing: <strong className="text-slate-700 dark:text-slate-300">{pageStartIdx + 1}-{pageEndIdx}</strong> / <strong className="text-slate-700 dark:text-slate-300">{totalRecords}</strong> records.
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded border border-[#EDEBE9] dark:border-[#323130] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed bg-white dark:bg-transparent font-semibold shadow-xs"
                >
                  Prev
                </button>
                
                {getPageNumbers().map((no, idx, origin) => {
                  const isDots = idx > 0 && no - origin[idx - 1] > 1;
                  return (
                    <React.Fragment key={no}>
                      {isDots && <span className="text-slate-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(no)}
                        className={`w-7 h-7 rounded font-semibold flex items-center justify-center transition-all cursor-pointer ${
                          currentPage === no
                            ? "bg-[#0078D4] text-white"
                            : "border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-transparent text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {no}
                      </button>
                    </React.Fragment>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded border border-[#EDEBE9] dark:border-[#323130] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed bg-white dark:bg-transparent font-semibold shadow-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
