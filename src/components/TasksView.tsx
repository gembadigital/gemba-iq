import React, { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { 
  CheckSquare, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Calendar, 
  User, 
  ChevronDown, 
  Kanban, 
  List, 
  X, 
  Search, 
  Sliders, 
  TrendingUp, 
  Edit3, 
  FolderPlus, 
  UserCheck, 
  Tag, 
  FolderIcon,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  ChevronRight,
  Sparkles,
  Bell,
  Mail,
  Settings,
  Send,
  ExternalLink,
  Inbox,
  CheckCheck,
  AlertTriangle,
  ShieldAlert,
  FileCode,
  LayoutDashboard,
  RefreshCw
} from "lucide-react";

export interface TaskColumn {
  id: string;
  title: string;
  isCollapsed?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string; // column id
  assignee: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
}

export interface TaskNotification {
  id: string;
  taskId: string;
  taskTitle: string;
  type: "due_soon" | "overdue" | "escalation" | "daily_summary";
  recipientName: string;
  recipientRole: string;
  recipientEmail: string;
  subject: string;
  bodyHtml: string;
  createdAt: string;
  isRead: boolean;
  status: "sent" | "failed";
  triggerKey: string; // to avoid duplicate notifications
}

export interface NotificationSettings {
  reminderIntervals: {
    twoDaysBefore: boolean;
    sameDay: boolean;
  };
  overdueIntervals: {
    detectOverdue: boolean;
    day3: boolean;
    day7: boolean;
    every7Days: boolean;
  };
  escalationRules: {
    day1Enabled: boolean;
    day1Recipient: string;
    day1Role: string;
    day3Enabled: boolean;
    day3Recipient: string;
    day3Role: string;
    day7Enabled: boolean;
    day7Recipient: string;
    day7Role: string;
    day14Enabled: boolean;
    day14Recipient: string;
    day14Role: string;
  };
  emailTemplates: {
    dueSoonSubject: string;
    dueSoonTemplate: string;
    overdueSubject: string;
    overdueTemplate: string;
    escalationSubject: string;
    escalationTemplate: string;
    logoUrl: string;
    companyName: string;
  };
  dailySummarySchedule: string;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  reminderIntervals: {
    twoDaysBefore: true,
    sameDay: true,
  },
  overdueIntervals: {
    detectOverdue: true,
    day3: true,
    day7: true,
    every7Days: true,
  },
  escalationRules: {
    day1Enabled: true,
    day1Recipient: "Ahmet Yılmaz (Görev Sahibi)",
    day1Role: "Task Owner",
    day3Enabled: true,
    day3Recipient: "Murat Güven (Takım Lideri)",
    day3Role: "Team Leader",
    day7Enabled: true,
    day7Recipient: "Selin Şen (Departman Müdürü)",
    day7Role: "Department Manager",
    day14Enabled: true,
    day14Recipient: "Can Özkan (Genel Müdür)",
    day14Role: "Executive Manager",
  },
  emailTemplates: {
    dueSoonSubject: "Hatırlatma: '{{taskTitle}}' Görevinin Bitiş Tarihi Yaklaşıyor!",
    dueSoonTemplate: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #E1DFDD; border-radius: 8px; background-color: #ffffff; color: #323130;">
  <div style="text-align: center; margin-bottom: 25px; border-bottom: 3px solid #0078D4; padding-bottom: 15px;">
    <img src="{{logoUrl}}" alt="{{companyName}} Logo" style="max-height: 48px; margin-bottom: 10px; display: inline-block;" onerror="this.style.opacity='0';" />
    <h2 style="color: #0078D4; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">{{companyName}} Görev Takibi</h2>
  </div>
  
  <p style="font-size: 14px; line-height: 1.6; color: #201f1e;">Sayın <strong>{{recipientName}}</strong>,</p>
  <p style="font-size: 14px; line-height: 1.6; color: #201f1e;">Sorumluluğunuzda yer alan <strong>"{{taskTitle}}"</strong> görevinin teslim tarihi yaklaşmaktadır. Lütfen planlanan zamanlamaya uymak için detayları gözden geçirin.</p>
  
  <div style="background-color: #FAF9F8; border-left: 4px solid #0078D4; padding: 16px; margin: 20px 0; border-radius: 4px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.8;">
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold; width: 120px;">Görev Adı:</td>
        <td style="padding: 6px 0; color: #201f1e; font-weight: 600;">{{taskTitle}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold;">Son Teslim:</td>
        <td style="padding: 6px 0; color: #a80000; font-weight: bold;">{{dueDate}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold;">Sorumlu:</td>
        <td style="padding: 6px 0; color: #201f1e;">{{assignee}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold;">Öncelik:</td>
        <td style="padding: 6px 0; color: #201f1e;"><span style="background-color: #FDE7E9; color: #A80000; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; text-transform: uppercase;">{{priority}}</span></td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0 20px;">
    <a href="{{taskLink}}" style="background-color: #0078D4; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 6px rgba(0,120,212,0.15);">Sistem Paneline Git</a>
  </div>
  
  <p style="font-size: 11px; color: #8A8886; text-align: center; margin-top: 40px; border-top: 1px solid #EDEBE9; padding-top: 15px;">
    Bu e-posta {{companyName}} CRM Otomasyon Motoru tarafından otomatik olarak üretilmiştir. © 2026. Tüm hakları saklıdır.
  </p>
</div>`,

    overdueSubject: "KRİTİK UYARI: '{{taskTitle}}' Görevinin Teslim Süresi Gecikti!",
    overdueTemplate: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #FDE7E9; border-radius: 8px; background-color: #ffffff; color: #323130;">
  <div style="text-align: center; margin-bottom: 25px; border-bottom: 3px solid #A80000; padding-bottom: 15px;">
    <img src="{{logoUrl}}" alt="{{companyName}} Logo" style="max-height: 48px; margin-bottom: 10px; display: inline-block;" onerror="this.style.opacity='0';" />
    <h2 style="color: #A80000; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">⚠️ Gecikmiş Görevi Bildirimi</h2>
  </div>
  
  <p style="font-size: 14px; line-height: 1.6; color: #201f1e;">Sayın <strong>{{recipientName}}</strong>,</p>
  <p style="font-size: 14px; line-height: 1.6; color: #a80000; font-weight: bold;">Dikkat! Sorumluluğunuzda yer alan görev, hedeflenen bitiş tarihinden itibaren tam {{overdueDays}} gün aşılmıştır!</p>
  <p style="font-size: 14px; line-height: 1.6; color: #201f1e;">CRM süreçlerinin aksamaması ve müşteri memnuniyeti kaybı önlenmesi amacı ile bu görevin ivedilikle sonuçlandırılması gerekmektedir.</p>
  
  <div style="background-color: #FDF6F6; border-left: 4px solid #A80000; padding: 16px; margin: 20px 0; border-radius: 4px; box-shadow: inset 0 1px 3px rgba(168,0,0,0.02);">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.8;">
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold; width: 120px;">Görev Adı:</td>
        <td style="padding: 6px 0; color: #201f1e; font-weight: 600;">{{taskTitle}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold;">Planlanan Tarih:</td>
        <td style="padding: 6px 0; color: #201f1e;">{{dueDate}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold;">Gecikme Süresi:</td>
        <td style="padding: 6px 0; color: #A80000; font-weight: 800; font-size: 14px;">{{overdueDays}} GÜN GECİKTİ</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold;">Sorumlu:</td>
        <td style="padding: 6px 0; color: #201f1e;">{{assignee}}</td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0 20px;">
    <a href="{{taskLink}}" style="background-color: #A80000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 4px 6px rgba(168,0,0,0.15);">Görevi Güncelle / Tamamla</a>
  </div>
  
  <p style="font-size: 11px; color: #8A8886; text-align: center; margin-top: 40px; border-top: 1px solid #EDEBE9; padding-top: 15px;">
    Bu e-posta {{companyName}} CRM Otomasyon Motoru tarafından otomatik olarak üretilmiştir. © 2026. Tüm hakları saklıdır.
  </p>
</div>`,

    escalationSubject: "ESKALASYON UYARISI: '{{taskTitle}}' Görevi Teslim Tarihi Gecikti! (Seviye: {{escalationLevel}})",
    escalationTemplate: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #8E24AA; border-radius: 8px; background-color: #ffffff; color: #323130;">
  <div style="text-align: center; margin-bottom: 25px; border-bottom: 3px solid #8E24AA; padding-bottom: 15px;">
    <img src="{{logoUrl}}" alt="{{companyName}} Logo" style="max-height: 48px; margin-bottom: 10px; display: inline-block;" onerror="this.style.opacity='0';" />
    <h2 style="color: #8E24AA; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">⚠️ Otomatik Eskalasyon Protokolü</h2>
  </div>
  
  <p style="font-size: 14px; line-height: 1.6; color: #201f1e;">Sayın <strong>{{recipientName}}</strong>,</p>
  <p style="font-size: 14px; line-height: 1.6; color: #201f1e;">Gecikme süresi kritik limite ulaşmış bir görev hakkında eskalasyon kuralları uyarınca yönetim bilgilendirilmiştir.</p>
  <p style="font-size: 14px; line-height: 1.6; color: #8E24AA; font-weight: bold;">Gecikme politikasına göre: Seviye {{escalationLevel}} eskalasyon uygulanmaktadır.</p>
  
  <div style="background-color: #FAF5FC; border-left: 4px solid #8E24AA; padding: 16px; margin: 20px 0; border-radius: 4px; box-shadow: inset 0 1px 3px rgba(142,36,170,0.02);">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.8;">
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold; width: 120px;">Görev Adı:</td>
        <td style="padding: 6px 0; color: #201f1e; font-weight: 600;">{{taskTitle}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold;">Atanan Sahibi:</td>
        <td style="padding: 6px 0; color: #201f1e; font-weight: 600;">{{assignee}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold;">Bitiş Tarihi:</td>
        <td style="padding: 6px 0; color: #201f1e;">{{dueDate}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold;">Toplam Gecikme:</td>
        <td style="padding: 6px 0; color: #8E24AA; font-weight: bold;">{{overdueDays}} Gün Aşımı</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #605e5c; font-weight: bold;">Eskale Edilen Rol:</td>
        <td style="padding: 6px 0; color: #8E24AA; font-weight: bold; font-size: 13px;">{{recipientRole}}</td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0 20px;">
    <a href="{{taskLink}}" style="background-color: #8E24AA; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 4px 6px rgba(142,36,170,0.15);">Görevi CRM Sisteminde İncele</a>
  </div>
  
  <p style="font-size: 11px; color: #8a8886; text-align: center; margin-top: 40px; border-top: 1px solid #EDEBE9; padding-top: 15px;">
    Bu e-posta {{companyName}} CRM Otomasyon Motoru tarafından otomatik olarak üretilmiştir. © 2026. Tüm hakları saklıdır.
  </p>
</div>`,
    logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    companyName: "GEMBA GROUP CRM",
  },
  dailySummarySchedule: "09:00",
};

const DEFAULT_CRM_USERS = [
  "Ahmet Yılmaz",
  "GP",
  "Elif Demir",
  "Can Özkan",
  "Zeynep Kaya"
];

const DEFAULT_COLUMNS: TaskColumn[] = [
  { id: "not_started", title: "Not Started" },
  { id: "in_progress", title: "In Progress" },
  { id: "on_hold", title: "On Hold" },
  { id: "completed", title: "Completed" },
];

const DEFAULT_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Müşteri Teklifini Hazırla",
    description: "Acme Corp için revize edilmiş ürün teklifini ve maliyet projeksiyonunu tamamla.",
    status: "not_started",
    assignee: "GP",
    dueDate: "2026-06-25",
    priority: "High"
  },
  {
    id: "task-2",
    title: "Gemba Demo Sunumu",
    description: "Yeni leads grubu için verimlilik ve süreç optimizasyonu demo sunumunu gerçekleştir.",
    status: "in_progress",
    assignee: "Ahmet Yılmaz",
    dueDate: "2026-06-20",
    priority: "Medium"
  },
  {
    id: "task-3",
    title: "Sözleşme Revizyonu",
    description: "Hukuk departmanının ilettiği revizelerin sözleşmeye uygulanması ve müşteri onayının beklenmesi.",
    status: "on_hold",
    assignee: "Elif Demir",
    dueDate: "2026-06-30",
    priority: "Low"
  },
  {
    id: "task-4",
    title: "E-posta Kampanyası Analizi",
    description: "Haziran ayı e-posta gönderimlerinin açılma ve dönüşüm oranlarının toplanarak Excel tablosuna aktarılması.",
    status: "completed",
    assignee: "Can Özkan",
    dueDate: "2026-06-18",
    priority: "High"
  }
];

export default function TasksView() {
  const { lang, t } = useLanguage();
  // --- STATE PERSISTENCE ---
  const [columns, setColumns] = useState<TaskColumn[]>(() => {
    const saved = localStorage.getItem("crm_task_columns");
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("crm_tasks");
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });

  const [crmUsers, setCrmUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem("crm_users");
    return saved ? JSON.parse(saved) : DEFAULT_CRM_USERS;
  });

  const [activeView, setActiveView] = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("All");

  // Custom stylish delete confirmation state
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
    title?: string;
    message?: string;
  }>({ isOpen: false, onConfirm: () => {} });

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false);
  const [newAssigneeNameInput, setNewAssigneeNameInput] = useState("");

  // Save changes
  useEffect(() => {
    localStorage.setItem("crm_task_columns", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem("crm_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("crm_users", JSON.stringify(crmUsers));
  }, [crmUsers]);

  // --- COLUMN MENUS STATE ---
  const [activeColumnMenu, setActiveColumnMenu] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");

  // --- MODALS FOR ADD & EDIT TASK ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTaskColumnId, setAddTaskColumnId] = useState<string>("not_started");
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDueDate, setNewDueDate] = useState("2026-06-25");
  const [newPriority, setNewPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [newStatus, setNewStatus] = useState("not_started");

  // --- AUTOMATED NOTIFICATION & ESCALATION ENGINE ---
  const [activeMainTab, setActiveMainTab] = useState<"board" | "notifications" | "settings">("board");
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem("crm_notification_settings");
    return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATION_SETTINGS;
  });

  const [notifications, setNotifications] = useState<TaskNotification[]>(() => {
    const saved = localStorage.getItem("crm_task_notifications");
    return saved ? JSON.parse(saved) : [];
  });

  const [simulatedDate, setSimulatedDate] = useState<string>("2026-06-20");
  const [isSimulatedDateActive, setIsSimulatedDateActive] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [activeNotificationItem, setActiveNotificationItem] = useState<TaskNotification | null>(null);
  const [notificationTypeFilter, setNotificationTypeFilter] = useState<string>("All");

  const [settingsActiveTab, setSettingsActiveTab] = useState<"general" | "templates" | "escalation">("general");

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const getEffectiveToday = () => {
    if (isSimulatedDateActive) {
      return simulatedDate;
    }
    return new Date().toISOString().split("T")[0];
  };

  const countDaysDiff = (date1Str: string, date2Str: string): number => {
    const d1 = new Date(date1Str);
    const d2 = new Date(date2Str);
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);
    const diffTime = d1.getTime() - d2.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const compileEmailTemplate = (templateHtml: string, variables: { [key: string]: any }) => {
    let result = templateHtml;
    Object.keys(variables).forEach(key => {
      const rx = new RegExp(`{{${key}}}`, "g");
      result = result.replace(rx, String(variables[key]));
    });
    return result;
  };

  const runNotificationEngine = (manual = false) => {
    const today = getEffectiveToday();
    const newAlerts: TaskNotification[] = [];
    let detectedCount = 0;

    tasks.forEach(task => {
      if (task.status === "completed") return;

      const diffDays = countDaysDiff(task.dueDate, today);

      // 1. Due soon reminders
      if (diffDays >= 0) {
        if (diffDays === 2 && notificationSettings.reminderIntervals.twoDaysBefore) {
          const triggerKey = `${task.id}-due_soon-2`;
          const alreadyTriggered = notifications.some(n => n.triggerKey === triggerKey) || newAlerts.some(n => n.triggerKey === triggerKey);
          if (!alreadyTriggered) {
            const compiledSubject = notificationSettings.emailTemplates.dueSoonSubject
              .replace(/{{taskTitle}}/g, task.title);

            const variables = {
              recipientName: task.assignee || "Sorumlu Kişi",
              recipientRole: "Task Owner",
              taskTitle: task.title,
              dueDate: task.dueDate,
              assignee: task.assignee || "Atanmamış",
              priority: task.priority,
              companyName: notificationSettings.emailTemplates.companyName,
              logoUrl: notificationSettings.emailTemplates.logoUrl,
              taskLink: `${window.location.origin}/#tasks/${task.id}`
            };

            const compiledBody = compileEmailTemplate(notificationSettings.emailTemplates.dueSoonTemplate, variables);

            newAlerts.push({
              id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              taskId: task.id,
              taskTitle: task.title,
              type: "due_soon",
              recipientName: task.assignee || "Sorumlu Kişi",
              recipientRole: "Task Owner",
              recipientEmail: `${String(task.assignee || "user").toLowerCase().replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}@sirket.com`,
              subject: compiledSubject,
              bodyHtml: compiledBody,
              createdAt: `${today} 09:00`,
              isRead: false,
              status: "sent",
              triggerKey
            });
            detectedCount++;
          }
        } else if (diffDays === 0 && notificationSettings.reminderIntervals.sameDay) {
          const triggerKey = `${task.id}-due_soon-0`;
          const alreadyTriggered = notifications.some(n => n.triggerKey === triggerKey) || newAlerts.some(n => n.triggerKey === triggerKey);
          if (!alreadyTriggered) {
            const compiledSubject = notificationSettings.emailTemplates.dueSoonSubject
              .replace(/{{taskTitle}}/g, task.title);

            const variables = {
              recipientName: task.assignee || "Sorumlu Kişi",
              recipientRole: "Task Owner",
              taskTitle: task.title,
              dueDate: task.dueDate,
              assignee: task.assignee || "Atanmamış",
              priority: task.priority,
              companyName: notificationSettings.emailTemplates.companyName,
              logoUrl: notificationSettings.emailTemplates.logoUrl,
              taskLink: `${window.location.origin}/#tasks/${task.id}`
            };

            const compiledBody = compileEmailTemplate(notificationSettings.emailTemplates.dueSoonTemplate, variables);

            newAlerts.push({
              id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              taskId: task.id,
              taskTitle: task.title,
              type: "due_soon",
              recipientName: task.assignee || "Sorumlu Kişi",
              recipientRole: "Task Owner",
              recipientEmail: `${String(task.assignee || "user").toLowerCase().replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}@sirket.com`,
              subject: compiledSubject,
              bodyHtml: compiledBody,
              createdAt: `${today} 09:00`,
              isRead: false,
              status: "sent",
              triggerKey
            });
            detectedCount++;
          }
        }
      }

      // 2. Overdue & Escalation
      if (diffDays < 0) {
        const overdueDays = -diffDays;

        if (overdueDays === 1) {
          if (notificationSettings.overdueIntervals.detectOverdue) {
            const triggerKey = `${task.id}-overdue-1`;
            const alreadyTriggered = notifications.some(n => n.triggerKey === triggerKey) || newAlerts.some(n => n.triggerKey === triggerKey);
            if (!alreadyTriggered) {
              const compiledSubject = notificationSettings.emailTemplates.overdueSubject
                .replace(/{{taskTitle}}/g, task.title);

              const variables = {
                recipientName: task.assignee || "Sorumlu Kişi",
                recipientRole: "Task Owner",
                taskTitle: task.title,
                dueDate: task.dueDate,
                overdueDays: 1,
                assignee: task.assignee || "Atanmamış",
                companyName: notificationSettings.emailTemplates.companyName,
                logoUrl: notificationSettings.emailTemplates.logoUrl,
                taskLink: `${window.location.origin}/#tasks/${task.id}`
              };

              const compiledBody = compileEmailTemplate(notificationSettings.emailTemplates.overdueTemplate, variables);

              newAlerts.push({
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                taskId: task.id,
                taskTitle: task.title,
                type: "overdue",
                recipientName: task.assignee || "Sorumlu Kişi",
                recipientRole: "Task Owner",
                recipientEmail: `${String(task.assignee || "user").toLowerCase().replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}@sirket.com`,
                subject: compiledSubject,
                bodyHtml: compiledBody,
                createdAt: `${today} 09:00`,
                isRead: false,
                status: "sent",
                triggerKey
              });
              detectedCount++;
            }
          }

          if (notificationSettings.escalationRules.day1Enabled) {
            const triggerKey = `${task.id}-escalation-1`;
            const alreadyTriggered = notifications.some(n => n.triggerKey === triggerKey) || newAlerts.some(n => n.triggerKey === triggerKey);
            if (!alreadyTriggered) {
              const compiledSubject = notificationSettings.emailTemplates.escalationSubject
                .replace(/{{taskTitle}}/g, task.title)
                .replace(/{{escalationLevel}}/g, "1 (Task Owner)");

              const variables = {
                recipientName: notificationSettings.escalationRules.day1Recipient || task.assignee || "Seçilen Sorumlu",
                recipientRole: notificationSettings.escalationRules.day1Role || "Task Owner",
                taskTitle: task.title,
                dueDate: task.dueDate,
                overdueDays: 1,
                assignee: task.assignee || "Atanmamış",
                escalationLevel: "Level 1 (Direct Warning)",
                companyName: notificationSettings.emailTemplates.companyName,
                logoUrl: notificationSettings.emailTemplates.logoUrl,
                taskLink: `${window.location.origin}/#tasks/${task.id}`
              };

              const compiledBody = compileEmailTemplate(notificationSettings.emailTemplates.escalationTemplate, variables);

              newAlerts.push({
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                taskId: task.id,
                taskTitle: task.title,
                type: "escalation",
                recipientName: variables.recipientName,
                recipientRole: variables.recipientRole,
                recipientEmail: "owner@company.com",
                subject: compiledSubject,
                bodyHtml: compiledBody,
                createdAt: `${today} 09:12`,
                isRead: false,
                status: "sent",
                triggerKey
              });
              detectedCount++;
            }
          }
        }

        if (overdueDays === 3) {
          if (notificationSettings.overdueIntervals.day3) {
            const triggerKey = `${task.id}-overdue-3`;
            const alreadyTriggered = notifications.some(n => n.triggerKey === triggerKey) || newAlerts.some(n => n.triggerKey === triggerKey);
            if (!alreadyTriggered) {
              const compiledSubject = notificationSettings.emailTemplates.overdueSubject
                .replace(/{{taskTitle}}/g, task.title);

              const variables = {
                recipientName: task.assignee || "Sorumlu Kişi",
                recipientRole: "Task Owner",
                taskTitle: task.title,
                dueDate: task.dueDate,
                overdueDays: 3,
                assignee: task.assignee || "Atanmamış",
                companyName: notificationSettings.emailTemplates.companyName,
                logoUrl: notificationSettings.emailTemplates.logoUrl,
                taskLink: `${window.location.origin}/#tasks/${task.id}`
              };

              const compiledBody = compileEmailTemplate(notificationSettings.emailTemplates.overdueTemplate, variables);

              newAlerts.push({
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                taskId: task.id,
                taskTitle: task.title,
                type: "overdue",
                recipientName: task.assignee || "Sorumlu Kişi",
                recipientRole: "Task Owner",
                recipientEmail: `${String(task.assignee || "user").toLowerCase().replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}@sirket.com`,
                subject: compiledSubject,
                bodyHtml: compiledBody,
                createdAt: `${today} 09:00`,
                isRead: false,
                status: "sent",
                triggerKey
              });
              detectedCount++;
            }
          }

          if (notificationSettings.escalationRules.day3Enabled) {
            const triggerKey = `${task.id}-escalation-3`;
            const alreadyTriggered = notifications.some(n => n.triggerKey === triggerKey) || newAlerts.some(n => n.triggerKey === triggerKey);
            if (!alreadyTriggered) {
              const compiledSubject = notificationSettings.emailTemplates.escalationSubject
                .replace(/{{taskTitle}}/g, task.title)
                .replace(/{{escalationLevel}}/g, "2 (Team Leader)");

              const variables = {
                recipientName: notificationSettings.escalationRules.day3Recipient || "Takım Lideri",
                recipientRole: notificationSettings.escalationRules.day3Role || "Team Leader",
                taskTitle: task.title,
                dueDate: task.dueDate,
                overdueDays: 3,
                assignee: task.assignee || "Atanmamış",
                escalationLevel: "Level 2 (Team Leader)",
                companyName: notificationSettings.emailTemplates.companyName,
                logoUrl: notificationSettings.emailTemplates.logoUrl,
                taskLink: `${window.location.origin}/#tasks/${task.id}`
              };

              const compiledBody = compileEmailTemplate(notificationSettings.emailTemplates.escalationTemplate, variables);

              newAlerts.push({
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                taskId: task.id,
                taskTitle: task.title,
                type: "escalation",
                recipientName: variables.recipientName,
                recipientRole: variables.recipientRole,
                recipientEmail: "teamlead@company.com",
                subject: compiledSubject,
                bodyHtml: compiledBody,
                createdAt: `${today} 09:12`,
                isRead: false,
                status: "sent",
                triggerKey
              });
              detectedCount++;
            }
          }
        }

        if (overdueDays === 7) {
          if (notificationSettings.overdueIntervals.day7) {
            const triggerKey = `${task.id}-overdue-7`;
            const alreadyTriggered = notifications.some(n => n.triggerKey === triggerKey) || newAlerts.some(n => n.triggerKey === triggerKey);
            if (!alreadyTriggered) {
              const compiledSubject = notificationSettings.emailTemplates.overdueSubject
                .replace(/{{taskTitle}}/g, task.title);

              const variables = {
                recipientName: task.assignee || "Sorumlu Kişi",
                recipientRole: "Task Owner",
                taskTitle: task.title,
                dueDate: task.dueDate,
                overdueDays: 7,
                assignee: task.assignee || "Atanmamış",
                companyName: notificationSettings.emailTemplates.companyName,
                logoUrl: notificationSettings.emailTemplates.logoUrl,
                taskLink: `${window.location.origin}/#tasks/${task.id}`
              };

              const compiledBody = compileEmailTemplate(notificationSettings.emailTemplates.overdueTemplate, variables);

              newAlerts.push({
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                taskId: task.id,
                taskTitle: task.title,
                type: "overdue",
                recipientName: task.assignee || "Sorumlu Kişi",
                recipientRole: "Task Owner",
                recipientEmail: `${String(task.assignee || "user").toLowerCase().replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}@sirket.com`,
                subject: compiledSubject,
                bodyHtml: compiledBody,
                createdAt: `${today} 09:00`,
                isRead: false,
                status: "sent",
                triggerKey
              });
              detectedCount++;
            }
          }

          if (notificationSettings.escalationRules.day7Enabled) {
            const triggerKey = `${task.id}-escalation-7`;
            const alreadyTriggered = notifications.some(n => n.triggerKey === triggerKey) || newAlerts.some(n => n.triggerKey === triggerKey);
            if (!alreadyTriggered) {
              const compiledSubject = notificationSettings.emailTemplates.escalationSubject
                .replace(/{{taskTitle}}/g, task.title)
                .replace(/{{escalationLevel}}/g, "3 (Dept Manager)");

              const variables = {
                recipientName: notificationSettings.escalationRules.day7Recipient || "Müdür",
                recipientRole: notificationSettings.escalationRules.day7Role || "Department Manager",
                taskTitle: task.title,
                dueDate: task.dueDate,
                overdueDays: 7,
                assignee: task.assignee || "Atanmamış",
                escalationLevel: "Level 3 (Department Manager)",
                companyName: notificationSettings.emailTemplates.companyName,
                logoUrl: notificationSettings.emailTemplates.logoUrl,
                taskLink: `${window.location.origin}/#tasks/${task.id}`
              };

              const compiledBody = compileEmailTemplate(notificationSettings.emailTemplates.escalationTemplate, variables);

              newAlerts.push({
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                taskId: task.id,
                taskTitle: task.title,
                type: "escalation",
                recipientName: variables.recipientName,
                recipientRole: variables.recipientRole,
                recipientEmail: "deptmgr@company.com",
                subject: compiledSubject,
                bodyHtml: compiledBody,
                createdAt: `${today} 09:12`,
                isRead: false,
                status: "sent",
                triggerKey
              });
              detectedCount++;
            }
          }
        }

        if (overdueDays === 14) {
          if (notificationSettings.escalationRules.day14Enabled) {
            const triggerKey = `${task.id}-escalation-14`;
            const alreadyTriggered = notifications.some(n => n.triggerKey === triggerKey) || newAlerts.some(n => n.triggerKey === triggerKey);
            if (!alreadyTriggered) {
              const compiledSubject = notificationSettings.emailTemplates.escalationSubject
                .replace(/{{taskTitle}}/g, task.title)
                .replace(/{{escalationLevel}}/g, "4 (Exec Manager)");

              const variables = {
                recipientName: notificationSettings.escalationRules.day14Recipient || "Genel Müdür",
                recipientRole: notificationSettings.escalationRules.day14Role || "Executive Manager",
                taskTitle: task.title,
                dueDate: task.dueDate,
                overdueDays: 14,
                assignee: task.assignee || "Atanmamış",
                escalationLevel: "Level 4 (Executive Management Intervention)",
                companyName: notificationSettings.emailTemplates.companyName,
                logoUrl: notificationSettings.emailTemplates.logoUrl,
                taskLink: `${window.location.origin}/#tasks/${task.id}`
              };

              const compiledBody = compileEmailTemplate(notificationSettings.emailTemplates.escalationTemplate, variables);

              newAlerts.push({
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                taskId: task.id,
                taskTitle: task.title,
                type: "escalation",
                recipientName: variables.recipientName,
                recipientRole: variables.recipientRole,
                recipientEmail: "exec@company.com",
                subject: compiledSubject,
                bodyHtml: compiledBody,
                createdAt: `${today} 09:12`,
                isRead: false,
                status: "sent",
                triggerKey
              });
              detectedCount++;
            }
          }
        }

        if (overdueDays > 7 && (overdueDays - 7) % 7 === 0 && notificationSettings.overdueIntervals.every7Days) {
          const triggerKey = `${task.id}-overdue-repeat-${overdueDays}`;
          const alreadyTriggered = notifications.some(n => n.triggerKey === triggerKey) || newAlerts.some(n => n.triggerKey === triggerKey);
          if (!alreadyTriggered) {
            const compiledSubject = `[Tekrarlı Gecikme Uyarı] Gecikme Devam Ediyor: '${task.title}' (${overdueDays} gün)`;

            const variables = {
              recipientName: task.assignee || "Sorumlu Kişi",
              recipientRole: "Task Owner",
              taskTitle: task.title,
              dueDate: task.dueDate,
              overdueDays: overdueDays,
              assignee: task.assignee || "Atanmamış",
              companyName: notificationSettings.emailTemplates.companyName,
              logoUrl: notificationSettings.emailTemplates.logoUrl,
              taskLink: `${window.location.origin}/#tasks/${task.id}`
            };

            const compiledBody = compileEmailTemplate(notificationSettings.emailTemplates.overdueTemplate, variables);

            newAlerts.push({
              id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              taskId: task.id,
              taskTitle: task.title,
              type: "overdue",
              recipientName: task.assignee || "Sorumlu Kişi",
              recipientRole: "Task Owner",
              recipientEmail: `${String(task.assignee || "user").toLowerCase().replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}@sirket.com`,
              subject: compiledSubject,
              bodyHtml: compiledBody,
              createdAt: `${today} 09:00`,
              isRead: false,
              status: "sent",
              triggerKey
            });
            detectedCount++;
          }
        }
      }
    });

    if (newAlerts.length > 0) {
      setNotifications(prev => [...newAlerts, ...prev]);
      if (manual) {
        showToast(`${newAlerts.length} adet yeni e-posta uyarısı ve sistem bildirimi üretildi!`, "success");
      }
    } else {
      if (manual) {
        showToast("Tarama bitti. Seçilen kriterlere uyan yeni bir bildirim/eskalasyon tetiklenmedi.", "info");
      }
    }
  };

  const executeDailySummarySimulation = () => {
    const today = getEffectiveToday();
    const activeTasksCount = tasks.filter(t => t.status !== "completed").length;
    const overduesCount = tasks.filter(t => t.status !== "completed" && countDaysDiff(t.dueDate, today) < 0).length;
    
    const triggerKey = `daily-summary-${today}-${Date.now().toString().slice(0,6)}`;
    
    const builtHtml = `<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E1DFDD; border-radius: 8px; background-color: #ffffff; padding: 24px; color: #323130;">
      <div style="border-bottom: 2px solid #0078D4; padding-bottom: 12px; margin-bottom: 20px; text-align: center;">
        <h2 style="color: #0078D4; margin: 0; font-size: 20px;">📅 Günlük CRM Görev Özeti Raporu</h2>
        <p style="font-size: 12px; color: #605e5c; margin: 4px 0 0;">Veri Tarihi: ${today} (${notificationSettings.dailySummarySchedule})</p>
      </div>
      <p style="font-size: 14px; line-height: 1.5;">Merhaba Yönetici,</p>
      <p style="font-size: 14px; line-height: 1.5;">${today} tarihi itibariyle sisteminizdeki aktif görevlerin genel durum tablosu aşağıda listelenmiştir:</p>
      
      <div style="display: flex; gap: 10px; margin: 15px 0;">
        <div style="flex: 1; background-color: #F3F2F1; padding: 12px; border-radius: 4px; text-align: center;">
          <div style="font-size: 10px; text-transform: uppercase; color: #605e5c; font-weight: bold;">Aktif Görevler</div>
          <div style="font-size: 20px; font-weight: bold; color: #0078D4;">${activeTasksCount}</div>
        </div>
        <div style="flex: 1; background-color: #FDF6F6; padding: 12px; border-radius: 4px; text-align: center;">
          <div style="font-size: 10px; text-transform: uppercase; color: #a80000; font-weight: bold;">Geciken Görev</div>
          <div style="font-size: 20px; font-weight: bold; color: #a80000;">${overduesCount}</div>
        </div>
      </div>
      
      <p style="font-size: 12px; color: #605e5c; line-height: 1.5;">Gecikmiş ve yaklaşan tüm teslimat detaylarını incelemek için aşağıdaki butonu kullanarak CRM görevler modülünü doğrudan ziyaret edebilirsiniz.</p>
      
      <div style="text-align: center; margin: 25px 0 10px;">
        <a href="${window.location.origin}/#tasks" style="background-color: #0078D4; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px; display: inline-block;">CRM Paneline Bağlan</a>
      </div>
    </div>`;

    const summaryNotif: TaskNotification = {
      id: `summary-${Date.now()}`,
      taskId: "all",
      taskTitle: "Günlük Özet Raporu",
      type: "daily_summary",
      recipientName: "Sistem Yöneticisi",
      recipientRole: "Administrator",
      recipientEmail: "admin@sirket.com",
      subject: `[Özet Rapor] ${today} Günlük Görev ve Gecikme Durumu`,
      bodyHtml: builtHtml,
      createdAt: `${today} ${notificationSettings.dailySummarySchedule}`,
      isRead: false,
      status: "sent",
      triggerKey
    };

    setNotifications(prev => [summaryNotif, ...prev]);
    showToast(`Günlük Özet E-postası başarıyla derlendi ve alıcılara gönderildi! (Tarih: ${today})`, "success");
  };

  // Automated silent execution hook
  useEffect(() => {
    runNotificationEngine(false);
  }, [tasks, simulatedDate, isSimulatedDateActive]);

  useEffect(() => {
    localStorage.setItem("crm_notification_settings", JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  useEffect(() => {
    localStorage.setItem("crm_task_notifications", JSON.stringify(notifications));
  }, [notifications]);

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetColumnId } : t));
  };

  // --- TASK ACTIONS ---
  const handleOpenAddTask = (colId?: string) => {
    setAddTaskColumnId(colId || columns[0]?.id || "not_started");
    setNewTitle("");
    setNewDescription("");
    setNewAssignee(crmUsers[0] || "");
    setNewDueDate(new Date(Date.now() + 5 * 86450000).toISOString().split('T')[0]);
    setNewPriority("Medium");
    setIsAddModalOpen(true);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTitle,
      description: newDescription,
      status: addTaskColumnId,
      assignee: newAssignee,
      dueDate: newDueDate,
      priority: newPriority
    };

    setTasks(prev => [...prev, newTask]);
    setIsAddModalOpen(false);
  };

  const handleOpenEditTask = (task: Task) => {
    setSelectedTask(task);
    setNewTitle(task.title);
    setNewDescription(task.description);
    setNewAssignee(task.assignee);
    setNewDueDate(task.dueDate);
    setNewPriority(task.priority);
    setNewStatus(task.status);
    setIsEditModalOpen(true);
  };

  const handleUpdateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newTitle.trim()) return;

    setTasks(prev => prev.map(t => t.id === selectedTask.id ? {
      ...t,
      title: newTitle,
      description: newDescription,
      assignee: newAssignee,
      dueDate: newDueDate,
      priority: newPriority,
      status: newStatus
    } : t));

    setIsEditModalOpen(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    setConfirmDeleteModal({
      isOpen: true,
      title: "Görev Kartı Silinecek",
      message: "Geri dönüşüm kutusuna taşınsın mı?",
      onConfirm: () => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setIsEditModalOpen(false);
        setSelectedTask(null);
      }
    });
  };

  // --- COLUMN MANAGEMENT ---
  const handleAddNewColumn = () => {
    const colName = prompt("Yeni bölüm ismini giriniz:");
    if (!colName || !colName.trim()) return;
    const newId = `col-${Date.now()}`;
    const newCol: TaskColumn = {
      id: newId,
      title: colName.trim()
    };
    setColumns(prev => [...prev, newCol]);
  };

  const handleRenameColumn = (colId: string, newName: string) => {
    if (!newName.trim()) return;
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, title: newName.trim() } : c));
    setEditingColumnId(null);
  };

  const handleCollapseColumn = (colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, isCollapsed: !c.isCollapsed } : c));
  };

  const handleRemoveColumn = (colId: string) => {
    const columnTasks = tasks.filter(t => t.status === colId);
    if (columnTasks.length > 0) {
      setConfirmDeleteModal({
        isOpen: true,
        title: "Bölüm Silinecek",
        message: `Bu sütunda ${columnTasks.length} adet görev bulunmaktadır. Sütunu sildiğinizde bu görevler ilk sütuna aktarılacak ve bölüm geri dönüşüm kutusuna taşınacaktır. Devam etmek istiyor musunuz?`,
        onConfirm: () => {
          // Re-route tasks to first column
          const defaultCol = columns.find(c => c.id !== colId)?.id || "not_started";
          setTasks(prev => prev.map(t => t.status === colId ? { ...t, status: defaultCol } : t));
          setColumns(prev => prev.filter(c => c.id !== colId));
        }
      });
    } else {
      setConfirmDeleteModal({
        isOpen: true,
        title: "Bölüm Silinecek",
        message: "Geri dönüşüm kutusuna taşınsın mı?",
        onConfirm: () => {
          setColumns(prev => prev.filter(c => c.id !== colId));
        }
      });
    }
  };

  // --- REAL-TIME CALCULATED STATS ---
  const totalCount = tasks.length;
  const notStartedCount = tasks.filter(t => t.status === "not_started").length;
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;
  const onHoldCount = tasks.filter(t => t.status === "on_hold").length;
  const completedCount = tasks.filter(t => t.status === "completed").length;

  // Custom open status count combines Not Started + On Hold + non-standard custom open statuses
  const openCount = tasks.filter(t => t.status === "not_started" || t.status === "on_hold" || (t.status !== "completed" && t.status !== "in_progress")).length;

  // --- FILTERING ---
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === "All" || task.assignee === assigneeFilter;
    return matchesSearch && matchesPriority && matchesAssignee;
  });

  const handleExportToExcel = () => {
    // Column Names
    const headers = ["Görev Başlığı", "Açıklama", "Aşama", "Sorumlu", "Bitiş Tarihi", "Öncelik"];
    const rows = filteredTasks.map(t => {
      const colTitle = columns.find(c => c.id === t.status)?.title || t.status;
      return [
        t.title,
        t.description,
        colTitle,
        t.assignee,
        t.dueDate,
        t.priority
      ];
    });

    // We can join with semicolons for Turkish Excel default compatibility
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "govevler_ve_yapilacaklar.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full text-slate-700 dark:text-slate-300">
      
      {/* LEFT COLUMN: MAIN TASKS WRAPPER */}
      <div className="flex-1 flex flex-col space-y-5 min-w-0">
          
         {/* VIEW HEADER & ACTIONS BAR */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#1b1a19] p-5 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm relative overflow-hidden">
           <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
           <div>
             <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
               <CheckSquare className="w-5 h-5 text-[#0078D4]" />
               {lang === "TR" ? "Görev Takibi (Tasks)" : "Task Tracking"}
             </h1>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
               {lang === "TR" ? "CRM süreçlerini, atanmış sorumluları ve görev aşamalarını yönetin." : "Manage CRM processes, assignees, and task stages."}
             </p>
           </div>
 
           <div className="flex items-center flex-wrap gap-2.5">
             {/* Screen expansion arrow button */}
             <button
               type="button"
               onClick={() => setIsFullScreen(!isFullScreen)}
               className="p-2 bg-slate-100 dark:bg-[#252423] hover:bg-slate-200 dark:hover:bg-[#323130] text-slate-700 dark:text-slate-300 border border-[#EDEBE9] dark:border-[#323130] rounded flex items-center justify-center transition-all cursor-pointer"
               title={isFullScreen ? "Ekranı Daralt" : "Ekranı Genişlet"}
             >
               {isFullScreen ? (
                 <Minimize2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
               ) : (
                 <Maximize2 className="w-4 h-4 text-slate-650 dark:text-slate-400" />
               )}
             </button>

             {/* Dynamic Assignees Manager button */}
             <button
               type="button"
               onClick={() => setIsAssigneeModalOpen(true)}
               className="bg-slate-100 dark:bg-[#252423] hover:bg-slate-200 dark:hover:bg-[#323130] text-slate-700 dark:text-slate-300 border border-[#EDEBE9] dark:border-[#323130] px-3 py-2 rounded text-xs font-bold font-sans flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
               title="Sorumlu Kişi Listesini Yönet"
             >
               <User className="w-4 h-4 text-[#0078D4]" />
               Sorumluları Yönet
             </button>

             {/* XLS Export button */}
             <button
               type="button"
               onClick={handleExportToExcel}
               className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded text-xs font-bold font-sans flex items-center gap-1.5 shadow-sm transition-all focus:outline-hidden cursor-pointer"
               title="Görevleri Excel formatında indir"
             >
               <FileSpreadsheet className="w-4 h-4" />
               XLS Dışa Aktar
             </button>

             {/* View Toggle */}
             <div className="flex items-center bg-slate-100 dark:bg-[#252423] p-1 rounded border border-[#EDEBE9] dark:border-[#323130]">
               <button
                 type="button"
                 onClick={() => setActiveView("kanban")}
                 className={`px-3 py-1.5 rounded text-xs font-bold font-sans flex items-center gap-1.5 transition-all ${
                   activeView === "kanban"
                     ? "bg-white dark:bg-[#323130] text-[#0078D4] dark:text-blue-400 shadow-xs"
                     : "text-slate-550 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                 }`}
               >
                 <Kanban className="w-3.5 h-3.5" />
                 <span>Kanban</span>
               </button>
               <button
                 type="button"
                 onClick={() => setActiveView("list")}
                 className={`px-3 py-1.5 rounded text-xs font-bold font-sans flex items-center gap-1.5 transition-all ${
                   activeView === "list"
                     ? "bg-white dark:bg-[#323130] text-[#0078D4] dark:text-blue-400 shadow-xs"
                     : "text-slate-550 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                 }`}
               >
                 <List className="w-3.5 h-3.5" />
                 <span>Liste</span>
               </button>
             </div>
 
             {/* Main top action button */}
             <button
               type="button"
               onClick={() => handleOpenAddTask()}
               className="bg-[#0078D4] hover:bg-[#005a9e] text-white px-3.5 py-2 rounded text-xs font-bold font-sans flex items-center gap-1.5 shadow-sm transition-all focus:outline-hidden cursor-pointer"
             >
               <Plus className="w-4 h-4" />
               Yeni Görev Ekle
             </button>
           </div>
         </div>

         {/* TAB SYSTEM NAVIGATION & SIMULATION ENGINE CONTROL */}
         <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 bg-white dark:bg-[#1b1a19] p-4 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm">
           <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-[#252423] p-1 rounded-md border border-slate-200/60 dark:border-[#2d2c2b]">
             <button
               type="button"
               onClick={() => setActiveMainTab("board")}
               className={`px-4 py-2 rounded-md text-xs font-bold font-sans flex items-center gap-2 transition-all cursor-pointer ${
                 activeMainTab === "board"
                   ? "bg-white dark:bg-[#323130] text-[#0078D4] dark:text-blue-400 shadow-xs"
                   : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
               }`}
             >
               <LayoutDashboard className="w-4 h-4 text-[#0078D4]" />
               Görev Tahtası
             </button>
             <button
               type="button"
               onClick={() => setActiveMainTab("notifications")}
               className={`px-4 py-2 rounded-md text-xs font-bold font-sans flex items-center gap-2 transition-all relative cursor-pointer ${
                 activeMainTab === "notifications"
                   ? "bg-white dark:bg-[#323130] text-[#0078D4] dark:text-blue-400 shadow-xs"
                   : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
               }`}
             >
               <Bell className="w-4 h-4 text-amber-500" />
               Bildirim Merkezi
               {notifications.filter(n => !n.isRead).length > 0 && (
                 <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-sans font-extrabold animate-pulse min-w-4 text-center">
                   {notifications.filter(n => !n.isRead).length}
                 </span>
               )}
             </button>
             <button
               type="button"
               onClick={() => setActiveMainTab("settings")}
               className={`px-4 py-2 rounded-md text-xs font-bold font-sans flex items-center gap-2 transition-all cursor-pointer ${
                 activeMainTab === "settings"
                   ? "bg-white dark:bg-[#323130] text-[#0078D4] dark:text-blue-400 shadow-xs"
                   : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
               }`}
             >
               <Settings className="w-4 h-4 text-slate-500" />
               Engine Kuralları (Admin)
             </button>
           </div>

           {/* SIMULATOR BAR */}
           <div className="flex flex-wrap items-center gap-3 bg-[#FAF8F5] dark:bg-[#201f1e] px-3.5 py-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
             <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
               <Calendar className="w-3.5 h-3.5 text-indigo-500" />
               Simülasyon Günü:
             </span>
             <div className="flex items-center gap-2 flex-wrap">
               <input
                 type="date"
                 value={simulatedDate}
                 onChange={(e) => {
                   setSimulatedDate(e.target.value);
                   setIsSimulatedDateActive(true);
                   showToast(`Simülasyon tarihi ${e.target.value} olarak güncellendi! Yeni bildirim ve eskalasyonlar sorgulandı.`, "info");
                 }}
                 className="px-2 py-1 bg-white dark:bg-[#1b1a19] text-xs border border-slate-200 dark:border-[#323130] rounded focus:outline-hidden text-slate-800 dark:text-slate-100 font-bold font-sans"
               />
               <button
                 type="button"
                 onClick={() => {
                   setIsSimulatedDateActive(!isSimulatedDateActive);
                   showToast(
                     isSimulatedDateActive 
                       ? "Gerçek sistem zamanına dönüldü."
                       : `Tarih simülasyonu devrede: ${simulatedDate}`, 
                     "info"
                   );
                 }}
                 className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                   isSimulatedDateActive 
                     ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                     : "bg-slate-200 hover:bg-slate-300 dark:bg-[#323130] dark:hover:bg-[#424140] text-slate-700 dark:text-slate-300"
                 }`}
               >
                 {isSimulatedDateActive ? "Simülatör Açık" : "Sür"}
               </button>
               <button
                 type="button"
                 onClick={() => runNotificationEngine(true)}
                 title="Manuel görev durum taraması & alarm kontrolü"
                 className="p-1 px-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-indigo-400 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all border border-indigo-100/40"
               >
                 <RefreshCw className="w-3 h-3" />
                 Alarmları Tara
               </button>
             </div>
           </div>
         </div>

         {activeMainTab === "board" && (
           <>
             {/* SEARCH, FILTERS & UTILITIES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-[#1b1a19] p-4 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm">
          {/* Search Box */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </span>
            <input
              type="text"
              placeholder="Görev adı veya açıklama ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-[#0078D4] dark:focus:border-blue-500"
            />
          </div>

          {/* Priority filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-405">
              <Tag className="h-4 w-4 text-slate-400" />
            </span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="pl-9 pr-3 py-2 w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">Tüm Öncelikler</option>
              <option value="Low">Düşük</option>
              <option value="Medium">Orta</option>
              <option value="High">Yüksek</option>
            </select>
          </div>

          {/* Assignee filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-405">
              <User className="h-4 w-4 text-slate-400" />
            </span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="pl-9 pr-3 py-2 w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">Tüm Sorumlular</option>
              {crmUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* VIEW BODY RENDERING */}
        {activeView === "kanban" ? (
          /* KANBAN BOARD VIEW */
          <div className="flex gap-4 overflow-x-auto pb-4 items-start select-none scrollbar-thin">
            {columns.map((col) => {
              const columnTasks = filteredTasks.filter(t => t.status === col.id);

              if (col.isCollapsed) {
                // COLLAPSED SECTION LAYOUT
                return (
                  <div 
                    key={col.id}
                    className="w-12 bg-slate-50 dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded flex flex-col py-4 items-center gap-4 transition-all hover:bg-slate-100 dark:hover:bg-[#252423] cursor-pointer"
                    title="Genişletmek için tıklayın"
                    onClick={() => handleCollapseColumn(col.id)}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-205 dark:bg-[#323130] text-[10px] font-bold text-slate-600 dark:text-slate-350 flex items-center justify-center border border-slate-200 dark:border-[#424140]">
                        {columnTasks.length}
                      </span>
                    </div>
                    <div className="vertical-text text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none pointer-events-none py-2 shrink-0">
                      {col.title}
                    </div>
                    <button 
                      type="button"
                      className="text-[#0078D4] hover:text-blue-500 p-1 rounded-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCollapseColumn(col.id);
                      }}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e)}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className="w-72 bg-[#FAF9F8] dark:bg-[#1b1a19] rounded-lg border border-[#EDEBE9] dark:border-[#323130] p-3 flex flex-col shrink-0 min-h-[500px]"
                >
                  {/* Column Header Group with kebab dropdown menu inside */}
                  <div className="group relative flex items-center justify-between mb-3.5 pb-2 border-b border-[#EDEBE9] dark:border-[#323130]">
                    {editingColumnId === col.id ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          defaultValue={col.title}
                          onChange={(e) => setEditingColumnTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameColumn(col.id, e.currentTarget.value);
                            if (e.key === "Escape") setEditingColumnId(null);
                          }}
                          onBlur={(e) => handleRenameColumn(col.id, e.target.value)}
                          autoFocus
                          className="px-1.5 py-0.5 w-full bg-white dark:bg-[#252423] text-xs text-slate-800 dark:text-slate-200 border border-[#0078D4] rounded"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                          {col.title}
                        </h3>
                        <span className="text-[11px] px-1.5 py-0.25 bg-slate-200/60 dark:bg-[#2d2c2b] text-slate-600 dark:text-slate-400 font-bold rounded-full border border-slate-300/40 dark:border-zinc-850">
                          {columnTasks.length}
                        </span>
                      </div>
                    )}

                    {/* Show kebab icon (...) on hover */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveColumnMenu(activeColumnMenu === col.id ? null : col.id)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-[#323130] transition-opacity cursor-pointer flex-shrink-0"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* DROPDOWN MENU FOR COLUMN */}
                    {activeColumnMenu === col.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setActiveColumnMenu(null)}
                        />
                        <div className="absolute right-0 top-7 bg-white dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded shadow-lg py-1.5 w-44 z-20 text-xs text-slate-700 dark:text-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingColumnId(col.id);
                              setEditingColumnTitle(col.title);
                              setActiveColumnMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-[#323130] flex items-center gap-2"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#0078D4]" />
                            Bölüm Adını Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAddNewColumn();
                              setActiveColumnMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-[#323130] flex items-center gap-2"
                          >
                            <FolderPlus className="w-3.5 h-3.5 text-emerald-500" />
                            Yeni Bölüm Ekle
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleCollapseColumn(col.id);
                              setActiveColumnMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-[#323130] flex items-center gap-2"
                          >
                            <X className="w-3.5 h-3.5 text-amber-500" />
                            Bölümü Daralt
                          </button>
                          {columns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveColumn(col.id);
                                setActiveColumnMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-rose-600 hover:text-white hover:bg-rose-500 dark:hover:bg-rose-600 border-t border-slate-100 dark:border-[#323130] mt-1.5 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Bölümü Sil
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tasks Card Space */}
                  <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[550px] scrollbar-thin pr-1">
                    {columnTasks.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-zinc-800 p-5 rounded text-center text-[10px] text-slate-400 dark:text-slate-500 min-h-[90px]">
                        Görev Yok
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => handleOpenEditTask(task)}
                          className="bg-white dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-3.5 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] flex flex-col gap-2.5 relative group/card"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                              {task.title}
                            </span>
                            
                            {/* Fast direct delete */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                              className="text-slate-350 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded-md opacity-0 group-hover/card:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed h-8">
                            {task.description || "Açıklama belirtilmemiş..."}
                          </p>

                          <div className="flex items-center justify-between border-t border-[#EDEBE9]/50 dark:border-[#323130]/50 pt-2.5 mt-1">
                            {/* Assigne */}
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-550 dark:text-slate-400 font-medium">
                              <div className="w-5 h-5 rounded-full bg-[#0078D4]/10 text-[#0078D4] flex items-center justify-center font-bold text-[9px]">
                                {task.assignee ? task.assignee.substring(0, 2).toUpperCase() : "U"}
                              </div>
                              <span className="truncate max-w-[80px]">{task.assignee || "Atanmamış"}</span>
                            </div>

                            {/* Tags / Priority & Target Calendar */}
                            <div className="flex items-center gap-1.5">
                              {/* Date count indicator */}
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {task.dueDate ? task.dueDate.split("-").slice(1).reverse().join("/") : ""}
                              </span>

                              <span className={`text-[9px] font-bold px-1.5 py-0.25 rounded-sm ${
                                task.priority === "High" 
                                  ? "bg-rose-50 dark:bg-rose-955 text-rose-650 dark:text-rose-455 border border-rose-200"
                                  : task.priority === "Medium"
                                  ? "bg-amber-50 dark:bg-amber-955 text-amber-650 dark:text-amber-455 border border-amber-200"
                                  : "bg-slate-100 dark:bg-[#323130] text-slate-600 dark:text-slate-400 border border-slate-205"
                              }`}>
                                {task.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add action task text button */}
                  <button
                    type="button"
                    onClick={() => handleOpenAddTask(col.id)}
                    className="mt-3.5 py-1.5 w-full bg-white dark:bg-[#252423]/40 hover:bg-[#FAF9F8] dark:hover:bg-[#252423] text-[#0078D4] hover:text-blue-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Görev Ekle
                  </button>
                </div>
              );
            })}

            {/* QUICK COLUMN CREATOR AREA */}
            <button
              onClick={handleAddNewColumn}
              className="w-44 h-[120px] bg-slate-50/50 hover:bg-slate-100/50 dark:bg-[#1b1a19]/30 dark:hover:bg-[#1b1a19]/60 rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 hover:border-[#0078D4] dark:hover:border-blue-500 text-slate-400 hover:text-[#0078D4] dark:hover:text-blue-400 transition-all shrink-0 cursor-pointer text-xs font-bold"
            >
              <FolderPlus className="w-5 h-5" />
              Yeni Kart Sütunu
            </button>
          </div>
        ) : (
          /* LIST VIEW SECTION */
          <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-lg shadow-sm overflow-hidden w-full">
            {filteredTasks.length === 0 ? (
              <div className="p-10 text-center text-slate-450 dark:text-slate-550 flex flex-col items-center justify-center gap-2">
                <CheckCircle className="w-10 h-10 text-slate-300" />
                <span className="text-sm font-semibold">Gösterilecek görev bulunamadı</span>
                <span className="text-xs">Arama kelimelerini veya filtreleri değiştirmeyi deneyin.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF9F8] dark:bg-[#201f1e] border-b border-[#EDEBE9] dark:border-[#323130] text-xs font-bold font-sans uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                      <th className="px-5 py-3 shadow-2xs">Görev Adı</th>
                      <th className="px-5 py-3">Bölüm / Aşama</th>
                      <th className="px-5 py-3">Atanan Sorumlu</th>
                      <th className="px-5 py-3">Bitiş Tarihi</th>
                      <th className="px-5 py-3">Öncelik</th>
                      <th className="px-5 py-3 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#323130]">
                    {filteredTasks.map((task) => {
                      const colTitle = columns.find(c => c.id === task.status)?.title || "Aşama Yok";
                      return (
                        <tr 
                          key={task.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-[#252423]/60 text-xs transition-all cursor-pointer group"
                          onClick={() => handleOpenEditTask(task)}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col gap-0.5 max-w-sm">
                              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                {task.title}
                              </span>
                              <span className="text-[11px] text-slate-450 dark:text-slate-400 truncate">
                                {task.description || "Açıklama girilmemiş."}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2.5 py-1 bg-[#0078D4]/10 dark:bg-blue-950/40 text-[#0078D4] dark:text-blue-300 rounded font-semibold text-[10px]">
                              {colTitle}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2 font-semibold">
                              <div className="w-5 h-5 rounded-full bg-[#0078D4]/20 text-[#0078D4] dark:text-blue-300 flex items-center justify-center font-bold text-[9px]">
                                {task.assignee ? task.assignee.substring(0, 2).toUpperCase() : "U"}
                              </div>
                              <span className="text-slate-700 dark:text-slate-300 font-sans">{task.assignee || "Atanmamış"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium">
                            {task.dueDate ? task.dueDate.split("-").reverse().join(".") : "-"}
                          </td>
                          <td className="px-5 py-3.5 font-bold">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              task.priority === "High" 
                                ? "bg-rose-50 dark:bg-rose-950/30 text-rose-650 dark:text-rose-400"
                                : task.priority === "Medium"
                                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-650 dark:text-amber-400"
                                : "bg-slate-100 dark:bg-[#323130] text-slate-600 dark:text-slate-400"
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleOpenEditTask(task)}
                                className="p-1 bg-white hover:bg-slate-100 dark:bg-[#252423] dark:hover:bg-[#323130] border border-[#EDEBE9] dark:border-[#323130] rounded text-slate-600 hover:text-[#0078D4] dark:text-zinc-300"
                                title="Görevi Düzenle"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 bg-white hover:bg-rose-50 dark:bg-[#252423] dark:hover:bg-rose-950/30 border border-[#EDEBE9] dark:border-[#323130] rounded text-slate-600 hover:text-rose-600 dark:text-zinc-300"
                                title="Görevi Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        </>
      )}

      {/* NOTIFICATIONS CENTER */}
      {activeMainTab === "notifications" && (
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-lg shadow-sm p-5 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#EDEBE9] dark:border-[#323130]">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 font-sans uppercase tracking-wider">
                <Bell className="w-4 h-4 text-amber-500" />
                Sistem Bildirim Merkezi ve E-Posta Simülatörü
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Engine tarafından tetiklenen tüm yaklaşan gün, gecikme ve departman eskalasyon e-postalarını buradan izleyin ve simüle edin.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => {
                  setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                  showToast("Tüm bildirimler okundu olarak işaretlendi.");
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#323130] dark:hover:bg-[#424140] text-slate-700 dark:text-slate-200 rounded text-xs font-bold transition-all cursor-pointer"
              >
                Tümünü Okundu Yap
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteModal({
                    isOpen: true,
                    title: "Geçmiş Temizlenecek",
                    message: "Tüm bildirim geçmişi silinsin mi?",
                    onConfirm: () => {
                      setNotifications([]);
                      showToast("Bildirim geçmişi sıfırlandı.", "info");
                    }
                  });
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-105 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded text-xs font-bold transition-all cursor-pointer"
              >
                Geçmişi Temizle
              </button>
            </div>
          </div>

          {/* Filters bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FAF8F5] dark:bg-[#201f1e] p-3 rounded border border-[#EDEBE9] dark:border-[#323130]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tür Filtresi:</span>
              <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#252423] p-1 rounded border border-slate-200/60 dark:border-[#2d2c2b]">
                <button
                  type="button"
                  onClick={() => setNotificationTypeFilter("All")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                    notificationTypeFilter === "All"
                      ? "bg-[#0078D4] text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  Hepsi ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationTypeFilter("due_soon")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                    notificationTypeFilter === "due_soon"
                      ? "bg-amber-500 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  Yaklaşan Vade ({notifications.filter(n => n.type === "due_soon").length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationTypeFilter("overdue")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                    notificationTypeFilter === "overdue"
                      ? "bg-rose-500 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  Gecikme ({notifications.filter(n => n.type === "overdue").length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationTypeFilter("escalation")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                    notificationTypeFilter === "escalation"
                      ? "bg-purple-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  Eskalasyon ({notifications.filter(n => n.type === "escalation").length})
                </button>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Bekleyen Okunmamış: {notifications.filter(n => !n.isRead).length}
            </span>
          </div>

          {/* List representation */}
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-550 border border-dashed border-slate-200 dark:border-[#323130] rounded-lg">
              <Bell className="w-12 h-12 text-slate-300 dark:text-[#323130] mx-auto opacity-70 mb-3" />
              <span className="block text-sm font-bold text-slate-600 dark:text-slate-300">Henüz alarm üretilmedi</span>
              <span className="block text-xs mt-1">
                "Alarmları Tara" butonuyla veya simülasyon tarihini ya da görev vadelerini değiştirerek bildirimlerin üretilmesini sağlayabilirsiniz.
              </span>
            </div>
          ) : (
            <div className="divide-y divide-[#EDEBE9] dark:divide-[#323130] border border-[#EDEBE9] dark:border-[#323130] rounded-lg overflow-hidden bg-[#FAF9F8] dark:bg-[#1f1e1d]">
              {notifications
                .filter(n => notificationTypeFilter === "All" || n.type === notificationTypeFilter)
                .slice()
                .reverse()
                .map(n => {
                  const badgeColor = 
                    n.type === "due_soon" 
                      ? "bg-amber-50 dark:bg-amber-955 text-amber-600 dark:text-amber-400 border border-amber-200/50" 
                      : n.type === "overdue"
                      ? "bg-rose-50 dark:bg-rose-955 text-rose-600 dark:text-rose-400 border border-rose-200/50"
                      : "bg-purple-50 dark:bg-purple-955 text-purple-600 dark:text-purple-400 border border-purple-200/50";
                    
                  const typeLabel = 
                    n.type === "due_soon" ? "Yaklaşan" : n.type === "overdue" ? "Gecikme" : "Eskalasyon";

                  return (
                    <div 
                      key={n.id}
                      className={`p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors ${
                        n.isRead ? "bg-white dark:bg-[#1b1a19] opacity-75" : "bg-blue-50/20 dark:bg-blue-955/5"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.25 rounded ${badgeColor}`}>
                            {typeLabel}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {n.createdAt}
                          </span>
                          {!n.isRead && (
                            <span className="bg-red-500 w-1.5 h-1.5 rounded-full" title="Okunmadı" />
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {n.subject}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 font-medium font-mono">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" /> Alıcı: {n.recipientName} ({n.recipientRole})
                          </span>
                          <span>•</span>
                          <span>E-posta: {n.recipientEmail}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: !item.isRead } : item));
                          }}
                          className="px-2 py-1 text-[10px] font-semibold border border-slate-200 dark:border-[#323130] rounded bg-white hover:bg-slate-50 dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-705 dark:text-slate-300 cursor-pointer"
                        >
                          {n.isRead ? "Okunmadı Yap" : "Okundu Yap"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveNotificationItem(n)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-[#0078D4] hover:bg-[#005a9e] text-white rounded cursor-pointer"
                        >
                          HTML Sablonu Simüle Et
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotifications(prev => prev.filter(item => item.id !== n.id));
                            showToast("Bildirim kaydı silindi.");
                          }}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-955 text-rose-500 dark:text-rose-450 rounded transition-all cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* SETTINGS ENGINE ADMIN */}
      {activeMainTab === "settings" && (
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-lg shadow-sm p-5 space-y-6">
          <div className="pb-4 border-b border-[#EDEBE9] dark:border-[#323130]">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 font-sans uppercase tracking-wider">
              <Settings className="w-4 h-4 text-[#0078D4]" />
              Bildirim Alarmları ve SLA Eskalasyon Engine Yapılandırması
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gecikme, son gün uyarısı ve kademeli organizasyonel eskalasyonların zaman ve rol tetikleyicilerini yönetin.
            </p>
          </div>

          {/* Inner subtabs */}
          <div className="flex border-b border-slate-200 dark:border-[#2d2c2b] gap-2">
            <button
              type="button"
              onClick={() => setSettingsActiveTab("general")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all relative cursor-pointer ${
                settingsActiveTab === "general"
                  ? "text-[#0078D4] border-b-2 border-[#0078D4]"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
              }`}
            >
              Genel Kurallar & Frekans
            </button>
            <button
              type="button"
              onClick={() => setSettingsActiveTab("escalation")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all relative cursor-pointer ${
                settingsActiveTab === "escalation"
                  ? "text-[#0078D4] border-b-2 border-[#0078D4]"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
              }`}
            >
              SLA Eskalasyon Yetkilileri
            </button>
            <button
              type="button"
              onClick={() => setSettingsActiveTab("templates")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all relative cursor-pointer ${
                settingsActiveTab === "templates"
                  ? "text-[#0078D4] border-b-2 border-[#0078D4]"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
              }`}
            >
              E-Posta HTML Sablonları
            </button>
          </div>

          {/* Tab 1: General rules */}
          {settingsActiveTab === "general" && (
            <div className="space-y-5 animate-in fade-in duration-100">
              {/* Reminder list */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-250 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0078D4]" />
                  Yaklaşan Bitiş Hatırlatıcı Kuralları (Ön-Uyarı Alarmları)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 bg-[#FAF9F8] dark:bg-[#252423] p-4 rounded-lg border border-[#EDEBE9] dark:border-[#323130] cursor-pointer hover:bg-slate-50/50 dark:hover:bg-[#323130]/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={notificationSettings.reminderIntervals.twoDaysBefore}
                      onChange={(e) => {
                        const updated = {
                          ...notificationSettings,
                          reminderIntervals: {
                            ...notificationSettings.reminderIntervals,
                            twoDaysBefore: e.target.checked
                          }
                        };
                        setNotificationSettings(updated);
                        localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                        showToast("Hatırlatıcı ayarları güncellendi.");
                      }}
                      className="mt-0.5 rounded text-[#0078D4] focus:ring-[#0078D4]"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Bitiş Tarihine 2 Gün Kala</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sorumlu kişiye teslim tarihinden 2 gun önce otomatik e-posta gönderir.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 bg-[#FAF9F8] dark:bg-[#252423] p-4 rounded-lg border border-[#EDEBE9] dark:border-[#323130] cursor-pointer hover:bg-slate-50/50 dark:hover:bg-[#323130]/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={notificationSettings.reminderIntervals.sameDay}
                      onChange={(e) => {
                        const updated = {
                          ...notificationSettings,
                          reminderIntervals: {
                            ...notificationSettings.reminderIntervals,
                            sameDay: e.target.checked
                          }
                        };
                        setNotificationSettings(updated);
                        localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                        showToast("Hatırlatıcı ayarları güncellendi.");
                      }}
                      className="mt-0.5 rounded text-[#0078D4] focus:ring-[#0078D4]"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Bitiş Tarihi Gününde (Saat 09:00)</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1">Görevin bitiş gününün sabahında hızlı bir hatırlatma tetikler.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Overdue list */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-250 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  Gecikme Alarmları (Overdue Rules)
                </h3>
                <div className="space-y-3 bg-[#FAF9F8] dark:bg-[#252423] p-5 rounded-lg border border-[#EDEBE9] dark:border-[#323130]">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.overdueIntervals.detectOverdue}
                      onChange={(e) => {
                        const updated = {
                          ...notificationSettings,
                          overdueIntervals: {
                            ...notificationSettings.overdueIntervals,
                            detectOverdue: e.target.checked
                          }
                        };
                        setNotificationSettings(updated);
                        localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                        showToast("Gecikme taraması ayarı güncellendi.");
                      }}
                      className="rounded text-[#0078D4]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Gecikme Taramasını Tamamen Etkinlestir</span>
                  </div>
                </label>

                {notificationSettings.overdueIntervals.detectOverdue && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 pl-6 border-l-2 border-rose-200 dark:border-rose-950">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.overdueIntervals.day3}
                        onChange={(e) => {
                          const updated = {
                            ...notificationSettings,
                            overdueIntervals: {
                              ...notificationSettings.overdueIntervals,
                              day3: e.target.checked
                            }
                          };
                          setNotificationSettings(updated);
                          localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                          showToast("Ayar degistirildi.");
                        }}
                        className="mt-0.5 rounded text-rose-600"
                      />
                      <div>
                        <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Gecikmenin 3. Gününde</span>
                        <span className="block text-[10px] text-slate-500">İlk resmi gecikme uyarısı postalanır.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.overdueIntervals.day7}
                        onChange={(e) => {
                          const updated = {
                            ...notificationSettings,
                            overdueIntervals: {
                              ...notificationSettings.overdueIntervals,
                              day7: e.target.checked
                            }
                          };
                          setNotificationSettings(updated);
                          localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                          showToast("Ayar degistirildi.");
                        }}
                        className="mt-0.5 rounded text-rose-600"
                      />
                      <div>
                        <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Gecikmenin 7. Gününde</span>
                        <span className="block text-[10px] text-slate-500">Daha ciddi bir tonda uyarı tetiklenir.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.overdueIntervals.every7Days}
                        onChange={(e) => {
                          const updated = {
                            ...notificationSettings,
                            overdueIntervals: {
                              ...notificationSettings.overdueIntervals,
                              every7Days: e.target.checked
                            }
                          };
                          setNotificationSettings(updated);
                          localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                          showToast("Ayar degistirildi.");
                        }}
                        className="mt-0.5 rounded text-rose-600"
                      />
                      <div>
                        <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Her 7 Günde Bir Tekrar Et</span>
                        <span className="block text-[10px] text-slate-500">Görev kapanana kadar haftalık hatırlatıcı gönderilmeye devam eder.</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Escalation configuration */}
        {settingsActiveTab === "escalation" && (
          <div className="space-y-4 animate-in fade-in duration-100">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-250 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#0078D4]" />
              SLA Sıralı Organizasyonel Eskalasyon Ağacı (Yönetici Hiyerarşisi)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gecikme günü arttıkça, uyarı e-postaları sistem tarafından otomatik olarak aşağıdaki sorumlulara ve hiyerarşik rollere eskalasyon konusu edilerek iletilecektir.
            </p>

            <div className="space-y-4 pt-2">
              {/* Step 1: 1 Day Overdue (Task Owner) */}
              <div className="p-4 bg-slate-50 dark:bg-[#252423] border border-slate-200 dark:border-[#323130] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">1</span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">1. Gün Gecikme Eskalasyonu (Görev Sahibi Teması)</h4>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.escalationRules.day1Enabled}
                    onChange={(e) => {
                      const updated = {
                        ...notificationSettings,
                        escalationRules: { ...notificationSettings.escalationRules, day1Enabled: e.target.checked }
                      };
                      setNotificationSettings(updated);
                      localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                    }}
                    className="rounded text-[#0078D4]"
                  />
                </div>
                {notificationSettings.escalationRules.day1Enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-505 dark:text-slate-400 block mb-1">Eskalasyon Alıcısı / Görevli Ismi</label>
                      <input
                        type="text"
                        value={notificationSettings.escalationRules.day1Recipient}
                        onChange={(e) => {
                          const updated = {
                            ...notificationSettings,
                            escalationRules: { ...notificationSettings.escalationRules, day1Recipient: e.target.value }
                          };
                          setNotificationSettings(updated);
                          localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-505 dark:text-slate-400 block mb-1">Organizasyonel Rolü</label>
                      <input
                        type="text"
                        value={notificationSettings.escalationRules.day1Role}
                        onChange={(e) => {
                          const updated = {
                            ...notificationSettings,
                            escalationRules: { ...notificationSettings.escalationRules, day1Role: e.target.value }
                          };
                          setNotificationSettings(updated);
                          localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: 3 Days Overdue (Team Leader) */}
              <div className="p-4 bg-slate-50 dark:bg-[#252423] border border-slate-200 dark:border-[#323130] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-955 text-amber-700 flex items-center justify-center text-xs font-bold">2</span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">3. Gün Gecikme Eskalasyonu (Takım Lideri Bilgilendirme)</h4>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.escalationRules.day3Enabled}
                    onChange={(e) => {
                      const updated = {
                        ...notificationSettings,
                        escalationRules: { ...notificationSettings.escalationRules, day3Enabled: e.target.checked }
                      };
                      setNotificationSettings(updated);
                      localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                    }}
                    className="rounded text-[#0078D4]"
                  />
                </div>
                {notificationSettings.escalationRules.day3Enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-505 dark:text-slate-400 block mb-1">Eskalasyon Alıcısı / Görevli Ismi</label>
                      <input
                        type="text"
                        value={notificationSettings.escalationRules.day3Recipient}
                        onChange={(e) => {
                          const updated = {
                            ...notificationSettings,
                            escalationRules: { ...notificationSettings.escalationRules, day3Recipient: e.target.value }
                          };
                          setNotificationSettings(updated);
                          localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-505 dark:text-slate-400 block mb-1">Organizasyonel Rolü</label>
                      <input
                        type="text"
                        value={notificationSettings.escalationRules.day3Role}
                        onChange={(e) => {
                          const updated = {
                            ...notificationSettings,
                            escalationRules: { ...notificationSettings.escalationRules, day3Role: e.target.value }
                          };
                          setNotificationSettings(updated);
                          localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: 7 Days Overdue (Department Manager) */}
              <div className="p-4 bg-slate-55 dark:bg-[#252423] border border-slate-205 dark:border-[#323130] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-955 text-rose-750 flex items-center justify-center text-xs font-bold">3</span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">7. Gün Gecikme Eskalasyonu (Departman Müdürü Müdahalesi)</h4>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.escalationRules.day7Enabled}
                    onChange={(e) => {
                      const updated = {
                        ...notificationSettings,
                        escalationRules: { ...notificationSettings.escalationRules, day7Enabled: e.target.checked }
                      };
                      setNotificationSettings(updated);
                      localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                    }}
                    className="rounded text-[#0078D4]"
                  />
                </div>
                {notificationSettings.escalationRules.day7Enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-505 dark:text-slate-400 block mb-1">Eskalasyon Alıcısı / Görevli Ismi</label>
                      <input
                        type="text"
                        value={notificationSettings.escalationRules.day7Recipient}
                        onChange={(e) => {
                          const updated = {
                            ...notificationSettings,
                            escalationRules: { ...notificationSettings.escalationRules, day7Recipient: e.target.value }
                          };
                          setNotificationSettings(updated);
                          localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-505 dark:text-slate-400 block mb-1">Organizasyonel Rolü</label>
                      <input
                        type="text"
                        value={notificationSettings.escalationRules.day7Role}
                        onChange={(e) => {
                          const updated = {
                            ...notificationSettings,
                            escalationRules: { ...notificationSettings.escalationRules, day7Role: e.target.value }
                          };
                          setNotificationSettings(updated);
                          localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right pt-2 border-t border-slate-100 dark:border-[#323130] mt-4">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("crm_notification_settings", JSON.stringify(notificationSettings));
                  showToast("Tüm eskalasyon ayarları başarıyla kaydedildi!");
                }}
                className="px-4 py-2 bg-[#0078D4] hover:bg-[#005a9e] text-white text-xs font-bold rounded cursor-pointer"
              >
                Ayarları Kaydet
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Template Ozellestirme */}
        {settingsActiveTab === "templates" && (
          <div className="space-y-4 animate-in fade-in duration-100">
            <h3 className="text-xs font-extrabold text-slate-805 dark:text-slate-250 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-505" />
              Giden E-Posta Şablonları ve Şirket Bilgileri
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-[#252423] p-4 rounded-lg border border-slate-200 dark:border-[#323130]">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">Şirket Adı / Marka</label>
                <input
                  type="text"
                  value={notificationSettings.emailTemplates.companyName}
                  onChange={(e) => {
                    const updated = {
                      ...notificationSettings,
                      emailTemplates: { ...notificationSettings.emailTemplates, companyName: e.target.value }
                    };
                    setNotificationSettings(updated);
                    localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">Logo URL adresi</label>
                <input
                  type="text"
                  value={notificationSettings.emailTemplates.logoUrl}
                  onChange={(e) => {
                    const updated = {
                      ...notificationSettings,
                      emailTemplates: { ...notificationSettings.emailTemplates, logoUrl: e.target.value }
                    };
                    setNotificationSettings(updated);
                    localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded text-xs"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Gecikme (Overdue) E-posta Konu Şablonu</label>
                <input
                  type="text"
                  value={notificationSettings.emailTemplates.overdueSubject}
                  onChange={(e) => {
                    const updated = {
                      ...notificationSettings,
                      emailTemplates: { ...notificationSettings.emailTemplates, overdueSubject: e.target.value }
                    };
                    setNotificationSettings(updated);
                    localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-slate-200 dark:border-[#323130] rounded text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Yaklaşan Vade (Due Soon) E-posta Konu Şablonu</label>
                <input
                  type="text"
                  value={notificationSettings.emailTemplates.dueSoonSubject}
                  onChange={(e) => {
                    const updated = {
                      ...notificationSettings,
                      emailTemplates: { ...notificationSettings.emailTemplates, dueSoonSubject: e.target.value }
                    };
                    setNotificationSettings(updated);
                    localStorage.setItem("crm_notification_settings", JSON.stringify(updated));
                  }}
                  className="w-full px-3 py-2 bg-slate-55 bg-slate-50 dark:bg-[#252423] border border-slate-200 dark:border-[#323130] rounded text-xs font-bold"
                />
              </div>
            </div>

            <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded border border-amber-200/50">
              💡 <strong>İpucu:</strong> Şablon metinlerde <code>{"{{recipientName}}"}</code>, <code>{"{{taskTitle}}"}</code>, <code>{"{{dueDate}}"}</code> ve <code>{"{{priority}}"}</code> dinamik degişkenleri sistem tarafından gerçek veriyle otomatik olarak eşleştirilir.
            </p>

            <div className="text-right pt-2 border-t border-slate-100 dark:border-[#323130]">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("crm_notification_settings", JSON.stringify(notificationSettings));
                  showToast("E-posta şablon parametreleri başarıyla kaydedildi.");
                }}
                className="px-4 py-2 bg-[#0078D4] hover:bg-[#005a9e] text-white text-xs font-bold rounded cursor-pointer"
              >
                Şablonları Kaydet
              </button>
            </div>
          </div>
        )}
      </div>
    )}
    </div>

      {/* RIGHT COLUMN: ANALYTICS VISUAL DASHBOARD PANEL */}
      {!isFullScreen && (
        <div className="w-full lg:w-80 space-y-5 flex-shrink-0">
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-lg p-5 shadow-sm space-y-5">
          
          {/* Section Header */}
          <div className="flex items-center gap-1.5 pb-2.5 border-b border-[#EDEBE9] dark:border-[#323130]">
            <TrendingUp className="w-4 h-4 text-[#0078D4]" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest font-sans">
              Görev İstatistikleri
            </h2>
          </div>

          {/* TOTAL TASKS METRIC */}
          <div className="bg-[#FAF9F8] dark:bg-[#252423] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] flex flex-col relative overflow-hidden group">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">
              Toplam Görev Sayısı
            </div>
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1.5">
              {totalCount}
            </div>
            {/* Sparkline Visual SVG */}
            <div className="h-6 mt-2">
              <svg className="w-full h-full text-blue-500" viewBox="0 0 100 20" fill="none" preserveAspectRatio="none">
                <path d="M0,15 Q15,4 30,12 T60,5 T90,14 T100,2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M0,15 Q15,4 30,12 T60,5 T90,14 T100,2 L100,20 L0,20 Z" fill="currentColor" fillOpacity="0.05" />
              </svg>
            </div>
          </div>

          {/* OPEN TASKS (NOT STARTED + ON HOLD) */}
          <div className="bg-[#FAF9F8] dark:bg-[#252423] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] flex flex-col relative overflow-hidden">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">
              Açık Görevler (Başlanmamış + Bekleyen)
            </div>
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1.5">
              {openCount}
            </div>
            {/* Trend Indicator Line */}
            <div className="h-6 mt-2">
              <svg className="w-full h-full text-amber-500" viewBox="0 0 100 20" fill="none" preserveAspectRatio="none">
                <path d="M0,8 Q20,18 40,5 T80,15 T100,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M0,8 Q20,18 40,5 T80,15 T100,8 L100,20 L0,20 Z" fill="currentColor" fillOpacity="0.05" />
              </svg>
            </div>
          </div>

          {/* IN PROGRESS METRIC */}
          <div className="bg-[#FAF9F8] dark:bg-[#252423] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] flex flex-col relative overflow-hidden">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">
              Devam Eden Görevler (Aktif)
            </div>
            <div className="text-3xl font-black text-[#0078D4] dark:text-blue-400 tracking-tight mt-1.5">
              {inProgressCount}
            </div>
            {/* Smooth Sine Trend Line */}
            <div className="h-6 mt-2">
              <svg className="w-full h-full text-blue-400" viewBox="0 0 100 20" fill="none" preserveAspectRatio="none">
                <path d="M0,18 C15,5 35,5 50,12 C65,18 85,18 100,4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M0,18 C15,5 35,5 50,12 C65,18 85,18 100,4 L100,20 L0,20 Z" fill="currentColor" fillOpacity="0.05" />
              </svg>
            </div>
          </div>

          {/* COMPLETED METRIC */}
          <div className="bg-[#FAF9F8] dark:bg-[#252423] p-4 rounded border border-[#EDEBE9] dark:border-[#323130] flex flex-col relative overflow-hidden">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">
              Tamamlanan Görevler
            </div>
            <div className="text-3xl font-black text-rose-500 dark:text-emerald-500 tracking-tight mt-1.5">
              {completedCount}
            </div>
            {/* Complete Trend line upward */}
            <div className="h-6 mt-2">
              <svg className="w-full h-full text-emerald-500" viewBox="0 0 100 20" fill="none" preserveAspectRatio="none">
                <path d="M0,18 L25,14 L50,11 L75,6 L100,2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M0,18 L25,14 L50,11 L75,6 L100,2 L100,20 L0,20 Z" fill="currentColor" fillOpacity="0.05" />
              </svg>
            </div>
          </div>

          {/* EXTRA PROGRESS BAR & GENERAL PERFORMANCE SCORE */}
          <div className="p-3 bg-slate-50/50 dark:bg-black/10 border border-[#EDEBE9]/80 dark:border-zinc-800 rounded">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
              <span>Genel Tamamlama Oranı</span>
              <span>{totalCount > 0 ? Math.round((completedCount / totalCount) * 10) * 10 : 0}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-zinc-850 h-2 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-gradient-to-r from-[#0078D4] to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

        </div>
      </div>
      )}

      {/* ADD TASK MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1b1a19] w-full max-w-lg rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#EDEBE9] dark:border-[#323130] bg-[#FAF9F8] dark:bg-[#201f1e] flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#0078D4]" />
                Yeni Görev Ekle
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#252423] text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTask} className="p-5 space-y-4">
              {/* Task Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Görev Başlığı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Göreve açıklayıcı bir isim verin..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-[#0078D4]"
                />
              </div>

              {/* Task Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Açıklama / Detaylar
                </label>
                <textarea
                  placeholder="Yapılacakları ve varsa önemli notları girin..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-[#0078D4] resize-none"
                />
              </div>

              {/* Due Date & Assignee Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                      Sorumlu (Assignee)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAssigneeModalOpen(true)}
                      className="text-[10px] text-[#0078D4] hover:underline font-bold"
                    >
                      + İsim Ekle/Çıkar
                    </button>
                  </div>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    {crmUsers.map((user) => (
                      <option key={user} value={user}>
                        {user}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-[#0078D4]"
                  />
                </div>
              </div>

              {/* Priority & Column State Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Öncelik Derecesi
                  </label>
                  <div className="flex gap-2">
                    {(["Low", "Medium", "High"] as const).map((pri) => (
                      <button
                        key={pri}
                        type="button"
                        onClick={() => setNewPriority(pri)}
                        className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
                          newPriority === pri
                            ? pri === "High"
                              ? "bg-rose-500 text-white border-rose-550 shadow-xs"
                              : pri === "Medium"
                              ? "bg-amber-500 text-white border-amber-550 shadow-xs"
                              : "bg-slate-600 text-white border-slate-650 shadow-xs"
                            : "bg-white dark:bg-[#252423] hover:bg-slate-50 dark:hover:bg-[#323130] border-[#EDEBE9] dark:border-[#323130] text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {pri === "High" ? "Yüksek" : pri === "Medium" ? "Orta" : "Düşük"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Column */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Başlangıç Aşaması
                  </label>
                  <select
                    value={addTaskColumnId}
                    onChange={(e) => setAddTaskColumnId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="border-t border-[#EDEBE9] dark:border-[#323130] pt-4 mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-slate-600 dark:text-slate-400 rounded text-xs font-bold transition-all cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0078D4] hover:bg-[#005a9e] text-white rounded text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Görev Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / DETAIL TASK MODAL */}
      {isEditModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1b1a19] w-full max-w-lg rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#EDEBE9] dark:border-[#323130] bg-[#FAF9F8] dark:bg-[#201f1e] flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[#0078D4]" />
                Görev Detayları &amp; Düzenle
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedTask(null);
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#252423] text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateTask} className="p-5 space-y-4">
              {/* Task Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Görev Başlığı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Göreve açıklayıcı bir isim verin..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-[#0078D4]"
                />
              </div>

              {/* Task Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Açıklama / Detaylar
                </label>
                <textarea
                  placeholder="Yapılacakları ve varsa önemli notları girin..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-[#0078D4]"
                />
              </div>

              {/* Due Date & Assignee Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                      Sorumlu (Assignee)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAssigneeModalOpen(true)}
                      className="text-[10px] text-[#0078D4] hover:underline font-bold"
                    >
                      + İsim Ekle/Çıkar
                    </button>
                  </div>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    {crmUsers.map((user) => (
                      <option key={user} value={user}>
                        {user}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-[#0078D4]"
                  />
                </div>
              </div>

              {/* Priority & Status Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Öncelik Derecesi
                  </label>
                  <div className="flex gap-2">
                    {(["Low", "Medium", "High"] as const).map((pri) => (
                      <button
                        key={pri}
                        type="button"
                        onClick={() => setNewPriority(pri)}
                        className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
                          newPriority === pri
                            ? pri === "High"
                              ? "bg-rose-500 text-white border-rose-550 shadow-xs"
                              : pri === "Medium"
                              ? "bg-amber-500 text-white border-amber-550 shadow-xs"
                              : "bg-slate-600 text-white border-slate-650 shadow-xs"
                            : "bg-white dark:bg-[#252423] hover:bg-slate-50 dark:hover:bg-[#323130] border-[#EDEBE9] dark:border-[#323130] text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {pri === "High" ? "Yüksek" : pri === "Medium" ? "Orta" : "Düşük"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Column */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Mevcut Durum / Sütun
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer Buttons with custom delete button on left side */}
              <div className="border-t border-[#EDEBE9] dark:border-[#323130] pt-4 mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="px-4 py-2 border border-rose-200 dark:border-rose-950/40 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-650 text-rose-600 dark:text-rose-400 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Görevi Sil
                </button>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setSelectedTask(null);
                    }}
                    className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-slate-600 dark:text-slate-400 rounded text-xs font-bold transition-all cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0078D4] hover:bg-[#005a9e] text-white rounded text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE ASSIGNEES MODAL */}
      {isAssigneeModalOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1b1a19] w-full max-w-md rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#EDEBE9] dark:border-[#323130] bg-[#FAF9F8] dark:bg-[#201f1e] flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#0078D4]" />
                Sorumlu Listesini Yönet
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAssigneeModalOpen(false);
                  setNewAssigneeNameInput("");
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#252423] text-slate-550 dark:text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Add New Assignee Form */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Yeni Sorumlu Ekle
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Örn: Ahmet Yılmaz"
                    value={newAssigneeNameInput}
                    onChange={(e) => setNewAssigneeNameInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-[#0078D4]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newAssigneeNameInput.trim()) {
                          const name = newAssigneeNameInput.trim();
                          if (!crmUsers.includes(name)) {
                            setCrmUsers([...crmUsers, name]);
                          }
                          setNewAssigneeNameInput("");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newAssigneeNameInput.trim()) {
                        const name = newAssigneeNameInput.trim();
                        if (!crmUsers.includes(name)) {
                          setCrmUsers([...crmUsers, name]);
                        }
                        setNewAssigneeNameInput("");
                      }
                    }}
                    className="px-4 py-2 bg-[#0078D4] hover:bg-[#005a9e] text-white rounded text-xs font-bold transition-all cursor-pointer"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Assignee list with custom delete buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Kayıtlı Sorumlular ({crmUsers.length})
                </label>
                <div className="max-h-60 overflow-y-auto border border-[#EDEBE9] dark:border-[#323130] rounded divide-y divide-[#EDEBE9] dark:divide-[#323130] scrollbar-thin">
                  {crmUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Kayıtlı sorumlu bulunmamaktadır.
                    </div>
                  ) : (
                    crmUsers.map((user) => (
                      <div key={user} className="px-3 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{user}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCrmUsers(crmUsers.filter(u => u !== user));
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                          title="Sorumluyu Listeden Çıkar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tips */}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                * Listeden çıkarılan sorumlular mevcut görevlerden silinmez ancak yeni görev ataması yaparken seçenek olarak görünmez.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-zinc-900 border-t border-[#EDEBE9] dark:border-[#323130] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsAssigneeModalOpen(false);
                  setNewAssigneeNameInput("");
                }}
                className="px-4 py-2 bg-[#0078D4] hover:bg-[#005a9e] text-white rounded text-xs font-bold transition-all cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED EMAIL MODAL FOR ACTIVE NOTIFICATION ITEM */}
      {activeNotificationItem && (
        <div className="fixed inset-0 bg-black/75 dark:bg-black/90 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#FAF9F8] dark:bg-[#1f1e1d] w-full max-w-2xl rounded-xl border border-[#EDEBE9] dark:border-[#323130] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#EDEBE9] dark:border-[#323130] bg-[#FAF9F8] dark:bg-[#201f1e] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono ml-2">
                  E-Posta Simülatörü - Görüntüleyici
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveNotificationItem(null)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#252423] text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Email Metadatalar */}
            <div className="bg-white dark:bg-[#1b1a19] px-6 py-4 border-b border-[#EDEBE9] dark:border-[#323130] text-xs space-y-2 flex-shrink-0">
              <div className="flex items-center">
                <span className="w-16 font-bold text-slate-405 dark:text-slate-500">Kimden:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">CRM Automation Engine &lt;automation@sirket.com&gt;</span>
              </div>
              <div className="flex items-center">
                <span className="w-16 font-bold text-slate-405 dark:text-slate-500">Kime:</span>
                <span className="text-slate-700 dark:text-slate-200 font-bold">{activeNotificationItem.recipientName} &lt;{activeNotificationItem.recipientEmail}&gt;</span>
              </div>
              <div className="flex items-center">
                <span className="w-16 font-bold text-slate-405 dark:text-slate-500">Konu:</span>
                <span className="text-[#0078D4] dark:text-blue-400 font-black">{activeNotificationItem.subject}</span>
              </div>
              <div className="flex items-center">
                <span className="w-16 font-bold text-slate-405 dark:text-slate-500">Tarih:</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono font-medium">{activeNotificationItem.createdAt}</span>
              </div>
            </div>

            {/* Rendered HTML Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#FAF9F8] dark:bg-black/10 scrollbar-thin">
              <div 
                className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs max-w-full overflow-hidden"
                dangerouslySetInnerHTML={{ __html: activeNotificationItem.bodyHtml }}
              />
            </div>

            {/* Footer actions */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-zinc-900 border-t border-[#EDEBE9] dark:border-[#323130] flex justify-between items-center flex-shrink-0">
              <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-bold">
                * Bu e-posta gerçek SMTP ile gönderilmemiştir. E-posta simülatörüdür.
              </span>
              <button
                type="button"
                onClick={() => setActiveNotificationItem(null)}
                className="px-4 py-2 bg-[#0078D4] hover:bg-[#005a9e] text-white rounded text-xs font-bold transition-all cursor-pointer"
              >
                Kapat
              </button>
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
