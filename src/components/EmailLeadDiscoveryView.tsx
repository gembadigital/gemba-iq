import React, { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { useOrganization } from "../lib/OrganizationContext";
import { fetchOrganizationMailbox } from "../lib/organizationMailbox";
import { fetchPersonalMailbox } from "../lib/personalMailbox";
import { scanMailbox, ScannedMailMessage } from "../lib/mailScan";
import {
  Mail,
  FolderOpen,
  Calendar,
  Layers,
  Database,
  Building,
  Target,
  Sparkles,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  Check,
  Search,
  Filter,
  UserPlus,
  UserCheck,
  ShieldCheck,
  Lock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileText,
  Clock,
  Briefcase
} from "lucide-react";
import { LeadProfile, Recipient, MailboxSession } from "../types";

// Item 8: "Müşterilere ekle" artık sadece boş bir şirket kartı oluşturmuyor —
// keşfedilen kontak (isim/email/görev) ve o kontaktan gelen/giden ilk e-posta
// da ilgili şirket kartına (kontak kişisi + e-posta tabı) kaydediliyor.
export interface DiscoveredContactPayload {
  name: string;
  email: string;
  jobTitle: string;
  date: string;
  isIncoming: boolean;
  snippet: string;
}

interface EmailLeadDiscoveryViewProps {
  onAddLeadsToMaster: (leads: LeadProfile[]) => void;
  onAddCompaniesToMaster?: (companyName: string, domain: string, industry: string, contact: DiscoveredContactPayload) => void;
  onAddTargetAccount?: (accountName: string, domain: string) => void;
}

// Interfaces specific to Discovery
interface DiscoveredLead {
  id: string;
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  phone: string;
  website: string;
  sourceFolder: "Inbox" | "Sent Items";
  firstContactDate: string;
  lastContactDate: string;
  interactionsCount: number;
  leadScore: number;
  relationshipScore: number;
  companySuggestion: string;
  assignedSalesperson: string;
  status: "new" | "added_leads" | "added_companies" | "added_target" | "ignored";
  detectedSignature: string;
}

interface FilteredOutLead {
  email: string;
  reason: string;
  folder: string;
  date: string;
}

interface MailboxConnection {
  id: string;
  provider: "Microsoft 365" | "Outlook" | "Google Workspace";
  kind: "organization" | "personal" | "demo";
  label: string;
  email: string;
  status: "Connected" | "Expired";
  connectedAt: string;
}

export default function EmailLeadDiscoveryView({
  onAddLeadsToMaster,
  onAddCompaniesToMaster,
  onAddTargetAccount
}: EmailLeadDiscoveryViewProps) {
  const { t } = useLanguage();
  const { actorName } = useOrganization();

  // Tab/State states
  const [connections, setConnections] = useState<MailboxConnection[]>([]);
  const [selectedMailboxIds, setSelectedMailboxIds] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<"Inbox" | "Sent Items" | "Both">("Both");
  const [startDate, setStartDate] = useState<string>("2026-05-01");
  const [endDate, setEndDate] = useState<string>("2026-06-22");
  
  // Scanning engine states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<number>(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  // Filter Term
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");

  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [session, setSession] = useState<MailboxSession | null>(null);
  const [scanStatus, setScanStatus] = useState<{
    success: boolean;
    message: string;
    source: "sandbox" | "live";
    errorDetails?: string;
    totalParsed?: number;
    totalFiltered?: number;
  } | null>(null);

  // Lists of results
  const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([]);
  const [filteredOutLeads, setFilteredOutLeads] = useState<FilteredOutLead[]>([]);

  // Row selection (checkboxes) for bulk CRM actions on a subset of leads
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Show Toast Helper
  const triggerToast = (msg: string, type: "success" | "info" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Seed sample leads discovered
  const seedDiscoveredData = () => {
    const list: DiscoveredLead[] = [
      {
        id: "disc-1",
        name: "Atakan Zehir",
        email: "atakan@zehirenergy.com",
        company: "Zehir Energy Materials A.Ş.",
        jobTitle: "Direct of Logistics & Supply Chain",
        phone: "+90 532 999 1122",
        website: "zehirenergy.com",
        sourceFolder: "Inbox",
        firstContactDate: "2026-05-15",
        lastContactDate: "2026-06-20",
        interactionsCount: 14,
        leadScore: 94,
        relationshipScore: 88,
        companySuggestion: "Zehir Energy A.Ş. (Turkey Corp)",
        assignedSalesperson: "Sarah Connor",
        status: "new",
        detectedSignature: "Warm Regards, Atakan Zehir\nDirector of Logistics & Supply Chain\nZehir Energy Materials A.Ş.\nm: +90 532 999 1122 | w: zehirenergy.com"
      },
      {
        id: "disc-2",
        name: "Marcus Vance",
        email: "m.vance@contosotech.co.uk",
        company: "Contoso Tech UK",
        jobTitle: "VP Systems Architecture",
        phone: "+44 7911 123456",
        website: "contosotech.co.uk",
        sourceFolder: "Sent Items",
        firstContactDate: "2026-04-10",
        lastContactDate: "2026-06-18",
        interactionsCount: 27,
        leadScore: 96,
        relationshipScore: 94,
        companySuggestion: "Contoso Ltd London Branch",
        assignedSalesperson: "Unassigned",
        status: "new",
        detectedSignature: "Marcus Vance\nVP Systems Architecture, Contoso Tech UK\nOffice: +44 7911 123456\nLet's integrate operational excellence!"
      },
      {
        id: "disc-3",
        name: "David Miller",
        email: "d.miller@toyota-industrial.de",
        company: "Toyota Industrial Systems",
        jobTitle: "VP Quality & Six Sigma Lead",
        phone: "+49 172 884422",
        website: "toyota-industrial.de",
        sourceFolder: "Inbox",
        firstContactDate: "2026-03-01",
        lastContactDate: "2026-06-05",
        interactionsCount: 8,
        leadScore: 82,
        relationshipScore: 68,
        companySuggestion: "Toyota Manufacturing Europe",
        assignedSalesperson: "Atakan Zehir",
        status: "new",
        detectedSignature: "Mit freundlichen Grüßen,\nDavid Miller\nToyota Industrial Systems Europe GmbH"
      },
      {
        id: "disc-4",
        name: "Kaan Yılmaz",
        email: "kaan.yilmaz@sabanci-enerjisa.com",
        company: "Enerjisa Üretim A.Ş.",
        jobTitle: "Business Development Director",
        phone: "+90 216 555 4433",
        website: "sabanci-enerjisa.com",
        sourceFolder: "Inbox",
        firstContactDate: "2026-06-01",
        lastContactDate: "2026-06-21",
        interactionsCount: 19,
        leadScore: 91,
        relationshipScore: 85,
        companySuggestion: "Sabancı Holding / Enerjisa",
        assignedSalesperson: "David Miller",
        status: "new",
        detectedSignature: "Kaan Yılmaz - Bd Director\nEnerjisa Üretim\nkaan.yilmaz@sabanci-enerjisa.com"
      },
      {
        id: "disc-5",
        name: "Clara Oswald",
        email: "clara.oswald@skoda-mobility.cz",
        company: "Skoda Mobility Solutions",
        jobTitle: "Lead Logistics Strategy Planner",
        phone: "+420 224 881 99`,",
        website: "skoda-mobility.cz",
        sourceFolder: "Sent Items",
        firstContactDate: "2026-05-18",
        lastContactDate: "2026-06-19",
        interactionsCount: 5,
        leadScore: 78,
        relationshipScore: 59,
        companySuggestion: "Skoda Auto Group Europe",
        assignedSalesperson: "Unassigned",
        status: "new",
        detectedSignature: "Clara Oswald | Skoda Mobility\nStrat Planning - Prague Office"
      },
      {
        id: "disc-6",
        name: "Hans Gruber",
        email: "hans@nakatomi-holdings.jp",
        company: "Nakatomi Holdings",
        jobTitle: "Chief Security Officer",
        phone: "+81 3 5555 0192",
        website: "nakatomi-holdings.jp",
        sourceFolder: "Inbox",
        firstContactDate: "2026-06-05",
        lastContactDate: "2026-06-12",
        interactionsCount: 3,
        leadScore: 68,
        relationshipScore: 42,
        companySuggestion: "Nakatomi Corp (Japan)",
        assignedSalesperson: "Unassigned",
        status: "new",
        detectedSignature: "Regards, Hans Gruber\nNakatomi Plaza"
      }
    ];

    const filtered: FilteredOutLead[] = [
      {
        email: "bill.internal@gemba-operasyonel.com",
        reason: t("Internal domain excluded ({domain})").replace("{domain}", "gemba-operasyonel.com"),
        folder: "Inbox",
        date: "2026-06-20"
      },
      {
        email: "marketing-camp@gmail.com",
        reason: t("Excluded public email provider ({domain})").replace("{domain}", "gmail.com"),
        folder: "Inbox",
        date: "2026-06-18"
      },
      {
        email: "customer-support-junk@hotmail.com",
        reason: t("Excluded public email provider ({domain})").replace("{domain}", "hotmail.com"),
        folder: "Sent Items",
        date: "2026-06-15"
      },
      {
        email: "team-activities@yahoo.co.uk",
        reason: t("Excluded public email provider ({domain})").replace("{domain}", "yahoo.co.uk"),
        folder: "Inbox",
        date: "2026-06-12"
      },
      {
        email: "no-reply@hubspot.com",
        reason: t("Automated newsletter / drip sender"),
        folder: "Inbox",
        date: "2026-06-21"
      },
      {
        email: "alert@aws-infra-monitor.com",
        reason: t("Automated alert key phrase detected"),
        folder: "Inbox",
        date: "2026-06-22"
      }
    ];

    setDiscoveredLeads(list);
    setFilteredOutLeads(filtered);
  };

  const [isLoadingConnections, setIsLoadingConnections] = useState(true);

  // Load both possible real mailbox connections (Organization + the caller's
  // own Personal mailbox) before deciding anything. Only falls back to demo
  // data once we've genuinely confirmed neither is connected — previously
  // this fired a fake "sandbox" fallback on first render, before the real
  // check even resolved, which is why the scan always used made-up data.
  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([fetchOrganizationMailbox(), fetchPersonalMailbox()]).then(
      ([orgResult, personalResult]) => {
        if (!isMounted) return;

        const nextConnections: MailboxConnection[] = [];

        if (orgResult.status === "fulfilled") {
          const { mailbox, session: orgSession } = orgResult.value;
          if (orgSession && mailbox.status === "Connected") {
            setSession(orgSession);
            nextConnections.push({
              id: "conn-organization",
              provider: "Microsoft 365",
              kind: "organization",
              label: t("Organization Mailbox"),
              email: orgSession.mail || mailbox.mailbox_email || "organization-mailbox",
              status: "Connected",
              connectedAt: mailbox.connected_at
                ? new Date(mailbox.connected_at).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
            });
          }
        }

        if (personalResult.status === "fulfilled" && personalResult.value.status === "Connected") {
          const personal = personalResult.value;
          nextConnections.push({
            id: "conn-personal",
            provider: "Microsoft 365",
            kind: "personal",
            label: t("My Personal Mailbox"),
            email: personal.mailbox_address,
            status: "Connected",
            connectedAt: personal.connected_at
              ? new Date(personal.connected_at).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
          });
        }

        if (nextConnections.length > 0) {
          setConnections(nextConnections);
          setSelectedMailboxIds(nextConnections.map((c) => c.id));
          setDiscoveredLeads([]);
          setFilteredOutLeads([]);
        } else {
          setSession(null);
          setConnections([]);
          setSelectedMailboxIds([]);
          seedDiscoveredData();
        }
        setIsLoadingConnections(false);
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  // Extracts a lead candidate from one scanned message, applying the same
  // filtering/heuristics regardless of which mailbox or folder it came from.
  const parseMessageIntoLead = (
    msg: ScannedMailMessage,
    myDomain: string,
    parsedLeadsMap: Map<string, DiscoveredLead>,
    filteredList: FilteredOutLead[],
    assignedSalesperson: string
  ) => {
    const isSent = msg.folder === "Sent Items";
    const contact = isSent ? msg.to[0] : msg.from;
    const contactEmailRaw = contact?.address || "";
    const contactNameRaw = contact?.name || "";

    if (!contactEmailRaw) {
      filteredList.push({ email: "Bilinmeyen Adres", reason: "Boş kimlik bilgisi", folder: msg.folder, date: msg.date });
      return;
    }

    const contactEmail = contactEmailRaw.toLowerCase().trim();
    const domain = contactEmail.split("@")[1] || "";
    const contactName = contactNameRaw || contactEmail.split("@")[0];

    if (myDomain && domain === myDomain) {
      filteredList.push({ email: contactEmail, reason: `İç yazışma (${myDomain})`, folder: msg.folder, date: msg.date });
      return;
    }
    if (contactEmail.includes("noreply") || contactEmail.includes("no-reply") || contactEmail.includes("support") || contactEmail.includes("alert")) {
      filteredList.push({ email: contactEmail, reason: "Otomatik/Sistem e-postası (no-reply)", folder: msg.folder, date: msg.date });
      return;
    }
    if (["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "protonmail.com", "aol.com", "yandex.com", "icloud.com"].includes(domain)) {
      filteredList.push({ email: contactEmail, reason: "Genel bireysel sağlayıcı (" + domain + ")", folder: msg.folder, date: msg.date });
      return;
    }

    const companyName = domain ? domain.split(".")[0].toUpperCase() + " Şirketi" : "Kurumsal Kontak";
    let jobTitle = "Kurumsal İletişim Ortağı";
    let phoneNum = "Gönderici imzasından süzülüyor...";
    const bodyPreview = msg.bodyPreview || "";

    const previewLines = bodyPreview.split(/\r?\n|,\s*|\|\s*/);
    previewLines.forEach((line: string) => {
      const val = line.trim();
      const lVal = val.toLowerCase();
      if (
        (lVal.includes("manager") || lVal.includes("director") || lVal.includes("lead") ||
          lVal.includes("vp") || lVal.includes("head") || lVal.includes("müdür") ||
          lVal.includes("mühendis") || lVal.includes("uzman") || lVal.includes("yönetici") ||
          lVal.includes("satın alma") || lVal.includes("planlama") || lVal.includes("lojistik") ||
          lVal.includes("ceo") || lVal.includes("founder") || lVal.includes("kurucu")) &&
        val.length < 55 && val.length > 3
      ) {
        jobTitle = val;
      }
      if (
        (lVal.includes("phone") || lVal.includes("tel") || lVal.includes("mob") || lVal.includes("+90") || lVal.includes("+") || lVal.includes("gsm")) &&
        val.length < 30 && val.length > 6
      ) {
        phoneNum = val;
      }
    });

    if (parsedLeadsMap.has(contactEmail)) {
      parsedLeadsMap.get(contactEmail)!.interactionsCount += 1;
    } else {
      parsedLeadsMap.set(contactEmail, {
        id: `real_disc_${msg.id}_${Date.now()}`,
        name: contactName,
        email: contactEmail,
        company: companyName,
        jobTitle,
        phone: phoneNum,
        website: domain,
        sourceFolder: msg.folder,
        firstContactDate: msg.date,
        lastContactDate: msg.date,
        interactionsCount: 1,
        leadScore: Math.floor(Math.random() * 15) + 80,
        relationshipScore: Math.floor(Math.random() * 15) + 75,
        companySuggestion: companyName + " A.Ş.",
        assignedSalesperson,
        status: "new",
        detectedSignature: bodyPreview.length > 250 ? bodyPreview.substring(0, 250) + "..." : bodyPreview || "(E-posta imza veya gövde metni boş/algılanamadı)"
      });
    }
  };

  // Action: Scan Email Process — real Microsoft Graph read for connected
  // mailboxes, or demo data when nothing is connected yet.
  const handleScanEmails = async () => {
    setIsScanning(true);
    setScanStep(0);
    setScanLogs([]);
    setScanStatus(null);
    setHasScanned(false);

    const selectedConnections = connections.filter(c => selectedMailboxIds.includes(c.id));
    const realConnections = selectedConnections.filter(c => c.kind === "organization" || c.kind === "personal");

    const log = (line: string) => setScanLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);

    if (realConnections.length === 0) {
      log(t("No real mailbox connected — loading demo signature data instead."));
      seedDiscoveredData();
      setScanStatus({
        success: true,
        message: "Bağlı gerçek bir posta kutusu olmadığı için örnek/deneme verileri gösteriliyor.",
        source: "sandbox",
        totalParsed: 6,
        totalFiltered: 6
      });
      setIsScanning(false);
      setHasScanned(true);
      return;
    }

    log(t("Scanning {count} connected mailbox(es): {emails}").replace("{count}", String(realConnections.length)).replace("{emails}", realConnections.map(c => c.email).join(", ")));

    const parsedLeadsMap = new Map<string, DiscoveredLead>();
    const filteredList: FilteredOutLead[] = [];
    let totalMessages = 0;

    try {
      for (const conn of realConnections) {
        log(t("Reading {label} ({email})...").replace("{label}", conn.label).replace("{email}", conn.email));
        // Item 4: tarih aralığı filtresi eskiden hiç kullanılmıyordu. Graph API
        // tarih aralığına göre sorgulanamıyor (sadece en yeni N mesaj çekilebiliyor),
        // bu yüzden en yenisinden en fazla 100 mesajı çekip client-side'da hem
        // klasöre hem seçili tarih aralığına göre filtreliyoruz.
        const { messages } = await scanMailbox(conn.kind as "organization" | "personal", 100);
        const folderScoped = selectedFolder === "Both" ? messages : messages.filter(m => m.folder === selectedFolder);
        const dateScoped = folderScoped.filter(m => {
          if (!m.date) return true;
          if (startDate && m.date < startDate) return false;
          if (endDate && m.date > endDate) return false;
          return true;
        });
        totalMessages += dateScoped.length;
        const myDomain = conn.email.split("@")[1]?.toLowerCase() || "";
        dateScoped.forEach(msg => parseMessageIntoLead(msg, myDomain, parsedLeadsMap, filteredList, actorName));
      }

      const parsedList = Array.from(parsedLeadsMap.values());
      setFilteredOutLeads(filteredList);

      if (parsedList.length > 0) {
        setDiscoveredLeads(parsedList);
        log(`✓ ${parsedList.length} gerçek B2B kurumsal kontağı çözümlenip aday listesine alındı (${totalMessages} e-posta tarandı).`);
        setScanStatus({
          success: true,
          message: `Canlı tarama sonucu ${parsedList.length} adet B2B kurumsal aday çıkarıldı.`,
          source: "live",
          totalParsed: parsedList.length,
          totalFiltered: filteredList.length
        });
        triggerToast(t("{count} real leads extracted from your emails!").replace("{count}", String(parsedList.length)));
      } else {
        setDiscoveredLeads([]);
        log(`Bağlantı kuruldu, ${totalMessages} e-posta okundu. Ancak kurumsal imza/unvan kriterlerine uyan yeni bir aday bulunamadı.`);
        setScanStatus({
          success: true,
          message: "Bağlantı kuruldu ve e-postalar okundu. Ancak imza kriterlerine uyan yeni bir kurumsal aday tespit edilmedi.",
          source: "live",
          totalParsed: 0,
          totalFiltered: filteredList.length
        });
        triggerToast(t("Live connection established but no matching leads found."), "info");
      }
    } catch (err: any) {
      console.error("Live scanning error:", err);
      const errMsg = err.message || String(err);
      log(`❌ Canlı tarama başarısız: ${errMsg}`);
      setScanStatus({
        success: false,
        message: /mail\.read|permission|forbidden|403/i.test(errMsg)
          ? "Microsoft Graph 'Mail.Read' izni verilmemiş görünüyor. Azure App Registration'da Mail.Read (application) izni eklenip yönetici onayı (admin consent) verilmesi gerekiyor."
          : "Microsoft Graph API erişim hatası nedeniyle canlı tarama gerçekleştirilemedi.",
        source: "live",
        errorDetails: errMsg
      });
      triggerToast(t("Error: Live scan failed!"), "info");
    } finally {
      setIsScanning(false);
      setHasScanned(true);
    }
  };

  // CRM Integration Actions
  const handleAddToLeadsSingle = (lead: DiscoveredLead) => {
    // Map to LeadProfile format
    const nameParts = lead.name.split(" ");
    const fName = nameParts[0] || "Unknown";
    const lName = nameParts.slice(1).join(" ") || "Prospect";

    const mappedLead: LeadProfile = {
      id: `lead_${Date.now()}_discovered`,
      no: 1,
      firstName: fName,
      lastName: lName,
      email: lead.email,
      company: lead.company,
      department: lead.jobTitle,
      address: `Discovered from metadata (${lead.sourceFolder})`,
      industry: "Discovered Technology",
      leadDemand: `Email Lead Discovery: Interactions: ${lead.interactionsCount}`,
      leadStatus: "New",
      leadSegment: lead.leadScore >= 90 ? "Hot Lead" : lead.leadScore >= 75 ? "Warm Lead" : "Cold",
      customField1: `First Contact: ${lead.firstContactDate}`,
      customField2: `Website: ${lead.website}`,
      deliveryStatus: "idle",
      openCount: 0,
      addedBy: actorName
    };

    onAddLeadsToMaster([mappedLead]);

    // Update state to reflect added
    setDiscoveredLeads(prev => prev.map(item => item.id === lead.id ? { ...item, status: "added_leads" } : item));
    triggerToast(t("{name} added to Lead Database successfully!").replace("{name}", lead.name));
  };

  const buildDiscoveredContactPayload = (lead: DiscoveredLead): DiscoveredContactPayload => ({
    name: lead.name,
    email: lead.email,
    jobTitle: lead.jobTitle,
    date: lead.lastContactDate || lead.firstContactDate,
    isIncoming: lead.sourceFolder === "Inbox",
    snippet: lead.detectedSignature,
  });

  const handleAddToCompaniesSingle = (lead: DiscoveredLead) => {
    if (onAddCompaniesToMaster) {
      onAddCompaniesToMaster(lead.company, lead.website, "Tech & Operations", buildDiscoveredContactPayload(lead));
    }
    setDiscoveredLeads(prev => prev.map(item => item.id === lead.id ? { ...item, status: "added_companies" } : item));
    triggerToast(t("{company} added to Companies registry!").replace("{company}", lead.company));
  };

  const handleAddToTargetAccountsSingle = (lead: DiscoveredLead) => {
    if (onAddTargetAccount) {
      onAddTargetAccount(lead.company, lead.website);
    }
    setDiscoveredLeads(prev => prev.map(item => item.id === lead.id ? { ...item, status: "added_target" } : item));
    triggerToast(t("{company} added to Target Accounts!").replace("{company}", lead.company));
  };

  const handleAssignSalesperson = (leadId: string, name: string) => {
    setDiscoveredLeads(prev => prev.map(item => item.id === leadId ? { ...item, assignedSalesperson: name } : item));
    triggerToast(t("{name} assigned as salesperson.").replace("{name}", name));
  };

  // Bulk Master Actions
  const handleBulkAddToLeads = () => {
    const unadded = discoveredLeads.filter(l => l.status === "new");
    if (unadded.length === 0) {
      triggerToast(t("No new leads to add."), "info");
      return;
    }

    const mappedLeads: LeadProfile[] = unadded.map((lead, index) => {
      const nameParts = lead.name.split(" ");
      const fName = nameParts[0] || "Unknown";
      const lName = nameParts.slice(1).join(" ") || "Prospect";
      return {
        id: `lead_${Date.now()}_bulk_${index}`,
        no: index + 1,
        firstName: fName,
        lastName: lName,
        email: lead.email,
        company: lead.company,
        department: lead.jobTitle,
        address: `Email Discovery (${lead.sourceFolder})`,
        industry: "B2B Prospect",
        leadDemand: `Discovered from Email`,
        leadStatus: "New",
        leadSegment: lead.leadScore >= 90 ? "Hot Lead" : lead.leadScore >= 75 ? "Warm Lead" : "Cold",
        customField1: `First Contact: ${lead.firstContactDate}`,
        customField2: `Website: ${lead.website}`,
        deliveryStatus: "idle",
        openCount: 0,
        addedBy: actorName
      };
    });

    onAddLeadsToMaster(mappedLeads);
    setDiscoveredLeads(prev => prev.map(item => item.status === "new" ? { ...item, status: "added_leads" } : item));
    triggerToast(t("All {count} new leads transferred to Lead database!").replace("{count}", String(mappedLeads.length)));
  };

  // Selection (checkbox) helpers — lets the user pick a subset of leads
  // instead of only "add one" or "add every new lead".
  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getSelectedNewLeads = () => discoveredLeads.filter(l => selectedLeadIds.includes(l.id) && l.status === "new");

  // Bulk action on just the checked rows → Master Leads
  const handleBulkAddSelectedToLeads = () => {
    const selected = getSelectedNewLeads();
    if (selected.length === 0) {
      triggerToast(t("No new leads to add."), "info");
      return;
    }
    const mappedLeads: LeadProfile[] = selected.map((lead, index) => {
      const nameParts = lead.name.split(" ");
      const fName = nameParts[0] || "Unknown";
      const lName = nameParts.slice(1).join(" ") || "Prospect";
      return {
        id: `lead_${Date.now()}_sel_${index}`,
        no: index + 1,
        firstName: fName,
        lastName: lName,
        email: lead.email,
        company: lead.company,
        department: lead.jobTitle,
        address: `Email Discovery (${lead.sourceFolder})`,
        industry: "B2B Prospect",
        leadDemand: `Discovered from Email`,
        leadStatus: "New",
        leadSegment: lead.leadScore >= 90 ? "Hot Lead" : lead.leadScore >= 75 ? "Warm Lead" : "Cold",
        customField1: `First Contact: ${lead.firstContactDate}`,
        customField2: `Website: ${lead.website}`,
        deliveryStatus: "idle",
        openCount: 0,
        addedBy: actorName
      };
    });
    onAddLeadsToMaster(mappedLeads);
    setDiscoveredLeads(prev => prev.map(item => selectedLeadIds.includes(item.id) ? { ...item, status: "added_leads" } : item));
    setSelectedLeadIds([]);
    triggerToast(t("{count} selected leads transferred to Lead database!").replace("{count}", String(mappedLeads.length)));
  };

  // Bulk action on just the checked rows → Companies (Müşteriler)
  const handleBulkAddSelectedToCompanies = () => {
    const selected = getSelectedNewLeads();
    if (selected.length === 0) {
      triggerToast(t("No new leads to add."), "info");
      return;
    }
    selected.forEach(lead => onAddCompaniesToMaster?.(lead.company, lead.website, "Tech & Operations", buildDiscoveredContactPayload(lead)));
    setDiscoveredLeads(prev => prev.map(item => selectedLeadIds.includes(item.id) ? { ...item, status: "added_companies" } : item));
    setSelectedLeadIds([]);
    triggerToast(t("{count} companies added to Companies registry!").replace("{count}", String(selected.length)));
  };

  // Bulk action on just the checked rows → Target Accounts
  const handleBulkAddSelectedToTargetAccounts = () => {
    const selected = getSelectedNewLeads();
    if (selected.length === 0) {
      triggerToast(t("No new leads to add."), "info");
      return;
    }
    selected.forEach(lead => onAddTargetAccount?.(lead.company, lead.website));
    setDiscoveredLeads(prev => prev.map(item => selectedLeadIds.includes(item.id) ? { ...item, status: "added_target" } : item));
    setSelectedLeadIds([]);
    triggerToast(t("{count} companies added to Target Accounts!").replace("{count}", String(selected.length)));
  };

  // Score badge helper
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900";
    if (score >= 75) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900";
    return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800";
  };

  // Filter logic
  const filteredDiscoveredLeads = discoveredLeads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (scoreFilter === "hot") return matchesSearch && l.leadScore >= 90;
    if (scoreFilter === "warm") return matchesSearch && l.leadScore >= 75 && l.leadScore < 90;
    if (scoreFilter === "unassigned") return matchesSearch && l.assignedSalesperson === "Unassigned";
    
    return matchesSearch;
  });

  const selectableLeadIds = filteredDiscoveredLeads.filter(l => l.status === "new").map(l => l.id);
  const allVisibleSelected = selectableLeadIds.length > 0 && selectableLeadIds.every(id => selectedLeadIds.includes(id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedLeadIds(prev => prev.filter(id => !selectableLeadIds.includes(id)));
    } else {
      setSelectedLeadIds(prev => Array.from(new Set([...prev, ...selectableLeadIds])));
    }
  };

  // Computed Dashboards Stats
  const newContactsCount = discoveredLeads.length;
  const newCompaniesCount = new Set(discoveredLeads.map(l => l.company)).size;
  const missingInCRMCount = discoveredLeads.filter(l => l.status === "new").length;
  const mostActiveContact = discoveredLeads.reduce((prev, current) => (prev.interactionsCount > current.interactionsCount) ? prev : current, discoveredLeads[0] || { name: "Yok", interactionsCount: 0 });
  const unmanagedRelationshipsCount = discoveredLeads.filter(l => l.relationshipScore < 60).length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl border bg-slate-950 border-slate-800 text-slate-100 dark:bg-zinc-900 dark:border-zinc-800">
            <CheckCircle className={`w-5 h-5 ${toast.type === "success" ? "text-emerald-400" : "text-blue-400"}`} />
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Linear-styled Hero Panel */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-primary-500 to-emerald-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1 md:max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Sparkles className="w-3 h-3" /> {t("Auto Lead-Discovery")}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#0078D4] dark:text-indigo-400">
                {t("Contacted List")}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t("Email Lead Discovery Portal")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t("Scan connected Microsoft 365, Gmail, and Outlook corporate Inbox and Sent Items to extract B2B contacts not yet in CRM using AI signature detection.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleScanEmails}
              disabled={isScanning || connections.length === 0}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-sm ${
                isScanning 
                  ? "bg-slate-400 dark:bg-zinc-800 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600 shadow-[0_1px_3px_rgba(79,70,229,0.3)] animate-pulse"
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? t("Scanning Emails...") : t("Scan Mailboxes")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mailbox connection status — kept intentionally simple/honest */}
      {isLoadingConnections ? (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-xs text-slate-500 dark:text-slate-400">
          {t("Loading mailbox connections...")}
        </div>
      ) : connections.length > 0 ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/45 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
            {t("Connected: {mailboxes}. Scanning will read real Inbox and Sent Items from these mailboxes.")
              .replace("{mailboxes}", connections.map(c => `${c.label} (${c.email})`).join(", "))}
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/45 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
            {t("No mailbox connected yet, so the list below shows demo data. Connect the Organization Mailbox (Organization Settings → Shared Mailboxes) or your own Personal Mailbox (My Account) to scan real emails.")}
          </p>
        </div>
      )}

      {/* Connection & Configuration Panel (Compact Linear Block) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Connection Manager */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-900">
            <h3 className="text-xs font-bold text-slate-950 dark:text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-500" />
              {t("Connected Accounts ({count})").replace("{count}", String(connections.length))}
            </h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {connections.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center space-y-2 dark:border-zinc-800">
              <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("No mailboxes connected.")}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                {t("Select mailboxes to scan simultaneously:")}
              </p>
              {connections.map((conn) => {
                const isSelected = selectedMailboxIds.includes(conn.id);
                return (
                  <div
                    key={conn.id}
                    onClick={() => {
                      if (isSelected) {
                        if (selectedMailboxIds.length > 1) {
                          setSelectedMailboxIds(selectedMailboxIds.filter(id => id !== conn.id));
                        } else {
                          triggerToast(t("At least one mailbox must remain selected."), "info");
                        }
                      } else {
                        setSelectedMailboxIds([...selectedMailboxIds, conn.id]);
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 text-left relative ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/20 dark:border-indigo-500/40 dark:bg-indigo-950/20"
                        : "border-slate-150 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Swallowing so onClick toggles correctly
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer accent-indigo-600"
                        />
                        <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          🔵 {conn.label}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate block">
                      {conn.email}
                    </span>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 dark:border-zinc-900/60 font-mono">
                      <span>Ref: {conn.connectedAt}</span>
                      {conn.status === "Connected" ? (
                        <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3 inline" /> {t("Active (Live)")}
                        </span>
                      ) : (
                        <span className="text-amber-500 font-semibold flex items-center gap-0.5" title={t("Not Authorized")}>
                          <AlertCircle className="w-3 h-3 inline" /> {t("Not Authorized")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Folders & Params */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-900">
            <h3 className="text-xs font-bold text-slate-950 dark:text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-500" />
              {t("Folder & Filter Parameters")}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">{t("Secure Scan Mode")}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Folder Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-450 dark:text-zinc-500 tracking-wider flex items-center gap-1">
                <span>{t("Mail Folder")}</span>
              </label>
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50/50 dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setSelectedFolder("Inbox")}
                  className={`flex-1 text-center py-1.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedFolder === "Inbox" ? "bg-white dark:bg-zinc-805 text-indigo-600 shadow-xs dark:text-white" : "text-slate-500"
                  }`}
                >
                  {t("Inbox Folder")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFolder("Sent Items")}
                  className={`flex-1 text-center py-1.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedFolder === "Sent Items" ? "bg-white dark:bg-zinc-805 text-indigo-600 shadow-xs dark:text-white" : "text-slate-500"
                  }`}
                >
                  {t("Sent Folder")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFolder("Both")}
                  className={`flex-1 text-center py-1.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedFolder === "Both" ? "bg-white dark:bg-zinc-805 text-indigo-600 shadow-xs dark:text-white" : "text-slate-500"
                  }`}
                >
                  {t("Both")}
                </button>
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-450 dark:text-zinc-500 tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{t("Start Date")}</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-90 w-full"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-450 dark:text-zinc-500 tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{t("End Date")}</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-90 w-full"
              />
            </div>

          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-900 leading-relaxed dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400">
            <span className="font-bold font-mono">{t("Automatic filter rules active: internal domains, public providers, and automated notifications are excluded.")}</span>
          </div>

        </div>

      </div>

      {/* SCAN STATUS AND ERROR BLOCKS */}
      {scanStatus && (
        <div className={`p-5 rounded-2xl border ${
          scanStatus.success 
            ? "bg-emerald-50/40 border-emerald-200 text-slate-800 dark:bg-emerald-950/10 dark:border-emerald-900/40" 
            : "bg-rose-50/50 border-rose-250 text-slate-800 dark:bg-rose-950/10 dark:border-rose-900/40"
        } space-y-3`}>
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-full ${
              scanStatus.success ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-450"
            }`}>
              {scanStatus.success ? (
                <ShieldCheck className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-slate-100">
                {scanStatus.success ? t("Live scan completed successfully") : t("Live mailbox scan error")}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {scanStatus.message}
              </p>
              
              {/* Detailed error if applicable */}
              {scanStatus.errorDetails && (
                <div className="mt-3 space-y-2 p-3.5 rounded-xl bg-rose-100/30 dark:bg-rose-955/20 border border-rose-200/40">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block uppercase font-mono">⚠️ {t("System Error Details")}</span>
                  <p className="text-[11px] font-mono text-rose-800 dark:text-rose-300 break-all select-all">
                    {scanStatus.errorDetails}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed bg-white/40 dark:bg-black/30 p-2.5 rounded-md mt-2 border border-slate-200/40">
                    <strong>Hata Nedenleri & Nasıl Giderilir?</strong><br />
                    1. <strong>Organization Mailbox bağlantısının yenilenmesi:</strong> Microsoft Graph yetkileri sunucu tarafında otomatik yenilenir. Yenileme başarısız olursa ADMIN bağlantıyı yeniden kurmalıdır.<br />
                    2. <strong>Yetersiz İzin Kapsamı:</strong> Giriş yapılan profilin e-postaları okuyabilmesi için <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] dark:bg-zinc-900 dark:text-zinc-300">Mail.Read</code> yetkisinin verilmiş olması şarttır.<br />
                    <strong className="text-indigo-650 dark:text-indigo-400 block mt-1">✓ Çözüm: Organization Settings içindeki Shared Mailboxes ekranından bağlantıyı test edin veya yeniden bağlayın.</strong>
                  </p>
                </div>
              )}

              {/* Real scan statistics */}
              {scanStatus.success && scanStatus.source === "live" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px] font-mono border-t border-emerald-250/20 mt-3">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-zinc-400">Çözümlenen Kurumsal Aday:</span>{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{scanStatus.totalParsed} adet</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-705 dark:text-zinc-400">Genel/Filtrelenen Sinyaller:</span>{" "}
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{scanStatus.totalFiltered} adet</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIVE PROGRESS DIALOG (Only shows when actively scanning) */}
      {isScanning && (
        <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/10 space-y-4 animate-pulse dark:border-zinc-800 dark:bg-zinc-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 animate-spin" /> {t("Email Scan Intelligence Pool")}
            </span>
            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-100/50 px-2.5 py-0.5 rounded-full dark:bg-indigo-950 dark:text-indigo-300">
              {t("Stage {current} / {total}").replace("{current}", String(scanStep + 1)).replace("{total}", "11")}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden dark:bg-zinc-850">
            <div 
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((scanStep + 1) / 11) * 100}%` }}
            />
          </div>

          {/* Scrolling active log lines */}
          <div className="bg-slate-950 text-emerald-400 p-3.5 rounded-xl border border-slate-800 h-32 overflow-y-auto font-mono text-[10px] space-y-1">
            {scanLogs.map((log, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-slate-600 select-none">▶</span>
                <span className="break-all">{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DASHBOARDS KPI CARDS AND BENTO BLOCKS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wider">{t("Discovered Contacts")}</span>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1 dark:text-indigo-400">{newContactsCount}</div>
          <span className="text-[9px] text-[#16a34a] mt-1">▲ {t("100% fresh contacts")}</span>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wider">{t("New B2B Companies")}</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1 mt-1 dark:text-emerald-400">{newCompaniesCount}</div>
          <span className="text-[9px] text-slate-450">{t("External domain")}</span>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wider">{t("Missing CRM Records")}</span>
          <div className="text-2xl font-bold font-mono text-amber-500 mt-1 dark:text-amber-400">{missingInCRMCount}</div>
          <span className="text-[9px] text-amber-600 font-semibold">{t("Needs refresh")}</span>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between col-span-1 md:col-span-2">
          <span className="text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wider">{t("Most Active Contact")}</span>
          <div className="text-sm font-bold text-slate-800 mt-1.5 dark:text-slate-200 truncate">
            {mostActiveContact.name} ({t("{count} Interactions").replace("{count}", String(mostActiveContact.interactionsCount))})
          </div>
          <span className="text-[9px] text-slate-450 truncate block mt-1">{mostActiveContact.company}</span>
        </div>

        <div className="bg-slate-50 dark:bg-zinc-900 border-indigo-100 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">{t("Unmanaged Relationships")}</span>
          <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1">{unmanagedRelationshipsCount}</div>
          <span className="text-[9px] text-rose-500 font-semibold font-mono">{t("Follow-up gap")}</span>
        </div>

      </div>

      {/* RESULTS WORKSPACE (DISCOVERED AND FILTERED OUT SIDE-BY-SIDE TABS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
        
        {/* Results tab Header and Filter belt */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 dark:border-zinc-900 dark:bg-zinc-900/60">
          
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest font-mono">
                {t("Discovered Lead List")}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {t("Ready prospects extracted from email signatures")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("Search name, company, or email...")}
                className="text-[11px] bg-white px-8 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 dark:border-zinc-800 dark:bg-zinc-90 w-44"
              />
            </div>

            {/* Score Filters */}
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setScoreFilter("all")}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                  scoreFilter === "all" ? "bg-slate-105 text-slate-805 font-bold dark:bg-zinc-801" : "text-slate-500"
                }`}
              >
                {t("All")}
              </button>
              <button
                type="button"
                onClick={() => setScoreFilter("hot")}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                  scoreFilter === "hot" ? "bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/20" : "text-slate-500"
                }`}
              >
                {t("High Score")} (🔥)
              </button>
              <button
                type="button"
                onClick={() => setScoreFilter("unassigned")}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                  scoreFilter === "unassigned" ? "bg-amber-50 text-amber-800 font-bold dark:bg-amber-950/20" : "text-slate-500"
                }`}
              >
                {t("Unassigned")}
              </button>
            </div>

            {/* Bulk Button (acts on every "new" lead, ignoring selection) */}
            <button
              onClick={handleBulkAddToLeads}
              className="text-[11px] font-bold bg-indigo-650 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t("Transfer All to CRM")}</span>
            </button>

          </div>

        </div>

        {/* Selection Action Bar — appears once at least one row checkbox is ticked */}
        {selectedLeadIds.length > 0 && (
          <div className="px-5 py-3 border-b border-indigo-100 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-950/20 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
              {t("{count} leads selected").replace("{count}", String(selectedLeadIds.length))}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBulkAddSelectedToLeads}
                className="text-[10px] font-bold bg-indigo-650 hover:bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              >
                <UserPlus className="w-3 h-3" />
                <span>{t("Add Selected to Master Leads")}</span>
              </button>
              <button
                type="button"
                onClick={handleBulkAddSelectedToCompanies}
                className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              >
                <Building className="w-3 h-3" />
                <span>{t("Add Selected to Customers")}</span>
              </button>
              <button
                type="button"
                onClick={handleBulkAddSelectedToTargetAccounts}
                className="text-[10px] font-bold bg-sky-650 hover:bg-sky-600 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              >
                <Target className="w-3 h-3" />
                <span>{t("Add Selected to Target Accounts")}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLeadIds([])}
                className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 px-2 py-1.5 rounded-lg cursor-pointer hover:underline"
              >
                {t("Clear Selection")}
              </button>
            </div>
          </div>
        )}

        {/* Lead Rows Table */}
        {filteredDiscoveredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2 max-w-sm mx-auto">
            <Filter className="w-8 h-8 text-slate-350 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("No leads match search criteria")}</p>
            <p className="text-[10px] text-slate-450">{t("Try changing filters or scanning another mailbox.")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider dark:border-zinc-900 dark:bg-zinc-900/40">
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      disabled={selectableLeadIds.length === 0}
                      title={t("Select all")}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer accent-indigo-600 disabled:opacity-30"
                    />
                  </th>
                  <th className="px-5 py-3">{t("Contact")}</th>
                  <th className="px-5 py-3">{t("Company & Website")}</th>
                  <th className="px-5 py-3">{t("Suggested Company Card")}</th>
                  <th className="px-4 py-3 text-center">{t("Interactions")}</th>
                  <th className="px-4 py-3">{t("Contact Date Range")}</th>
                  <th className="px-4 py-3">{t("Scores")}</th>
                  <th className="px-4 py-3">{t("Assign Owner")}</th>
                  <th className="px-5 py-3 text-right">{t("CRM Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                {filteredDiscoveredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group dark:hover:bg-zinc-900/30">

                    {/* Row checkbox */}
                    <td className="px-4 py-4">
                      {lead.status === "new" ? (
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => toggleLeadSelection(lead.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer accent-indigo-600"
                        />
                      ) : (
                        <span className="block w-3.5 h-3.5" />
                      )}
                    </td>

                    {/* Name & Title */}
                    <td className="px-5 py-4 w-96 max-w-sm">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {lead.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {t(lead.sourceFolder === "Inbox" ? "Inbox" : "Sent Items")}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate block leading-none">
                          {lead.jobTitle}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate block">
                          {lead.email} | {lead.phone}
                        </div>
                        
                        {/* Signature dropdown preview inside rows */}
                        <div className="text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2 font-mono text-slate-500 hidden group-hover:block dark:bg-zinc-900 dark:border-zinc-800 select-all max-w-[280px]">
                          <span className="text-[9px] uppercase font-bold text-indigo-500 block mb-1">{t("Detected Signature Block:")}</span>
                          {lead.detectedSignature.split("\n").map((line, idx) => <div key={idx}>{line}</div>)}
                        </div>
                      </div>
                    </td>

                    {/* Company & Source */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                          {lead.company}
                        </span>
                        <a 
                          href={`https://${lead.website}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] font-mono text-[#0078D4] hover:underline flex items-center gap-1"
                        >
                          {lead.website} <ArrowRight className="w-3 h-3 rotate-[-45deg]" />
                        </a>
                      </div>
                    </td>

                    {/* Company Suggestion */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-350 bg-slate-50 px-2 py-1 rounded border border-slate-150 block dark:bg-zinc-900 dark:border-zinc-800/80">
                          {lead.companySuggestion}
                        </span>
                        <span className="text-[10px] text-slate-400">{t("AI Auto Suggestion")}</span>
                      </div>
                    </td>

                    {/* Interaction counts */}
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 bg-slate-100 px-2.5 py-1 rounded-md dark:bg-zinc-800">
                        {lead.interactionsCount}
                      </span>
                    </td>

                    {/* Dates */}
                    <td className="px-4 py-4 text-[10.5px] font-mono text-slate-500">
                      <div className="space-y-1">
                        <div>{t("First:")} {lead.firstContactDate}</div>
                        <div>{t("Last:")} {lead.lastContactDate}</div>
                      </div>
                    </td>

                    {/* Scores */}
                    <td className="px-4 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase w-12 text-right">{t("Lead:")}</span>
                          <span className={`px-2 py-0.5 rounded border text-[10.5px] font-extrabold font-mono ${getScoreColor(lead.leadScore)}`}>
                            {lead.leadScore}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase w-12 text-right">{t("Relationship:")}</span>
                          <span className={`px-2 py-0.5 rounded border text-[10.5px] font-extrabold font-mono ${getScoreColor(lead.relationshipScore)}`}>
                            {lead.relationshipScore}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Sorumlu Atama */}
                    <td className="px-4 py-4">
                      <select
                        value={lead.assignedSalesperson}
                        onChange={(e) => handleAssignSalesperson(lead.id, e.target.value)}
                        className="text-[11px] font-medium bg-white border border-slate-250 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-90 select-none cursor-pointer text-slate-800"
                        id={`salesperson-select-${lead.id}`}
                      >
                        <option value="Unassigned">{t("Select Owner")}</option>
                        <option value="Atakan Zehir">{t("Atakan Zehir")} ({t("You")})</option>
                        <option value="Sarah Connor">Sarah Connor</option>
                        <option value="David Miller">David Miller</option>
                      </select>
                    </td>

                    {/* Action buttons (CRM Integration) */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {lead.status === "new" ? (
                          <div className="space-y-1.5 flex flex-col items-stretch max-w-[130px] w-full">
                            <button
                              type="button"
                              onClick={() => handleAddToLeadsSingle(lead)}
                              className="text-[10px] font-bold bg-indigo-650 hover:bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1"
                              title={t("Add to Master Leads")}
                              id={`add-lead-btn-${lead.id}`}
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>{t("Add to Master Leads")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddToCompaniesSingle(lead)}
                              className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1"
                              title={t("Add to Customers")}
                              id={`add-company-btn-${lead.id}`}
                            >
                              <Building className="w-3 h-3" />
                              <span>{t("Add to Customers")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddToTargetAccountsSingle(lead)}
                              className="text-[10px] font-bold bg-sky-650 hover:bg-sky-600 text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1"
                              title={t("Add to Target Accounts")}
                              id={`add-target-btn-${lead.id}`}
                            >
                              <Target className="w-3 h-3" />
                              <span>{t("Add to Target Accounts")}</span>
                            </button>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold font-mono px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 dark:bg-zinc-900/60 dark:border-zinc-800 ${
                            lead.status === "added_leads" ? "text-indigo-650" : lead.status === "added_companies" ? "text-emerald-650" : "text-sky-650"
                          }`}>
                            <Check className="w-4 h-4 text-emerald-500" />
                            {lead.status === "added_leads" ? t("Added to Leads") : lead.status === "added_companies" ? t("Added to Customers") : t("Added to Target")}
                          </span>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* FILTERED OUT SUMMARY (Linear styled collapsed table) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between dark:border-zinc-900 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
              {t("Blocked & Filtered Addresses ({count})").replace("{count}", String(filteredOutLeads.length))}
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{t("Automatic Clean-Out Guard")}</span>
        </div>
        
        <div className="divide-y divide-slate-100 text-xs dark:divide-zinc-900">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-3 bg-slate-50 font-bold text-slate-400 uppercase tracking-widest text-[9.5px] dark:bg-zinc-900/20">
            <span>{t("Blocked Address")}</span>
            <span>{t("Reason")}</span>
            <span>{t("Folder")}</span>
            <span>{t("Detected Date")}</span>
          </div>
          {filteredOutLeads.map((f, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-3.5 hover:bg-slate-50/50 text-slate-600 font-mono text-[11px] dark:hover:bg-zinc-900/10">
              <span className="font-semibold text-slate-800 dark:text-slate-350">{f.email}</span>
              <span className="text-rose-500 font-sans flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {f.reason}
              </span>
              <span>{f.folder === "Inbox" ? t("Inbox") : t("Sent Items")}</span>
              <span className="text-slate-400">{f.date}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
