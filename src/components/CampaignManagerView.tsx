import React, { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { CrmDb } from "../lib/CrmDb";
import {
  getCampaignTranslation,
  getCampaignStatusLabel,
  getCampaignChannelLabel,
  getCampaignSegmentLabel,
  translateCampaignContent,
  CAMPAIGN_MONTH_KEYS,
  STOCK_IMAGE_NAME_KEYS,
} from "./campaignI18n";
import {
  Calendar as CalendarIcon,
  Compass,
  RefreshCw,
  Key,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Send,
  Trash2,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Eye,
  BookOpen,
  Clock,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Check,
  Plus,
  X,
  AlertCircle,
  HelpCircle,
  Type,
  Mail,
  Users
} from "lucide-react";

// Types
interface LinkedInPost {
  id: string;
  channel: "Gemba Lean" | "Gemba Digital" | "Personal";
  text: string;
  tags: string[];
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  imageUrl: string;
  status: "SCHEDULED" | "POSTED" | "FAILED";
  reactions: number;
  comments: number;
  reposts: number;
}

interface EmailCampaign {
  id: string;
  subject: string;
  body: string;
  targetSegment: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: "SCHEDULED" | "DISPATCHED" | "FAILED";
  clicksCount: number;
  opensCount: number;
}

const STOCK_IMAGES = [
  {
    id: "office",
    name: "Modern HQ Building",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "network",
    name: "Digital Connectivity",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "desk",
    name: "Engineering Workspace",
    url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "collaboration",
    name: "Corporate Workshop",
    url: "https://images.unsplash.com/photo-1531535934027-667f6787dea4?q=80&w=600&auto=format&fit=crop"
  }
];

const INITIAL_POSTS: LinkedInPost[] = [
  {
    id: "post_1",
    channel: "Gemba Lean",
    text: `Kaliteyi bir adım ileriye taşımak istiyorsak, ilk yapmamız gereken "iyi ürün" standartlarını net bir şekilde tanımlamaktır.\n\nÇünkü kalite, son kontrolde değil; proseste üretilir.\n\nPeki, süreçlerimizi güvence altına alan bu şartları sadece dokümanlar üzerinde mi tanımlıyoruz, yoksa sahada gerçekten uygulayabiliyor muşuz?\n\nAsıl başarı; ilk seferde doğru ürünü üreterek müşteri beklentilerini eksiksiz karşılamak ve bunu sürdürülebilir bir memnuniyete dönüştürmektir.\n\nUnutmayalım:\nKaliteyi kontrol etmek sadece bir tespittir; kaliteyi süreçte inşa etmek ise gerçek bir rekabet üstünlüğüdür.`,
    tags: ["leanmanagement", "gemba", "qualityprocess"],
    date: "2026-06-14",
    time: "09:30",
    imageUrl: STOCK_IMAGES[0].url,
    status: "POSTED",
    reactions: 14,
    comments: 1,
    reposts: 2
  },
  {
    id: "post_2",
    channel: "Gemba Digital",
    text: `Manufacturing is undergoing a fundamental shift. Cloud operations, real-time telemetry, and automated shopfloor tracking are no longer premium upgrades—they are essential survivability tools.\n\nAt Gemba Digital, we are preparing a comprehensive playbook on integrating legacy SCADA systems with serverless analytic layers.\n\nStay tuned for the official release next Tuesday!`,
    tags: ["industry40", "digitaltwin", "operationalexcellence"],
    date: "2026-06-20",
    time: "14:00",
    imageUrl: STOCK_IMAGES[1].url,
    status: "SCHEDULED",
    reactions: 0,
    comments: 0,
    reposts: 0
  },
  {
    id: "post_3",
    channel: "Personal",
    text: `Spent the morning auditing a lean logistics center in Prague. The biggest takeaway? Floor clutter is a leading indicator of communication waste. When teams don't trust the replenishment signal, they overcompensate with physical buffer stock.\n\nSimplify the signaling mechanism first, then watch the floor clear out naturally.`,
    tags: ["leadership", "logistics", "supplychain"],
    date: "2026-06-24",
    time: "11:15",
    imageUrl: STOCK_IMAGES[2].url,
    status: "SCHEDULED",
    reactions: 0,
    comments: 0,
    reposts: 0
  }
];

const INITIAL_EMAIL_CAMPAIGNS: EmailCampaign[] = [
  {
    id: "camp_1",
    subject: "Executive Audit Roadmap for {{Company}} Partner Account",
    body: `Dear {{FirstName}},\n\nI hope this message finds you well.\n\nFollowing our brief conversation on digital transformation milestones patterns, I have structured an introductory **Lean SCADA Audit Roadmap** focused specifically on {{Company}}'s logistics framework.\n\nIn our initial review of the {{Industry}} sector, we discovered that implementing floor-level visual signals yields an average 24% reduction in lead-time errors.\n\nWould you have 10 minutes next Thursday at 10 AM to evaluate these audit milestones?\n\nSincerely,\nGemba Consulting Team`,
    targetSegment: "Warm Enterprise Leads",
    date: "2026-06-18",
    time: "09:00",
    status: "SCHEDULED",
    clicksCount: 0,
    opensCount: 0
  },
  {
    id: "camp_2",
    subject: "Weekly Operations Digest: Process Excellence Standardizations",
    body: `Hi {{FirstName}},\n\nQuality is not manufactured in the final QA audit box; quality is integrated into every step of the shopfloor process.\n\nIn this week's Gemba Partner Digest, we investigate: \n- Defining strict standard operating sheets.\n- Standardizing tool arrangements on site.\n- Setting real-time response targets.\n\nWe trust these steps assist your operations at {{Company}}.\n\nBest regards,\nOperations Research Team`,
    targetSegment: "All Contacted Profiles",
    date: "2026-06-12",
    time: "11:00",
    status: "DISPATCHED",
    clicksCount: 8,
    opensCount: 22
  },
  {
    id: "camp_3",
    subject: "Monthly Workshop Invitation - Digital Twin & SCADA Innovations",
    body: `Hello {{FirstName}},\n\nWith {{Company}} leading innovation in {{Industry}} solutions, we would love to invite your engineering squad to our closed-door workshop:\n\n**Topic**: Integrating legacy plant systems with cloud telemetry protocols.\n\nWe hope to see {{Company}} there!\n\nBest,\nGemba Digital Strategy Partner`,
    targetSegment: "Hot Cyber & Ops Leads",
    date: "2026-06-25",
    time: "15:30",
    status: "SCHEDULED",
    clicksCount: 0,
    opensCount: 0
  }
];

interface CampaignManagerViewProps {
  onPushToMailComposer?: (subject: string, body: string) => void;
}

// Organization-scoped keys in the shared CRM auxiliary store (Supabase-backed).
const LINKEDIN_POSTS_KEY = "crm_linkedin_posts";
const EMAIL_CAMPAIGNS_KEY = "crm_email_campaigns";

export default function CampaignManagerView({ onPushToMailComposer }: CampaignManagerViewProps) {
  const { lang, t: globalT } = useLanguage();
  const t = (key: string) => getCampaignTranslation(lang, key) ?? globalT(key) ?? key;
  const formatStatus = (status: string) => getCampaignStatusLabel(t, status);
  const formatChannel = (channel: string) => getCampaignChannelLabel(t, channel);
  const formatSegment = (segment: string) => getCampaignSegmentLabel(t, segment);
  const tc = (entityId: string, field: "subject" | "body" | "text", fallback: string) =>
    translateCampaignContent(t, entityId, field, fallback);
  const monthNames = CAMPAIGN_MONTH_KEYS.map((k) => t(k));
  // Navigation active outreach sub-tab
  const [subTab, setSubTab] = useState<"linkedin" | "email">("linkedin");

  // Custom stylish delete confirmation state
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
    title?: string;
    message?: string;
  }>({ isOpen: false, onConfirm: () => {} });

  // --- LinkedIn States ---
  const [posts, setPosts] = useState<LinkedInPost[]>(() =>
    CrmDb.getKv<LinkedInPost[]>(LINKEDIN_POSTS_KEY, INITIAL_POSTS)
  );
  const [targetChannel, setTargetChannel] = useState<"Gemba Lean" | "Gemba Digital" | "Personal">("Gemba Lean");
  const [postText, setPostText] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [tags, setTags] = useState<string[]>(["leanmanagement", "gemba", "digitalization"]);
  const [scheduleDate, setScheduleDate] = useState("2026-06-16");
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [selectedImage, setSelectedImage] = useState(STOCK_IMAGES[0].url);
  const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [previewLiked, setPreviewLiked] = useState(false);
  const [previewReactionsCount, setPreviewReactionsCount] = useState(14);

  // --- Email States ---
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>(() =>
    CrmDb.getKv<EmailCampaign[]>(EMAIL_CAMPAIGNS_KEY, INITIAL_EMAIL_CAMPAIGNS)
  );
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyText, setEmailBodyText] = useState("");
  const [targetSegment, setTargetSegment] = useState("Warm Enterprise Leads");
  const [emailScheduleDate, setEmailScheduleDate] = useState("2026-06-18");
  const [emailScheduleTime, setEmailScheduleTime] = useState("09:00");
  const [showEditorHelp, setShowEditorHelp] = useState(false);
  const [aiEmailTopic, setAiEmailTopic] = useState("");
  const [aiEmailLoading, setAiEmailLoading] = useState(false);
  const [aiEmailError, setAiEmailError] = useState("");
  const [expandedCampId, setExpandedCampId] = useState<string | null>(null);

  // Common shared indicators
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June


  // --- Save lists to the shared organization CRM store (Supabase-backed) ---
  useEffect(() => {
    CrmDb.setKv(LINKEDIN_POSTS_KEY, posts);
  }, [posts]);

  useEffect(() => {
    CrmDb.setKv(EMAIL_CAMPAIGNS_KEY, campaigns);
  }, [campaigns]);

  // --- Post publishing & Email dispatch automatic checks ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      let changedPosts = false;
      let changedEmails = false;

      // 1. Process LinkedIn Posts Auto-Publish
      const updatedPosts = posts.map(p => {
        if (p.status === "SCHEDULED") {
          const postDateTime = new Date(`${p.date}T${p.time}`);
          if (postDateTime <= now) {
            changedPosts = true;
            return {
              ...p,
              status: "POSTED" as const,
              reactions: Math.floor(Math.random() * 25) + 5,
              comments: Math.floor(Math.random() * 3),
              reposts: Math.floor(Math.random() * 2)
            };
          }
        }
        return p;
      });

      if (changedPosts) {
        setPosts(updatedPosts);
      }

      // 2. Process {t("Email Campaigns")} Auto-Dispatch
      const updatedEmails = campaigns.map(c => {
        if (c.status === "SCHEDULED") {
          const campDateTime = new Date(`${c.date}T${c.time}`);
          if (campDateTime <= now) {
            changedEmails = true;
            return {
              ...c,
              status: "DISPATCHED" as const,
              opensCount: Math.floor(Math.random() * 15) + 5,
              clicksCount: Math.floor(Math.random() * 5)
            };
          }
        }
        return c;
      });

      if (changedEmails) {
        setCampaigns(updatedEmails);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [posts, campaigns]);

  // --- Operational Actions: Seed & Sync ---
  const handleSeedCampaignData = () => {
    if (subTab === "linkedin") {
      setPosts(INITIAL_POSTS);
      setSelectedImage(STOCK_IMAGES[0].url);
      setTags(["leanmanagement", "gemba", "digitalization"]);
      setPostText("");
      setAiTopic("");
    } else {
      setCampaigns(INITIAL_EMAIL_CAMPAIGNS);
      setEmailSubject("");
      setEmailBodyText("");
      setAiEmailTopic("");
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1000);
  };

  const handleConfigureCookies = () => {
    alert(t("Simulation: LinkedIn Auth Cookies successfully authenticated & loaded into Playwright background launcher!"));
  };

  // --- LinkedIn Handler Logics ---
  const handleAddHashtag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = hashtagInput.trim().toLowerCase().replace(/#/g, "");
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
      setHashtagInput("");
    }
  };

  const handleRemoveHashtag = (tagIndex: number) => {
    setTags(tags.filter((_, i) => i !== tagIndex));
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) {
      alert(t("Please write update copy or let Gemini generate it!"));
      return;
    }

    const newPost: LinkedInPost = {
      id: `post_${Date.now()}`,
      channel: targetChannel,
      text: postText,
      tags: [...tags],
      date: scheduleDate,
      time: scheduleTime,
      imageUrl: selectedImage,
      status: "SCHEDULED",
      reactions: 0,
      comments: 0,
      reposts: 0
    };

    setPosts([newPost, ...posts]);
    setPostText("");
    alert(t("Successfully registered LinkedIn update template! Scheduled queue will deploy this to your {channel} page.").replace("{channel}", formatChannel(targetChannel)));
  };

  const handleDeletePost = (id: string) => {
    setPosts(posts.filter(p => p.id !== id));
  };

  const handlePublishNow = (id: string) => {
    setPosts(posts.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: "POSTED" as const,
          reactions: Math.floor(Math.random() * 20) + 10,
          comments: Math.floor(Math.random() * 4),
          reposts: Math.floor(Math.random() * 3)
        };
      }
      return p;
    }));
  };

  // --- Email Handler Logics ---
  const handleInjectTag = (tag: string) => {
    setEmailBodyText(prev => prev + ` {{${tag}}}`);
  };

  const handleInjectTagToSubject = (tag: string) => {
    setEmailSubject(prev => prev + ` {{${tag}}}`);
  };

  const handleEmailCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim()) {
      alert(t("Please state a Subject Line first!"));
      return;
    }
    if (!emailBodyText.trim()) {
      alert(t("Please compose email message copy first!"));
      return;
    }

    const newCampaign: EmailCampaign = {
      id: `camp_${Date.now()}`,
      subject: emailSubject,
      body: emailBodyText,
      targetSegment,
      date: emailScheduleDate,
      time: emailScheduleTime,
      status: "SCHEDULED",
      opensCount: 0,
      clicksCount: 0
    };

    setCampaigns([newCampaign, ...campaigns]);
    setEmailSubject("");
    setEmailBodyText("");
    alert(t("Successfully registered Email Campaign! It has been locked on the dispatch calendar."));
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaigns(campaigns.filter(c => c.id !== id));
  };

  const handleDispatchEmailCampaignNow = (id: string) => {
    setCampaigns(campaigns.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: "DISPATCHED" as const,
          opensCount: Math.floor(Math.random() * 18) + 12,
          clicksCount: Math.floor(Math.random() * 5) + 1
        };
      }
      return c;
    }));
  };

  const handlePushToMailMergeEditor = (subj: string, body: string) => {
    if (onPushToMailComposer) {
      onPushToMailComposer(subj, body);
    } else {
      alert(t("Error: Primary App layout merge callback not bound."));
    }
  };

  // --- Server-side Gemini API Integrator ---
  const handleGeminiAssist = async (action: "write" | "polish") => {
    if (subTab === "linkedin") {
      if (action === "write" && !aiTopic.trim()) {
        setAiError(t("Please type a topic first!"));
        return;
      }
      setAiLoading(true);
      setAiError("");

      try {
        const response = await fetch("/api/gemini/campaign-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            bodyText: postText,
            promptInstruction: action === "write" ? aiTopic : "Make this text sound cleaner for business partners",
            targetChannel,
            tags
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || t("Failed to contact Gemini strategist."));
        }

        const data = await response.json();
        if (data.postText) {
          setPostText(data.postText);
          if (data.suggestedTags && data.suggestedTags.length > 0) {
            setTags(prev => {
              const merged = [...prev];
              data.suggestedTags.forEach((t: string) => {
                const clean = t.toLowerCase().replace(/#/g, "");
                if (!merged.includes(clean)) merged.push(clean);
              });
              return merged;
            });
          }
        }
      } catch (err: any) {
        console.warn("LinkedIn Gemini assist failed, using beautiful local B2B LinkedIn template generator:", err);
        const fallbackPost = t("fallback.linkedin.post");
        setPostText(fallbackPost);
        setTags(["operasyonelmukemmellik", "yalinuretim", "oee", "industrial"]);
      } finally {
        setAiLoading(false);
      }
    } else {
      // Email Campaign AI
      if (action === "write" && !aiEmailTopic.trim()) {
        setAiEmailError(t("Please type an Email Campaign Focus theme first!"));
        return;
      }
      if (action === "polish" && !emailBodyText.trim()) {
        setAiEmailError(t("Draft some initial content or outline in the body first to let Gemini optimize it!"));
        return;
      }

      setAiEmailLoading(true);
      setAiEmailError("");

      try {
        const response = await fetch("/api/gemini/campaign-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            bodyText: `Subject: ${emailSubject}\n\nBody: ${emailBodyText}`,
            promptInstruction: action === "write" 
              ? aiEmailTopic 
              : "Optimize paragraphs layout, formulate stronger CTA",
            targetChannel: "Email Lead Outreach Pipeline",
            tags: ["EmailCampaign"]
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || t("Failed to contact Gemini email strategist."));
        }

        const data = await response.json();
        if (data.postText) {
          const text = data.postText;
          if (text.toLowerCase().includes("subject:")) {
            const lines = text.split("\n");
            const subjectLine = lines.find((l: string) => l.toLowerCase().startsWith("subject:"));
            if (subjectLine) {
              setEmailSubject(subjectLine.replace(/subject:/i, "").trim());
              const bodyLines = lines.filter((l: string) => !l.toLowerCase().startsWith("subject:"));
              setEmailBodyText(bodyLines.join("\n").trim());
            } else {
              setEmailBodyText(text);
            }
          } else {
            setEmailBodyText(text);
          }
        }
      } catch (err: any) {
        console.warn("Email Gemini assist failed, using beautiful local B2B Email Campaign generator:", err);
        const focusTopic = aiEmailTopic.trim() || t("OEE and Scrap Reduction Campaign");
        setEmailSubject(t("{topic} | Factory Efficiency Assessment").replace("{topic}", focusTopic));
        setEmailBodyText(t("fallback.email.body"));
      } finally {
        setAiEmailLoading(false);
      }
    }
  };

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Align to Mon-Sun
  };

  const totalDays = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonthDaysList = [];
  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonthIndex);
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    prevMonthDaysList.push(daysInPrevMonth - i);
  }

  const currentMonthDaysList = [];
  for (let i = 1; i <= totalDays; i++) {
    currentMonthDaysList.push(i);
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Compute common stats based on subTab
  const isEmail = subTab === "email";
  const mainScheduledCount = isEmail 
    ? campaigns.filter(c => c.status === "SCHEDULED").length 
    : posts.filter(p => p.status === "SCHEDULED").length;

  const mainTransmittedCount = isEmail 
    ? campaigns.filter(c => c.status === "DISPATCHED").length 
    : posts.filter(p => p.status === "POSTED").length;

  const mainFailedCount = isEmail 
    ? campaigns.filter(c => c.status === "FAILED").length 
    : posts.filter(p => p.status === "FAILED").length;

  const mainTotalCount = isEmail ? campaigns.length : posts.length;

  return (
    <div className="space-y-6" id="lead-campaign-root">
      
      {/* Dynamic Unified Header with Segment Link Toggle */}
      <div className="bg-white dark:bg-[#1b1a19] p-6 rounded border border-[#EDEBE9] dark:border-[#323130] shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="bg-gradient-to-tr from-[#0078D4] to-indigo-500 p-2.5 rounded text-white shadow self-start sm:self-auto shrink-0 animate-pulse">
            {isEmail ? <Mail className="w-6 h-6" /> : <CalendarIcon className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
              {isEmail ? t("Email Campaign Scheduler") : t("LinkedIn Post Scheduler")}
              <span className="text-[10px] bg-slate-100 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] text-[#0078D4] dark:text-brand-300 px-2.5 py-0.5 rounded font-mono">
                {isEmail ? t("B2B Outreach Matrix") : t("Playwright Automation")}
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-sans mt-1">
              {isEmail 
                ? t("Program and monitor automatic weekly or monthly email template campaigns locked to target dispatches") 
                : t("Professional corporate pipeline scheduler for LinkedIn page and thought leadership accounts")}
            </p>
          </div>
        </div>

        {/* Dynamic Nav Tabs to switch Channel right in the Page Header */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#252423] p-1 rounded border border-[#EDEBE9] dark:border-[#323130] w-fit shrink-0">
          <button
            type="button"
            onClick={() => setSubTab("linkedin")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === "linkedin"
                ? "bg-[#0078D4] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {t("LinkedIn posts")}
          </button>
          
          <button
            type="button"
            onClick={() => setSubTab("email")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === "email"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            {t("Email Campaigns")}
          </button>
        </div>

        {/* Header Action Toolkit */}
        <div className="flex items-center gap-2 self-start xl:self-auto flex-wrap">
          <button
            onClick={handleSeedCampaignData}
            id="campaign-manager-seed-demo"
            className="px-3 py-1.5 rounded bg-[#FAF9F8] dark:bg-[#252423] hover:bg-slate-100 dark:hover:bg-[#323130] text-xs text-slate-700 dark:text-slate-200 border border-[#EDEBE9] dark:border-[#323130] font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm text-[11px]"
            title={t("Seed baseline schedules for selected channel")}
          >
            <Compass className="w-3.5 h-3.5 text-indigo-500" />
{isEmail ? t("Seed Emails") : t("Seed Posts")}
          </button>

          <button
            onClick={handleSync}
            id="campaign-manager-sync"
            className="px-3 py-1.5 rounded bg-[#FAF9F8] dark:bg-[#252423] hover:bg-slate-100 dark:hover:bg-[#323130] text-xs text-slate-700 dark:text-slate-200 border border-[#EDEBE9] dark:border-[#323130] font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm text-[11px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isSyncing ? "animate-spin" : ""}`} />
{t("Sync")}
          </button>

          {!isEmail && (
            <button
              onClick={handleConfigureCookies}
              id="campaign-manager-cookies"
              className="px-3 py-1.5 rounded bg-[#0078D4] hover:bg-[#106ebe] text-xs text-white font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm text-[11px]"
            >
              <Key className="w-3.5 h-3.5" />
{t("Cookies")}
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Stats Indicators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="campaign-stats-banner">
        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{t("Scheduled")}</span>
            <span className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 mt-1 block">
              {mainScheduledCount}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">{t("Lock in Pipeline")}</span>
          </div>
          <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
            <Clock className="w-5 h-5 text-blue-505 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
{isEmail ? t("Dispatched") : t("Posted")}
            </span>
            <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 block">
              {mainTransmittedCount}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">{t("Successfully Sent")}</span>
          </div>
          <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
            <FileCheck className="w-5 h-5 text-emerald-605 dark:text-emerald-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{t("Errors")}</span>
            <span className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-450 mt-1 block">
              {mainFailedCount}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">{t("Logs normal")}</span>
          </div>
          <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900">
            <AlertCircle className="w-5 h-5 text-rose-505 dark:text-rose-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{t("Total Database Rows")}</span>
            <span className="text-xl font-bold tracking-tight text-slate-700 dark:text-slate-300 mt-1 block">
              {mainTotalCount}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">{t("Campaign configurations")}</span>
          </div>
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <FileText className="w-5 h-5 text-slate-505" />
          </div>
        </div>
      </div>

      {/* Main Campaign Editorial Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Editorial Calendar & List View) */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* Calendar visual planning grid */}
          <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className={`w-4.5 h-4.5 ${isEmail ? "text-amber-500" : "text-[#0078D4]"}`} />
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
{t("{month} {year} Outreach Agenda").replace("{month}", monthNames[currentMonth]).replace("{year}", String(currentYear))}
                </span>
              </div>

              {/* Month Selector controls */}
              <div className="flex gap-1 bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-0.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-[#323130] text-slate-600 dark:text-slate-300 rounded transition cursor-pointer"
                  title={t("Previous Month")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setCurrentMonth(today.getMonth());
                    setCurrentYear(today.getFullYear());
                  }}
                  className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-[#323130] text-[10px] uppercase font-bold text-slate-500 dark:text-slate-405 rounded transition cursor-pointer"
                >
{t("Today")}
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-[#323130] text-slate-600 dark:text-slate-300 rounded transition cursor-pointer"
                  title={t("Next Month")}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-slate-505 mb-2 uppercase tracking-wide font-mono">
              <div>{t("Mon")}</div>
              <div>{t("Tue")}</div>
              <div>{t("Wed")}</div>
              <div>{t("Thu")}</div>
              <div>{t("Fri")}</div>
              <div>{t("Sat")}</div>
              <div>{t("Sun")}</div>
            </div>

            {/* Calendar Days Slots */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Padding days from previous month */}
              {prevMonthDaysList.map((day, idx) => (
                <div
                  key={`prev-${idx}`}
                  className="min-h-[50px] border border-transparent rounded bg-slate-50/50 dark:bg-slate-900/10 p-1 flex flex-col justify-between opacity-30 select-none"
                >
                  <span className="text-[10px] font-bold font-mono text-slate-400">{day}</span>
                </div>
              ))}

              {/* Days of current month */}
              {currentMonthDaysList.map((day) => {
                const formattedDay = String(day).padStart(2, "0");
                const formattedMonth = String(currentMonth + 1).padStart(2, "0");
                const dateKey = `${currentYear}-${formattedMonth}-${formattedDay}`;

                return (
                  <div
                    key={`day-${day}`}
                    className={`min-h-[60px] border rounded p-1 flex flex-col justify-between transition-all relative group bg-white dark:bg-[#252423]/30 hover:bg-slate-50 dark:hover:bg-[#323130]/40 ${
                      (isEmail && dateKey === "2026-06-18") || (!isEmail && dateKey === "2026-06-16")
                        ? "border-[#0078D4] bg-blue-50/10 dark:bg-blue-950/5 ring-1 ring-[#0078D4]/20"
                        : "border-[#EDEBE9] dark:border-[#323130]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold font-mono ${
                        (isEmail && dateKey === "2026-06-18") || (!isEmail && dateKey === "2026-06-16")
                          ? "text-[#0078D4] dark:text-brand-300 scale-105 font-black"
                          : "text-slate-550 dark:text-slate-400"
                      }`}>
                        {day}
                      </span>
                      
                      {/* Interactive fast addition icon */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isEmail) {
                            setEmailScheduleDate(dateKey);
                          } else {
                            setScheduleDate(dateKey);
                          }
                        }}
                        className="text-[#0078D4] dark:text-brand-350 opacity-0 group-hover:opacity-100 transition absolute right-1 top-1 p-0.5 hover:bg-slate-100 dark:hover:bg-[#252423] rounded cursor-pointer"
                        title={t("Set as Target Dispatch Date")}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Miniature scheduled indicators inside Calendar boxes */}
                    <div className="space-y-0.5 mt-1 overflow-hidden">
                      {isEmail ? (
                        // Email schedules rendering on calendar
                        campaigns.filter(c => c.date === dateKey).map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setEmailSubject(c.subject);
                              setEmailBodyText(c.body);
                              setTargetSegment(c.targetSegment);
                              setEmailScheduleDate(c.date);
                              setEmailScheduleTime(c.time);
                            }}
                            className={`text-[8px] truncate px-1 py-0.5 rounded font-sans font-semibold border transition-all cursor-pointer ${
                              c.status === "DISPATCHED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : "bg-amber-50 text-amber-850 border-amber-100 dark:bg-amber-955/20 dark:text-amber-400"
                            }`}
                            title={`[${formatSegment(c.targetSegment)}] ${tc(c.id, "subject", c.subject)}`}
                          >
                            📧 {tc(c.id, "subject", c.subject).substring(0, 10)}...
                          </div>
                        ))
                      ) : (
                        // {t("LinkedIn posts")} rendering on calendar
                        posts.filter(p => p.date === dateKey).map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setTargetChannel(p.channel);
                              setPostText(p.text);
                              setSelectedImage(p.imageUrl);
                              setTags(p.tags);
                              setScheduleDate(p.date);
                              setScheduleTime(p.time);
                            }}
                            className={`text-[8px] truncate px-1 py-0.5 rounded font-sans font-semibold border transition-all cursor-pointer ${
                              p.status === "POSTED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-405"
                                : "bg-blue-50 text-[#0078D4] border-blue-100 dark:bg-blue-950/20 dark:text-brand-300"
                            }`}
                            title={`[${formatChannel(p.channel)}] ${tc(p.id, "text", p.text)}`}
                          >
                            🔗 {p.channel.split(" ")[1] || p.channel}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Color key legend */}
            <div className="mt-4 pt-3 border-t border-[#EDEBE9] dark:border-[#323130] flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-mono text-slate-400 dark:text-slate-505">
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded block ${isEmail ? "bg-amber-500" : "bg-blue-500"}`}></span>
                <span>{t("Active Scheduled Outreach")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 block"></span>
                <span>{t("Dispatched Outreach")}</span>
              </div>
            </div>
          </div>

          {/* Chronological Pipeline Queue List */}
          <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#EDEBE9] dark:border-[#323130] pb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <ListOrdered className={`w-4 h-4 ${isEmail ? "text-amber-500" : "text-[#0078D4]"}`} />
                <span>
                  {isEmail ? t("Scheduled Email Pipeline Queue") : t("Chronological Post Pipeline Queue")}
                </span>
              </h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-550 font-mono">
                {isEmail ? campaigns.length : posts.length} {t("Campaigns Active")}
              </span>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {isEmail ? (
                // Email Campaign Pipeline Queue
                campaigns.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
{t("No active email campaigns listed on the pipeline roster.")} {t('Select "Seed Emails" to draft weekly layouts instantly.')}
                  </div>
                ) : (
                  campaigns.map(c => {
                    const isExpanded = expandedCampId === c.id;
                    const wordCount = c.body.split(/\s+/).filter(Boolean).length;
                    const charCount = c.body.length;
                    const readTime = Math.max(1, Math.ceil(wordCount / 200));
                    const detectedTags = Array.from(new Set(c.body.match(/{{[a-zA-Z0-9_]+}}/g) || []));

                    return (
                      <div
                        key={c.id}
                        className={`rounded border transition-all overflow-hidden flex flex-col ${
                          c.status === "DISPATCHED"
                            ? "bg-slate-50/50 dark:bg-slate-900/10 border-[#EDEBE9] dark:border-[#323130]"
                            : "bg-white dark:bg-[#252423]/25 border-amber-500/20 shadow-sm hover:border-amber-500/40"
                        }`}
                        id={`campaign-card-${c.id}`}
                      >
                        {/* Main Summary Header block */}
                        <div 
                          onClick={() => setExpandedCampId(isExpanded ? null : c.id)}
                          className="p-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#323130]/30 transition-all select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-amber-600 flex-shrink-0">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                                  {tc(c.id, "subject", c.subject)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-[#EDEBE9] dark:border-[#323130]">
{t("Target:")} {formatSegment(c.targetSegment)}
                                </span>
                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                                  c.status === "DISPATCHED"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/10"
                                    : "bg-amber-50 text-amber-800 border-amber-100"
                                }`}>
{formatStatus(c.status)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 italic font-sans">
                                {tc(c.id, "body", c.body)}
                              </p>
                            </div>
                          </div>

                          {/* Quick Stats or Actions Indicator */}
                          <div className="flex items-center gap-2 shrink-0">
                            {c.status === "DISPATCHED" && (
                              <div className="hidden sm:flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-450 font-mono font-bold bg-emerald-50/60 dark:bg-emerald-950/10 px-2 py-0.5 rounded border border-emerald-105">
<span>{t("📧 {count} Opens").replace("{count}", String(c.opensCount))}</span>
                                <span>•</span>
<span>{t("🔗 {count} Clicks").replace("{count}", String(c.clicksCount))}</span>
                              </div>
                            )}
                            <div className="text-slate-450 hover:text-slate-700 dark:hover:text-slate-300 transition-all flex items-center gap-1">
                              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-[#0078D4] dark:text-brand-300 mr-1">
{isExpanded ? t("Collapse") : t("Expand details")}
                              </span>
                              <ChevronRight className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isExpanded ? "rotate-90 text-[#0078D4] dark:text-brand-350" : ""}`} />
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Details Panel */}
                        {isExpanded && (
                          <div className="border-t border-[#EDEBE9] dark:border-[#323130] bg-[#FAF9F8] dark:bg-[#1f1e1d] p-4 space-y-4 text-xs">
                            
                            {/* Metadata Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="bg-white dark:bg-[#252423] p-2.5 rounded border border-[#EDEBE9] dark:border-[#323130]">
                                <span className="text-[9px] uppercase tracking-wide font-bold text-slate-400 block">{t("Planned Target Segment")}</span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-205 mt-1 block truncate" title={c.targetSegment}>
{formatSegment(c.targetSegment)}
                                </span>
                              </div>
                              <div className="bg-white dark:bg-[#252423] p-2.5 rounded border border-[#EDEBE9] dark:border-[#323130]">
                                <span className="text-[9px] uppercase tracking-wide font-bold text-slate-400 block">{t("Dispatch Calendar Window")}</span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-205 mt-1 block flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
{t("{date} at {time}").replace("{date}", c.date).replace("{time}", c.time)}
                                </span>
                              </div>
                              <div className="bg-white dark:bg-[#252423] p-2.5 rounded border border-[#EDEBE9] dark:border-[#323130]">
                                <span className="text-[9px] uppercase tracking-wide font-bold text-slate-400 block">{t("Template Statistics")}</span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-205 mt-1 block">
{t("{words} Words • {chars} Chars • ~{minutes} Min read").replace("{words}", String(wordCount)).replace("{chars}", String(charCount)).replace("{minutes}", String(readTime))}
                                </span>
                              </div>
                              <div className="bg-white dark:bg-[#252423] p-2.5 rounded border border-[#EDEBE9] dark:border-[#323130]">
                                <span className="text-[9px] uppercase tracking-wide font-bold text-slate-400 block">{t("Detected Fields (Tags)")}</span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-205 mt-1 block truncate">
                                  {detectedTags.length > 0 ? (
                                    <span className="flex flex-wrap gap-1">
                                      {detectedTags.map((tag, i) => (
                                        <span key={i} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-405 text-[8px] px-1 rounded font-mono">
                                          {tag}
                                        </span>
                                      ))}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">{t("None detected")}</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Live Interactive Preview Box */}
                            <div className="space-y-2">
                              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wide block">{t("Email Mailmerge Blueprint Preview:")}</span>
                              <div className="bg-white dark:bg-[#111] border border-[#EDEBE9] dark:border-[#323130] rounded p-4 font-sans space-y-3 shadow-inner max-h-[220px] overflow-y-auto">
                                <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
<span className="text-slate-400 font-mono text-[10px] uppercase block">{t("Subject Line")}</span>
                                  <h4 className="text-xs font-bold text-slate-850 dark:text-slate-150 truncate mt-0.5">
                                    {tc(c.id, "subject", c.subject)}
                                  </h4>
                                </div>
                                <span className="text-slate-400 font-mono text-[10px] uppercase block">{t("Body Template Payload")}</span>
                                <p className="text-xs text-slate-700 dark:text-slate-350 font-sans whitespace-pre-line leading-relaxed">
                                  {tc(c.id, "body", c.body)}
                                </p>
                              </div>
                            </div>

                            {/* Contextual Actions Panel inside Card details */}
                            <div className="flex items-center justify-between gap-4 flex-wrap pt-2 border-t border-[#EDEBE9] dark:border-[#323130]">
                              {/* Left Analytics side if already sent */}
                              {c.status === "DISPATCHED" ? (
                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                                  <span className="bg-emerald-100 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded font-bold">
{t("Simulated Delivery Stats Logged")}
                                  </span>
<span>{t("Opens:")} {c.opensCount}</span>
                                  <span>•</span>
<span>{t("Clicks:")} {c.clicksCount}</span>
                                </div>
                              ) : (
                                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
<span>{t("Pending on Local Automation Calendar. Status is SCHEDULED")}</span>
                                </div>
                              )}

                              {/* Right Interactive operations */}
                              <div className="flex items-center gap-2 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => handlePushToMailMergeEditor(c.subject, c.body)}
                                  className="px-3 py-1.5 bg-white hover:bg-amber-500 hover:text-white dark:bg-[#252423] dark:hover:bg-amber-600 text-slate-705 dark:text-slate-205 border border-[#EDEBE9] dark:border-[#323130] rounded cursor-pointer text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
title={t("Push template contents directly into composer workspace")}
                                >
                                  <Send className="w-3.5 h-3.5" />
<span>{t("Send to Composer")}</span>
                                </button>

                                {c.status === "SCHEDULED" && (
                                  <button
                                    type="button"
                                    onClick={() => handleDispatchEmailCampaignNow(c.id)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
title={t("Manually release locked pipeline template draft for immediate custom batch processing")}
                                  >
                                    <FileCheck className="w-3.5 h-3.5" />
<span>{t("Dispatch Now")}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmDeleteModal({
                                      isOpen: true,
                                      title: t("Delete Campaign"),
                                      message: t("Move to recycle bin?"),
                                      onConfirm: () => {
                                        handleDeleteCampaign(c.id);
                                      }
                                    });
                                  }}
                                  className="p-1.5 bg-rose-50 dark:bg-rose-950/10 hover:bg-rose-600 hover:text-white border border-rose-200 dark:border-rose-900 rounded cursor-pointer text-xs text-rose-600 transition shadow-sm"
title={t("Cancel and wipe scheduled item")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                // LinkedIn Campaign Pipeline Queue
                posts.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
{t('No active post structures. Click "Seed Posts" above to load beautiful template pipelines.')}
                  </div>
                ) : (
                  posts.map(p => (
                    <div
                      key={p.id}
                      className={`p-3.5 rounded border transition-all flex items-center justify-between gap-4 ${
                        p.status === "POSTED"
                          ? "bg-slate-50/50 dark:bg-slate-900/10 border-[#EDEBE9] dark:border-[#323130]"
                          : "bg-white dark:bg-[#252423]/25 border-[#0078D4]/20 shadow-sm hover:border-[#0078D4]/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={p.imageUrl}
alt={t("Media Connection")}
                          className="w-10 h-10 rounded object-cover shadow-sm flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-205">
{t("{channel} Post").replace("{channel}", formatChannel(p.channel))}
                            </span>
                            <span className="text-[9px] font-mono text-slate-450">
{t("ID:")} {p.id.substring(5, 12)}
                            </span>
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                              p.status === "POSTED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-blue-50 text-blue-700 border-blue-100"
                            }`}>
{formatStatus(p.status)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-650 dark:text-slate-350 mt-1 line-clamp-1 whitespace-pre-line font-sans">
                            {tc(p.id, "text", p.text)}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-450 dark:text-slate-500 font-mono">
                            <Clock className="w-3.5 h-3.5" />
<span>{t("Dispatch: {date} at {time}").replace("{date}", p.date).replace("{time}", p.time)}</span>
                            {p.status === "POSTED" && (
                              <span className="text-slate-400">
• {t("👍 {count} Likes • {comments} Comments").replace("{count}", String(p.reactions)).replace("{comments}", String(p.comments))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* LinkedIn Queue actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {p.status === "SCHEDULED" && (
                          <button
                            type="button"
                            onClick={() => handlePublishNow(p.id)}
                            className="p-1.5 bg-[#FAF9F8] hover:bg-emerald-600 hover:text-white dark:bg-[#252423] dark:hover:bg-emerald-700 text-slate-500 border border-[#EDEBE9] dark:border-[#323130] rounded cursor-pointer transition shadow-sm"
title={t("Publish Update Immediately")}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePost(p.id)}
                          className="p-1.5 bg-[#FAF9F8] hover:bg-rose-600 hover:text-white dark:bg-[#252423] dark:hover:bg-rose-700 text-slate-550 border border-[#EDEBE9] dark:border-[#323130] rounded cursor-pointer transition shadow-sm"
title={t("Delete Post")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </section>

        {/* Right Column (Draft Composers & Assistants) */}
        <section className="lg:col-span-5 space-y-6">
          
          {isEmail ? (
            // ==========================================
            // DRAFT EMAIL COMPOSER (Email Scheduler Mode)
            // ==========================================
            <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm space-y-4" id="email-draft-composer">
              <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#323130] pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-500" />
<span>{t("Draft Email Composer Card")}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">{t("Write high-conversion B2B partnership templates")}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditorHelp(!showEditorHelp)}
                  className="text-[10px] text-amber-650 hover:underline flex items-center gap-1 font-bold focus:outline-none cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
{t("Guide")}
                </button>
              </div>

              {showEditorHelp && (
                <div className="p-3 bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded text-[10px] text-slate-705 dark:text-slate-300 leading-relaxed space-y-2">
                  <div>
<strong>{t("Supported HTML formatting rules:")}</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-400 font-mono text-[9px]">
<li><code>&lt;b&gt;{t("bold text")}&lt;/b&gt;</code> {t("for emphasis weight")}</li>
<li><code>&lt;i&gt;{t("italicized text")}&lt;/i&gt;</code> {t("for highlights")}</li>
<li><code>&lt;p&gt;{t("new paragraph spacing")}&lt;/p&gt;</code></li>
                    </ul>
                  </div>
                  <div>
<strong>{t("Supported Merge Tag Keys:")}</strong>
                    <p className="mt-1 text-slate-400 leading-normal">
{t("Insert variables standard syntax exactly surrounded by double braces (e.g. {{FirstName}}). Standard properties map to spreadsheet lines.")}
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleEmailCampaignSubmit} className="space-y-4 text-xs">
                {/* Recipient Segment Dropdown */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
{t("Recipient Group Segment")}
                  </label>
                  <select
                    value={targetSegment}
                    onChange={e => setTargetSegment(e.target.value)}
                    className="w-full bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                  >
<option value="Warm Enterprise Leads">{t("Warm Enterprise Leads")}</option>
<option value="Hot Cyber & Ops Leads">{t("Hot Cyber & Ops Leads")}</option>
<option value="All Contacted Profiles">{t("All Contacted Profiles")}</option>
<option value="Standard Audit Targets">{t("Standard Audit Targets")}</option>
                  </select>
                </div>

                {/* Email Subject line */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
<label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("Subject Line")}</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleInjectTagToSubject("Company")}
                        className="text-[9px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200/50 cursor-pointer"
                      >
                        +{t("Company")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInjectTagToSubject("FirstName")}
                        className="text-[9px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-955/20 px-1.5 py-0.5 rounded border border-amber-200/50 cursor-pointer"
                      >
                        +{t("First Name")}
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    required
placeholder={t("e.g. Action Plan details for {{Company}} logistics")}
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="w-full text-xs border border-[#EDEBE9] dark:border-[#323130] rounded px-3 py-2.5 bg-[#FAF9F8] dark:bg-[#11100f] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Merge Tag interactive parameters */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
{t("Parameter Chips (Click to Inject):")}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {["FirstName", "LastName", "Company", "Department", "Industry", "RequestedService"].map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleInjectTag(tag)}
                        className="text-[9px] font-bold bg-amber-50/70 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 border border-amber-200/40 rounded px-2 py-1 transition-all cursor-pointer flex items-center gap-0.5"
                      >
                        <Type className="w-2.5 h-2.5" />
                        {"{{"} {tag} {"}}"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rich Body composing */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
{t("Email Message Body Copy")}
                  </label>
                  <textarea
                    rows={8}
                    required
placeholder={t("Compose structured business template strategy. Embed merge indicators such as {{FirstName}} and {{Company}} naturally...")}
                    value={emailBodyText}
                    onChange={e => setEmailBodyText(e.target.value)}
                    className="w-full bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed font-mono"
                  />
                </div>

                {/* Scheduling criteria: Target Dispatch */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
{t("Schedule Date (Target Dispatch)")}
                    </label>
                    <input
                      type="date"
                      required
                      value={emailScheduleDate}
                      onChange={e => setEmailScheduleDate(e.target.value)}
                      className="w-full bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
{t("Dispatch Time Target")}
                    </label>
                    <input
                      type="time"
                      required
                      value={emailScheduleTime}
                      onChange={e => setEmailScheduleTime(e.target.value)}
                      className="w-full bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Save to Roster list */}
                  <button
                    type="submit"
                    className="w-full bg-[#FAF9F8] hover:bg-slate-100 dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-800 dark:text-slate-203 border border-[#EDEBE9] dark:border-[#323130] font-bold py-2 rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-xs transition h-9"
                  >
                    <CalendarIcon className="w-4 h-4 text-amber-500" />
<span>{t("Lock in Calendar")}</span>
                  </button>

                  {/* Transmit to primary Mail merge editor */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!emailSubject.trim() || !emailBodyText.trim()) {
                        alert(t("Compose both Subject and Body copy first!"));
                        return;
                      }
                      handlePushToMailMergeEditor(emailSubject, emailBodyText);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-xs transition-colors h-9"
                  >
                    <Send className="w-4 h-4 animate-pulse" />
<span>{t("Transmit to Mail Merge")}</span>
                  </button>
                </div>
              </form>

              {/* Server-side Gemini B2B pitch assistant */}
              <div className="border-t border-[#EDEBE9] dark:border-[#323130] pt-4 mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
<span>{t("Gemini B2B Email Coprighter")}</span>
                  </h4>
                  <span className="text-[9px] text-slate-405 font-mono">
{t("gemini-3.5-flash server-side")}
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
placeholder={t("E.g. Inviting CEO to Prague site audit")}
                    value={aiEmailTopic}
                    onChange={e => setAiEmailTopic(e.target.value)}
                    className="w-full bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />

                  {aiEmailError && (
                    <div className="text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-955/15 p-2 rounded flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{aiEmailError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={aiEmailLoading}
                      onClick={() => handleGeminiAssist("write")}
                      className="px-2 py-1.5 bg-[#FAF9F8] hover:bg-slate-100 dark:bg-[#252423] dark:hover:bg-[#323130] border border-[#EDEBE9] dark:border-[#323130] text-slate-700 dark:text-slate-350 hover:text-slate-900 rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 text-[10px]"
                    >
                      {aiEmailLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
<span>{t("Scribing...")}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
<span>{t("Draft Pitch Email")}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={aiEmailLoading}
                      onClick={() => handleGeminiAssist("polish")}
                      className="px-2 py-1.5 bg-[#FAF9F8] hover:bg-slate-100 dark:bg-[#252423] dark:hover:bg-[#323130] border border-[#EDEBE9] dark:border-[#323130] text-slate-700 dark:text-slate-350 hover:text-slate-900 rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 text-[10px]"
                    >
                      {aiEmailLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
<span>{t("Polishing...")}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
<span>{t("Optimize Draft")}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // ==========================================
            // DRAFT LINKEDIN COMPOSER (Original Mode)
            // ==========================================
            <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm space-y-4" id="post-editor-form">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-[#EDEBE9] dark:border-[#323130] pb-2">
                <FileText className="w-4 h-4 text-[#0078D4]" />
<span>{t("Draft LinkedIn Post Card")}</span>
              </h3>

              <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
                {/* Target Channel option list */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-505 mb-1.5">
{t("Target Channel Account")}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Channel Buttons */}
                    {["Gemba Lean", "Gemba Digital", "Personal"].map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setTargetChannel(ch as any)}
                        className={`p-2 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          targetChannel === ch
                            ? "border-[#0078D4] bg-blue-55/15 ring-1 ring-[#0078D4]/20"
                            : "border-[#EDEBE9] dark:border-[#323130] bg-[#faf9f8] dark:bg-[#252423] text-slate-600 dark:text-slate-400 hover:bg-slate-100/50"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            ch === "Gemba Lean" ? "bg-indigo-100 text-indigo-700" : ch === "Gemba Digital" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {ch.substring(0, 1)}
                          </div>
<span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{formatChannel(ch)}</span>
                        </div>
                        <span className="text-[8px] text-slate-405 font-mono">
{ch === "Personal" ? t("Profile") : t("Page")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Share Update text drafting */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
{t("Share Update Copy Text")}
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
{t("{count} / 3000 chars").replace("{count}", String(postText.length))}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
placeholder={t("Write your LinkedIn copy or utilize the Gemini Assistant below to compose a structured leadership summary...")}
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    className="w-full bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0078D4] transition leading-relaxed placeholder:text-slate-400"
                  />
                </div>

                {/* Hashtag Chest input */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
{t("Hashtags Pill Chest")}
                  </label>
                  <div className="flex flex-wrap gap-1 mb-2 bg-[#FAF9F8] dark:bg-[#252423] p-2 rounded border border-[#EDEBE9] dark:border-[#323130] min-h-[36px]">
                    {tags.length === 0 ? (
                      <span className="text-[10px] text-slate-400 italic">{t("No hashtags loaded")}</span>
                    ) : (
                      tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-50/70 border border-blue-100/50 text-blue-700 font-mono text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 dark:bg-blue-950/20 dark:text-brand-300"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveHashtag(idx)}
                            className="hover:text-rose-650 text-xs shrink-0 font-sans cursor-pointer focus:outline-none"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
placeholder={t("Add custom tag (e.g. operationalexcellence)")}
                      value={hashtagInput}
                      onChange={e => setHashtagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const cleanTag = hashtagInput.trim().toLowerCase().replace(/#/g, "");
                          if (cleanTag && !tags.includes(cleanTag)) {
                            setTags([...tags, cleanTag]);
                            setHashtagInput("");
                          }
                        }
                      }}
                      className="flex-1 bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cleanTag = hashtagInput.trim().toLowerCase().replace(/#/g, "");
                        if (cleanTag && !tags.includes(cleanTag)) {
                          setTags([...tags, cleanTag]);
                          setHashtagInput("");
                        }
                      }}
                      className="px-3 bg-[#FAF9F8] hover:bg-slate-100 dark:bg-[#252423] dark:hover:bg-[#323130] border border-[#EDEBE9] dark:border-[#323130] rounded text-slate-705 dark:text-slate-200 transition font-semibold cursor-pointer"
                    >
{t("Add")}
                    </button>
                  </div>
                </div>

                {/* Date and Time selectors */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-505 mb-1">
{t("Schedule Date")}
                    </label>
                    <input
                      type="date"
                      required
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="w-full bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-505 mb-1">
{t("Target Dispatch Time")}
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="w-full bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0078D4]"
                    />
                  </div>
                </div>

                {/* Post Media Picker */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5">
{t("Post Media Stock Photo")}
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {STOCK_IMAGES.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setSelectedImage(img.url)}
                        className={`relative rounded aspect-video overflow-hidden border transition-all cursor-pointer ${
                          selectedImage === img.url
                            ? "ring-2 ring-[#0078D4] border-transparent"
                            : "border-[#EDEBE9] dark:border-[#323130] opacity-70 hover:opacity-100"
                        }`}
title={t(STOCK_IMAGE_NAME_KEYS[img.id] || img.name)}
                      >
<img src={img.url} alt={t(STOCK_IMAGE_NAME_KEYS[img.id] || img.name)} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 flex items-end p-1">
                          <span className="text-[8px] text-white truncate w-full font-sans bg-black/30 px-1 rounded">
{t(STOCK_IMAGE_NAME_KEYS[img.id]?.split(" ")[0] || img.name.split(" ")[0])}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="border border-dashed border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 bg-[#FAF9F8]/45 dark:bg-[#252423]/10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#FAF9F8] dark:bg-[#252423] rounded text-slate-550">
                        <ImageIcon className="w-4 h-4 text-[#0078D4]" />
                      </div>
                      <div className="text-left font-sans">
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-350 block leading-tight">{t("Select your own media")}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{t("Max size: 5MB")}</span>
                      </div>
                    </div>
                    <label className="cursor-pointer bg-[#FAF9F8] hover:bg-slate-100 dark:bg-[#252423] dark:hover:bg-[#323130] border border-[#EDEBE9] dark:border-[#323130] px-2.5 py-1.5 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300 transition shadow-sm">
{t("Browse")}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === "string") {
                                setSelectedImage(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Submit Schedule action */}
                <button
                  type="submit"
                  className="w-full bg-[#0078D4] hover:bg-[#106ebe] text-white font-bold py-2 rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-xs transition-colors h-9"
                >
                  <CalendarIcon className="w-4 h-4" />
<span>{t("Lock In Schedule on Calendar")}</span>
                </button>
              </form>

              {/* Gemini AI assist block */}
              <div className="border-t border-[#EDEBE9] dark:border-[#323130] pt-4 mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-805 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
<span>{t("Gemini AI Strategy Assistant")}</span>
                  </h4>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {t("gemini-3.5-flash server-side")}
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
placeholder={t("Enter custom post topic (e.g. Digitizing Gemba board values)")}
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    className="w-full bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded px-2.5 py-1.5 text-xs text-slate-805 dark:text-slate-200 focus:outline-none"
                  />

                  {aiError && (
                    <div className="text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-2 rounded flex items-start gap-1 pb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={() => handleGeminiAssist("write")}
                      className="px-2 py-1.5 bg-[#FAF9F8] hover:bg-slate-100 dark:bg-[#252423] dark:hover:bg-[#323130] border border-[#EDEBE9] dark:border-[#323130] text-slate-705 dark:text-slate-350 hover:text-slate-900 rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 text-[10px]"
                    >
                      {aiLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{t("Scribing...")}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
<span>{t("Write Post Draft")}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={() => handleGeminiAssist("polish")}
                      className="px-2 py-1.5 bg-[#FAF9F8] hover:bg-slate-100 dark:bg-[#252423] dark:hover:bg-[#323130] border border-[#EDEBE9] dark:border-[#323130] text-slate-705 dark:text-slate-350 hover:text-slate-900 rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 text-[10px]"
                    >
                      {aiLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{t("Polishing...")}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
<span>{t("Polish Current Draft")}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isEmail ? (
            // Email Guidelines Display
            <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm text-left space-y-3">
              <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-emerald-500" />
<span>{t("Campaign Manager Directives")}</span>
              </h4>
              <div className="text-[11px] text-slate-550 space-y-2.5 leading-relaxed font-sans">
                <div className="flex gap-2">
                  <span className="p-1 rounded bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] font-bold font-mono text-amber-600 dark:text-amber-400 text-[10px] shrink-0 h-fit leading-none">
                    1
                  </span>
                  <p>
                    <strong>{t("Variables Native Translation")}</strong>: {t("Write standard variables inside double brackets such as {{FirstName}} and {{Company}}. These fields map perfectly to imported mail-merge lists.")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="p-1 rounded bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] font-bold font-mono text-amber-600 dark:text-amber-400 text-[10px] shrink-0 h-fit leading-none">
                    2
                  </span>
                  <p>
                    <strong>{t("Omni-channel synchronization")}</strong>: {t("Any draft created under Email Campaigns can be instantly locked with a schedule OR pushed directly to the Mail Merge Builder.")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // LinkedIn Preview & Guidelines
            <>
              {/* Social feed live preview workspace */}
              <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-205 flex items-center gap-1.5 uppercase tracking-wider">
                  <Eye className="w-4 h-4 text-blue-500" />
<span>{t("Live LinkedIn Feed Preview")}</span>
                </h4>

                {/* LinkedIn-style visual simulator card */}
                <div className="bg-white text-slate-900 rounded-xl border border-slate-200 shadow overflow-hidden text-left max-w-sm mx-auto font-sans">
                  <div className="p-3 pb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-slate-700">
                        {targetChannel === "Gemba Lean" ? "GL" : targetChannel === "Gemba Digital" ? "GD" : "P"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold hover:text-blue-700 hover:underline cursor-pointer block leading-none">
                            {targetChannel === "Gemba Lean"
? t("Gemba Partner Lean Management")
                              : targetChannel === "Gemba Digital"
? t("Gemba Digital Operational Tech")
: t("Dr. Sofia Vargas (Personal)")}
                          </span>
<span className="text-[10px] text-slate-400 font-mono">• {t("1st")}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 line-clamp-1 leading-normal mt-0.5">
                          {targetChannel === "Gemba Lean"
? t("B2B Consulting & Lean Process Excellence Partner")
                            : targetChannel === "Gemba Digital"
? t("Industrial IoT & SCADA Automation Integrators")
: t("Principal Consultant at Gemba Advisory Prague")}
                        </span>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5">
                          <span className="font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded font-sans">{t("Scheduled")}</span>
                          <span>•</span>
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
<span className="font-mono">{t("{date} at {time}").replace("{date}", scheduleDate).replace("{time}", scheduleTime)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feed Text content */}
                  <div className="px-3 py-1 space-y-2 text-xs">
                    <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                      {postText.trim() === ""
                        ? t("This is where your live LinkedIn copy will appear. Start drafting manually or query our Gemini Assistant to outline content.")
                        : (() => {
                            const matchedPost = posts.find(
                              (p) => p.text === postText || tc(p.id, "text", p.text) === postText
                            );
                            return matchedPost ? tc(matchedPost.id, "text", matchedPost.text) : postText;
                          })()}
                    </p>
                    <p className="font-semibold text-blue-700 flex flex-wrap gap-x-1.5 gap-y-0.5 font-mono text-[10px]">
                      {tags.map((tag, idx) => (
                        <span key={idx} className="hover:underline cursor-pointer">#{tag}</span>
                      ))}
                    </p>
                  </div>

                  {/* Selected Photo visual block */}
                  {selectedImage && (
                    <div className="mt-2 aspect-video bg-slate-100 overflow-hidden border-y border-slate-100">
<img src={selectedImage} alt={t("Post Attachment")} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Social actions bar */}
                  <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-150 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="bg-blue-100 text-[#0078D4] p-0.5 rounded-full text-[8px] font-bold">👍</span>
<span>{previewReactionsCount} {t("Reactions")}</span>
                    </div>
<span>{t("1 Comment • {count} Reposts").replace("{count}", targetChannel === "Gemba Lean" ? "2" : "0")}</span>
                  </div>

                  <div className="px-1 py-1 grid grid-cols-4 gap-0.5 text-slate-500 text-[10px] font-semibold text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewLiked(!previewLiked);
                        setPreviewReactionsCount(prev => previewLiked ? prev - 1 : prev + 1);
                      }}
                      className={`py-1.5 hover:bg-slate-55 rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        previewLiked ? "text-blue-600" : ""
                      }`}
                    >
<ThumbsUp className="w-3.5 h-3.5" /> {t("Like")}
                    </button>
                    <button type="button" className="py-1.5 hover:bg-slate-50 rounded flex items-center justify-center gap-1 transition-all cursor-pointer">
<MessageSquare className="w-3.5 h-3.5" /> {t("Comment")}
                    </button>
                    <button type="button" className="py-1.5 hover:bg-slate-50 rounded flex items-center justify-center gap-1 transition-all cursor-pointer">
<Repeat2 className="w-3.5 h-3.5" /> {t("Repost")}
                    </button>
                    <button type="button" className="py-1.5 hover:bg-slate-50 rounded flex items-center justify-center gap-1 transition-all cursor-pointer">
<Send className="w-3.5 h-3.5" /> {t("Send")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Scheduler Guidelines card block */}
              <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-5 shadow-sm text-left space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
<span>{t("Scheduler System Directives")}</span>
                </h4>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-2.5 leading-relaxed font-sans">
                  <div className="flex gap-2">
                    <span className="p-1 rounded bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] font-bold font-mono text-[#0078D4] dark:text-brand-300 text-[10px] shrink-0 h-fit leading-none">
                      1
                    </span>
                    <p>
<strong>{t("Company & Individual Channels")}</strong>: {t("Target account endpoints map directly to your brand ecosystems. Playwright automates the session authentication routine on-the-fly.")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="p-1 rounded bg-[#FAF9F8] dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] font-bold font-mono text-[#0078D4] dark:text-brand-300 text-[10px] shrink-0 h-fit leading-none">
                      2
                    </span>
                    <p>
<strong>{t("Simulation Fallbacks Enabled")}</strong>: {t("If active LinkedIn session cookies are missing or stale, the scheduler initiates browser automation in simulation mode to log active posts.")}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

        </section>
      </div>

      {/* Custom Global Confirmation Dialog */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 font-sans antialiased animate-fade-in text-slate-800 dark:text-zinc-200">
          <div className="bg-white dark:bg-[#181818] w-full max-w-sm rounded-xl border border-slate-205 dark:border-zinc-855 shadow-2xl p-6 text-center animate-in zoom-in-95 duration-100">
            <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/25 rounded-full flex items-center justify-center text-rose-500 mb-4">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm mb-2">
{confirmDeleteModal.title || t("Delete Record")}
            </h3>
            <p className="text-slate-500 dark:text-zinc-400 text-xs mb-6 font-semibold animate-pulse">
{confirmDeleteModal.message || t("Move to recycle bin?")}
            </p>
            <div className="flex gap-3 justify-center select-none font-bold">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ isOpen: false, onConfirm: () => {} })}
                className="border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer w-24"
              >
{t("Cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDeleteModal.onConfirm();
                  setConfirmDeleteModal({ isOpen: false, onConfirm: () => {} });
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer shadow-sm w-24 active:scale-95 transition-transform"
              >
{t("Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
