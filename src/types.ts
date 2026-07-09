export interface Recipient {
  id: string;
  organization_id?: string;
  FirstName: string;
  LastName: string;
  Company: string;
  Email: string;
  Department: string;
  Address: string;
  Industry: string;
  ScheduledDate: string;
  CustomField1: string;
  CustomField2: string;
  CustomField3: string;
  status: "idle" | "sending" | "success" | "failed";
  errorMessage?: string;
  openCount: number;
  isSelected?: boolean;
}

export interface AttachmentFile {
  name: string;
  size: number;
  type: string;
  contentBytes: string; // Base64 encoded string for Graph API
}

export interface Campaign {
  id: string;
  organization_id?: string;
  date: string;
  subject: string;
  templateBody: string;
  recipients: Recipient[];
  attachments: AttachmentFile[];
  status: "draft" | "sending" | "paused" | "completed" | "failed";
  successCount: number;
  failedCount: number;
  openCount: number;
  trackingConnected: boolean;
  trackingService?: string; // 'mailtrack' | 'sendgrid' | 'brevo' | 'custom'
}

export interface AuditLog {
  id: string;
  organization_id?: string;
  campaignDate: string;
  subject: string;
  recipientCount: number;
  attachmentNames: string[];
  successCount: number;
  failedCount: number;
  status: "completed" | "failed" | "interrupted";
}

export interface DashboardStats {
  totalCampaigns: number;
  totalEmailsSent: number;
  successRate: number; // percentage
  openRate: number;    // percentage
  lastCampaignDate: string | null;
}

export interface MailboxSession {
  isConnected: boolean;
  isSandbox: boolean;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  accessToken: string;
  refreshToken?: string;
}

export interface ExchangeConfig {
  hasClientKeys: boolean;
  clientId: string;
  redirectUri: string;
  appUrl: string;
}

export interface LeadProfile {
  id: string;
  organization_id?: string;
  no: number;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  department: string;
  address: string;
  industry: string;
  leadDemand: string;
  leadStatus: string;
  leadSegment: string;
  customField1: string;
  customField2: string;
  deliveryStatus: string;
  openCount: number;
  isSelected?: boolean;
}

export interface TargetAccount {
  id: string;
  organization_id?: string;
  companyName: string;
  websiteUrl: string;
  industryTag: string;
  companySize: string;
  locationMain: string;
  aiAnalysisSummary: string; // Will store "Kalite Riskleri & Yalın Fırsatları" summary
  draftTemplates: string;     // Will store "Üretilen E-posta Taslakları" or Personalize Email
  analysisSource: string;     // default "Deep Research (Gemini + Tavily)"
  analysisDate: string;       // Timestamp
  riskScore: number;          // e.g., 1-100 or rating based on israf ve kalite riskleri
  rawOutput: string;          // Store entire raw research and sources
  no?: number;
  contactName?: string;
  contactSurname?: string;
  contactEmail?: string;
  department?: string;
  leadStatus?: string;
  leadSegment?: string;
  customField1?: string;
  customField2?: string;
  isSelected?: boolean;
}


