import React, { useEffect, useState } from "react";
import DashboardView from "./components/DashboardView";
import CampaignDesigner from "./components/CampaignDesigner";
import SendingProgressView from "./components/SendingProgressView";
import HistoryAndLogsView from "./components/HistoryAndLogsView";
import LeadMailGenerator from "./components/LeadMailGenerator";
import LeadProfilesView from "./components/LeadProfilesView";
import CampaignManagerView from "./components/CampaignManagerView";
import AISalesAssistant from "./components/AISalesAssistant";
import TargetAccountsView from "./components/TargetAccountsView";
import DealManagementView from "./components/DealManagementView";
import CompaniesView from "./components/CompaniesView";
import ProposalManagementView from "./components/ProposalManagementView";
import TasksView from "./components/TasksView";
import ContractManagerView from "./components/ContractManagerView";
import DocumentsView from "./components/documents/DocumentsView";
import ServicesView from "./components/ServicesView";
import RevenueManagementView from "./components/RevenueManagementView";
import ManagementPLView from "./components/ManagementPLView";
import CompanyDiscoveryView from "./components/CompanyDiscoveryView";
import GembaLensView from "./components/GembaLensView";
import AdministrationCenter from "./components/AdministrationCenter";
import UserAccountSettings from "./components/UserAccountSettings";
import GlobalSearchBar from "./components/GlobalSearchBar";
import { useLanguage } from "./lib/LanguageContext";
import { useAuth } from "./lib/AuthContext";
import { useOrganization } from "./lib/OrganizationContext";
import { CrmDb } from "./lib/CrmDb";
import type { TaskNotification } from "./components/TasksView";
import { getDisplayInitials } from "./lib/authHelpers";
import { useOrganizationMailboxController } from "./lib/useOrganizationMailboxController";
import { useNavigate } from "react-router-dom";
const logoImage = "https://lh3.googleusercontent.com/d/13bNnthJU4LIICB4iiF1a4GH1PEn05MBx";
// Must exactly match the key used in AdministrationCenter.tsx and currencyHelper.ts.
const ADMIN_ORG_SETTINGS_KEY = "crm_admin_org_settings";
// Org-shared (Supabase-backed via CrmDb), NOT per-browser localStorage. Must
// match the same literal string used in AISalesAssistant.tsx's
// getTavilyApiKey(). Previously this key lived only in the admin's own
// browser localStorage ("tavily_api_key"), which meant it worked when the
// admin tested it on their own machine but every other user/device saw a
// "Tavily API key missing" error, since localStorage never leaves the
// browser it was written in.
const TAVILY_API_KEY_KV = "crm_tavily_api_key";

import {
  Recipient,
  AttachmentFile,
  Campaign,
  DashboardStats
} from "./types";

import {
  LayoutDashboard,
  Mail,
  History,
  Settings,
  Flame,
  Sun,
  Moon,
  Users,
  CheckCircle,
  Cpu,
  Info,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Search,
  Copy,
  Calendar,
  Target,
  X,
  Briefcase,
  Building,
  FileText,
  CheckSquare,
  Scroll,
  FileSignature,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Megaphone,
  BarChart2,
  Lock,
  MapPin,
  ShieldCheck,
  Sliders,
  Bell,
  Globe,
  Menu
} from "lucide-react";

const ACTIVE_TAB_STORAGE_KEY = "gemba_iq_active_tab";
const ACTIVE_TABS = [
  "company-discovery",
  "revenue-management",
  "management-pl",
  "dashboard",
  "designer",
  "lead-generator",
  "lead-profiles",
  "ai-sales-assistant",
  "gemba-lens",
  "target-accounts",
  "deal-management",
  "sales-dashboard",
  "services",
  "create-proposal",
  "campaign-manager",
  "progress",
  "history",
  "companies-registry",
  "proposal-management",
  "todo-list",
  "contract-manager",
  "documents",
  "administration",
] as const;
type ActiveTab = typeof ACTIVE_TABS[number];

function getInitialActiveTab(): ActiveTab {
  try {
    const storedTab = sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (ACTIVE_TABS.includes(storedTab as ActiveTab)) {
      return storedTab as ActiveTab;
    }
  } catch {
    // Keep the existing default if sessionStorage is unavailable.
  }
  return "revenue-management";
}

