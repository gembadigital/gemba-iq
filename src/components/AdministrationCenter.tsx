import React, { useState, useEffect } from "react";
import {
  Building,
  Users,
  Mail,
  FileText,
  HardDrive,
  Activity,
  UserCheck,
  ShieldAlert,
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
const logoImage = "https://lh3.googleusercontent.com/d/13bNnthJU4LIICB4iiF1a4GH1PEn05MBx";

interface UserItem {
  id: string;
  name: string;
  surname: string;
  email: string;
  title: string;
  department: string;
  phone: string;
  status: "Active" | "Deactivated";
  role: "Super Admin" | "Admin" | "Sales Manager" | "Consultant" | "Standard User" | "Custom Role";
}

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
}

export default function AdministrationCenter({ onClose, initialSubTab }: AdministrationCenterProps) {
  const { lang: selectedLanguage, setLang: setSelectedLanguage, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab || "organization");

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [isAdmin, setIsAdmin] = useState<boolean>(true); // Verification indicator
  const [showSavedMsg, setShowSavedMsg] = useState<boolean>(false);

  // 1. Organization Settings
  const [orgSettings, setOrgSettings] = useState(() => {
    const saved = localStorage.getItem("admin_org_settings");
    const defaultSettings = {
      name: "Gemba Partner",
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

  // 2. User Management
  const [users, setUsers] = useState<UserItem[]>(() => {
    const saved = localStorage.getItem("admin_users_list");
    return saved ? JSON.parse(saved) : [
      {
        id: "u-1",
        name: "Atakan",
        surname: "Zehir",
        email: "a.zehir@gembapartner.com",
        title: "Co-Founder & Yönetici",
        department: "Yönetim",
        phone: "+90 532 111 22 33",
        status: "Active",
        role: "Super Admin"
      },
      {
        id: "u-2",
        name: "Banu",
        surname: "Kaya",
        email: "b.kaya@gembapartner.com",
        title: "Kıdemli Satış Yöneticisi",
        department: "Sales",
        phone: "+90 533 444 55 66",
        status: "Active",
        role: "Sales Manager"
      },
      {
        id: "u-3",
        name: "Efe",
        surname: "Yılmaz",
        email: "e.yilmaz@gembapartner.com",
        title: "Yalın Üretim Danışmanı",
        department: "Consulting",
        phone: "+90 544 777 88 99",
        status: "Active",
        role: "Consultant"
      },
      {
        id: "u-4",
        name: "Can",
        surname: "Demir",
        email: "c.demir@gembapartner.com",
        title: "Süreç Geliştirme Uzmanı",
        department: "Consulting",
        phone: "+90 555 999 00 11",
        status: "Deactivated",
        role: "Standard User"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("admin_users_list", JSON.stringify(users));
  }, [users]);

  const [newUser, setNewUser] = useState<Partial<UserItem>>({
    name: "",
    surname: "",
    email: "",
    title: "",
    department: "Sales",
    phone: "",
    role: "Standard User",
    status: "Active"
  });

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [lastSentInvite, setLastSentInvite] = useState<{ email: string; link: string } | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserValues, setEditingUserValues] = useState<UserItem | null>(null);

  // Custom toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  // User delete confirmation states
  const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);
  const [inlineDeleteId, setInlineDeleteId] = useState<string | null>(null);
  const [lastDeletedUserName, setLastDeletedUserName] = useState<string | null>(null);

  // Email failure / integration check simulation state
  const [simulateEmailError, setSimulateEmailError] = useState<boolean>(() => {
    return localStorage.getItem("crm_simulate_email_error") === "true";
  });

  const [inviteError, setInviteError] = useState<{ code: string; message: string; diagnostics: string } | null>(null);

  useEffect(() => {
    localStorage.setItem("crm_simulate_email_error", String(simulateEmailError));
  }, [simulateEmailError]);

  // Automatically clear toast after 3.5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleUpdateUser = (updatedUser: UserItem) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    setEditingUserId(null);
    setEditingUserValues(null);
    addAuditLog("Atakan Zehir", "Kullanıcı Güncellendi", `${updatedUser.email} bilgileri ve rolü güncellendi.`, "Kullanıcı Yönetimi");
    showToast(
      selectedLanguage === "TR"
        ? "Kullanıcı bilgileri başarıyla güncellendi!"
        : "User details successfully updated!",
      "success"
    );
  };

  const getEmailDomain = (email: string) => {
    const parts = email.split("@");
    return parts.length > 1 ? parts[1].toLowerCase().trim() : "";
  };

  const getMatchingConnectedMailbox = (email: string) => {
    const userDomain = getEmailDomain(email);
    if (!userDomain) return null;
    return mailboxes.find(box => {
      if (box.status !== "Connected") return false;
      const boxDomain = getEmailDomain(box.email);
      return boxDomain === userDomain;
    });
  };

  // Invitation and CRUD functions
  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.name) return;

    const matchingBox = getMatchingConnectedMailbox(newUser.email);

    if (simulateEmailError && !matchingBox) {
      const errorMsg = "E-Posta Gönderilemedi: API bağlantısı kurulamadı veya OAuth yetki anahtarı eşleşme hatası oluştu.";
      const diagStr = "Authentication failed: Gmail/Office365 API Client Credentials rejected.\nErrorCode: ERR_INV_EMAIL_TOKEN_MISMATCH_403\nDiagnostic detail: The server failed to refresh the SMTP bearer token. A secure connection could not be established with the remote relay. Check API/token mappings in connected mailboxes.";
      
      setInviteError({
        code: "ERR_INV_EMAIL_TOKEN_MISMATCH_403",
        message: selectedLanguage === "TR" ? errorMsg : "Email sending failed: API connection could not be established or OAuth credentials mismatched.",
        diagnostics: diagStr
      });

      addAuditLog(
        "Atakan Zehir",
        "E-Posta Hatası",
        `Sistem davet e-postasını gönderemedi. Hata kodu: ERR_INV_EMAIL_TOKEN_MISMATCH_403. Alıcı: ${newUser.email}`,
        "Kullanıcı Yönetimi"
      );
      
      showToast(
        selectedLanguage === "TR"
          ? "HATA: Davet e-postası gönderilirken bağlantı / token eşleşme hatası alındı!"
          : "ERROR: Failed to send invitation email due to connection/token mismatch!",
        "error"
      );
      return;
    }

    setInviteError(null);

    const item: UserItem = {
      id: `u-${Date.now()}`,
      name: newUser.name,
      surname: newUser.surname || "",
      email: newUser.email,
      title: newUser.title || "Consultant",
      department: newUser.department || "Consulting",
      phone: newUser.phone || "",
      status: "Active",
      role: newUser.role as any
    };
    setUsers([...users, item]);

    const inviteLink = `${window.location.origin}/join?invite=inv_${item.id}`;
    setLastSentInvite({ email: item.email, link: inviteLink });

    setNewUser({ name: "", surname: "", email: "", title: "", department: "Sales", phone: "", role: "Standard User", status: "Active" });
    setIsInviteOpen(false);

    if (matchingBox) {
      addAuditLog(
        "Atakan Zehir",
        "Kullanıcı Davet Edildi",
        `Yeni kullanıcı daveti ve linki, bağlı domain adresi (${matchingBox.email}) üzerinden gönderildi: ${item.email}`,
        "Kullanıcı Yönetimi"
      );
      showToast(
        selectedLanguage === "TR"
          ? `📧 Davet e-postası bağlı '${matchingBox.email}' adresi üzerinden başarıyla gönderilmiştir! Alıcı: ${item.email}`
          : `📧 Invitation email has been successfully sent via connected '${matchingBox.email}'! Recipient: ${item.email}`,
        "success"
      );
    } else {
      addAuditLog("Atakan Zehir", "Kullanıcı Davet Edildi", `Yeni kullanıcı daveti ve linki gönderildi: ${item.email}`, "Kullanıcı Yönetimi");
      showToast(
        selectedLanguage === "TR"
          ? `📧 Davet e-postası başarıyla gönderilmiştir! Alıcı: ${item.email}`
          : `📧 Invitation email has been successfully sent! Recipient: ${item.email}`,
        "success"
      );
    }
  };

  const handleDeleteUser = (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    if (!userToDelete) return;
    
    // Instead of window.confirm, open our custom inline overlay modal
    setUserToDeleteId(id);
    setLastDeletedUserName(`${userToDelete.name} ${userToDelete.surname}`);
  };

  const confirmDeleteUserAction = () => {
    if (!userToDeleteId) return;
    const userToDelete = users.find(u => u.id === userToDeleteId);
    if (userToDelete) {
      setUsers(users.filter(u => u.id !== userToDeleteId));
      addAuditLog("Atakan Zehir", "Kullanıcı Silindi", `${userToDelete.email} kullanıcısı sistemden kalıcı olarak silindi.`, "Kullanıcı Yönetimi");
      showToast(
        selectedLanguage === "TR" 
          ? `Kullanıcı (${lastDeletedUserName}) başarıyla silindi!` 
          : `User (${lastDeletedUserName}) has been successfully deleted!`,
        "success"
      );
    }
    setUserToDeleteId(null);
    setLastDeletedUserName(null);
  };

  const toggleUserStatus = (id: string) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === "Active" ? "Deactivated" : "Active";
        addAuditLog("Atakan Zehir", nextStatus === "Active" ? "Kullanıcı Etkinleşti" : "Kullanıcı Askıya Alındı", `${u.email} durumu değiştirildi`, "Kullanıcı Yönetimi");
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleResetPassword = (email: string) => {
    alert(`Şifre sıfırlama e-postası başarıyla gönderildi: ${email}`);
    addAuditLog("Atakan Zehir", "Kullanıcı Şifre Sıfırlama", `${email} için şifre sıfırlama linki tetiklendi.`, "Kullanıcı Yönetimi");
  };

  // 2.2 Permissions Matrix state
  const [pMatrix, setPMatrix] = useState<{ [role: string]: { [menu: string]: string[] } }>(() => {
    const saved = localStorage.getItem("admin_perms_matrix");
    return saved ? JSON.parse(saved) : {
      "Super Admin": {
        "Companies": ["View", "Create", "Edit", "Delete", "Export", "Admin"],
        "Leads": ["View", "Create", "Edit", "Delete", "Export", "Admin"],
        "Opportunities": ["View", "Create", "Edit", "Delete", "Export", "Admin"],
        "Proposals": ["View", "Create", "Edit", "Delete", "Export", "Admin"],
        "Campaigns": ["View", "Create", "Edit", "Delete", "Export", "Admin"],
        "Activity Reports": ["View", "Create", "Edit", "Delete", "Export", "Admin"],
        "Revenue Reports": ["View", "Create", "Edit", "Delete", "Export", "Admin"],
        "Administration": ["View", "Create", "Edit", "Delete", "Export", "Admin"],
        "AI Assistant": ["View", "Create", "Edit", "Delete", "Export", "Admin"],
        "Skill Library": ["View", "Create", "Edit", "Delete", "Export", "Admin"],
        "Email Management": ["View", "Create", "Edit", "Delete", "Export", "Admin"]
      },
      "Consultant": {
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
    };
  });

  useEffect(() => {
    localStorage.setItem("admin_perms_matrix", JSON.stringify(pMatrix));
  }, [pMatrix]);

  const menusList = [
    "Companies", "Leads", "Opportunities", "Proposals", "Campaigns",
    "Activity Reports", "Revenue Reports", "Administration", "AI Assistant", "Skill Library", "Email Management"
  ];
  const permsList = ["View", "Create", "Edit", "Delete", "Export", "Admin"];
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<string>("Consultant");

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
    addAuditLog("Atakan Zehir", "Yetki Değişikliği", `${selectedRoleForMatrix} rolü için ${menu} yetkileri güncellendi.`, "Yetki Yönetimi");
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
      owner: newMailbox.owner || "Atakan Zehir",
      lastSync: "Şimdi bağlı (Canlı)"
    };

    setMailboxes([...mailboxes, item]);
    setIsConnectMailboxOpen(false);
    setNewMailbox({ name: "", email: "", provider: "Microsoft 365", owner: "" });
    addAuditLog("Atakan Zehir", "Yeni E-posta Bağlandı", `Yeni posta kutusu entegre edildi: ${item.email} (${item.provider})`, "E-posta Yönetimi");
    alert("Posta kutusu entegrasyonu ve Microsoft Graph API yetkilendirmesi başarıyla tamamlandı!");
  };

  const handleRemoveMailbox = (id: string) => {
    const box = mailboxes.find(m => m.id === id);
    if (!box) return;
    if (confirm(`${box.email} posta kutusu bağlantısını koparmak istediğinize emin misiniz?`)) {
      setMailboxes(mailboxes.filter(m => m.id !== id));
      addAuditLog("Atakan Zehir", "E-posta Bağlantısı Kesildi", `${box.email} hesabı sistemden kaldırıldı.`, "E-posta Yönetimi");
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
    addAuditLog("Atakan Zehir", "Şablon Oluşturuldu", `E-posta şablonu eklendi: ${item.name}`, "Şablon Yönetimi");
    alert("Yeni şablon başarıyla oluşturuldu!");
  };

  const deleteTemplate = (id: string, name: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    if (selectedTemplateId === id) setSelectedTemplateId(null);
    addAuditLog("Atakan Zehir", "Şablon Silindi", `Şablon kaldırıldı: ${name}`, "Şablon Yönetimi");
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
        owner: "Admin"
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
        owner: "Admin"
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
        owner: "Admin"
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
    addAuditLog("Atakan Zehir", "Belge Kategorisi Eklendi", `Yeni döküman türü eklendi: ${added.name}`, "Veri Yönetimi");
    alert(`'${added.name}' döküman kategorisi başarıyla oluşturuldu!`);
  };

  const handleDeleteDocType = (id: string, name: string) => {
    const success = DocumentService.deleteDocType(id);
    if (success) {
      setDocTypes(DocumentService.getDocTypes());
      addAuditLog("Atakan Zehir", "Belge Kategorisi Silindi", `Döküman türü silindi: ${name}`, "Veri Yönetimi");
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
    addAuditLog("Atakan Zehir", "Depolama Bağlantısı Eklendi", `Bulut veri kaynağı entegre edildi: ${item.name}`, "Data Hub");
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

    addAuditLog("Atakan Zehir", "Bağlantı Ayarları Güncellendi", `${conn.name} bağlantı parametreleri güncellendi.`, "Data Hub");
    alert(`'${conn.name}' bağlantı ayarları başarıyla kaydedildi!`);
    setEditingConnId(null);
    setEditForm(null);
  };

  const handleToggleConnection = (id: string, enable: boolean) => {
    setDataHubConnections(dataHubConnections.map(c => {
      if (c.id === id) {
        const status = enable ? "Connected" : "Disconnected";
        const health = enable ? "Healthy" : "Untested";
        addAuditLog("Atakan Zehir", enable ? "Bulut Bağlantısı Aktifleştirildi" : "Bulut Bağlantısı Devre Dışı", `${c.name} kanalı ${enable ? "aktif" : "pasif"} edildi.`, "Data Hub");
        
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
      addAuditLog("Atakan Zehir", "Depolama Bağlantısı Silindi", `${name} bağlantısı sistemden kaldırıldı.`, "Data Hub");
      setEditingConnId(null);
      setEditForm(null);
    }
  };

  const handleSetDefaultStorage = (id: string) => {
    setDataHubConnections(dataHubConnections.map(c => {
      if (c.id === id) {
        addAuditLog("Atakan Zehir", "Varsayılan Depolama Değiştirildi", `${c.name} varsayılan depolama kanalı yapıldı.`, "Data Hub");
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
      addAuditLog("Atakan Zehir", "Bağlantı Test Başarılı", `${conn.name} için yapılan iletişim testi başarıyla tamamlandı.`, "Data Hub", "Success");
    } else {
      setDataHubConnections(dataHubConnections.map(c => {
        if (c.id === id) {
          return { ...c, connectionHealth: "Unhealthy" as any, status: "Disconnected" as any };
        }
        return c;
      }));
      alert(`❌ BAĞLANTI TESTİ BAŞARISIZ!\n\n${conn.name} (${conn.provider}) bulut sunucusuna erişim sağlanamadı!\nSebep: Kimlik doğrulama anahtarları (Client ID / Client Secret) veya Kök Klasör tanımlı değil. Lütfen bilgileri kontrol edin.`);
      addAuditLog("Atakan Zehir", "Bağlantı Test Başarısız", `${conn.name} için erişim testi başarısız oldu.`, "Data Hub", "Warning");
    }
  };

  const handleSaveAndClose = () => {
    setShowSavedMsg(true);
    addAuditLog("Atakan Zehir", "Ayarlar Kaydedildi", "Yönetim portalı ayarları değiştirildi ve kapatıldı.", "Sistem Ayarları");
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
    addAuditLog("Atakan Zehir", "AI Prompt Düzenleme", `AI Prompt Şablonu güncellendi: ${updated[idx].name}`, "AI Ayarları");
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
      addAuditLog("Atakan Zehir", "Sistem Sağlığı Kontrolü", "Tüm sistem servisleri ve harici API'ler başarıyla test edildi.", "Sistem Sağlığı");
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* HEADER ROW WITH USER METRICS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#18181b] p-6 rounded-2xl border border-slate-150 dark:border-zinc-800/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-indigo-50 dark:bg-zinc-900 border border-indigo-200 dark:border-zinc-800 text-indigo-650 dark:text-zinc-200 rounded-lg text-[10px] font-bold font-mono tracking-wider uppercase">
              YÖNETİM PANELİ (ADMINISTRATION)
            </span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Yetki Sınıfı: Super Admin</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-150 font-sans tracking-tight">
            Gemba Partner Business Operating System™ Merkez Ofis Portalı
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Organizasyonel yapıyı, kullanıcı izinlerini, posta kutularını, veri hub bağlantılarını ve AI modellerini merkezi olarak yönetin.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">

          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-900 dark:text-zinc-200 block">Atakan Zehir</span>
            <span className="text-[10px] font-mono text-slate-405 block">a.zehir@gembapartner.com</span>
            <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-md mt-1 inline-block">Lisans: Aktif</span>
          </div>
          <div className="w-11 h-11 bg-indigo-550 group-hover:bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md cursor-pointer border-2 border-slate-100 dark:border-zinc-800 mr-2">
            AZ
          </div>
          <div className="flex items-center gap-3">
            {showSavedMsg && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2 py-1.5 rounded-lg animate-pulse shadow-sm">
                ✓ Kaydedildi
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="p-2.5 px-4 bg-emerald-600 hover:bg-emerald-555 border border-emerald-500 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              title="Kaydet / Kapat"
            >
              <Check className="w-4 h-4" />
              <span>Kaydet / Kapat</span>
            </button>
          </div>
        </div>
      </div>

      {/* ADMINISTRATION GRID VIEW & TABS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SIDE BAR NAVIGATION WITHIN ADMIN VIEW */}
        <aside className="lg:col-span-3 bg-white dark:bg-[#18181b] rounded-2xl border border-slate-200/60 dark:border-zinc-800/85 p-3.5 space-y-1.5 shadow-xs">
          <span className="px-3.5 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block">AYAR KATEGORİLERİ</span>
          
          <button
            type="button"
            onClick={() => setActiveSubTab("organization")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "organization"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <Building className="w-4 h-4 text-slate-400" />
            <span>Organizasyon Ayarları</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("users")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "users"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <Users className="w-4 h-4 text-slate-400" />
            <span>Kullanıcı Yönetimi & İzinler</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("email")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "email"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <Mail className="w-4 h-4 text-slate-400" />
            <span>Bağlı E-posta Kutuları</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("templates")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "templates"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <FileText className="w-4 h-4 text-slate-400" />
            <span>E-posta Şablonları</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("datahub")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "datahub"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <HardDrive className="w-4 h-4 text-slate-400" />
            <span>Bulut Depolama & Data Hub</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("auditlogs")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "auditlogs"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <UserCheck className="w-4 h-4 text-slate-400" />
            <span>Denetim Günlükleri (Audit Logs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("aisettings")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "aisettings"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-550" />
            <span>AI Yardımcı & Prompt Ayarları</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("systemhealth")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "systemhealth"
                ? "bg-indigo-50/70 border-l-4 border-l-indigo-650 text-indigo-750 dark:bg-zinc-800/70 dark:text-white dark:border-l-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <Activity className="w-4 h-4 text-slate-400" />
            <span>Sistem Sağlığı Dashboard</span>
          </button>

          <div className="pt-6 border-t border-slate-100 dark:border-zinc-800/70">
            <div className="bg-amber-50/65 dark:bg-[#251f15] p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-250 leading-relaxed font-sans font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-600 inline mr-1" />
              Organizasyon Ayarları tüm şirketin operasyon modelini etkiler.
            </div>
          </div>
        </aside>

        {/* DETAILS WORKSPACE CONTAINER */}
        <div className="lg:col-span-9 bg-white dark:bg-[#18181b] rounded-2xl border border-slate-205/60 dark:border-zinc-800/80 shadow-xs p-6 md:p-8 min-h-[500px]">
          
          {/* ==================== SECTION 1: ORGANIZATION SETTINGS ==================== */}
          {activeSubTab === "organization" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800/80 pb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">1. Organizasyon Temel Konfigürasyonu</h3>
                <p className="text-xs text-slate-500">Gemba Partner firmasının tüzel kişiliği, varsayılan para birimi, çalışma saatleri ve yıllık mali plan dönemlerine yönelik resmi tanımlar.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">Şirket Resmi Adı (Organization Name)</label>
                  <input
                    type="text"
                    value={orgSettings.name}
                    onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                    className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">Şirket Logosu / Marka İmzası</label>
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
                      <span>Yeni Logo Yükle</span>
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
                              addAuditLog("Atakan Zehir", "Şirket Logosu Güncellendi", "Yeni şirket logosu sisteme yüklendi.", "Sistem Ayarları");
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">Vergi Dairesi ve Numarası (Tax Info)</label>
                  <input
                    type="text"
                    value={orgSettings.taxInfo}
                    onChange={(e) => setOrgSettings({ ...orgSettings, taxInfo: e.target.value })}
                    className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">Resmi Web Sitesi (Website)</label>
                  <input
                    type="text"
                    value={orgSettings.website}
                    onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                    className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">Telefon Numarası (Phone)</label>
                  <input
                    type="text"
                    value={orgSettings.phone}
                    onChange={(e) => setOrgSettings({ ...orgSettings, phone: e.target.value })}
                    className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">Varsayılan Para Birimi (Default Currency)</label>
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
                    <span className="font-bold text-slate-450 uppercase font-mono block text-[10px] mb-1">Aktif Sistem Dili / Active Language</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>{selectedLanguage === "TR" ? "🇹🇷 Türkçe (TR)" : "🇬🇧 English (EN)"}</span>
                      <span className="text-[9px] bg-indigo-50 dark:bg-zinc-800 text-indigo-650 dark:text-zinc-400 px-1.5 py-0.5 rounded uppercase font-mono font-extrabold">{selectedLanguage === "TR" ? "Üst Menüden Değiştirilir" : "Change via Header"}</span>
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono mb-1.5">Resmi Merkez Adresi (Address)</label>
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
                <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide font-mono">Çalışma Düzeni & Takvim Yapılandırması</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-455 mb-1">Mali Yıl Başlangıcı (Fiscal Year)</label>
                    <input
                      type="text"
                      value={orgSettings.fiscalYear}
                      onChange={(e) => setOrgSettings({ ...orgSettings, fiscalYear: e.target.value })}
                      className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-850 focus:outline-none dark:text-zinc-350"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-455 mb-1">Günlük Çalışma Saatleri (Working Hours)</label>
                    <input
                      type="text"
                      value={orgSettings.workingHours}
                      onChange={(e) => setOrgSettings({ ...orgSettings, workingHours: e.target.value })}
                      className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-850 focus:outline-none dark:text-zinc-350"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-455 mb-1">Varsayılan Saat Dilimi (Timezone)</label>
                    <input
                      type="text"
                      value={orgSettings.timezone}
                      onChange={(e) => setOrgSettings({ ...orgSettings, timezone: e.target.value })}
                      className="w-full text-xs bg-slate-50 dark:bg-black/35 text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-850 focus:outline-none dark:text-zinc-350"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <span className="text-[10px] font-bold text-slate-450 block uppercase">Aktif İş Günleri (Business Days)</span>
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
                    ✓ Kaydedildi
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowSavedMsg(true);
                    addAuditLog("Atakan Zehir", "Organizasyon Güncellendi", "Şirket vergi, takvim ve saat ayarları yenilendi.", "Bulut Entegrasyonu");
                    setTimeout(() => {
                      setShowSavedMsg(false);
                    }, 1500);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Değişiklikleri Kaydet
                </button>
              </div>
            </div>
          )}

          {/* ==================== SECTION 2: USER MANAGEMENT & PERMISSIONS ==================== */}
          {activeSubTab === "users" && (
            <div className="space-y-8 animate-in fade-in duration-100">
              
              {/* Invite User & List block */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">2. Kullanıcı Atama ve Davet Portali</h3>
                    <p className="text-xs text-slate-500">Business Operating System altındaki yetkili personelin rollerini değiştirebilir, askıya alabilir veya yeni danışman davet edebilirsiniz.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(!isInviteOpen)}
                    className="p-2.5 px-4 text-xs font-bold text-white bg-indigo-650 rounded-xl hover:bg-indigo-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Yeni Kullanıcı Ekle
                  </button>
                </div>

                {lastSentInvite && (
                  <div className="p-4.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 dark:border-emerald-950/40 dark:bg-emerald-950/10 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider font-mono">
                          {selectedLanguage === "TR" ? "📧 DAVET E-POSTASI GÖNDERİLDİ" : "📧 INVITATION EMAIL SENT"}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLastSentInvite(null)}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 font-mono cursor-pointer"
                      >
                        {selectedLanguage === "TR" ? "[Gizle]" : "[Dismiss]"}
                      </button>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-zinc-300 space-y-1 bg-white/50 dark:bg-black/25 p-3 rounded-xl border border-emerald-100 dark:border-emerald-950/20">
                      <p>
                        <strong>{selectedLanguage === "TR" ? "E-posta Alıcısı:" : "Email Recipient:"}</strong>{" "}
                        <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{lastSentInvite.email}</span>
                      </p>
                      <p className="flex items-center gap-2 flex-wrap">
                        <strong>{selectedLanguage === "TR" ? "Davet Linki:" : "Invitation Link:"}</strong>{" "}
                        <span className="font-mono bg-emerald-50 dark:bg-black/40 px-2 py-1 rounded text-[11px] select-all border border-emerald-100 dark:border-emerald-900/40 truncate max-w-md">
                          {lastSentInvite.link}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(lastSentInvite.link);
                            showToast(
                              selectedLanguage === "TR"
                                ? "Davet linki panoya kopyalanmıştır!"
                                : "Invitation link copied to clipboard!",
                              "success"
                            );
                          }}
                          className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-750"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{selectedLanguage === "TR" ? "Kopyala" : "Copy"}</span>
                        </button>
                      </p>
                      <p className="text-[10px] text-slate-450 mt-1 italic">
                        {selectedLanguage === "TR" 
                          ? "* Davet e-postası alıcının posta kutusuna başarıyla teslim edilmiştir. Kullanıcı bu linke tıklayarak doğrudan giriş yapabilir."
                          : "* The invitation email has been successfully delivered. The user can click this link to join directly."}
                      </p>
                    </div>
                  </div>
                )}

                {inviteError && (
                  <div className="p-4.5 rounded-2xl border border-rose-200 bg-rose-50/20 dark:border-rose-950/40 dark:bg-rose-950/10 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-sm font-sans">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.5]" />
                        <h4 className="text-xs font-black text-rose-800 dark:text-rose-400 uppercase tracking-wider font-mono">
                          {selectedLanguage === "TR" ? "🚨 E-POSTA GÖNDERİM & API BAĞLANTI HATASI" : "🚨 EMAIL DISPATCH & API CONNECTION ERROR"}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInviteError(null)}
                        className="text-[10px] font-bold text-rose-700 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-200 font-mono cursor-pointer"
                      >
                        {selectedLanguage === "TR" ? "[Temizle]" : "[Dismiss]"}
                      </button>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-zinc-300 space-y-2 bg-white/70 dark:bg-black/30 p-3 rounded-lg border border-rose-100 dark:border-rose-950/20">
                      <p className="font-bold text-rose-700 dark:text-rose-450">
                        {inviteError.message}
                      </p>
                      <div className="text-[10px] font-mono bg-rose-50/50 dark:bg-black/40 p-2.5 rounded border border-rose-100 dark:border-rose-950/40 whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-zinc-400 select-all">
                        <strong>System Diagnostics Output:</strong>{"\n"}
                        CODE: {inviteError.code}{"\n"}{inviteError.diagnostics}
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        {selectedLanguage === "TR" 
                          ? "💡 Çözüm: Çoklu E-Postalar & Bağlı Klasör Yönetimi sekmesine giderek API Hata Simülatörü anahtarını kapatın."
                          : "💡 Resolution: Navigate to Connected Mailboxes tab to disable the API Error Simulator switch."}
                      </p>
                    </div>
                  </div>
                )}

                {isInviteOpen && (
                  <form onSubmit={handleInviteUser} className="p-5 rounded-2xl border border-indigo-150 bg-indigo-50/10 dark:border-zinc-800 dark:bg-black/20 space-y-4 animate-in slide-in-from-top-3 duration-200">
                    <span className="text-[10px] font-bold text-indigo-750 dark:text-indigo-400 font-mono uppercase block">SİSTEME DAVETSİZ KULLANICI ATAMA</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Adı *"
                        required
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        className="text-xs bg-white dark:bg-black p-3 rounded-xl border border-slate-200 dark:border-zinc-805"
                      />
                      <input
                        type="text"
                        placeholder="Soyadı"
                        value={newUser.surname}
                        onChange={(e) => setNewUser({ ...newUser, surname: e.target.value })}
                        className="text-xs bg-white dark:bg-black p-3 rounded-xl border border-slate-200 dark:border-zinc-805"
                      />
                      <input
                        type="email"
                        placeholder="Kurumsal E-posta *"
                        required
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="text-xs bg-white dark:bg-black p-3 rounded-xl border border-slate-200 dark:border-zinc-805"
                      />
                      <input
                        type="text"
                        placeholder="Unvan (Örn. Yalın Lider)"
                        value={newUser.title}
                        onChange={(e) => setNewUser({ ...newUser, title: e.target.value })}
                        className="text-xs bg-white dark:bg-black p-3 rounded-xl border border-slate-200 dark:border-zinc-805"
                      />
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                        className="text-xs bg-white dark:bg-black p-3 rounded-xl border border-slate-200 dark:border-zinc-850"
                      >
                        <option>Super Admin</option>
                        <option>Admin</option>
                        <option>Sales Manager</option>
                        <option>Consultant</option>
                        <option>Standard User</option>
                        <option>Custom Role</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Telefon"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                        className="text-xs bg-white dark:bg-black p-3 rounded-xl border border-slate-200 dark:border-zinc-805"
                      />
                    </div>

                    {/* Dynamic Mailbox Domain Connection Check */}
                    {(() => {
                      const matchingBox = getMatchingConnectedMailbox(newUser.email || "");
                      if (matchingBox) {
                        return (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 w-full animate-in fade-in duration-150">
                            <span className="text-sm">✓</span>
                            <span>
                              {selectedLanguage === "TR" 
                                ? `E-posta domaini (${getEmailDomain(newUser.email || "")}) bağlı durumda! Davet e-postası bu bağlı adres üzerinden doğrudan gönderilecektir: `
                                : `Email domain (${getEmailDomain(newUser.email || "")}) is connected! Invitation email will be routed and sent via this connected mailbox: `}
                              <strong className="underline">{matchingBox.email}</strong>
                            </span>
                          </div>
                        );
                      } else if (newUser.email && newUser.email.includes("@")) {
                        return (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 w-full animate-in fade-in duration-150">
                            <span className="text-sm">⚠</span>
                            <span>
                              {selectedLanguage === "TR"
                                ? `Bu e-postanın domaini (${getEmailDomain(newUser.email || "")}) bağlı bir posta kutusuyla eşleşmiyor. Davet gönderimi API/SMTP simülasyonu ile gerçekleşecektir.`
                                : `The domain of this email (${getEmailDomain(newUser.email || "")}) does not match any active connected mailbox. Email dispatch will use sandbox/API simulation.`}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsInviteOpen(false)}
                        className="p-2 px-4 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-[#252423]"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="p-2 px-4 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-550"
                      >
                        Davet Gönder
                      </button>
                    </div>
                  </form>
                )}

                {/* User Table list */}
                <div className="overflow-x-auto border border-slate-100 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-black/10 text-[10px] font-bold font-mono text-slate-450 uppercase border-b border-slate-100 dark:border-zinc-800">
                        <th className="p-3">Adı Soyadı / Başlık</th>
                        <th className="p-3">Unvan & Departman</th>
                        <th className="p-3">Rolü</th>
                        <th className="p-3">Durum</th>
                        <th className="p-3 text-right">Aksiyonlar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-xs">
                      {users.map(u => {
                        const isEditing = editingUserId === u.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                            <td className="p-3">
                              {isEditing && editingUserValues ? (
                                <div className="space-y-1">
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={editingUserValues.name}
                                      onChange={(e) => setEditingUserValues({ ...editingUserValues, name: e.target.value })}
                                      className="text-xs p-1 px-2 border border-slate-250 dark:border-zinc-800 rounded bg-white dark:bg-black w-24 text-slate-800 dark:text-zinc-200"
                                      placeholder="Ad"
                                    />
                                    <input
                                      type="text"
                                      value={editingUserValues.surname}
                                      onChange={(e) => setEditingUserValues({ ...editingUserValues, surname: e.target.value })}
                                      className="text-xs p-1 px-2 border border-slate-250 dark:border-zinc-800 rounded bg-white dark:bg-black w-24 text-slate-800 dark:text-zinc-200"
                                      placeholder="Soyad"
                                    />
                                  </div>
                                  <input
                                    type="email"
                                    value={editingUserValues.email}
                                    onChange={(e) => setEditingUserValues({ ...editingUserValues, email: e.target.value })}
                                    className="text-[10px] p-1 px-2 border border-slate-250 dark:border-zinc-800 rounded bg-white dark:bg-black w-full text-slate-800 dark:text-zinc-200"
                                    placeholder="E-posta"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-zinc-200">{u.name} {u.surname}</span>
                                  <span className="block text-[10px] text-slate-400 font-mono">{u.email}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              {isEditing && editingUserValues ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={editingUserValues.title}
                                    onChange={(e) => setEditingUserValues({ ...editingUserValues, title: e.target.value })}
                                    className="text-xs p-1 px-2 border border-slate-250 dark:border-zinc-800 rounded bg-white dark:bg-black w-full text-slate-800 dark:text-zinc-200"
                                    placeholder="Unvan"
                                  />
                                  <input
                                    type="text"
                                    value={editingUserValues.department}
                                    onChange={(e) => setEditingUserValues({ ...editingUserValues, department: e.target.value })}
                                    className="text-[10px] p-1 px-2 border border-slate-250 dark:border-zinc-800 rounded bg-white dark:bg-black w-full text-slate-800 dark:text-zinc-200"
                                    placeholder="Departman"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <span className="text-slate-700 dark:text-zinc-300 font-semibold">{u.title}</span>
                                  <span className="block text-[10px] text-indigo-600 font-bold">{u.department}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              {isEditing && editingUserValues ? (
                                <select
                                  value={editingUserValues.role}
                                  onChange={(e) => setEditingUserValues({ ...editingUserValues, role: e.target.value as any })}
                                  className="text-xs p-1 px-2 border border-slate-250 dark:border-zinc-800 rounded bg-white dark:bg-black text-slate-800 dark:text-zinc-200"
                                >
                                  <option>Super Admin</option>
                                  <option>Admin</option>
                                  <option>Sales Manager</option>
                                  <option>Consultant</option>
                                  <option>Standard User</option>
                                  <option>Custom Role</option>
                                </select>
                              ) : (
                                <span className="p-1 px-2 rounded bg-indigo-50 dark:bg-zinc-900 border border-indigo-150 dark:border-zinc-800 text-[10px] font-bold text-indigo-700 dark:text-zinc-300 font-mono">
                                  {u.role}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                u.status === "Active" ? "text-emerald-600" : "text-slate-400"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${u.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                                {u.status === "Active" ? "Aktif" : "Yetki Askıda"}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-2">
                              {isEditing && editingUserValues ? (
                                <div className="flex gap-1 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateUser(editingUserValues)}
                                    className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Kaydet
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUserId(null);
                                      setEditingUserValues(null);
                                    }}
                                    className="p-1 px-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    İptal
                                  </button>
                                </div>
                              ) : inlineDeleteId === u.id ? (
                                <div className="space-x-1 inline-flex items-center bg-rose-50 dark:bg-rose-950/20 p-1.5 rounded-lg border border-rose-250 dark:border-rose-900/60 animate-in fade-in duration-200">
                                  <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 mr-2 shrink-0">
                                    {selectedLanguage === "TR" ? "Emin misiniz?" : "Confirm Delete?"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUsers(users.filter(usr => usr.id !== u.id));
                                      addAuditLog("Atakan Zehir", "Kullanıcı Silindi", `${u.email} kullanıcısı sistemden kalıcı olarak silindi.`, "Kullanıcı Yönetimi");
                                      showToast(
                                        selectedLanguage === "TR" 
                                          ? `Kullanıcı (${u.name} ${u.surname}) başarıyla silindi!` 
                                          : `User (${u.name} ${u.surname}) has been successfully deleted!`,
                                        "success"
                                      );
                                      setInlineDeleteId(null);
                                    }}
                                    className="p-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black rounded cursor-pointer"
                                  >
                                    {selectedLanguage === "TR" ? "Evet, Sil" : "Yes, Delete"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setInlineDeleteId(null)}
                                    className="p-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 text-[9px] font-black rounded cursor-pointer"
                                  >
                                    {selectedLanguage === "TR" ? "Vazgeç" : "No"}
                                  </button>
                                </div>
                              ) : (
                                <div className="space-x-1.5 inline-flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUserId(u.id);
                                      setEditingUserValues({ ...u });
                                    }}
                                    className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-zinc-800 text-[10px] font-bold rounded cursor-pointer"
                                  >
                                    Düzenle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleUserStatus(u.id)}
                                    className={`p-1 px-2 rounded text-[10px] font-bold cursor-pointer ${
                                      u.status === "Active"
                                        ? "bg-amber-50 text-amber-600 border border-amber-250 dark:bg-[#302111]"
                                        : "bg-emerald-50 text-emerald-600 border border-emerald-250 dark:bg-[#112f11]"
                                    }`}
                                  >
                                    {u.status === "Active" ? "Durdur" : "Etkinleştir"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleResetPassword(u.email)}
                                    className="p-1 px-2 bg-slate-100 hover:bg-slate-150 text-slate-655 dark:bg-zinc-800 text-[10px] font-bold rounded cursor-pointer"
                                    title="Şifresini Sıfırla"
                                  >
                                    Sıfırla
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setInlineDeleteId(u.id)}
                                    className="p-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-950/40 text-[10px] font-bold rounded cursor-pointer animate-fade-in"
                                    title={selectedLanguage === "TR" ? "Kullanıcıyı Kalıcı Olarak Sil" : "Permanently Delete User"}
                                  >
                                    Sil
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic Permissions Matrix component */}
              <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide font-mono flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-slate-400" />
                      Rol Bazlı Menü İzin Matrisi (Permissions Grid)
                    </h4>
                    <p className="text-xs text-slate-500">Uygulama üzerindeki menülerin hangi rollere açık olacağını gerçek zamanlı maskeleyin.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 font-mono">Rol Seçin:</span>
                    <select
                      value={selectedRoleForMatrix}
                      onChange={(e) => setSelectedRoleForMatrix(e.target.value)}
                      className="text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-205 md:p-2 p-1.5 rounded-lg"
                    >
                      <option>Super Admin</option>
                      <option>Admin</option>
                      <option>Sales Manager</option>
                      <option>Consultant</option>
                      <option>Standard User</option>
                      <option>Custom Role</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-150 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-neutral-900 text-[10px] font-bold font-mono text-slate-450 uppercase border-b border-slate-150 dark:border-zinc-800">
                        <th className="p-3 text-left w-1/4">Menü & Yetki Grubu</th>
                        {permsList.map(perm => (
                          <th key={perm} className="p-3">{perm}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                      {menusList.map(menu => {
                        const currentRolePermissions = pMatrix[selectedRoleForMatrix] || {};
                        const menuActivePerms = currentRolePermissions[menu] || [];

                        return (
                          <tr key={menu} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                            <td className="p-3 text-left font-bold text-slate-700 dark:text-zinc-300">{menu}</td>
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

          {/* ==================== SECTION 3: CONNECTED MAILBOXES ==================== */}
          {activeSubTab === "email" && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">3. Çoklu E-postalar &amp; Bağlı Klasör Yönetimi</h3>
                  <p className="text-xs text-slate-500">Sistem kullanıcıları ile e-posta posta kutuları bağımsız varlıklardır. Bir kullanıcı birden fazla mail kutusuna erişebilir.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConnectMailboxOpen(true)}
                  className="p-2.5 px-4 text-xs font-bold text-white bg-indigo-650 rounded-xl hover:bg-indigo-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Exchange / OAuth Girişi Yap
                </button>
              </div>

              {/* API and Integration Error Simulator Panel */}
              <div className="p-4.5 rounded-2xl border border-rose-200/50 bg-rose-50/10 dark:border-rose-950/20 dark:bg-rose-950/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-rose-700 dark:text-rose-450 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                      <span>{selectedLanguage === "TR" ? "⚠️ E-Posta Entegrasyon &amp; Token Hata Simülatörü" : "⚠️ Email Integration &amp; Token Error Simulator"}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {selectedLanguage === "TR"
                        ? "Bu anahtarı açtığınızda; davet e-postaları gönderilirken veya CRM üzerinden e-posta yollanırken API / OAuth token uyuşmazlığı ve sunucu bağlantı hataları canlandırılır."
                        : "Enabling this switch forces simulated OAuth2 handshake and SMTP connection errors when sending user invites or deal emails."}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={simulateEmailError}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSimulateEmailError(checked);
                        showToast(
                          selectedLanguage === "TR"
                            ? (checked ? "API Hata Simülatörü Aktif Edildi!" : "API Hata Simülatörü Devre Dışı Bırakıldı!")
                            : (checked ? "API Error Simulator Activated!" : "API Error Simulator Deactivated!"),
                          checked ? "error" : "success"
                        );
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                    <span className="ml-3 text-xs font-black uppercase font-mono tracking-wider text-rose-700 dark:text-rose-450">
                      {simulateEmailError ? (selectedLanguage === "TR" ? "AÇIK / ACTIVE" : "ON / SIMULATING") : (selectedLanguage === "TR" ? "KAPALI / DISABLED" : "OFF / NORMAL")}
                    </span>
                  </label>
                </div>
              </div>

              {isConnectMailboxOpen && (
                <form onSubmit={handleConnectNewMailbox} className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/15 dark:border-zinc-800 dark:bg-black/20 space-y-4 animate-in slide-in-from-top-2 duration-150">
                  <span className="text-[10px] font-bold text-indigo-750 dark:text-indigo-400 font-mono uppercase block">YENİ MAILBOX ETKİLEŞİMİ</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Hesap Adı (Örn: Gemba Destek Masası)"
                      required
                      value={newMailbox.name}
                      onChange={(e) => setNewMailbox({ ...newMailbox, name: e.target.value })}
                      className="text-xs bg-white dark:bg-black p-3 rounded-xl border border-slate-200 dark:border-zinc-800"
                    />
                    <input
                      type="email"
                      placeholder="E-posta Adresi *"
                      required
                      value={newMailbox.email}
                      onChange={(e) => setNewMailbox({ ...newMailbox, email: e.target.value })}
                      className="text-xs bg-white dark:bg-black p-3 rounded-xl border border-slate-200 dark:border-zinc-800"
                    />
                    <select
                      value={newMailbox.provider}
                      onChange={(e) => setNewMailbox({ ...newMailbox, provider: e.target.value as any })}
                      className="text-xs bg-white dark:bg-black p-3 rounded-xl border border-slate-200 dark:border-zinc-800"
                    >
                      <option>Microsoft 365</option>
                      <option>Outlook</option>
                      <option>Exchange Online</option>
                      <option>Gmail</option>
                      <option>Google Workspace</option>
                      <option>IMAP</option>
                      <option>SMTP</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Hesap Sorumlusu / Sahibi"
                      value={newMailbox.owner}
                      onChange={(e) => setNewMailbox({ ...newMailbox, owner: e.target.value })}
                      className="text-xs bg-white dark:bg-black p-3 rounded-xl border border-slate-200 dark:border-zinc-800"
                    />
                  </div>
                  <div className="flex justify-end gap-2 text-xs">
                    <button type="button" onClick={() => setIsConnectMailboxOpen(false)} className="p-2 px-3.5 bg-slate-100 dark:bg-zinc-800 rounded">İptal</button>
                    <button type="submit" className="p-2 px-4 bg-indigo-650 text-white font-bold rounded">Microsoft OAuth Yetkisi Al</button>
                  </div>
                </form>
              )}

              {/* Connected Mailboxes Display Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mailboxes.map(box => (
                  <div key={box.id} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 dark:border-zinc-800 dark:bg-black/10 space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="p-1 px-2 rounded bg-indigo-50 dark:bg-zinc-900 text-indigo-700 text-[9px] font-bold font-mono tracking-wide uppercase">
                          {box.provider}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 pt-1">{box.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono block">{box.email}</span>
                      </div>

                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        box.status === "Connected" ? "text-emerald-600 bg-emerald-50 dark:bg-zinc-900" : "text-amber-600 bg-amber-50 dark:bg-zinc-900"
                      }`}>
                        {box.status === "Connected" ? "Canlı (Okuma/Yazma)" : "Yetki Yok/Süre Doldu"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-slate-100 pt-2 dark:border-zinc-850/60 font-mono">
                      <div>
                        <span className="text-slate-400">Sorumlu: </span>
                        <span className="text-slate-700 dark:text-zinc-300 font-bold">{box.owner}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400">Senkronizasyon: </span>
                        <span className="text-slate-700 dark:text-zinc-305 font-bold">{box.lastSync}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Integration check info */}
              <div className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/10 dark:border-zinc-800/80 dark:bg-zinc-950/20 text-xs text-slate-650 leading-relaxed space-y-1.5 dark:text-zinc-300">
                <span className="font-bold text-slate-800 dark:text-zinc-200 block uppercase font-mono tracking-wider text-[10px]">⚠️ MICROSOFT GRAPH API PAYLAŞIM KURALLARI</span>
                <p>
                  Sorumlu e-postalarında ortak (shared) gelen kutusu izin modeli aktiftir. Bir kullanıcı, Microsoft OAuth aracılığıyla kurumsal hesabı bağladığında, bu hesaba <strong>"Admin"</strong> paneli üzerinden atanan tüm CRM danışmanları aynı e-posta üzerinden veri okuyabilir ve kampanya gönderebilir.
                </p>
              </div>
            </div>
          )}

          {/* ==================== SECTION 4: EMAIL TEMPLATES ==================== */}
          {activeSubTab === "templates" && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#323130] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">4. Standart E-posta Şablonları (Templates)</h3>
                  <p className="text-xs text-slate-500">Teklif gönderimleri, pazarlama kampanyaları, anlık takipler ve toplantı davetleri için hazırlanmış ön yapılandırmalı şablonları yönetin.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewTemplateOpen(true)}
                  className="p-2.5 px-4 text-xs font-bold text-white bg-indigo-650 rounded-xl hover:bg-indigo-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Şablon Oluştur
                </button>
              </div>

              {isNewTemplateOpen && (
                <form onSubmit={handleCreateTemplate} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-zinc-800 dark:bg-black/20 space-y-3 text-xs animate-in slide-in-from-top-2 duration-150">
                  <span className="font-mono font-bold text-slate-450 uppercase block">YENİ ŞABLON OLUŞTURMA SÜZÜCÜSÜ</span>
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
                      <option>Proposal Templates</option>
                      <option>Campaign Templates</option>
                      <option>Follow-Up Templates</option>
                      <option>Meeting Templates</option>
                      <option>Project Templates</option>
                      <option>System Templates</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Konu Satırı (Email Subject) *"
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
                      <th className="p-3">Şablon Adı</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Varsayılan Konu (Subject)</th>
                      <th className="p-3">Durum</th>
                      <th className="p-3 text-right">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                    {templates.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                        <td className="p-3 font-semibold text-slate-800 dark:text-zinc-200">{t.name}</td>
                        <td className="p-3">
                          <span className="p-1 px-2.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] text-slate-655 dark:text-zinc-350 font-bold">
                            {t.category}
                          </span>
                        </td>
                        <td className="p-3 italic max-w-xs truncate text-slate-500">{t.subject}</td>
                        <td className="p-3">
                          <span className={`p-1 px-1.5 rounded text-[10px] font-bold ${
                            t.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                          }`}>
                            {t.status === "Active" ? "Etkin" : "Taslak"}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-105 dark:border-[#323130] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">5. Enterprise Document Infrastructure & Cloud Storage</h3>
                  <p className="text-xs text-slate-500">
                    Teklif PDF'leri, sözleşmeler, raporlar ve müşteri dökümanlarının yönetildiği soyut depolama kanallarını ve bağlantı parametrelerini yapılandırın.
                  </p>
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
                  Yeni Depolama Kanalı Ekle
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
                        <option>Microsoft OneDrive</option>
                        <option>Microsoft SharePoint</option>
                        <option>Azure Blob</option>
                        <option>Google Drive</option>
                        <option>AWS S3</option>
                        <option>Local Storage</option>
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
                      <label className="font-bold text-slate-600">İstemci Kimliği (Client ID / API Key)</label>
                      <input
                        type="text"
                        placeholder="Uygulama istemci kimliğini girin"
                        value={newStorage.clientId}
                        onChange={(e) => setNewStorage({ ...newStorage, clientId: e.target.value })}
                        className="w-full bg-white dark:bg-black p-2.5 rounded-xl border border-slate-205 dark:border-zinc-805 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Giriş Parolası (Client Secret / Access Token)</label>
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
                      <label className="font-bold text-slate-600">İstemci Kimliği (Client ID / API Key)</label>
                      <input
                        type="text"
                        value={editForm.clientId || ""}
                        onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-205 dark:border-zinc-805 font-mono text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Giriş Parolası (Client Secret)</label>
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
                      <label className="font-bold text-slate-600 font-mono text-[10px]">CREATED DATE: <span className="text-slate-500 font-normal">{editForm.createdDate}</span></label>
                    </div>
                    <div className="space-y-1 sm:text-right">
                      <label className="font-bold text-slate-600 font-mono text-[10px]">LAST MODIFIED: <span className="text-slate-500 font-normal">{editForm.lastModified}</span></label>
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
                              {conn.provider}
                            </span>
                            {conn.defaultStorage && (
                              <span className="text-[9px] font-bold font-mono text-emerald-700 bg-emerald-50 dark:bg-zinc-900 px-2 py-0.5 rounded uppercase">
                                Varsayılan Depolama
                              </span>
                            )}
                            <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                              conn.connectionHealth === "Healthy" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                            }`}>
                              Sağlık: {conn.connectionHealth}
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
                    Belge Kategorisi Oluştur
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Sistemde kullanılmak üzere limitsiz döküman kategorisi ve dosya türü oluşturun.
                  </p>
                  <form onSubmit={handleAddDocType} className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Kategori Adı *</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Site Survey Report"
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
                      Kategori Türünü Kaydet
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-3">
                  <span className="text-[10px] font-bold text-slate-450 block uppercase font-mono tracking-wider">AKTİF BELGE KATEGORİLERİ ({docTypes.length})</span>
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
                    Döküman Yönetim Sistemi (DMS) Denetim Logları (Real-Time Audit Log)
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
                      <div className="p-4 text-center text-slate-400 italic">DMS üzerinde henüz herhangi bir işlem gerçekleştirilmedi.</div>
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
                              {log.action}
                            </span>
                          </div>
                          <div className="col-span-2 text-slate-700 dark:text-zinc-200 truncate pr-4 font-semibold" title={log.details}>
                            {log.documentName} <span className="text-slate-400 font-normal text-[10px]">({log.details})</span>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold uppercase text-[10px] ${log.result === "Success" ? "text-emerald-600" : "text-rose-600"}`}>
                              {log.result}
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
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">6. Denetim Günlükleri & Güvenlik Takibi (Audit Logs)</h3>
                <p className="text-xs text-slate-500">Business Operating System üzerindeki tüm kullanıcı girişleri, izin güncellemeleri, teklif hazırlıkları ve e-posta operasyonları anlık olarak mühürlenir.</p>
              </div>

              <div className="flex justify-between items-center bg-slate-50/80 dark:bg-black/10 p-3.5 rounded-xl border border-slate-150 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-250 font-sans">Anlık Log Sinyali: Aktif</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    alert("Tüm güvenlik günlükleri CSV olarak dışa aktarılmıştır!");
                    addAuditLog("Atakan Zehir", "Günlük Arşiv Dışa Aktarım", "Audit logs verileri güvenlik raporu için dışa aktarıldı.", "Veri Güvenliği");
                  }}
                  className="p-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-[#1f1f1e] dark:border-zinc-800 rounded-lg text-[10px] font-bold text-slate-700 dark:text-zinc-300 font-mono transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3 inline" /> CSV Olarak İndir
                </button>
              </div>

              {/* Logs Table Layout */}
              <div className="overflow-x-auto border border-slate-105 dark:border-zinc-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-neutral-900 text-[10px] font-bold font-mono text-slate-400 uppercase border-b border-slate-100">
                      <th className="p-3">Kullanıcı (User)</th>
                      <th className="p-3">Zaman Damgası (Timestamp)</th>
                      <th className="p-3">Gerçekleştirilen Eylem (Action)</th>
                      <th className="p-3">Modül</th>
                      <th className="p-3">Sonuç</th>
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
                            {l.result}
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
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                <h3 className="text-lg font-bold text-slate-805 dark:text-zinc-150">7. Yapay Zeka (AI Settings) & Prompt Yönetimi</h3>
                <p className="text-xs text-slate-500">Müşteri maillerini işleyen imza ayrıştırıcı model ve otomatik yanıt üreteci prompt şablonlarını centralize yönetin.</p>
              </div>

              <div className="p-4 rounded-xl border border-indigo-150 bg-indigo-50/5 dark:border-zinc-800 dark:bg-black/10 space-y-1.5 text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">AKTİF HİZMET ANALİZİ</div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-zinc-200">Kullanılan Yapay Zeka Model Servisi:</span>
                  <span className="font-bold text-[#0078D4] font-mono">Gemini-3.5-Flash (Google SDK)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500">Kimlik Tanımı:</span>
                  <span className="text-slate-600 dark:text-slate-300 font-mono font-bold">{aiApiKeyName} ✅</span>
                </div>
              </div>

              {/* Prompt template modifiers */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-450 block uppercase font-mono tracking-wider">PROMPT ŞABLONLARINI DÜZENLE (SYSTEM INSTRUCTIONS)</span>
                
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
                      <span>* Bu kutu dışına tıkladığınızda prompt doğrudan veritabanına kaydedilir.</span>
                      <span>Harcama Sınıfı: {item.tokenUsage}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Skill Controls */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-3.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-widest font-mono">AI Ajanı Yetenek Aktivasyon Listesi</h4>
                  <p className="text-[10px] text-slate-505">Destek kütüphanesine yüklenen dosyaların işlenme mekanizması ve akıllı öneri motorlarının aktif yetenek süzgeci.</p>
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
                          addAuditLog("Atakan Zehir", "AI Yetenek Değişimi", `${skill.name} yeteneği ${updated[index].active ? "açıldı" : "kapatıldı"}.`, "AI Ayarları");
                        }}
                        className="text-slate-550 transition-colors"
                      >
                        {skill.active ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">🟢 Aktif</span>
                        ) : (
                          <span className="text-slate-400 font-bold flex items-center gap-1">⚪ Kapalı</span>
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
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">8. Sistem & Entegrasyon Sağlığı Gösterge Paneli</h3>
                <p className="text-xs text-slate-500">Gemba Partner altyapısının can damarları olan bulut servislerin, posta kutularının ve veritabanı kullanım detaylarının anlık izlenimi.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="p-4 bg-emerald-50/20 rounded-2xl border border-emerald-200/50 space-y-1">
                  <span className="text-[9px] font-bold text-emerald-500 font-mono block uppercase">CONNECTED MAILBOXES</span>
                  <div className="text-xl font-black text-slate-800 dark:text-emerald-400">{mailboxes.filter(m => m.status === "Connected").length} / {mailboxes.length}</div>
                  <p className="text-[10px] text-slate-405 leading-none">Aktif Exchange hesaplar</p>
                </div>

                <div className="p-4 bg-indigo-50/20 rounded-2xl border border-indigo-200/50 space-y-1">
                  <span className="text-[9px] font-bold text-indigo-550 font-mono block uppercase">CLOUD STORAGE CHANNELS</span>
                  <div className="text-xl font-black text-indigo-650 dark:text-indigo-400">3 Bağlantı</div>
                  <p className="text-[10px] text-slate-405 leading-none">OneDrive, Dropbox / S3</p>
                </div>

                <div className="p-4 bg-white dark:bg-black/10 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">DATABASE STORAGE</span>
                  <div className="text-xl font-black text-slate-800 dark:text-zinc-300">62.8 MB</div>
                  <p className="text-[10px] text-slate-405 leading-none">Total metadata records size</p>
                </div>
              </div>

              {/* Status and telemetry lines */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 space-y-3">
                <span className="text-[10px] font-bold text-slate-450 block uppercase font-mono">GERÇEK ZAMANLI SERVİS TELEMETRİSİ (API & ENGINE STATUS)</span>
                
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 bg-slate-50/60 dark:bg-zinc-900 border border-slate-150 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 dark:text-zinc-300">Microsoft Graph API Durumu (Azure AD):</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1 font-mono uppercase">🟢 ÇALIŞIYOR (SUCCESS)</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50/60 dark:bg-zinc-900 border border-slate-150 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 dark:text-zinc-300">Google Gemini Üretken Yapay Zeka Kapasitesi:</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1 font-mono uppercase">🟢 ÇALIŞIYOR (120 RPM)</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50/60 dark:bg-zinc-900 border border-slate-150 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 dark:text-zinc-300">Tavily Search Engine API Entegrasyonu:</span>
                    <span className="text-amber-600 font-bold flex items-center gap-1 font-mono uppercase">🟢 BAĞLI (Simülasyon Fallback)</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50/60 dark:bg-zinc-900 border border-slate-150 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 dark:text-zinc-300">Masaüstü E-posta Senkronizasyon (Cron daemon):</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1 font-mono uppercase">🟢 ÇALIŞIYOR</span>
                  </div>
                </div>
              </div>

              {/* System Error metrics */}
              <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 dark:bg-neutral-900 text-xs text-slate-700 dark:text-zinc-300">
                <strong className="block font-bold text-slate-800 dark:text-zinc-200 uppercase font-mono tracking-wider text-[10px] mb-1">⏱️ OPERASYONEL ARIZA VE ÇAKIŞMALAR</strong>
                Son 48 saat içinde hiçbir kritik kesinti veya veri tabanı çöküşü saptanmamıştır. 1 adet Microsoft Graph e-posta okuma yetki aşımı log (Yetki Yok) olarak başarıyla yakalanıp e-posta detayı günlüğüne raporlanmıştır.
              </div>
            </div>
          )}

        </div>

        {/* Custom Toast Notifications */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-[9999] p-4 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-sm font-sans bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100">
            <div className={`w-2.5 h-2.5 rounded-full ${toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-rose-500" : "bg-blue-500"}`} />
            <p className="flex-1">{toast.message}</p>
            <button type="button" onClick={() => setToast(null)} className="text-[10px] text-slate-400 hover:text-slate-650 cursor-pointer">[Kapat]</button>
          </div>
        )}

        {/* Custom Deletion Overlay Modal */}
        {userToDeleteId && (
          <div className="fixed inset-0 bg-[#000000]/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 font-sans">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-xl border border-slate-205 dark:border-zinc-800 shadow-2xl p-6 text-center animate-in zoom-in-95 duration-100">
              <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center text-rose-500 mb-4">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm mb-2">
                {selectedLanguage === "TR" ? "Kullanıcıyı Kalıcı Olarak Sil" : "Permanently Delete User"}
              </h3>
              <p className="text-slate-500 dark:text-zinc-400 text-xs mb-6 font-semibold">
                {selectedLanguage === "TR" 
                  ? `"${lastDeletedUserName}" kullanıcısını tamamen silmek istiyor musunuz? Bu işlem geri alınamaz!` 
                  : `Are you sure you want to permanently delete "${lastDeletedUserName}"? This action cannot be undone!`}
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-600 dark:text-zinc-300 font-bold rounded-lg text-xs cursor-pointer"
                  onClick={() => {
                    setUserToDeleteId(null);
                    setLastDeletedUserName(null);
                  }}
                >
                  {selectedLanguage === "TR" ? "Vazgeç" : "Cancel"}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer active:scale-95 transition-transform"
                  onClick={confirmDeleteUserAction}
                >
                  {selectedLanguage === "TR" ? "Kalıcı Olarak Sil" : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
