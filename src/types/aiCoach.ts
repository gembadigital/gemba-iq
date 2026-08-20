// AI Marketing Coach - Data Models & Types

export type AiTaskCategory =
  | "business_development"
  | "sales_opportunity"
  | "account_management"
  | "marketing"
  | "digital_marketing"
  | "market_research";

export type DayOfWeek = "Pazartesi" | "Salı" | "Çarşamba" | "Perşembe" | "Cuma";

export interface AiCoachTask {
  id: string;
  title: string;
  description: string;
  category: AiTaskCategory;
  categoryLabel: string;
  priority: "High" | "Medium" | "Low";
  priorityRank: number; // 1 to 7 based on prompt priority rules
  assignedTo: string; // e.g. "Atakan", "Ersin"
  dueDate: string;
  dayOfWeek: DayOfWeek;
  relatedCompanyId?: string;
  relatedCompanyName?: string;
  relatedDealId?: string;
  relatedProposalId?: string;
  relatedCampaignId?: string;
  targetGoal?: string;
  status: "not_started" | "in_progress" | "completed" | "carried_over";
  syncedTaskId?: string;
  sourceJustification: string; // Live CRM data proof e.g. "ABC A.Ş. teklifi 25 gündür cevapsız bekliyor"
}

export interface AiCoachAlert {
  id: string;
  severity: "critical" | "warning" | "opportunity";
  category: string;
  title: string;
  message: string;
  sourceJustification: string;
  actionType?: "review_proposal" | "recontact_deal" | "add_target" | "launch_campaign" | "seo_content";
  actionTargetId?: string;
}

export interface AiUserWorkload {
  userName: string;
  assignedCount: number;
  completedCount: number;
  focusAreas: string[];
  tasks: AiCoachTask[];
}

export interface AiExecutiveReport {
  lastWeekSummary: {
    accomplishedHighlights: string[];
    unaccomplishedTasks: string[];
    completionRate: number; // %
    salesProgress: string[];
    lostDealsAnalysis: string[];
    newTargetCount: number;
    marketingPerformance: string;
    webSeoProgress: string;
  };
  thisWeekFocus: {
    topPriorities: string[];
    userAssignments: Record<string, string[]>;
    pendingOpportunitiesCount: number;
    newTargetSectors: string[];
    marketingActions: string[];
  };
  executiveAlerts: {
    criticalProposals: string[];
    delayedTasks: string[];
    targetDeviations: string[];
    opportunityLossRisks: string[];
  };
}

export interface AiCoachWeeklyPlan {
  id: string;
  weekYearLabel: string; // e.g. "2026 - 34. Hafta"
  createdAt: string;
  updatedAt: string;
  targetCount: number;
  completedCount: number;
  successRate: number; // %
  openOpportunitiesValue: number;
  criticalAlertCount: number;
  priorityTasks: AiCoachTask[];
  tasksByCategory: Record<AiTaskCategory, AiCoachTask[]>;
  userWorkloads: Record<string, AiUserWorkload>;
  alerts: AiCoachAlert[];
  executiveReport: AiExecutiveReport;
  aiManagerNote: string;
}