export default function App() {
  const { lang, setLang, t } = useLanguage();
  const { signOut } = useAuth();
  const { actorName, actorEmail, companyName, isAdmin, organization } = useOrganization();
  const navigate = useNavigate();
  const displayName = actorName;
  const userEmail = actorEmail;
  const userInitials = getDisplayInitials(actorName, actorEmail);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // New Dropdown and navigation sub-states for polished top bar
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState<boolean>(false);
  const [initialAdminSubTab, setInitialAdminSubTab] = useState<string>("organization");

  // admin_org_settings is shared/organization-scoped and lives in Supabase via
  // CrmDb (must match the "crm_admin_org_settings" key used by
  // AdministrationCenter.tsx and currencyHelper.ts). App.tsx only ever runs
  // inside CrmProvider (see RootApp.tsx), so CrmDb is guaranteed to already be
  // hydrated here — safe to read/write synchronously.
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    const saved = CrmDb.getKv<Record<string, any> | null>(ADMIN_ORG_SETTINGS_KEY, null);
    if (saved?.logo && (saved.logo.startsWith("data:") || saved.logo.startsWith("http"))) {
      return saved.logo;
    }
    return logoImage;
  });

  // Keep admin_org_settings' name/phone/defaultLanguage in sync with the real
  // (Supabase-backed) organization record, and seed sensible defaults the
  // first time an organization loads. This replaces a previous sync that lived
  // in OrganizationContext.tsx — moved here because OrganizationContext runs
  // before CrmProvider hydrates, which risked writing into CrmDb's cache before
  // hydration and having that write silently overwritten (data loss risk).
  useEffect(() => {
    const saved = CrmDb.getKv<Record<string, any> | null>(ADMIN_ORG_SETTINGS_KEY, null);
    if (saved) {
      const merged = {
        ...saved,
        name: organization?.name || saved.name,
        phone: organization?.phone || saved.phone || "",
        defaultLanguage: organization?.language || saved.defaultLanguage || "TR",
      };
      if (!merged.logo || merged.logo.includes("regenerated_image") || !String(merged.logo).startsWith("http")) {
        merged.logo = "https://lh3.googleusercontent.com/d/13bNnthJU4LIICB4iiF1a4GH1PEn05MBx";
      }
      CrmDb.setKv(ADMIN_ORG_SETTINGS_KEY, merged);
      setLogoUrl(merged.logo);
    } else {
      const defaultSettings = {
        name: companyName || "Organization",
        website: "https://gembapartner.com",
        phone: organization?.phone || "+90 216 444 04 62",
        address: "Kolektif House Ataşehir, İstanbul, Türkiye",
        taxInfo: "Göztepe V.D. - 3900482910",
        defaultCurrency: "EUR (€)",
        defaultLanguage: organization?.language || "TR",
        timezone: "UTC+03:55 (İstanbul)",
        businessDays: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"],
        workingHours: "09:00 - 18:00",
        fiscalYear: "Ocak - Aralık",
        logo: "https://lh3.googleusercontent.com/d/13bNnthJU4LIICB4iiF1a4GH1PEn05MBx"
      };
      CrmDb.setKv(ADMIN_ORG_SETTINGS_KEY, defaultSettings);
      setLogoUrl(defaultSettings.logo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName, organization?.name, organization?.phone, organization?.language]);

  useEffect(() => {
    const interval = setInterval(() => {
      const saved = CrmDb.getKv<Record<string, any> | null>(ADMIN_ORG_SETTINGS_KEY, null);
      if (saved) {
        const currentLogo = (saved.logo && (saved.logo.startsWith("data:") || saved.logo.startsWith("http"))) ? saved.logo : logoImage;
        if (currentLogo !== logoUrl) {
          setLogoUrl(currentLogo);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [logoUrl]);
  
  // Real notification bell, sourced from the task assignment/reminder engine
  // (TasksView.tsx / CrmDb) rather than a hardcoded mock list. Only the
  // notifications addressed to the signed-in user's own account e-mail are
  // shown here — e.g. "you were just assigned a task" or a due-date/overdue
  // reminder for a task that belongs to them.
  const buildBellNotifications = (): Array<{ id: string; textKey: string; timeKey: string; read: boolean }> => {
    const myEmail = (actorEmail || "").trim().toLowerCase();
    if (!myEmail) return [];
    const describe = (n: TaskNotification): string => {
      switch (n.type) {
        case "assigned":
          return `Size yeni bir görev atandı: "${n.taskTitle}"`;
        case "due_soon":
          return `"${n.taskTitle}" görevinin bitiş tarihi yaklaşıyor.`;
        case "overdue":
          return `"${n.taskTitle}" görevi gecikti.`;
        case "escalation":
          return `"${n.taskTitle}" görevi için eskalasyon bildirimi.`;
        case "daily_summary":
        default:
          return n.subject || `"${n.taskTitle}" ile ilgili bildirim.`;
      }
    };
    return CrmDb.getTaskNotifications()
      .filter((n) => (n.recipientEmail || "").trim().toLowerCase() === myEmail)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 25)
      .map((n) => ({ id: n.id, textKey: describe(n), timeKey: n.createdAt, read: n.isRead }));
  };

  const [notifications, setNotifications] = useState<Array<{ id: string; textKey: string; timeKey: string; read: boolean }>>(
    () => buildBellNotifications()
  );

  // Re-sync the bell from CrmDb: on the periodic re-hydration below (so
  // task assignments made in another session while this one stays open
  // eventually show up here too), and immediately whenever the dropdown
  // is opened.
  const refreshBellNotifications = () => setNotifications(buildBellNotifications());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      CrmDb.hydrateFromSupabase()
        .then(() => refreshBellNotifications())
        .catch(() => {
          // Non-fatal: keep showing whatever was last loaded.
        });
    }, 3 * 60 * 1000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorEmail]);

  // Persists read/unread state back to the shared task-notification store so
  // it's consistent with the Tasks page's own notification list.
  const persistBellReadState = (updateFn: (n: TaskNotification) => TaskNotification) => {
    const myEmail = (actorEmail || "").trim().toLowerCase();
    const all = CrmDb.getTaskNotifications();
    const next = all.map((n) =>
      (n.recipientEmail || "").trim().toLowerCase() === myEmail ? updateFn(n) : n
    );
    CrmDb.saveTaskNotifications(next);
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialActiveTab);
  const [activityReportMenuExpanded, setActivityReportMenuExpanded] = useState<boolean>(true);
  const [companiesMenuExpanded, setCompaniesMenuExpanded] = useState<boolean>(true);
  const [dealsMenuExpanded, setDealsMenuExpanded] = useState<boolean>(true);
  const [leadsMenuExpanded, setLeadsMenuExpanded] = useState<boolean>(true);
  const [campaignMenuExpanded, setCampaignMenuExpanded] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  // Mobil/tablet hamburger navigasyonu: <1024px ekranlarda sidebar artık
  // layout'u itmiyor, ekranın dışında (off-canvas) duruyor ve hamburger
  // butonuyla açılan bir overlay çekmece (drawer) oluyor. Böylece dikey/
  // yatay (landscape) döndürmede de her zaman aynı, öngörülebilir şekilde
  // davranıyor — genişliğe göre, yöne göre değil.
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  
  // Settings Panel Model and Tavily Key States
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isUserAccountSettingsOpen, setIsUserAccountSettingsOpen] = useState<boolean>(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<"admin-center" | "system-config">("admin-center");
  // Org-shared via CrmDb (Supabase), same pattern as ADMIN_ORG_SETTINGS_KEY
  // above — App.tsx only ever runs inside CrmProvider, so CrmDb is already
  // hydrated here and safe to read synchronously. One-time migration below:
  // if this org has never saved a shared key but this specific browser has
  // an old localStorage-only key (from before this fix), promote it to the
  // shared CrmDb store once so the admin doesn't have to re-type it.
  const [tavilyKey, setTavilyKey] = useState<string>(() => {
    const shared = CrmDb.getKv<string>(TAVILY_API_KEY_KV, "");
    if (shared) return shared;
    const legacyLocal = (localStorage.getItem("tavily_api_key") || "").trim();
    if (legacyLocal) {
      CrmDb.setKv(TAVILY_API_KEY_KV, legacyLocal);
      return legacyLocal;
    }
    return "";
  });
  
  // Theme Toggle: Light / Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  // Exchange Statuses
  const {
    session,
    organizationMailbox,
    microsoftConfig,
    onConnectOrganizationMailbox,
    onDisconnectOrganizationMailbox,
    onTestOrganizationMailbox,
  } = useOrganizationMailboxController();
  const [trackingService, setTrackingService] = useState<string>("none");

  // Core Campaign state managers
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState<string>("");
  const [templateBody, setTemplateBody] = useState<string>("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  // Historical campaign audit logs state
  const [logs, setLogs] = useState<Campaign[]>([]);

  // Fixed Modern SaaS (2026) Layout style
  const layoutTheme = "saas";
  const isNotionMode = false;
  const isSaaSMode = true;

  // Effect to toggle CSS themes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Effect to toggle Layout classes
  useEffect(() => {
    document.documentElement.classList.remove("notion-layout", "fluent-layout");
    document.documentElement.classList.add("saas-layout");
    localStorage.setItem("layout-theme", "saas");
  }, []);

  // Mobil çekmece: ekran 1024px'in üzerine çıkarsa (masaüstüne dönüldüyse
  // veya telefon çok geniş bir yatay moda döndüyse) açık kalmış olabilecek
  // hamburger menüyü otomatik kapatır.
  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", closeOnDesktop);
    return () => window.removeEventListener("resize", closeOnDesktop);
  }, []);

  // Çekmece açıkken arka planın kaymasını (scroll) engeller ve Escape ile
  // kapatılabilmesini sağlar — standart mobil navigasyon davranışı.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  // Listen to custom navigation events from search / autocomplete
  useEffect(() => {
    const handleCrmNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };
    window.addEventListener("crm-navigate", handleCrmNavigate);
    return () => window.removeEventListener("crm-navigate", handleCrmNavigate);
  }, []);

  // Auto-expand Deals, Companies, Leads and Campaign submenus if one of them is the active tab
  useEffect(() => {
    if (["services", "deal-management", "proposal-management", "create-proposal", "sales-dashboard"].includes(activeTab)) {
      setDealsMenuExpanded(true);
    }
    if (["companies-registry", "company-discovery", "gemba-lens", "target-accounts"].includes(activeTab)) {
      setCompaniesMenuExpanded(true);
    }
    if (["lead-generator", "lead-profiles", "ai-sales-assistant"].includes(activeTab)) {
      setLeadsMenuExpanded(true);
    }
    if (["campaign-manager", "dashboard", "designer", "progress", "history"].includes(activeTab)) {
      setCampaignMenuExpanded(true);
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
    } catch {
      // Navigation should keep working even if browser storage is blocked.
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isAdmin) {
      setIsSettingsOpen(false);
      setIsSettingsDropdownOpen(false);
      if (activeTab === "administration") {
        setActiveTab("revenue-management");
      }
    }
  }, [isAdmin, activeTab]);

  // Load persisted organization campaign state (Supabase-backed) on mount
  useEffect(() => {
    // Recover Campaign History logs
    const savedLogs = CrmDb.getKv<any[]>("crm_campaign_history_logs", []);
    if (savedLogs && savedLogs.length) {
      setLogs(savedLogs);
    }

    // Recover Template drafts (shared with CampaignDesigner.tsx's "Save List" button —
    // must use the same "crm_working_draft" key)
    const draft = CrmDb.getKv<any>("crm_working_draft", null);
    if (draft) {
      setSubject(draft.subject || "");
      setTemplateBody(draft.templateBody || "");
      setAttachments(draft.attachments || []);
      setRecipients(draft.recipients || []);
      setTrackingService(draft.trackingService || "none");
    }

    // Custom tab-change event listener for easy navigation
    const handleCustomChangeTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener("change-tab", handleCustomChangeTab);
    return () => {
      window.removeEventListener("change-tab", handleCustomChangeTab);
    };
  }, []);

  // Save changes to working drafts (organization-scoped, Supabase-backed)
  useEffect(() => {
    const draft = { subject, templateBody, attachments, recipients, trackingService };
    CrmDb.setKv("crm_working_draft", draft);
  }, [subject, templateBody, attachments, recipients, trackingService]);

  const handleLogout = async () => {
    setIsUserDropdownOpen(false);
    await signOut();
    navigate("/login", { replace: true });
  };

  // Logs management
  const handleSaveCampaignLog = (campaign: Campaign) => {
    // Sanitize the logged campaign to prevent QuotaExceededError in local storage
    const sanitizedAttachments = (campaign.attachments || []).map(att => ({
      name: att.name || "Attachment",
      size: att.size || 0,
      type: att.type || "",
      contentBytes: "" // Strip massive base64 payload bytes which are only needed during transmission
    }));

    const sanitizedCampaign: Campaign = {
      ...campaign,
      attachments: sanitizedAttachments,
      templateBody: campaign.templateBody && campaign.templateBody.length > 50000
        ? campaign.templateBody.substring(0, 50000) + "... (truncated in log history)"
        : campaign.templateBody
    };

    setLogs((prev) => {
      // Put standard newest date on top
      const updated = [sanitizedCampaign, ...prev];
      CrmDb.setKv("crm_campaign_history_logs", updated);
      return updated;
    });
  };

  const handleDeleteCampaignLog = (id: string) => {
    setLogs((prev) => {
      const filtered = prev.filter((l) => l.id !== id);
      CrmDb.setKv("crm_campaign_history_logs", filtered);
      return filtered;
    });
  };

  const handlePushToMailMerge = (newRecs: Recipient[]) => {
    setRecipients((prev) => {
      const updated = [...prev, ...newRecs];
      return updated;
    });
    setActiveTab("designer");
  };

  // Compile Dynamic KPI Stats
  const computeStats = (): DashboardStats => {
    const totalCampaigns = logs.length;
    const totalEmailsSent = logs.reduce((acc, log) => acc + log.successCount, 0);
    const totalEmailsAttempted = logs.reduce((acc, log) => acc + log.recipients.length, 0);
    
    // Aggregates
    const successRate = totalEmailsAttempted > 0
      ? (totalEmailsSent / totalEmailsAttempted) * 100
      : 100;

    // Track active campaigns for open audits
    const trackedCampaigns = logs.filter((l) => l.trackingConnected);
    const totalSentTracked = trackedCampaigns.reduce((acc, l) => acc + l.successCount, 0);
    const totalOpensTracked = trackedCampaigns.reduce((acc, l) => acc + l.openCount, 0);

    const openRate = totalSentTracked > 0
      ? (totalOpensTracked / totalSentTracked) * 100
      : 0;

    const lastCampaignDate = logs.length > 0 ? logs[0].date : null;

    return {
      totalCampaigns,
      totalEmailsSent,
      successRate,
      openRate,
      lastCampaignDate
    };
  };

  const currentStats = computeStats();

  // Clean, reusable Collapsible Navigation Button helper
  interface SidebarButtonProps {
    id: string;
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    activeBorderClass?: string;
    activeTextClass?: string;
    idleTextClass?: string;
    extraClass?: string;
    disabled?: boolean;
    isSubmenu?: boolean;
  }

  const SidebarButton = ({
    id,
    icon,
    label,
    onClick,
    activeBorderClass = "border-l-[#1E3A5F]",
    activeTextClass = "text-[#1E3A5F] dark:text-blue-300 font-semibold bg-[#EAF2FF] dark:bg-[#1E3A5F]/15",
    idleTextClass = "text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 hover:text-slate-800 dark:hover:text-zinc-100",
    extraClass = "",
    disabled = false,
    isSubmenu = false
  }: SidebarButtonProps) => {
    const isActive = activeTab === id;
    
    const handleButtonClick = () => {
      if (disabled) return;
      // Bir sayfaya gerçekten gidildiğinde mobil hamburger çekmecesini
      // otomatik kapat (alt menü başlıklarının aç/kapa tıklaması bu
      // fonksiyonu değil kendi onClick'ini kullanıyor, o yüzden burada
      // sadece gerçek navigasyon tıklamaları kapanmayı tetikler).
      setMobileMenuOpen(false);
      if (onClick) {
        onClick();
      } else {
        setActiveTab(id as any);
      }
    };

    // Height requirements:
    // Parent Menu: 48px
    // Submenu: 42px
    // Active Submenu: 46px
    const heightClass = sidebarCollapsed
      ? "h-[48px] min-h-[48px] py-1"
      : isSubmenu
      ? isActive
        ? "h-[46px] min-h-[46px] py-1"
        : "h-[42px] min-h-[42px] py-1"
      : "h-[48px] min-h-[48px] py-1";

    // Typography requirements:
    // Parent Menu: 15px 600 (semibold)
    // Submenu: 14px 500 (medium)
    const typographyClass = isSubmenu
      ? "text-[14px] font-medium"
      : "text-[15px] font-semibold";

    // Active visual state
    let activeStyle = "";
    let idleStyle = "";

    if (isNotionMode) {
      activeStyle = isActive
        ? "bg-[#eaeae9] dark:bg-[#2c2c2c] text-[#37352f] dark:text-[#dfdfde] font-bold"
        : "";
      idleStyle = "text-slate-650 dark:text-slate-400 hover:bg-[#eaeae9]/50 dark:hover:bg-[#2c2c2c]/50";
    } else {
      if (isSubmenu) {
        if (isActive) {
          // Rounded pill for active submenu, with height 46px, border radius 10px, left indicator 4px, internal horizontal padding 16px
          const borderClass = activeBorderClass.includes("emerald") ? "border-l-emerald-500" :
                              activeBorderClass.includes("amber") ? "border-l-amber-500" :
                              activeBorderClass.includes("#0078D4") ? "border-l-[#1E3A5F]" :
                              activeBorderClass.includes("#1E3A5F") ? "border-l-[#1E3A5F]" :
                              activeBorderClass.includes("#16a34a") ? "border-l-[#16a34a]" :
                              "border-l-[#1E3A5F] dark:border-l-blue-300";
          activeStyle = sidebarCollapsed
            ? `${activeTextClass} rounded-[10px] border-l-[4px] ${borderClass} shadow-xs`
            : `${activeTextClass} rounded-[10px] border-l-[4px] ${borderClass} shadow-xs ml-[32px] mr-[12px]`;
        } else {
          idleStyle = `${idleTextClass}`;
        }
      } else {
        if (isActive) {
          activeStyle = `border-l-[4px] ${activeBorderClass} ${activeTextClass} shadow-sm`;
        } else {
          idleStyle = `border-l-[4px] border-l-transparent ${idleTextClass}`;
        }
      }
    }

    const stateClasses = isActive ? activeStyle : idleStyle;

    // Left alignment and indentation:
    // Parent Menu: 24px left padding
    // Submenu: 48px left padding
    // Every submenu should begin on the same vertical line
    let paddingClass = "";
    if (sidebarCollapsed) {
      paddingClass = "px-0 justify-center items-center overflow-hidden";
    } else {
      if (isSubmenu) {
        if (isActive && !isNotionMode) {
          // Internal horizontal padding 16px (pl-[16px] pr-[16px])
          // Combined with ml-[32px] on the container, the icon is at 32 + 16 = 48px from the left edge of the sidebar!
          paddingClass = "pl-[16px] pr-[16px]";
        } else {
          // For inactive submenu (no left margin or pill background), pl-[48px] puts the icon at exactly 48px from the left!
          paddingClass = "pl-[48px] pr-[16px]";
        }
      } else {
        if (isActive && !isNotionMode) {
          // Active parent button has border-l-[4px], so pl-[20px] puts the icon at exactly 24px from the left!
          paddingClass = "pl-[20px] pr-[24px]";
        } else {
          // Inactive parent button has border-l-transparent, pl-[24px] puts the icon at exactly 24px from the left!
          paddingClass = "pl-[24px] pr-[24px]";
        }
      }
    }

    return (
      <button
        id={`sidebar-nav-${id}`}
        disabled={disabled}
        onClick={handleButtonClick}
        className={`w-full max-w-full overflow-hidden flex items-center transition-all group relative cursor-pointer gap-[12px] ${heightClass} ${paddingClass} ${
          disabled 
            ? "text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50"
            : stateClasses
        } ${extraClass}`}
      >
        <div className={`w-[20px] h-[20px] flex items-center justify-center flex-shrink-0 [&_svg]:!w-[20px] [&_svg]:!h-[20px] ${
          isActive 
            ? "text-[#1E3A5F] dark:text-blue-300 [&_svg]:!text-[#1E3A5F] dark:[&_svg]:!text-blue-300" 
            : "text-slate-400 dark:text-zinc-500 [&_svg]:!text-slate-450 dark:[&_svg]:!text-zinc-500"
        }`}>
          {icon}
        </div>
        {!sidebarCollapsed && (
          <span className={`${typographyClass} leading-[1.4] text-left flex-1 min-w-0 truncate`}>
            {t(label)}
          </span>
        )}
        {sidebarCollapsed && (
          <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white dark:bg-zinc-800 dark:text-zinc-100 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-lg translate-x-1 group-hover:translate-x-0 whitespace-nowrap">
            {t(label)}
          </span>
        )}
      </button>
    );
  };

  const getBreadcrumbs = (tab: string) => {
    const breadcrumbsMap: Record<string, { parent: string; child: string }> = {
      "revenue-management": { parent: "CRM", child: "Revenue Management" },
      "management-pl": { parent: "CRM", child: "Yönetim P/L" },
      "company-discovery": { parent: "Companies & Targets", child: "Company Search" },
      "gemba-lens": { parent: "Companies & Targets", child: "Gemba Lens" },
      "lead-profiles": { parent: "Lead Discovery", child: "Lead Profiles" },
      "lead-generator": { parent: "Lead Discovery", child: "Lead Mail Generator" },
      "ai-sales-assistant": { parent: "Lead Discovery", child: "AI Sales Assistant" },
      "target-accounts": { parent: "Companies & Targets", child: "Target Accounts" },
      "companies-registry": { parent: "Companies & Targets", child: "Customers" },
      "services": { parent: "Deal Management", child: "Services" },
      "sales-dashboard": { parent: "Deal Management", child: "Sales Dashboard" },
      "deal-management": { parent: "Deal Management", child: "Deal Board" },
      "proposal-management": { parent: "Deal Management", child: "Proposal Management" },
      "create-proposal": { parent: "Deal Management", child: "Create Proposal" },
      "todo-list": { parent: "CRM", child: "Tasks" },
      "documents": { parent: "CRM", child: "Documents" },
      "contract-manager": { parent: "CRM", child: "Contract Manager" },
      "campaign-manager": { parent: "Campaign", child: "Campaign Manager" },
      "dashboard": { parent: "Campaign", child: "Campaign Dashboard" },
      "designer": { parent: "Campaign", child: "Mail Merge Builder" },
      "progress": { parent: "Campaign", child: "Merge Sending Queue" },
      "history": { parent: "Campaign", child: "Audit Logs History" },
    };

    const breadcrumb = breadcrumbsMap[tab] || { parent: "CRM", child: tab };
    return {
      parent: t(breadcrumb.parent),
      child: t(breadcrumb.child)
    };
  };

  const breadcrumbs = getBreadcrumbs(activeTab);

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${isNotionMode ? "bg-white dark:bg-[#191919] font-sans text-[#37352f] dark:text-[#dfdfde]" : "bg-[#F3F2F1] dark:bg-[#11100f]"}`}>
      
      {/* Mobil/tablet hamburger çekmecesi için arka plan örtüsü (<1024px).
          Sadece çekmece açıkken render edilir; tıklanınca kapatır. */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-45 bg-black/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dynamic Left Sidebar UI Navigation — <1024px'de sabit (fixed)
          off-canvas çekmece, ≥1024px'de normal statik sidebar */}
      <aside
        className={`flex min-h-screen flex-col justify-between overflow-hidden flex-shrink-0 z-50 transition-transform duration-300 ease-out
          fixed inset-y-0 left-0 lg:relative lg:inset-auto
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          w-[280px] ${sidebarCollapsed ? "lg:w-[80px]" : "lg:w-[300px]"} ${
          isNotionMode
            ? "border-r border-[#1f1f1f]/10 dark:border-white/10 text-[#37352f] dark:text-[#dfdfde]"
            : "border-r border-[#EDEBE9] dark:border-[#323130] text-slate-700 dark:text-slate-300"
        }`}
        style={{ backgroundColor: darkMode ? (isNotionMode ? '#191919' : '#201f1e') : '#f3f2f1' }}
      >
        <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${sidebarCollapsed ? "py-2 px-0" : "py-[12px] px-0"}`}>
          {/* Main Launcher App Branding Header + mobil kapatma butonu */}
          <div className={`flex items-center justify-between pb-[12px] mb-[12px] border-b ${isNotionMode ? "border-[#1f1f1f]/10 dark:border-white/10" : "border-[#EDEBE9] dark:border-[#323130]"} ${sidebarCollapsed ? "px-2" : "px-6"}`}>
            <a
              href="https://gemba-iq.vercel.app/"
              className={`flex min-w-0 flex-1 select-none no-underline ${sidebarCollapsed ? "justify-center items-center" : "items-center justify-start gap-3"}`}
            >
              {isNotionMode ? (
                <span className="text-2xl" role="img" aria-label="Notion icon">🧠</span>
              ) : (
                <img
                  src="/logos/Giqlogo.png"
                  alt="Gemba IQ"
                  className={`w-auto object-contain shrink-0 ${sidebarCollapsed ? "h-[34px]" : "h-[26px]"}`}
                />
              )}
              {!sidebarCollapsed && (
                <h2 className="text-[24px] font-semibold text-slate-800 dark:text-slate-100 font-display tracking-tight uppercase leading-none truncate">
                  GEMBA IQ
                </h2>
              )}
            </a>
            <button
              type="button"
              id="btn-mobile-menu-close"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden shrink-0 ml-2 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 cursor-pointer"
              aria-label={t("Close")}
              title={t("Close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Action Buttons list */}
          <nav className="flex min-h-0 flex-1 flex-col gap-[20px] overflow-x-hidden overflow-y-auto">
            {/* Collapsible Activity Report sub-menu */}
            <div className="flex flex-col gap-[4px]">
              <button
                type="button"
                onClick={() => setActivityReportMenuExpanded(!activityReportMenuExpanded)}
                className={`w-full max-w-full overflow-hidden flex items-center transition-all group relative cursor-pointer gap-[12px] ${
                  sidebarCollapsed ? "px-0 justify-center h-[48px] min-h-[48px] py-1" : "justify-between pl-[24px] pr-[16px] h-[48px] min-h-[48px] py-1"
                } ${
                  isNotionMode
                    ? "text-slate-650 dark:text-slate-400 hover:bg-[#eaeae9]/50 dark:hover:bg-[#2c2c2c]/50"
                    : "border-l-[4px] border-l-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 hover:text-slate-800 dark:hover:text-zinc-100"
                }`}
              >
                <div className={`flex items-center gap-[12px] ${sidebarCollapsed ? "w-full justify-center" : "truncate flex-1 min-w-0"}`}>
                  <div className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0 [&_svg]:!w-[20px] [&_svg]:!h-[20px] text-slate-400 dark:text-zinc-500 [&_svg]:!text-slate-400 dark:[&_svg]:!text-zinc-500">
                    {isNotionMode ? (
                      <span className="text-base">📈</span>
                    ) : (
                      <BarChart2 className="w-[20px] h-[20px] flex-shrink-0" />
                    )}
                  </div>
                  {!sidebarCollapsed && <span className="text-[15px] font-semibold leading-[1.4] cursor-pointer text-left flex-1 truncate">{t("Activity Report")}</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown
                     className={`w-4 h-4 text-slate-450 dark:text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
                      activityReportMenuExpanded ? "" : "-rotate-90"
                    }`}
                  />
                )}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white dark:bg-zinc-800 dark:text-zinc-100 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-lg translate-x-1 group-hover:translate-x-0 whitespace-nowrap">
                    {t("Activity Report")}
                  </span>
                )}
              </button>

              {activityReportMenuExpanded && (
                <div className="relative flex flex-col gap-[4px] w-full overflow-hidden pl-0 ml-0">
                  {!sidebarCollapsed && (
                    <div className="absolute left-[34px] top-0 bottom-0 w-[1px] bg-[#EDEBE9] dark:bg-[#323130] z-10" />
                  )}
                  <SidebarButton
                    id="revenue-management"
                    icon={isNotionMode ? <span className="text-base">💸</span> : <BarChart2 className="w-[20px] h-[20px] flex-shrink-0 text-[#0078D4]" />}
                    label="Revenue Management"
                    activeBorderClass="border-l-[#0078D4]"
                    isSubmenu={true}
                  />
                  <SidebarButton
                    id="management-pl"
                    icon={isNotionMode ? <span className="text-base">🔒</span> : <Lock className="w-[20px] h-[20px] flex-shrink-0 text-[#0078D4]" />}
                    label="Yönetim P/L"
                    activeBorderClass="border-l-[#0078D4]"
                    isSubmenu={true}
                  />
                </div>
              )}
            </div>

            {/* Collapsible Leads sub-menu */}
            <div className="flex flex-col gap-[4px]">
              <button
                type="button"
                onClick={() => setLeadsMenuExpanded(!leadsMenuExpanded)}
                className={`w-full max-w-full overflow-hidden flex items-center transition-all group relative cursor-pointer gap-[12px] ${
                  sidebarCollapsed ? "px-0 justify-center h-[48px] min-h-[48px] py-1" : "justify-between pl-[24px] pr-[16px] h-[48px] min-h-[48px] py-1"
                } ${
                  isNotionMode
                    ? "text-slate-650 dark:text-slate-400 hover:bg-[#eaeae9]/50 dark:hover:bg-[#2c2c2c]/50"
                    : "border-l-[4px] border-l-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 hover:text-slate-800 dark:hover:text-zinc-100"
                }`}
              >
                <div className={`flex items-center gap-[12px] ${sidebarCollapsed ? "w-full justify-center" : "truncate flex-1 min-w-0"}`}>
                  <div className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0 [&_svg]:!w-[20px] [&_svg]:!h-[20px] text-slate-400 dark:text-zinc-500 [&_svg]:!text-slate-400 dark:[&_svg]:!text-zinc-500">
                    {isNotionMode ? (
                      <span className="text-base">👥</span>
                    ) : (
                      <Users className="w-[20px] h-[20px] flex-shrink-0" />
                    )}
                  </div>
                  {!sidebarCollapsed && <span className="text-[15px] font-semibold leading-[1.4] cursor-pointer text-left flex-1 truncate">{t("Lead Discovery")}</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown
                     className={`w-4 h-4 text-slate-450 dark:text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
                      leadsMenuExpanded ? "" : "-rotate-90"
                    }`}
                  />
                )}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white dark:bg-zinc-800 dark:text-zinc-100 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-lg translate-x-1 group-hover:translate-x-0 whitespace-nowrap">
                    {t("Lead Discovery")}
                  </span>
                )}
              </button>

              {leadsMenuExpanded && (
                <div className="relative flex flex-col gap-[4px] w-full overflow-hidden pl-0 ml-0">
                  {!sidebarCollapsed && (
                    <div className="absolute left-[34px] top-0 bottom-0 w-[1px] bg-[#EDEBE9] dark:bg-[#323130] z-10" />
                  )}
                  <SidebarButton
                    id="lead-profiles"
                    icon={isNotionMode ? <span className="text-base">👥</span> : <Users className="w-[20px] h-[20px] flex-shrink-0 text-indigo-500" />}
                    label="Lead Profiles"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="lead-generator"
                    icon={isNotionMode ? <span className="text-base">✍️</span> : <Sparkles className="w-[20px] h-[20px] flex-shrink-0 text-amber-500" />}
                    label="Lead Mail Generator"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="ai-sales-assistant"
                    icon={isNotionMode ? <span className="text-base">🤖</span> : <Sparkles className="w-[20px] h-[20px] flex-shrink-0 text-amber-500 animate-pulse" />}
                    label="AI Sales Assistant"
                    extraClass="animate-pulse-subtle"
                    isSubmenu={true}
                  />
                </div>
              )}
            </div>

            {/* Collapsible Companies sub-menu */}
            <div className="flex flex-col gap-[4px]">
              <button
                type="button"
                onClick={() => setCompaniesMenuExpanded(!companiesMenuExpanded)}
                className={`w-full max-w-full overflow-hidden flex items-center transition-all group relative cursor-pointer gap-[12px] ${
                  sidebarCollapsed ? "px-0 justify-center h-[48px] min-h-[48px] py-1" : "justify-between pl-[24px] pr-[16px] h-[48px] min-h-[48px] py-1"
                } ${
                  isNotionMode
                    ? "text-slate-650 dark:text-slate-400 hover:bg-[#eaeae9]/50 dark:hover:bg-[#2c2c2c]/50"
                    : "border-l-[4px] border-l-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 hover:text-slate-800 dark:hover:text-zinc-100"
                }`}
              >
                <div className={`flex items-center gap-[12px] ${sidebarCollapsed ? "w-full justify-center" : "truncate flex-1 min-w-0"}`}>
                  <div className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0 [&_svg]:!w-[20px] [&_svg]:!h-[20px] text-slate-400 dark:text-zinc-500 [&_svg]:!text-slate-400 dark:[&_svg]:!text-zinc-500">
                    {isNotionMode ? (
                      <span className="text-base">🏢</span>
                    ) : (
                      <Building className="w-[20px] h-[20px] flex-shrink-0" />
                    )}
                  </div>
                  {!sidebarCollapsed && <span className="text-[15px] font-semibold leading-[1.4] cursor-pointer text-left flex-1 truncate">{t("Companies & Targets")}</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown
                     className={`w-4 h-4 text-slate-450 dark:text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
                      companiesMenuExpanded ? "" : "-rotate-90"
                    }`}
                  />
                )}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white dark:bg-zinc-800 dark:text-zinc-100 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-lg translate-x-1 group-hover:translate-x-0 whitespace-nowrap">
                    {t("Companies & Targets")}
                  </span>
                )}
              </button>

              {companiesMenuExpanded && (
                <div className="relative flex flex-col gap-[4px] w-full overflow-hidden pl-0 ml-0">
                  {!sidebarCollapsed && (
                    <div className="absolute left-[34px] top-0 bottom-0 w-[1px] bg-[#EDEBE9] dark:bg-[#323130] z-10" />
                  )}
                  <SidebarButton
                    id="companies-registry"
                    icon={isNotionMode ? <span className="text-base">🏢</span> : <Building className="w-[20px] h-[20px] flex-shrink-0 text-emerald-650" />}
                    label="Customers"
                    activeBorderClass="border-l-emerald-500"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="company-discovery"
                    icon={isNotionMode ? <span className="text-base">🔍</span> : <Search className="w-[20px] h-[20px] flex-shrink-0 text-amber-500" />}
                    label="Company Search"
                    activeBorderClass="border-l-amber-500"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="gemba-lens"
                    icon={isNotionMode ? <span className="text-base">🔬</span> : <Sliders className="w-[20px] h-[20px] flex-shrink-0 text-violet-500" />}
                    label="Gemba Lens"
                    activeBorderClass="border-l-violet-500"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="target-accounts"
                    icon={isNotionMode ? <span className="text-base">🎯</span> : <Target className="w-[20px] h-[20px] flex-shrink-0 text-blue-500" />}
                    label="Target Accounts"
                    isSubmenu={true}
                  />
                </div>
              )}
            </div>

            {/* Collapsible Deals sub-menu */}
            <div className="flex flex-col gap-[4px]">
              <button
                type="button"
                onClick={() => setDealsMenuExpanded(!dealsMenuExpanded)}
                className={`w-full max-w-full overflow-hidden flex items-center transition-all group relative cursor-pointer gap-[12px] ${
                  sidebarCollapsed ? "px-0 justify-center h-[48px] min-h-[48px] py-1" : "justify-between pl-[24px] pr-[16px] h-[48px] min-h-[48px] py-1"
                } ${
                  isNotionMode
                    ? "text-slate-650 dark:text-slate-400 hover:bg-[#eaeae9]/50 dark:hover:bg-[#2c2c2c]/50"
                    : "border-l-[4px] border-l-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 hover:text-slate-800 dark:hover:text-zinc-100"
                }`}
              >
                <div className={`flex items-center gap-[12px] ${sidebarCollapsed ? "w-full justify-center" : "truncate flex-1 min-w-0"}`}>
                  <div className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0 [&_svg]:!w-[20px] [&_svg]:!h-[20px] text-slate-400 dark:text-zinc-500 [&_svg]:!text-slate-400 dark:[&_svg]:!text-zinc-500">
                    {isNotionMode ? (
                      <span className="text-base">💼</span>
                    ) : (
                      <Briefcase className="w-[20px] h-[20px] flex-shrink-0" />
                    )}
                  </div>
                  {!sidebarCollapsed && <span className="text-[15px] font-semibold leading-[1.4] cursor-pointer text-left flex-1 truncate">{t("Deal Management")}</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown
                     className={`w-4 h-4 text-slate-450 dark:text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
                      dealsMenuExpanded ? "" : "-rotate-90"
                    }`}
                  />
                )}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white dark:bg-zinc-800 dark:text-zinc-100 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-lg translate-x-1 group-hover:translate-x-0 whitespace-nowrap">
                    {t("Deal Management")}
                  </span>
                )}
              </button>

              {dealsMenuExpanded && (
                <div className="relative flex flex-col gap-[4px] w-full overflow-hidden pl-0 ml-0">
                  {!sidebarCollapsed && (
                    <div className="absolute left-[34px] top-0 bottom-0 w-[1px] bg-[#EDEBE9] dark:bg-[#323130] z-10" />
                  )}
                  <SidebarButton
                    id="services"
                    icon={isNotionMode ? <span className="text-base">🛠️</span> : <Layers className="w-[20px] h-[20px] flex-shrink-0 text-blue-600" />}
                    label="Services"
                    activeBorderClass="border-l-[#0078D4]"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="sales-dashboard"
                    icon={isNotionMode ? <span className="text-base">📊</span> : <BarChart2 className="w-[20px] h-[20px] flex-shrink-0 text-[#0078D4]" />}
                    label="Sales Dashboard"
                    activeBorderClass="border-l-[#0078D4]"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="deal-management"
                    icon={isNotionMode ? <span className="text-base">💼</span> : <Briefcase className="w-[20px] h-[20px] flex-shrink-0 text-green-600" />}
                    label="Deal Management"
                    activeBorderClass="border-l-[#16a34a]"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="proposal-management"
                    icon={isNotionMode ? <span className="text-base">📄</span> : <FileText className="w-[20px] h-[20px] flex-shrink-0 text-amber-500" />}
                    label="Proposal Management"
                    activeBorderClass="border-l-amber-500"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="create-proposal"
                    icon={isNotionMode ? <span className="text-base">✨</span> : <Sparkles className="w-[20px] h-[20px] flex-shrink-0 text-amber-500" />}
                    label="Create Proposal"
                    activeBorderClass="border-l-amber-500"
                    isSubmenu={true}
                  />
                </div>
              )}
            </div>

            <SidebarButton
              id="todo-list"
              icon={isNotionMode ? <span className="text-base">☑️</span> : <CheckSquare className="w-[20px] h-[20px] flex-shrink-0 text-blue-500" />}
              label="Tasks"
              activeBorderClass="border-l-[#0078D4]"
              isSubmenu={false}
            />

            <SidebarButton
              id="documents"
              icon={isNotionMode ? <span className="text-base">📁</span> : <FileText className="w-[20px] h-[20px] flex-shrink-0 text-indigo-500" />}
              label="Documents"
              activeBorderClass="border-l-[#0078D4]"
              isSubmenu={false}
            />

            <SidebarButton
              id="contract-manager"
              icon={isNotionMode ? <span className="text-base">📜</span> : <Scroll className="w-[20px] h-[20px] flex-shrink-0 text-amber-600" />}
              label="Contract Manager"
              activeBorderClass="border-l-[#0078D4]"
              isSubmenu={false}
            />

            {/* Collapsible Campaign sub-menu */}
            <div className="flex flex-col gap-[4px]">
              <button
                type="button"
                onClick={() => setCampaignMenuExpanded(!campaignMenuExpanded)}
                className={`w-full max-w-full overflow-hidden flex items-center transition-all group relative cursor-pointer gap-[12px] ${
                  sidebarCollapsed ? "px-0 justify-center h-[48px] min-h-[48px] py-1" : "justify-between pl-[24px] pr-[16px] h-[48px] min-h-[48px] py-1"
                } ${
                  isNotionMode
                    ? "text-slate-650 dark:text-slate-400 hover:bg-[#eaeae9]/50 dark:hover:bg-[#2c2c2c]/50"
                    : "border-l-[4px] border-l-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 hover:text-slate-800 dark:hover:text-zinc-100"
                }`}
              >
                <div className={`flex items-center gap-[12px] ${sidebarCollapsed ? "w-full justify-center" : "truncate flex-1 min-w-0"}`}>
                  <div className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0 [&_svg]:!w-[20px] [&_svg]:!h-[20px] text-slate-400 dark:text-zinc-500 [&_svg]:!text-slate-400 dark:[&_svg]:!text-zinc-500">
                    {isNotionMode ? (
                      <span className="text-base">📢</span>
                    ) : (
                      <Megaphone className="w-[20px] h-[20px] flex-shrink-0" />
                    )}
                  </div>
                  {!sidebarCollapsed && <span className="text-[15px] font-semibold leading-[1.4] cursor-pointer text-left flex-1 truncate">{t("Campaign")}</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown
                     className={`w-4 h-4 text-slate-450 dark:text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
                      campaignMenuExpanded ? "" : "-rotate-90"
                    }`}
                  />
                )}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white dark:bg-zinc-800 dark:text-zinc-100 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-lg translate-x-1 group-hover:translate-x-0 whitespace-nowrap">
                    {t("Campaign")}
                  </span>
                )}
              </button>

              {campaignMenuExpanded && (
                <div className="relative flex flex-col gap-[4px] w-full overflow-hidden pl-0 ml-0">
                  {!sidebarCollapsed && (
                    <div className="absolute left-[34px] top-0 bottom-0 w-[1px] bg-[#EDEBE9] dark:bg-[#323130] z-10" />
                  )}
                  <SidebarButton
                    id="campaign-manager"
                    icon={isNotionMode ? <span className="text-base">📅</span> : <Calendar className="w-[20px] h-[20px] flex-shrink-0 text-blue-550" />}
                    label="Campaign Manager"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="dashboard"
                    icon={isNotionMode ? <span className="text-base">📊</span> : <LayoutDashboard className="w-[20px] h-[20px] flex-shrink-0" />}
                    label="Campaign Dashboard"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="designer"
                    icon={isNotionMode ? <span className="text-base">📨</span> : <Mail className="w-[20px] h-[20px] flex-shrink-0" />}
                    label="Mail Merge Builder"
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="progress"
                    icon={isNotionMode ? (
                      <span className="text-base animate-spin" style={{ animationDuration: "12s" }}>⚙️</span>
                    ) : (
                      <Cpu className="w-[20px] h-[20px] flex-shrink-0 animate-spin" style={{ animationDuration: "12s" }} />
                    )}
                    label="Merge Sending Queue"
                    disabled={recipients.length === 0}
                    onClick={() => {
                      if (recipients.length === 0) {
                        alert(t("Please load a recipient spreadsheet or add recipients manually first!"));
                        setActiveTab("designer");
                      } else {
                        setActiveTab("progress");
                      }
                    }}
                    isSubmenu={true}
                  />

                  <SidebarButton
                    id="history"
                    icon={isNotionMode ? <span className="text-base">📜</span> : <History className="w-[20px] h-[20px] flex-shrink-0" />}
                    label="Audit Logs History"
                    isSubmenu={true}
                  />
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Workspace info & mode footer */}
        <div className={`shrink-0 p-4 border-t space-y-3.5 text-xs ${isNotionMode ? "border-[#1f1f1f]/10 dark:border-white/10" : "border-[#EDEBE9] dark:border-[#323130]"}`}>
          {/* Theme switcher & Collapse toggler */}
          <div className={`flex ${sidebarCollapsed ? "flex-col items-center gap-3" : "items-center justify-between"}`}>
            {!sidebarCollapsed && (
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Dark mode toggle</span>
            )}
            <div className={`flex items-center ${sidebarCollapsed ? "flex-col gap-2" : "gap-2"}`}>
              <button
                id="btn-theme-toggle"
                onClick={() => setDarkMode(!darkMode)}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isNotionMode
                    ? "bg-[#eaeae9] dark:bg-[#252525] border-[#1f1f1f]/10 dark:border-white/10 hover:bg-[#DEDCDA] dark:hover:bg-slate-800 text-[#2D3748] dark:text-zinc-200"
                    : "bg-[#EDEBE9] dark:bg-[#252423] border border-[#DEDCDA] dark:border-[#323130] hover:bg-[#DEDCDA] dark:hover:bg-[#252423]/90 text-[#2D3748] dark:text-zinc-200 hover:text-slate-900"
                }`}
                title={t("Switch Themes")}
              >
                {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5" />}
              </button>

              <button
                id="btn-collapse-sidebar"
                onClick={() => {
                  const val = !sidebarCollapsed;
                  setSidebarCollapsed(val);
                  localStorage.setItem("sidebar-collapsed", String(val));
                }}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isNotionMode
                    ? "bg-[#eaeae9] dark:bg-[#252525] border-[#1f1f1f]/10 dark:border-white/10 hover:bg-[#DEDCDA] dark:hover:bg-slate-800 text-[#2D3748] dark:text-zinc-200"
                    : "bg-[#EDEBE9] dark:bg-[#252423] border border-[#DEDCDA] dark:border-[#323130] hover:bg-[#DEDCDA] dark:hover:bg-[#252423]/90 text-[#2D3748] dark:text-zinc-200 hover:text-slate-900"
                }`}
                title={sidebarCollapsed ? "Genişlet" : "Daralt"}
              >
                {sidebarCollapsed ? <ChevronRight className="w-4.5 h-4.5" /> : <ChevronLeft className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          <div className="pt-4 pb-5 border-t border-[#e5e7eb] flex justify-center">
            <img
              src="/logos/Gdogo5.png"
              alt="Gemba Partner"
              className={`h-auto object-contain max-w-full ${sidebarCollapsed ? "w-12" : "w-[140px]"}`}
            />
          </div>
        </div>
      </aside>

      {/* Main Panel Content Stage */}
      <main className={`flex-1 flex flex-col min-w-0 transition-colors ${
        layoutTheme === "saas"
          ? "bg-[#FAFAFA] dark:bg-[#09090b]"
          : layoutTheme === "notion"
          ? "bg-white dark:bg-[#191919]"
          : "bg-[#F3F2F1] dark:bg-[#11100f]"
      }`}>
        
        {/* COMPACT ENTERPRISE TOP HEADER BAR */}
        <div className={`h-[72px] min-h-[72px] border-b sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 backdrop-blur-md ${
          layoutTheme === "saas"
            ? "bg-[#FAFAFA]/90 dark:bg-[#09090b]/90 border-slate-200/50 dark:border-zinc-800/50 shadow-[0_1px_2px_rgba(0,0,0,0.015)]"
            : layoutTheme === "notion"
            ? "bg-white/90 dark:bg-[#191919]/90 border-[#1f1f1f]/10 dark:border-white/10"
            : "bg-white/90 dark:bg-[#1b1a19]/90 border-[#EDEBE9] dark:border-[#323130] shadow-xs"
        }`}>
          {/* LEFT AREA: Hamburger (mobil/tablet, <1024px) + Breadcrumbs */}
          <div className="flex items-center gap-3 shrink min-w-0">
            <button
              type="button"
              id="btn-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden shrink-0 p-2 -ml-1 rounded-lg border bg-white dark:bg-[#141414] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer"
              title={t("Menu")}
              aria-label={t("Menu")}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-sans select-none min-w-0">
              <span className="hidden sm:inline font-semibold text-slate-450 dark:text-zinc-500 truncate max-w-[160px]">{breadcrumbs.parent}</span>
              <span className="hidden sm:inline text-slate-300 dark:text-zinc-700">/</span>
              <span className="font-bold text-slate-800 dark:text-zinc-250 truncate">{breadcrumbs.child}</span>
            </div>
          </div>

          {/* CENTER AREA: Global Search */}
          <div className="flex-1 max-w-md mx-auto hidden md:block">
            <GlobalSearchBar />
          </div>

          {/* RIGHT AREA: Notifications, Language, Settings, Avatar */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* 1. Notifications bell icon dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const opening = !isNotificationsOpen;
                  setIsNotificationsOpen(opening);
                  setIsUserDropdownOpen(false);
                  setIsLangDropdownOpen(false);
                  setIsSettingsDropdownOpen(false);
                  if (opening) refreshBellNotifications();
                }}
                className={`p-2 rounded-lg border transition-all cursor-pointer relative ${
                  isNotificationsOpen
                    ? "bg-slate-100 dark:bg-zinc-800 border-indigo-200 dark:border-zinc-700 text-indigo-650 dark:text-zinc-150"
                    : "bg-white dark:bg-[#141414] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-350 border-slate-200 dark:border-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
                }`}
                title={t("Notifications")}
              >
                <Bell className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-45" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#141414] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-850 dark:text-zinc-200">{t("Notifications")}</span>
                      {notifications.some(n => !n.read) && (
                        <button
                          onClick={() => {
                            setNotifications(notifications.map(n => ({ ...n, read: true })));
                            persistBellReadState((n) => ({ ...n, isRead: true }));
                          }}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                        >
                          {t("Mark all as read")}
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 && (
                        <div className="px-4 py-6 text-center">
                          <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                            {t("No new notifications.")}
                          </span>
                        </div>
                      )}
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifications(notifications.map(item => item.id === n.id ? { ...item, read: true } : item));
                            persistBellReadState((item) => item.id === n.id ? { ...item, isRead: true } : item);
                            setIsNotificationsOpen(false);
                            setActiveTab("todo-list");
                          }}
                          className={`px-4 py-3 border-b border-slate-50 dark:border-zinc-805/50 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/30 cursor-pointer transition-all flex items-start gap-2 ${
                            !n.read ? "bg-indigo-50/20 dark:bg-indigo-950/10 font-medium" : ""
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-indigo-550" : "bg-transparent"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-sans text-left">
                              {n.textKey}
                            </p>
                            <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono block mt-1 text-left">{n.timeKey}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 2. Language Selector (TR / EN) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsLangDropdownOpen(!isLangDropdownOpen);
                  setIsUserDropdownOpen(false);
                  setIsNotificationsOpen(false);
                  setIsSettingsDropdownOpen(false);
                }}
                className={`px-2.5 py-2 text-xs font-bold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-all ${
                  isLangDropdownOpen
                    ? "bg-slate-100 dark:bg-zinc-800 border-indigo-200 dark:border-zinc-700 text-indigo-650 dark:text-zinc-150"
                    : "bg-white dark:bg-[#141414] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-350 border-slate-200 dark:border-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
                }`}
                title={t("Change Language")}
              >
                <span>{t("🇬🇧")}</span>
                <span className="font-mono text-[11px] tracking-wide">{lang}</span>
                <ChevronDown className={`w-3 h-3 text-slate-450 transition-transform duration-150 ${isLangDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isLangDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-45" onClick={() => setIsLangDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-[#141414] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setLang("TR");
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        t("text-slate-700 hover:bg-slate-50 dark:text-zinc-350 dark:hover:bg-zinc-800/50")
                      }`}
                    >
                      <span className="text-sm">🇹🇷</span>
                      <span>TR (Türkçe)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLang("EN");
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        lang === "EN"
                          ? "bg-indigo-50/80 dark:bg-zinc-800 text-indigo-650 dark:text-white"
                          : "text-slate-700 hover:bg-slate-50 dark:text-zinc-350 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <span className="text-sm">🇬🇧</span>
                      <span>EN (English)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 3. ADMIN-only Organization Settings menu */}
            {isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsDropdownOpen(!isSettingsDropdownOpen);
                  setIsUserDropdownOpen(false);
                  setIsNotificationsOpen(false);
                  setIsLangDropdownOpen(false);
                }}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  isSettingsDropdownOpen
                    ? "bg-slate-100 dark:bg-zinc-800 border-indigo-200 dark:border-zinc-700 text-indigo-650 dark:text-zinc-150"
                    : "bg-white dark:bg-[#141414] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-355 border-slate-200 dark:border-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
                }`}
                title={t("Organization Settings")}
              >
                <Settings className={`w-4 h-4 text-slate-600 dark:text-zinc-400 transition-transform duration-300 ${isSettingsDropdownOpen ? "rotate-45 text-indigo-500" : ""}`} />
              </button>

              {isSettingsDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-45" onClick={() => setIsSettingsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#141414] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider border-b border-slate-50 dark:border-zinc-850 mb-1 text-left">
                      {t("Organization Settings")}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setInitialAdminSubTab("organization");
                        setSettingsActiveTab("admin-center");
                        setIsSettingsOpen(true);
                        setIsSettingsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Building className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{t("Organization Information")}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setInitialAdminSubTab("users");
                        setSettingsActiveTab("admin-center");
                        setIsSettingsOpen(true);
                        setIsSettingsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span>{t("Users")}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setInitialAdminSubTab("users");
                        setSettingsActiveTab("admin-center");
                        setIsSettingsOpen(true);
                        setIsSettingsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t("Roles & Permissions")}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsActiveTab("system-config");
                        setIsSettingsOpen(true);
                        setIsSettingsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t("API Keys & Providers")}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setInitialAdminSubTab("datahub");
                        setSettingsActiveTab("admin-center");
                        setIsSettingsOpen(true);
                        setIsSettingsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-sky-500" />
                      <span>{t("Supabase Configuration")}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setInitialAdminSubTab("aisettings");
                        setSettingsActiveTab("admin-center");
                        setIsSettingsOpen(true);
                        setIsSettingsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                      <span>{t("AI Settings")}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setInitialAdminSubTab("auditlogs");
                        setSettingsActiveTab("admin-center");
                        setIsSettingsOpen(true);
                        setIsSettingsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 border-t border-slate-50 dark:border-zinc-800/50 mt-1 pt-1.5 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-slate-450" />
                      <span>{t("System Logs")}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            )}

            {/* 4. User Avatar button with rich dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsUserDropdownOpen(!isUserDropdownOpen);
                  setIsNotificationsOpen(false);
                  setIsLangDropdownOpen(false);
                  setIsSettingsDropdownOpen(false);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all ring-1 ring-offset-1 ring-indigo-500/15 cursor-pointer ${
                  isUserDropdownOpen ? "scale-95 shadow-inner" : "hover:shadow-sm"
                }`}
                style={{ backgroundColor: "#203a43", background: "linear-gradient(to right, #2c5364, #203a43, #0f2027)" }}
              >
                {userInitials}
              </button>

              {isUserDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-45" onClick={() => setIsUserDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#141414] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white font-extrabold text-[10px]">
                        {userInitials}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block truncate">{displayName}</span>
                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-sans block truncate">{userEmail}</span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserAccountSettingsOpen(true);
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t("Account")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsNotificationsOpen(true);
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-zinc-350 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t("Notifications")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLang(lang === "TR" ? "EN" : "TR");
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t("Change Language (TR)")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDarkMode(!darkMode);
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{t("Switch Themes")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserAccountSettingsOpen(true);
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t("Account Settings")}</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-50 dark:border-zinc-800/60 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t("Logout")}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Core Main Container */}
        <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6">

          {/* Content Routing tabs container */}
          <div className="transition-all duration-300">
            {activeTab === "company-discovery" && (
              <CompanyDiscoveryView />
            )}

            {activeTab === "revenue-management" && (
              <RevenueManagementView />
            )}

            {activeTab === "management-pl" && (
              <ManagementPLView />
            )}

            {activeTab === "dashboard" && (
              <DashboardView
                stats={currentStats}
                logs={logs}
                onNavigateToDesigner={() => setActiveTab("designer")}
                trackingService={trackingService}
                setTrackingService={setTrackingService}
              />
            )}

            {activeTab === "designer" && (
              <CampaignDesigner
                recipients={recipients}
                setRecipients={setRecipients}
                subject={subject}
                setSubject={setSubject}
                templateBody={templateBody}
                setTemplateBody={setTemplateBody}
                attachments={attachments}
                setAttachments={setAttachments}
                onLaunchCampaign={() => {
                  if (recipients.length === 0) return alert(t("Please import or add recipients first!"));
                  setActiveTab("progress");
                }}
                isConnected={!!session?.isConnected}
              />
            )}

            {activeTab === "lead-generator" && (
              <LeadMailGenerator
                onPushToMailMerge={handlePushToMailMerge}
                currentMailMergeCount={recipients.length}
              />
            )}

            {activeTab === "lead-profiles" && (
              <LeadProfilesView
                onPushToMailMerge={handlePushToMailMerge}
                currentMailMergeCount={recipients.length}
              />
            )}

            {activeTab === "ai-sales-assistant" && (
              <AISalesAssistant
                onOpenSettings={
                  isAdmin
                    ? () => {
                        setSettingsActiveTab("system-config");
                        setIsSettingsOpen(true);
                      }
                    : undefined
                }
              />
            )}

            {activeTab === "gemba-lens" && (
              <GembaLensView onNavigateToTab={(tab) => setActiveTab(tab as any)} />
            )}

            {activeTab === "target-accounts" && (
              <TargetAccountsView
                onPushToMailMerge={handlePushToMailMerge}
                currentMailMergeCount={recipients.length}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === "sales-dashboard" && (
              <DealManagementView initialTab="dashboard" onNavigateToTab={(tab) => setActiveTab(tab as any)} />
            )}

            {activeTab === "deal-management" && (
              <DealManagementView initialTab="board" onNavigateToTab={(tab) => setActiveTab(tab as any)} />
            )}

            {activeTab === "services" && (
              <ServicesView defaultTab="cards" showSwitcher={false} />
            )}

            {activeTab === "create-proposal" && (
              <ServicesView defaultTab="wizard" showSwitcher={false} />
            )}

            {activeTab === "companies-registry" && (
              <CompaniesView />
            )}

            {activeTab === "proposal-management" && (
              <ProposalManagementView />
            )}

            {activeTab === "todo-list" && (
              <TasksView />
            )}

            {activeTab === "documents" && (
              <DocumentsView />
            )}

            {activeTab === "contract-manager" && (
              <ContractManagerView />
            )}

            {activeTab === "campaign-manager" && (
              <CampaignManagerView
                onPushToMailComposer={(subj, body) => {
                  setSubject(subj);
                  setTemplateBody(body);
                  setActiveTab("designer");
                }}
              />
            )}

            {activeTab === "progress" && (
              <SendingProgressView
                session={session}
                subject={subject}
                recipients={recipients}
                templateBody={templateBody}
                attachments={attachments}
                onBackToDesigner={() => setActiveTab("designer")}
                onCampaignComplete={handleSaveCampaignLog}
                trackingService={trackingService}
              />
            )}

            {activeTab === "history" && (
              <HistoryAndLogsView
                logs={logs}
                onDeleteLog={handleDeleteCampaignLog}
                session={session}
              />
            )}

          </div>
        </div>

        {/* SETTINGS OVERLAY SLIDE-OVER WIDE DRAWER */}
        {isAdmin && isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-900/45 dark:bg-black/60 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div 
              className="absolute inset-0 cursor-pointer"
              onClick={() => setIsSettingsOpen(false)}
            />
            
            {/* Wide Drawer Panel Content (Right-Opening Wide Screen) */}
            <div className="relative w-full max-w-[92vw] lg:max-w-[85vw] xl:max-w-[78vw] bg-[#FAFAFA] dark:bg-[#09090b] h-full shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col z-10 animate-in slide-in-from-right duration-300">
              
              {/* Drawer Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 border-b border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#121212] gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 dark:bg-zinc-900 border border-indigo-200/50 dark:border-zinc-800 text-indigo-650 rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-905 dark:text-zinc-150 text-sm tracking-tight font-sans">
                      {t("Organization Settings")}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 font-sans mt-0.5">
                      {t("Configure shared organization settings, providers, security, and administration.")}
                    </p>
                  </div>
                </div>
                
                {/* Tabs inside Header */}
                <div className="flex items-center gap-1 bg-slate-105 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200/60 dark:border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setSettingsActiveTab("admin-center")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      settingsActiveTab === "admin-center"
                        ? "bg-white dark:bg-[#1e1e1e] text-indigo-600 dark:text-zinc-155 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        : "text-slate-500 hover:text-slate-705 dark:hover:text-zinc-300"
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{t("Organization Settings")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsActiveTab("system-config")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      settingsActiveTab === "system-config"
                        ? "bg-white dark:bg-[#1e1e1e] text-[#0078D4] dark:text-zinc-155 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        : "text-slate-500 hover:text-slate-705 dark:hover:text-zinc-300"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{t("Organization Providers")}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1 px-3 bg-red-50 hover:bg-red-100 dark:bg-[#321111] dark:hover:bg-[#421515] border border-red-200/50 dark:border-rose-950 text-xs font-bold text-red-650 dark:text-red-400 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    {t("Kapat")}
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="pt-6 pb-6 pl-6 pr-6 md:pt-8 md:pb-8 md:pl-8 md:pr-8 overflow-y-auto flex-1">
                {settingsActiveTab === "admin-center" ? (
                  <div className="animate-in fade-in duration-200">
                    <AdministrationCenter
                      onClose={() => setIsSettingsOpen(false)}
                      initialSubTab={initialAdminSubTab}
                      organizationMailbox={organizationMailbox}
                      microsoftConfig={microsoftConfig}
                      onConnectOrganizationMailbox={onConnectOrganizationMailbox}
                      onDisconnectOrganizationMailbox={onDisconnectOrganizationMailbox}
                      onTestOrganizationMailbox={onTestOrganizationMailbox}
                    />
                  </div>
                ) : (
                  <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-200 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-slate-150 dark:border-zinc-800 shadow-xs">
                    
                    {/* Section 1: Tavily Search Engine API Key */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-1.5 border-b border-dashed border-slate-200 dark:border-slate-700">
                        <span className="w-1.5 h-3 bg-[#0078D4] rounded-full"></span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          {t("1. Tavily Arama Motoru API Anahtarı (Search Grounding Engine)")}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans font-medium">
                        {t("Used for the 'Deep Research with Tavily' button in the AI Sales Assistant module. Conducts live cyber intelligence and web searches to prepare enriched company analysis kits in seconds.")}
                      </p>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="password"
                          value={tavilyKey}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTavilyKey(val);
                            CrmDb.setKv(TAVILY_API_KEY_KV, val.trim());
                          }}
                          placeholder={t("Enter your Tavily API key starting with tvly-...")}
                          className="flex-1 text-xs bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-100 px-4 py-3 border border-slate-200 dark:border-zinc-805 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0078D4] font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTavilyKey("");
                            CrmDb.setKv(TAVILY_API_KEY_KV, "");
                            localStorage.removeItem("tavily_api_key");
                          }}
                          className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-[#321111] dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-[#4a1c1c] border border-rose-200 dark:border-rose-950/40 px-3.5 py-3 rounded-xl transition-all font-sans cursor-pointer"
                        >
                          {t("Clear")}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-sans italic flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-slate-400 inline" />
                        <span>
                          {t("This key is shared across your whole organization (every user, every device) as {status}.").replace(
                            "{status}",
                            tavilyKey 
                              ? `"${t("Saved: {prefix}...*****").replace("{prefix}", tavilyKey.substring(0, 8))}"`
                              : `"${t("Empty (Enters simulation mode)")}"`
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Section 2: General Platform Permissions & Advanced Capability */}
                    <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-zinc-800/60">
                      <div className="bg-[#fcfcfa] dark:bg-black/15 p-4 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest font-mono block">PLATFORM PERMISSIONS</span>
                          <p className="text-xs font-bold text-slate-800 dark:text-emerald-400">
                            {t("Active Permissions & API Infrastructure (Google AI Studio Build)")}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                            {t("This application hosts a secure server-side proxy using the Gemini 1.5 Flash model and Microsoft Graph API.")}
                          </p>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-[#11100f] px-3 py-1.5 rounded-lg border border-slate-250/50 dark:border-slate-800 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                          <span>SECURE PROXIES ACTIVE</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>



            </div>
          </div>
        )}

        {isUserAccountSettingsOpen && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsUserAccountSettingsOpen(false)}
            />
            <div className="relative h-full w-full max-w-[92vw] lg:max-w-[520px] bg-white dark:bg-[#0c0b0a] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t("Account")}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("Manage your profile, notifications, language, theme, and personal preferences.")}
                  </p>
                </div>
                <button
                  onClick={() => setIsUserAccountSettingsOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pt-6 pb-6 pl-6 pr-6 md:pt-8 md:pb-8 md:pl-8 md:pr-8">
                <UserAccountSettings
                  onClose={() => setIsUserAccountSettingsOpen(false)}
                  darkMode={darkMode}
                  onToggleTheme={() => setDarkMode((current) => !current)}
                />
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
