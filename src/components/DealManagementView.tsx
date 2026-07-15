import React, { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { getSystemCurrency } from "../lib/currencyHelper";
import {
  DollarSign,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  Plus,
  X,
  FileText,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Trash2,
  Lock,
  Mail,
  Activity,
  Phone,
  Zap,
  MoreVertical,
  CheckSquare,
  Clock,
  Briefcase,
  Edit2,
  Paperclip,
  Send,
  Building,
  RefreshCw,
  Globe,
  PlusCircle,
  ArrowLeft,
  Columns,
  Kanban,
  List,
  Upload,
  Download,
  FileSignature,
  Check,
  FileCheck
} from "lucide-react";
import SalesDashboardView from "./SalesDashboardView";
import { jsPDF } from "jspdf";
import { CrmDb } from "../lib/CrmDb";
import CompanyAutocomplete from "./CompanyAutocomplete";
import {
  TimelineActivitiesSection,
  OpexAssessmentSection,
  ProposalContractSection,
  addAuditLog
} from "./OpportunityDrawerExtension";

function convertNumberToTRWords(num: number): string {
  if (isNaN(num) || num === null) return "";
  if (num === 0) return "Sıfır";
  const birler = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"];
  const onlar = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
  const binler = ["", "Bin", "Milyon", "Milyar", "Trilyon"];
  let count = 0;
  let wordResult = "";
  let tempNum = Math.floor(Math.abs(num));
  while (tempNum > 0) {
    let subNum = tempNum % 1000;
    if (subNum > 0) {
      let subWord = "";
      let y = Math.floor(subNum / 100);
      let o = Math.floor((subNum % 100) / 10);
      let b = subNum % 10;
      if (y > 0) {
        if (y === 1) {
          subWord += "Yüz ";
        } else {
          subWord += birler[y] + " Yüz ";
        }
      }
      if (o > 0) {
        subWord += onlar[o] + " ";
      }
      if (b > 0) {
        if (count === 1 && subNum === 1) {
          // just Bin
        } else {
          subWord += birler[b] + " ";
        }
      }
      wordResult = subWord + binler[count] + " " + wordResult;
    }
    tempNum = Math.floor(tempNum / 1000);
    count++;
  }
  return wordResult.trim();
}

export function getStageTranslation(stage: string, lang: string): string {
  if (lang !== "TR") return stage;
  switch (stage) {
    case "Lead Identified": return "Fırsat Tanımlandı";
    case "Initial Contact": return "İlk Temas";
    case "Discovery Meeting": return "Keşif Toplantısı";
    case "Opportunity Qualified": return "Nitelikli Fırsat";
    case "Site Visit / Gemba": return "Saha Ziyareti / Gemba";
    case "Solution Design": return "Çözüm Tasarımı";
    case "Proposal Submitted": return "Teklif Sunuldu";
    case "Won": return "Kazanıldı";
    case "Lost": return "Kaybedildi";
    default: return stage;
  }
}

export function getStageDescTranslation(stage: string, lang: string, defaultDesc: string): string {
  if (lang !== "TR") return defaultDesc;
  switch (stage) {
    case "Lead Identified": return "Web veya kampanya listesinden eşlenen ilk sıcak fırsat";
    case "Initial Contact": return "Telefon araması tamamlandı ve tanıtım e-postası başarıyla gönderildi";
    case "Discovery Meeting": return "Muda (israf), KPI'lar ve bütçe uygunluğunun aktif tespiti";
    case "Opportunity Qualified": return "Sorun ve kapsam üzerinde resmi mutabakat";
    case "Site Visit / Gemba": return "Fabrika hattı veya üretim sahasına fiziksel ziyaret tamamlandı";
    case "Solution Design": return "Eğitim blokları ve yalın kapsam tasarlandı";
    case "Proposal Submitted": return "Resmi ticari teklif ve şartlar gönderildi";
    case "Won": return "İmzalı sözleşme alındı ve aktif sipariş (PO) oluşturuldu";
    case "Lost": return "Rakip, zamanlama veya bütçe kesintileri nedeniyle kapatılan fırsat";
    default: return defaultDesc;
  }
}

// Expanded Deal CRM interface
export interface Deal {
  id: string;
  organization_id?: string;
  companyId?: string;
  dealName?: string; // added deal name
  companyName: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone?: string;
  opportunityValue: number;
  expectedCloseDate: string;
  opportunityScore: number; // 1-100
  winProbability: number; // %
  currentStageDuration: number; // days in current stage
  priority: "Low" | "Medium" | "High";
  industry: string;
  opexScore: number;
  stage: string;

  // New opportunity fields requested
  owner?: string; // Default: 'GP'
  pipeline?: string; // Default: 'Sales Pipeline Standard'
  description?: string;
  leadSource?: string;
  proposalNumber?: string;
  manDay?: string;
  contactSubject?: string;
  products?: string;
  otherEmails?: string[];

  // Editable OPEX & Contract fields
  leanMaturityLevel?: string;
  leanMaturityDesc?: string;
  qualityRiskLevel?: string;
  qualityRiskDesc?: string;
  contractDate?: string;
  contractPm?: string;
  contractPmTc?: string;
  contractSubject?: string;

  // Embedded email histories for the deal
  dealEmails?: {
    id: string;
    sender: string;
    recipient: string;
    date: string;
    subject: string;
    body: string;
    attachments?: string[];
    isIncoming?: boolean;
  }[];

  // Stage validation mandatory fields
  discoveryMeeting?: {
    mainPainPoint: string;
    decisionMaker: string;
    budgetEstimate: number;
  };
  proposalSubmitted?: {
    proposalValue: number;
    proposalNumber: string;
    expectedDecisionDate: string;
  };
  commercialNegotiation?: {
    negotiationStatus: string;
    competitorInfo: string;
  };

  // Won / Lost outcomes
  wonRecord?: {
    contractValue: number;
    contractDate: string;
    poNumber: string;
    projectStartDate: string;
  };
  lostRecord?: {
    lostReason: string;
    competitor: string;
    notes: string;
    aiAnalysis?: string;
  };

  // Metadata logs
  activities?: { id: string; date: string; title: string; type: string }[];
  meetings?: { id: string; date: string; title: string; result: string }[];
  documents?: { id: string; name: string; size: string; link: string }[];
  stageHistory?: {
    stage: string;
    date: string;
    notes?: string;
  }[];
}

export interface ProjectRecord {
  id: string;
  organization_id?: string;
  dealId: string;
  companyName: string;
  contractValue: number;
  poNumber: string;
  projectStartDate: string;
  status: "Pending Kickoff" | "In Progress" | "Completed";
}

// Default initial deals
const INITIAL_DEALS: Deal[] = [
  {
    id: "deal-1",
    dealName: "ABC Glass Automation Project",
    companyName: "ABC Automotive",
    contactPerson: "John Smith",
    contactEmail: "john.smith@abcauto.com",
    contactPhone: "+90 (532) 111 2233",
    opportunityValue: 250000,
    expectedCloseDate: "20.08.2026",
    opportunityScore: 82,
    winProbability: 72,
    currentStageDuration: 3,
    priority: "High",
    industry: "Automotive",
    opexScore: 84,
    stage: "Discovery Meeting",
    owner: "GP",
    pipeline: "Sales Pipeline Standard",
    description: "Lean manufacturing glass plant automation advisory opportunity.",
    leadSource: "Partner Referral",
    proposalNumber: "PRP-2026-10",
    manDay: "35",
    contactSubject: "OEE Tracking Setup",
    products: "Visual Andon Board, Operator Lean Training",
    discoveryMeeting: {
      mainPainPoint: "Stok fazlası ve yüksek kalite kontrol duruşları",
      decisionMaker: "John Smith (COO)",
      budgetEstimate: 280000
    },
    dealEmails: [
      {
        id: "m-1",
        sender: "Gemba Partner (GP)",
        recipient: "john.smith@abcauto.com",
        date: "2026-06-15 10:30",
        subject: "Introduction: Gemba Partner Advisory",
        body: "Hello John, Following our short intro call, we are excited to suggest an Opex assessment on your Nilüfer plant. Please see our attached overview PDF.",
        attachments: ["Advisory_Services_EN.pdf"]
      },
      {
        id: "m-2",
        sender: "John Smith",
        recipient: "Gemba Partner (GP)",
        date: "2026-06-16 11:15",
        subject: "Re: Introduction: Gemba Partner Advisory",
        body: "Hi GP Team, thanks for the PDF. We are indeed planning our FY26 automation budget right now. Let's schedule a brief Discovery Meeting soon.",
        isIncoming: true
      }
    ],
    activities: [
      { id: "act-1", date: "15.06.2026", title: "Tanışma araması tamamlandı", type: "call" },
      { id: "act-2", date: "17.06.2026", title: "E-posta ile sunum dosyası gönderildi", type: "email" }
    ],
    meetings: [
      { id: "meet-1", date: "18.06.2026", title: "Keşif Toplantısı", result: "Pain pointler netleşti." }
    ],
    documents: [
      { id: "doc-1", name: "ABC_Automotive_Analiz_Raporu.pdf", size: "2.4 MB", link: "#" }
    ],
    stageHistory: [
      { stage: "Lead Identified", date: "12.06.2026", notes: "Müşteri web formu doldurarak ulaştı, sıcak fırsat tanımlandı." },
      { stage: "Initial Contact", date: "15.06.2026", notes: "İlk telefon araması gerçekleştirildi, tanıtım dokümanı gönderildi." },
      { stage: "Discovery Meeting", date: "18.06.2026", notes: "Keşif toplantısı yapıldı. Muda ve bütçe uygunluğu analiz ediliyor." }
    ]
  },
  {
    id: "deal-2",
    dealName: "Yıldız Chemical Site Audit",
    companyName: "Yıldız Kimya",
    contactPerson: "Ahmet Yıldız",
    contactEmail: "ahmet@yildizkimya.com.tr",
    contactPhone: "+90 (212) 333 4455",
    opportunityValue: 120000,
    expectedCloseDate: "15.09.2026",
    opportunityScore: 91,
    winProbability: 85,
    currentStageDuration: 8,
    priority: "High",
    industry: "Chemicals",
    opexScore: 92,
    stage: "Lead Identified",
    owner: "GP",
    pipeline: "Sales Pipeline Standard",
    description: "Complete plant muda mapping and 5S program rollout.",
    leadSource: "Inbound Web Campaign",
    proposalNumber: "PRP-2026-11",
    manDay: "20",
    contactSubject: "Muda Mapping Auditing",
    products: "TIMWOODS plant floor workshop",
    dealEmails: [],
    activities: [],
    meetings: [],
    documents: [],
    stageHistory: [
      { stage: "Lead Identified", date: "16.06.2026", notes: "Saha denetimi talebi alındı, fırsat kartı oluşturuldu." }
    ]
  },
  {
    id: "deal-3",
    dealName: "Beta Electronics SMED Consultancy",
    companyName: "Beta Electronics",
    contactPerson: "Sophia Loren",
    contactEmail: "sloren@betaelectronics.com",
    contactPhone: "+1 (415) 888 9900",
    opportunityValue: 75050,
    expectedCloseDate: "22.07.2026",
    opportunityScore: 68,
    winProbability: 45,
    currentStageDuration: 5,
    priority: "Medium",
    industry: "Electronics",
    opexScore: 78,
    stage: "Initial Contact",
    owner: "GP",
    pipeline: "Sales Pipeline Standard",
    description: "Rapid single-minute exchange of die layout and simulation advisory.",
    leadSource: "Cold Outreach",
    proposalNumber: "PRP-2026-12",
    manDay: "12",
    contactSubject: "SMED Optimization",
    products: "Die Setup Optimization workshop",
    dealEmails: [],
    activities: [],
    meetings: [],
    documents: [],
    stageHistory: [
      { stage: "Lead Identified", date: "10.06.2026", notes: "Soğuk arama listesinden fırsat oluşturuldu." },
      { stage: "Initial Contact", date: "17.06.2026", notes: "Telefon araması yapıldı, detaylar için randevu istendi." }
    ]
  },
  {
    id: "deal-delayed-7d",
    dealName: "Yarımca Petrochemical Consulting",
    companyName: "Tüpraş Yarımca",
    contactPerson: "Mehmet Demir",
    contactEmail: "mehmet.demir@luprash.com.tr",
    contactPhone: "+90 (542) 222 3344",
    opportunityValue: 450000,
    expectedCloseDate: "30.07.2026",
    opportunityScore: 78,
    winProbability: 60,
    currentStageDuration: 8,
    priority: "High",
    industry: "Chemicals",
    opexScore: 82,
    stage: "Proposal Submitted",
    owner: "GP",
    pipeline: "Sales Pipeline Standard",
    description: "Lean audit and total resource productivity assessment offer sent.",
    leadSource: "Direct Inbound",
    proposalNumber: "PRP-2026-18",
    manDay: "45",
    contactSubject: "Yalın Değer Akışı",
    products: "Kaizen, VSM, Standardized work",
    dealEmails: [],
    activities: [
      { id: "act-4", date: "13.06.2026", title: "Teklif resmi olarak iletildi", type: "email" }
    ],
    meetings: [],
    documents: [],
    stageHistory: [
      { stage: "Lead Identified", date: "01.06.2026", notes: "Tüpraş Yarımca tesisi için ilk fırsat kaydı oluşturuldu." },
      { stage: "Initial Contact", date: "03.06.2026", notes: "Mehmet Bey ile ilk temas kuruldu." },
      { stage: "Discovery Meeting", date: "05.06.2026", notes: "Keşif ve kapsam belirleme toplantısı tamamlandı." },
      { stage: "Opportunity Qualified", date: "08.06.2026", notes: "Fırsat kalifiye edildi, bütçe onayları alındı." },
      { stage: "Site Visit / Gemba", date: "10.06.2026", notes: "Saha ziyareti gerçekleştirildi, israflar yerinde gözlemlendi." },
      { stage: "Solution Design", date: "12.06.2026", notes: "Yalın değer akışı çözüm tasarımı hazırlandı." },
      { stage: "Proposal Submitted", date: "13.06.2026", notes: "Resmi opex danışmanlık teklifi e-posta ile iletildi." }
    ]
  },
  {
    id: "deal-delayed-20d",
    dealName: "Ege Fast Food Lean Assessment",
    companyName: "Ege Food Group",
    contactPerson: "Ayşe Özkan",
    contactEmail: "ayse.ozkan@egefood.com.tr",
    contactPhone: "+90 (533) 333 4455",
    opportunityValue: 180000,
    expectedCloseDate: "15.08.2026",
    opportunityScore: 85,
    winProbability: 55,
    currentStageDuration: 22,
    priority: "Medium",
    industry: "Food Processing",
    opexScore: 70,
    stage: "Proposal Submitted",
    owner: "GP",
    pipeline: "Sales Pipeline Standard",
    description: "Assembly line logistics and flow optimization consulting proposal.",
    leadSource: "Partner Referral",
    proposalNumber: "PRP-2026-22",
    manDay: "18",
    contactSubject: "Hat Akış Analizi",
    products: "Muda mapping, 5S advisory",
    dealEmails: [],
    activities: [
      { id: "act-5", date: "30.05.2026", title: "Teklif sunumu yapıldı", type: "email" }
    ],
    meetings: [],
    documents: [],
    stageHistory: [
      { stage: "Lead Identified", date: "15.05.2026", notes: "Ege Gıda lojistik iyileştirme talebi sisteme girildi." },
      { stage: "Initial Contact", date: "18.05.2026", notes: "Ayşe Hanım ile ön görüşme yapıldı." },
      { stage: "Discovery Meeting", date: "20.05.2026", notes: "Mevcut durum analizi ve keşif toplantısı yapıldı." },
      { stage: "Opportunity Qualified", date: "22.05.2026", notes: "Kapsam üzerinde mutabık kalındı." },
      { stage: "Site Visit / Gemba", date: "25.05.2026", notes: "Gemba yürüyüşü ve hat analizi yapıldı." },
      { stage: "Solution Design", date: "28.05.2026", notes: "Lojistik akış tasarımı tamamlandı." },
      { stage: "Proposal Submitted", date: "30.05.2026", notes: "Üretim hattı lojistiği ve akış iyileştirme teklifi sunuldu." }
    ]
  }
];

const DEFAULT_STAGES = [
  "Lead Identified",
  "Initial Contact",
  "Discovery Meeting",
  "Opportunity Qualified",
  "Site Visit / Gemba",
  "Solution Design",
  "Proposal Submitted",
  "Won",
  "Lost"
];

// Initial stage metadata (descriptions)
const INITIAL_STAGE_METADATA: {[key: string]: { collapsed: boolean; description: string }} = {
  "Lead Identified": { collapsed: false, description: "Initial warm lead mapped from web or campaigns list" },
  "Initial Contact": { collapsed: false, description: "Phone outbound completed and pitch mail successfully sent" },
  "Discovery Meeting": { collapsed: false, description: "Active evaluation of mudas, KPIs, and local budget validation" },
  "Opportunity Qualified": { collapsed: false, description: "Formal alignment on corporate pain point and scope" },
  "Site Visit / Gemba": { collapsed: false, description: "Physical visit to factory plant or processing line Completed" },
  "Solution Design": { collapsed: false, description: "Engineered lean scope with training blocks mapped out" },
  "Proposal Submitted": { collapsed: false, description: "Official commercial offer logged with terms sheets sent" },
  "Won": { collapsed: false, description: "Signed contract received with Active PO created" },
  "Lost": { collapsed: false, description: "Deals closed due to competitor, timeline, or budgets cuts" }
};

export interface DealManagementProps {
  initialTab?: "dashboard" | "board";
  onNavigateToTab?: (tab: string) => void;
}

export default function DealManagementView({ initialTab = "dashboard", onNavigateToTab }: DealManagementProps = {}) {
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

  // Navigation tabs of B2B CRM (Deals Board vs Companies Page)
  const [activeModuleTab, setActiveModuleTab] = useState<"dashboard" | "board">(initialTab as any);

  useEffect(() => {
    setActiveModuleTab(initialTab as any);
  }, [initialTab]);
  const [dealViewStyle, setDealViewStyle] = useState<"kanban" | "list">("kanban");

  const [deals, setDeals] = useState<Deal[]>(() => CrmDb.getDeals());

  const [projects, setProjects] = useState<ProjectRecord[]>(() => {
    const loaded = CrmDb.getProjects();
    return loaded.length > 0 ? loaded : [];
  });

  const [activeStages, setActiveStages] = useState<string[]>(() => {
    const saved = CrmDb.getPipelineStages();
    return saved && saved.length > 0 ? saved : DEFAULT_STAGES;
  });

  const [stageMetadata, setStageMetadata] = useState<{[key: string]: { collapsed: boolean; description: string }}>(() => {
    const saved = CrmDb.getStageMetadata();
    return saved ? (saved as {[key: string]: { collapsed: boolean; description: string }}) : INITIAL_STAGE_METADATA;
  });

  // Top Toolbar Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [delayFilter, setDelayFilter] = useState<"All" | "7_plus" | "20_plus" | "delayed">("All");
  const [sortBy, setSortBy] = useState<"value" | "closeDate" | "score" | "probability" | "proposalNumber">("value");

  // Selected Deal drawer
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<string>("Overview");
  const [isDrawerReadOnly, setIsDrawerReadOnly] = useState(false);

  useEffect(() => {
    const handleOpenOpportunity = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.companyName) {
        const matchingDeal = deals.find(
          (d) => d.companyName.toLowerCase().trim() === customEvent.detail.companyName.toLowerCase().trim()
        );
        if (matchingDeal) {
          setSelectedDeal(matchingDeal);
          setIsDrawerReadOnly(!!customEvent.detail.readOnly);
          setActiveDrawerTab("Proposal & Won");
        }
      }
    };

    window.addEventListener("open-opportunity-drawer", handleOpenOpportunity);
    return () => {
      window.removeEventListener("open-opportunity-drawer", handleOpenOpportunity);
    };
  }, [deals]);

  // Inline SLA step timeline editing states
  const [editingSlaStage, setEditingSlaStage] = useState<string | null>(null);
  const [slaEditDate, setSlaEditDate] = useState("");
  const [slaEditNotes, setSlaEditNotes] = useState("");

  // Custom stylish delete confirmation state
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
    title?: string;
    message?: string;
  }>({ isOpen: false, onConfirm: () => {} });

  // Item 4: Fırsat panosu liste görünümü — tümünü seç + toplu sil için seçim state'i
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([]);

  // Helper to update a deal inside the deals array and synchronize selectedDeal state
  const updateDealAndSelected = (updatedDeal: Deal) => {
    setDeals((prev) => prev.map((d) => (d.id === updatedDeal.id ? updatedDeal : d)));
    setSelectedDeal(updatedDeal);
  };

  // Create Opportunity modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeStageMenu, setActiveStageMenu] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  // Email sending error state (Simulated/API token errors)
  const [emailSendError, setEmailSendError] = useState<{
    code: string;
    message: string;
    diagnostics: string;
  } | null>(null);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);

  // Exchange Connection Simulated Status
  const [isExchangeConnected, setIsExchangeConnected] = useState<boolean>(() => {
    return CrmDb.getKv<string>("exchange_connected_sync", "false") === "true";
  });

  // Email form states
  const [emailComposeTo, setEmailComposeTo] = useState("");
  const [emailComposeBcc, setEmailComposeBcc] = useState("");
  const [emailComposeSubject, setEmailComposeSubject] = useState("");
  const [emailComposeBody, setEmailComposeBody] = useState("");
  const [emailComposeFile, setEmailComposeFile] = useState<string>("");
  const [emailClientMode, setEmailClientMode] = useState<"mailto" | "gmail" | "outlook">("mailto");
  const [newOtherEmailInput, setNewOtherEmailInput] = useState("");

  // New features state declarations
  const [newNoteInput, setNewNoteInput] = useState("");
  const [newActDate, setNewActDate] = useState(new Date().toISOString().split("T")[0]);
  const [newActTitle, setNewActTitle] = useState("");
  const [newActType, setNewActType] = useState("Toplantı");
  const [newActSummary, setNewActSummary] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [newDocSize, setNewDocSize] = useState("");

  // Dynamic Contract management inputs
  const [contractValue, setContractValue] = useState("");
  const [contractDateState, setContractDateState] = useState("");
  const [contractPm, setContractPm] = useState("");
  const [contractPmTc, setContractPmTc] = useState("");
  const [contractSubject, setContractSubject] = useState("");

  // Synchronize composer and contract state when selectedDeal changes
  useEffect(() => {
    if (selectedDeal) {
      setEmailComposeTo(selectedDeal.contactEmail || "");
      setEmailComposeBcc("");
      setEmailComposeSubject(selectedDeal.dealName ? `GP - ${selectedDeal.dealName} Projesi` : "Gemba Partner - İş Birliği Teklifi");
      setEmailComposeBody(`Merhaba ${selectedDeal.contactPerson} Bey/Hanım,\n\nSizinle üzerinde konuştuğumuz operasyonel gelişim planı ve verimlilik artırma projemiz hakkında detayları paylaşmak istiyoruz.\n\nİlgili değerlendirmeyi ve detaylı dökümanları ekte bilgilerinize sunuyorum.\n\nEn yakın zamanda kısa bir takip toplantısı planlamayı rica ederim.\n\nSaygılarımla,\nGemba Partner Danışmanlık`);
      setEmailComposeFile("");
      setNewOtherEmailInput("");

      // Initialize contract states based on the active deal
      const val = selectedDeal.opportunityValue || 120050;
      setContractValue(val.toString());
      setContractDateState(selectedDeal.contractDate || selectedDeal.expectedCloseDate || new Date().toISOString().split("T")[0]);
      setContractPm(selectedDeal.contractPm || selectedDeal.contactPerson || "Ahmet Yılmaz");
      setContractPmTc(selectedDeal.contractPmTc || "12345678901");
      setContractSubject(selectedDeal.contractSubject || (selectedDeal.dealName ? `${selectedDeal.dealName} Danışmanlık Hizmetleri` : `${selectedDeal.companyName} Yalın Dönüşüm Projesi`));
    }
  }, [selectedDeal]);

  // Create/Edit opportunity form states
  const [activeFormTab, setActiveFormTab] = useState<"general" | "metadata" | "opex" | "contract" | "sla">("general");
  const [dealFormState, setDealFormState] = useState({
    owner: "GP",
    dealName: "",
    companyName: "",
    companyId: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    pipeline: "Sales Pipeline Standard",
    stage: "Lead Identified",
    opportunityValue: 50000,
    expectedCloseDate: "18.06.2026",
    description: "",
    leadSource: "Cold Lead Discovery",
    proposalNumber: "",
    manDay: "",
    contactSubject: "",
    products: "",
    currentStageDuration: 1,

    // Editable OPEX Assessment details
    leanMaturityLevel: "",
    leanMaturityDesc: "",
    qualityRiskLevel: "",
    qualityRiskDesc: "",

    // Editable Contract details
    contractDate: "",
    contractPm: "",
    contractPmTc: "",
    contractSubject: "",
    stageHistory: [] as { stage: string; date: string; notes?: string; }[]
  });

  const [leadSourcesList, setLeadSourcesList] = useState<string[]>(() => {
    const saved = CrmDb.getLeadSources();
    if (saved && saved.length > 0) return saved;
    return [
      "Cold Call",
      "Warm Lead",
      "Advertisement",
      "LinkedIn Contact",
      "Website Message",
      "LinkedIn",
      "Email Campaign",
      "Trade Show",
      "Existing Customer",
      "Referral",
      "Word-of-Mouth Lead",
      "Nurturing Lead"
    ];
  });
  const [customSourceInput, setCustomSourceInput] = useState("");
  const [showAddCustomSource, setShowAddCustomSource] = useState(false);

  // New stage addition states
  const [isAddingNewStagePopup, setIsAddingNewStagePopup] = useState(false);
  const [newStageNameInput, setNewStageNameInput] = useState("");

  // New stage descriptions states
  const [isAddingDescPopup, setIsAddingDescPopup] = useState<{stage: string} | null>(null);
  const [newStageDescInput, setNewStageDescInput] = useState("");

  // Stage renaming & deletion states
  const [isRenamingStagePopup, setIsRenamingStagePopup] = useState<string | null>(null);
  const [renameStageInput, setRenameStageInput] = useState("");
  const [isDeletingStagePopup, setIsDeletingStagePopup] = useState<string | null>(null);
  const [deleteStageTargetMigration, setDeleteStageTargetMigration] = useState<string>("");

  // CRM follow-up reminder mailbox states
  const [isReminderMailboxOpen, setIsReminderMailboxOpen] = useState(false);
  const [reminderSelectedDeal, setReminderSelectedDeal] = useState<Deal | null>(null);
  const [reminderMailSubject, setReminderMailSubject] = useState("");
  const [reminderMailBody, setReminderMailBody] = useState("");
  const [reminderClientType, setReminderClientType] = useState<"mailto" | "gmail" | "outlook" | "outlook-corp">("mailto");
  const [reminderTemplateMode, setReminderTemplateMode] = useState<"7_day" | "20_day" | "custom">("7_day");

  // Save changes via CrmDb to preserve single source of truth relational mapping
  useEffect(() => {
    CrmDb.saveDeals(deals);
  }, [deals]);

  useEffect(() => {
    CrmDb.saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    CrmDb.savePipelineStages(activeStages);
  }, [activeStages]);

  useEffect(() => {
    CrmDb.saveStageMetadata(stageMetadata);
  }, [stageMetadata]);

  useEffect(() => {
    CrmDb.setKv("exchange_connected_sync", String(isExchangeConnected));
  }, [isExchangeConnected]);

  useEffect(() => {
    CrmDb.saveLeadSources(leadSourcesList);
  }, [leadSourcesList]);

  // Handle stage creation
  const handleAddNewStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageNameInput) return;
    const cleanStage = newStageNameInput.trim();
    if (activeStages.includes(cleanStage)) {
      alert(t("Stage already exists!"));
      return;
    }
    // Insert before Won / Lost (near end)
    const updated = [...activeStages];
    const insertIdx = Math.max(0, updated.length - 2);
    updated.splice(insertIdx, 0, cleanStage);
    setActiveStages(updated);
    
    setStageMetadata(prev => ({
      ...prev,
      [cleanStage]: { collapsed: false, description: "Custom newly appended sales pipeline milestone" }
    }));
    
    setNewStageNameInput("");
    setIsAddingNewStagePopup(false);
  };

  // Handle stage description save
  const handleSaveStageDescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingDescPopup) return;
    const target = isAddingDescPopup.stage;
    setStageMetadata(prev => ({
      ...prev,
      [target]: {
        ...prev[target],
        description: newStageDescInput
      }
    }));
    setNewStageDescInput("");
    setIsAddingDescPopup(null);
  };

  // Column Drag and Drop
  const handleColumnDragStart = (e: React.DragEvent, stageName: string) => {
    e.dataTransfer.setData("text/column-stage", stageName);
  };

  const handleColumnDrop = (e: React.DragEvent, targetStageName: string) => {
    const draggedStage = e.dataTransfer.getData("text/column-stage");
    if (!draggedStage || draggedStage === targetStageName) return;
    
    const oldIndex = activeStages.indexOf(draggedStage);
    const newIndex = activeStages.indexOf(targetStageName);
    if (oldIndex === -1 || newIndex === -1) return;
    
    const updated = [...activeStages];
    updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, draggedStage);
    
    setActiveStages(updated);
  };

  // Drag deals handles
  const handleDealDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("text/deal-card-id", dealId);
  };

  const handleDealDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDealDropOnStage = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/deal-card-id");
    if (!dealId) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === targetStage) return;

    // Direct move with update probability
    setDeals((prev) => {
      const updated = prev.map((d) => {
        if (d.id === dealId) {
          const oldIndex = activeStages.indexOf(d.stage);
          const newIndex = activeStages.indexOf(targetStage);
          let prob = d.winProbability;
          if (targetStage === "Won") prob = 100;
          else if (targetStage === "Lost") prob = 0;
          else {
            prob = Math.min(
              95,
              Math.max(10, Math.floor((newIndex / (activeStages.length - 1)) * 100))
            );
          }
          const newActivity = {
            id: `act-stage-${Date.now()}`,
            date: new Date().toLocaleDateString("tr-TR"),
            title: `Aşama değişti: "${d.stage}" ➔ "${targetStage}"`,
            type: "stage_change"
          };
          const updatedStageHistory = [...(d.stageHistory || [])];
          if (!updatedStageHistory.some(h => h.stage === targetStage)) {
            updatedStageHistory.push({
              stage: targetStage,
              date: new Date().toLocaleDateString("tr-TR"),
              notes: `Aşama "${getStageTranslation(d.stage, "TR")}" üzerinden "${getStageTranslation(targetStage, "TR")}" olarak değiştirildi.`
            });
          }
          const updatedDeal = {
            ...d,
            stage: targetStage,
            winProbability: prob,
            currentStageDuration: 0,
            activities: [newActivity, ...(d.activities || [])],
            stageHistory: updatedStageHistory
          };

          // Keep currently open drawer in sync
          if (selectedDeal && selectedDeal.id === d.id) {
            setSelectedDeal(updatedDeal);
          }

          return updatedDeal;
        }
        return d;
      });
      return updated;
    });
  };

  // Open create deal modal
  const handleOpenCreateDeal = () => {
    setFormMode("create");
    setEditingDealId(null);
    setDealFormState({
      owner: "GP",
      dealName: "",
      companyName: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      pipeline: "Sales Pipeline Standard",
      stage: "Lead Identified",
      opportunityValue: 25000,
      expectedCloseDate: new Date().toLocaleDateString("tr-TR"),
      description: "",
      leadSource: "Cold Lead Discovery",
      proposalNumber: "",
      manDay: "",
      contactSubject: "",
      products: "",
      currentStageDuration: 1,
      leanMaturityLevel: "",
      leanMaturityDesc: "",
      qualityRiskLevel: "",
      qualityRiskDesc: "",
      contractDate: "",
      contractPm: "",
      contractPmTc: "",
      contractSubject: "",
      stageHistory: [
        {
          stage: "Lead Identified",
          date: new Date().toLocaleDateString("tr-TR"),
          notes: "Fırsat tanımlandı."
        }
      ]
    });
    setIsAddModalOpen(true);
  };

  const handleOpenCreateDealWithStage = (initialStage: string) => {
    setFormMode("create");
    setEditingDealId(null);
    setDealFormState({
      owner: "GP",
      dealName: "",
      companyName: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      pipeline: "Sales Pipeline Standard",
      stage: initialStage,
      opportunityValue: 25000,
      expectedCloseDate: new Date().toLocaleDateString("tr-TR"),
      description: "",
      leadSource: "Cold Lead Discovery",
      proposalNumber: "",
      manDay: "",
      contactSubject: "",
      products: "",
      currentStageDuration: 1,
      leanMaturityLevel: "",
      leanMaturityDesc: "",
      qualityRiskLevel: "",
      qualityRiskDesc: "",
      contractDate: "",
      contractPm: "",
      contractPmTc: "",
      contractSubject: "",
      stageHistory: [
        {
          stage: initialStage,
          date: new Date().toLocaleDateString("tr-TR"),
          notes: `Fırsat "${initialStage}" aşamasında tanımlandı.`
        }
      ]
    });
    setIsAddModalOpen(true);
  };

  const handleExportCSV = () => {
    try {
      if (deals.length === 0) {
        alert("Export yapacak fırsat bulunamadı!");
        return;
      }
      const headers = [
        "Deal Name",
        "Company Name",
        "Contact Person",
        "Contact Email",
        "Contact Phone",
        "Opportunity Value",
        "Expected Close Date",
        "Opportunity Score",
        "Win Probability",
        "Priority",
        "Industry",
        "Opex Score",
        "Stage",
        "Owner",
        "Pipeline",
        "Description",
        "Lead Source",
        "Proposal Number",
        "Man Day",
        "Contact Subject",
        "Products"
      ];

      const csvRows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",")];

      deals.forEach((deal) => {
        const row = [
          deal.dealName || "",
          deal.companyName || "",
          deal.contactPerson || "",
          deal.contactEmail || "",
          deal.contactPhone || "",
          String(deal.opportunityValue || 0),
          deal.expectedCloseDate || "",
          String(deal.opportunityScore || 0),
          String(deal.winProbability || 0),
          deal.priority || "Medium",
          deal.industry || "",
          String(deal.opexScore || 0),
          deal.stage || "Lead",
          deal.owner || "GP",
          deal.pipeline || "Sales Pipeline Standard",
          deal.description || "",
          deal.leadSource || "",
          deal.proposalNumber || "",
          deal.manDay || "",
          deal.contactSubject || "",
          deal.products || ""
        ];
        csvRows.push(row.map(val => `"${(val || "").replace(/"/g, '""')}"`).join(","));
      });

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `deals_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Deals CSV Export failed", err);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        // Baştaki UTF-8 BOM karakterini (dışa aktarımın eklediği) temizle,
        // yoksa ilk başlık hücresine sızıp delimiter tespitini bozabilir.
        const cleanText = text.replace(/^﻿/, "");
        const lines = cleanText.split(/\r?\n/);
        if (lines.length <= 1) {
          alert(t("CSV file is empty or only contains headers!"));
          return;
        }

        // Item: Excel'de (özellikle TR bölgesel ayarlarıyla) açılıp kaydedilen
        // CSV dosyaları virgül yerine noktalı virgül (;) ayracı kullanır — dışa
        // aktardığımız dosya virgülle üretiliyor, ama kullanıcı Excel'de açıp
        // kaydettikten sonra geri içe aktarmaya çalışınca dosya noktalı virgülle
        // geliyordu. Sabit ',' varsayımı satırları hiç bölemediği için hiçbir
        // satır "Company Name" alanına ulaşamıyor ve içe aktarım sessizce 0
        // kayıt transfer ediyordu. Artık başlık satırına bakarak ayraç otomatik
        // tespit ediliyor (hangisi daha sık geçiyorsa o kullanılıyor).
        const headerLine = lines[0];
        const semicolonCount = (headerLine.match(/;/g) || []).length;
        const commaCount = (headerLine.match(/,/g) || []).length;
        const delimiter = semicolonCount > commaCount ? ";" : ",";

        // Excel'de elle tarih girildiğinde TR bölgesel ayarları gün.ay.yıl
        // formatını kullanır (ör. 15.07.2026); uygulama ise ISO yyyy-mm-dd
        // bekliyor. İkisini de kabul edip ISO'ya normalize ediyoruz.
        const normalizeDate = (raw: string): string => {
          const v = (raw || "").trim();
          const ddmmyyyy = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
          if (ddmmyyyy) {
            const [, d, m, y] = ddmmyyyy;
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          }
          if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(v)) return v;
          return v;
        };

        const newDeals: Deal[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let c = 0; c < line.length; c++) {
            const char = line[c];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              values.push(current.trim().replace(/^"|"$/g, ''));
              current = "";
            } else {
              current += char;
            }
          }
          values.push(current.trim().replace(/^"|"$/g, ''));

          // Must have at least company name
          if (values.length > 1 && values[1]) {
            const imported: Deal = {
              id: `deal-imported-${Date.now()}-${i}`,
              dealName: values[0] || `${values[1]} Opportunity`,
              companyName: values[1],
              contactPerson: values[2] || "Unknown Client",
              contactEmail: values[3] || "",
              contactPhone: values[4] || "",
              opportunityValue: Number(values[5]) || 0,
              expectedCloseDate: values[6] ? normalizeDate(values[6]) : new Date().toISOString().split('T')[0],
              opportunityScore: Number(values[7]) || 50,
              winProbability: Number(values[8]) || 50,
              currentStageDuration: 1,
              priority: (values[9] as any) || "Medium",
              industry: values[10] || "Manufacturing",
              opexScore: Number(values[11]) || 50,
              stage: values[12] || "Lead Identified",
              owner: values[13] || "GP",
              pipeline: values[14] || "Sales Pipeline Standard",
              description: values[15] || "",
              leadSource: values[16] || "",
              proposalNumber: values[17] || "",
              manDay: values[18] || "",
              contactSubject: values[19] || "",
              products: values[20] || "",
              dealEmails: []
            };
            newDeals.push(imported);
          }
        }

        if (newDeals.length > 0) {
          setDeals((prev) => {
            const merged = [...prev, ...newDeals];
            return merged;
          });
          alert(`${newDeals.length} deals successfully imported!`);
        } else {
          alert(t("No valid rows containing a Company Name could be imported."));
        }
      } catch (err) {
        console.error("CSV import failed", err);
        alert(t("An error occurred during CSV parsing."));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleOpenEditDeal = (deal: Deal) => {
    setFormMode("edit");
    setEditingDealId(deal.id);
    setDealFormState({
      owner: deal.owner || "GP",
      dealName: deal.dealName || "",
      companyName: deal.companyName || "",
      companyId: deal.companyId || "",
      contactPerson: deal.contactPerson || "",
      contactEmail: deal.contactEmail || "",
      contactPhone: deal.contactPhone || "",
      pipeline: deal.pipeline || "Sales Pipeline Standard",
      stage: deal.stage || "Lead Identified",
      opportunityValue: deal.opportunityValue || 0,
      expectedCloseDate: deal.expectedCloseDate || "",
      description: deal.description || "",
      leadSource: deal.leadSource || "Partner Referral",
      proposalNumber: deal.proposalNumber || "",
      manDay: deal.manDay || "",
      contactSubject: deal.contactSubject || "",
      products: deal.products || "",
      currentStageDuration: deal.currentStageDuration || 1,

      // Editable OPEX Assessment details
      leanMaturityLevel: deal.leanMaturityLevel || "Seviye 2: Standardizasyon Başlangıcı",
      leanMaturityDesc: deal.leanMaturityDesc || "5S düzensiz, Kanban hat çağırma sistemi yok, hat duruş rasyonelleri kısıtlı tahlil ediliyor.",
      qualityRiskLevel: deal.qualityRiskLevel || "Orta-Yüksek Seviye Risk",
      qualityRiskDesc: deal.qualityRiskDesc || "Kötü kalite maliyeti (COPQ) tahmini yıllık cironun %4.8 seviyesinde seyrediyor.",

      // Editable Contract details
      contractDate: deal.contractDate || deal.expectedCloseDate || new Date().toISOString().split("T")[0],
      contractPm: deal.contractPm || deal.contactPerson || "Ahmet Yılmaz",
      contractPmTc: deal.contractPmTc || "12345678901",
      contractSubject: deal.contractSubject || (deal.dealName ? `${deal.dealName} Danışmanlık Hizmetleri` : `${deal.companyName} Yalın Dönüşüm Projesi`),
      stageHistory: deal.stageHistory || []
    });
    setIsAddModalOpen(true);
  };

  // Create or save opportunity
  const handleSaveOpportunityForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealFormState.companyName || !dealFormState.contactPerson) {
      alert(t("Please fill out Company Name and Contact Person of this opportunity."));
      return;
    }

    if (formMode === "edit" && editingDealId) {
      // Edit mode
      setDeals((prev) =>
        prev.map((d) => {
          if (d.id === editingDealId) {
            return {
              ...d,
              ...dealFormState,
              dealName: dealFormState.dealName || `${dealFormState.companyName} Deal`
            };
          }
          return d;
        })
      );
      // Update selected deal in drawer if matching
      if (selectedDeal?.id === editingDealId) {
        setSelectedDeal(prev => prev ? {
          ...prev,
          ...dealFormState,
          dealName: dealFormState.dealName || `${dealFormState.companyName} Deal`
        } : null);
      }
    } else {
      // Create mode
      const newD: Deal = {
        id: `deal-${Date.now()}`,
        companyId: dealFormState.companyId || undefined,
        dealName: dealFormState.dealName || `${dealFormState.companyName} Opportunity`,
        companyName: dealFormState.companyName,
        contactPerson: dealFormState.contactPerson,
        contactEmail: dealFormState.contactEmail,
        contactPhone: dealFormState.contactPhone,
        opportunityValue: Number(dealFormState.opportunityValue) || 10000,
        expectedCloseDate: dealFormState.expectedCloseDate || "18.06.2026",
        opportunityScore: 75,
        winProbability: 50,
        currentStageDuration: 1,
        priority: "Medium",
        industry: "Retail & Supply",
        opexScore: 72,
        stage: dealFormState.stage,
        owner: dealFormState.owner,
        pipeline: dealFormState.pipeline,
        description: dealFormState.description,
        leadSource: dealFormState.leadSource,
        proposalNumber: dealFormState.proposalNumber,
        manDay: dealFormState.manDay,
        contactSubject: dealFormState.contactSubject,
        products: dealFormState.products,

        // Editable OPEX Assessment details
        leanMaturityLevel: dealFormState.leanMaturityLevel || "Seviye 2: Standardizasyon Başlangıcı",
        leanMaturityDesc: dealFormState.leanMaturityDesc || "5S düzensiz, Kanban hat çağırma sistemi yok, hat duruş rasyonelleri kısıtlı tahlil ediliyor.",
        qualityRiskLevel: dealFormState.qualityRiskLevel || "Orta-Yüksek Seviye Risk",
        qualityRiskDesc: dealFormState.qualityRiskDesc || "Kötü kalite maliyeti (COPQ) tahmini yıllık cironun %4.8 seviyesinde seyrediyor.",

        // Editable Contract details
        contractDate: dealFormState.contractDate || dealFormState.expectedCloseDate || new Date().toISOString().split("T")[0],
        contractPm: dealFormState.contractPm || dealFormState.contactPerson || "Ahmet Yılmaz",
        contractPmTc: dealFormState.contractPmTc || "12345678901",
        contractSubject: dealFormState.contractSubject || (dealFormState.dealName ? `${dealFormState.dealName} Danışmanlık Hizmetleri` : `${dealFormState.companyName} Yalın Dönüşüm Projesi`),

        dealEmails: [],
        activities: [{ id: `act-${Date.now()}`, date: new Date().toLocaleDateString("tr-TR"), title: "Fırsat Oluşturuldu", type: "system" }],
        stageHistory: dealFormState.stageHistory && dealFormState.stageHistory.length > 0
          ? dealFormState.stageHistory
          : [
              {
                stage: dealFormState.stage,
                date: new Date().toLocaleDateString("tr-TR"),
                notes: "Fırsat tanımlandı."
              }
            ]
      };
      setDeals((prev) => [...prev, newD]);
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteStage = (stageName: string) => {
    setIsDeletingStagePopup(stageName);
    const otherStages = activeStages.filter(s => s !== stageName);
    if (otherStages.length > 0) {
      setDeleteStageTargetMigration(otherStages[0]);
    } else {
      setDeleteStageTargetMigration("");
    }
  };

  const handleConfirmDeleteStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDeletingStagePopup) return;
    const stageToDelete = isDeletingStagePopup;

    // 1. Filter out the deleted stage from activeStages
    setActiveStages(prev => prev.filter(s => s !== stageToDelete));

    // 2. Migrate any deals associated with this stage
    const stageDealsCount = deals.filter(d => d.stage === stageToDelete).length;
    if (stageDealsCount > 0 && deleteStageTargetMigration) {
      setDeals(prev => prev.map(d => d.stage === stageToDelete ? { ...d, stage: deleteStageTargetMigration } : d));
    }

    // 3. Clean up metadata
    setStageMetadata(prev => {
      const updated = { ...prev };
      delete updated[stageToDelete];
      return updated;
    });

    setIsDeletingStagePopup(null);
  };

  const handleRenameStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRenamingStagePopup) return;
    const oldName = isRenamingStagePopup;
    const newName = renameStageInput.trim();
    if (!newName) return;
    if (activeStages.includes(newName) && newName !== oldName) {
      alert("Bu aşama adı zaten mevcut!");
      return;
    }

    // 1. Update activeStages
    setActiveStages(prev => prev.map(s => s === oldName ? newName : s));

    // 2. Update stageMetadata key
    setStageMetadata(prev => {
      const updated = { ...prev };
      if (updated[oldName]) {
        updated[newName] = updated[oldName];
        delete updated[oldName];
      } else {
        updated[newName] = { collapsed: false, description: "" };
      }
      return updated;
    });

    // 3. Update all deals that were in the old stage
    setDeals(prev => prev.map(d => d.stage === oldName ? { ...d, stage: newName } : d));

    // 4. Update dealFormState.stage if it matched old stage
    if (dealFormState.stage === oldName) {
      setDealFormState(prev => ({ ...prev, stage: newName }));
    }

    setIsRenamingStagePopup(null);
    setRenameStageInput("");
  };

  const toggleCollapseStage = (stageName: string) => {
    setStageMetadata(prev => ({
       ...prev,
      [stageName]: {
        ...(prev[stageName] || { collapsed: false, description: "" }),
        collapsed: !prev[stageName]?.collapsed
      }
    }));
  };

  const handleOpenReminderMailbox = (deal: Deal) => {
    setReminderSelectedDeal(deal);
    setReminderClientType("mailto");
    setIsReminderMailboxOpen(true);
    
    // Choose initial template mode based on days in stage
    const mode = (deal.currentStageDuration >= 20) ? "20_day" : "7_day";
    setReminderTemplateMode(mode);
    
    // Build initial subject & body
    const person = deal.contactPerson || "Yetkili";
    const company = deal.companyName || "Firma";
    const dName = deal.dealName || `${company} Projesi`;
    const duration = deal.currentStageDuration || 7;
    
    let subject = "";
    let body = "";
    
    if (mode === "7_day") {
      subject = `Gemba Partner: ${company} - Teklif Durum Değerlendirmesi`;
      body = `Sayın ${person},\n\n${company} firması için "${dName}" kapsamında sunduğumuz teklifimizin üzerinden ${duration} gün geçmiş bulunmaktadır. Yalın üretim süreçlerinizi optimize etmek adına sunduğumuz bu çalışmayla ilgili teknik ya da ticari bir sorunuz olması durumunda dilediğiniz vakit yardımcı olabiliriz.\n\nSüreçle ilgili güncel değerlendirmelerinizi paylaşabilirseniz seviniriz.\n\nSaygılarımızla,\nGemba Partner Ekibi`;
    } else {
      subject = `Gemba Partner: ${company} - Teklif Süreç Takibi (Önemli)`;
      body = `Sayın ${person},\n\n${company} firması için "${dName}" kapsamında hazırladığımız teklif sürecinin üzerinden ${duration} gün geçmiştir.\n\nSöz konusu projenin son durumu, bütçe onayı ve planlama takvimi hususunda güncel bir değerlendirme yapma şansınız oldu mu?\n\nKarşılıklı değer akış haritalama ve verimlilik odaklı bu projeye başlamaktan büyük memnuniyet duyacağız. Konuya dair son gelişmelerle ilgili geri bildiriminizi rica eder, iyi çalışmalar dileriz.\n\nSaygılarımızla,\nGemba Partner Ekibi`;
    }
    
    setReminderMailSubject(subject);
    setReminderMailBody(body);
  };

  const handleSelectCustomTemplate = (temp: { subject: string; body: string }) => {
    if (!reminderSelectedDeal) return;
    const deal = reminderSelectedDeal;
    const person = deal.contactPerson || "Yetkili";
    const company = deal.companyName || "Firma";
    const dName = deal.dealName || `${company} Projesi`;
    const managerStr = deal.owner || "Gemba Partner Ekibi";

    let subject = temp.subject
      .replace(/{{FirmaAdı}}/g, company)
      .replace(/{{Projeİçeriği}}/g, dName)
      .replace(/{{İlgiliKişi}}/g, person)
      .replace(/{{Yönetici}}/g, managerStr);

    let body = temp.body
      .replace(/{{FirmaAdı}}/g, company)
      .replace(/{{Projeİçeriği}}/g, dName)
      .replace(/{{İlgiliKişi}}/g, person)
      .replace(/{{Yönetici}}/g, managerStr);

    setReminderMailSubject(subject);
    setReminderMailBody(body);
  };

  const handleSendReminderMail = () => {
    if (!reminderSelectedDeal) return;

    const isSimulatedError = CrmDb.getKv<string>("crm_simulate_email_error", "false") === "true";
    if (isSimulatedError) {
      setEmailSendError({
        code: "ERR_REMINDER_CONN_FAILED_503",
        message: "E-Posta Entegrasyon & Token Eşleşme Hatası (503 Service Unavailable)",
        diagnostics: "SMTP handshake failed. The mail system was unable to establish a secure TLS handshake with the mail gateway.\nHost: mail.gembapartner.com\nPort: 587\nDetail: SMTP authentication failed because the Microsoft/Google API Token is invalid or expired. Resubmit OAuth verification in Settings > Admin Center."
      });
      return;
    }
    setEmailSendError(null);

    const toEmail = reminderSelectedDeal.contactEmail || "client@company.com";
    const encodedSubject = encodeURIComponent(reminderMailSubject);
    const encodedBody = encodeURIComponent(reminderMailBody);
    let finalLink = "";

    if (reminderClientType === "mailto") {
      finalLink = `mailto:${toEmail}?subject=${encodedSubject}&body=${encodedBody}`;
    } else if (reminderClientType === "gmail") {
      finalLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${toEmail}&su=${encodedSubject}&body=${encodedBody}`;
    } else if (reminderClientType === "outlook") {
      finalLink = `https://outlook.live.com/mail/0/deeplink/compose?to=${toEmail}&subject=${encodedSubject}&body=${encodedBody}`;
    } else if (reminderClientType === "outlook-corp") {
      finalLink = `https://outlook.office.com/mail/deeplink/compose?to=${toEmail}&subject=${encodedSubject}&body=${encodedBody}`;
    }

    // Try copying body to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(reminderMailBody);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = reminderMailBody;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    } catch (e) {
      // ignore clipboard error
    }

    // Open mail client
    if (reminderClientType === "mailto") {
      const anchor = document.createElement("a");
      anchor.href = finalLink;
      anchor.target = "_self";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } else {
      window.open(finalLink, "_blank");
    }

    // Save reminder audit log to the deal activities list
    const updatedDeals = deals.map(d => {
      if (d.id === reminderSelectedDeal.id) {
        const newActivity = {
          id: `act-${Date.now()}`,
          date: new Date().toLocaleDateString("tr-TR"),
          title: `Hatırlatma Maili Gönderildi (${reminderTemplateMode === "7_day" ? "7. Gün" : reminderTemplateMode === "20_day" ? "20. Gün" : "Özel Şablon"})`,
          type: "email"
        };
        return {
          ...d,
          activities: [newActivity, ...(d.activities || [])]
        };
      }
      return d;
    });

    setDeals(updatedDeals);
    
    setIsReminderMailboxOpen(false);
    alert("Hatırlatma e-postası başarıyla hazırlandı ve mail uygulamasında açıldı!");
  };

  // Sending Email logs inside Active deal (Formulated to open mail client links correctly & copy to clipboard!)
  const handleSendComposeEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeal) return;
    if (!emailComposeTo) {
      alert("Alıcı adresi boş olamaz.");
      return;
    }
    if (!emailComposeBody || !emailComposeSubject) {
      alert("Konu başlığı ve mesaj gövdesi boş bırakılamaz.");
      return;
    }

    const isSimulatedError = CrmDb.getKv<string>("crm_simulate_email_error", "false") === "true";
    if (isSimulatedError) {
      setEmailSendError({
        code: "ERR_MAIL_OAUTH_TOKEN_EXPIRED_401",
        message: "API Entegrasyon & Token Eşleşme Hatası (401 Unauthorized)",
        diagnostics: "OAuth2 authentication failed. The system could not handshake with the mail server because the registered client token is expired, corrupted, or was revoked in Microsoft Azure / Google Cloud console.\nHost endpoint: https://graph.microsoft.com/v1.0/me/sendMail\nRequested Scopes: Mail.Send, Mail.ReadWrite\nError Code: OAUTH_TOKEN_EXPIRED_401"
      });
      return;
    }
    setEmailSendError(null);

    const targetRecipient = emailComposeTo.trim();
    const finalBodyText = emailComposeBcc.trim() 
      ? `[Gizli Alıcı (Bcc): ${emailComposeBcc.trim()}]\n\n${emailComposeBody}`
      : emailComposeBody;

    const newMail = {
      id: `mail-sent-${Date.now()}`,
      sender: "Gemba Partner (GP) Admin",
      recipient: targetRecipient,
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
      subject: emailComposeSubject,
      body: finalBodyText,
      attachments: emailComposeFile ? [emailComposeFile] : undefined
    };

    // FORMULATE AND LAUNCH EMAIL CLIENT
    const encodedTo = encodeURIComponent(targetRecipient);
    const encodedBcc = encodeURIComponent(emailComposeBcc.trim());
    const encodedSubject = encodeURIComponent(emailComposeSubject);
    const encodedBody = encodeURIComponent(emailComposeBody);

    let finalLink = `mailto:${targetRecipient}?bcc=${encodedBcc}&subject=${encodedSubject}&body=${encodedBody}`;
    
    if (emailClientMode === "gmail") {
      finalLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&bcc=${encodedBcc}&su=${encodedSubject}&body=${encodedBody}`;
    } else if (emailClientMode === "outlook") {
      finalLink = `https://outlook.live.com/default.aspx?rru=compose&to=${encodedTo}&bcc=${encodedBcc}&subject=${encodedSubject}&body=${encodedBody}`;
    }

    try {
      // Copy formatted text to clipboard to assist the user
      const textToCopy = `To: ${targetRecipient}\nBcc: ${emailComposeBcc.trim()}\nSubject: ${emailComposeSubject}\n\n${emailComposeBody}`;
      navigator.clipboard.writeText(textToCopy)
        .then(() => console.log("Mail content copied to clipboard!"))
        .catch(() => {});

      // Launch compiled link in tab or system trigger
      if (emailClientMode === "mailto") {
        const anchor = document.createElement("a");
        anchor.href = finalLink;
        anchor.target = "_self";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } else {
        window.open(finalLink, "_blank");
      }
    } catch (err) {
      console.warn("Failed launching external tab helper, using direct windows open", err);
      window.open(finalLink, "_blank");
    }

    // Save outbound record locally
    setDeals(prev =>
      prev.map(d => {
        if (d.id === selectedDeal.id) {
          const emails = d.dealEmails || [];
          return {
            ...d,
            dealEmails: [...emails, newMail]
          };
        }
        return d;
      })
    );

    // Update active drawer selected deal
    setSelectedDeal(prev => {
      if (!prev) return null;
      return {
        ...prev,
        dealEmails: [...(prev.dealEmails || []), newMail]
      };
    });

    // Reset composer input states
    setEmailComposeSubject("");
    setEmailComposeBody("");
    setEmailComposeBcc("");
    setEmailComposeFile("");

    // Setup interactive automated reply after 1.5 seconds!
    setTimeout(() => {
      const incomingReply = {
        id: `mail-reply-${Date.now()}`,
        sender: selectedDeal.contactPerson,
        recipient: "Gemba Partner (GP) Admin",
        date: new Date().toISOString().replace("T", " ").substring(0, 16),
        subject: `Re: ${newMail.subject}`,
        body: `Hello Admin, We appreciate your mail regarding our discussion on "${newMail.subject}". Our engineering plant review board will evaluate the assessment criteria. Let's schedule another status meeting for next Tuesday. Regards.`,
        isIncoming: true
      };

      setDeals(prev =>
        prev.map(d => {
          if (d.id === selectedDeal.id) {
            const emails = d.dealEmails || [];
            return {
              ...d,
              dealEmails: [...emails, incomingReply]
            };
          }
          return d;
        })
      );

      setSelectedDeal(prev => {
        if (!prev) return null;
        if (prev.id === selectedDeal.id) {
          return {
            ...prev,
            dealEmails: [...(prev.dealEmails || []), incomingReply]
          };
        }
        return prev;
      });
    }, 1500);
  };

  const getCardBgColor = (prob: number) => {
    if (prob >= 75) return "border-l-4 border-l-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/45 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20";
    if (prob >= 40) return "border-l-4 border-l-amber-500 bg-amber-50/20 hover:bg-amber-50/45 dark:bg-amber-950/15 dark:hover:bg-amber-950/25";
    return "border-l-4 border-l-rose-500 bg-rose-50/10 hover:bg-rose-50/20 dark:bg-rose-950/10 dark:hover:bg-rose-950/20";
  };

  // Simple statistics
  const calculateMetrics = () => {
    const activeDeals = deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost");
    const wonDeals = deals.filter((d) => d.stage === "Won");
    const valTotal = activeDeals.reduce((sum, d) => sum + d.opportunityValue, 0);
    const forecastVal = activeDeals.reduce((sum, d) => sum + d.opportunityValue * (d.winProbability / 100), 0) +
                        wonDeals.reduce((sum, d) => sum + d.opportunityValue, 0);

    return {
      pipelineValue: valTotal,
      forecastValue: forecastVal,
      activeCount: activeDeals.length,
      wonCount: wonDeals.length
    };
  };

  const stats = calculateMetrics();

  const filteredDeals = deals.filter((d) => {
    const matchesSearch = d.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.dealName && d.dealName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPriority = priorityFilter === "All" || d.priority === priorityFilter;
    
    // Gecikme Takibi filtresi
    let matchesDelay = true;
    if (delayFilter === "7_plus") {
      matchesDelay = d.stage === "Proposal Submitted" && (d.currentStageDuration || 0) >= 7;
    } else if (delayFilter === "20_plus") {
      matchesDelay = d.stage === "Proposal Submitted" && (d.currentStageDuration || 0) >= 20;
    } else if (delayFilter === "delayed") {
      matchesDelay = d.stage === "Proposal Submitted" && (d.currentStageDuration || 0) >= 7;
    }

    return matchesSearch && matchesPriority && matchesDelay;
  }).sort((a, b) => {
    if (sortBy === "value") return b.opportunityValue - a.opportunityValue;
    if (sortBy === "closeDate") return new Date(a.expectedCloseDate).getTime() - new Date(b.expectedCloseDate).getTime();
    if (sortBy === "score") return b.opportunityScore - a.opportunityScore;
    if (sortBy === "probability") return b.winProbability - a.winProbability;
    if (sortBy === "proposalNumber") {
      const pA = a.proposalNumber || "";
      const pB = b.proposalNumber || "";
      return pA.localeCompare(pB, "tr-TR", { numeric: true });
    }
    return 0;
  });

  // Item 4: liste görünümü — tümünü seç / tek satır seç / toplu sil
  const handleSelectAllDeals = (checked: boolean) => {
    setSelectedDealIds(checked ? filteredDeals.map((d) => d.id) : []);
  };
  const handleSelectDealRow = (id: string, checked: boolean) => {
    setSelectedDealIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };
  const handleBulkDeleteDeals = () => {
    if (selectedDealIds.length === 0) return;
    setConfirmDeleteModal({
      isOpen: true,
      title: "Seçili Fırsatlar Silinecek",
      message: `${selectedDealIds.length} fırsat kaydı geri dönüşüm kutusuna taşınsın mı?`,
      onConfirm: () => {
        setDeals((prev) => prev.filter((d) => !selectedDealIds.includes(d.id)));
        setSelectedDealIds([]);
      }
    });
  };

  // Switcher UI
  return (
    <div className="space-y-6">
      
      {/* Dynamic Navigation Sub-Bar under Deal Management */}
      {initialTab !== "dashboard" && (
        <div className="bg-slate-50 dark:bg-[#121212] p-1.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 select-none">
            <button
              type="button"
              onClick={() => setActiveModuleTab("dashboard")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeModuleTab === "dashboard"
                  ? "bg-white dark:bg-zinc-850 text-[#0078D4] shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"
              }`}
            >
              <BarChart2 className="w-4 h-4 text-[#0078D4]" />
              <span>{t("Sales Dashboard")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModuleTab("board")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeModuleTab === "board"
                  ? "bg-white dark:bg-zinc-850 text-green-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"
              }`}
            >
              <Columns className="w-4 h-4 text-green-500" />
              <span>{t("Operational Kanban Board")}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigateToTab) {
                  onNavigateToTab("companies-registry");
                } else {
                  window.dispatchEvent(new CustomEvent("crm-navigate", { detail: { tab: "companies-registry" } }));
                }
              }}
              className="px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-700 dark:text-zinc-400"
            >
              <Building className="w-4 h-4 text-green-500" />
              <span>{t("Companies Registry")}</span>
            </button>
          </div>

          {(activeModuleTab === "board" || activeModuleTab === "dashboard") && (
            <div className="mr-2 hidden md:block">
              <span className="text-[10px] bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 font-mono font-bold px-2 py-1 rounded">
                {t("Active CRM pipeline: Sales Pipeline Standard")}
              </span>
            </div>
          )}
        </div>
      )}

      {activeModuleTab === "dashboard" ? (
        <SalesDashboardView
          deals={deals}
          onSelectDeal={(deal) => {
            setSelectedDeal(deal);
            setActiveDrawerTab("Overview");
            if (initialTab !== "dashboard") {
              setActiveModuleTab("board");
            }
          }}
        />
      ) : (
        <div className="space-y-6">
          
          {/* Active stats top banner */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
            <div className="bg-white dark:bg-[#151515] p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">
                {t("ACTIVE PIPELINE VALUE")}
              </span>
              <div className="text-xl font-bold text-slate-800 dark:text-zinc-100 mt-1">{getSystemCurrency().symbol}{stats.pipelineValue.toLocaleString()}</div>
              <span className="text-[9px] text-zinc-400 font-mono mt-0.5">
                {t("Sum of {count} open deals").replace("{count}", String(stats.activeCount))}
              </span>
            </div>

            <div className="bg-white dark:bg-[#151515] p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">
                {t("WEIGHTED REVENUE FORECAST")}
              </span>
              <div className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{getSystemCurrency().symbol}{Math.floor(stats.forecastValue).toLocaleString()}</div>
              <span className="text-[9px] text-zinc-400 font-mono mt-0.5">
                {t("Adjusted by win probabilities")}
              </span>
            </div>

            <div className="bg-white dark:bg-[#151515] p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">
                {t("CLOSED WON TO DATE")}
              </span>
              <div className="text-xl font-bold text-green-655 dark:text-green-500 mt-1">
                {t("{count} won contracts").replace("{count}", String(stats.wonCount))}
              </div>
              <span className="text-[9px] text-zinc-400 font-mono mt-0.5">
                {t("Synced automatically to registry")}
              </span>
            </div>

            <div className="bg-white dark:bg-[#151515] p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">
                {t("CRM STAGE MILESTONES")}
              </span>
              <div className="text-xl font-bold text-indigo-500 mt-1">
                {t("{count} phases").replace("{count}", String(activeStages.length))}
              </div>
              <span className="text-[9px] text-zinc-400 font-mono mt-0.5">
                {t("Drag & drop to reorder columns")}
              </span>
            </div>
          </div>

          {/* Controls Bar for Deal board */}
          <div className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={t("Search deals, company names, contacts...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-green-655 focus:ring-1 focus:ring-green-650 w-64 font-sans"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs select-none">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-transparent border-none text-[11px] font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="All">{t("All Priorities")}</option>
                  <option value="High">🔴 {t("High")}</option>
                  <option value="Medium">🟡 {t("Medium")}</option>
                  <option value="Low">⚪ {t("Low")}</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-amber-500/10 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900/65 rounded-lg px-2.5 py-1.5 text-xs select-none">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={delayFilter}
                  onChange={(e) => setDelayFilter(e.target.value as any)}
                  className="bg-transparent border-none text-[11px] font-extrabold text-amber-800 dark:text-amber-450 focus:outline-none cursor-pointer"
                >
                  <option value="All">{t("⏱️ Delay Track: All")}</option>
                  <option value="7_plus">{t("⚠️ Pending Reminder (7+ Days)")}</option>
                  <option value="20_plus">{t("🚨 Critical Reminder (20+ Days)")}</option>
                  <option value="delayed">{t("⏳ All Delayed Proposals (7+ Days)")}</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs select-none">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent border-none text-[11px] font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="value">{t("Sort: Amount")}</option>
                  <option value="closeDate">{t("Sort: Close Date")}</option>
                  <option value="score">{t("Sort: Score")}</option>
                  <option value="probability">{t("Sort: Probability")}</option>
                  <option value="proposalNumber">{t("Sort: Quotation No")}</option>
                </select>
              </div>

              {/* View Toggle Option Icons */}
              <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg p-0.5 select-none">
                <button
                  type="button"
                  onClick={() => setDealViewStyle("kanban")}
                  className={`p-1 px-2 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    dealViewStyle === "kanban"
                      ? "bg-white dark:bg-zinc-700 text-green-655 dark:text-green-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"
                  }`}
                  title={t("Show Kanban Column Board")}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("Board")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDealViewStyle("list")}
                  className={`p-1 px-2 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    dealViewStyle === "list"
                      ? "bg-white dark:bg-zinc-700 text-green-655 dark:text-green-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"
                  }`}
                  title={t("Show Table List")}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("List")}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {/* Import / Export Deal list */}
              <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-zinc-800 pr-2 mr-1">
                <label className="p-1.5 px-2.5 bg-white dark:bg-[#202020] border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700/60 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs" title={t("Import deal list from Excel/CSV (.csv)")}>
                  <Upload className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span className="hidden sm:inline">İçe Aktar</span>
                  <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="p-1.5 px-2.5 bg-[#14b15b] hover:bg-[#129a4f] border border-[#14b15b] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  title={t("Export deal list as CSV")}
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">Dışa Aktar</span>
                  <span className="sm:hidden">.CSV</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingNewStagePopup(true)}
                className="px-3.5 py-1.5 border border-slate-205 dark:border-zinc-850 rounded-lg text-xs font-bold text-slate-655 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1 cursor-pointer transition-all shadow-sm"
              >
                <PlusCircle className="w-4 h-4 text-green-600" />
                <span>{t("+ Custom Stage")}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreateDeal}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all animate-none"
              >
                <Plus className="w-4 h-4" />
                <span>{t("+ Deal")}</span>
              </button>
            </div>
          </div>

          {/* Active delay filter warning banner */}
          {delayFilter !== "All" && (
            <div className="bg-amber-500/10 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shadow-xs mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-amber-500/15 rounded-lg text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 font-sans">
                    Filtre Uygulandı: Gecikme Takibi ({delayFilter === "7_plus" ? "7+ Gün Gecikenler" : delayFilter === "20_plus" ? "20+ Gün Kritik Gecikenler" : "Tüm Geciken Teklifler"})
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                    Sadece "Teklif Gönderildi" (Proposal Submitted) aşamasındaki, belirtilen gün süresini aşmış olan fırsatları görüntülüyorsunuz.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDelayFilter("All")}
                className="px-3 py-1 bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-zinc-700 transition-colors uppercase text-slate-700 dark:text-zinc-350 cursor-pointer w-fit"
              >
                Tüm Fırsatları Göster
              </button>
            </div>
          )}

          {dealViewStyle === "list" ? (
            /* BEAUTIFUL TABLE LIST VIEW */
            <div className="bg-white dark:bg-[#151515] rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-sm overflow-hidden select-none">
              {/* Item 4: Toplu Seçim / Toplu Sil araç çubuğu */}
              {selectedDealIds.length > 0 && (
                <div className="flex items-center justify-between gap-3 px-4 py-2 bg-rose-50/60 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/40">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                    {selectedDealIds.length} {t("Deals Selected")}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDealIds([])}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {t("Clear")}
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDeleteDeals}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t("Delete Selected")}
                    </button>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 text-[10px] uppercase tracking-wider font-mono font-bold text-slate-400 select-none">
                      <th className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedDealIds.length === filteredDeals.length && filteredDeals.length > 0}
                          onChange={(e) => handleSelectAllDeals(e.target.checked)}
                          className="rounded cursor-pointer"
                        />
                      </th>
                      <th className="p-4">{t("Deal")}</th>
                      <th className="p-4">{t("Company")}</th>
                      <th className="p-4">{t("Quotation No")}</th>
                      <th className="p-4">{t("Amount")}</th>
                      <th className="p-4">{t("Status & Score")}</th>
                      <th className="p-4">{t("Milestone Stage")}</th>
                      <th className="p-4">{t("Priority")}</th>
                      <th className="p-4">{t("Close Date")}</th>
                      <th className="p-4 text-right">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                    {filteredDeals.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-12 text-center text-slate-400 dark:text-zinc-500 font-sans">
                          {t("No deals found matching current filters.")}
                        </td>
                      </tr>
                    ) : (
                      filteredDeals.map((deal) => (
                        <tr
                          key={deal.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedDeal(deal);
                            setActiveDrawerTab("Overview");
                          }}
                        >
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedDealIds.includes(deal.id)}
                              onChange={(e) => handleSelectDealRow(deal.id, e.target.checked)}
                              className="rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-xs text-green-700 dark:text-green-400">
                              {deal.dealName || `${deal.companyName} Project`}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-sans mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>👤 {deal.contactPerson} {deal.industry ? `(${deal.industry})` : ''}</span>
                            </div>
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <span
                              onClick={(e) => handleCompanyClick(e, deal.companyName, deal.companyId)}
                              className="font-bold text-xs text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                              title={t("Go to Company Detail")}
                            >
                              🏢 {deal.companyName}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-xs text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 font-mono">
                              {deal.proposalNumber ? (
                                <>
                                  <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">📄</span>
                                  <span>{deal.proposalNumber}</span>
                                </>
                              ) : (
                                <span className="text-slate-455 italic font-sans font-normal">—</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {t("Duration")}: <span className="text-blue-500 font-bold">{deal.manDay || "—"} {t("Days")}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-xs text-slate-800 dark:text-zinc-200">
                              {getSystemCurrency().symbol}{(deal.opportunityValue || 0).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Opex Score: <span className="text-orange-500 font-bold">{deal.opexScore}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700 dark:text-zinc-205">{deal.winProbability}% {t("Win")}</span>
                              <div className="w-16 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500"
                                  style={{ width: `${deal.winProbability}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-sans mt-1">
                              {t("Opportunity Score")}: <span className="text-green-600 font-bold">#{deal.opportunityScore}</span>
                            </div>
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={deal.stage}
                              onChange={(e) => {
                                const newStage = e.target.value;
                                if (newStage === deal.stage) return;
                                setDeals((prev) => {
                                  const updated = prev.map((d) => {
                                    if (d.id === deal.id) {
                                      const newActivity = {
                                        id: `act-stage-${Date.now()}`,
                                        date: new Date().toLocaleDateString("tr-TR"),
                                        title: `Aşama değişti: "${d.stage}" ➔ "${newStage}"`,
                                        type: "stage_change"
                                      };
                                      const updatedStageHistory = [...(d.stageHistory || [])];
                                      if (!updatedStageHistory.some(h => h.stage === newStage)) {
                                        updatedStageHistory.push({
                                          stage: newStage,
                                          date: new Date().toLocaleDateString("tr-TR"),
                                          notes: `Aşama "${getStageTranslation(d.stage, "TR")}" üzerinden "${getStageTranslation(newStage, "TR")}" olarak değiştirildi.`
                                        });
                                      }
                                      const updatedDeal = {
                                        ...d,
                                        stage: newStage,
                                        currentStageDuration: 0,
                                        activities: [newActivity, ...(d.activities || [])],
                                        stageHistory: updatedStageHistory
                                      };
                                      if (selectedDeal && selectedDeal.id === d.id) {
                                        setSelectedDeal(updatedDeal);
                                      }
                                      return updatedDeal;
                                    }
                                    return d;
                                  });
                                  return updated;
                                });
                              }}
                              className="bg-slate-55/70 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-green-600 cursor-pointer"
                            >
                              {activeStages.map((st) => (
                                <option key={st} value={st}>
                                  {getStageTranslation(st, lang)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-4">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              deal.priority === "High"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                : deal.priority === "Medium"
                                ? "bg-amber-100 text-amber-850 dark:bg-amber-955/40 dark:text-amber-405"
                                : "bg-slate-105 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}>
                              {deal.priority === "High" ? (t("HIGH")) : deal.priority === "Medium" ? (t("MEDIUM")) : (t("LOW"))}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                            {deal.expectedCloseDate}
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeal(deal);
                                  setActiveDrawerTab("Overview");
                                }}
                                className="p-1.5 text-slate-400 hover:text-green-600 rounded hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                                title={t("Open detailed drawer view")}
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditDeal(deal)}
                                className="p-1.5 text-slate-400 hover:text-green-650 rounded hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                                title={t("Edit Opportunity Details")}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteModal({
                                    isOpen: true,
                                    title: "Fırsat Kaydı Silinecek",
                                    message: "Geri dönüşüm kutusuna taşınsın mı?",
                                    onConfirm: () => {
                                      setDeals(prev => {
                                        const updated = prev.filter(p => p.id !== deal.id);
                                        return updated;
                                      });
                                    }
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                                title={t("Delete")}
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
            </div>
          ) : (
            /* Dynamic Drag-and-Drop Kanban Board Stages */
            <div className="overflow-x-auto pb-4 select-none">
              <div className="flex gap-5 items-stretch min-h-[550px]">
                {activeStages.map((stage, idx) => {
                  const isCollapsed = stageMetadata[stage]?.collapsed || false;
                  const descText = stageMetadata[stage]?.description || "";
                  
                  // If collapsed, display narrow column
                  if (isCollapsed) {
                    return (
                      <div
                        key={stage}
                        className="w-14 min-w-[56px] bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-2 select-none flex flex-col items-center justify-between transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => toggleCollapseStage(stage)}
                          className="text-[10px] text-slate-450 hover:text-slate-600 dark:text-zinc-550 dark:hover:text-zinc-330 cursor-pointer font-bold p-1 bg-white dark:bg-zinc-800 rounded-full border shadow-sm"
                          title={t("Expand milestone stage view")}
                        >
                          ↔️
                        </button>

                        <div className="flex-1 flex items-center justify-center py-6 w-full">
                          <span
                            className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap rotate-90 block"
                            style={{ transformOrigin: "center center" }}
                          >
                            {getStageTranslation(stage, lang)} ({filteredDeals.filter(d => d.stage === stage).length})
                          </span>
                        </div>
                        
                        <span className="text-[10px] font-bold text-green-600">●</span>
                      </div>
                    );
                  }

                  const stageDeals = filteredDeals.filter((d) => d.stage === stage);
                  const stageCount = stageDeals.length;
                  const stageValueSum = stageDeals.reduce((sum, d) => sum + d.opportunityValue, 0);

                  const activeDealCardCount = filteredDeals.filter(d => d.stage === stage).length;

                  return (
                    <div
                      key={stage}
                      draggable
                      onDragStart={(e) => handleColumnDragStart(e, stage)}
                      onDragOver={handleDealDragOver}
                      onDrop={(e) => {
                        // Check what is being dropped
                        if (e.dataTransfer.types.includes("text/column-stage")) {
                          handleColumnDrop(e, stage);
                        } else {
                          handleDealDropOnStage(e, stage);
                        }
                      }}
                      className="w-88 min-w-[352px] bg-slate-50/55 dark:bg-black/15 border border-slate-210/40 dark:border-zinc-802/50 rounded-2xl p-4.5 flex flex-col justify-between select-none group/col hover:shadow-sm transition-all"
                    >
                      <div>
                        {/* Drag handle column top */}
                        <div className="flex items-center justify-between cursor-move mb-1 group-hover/col:bg-slate-100/50 dark:group-hover/col:bg-zinc-900/30 p-1 rounded-lg transition-all">
                          <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                            <span className="text-[13px] font-black text-slate-700 dark:text-zinc-200 uppercase tracking-tight truncate">
                              {getStageTranslation(stage, lang)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-zinc-850 dark:text-zinc-400 px-1.5 py-0.5 rounded-full select-none shrink-0">
                              {stageCount}
                            </span>
                          </div>

                          {/* Stage Option Click Dropdown Selector */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveStageMenu(activeStageMenu === stage ? null : stage);
                              }}
                              className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded transition-colors text-slate-400 hover:text-slate-655 cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            
                            {activeStageMenu === stage && (
                              <>
                                {/* Backdrop to dismiss */}
                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveStageMenu(null); }} />
                                
                                {/* Dropdown Container - Float on top of all boards */}
                                <div className="absolute right-0 top-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 w-48 z-50 text-left animate-in fade-in duration-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      toggleCollapseStage(stage);
                                      setActiveStageMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>{t("Collapse Stage")}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAddingDescPopup({ stage });
                                      setNewStageDescInput(descText);
                                      setActiveStageMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>{t("Add/Edit Description")}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const stName = prompt(t("Add new stage name adjacent to this:"));
                                      if (stName) {
                                        const updated = [...activeStages];
                                        updated.splice(idx + 1, 0, stName);
                                        setActiveStages(updated);
                                        setStageMetadata(p => ({ ...p, [stName]: { collapsed: false, description: "Milestone" } }));
                                      }
                                      setActiveStageMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>{t("Add Adjacent Stage")}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsRenamingStagePopup(stage);
                                      setRenameStageInput(stage);
                                      setActiveStageMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-[#0078D4] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 flex items-center gap-1.5 cursor-pointer font-bold"
                                  >
                                    <span>✏️ {t("Rename Stage")}</span>
                                  </button>
                                  <div className="border-t my-1 dark:border-zinc-800"></div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteStage(stage);
                                      setActiveStageMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>{t("Delete Stage")}</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Display stage description below title */}
                        {descText && (
                          <p className="text-[10px] text-slate-450 dark:text-zinc-500 font-sans leading-tight mt-0.5 mb-2 px-1">
                            {getStageDescTranslation(stage, lang, descText)}
                          </p>
                        )}

                        <div className="w-full h-1 bg-slate-300/40 dark:bg-zinc-800/50 rounded-full mb-3.5 mt-1.5"></div>

                        {/* Hover-triggered Yeni Fırsat Ekle */}
                        <div className="opacity-0 group-hover/col:opacity-100 max-h-0 group-hover/col:max-h-14 transition-all duration-300 overflow-hidden mb-3 px-0.5">
                          <button
                            type="button"
                            onClick={() => handleOpenCreateDealWithStage(stage)}
                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-sans font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-green-700/10 active:scale-95 animate-fade-in"
                            title={t("Add Opportunity ({stage})").replace("{stage}", getStageTranslation(stage, lang))}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{t("Add Opportunity")}</span>
                          </button>
                        </div>

                        {/* Opportunity Cards loop */}
                        <div className="space-y-3.5 overflow-y-auto max-h-[640px]">
                          {stageDeals.length === 0 ? (
                            <div className="h-28 border border-dashed border-slate-200 dark:border-zinc-800/40 rounded-xl flex items-center justify-center text-center p-4">
                              <span className="text-[9px] text-slate-350 font-mono">
                                {t("Move deals here")}
                              </span>
                            </div>
                          ) : (
                            stageDeals.map((deal) => {
                              return (
                                <div
                                  key={deal.id}
                                  draggable
                                  onDragStart={(e) => handleDealDragStart(e, deal.id)}
                                  onClick={() => {
                                    setSelectedDeal(deal);
                                    setActiveDrawerTab("Overview");
                                  }}
                                  className={`p-5 rounded-2xl border border-slate-100 dark:border-zinc-850/80 shadow-[0_2px_4px_rgba(0,0,0,0.02)] cursor-pointer select-none transition-all ${getCardBgColor(
                                    deal.winProbability
                                  )}`}
                                >
                                  <div className="flex items-start justify-between gap-1.5">
                                    <h5 className="text-sm font-extrabold text-green-700 dark:text-green-400 truncate max-w-[240px]" title={deal.dealName || deal.companyName}>
                                      {deal.dealName || `${deal.companyName} Project`}
                                    </h5>

                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                      deal.priority === "High"
                                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                        : deal.priority === "Medium"
                                        ? "bg-amber-100 text-amber-850 dark:bg-amber-955/40 dark:text-amber-400"
                                        : "bg-slate-105 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                                    }`}>
                                      {deal.priority === "High" ? (t("HIGH")) : deal.priority === "Medium" ? (t("MEDIUM")) : (t("LOW"))}
                                    </span>
                                  </div>

                                  <span className="text-[11px] font-semibold text-slate-455 dark:text-zinc-500 font-sans flex items-center gap-1.5 flex-wrap mt-1.5">
                                    <span 
                                      onClick={(e) => handleCompanyClick(e, deal.companyName, deal.companyId)}
                                      className="font-bold text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                                      title={t("Go to Company Detail")}
                                    >
                                      🏢 {deal.companyName}
                                    </span>
                                    <span>•</span>
                                    <span>👤 {deal.contactPerson}</span>
                                  </span>

                                  {/* Aşamada Geçen Gün Süresi Göstergesi */}
                                  <div className="flex items-center gap-2 px-2.5 py-1 mt-2.5 bg-slate-100/60 dark:bg-zinc-800/40 text-xs text-slate-600 dark:text-zinc-400 rounded-md w-fit font-mono select-none">
                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{t("In Stage")}: <b className="text-[#0078D4] dark:text-blue-400">{deal.currentStageDuration || 0} {t("Days")}</b></span>
                                  </div>

                                  {/* 7+ ve 20+ Gün Teklif Bekleme Uyarı ve Hatırlatma Sistemi */}
                                  {deal.stage === "Proposal Submitted" && (deal.currentStageDuration || 0) >= 7 && (
                                    <div className={`mt-3 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm ${
                                      (deal.currentStageDuration || 0) >= 20 
                                        ? "bg-rose-50/80 dark:bg-rose-955/20 border-rose-200 text-rose-800 dark:text-rose-450 animate-pulse" 
                                        : "bg-amber-50/80 dark:bg-amber-955/20 border-amber-200 text-amber-850 dark:text-amber-450"
                                    }`}>
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                                        <div className="min-w-0">
                                          <p className="text-[10px] font-extrabold tracking-tight leading-none uppercase">
                                            {(deal.currentStageDuration || 0) >= 20 ? (t("🚨 20+ Day Reminder!")) : (t("⚠️ 7+ Day Delay!"))}
                                          </p>
                                          <p className="text-[9px] opacity-80 truncate">
                                            {t("Proposal has been pending for {days} days.").replace("{days}", String(deal.currentStageDuration))}
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenReminderMailbox(deal);
                                        }}
                                        className={`px-2.5 py-1.5 rounded text-[9px] font-black tracking-tight uppercase flex items-center justify-center gap-1 shadow-xs transition-transform transform hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
                                          (deal.currentStageDuration || 0) >= 20
                                            ? "bg-rose-600 hover:bg-rose-700 text-white"
                                            : "bg-amber-600 hover:bg-amber-700 text-white"
                                        }`}
                                      >
                                        <Mail className="w-2.5 h-2.5" />
                                        <span>{t("Remind")}</span>
                                      </button>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/50">
                                    <div>
                                      <span className="block text-[9px] text-slate-400 uppercase font-mono font-bold">
                                        {t("OPPORTUNITY VALUE")}
                                      </span>
                                      <span className="text-sm font-extrabold text-slate-755 dark:text-zinc-150">{getSystemCurrency().symbol}{(deal.opportunityValue || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="block text-[9px] text-slate-400 uppercase font-mono font-bold">
                                        {t("PROBABILITY")}
                                      </span>
                                      <span className="text-sm font-extrabold text-slate-755 dark:text-zinc-200">{deal.winProbability}%</span>
                                    </div>
                                  </div>

                                  {/* Multi indicators box */}
                                  <div className="grid grid-cols-3 gap-1.5 mt-2.5 bg-slate-50 dark:bg-black/20 p-2 rounded text-xs font-sans">
                                    <div className="text-center border-r dark:border-zinc-800">
                                      <span className="block text-[8px] text-slate-400 uppercase">
                                        {t("CLOSED")}
                                      </span>
                                      <span className="font-bold font-mono text-[11px]">{deal.expectedCloseDate}</span>
                                    </div>
                                    <div className="text-center border-r dark:border-zinc-800">
                                      <span className="block text-[8px] text-orange-500 uppercase">OPEX</span>
                                      <span className="font-bold text-orange-655 font-mono text-[11px]">{deal.opexScore}</span>
                                    </div>
                                    <div className="text-center">
                                      <span className="block text-[8px] text-green-500 uppercase">
                                        {t("SCORE")}
                                      </span>
                                      <span className="font-bold text-green-655 font-mono text-[11px]">#{deal.opportunityScore}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-50 dark:border-zinc-850/40 text-xs text-slate-400">
                                    <span className="font-mono text-slate-455">
                                      {t("Owner")}: {deal.owner || "GP"}
                                    </span>
                                    
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditDeal(deal);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-green-655 rounded hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                                        title={t("Edit Opportunity Details")}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteModal({
                                            isOpen: true,
                                            title: "Fırsat Kartı Silinecek",
                                            message: "Geri dönüşüm kutusuna taşınsın mı?",
                                            onConfirm: () => {
                                              setDeals(prev => {
                                                const updated = prev.filter(p => p.id !== deal.id);
                                                return updated;
                                              });
                                            }
                                          });
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                                        title={t("Delete")}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-205 dark:border-zinc-800 flex justify-between text-[11px] font-bold text-slate-500">
                        <span>{t("Total Value:")}</span>
                        <span className="text-slate-850 dark:text-zinc-200">{getSystemCurrency().symbol}{stageValueSum.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 5. CREATE OPPORTUNITY FORM DIALOG MODAL                  */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-[#0c0c0c]/60 dark:bg-[#000000]/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-[#151515] w-full max-w-2xl rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-green-600" />
                {formMode === "edit" ? "Tüm Kartvizit Tablarını Düzenle" : "Yeni Fırsat Kartı Oluştur"}
              </h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-0.5 cursor-pointer"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOpportunityForm} className="overflow-y-auto p-6 space-y-6 text-xs text-slate-700 dark:text-zinc-250 flex-1 flex flex-col justify-between">
              
              <div className="flex-1 space-y-6">
                {/* Form Tabs Button Strip */}
                <div className="flex border-b border-slate-100 dark:border-zinc-800 select-none pb-1 mb-2 gap-1 overflow-x-auto">
                  {[
                    { id: "general", label: t("📋 General Summary & Core") },
                    { id: "metadata", label: t("🏷️ Extra Metadata") },
                    { id: "opex", label: t("⚙️ OPEX Assessment") },
                    { id: "contract", label: t("📝 Proposal / Contract") },
                    { id: "sla", label: t("⏱️ SLA Steps Timeline") }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFormTab(tab.id as any)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeFormTab === tab.id
                          ? "bg-green-600 text-white shadow-sm font-extrabold"
                          : "bg-slate-50 dark:bg-zinc-850 text-slate-500 hover:text-slate-700 dark:hover:text-zinc-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB 1: General / Overview */}
                {activeFormTab === "general" && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div className="border-b border-dashed border-slate-200 dark:border-zinc-803 pb-1">
                      <h4 className="text-xs font-bold text-green-600 uppercase font-mono tracking-wider">
                        {t("Opportunity General Information")}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                          {t("Owner / Advisor *")}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={t("e.g. GP / Gemba Partner")}
                          value={dealFormState.owner}
                          onChange={(e) => setDealFormState({ ...dealFormState, owner: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-green-500 outline-none font-semibold text-slate-600 dark:text-zinc-300"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                          {t("Deal / Project Name *")}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={t("e.g. ABC Glass Line Optimization")}
                          value={dealFormState.dealName}
                          onChange={(e) => setDealFormState({ ...dealFormState, dealName: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-green-500 outline-none font-semibold text-slate-700 dark:text-zinc-350"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                          {t("Company Name *")}
                        </label>
                        <CompanyAutocomplete
                          value={dealFormState.companyId || dealFormState.companyName}
                          onChange={(company) => {
                            const companyContacts = CrmDb.getContactsByCompany(company.id);
                            const primaryContact = companyContacts[0];
                            setDealFormState({
                              ...dealFormState,
                              companyId: company.id,
                              companyName: company.name,
                              contactPerson: primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : (company.managementTeam || dealFormState.contactPerson),
                              contactEmail: primaryContact ? primaryContact.email : (company.website ? `info@${company.website.replace(/^https?:\/\//, "")}` : dealFormState.contactEmail),
                              contactPhone: primaryContact ? primaryContact.phone : (company.phone || dealFormState.contactPhone),
                            });
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                          {t("Contact Name *")}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={t("e.g. John Smith")}
                          value={dealFormState.contactPerson}
                          onChange={(e) => setDealFormState({ ...dealFormState, contactPerson: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-green-500 outline-none text-slate-700 dark:text-zinc-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                          {t("Contact Email")}
                        </label>
                        <input
                          type="email"
                          placeholder={t("e.g. john@abcauto.com")}
                          value={dealFormState.contactEmail}
                          onChange={(e) => setDealFormState({ ...dealFormState, contactEmail: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                          {t("Contact Phone")}
                        </label>
                        <input
                          type="text"
                          placeholder={t("+90 (532) ...")}
                          value={dealFormState.contactPhone}
                          onChange={(e) => setDealFormState({ ...dealFormState, contactPhone: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                          {t("Pipeline Name")}
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={dealFormState.pipeline}
                          className="w-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-205 dark:border-zinc-705 rounded-lg p-2 text-xs font-semibold text-slate-550 block select-none cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                          {t("Opportunity Stage")}
                        </label>
                        <select
                          value={dealFormState.stage}
                          onChange={(e) => setDealFormState({ ...dealFormState, stage: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs outline-none cursor-pointer"
                        >
                          {activeStages.map(st => (
                            <option key={st} value={st}>{getStageTranslation(st, lang)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                          {t("Amount ({symbol}) *").replace("{symbol}", getSystemCurrency().symbol)}
                        </label>
                        <input
                          type="number"
                          required
                          value={dealFormState.opportunityValue}
                          onChange={(e) => setDealFormState({ ...dealFormState, opportunityValue: Number(e.target.value) })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                          {t("Expected Close Date")}
                        </label>
                        <input
                          type="text"
                          placeholder={t("Format: DD.MM.YYYY")}
                          value={dealFormState.expectedCloseDate}
                          onChange={(e) => setDealFormState({ ...dealFormState, expectedCloseDate: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                        {t("Description")}
                      </label>
                      <textarea
                        placeholder={t("A few words about this opportunity")}
                        value={dealFormState.description}
                        onChange={(e) => setDealFormState({ ...dealFormState, description: e.target.value })}
                        className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 outline-none h-16 resize-none text-slate-700 dark:text-zinc-300"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: Custom Metadata */}
                {activeFormTab === "metadata" && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div className="border-b border-dashed border-slate-200 dark:border-zinc-803 pb-1">
                      <h4 className="text-xs font-bold text-indigo-600 uppercase font-mono tracking-wider">{t("Extra Metadata")}</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Lead Source")}</label>
                        <select
                          value={dealFormState.leadSource}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__add_new__") {
                              setShowAddCustomSource(true);
                            } else {
                              setDealFormState({ ...dealFormState, leadSource: val });
                              setShowAddCustomSource(false);
                            }
                          }}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="">{t("-- Choose Lead Source --")}</option>
                          {leadSourcesList.map((src) => (
                            <option key={src} value={src}>{src}</option>
                          ))}
                          {dealFormState.leadSource && !leadSourcesList.includes(dealFormState.leadSource) && (
                            <option value={dealFormState.leadSource}>{dealFormState.leadSource}</option>
                          )}
                          <option value="__add_new__" className="text-indigo-600 font-bold dark:text-indigo-400">
                            {t("➕ + Add new source...")}
                          </option>
                        </select>

                        {showAddCustomSource && (
                          <div className="mt-2 p-2.5 bg-slate-100 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-2">
                            <label className="block text-[8px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">{t("New Source Name")}</label>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder={t("e.g. TikTok Ad, Meta Ads")}
                                value={customSourceInput}
                                onChange={(e) => setCustomSourceInput(e.target.value)}
                                className="flex-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmed = customSourceInput.trim();
                                  if (trimmed) {
                                    if (!leadSourcesList.includes(trimmed)) {
                                      const updated = [...leadSourcesList, trimmed];
                                      setLeadSourcesList(updated);
                                    }
                                    setDealFormState({ ...dealFormState, leadSource: trimmed });
                                    setCustomSourceInput("");
                                    setShowAddCustomSource(false);
                                  }
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-colors"
                              >
                                {t("Add")}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddCustomSource(false);
                                  setCustomSourceInput("");
                                  if (leadSourcesList.length > 0) {
                                    setDealFormState({ ...dealFormState, leadSource: leadSourcesList[0] });
                                  }
                                }}
                                className="px-2 py-1 bg-slate-250 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold text-xs rounded transition-colors"
                              >
                                {t("Cancel")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Proposal Number (Quotation No)")}</label>
                        <input
                          type="text"
                          placeholder={t("e.g. PRP-2026-X")}
                          value={dealFormState.proposalNumber}
                          onChange={(e) => setDealFormState({ ...dealFormState, proposalNumber: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Man-Day Estimate")}</label>
                        <input
                          type="text"
                          placeholder={t("e.g. 25")}
                          value={dealFormState.manDay}
                          onChange={(e) => setDealFormState({ ...dealFormState, manDay: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Contact Subject")}</label>
                        <input
                          type="text"
                          placeholder={t("e.g. SMED Audit Planning")}
                          value={dealFormState.contactSubject}
                          onChange={(e) => setDealFormState({ ...dealFormState, contactSubject: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Consulting Products")}</label>
                        <input
                          type="text"
                          placeholder={t("e.g. TIMWOODS floor training")}
                          value={dealFormState.products}
                          onChange={(e) => setDealFormState({ ...dealFormState, products: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: OPEX Assessment */}
                {activeFormTab === "opex" && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div className="border-b border-dashed border-slate-200 dark:border-zinc-803 pb-1">
                      <h4 className="text-xs font-bold text-purple-600 uppercase font-mono tracking-wider">Yalın Değerlendirme &amp; OPEX Analizi</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Lean Maturity Level")}</label>
                        <input
                          type="text"
                          placeholder={t("e.g. Level 2: Standardization Start")}
                          value={dealFormState.leanMaturityLevel}
                          onChange={(e) => setDealFormState({ ...dealFormState, leanMaturityLevel: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Quality Risk Level")}</label>
                        <input
                          type="text"
                          placeholder={t("e.g. Medium-High Risk Level")}
                          value={dealFormState.qualityRiskLevel}
                          onChange={(e) => setDealFormState({ ...dealFormState, qualityRiskLevel: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Lean maturity detail description")}</label>
                      <textarea
                        placeholder={t("Lean analysis details (wastes, 5S status, etc.)")}
                        value={dealFormState.leanMaturityDesc}
                        onChange={(e) => setDealFormState({ ...dealFormState, leanMaturityDesc: e.target.value })}
                        className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 outline-none h-18 resize-none text-slate-700 dark:text-zinc-350"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Quality failure analysis description")}</label>
                      <textarea
                        placeholder={t("Quality loss rates, cost analysis, etc.)")}
                        value={dealFormState.qualityRiskDesc}
                        onChange={(e) => setDealFormState({ ...dealFormState, qualityRiskDesc: e.target.value })}
                        className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 outline-none h-18 resize-none text-slate-700 dark:text-zinc-350"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: Contract & Proposal */}
                {activeFormTab === "contract" && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div className="border-b border-dashed border-slate-200 dark:border-zinc-803 pb-1">
                      <h4 className="text-xs font-bold text-emerald-600 uppercase font-mono tracking-wider">Sözleşme &amp; Teklif Bedelleri</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Project Overseer (PM)")}</label>
                        <input
                          type="text"
                          placeholder={t("e.g. John Smith")}
                          value={dealFormState.contractPm}
                          onChange={(e) => setDealFormState({ ...dealFormState, contractPm: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Responsible ID Number")}</label>
                        <input
                          type="text"
                          placeholder={t("11-digit ID Number")}
                          maxLength={11}
                          value={dealFormState.contractPmTc}
                          onChange={(e) => setDealFormState({ ...dealFormState, contractPmTc: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Contract Issue Date")}</label>
                        <input
                          type="date"
                          value={dealFormState.contractDate}
                          onChange={(e) => setDealFormState({ ...dealFormState, contractDate: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">{t("Contract Subject")}</label>
                        <input
                          type="text"
                          placeholder={t("Consulting Services Agreement")}
                          value={dealFormState.contractSubject}
                          onChange={(e) => setDealFormState({ ...dealFormState, contractSubject: e.target.value })}
                          className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs focus:outline-none text-slate-700 dark:text-zinc-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: SLA Milestones */}
                {activeFormTab === "sla" && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div className="border-b border-dashed border-slate-200 dark:border-zinc-803 pb-1">
                      <h4 className="text-xs font-bold text-amber-600 uppercase font-mono tracking-wider">
                        {t("Process SLA Milestones Log History")}
                      </h4>
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-2 leading-relaxed font-sans">
                      {t("You can manually adjust the dates and stage notes of each sales stage here. Checked stages will be populated as completed/active SLA steps.")}
                    </p>

                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                      {activeStages.map((st) => {
                        const historyEntry = dealFormState.stageHistory?.find(h => h.stage === st);
                        const hasEntry = !!historyEntry;
                        const entryDate = historyEntry?.date || "";
                        const entryNotes = historyEntry?.notes || "";

                        return (
                          <div key={st} className="p-3 bg-slate-50/60 dark:bg-zinc-900/60 rounded-xl border border-slate-150 dark:border-zinc-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${hasEntry ? "bg-amber-500 animate-pulse" : "bg-slate-300 dark:bg-zinc-700"}`} />
                                {getStageTranslation(st, lang)}
                              </span>
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={hasEntry}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    let updatedHistory = [...(dealFormState.stageHistory || [])];
                                    if (checked) {
                                      if (!updatedHistory.some(h => h.stage === st)) {
                                        updatedHistory.push({
                                          stage: st,
                                          date: new Date().toLocaleDateString("tr-TR"),
                                          notes: ""
                                        });
                                      }
                                    } else {
                                      updatedHistory = updatedHistory.filter(h => h.stage !== st);
                                    }
                                    setDealFormState({ ...dealFormState, stageHistory: updatedHistory });
                                  }}
                                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                                  {t("Active / Set Date")}
                                </span>
                              </label>
                            </div>

                            {hasEntry && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-top-1 duration-100">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">
                                    {t("Date")}
                                  </label>
                                  <input
                                    type="text"
                                    value={entryDate}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const updatedHistory = (dealFormState.stageHistory || []).map(h => 
                                        h.stage === st ? { ...h, date: val } : h
                                      );
                                      setDealFormState({ ...dealFormState, stageHistory: updatedHistory });
                                    }}
                                    placeholder={t("e.g. 24.06.2026")}
                                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs outline-none"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">
                                    {t("Stage Notes / Progress")}
                                  </label>
                                  <input
                                    type="text"
                                    value={entryNotes}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const updatedHistory = (dealFormState.stageHistory || []).map(h => 
                                        h.stage === st ? { ...h, notes: val } : h
                                      );
                                      setDealFormState({ ...dealFormState, stageHistory: updatedHistory });
                                    }}
                                    placeholder={t("e.g. First contact established, budget requested.")}
                                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-zinc-850 flex justify-between items-center gap-3 mt-4">
                <span className="text-[10px] text-zinc-400 italic">
                  * Tüm tablardaki değişiklikleri sağ alttaki butonla tek seferde kaydedebilirsiniz.
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 rounded-lg cursor-pointer text-slate-600 dark:text-zinc-200"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Kapat
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-[#16a34a] hover:bg-green-700 text-white rounded-lg cursor-pointer shadow-sm"
                  >
                    Tüm Bilgileri Kaydet
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SLIDE-IN DEAL DRAWER SIDEBAR PANEL                     */}
      {/* ======================================================== */}
      {selectedDeal && (
        <div className="fixed inset-0 z-45 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-[#151515] h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-150">
            
            {/* Drawer Header Toolbar */}
            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-black/15">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-950/40 rounded-lg text-green-600 dark:text-green-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 
                    onClick={(e) => handleCompanyClick(e, selectedDeal.companyName, selectedDeal.companyId)}
                    className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm leading-tight font-sans hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer hover:underline transition-all flex items-center gap-1"
                    title={t("Go to Company Detail")}
                  >
                    🏢 {selectedDeal.companyName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-450 dark:text-zinc-400 font-bold uppercase font-mono">Owner: {selectedDeal.owner || "GP"}</span>
                    <span className="text-[10px] text-blue-500 font-bold tracking-tight">Stage: {selectedDeal.stage}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditDeal(selectedDeal);
                  }}
                  className="p-1.5 px-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-sm transform active:scale-95 animate-in fade-in"
                  title={t("Edit all tabs at once (General, Extra, OPEX, Contract)")}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{t("✍️ Edit All Tabs")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDeal(null)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub Tabs group */}
            <div className="flex border-b border-slate-100 dark:border-zinc-800/80 overflow-x-auto select-none bg-slate-50/20 dark:bg-black/15">
              {[
                "Overview",
                "Emails", // Added "Emails" Tab requested
                "OPEX Assessment",
                "Proposal & Won",
                "History & Logs"
              ].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveDrawerTab(tab)}
                  className={`px-4 py-3 text-[11px] font-bold tracking-tight whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                    activeDrawerTab === tab
                      ? "border-b-green-600 text-green-600 font-extrabold"
                      : "border-b-transparent text-slate-500 hover:text-slate-700 dark:hover:text-zinc-200"
                  }`}
                >
                  {tab === "Overview" && "Genel Özet"}
                  {tab === "Emails" && t("✉️ Emails Communication")}
                  {tab === "OPEX Assessment" && "OPEX Değerlendirme"}
                  {tab === "Proposal & Won" && "Teklif / Sözleşme"}
                  {tab === "History & Logs" && "Aktiviteler & Evraklar"}
                </button>
              ))}
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-6 text-slate-700 dark:text-zinc-200">
              
              {/* Tab 1: Overview */}
              {activeDrawerTab === "Overview" && (
                <div className="space-y-5 animate-in fade-in duration-100">
                  <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 space-y-3 font-sans">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-150 uppercase tracking-wide font-mono">Fırsat Kartvizit Detayları</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block text-[10px] text-zinc-400 capitalize font-mono font-bold">{t("Deal Name")}</span>
                        <span className="font-semibold">{selectedDeal.dealName || `${selectedDeal.companyName} Project`}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 capitalize font-mono font-bold">{t("Industry Sector")}</span>
                        <span className="font-semibold">{selectedDeal.industry || "General B2B"}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 capitalize font-mono font-bold">{t("Contact Person")}</span>
                        <span className="font-semibold">{selectedDeal.contactPerson}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 capitalize font-mono font-bold">{t("Pipeline Stage")}</span>
                        <span className="font-semibold bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded text-green-700">{selectedDeal.stage}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 capitalize font-mono font-bold">{t("Contact Email")}</span>
                        <span className="font-semibold underline select-all">{selectedDeal.contactEmail || t("No official email logged")}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 capitalize font-mono font-bold">{t("Contact Phone")}</span>
                        <span className="font-semibold">{selectedDeal.contactPhone || t("None")}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[10px] text-zinc-400 capitalize font-mono font-bold">{t("Opportunity Description")}</span>
                        <p className="text-xs text-slate-550 dark:text-zinc-400 italic mt-1 bg-white dark:bg-[#1a1a19] p-2 rounded border border-slate-100 dark:border-zinc-800/85">
                          {selectedDeal.description || t("A few words about this opportunity")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-xl border border-slate-101 space-y-3 font-sans">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-150 uppercase tracking-wide font-mono">{t("Opportunity Custom Metadata")}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="block text-[8px] text-slate-400 font-mono">{t("LEAD SOURCE")}</span>
                        <span className="font-bold">{selectedDeal.leadSource || t("N/A")}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400 font-mono">{t("PROPOSAL NO")}</span>
                        <span className="font-bold">{selectedDeal.proposalNumber || t("N/A")}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400 font-mono">{t("MAN-DAY UNITS")}</span>
                        <span className="font-bold">{selectedDeal.manDay || t("N/A")}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400 font-mono">{t("DATES CLOSED")}</span>
                        <span className="font-bold font-mono">{selectedDeal.expectedCloseDate}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[8px] text-slate-400 font-mono">{t("CONTACT SUBJECT")}</span>
                        <span className="font-bold">{selectedDeal.contactSubject || t("N/A")}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[8px] text-slate-400 font-mono">{t("SUGGESTED PRODUCTS")}</span>
                        <span className="font-bold">{selectedDeal.products || t("N/A")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Stage Timeline Tracker */}
                  <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 space-y-4 font-sans shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-150 dark:border-zinc-800 pb-2.5">
                      <h4 className="text-xs font-black text-slate-800 dark:text-zinc-150 uppercase tracking-wide font-mono flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        {t("Process SLA Timeline Tracker")}
                      </h4>
                      <span className="text-[9px] font-mono font-black text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase">
                        {t("SLA Steps")}
                      </span>
                    </div>

                    <div className="relative pl-6 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-zinc-800 select-none">
                      {(() => {
                        const currentStageIndex = activeStages.indexOf(selectedDeal.stage);

                        return activeStages.map((st, idx) => {
                          const historyEntry = selectedDeal.stageHistory?.find((h) => h.stage === st);
                          const hasHistory = !!historyEntry;

                          let status: "completed" | "current" | "pending" = "pending";
                          let statusLabel = t("Awaiting");
                          let dateStr = "";

                          if (idx < currentStageIndex) {
                            status = "completed";
                            statusLabel = t("Completed");
                            dateStr = hasHistory ? historyEntry.date : (t("No Date Listed"));
                          } else if (idx === currentStageIndex) {
                            status = "current";
                            statusLabel = t("Active Stage");
                            dateStr = hasHistory ? historyEntry.date : `${selectedDeal.currentStageDuration || 0} ${t("Days Here")}`;
                          } else {
                            status = "pending";
                            statusLabel = t("Planned Step");
                            dateStr = hasHistory ? historyEntry.date : (t("Awaiting"));
                          }

                          const trName = getStageTranslation(st, lang);
                          const defaultDesc = stageMetadata[st]?.description || (t("Process Flow Phase"));
                          const stageNotesText = hasHistory && historyEntry.notes ? historyEntry.notes : defaultDesc;

                          const isEditingSla = editingSlaStage === st;

                          return (
                            <div key={st} className="relative text-xs">
                              {/* Dot status node indicator style */}
                              <div className="absolute -left-[24px] top-1 z-10 flex items-center justify-center">
                                {status === "completed" ? (
                                  <div className="w-[16px] h-[16px] bg-emerald-500 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-zinc-900 shadow">
                                    <span className="text-[9px] font-bold">✔</span>
                                  </div>
                                ) : status === "current" ? (
                                  <div className="w-[16px] h-[16px] bg-blue-600 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-zinc-900 shadow ring-4 ring-blue-500/20 animate-pulse">
                                    <span className="text-[8px] font-black">▶</span>
                                  </div>
                                ) : (
                                  <div className="w-[14px] h-[14px] bg-slate-100 dark:bg-zinc-800 border-2 border-slate-300 dark:border-zinc-700 rounded-full" />
                                )}
                              </div>

                              {/* Text details content container */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`font-semibold text-xs tracking-tight ${
                                      status === "completed"
                                        ? "text-emerald-700 dark:text-emerald-400 font-bold"
                                        : status === "current"
                                        ? "text-blue-700 dark:text-blue-400 font-extrabold"
                                        : "text-slate-400 dark:text-zinc-500"
                                    }`}
                                  >
                                    {trName}
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                                        status === "completed"
                                          ? "bg-emerald-500/10 text-emerald-600"
                                          : status === "current"
                                          ? "bg-blue-500/10 text-blue-600 font-bold"
                                          : "bg-slate-100 dark:bg-zinc-800/60 text-slate-450 dark:text-zinc-500"
                                      }`}
                                    >
                                      {dateStr}
                                    </span>

                                    <button
                                      onClick={() => {
                                        setEditingSlaStage(st);
                                        setSlaEditDate(historyEntry?.date || new Date().toLocaleDateString("tr-TR"));
                                        setSlaEditNotes(historyEntry?.notes || "");
                                      }}
                                      title={t("Edit SLA Step")}
                                      className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-0.5 transition-colors cursor-pointer"
                                    >
                                      <span className="text-[10px]">✏</span>
                                    </button>
                                  </div>
                                </div>

                                {isEditingSla ? (
                                  <div className="mt-2 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 space-y-2 animate-in slide-in-from-top-1 duration-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div>
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">
                                          {t("Date")}
                                        </label>
                                        <input
                                          type="text"
                                          value={slaEditDate}
                                          onChange={(e) => setSlaEditDate(e.target.value)}
                                          placeholder={t("DD.MM.YYYY")}
                                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-1 text-[11px] outline-none"
                                        />
                                      </div>
                                      <div className="sm:col-span-2">
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">
                                          {t("Meeting / SLA Note")}
                                        </label>
                                        <input
                                          type="text"
                                          value={slaEditNotes}
                                          onChange={(e) => setSlaEditNotes(e.target.value)}
                                          placeholder={t("e.g. Call was positive.")}
                                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-1 text-[11px] outline-none"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-1.5 pt-1">
                                      <button
                                        onClick={() => setEditingSlaStage(null)}
                                        className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-zinc-700 dark:text-zinc-300 rounded font-bold cursor-pointer"
                                      >
                                        {t("Cancel")}
                                      </button>
                                      <button
                                        onClick={() => {
                                          const updatedHistory = [...(selectedDeal.stageHistory || [])];
                                          const existingIdx = updatedHistory.findIndex((h) => h.stage === st);
                                          if (existingIdx > -1) {
                                            updatedHistory[existingIdx] = { stage: st, date: slaEditDate, notes: slaEditNotes };
                                          } else {
                                            updatedHistory.push({ stage: st, date: slaEditDate, notes: slaEditNotes });
                                          }
                                          const updatedDeal = { ...selectedDeal, stageHistory: updatedHistory };
                                          updateDealAndSelected(updatedDeal);
                                          setEditingSlaStage(null);
                                        }}
                                        className="px-2.5 py-1 text-[10px] bg-amber-600 hover:bg-amber-700 text-white rounded font-bold cursor-pointer animate-pulse"
                                      >
                                        {t("Save")}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal pl-0.5 font-sans italic">
                                    {stageNotesText}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Müşteri Görüşme Notları (Interview Notes Section) */}
                  <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-xl border border-slate-100 dark:border-zinc-805/80 space-y-4 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-150 dark:border-zinc-800 pb-2.5">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-150 uppercase tracking-wide font-mono flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        📝 Müşteri Görüşme Notları
                      </h4>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">
                        {(selectedDeal.dealNotes || []).length} Not
                      </span>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {!(selectedDeal.dealNotes && selectedDeal.dealNotes.length > 0) ? (
                        <div className="text-center py-5 text-slate-400 dark:text-zinc-500 italic text-xs">
                          Henüz bu müşteri ile ilgili bir görüşme notu kaydedilmemiş. Aşağıdan ilk notunuzu ekleyebilirsiniz.
                        </div>
                      ) : (
                        selectedDeal.dealNotes.map((note) => (
                          <div key={note.id} className="p-3 bg-white dark:bg-[#1a1a19] rounded-lg border border-slate-100 dark:border-zinc-800/60 space-y-1 shadow-2xs relative group">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-slate-650 dark:text-zinc-450 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Gemba Partner Danışmanı
                              </span>
                              <span className="text-slate-400 font-mono text-[9px] flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {note.date}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-zinc-200 whitespace-pre-line leading-relaxed font-sans">{note.text}</p>
                            <button
                              type="button"
                              onClick={() => {
                                const newNotes = (selectedDeal.dealNotes || []).filter(n => n.id !== note.id);
                                const updatedDeal = { ...selectedDeal, dealNotes: newNotes };
                                updateDealAndSelected(updatedDeal);
                              }}
                              className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer rounded"
                              title={t("Delete note")}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add note Form */}
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={newNoteInput}
                        onChange={(e) => setNewNoteInput(e.target.value)}
                        placeholder={t("Write your meeting or follow-up notes here...")}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-250 dark:border-zinc-850 bg-white dark:bg-[#111110] text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-400 resize-none font-sans"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!newNoteInput.trim()}
                          onClick={() => {
                            const newNote = {
                              id: `note-${Date.now()}`,
                              date: `${new Date().toLocaleDateString("tr-TR")} ${new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`,
                              text: newNoteInput.trim()
                            };

                            const updatedNotes = [...(selectedDeal.dealNotes || []), newNote];
                            const updatedDeal = { ...selectedDeal, dealNotes: updatedNotes };
                            updateDealAndSelected(updatedDeal);
                            setNewNoteInput("");
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{t("Save Note")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: EMAIL COMMUNICATION CLIENT INSIDE DEALS (Microsoft Outlook integration) */}
              {activeDrawerTab === "Emails" && (
                <div className="space-y-6 animate-in fade-in duration-100">
                  
                  {/* Exchange Outlook synchronizer toggler box widget */}
                  <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-xl border border-slate-150 dark:border-zinc-800/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-lg shrink-0">
                        <RefreshCw className={`w-4.5 h-4.5 ${isExchangeConnected ? "animate-spin" : ""}`} style={{ animationDuration: "14s" }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">{t("Organization Mailbox")}</p>
                        <p className="text-[10px] text-slate-450 dark:text-zinc-400">
                          {t("Managed in Organization Settings > Shared Mailboxes")}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg border bg-slate-100 text-slate-600 border-slate-300">
                      {t("Shared Mailboxes")}
                    </span>
                  </div>

                  {/* Complete Email Conversation stack */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-450 uppercase tracking-widest font-mono">Chronological History ({selectedDeal.dealEmails?.length || 0})</h4>
                    
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {(!selectedDeal.dealEmails || selectedDeal.dealEmails.length === 0) ? (
                        <div className="p-6 text-center text-slate-400 italic font-mono text-[10px]">
                          No logged email logs yet. Draft one below!
                        </div>
                      ) : (
                        selectedDeal.dealEmails.map((email) => (
                          <div
                            key={email.id}
                            className={`p-3.5 rounded-xl border space-y-2 text-xs transition-all ${
                              email.isIncoming
                                ? "bg-slate-50 dark:bg-black/15 border-slate-200 dark:border-zinc-800/80 mr-6"
                                : "bg-green-50/35 dark:bg-green-955/5 border-green-200/50 dark:border-green-950 ml-6"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[9px] text-slate-450">
                              <span className="font-bold">
                                {email.isIncoming ? `📥 Received from ${email.sender}` : `📤 Sent by ${email.sender}`}
                              </span>
                              <span className="font-mono">{email.date}</span>
                            </div>

                            <p className="font-bold text-slate-800 dark:text-zinc-100">{email.subject}</p>
                            
                            <p className="text-slate-600 dark:text-zinc-350 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                              {email.body}
                            </p>

                            {email.attachments && email.attachments.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-dashed">
                                <Paperclip className="w-3 h-3 text-slate-400" />
                                {email.attachments.map((file) => (
                                  <span key={file} className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[8px] font-mono text-slate-600 dark:text-zinc-400">
                                    {file}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Compose Email form box */}
                    <div className="bg-slate-50/50 dark:bg-black/10 p-4 rounded-xl border border-slate-150 dark:border-zinc-800/80 space-y-4 text-xs">
                      <p className="text-[10px] font-black text-green-700 dark:text-green-450 uppercase font-mono tracking-wider">
                        📬 {t("Email dispatch panel (Outlook & Gmail integration)")}
                      </p>

                      {/* Recipient registration list */}
                      <div className="space-y-1.5 p-2.5 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-lg">
                        <label className="block text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase font-mono">
                          {t("Registered Contact Recipients")}
                        </label>
                        <div className="flex flex-wrap gap-1.5 py-1">
                          {/* Primary */}
                          <button
                            type="button"
                            onClick={() => setEmailComposeTo(selectedDeal.contactEmail || "")}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer select-none ${
                              emailComposeTo === selectedDeal.contactEmail
                                ? "bg-green-600 border-green-600 text-white"
                                : "bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-350 hover:bg-slate-100"
                            }`}
                          >
                            👤 {selectedDeal.contactEmail || t("Primary recipient (not specified)")}
                          </button>

                          {/* Alternatives */}
                          {(selectedDeal.otherEmails || []).map((alt) => (
                            <button
                              key={alt}
                              type="button"
                              onClick={() => setEmailComposeTo(alt)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer select-none ${
                                emailComposeTo === alt
                                  ? "bg-green-600 border-green-600 text-white"
                                  : "bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-350 hover:bg-slate-100"
                              }`}
                            >
                              📧 {alt}
                            </button>
                          ))}
                        </div>

                        {/* Register direct new mail input */}
                        <div className="flex gap-1.5 items-center bg-slate-100 dark:bg-zinc-800 p-1 border border-slate-200 dark:border-zinc-700 rounded-lg mt-1">
                          <input
                            type="email"
                            placeholder={t("Register a new alternative email address...")}
                            value={newOtherEmailInput}
                            onChange={(e) => setNewOtherEmailInput(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-[10px] text-slate-700 dark:text-zinc-200 px-1.5 py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const cleanEmail = newOtherEmailInput.trim();
                              if (!cleanEmail) return;
                              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                                alert(t("Please enter a valid email address!"));
                                return;
                              }

                              // Add to otherEmails
                              setDeals((prev) =>
                                prev.map((d) => {
                                  if (d.id === selectedDeal.id) {
                                    const currentOther = d.otherEmails || [];
                                    if (currentOther.includes(cleanEmail) || d.contactEmail === cleanEmail) {
                                      alert(t("This email is already in the list!"));
                                      return d;
                                    }
                                    return {
                                      ...d,
                                      otherEmails: [...currentOther, cleanEmail]
                                    };
                                  }
                                  return d;
                                })
                              );

                              setSelectedDeal((prev) => {
                                if (!prev) return null;
                                const currentOther = prev.otherEmails || [];
                                if (currentOther.includes(cleanEmail) || prev.contactEmail === cleanEmail) return prev;
                                return {
                                  ...prev,
                                  otherEmails: [...currentOther, cleanEmail]
                                };
                              });

                              setEmailComposeTo(cleanEmail);
                              setNewOtherEmailInput("");
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-bold cursor-pointer select-none whitespace-nowrap active:scale-95 transition-transform"
                          >
                            {t("Save and set as recipient")}
                          </button>
                        </div>
                      </div>

                      {emailSendError && (
                        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 dark:border-rose-950/40 dark:bg-rose-950/10 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-sm font-sans mb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-sans">
                              <AlertTriangle className="w-4 h-4 shrink-0 stroke-[2.5]" />
                              <h4 className="text-xs font-black uppercase tracking-wider font-mono">
                                {t("Email connection & API auth error")} (CONNECTION ERROR)
                              </h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEmailSendError(null)}
                              className="text-[10px] font-bold text-rose-700 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-200 font-mono cursor-pointer"
                            >
                              {t("[Clear]")}
                            </button>
                          </div>
                          <div className="text-xs text-slate-700 dark:text-zinc-300 space-y-2 bg-white/70 dark:bg-black/30 p-3 rounded-lg border border-rose-100 dark:border-rose-950/20">
                            <p className="font-bold text-rose-700 dark:text-rose-400">
                              {emailSendError.message}
                            </p>
                            <div className="text-[10px] font-mono bg-rose-50/50 dark:bg-black/40 p-2.5 rounded border border-rose-100 dark:border-rose-950/40 whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-zinc-400 select-all font-sans">
                              <strong>{t("System Diagnostics:")}</strong>{"\n"}
                              CODE: {emailSendError.code}{"\n"}{emailSendError.diagnostics}
                            </div>
                            <p className="text-[10px] text-slate-500 italic">
                              💡 {t("Solution: Disable the email API error simulator in Administration Center > Multi-Email tab or refresh connections.")}
                            </p>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleSendComposeEmail} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[9px] text-slate-400 dark:text-zinc-400 font-bold uppercase font-mono">{t("Recipient To *")}</label>
                            <input
                              type="text"
                              required
                              placeholder={t("client@company.com")}
                              value={emailComposeTo}
                              onChange={(e) => setEmailComposeTo(e.target.value)}
                              className="w-full p-2 border border-slate-205 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded outline-none text-slate-800 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 dark:text-zinc-400 font-bold uppercase font-mono">{t("BCC (Blind Copy)")}</label>
                            <input
                              type="text"
                              placeholder={t("bcc@company.com")}
                              value={emailComposeBcc}
                              onChange={(e) => setEmailComposeBcc(e.target.value)}
                              className="w-full p-2 border border-slate-205 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded outline-none text-slate-800 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 dark:text-zinc-400 font-bold uppercase font-mono">{t("Email Subject *")}</label>
                            <input
                              type="text"
                              required
                              placeholder={t("Subject line")}
                              value={emailComposeSubject}
                              onChange={(e) => setEmailComposeSubject(e.target.value)}
                              className="w-full p-2 border border-slate-205 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded outline-none text-slate-800 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 dark:text-zinc-400 font-bold uppercase font-mono">{t("Message body *")}</label>
                          <textarea
                            placeholder={t("Email body...")}
                            required
                            value={emailComposeBody}
                            onChange={(e) => setEmailComposeBody(e.target.value)}
                            className="w-full p-2.5 border border-slate-205 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded outline-none h-24 resize-none text-slate-800 dark:text-zinc-100 font-sans leading-relaxed"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1 border-b border-dashed border-slate-150 dark:border-zinc-800">
                          <div>
                            <label className="block text-[9px] text-slate-400 dark:text-zinc-400 font-bold uppercase font-mono mb-1">{t("Send Mode / Mail Client")}</label>
                            <select
                              value={emailClientMode}
                              onChange={(e) => setEmailClientMode(e.target.value as any)}
                              className="w-full p-1.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded text-[11px] font-bold outline-none text-slate-700 dark:text-zinc-200 cursor-pointer"
                            >
                              <option value="mailto">📪 {t("Default system client (mailto)")}</option>
                              <option value="gmail">🌐 {t("Google Gmail Webmail")}</option>
                              <option value="outlook">📧 {t("Microsoft Outlook Webmail")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 dark:text-zinc-400 font-bold uppercase font-mono mb-1">{t("Dosya Eki / Attachment File")}</label>
                            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-1.5 rounded">
                              <Paperclip className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
                              <input
                                type="text"
                                placeholder={t("Filename (e.g. opex_assessment_GP.pdf)")}
                                value={emailComposeFile}
                                onChange={(e) => setEmailComposeFile(e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-[10px] text-slate-700 dark:text-zinc-200"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 pt-1">
                          <span className="text-[9px] text-slate-400 dark:text-zinc-500 italic">
                            {t("After sending, a simulated reply will appear from {name}.").replace("{name}", selectedDeal.contactPerson)}
                          </span>
                          <button
                            type="submit"
                            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-black shrink-0 cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5 uppercase font-mono text-[10px]"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{t("Send Email")}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: OPEX Assessment */}
              {activeDrawerTab === "OPEX Assessment" && (
                <OpexAssessmentSection 
                  deal={selectedDeal}
                  onUpdateDeal={(updated) => updateDealAndSelected(updated)}
                  lang={lang}
                  t={t}
                  readOnly={isDrawerReadOnly}
                />
              )}

              {/* Tab 4: Proposal & Won */}
              {activeDrawerTab === "Proposal & Won" && (
                <ProposalContractSection 
                  deal={selectedDeal}
                  onUpdateDeal={(updated) => updateDealAndSelected(updated)}
                  lang={lang}
                  t={t}
                  onNavigateToTab={onNavigateToTab || ((tab) => {
                    window.dispatchEvent(new CustomEvent("change-tab", { detail: tab }));
                  })}
                  readOnly={isDrawerReadOnly}
                />
              )}

              {/* Tab 5: History & Logs (Aktiviteler & Evraklar) */}
              {activeDrawerTab === "History & Logs" && (
                <div className="space-y-6 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-150 uppercase tracking-wider font-mono">{t("Activities & Attachments")}</h4>
                    <span className="text-[10px] text-zinc-400 font-mono">{t("Chronology & Documents")}</span>
                  </div>

                  <TimelineActivitiesSection 
                    deal={selectedDeal}
                    onUpdateDeal={(updated) => updateDealAndSelected(updated)}
                    lang={lang}
                    t={t}
                  />

                  {/* Section 3: Document Attachments ("sözleşme pdf çıktısı buraya eklenebilmeli") */}
                  <div className="bg-slate-50 dark:bg-black/15 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-4">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-150 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-indigo-600" />
                      {t("Customer Documents & Contract Files")}
                    </span>

                    {/* Document List */}
                    {selectedDeal.documents && selectedDeal.documents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedDeal.documents.map((doc) => (
                          <div 
                            key={doc.id} 
                            className="p-2 border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#1a1a19] rounded-lg flex items-center justify-between text-xs group"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <FileCheck className="w-4 h-4 text-emerald-600" />
                              <div className="truncate">
                                <span className="font-semibold text-slate-705 dark:text-zinc-200 truncate block text-[11px] font-sans" title={doc.name}>
                                  {doc.name}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400 capitalize block">
                                  {t("Size:")} {doc.size}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                alert(t("Document '{name}' retrieved from local CRM archive. Download/view simulated.").replace("{name}", doc.name));
                              }}
                              className="p-1 cursor-pointer text-slate-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded transition-colors"
                              title={t("Download / View Document")}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-450 italic text-center">{t("No files uploaded to this card.")}</p>
                    )}

                    {/* Add Document Inline Form */}
                    <div className="border-t border-dashed border-slate-200 dark:border-zinc-800 pt-3 flex items-center gap-2">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          placeholder={t("File name (e.g. Lean_Line_Audit.pdf)")}
                          value={newDocName}
                          onChange={(e) => setNewDocName(e.target.value)}
                          className="w-full p-1.5 bg-white dark:bg-zinc-850 border border-slate-250 dark:border-zinc-750 text-slate-800 dark:text-zinc-150 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="w-24">
                        <input 
                          type="text" 
                          placeholder={t("e.g. 2 MB")}
                          value={newDocSize}
                          onChange={(e) => setNewDocSize(e.target.value)}
                          className="w-full p-1.5 bg-white dark:bg-zinc-850 border border-slate-250 dark:border-zinc-750 text-slate-800 dark:text-zinc-150 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!newDocName.trim()}
                        onClick={() => {
                          const newDoc = {
                            id: `doc-${Date.now()}`,
                            name: newDocName.trim().endsWith(".pdf") || newDocName.trim().endsWith(".docx") || newDocName.trim().endsWith(".png") || newDocName.trim().endsWith(".xlsx")
                              ? newDocName.trim()
                              : `${newDocName.trim()}.pdf`,
                            size: newDocSize.trim() || "1.2 MB",
                            link: "#"
                          };

                          const updatedDocs = [...(selectedDeal.documents || []), newDoc];
                          const updatedDeal = { ...selectedDeal, documents: updatedDocs };
                          updateDealAndSelected(updatedDeal);

                          // Reset state
                          setNewDocName("");
                          setNewDocSize("");
                        }}
                        className="p-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-all disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5 text-white" />
                        <span>{t("Save")}</span>
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-black/15 text-right">
              <button
                type="button"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer"
                onClick={() => setSelectedDeal(null)}
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. ADD POPUP POPUPS/MODALS FOR PIPELINE MILESTONES       */}
      {/* ======================================================== */}
      {isAddingNewStagePopup && (
        <div className="fixed inset-0 bg-[#0c0c0c]/50 dark:bg-[#000000]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddNewStage} className="bg-white dark:bg-[#151515] w-full max-w-sm rounded-xl border border-slate-205 dark:border-zinc-800 p-5 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-xs uppercase tracking-wide font-mono">
              Add Custom Pipeline Stage
            </h3>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t("Stage Milestone Name *")}</label>
              <input
                type="text"
                required
                placeholder={t("e.g. Executive Board Pitch")}
                value={newStageNameInput}
                onChange={(e) => setNewStageNameInput(e.target.value)}
                className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsAddingNewStagePopup(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold cursor-pointer"
              >
                + Append Stage
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Adding descriptions stage popup */}
      {isAddingDescPopup && (
        <div className="fixed inset-0 bg-[#0c0c0c]/50 dark:bg-[#000000]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveStageDescription} className="bg-white dark:bg-[#151515] w-full max-w-sm rounded-xl border border-slate-205 dark:border-zinc-800 p-5 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-xs uppercase tracking-wide font-mono">
              {t('Add Description: "{stage}"').replace("{stage}", isAddingDescPopup.stage)}
            </h3>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t("Observation Description")}</label>
              <input
                type="text"
                required
                placeholder={t("Brief summary guide text of this milestone...")}
                value={newStageDescInput}
                onChange={(e) => setNewStageDescInput(e.target.value)}
                className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsAddingDescPopup(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded font-bold cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold cursor-pointer"
              >
                Save Description
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Renaming stage popup */}
      {isRenamingStagePopup && (
        <div className="fixed inset-0 bg-[#0c0c0c]/50 dark:bg-[#000000]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleRenameStage} className="bg-white dark:bg-[#151515] w-full max-w-sm rounded-xl border border-slate-205 dark:border-zinc-800 p-5 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-xs uppercase tracking-wide font-mono">
              {t("Rename Stage")}
            </h3>
            
            <div>
              <p className="text-[11px] text-slate-500 mb-2">
                {t('Specify a new title for the "{stage}" stage. All opportunities under this stage will be updated automatically.').replace("{stage}", isRenamingStagePopup)}
              </p>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 uppercase text-slate-650">{t("New Stage Name *")}</label>
              <input
                type="text"
                required
                placeholder={t("e.g. Presentation / Pitch Done")}
                value={renameStageInput}
                onChange={(e) => setRenameStageInput(e.target.value)}
                className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs outline-none text-slate-900 dark:text-white font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsRenamingStagePopup(null);
                  setRenameStageInput("");
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded font-bold cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0078D4] hover:bg-blue-600 text-white rounded font-bold cursor-pointer"
              >
                {t("Apply Rename")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deleting stage popup */}
      {isDeletingStagePopup && (
        <div className="fixed inset-0 bg-[#0c0c0c]/50 dark:bg-[#000000]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleConfirmDeleteStage} className="bg-white dark:bg-[#151515] w-full max-w-sm rounded-xl border border-slate-205 dark:border-zinc-800 p-5 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-850 dark:text-zinc-100 text-xs uppercase tracking-wide font-mono text-rose-600 dark:text-rose-450">
              {t("Delete Stage")}
            </h3>
            
            <div className="space-y-3">
              <p className="text-[11px] text-slate-600 dark:text-zinc-300 font-semibold">
                {t('Are you sure you want to delete the "{stage}" stage?').replace("{stage}", isDeletingStagePopup)}
              </p>
              
              {deals.filter(d => d.stage === isDeletingStagePopup).length > 0 ? (
                <div className="p-3 bg-amber-500/10 dark:bg-amber-955/20 border border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-lg space-y-2 text-xs">
                  <p className="font-bold text-[10px]">{t("⚠️ WARNING: OPPORTUNITIES TO MIGRATE")}</p>
                  <p className="text-[10px]">
                    {t("There are currently {count} opportunities in this stage. Which stage should they be moved to?").replace("{count}", String(deals.filter(d => d.stage === isDeletingStagePopup).length))}
                  </p>
                  
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">{t("Target Stage")}</label>
                    <select
                      value={deleteStageTargetMigration}
                      onChange={(e) => setDeleteStageTargetMigration(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-white"
                    >
                      {activeStages
                        .filter(s => s !== isDeletingStagePopup)
                        .map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                  {t("There are no active opportunities in this stage. You can safely delete it.")}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => setIsDeletingStagePopup(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded font-bold cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold cursor-pointer font-black"
              >
                {t("Understood, Delete")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. CRM FOLLOW-UP REMINDER MAILBOX DIALOG MODAL           */}
      {/* ======================================================== */}
      {isReminderMailboxOpen && reminderSelectedDeal && (
        <div className="fixed inset-0 bg-[#0c0c0c]/60 dark:bg-[#000000]/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151515] w-full max-w-2xl rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-500/10 rounded-lg text-green-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm leading-tight font-sans">
                    {t("Proposal Reminder & Follow-up Mailbox")}
                  </h3>
                  <p className="text-[10px] text-slate-450 dark:text-zinc-500 font-medium">
                    {reminderSelectedDeal.companyName} • {reminderSelectedDeal.contactPerson}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-650 dark:hover:text-zinc-300 p-0.5 cursor-pointer"
                onClick={() => setIsReminderMailboxOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4 text-xs text-slate-700 dark:text-zinc-250 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {emailSendError && (
                <div className="lg:col-span-12 p-4 rounded-xl border border-rose-200 bg-rose-50/20 dark:border-rose-950/40 dark:bg-rose-950/10 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-sans">
                      <AlertTriangle className="w-4 h-4 shrink-0 stroke-[2.5]" />
                      <h4 className="text-xs font-black uppercase tracking-wider font-mono">
                        E-POSTA BAĞLANTI &amp; API AUTH HATASI (CONNECTION ERROR)
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailSendError(null)}
                      className="text-[10px] font-bold text-rose-700 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-200 font-mono cursor-pointer"
                    >
                      [Temizle]
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-zinc-300 space-y-2 bg-white/70 dark:bg-black/30 p-3 rounded-lg border border-rose-100 dark:border-rose-950/20">
                    <p className="font-bold text-rose-700 dark:text-rose-400">
                      {emailSendError.message}
                    </p>
                    <div className="text-[10px] font-mono bg-rose-50/50 dark:bg-black/40 p-2.5 rounded border border-rose-100 dark:border-rose-950/40 whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-zinc-400 select-all font-sans">
                      <strong>{t("System Diagnostics:")}</strong>{"\n"}
                      CODE: {emailSendError.code}{"\n"}{emailSendError.diagnostics}
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      💡 {t("Solution: Disable the email API error simulator in Administration Center > Multi-Email tab or refresh connections.")}
                    </p>
                  </div>
                </div>
              )}

              {/* Left Column: Template Options & Customizer (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                    Hatırlatıcı Zamanlaması
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReminderTemplateMode("7_day");
                        const d = reminderSelectedDeal;
                        const p = d.contactPerson || "Yetkili";
                        const c = d.companyName || "Firma";
                        const dn = d.dealName || `${c} Projesi`;
                        const dur = d.currentStageDuration || 7;
                        setReminderMailSubject(`Gemba Partner: ${c} - Teklif Durum Değerlendirmesi`);
                        setReminderMailBody(`Sayın ${p},\n\n${c} firması için "${dn}" kapsamında sunduğumuz teklifimizin üzerinden ${dur} gün geçmiş bulunmaktadır. Yalın üretim süreçlerinizi optimize etmek adına sunduğumuz bu çalışmayla ilgili teknik ya da ticari bir sorunuz olması durumunda dilediğiniz vakit yardımcı olabiliriz.\n\nSüreçle ilgili güncel değerlendirmelerinizi paylaşabilirseniz seviniriz.\n\nSaygılarımızla,\nGemba Partner Ekibi`);
                      }}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        reminderTemplateMode === "7_day"
                          ? "border-amber-500 bg-amber-50/10 dark:bg-amber-955/20 text-text-light dark:text-amber-400"
                          : "border-slate-200 dark:border-zinc-800 bg-transparent hover:bg-slate-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <p className="font-bold text-[10px] uppercase">7. Gün Takip</p>
                      <p className="text-[9px] opacity-75 mt-0.5">Yenilikçi teknik ve ticari destek rehberi.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReminderTemplateMode("20_day");
                        const d = reminderSelectedDeal;
                        const p = d.contactPerson || "Yetkili";
                        const c = d.companyName || "Firma";
                        const dn = d.dealName || `${c} Projesi`;
                        const dur = d.currentStageDuration || 20;
                        setReminderMailSubject(`Gemba Partner: ${c} - Teklif Süreç Takibi (Önemli)`);
                        setReminderMailBody(`Sayın ${p},\n\n${c} firması için "${dn}" kapsamında hazırladığımız teklif sürecinin üzerinden ${dur} gün geçmiştir.\n\nSöz konusu projenin son durumu, bütçe onayı ve planlama takvimi hususunda güncel bir değerlendirme yapma şansınız oldu mu?\n\nKarşılıklı değer akış haritalama ve verimlilik odaklı bu projeye başlamaktan büyük memnuniyet duyacağız. Konuya dair son gelişmelerle ilgili geri bildiriminizi rica eder, iyi çalışmalar dileriz.\n\nSaygılarımızla,\nGemba Partner Ekibi`);
                      }}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        reminderTemplateMode === "20_day"
                          ? "border-rose-500 bg-rose-50/10 dark:bg-rose-955/20 text-text-light dark:text-rose-450 animate-pulse"
                          : "border-slate-200 dark:border-zinc-800 bg-transparent hover:bg-slate-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <p className="font-bold text-[10px] uppercase font-black">20. Gün Takip</p>
                      <p className="text-[9px] opacity-75 mt-0.5">Bütçe, onay ve proje takvimi sorgulama.</p>
                    </button>
                  </div>
                </div>

                {/* Custom Optional Templates */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    Alternatif Hazır Şablonlar
                  </span>
                  
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {[
                      {
                        title: "Teknik Revizyon & OEE",
                        subject: "Gemba Partner: {{FirmaAdı}} - OEE & Yalın Üretim Revizyonu",
                        body: "Sayın {{İlgiliKişi}},\n\n{{FirmaAdı}} bünyesinde gerçekleştirmeyi hedeflediğimiz {{Projeİçeriği}} çalışmasına ait teknik detaylar ve OEE iyileştirme hedefleri konusunda son görüşleriniz nelerdir?\n\nVarsa teknik revizyon taleplerinizi yanıtlamaya hazırız.\n\nİyi çalışmalar,\n{{Yönetici}}"
                      },
                      {
                        title: "Yönetici Karar Desteği",
                        subject: "Gemba Partner: {{FirmaAdı}} - Karar Destek Görüşmesi",
                        body: "Sayın {{İlgiliKişi}},\n\nYakın zamanda paylaştığımız {{Projeİçeriği}} projesi teklifiyle ilgili üst yönetiminizin bütçe ve fizibilite kararlarını desteklemek adına ek bir analiz sunumu gerçekleştirebiliriz.\n\nSüreç planlamanızı görüşmek amacıyla kısa bir online toplantı set edebilir miyiz?\n\nSaygılarımla,\n{{Yönetici}}"
                      }
                    ].map((temp, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setReminderTemplateMode("custom");
                          handleSelectCustomTemplate(temp);
                        }}
                        className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-slate-150 dark:border-zinc-805 text-[10px] flex items-center justify-between font-semibold group cursor-pointer"
                      >
                        <span className="text-slate-700 dark:text-zinc-200 group-hover:text-green-600">{temp.title}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Client Mail Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                    Gönderim Kanalı / İletişim Tarzı
                  </label>
                  <select
                    value={reminderClientType}
                    onChange={(e: any) => setReminderClientType(e.target.value)}
                    className="w-full p-2 rounded-lg bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold outline-none text-slate-700 dark:text-zinc-200"
                  >
                    <option value="mailto">Default Mail Client (mailto:)</option>
                    <option value="gmail">Google Gmail Web UI (Yeni Sekme)</option>
                    <option value="outlook">Outlook Live (Personal)</option>
                    <option value="outlook-corp">Outlook Office 365 (Corporate)</option>
                  </select>
                </div>

                <div className="p-3 bg-[#0078D4]/5 border border-blue-200/20 rounded-xl space-y-1 text-[10px] text-slate-500 dark:text-zinc-400">
                  <p className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Bilgi ve Akıllı Entegrasyon
                  </p>
                  <p className="leading-tight">
                    Hazırlanan mail içeriği gönderilmek üzere seçtiğiniz e-posta istemcisinde otomatik doldurulur. Ayrıca kolaylık olması açısından mail metni <b>panoya kopyalanır</b>.
                  </p>
                </div>
              </div>

              {/* Right Column: Mail editor fields (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-widest font-mono">ALICI / TO</label>
                  <input
                    type="text"
                    disabled
                    value={`${reminderSelectedDeal.contactPerson} (${reminderSelectedDeal.contactEmail || "E-Posta Belirtilmemiş"})`}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 text-slate-500 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-widest font-mono">E-POSTA KONUSU / SUBJECT</label>
                  <input
                    type="text"
                    value={reminderMailSubject}
                    onChange={(e) => setReminderMailSubject(e.target.value)}
                    className="w-full bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-lg p-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <div className="space-y-1 flex-1 flex flex-col">
                  <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-widest font-mono">MESAJ İÇERİĞİ / MESSAGE BODY</label>
                  <textarea
                    rows={9}
                    value={reminderMailBody}
                    onChange={(e) => setReminderMailBody(e.target.value)}
                    className="w-full flex-1 bg-[#fbfbfb] dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700/80 rounded-lg p-3 text-xs leading-relaxed outline-none focus:ring-1 focus:ring-green-500 font-sans resize-none scrollbar-thin"
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-black/15 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                Açık Kalma Süresi: {reminderSelectedDeal.currentStageDuration || 0} Gün
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-bold rounded-lg text-xs cursor-pointer"
                  onClick={() => setIsReminderMailboxOpen(false)}
                >
                  {t("Cancel")}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-transform"
                  onClick={handleSendReminderMail}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kopyala ve Şifrele/Aç</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Custom Global Confirmation Dialog */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 font-sans antialiased animate-fade-in text-slate-800 dark:text-zinc-200">
          <div className="bg-white dark:bg-[#181818] w-full max-w-sm rounded-xl border border-slate-205 dark:border-zinc-805 shadow-2xl p-6 text-center animate-in zoom-in-95 duration-100">
            <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/25 rounded-full flex items-center justify-center text-rose-500 mb-4">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm mb-2">
              {confirmDeleteModal.title || "Kayıt Silinecek"}
            </h3>
            <p className="text-slate-500 dark:text-zinc-400 text-xs mb-6 font-semibold">
              {confirmDeleteModal.message || "Geri dönüşüm kutusuna taşınsın mı?"}
            </p>
            <div className="flex gap-3 justify-center select-none font-bold">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ isOpen: false, onConfirm: () => {} })}
                className="border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer w-24"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDeleteModal.onConfirm();
                  setConfirmDeleteModal({ isOpen: false, onConfirm: () => {} });
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer shadow-sm w-24 active:scale-95 transition-transform"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
