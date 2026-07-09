export type ProposalApprovalStatus = "Draft" | "Sent" | "Approved" | "Rejected";

export interface ProposalTimelineEvent {
  id: string;
  proposalId: string;
  eventType: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ProposalAuditLog {
  id: string;
  proposalId: string;
  action: string;
  actorName?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface ProposalTemplate {
  id: string;
  name: string;
  description?: string;
  templateType: "word" | "section";
  content: string;
  placeholders: string[];
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProposalOption {
  training: boolean;
  consulting: boolean;
  workshop: boolean;
  manDays: number;
  dailyRate: number;
  expenses: number;
}

export interface ProposalVersion {
  version: string;
  date: string;
  reason: string;
  changes: string;
  owner: string;
  subject: string;
  currency: string;
  options: {
    [key: string]: ProposalOption;
  };
  services: string[];
  totalBudget: number;
  taxes: number;
  grandTotal: number;
  notes?: string;
  // Custom templates and images
  coverPage?: string;
  methodology?: string;
  projectPlan?: string;
  timeline?: string;
  terms?: string;
  coverImage?: string;
  pageImage?: string;
}

export interface Proposal {
  id: string;
  organization_id?: string;
  sequenceNo: number;
  proposalNumber: string;
  companyId: string;
  companyName: string;
  dealId?: string;
  dealName?: string;
  contactId?: string;
  contactPerson: string;
  contactEmail?: string;
  proposalSubject: string;
  date: string;
  currency: "₺" | "$" | "€";
  owner: string;
  description: string;
  status: "Draft" | "Sent" | "Under Evaluation" | "Revision Requested" | "Accepted" | "Rejected" | "Cancelled";
  approvalStatus?: ProposalApprovalStatus;
  wordTemplateId?: string;
  
  rejectedReason?: string;
  cancelledReason?: string;
  competitor?: string;
  notes?: string;

  services: string[];
  options: {
    [key: string]: ProposalOption;
  };

  totalBudget: number;
  taxes: number;
  grandTotal: number;

  currentVersion: string;
  versions: ProposalVersion[];

  createdBy: string;
  lastUpdate: string;
  leadStage?: string;
  timelineEvents?: ProposalTimelineEvent[];
  auditLog?: ProposalAuditLog[];

  // Custom templates and images
  coverPage?: string;
  methodology?: string;
  projectPlan?: string;
  timeline?: string;
  terms?: string;
  coverImage?: string;
  pageImage?: string;
}

export const PRE_POPULATED_TEMPLATES: {
  [key: string]: {
    coverPage: string;
    methodology: string;
    projectPlan: string;
    timeline: string;
    terms: string;
  }
} = {
  "Default": {
    coverPage: "GEMBA PARTNER OPERATIONAL EXCELLENCE PROPOSAL",
    methodology: "Our methodology is based on the traditional Toyota Production System (TPS) and structured Gemba walks to highlight wastes (TIMWOODS) directly on the shop floor.",
    projectPlan: "Phase 1: Initial shop-floor diagnostic mapping.\nPhase 2: Value Stream Mapping (VSM) current and future state workshop.\nPhase 3: Implementation of kaizen rapid response loops.",
    timeline: "Diagnostic: Week 1-2\nVSM Workshop: Week 3\nImplementation Support: Week 4-8",
    terms: "Payment terms: 50% upfront, 50% upon final report submission.\nAll rates exclude official VAT of 20%."
  },
  "OPEX Assessment": {
    coverPage: "OPEX ASSESSMENT AND SYSTEM GAP ANALYSIS PROPOSAL",
    methodology: "A comprehensive deep dive into manufacturing processes using visual management reviews, machinery loading assessments, and material logistics tracing.",
    projectPlan: "1. Leadership alignment dialogue (1 day)\n2. Gemba Walk across material flows (2 days)\n3. Scrap rate and OEE historical data crunch (2 days)\n4. Findings feedback and OPEX scorecard delivery (1 day)",
    timeline: "Kickoff & Onsite Review: Days 1-3\nData Analytics & Scoring: Days 4-5\nRoadmap Presentation: Day 6",
    terms: "Prices are net. Net-30 payment schedule. Deliverables are intellectual property of Gemba Partner until paid in full."
  },
  "Lean Transformation": {
    coverPage: "ENTERPRISE-WIDE LEAN TRANSFORMATION ADVISORY",
    methodology: "Direct field-driven coaching designed to dismantle operational silos, install continuous kaizen boards, and build cellular workspaces for flexible production lines.",
    projectPlan: "Phase 1: Diagnostic Value Stream Mapping (VSM)\nPhase 2: Production Cell Pilot and 5S layout overhaul\nPhase 3: Standard Work deployment for front-line operators\nPhase 4: Scaling to secondary assembly floors",
    timeline: "Preparation & VSM: Month 1\nPilot Cell Deployment: Month 2-3\nStandard Operating Procedures: Month 4\nScaling Support: Month 5-6",
    terms: "Monthly retainer billing. Expenses for travel and boarding outside regional head offices are charged at flat rate."
  },
  "5S Training": {
    coverPage: "5S FIELD DEPLOYMENT WORKSHOP AND COACHING",
    methodology: "Active 'Learn by Doing' onsite coaching. We do not just teach slides; we clean, sort, and standardize a pilot production bay with your front-line team during a 3-day active sprint.",
    projectPlan: "Day 1 morning: Classroom session on Sort, Set in Order, and Shine.\nDay 1 afternoon & Day 2: Physical shop-floor sort and cell overhaul.\nDay 3 morning: Standardize & Sustain auditing framework setup.\nDay 3 afternoon: Team presentations and 5S launch board setup.",
    timeline: "Prep Call: 1 week before onsite sprint.\nOnsite Action: 3 days.\nAuditing Follow-Up: 1 month after sprint.",
    terms: "Materials required (markers, layout tapes, labels) to be supplied by company under Gemba guidance."
  }
};
