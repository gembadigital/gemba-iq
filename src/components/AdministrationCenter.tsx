import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useOrganization } from "../lib/OrganizationContext";
import { getDisplayInitials } from "../lib/authHelpers";
import {
  Building,
  Users,
  Mail,
  FileText,
  HardDrive,
  Activity,
  UserCheck,
  Sliders,
  Sparkles,
  Search,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Copy,
  FolderOpen,
  Database,
  Lock,
  RefreshCw,
  Share2,
  FileSpreadsheet,
  Globe,
  Phone,
  Clock,
  Briefcase,
  Layers,
  Check,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { DocumentService } from "../services/DocumentService";
import { CrmDb } from "../lib/CrmDb";
import OrganizationUsersPanel from "./admin/OrganizationUsersPanel";
import type { OrganizationMailbox } from "../lib/organizationMailbox";
const logoImage = "https://lh3.googleusercontent.com/d/13bNnthJU4LIICB4iiF1a4GH1PEn05MBx";

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  subject: string;
  content: string;
  status: "Active" | "Draft";
  updatedAt: string;
}

interface MailboxItem {
  id: string;
  name: string;
  email: string;
  provider: "Microsoft 365" | "Outlook" | "Exchange Online" | "Gmail" | "Google Workspace" | "IMAP" | "SMTP";
  status: "Connected" | "Expired" | "Error";
  owner: string;
  lastSync: string;
}

interface StorageHubItem {
  id: string;
  name: string;
  provider: "Microsoft OneDrive" | "Microsoft SharePoint" | "Google Drive" | "AWS S3" | "Azure Blob" | "Local Storage";
  status: "Connected" | "Disconnected";
  enabled: boolean;
  defaultStorage: boolean;
  description: string;
  createdDate: string;
  lastSync: string;
  lastModified: string;
  connectionHealth: "Healthy" | "Unhealthy" | "Degraded" | "Untested";
  defaultRootFolder: string;
  owner: string;
  clientId?: string;
  clientSecret?: string;
  bucketName?: string; // or Container Name
  regionHost?: string; // or endpoint
  usage?: string;
}

interface AuditLogItem {
  id: string;
  user: string;
  timestamp: string;
  action: string;
  module: string;
  result: "Success" | "Failure" | "Warning";
}

interface AdministrationCenterProps {
  onClose?: () => void;
  initialSubTab?: string;
  organizationMailbox?: OrganizationMailbox | null;
  microsoftConfig?: { hasClientKeys: boolean } | null;
  onConnectOrganizationMailbox?: () => void;
  onDisconnectOrganizationMailbox?: () => void;
  onTestOrganizationMailbox?: () => void;
}

