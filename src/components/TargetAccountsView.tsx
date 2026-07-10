import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Target,
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
  Edit,
  Maximize2,
  Minimize2,
  ExternalLink,
  TrendingUp,
  ChevronRight,
  Clock,
  Layers,
  ShieldCheck,
  Mail,
  Building,
  Users,
  MapPin,
  FileText,
  Briefcase
} from "lucide-react";
import { TargetAccount, Recipient } from "../types";
import { useLanguage } from "../lib/LanguageContext";

interface TargetAccountsViewProps {
  onPushToMailMerge: (newRecs: Recipient[]) => void;
  currentMailMergeCount: number;
  onNavigateToTab?: (tab: any) => void;
}

export default function TargetAccountsView({
  onPushToMailMerge,
  currentMailMergeCount,
  onNavigateToTab
}: TargetAccountsViewProps) {
  const { t } = useLanguage();

  // Accounts Storage State
  const [accounts, setAccounts] = useState<TargetAccount[]>([]);
  
  // Interactive Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  
  // Custom interactive feedbacks
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New manual account model state
  const [newAccount, setNewAccount] = useState({
    companyName: "",
    websiteUrl: "",
    industryTag: "",
    companySize: "750+ Çalışan",
    locationMain: "",
    contactName: "",
    contactSurname: "",
    contactEmail: "",
    department: "",
    leadStatus: "New",
    leadSegment: "Cold",
    riskScore: 75,
    customField1: "",
    customField2: "",
    aiAnalysisSummary: "",
    draftTemplates: "",
    rawOutput: ""
  });

  // Edit account modal/inline state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TargetAccount | null>(null);

  // Selected details drawer sidebar
  const [selectedAccount, setSelectedAccount] = useState<TargetAccount | null>(null);

  // Wide View layout state
  const [isWide, setIsWide] = useState(false);

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

  // Loading initial set from localStore
  useEffect(() => {
    const saved = localStorage.getItem("smart_mailmerge_target_accounts");
    if (saved) {
      try {
        setAccounts(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to load Target Accounts from local storage:", err);
      }
    } else {
      // Seed with beautiful initial demo items if none exist to make screen stunning right away
      const seedData: TargetAccount[] = [
        {
          id: "target_seed_1",
          companyName: "Vestel",
          websiteUrl: "https://www.vestel.com.tr",
          industryTag: "Elektronik & Teknoloji",
          companySize: "15000+ Çalışan",
          locationMain: "Manisa, Türkiye",
          contactName: "Mehmet",
          contactSurname: "Kaya",
          contactEmail: "mehmet.kaya@vestel.com.tr",
          department: "Süreç İyileştirme Lideri",
          leadStatus: "Contacted",
          leadSegment: "Hot Lead",
          riskScore: 89,
          customField1: "OEE Optimizasyonu Hedefi",
          customField2: "Smart Grid Projesi Arşivi",
          aiAnalysisSummary: "Muda (İsraf) Noktaları & Kalite Riskleri:\n- Çoklu hat aşınmaları ve montaj istasyonu duruş süreleri yüksek.\n- COPQ (Cost of Poor Quality) tahmini %4.2 civarında.\n- OEE oranı %76, dijitalizasyon yatırımı planlanıyor.\n\nYalın Fırsatlar:\n- Dijital Kanban ve Andon hat çağrı sistemlerinin entegrasyonu.\n- Supplier Quality Assurance (Tedarikçi Kalite) standartlaştırma eğitimleri.",
          draftTemplates: "Subject: Vestel Üretim Verimliliği & OEE Optimizasyonu Raporu\n\nSayın Operasyon Direktörü,\n\nVestel Manisa City tesislerindeki devasa üretim hacmini ve akıllı montaj hedeflerinizi büyük bir hayranlıkla takip ediyoruz.\n\nHata paylarını (COPQ) %15-20 oranında azaltmaya ve OEE oranını %84+ üzerine taşımaya yönelik geliştirdiğimiz B2B Yalın Dijital Dönüşüm paketi hakkında kısa bir sunum yapmak isteriz.\n\nSaygılarımızla,\nGemba IQ Ekibi",
          analysisSource: "Deep Research (Gemini + Tavily)",
          analysisDate: new Date().toLocaleString("tr-TR"),
          rawOutput: "# VESTEL ŞİRKET DETAYLARI\n\nManisa merkezli dev sanayi üreticisi.\nIndustry: Consumer Electronics, Home Appliances.\nLocations: Vestel City Manisa.\n\n# Suggested Decision Makers\n- Plant General Manager\n- Quality Assurance Lead\n\n# Recommended Strategy\nFocus on assembly waste reduction and advanced lean scheduling."
        },
        {
          id: "target_seed_2",
          companyName: "Kordsa",
          websiteUrl: "https://www.kordsa.com",
          industryTag: "Kimya Sanayii",
          companySize: "4500+ Çalışan",
          locationMain: "Kocaeli/Gebze, Türkiye",
          contactName: "Can",
          contactSurname: "Aydın",
          contactEmail: "can.aydin@kordsa.com",
          department: "Continuous Improvement",
          leadStatus: "New",
          leadSegment: "Warm Lead",
          riskScore: 82,
          customField1: "SMED Kalıp Azaltma Prosedürü",
          customField2: "Enerji Tasarrufu Yatırımı",
          aiAnalysisSummary: "Muda Noktaları & Kalite Riskleri:\n- Kompozit pres fırınlarında enerji optimizasyonu ihtiyacı.\n- İplik çekme proseslerinde fire oranları %2.8.\n- ISO 50001 Enerji Yönetim standardı iyileştirme açıkları.\n\nYalın Fırsatlar:\n- Single Minute Exchange of Die (SMED) ile kalıp değişim sürelerini %40 kısaltma.\n- Endüstriyel nesnelerin interneti (IIoT) tabanlı fire izleme yazılımı.",
          draftTemplates: "Subject: Kordsa Kompozit & İplik Proseslerinde Yangın & SMED Çözümleri\n\nSayın Kalite ve Süreç İyileştirme Lideri,\n\nKordsa'nın küresel kompozit ve güçlendirme teknolojilerindeki lider rolünü yakından izliyoruz. Tesis duruş süreleri ve SMED kalıp değişim sürelerini kısaltarak üretim esnekliğini artırmak isterseniz çözümlerimiz hazır.\n\nSaygılarımızla,\nGemba IQ Ekibi",
          analysisSource: "Deep Research (Gemini + Tavily)",
          analysisDate: new Date().toLocaleString("tr-TR"),
          rawOutput: "# KORDSA\n\nIndustry: Tire reinforcement, Composite technologies.\nLocations: Izmit, Kocaeli.\n\n# Recommends\nFocus on carbon scrap reduction and SMED standardizations."
        }
      ];
      setAccounts(seedData);
      localStorage.setItem("smart_mailmerge_target_accounts", JSON.stringify(seedData));
    }
  }, []);

  // Helper Auto-Saver whenever account list mutates
  const updateAccountsAndPersist = (updated: TargetAccount[]) => {
    setAccounts(updated);
    localStorage.setItem("smart_mailmerge_target_accounts", JSON.stringify(updated));
  };

  const triggerToast = (msg: string, type: "success" | "info" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3550);
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.companyName.trim()) {
      triggerToast(t("Company name is strictly required."), "error");
      return;
    }

    const added: TargetAccount = {
      id: `target_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      no: accounts.length + 1,
      companyName: newAccount.companyName.trim(),
      websiteUrl: newAccount.websiteUrl.trim() || `https://www.${newAccount.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      industryTag: newAccount.industryTag.trim() || "Genel Endüstri",
      companySize: newAccount.companySize,
      locationMain: newAccount.locationMain.trim() || "Belirtilmemiş",
      contactName: newAccount.contactName.trim() || "Kalite / Operasyon",
      contactSurname: newAccount.contactSurname.trim() || "Direktörü",
      contactEmail: newAccount.contactEmail.trim() || `opex@${newAccount.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      department: newAccount.department.trim() || "Operational Excellence",
      leadStatus: newAccount.leadStatus,
      leadSegment: newAccount.leadSegment,
      riskScore: Number(newAccount.riskScore) || 70,
      customField1: newAccount.customField1.trim(),
      customField2: newAccount.customField2.trim(),
      aiAnalysisSummary: newAccount.aiAnalysisSummary.trim() || "Manuel eklenen hedef firma kaydı.",
      draftTemplates: newAccount.draftTemplates.trim() || "Sayın Yetkili,\n\nVerimlilik çözümlerimiz hakkında görüşmek isteriz.",
      analysisSource: "Manual Entry User",
      analysisDate: new Date().toLocaleString("tr-TR"),
      rawOutput: newAccount.rawOutput.trim() || "Manuel Giriş"
    };

    const updatedList = [...accounts, added];
    updateAccountsAndPersist(updatedList);
    
    // Clear inputs and close accordion
    setNewAccount({
      companyName: "",
      websiteUrl: "",
      industryTag: "",
      companySize: "750+ Çalışan",
      locationMain: "",
      contactName: "",
      contactSurname: "",
      contactEmail: "",
      department: "",
      leadStatus: "New",
      leadSegment: "Cold",
      riskScore: 75,
      customField1: "",
      customField2: "",
      aiAnalysisSummary: "",
      draftTemplates: "",
      rawOutput: ""
    });
    setIsAddingAccount(false);
    triggerToast(t("Added {name} to Target Accounts registry").replace("{name}", added.companyName), "success");
  };

  const handleManualSaveAll = () => {
    localStorage.setItem("smart_mailmerge_target_accounts", JSON.stringify(accounts));
    triggerToast(t("Target accounts database committed & saved securely."), "success");
  };

  // Inline action editing
  const startEditingAccount = (account: TargetAccount) => {
    setEditingAccountId(account.id);
    setEditForm({ ...account });
  };

  const saveEditedAccount = () => {
    if (!editForm) return;
    if (!editForm.companyName.trim()) {
      triggerToast(t("Company Name is a validation prerequisite."), "error");
      return;
    }

    const updated = accounts.map(a => a.id === editForm.id ? editForm : a);
    updateAccountsAndPersist(updated);
    setEditingAccountId(null);
    setEditForm(null);
    triggerToast(t("Target account details updated successfully."), "success");
  };

  const deleteSingleAccount = (id: string) => {
    const remaining = accounts.filter(a => a.id !== id);
    // Standardize 'no' sequence values
    const standardized = remaining.map((a, idx) => ({ ...a, no: idx + 1 }));
    updateAccountsAndPersist(standardized);
    triggerToast(t("Account removed from database."), "info");
  };

  const deleteSelectedAccounts = () => {
    const remaining = accounts.filter(a => !a.isSelected);
    if (accounts.length === remaining.length) {
      triggerToast(t("No items selected to delete."), "info");
      return;
    }
    const standardized = remaining.map((a, idx) => ({ ...a, no: idx + 1 }));
    updateAccountsAndPersist(standardized);
    triggerToast(t("Bulk deleted selected records successfully."), "success");
  };

  // Checkbox interactions
  const toggleSelectAccount = (id: string) => {
    const updated = accounts.map(a => a.id === id ? { ...a, isSelected: !a.isSelected } : a);
    setAccounts(updated); // Avoid persistent save on checkbox select
  };

  const toggleSelectAll = () => {
    const someUnselected = filteredAccounts.some(a => !a.isSelected);
    const updated = accounts.map(a => {
      const isFiltered = filteredAccounts.some(f => f.id === a.id);
      if (isFiltered) {
        return { ...a, isSelected: someUnselected };
      }
      return a;
    });
    setAccounts(updated);
  };

  // EXPORT OUT TO EXCEL-FRIENDLY CSV
  const handleExportCSV = () => {
    if (accounts.length === 0) {
      triggerToast(t("No accounts available in registry to export."), "error");
      return;
    }

    // Semicolon-delimited headers exactly matching specifications:
    const headers = [
      "ID", "No", "Company Name", "Website URL", "Industry Tag", "Company Size", "Address",
      "Contact Name", "Contact Surname", "Contact Email", "Department",
      "Lead Status", "Lead Segment", "Risk Score", "Analysis Source", "Analysis Date"
    ];

    const rows = accounts.map(a => [
      a.id,
      a.no || "",
      a.companyName || "",
      a.websiteUrl || "",
      a.industryTag || "",
      a.companySize || "",
      a.locationMain || "",
      a.contactName || "",
      a.contactSurname || "",
      a.contactEmail || "",
      a.department || "",
      a.leadStatus || "New",
      a.leadSegment || "Cold",
      a.riskScore || 70,
      a.analysisSource || "",
      a.analysisDate || ""
    ]);

    const fileContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => {
        const strVal = String(cell);
        if (strVal.includes(";") || strVal.includes('"') || strVal.includes("\n")) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + fileContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `target_accounts_database_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    triggerToast(t("Target accounts exported successfully as semicolon-delimited CSV."), "success");
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

          const originalHeaders = rawRows[0].map((h: any) => String(h || "").trim());
          const records: TargetAccount[] = [];

          const findIndexByNames = (names: string[]) => {
            return originalHeaders.findIndex((h) =>
              names.some((name) => h.toLowerCase().replace(/[\s_;:-]+/g, "") === name.toLowerCase().replace(/[\s_;:-]+/g, ""))
            );
          };

          const idIdx = findIndexByNames(["id"]);
          const noIdx = findIndexByNames(["no"]);
          const compIdx = findIndexByNames(["companyname", "company", "sirket", "firma", "isletme"]);
          const webIdx = findIndexByNames(["websiteurl", "website", "url", "web"]);
          const indIdx = findIndexByNames(["industrytag", "industry", "sector", "sektor"]);
          const sizeIdx = findIndexByNames(["companysize", "size", "olcek", "calisansayisi"]);
          const addrIdx = findIndexByNames(["address", "location", "locationmain", "adres", "konum"]);
          const cNameIdx = findIndexByNames(["contactname", "firstname", "first", "ad", "adi"]);
          const cSurnameIdx = findIndexByNames(["contactsurname", "lastname", "last", "soyad", "soyadi"]);
          const cEmailIdx = findIndexByNames(["contactemail", "emailaddress", "email", "mail", "eposta"]);
          const deptIdx = findIndexByNames(["department", "departman", "gorev", "bolum"]);
          const statIdx = findIndexByNames(["leadstatus", "status", "durum"]);
          const segIdx = findIndexByNames(["leadsegment", "segment"]);
          const riskIdx = findIndexByNames(["riskscore", "score", "skor", "oncelik"]);

          for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (row.length === 0 || !row[Math.max(0, compIdx)]) continue;

            const companyVal = compIdx !== -1 && row[compIdx] ? String(row[compIdx]).trim() : "";
            if (!companyVal) continue;

            records.push({
              id: idIdx !== -1 && row[idIdx] ? String(row[idIdx]) : `target_imp_${Date.now()}_${i}_${Math.floor(Math.random() * 100)}`,
              companyName: companyVal,
              websiteUrl: webIdx !== -1 && row[webIdx] ? String(row[webIdx]).trim() : `https://www.${companyVal.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
              industryTag: indIdx !== -1 && row[indIdx] ? String(row[indIdx]).trim() : "Genel Endüstri",
              companySize: sizeIdx !== -1 && row[sizeIdx] ? String(row[sizeIdx]).trim() : "750+ Çalışan",
              locationMain: addrIdx !== -1 && row[addrIdx] ? String(row[addrIdx]).trim() : "Belirtilmemiş",
              contactName: cNameIdx !== -1 && row[cNameIdx] ? String(row[cNameIdx]).trim() : "Kalite / Operasyon",
              contactSurname: cSurnameIdx !== -1 && row[cSurnameIdx] ? String(row[cSurnameIdx]).trim() : "Direktörü",
              contactEmail: cEmailIdx !== -1 && row[cEmailIdx] ? String(row[cEmailIdx]).trim() : `opex@${companyVal.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
              department: deptIdx !== -1 && row[deptIdx] ? String(row[deptIdx]).trim() : "Operational Excellence",
              leadStatus: statIdx !== -1 && row[statIdx] ? String(row[statIdx]).trim() : "New",
              leadSegment: segIdx !== -1 && row[segIdx] ? String(row[segIdx]).trim() : "Cold",
              riskScore: riskIdx !== -1 && row[riskIdx] ? Number(row[riskIdx]) : 75,
              aiAnalysisSummary: "İçe aktarılan siber analiz şirketi.",
              draftTemplates: "Sıcak temas e-posta çözümü hazır.",
              analysisSource: "Imported Spreadsheet",
              analysisDate: new Date().toLocaleString("tr-TR"),
              rawOutput: "Import Row"
            });
          }

          const updated = [...accounts];
          let addedCount = 0;

          records.forEach(rec => {
            const matchIndex = updated.findIndex(a => a.companyName.toLowerCase() === rec.companyName.toLowerCase());
            if (matchIndex !== -1) {
              updated[matchIndex] = {
                ...updated[matchIndex],
                ...rec,
                id: updated[matchIndex].id,
                no: updated[matchIndex].no
              };
            } else {
              rec.no = updated.length + 1;
              updated.push(rec);
              addedCount++;
            }
          });

          updateAccountsAndPersist(updated);
          triggerToast(
            t("Spreadsheet parsed! Updated {updated} and added {added} brand new target accounts!")
              .replace("{updated}", String(records.length - addedCount))
              .replace("{added}", String(addedCount)),
            "success"
          );
        } catch (excelErr: any) {
          console.error(excelErr);
          setImportError(t("Bad spreadsheet structure: {error}").replace("{error}", excelErr.message));
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      setImportError(err.message || t("Failed loading selected dataset file."));
    }

    if (e.target) e.target.value = "";
  };

  // MULTIPLE TRANSFER INTEGRATION logic
  const handleTransferToRecipientList = () => {
    const selectedAccounts = accounts.filter(a => a.isSelected);
    if (selectedAccounts.length === 0) {
      triggerToast(t("No target records are currently selected. Tick checkboxes on the left side first."), "error");
      return;
    }

    const mappedRecipients: Recipient[] = selectedAccounts.map(a => {
      // Clean fallback strings
      const extractedEmail = a.contactEmail || `opex@${a.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
      const targetFirstName = a.contactName || "Kalite / Operasyon";
      const targetLastName = a.contactSurname || "Direktörü";
      const targetDept = a.department || "Operational Excellence";

      return {
        id: `rec_target_${Date.now()}_${Math.floor(Math.random() * 10000)}_${a.no || 1}`,
        FirstName: targetFirstName,
        LastName: targetLastName,
        Email: extractedEmail,
        Company: a.companyName,
        Department: targetDept,
        Address: a.locationMain,
        Industry: a.industryTag,
        ScheduledDate: "",
        CustomField1: `Öncelik Riski: %${a.riskScore}`,
        CustomField2: `Kaynak: ${a.analysisSource || "Transfer"}`,
        CustomField3: `Segment: ${a.leadSegment || "Warm"}`,
        status: "idle",
        openCount: 0
      };
    });

    onPushToMailMerge(mappedRecipients);

    // Unselect transferred rows to make user state clean
    const resetSelection = accounts.map(a => ({ ...a, isSelected: false }));
    setAccounts(resetSelection);

    triggerToast(
      t("Successfully transferred {count} target contacts directly into Mail Merge queue! Heading there...")
        .replace("{count}", String(mappedRecipients.length)),
      "success"
    );
  };

  // Compute stats counters
  const totalCount = accounts.length;
  const highRiskCount = accounts.filter(a => Number(a.riskScore) >= 85).length;
  const contactedCount = accounts.filter(a => a.leadStatus?.toLowerCase() === "contacted").length;
  const selectedCount = accounts.filter(a => a.isSelected).length;

  // Search filtering logics
  const filteredAccounts = accounts.filter(a => {
    const matchesSearch = 
      a.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.industryTag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.contactSurname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.locationMain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || a.leadStatus?.toLowerCase() === statusFilter.toLowerCase();
    const matchesSegment = !segmentFilter || a.leadSegment?.toLowerCase() === segmentFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSegment;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1;
  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div id="target-accounts-view-root" className="space-y-6">
      
      {/* Toast Alert pop notification */}
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

      {/* Title Header with Metrics Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#1b1a19] p-6 border border-[#EDEBE9] dark:border-[#323130] rounded shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#0078D4] dark:text-brand-300" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{t("Target Accounts & Prospects Database")}</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            {t("Maintain high priority enterprise company research and siber profiles. Coordinate lead statuses, optimize continuous improvement channels, and bulk compile targeted recipients straight into the Mail Merge outgoing queue.")}
          </p>
        </div>

        {/* Action Belt */}
        <div className="flex flex-wrap items-center gap-2">
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

          <button
            type="button"
            onClick={handleExportCSV}
            className="text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            <span>{t("Export CSV")}</span>
          </button>

          <button
            type="button"
            onClick={handleManualSaveAll}
            className="text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Save className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            <span>{t("Save List")}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingAccount(!isAddingAccount)}
            className="text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            <span>{isAddingAccount ? t("Cancel New") : t("Add Target Company")}</span>
          </button>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab("deal-management")}
              className="text-xs font-bold bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              <Briefcase className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
              <span>{t("Deal Management")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline diagnostic block */}
      {importError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900 rounded text-xs text-rose-800 dark:text-rose-300 flex items-center gap-3">
          <X className="w-4.5 h-4.5 cursor-pointer flex-shrink-0 hover:opacity-80" onClick={() => setImportError(null)} />
          <span>{importError}</span>
        </div>
      )}

      {/* Bento Stats Ribbons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{t("Total Target Accounts")}</span>
          <div className="text-xl font-bold text-[#0078D4] mt-1">{totalCount} {t("companies")}</div>
          <p className="text-[10px] text-slate-450 mt-1">{t("In-Memory synced")}</p>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{t("High Priority / Hot")}</span>
          <div className="text-xl font-bold text-orange-600 mt-1">{highRiskCount} {t("active")}</div>
          <p className="text-[10px] text-slate-450 mt-1">{t("Opportunity Score >= 85%")}</p>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{t("Already Contacted")}</span>
          <div className="text-xl font-bold text-indigo-500 mt-1">{contactedCount} {t("companies")}</div>
          <p className="text-[10px] text-slate-450 mt-1">{t("Active outreach initiated")}</p>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] shadow-sm">
          <span className="text-[10px] font-bold text-slate-450 uppercase">{t("Current Selected Targets")}</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">{selectedCount} {t("selected")}</div>
          <p className="text-[10px] text-slate-450 mt-1">{t("Ready for transfer queue")}</p>
        </div>

        <div className="bg-[#f0f8ff] dark:bg-blue-950/20 p-4 rounded border border-blue-200 dark:border-blue-900 shadow-sm col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-[#0078D4] dark:text-brand-300 uppercase">{t("Mail Merge Outbox")}</span>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{currentMailMergeCount} {t("active")}</div>
          <p className="text-[10px] text-slate-505 mt-1">{t("Ready to compile & dispatch")}</p>
        </div>
      </div>

      {/* Main Database Table & Control Panel */}
      <div className={isWide 
        ? "fixed inset-0 z-50 bg-[#FAF9F8] dark:bg-[#121110] p-6 overflow-y-auto flex flex-col space-y-4 animate-fadeIn" 
        : "bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded shadow-sm overflow-hidden"
      }>

        {/* If wide screen, render a pristine visual header with close button */}
        {isWide && (
          <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0078D4]" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">{t("Target Accounts Studio (Expanded Mode)")}</h3>
            </div>
            <button 
              type="button" 
              onClick={() => setIsWide(false)}
              className="text-xs font-bold text-slate-550 hover:text-slate-755 dark:text-slate-300 dark:hover:text-slate-100 bg-white dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:bg-slate-50"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>{t("Close Wide View")}</span>
            </button>
          </div>
        )}

        {/* Manual Account append slider layout */}
        {isAddingAccount && (
          <form onSubmit={handleManualAddSubmit} className="bg-white dark:bg-[#1b1a19] border border-[#0078D4]/20 rounded p-6 shadow-md animate-fadeIn space-y-4">
            <div className="border-b border-[#EDEBE9] dark:border-[#323130] pb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-705 uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>{t("Input Target Company Manual Record")}</span>
              </h3>
              <button type="button" onClick={() => setIsAddingAccount(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Company Name *")}</label>
                <input
                  type="text"
                  placeholder={t("e.g. Arçelik")}
                  value={newAccount.companyName}
                  onChange={e => setNewAccount({ ...newAccount, companyName: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Website URL")}</label>
                <input
                  type="text"
                  placeholder={t("https://www.arcelik.com.tr")}
                  value={newAccount.websiteUrl}
                  onChange={e => setNewAccount({ ...newAccount, websiteUrl: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Industry Tag")}</label>
                <input
                  type="text"
                  placeholder={t("e.g. Beyaz Eşya Üretimi")}
                  value={newAccount.industryTag}
                  onChange={e => setNewAccount({ ...newAccount, industryTag: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Company Size")}</label>
                <input
                  type="text"
                  placeholder={t("e.g. 10000+ Çalışan")}
                  value={newAccount.companySize}
                  onChange={e => setNewAccount({ ...newAccount, companySize: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Contact First Name")}</label>
                <input
                  type="text"
                  placeholder={t("Kürşad")}
                  value={newAccount.contactName}
                  onChange={e => setNewAccount({ ...newAccount, contactName: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Contact Surname")}</label>
                <input
                  type="text"
                  placeholder={t("Yıldırım")}
                  value={newAccount.contactSurname}
                  onChange={e => setNewAccount({ ...newAccount, contactSurname: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Contact Email")}</label>
                <input
                  type="email"
                  placeholder={t("kursad.yildirim@arcelik.com")}
                  value={newAccount.contactEmail}
                  onChange={e => setNewAccount({ ...newAccount, contactEmail: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Department")}</label>
                <input
                  type="text"
                  placeholder={t("Yalın İmalat / Kalite")}
                  value={newAccount.department}
                  onChange={e => setNewAccount({ ...newAccount, department: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Address / Main Location")}</label>
                <input
                  type="text"
                  placeholder={t("Eskişehir, Türkiye")}
                  value={newAccount.locationMain}
                  onChange={e => setNewAccount({ ...newAccount, locationMain: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Opportunity Score (1-100) *")}</label>
                <input
                  type="number"
                  placeholder={t("85")}
                  value={newAccount.riskScore}
                  onChange={e => setNewAccount({ ...newAccount, riskScore: Number(e.target.value) })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none focus:border-[#0078D4]"
                  min="1"
                  max="100"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Lead Status")}</label>
                <select
                  value={newAccount.leadStatus}
                  onChange={e => setNewAccount({ ...newAccount, leadStatus: e.target.value })}
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
                  value={newAccount.leadSegment}
                  onChange={e => setNewAccount({ ...newAccount, leadSegment: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none"
                >
                  <option value="Hot Lead">{t("Hot Lead")}</option>
                  <option value="Warm Lead">{t("Warm Lead")}</option>
                  <option value="Cold">{t("Cold")}</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("AI Risks & Waste Opportunities Summary")}</label>
                <textarea
                  placeholder={t("Muda points and factory efficiency indicators...")}
                  value={newAccount.aiAnalysisSummary}
                  onChange={e => setNewAccount({ ...newAccount, aiAnalysisSummary: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none h-16 focus:border-[#0078D4] resize-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("Outreach Templates / Drafts")}</label>
                <textarea
                  placeholder={t("Subject: Outreach Template here...")}
                  value={newAccount.draftTemplates}
                  onChange={e => setNewAccount({ ...newAccount, draftTemplates: e.target.value })}
                  className="w-full p-2 border border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] rounded outline-none h-16 focus:border-[#0078D4] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#EDEBE9] dark:border-[#323130] pt-4 mt-2">
              <button
                type="button"
                onClick={() => setIsAddingAccount(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-650 px-3 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded cursor-pointer bg-[#faf9f8] dark:bg-[#252423]"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{t("Append Target Company")}</span>
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
                placeholder={t("Search companies, sectors, or contacts...")}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-xs rounded pl-9 pr-4 py-2 w-64 outline-none focus:border-[#0078D4]"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded flex items-center justify-center cursor-pointer transition-all shadow-sm relative ${
                showFilters
                  ? "bg-slate-200 dark:bg-[#323130] text-[#0078D4] border-[#0078D4]"
                  : "bg-[#FAF9F8] hover:bg-[#EDEBE9] dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 border-[#EDEBE9] dark:border-[#323130]"
              }`}
              title={t("Filter Criteria")}
            >
              <Filter className="w-4 h-4" />
              {(statusFilter || segmentFilter) ? (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#0078D4] rounded-full" />
              ) : null}
            </button>

            {showFilters && (
              <div className="flex flex-wrap items-center gap-2 animate-fadeIn">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-[#FAF9F8] dark:bg-[#252423] border border-[#0078D4]/30 dark:border-[#323130] text-xs p-1.5 rounded outline-none text-slate-700 dark:text-slate-200"
                >
                  <option value="">{t("-- Lead Status --")}</option>
                  <option value="New">{t("New")}</option>
                  <option value="Contacted">{t("Contacted")}</option>
                  <option value="Nurturing">{t("Nurturing")}</option>
                  <option value="Disqualified">{t("Disqualified")}</option>
                </select>

                <select
                  value={segmentFilter}
                  onChange={e => setSegmentFilter(e.target.value)}
                  className="bg-[#FAF9F8] dark:bg-[#252423] border border-[#0078D4]/30 dark:border-[#323130] text-xs p-1.5 rounded outline-none text-slate-700 dark:text-slate-200"
                >
                  <option value="">{t("-- Segment --")}</option>
                  <option value="Hot Lead">{t("Hot Lead")}</option>
                  <option value="Warm Lead">{t("Warm Lead")}</option>
                  <option value="Cold">{t("Cold")}</option>
                </select>

                {(statusFilter || segmentFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("");
                      setSegmentFilter("");
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline ml-1 cursor-pointer"
                  >
                    {t("Clear Filter")}
                  </button>
                )}
              </div>
            )}
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
              <span>{t("Transfer to Outbox List ({count})").replace("{count}", String(selectedCount))}</span>
            </button>

            <button
              type="button"
              onClick={deleteSelectedAccounts}
              disabled={selectedCount === 0}
              className={`text-xs font-bold px-3 py-2 border rounded flex items-center gap-1 cursor-pointer transition-all ${
                selectedCount > 0
                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900"
                  : "bg-slate-50 dark:bg-[#252423] text-slate-400 border-[#EDEBE9] dark:border-[#323130] cursor-not-allowed opacity-60"
              }`}
              title={t("Delete selected companies permanently")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t("Delete")}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWide(!isWide)}
              className="text-xs font-bold bg-white hover:bg-slate-50 dark:bg-[#252423] dark:hover:bg-[#323130] text-[#0078D4] dark:text-brand-300 px-3.5 py-2 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              title={isWide ? t("Exit Wide Screen View (Esc)") : t("Expand Table to Wide Screen View")}
            >
              {isWide ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>{t("Close Wide View")}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{t("Wide View")}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dense Excel-Style Adapted Grid Multi-Field View */}
        <div className="overflow-x-auto select-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF9F8] dark:bg-[#201f1e] text-[10px] font-bold text-slate-450 uppercase border-b border-[#EDEBE9] dark:border-[#323130] tracking-wider select-none">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredAccounts.length > 0 && filteredAccounts.every(a => a.isSelected)}
                    onChange={toggleSelectAll}
                    className="rounded text-[#0078D4] cursor-pointer"
                  />
                </th>
                <th className="p-3 w-14">{t("No")}</th>
                <th className="p-3">{t("Company")}</th>
                <th className="p-3">{t("Industry")}</th>
                <th className="p-3">{t("Contact Name")}</th>
                <th className="p-3">{t("Contact Surname")}</th>
                <th className="p-3">{t("Department")}</th>
                <th className="p-3">{t("Address")}</th>
                <th className="p-3">{t("Lead Status")}</th>
                <th className="p-3">{t("Lead Segment")}</th>
                <th className="p-3">{t("Status")}</th>
                <th className="p-3 text-center w-20">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEBE9] dark:divide-[#323130] text-xs">
              {paginatedAccounts.length > 0 ? (
                paginatedAccounts.map((a, index) => {
                  const isEditing = editingAccountId === a.id;
                  const itemNo = a.no || ((currentPage - 1) * pageSize) + index + 1;
                  
                  // Default clean fallbacks inside table cells
                  const contactFirstName = a.contactName || "Kalite / Operasyon";
                  const contactLastName = a.contactSurname || "Direktörü";
                  const contactEmail = a.contactEmail || `opex@${a.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
                  const deptStr = a.department || "Operational Excellence";
                  const addrStr = a.locationMain || "Belirtilmemiş";
                  const statusVal = a.leadStatus || "New";
                  const segmentVal = a.leadSegment || "Cold";

                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-[#252423]/50 transition-colors ${
                        a.isSelected ? "bg-[#f3f9fe] dark:bg-[#0078d4]/10" : ""
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={!!a.isSelected}
                          onChange={() => toggleSelectAccount(a.id)}
                          className="rounded text-[#0078D4] cursor-pointer"
                        />
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-400">
                        {itemNo}
                      </td>

                      {/* COMPANY COLUMN */}
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-100 min-w-[120px]">
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.companyName}
                            onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                            className="p-1 text-xs border border-[#0078D4] dark:border-brand-500 rounded bg-white dark:bg-[#252423] outline-none"
                          />
                        ) : (
                          <div className="space-y-0.5">
                            <span 
                              className="font-bold cursor-pointer hover:text-[#0078D4] hover:underline"
                              onClick={() => setSelectedAccount(a)}
                            >
                              {a.companyName}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Building className="w-3 h-3 text-[#0078D4]" />
                              <a
                                href={a.websiteUrl}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                className="hover:underline hover:text-[#0078D4] truncate max-w-[110px]"
                              >
                                {a.websiteUrl.replace(/^(https?:\/\/)?(www\.)?/, "")}
                              </a>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* INDUSTRY COLUMN */}
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.industryTag}
                            onChange={(e) => setEditForm({ ...editForm, industryTag: e.target.value })}
                            className="p-1 text-xs border border-slate-300 rounded bg-white dark:bg-[#252423] text-xs"
                          />
                        ) : (
                          <span className="bg-slate-100 dark:bg-black/25 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 font-bold">
                            {a.industryTag || "Genel Endüstri"}
                          </span>
                        )}
                      </td>

                      {/* CONTACT NAME */}
                      <td className="p-3 text-slate-700 dark:text-slate-205">
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.contactName || ""}
                            onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                            className="p-1 text-xs border border-slate-300 rounded bg-white dark:bg-[#252423]"
                          />
                        ) : (
                          <span className="font-semibold">{contactFirstName}</span>
                        )}
                      </td>

                      {/* CONTACT SURNAME */}
                      <td className="p-3 text-slate-700 dark:text-slate-205">
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.contactSurname || ""}
                            onChange={(e) => setEditForm({ ...editForm, contactSurname: e.target.value })}
                            className="p-1 text-xs border border-slate-300 rounded bg-white dark:bg-[#252423]"
                          />
                        ) : (
                          <span>{contactLastName}</span>
                        )}
                      </td>

                      {/* DEPARTMENT */}
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.department || ""}
                            onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                            className="p-1 text-xs border border-slate-300 rounded bg-white dark:bg-[#252423]"
                          />
                        ) : (
                          <div className="space-y-0.5 max-w-[120px] truncate">
                            <span className="italic truncate block">{deptStr}</span>
                            <span className="text-[10px] block opacity-70 truncate" title={contactEmail}>{contactEmail}</span>
                          </div>
                        )}
                      </td>

                      {/* ADDRESS */}
                      <td className="p-3 text-slate-600 dark:text-slate-350 truncate max-w-[110px]">
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.locationMain || ""}
                            onChange={(e) => setEditForm({ ...editForm, locationMain: e.target.value })}
                            className="p-1 text-xs border border-slate-300 rounded bg-white dark:bg-[#252423]"
                          />
                        ) : (
                          <span title={addrStr}>{addrStr}</span>
                        )}
                      </td>

                      {/* LEAD STATUS */}
                      <td className="p-3">
                        {isEditing && editForm ? (
                          <select
                            value={editForm.leadStatus || "New"}
                            onChange={(e) => setEditForm({ ...editForm, leadStatus: e.target.value })}
                            className="p-1 text-xs border border-slate-300 rounded bg-white dark:bg-[#252423]"
                          >
                            <option value="New">{t("New")}</option>
                            <option value="Contacted">{t("Contacted")}</option>
                            <option value="Nurturing">{t("Nurturing")}</option>
                            <option value="Disqualified">{t("Disqualified")}</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            statusVal === "Contacted"
                              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-[#0078D4]"
                              : statusVal === "Nurturing"
                              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-700"
                              : statusVal === "Disqualified"
                              ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-700"
                              : "bg-slate-50 dark:bg-[#252423] border-slate-200 dark:border-slate-800 text-slate-500"
                          }`}>
                            {t(statusVal)}
                          </span>
                        )}
                      </td>

                      {/* LEAD SEGMENT */}
                      <td className="p-3">
                        {isEditing && editForm ? (
                          <select
                            value={editForm.leadSegment || "Cold"}
                            onChange={(e) => setEditForm({ ...editForm, leadSegment: e.target.value })}
                            className="p-1 text-xs border border-slate-300 rounded bg-white dark:bg-[#252423]"
                          >
                            <option value="Hot Lead">{t("Hot Lead")}</option>
                            <option value="Warm Lead">{t("Warm Lead")}</option>
                            <option value="Cold">{t("Cold")}</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            segmentVal.toLowerCase().includes("hot")
                              ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                              : segmentVal.toLowerCase().includes("warm")
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-black/30 dark:text-slate-400"
                          }`}>
                            {t(segmentVal)}
                          </span>
                        )}
                      </td>

                      {/* STATUS (Opportunity risk score or similar) */}
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">
                        {isEditing && editForm ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold">%</span>
                            <input
                              type="number"
                              value={editForm.riskScore}
                              onChange={(e) => setEditForm({ ...editForm, riskScore: Number(e.target.value) })}
                              className="p-1 text-xs border border-slate-300 rounded bg-white dark:bg-[#252423] w-12 text-xs"
                              min="1"
                              max="100"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>%{a.riskScore || 70}</span>
                          </div>
                        )}
                      </td>

                      {/* ACTIONS BAR */}
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1 animate-slide-in">
                            <button
                              type="button"
                              onClick={saveEditedAccount}
                              className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-800 rounded shadow-sm cursor-pointer"
                              title={t("Confirm Changes")}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAccountId(null);
                                setEditForm(null);
                              }}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-[#252423] text-slate-500 rounded border border-slate-200 dark:border-[#323130] cursor-pointer"
                              title={t("Discard Edit")}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 pb shadow-none">
                            <button
                              type="button"
                              onClick={() => {
                                // Push a clean recipient mapped from this company contact
                                const mapped: Recipient = {
                                  id: `rec_target_${Date.now()}`,
                                  FirstName: contactFirstName,
                                  LastName: contactLastName,
                                  Email: contactEmail,
                                  Company: a.companyName,
                                  Department: deptStr,
                                  Address: addrStr,
                                  Industry: a.industryTag,
                                  ScheduledDate: "",
                                  CustomField1: `Öncelik Riski: %${a.riskScore}`,
                                  CustomField2: `Kaynak: ${a.analysisSource || "Manual Grid"}`,
                                  CustomField3: `Segment: ${segmentVal}`,
                                  status: "idle",
                                  openCount: 0
                                };
                                onPushToMailMerge([mapped]);
                                triggerToast(
                                  t("{name} compiled mapped in outgoing campaign!").replace("{name}", a.companyName),
                                  "success"
                                );
                              }}
                              className="p-1 bg-[#FAF9F8] text-slate-500 border border-[#EDEBE9] dark:bg-[#201f1e] dark:border-[#323130] hover:bg-blue-50 hover:text-[#0078D4] dark:hover:bg-blue-950/20 dark:hover:text-[#85c1f5] rounded cursor-pointer shrink-0 transition-colors"
                              title={t("Push Target Email to Mail Merge outbox")}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => startEditingAccount(a)}
                              className="p-1 bg-[#FAF9F8] text-slate-505 border border-[#EDEBE9] dark:bg-[#201f1e] dark:border-[#323130] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0078D4] rounded cursor-pointer transition-colors"
                              title={t("Quick Edit properties inline")}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteSingleAccount(a.id)}
                              className="p-1 bg-[#FAF9F8] text-rose-500 border border-[#EDEBE9] dark:bg-[#201f1e] dark:border-[#323130] hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer transition-colors"
                              title={t("Remove Target")}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="p-10 text-center text-slate-400 dark:text-slate-500">
                    <Database className="w-8 h-8 mx-auto opacity-30 mb-2 animate-pulse-subtle" />
                    <span className="text-xs">{t("No matching target company matches selected filters.")}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Footer bar */}
        <div className="p-4 border-t border-[#EDEBE9] dark:border-[#323130] bg-[#FAF9F8] dark:bg-[#1b1a19] flex items-center justify-between text-xs select-none">
          <span className="text-slate-550 dark:text-slate-400 font-medium">
            {t("Showing")} <strong className="text-slate-700 dark:text-slate-200">{filteredAccounts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> {t("to")}{" "}
            <strong className="text-slate-700 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredAccounts.length)}</strong> {t("of")}{" "}
            <strong className="text-slate-705 dark:text-slate-200">{filteredAccounts.length}</strong> {t("records")}
          </span>

          <div className="flex items-center gap-1.5 shadow-none pb-0">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 border rounded cursor-pointer font-bold transition-all ${
                currentPage === 1
                  ? "bg-slate-50 border-slate-100 text-slate-350 cursor-not-allowed opacity-50 dark:bg-[#201f1e]"
                  : "bg-white dark:bg-[#252423] text-slate-700 dark:text-slate-200 border-[#EDEBE9] dark:border-[#323130] hover:bg-slate-50"
              }`}
            >
              {t("Previous")}
            </button>
            
            <div className="flex items-center gap-1 font-semibold block">
              <span className="dark:text-slate-300">{t("Page")}</span>
              <strong className="text-[#0078D4] dark:text-brand-3 w-5 text-center block">{currentPage}</strong>
              <span className="dark:text-slate-300">{t("of")}</span>
              <strong className="dark:text-slate-200">{totalPages}</strong>
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className={`px-3 py-1.5 border rounded cursor-pointer font-bold transition-all ${
                currentPage >= totalPages
                  ? "bg-slate-50 border-slate-100 text-slate-350 cursor-not-allowed opacity-50 dark:bg-[#201f1e]"
                  : "bg-white dark:bg-[#252423] text-slate-700 dark:text-slate-200 border-[#EDEBE9] dark:border-[#323130] hover:bg-slate-50"
              }`}
            >
              {t("Next")}
            </button>
          </div>
        </div>

      </div>

      {/* Drawer / Detail View Modal Sidebar */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end animate-fade-in" onClick={() => setSelectedAccount(null)}>
          <div 
            className="w-full max-w-2xl bg-white dark:bg-[#1b1a19] h-full shadow-2xl flex flex-col overflow-hidden border-l border-[#EDEBE9] dark:border-[#323130]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-4 bg-[#FAF9F8] dark:bg-[#201f1e] border-b border-[#EDEBE9] dark:border-[#323130] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0078D4]/10 text-[#0078D4] dark:text-brand-400 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-display">
                    {selectedAccount.companyName.toUpperCase()} - {t("DEEP RESEARCH & DOSSIER")}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5 flex items-center gap-3">
                    <span>{t("Source:")} <b className="text-[#0078D4] dark:text-brand-400">{selectedAccount.analysisSource || t("AI Integration")}</b></span>
                    <span>•</span>
                    <span>{t("Date:")} <b>{selectedAccount.analysisDate || t("Stored timestamp")}</b></span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAccount(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-black/20 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body scrollable area */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 font-sans">
              
              {/* Stats highlights banner */}
              <div className="grid grid-cols-3 gap-2.5 bg-[#FAF9F8] dark:bg-[#201f1e] p-3 rounded-xl border border-[#EDEBE9] dark:border-[#323130]">
                <div className="text-center p-1.5 border-r border-slate-200 dark:border-[#323130]">
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">{t("Opportunity Score")}</span>
                  <span className="text-sm font-extrabold text-[#0078D4] dark:text-brand-400 block mt-0.5">% {selectedAccount.riskScore || 75}</span>
                </div>
                <div className="text-center p-1.5 border-r border-slate-200 dark:border-[#323130]">
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">{t("Company Size")}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block mt-0.5 truncate">{selectedAccount.companySize || t("750+ Employees")}</span>
                </div>
                <div className="text-center p-1.5">
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">{t("Main Location")}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block mt-0.5 truncate">{selectedAccount.locationMain || "Belirtilmemiş"}</span>
                </div>
              </div>

              {/* Website links row */}
              <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#0078D4] shrink-0" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">{t("Website URL:")}</span>
                  <a 
                    href={selectedAccount.websiteUrl} 
                    target="_blank" 
                    referrerPolicy="no-referrer"
                    className="text-[#0078D4] dark:text-brand-400 font-bold hover:underline"
                  >
                    {selectedAccount.websiteUrl}
                  </a>
                </div>
                <span className="font-mono text-[9px] text-slate-400 bg-white dark:bg-black/10 px-2 py-0.5 border border-[#EDEBE9] dark:border-[#323130] rounded-full">
                  {t("Corporate Portal")}
                </span>
              </div>

              {/* Contact Information Block */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  {t("Target Stakeholder Contact Details")}
                </h4>
                <div className="bg-[#FAF9F8] dark:bg-black/10 p-4 rounded-xl border border-[#EDEBE9] dark:border-[#323130] text-xs space-y-2 font-sans">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-brand text-slate-400 block">{t("First Name")}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedAccount.contactName || "Kalite / Operasyon"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-brand text-slate-400 block">{t("Surname")}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedAccount.contactSurname || "Direktörü"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-brand text-slate-400 block">{t("Designated Email")}</span>
                      <span className="font-mono text-[#0078D4] dark:text-brand-400 font-bold">{selectedAccount.contactEmail || t("N/A")}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-brand text-slate-400 block">{t("Department / Role")}</span>
                      <span className="font-medium text-slate-750 dark:text-slate-300">{selectedAccount.department || "Operational Excellence"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kalite Riskleri ve Lean Fırsatları Details Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <Layers className="w-4 h-4 text-amber-500" />
                  {t("Quality Risks & Lean Opportunities (AI Analysis)")}
                </h4>
                <div className="bg-[#FAF9F8] dark:bg-black/10 p-4 rounded-xl border border-[#EDEBE9] dark:border-[#323130] text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                  {selectedAccount.aiAnalysisSummary}
                </div>
              </div>

              {/* Üretilen E-posta Taslakları outreach template */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <Mail className="w-4 h-4 text-blue-500" />
                  {t("Pre-compiled Outreach Template (Outbox Copy)")}
                </h4>
                <div className="bg-[#FAF9F8] dark:bg-black/10 p-4 rounded-xl border border-[#EDEBE9] dark:border-[#323130] text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono select-all relative">
                  <p className="font-medium text-slate-400 text-[10px] uppercase tracking-wider select-none mb-2 pb-1 border-b border-dashed border-slate-200 dark:border-slate-800">
                    {t("Outreach Campaign Template")}
                  </p>
                  {selectedAccount.draftTemplates}
                </div>
              </div>

              {/* Raw Groundings output */}
              {selectedAccount.rawOutput && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    {t("Cyber Search Grounding & Raw Output")}
                  </h4>
                  <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 whitespace-pre-line font-mono max-h-[300px] overflow-y-auto">
                    {selectedAccount.rawOutput}
                  </div>
                </div>
              )}
            </div>

            {/* Modal actions row */}
            <div className="px-6 py-4 bg-[#FAF9F8] dark:bg-[#201f1e] border-t border-[#EDEBE9] dark:border-[#323130] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => setSelectedAccount(null)}
                className="px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-[#323130] cursor-pointer"
              >
                {t("Close")}
              </button>

              <button
                onClick={() => {
                  const contactFirstName = selectedAccount.contactName || "Kalite / Operasyon";
                  const contactLastName = selectedAccount.contactSurname || "Direktörü";
                  const contactEmail = selectedAccount.contactEmail || `opex@${selectedAccount.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
                  const deptStr = selectedAccount.department || "Operational Excellence";
                  const addrStr = selectedAccount.locationMain || "Belirtilmemiş";

                  const mapped: Recipient = {
                    id: `rec_target_${Date.now()}`,
                    FirstName: contactFirstName,
                    LastName: contactLastName,
                    Email: contactEmail,
                    Company: selectedAccount.companyName,
                    Department: deptStr,
                    Address: addrStr,
                    Industry: selectedAccount.industryTag,
                    ScheduledDate: "",
                    CustomField1: `Öncelik Riski: %${selectedAccount.riskScore}`,
                    CustomField2: `Kaynak: ${selectedAccount.analysisSource || "Manual Detail"}`,
                    CustomField3: `Segment: ${selectedAccount.leadSegment || "Warm"}`,
                    status: "idle",
                    openCount: 0
                  };

                  onPushToMailMerge([mapped]);
                  setSelectedAccount(null);
                  triggerToast(
                    t("{name} contact pushed directly to outbox campaign!").replace("{name}", selectedAccount.companyName),
                    "success"
                  );
                }}
                className="px-4 py-2 bg-[#0078D4] hover:bg-[#106ebe] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                {t("Send to Recipient List and Design Campaign")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
