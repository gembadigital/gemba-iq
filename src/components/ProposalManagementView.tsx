import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { getSystemCurrency, formatSystemNumber } from "../lib/currencyHelper";
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
import { Proposal, ProposalVersion, ProposalOption, ProposalTemplate, ProposalTimelineEvent, ProposalAuditLog, ProposalApprovalStatus } from "../types/proposal";
import { PROPOSAL_PLACEHOLDERS } from "../lib/proposalPlaceholderEngine";
import ProposalFormModal from "./ProposalFormModal";
import { Company } from "./CompaniesView";
import { CrmDb } from "../lib/CrmDb";
import { generateProposalPdfBlobUrl, generateProposalPdfBlob } from "../lib/proposalPdf";
import { renderElementToPdfBase64, base64ToBlob } from "../lib/htmlToPdf";
import {
  createEnterpriseProposal,
  createProposalRevision,
  deleteEnterpriseProposal,
  listProposalTemplates,
  loadProposalEnterpriseMeta,
  renderProposalWordContent,
  saveProposalTemplate,
  deleteProposalTemplate,
  mapStatusToApproval,
  sendProposalEmail,
  setProposalApprovalStatus,
  storeProposalPdf,
  updateEnterpriseProposal,
} from "../lib/proposalService";

// Extracted from the "B2B Letterhead Preview" modal so the exact same
// styled A4 HTML/CSS document (the thing "Yazdır"/window.print() shows) can
// also be captured off-screen via html2canvas-pro for the "PDF İndir"
// download and the e-mail PDF attachment — instead of those two falling
// back to a completely separate, hand-drawn jsPDF renderer (proposalPdf.ts)
// that has no knowledge of the proposal's real content, letterhead colors,
// or uploaded cover/page images (root cause of "pdf görüntüsü yeşil başka
// bir şablon çıkıyor" and the image distortion complaints).
function ProposalLetterheadBody({
  doc,
  t,
  formatSystemNumber,
}: {
  doc: Proposal;
  t: (s: string) => string;
  formatSystemNumber: (n: number) => string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 rounded-lg p-10 max-w-4xl mx-auto shadow space-y-6 text-sm text-slate-800 dark:text-zinc-200 leading-relaxed font-sans relative">

      {/* Custom Page Letterhead Header if present */}
      {doc.pageImage && (
        <div className="absolute top-4 right-4 max-h-12 overflow-hidden opacity-80">
          <img src={doc.pageImage} alt="page letterhead" referrerPolicy="no-referrer" className="h-10 object-contain" />
        </div>
      )}

      {/* Cover Image or Standard Header */}
      {doc.coverImage ? (
        <div className="border-b pb-5 flex flex-col items-center justify-center gap-2">
          <img src={doc.coverImage} alt="cover letterhead" referrerPolicy="no-referrer" className="max-h-48 object-contain" />
          <div className="text-center text-[10px] text-slate-450 font-mono mt-2">
            <p>{t("Date:")} {doc.date} | {t("Ref:")} PROP-{doc.proposalNumber} | {t("Status:")} {doc.status}</p>
          </div>
        </div>
      ) : (
        /* Header Logo */
        <div className="border-b pb-5 flex justify-between items-start">
          <div>
            <h3 className="font-black text-emerald-600 tracking-widest text-lg">GEMBA PARTNER</h3>
            <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mt-0.5">{t("Lean Operations & Strategy Advisory Group")}</p>
          </div>
          <div className="text-right text-[10px] text-slate-450 font-mono">
            <p>{t("Date:")} {doc.date}</p>
            <p>{t("Ref:")} PROP-{doc.proposalNumber}</p>
            <p>{t("Status:")} {doc.status}</p>
          </div>
        </div>
      )}

      {/* Custom Headline / Cover Text */}
      {doc.coverPage && (
        <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-xl border-l-4 border-l-purple-600 text-center">
          <h2 className="text-md font-extrabold text-purple-800 dark:text-purple-400 font-mono">
            {doc.coverPage}
          </h2>
        </div>
      )}

      {/* Cover Headline */}
      <div className="text-center py-4 space-y-1">
        <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-zinc-100 uppercase font-mono">
          {doc.proposalSubject}
        </h1>
        <p className="text-[11px] text-slate-450 uppercase font-mono tracking-wider">
          {t("Prepared For:")} <strong>{doc.companyName}</strong> | {t("Attn:")} {doc.contactPerson}
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2 border-l-4 border-l-emerald-500 pl-4 bg-slate-50 dark:bg-black/10 py-2">
        <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("1. Opportunity Focus Statement")}</h4>
        <p className="text-xs italic text-slate-600 dark:text-zinc-350">{doc.description || t("Field walkthrough on bottleneck areas.")}</p>
      </div>

      {/* Methodology (Render HTML tables securely) */}
      {doc.methodology && (
        <div className="space-y-2">
          <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("2. Lean Methodology & Structural Approach")}</h4>
          <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: doc.methodology }} />
        </div>
      )}

      {/* Project Plan (Render HTML tables securely) */}
      {doc.projectPlan && (
        <div className="space-y-2">
          <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("3. Phase-by-Phase Project Plan")}</h4>
          <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: doc.projectPlan }} />
        </div>
      )}

      {/* Timeline (Render HTML tables securely) */}
      {doc.timeline && (
        <div className="space-y-2">
          <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("4. Timeline & Sprints Milestones")}</h4>
          <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: doc.timeline }} />
        </div>
      )}

      {/* Services Grid */}
      <div className="space-y-2">
        <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("5. Services Involved")}</h4>
        <div className="grid grid-cols-2 gap-2">
          {(doc.services || []).map((s) => (
            <div key={s} className="bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300">
              ✓ {s}
            </div>
          ))}
        </div>
      </div>

      {/* Options and budgets table */}
      <div className="space-y-3">
        <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("6. Pricing Packages Options")}</h4>
        <div className="overflow-x-auto w-full border border-slate-200 dark:border-zinc-800 rounded-xl">
          <table className="w-full text-xs table-auto border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-850 border-b text-[10px] font-mono text-slate-450 uppercase">
                <th className="p-3 text-left font-bold">{t("Selection")}</th>
                <th className="p-3 text-right font-bold">{t("Man-Days")}</th>
                <th className="p-3 text-right font-bold">{t("Daily Rate")}</th>
                <th className="p-3 text-right font-bold">{t("Expenses Allowance")}</th>
                <th className="p-3 text-right font-bold">{t("Option Est")}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(doc.options).map((key) => {
                const opt = doc.options[key];
                const total = opt.manDays * opt.dailyRate + opt.expenses;
                return (
                  <tr key={key} className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="p-3 font-bold text-slate-800 dark:text-zinc-100">{key}</td>
                    <td className="p-3 text-right font-semibold text-slate-700 dark:text-zinc-300">{formatSystemNumber(opt.manDays)} Days</td>
                    <td className="p-3 text-right text-slate-700 dark:text-zinc-300">{doc.currency} {formatSystemNumber(opt.dailyRate)}</td>
                    <td className="p-3 text-right text-slate-700 dark:text-zinc-300">{doc.currency} {formatSystemNumber(opt.expenses)}</td>
                    <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">{doc.currency} {formatSystemNumber(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculations Card */}
      <div className="bg-emerald-50/30 dark:bg-[#111] p-4 rounded-xl border border-emerald-100 select-none text-right font-mono space-y-1">
        <p className="text-xs text-slate-500">{t("Proposal Net Subtotal:")} {doc.currency} {formatSystemNumber(doc.totalBudget)}</p>
        <p className="text-xs text-slate-500">{t("VAT surcharge (20%):")} {doc.currency} {formatSystemNumber(doc.taxes)}</p>
        <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
          {t("Grand Total Proposal Offer:")} {doc.currency} {formatSystemNumber(doc.grandTotal)}
        </h4>
      </div>

      {/* Terms and Conditions */}
      {doc.terms && (
        <div className="space-y-2">
          <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("7. Terms, Conditions & Scope Protections")}</h4>
          <div className="text-xs text-slate-700 dark:text-zinc-300 border dark:border-zinc-800 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 overflow-x-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: doc.terms }} />
        </div>
      )}

      {/* Sign lines */}
      <div className="grid grid-cols-2 gap-4 pt-10 text-xs border-t">
        <div className="space-y-4">
          <h4 className="font-mono text-[10px] text-slate-450 uppercase font-bold tracking-wider">{t("8. Authorization & Signatures")}</h4>
          <p className="text-slate-400 font-mono text-[9px] uppercase">{t("Advisor Authorization")}</p>
          <div className="h-10 border-b border-dashed"></div>
          <p><strong>{t("Gemba Partner Officer")}</strong></p>
        </div>
        <div className="space-y-4 pt-[24px]">
          <p className="text-slate-400 font-mono text-[9px] uppercase">{t("Client Representative")}</p>
          <div className="h-10 border-b border-dashed"></div>
          <p><strong>{t("{company} authorized representative").replace("{company}", doc.companyName)}</strong></p>
        </div>
      </div>

    </div>
  );
}

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

  // Off-screen html2canvas-pro capture target — see ProposalLetterheadBody /
  // captureProposalPdf below.
  const [pdfCaptureProposal, setPdfCaptureProposal] = useState<Proposal | null>(null);
  const pdfCaptureRef = useRef<HTMLDivElement>(null);

  // Selected proposal for full detail & PDF view
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState<Proposal | null>(null);
  const [detailPdfUrl, setDetailPdfUrl] = useState<string>("");
  const [proposalTimeline, setProposalTimeline] = useState<ProposalTimelineEvent[]>([]);
  const [proposalAuditLog, setProposalAuditLog] = useState<ProposalAuditLog[]>([]);
  const [wordTemplates, setWordTemplates] = useState<ProposalTemplate[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);

  useEffect(() => {
    void listProposalTemplates().then(setWordTemplates).catch(console.error);
  }, []);

  useEffect(() => {
    let url = "";
    if (selectedProposalForDetail) {
      try {
        url = generateProposalPdfBlobUrl(selectedProposalForDetail, lang);
        setDetailPdfUrl(url);
        void storeProposalPdf(selectedProposalForDetail, lang);
        void loadProposalEnterpriseMeta(selectedProposalForDetail.id).then((meta) => {
          setProposalTimeline(meta.timeline);
          setProposalAuditLog(meta.auditLog);
        });
      } catch (err) {
        console.error("Failed to generate PDF Blob URL:", err);
        setDetailPdfUrl("");
      }
    } else {
      setDetailPdfUrl("");
      setProposalTimeline([]);
      setProposalAuditLog([]);
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
    // Bu sayfadaki `companies` local state'i, sayfa ilk açıldığındaki bir
    // anlık görüntü (snapshot) — arada başka bir ekrandan (Müşteriler,
    // Fırsat Panosu vb.) yeni şirket eklenmiş olabilir. Eskiden burada
    // sadece bu eski (stale) diziye ekleme yapılıyordu; birazdan çalışacak
    // `useEffect`, CrmDb.saveCompanies(companies) ile TÜM şirket listesinin
    // üzerine bu eski diziyi yazıyordu — yani aradaki yeni eklenen şirketler
    // sessizce kaybolabiliyordu. Artık CrmDb'nin GÜNCEL halinden başlanıyor.
    const fresh = CrmDb.getCompanies();
    setCompanies(fresh.some((c) => c.id === company.id) ? fresh : [...fresh, company]);
  };

  const handleOpenCreateModal = () => {
    setEditingProposal(null);
    setIsModalOpen(true);
  };

  const handleEditProposal = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setIsModalOpen(true);
  };

  const handleSaveProposal = async (proposalData: Proposal) => {
    try {
      if (editingProposal) {
        const updated = await updateEnterpriseProposal({ ...proposalData, id: editingProposal.id });
        setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createEnterpriseProposal(proposalData);
        setProposals((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : t("Failed to save quotation."));
    }
  };

  const handleDeleteProposal = (id: string) => {
    setDeletingProposalId(id);
  };

  const handleConfirmDelete = async () => {
    if (deletingProposalId) {
      try {
        await deleteEnterpriseProposal(deletingProposalId);
        setProposals((prev) => prev.filter((p) => p.id !== deletingProposalId));
      } catch (err) {
        console.error(err);
      }
      setDeletingProposalId(null);
    }
  };

  // Revision / Version Control Trigger
  const handleOpenRevisionModal = (proposal: Proposal) => {
    setRevisingProposal(proposal);
    setRevisionNotes("");
    setRevisionReasonText("");
  };

  const handleSaveRevision = async () => {
    if (!revisingProposal) return;
    try {
      const updated = await createProposalRevision(
        revisingProposal,
        revisionReasonText || "Client request clarification",
        revisionNotes || "Options list and rates updated."
      );
      setProposals((prev) => prev.map((p) => (p.id === revisingProposal.id ? updated : p)));
      setRevisingProposal(null);
      alert(t("Proposal cloned and bumped successfully to {version}").replace("{version}", updated.currentVersion));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : t("Failed to create revision."));
    }
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
      lastUpdate: new Date().toISOString()
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
      alert(t("Error call to Gemini API: {error}").replace("{error}", err.message));
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
  const [isDispatchingEmail, setIsDispatchingEmail] = useState(false);
  const handleDispatchEmail = async () => {
    if (!sendingProposal) return;
    setIsDispatchingEmail(true);

    try {
      // Item: "PDF ekle" was checked in this drawer but no real file was
      // ever attached — attachments were passed as plain filename strings
      // (no contentBytes), which sendProposalEmail() never even forwarded
      // to /api/mail/send, and which the Graph mail service's
      // normalizeAttachments() silently drops anyway (it filters out any
      // attachment without .contentBytes). Build a REAL PDF attachment
      // object here, matching the "Yazdır" letterhead document.
      const fileAttachments: Array<{ name: string; contentType: string; contentBytes: string }> = [];
      if (attachPdf) {
        const captured = await captureProposalPdf(sendingProposal).catch(() => null);
        if (captured) {
          fileAttachments.push({
            name: `Proposal_${sendingProposal.proposalNumber}_${sendingProposal.currentVersion}.pdf`,
            contentType: "application/pdf",
            contentBytes: captured.base64,
          });
        } else {
          alert(t("PDF could not be generated for attachment; sending without a PDF attached."));
        }
      }

      const updated = await sendProposalEmail(sendingProposal, {
        to: emailTo,
        cc: emailCC,
        bcc: emailBCC,
        subject: emailSubject,
        body: emailBody,
        attachments: fileAttachments,
        attachmentNotes: [
          ...(attachWord ? [`Proposal_${sendingProposal.proposalNumber}_${sendingProposal.currentVersion}.docx`] : []),
          ...attachCustom,
        ],
      });

      setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      alert(t("B2B Offer dispatch and CRM synchronization completed!"));
      setSendingProposal(null);
    } catch (error: unknown) {
      alert(t("Error dispatching Outlook message: {error}").replace("{error}", error instanceof Error ? error.message : t("Unknown error")));
    } finally {
      setIsDispatchingEmail(false);
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
      alert(t("AI Analysis call failed: {error}").replace("{error}", err.message));
    } finally {
      setIsAiLoading(false);
    }
  };

  // Download Word doc simulated
  const handleDownloadWordDoc = (proposal: Proposal) => {
    const template = wordTemplates.find((t) => t.id === proposal.wordTemplateId);
    const bodyContent = renderProposalWordContent(proposal, template?.content);
    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset="utf-8"><title>${proposal.proposalSubject}</title></head>
      <body>${bodyContent}</body>
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

  // Renders the given proposal into the hidden off-screen container above
  // and captures it with html2canvas-pro, producing a PDF that visually
  // matches the real "B2B Letterhead Preview" / "Yazd\u0131r" document (real
  // content, real letterhead colors, real uploaded cover/page images) \u2014
  // instead of the old jsPDF-drawn generateProposalPdfBlob(), which draws a
  // completely generic document with a hardcoded green accent color and no
  // awareness of uploaded templates at all.
  const captureProposalPdf = async (
    proposal: Proposal
  ): Promise<{ base64: string; blob: Blob; filename: string } | null> => {
    const filename = `Teklif_${proposal.proposalNumber}.pdf`;
    setPdfCaptureProposal(proposal);
    try {
      // Let React commit the render before we read the DOM. Two rAFs is
      // enough for layout + paint; the embedded images are base64 data URIs
      // so there's no network round-trip to wait for.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const el = pdfCaptureRef.current;
      if (!el) return null;
      const result = await renderElementToPdfBase64(el, filename);
      if (!result) return null;
      return { base64: result.base64, blob: base64ToBlob(result.base64, "application/pdf"), filename: result.filename };
    } catch (err) {
      console.error("captureProposalPdf failed:", err);
      return null;
    } finally {
      setPdfCaptureProposal(null);
    }
  };

  // Direct PDF download for a saved proposal \u2014 previously the list only
  // offered a Word (.doc) download; the user asked for PDF to be available
  // directly instead of Word where possible. Tries the real HTML/CSS
  // letterhead capture first (matches "Yazd\u0131r"); falls back to the old
  // jsPDF renderer only if that capture fails, so download never breaks.
  const handleDownloadPdf = async (proposal: Proposal) => {
    const captured = await captureProposalPdf(proposal).catch(() => null);
    const blob = captured?.blob || generateProposalPdfBlob(proposal, lang);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Teklif_${proposal.proposalNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSetApproval = async (
    proposal: Proposal,
    approvalStatus: ProposalApprovalStatus,
    notes?: string
  ) => {
    try {
      const updated = await setProposalApprovalStatus(proposal, approvalStatus, notes);
      setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (selectedProposalForDetail?.id === updated.id) {
        setSelectedProposalForDetail(updated);
        const meta = await loadProposalEnterpriseMeta(updated.id);
        setProposalTimeline(meta.timeline);
        setProposalAuditLog(meta.auditLog);
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : t("Failed to update approval status."));
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate?.name?.trim()) {
      alert(t("Template name is required."));
      return;
    }
    try {
      const saved = await saveProposalTemplate({
        id: editingTemplate.id,
        name: editingTemplate.name,
        description: editingTemplate.description,
        content: editingTemplate.content,
        templateType: "word",
        isDefault: editingTemplate.isDefault,
      });
      setWordTemplates((prev) => {
        const exists = prev.find((t) => t.id === saved.id);
        return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev];
      });
      setEditingTemplate(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : t("Failed to save template."));
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(t("Delete this Word template?"))) return;
    try {
      await deleteProposalTemplate(templateId);
      setWordTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : t("Failed to delete template."));
    }
  };

  const getApprovalStatusLabel = (proposal: Proposal) => {
    const status = proposal.approvalStatus || mapStatusToApproval(proposal.status);
    if (lang !== "TR") return status;
    switch (status) {
      case "Draft": return "Taslak";
      case "Sent": return "Gönderildi";
      case "Approved": return "Onaylandı";
      case "Rejected": return "Reddedildi";
      default: return status;
    }
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
            {t("Proposal Management")}
          </h2>
          <p className="text-xs text-slate-450 dark:text-zinc-400 mt-1">
            {t("Establish, revise, audit, and dispatch executive B2B quotes synced to CRM opportunities")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowTemplateManager(true);
              setEditingTemplate(null);
            }}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-extrabold px-4 py-2 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer border border-slate-200 dark:border-zinc-700"
          >
            <FileText className="w-4 h-4" /> {t("Word Templates")}
          </button>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("change-tab", { detail: "create-proposal" }));
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm hover:shadow active:scale-[0.98] transition-all text-xs cursor-pointer animate-pulse"
          >
            <Plus className="w-4 h-4" /> {t("Create Proposal")}
          </button>
        </div>
      </div>

      {/* KPI Cards above - exactly 4 cards: Verilen, Onay Bekleyen, Kazanılan, Kaybedilen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Proposal Amount (Verilen Tekliflerin Toplamı) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 p-4 rounded-xl shadow-xs space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-450 dark:text-zinc-550 font-extrabold block">
            {t("TOTAL PROPOSALS VALUE")}
          </span>
          <div className="font-mono text-lg font-black text-slate-800 dark:text-zinc-200">
            {getSystemCurrency().symbol} {formatSystemNumber(sumForCurrency(getSystemCurrency().symbol))}
          </div>
        </div>

        {/* KPI 2: Pending Approval (Onay Bekleyen Tekliflerin Toplamı) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 p-4 rounded-xl shadow-xs space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-amber-600 font-extrabold block">
            {t("PENDING APPROVAL VALUE")}
          </span>
          <div className="font-mono text-lg font-black text-amber-600 dark:text-amber-450">
            {getSystemCurrency().symbol} {formatSystemNumber(sumForCurrency(getSystemCurrency().symbol, ["Sent", "Under Evaluation", "Revision Requested", "Draft"]))}
          </div>
        </div>

        {/* KPI 3: Won Proposals (Kazanılan Tekliflerin Toplamı) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 p-4 rounded-xl shadow-xs space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-green-750 font-extrabold block">
            {t("WON PROPOSALS VALUE")}
          </span>
          <div className="font-mono text-lg font-black text-green-600 dark:text-green-400">
            {getSystemCurrency().symbol} {formatSystemNumber(sumForCurrency(getSystemCurrency().symbol, "Accepted"))}
          </div>
        </div>

        {/* KPI 4: Lost Proposals (Kaybedilen Tekliflerin Toplamı) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 p-4 rounded-xl shadow-xs space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-red-600 font-extrabold block">
            {t("LOST PROPOSALS VALUE")}
          </span>
          <div className="font-mono text-lg font-black text-red-600 dark:text-red-400">
            {getSystemCurrency().symbol} {formatSystemNumber(sumForCurrency(getSystemCurrency().symbol, "Rejected"))}
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
              placeholder={t("Search core proposal subject...")}
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
            title={t("Toggle interactive filter panel")}
          >
            <Filter className={`w-4 h-4 ${isFilterPanelOpen ? "text-emerald-500 rotate-12" : "text-slate-400"}`} />
            <span>{isFilterPanelOpen ? t("Hide Filter Panel") : t("Show Filter Panel")}</span>
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
                {t("Company")}
              </label>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="w-full p-2 border border-slate-150 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg outline-none text-slate-700 dark:text-zinc-200"
              >
                <option value="">{t("-- All Companies --")}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c as any).companyName || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 select-none">
                {t("Status")}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 border border-slate-150 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg outline-none font-medium text-slate-700 dark:text-zinc-200"
              >
                <option value="">{t("-- All Statuses --")}</option>
                <option value="Draft">{t("Draft")}</option>
                <option value="Sent">{t("Sent")}</option>
                <option value="Revision Requested">{t("Revision Requested")}</option>
                <option value="Accepted">{t("Accepted")}</option>
                <option value="Rejected">{t("Rejected")}</option>
                <option value="Cancelled">{t("Cancelled")}</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-widest mb-1 select-none">
                {t("Currency")}
              </label>
              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
                className="w-full p-2 border border-slate-150 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg outline-none font-bold text-slate-700 dark:text-zinc-200"
              >
                <option value="">{t("-- All Currencies --")}</option>
                <option value="₺">₺ TRY</option>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-widest mb-1 select-none">
                {t("Owner")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t("Search owner...")}
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
                  title={t("Reset Filters")}
                >
                  {t("Reset")}
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
                <th className="p-3 text-center">{t("Seq")}</th>
                <th className="p-3">{t("Ref Code")}</th>
                <th className="p-3 min-w-[220px]">{t("Company")}</th>
                <th className="p-3">{t("Proposal Subject")}</th>
                <th className="p-3">{t("Owner / Creator")}</th>
                <th className="p-3 text-center">{t("Status")}</th>
                <th className="p-3 text-center">{t("Version")}</th>
                <th className="p-3 text-right">{t("Offer Amount")}</th>
                <th className="p-3 text-center">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 italic">
                    {t("No proposals logged matching the criteria. Establish one clicking '+ Create Proposal' !")}
                  </td>
                </tr>
              ) : (
                filteredProposals.map((p) => (
                  <tr 
                    key={p.id} 
                    onClick={() => setSelectedProposalForDetail(p)}
                    className="border-b border-slate-100 dark:border-zinc-800/85 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-all font-medium cursor-pointer"
                    title={t("Click to view proposal summary and PDF file")}
                  >
                    <td className="p-3 text-center font-mono text-slate-400 text-[10px]">{p.sequenceNo}</td>
                    <td className="p-3 font-mono font-bold text-slate-700 dark:text-zinc-300">{p.proposalNumber}</td>
                    <td className="p-3 min-w-[220px]">
                      <div
                        onClick={(e) => handleCompanyClick(e, p.companyName, p.companyId)}
                        className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                        title={t("Click to view Company details")}
                      >
                        <Building className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-650 shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-zinc-150 group-hover:underline">{p.companyName}</span>
                      </div>
                    </td>
                    <td className="p-3 max-w-sm truncate text-slate-650 dark:text-zinc-300" title={p.proposalSubject}>
                      {p.proposalSubject}
                    </td>
                    <td className="p-3">
                      <div className="text-[10px] text-slate-500">{t("Owner")}: {p.owner}</div>
                      <div className="text-[8px] text-slate-400 font-mono">{t("By")}: {p.createdBy}</div>
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
                      {p.currency} {formatSystemNumber(p.grandTotal)}
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        
                        {/* Edit Opportunity Button */}
                        <button
                          onClick={() => handleEditProposal(p)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-650 dark:text-zinc-400 rounded cursor-pointer"
                          title={t("Edit Opportunity & Proposal Details")}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
 
                        {/* Clone Revision Button */}
                        <button
                          onClick={() => handleOpenRevisionModal(p)}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-600 dark:hover:bg-green-955/20 rounded cursor-pointer"
                          title={t("Clone & create new revision (V2, V3 etc.)")}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
 
                        {/* Sparkles / Gemini Advisor Trigger */}
                        <button
                          onClick={() => handleRunAiAnalysis(p)}
                          className="p-1.5 hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-white text-orange-600 dark:hover:bg-amber-955 rounded cursor-pointer"
                          title={t("Run Gemini Sales & Strategy Risk Assessment")}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
 
                        {/* Dispatch Outlook Panel Button */}
                        <button
                          onClick={() => handleOpenSendPanel(p)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-955/35 rounded cursor-pointer"
                          title={t("Draft proposal presentation email & sync with Outlook")}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
 
                        {/* Download PDF (primary format — user asked for PDF over Word where possible) */}
                        <button
                          onClick={() => handleDownloadPdf(p)}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-700 dark:hover:bg-emerald-955/20 rounded cursor-pointer"
                          title="Teklifi PDF olarak indir"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* Download Word Doc */}
                        <button
                          onClick={() => handleDownloadWordDoc(p)}
                          className="p-1.5 hover:bg-amber-50 text-amber-700 dark:hover:bg-amber-955/20 rounded cursor-pointer"
                          title={t("Download Word Document Proposal/Contract Template")}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Live document rendering Preview */}
                        <button
                          onClick={() => setViewingProposalDoc(p)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 rounded cursor-pointer"
                          title={t("Live Letterhead Render Preview")}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
 
                        {/* Delete Proposal */}
                        <button
                          onClick={() => handleDeleteProposal(p.id)}
                          className="p-1.5 hover:bg-red-55/15 text-red-650 dark:hover:bg-red-955/20 rounded cursor-pointer"
                          title={t("Delete Proposal")}
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
                <span className="font-extrabold text-xs uppercase tracking-wider font-mono text-zinc-300">{t("Gemba AI Proponent")}</span>
              </div>
              <button
                onClick={() => setAnalyzingProposal(null)}
                className="text-zinc-500 hover:text-white font-mono text-[10px] cursor-pointer"
              >
                {t("CLOSE")}
              </button>
            </div>

            <div>
              <p className="text-[10px] text-zinc-550 font-bold uppercase font-mono">{t("Evaluating Proposal:")}</p>
              <h4 className="text-sm font-bold text-zinc-200 truncate">{analyzingProposal.proposalSubject}</h4>
              <p className="text-[9px] font-mono text-emerald-450 block mt-0.5">{t("Ref ID:")} {analyzingProposal.proposalNumber}</p>
            </div>

            {isAiLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-[10px] italic font-mono text-zinc-450">{t("Gemini model crunching pricing & scrap risk parameters...")}</p>
              </div>
            ) : aiAnalysisResult ? (
              <div className="space-y-4 text-xs">
                
                {/* Win Prop */}
                <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50 text-center">
                  <span className="text-[9px] text-zinc-450 uppercase block font-mono">{t("Predictive B2B Win Probability")}</span>
                  <p className="text-3xl font-black text-amber-400 mt-1 font-mono">{aiAnalysisResult.winProbability || "75%"}</p>
                </div>

                {/* Risk Factors */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-zinc-450 uppercase font-mono tracking-wider font-bold block">{t("🚨 Risk Indicators Detected")}</span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-300">
                    {(aiAnalysisResult.riskFactors || []).map((rk: string) => (
                      <li key={rk}>{rk}</li>
                    ))}
                  </ul>
                </div>

                {/* Missing Info */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-zinc-450 uppercase font-mono tracking-wider font-bold block">{t("💡 Gaps / Missing metrics")}</span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-300">
                    {(aiAnalysisResult.missingInformation || []).map((ms: string) => (
                      <li key={ms}>{ms}</li>
                    ))}
                  </ul>
                </div>

                {/* Follow-up Strategy */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-1">
                  <span className="text-[9px] text-amber-450 uppercase font-mono font-extrabold block">{t("Recommended follow-up track")}</span>
                  <p className="text-[11px] text-zinc-200 leading-relaxed">{aiAnalysisResult.recommendedFollowUp}</p>
                </div>

                {/* Next Action */}
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-450 uppercase font-mono block">{t("Suggested Immediate Next Action")}</span>
                  <p className="font-bold text-emerald-400 text-[11px]">{aiAnalysisResult.suggestedNextAction}</p>
                </div>

                {/* Upsells */}
                <div className="pt-2 border-t border-zinc-800">
                  <span className="text-[9px] text-zinc-450 uppercase font-mono tracking-wider font-bold block mb-1">{t("Additional Upsell Proposals")}</span>
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
                <p className="text-[10px] text-zinc-550 italic font-mono">{t("Failed retrieving intelligence. Tap refresh below.")}</p>
                <button onClick={() => handleRunAiAnalysis(analyzingProposal)} className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] rounded">
                  {t("Retry Call")}
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
        wordTemplates={wordTemplates}
      />

      {/* REVISION CREATION TEXT MODAL */}
      {revisingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-[#1f1d1c] max-w-md w-full rounded-xl border border-slate-100 p-5 space-y-4 text-xs animate-in zoom-in-95 duration-100">
            <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-150">{t("Create Proposal Revision Clone")}</h3>
            <p className="text-slate-500 leading-relaxed">
              {t("This action increments proposal count, logs the previous version inside history, and bumps state to Revision Requested.")}
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] text-slate-400 font-bold font-mono uppercase">{t("Reason for Revision (Mandatory) *")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("e.g., Client requested daily rate discount")}
                  value={revisionReasonText}
                  onChange={(e) => setRevisionReasonText(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded mt-1"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 font-bold font-mono uppercase">{t("Trace Changes / Modifying Actions")}</label>
                <textarea
                  required
                  rows={3}
                  placeholder={t("e.g., Option 1 daily rate cut from 1200 to 1000. Removed travel premium.")}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded mt-1 resize-none h-18"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setRevisingProposal(null)} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded font-bold cursor-pointer">
                {t("Cancel")}
              </button>
              <button
                onClick={handleSaveRevision}
                disabled={!revisionReasonText.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-extrabold cursor-pointer transition-all disabled:opacity-50"
              >
                {t("Clone & Increment Version")}
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
              <span className="font-extrabold text-slate-500 font-mono">{t("B2B LETTERHEAD PREVIEW [Ref: PROP {number}]").replace("{number}", viewingProposalDoc.proposalNumber)}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadWordDoc(viewingProposalDoc)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 px-3 rounded font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> {t("Export Microsoft Word ID")}
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-black text-white p-1.5 px-3 rounded font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Eye className="w-3.5 h-3.5" /> {t("Trigger PDF Print")}
                </button>
                <button onClick={() => setViewingProposalDoc(null)} className="p-1 px-2 hover:bg-slate-200 rounded text-slate-650 cursor-pointer">
                  Close
                </button>
              </div>
            </div>

            {/* Simulated letterhead viewport */}
            <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-950 font-serif">
              <ProposalLetterheadBody doc={viewingProposalDoc} t={t} formatSystemNumber={formatSystemNumber} />
            </div>

          </div>
        </div>
      )}

      {/* Hidden off-screen render target used to capture the exact same
          styled A4 document (via html2canvas-pro, see captureProposalPdf
          below) for "PDF İndir" and the e-mail PDF attachment — so both
          match the "Yazdır"/print reference instead of the old disconnected
          jsPDF renderer. */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, width: "820px", zIndex: -1, pointerEvents: "none" }} aria-hidden="true">
        {pdfCaptureProposal && (
          <div ref={pdfCaptureRef} className="bg-white p-2 font-serif" style={{ width: "820px" }}>
            <ProposalLetterheadBody doc={pdfCaptureProposal} t={t} formatSystemNumber={formatSystemNumber} />
          </div>
        )}
      </div>

      {/* OUTLOOK EMAIL DISPATCH AND CRM SYNC DRAWER */}
      {sendingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl border border-slate-100 p-6 space-y-4 text-xs animate-in zoom-in-95 duration-100">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-1.5 text-blue-600">
                <Mail className="w-5 h-5 animate-bounce" />
                <span className="font-extrabold text-sm text-slate-800 dark:text-zinc-150">{t("Microsoft Exchange Mail Dispatch Center")}</span>
              </div>
              <button onClick={() => setSendingProposal(null)} className="text-slate-450 hover:text-red-500 font-bold">
                {t("CLOSE")}
              </button>
            </div>

            {/* Email Form fields */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-slate-450 font-bold font-mono uppercase">{t("RECIPIENT TO *")}</label>
                  <input
                    type="email"
                    required
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded mt-1 outline-none font-medium"
                    placeholder={t("customer@domain.com")}
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-450 font-bold font-mono uppercase">{t("CC")}</label>
                  <input
                    type="text"
                    value={emailCC}
                    onChange={(e) => setEmailCC(e.target.value)}
                    className="w-full p-2 border border-slate-205 bg-white dark:bg-zinc-800 rounded mt-1 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-slate-450 font-bold font-mono uppercase">{t("MESSAGE SUBJECT *")}</label>
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
                  <span className="font-bold text-[10px]">{t("Gemini AI Email Architect (TR / EN)")}</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateGeminiEmail}
                  disabled={isEmailGenerating}
                  className="bg-amber-652 hover:bg-amber-600 text-amber-950 font-black text-[10px] px-3 py-1 rounded cursor-pointer transition-all disabled:opacity-50"
                >
                  {isEmailGenerating ? t("Expanding script with model...") : t("Generate Professional Outlining Body")}
                </button>
              </div>

              {/* Message body */}
              <div>
                <label className="block text-[9px] text-slate-455 font-bold font-mono uppercase">{t("MESSAGE CONTENT BODY *")}</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={6}
                  className="w-full p-2.5 border border-slate-205 bg-white dark:bg-zinc-800 rounded mt-1 outline-none h-36 font-sans leading-relaxed text-slate-700 dark:text-zinc-200"
                />
              </div>

              {/* Attachment selector */}
              <div className="bg-slate-50 dark:bg-black/10 p-3 rounded-xl border border-slate-150 space-y-2">
                <span className="block text-[9px] text-slate-400 font-bold font-mono uppercase">{t("Attachment Bindings")}</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachPdf}
                      onChange={(e) => setAttachPdf(e.target.checked)}
                      className="accent-blue-600"
                    />
                    {t("Generated Proposal PDF (PROP-{number})").replace("{number}", sendingProposal.proposalNumber)}
                  </label>
                  <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachWord}
                      onChange={(e) => setAttachWord(e.target.checked)}
                      className="accent-blue-600"
                    />
                    {t("Microsoft Word Original Document (.docx)")}
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-dashed">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t("Attach custom additional filename...")}
                    value={customFileText}
                    onChange={(e) => setCustomFileText(e.target.value)}
                    className="p-1 px-2 border border-slate-200 bg-white dark:bg-zinc-800 rounded text-[10px] outline-none"
                  />
                  <button type="button" onClick={handleAddCustomFile} className="bg-slate-200 hover:bg-slate-300 p-1 px-2 rounded font-bold cursor-pointer text-[10px]">
                    {t("+ Attach File")}
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
                {t("Cancel")}
              </button>
              <button
                onClick={handleDispatchEmail}
                disabled={isDispatchingEmail}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Mail className="w-3.5 h-3.5" />
                {isDispatchingEmail ? t("Generating PDF & Sending...") : t("Dispatch Mail & Sync B2B Pipeline")}
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
                    (selectedProposalForDetail.approvalStatus || mapStatusToApproval(selectedProposalForDetail.status)) === "Approved"
                      ? "bg-green-100 text-green-800 dark:bg-green-950/45 dark:text-green-400"
                      : (selectedProposalForDetail.approvalStatus || mapStatusToApproval(selectedProposalForDetail.status)) === "Rejected"
                      ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                      : (selectedProposalForDetail.approvalStatus || mapStatusToApproval(selectedProposalForDetail.status)) === "Sent"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                      : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    {getApprovalStatusLabel(selectedProposalForDetail)}
                  </span>
                </div>
                <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 mt-1.5 truncate max-w-lg">
                  {selectedProposalForDetail.proposalSubject}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {selectedProposalForDetail.approvalStatus !== "Approved" && (
                  <button
                    onClick={() => handleSetApproval(selectedProposalForDetail, "Approved")}
                    className="bg-green-600 hover:bg-green-700 text-white p-2 px-3 rounded-lg font-extrabold text-[11px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {t("Approve")}
                  </button>
                )}
                {selectedProposalForDetail.approvalStatus !== "Rejected" && (
                  <button
                    onClick={() => {
                      const notes = prompt(t("Rejection reason (optional):"));
                      void handleSetApproval(selectedProposalForDetail, "Rejected", notes || undefined);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 px-3 rounded-lg font-extrabold text-[11px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("Reject")}
                  </button>
                )}
                <button
                  onClick={() => handleOpenSendPanel(selectedProposalForDetail)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-3 rounded-lg font-extrabold text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t("Send Email")}
                </button>
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
                    {t("Client & Owner Details")}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{t("Company")}</span>
                      <p 
                        onClick={(e) => handleCompanyClick(e, selectedProposalForDetail.companyName, selectedProposalForDetail.companyId)}
                        className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                        title={t("Click to view Company details")}
                      >
                        <Building className="w-3 h-3 shrink-0" />
                        {selectedProposalForDetail.companyName}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{t("Attention Contact")}</span>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        {selectedProposalForDetail.contactPerson}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{t("Contact Email")}</span>
                      <p className="text-[11px] font-bold text-slate-655 dark:text-zinc-300 truncate flex items-center gap-1" title={selectedProposalForDetail.contactEmail}>
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        {selectedProposalForDetail.contactEmail || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{t("Offer Date")}</span>
                      <p className="text-[11px] font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {selectedProposalForDetail.date}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{t("Consulting Partner")}</span>
                      <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedProposalForDetail.owner}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{t("Linked Deal")}</span>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-zinc-200">
                        {selectedProposalForDetail.dealName || (selectedProposalForDetail.dealId
                          ? CrmDb.getDeals().find((d) => d.id === selectedProposalForDetail.dealId)?.dealName || selectedProposalForDetail.dealId
                          : (t("Not linked")))}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{t("Word Template")}</span>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-zinc-200">
                        {wordTemplates.find((t) => t.id === selectedProposalForDetail.wordTemplateId)?.name || (t("Default"))}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block">{t("Active Version")}</span>
                      <p className="text-[11px] font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {selectedProposalForDetail.currentVersion}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Proposal Timeline */}
                {proposalTimeline.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                      {t("Proposal Timeline")}
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {proposalTimeline.map((evt) => (
                        <div key={evt.id} className="p-2.5 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-lg text-[10px] space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-blue-700 dark:text-blue-400">{evt.title}</span>
                            <span className="text-[8px] font-mono text-slate-400">{new Date(evt.createdAt).toLocaleString()}</span>
                          </div>
                          {evt.description && (
                            <p className="text-slate-600 dark:text-zinc-400">{evt.description}</p>
                          )}
                          <span className="text-[8px] font-mono text-slate-400 uppercase">{evt.eventType}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Log */}
                {proposalAuditLog.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                      {t("Audit Log")}
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {proposalAuditLog.map((entry) => (
                        <div key={entry.id} className="p-2.5 bg-slate-50 dark:bg-zinc-900/30 border border-slate-150 dark:border-zinc-850 rounded-lg text-[10px] space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-extrabold text-slate-700 dark:text-zinc-300">{entry.action}</span>
                            <span className="text-[8px] font-mono text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          {entry.actorName && (
                            <p className="text-slate-500 dark:text-zinc-400">{entry.actorName}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Executive Focus Description */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                    {t("Engagement Objectives & Focus")}
                  </h3>
                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-900/30 border border-slate-150 dark:border-zinc-800/80 rounded-xl">
                    <p className="text-[11px] text-slate-650 dark:text-zinc-350 leading-relaxed whitespace-pre-line">
                      {selectedProposalForDetail.description || (t("Continuous improvement parameters and operational alignment metrics."))}
                    </p>
                  </div>
                </div>

                {/* 3. Services checkboxes list */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                    {t("Included Lean Service Pillars")}
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
                        {t("No explicit services indicated.")}
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Pricing Option Packages */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                    {t("Structured Pricing Options")}
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
                              {selectedProposalForDetail.currency} {formatSystemNumber(totalCost)}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                            <div>
                              <span className="block text-[8px] text-slate-400 font-mono uppercase">{t("Days")}</span>
                              <span className="font-bold text-slate-750 dark:text-zinc-300">{opt.manDays} {t("Days")}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-400 font-mono uppercase">{t("Daily Rate")}</span>
                              <span className="font-bold text-slate-750 dark:text-zinc-300">{selectedProposalForDetail.currency}{opt.dailyRate}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-400 font-mono uppercase">{t("Expenses")}</span>
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
                    <span>{t("Subtotal (Net)")}:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                      {selectedProposalForDetail.currency} {formatSystemNumber(selectedProposalForDetail.totalBudget)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{t("VAT (20%)")}:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                      {selectedProposalForDetail.currency} {formatSystemNumber(selectedProposalForDetail.taxes)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-slate-800 dark:text-zinc-150 pt-1.5 border-t border-slate-200 dark:border-zinc-800">
                    <span>{t("GRAND TOTAL OFFER")}:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {selectedProposalForDetail.currency} {formatSystemNumber(selectedProposalForDetail.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* 6. Version History Log */}
                {selectedProposalForDetail.versions && selectedProposalForDetail.versions.length > 1 && (
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                      {t("Revision & Version Logs")}
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedProposalForDetail.versions.map((ver) => (
                        <div key={ver.version} className="p-2.5 bg-slate-50 dark:bg-zinc-900/30 border border-slate-150 dark:border-zinc-850 rounded-lg text-[10px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{ver.version}</span>
                            <span className="text-[8px] font-mono text-slate-400">{ver.date}</span>
                          </div>
                          <p className="text-slate-650 dark:text-zinc-300 font-medium">
                            <strong className="text-slate-500 dark:text-zinc-400">{t("Reason")}:</strong> {ver.reason}
                          </p>
                          {ver.notes && (
                            <p className="text-slate-500 dark:text-zinc-400 text-[9px] italic">
                              <strong className="text-slate-400 not-italic font-bold">{t("Notes")}:</strong> {ver.notes}
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
                    <span>{t("OFFICIAL PROPOSAL DOCUMENT (PDF)")}</span>
                    <span className="text-emerald-500 font-bold">{t("● LIVE GENERATED")}</span>
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
                          {t("Compiling Premium PDF File...")}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {t("Generating corporate layout using vector coordinates...")}
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

      {/* WORD TEMPLATE MANAGER */}
      {showTemplateManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-4xl border border-slate-100 p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span className="font-extrabold text-sm text-slate-800 dark:text-zinc-150">
                  {t("Word Template Management")}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowTemplateManager(false);
                  setEditingTemplate(null);
                }}
                className="text-slate-450 hover:text-red-500 font-bold"
              >
                CLOSE
              </button>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-slate-500 text-[11px]">
                {t("Use placeholders like {{company_name}}, {{proposal_number}}, {{grand_total}}, etc.")}
              </p>
              <button
                onClick={() =>
                  setEditingTemplate({
                    id: "",
                    name: "",
                    content: "<h1>{{cover_page}}</h1>\n<p>{{company_name}} — {{proposal_number}}</p>\n<p>{{description}}</p>\n<p>{{grand_total}}</p>",
                    templateType: "word",
                    placeholders: [],
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded font-bold cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t("New Template")}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wordTemplates.map((tpl) => (
                <div key={tpl.id} className="p-3 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">{tpl.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingTemplate(tpl)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => void handleDeleteTemplate(tpl.id)}
                        className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {tpl.description && <p className="text-slate-500 text-[10px]">{tpl.description}</p>}
                  <p className="text-[9px] font-mono text-slate-400 truncate">
                    {(tpl.placeholders || []).join(", ") || PROPOSAL_PLACEHOLDERS.slice(0, 5).join(", ")}
                  </p>
                </div>
              ))}
              {wordTemplates.length === 0 && (
                <p className="text-slate-400 italic col-span-2 text-center py-6">
                  {t("No templates yet. Create your first template.")}
                </p>
              )}
            </div>

            {editingTemplate && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-bold text-slate-700 dark:text-zinc-300">
                  {editingTemplate.id ? (t("Edit Template")) : (t("New Template"))}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase">{t("Template Name")} *</label>
                    <input
                      type="text"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full p-2 border border-slate-200 bg-white dark:bg-zinc-800 rounded mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase">{t("Description")}</label>
                    <input
                      type="text"
                      value={editingTemplate.description || ""}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                      className="w-full p-2 border border-slate-200 bg-white dark:bg-zinc-800 rounded mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">
                    {t("Template Content (HTML + Placeholders)")}
                  </label>
                  <textarea
                    value={editingTemplate.content}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                    rows={10}
                    className="w-full p-2 border border-slate-200 bg-white dark:bg-zinc-800 rounded font-mono text-[11px]"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">
                    {PROPOSAL_PLACEHOLDERS.join(" · ")}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded font-bold cursor-pointer"
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    onClick={() => void handleSaveTemplate()}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-extrabold cursor-pointer"
                  >
                    {t("Save Template")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