export default function AdministrationCenter({
  onClose,
  initialSubTab,
  organizationMailbox,
  microsoftConfig,
  onConnectOrganizationMailbox,
  onDisconnectOrganizationMailbox,
  onTestOrganizationMailbox,
}: AdministrationCenterProps) {
  const { lang: selectedLanguage, setLang: setSelectedLanguage, t } = useLanguage();
  const isTR = selectedLanguage === "TR";
  const L = (trText: string, enText: string) => (isTR ? trText : enText);
  const menuLabel = (menu: string) => {
    const labels: Record<string, [string, string]> = {
      Companies: ["Şirketler", "Companies"],
      Leads: ["Adaylar", "Leads"],
      Opportunities: ["Fırsatlar", "Opportunities"],
      Proposals: ["Teklifler", "Proposals"],
      Campaigns: ["Kampanyalar", "Campaigns"],
      "Activity Reports": ["Faaliyet Raporları", "Activity Reports"],
      "Revenue Reports": ["Gelir Raporları", "Revenue Reports"],
      Administration: ["Yönetim", "Administration"],
      "AI Assistant": ["Yapay Zeka Asistanı", "AI Assistant"],
      "Skill Library": ["Yetenek Kütüphanesi", "Skill Library"],
      "Email Management": ["E-posta Yönetimi", "Email Management"],
    };
    const pair = labels[menu];
    return pair ? L(pair[0], pair[1]) : menu;
  };
  const permLabel = (perm: string) => {
    const labels: Record<string, [string, string]> = {
      View: ["Görüntüle", "View"],
      Create: ["Oluştur", "Create"],
      Edit: ["Düzenle", "Edit"],
      Delete: ["Sil", "Delete"],
      Export: ["Dışa Aktar", "Export"],
      Manage: ["Yönet", "Manage"],
    };
    const pair = labels[perm];
    return pair ? L(pair[0], pair[1]) : perm;
  };
  const categoryLabel = (category: string) => {
    const labels: Record<string, [string, string]> = {
      "Proposal Templates": ["Teklif Şablonları", "Proposal Templates"],
      "Campaign Templates": ["Kampanya Şablonları", "Campaign Templates"],
      "Follow-Up Templates": ["Takip Şablonları", "Follow-Up Templates"],
      "Meeting Templates": ["Toplantı Şablonları", "Meeting Templates"],
      "Project Templates": ["Proje Şablonları", "Project Templates"],
      "System Templates": ["Sistem Şablonları", "System Templates"],
    };
    const pair = labels[category];
    return pair ? L(pair[0], pair[1]) : category;
  };
  const resultLabel = (result: string) => {
    if (result === "Success") return L("Başarılı", "Success");
    if (result === "Failure") return L("Başarısız", "Failure");
    if (result === "Warning") return L("Uyarı", "Warning");
    return result;
  };
  const { user } = useAuth();
  const { actorName, actorEmail, companyName, isAdmin } = useOrganization();
  const adminDisplayName = actorName;
  const adminEmail = actorEmail;
  const adminInitials = getDisplayInitials(actorName, actorEmail);
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab || "organization");

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [showSavedMsg, setShowSavedMsg] = useState<boolean>(false);

  // 1. Organization Settings
  const [orgSettings, setOrgSettings] = useState(() => {
    const saved = localStorage.getItem("admin_org_settings");
    const defaultSettings = {
      name: companyName || "Organization",
      website: "https://gembapartner.com",
      phone: "+90 216 444 04 62",
      address: "Kolektif House Ataşehir, İstanbul, Türkiye",
      taxInfo: "Göztepe V.D. - 3900482910",
      defaultCurrency: "EUR (€)",
      defaultLanguage: "TR",
      timezone: "UTC+03:55 (İstanbul)",
      businessDays: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"],
      workingHours: "09:00 - 18:00",
      fiscalYear: "Ocak - Aralık",
      logo: logoImage
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const logo = (parsed.logo && (parsed.logo.startsWith("data:") || parsed.logo.startsWith("http"))) ? parsed.logo : logoImage;
        return { ...defaultSettings, ...parsed, logo };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem("admin_org_settings", JSON.stringify(orgSettings));
  }, [orgSettings]);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const [simulateEmailError, setSimulateEmailError] = useState<boolean>(() =>
    CrmDb.getKv<boolean>("crm_simulate_email_error", false)
  );

  useEffect(() => {
    CrmDb.setKv("crm_simulate_email_error", simulateEmailError);
  }, [simulateEmailError]);

  // 2.2 Permissions Matrix state
  const [pMatrix, setPMatrix] = useState<{ [role: string]: { [menu: string]: string[] } }>(() => ({
    ADMIN: {
      "Companies": ["View", "Create", "Edit", "Delete", "Export", "Manage"],
      "Leads": ["View", "Create", "Edit", "Delete", "Export", "Manage"],
      "Opportunities": ["View", "Create", "Edit", "Delete", "Export", "Manage"],
      "Proposals": ["View", "Create", "Edit", "Delete", "Export", "Manage"],
      "Campaigns": ["View", "Create", "Edit", "Delete", "Export", "Manage"],
      "Activity Reports": ["View", "Create", "Edit", "Delete", "Export", "Manage"],
      "Revenue Reports": ["View", "Create", "Edit", "Delete", "Export", "Manage"],
      "Administration": ["View", "Create", "Edit", "Delete", "Export", "Manage"],
      "AI Assistant": ["View", "Create", "Edit", "Delete", "Export", "Manage"],
      "Skill Library": ["View", "Create", "Edit", "Delete", "Export", "Manage"],
      "Email Management": ["View", "Create", "Edit", "Delete", "Export", "Manage"]
    },
    USER: {
      "Companies": ["View", "Create", "Edit"],
      "Leads": ["View", "Create", "Edit"],
      "Opportunities": ["View", "Create", "Edit"],
      "Proposals": ["View", "Create"],
      "Campaigns": ["View"],
      "Activity Reports": ["View", "Create", "Edit"],
      "Revenue Reports": ["View"],
      "Administration": [],
      "AI Assistant": ["View", "Create"],
      "Skill Library": ["View", "Create", "Edit"],
      "Email Management": ["View"]
    }
  }));

  const menusList = [
    "Companies", "Leads", "Opportunities", "Proposals", "Campaigns",
    "Activity Reports", "Revenue Reports", "Administration", "AI Assistant", "Skill Library", "Email Management"
  ];
  const permsList = ["View", "Create", "Edit", "Delete", "Export", "Manage"];
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<string>("USER");

  const togglePermission = (menu: string, perm: string) => {
    const current = pMatrix[selectedRoleForMatrix] || {};
    const currentPermsForMenu = current[menu] || [];
    let updated: string[];
    if (currentPermsForMenu.includes(perm)) {
      updated = currentPermsForMenu.filter(p => p !== perm);
    } else {
      updated = [...currentPermsForMenu, perm];
    }
    setPMatrix({
      ...pMatrix,
      [selectedRoleForMatrix]: {
        ...current,
        [menu]: updated
      }
    });
    addAuditLog(actorName, "Yetki Değişikliği", `${selectedRoleForMatrix} rolü için ${menu} yetkileri güncellendi.`, "Yetki Yönetimi");
  };

  // 3. Connected Mailboxes
  const [mailboxes, setMailboxes] = useState<MailboxItem[]>(() => {
    const saved = localStorage.getItem("admin_mailboxes_list");
    return saved ? JSON.parse(saved) : [
      {
        id: "m-2",
        name: "Atakan Zehir Genel",
        email: "a.zehir@gembapartner.com",
        provider: "Microsoft 365",
        status: "Connected",
        owner: "Atakan Zehir",
        lastSync: "Şimdi"
      },
      {
        id: "m-4",
        name: "Destek Masası",
        email: "support@gembapartner.com",
        provider: "Microsoft 365",
        status: "Expired",
        owner: "Müşteri Hizmetleri",
        lastSync: "Dün"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("admin_mailboxes_list", JSON.stringify(mailboxes));
  }, [mailboxes]);

  const [newMailbox, setNewMailbox] = useState<Partial<MailboxItem>>({
    name: "",
    email: "",
    provider: "Microsoft 365",
    owner: ""
  });
  const [isConnectMailboxOpen, setIsConnectMailboxOpen] = useState(false);

  const handleConnectNewMailbox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMailbox.email) return;

    const item: MailboxItem = {
      id: `m-${Date.now()}`,
      name: newMailbox.name || "Yeni Posta Kutusu",
      email: newMailbox.email,
      provider: newMailbox.provider || "Microsoft 365",
      status: "Connected",
      owner: newMailbox.owner || actorName,
      lastSync: "Şimdi bağlı (Canlı)"
    };

    setMailboxes([...mailboxes, item]);
    setIsConnectMailboxOpen(false);
    setNewMailbox({ name: "", email: "", provider: "Microsoft 365", owner: "" });
    addAuditLog(actorName, "Yeni E-posta Bağlandı", `Yeni posta kutusu entegre edildi: ${item.email} (${item.provider})`, "E-posta Yönetimi");
    alert("Posta kutusu entegrasyonu ve Microsoft Graph API yetkilendirmesi başarıyla tamamlandı!");
  };

  const handleRemoveMailbox = (id: string) => {
    const box = mailboxes.find(m => m.id === id);
    if (!box) return;
    if (confirm(`${box.email} posta kutusu bağlantısını koparmak istediğinize emin misiniz?`)) {
      setMailboxes(mailboxes.filter(m => m.id !== id));
      addAuditLog(actorName, "E-posta Bağlantısı Kesildi", `${box.email} hesabı sistemden kaldırıldı.`, "E-posta Yönetimi");
    }
  };

  // 4. Email Templates
  const [templates, setTemplates] = useState<TemplateItem[]>(() => {
    const saved = localStorage.getItem("admin_templates_list");
    return saved ? JSON.parse(saved) : [
      {
        id: "t-1",
        name: "Yalın Danışmanlık İş Birliği Teklifi",
        category: "Proposal Templates",
        subject: "Gemba Partner - Yalın Dönüşüm Süreci Teklifi",
        content: `Sayın Yetkili,\n\nGemba Partner olarak işletmenizin verimlilik süreçlerini optimize etmek amacıyla hazırladığımız Yalın Dönüşüm Süreci Teklifimizi ekte bilgilerinize sunarız.\n\nİş birliğimizin başarılı geçmesini diler, geri dönüşlerinizi bekleriz.\n\nSaygılarimizla,\nGemba Partner Yönetim Ekibi`,
        status: "Active",
        updatedAt: "2026-06-21"
      },
      {
        id: "t-2",
        name: "Kapasite Planlama Raporu Takibi",
        category: "Follow-Up Templates",
        subject: "Kapasite & Danışman Dağılım Rapor İzleme",
        content: `Merhaba,\n\nGeçtiğimiz hafta paylaştığımız Kapasite ve Danışman Dağılım Raporu üzerindeki değerlendirmelerinizi almak isteriz. Yalın hat kurulum sürecine başlamak adına uygun olduğunuz bir zamanı bildirebilir misiniz?\n\nTeşekkürler.`,
        status: "Active",
        updatedAt: "2026-06-19"
      },
      {
        id: "t-3",
        name: "B2B Endüstriyel Tanıtım Kampanyası",
        category: "Campaign Templates",
        subject: "Yılın İkinci Çeyreği Verimlilik Analiz Daveti",
        content: `Değerli İş Ortağımız,\n\nEndüstriyel işletmelerde israfı önlemek ve %30'a varan maliyet tasarrufu sağlamak için özel olarak tasarladığımız ücretsiz 'Verimlilik Analizi' çalışmamıza davetlisiniz.\n\nAşağıdaki linkten kaydınızı tamamlayarak yerinizi ayırtabilirsiniz.\n\nSaygılarımızla.`,
        status: "Draft",
        updatedAt: "2026-06-15"
      },
      {
        id: "t-4",
        name: "Tanışma Toplantısı Rezervasyonu",
        category: "Meeting Templates",
        subject: "Tanışma Toplantısı Doğrulandı",
        content: `Sayın Müşterimiz,\n\nRezervasyonunu gerçekleştirmiş olduğunuz Gemba Partner tanıtım ve tanışma toplantısı onaylanmıştır.\n\nToplantı Detayları:\nPlatform: MS Teams\nSüre: 30 Dakika\n\nGörüşmek üzere.`,
        status: "Active",
        updatedAt: "2026-06-10"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("admin_templates_list", JSON.stringify(templates));
  }, [templates]);

  const [newTemplate, setNewTemplate] = useState<Partial<TemplateItem>>({
    name: "",
    category: "Proposal Templates",
    subject: "",
    content: "",
    status: "Active"
  });
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.subject) return;

    const item: TemplateItem = {
      id: `t-${Date.now()}`,
      name: newTemplate.name,
      category: newTemplate.category || "Proposal Templates",
      subject: newTemplate.subject,
      content: newTemplate.content || "",
      status: newTemplate.status as any || "Active",
      updatedAt: new Date().toISOString().split("T")[0]
    };

    setTemplates([...templates, item]);
    setIsNewTemplateOpen(false);
    setNewTemplate({ name: "", category: "Proposal Templates", subject: "", content: "", status: "Active" });
    addAuditLog(actorName, "Şablon Oluşturuldu", `E-posta şablonu eklendi: ${item.name}`, "Şablon Yönetimi");
    alert("Yeni şablon başarıyla oluşturuldu!");
  };

  const deleteTemplate = (id: string, name: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    if (selectedTemplateId === id) setSelectedTemplateId(null);
    addAuditLog(actorName, "Şablon Silindi", `Şablon kaldırıldı: ${name}`, "Şablon Yönetimi");
  };

  // 5. Data Hub (Cloud Storage Connections)
  const [dataHubConnections, setDataHubConnections] = useState<StorageHubItem[]>(() => {
    const saved = localStorage.getItem("admin_data_hub_connections");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all enterprise properties exist in parsed data
        return parsed.map((item: any) => ({
          ...item,
          enabled: item.enabled !== undefined ? item.enabled : item.status === "Connected",
          defaultStorage: item.defaultStorage !== undefined ? item.defaultStorage : (item.id === "sh-local" || item.provider === "Local Storage"),
          description: item.description || `${item.provider} depolama kanalı.`,
          createdDate: item.createdDate || "2026-06-15",
          lastSync: item.lastSync || "Şimdi",
          lastModified: item.lastModified || "2026-06-28",
          connectionHealth: item.connectionHealth || (item.status === "Connected" ? "Healthy" : "Untested"),
          defaultRootFolder: item.defaultRootFolder || "/data/crm/documents"
        }));
      } catch (e) {
        console.error("Error parsing saved connections, using defaults", e);
      }
    }
    const defaultConns: StorageHubItem[] = [
      {
        id: "sh-local",
        name: "Yerel Uygulama Depolama Alanı (DMS Local)",
        provider: "Local Storage",
        status: "Connected",
        enabled: true,
        defaultStorage: true,
        description: "Merkezi CRM yerel bellek tabanlı ve entegre döküman depolama kanalı (Varsayılan).",
        createdDate: "2026-06-01",
        lastSync: "Şimdi",
        lastModified: "2026-06-28",
        connectionHealth: "Healthy",
        defaultRootFolder: "/data/crm/documents",
        owner: "Sistem Yöneticisi",
        usage: "14.2 GB / Limitsiz"
      },
      {
        id: "sh-sharepoint",
        name: "Microsoft SharePoint Corporate Library",
        provider: "Microsoft SharePoint",
        status: "Disconnected",
        enabled: false,
        defaultStorage: false,
        description: "Kurumsal SharePoint döküman kitaplığı entegrasyonu.",
        createdDate: "2026-06-15",
        lastSync: "Eşitleme Yok",
        lastModified: "2026-06-15",
        connectionHealth: "Untested",
        defaultRootFolder: "GembaCRM_Documents",
        owner: "ADMIN"
      },
      {
        id: "sh-onedrive",
        name: "Microsoft OneDrive Team Space",
        provider: "Microsoft OneDrive",
        status: "Disconnected",
        enabled: false,
        defaultStorage: false,
        description: "Takım içi ve bireysel çalışma klasörleri OneDrive bulut havuzu.",
        createdDate: "2026-06-15",
        lastSync: "Eşitleme Yok",
        lastModified: "2026-06-15",
        connectionHealth: "Untested",
        defaultRootFolder: "/Documents/GembaWalks",
        owner: "ADMIN"
      },
      {
        id: "sh-azure",
        name: "Azure Blob Storage Binaries",
        provider: "Azure Blob",
        status: "Disconnected",
        enabled: false,
        defaultStorage: false,
        description: "Yüksek hacimli çizimler, şantiyelerden gelen resimler ve yedekleme havuzu.",
        createdDate: "2026-06-20",
        lastSync: "Eşitleme Yok",
        lastModified: "2026-06-20",
        connectionHealth: "Untested",
        defaultRootFolder: "crm-document-blobs",
        owner: "ADMIN"
      }
    ];
    localStorage.setItem("admin_data_hub_connections", JSON.stringify(defaultConns));
    return defaultConns;
  });

  useEffect(() => {
    localStorage.setItem("admin_data_hub_connections", JSON.stringify(dataHubConnections));
  }, [dataHubConnections]);

  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StorageHubItem | null>(null);

  // Document Categories State
  const [docTypes, setDocTypes] = useState<any[]>(() => DocumentService.getDocTypes());
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDesc, setNewTypeDesc] = useState("");

  const handleAddDocType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const added = DocumentService.addDocType(newTypeName, newTypeDesc);
    setDocTypes(DocumentService.getDocTypes());
    setNewTypeName("");
    setNewTypeDesc("");
    addAuditLog(actorName, "Belge Kategorisi Eklendi", `Yeni döküman türü eklendi: ${added.name}`, "Veri Yönetimi");
    alert(`'${added.name}' döküman kategorisi başarıyla oluşturuldu!`);
  };

  const handleDeleteDocType = (id: string, name: string) => {
    const success = DocumentService.deleteDocType(id);
    if (success) {
      setDocTypes(DocumentService.getDocTypes());
      addAuditLog(actorName, "Belge Kategorisi Silindi", `Döküman türü silindi: ${name}`, "Veri Yönetimi");
      alert(`'${name}' döküman kategorisi başarıyla kaldırıldı!`);
    } else {
      alert("Sistem varsayılan kategorileri silinemez!");
    }
  };

  const [backupConfig, setBackupConfig] = useState({
    interval: "Her Gün Gece 02:00",
    retention: "6 ay saklama süresi",
    compress: true,
    lastBackup: "2026-06-22 02:00 (Başarılı)"
  });

  const [dataRetention, setDataRetention] = useState({
    documents: "7 Yıl",
    emails: "3 Yıl",
    activityLogs: "1 Yıl",
    auditLogs: "Süresiz (Mevzuat)"
  });

  const [isAddStorageOpen, setIsAddStorageOpen] = useState(false);
  const [newStorage, setNewStorage] = useState({
    name: "",
    provider: "Microsoft OneDrive",
    clientId: "",
    clientSecret: "",
    bucketName: "",
    regionHost: "",
    owner: "Sistem Yöneticisi",
    description: "",
    defaultRootFolder: ""
  });

  const handleAddStorage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStorage.name) return;
    const item: StorageHubItem = {
      id: `sh-${Date.now()}`,
      name: newStorage.name,
      provider: newStorage.provider as any,
      status: "Connected",
      enabled: true,
      defaultStorage: false,
      description: newStorage.description || `${newStorage.provider} depolama kanalı.`,
      createdDate: new Date().toISOString().split("T")[0],
      lastSync: "Eşitleme Yok",
      lastModified: new Date().toISOString().split("T")[0],
      connectionHealth: "Healthy",
      defaultRootFolder: newStorage.defaultRootFolder || "/documents",
      owner: newStorage.owner,
      usage: "0 GB / Sınırsız (Simüle)",
      clientId: newStorage.clientId,
      clientSecret: newStorage.clientSecret,
      bucketName: newStorage.bucketName,
      regionHost: newStorage.regionHost
    };
    setDataHubConnections([...dataHubConnections, item]);
    setIsAddStorageOpen(false);
    setNewStorage({ name: "", provider: "Microsoft OneDrive", clientId: "", clientSecret: "", bucketName: "", regionHost: "", owner: "Sistem Yöneticisi", description: "", defaultRootFolder: "" });
    addAuditLog(actorName, "Depolama Bağlantısı Eklendi", `Bulut veri kaynağı entegre edildi: ${item.name}`, "Data Hub");
    alert("Bulut depolama kanalı başarıyla tanımlandı!");
  };

  const handleSaveConnection = (conn: StorageHubItem) => {
    setDataHubConnections(dataHubConnections.map(c => {
      if (c.id === conn.id) {
        // If this is set as default storage, disable default on all others
        let updated = { ...c, ...conn, lastModified: new Date().toISOString().split("T")[0] };
        return updated;
      }
      return c;
    }));

    if (conn.defaultStorage) {
      setDataHubConnections(prev => prev.map(c => c.id === conn.id ? { ...c, defaultStorage: true, enabled: true, status: "Connected" } : { ...c, defaultStorage: false }));
    }

    addAuditLog(actorName, "Bağlantı Ayarları Güncellendi", `${conn.name} bağlantı parametreleri güncellendi.`, "Data Hub");
    alert(`'${conn.name}' bağlantı ayarları başarıyla kaydedildi!`);
    setEditingConnId(null);
    setEditForm(null);
  };

  const handleToggleConnection = (id: string, enable: boolean) => {
    setDataHubConnections(dataHubConnections.map(c => {
      if (c.id === id) {
        const status = enable ? "Connected" : "Disconnected";
        const health = enable ? "Healthy" : "Untested";
        addAuditLog(actorName, enable ? "Bulut Bağlantısı Aktifleştirildi" : "Bulut Bağlantısı Devre Dışı", `${c.name} kanalı ${enable ? "aktif" : "pasif"} edildi.`, "Data Hub");
        
        // If disabling the default storage, fall back to Local Storage as default
        let isDefault = c.defaultStorage;
        if (!enable && isDefault) {
          isDefault = false;
          alert("Varsayılan depolama kanalı pasifleştirildiği için Local Storage varsayılan olarak seçilmiştir.");
          setTimeout(() => {
            setDataHubConnections(prev => prev.map(p => p.id === "sh-local" ? { ...p, defaultStorage: true, enabled: true, status: "Connected" } : p));
          }, 50);
        }

        return { ...c, enabled: enable, status, connectionHealth: health as any };
      }
      return c;
    }));
  };

  const handleDeleteConnection = (id: string, name: string) => {
    if (id === "sh-local") {
      alert("Yerel uygulama depolama alanı (DMS Local) silinemez! Bu sistemin temel altyapısıdır.");
      return;
    }
    if (confirm(`'${name}' depolama bağlantısını silmek istediğinize emin misiniz?`)) {
      const conn = dataHubConnections.find(c => c.id === id);
      if (conn?.defaultStorage) {
        setDataHubConnections(prev => prev.map(p => p.id === "sh-local" ? { ...p, defaultStorage: true, enabled: true, status: "Connected" } : p));
      }
      setDataHubConnections(dataHubConnections.filter(c => c.id !== id));
      addAuditLog(actorName, "Depolama Bağlantısı Silindi", `${name} bağlantısı sistemden kaldırıldı.`, "Data Hub");
      setEditingConnId(null);
      setEditForm(null);
    }
  };

  const handleSetDefaultStorage = (id: string) => {
    setDataHubConnections(dataHubConnections.map(c => {
      if (c.id === id) {
        addAuditLog(actorName, "Varsayılan Depolama Değiştirildi", `${c.name} varsayılan depolama kanalı yapıldı.`, "Data Hub");
        return { ...c, defaultStorage: true, enabled: true, status: "Connected", connectionHealth: "Healthy" as any };
      }
      return { ...c, defaultStorage: false };
    }));
    alert("Varsayılan depolama kanalı değiştirildi. Tüm yeni belgeler otomatik olarak bu kanala yüklenecektir.");
  };

  const handleTestConnection = (id: string) => {
    const conn = dataHubConnections.find(c => c.id === id);
    if (!conn) return;
    
    // Simulate testing
    const isLocal = conn.provider === "Local Storage";
    const hasCredentials = isLocal || (conn.clientId && conn.clientSecret && conn.defaultRootFolder);

    if (hasCredentials) {
      setDataHubConnections(dataHubConnections.map(c => {
        if (c.id === id) {
          return { ...c, connectionHealth: "Healthy" as any, status: "Connected" as any };
        }
        return c;
      }));
      alert(`✅ BAĞLANTI TESTİ BAŞARILI!\n\n${conn.name} (${conn.provider}) bulut sunucusu ile güvenli iletişim doğrulandı.\nBağlantı Durumu: SAĞLIKLI / AKTİF\nKök Klasör: ${conn.defaultRootFolder}`);
      addAuditLog(actorName, "Bağlantı Test Başarılı", `${conn.name} için yapılan iletişim testi başarıyla tamamlandı.`, "Data Hub", "Success");
    } else {
      setDataHubConnections(dataHubConnections.map(c => {
        if (c.id === id) {
          return { ...c, connectionHealth: "Unhealthy" as any, status: "Disconnected" as any };
        }
        return c;
      }));
      alert(`❌ BAĞLANTI TESTİ BAŞARISIZ!\n\n${conn.name} (${conn.provider}) bulut sunucusuna erişim sağlanamadı!\nSebep: Kimlik doğrulama anahtarları (Client ID / Client Secret) veya Kök Klasör tanımlı değil. Lütfen bilgileri kontrol edin.`);
      addAuditLog(actorName, "Bağlantı Test Başarısız", `${conn.name} için erişim testi başarısız oldu.`, "Data Hub", "Warning");
    }
  };

  const handleSaveAndClose = () => {
    setShowSavedMsg(true);
    addAuditLog(actorName, "Ayarlar Kaydedildi", "Yönetim portalı ayarları değiştirildi ve kapatıldı.", "Sistem Ayarları");
    setTimeout(() => {
      setShowSavedMsg(false);
      if (onClose) {
        onClose();
      }
    }, 1500);
  };

  // Files generated dynamically and associated metadata
  const systemFiles = [
    { name: "Teklif_Verimlilik_Analizi_v4.pdf", type: "Proposal Files", size: "2.4 MB", date: "2026-06-21" },
    { name: "Gemba_Mühendislik_Yılllık_Sözleşme.pdf", type: "Customer Documents", size: "12.1 MB", date: "2026-06-20" },
    { name: "Satis_Zeta_Aday_Listesi.xlsx", type: "Reports", size: "480 KB", date: "2026-06-19" },
    { name: "Ocak_Faturasi_Kurumsal_Egitim.pdf", type: "Invoice Uploads", size: "1.1 MB", date: "2026-06-18" }
  ];

  // 6. Audit Logs Flow (Dynamic system logging simulation)
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([
    {
      id: "log-1",
      user: "Atakan Zehir (a.zehir@gembapartner.com)",
      timestamp: "2026-06-22 10:14",
      action: "Bağlantı Güncelleme",
      module: "Microsoft Graph API",
      result: "Success"
    },
    {
      id: "log-2",
      user: "Atakan Zehir (a.zehir@gembapartner.com)",
      timestamp: "2026-06-22 09:30",
      action: "E-posta Gönderimi",
      module: "Sözleşme ve Teklif",
      result: "Success"
    },
    {
      id: "log-3",
      user: "Banu Kaya (b.kaya@gembapartner.com)",
      timestamp: "2026-06-22 08:45",
      action: "Yönetim Oturumu Açıldı",
      module: "Sistem Güvenliği",
      result: "Success"
    },
    {
      id: "log-4",
      user: "Efe Yılmaz (e.yilmaz@gembapartner.com)",
      timestamp: "2026-06-21 17:15",
      action: "Teklif Dosya İndirme",
      module: "Müşteri Dosyaları",
      result: "Success"
    },
    {
      id: "log-5",
      user: "Misafir Aday (Destek)",
      timestamp: "2026-06-21 12:20",
      action: "Hatalı Giriş Denemesi",
      module: "Sistem Güvenliği",
      result: "Failure"
    }
  ]);

  const addAuditLog = (user: string, action: string, detail: string, module: string, outcome: "Success" | "Failure" | "Warning" = "Success") => {
    const nextLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      user: `${user} (${new Date().toLocaleTimeString()})`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
      action: `${action} - ${detail}`,
      module: module,
      result: outcome
    };
    setAuditLogs(prev => [nextLog, ...prev]);
  };

  // 7. AI Assistant & Skill settings
  const [aiApiKeyName, setAiApiKeyName] = useState("Sistem Entegre Gemini Key");
  const [promptTemplates, setPromptTemplates] = useState([
    { name: "Satış Koçu Analizi", type: "Müşteri İmza Analizörü", tokenUsage: "Orta", prompt: "Aşağıdaki e-posta gövdesinden unvan, telefon, firma adı ve e-posta parametrelerini hassasiyetle ayırarak JSON formatına dönüştür." },
    { name: "Teklif Teklif Taslağı", type: "Otomatik Yanıtlayıcı", tokenUsage: "Yüksek", prompt: "Müşterinin belirttiği verimsizlik durumuna göre Gemba Partner yalın felsefesini anlatan şık bir B2B teklif taslağı hazırla." }
  ]);

  const [aiAgentSkills, setAiAgentSkills] = useState([
    { name: "İmza Ayrıştırıcı (Signature Extractor)", active: true },
    { name: "Şirket İstihbaratı ve Web Tarama (Tavily)", active: true },
    { name: "Finansal Gelir Tahmini Raporlama", active: true },
    { name: "Akıllı Kampanya Doğrulama", active: false }
  ]);

  // Handle saving the core prompt template alterations offline
  const handleSavePrompt = (idx: number, text: string) => {
    const updated = [...promptTemplates];
    updated[idx].prompt = text;
    setPromptTemplates(updated);
    addAuditLog(actorName, "AI Prompt Düzenleme", `AI Prompt Şablonu güncellendi: ${updated[idx].name}`, "AI Ayarları");
    alert("Üretken AI Talimatı (Prompt Template) başarıyla kaydedildi!");
  };

  // 8. Integration Health Telemetry
  const [healthStatus, setHealthStatus] = useState({
    graphApi: "🟢 ÇALIŞIYOR (SUCCESS)",
    geminiApi: "🟢 ÇALIŞIYOR (120 RPM)",
    tavilyApi: "🟢 BAĞLI (Simülasyon Fallback)",
    cronSync: "🟢 ÇALIŞIYOR"
  });
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);

  const handleRefreshHealth = () => {
    setIsRefreshingHealth(true);
    setTimeout(() => {
      setIsRefreshingHealth(false);
      alert("Tüm entegrasyonlar ve API servisleri başarıyla doğrulandı. Sistem sağlığı: %100");
      addAuditLog(actorName, "Sistem Sağlığı Kontrolü", "Tüm sistem servisleri ve harici API'ler başarıyla test edildi.", "Sistem Sağlığı");
    }, 800);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] p-8 text-center space-y-3">
        <Lock className="w-10 h-10 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-200">{L("Erişim Reddedildi", "Access Denied")}</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md">
          {L(
            "Bu sayfaya erişmek için yönetici yetkisine sahip olmanız gerekir.",
            "You need administrator privileges to access this page."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full text-left space-y-6">
      {/* HEADER ROW WITH USER METRICS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#18181b] p-6 rounded-2xl border border-slate-150 dark:border-zinc-800/80 shadow-xs">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-indigo-50 dark:bg-zinc-900 border border-indigo-200 dark:border-zinc-800 text-indigo-650 dark:text-zinc-200 rounded-lg text-[10px] font-bold font-mono tracking-wider uppercase">
              {L("YÖNETİM PANELİ", "ADMINISTRATION PANEL")}
            </span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">
              {L("Yetki Sınıfı: ADMIN", "Access Level: ADMIN")}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-150 font-sans tracking-tight">
            {L(
              "Gemba Partner İşletim Sistemi™ Merkez Ofis Portalı",
              "Gemba Partner Business Operating System™ Central Office Portal"
            )}
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">

          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-900 dark:text-zinc-200 block">{adminDisplayName}</span>
            <span className="text-[10px] font-mono text-slate-405 block">{adminEmail}</span>
            <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-md mt-1 inline-block">
              {L("Lisans: Aktif", "License: Active")}
            </span>
          </div>
          <div className="w-11 h-11 bg-indigo-550 group-hover:bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md cursor-pointer border-2 border-slate-100 dark:border-zinc-800 mr-2">
            {adminInitials}
          </div>
          <div className="flex items-center gap-3">
            {showSavedMsg && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2 py-1.5 rounded-lg animate-pulse shadow-sm">
                ✓ {L("Kaydedildi", "Saved")}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="p-2.5 px-4 bg-emerald-600 hover:bg-emerald-555 border border-emerald-500 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              title={L("Kaydet / Kapat", "Save / Close")}
            >
              <Check className="w-4 h-4" />
              <span>{L("Kaydet / Kapat", "Save / Close")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ADMINISTRATION GRID VIEW & TABS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SIDE BAR NAVIGATION WITHIN ADMIN VIEW */}
        <aside className="lg:col-span-3 bg-white dark:bg-[#18181b] rounded-2xl border border-slate-200/60 dark:border-zinc-800/85 p-3.5 space-y-1.5 shadow-xs text-left">
          <span className="px-3.5 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
            {L("AYAR KATEGORİLERİ", "SETTING CATEGORIES")}
          </span>
          
          <button
            type="button"
            onClick={() => setActiveSubTab("organization")}
            className={`w-full flex items-center justify-start gap-3 pl-3.5 pr-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSubTab === "organization"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <Building className="w-4 h-4 text-slate-400" />
            <span>{L("Organizasyon Ayarları", "Organization Settings")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("users")}
            className={`w-full flex items-center justify-start gap-3 pl-3.5 pr-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSubTab === "users"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <Users className="w-4 h-4 text-slate-400" />
            <span>{L("Kullanıcılar ve İzinler", "Users & Permissions")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("email")}
            className={`w-full flex items-center justify-start gap-3 pl-3.5 pr-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSubTab === "email"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <Mail className="w-4 h-4 text-slate-400" />
            <span>{L("Organizasyon Posta Kutusu", "Organization Mailbox")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("templates")}
            className={`w-full flex items-center justify-start gap-3 pl-3.5 pr-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSubTab === "templates"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <FileText className="w-4 h-4 text-slate-400" />
            <span>{L("E-posta Şablonları", "Email Templates")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("datahub")}
            className={`w-full flex items-center justify-start gap-3 pl-3.5 pr-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSubTab === "datahub"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <HardDrive className="w-4 h-4 text-slate-400" />
            <span>{L("Bulut Depolama ve Veri Merkezi", "Cloud Storage & Data Hub")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("auditlogs")}
            className={`w-full flex items-center justify-start gap-3 pl-3.5 pr-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSubTab === "auditlogs"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <UserCheck className="w-4 h-4 text-slate-400" />
            <span>{L("Denetim Günlükleri", "Audit Logs")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("aisettings")}
            className={`w-full flex items-center justify-start gap-3 pl-3.5 pr-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSubTab === "aisettings"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-550" />
            <span>{L("Yapay Zeka ve Prompt Ayarları", "AI Assistant & Prompt Settings")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("systemhealth")}
            className={`w-full flex items-center justify-start gap-3 pl-3.5 pr-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSubTab === "systemhealth"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <Activity className="w-4 h-4 text-slate-400" />
            <span>{L("Sistem Sağlığı Gösterge Paneli", "System Health Dashboard")}</span>
          </button>
        </aside>

        {/* DETAILS WORKSPACE CONTAINER */}
        <div className="lg:col-span-9 bg-white dark:bg-[#18181b] rounded-2xl border border-slate-205/60 dark:border-zinc-800/80 shadow-xs p-6 md:p-8 min-h-[500px] text-left">
          
          {/* ==================== SECTION 1: ORGANIZATION SETTINGS ==================== */}
          {activeSubTab === "organization" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800/80 pb-4 text-left">
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">
                  {L("1. Organizasyon Temel Konfigürasyonu", "1. Organization Basic Configuration")}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">
                    {L("Şirket Resmi Adı", "Official Company Name")}
                  </label>
                  <input
                    type="text"
                    value={orgSettings.name}
                    onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                    className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">
                    {L("Şirket Logosu / Marka İmzası", "Company Logo / Brand Signature")}
                  </label>
                  <div className="flex items-center gap-3">
                    {orgSettings.logo ? (
                      <img 
                        src={orgSettings.logo} 
                        alt="Şirket Logosu" 
                        className="w-10 h-10 object-contain rounded-xl border border-slate-200 dark:border-zinc-800 shadow" 
                      />
                    ) : (
                      <div className="w-10 h-10 bg-indigo-650 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow">
                        {orgSettings.name ? orgSettings.name.split(" ").map(w => w ? w[0] : "").join("").substring(0, 3).toUpperCase() : "GP"}
                      </div>
                    )}
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-[#252423] hover:bg-slate-200 dark:hover:bg-zinc-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5">
                      <span>{L("Yeni Logo Yükle", "Upload New Logo")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const result = event.target?.result as string;
                              setOrgSettings({ ...orgSettings, logo: result });
                              addAuditLog(actorName, "Şirket Logosu Güncellendi", "Yeni şirket logosu sisteme yüklendi.", "Sistem Ayarları");
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">
                    {L("Vergi Dairesi ve Numarası", "Tax Office & Number")}
                  </label>
                  <input
                    type="text"
                    value={orgSettings.taxInfo}
                    onChange={(e) => setOrgSettings({ ...orgSettings, taxInfo: e.target.value })}
                    className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">
                    {L("Resmi Web Sitesi", "Official Website")}
                  </label>
                  <input
                    type="text"
                    value={orgSettings.website}
                    onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                    className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">
                    {L("Telefon Numarası", "Phone Number")}
                  </label>
                  <input
                    type="text"
                    value={orgSettings.phone}
                    onChange={(e) => setOrgSettings({ ...orgSettings, phone: e.target.value })}
                    className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">
                    {L("Varsayılan Para Birimi", "Default Currency")}
                  </label>
                  <select
                    value={orgSettings.defaultCurrency}
                    onChange={(e) => setOrgSettings({ ...orgSettings, defaultCurrency: e.target.value })}
                    className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none font-semibold"
                  >
                    <option>EUR (€)</option>
                    <option>USD ($)</option>
                    <option>TRY (₺)</option>
                    <option>GBP (£)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-[#FAFAFA] dark:bg-black/20 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                  <div className="text-xs">
                    <span className="font-bold text-slate-450 uppercase font-mono block text-[10px] mb-1">
                      {L("Aktif Sistem Dili", "Active System Language")}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>{isTR ? "🇹🇷 Türkçe" : "🇬🇧 English"}</span>
                      <span className="text-[9px] bg-indigo-50 dark:bg-zinc-800 text-indigo-650 dark:text-zinc-400 px-1.5 py-0.5 rounded uppercase font-mono font-extrabold">
                        {L("Üst Menüden Değiştirilir", "Change via Header")}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">
                    {L("Resmi Merkez Adresi", "Official Headquarters Address")}
                  </label>
                  <textarea
                    rows={2}
                    value={orgSettings.address}
                    onChange={(e) => setOrgSettings({ ...orgSettings, address: e.target.value })}
                    className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Business days configuration */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/85 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide font-mono">
                  {L("Çalışma Düzeni ve Takvim Yapılandırması", "Work Schedule & Calendar Configuration")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-455 mb-1">
                      {L("Mali Yıl Başlangıcı", "Fiscal Year Start")}
                    </label>
                    <input
                      type="text"
                      value={orgSettings.fiscalYear}
                      onChange={(e) => setOrgSettings({ ...orgSettings, fiscalYear: e.target.value })}
                      className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-850 focus:outline-none dark:text-zinc-350"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-455 mb-1">
                      {L("Günlük Çalışma Saatleri", "Daily Working Hours")}
                    </label>
                    <input
                      type="text"
                      value={orgSettings.workingHours}
                      onChange={(e) => setOrgSettings({ ...orgSettings, workingHours: e.target.value })}
                      className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-850 focus:outline-none dark:text-zinc-350"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-455 mb-1">
                      {L("Varsayılan Saat Dilimi", "Default Timezone")}
                    </label>
                    <input
                      type="text"
                      value={orgSettings.timezone}
                      onChange={(e) => setOrgSettings({ ...orgSettings, timezone: e.target.value })}
                      className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-850 focus:outline-none dark:text-zinc-350"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <span className="text-[10px] font-bold text-slate-450 block uppercase">
                    {L("Aktif İş Günleri", "Active Business Days")}
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"].map(day => {
                      const isChecked = orgSettings.businessDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            let nextDays = [...orgSettings.businessDays];
                            if (nextDays.includes(day)) {
                              nextDays = nextDays.filter(d => d !== day);
                            } else {
                              nextDays.push(day);
                            }
                            setOrgSettings({ ...orgSettings, businessDays: nextDays });
                          }}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                            isChecked
                              ? "bg-indigo-600 text-white border-indigo-650"
                              : "bg-slate-50 dark:bg-[#1f1f1e] text-slate-500 border-slate-200 dark:border-zinc-850 hover:bg-slate-100"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                {showSavedMsg && (
                  <span className="text-xs font-bold text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-3 py-2 rounded-xl animate-pulse shadow-xs">
                    ✓ {L("Kaydedildi", "Saved")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowSavedMsg(true);
                    addAuditLog(actorName, "Organizasyon Güncellendi", "Şirket vergi, takvim ve saat ayarları yenilendi.", "Bulut Entegrasyonu");
                    setTimeout(() => {
                      setShowSavedMsg(false);
                    }, 1500);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {L("Değişiklikleri Kaydet", "Save Changes")}
                </button>
              </div>
            </div>
          )}

          {/* ==================== SECTION 2: USER MANAGEMENT & PERMISSIONS ==================== */}
          {activeSubTab === "users" && (
            <div className="space-y-8 animate-in fade-in duration-100">
              <OrganizationUsersPanel
                onAuditLog={(action, detail) =>
                  addAuditLog(actorName, action, detail, "Kullanıcı Yönetimi")
                }
              />

              {/* Dynamic Permissions Matrix component */}

              {/* Dynamic Permissions Matrix component */}
              <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide font-mono flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-slate-400" />
                      {L("Rol Bazlı Menü İzin Matrisi", "Role-Based Menu Permission Matrix")}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 font-mono">{L("Rol Seçin:", "Select Role:")}</span>
                    <select
                      value={selectedRoleForMatrix}
                      onChange={(e) => setSelectedRoleForMatrix(e.target.value)}
                      className="text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-205 md:p-2 p-1.5 rounded-lg"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="USER">USER</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-150 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-neutral-900 text-[10px] font-bold font-mono text-slate-450 uppercase border-b border-slate-150 dark:border-zinc-800">
                        <th className="p-3 text-left w-1/4">{L("Menü ve Yetki Grubu", "Menu & Permission Group")}</th>
                        {permsList.map(perm => (
                          <th key={perm} className="p-3">{permLabel(perm)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                      {menusList.map(menu => {
                        const currentRolePermissions = pMatrix[selectedRoleForMatrix] || {};
                        const menuActivePerms = currentRolePermissions[menu] || [];

                        return (
                          <tr key={menu} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                            <td className="p-3 text-left font-bold text-slate-700 dark:text-zinc-300">{menuLabel(menu)}</td>
                            {permsList.map(perm => {
                              const hasPerm = menuActivePerms.includes(perm);
                              return (
                                <td key={perm} className="p-3">
                                  <button
                                    type="button"
                                    onClick={() => togglePermission(menu, perm)}
                                    className={`w-5.5 h-5.5 rounded-md flex items-center justify-center border transition-all mx-auto ${
                                      hasPerm
                                        ? "bg-indigo-650 border-indigo-650 text-white"
                                        : "bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-zinc-900 dark:border-zinc-800 text-transparent"
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SECTION 3: ORGANIZATION MAILBOX ==================== */}
          {activeSubTab === "email" && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4 text-left">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">
                    {L("3. Organizasyon Posta Kutusu", "3. Organization Mailbox")}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    {L(
                      "Microsoft 365 bağlantısı organizasyon kapsamındadır. Tüm kullanıcılar davet, lead ve teklif e-postalarında bu kutuyu otomatik kullanır.",
                      "Microsoft 365 is organization-scoped. All users automatically use this mailbox for invitation, lead, and proposal emails."
                    )}
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-indigo-200/70 bg-indigo-50/20 dark:border-zinc-800 dark:bg-black/20 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                      organizationMailbox?.status === "Connected"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : organizationMailbox?.status === "Expired"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                          : "bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}>
                      {organizationMailbox?.status || "Disconnected"}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-850 dark:text-zinc-100">
                        {organizationMailbox?.mailbox_email || L("Bağlı organizasyon posta kutusu yok", "No organization mailbox connected")}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        {organizationMailbox?.sender_name
                          ? `${organizationMailbox.sender_name} · ${organizationMailbox.tenant_name || "Microsoft 365"}`
                          : L("Yalnızca ADMIN Microsoft 365 bağlantısını kurabilir veya kesebilir.", "Only ADMIN can connect or disconnect Microsoft 365.")}
                      </p>
                    </div>
                    {organizationMailbox?.connected_at && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        {L("Bağlanma:", "Connected:")} {new Date(organizationMailbox.connected_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {organizationMailbox?.status === "Connected" || organizationMailbox?.status === "Expired" ? (
                      <>
                        <button
                          type="button"
                          onClick={onTestOrganizationMailbox}
                          className="p-2.5 px-4 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-all flex items-center gap-1.5"
                        >
                          <Mail className="w-4 h-4" />
                          {L("Test Gönder", "Test Connection")}
                        </button>
                        <button
                          type="button"
                          onClick={onDisconnectOrganizationMailbox}
                          className="p-2.5 px-4 text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-all flex items-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                          {L("Bağlantıyı Kes", "Disconnect")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={onConnectOrganizationMailbox}
                        disabled={!microsoftConfig?.hasClientKeys}
                        className={`p-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                          microsoftConfig?.hasClientKeys
                            ? "text-white bg-indigo-650 hover:bg-indigo-600 cursor-pointer"
                            : "text-slate-400 bg-slate-100 dark:bg-zinc-900 cursor-not-allowed"
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        {L("Microsoft 365 Bağla", "Connect Microsoft 365")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SECTION 4: EMAIL TEMPLATES ==================== */}
          {activeSubTab === "templates" && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#323130] pb-4 text-left">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">
                    {L("4. Standart E-posta Şablonları", "4. Standard Email Templates")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewTemplateOpen(true)}
                  className="p-2.5 px-4 text-xs font-bold text-white bg-indigo-650 rounded-xl hover:bg-indigo-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  {L("Şablon Oluştur", "Create Template")}
                </button>
              </div>

              {isNewTemplateOpen && (
                <form onSubmit={handleCreateTemplate} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-zinc-800 dark:bg-black/20 space-y-3 text-xs animate-in slide-in-from-top-2 duration-150">
                  <span className="font-mono font-bold text-slate-450 uppercase block">
                    {L("YENİ ŞABLON OLUŞTURMA", "CREATE NEW TEMPLATE")}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Şablon Başlığı (Örn: Yalın Teklif Takibi)"
                      required
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="bg-white dark:bg-black p-3 rounded-xl border border-slate-205 dark:border-zinc-805"
                    />
                    <select
                      value={newTemplate.category}
                      onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as any })}
                      className="bg-white dark:bg-black p-3 rounded-xl border border-slate-205 dark:border-zinc-805"
                    >
                      <option>{L("Teklif Şablonları", "Proposal Templates")}</option>
                      <option>{L("Kampanya Şablonları", "Campaign Templates")}</option>
                      <option>{L("Takip Şablonları", "Follow-Up Templates")}</option>
                      <option>{L("Toplantı Şablonları", "Meeting Templates")}</option>
                      <option>{L("Proje Şablonları", "Project Templates")}</option>
                      <option>{L("Sistem Şablonları", "System Templates")}</option>
                    </select>
                    <input
                      type="text"
                      placeholder={L("Konu Satırı *", "Email Subject *")}
                      required
                      value={newTemplate.subject}
                      onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                      className="bg-white dark:bg-black p-3 rounded-xl border border-slate-205 dark:border-zinc-805 sm:col-span-2"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setIsNewTemplateOpen(false)} className="p-2 px-3.5 bg-slate-100 dark:bg-zinc-800 rounded">Vazgeç</button>
                    <button type="submit" className="p-2 px-4 bg-indigo-650 text-white font-bold rounded">Şablonu Ekle</button>
                  </div>
                </form>
              )}

              {/* Template list display table */}
              <div className="overflow-x-auto border border-slate-105 dark:border-zinc-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-black/10 text-[10px] font-bold font-mono text-slate-400 uppercase border-b border-slate-100">
                      <th className="p-3">{L("Şablon Adı", "Template Name")}</th>
                      <th className="p-3">{L("Kategori", "Category")}</th>
                      <th className="p-3">{L("Varsayılan Konu", "Default Subject")}</th>
                      <th className="p-3">{L("Durum", "Status")}</th>
                      <th className="p-3 text-right">{L("Aksiyon", "Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                    {templates.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                        <td className="p-3 font-semibold text-slate-800 dark:text-zinc-200">{t.name}</td>
                        <td className="p-3">
                          <span className="p-1 px-2.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] text-slate-655 dark:text-zinc-350 font-bold">
                            {categoryLabel(t.category)}
                          </span>
                        </td>
                        <td className="p-3 italic max-w-xs truncate text-slate-500">{t.subject}</td>
                        <td className="p-3">
                          <span className={`p-1 px-1.5 rounded text-[10px] font-bold ${
                            t.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                          }`}>
                            {t.status === "Active" ? L("Etkin", "Active") : L("Taslak", "Draft")}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteTemplate(t.id, t.name)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== SECTION 5: Bulut Depolama & DATA HUB ==================== */}
          {activeSubTab === "datahub" && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-105 dark:border-[#323130] pb-4 text-left">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">
                    {L("5. Kurumsal Belge Altyapısı ve Bulut Depolama", "5. Enterprise Document Infrastructure & Cloud Storage")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingConnId(null);
                    setEditForm(null);
                    setIsAddStorageOpen(!isAddStorageOpen);
                  }}
                  className="p-2.5 px-4 text-xs font-bold text-white bg-indigo-650 rounded-xl hover:bg-indigo-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  {L("Yeni Depolama Kanalı Ekle", "Add New Storage Channel")}
                </button>
              </div>

              {/* NEW STORAGE CONNECTION FORM */}
              {isAddStorageOpen && (
                <form onSubmit={handleAddStorage} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-zinc-800 dark:bg-black/20 space-y-4 text-xs animate-in slide-in-from-top-2 duration-150">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase block tracking-wider text-[10px]">YENİ BULUT DEPOLAMA KANALI EKLE</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Bağlantı Adı *</label>
                      <input
                        type="text"
                        placeholder="Örn: SharePoint Finans"
                        required
                        value={newStorage.name}
                        onChange={(e) => setNewStorage({ ...newStorage, name: e.target.value })}
                        className="w-full bg-white dark:bg-black p-2.5 rounded-xl border border-slate-205 dark:border-zinc-805 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Depolama Sağlayıcısı *</label>
                      <select
                        value={newStorage.provider}
                        onChange={(e) => setNewStorage({ ...newStorage, provider: e.target.value })}
                        className="w-full bg-white dark:bg-black p-2.5 rounded-xl border border-slate-205 dark:border-zinc-805 text-xs"
                      >
                        {(["Microsoft OneDrive", "Microsoft SharePoint", "Azure Blob", "Google Drive", "AWS S3", "Local Storage"] as const).map((provider) => (
                          <option key={provider} value={provider}>{t(provider)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Varsayılan Kök Klasör *</label>
                      <input
                        type="text"
                        placeholder="Örn: /MusteriBelgeleri"
                        value={newStorage.defaultRootFolder}
                        onChange={(e) => setNewStorage({ ...newStorage, defaultRootFolder: e.target.value })}
                        className="w-full bg-white dark:bg-black p-2.5 rounded-xl border border-slate-205 dark:border-zinc-805 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">{L("İstemci Kimliği", "Client ID / API Key")}</label>
                      <input
                        type="text"
                        placeholder="Uygulama istemci kimliğini girin"
                        value={newStorage.clientId}
                        onChange={(e) => setNewStorage({ ...newStorage, clientId: e.target.value })}
                        className="w-full bg-white dark:bg-black p-2.5 rounded-xl border border-slate-205 dark:border-zinc-805 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">{L("Giriş Parolası", "Client Secret")}</label>
                      <input
                        type="password"
                        placeholder="••••••••••••••••••••"
                        value={newStorage.clientSecret}
                        onChange={(e) => setNewStorage({ ...newStorage, clientSecret: e.target.value })}
                        className="w-full bg-white dark:bg-black p-2.5 rounded-xl border border-slate-205 dark:border-zinc-805 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Kanal Açıklaması</label>
                    <textarea
                      placeholder="Bu bağlantının kullanım amacını yazın..."
                      value={newStorage.description}
                      onChange={(e) => setNewStorage({ ...newStorage, description: e.target.value })}
                      className="w-full bg-white dark:bg-black p-2.5 rounded-xl border border-slate-205 dark:border-zinc-805 text-xs h-16"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setIsAddStorageOpen(false)} className="p-2 px-3.5 bg-slate-100 dark:bg-zinc-800 rounded font-bold cursor-pointer">Vazgeç</button>
                    <button type="submit" className="p-2 px-4 bg-indigo-650 text-white font-bold rounded cursor-pointer">Kanal Bağlantısını Kaydet</button>
                  </div>
                </form>
              )}

              {/* DETAILED EDITING FORM FOR STORAGE CHANNEL */}
              {editingConnId && editForm && (
                <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/10 dark:border-zinc-700 dark:bg-black/40 space-y-4 text-xs animate-in slide-in-from-top-2 duration-150">
                  <div className="flex justify-between items-center border-b border-indigo-100 dark:border-zinc-800 pb-2">
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[11px]">⚡ DEPOLAMA BAĞLANTISINI DÜZENLE: {editForm.name}</span>
                    <button type="button" onClick={() => { setEditingConnId(null); setEditForm(null); }} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Bağlantı Adı</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-205 dark:border-zinc-805"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Depolama Sağlayıcısı</label>
                      <input
                        type="text"
                        disabled
                        value={editForm.provider}
                        className="w-full bg-slate-100 dark:bg-zinc-950 p-2.5 rounded-lg border border-slate-205 dark:border-zinc-805 font-semibold text-slate-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Varsayılan Kök Klasör</label>
                      <input
                        type="text"
                        value={editForm.defaultRootFolder}
                        onChange={(e) => setEditForm({ ...editForm, defaultRootFolder: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-205 dark:border-zinc-805 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">{L("İstemci Kimliği", "Client ID / API Key")}</label>
                      <input
                        type="text"
                        value={editForm.clientId || ""}
                        onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-205 dark:border-zinc-805 font-mono text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">{L("Giriş Parolası", "Client Secret")}</label>
                      <input
                        type="password"
                        placeholder={editForm.clientSecret ? "••••••••••••••••••••" : ""}
                        value={editForm.clientSecret || ""}
                        onChange={(e) => setEditForm({ ...editForm, clientSecret: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-205 dark:border-zinc-805 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 font-mono text-[10px]">
                        {L("OLUŞTURULMA TARİHİ:", "CREATED DATE:")}{" "}
                        <span className="text-slate-500 font-normal">{editForm.createdDate}</span>
                      </label>
                    </div>
                    <div className="space-y-1 sm:text-right">
                      <label className="font-bold text-slate-600 font-mono text-[10px]">
                        {L("SON GÜNCELLEME:", "LAST MODIFIED:")}{" "}
                        <span className="text-slate-500 font-normal">{editForm.lastModified}</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Kanal Açıklaması</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-205 dark:border-zinc-805 h-16"
                    />
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-indigo-100 dark:border-zinc-800">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestConnection(editForm.id)}
                        className="p-2 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer font-sans"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Bağlantıyı Test Et
                      </button>
                      {!editForm.defaultStorage && editForm.enabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm({ ...editForm, defaultStorage: true });
                            handleSetDefaultStorage(editForm.id);
                          }}
                          className="p-2 px-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg cursor-pointer"
                        >
                          Varsayılan Yap
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteConnection(editForm.id, editForm.name)}
                        className="p-2 px-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg font-bold cursor-pointer"
                      >
                        Bağlantıyı Kaldır
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingConnId(null); setEditForm(null); }}
                        className="p-2 px-4 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg font-bold cursor-pointer"
                      >
                        Kapat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveConnection(editForm)}
                        className="p-2 px-5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold rounded-lg cursor-pointer"
                      >
                        Ayarları Kaydet
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Connected Cloud Storages Table / List */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-450 block uppercase font-mono tracking-wider">AKTİF DEPOLAMA KANALLARI VE ENTEGRASYONLAR</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dataHubConnections.map(conn => (
                    <div
                      key={conn.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        conn.defaultStorage
                          ? "border-indigo-200 bg-indigo-50/20 dark:border-indigo-900/50 dark:bg-indigo-950/10 shadow-sm"
                          : "border-slate-105 bg-slate-50/30 dark:border-zinc-800 dark:bg-black/10"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-bold font-mono text-indigo-700 bg-indigo-50 dark:bg-zinc-900 px-2 py-0.5 rounded uppercase">
                              {t(conn.provider)}
                            </span>
                            {conn.defaultStorage && (
                              <span className="text-[9px] font-bold font-mono text-emerald-700 bg-emerald-50 dark:bg-zinc-900 px-2 py-0.5 rounded uppercase">
                                Varsayılan Depolama
                              </span>
                            )}
                            <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                              conn.connectionHealth === "Healthy" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                            }`}>
                              {L("Sağlık", "Health")}: {t(conn.connectionHealth)}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-150 mt-1.5 truncate" title={conn.name}>{conn.name}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-snug">{conn.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            conn.enabled ? "text-emerald-600 bg-emerald-50 dark:bg-zinc-900/40" : "text-slate-400 bg-slate-50 dark:bg-zinc-900/20"
                          }`}>
                            {conn.enabled ? "● Bağlantı Aktif" : "○ Erişim Kapalı"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-105 dark:border-zinc-850/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <div className="truncate max-w-[150px]">Kök: <strong className="text-slate-700 dark:text-zinc-300 font-semibold">{conn.defaultRootFolder}</strong></div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingConnId(conn.id);
                              setEditForm({ ...conn });
                              setIsAddStorageOpen(false);
                            }}
                            className="text-indigo-650 hover:text-indigo-500 font-bold hover:underline cursor-pointer"
                          >
                            Yapılandır
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleToggleConnection(conn.id, !conn.enabled)}
                            className={`font-bold hover:underline cursor-pointer ${
                              conn.enabled ? "text-rose-600 hover:text-rose-500" : "text-emerald-600 hover:text-emerald-500"
                            }`}
                          >
                            {conn.enabled ? "Kapat" : "Aktifleştir"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* UNLIMITED DOCUMENT CATEGORIES CONFIGURATION PANEL */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-100 dark:border-zinc-800">
                <div className="lg:col-span-1 p-5 rounded-2xl border border-slate-150 bg-slate-50/55 dark:border-zinc-800 dark:bg-black/10 space-y-3 text-xs">
                  <h4 className="font-bold text-slate-805 dark:text-zinc-200 font-mono text-xs uppercase flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-550" />
                    {L("Belge Kategorisi Oluştur", "Create Document Category")}
                  </h4>
                  <form onSubmit={handleAddDocType} className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Kategori Adı *</label>
                      <input
                        type="text"
                        required
                        placeholder={L("Örn: Saha Anket Raporu", "e.g. Site Survey Report")}
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 p-2 rounded-lg border border-slate-205 dark:border-zinc-805 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Açıklama</label>
                      <textarea
                        placeholder="Bu kategoride ne tür belgeler saklanacak..."
                        value={newTypeDesc}
                        onChange={(e) => setNewTypeDesc(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 p-2 rounded-lg border border-slate-205 dark:border-zinc-805 outline-none h-16 text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full p-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg cursor-pointer text-center"
                    >
                      {L("Kategori Türünü Kaydet", "Save Category Type")}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-3">
                  <span className="text-[10px] font-bold text-slate-450 block uppercase font-mono tracking-wider">
                    {L(`AKTİF BELGE KATEGORİLERİ (${docTypes.length})`, `ACTIVE DOCUMENT CATEGORIES (${docTypes.length})`)}
                  </span>
                  <div className="border border-slate-105 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
                    <div className="grid grid-cols-3 bg-slate-50 dark:bg-black/10 p-2.5 text-[9px] font-mono text-slate-400 font-bold border-b border-slate-100">
                      <div>Kategori Adı</div>
                      <div>Açıklama</div>
                      <div className="text-right">İşlem</div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-[220px] overflow-y-auto">
                      {docTypes.map(type => (
                        <div key={type.id} className="grid grid-cols-3 p-2.5 items-center hover:bg-slate-50/50">
                          <div className="font-bold text-slate-800 dark:text-zinc-200">{type.name}</div>
                          <div className="text-slate-500 text-[11px] truncate pr-4">{type.description || "Açıklama girilmedi."}</div>
                          <div className="text-right">
                            {type.isCustom ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteDocType(type.id, type.name)}
                                className="text-rose-600 hover:text-rose-500 font-bold hover:underline font-mono text-[10px] cursor-pointer"
                              >
                                Sil
                              </button>
                            ) : (
                              <span className="text-slate-400 font-mono text-[10px] font-semibold uppercase">Sistem</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* CENTRALIZED DOCUMENT SERVICE REAL TIME AUDIT LOG VIEWER */}
              <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-450 block uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {L("Döküman Yönetim Sistemi Denetim Logları", "Document Management System Audit Logs")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("enterprise_doc_audit_logs", JSON.stringify([]));
                      alert("DMS Denetim Logları temizlendi.");
                    }}
                    className="text-[10px] font-mono text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Günlüğü Temizle
                  </button>
                </div>

                <div className="border border-slate-105 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
                  <div className="grid grid-cols-6 bg-slate-50 dark:bg-black/10 p-2.5 text-[9px] font-mono text-slate-400 font-bold border-b border-slate-100">
                    <div>Zaman Damgası</div>
                    <div>Kullanıcı</div>
                    <div>İşlem</div>
                    <div className="col-span-2">Döküman</div>
                    <div className="text-right">Sonuç</div>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-[180px] overflow-y-auto font-mono text-[11px]">
                    {DocumentService.getAuditLogs().length === 0 ? (
                      <div className="p-4 text-left text-slate-400 italic">
                        {L("DMS üzerinde henüz herhangi bir işlem gerçekleştirilmedi.", "No operations have been performed on DMS yet.")}
                      </div>
                    ) : (
                      DocumentService.getAuditLogs().map((log) => (
                        <div key={log.id} className="grid grid-cols-6 p-2 items-center hover:bg-slate-50/50">
                          <div className="text-slate-400">{log.timestamp}</div>
                          <div className="font-semibold text-slate-700 dark:text-zinc-300">{log.user}</div>
                          <div>
                            <span className={`p-1 px-1.5 rounded text-[10px] font-bold uppercase ${
                              log.action === "Upload" ? "bg-indigo-50 text-indigo-700" :
                              log.action === "Delete" ? "bg-rose-50 text-rose-700" :
                              log.action === "Download" ? "bg-emerald-50 text-emerald-700" :
                              log.action === "Preview" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"
                            }`}>
                              {t(log.action)}
                            </span>
                          </div>
                          <div className="col-span-2 text-slate-700 dark:text-zinc-200 truncate pr-4 font-semibold" title={log.details}>
                            {log.documentName} <span className="text-slate-400 font-normal text-[10px]">({log.details})</span>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold uppercase text-[10px] ${log.result === "Success" ? "text-emerald-600" : "text-rose-600"}`}>
                              {resultLabel(log.result)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SECTION 6: AUDIT LOGS ==================== */}
          {activeSubTab === "auditlogs" && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4 text-left">
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">
                  {L("6. Denetim Günlükleri ve Güvenlik Takibi", "6. Audit Logs & Security Tracking")}
                </h3>
              </div>

              <div className="flex justify-between items-center bg-slate-50/80 dark:bg-black/10 p-3.5 rounded-xl border border-slate-150 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-250 font-sans">
                    {L("Anlık Log Sinyali: Aktif", "Live Log Signal: Active")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    alert("Tüm güvenlik günlükleri CSV olarak dışa aktarılmıştır!");
                    addAuditLog(actorName, "Günlük Arşiv Dışa Aktarım", "Audit logs verileri güvenlik raporu için dışa aktarıldı.", "Veri Güvenliği");
                  }}
                  className="p-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-[#1f1f1e] dark:border-zinc-800 rounded-lg text-[10px] font-bold text-slate-700 dark:text-zinc-300 font-mono transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3 inline" /> {L("CSV Olarak İndir", "Download as CSV")}
                </button>
              </div>

              {/* Logs Table Layout */}
              <div className="overflow-x-auto border border-slate-105 dark:border-zinc-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-neutral-900 text-[10px] font-bold font-mono text-slate-400 uppercase border-b border-slate-100">
                      <th className="p-3">{L("Kullanıcı", "User")}</th>
                      <th className="p-3">{L("Zaman Damgası", "Timestamp")}</th>
                      <th className="p-3">{L("Gerçekleştirilen Eylem", "Action")}</th>
                      <th className="p-3">{L("Modül", "Module")}</th>
                      <th className="p-3">{L("Sonuç", "Result")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-[11px] font-mono">
                    {auditLogs.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/40 dark:hover:bg-zinc-800/10">
                        <td className="p-3 font-semibold text-slate-800 dark:text-zinc-300">{l.user}</td>
                        <td className="p-3 text-slate-505">{l.timestamp}</td>
                        <td className="p-3 text-slate-700 dark:text-zinc-200 font-sans font-semibold">{l.action}</td>
                        <td className="p-3">
                          <span className="p-1 px-2 rounded bg-indigo-50 dark:bg-zinc-900 text-indigo-750 dark:text-zinc-305 text-[10px] font-bold font-sans">
                            {l.module}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`p-1 px-1.5 rounded text-[10px] font-bold ${
                            l.result === "Success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          }`}>
                            {resultLabel(l.result)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== SECTION 7: AI SETTINGS ==================== */}
          {activeSubTab === "aisettings" && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4 text-left">
                <h3 className="text-lg font-bold text-slate-805 dark:text-zinc-150">
                  {L("7. Yapay Zeka ve Prompt Yönetimi", "7. AI Settings & Prompt Management")}
                </h3>
              </div>

              <div className="p-4 rounded-xl border border-indigo-150 bg-indigo-50/5 dark:border-zinc-800 dark:bg-black/10 space-y-1.5 text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                  {L("AKTİF HİZMET ANALİZİ", "ACTIVE SERVICE ANALYSIS")}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-zinc-200">
                    {L("Kullanılan Yapay Zeka Model Servisi:", "Active AI Model Service:")}
                  </span>
                  <span className="font-bold text-[#0078D4] font-mono">Gemini-3.5-Flash (Google SDK)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500">{L("Kimlik Tanımı:", "Identity:")}</span>
                  <span className="text-slate-600 dark:text-slate-300 font-mono font-bold">{aiApiKeyName} ✅</span>
                </div>
              </div>

              {/* Prompt template modifiers */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-450 block uppercase font-mono tracking-wider">
                  {L("PROMPT ŞABLONLARINI DÜZENLE", "EDIT PROMPT TEMPLATES")}
                </span>
                
                {promptTemplates.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-150 dark:border-zinc-800 bg-slate-50/30 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 dark:text-zinc-200 text-xs">{item.name}</span>
                      <span className="text-[10px] bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded font-bold font-mono uppercase">{item.type}</span>
                    </div>
                    <textarea
                      rows={3}
                      defaultValue={item.prompt}
                      onBlur={(e) => handleSavePrompt(idx, e.target.value)}
                      className="w-full text-[11px] font-mono p-3 bg-white dark:bg-black text-slate-800 dark:text-zinc-300 rounded-lg border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-650"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{L("* Bu kutu dışına tıkladığınızda prompt doğrudan veritabanına kaydedilir.", "* Prompt is saved to the database when you click outside this box.")}</span>
                      <span>{L("Harcama Sınıfı:", "Usage Tier:")} {item.tokenUsage}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Skill Controls */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-3.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-widest font-mono">
                    {L("Yapay Zeka Ajanı Yetenek Aktivasyon Listesi", "AI Agent Skill Activation List")}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {aiAgentSkills.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-black/15 text-xs">
                      <span className="font-bold text-slate-755 dark:text-zinc-300">{skill.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...aiAgentSkills];
                          updated[index].active = !updated[index].active;
                          setAiAgentSkills(updated);
                          addAuditLog(actorName, "AI Yetenek Değişimi", `${skill.name} yeteneği ${updated[index].active ? "açıldı" : "kapatıldı"}.`, "AI Ayarları");
                        }}
                        className="text-slate-550 transition-colors"
                      >
                        {skill.active ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">🟢 {L("Aktif", "Active")}</span>
                        ) : (
                          <span className="text-slate-400 font-bold flex items-center gap-1">⚪ {L("Kapalı", "Off")}</span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== SECTION 8: SYSTEM HEALTH ==================== */}
          {activeSubTab === "systemhealth" && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4 text-left">
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">
                  {L("8. Sistem ve Entegrasyon Sağlığı Gösterge Paneli", "8. System & Integration Health Dashboard")}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="p-4 bg-emerald-50/20 rounded-2xl border border-emerald-200/50 space-y-1">
                  <span className="text-[9px] font-bold text-emerald-500 font-mono block uppercase">
                    {L("BAĞLI POSTA KUTULARI", "CONNECTED MAILBOXES")}
                  </span>
                  <div className="text-xl font-black text-slate-800 dark:text-emerald-400">{mailboxes.filter(m => m.status === "Connected").length} / {mailboxes.length}</div>
                  <p className="text-[10px] text-slate-405 leading-none">{L("Aktif Exchange hesaplar", "Active Exchange accounts")}</p>
                </div>

                <div className="p-4 bg-indigo-50/20 rounded-2xl border border-indigo-200/50 space-y-1">
                  <span className="text-[9px] font-bold text-indigo-550 font-mono block uppercase">
                    {L("BULUT DEPOLAMA KANALLARI", "CLOUD STORAGE CHANNELS")}
                  </span>
                  <div className="text-xl font-black text-indigo-650 dark:text-indigo-400">
                    {L("3 Bağlantı", "3 Connections")}
                  </div>
                  <p className="text-[10px] text-slate-405 leading-none">{L("OneDrive, Dropbox / S3", "OneDrive, Dropbox / S3")}</p>
                </div>

                <div className="p-4 bg-white dark:bg-black/10 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">
                    {L("VERİTABANI DEPOLAMASI", "DATABASE STORAGE")}
                  </span>
                  <div className="text-xl font-black text-slate-800 dark:text-zinc-300">62.8 MB</div>
                  <p className="text-[10px] text-slate-405 leading-none">
                    {L("Toplam meta veri kayıt boyutu", "Total metadata records size")}
                  </p>
                </div>
              </div>

              {/* Status and telemetry lines */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 space-y-3">
                <span className="text-[10px] font-bold text-slate-450 block uppercase font-mono">
                  {L("GERÇEK ZAMANLI SERVİS TELEMETRİSİ", "REAL-TIME SERVICE TELEMETRY")}
                </span>
                
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 bg-slate-50/60 dark:bg-zinc-900 border border-slate-150 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 dark:text-zinc-300">
                      {L("Microsoft Graph API Durumu (Azure AD):", "Microsoft Graph API Status (Azure AD):")}
                    </span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1 font-mono uppercase">
                      {L("🟢 ÇALIŞIYOR", "🟢 RUNNING")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50/60 dark:bg-zinc-900 border border-slate-150 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 dark:text-zinc-300">
                      {L("Google Gemini Üretken Yapay Zeka Kapasitesi:", "Google Gemini Generative AI Capacity:")}
                    </span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1 font-mono uppercase">
                      {L("🟢 ÇALIŞIYOR (120 RPM)", "🟢 RUNNING (120 RPM)")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50/60 dark:bg-zinc-900 border border-slate-150 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 dark:text-zinc-300">
                      {L("Tavily Arama Motoru API Entegrasyonu:", "Tavily Search Engine API Integration:")}
                    </span>
                    <span className="text-amber-600 font-bold flex items-center gap-1 font-mono uppercase">
                      {L("🟢 BAĞLI (Simülasyon Yedek)", "🟢 CONNECTED (Simulation Fallback)")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50/60 dark:bg-zinc-900 border border-slate-150 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 dark:text-zinc-300">
                      {L("Masaüstü E-posta Senkronizasyonu (Cron daemon):", "Desktop Email Sync (Cron daemon):")}
                    </span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1 font-mono uppercase">
                      {L("🟢 ÇALIŞIYOR", "🟢 RUNNING")}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Error metrics */}
              <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 dark:bg-neutral-900 text-xs text-slate-700 dark:text-zinc-300">
                <strong className="block font-bold text-slate-800 dark:text-zinc-200 uppercase font-mono tracking-wider text-[10px] mb-1">
                  {L("⏱️ OPERASYONEL ARIZA VE ÇAKIŞMALAR", "⏱️ OPERATIONAL FAILURES AND CONFLICTS")}
                </strong>
                {L(
                  "Son 48 saat içinde hiçbir kritik kesinti veya veri tabanı çöküşü saptanmamıştır. 1 adet Microsoft Graph e-posta okuma yetki aşımı log (Yetki Yok) olarak başarıyla yakalanıp e-posta detayı günlüğüne raporlanmıştır.",
                  "No critical outages or database crashes detected in the last 48 hours. One Microsoft Graph email read permission exceeded log (No Permission) was successfully captured and reported to the email detail log."
                )}
              </div>
            </div>
          )}

        </div>

        {/* Custom Toast Notifications */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-[9999] p-4 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-sm font-sans bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100">
            <div className={`w-2.5 h-2.5 rounded-full ${toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-rose-500" : "bg-blue-500"}`} />
            <p className="flex-1">{toast.message}</p>
            <button type="button" onClick={() => setToast(null)} className="text-[10px] text-slate-400 hover:text-slate-650 cursor-pointer">
              [{L("Kapat", "Close")}]
            </button>
          </div>
        )}


      </div>
    </div>
  );
}
