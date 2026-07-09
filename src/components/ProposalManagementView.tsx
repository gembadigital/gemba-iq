import React, { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { getSystemCurrency } from "../lib/currencyHelper";
import {
  FileText,
  Search,
  Filter,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Award,
  AlertTriangle,
  FolderMinus,
  CheckCircle,
  Eye,
  Download,
  Send,
  Sparkles,
  Edit,
  Trash2,
  ChevronDown,
  Paperclip,
  Check,
  Building,
  Mail,
  User,
  ExternalLink,
  ChevronRight,
  X
} from "lucide-react";
import { Proposal, ProposalVersion, ProposalOption } from "../types/proposal";
import ProposalFormModal from "./ProposalFormModal";
import { Company } from "./CompaniesView";
import { CrmDb } from "../lib/CrmDb";
import { generateProposalPdfBlob, generateProposalPdfBlobUrl } from "../lib/proposalPdf";
import { saveProposalPdfDocument } from "../lib/enterpriseDocumentService";

export default function ProposalManagementView() {
  const { lang, t } = useLanguage();

  const handleCompanyClick = (e: React.MouseEvent, companyName: string, companyId?: string) => {
    e.stopPropagation();
    let id = companyId;
    if (!id) {
      const matched = CrmDb.getCompanies().find(c => c.name.toLowerCase().trim() === companyName.toLowerCase().trim());
      if (matched) id = matched.id;
    }
    if (!id) {
      const newComp = CrmDb.createCompany({ name: companyName });
      id = newComp.id;
    }
    CrmDb.setKv("active_company_detail_id", id);
    window.dispatchEvent(new CustomEvent("crm-navigate", { detail: { tab: "companies-registry" } }));
  };

  const [proposals, setProposals] = useState<Proposal[]>(() => CrmDb.getProposals());

  const [companies, setCompanies] = useState<Company[]>(() => CrmDb.getCompanies());

  useEffect(() => {
    CrmDb.saveProposals(proposals);
  }, [proposals]);

  useEffect(() => {
    CrmDb.saveCompanies(companies);
  }, [companies]);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  // Filter States
  const [searchSubject, setSearchSubject] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [deletingProposalId, setDeletingProposalId] = useState<string | null>(null);

  // Version Control Input States
  const [revisingProposal, setRevisingProposal] = useState<Proposal | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [revisionReasonText, setRevisionReasonText] = useState("");

  // Document Viewer States
  const [viewingProposalDoc, setViewingProposalDoc] = useState<Proposal | null>(null);

  // Selected proposal for full detail & PDF view
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState<Proposal | null>(null);
  const [detailPdfUrl, setDetailPdfUrl] = useState<string>("");

  useEffect(() => {
    let url = "";
    if (selectedProposalForDetail) {
      try {
        url = generateProposalPdfBlobUrl(selectedProposalForDetail, lang);
        setDetailPdfUrl(url);
        const blob = generateProposalPdfBlob(selectedProposalForDetail, lang);
        void saveProposalPdfDocument({
          blob,
          proposalId: selectedProposalForDetail.id,
          companyId: selectedProposalForDetail.companyId,
          proposalNumber: selectedProposalForDetail.proposalNumber,
          companyName: selectedProposalForDetail.companyName,
        });
      } catch (err) {
        console.error("Failed to generate PDF Blob URL:", err);
        setDetailPdfUrl("");
      }
    } else {
      setDetailPdfUrl("");
    }
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [selectedProposalForDetail, lang]);

  // Email Panel Dispatcher States
  const [sendingProposal, setSendingProposal] = useState<Proposal | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailCC, setEmailCC] = useState("");
  const [emailBCC, setEmailBCC] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);
  const [attachWord, setAttachWord] = useState(true);
  const [attachCustom, setAttachCustom] = useState<string[]>([]);
  const [customFileText, setCustomFileText] = useState("");
  const [isEmailGenerating, setIsEmailGenerating] = useState(false);

  // AI Strategic Analysis Side Drawer States
  const [analyzingProposal, setAnalyzingProposal] = useState<Proposal | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAddCompany = (company: Company) => {
    setCompanies((prev) => [...prev, company]);
  };

  const handleOpenCreateModal = () => {
    setEditingProposal(null);
    setIsModalOpen(true);
  };

  const handleEditProposal = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setIsModalOpen(true);
  };

  const handleSaveProposal = (proposalData: Proposal) => {
    if (editingProposal) {
      // Modify existing
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalData.id ? { ...proposalData, lastUpdate: new Date().toLocaleString() } : p))
      );
    } else {
      // Find latest sequence number
      const nextSeq = proposals.length > 0 ? Math.max(...proposals.map((p) => p.sequenceNo)) + 1 : 42;
      
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const formattedNum = `${yy}${mm}-${nextSeq}`;

      const newProp: Proposal = {
        ...proposalData,
        sequenceNo: nextSeq,
        proposalNumber: formattedNum,
        createdBy: "GP",
        lastUpdate: new Date().toLocaleString()
      };
      setProposals((prev) => [...prev, newProp]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteProposal = (id: string) => {
    setDeletingProposalId(id);
  };

  const handleConfirmDelete = () => {
    if (deletingProposalId) {
      const nextProposals = proposals.filter((p) => p.id !== deletingProposalId);
      setProposals(nextProposals);
      setDeletingProposalId(null);
    }
  };

  // Revision / Version Control Trigger
  const handleOpenRevisionModal = (proposal: Proposal) => {
    setRevisingProposal(proposal);
    setRevisionNotes("");
    setRevisionReasonText("");
  };

  const handleSaveRevision = () => {
    if (!revisingProposal) return;

    const currentVerNumber = parseInt(revisingProposal.currentVersion.replace("V", "")) || 1;
    const nextVerStr = `V${currentVerNumber + 1}`;

    const newVersionObj: ProposalVersion = {
      version: nextVerStr,
      date: new Date().toISOString(),
      reason: revisionReasonText || "Client request clarification",
      changes: revisionNotes || "Options list and rates updated.",
      owner: revisingProposal.owner,
      subject: revisingProposal.proposalSubject,
      currency: revisingProposal.currency,
      options: { ...revisingProposal.options },
      services: [...revisingProposal.services],
      totalBudget: revisingProposal.totalBudget,
      taxes: revisingProposal.taxes,
      grandTotal: revisingProposal.grandTotal
    };

    const updatedProposal: Proposal = {
      ...revisingProposal,
      currentVersion: nextVerStr,
      status: "Revision Requested",
      versions: [...revisingProposal.versions, newVersionObj],
      lastUpdate: new Date().toLocaleString()
    };

    setProposals((prev) => prev.map((p) => (p.id === revisingProposal.id ? updatedProposal : p)));
    setRevisingProposal(null);
    alert(`Proposal cloned and bumped successfully to ${nextVerStr}! You can now edit its values.`);
  };

  // Switch Active Version preview
  const handleSwitchPreviewVersion = (proposal: Proposal, verStr: string) => {
    const ver = proposal.versions.find((v) => v.version === verStr);
    if (!ver) return;

    const restoredProposal: Proposal = {
      ...proposal,
      currentVersion: ver.version,
      proposalSubject: ver.subject,
      currency: ver.currency as any,
      options: ver.options,
      services: ver.services,
      totalBudget: ver.totalBudget,
      taxes: ver.taxes,
      grandTotal: ver.grandTotal,
      lastUpdate: new Date().toLocaleString()
    };

    setProposals((prev) => prev.map((p) => (p.id === proposal.id ? restoredProposal : p)));
  };

  // Microsoft Graph Outlook Dispatcher trigger
  const handleOpenSendPanel = (proposal: Proposal) => {
    setSendingProposal(proposal);
    setEmailTo(proposal.contactEmail || "customer@domain.com");
    setEmailCC("office@gembapartner.com");
    setEmailBCC("");
    setEmailSubject(`Commercial Offer: Gemba Partner [Ref: ${proposal.proposalNumber}]`);
    setEmailBody("<p>Dear Customer,</p><p>We are delighted to supply our custom consulting proposal for your plant optimization.</p>");
    setAttachPdf(true);
    setAttachWord(true);
    setAttachCustom([]);
    setCustomFileText("");
  };

  // Generate Email Body with Gemini API
  const handleGenerateGeminiEmail = async () => {
    if (!sendingProposal) return;
    setIsEmailGenerating(true);

    try {
      const response = await fetch("/api/gemini/generate-proposal-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: sendingProposal.companyName,
          contactPerson: sendingProposal.contactPerson,
          proposalSubject: sendingProposal.proposalSubject,
          selectedServices: sendingProposal.services,
          options: sendingProposal.options,
          currency: sendingProposal.currency,
          language: "TR" // Can expand
        })
      });

      if (!response.ok) throw new Error("Gemini B2B email generation route returned non-200 status.");
      
      const data = await response.json();
      if (data.success) {
        setEmailSubject(data.subject || emailSubject);
        setEmailBody(data.body || emailBody);
      }
    } catch (err: any) {
      console.error(err);
      alert("Error call to Gemini API: " + err.message);
    } finally {
      setIsEmailGenerating(false);
    }
  };

  const handleAddCustomFile = () => {
    if (customFileText.trim()) {
      setAttachCustom([...attachCustom, customFileText.trim()]);
      setCustomFileText("");
    }
  };

  // Dispatch email logic
  const handleDispatchEmail = async () => {
    if (!sendingProposal) return;

    try {
      // 1. Simulating sending Outlook integration
      console.log(`Sending email via Outlook/Exchange to ${emailTo}...`);

      // 2. Automatically sync and push corresponding Deal to 'Proposal Submitted' stage!
      const deals = CrmDb.getDeals();
      if (deals.length > 0) {
        const targetIdx = deals.findIndex(
          (d) => String(d.companyName).toLowerCase().includes(sendingProposal.companyName.toLowerCase()) ||
                 String(sendingProposal.companyName).toLowerCase().includes(String(d.companyName).toLowerCase())
        );

        const timestampStr = new Date().toLocaleString();
        if (targetIdx !== -1) {
          const emailRecord = {
            id: `email-${Date.now()}`,
            sender: "Gemba Partner Advisor (GP)",
            recipient: emailTo,
            date: timestampStr,
            subject: emailSubject,
            body: emailBody.replace(/<[^>]*>/g, ""), // clean html tags
            attachments: [
              ...(attachPdf ? [`Proposal_${sendingProposal.proposalNumber}_${sendingProposal.currentVersion}.pdf`] : []),
              ...(attachWord ? [`Proposal_${sendingProposal.proposalNumber}_${sendingProposal.currentVersion}.docx`] : []),
              ...attachCustom
            ]
          };

          const updatedDeals = [...deals];
          updatedDeals[targetIdx] = {
            ...updatedDeals[targetIdx],
            stage: "Proposal Submitted",
            dealEmails: [...(updatedDeals[targetIdx].dealEmails || []), emailRecord],
          };
          CrmDb.saveDeals(updatedDeals);
          console.log("Successfully moved linked CRM Deal object to 'Proposal Submitted' stage.");
        }
      }

      // 3. Update active proposal status to 'Sent'
      setProposals((prev) =>
        prev.map((p) => (p.id === sendingProposal.id ? { ...p, status: "Sent", lastUpdate: new Date().toLocaleString() } : p))
      );

      alert(`B2B Offer dispatch and CRM synchronization completed! Corresponding CRM Deal is now moved to the Proposal Submitted stage.`);
      setSendingProposal(null);
    } catch (error: any) {
      alert("Error dispatching Outlook message: " + error.message);
    }
  };

  // AI Strategic Advisor Analysis with Gemini
  const handleRunAiAnalysis = async (proposal: Proposal) => {
    setAnalyzingProposal(proposal);
    setAiAnalysisResult(null);
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/gemini/analyze-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: proposal.companyName,
          proposalSubject: proposal.proposalSubject,
          description: proposal.description,
          selectedServices: proposal.services,
          options: proposal.options,
          currency: proposal.currency
        })
      });

      if (!response.ok) throw new Error("Gemini Proposal Analyzer returned error.");

      const data = await response.json();
      if (data.success) {
        setAiAnalysisResult(data.analysis);
      }
    } catch (err: any) {
      console.error(err);
      alert("AI Analysis call failed: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Download Word doc simulated
  const handleDownloadWordDoc = (proposal: Proposal) => {
    let serviceText = (proposal.services || []).map((s) => `<li><strong>${s}</strong></li>`).join("");
    
    let optionsText = "";
    Object.entries(proposal.options).forEach(([key, opt]) => {
      const budget = opt.manDays * opt.dailyRate + opt.expenses;
      optionsText += `
        <tr>
          <td><strong>${key}</strong></td>
          <td>${opt.training ? "✓" : "-"} Training, ${opt.consulting ? "✓" : "-"} Consulting, ${opt.workshop ? "✓ text" : "-"} Workshop</td>
          <td>${opt.manDays} Days</td>
          <td>${proposal.currency} ${opt.dailyRate} /day</td>
          <td>${proposal.currency} ${opt.expenses}</td>
          <td><strong>${proposal.currency} ${budget.toLocaleString()}</strong></td>
        </tr>
      `;
    });

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${proposal.proposalSubject}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; line-height: 1.5; color: #1e293b; }
          h1 { color: #16a34a; font-size: 24pt; border-bottom: 2px solid #16a34a; padding-bottom: 5px; }
          h2 { color: #0f172a; font-size: 16pt; margin-top: 25px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 10pt; }
          th { background-color: #f8fafc; font-weight: bold; }
          .footer { margin-top: 50px; border-top: 1px dotted #cbd5e1; padding-top: 10px; font-size: 9pt; color: #64748b; }
          p, li { font-size: 10pt; }
        </style>
      </head>
      <body>
        ${proposal.coverImage ? `
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${proposal.coverImage}" style="max-width: 100%; max-height: 250px; object-fit: contain; margin: 0 auto;" />
        </div>
        ` : `
        <div style="text-align: center; margin-bottom: 40px;">
          <h3 style="color:#64748b; font-weight:bold; letter-spacing:2px; font-size:12pt; margin:0;">GEMBA PARTNER</h3>
          <p style="font-size:9pt; color:#94a3b8; font-style:italic; margin:4px 0 0 0;">Continuous Improvement &amp; Operational Excellence Consultancy</p>
        </div>
        `}

        ${proposal.pageImage ? `
        <div style="text-align: right; margin-bottom: 15px;">
          <img src="${proposal.pageImage}" style="max-height: 45px; object-fit: contain;" />
        </div>
        ` : ""}

        <h1>B2B CONSULTING PROPOSAL</h1>
        <p><strong>Proposal Ref:</strong> PROP-${proposal.proposalNumber}</p>
        <p><strong>Offer Date:</strong> ${proposal.date}</p>
        <p><strong>Prepared for:</strong> ${proposal.companyName}</p>
        <p><strong>Target Contact:</strong> ${proposal.contactPerson} (${proposal.contactEmail || "N/A"})</p>
        <p><strong>Consultancy Partner:</strong> ${proposal.owner}</p>

        ${proposal.coverPage ? `
        <div style="margin-top: 25px; margin-bottom: 25px; padding: 15px; background-color: #f1f5f9; border-left: 4px solid #16a34a;">
          <h3 style="margin: 0; color: #0f172a; font-size: 13pt;">${proposal.coverPage}</h3>
        </div>
        ` : ""}

        <h2>1. Executive Summary &amp; Continuous Goals</h2>
        <p>${proposal.description || "A custom corporate intervention designed to isolate bottlenecks and stabilize visual management boards."}</p>

        ${proposal.methodology ? `
        <h2>2. Lean Methodology &amp; Structural Approach</h2>
        <div style="font-size: 10pt; line-height: 1.6;">${proposal.methodology}</div>
        ` : ""}

        ${proposal.projectPlan ? `
        <h2>3. Phase-by-Phase Project Plan</h2>
        <div style="font-size: 10pt; line-height: 1.6;">${proposal.projectPlan}</div>
        ` : ""}

        ${proposal.timeline ? `
        <h2>4. Timeline &amp; Sprints Milestones</h2>
        <div style="font-size: 10pt; line-height: 1.6;">${proposal.timeline}</div>
        ` : ""}

        <h2>5. Services Scope Included</h2>
        <ul>${serviceText}</ul>

        <h2>6. Option Packages and Detailed Budgets</h2>
        <table>
          <thead>
            <tr>
              <th>Package Selection</th>
              <th>Pillars Associated</th>
              <th>Man-Days</th>
              <th>Daily Rate</th>
              <th>Expenses Allowance</th>
              <th>Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            ${optionsText}
          </tbody>
        </table>

        <div style="margin-top: 25px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <p><strong>Subtotal Value:</strong> ${proposal.currency} ${proposal.totalBudget.toLocaleString()}</p>
          <p><strong>Official VAT (20%):</strong> ${proposal.currency} ${proposal.taxes.toLocaleString()}</p>
          <h3 style="color:#16a34a; margin: 10px 0 0 0;">GRAND TOTAL QUOTED BUDGET: ${proposal.currency} ${proposal.grandTotal.toLocaleString()}</h3>
        </div>

        ${proposal.terms ? `
        <h2>7. Terms, Conditions &amp; Scope Protections</h2>
        <div style="font-size: 10pt; line-height: 1.6;">${proposal.terms}</div>
        ` : ""}

        <h2>8. Authorization &amp; Signatures</h2>
        <p>By signing below, Both Parties agree to the technical terms, payment schedules, and timeline milestone charts defined in this baseline.</p>
        <table style="border:none; margin-top: 30px;">
          <tr style="border:none;">
            <td style="border:none; width:50%;">
              <p>Prepared by:</p>
              <br><br><br>
              <p>_________________________<br><strong>Gemba Partner Advisor</strong></p>
            </td>
            <td style="border:none; width:50%;">
              <p>Accepted by client:</p>
              <br><br><br>
              <p>_________________________<br><strong>${proposal.companyName} Representative</strong></p>
            </td>
          </tr>
        </table>

        <div class="footer">
          <p>Confidential proposal. Handled electronically. Valid for 30 calendar days from date stamp.</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Proposal_PROP_${proposal.proposalNumber}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Calculations for summary boxes, separated by currency!
  const sumForCurrency = (curr: string, statusFilter?: string | string[]) => {
    return proposals
      .filter((p) => {
        if (p.currency !== curr) return false;
        if (statusFilter) {
          if (Array.isArray(statusFilter)) {
            return statusFilter.includes(p.status);
          }
          return p.status === statusFilter;
        }
        return true;
      })
      .reduce((sum, p) => sum + p.grandTotal, 0);
  };

  // Helper to translate status labels
  const getStatusLabel = (status: string, lang: string) => {
    if (lang !== "TR") return status;
    switch (status) {
      case "Draft": return "Taslak";
      case "Sent": return "Gönderildi (Onay Bekleyen)";
      case "Under Evaluation": return "Değerlendirmede";
      case "Revision Requested": return "Revizyon İstendi";
      case "Accepted": return "Kazanıldı (Kabul Edildi)";
      case "Rejected": return "Kaybedildi (Reddedildi)";
      case "Cancelled": return "İptal Edildi";
      default: return status;
    }
  };

  const handleOpenOpportunityInDealView = (companyName: string) => {
    // 1. Dispatch custom event "change-tab" to go to deal-pipeline tab
    window.dispatchEvent(new CustomEvent("change-tab", { detail: "deal-pipeline" }));
    // 2. Delay slightly so DealManagementView mounts and receives the event, then open the drawer in read-only mode!
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-opportunity-drawer", { 
        detail: { companyName, readOnly: true } 
      }));
    }, 150);
  };

  // Master filters list matcher
  const filteredProposals = proposals.filter((p) => {
    if (searchSubject && !p.proposalSubject.toLowerCase().includes(searchSubject.toLowerCase())) return false;
    if (filterCompany && p.companyId !== filterCompany) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterOwner && !p.owner.toLowerCase().includes(filterOwner.toLowerCase())) return false;
    if (filterCurrency && p.currency !== filterCurrency) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">

      {/* Title & Banner */}
      <div className="bg-white dark:bg-[#1b1a19] p-5 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-zinc-150">
            {lang === "TR" ? "Teklif Yönetimi" : "Proposal Management"}
          </h2>
          <p className="text-xs text-slate-450 dark:text-zinc-400 mt-1">
            {lang === "TR"
              ? "CRM fırsatlarıyla senkronize edilmiş kurumsal B2B teklifleri oluşturun, revize edin, denetleyin ve gönderin"
              : "Establish, revise, audit, and dispatch executive B2B quotes synced to CRM opportunities"}
          </p>
        </div>
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("change-tab", { detail: "create-proposal" }));
          }}
          className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm hover:shadow active:scale-[0.98] transition-all text-xs cursor-pointer animate-pulse"
        >
          <Plus className="w-4 h-4" /> {lang === "TR" ? "Teklif Oluştur" : "Create Proposal"}
        </button>
      </div>

      {/* KPI Cards above - exactly 4 cards: Verilen, Onay Bekleyen, Kazanılan, Kaybedilen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Proposal Amount (Verilen Tekliflerin Toplamı) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 p-4 rounded-xl shadow-xs space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-450 dark:text-zinc-550 font-extrabold block">
            {lang === "TR" ? "VERİLEN TEKLİFLER TOPLAMI" : "TOTAL PROPOSALS VALUE"}
          </span>
          <div className="font-mono text-lg font-black text-slate-800 dark:text-zinc-200">
            {getSystemCurrency().symbol} {sumForCurrency(getSystemCurrency().symbol).toLocaleString()}
          </div>
        </div>

        {/* KPI 2: Pending Approval (Onay Bekleyen Tekliflerin Toplamı) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 p-4 rounded-xl shadow-xs space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-amber-600 font-extrabold block">
            {lang === "TR" ? "ONAY BEKLEYEN TEKLİFLER TOPLAMI" : "PENDING APPROVAL VALUE"}
          </span>
          <div className="font-mono text-lg font-black text-amber-600 dark:text-amber-450">
            {getSystemCurrency().symbol} {sumForCurrency(getSystemCurrency().symbol, ["Sent", "Under Evaluation", "Revision Requested", "Draft"]).toLocaleString()}
          </div>
        </div>

        {/* KPI 3: Won Proposals (Kazanılan Tekliflerin Toplamı) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 p-4 rounded-xl shadow-xs space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-green-750 font-extrabold block">
            {lang === "TR" ? "KAZANILAN TEKLİFLER TOPLAMI" : "WON PROPOSALS VALUE"}
          </span>
          <div className="font-mono text-lg font-black text-green-600 dark:text-green-400">
            {getSystemCurrency().symbol} {sumForCurrency(getSystemCurrency().symbol, "Accepted").toLocaleString()}
          </div>
        </div>

        {/* KPI 4: Lost Proposals (Kaybedilen Tekliflerin Toplamı) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 p-4 rounded-xl shadow-xs space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-red-600 font-extrabold block">
            {lang === "TR" ? "KAYBEDİLEN TEKLİFLER TOPLAMI" : "LOST PROPOSALS VALUE"}
          </span>
          <div className="font-mono text-lg font-black text-red-600 dark:text-red-400">
            {getSystemCurrency().symbol} {sumForCurrency(getSystemCurrency().symbol, "Rejected").toLocaleString()}
          </div>
        </div>

      </div>

      {/* Interactive Filters Bar */}
      <div className="bg-white dark:bg-[#151413] p-4 rounded-xl border border-slate-150 dark:border-zinc-800 space-y-3 shadow-xs">
        {/* Top Row: Search and Toggle Icon Button */}
        <div className="flex flex-wrap gap-3 items-center justify-between text-xs">
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 border border-slate-100 dark:border-zinc-700 w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              className="bg-transparent border-none outline-none w-full text-xs text-slate-700 dark:text-zinc-200"
              placeholder={lang === "TR" ? "Teklif konusu veya başlığında ara..." : "Search core proposal subject..."}
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
            />
          </div>

          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer select-none shadow-xs active:scale-95 ${
              isFilterPanelOpen
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-750 dark:text-emerald-400"
                : "bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
            }`}
            title={lang === "TR" ? "Detaylı arama filtrelerini göster/gizle" : "Toggle interactive filter panel"}
          >
            <Filter className={`w-4 h-4 ${isFilterPanelOpen ? "text-emerald-500 rotate-12" : "text-slate-400"}`} />
            <span>{lang === "TR" ? `Filtre Panelini ${isFilterPanelOpen ? "Kapat" : "Aç"}` : `${isFilterPanelOpen ? "Hide" : "Show"} Filter Panel`}</span>
            {(filterCompany || filterStatus || filterCurrency || filterOwner) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block animate-ping" />
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-205 ${isFilterPanelOpen ? "rotate-180 text-emerald-500" : ""}`} />
          </button>
        </div>

        {/* Collapsible Filter Panel */}
        {isFilterPanelOpen && (
          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in duration-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 select-none">
                {lang === "TR" ? "Firma / Şirket" : "Company"}
              </label>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="w-full p-2 border border-slate-150 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg outline-none text-slate-700 dark:text-zinc-200"
              >
                <option value="">{lang === "TR" ? "-- Tüm Firmalar --" : "-- All Companies --"}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c as any).companyName || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 select-none">
                {lang === "TR" ? "Durum / Aşama" : "Status"}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 border border-slate-150 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg outline-none font-medium text-slate-700 dark:text-zinc-200"
              >
                <option value="">{lang === "TR" ? "-- Tüm Durumlar --" : "-- All Statuses --"}</option>
                <option value="Draft">{lang === "TR" ? "Taslak (Draft)" : "Draft"}</option>
                <option value="Sent">{lang === "TR" ? "Gönderildi (Sent)" : "Sent"}</option>
                <option value="Revision Requested">{lang === "TR" ? "Revizyon İstendi" : "Revision Requested"}</option>
                <option value="Accepted">{lang === "TR" ? "Kabul Edildi / Kazanıldı" : "Accepted"}</option>
                <option value="Rejected">{lang === "TR" ? "Reddedildi / Kaybedildi" : "Rejected"}</option>
                <option value="Cancelled">{lang === "TR" ? "İptal Edildi" : "Cancelled"}</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-widest mb-1 select-none">
                {lang === "TR" ? "Para Birimi" : "Currency"}
              </label>
              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
                className="w-full p-2 border border-slate-150 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg outline-none font-bold text-slate-700 dark:text-zinc-200"
              >
                <option value="">{lang === "TR" ? "-- Tüm Para Birimleri --" : "-- All Currencies --"}</option>
                <option value="₺">₺ TRY</option>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-widest mb-1 select-none">
                {lang === "TR" ? "Sorumlu Temsilci" : "Owner"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={lang === "TR" ? "Sorumlu ara..." : "Search owner..."}
                  className="w-full p-2 border border-slate-150 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg outline-none text-slate-700 dark:text-zinc-200"
                  value={filterOwner}
                  onChange={(e) => setFilterOwner(e.target.value)}
                />
                <button
                  onClick={() => {
                    setSearchSubject("");
                    setFilterCompany("");
                    setFilterStatus("");
                    setFilterOwner("");
                    setFilterCurrency("");
                  }}
                  className="px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/60 dark:text-rose-400 rounded-lg font-bold cursor-pointer select-none whitespace-nowrap"
                  title={lang === "TR" ? "Tüm Filtreleri Sıfırla" : "Reset Filters"}
                >
                  {lang === "TR" ? "Sıfırla" : "Reset"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Left side Table / Right side AI Flyout layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Table Container */}
        <div className="bg-white dark:bg-[#151413] w-full border border-slate-150 dark:border-zinc-800/80 rounded-xl shadow-xs overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-black/15 text-slate-450 uppercase font-mono tracking-wider border-b border-slate-150 dark:border-zinc-800 text-[9px] font-extrabold">
                <th className="p-3 text-center">{lang === "TR" ? "Sıra" : "Seq"}</th>
                <th className="p-3">{lang === "TR" ? "Referans Kodu" : "Ref Code"}</th>
                <th className="p-3">{lang === "TR" ? "Firma / Şirket" : "Company"}</th>
                <th className="p-3">{lang === "TR" ? "Teklif Konusu / Başlık" : "Proposal Subject"}</th>
                <th className="p-3">{lang === "TR" ? "Sorumlu / Oluşturan" : "Owner / Creator"}</th>
                <th className="p-3 text-center">{lang === "TR" ? "Durum" : "Status"}</th>
                <th className="p-3 text-center">{lang === "TR" ? "Sürüm" : "Version"}</th>
                <th className="p-3 text-right">{lang === "TR" ? "Teklif Tutarı" : "Offer Amount"}</th>
                <th className="p-3 text-center">{lang === "TR" ? "Aksiyonlar" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 italic">
                    {lang === "TR" 
                      ? "Kriterlere uygun teklif bulunamadı. '+ Teklif Oluştur' butonuna tıklayarak yeni bir teklif oluşturabilirsiniz!"
                      : "No proposals logged matching the criteria. Establish one clicking '+ Create Proposal' !"}
                  </td>
                </tr>
              ) : (
                filteredProposals.map((p) => (
                  <tr 
                    key={p.id} 
                    onClick={() => setSelectedProposalForDetail(p)}
                    className="border-b border-slate-100 dark:border-zinc-800/85 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-all font-medium cursor-pointer"
                    title={lang === "TR" ? "Teklif özet ve PDF belgesini görüntülemek için tıklayın" : "Click to view proposal summary and PDF file"}
                  >
                    <td className="p-3 text-center font-mono text-slate-400 text-[10px]">{p.sequenceNo}</td>
                    <td className="p-3 font-mono font-bold text-slate-700 dark:text-zinc-300">{p.proposalNumber}</td>
                    <td className="p-3">
                      <div 
                        onClick={(e) => handleCompanyClick(e, p.companyName, p.companyId)}
                        className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                        title={lang === "TR" ? "Şirket detayını görüntülemek için tıklayın" : "Click to view Company details"}
                      >
                        <Building className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-650 shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-zinc-150 group-hover:underline">{p.companyName}</span>
                      </div>
                    </td>
                    <td className="p-3 max-w-sm truncate text-slate-650 dark:text-zinc-300" title={p.proposalSubject}>
                      {p.proposalSubject}
                    </td>
                    <td className="p-3">
                      <div className="text-[10px] text-slate-500">{lang === "TR" ? "Sorumlu" : "Owner"}: {p.owner}</div>
                      <div className="text-[8px] text-slate-400 font-mono">{lang === "TR" ? "Yazan" : "By"}: {p.createdBy}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        p.status === "Accepted"
                          ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400"
                          : p.status === "Rejected"
                          ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                          : p.status === "Sent"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                          : p.status === "Revision Requested"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-955/40 dark:text-amber-400"
                          : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                        {getStatusLabel(p.status, lang)}
                      </span>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-mono bg-slate-100 dark:bg-zinc-800 p-0.5 px-2 rounded-md font-bold text-slate-600 dark:text-zinc-400">
                          {p.currentVersion}
                        </span>
                        {p.versions && p.versions.length > 1 && (
                          <select
                            onChange={(e) => handleSwitchPreviewVersion(p, e.target.value)}
                            value={p.currentVersion}
                            className="bg-transparent border border-slate-200 dark:border-zinc-700 text-[10px] rounded outline-none p-0.5 cursor-pointer"
                          >
                            {p.versions.map((v) => (
                              <option key={v.version} value={v.version}>
                                {v.version}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-800 dark:text-zinc-100">
                      {p.currency} {p.grandTotal.toLocaleString()}
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        
                        {/* Edit Opportunity Button */}
                        <button
                          onClick={() => handleEditProposal(p)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-650 dark:text-zinc-400 rounded cursor-pointer"
                          title={lang === "TR" ? "Teklif Detaylarını Düzenle" : "Edit Opportunity & Proposal Details"}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
 
                        {/* Clone Revision Button */}
                        <button
                          onClick={() => handleOpenRevisionModal(p)}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-600 dark:hover:bg-green-955/20 rounded cursor-pointer"
                          title={lang === "TR" ? "Revizyon Sürümü Oluştur (V2, V3 vb.)" : "Clone & create new revision (V2, V3 etc.)"}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
 
                        {/* Sparkles / Gemini Advisor Trigger */}
                        <button
                          onClick={() => handleRunAiAnalysis(p)}
                          className="p-1.5 hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-white text-orange-600 dark:hover:bg-amber-955 rounded cursor-pointer"
                          title={lang === "TR" ? "Gemini Akıllı Satış ve Risk Stratejisi Değerlendirmesi Yap" : "Run Gemini Sales & Strategy Risk Assessment"}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
 
                        {/* Dispatch Outlook Panel Button */}
                        <button
                          onClick={() => handleOpenSendPanel(p)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-955/35 rounded cursor-pointer"
                          title={lang === "TR" ? "E-posta Taslağı Hazırla ve Müşteriye Gönder" : "Draft proposal presentation email & sync with Outlook"}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
 
                        {/* Download Word Doc */}
                        <button
                          onClick={() => handleDownloadWordDoc(p)}
                          className="p-1.5 hover:bg-amber-50 text-amber-700 dark:hover:bg-amber-955/20 rounded cursor-pointer"
                          title={lang === "TR" ? "Sözleşme / Teklif Şablonunu Word Olarak İndir" : "Download Word Document Proposal/Contract Template"}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
 
                        {/* Live document rendering Preview */}
                        <button
                          onClick={() => setViewingProposalDoc(p)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 rounded cursor-pointer"
                          title={lang === "TR" ? "Antetli Kağıt Şablon Önizlemesi" : "Live Letterhead Render Preview"}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
 
                        {/* Delete Proposal */}
                        <button
                          onClick={() => handleDeleteProposal(p.id)}
                          className="p-1.5 hover:bg-red-55/15 text-red-650 dark:hover:bg-red-955/20 rounded cursor-pointer"
                          title={lang === "TR" ? "Teklifi Sil" : "Delete Proposal"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
 
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* AI战略与跟进 Strategic Flyout Side Column */}
        {analyzingProposal && (
          <div className="bg-gradient-to-br from-zinc-900 to-black text-zinc-100 w-full lg:w-96 border border-zinc-800 p-5 rounded-2xl shadow-xl space-y-4 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="font-extrabold text-xs uppercase tracking-wider font-mono text-zinc-300">Gemba AI Proponent</span>
              </div>
              <button
                onClick={() => setAnalyzingProposal(null)}
                className="text-zinc-500 hover:text-white font-mono text-[10px] cursor-pointer"
              >
                CLOSE
              </button>
            </div>

            <div>
              <p className="text-[10px] text-zinc-550 font-bold uppercase font-mono">Evaluating Proposal:</p>
              <h4 className="text-sm font-bold text-zinc-200 truncate">{analyzingProposal.proposalSubject}</h4>
              <p className="text-[9px] font-mono text-emerald-450 block mt-0.5">Ref ID: {analyzingProposal.proposalNumber}</p>
            </div>

            {isAiLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-[10px] italic font-mono text-zinc-450">Gemini model crunching pricing &amp; scrap risk parameters...</p>
              </div>
            ) : aiAnalysisResult ? (
              <div className="space-y-4 text-xs">
                
                {/* Win Prop */}
                <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50 text-center">
                  <span className="text-[9px] text-zinc-450 uppercase block font-mono">Predictive B2B Win Probability</span>
                  <p className="text-3xl font-black text-amber-400 mt-1 font-mono">{aiAnalysisResult.winProbability || "75%"}</p>
                </div>

                {/* Risk Factors */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-zinc-450 uppercase font-mono tracking-wider font-bold block">🚨 Risk Indicators Detected</span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-300">
                    {(aiAnalysisResult.riskFactors || []).map((rk: string) => (
                      <li key={rk}>{rk}</li>
                    ))}
                  </ul>
                </div>

                {/* Missing Info */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-zinc-450 uppercase font-mono tracking-wider font-bold block">💡 Gaps / Missing metrics</span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-300">
                    {(aiAnalysisResult.missingInformation || []).map((ms: string) => (
                      <li key={ms}>{ms}</li>
                    ))}
                  </ul>
                </div>

                {/* Follow-up Strategy */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-1">
                  <span className="text-[9px] text-amber-450 uppercase font-mono font-extrabold block">Recommended follow-up track</span>
                  <p className="text-[11px] text-zinc-200 leading-relaxed">{aiAnalysisResult.recommendedFollowUp}</p>
                </div>

                {/* Next Action */}
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-450 uppercase font-mono block">Suggested Immediate Next Action</span>
                  <p className="font-bold text-emerald-400 text-[11px]">{aiAnalysisResult.suggestedNextAction}</p>
                </div>

                {/* Upsells */}
                <div className="pt-2 border-t border-zinc-800">
                  <span className="text-[9px] text-zinc-450 uppercase font-mono tracking-wider font-bold block mb-1">Additional Upsell Proposals</span>
                  <div className="flex flex-wrap gap-1">
                    {(aiAnalysisResult.potentialUpsell || []).map((up: string) => (
                      <span key={up} className="bg-zinc-800 text-zinc-300 text-[9px] px-2 py-0.5 rounded border border-zinc-700 font-mono">
                        {up}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <AlertTriangle className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-[10px] text-zinc-550 italic font-mono">Failed retrieving intelligence. Tap refresh below.</p>
                <button onClick={() => handleRunAiAnalysis(analyzingProposal)} className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] rounded">
                  Retry Call
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Main Creation & Editing Modal */}
      <ProposalFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProposal}
        initialProposal={editingProposal}
        companies={companies}
        onAddCompany={handleAddCompany}
      />

      {/* REVISION CREATION TEXT MODAL */}
      {revisingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-[#1f1d1c] max-w-md w-full rounded-xl border border-slate-100 p-5 space-y-4 text-xs animate-in zoom-in-95 duration-100">
            <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-150">Create Proposal Revision Clone</h3>
            <p className="text-slate-500 leading-relaxed">
              This action increments proposal count, logs the previous version inside history, and bumps state to <strong>Revision Requested</strong>.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] text-slate-400 font-bold font-mono uppercase">Reason for Revision (Mandatory) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Client requested daily rate discount"
                  value={revisionReasonText}
                  onChange={(e) => setRevisionReasonText(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded mt-1"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 font-bold font-mono uppercase">Trace Changes / Modifying Actions</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g., Option 1 daily rate cut from 1200 to 1000. Removed travel premium."
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded mt-1 resize-none h-18"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setRevisingProposal(null)} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleSaveRevision}
                disabled={!revisionReasonText.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-extrabold cursor-pointer transition-all disabled:opacity-50"
              >
                Clone &amp; Increment Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPILATION AND REVIEWS VIEW (Corporate Letterhead Presentation) */}
      {viewingProposalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 max-w-5xl w-full rounded-2xl overflow-hidden shadow-2xl border border-zinc-250 flex flex-col my-10 max-h-[90vh]">
            
            {/* Toolbar */}
            <div className="bg-slate-100 dark:bg-zinc-850 px-6 py-4 border-b flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-500 font-mono">B2B LETTERHEAD PREVIEW [Ref: PROP {viewingProposalDoc.proposalNumber}]</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadWordDoc(viewingProposalDoc)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 px-3 rounded font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Export Microsoft Word ID
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-black text-white p-1.5 px-3 rounded font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Eye className="w-3.5 h-3.5" /> Trigger PDF Print
                </button>
                <button onClick={() => setViewingProposalDoc(null)} className="p-1 px-2 hover:bg-slate-200 rounded text-slate-650 cursor-pointer">
                  Close
                </button>
              </div>
            </div>

            {/* Simulated letterhead viewport */}
            <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-950 font-serif">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 rounded-lg p-10 max-w-4xl mx-auto shadow space-y-6 text-sm text-slate-800 dark:text-zinc-200 leading-relaxed font-sans relative">
                
                {/* Custom Page Letterhead Header if present */}
                {viewingProposalDoc.pageImage && (
                  <div className="absolute top-4 right-4 max-h-12 overflow-hidden opacity-80">
                    <img src={viewingProposalDoc.pageImage} alt="page letterhead" referrerPolicy="no-referrer" className="h-10 object-contain" />
                  </div>
                )}

                {/* Cover Image or Standard Header */}
                {viewingProposalDoc.coverImage ? (
                  <div className="border-b pb-5 flex flex-col items-center justify-center gap-2">
                    <img src={viewingProposalDoc.coverImage} alt="cover letterhead" referrerPolicy="no-referrer" className="max-h-48 object-contain" />
                    <div className="text-center text-[10px] text-slate-450 font-mono mt-2">
                      <p>Date: {viewingProposalDoc.date} | Ref: PROP-{viewingProposalDoc.proposalNumber} | Status: {viewingProposalDoc.status}</p>
                    </div>
                  </div>
                ) : (
                  /* Header Logo */
                  <div className="border-b pb-5 flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-emerald-600 tracking-widest text-lg">GEMBA PARTNER</h3>
                      <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mt-0.5">Lean Operations &amp; Strategy Advisory Group</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-450 font-mono">
                      <p>Date: {viewingProposalDoc.date}</p>
                      <p>Ref: PROP-{viewingProposalDoc.proposalNumber}</p>
                      <p>Status: {viewingProposalDoc.status}</p>
                    </div>
                  </div>
                )}

                {/* Custom Headline / Cover Text */}
                {viewingProposalDoc.coverPage && (
                  <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-xl border-l-4 border-l-purple-600 text-center">
                    <h2 className="text-md font-extrabold text-purple-800 dark:text-purple-400 font-mono">
                      {viewingProposalDoc.coverPage}
                    </h2>
                  </div>
                )}

                {/* Cover Headline */}
                <div className="text-center py-4 space-y-1">
                  <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-zinc-100 uppercase font-mono">
                    {viewingProposalDoc.proposalSubject}
                  </h1>
                  <p className="text-[11px] text-slate-450 uppercase font-mono tracking-wider">
                    Prepared For: <strong>{viewingProposalDoc.companyName}</strong> | Attn: {viewingProposalDoc.contactPerson}
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2 border-l-4 border-l-emerald-500 pl-4 bg-slate-50 dark:bg-black/10 py-2">
                  <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">1. Opportunity Focus Statement</h4>
                  <p className="text-xs italic text-slate-600 dark:text-zinc-350">{viewingProposalDoc.description || "Field walkthrough on bottleneck areas."}</p>
                </div>

                {/* Methodology (Render HTML tables securely) */}
                {viewingProposalDoc.methodology && (
                  <div className="space-y-2">
                    <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">2. Lean Methodology &amp; Structural Approach</h4>
                    <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: viewingProposalDoc.methodology }} />
                  </div>
                )}

                {/* Project Plan (Render HTML tables securely) */}
                {viewingProposalDoc.projectPlan && (
                  <div className="space-y-2">
                    <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">3. Phase-by-Phase Project Plan</h4>
                    <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: viewingProposalDoc.projectPlan }} />
                  </div>
                )}

                {/* Timeline (Render HTML tables securely) */}
                {viewingProposalDoc.timeline && (
                  <div className="space-y-2">
                    <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">4. Timeline &amp; Sprints Milestones</h4>
                    <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: viewingProposalDoc.timeline }} />
                  </div>
                )}

                {/* Services Grid */}
                <div className="space-y-2">
                  <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">5. Services Involved</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(viewingProposalDoc.services || []).map((s) => (
                      <div key={s} className="bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300">
                        ✓ {s}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Options and budgets table */}
                <div className="space-y-3">
                  <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">6. Pricing Packages Options</h4>
                  <div className="overflow-x-auto w-full border border-slate-200 dark:border-zinc-800 rounded-xl">
                    <table className="w-full text-xs table-auto border-collapse min-w-[650px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-zinc-850 border-b text-[10px] font-mono text-slate-450 uppercase">
                          <th className="p-3 text-left font-bold">Selection</th>
                          <th className="p-3 text-right font-bold">Man-Days</th>
                          <th className="p-3 text-right font-bold">Daily Rate</th>
                          <th className="p-3 text-right font-bold">Expenses Allowance</th>
                          <th className="p-3 text-right font-bold">Option Est</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(viewingProposalDoc.options).map((key) => {
                          const opt = viewingProposalDoc.options[key];
                          const total = opt.manDays * opt.dailyRate + opt.expenses;
                          return (
                            <tr key={key} className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                              <td className="p-3 font-bold text-slate-800 dark:text-zinc-100">{key}</td>
                              <td className="p-3 text-right font-semibold text-slate-700 dark:text-zinc-300">{opt.manDays.toLocaleString()} Days</td>
                              <td className="p-3 text-right text-slate-700 dark:text-zinc-300">{viewingProposalDoc.currency} {opt.dailyRate.toLocaleString()}</td>
                              <td className="p-3 text-right text-slate-700 dark:text-zinc-300">{viewingProposalDoc.currency} {opt.expenses.toLocaleString()}</td>
                              <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">{viewingProposalDoc.currency} {total.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Calculations Card */}
                <div className="bg-emerald-50/30 dark:bg-[#111] p-4 rounded-xl border border-emerald-100 select-none text-right font-mono space-y-1">
                  <p className="text-xs text-slate-500">Proposal Net Subtotal: {viewingProposalDoc.currency} {viewingProposalDoc.totalBudget.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">VAT surcharge (20%): {viewingProposalDoc.currency} {viewingProposalDoc.taxes.toLocaleString()}</p>
                  <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    Grand Total Proposal Offer: {viewingProposalDoc.currency} {viewingProposalDoc.grandTotal.toLocaleString()}
                  </h4>
                </div>

                {/* Terms and Conditions */}
                {viewingProposalDoc.terms && (
                  <div className="space-y-2">
                    <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">7. Terms, Conditions &amp; Scope Protections</h4>
                    <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: viewingProposalDoc.terms }} />
                  </div>
                )}

                {/* Sign lines */}
                <div className="grid grid-cols-2 gap-4 pt-10 text-xs border-t">
                  <div className="space-y-4">
                    <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">8. Authorization &amp; Signatures</h4>
                    <p className="text-slate-400 font-mono text-[9px] uppercase">Advisor Authorization</p>
                    <div className="h-10 border-b border-dashed"></div>
                    <p><strong>Gemba Partner Officer</strong></p>
                  </div>
                  <div className="space-y-4 pt-[24px]">
                    <p className="text-slate-400 font-mono text-[9px] uppercase">Client Representative</p>
                    <div className="h-10 border-b border-dashed"></div>
                    <p><strong>{viewingProposalDoc.companyName} authorized representative</strong></p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* OUTLOOK EMAIL DISPATCH AND CRM SYNC DRAWER */}
      {sendingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl border border-slate-100 p-6 space-y-4 text-xs animate-in zoom-in-95 duration-100">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-1.5 text-blue-600">
                <Mail className="w-5 h-5 animate-bounce" />
                <span className="font-extrabold text-sm text-slate-800 dark:text-zinc-150">Microsoft Exchange Mail Dispatch Center</span>
              </div>
              <button onClick={() => setSendingProposal(null)} className="text-slate-450 hover:text-red-500 font-bold">
                CLOSE
              </button>
            </div>

            {/* Email Form fields */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-slate-450 font-bold font-mono uppercase">RECIPIENT TO *</label>
                  <input
                    type="email"
                    required
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded mt-1 outline-none font-medium"
                    placeholder="customer@domain.com"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-450 font-bold font-mono uppercase">CC</label>
                  <input
                    type="text"
                    value={emailCC}
                    onChange={(e) => setEmailCC(e.target.value)}
                    className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded mt-1 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-slate-450 font-bold font-mono uppercase">MESSAGE SUBJECT *</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded mt-1 outline-none font-bold"
                />
              </div>

              {/* Gemini Button container */}
              <div className="flex justify-between items-center bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-1.5 text-amber-600">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span className="font-bold text-[10px]">Gemini AI Email Architect (TR / EN)</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateGeminiEmail}
                  disabled={isEmailGenerating}
                  className="bg-amber-652 hover:bg-amber-600 text-amber-950 font-black text-[10px] px-3 py-1 rounded cursor-pointer transition-all disabled:opacity-50"
                >
                  {isEmailGenerating ? "Expanding script with model..." : "Generate Professional Outlining Body"}
                </button>
              </div>

              {/* Message body */}
              <div>
                <label className="block text-[9px] text-slate-455 font-bold font-mono uppercase">MESSAGE CONTENT BODY *</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={6}
                  className="w-full p-2.5 border border-slate-205 bg-white dark:bg-zinc-800 rounded mt-1 outline-none h-36 font-sans leading-relaxed text-slate-700 dark:text-zinc-200"
                />
              </div>

              {/* Attachment selector */}
              <div className="bg-slate-50 dark:bg-black/10 p-3 rounded-xl border border-slate-150 space-y-2">
                <span className="block text-[9px] text-slate-400 font-bold font-mono uppercase">Attachment Bindings</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachPdf}
                      onChange={(e) => setAttachPdf(e.target.checked)}
                      className="accent-blue-600"
                    />
                    Generated Proposal PDF (PROP-{sendingProposal.proposalNumber})
                  </label>
                  <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachWord}
                      onChange={(e) => setAttachWord(e.target.checked)}
                      className="accent-blue-600"
                    />
                    Microsoft Word Original Document (.docx)
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-dashed">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Attach custom additional filename..."
                    value={customFileText}
                    onChange={(e) => setCustomFileText(e.target.value)}
                    className="p-1 px-2 border border-slate-200 bg-white dark:bg-zinc-800 rounded text-[10px] outline-none"
                  />
                  <button type="button" onClick={handleAddCustomFile} className="bg-slate-200 hover:bg-slate-300 p-1 px-2 rounded font-bold cursor-pointer text-[10px]">
                    + Attach File
                  </button>
                </div>

                {attachCustom.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {attachCustom.map((fl) => (
                      <span key={fl} className="bg-zinc-205 px-2 py-0.5 rounded text-[8px] font-mono text-slate-500">
                        {fl}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button onClick={() => setSendingProposal(null)} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleDispatchEmail}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow"
              >
                <Mail className="w-3.5 h-3.5" /> Dispatch Mail &amp; Sync B2B Pipeline
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 9. CUSTOM PROPOSAL DELETE CONFIRMATION MODAL */}
      {deletingProposalId && (
        (() => {
          const propToDelete = proposals.find(p => p.id === deletingProposalId);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div className="bg-white dark:bg-[#151515] max-w-sm w-full rounded-xl border border-slate-205 dark:border-zinc-800 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-100">
                
                {/* Header info */}
                <div className="flex items-center gap-2 text-rose-600">
                  <div className="p-1.5 bg-rose-500/10 rounded-lg">
                    <Trash2 className="w-5 h-5 shrink-0" />
                  </div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider font-mono">
                    Teklifi Sil / Delete Proposal
                  </h3>
                </div>

                {/* Question & details */}
                <div className="space-y-2 text-left">
                  <p className="text-[11px] text-slate-650 dark:text-zinc-350 leading-relaxed font-semibold">
                    Geri dönüşüm kutusuna taşınsın mı?
                  </p>
                  {propToDelete && (
                    <div className="p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px] space-y-1">
                      <p className="font-extrabold text-slate-800 dark:text-zinc-200">
                        {propToDelete.companyName}
                      </p>
                      <p className="text-slate-500 dark:text-zinc-400">
                        {propToDelete.proposalSubject}
                      </p>
                      <p className="font-mono text-slate-400">
                        Kod: {propToDelete.proposalNumber} • Sürüm: {propToDelete.currentVersion}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setDeletingProposalId(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-bold rounded-lg cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg cursor-pointer shadow-sm active:scale-95 transition-transform"
                  >
                    Sil
                  </button>
                </div>

              </div>
            </div>
          );
        })()
      )}

      {/* 10. PROPOSAL SUMMARY & PDF FILE VIEWER PANEL */}
      {selectedProposalForDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-[#0e0d0c] w-full max-w-7xl h-full sm:h-[95vh] my-auto rounded-none sm:rounded-2xl border-l sm:border border-slate-205 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            
            {/* Header block */}
            <div className="bg-white dark:bg-[#151413] border-b border-slate-200 dark:border-zinc-800 p-4 px-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 p-1 px-2.5 rounded text-[10px] font-extrabold uppercase tracking-wider">
                    {selectedProposalForDetail.proposalNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                    selectedProposalForDetail.status === "Accepted"
                      ? "bg-green-100 text-green-800 dark:bg-green-950/45 dark:text-green-400"
                      : selectedProposalForDetail.status === "Rejected"
                      ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                      : selectedProposalForDetail.status === "Sent"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                      : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    {getStatusLabel(selectedProposalForDetail.status, lang)}
                  </span>
                </div>
                <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 mt-1.5 truncate max-w-lg">
                  {selectedProposalForDetail.proposalSubject}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadWordDoc(selectedProposalForDetail)}
                  className="bg-white hover:bg-slate-50 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 p-2 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 font-extrabold text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Word (.doc)</span>
                </button>
                {detailPdfUrl && (
                  <a
                    href={detailPdfUrl}
                    download={`PROP-${selectedProposalForDetail.proposalNumber}.pdf`}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 px-3.5 rounded-lg font-extrabold text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF (.pdf)</span>
                  </a>
                )}
                <button
                  onClick={() => setSelectedProposalForDetail(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Split Grid Content */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-100/50 dark:bg-[#0c0c0b]">
              
              {/* Left Column: Proposal Summary Information (5 cols) */}
              <div className="lg:col-span-5 h-full overflow-y-auto p-5 px-6 space-y-6 border-r border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#121110]">
                
                {/* 1. Client & Owner Details */}
                <div className="bg-slate-50/50 dark:bg-zinc-900/35 border border-slate-200/60 dark:border-zinc-800/60 p-4 rounded-xl space-y-3.5">
                  <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                    {lang === "TR" ? "Müşteri ve Sorumlu Bilgileri" : "Client & Owner Details"}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{lang === "TR" ? "Şirket / Firma" : "Company"}</span>
                      <p 
                        onClick={(e) => handleCompanyClick(e, selectedProposalForDetail.companyName, selectedProposalForDetail.companyId)}
                        className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                        title={lang === "TR" ? "Şirket detayını görüntülemek için tıklayın" : "Click to view Company details"}
                      >
                        <Building className="w-3 h-3 shrink-0" />
                        {selectedProposalForDetail.companyName}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{lang === "TR" ? "İrtibat Kişisi" : "Attention Contact"}</span>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        {selectedProposalForDetail.contactPerson}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{lang === "TR" ? "E-posta Adresi" : "Contact Email"}</span>
                      <p className="text-[11px] font-bold text-slate-655 dark:text-zinc-300 truncate flex items-center gap-1" title={selectedProposalForDetail.contactEmail}>
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        {selectedProposalForDetail.contactEmail || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{lang === "TR" ? "Teklif Tarihi" : "Offer Date"}</span>
                      <p className="text-[11px] font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {selectedProposalForDetail.date}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{lang === "TR" ? "Teklif Sorumlusu" : "Consulting Partner"}</span>
                      <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedProposalForDetail.owner}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{lang === "TR" ? "Aktif Sürüm" : "Active Version"}</span>
                      <p className="text-[11px] font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {selectedProposalForDetail.currentVersion}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Executive Focus Description */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                    {lang === "TR" ? "Hizmet Hedefleri ve Açıklama" : "Engagement Objectives & Focus"}
                  </h3>
                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-900/30 border border-slate-150 dark:border-zinc-800/80 rounded-xl">
                    <p className="text-[11px] text-slate-650 dark:text-zinc-350 leading-relaxed whitespace-pre-line">
                      {selectedProposalForDetail.description || (lang === "TR" ? "Bu işbirliği teklifi kapsamında hedeflenen sürekli iyileştirme çalışmaları ve kilit performans parametreleri." : "Continuous improvement parameters and operational alignment metrics.")}
                    </p>
                  </div>
                </div>

                {/* 3. Services checkboxes list */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                    {lang === "TR" ? "Kapsama Dahil Yalın Sütunlar" : "Included Lean Service Pillars"}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(selectedProposalForDetail.services || []).map((srv) => (
                      <div
                        key={srv}
                        className="flex items-center gap-2 p-2 bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/15 dark:border-emerald-500/10 rounded-lg"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-755 dark:text-zinc-250 truncate" title={srv}>
                          {srv}
                        </span>
                      </div>
                    ))}
                    {(!selectedProposalForDetail.services || selectedProposalForDetail.services.length === 0) && (
                      <p className="text-slate-400 italic text-[11px] col-span-2">
                        {lang === "TR" ? "Belirtilen hizmet kalemi yok." : "No explicit services indicated."}
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Pricing Option Packages */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                    {lang === "TR" ? "Bütçe ve Paket Teklifleri" : "Structured Pricing Options"}
                  </h3>
                  
                  <div className="space-y-2.5">
                    {Object.entries(selectedProposalForDetail.options || {}).map(([key, rawOpt]) => {
                      const opt = rawOpt as { manDays: number; dailyRate: number; expenses: number };
                      const totalCost = opt.manDays * opt.dailyRate + opt.expenses;
                      return (
                        <div
                          key={key}
                          className="p-3.5 bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1.5">
                            <span className="font-bold text-slate-800 dark:text-zinc-150 text-[11px]">{key}</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                              {selectedProposalForDetail.currency} {totalCost.toLocaleString()}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                            <div>
                              <span className="block text-[8px] text-slate-400 font-mono uppercase">{lang === "TR" ? "Efor" : "Days"}</span>
                              <span className="font-bold text-slate-750 dark:text-zinc-300">{opt.manDays} {lang === "TR" ? "Gün" : "Days"}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-400 font-mono uppercase">{lang === "TR" ? "Günlük Ücret" : "Daily Rate"}</span>
                              <span className="font-bold text-slate-750 dark:text-zinc-300">{selectedProposalForDetail.currency}{opt.dailyRate}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-400 font-mono uppercase">{lang === "TR" ? "Masraf" : "Expenses"}</span>
                              <span className="font-bold text-slate-750 dark:text-zinc-300">{selectedProposalForDetail.currency}{opt.expenses}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Calculations Summary */}
                <div className="bg-[#f8fafc] dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{lang === "TR" ? "Ara Toplam (Net)" : "Subtotal (Net)"}:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                      {selectedProposalForDetail.currency} {selectedProposalForDetail.totalBudget.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{lang === "TR" ? "KDV (%20)" : "VAT (20%)"}:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                      {selectedProposalForDetail.currency} {selectedProposalForDetail.taxes.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-slate-800 dark:text-zinc-150 pt-1.5 border-t border-slate-200 dark:border-zinc-800">
                    <span>{lang === "TR" ? "GENEL TOPLAM" : "GRAND TOTAL OFFER"}:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {selectedProposalForDetail.currency} {selectedProposalForDetail.grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 6. Version History Log */}
                {selectedProposalForDetail.versions && selectedProposalForDetail.versions.length > 1 && (
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                      {lang === "TR" ? "Revizyon ve Sürüm Geçmişi" : "Revision & Version Logs"}
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedProposalForDetail.versions.map((ver) => (
                        <div key={ver.version} className="p-2.5 bg-slate-50 dark:bg-zinc-900/30 border border-slate-150 dark:border-zinc-850 rounded-lg text-[10px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{ver.version}</span>
                            <span className="text-[8px] font-mono text-slate-400">{ver.date}</span>
                          </div>
                          <p className="text-slate-650 dark:text-zinc-300 font-medium">
                            <strong className="text-slate-500 dark:text-zinc-400">{lang === "TR" ? "Neden" : "Reason"}:</strong> {ver.reason}
                          </p>
                          {ver.notes && (
                            <p className="text-slate-500 dark:text-zinc-400 text-[9px] italic">
                              <strong className="text-slate-400 not-italic font-bold">{lang === "TR" ? "Notlar" : "Notes"}:</strong> {ver.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Actual PDF Document Render (7 cols) */}
              <div className="lg:col-span-7 h-full flex flex-col bg-slate-200/50 dark:bg-[#121211] p-4 sm:p-6 overflow-hidden">
                <div className="flex-1 bg-white dark:bg-[#1b1a19] rounded-xl border border-slate-250 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col relative">
                  
                  {/* Watermark Label */}
                  <div className="bg-slate-50 dark:bg-[#1a1918] p-2 px-4 border-b border-slate-200 dark:border-zinc-800 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                    <span>{lang === "TR" ? "RESMİ TEKLİF BELGESİ (PDF)" : "OFFICIAL PROPOSAL DOCUMENT (PDF)"}</span>
                    <span className="text-emerald-500 font-bold">● LIVE GENERATED</span>
                  </div>

                  {/* Frame renderer */}
                  {detailPdfUrl ? (
                    <iframe
                      src={detailPdfUrl}
                      className="w-full h-full border-none bg-[#525659] dark:bg-[#1f1e1d]"
                      title={`PROP-${selectedProposalForDetail.proposalNumber}`}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                      <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
                      <div className="space-y-1.5">
                        <p className="font-bold text-xs text-slate-700 dark:text-zinc-300">
                          {lang === "TR" ? "PDF Belgesi Hazırlanıyor..." : "Compiling Premium PDF File..."}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Generating corporate layout using vector coordinates...
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
