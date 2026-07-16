import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { useLanguage } from "../lib/LanguageContext";
import { CrmDb } from "../lib/CrmDb";
import type { Proposal } from "../types/proposal";
import { jsPDF } from "jspdf";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  Users,
  Calendar,
  Briefcase,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  Upload,
  Plus,
  Edit,
  Trash,
  Check,
  Building,
  BarChart2,
  TrendingDown,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
  Printer,
  ChevronRight,
  UserCheck,
  UserX,
  PlusCircle,
  PiggyBank,
  Percent,
  TrendingUp as TrendUp,
  Info
} from "lucide-react";
import { formatSystemNumber } from "../lib/currencyHelper";
import {
  Consultant,
  ConsultantCapacity,
  ProjectAssignment,
  Invoice,
  SERVICE_TYPES_LIST
} from "../data/revenueData";

// Organization-scoped keys in the shared CRM auxiliary store (Supabase-backed).
const REVENUE_CONSULTANTS_KEY = "crm_revenue_consultants";
const REVENUE_CAPACITIES_KEY = "crm_revenue_capacities";
const REVENUE_ASSIGNMENTS_KEY = "crm_revenue_assignments";
const REVENUE_INVOICES_KEY = "crm_revenue_invoices";
const REVENUE_IMPORT_LOGS_KEY = "crm_revenue_import_logs";

export default function RevenueManagementView() {
  const { lang, t } = useLanguage();
  // --- ROOT TABS ---
  const [activeTab, setActiveTab] = useState<"dashboard" | "data">("dashboard");

  // --- SUB-DATA TABS (In the "Data" view) ---
  const [activeDataSubTab, setActiveDataSubTab] = useState<"consultants" | "capacity" | "assignments" | "invoices">("consultants");

  // --- ORGANIZATION-SCOPED PERSISTED STATE (Supabase-backed via CrmDb) ---
  // Fallback is an honest empty array — a previous fix already moved this data to
  // Supabase, but still fell back to a hardcoded fake consultant roster (Atakan Zehir,
  // Hakan Morsallı, ...) whenever an organization had no real data yet. A brand-new
  // organization now opens this page genuinely empty instead of showing invented people.
  const [consultants, setConsultants] = useState<Consultant[]>(() =>
    CrmDb.getKv<Consultant[]>(REVENUE_CONSULTANTS_KEY, [])
  );

  const [capacities, setCapacities] = useState<ConsultantCapacity[]>(() =>
    CrmDb.getKv<ConsultantCapacity[]>(REVENUE_CAPACITIES_KEY, [])
  );

  const [assignments, setAssignments] = useState<ProjectAssignment[]>(() =>
    CrmDb.getKv<ProjectAssignment[]>(REVENUE_ASSIGNMENTS_KEY, [])
  );

  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    CrmDb.getKv<Invoice[]>(REVENUE_INVOICES_KEY, [])
  );

  // Read-only snapshot of Proposal Management records — used to attribute
  // invoiced revenue to a real "Hizmet Hattı" (service line) via each
  // customer's accepted proposal(s), instead of relying on an optional,
  // easy-to-omit "Service Type" column on the invoice import file.
  const [proposals] = useState<Proposal[]>(() => CrmDb.getProposals());

  const [importLogs, setImportLogs] = useState<string[]>(() =>
    CrmDb.getKv<string[]>(REVENUE_IMPORT_LOGS_KEY, [])
  );

  const [selectedMonth, setSelectedMonth] = useState<string>("2026-06");
  const [isRangeMode, setIsRangeMode] = useState<boolean>(false);
  const [rangeStart, setRangeStart] = useState<string>("2026-01");
  const [rangeEnd, setRangeEnd] = useState<string>("2026-06");

  // Dynamic Months Generator starting 2024 to system current date
  const getAvailableMonths = () => {
    const startYear = 2024;
    const startMonth = 1;
    const now = new Date();
    const currentYear = Math.max(2026, now.getFullYear());
    const currentMonth = now.getFullYear() > 2026 ? now.getMonth() + 1 : (now.getFullYear() === 2026 ? Math.max(6, now.getMonth() + 1) : 6);

    const list: string[] = [];
    let y = startYear;
    let m = startMonth;
    while (y < currentYear || (y === currentYear && m <= currentMonth)) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      list.push(`${y}-${mStr}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return list;
  };

  const dynamicMonths = useMemo(() => getAvailableMonths(), []);

  const isInSelectedPeriod = (monthString: string) => {
    if (isRangeMode) {
      return monthString >= rangeStart && monthString <= rangeEnd;
    }
    return monthString === selectedMonth;
  };

  const isAssignmentActiveInMonth = (a: ProjectAssignment, m: string) => {
    const startM = a.startDate ? a.startDate.substring(0, 7) : a.month;
    const endM = a.endDate ? a.endDate.substring(0, 7) : a.month;
    
    if (a.isOngoing) {
      return m >= startM;
    }
    return m >= startM && m <= endM;
  };

  const isAssignmentInSelectedPeriod = (a: ProjectAssignment) => {
    if (isRangeMode) {
      const startM = a.startDate ? a.startDate.substring(0, 7) : a.month;
      const endM = a.endDate ? a.endDate.substring(0, 7) : a.month;
      
      if (a.isOngoing) {
        return rangeEnd >= startM;
      }
      const overlapStart = rangeStart > startM ? rangeStart : startM;
      const overlapEnd = rangeEnd < endM ? rangeEnd : endM;
      return overlapStart <= overlapEnd;
    } else {
      return isAssignmentActiveInMonth(a, selectedMonth);
    }
  };

  const getNetCapacity = (cap?: ConsultantCapacity) => {
    const mdpw = cap?.manDaysPerWeek ?? 5;
    return Math.round(mdpw * 4.4);
  };

  const getAllocatedDaysForPeriod = (a: ProjectAssignment) => {
    if (isRangeMode) {
      let sum = 0;
      const startM = a.startDate ? a.startDate.substring(0, 7) : a.month;
      const endM = a.endDate ? a.endDate.substring(0, 7) : a.month;
      
      dynamicMonths.forEach(m => {
        if (m >= rangeStart && m <= rangeEnd) {
          let isActive = false;
          if (a.isOngoing) {
            isActive = m >= startM;
          } else {
            isActive = m >= startM && m <= endM;
          }
          if (isActive) {
            sum += a.allocatedDays;
          }
        }
      });
      return sum;
    } else {
      return isAssignmentActiveInMonth(a, selectedMonth) ? a.allocatedDays : 0;
    }
  };

  // Persist changes to the organization's shared Supabase record (via CrmDb).
  useEffect(() => {
    CrmDb.setKv(REVENUE_CONSULTANTS_KEY, consultants);
  }, [consultants]);

  useEffect(() => {
    CrmDb.setKv(REVENUE_CAPACITIES_KEY, capacities);
  }, [capacities]);

  useEffect(() => {
    CrmDb.setKv(REVENUE_ASSIGNMENTS_KEY, assignments);
  }, [assignments]);

  useEffect(() => {
    CrmDb.setKv(REVENUE_INVOICES_KEY, invoices);
  }, [invoices]);

  useEffect(() => {
    CrmDb.setKv(REVENUE_IMPORT_LOGS_KEY, importLogs);
  }, [importLogs]);

  // --- FORM STATE VARIABLES ---
  const [editingConsultant, setEditingConsultant] = useState<Consultant | null>(null);
  const [showConsultantForm, setShowConsultantForm] = useState(false);
  const [consultantForm, setConsultantForm] = useState<Omit<Consultant, 'id'>>({
    name: "",
    title: "",
    department: "Operational Excellence",
    dailyCost: 6000,
    dailySalesRate: 15000,
    internalCostRatio: 40,
    employmentType: "Full-Time",
    status: "Active"
  });

  const [editingAssignment, setEditingAssignment] = useState<ProjectAssignment | null>(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<Omit<ProjectAssignment, 'id'>>({
    customerName: "",
    projectName: "",
    serviceType: "Lean Manufacturing",
    consultantId: "c-1",
    allocatedDays: 10,
    month: "2026-06",
    startDate: "2026-06-01",
    endDate: "2026-06-15",
    customerDailyRate: 18000,
    consultantDailyRate: 7000,
    revenueSharePercent: undefined
  });

  const [importRawText, setImportRawText] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  const [aiCoachingOutput, setAiCoachingOutput] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const monthsList = useMemo(() => {
    const list = new Set<string>();
    capacities.forEach(c => list.add(c.month));
    assignments.forEach(a => list.add(a.month));
    invoices.forEach(i => list.add(i.month));
    return Array.from(list).sort();
  }, [capacities, assignments, invoices]);

  // --- REVENUE & MARGIN COMPUTATIONS ---
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let soldDays = 0;
    let deliveredDays = 0;
    let totalCost = 0;

    const monthlyInvoices = invoices.filter(i => isInSelectedPeriod(i.month));
    const activeAssignments = assignments.filter(a => isAssignmentInSelectedPeriod(a));

    monthlyInvoices.forEach(inv => {
      totalRevenue += inv.amount;
      deliveredDays += inv.deliveredDays;
    });

    activeAssignments.forEach(ass => {
      const allocatedDays = getAllocatedDaysForPeriod(ass);
      soldDays += allocatedDays;
      const cons = consultants.find(c => c.id === ass.consultantId);
      if (cons) {
        // Compute direct project labor cost
        totalCost += cons.dailyCost * allocatedDays;
      }
    });

    const grossMargin = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
    const averageDailyRate = deliveredDays > 0 ? totalRevenue / deliveredDays : 0;

    // Capacity computations over selected period
    let totalNetCapacityDays = 0;
    
    // Sum capacity for active consultants over each month in selected period
    dynamicMonths.forEach(m => {
      if (isInSelectedPeriod(m)) {
        consultants.filter(c => c.status === "Active").forEach(cons => {
          const cap = capacities.find(cp => cp.consultantId === cons.id && cp.month === m);
          totalNetCapacityDays += getNetCapacity(cap);
        });
      }
    });

    const remainingDays = Math.max(0, totalNetCapacityDays - soldDays);
    const utilizationPercent = totalNetCapacityDays > 0 ? (soldDays / totalNetCapacityDays) * 100 : 0;
    const lostOpportunityValue = remainingDays * (averageDailyRate || 18000);

    return {
      totalRevenue,
      soldDays,
      deliveredDays,
      averageDailyRate,
      grossMargin,
      marginPercent,
      totalNetCapacityDays,
      plannedDays: soldDays,
      remainingDays,
      utilizationPercent,
      lostOpportunityValue,
      totalCost
    };
  }, [invoices, assignments, consultants, capacities, selectedMonth, isRangeMode, rangeStart, rangeEnd]);

  // Workload Bar Chart Data (Replaces Matrix Heatmap)
  const workloadBarData = useMemo(() => {
    return consultants.filter(c => c.status === "Active").map(c => {
      const activeAssigns = assignments.filter(a => isAssignmentInSelectedPeriod(a) && a.consultantId === c.id);
      const allocatedDays = activeAssigns.reduce((sum, curr) => sum + getAllocatedDaysForPeriod(curr), 0);

      let capacityDays = 0;
      dynamicMonths.forEach(m => {
        if (isInSelectedPeriod(m)) {
          const cap = capacities.find(cp => cp.consultantId === c.id && cp.month === m);
          capacityDays += getNetCapacity(cap);
        }
      });

      const utilization = capacityDays > 0 ? (allocatedDays / capacityDays) * 100 : 0;

      return {
        name: c.name,
        allocatedDays,
        capacityDays,
        utilization: Math.round(utilization)
      };
    });
  }, [consultants, assignments, capacities, selectedMonth, isRangeMode, rangeStart, rangeEnd]);

  // Heatmap helper (Retransmitted for compat but routed internally to responsive bar chart)
  const heatmapData = useMemo(() => {
    const grid: { [key: string]: { [month: string]: number } } = {};
    consultants.forEach(c => {
      grid[c.id] = {};
    });

    monthsList.forEach(m => {
      consultants.forEach(c => {
        const monthAssign = assignments.filter(a => isAssignmentActiveInMonth(a, m) && a.consultantId === c.id);
        const allocated = monthAssign.reduce((acc, curr) => acc + curr.allocatedDays, 0);
        const cap = capacities.find(cp => cp.consultantId === c.id && cp.month === m);
        const netCapacity = getNetCapacity(cap);
        const util = netCapacity > 0 ? (allocated / netCapacity) * 100 : 0;
        grid[c.id][m] = util;
      });
    });

    return grid;
  }, [consultants, assignments, capacities, monthsList]);

  // Consultant Profitability Analysis
  const consultantProfitability = useMemo(() => {
    return consultants.map(cons => {
      const activeAssigns = assignments.filter(a => isAssignmentInSelectedPeriod(a) && a.consultantId === cons.id);
      const allocatedDays = activeAssigns.reduce((sum, curr) => sum + getAllocatedDaysForPeriod(curr), 0);
      
      const revenue = activeAssigns.reduce((sum, curr) => {
        return sum + (getAllocatedDaysForPeriod(curr) * curr.customerDailyRate);
      }, 0);

      const cost = allocatedDays * cons.dailyCost;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        ...cons,
        allocatedDays,
        revenue,
        cost,
        profit,
        margin
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [consultants, assignments, capacities, selectedMonth, isRangeMode, rangeStart, rangeEnd]);

  // Blended average consultant daily cost — used only as a fallback cost
  // basis when a customer/service line has real invoiced revenue but no
  // matching entry in the (optional, manually-maintained) Assignments
  // ledger to compute an exact cost from. Never used to invent revenue,
  // only to estimate a margin so the panel isn't just "revenue, no cost".
  const blendedAvgDailyCost = useMemo(() => {
    const active = consultants.filter(c => c.status === "Active");
    const pool = active.length > 0 ? active : consultants;
    if (pool.length === 0) return 0;
    return pool.reduce((sum, c) => sum + (c.dailyCost || 0), 0) / pool.length;
  }, [consultants]);

  // Matches a consultant name recorded directly on an invoice row (the
  // "Kategori" / "Danışman" column from the accounting export) to a real
  // entry in the Consultant Master list, so cost can be computed from that
  // consultant's actual dailyCost instead of an estimate. Editing a
  // consultant's daily rate in the manual entry screen therefore
  // immediately corrects every historical margin calculation that uses
  // their name, since this is a live lookup, not a snapshot.
  const getConsultantDailyCost = (rawName: string): number | null => {
    const target = (rawName || "").trim().toLowerCase();
    if (!target) return null;
    const match = consultants.find(c => c.name.trim().toLowerCase() === target);
    return match ? match.dailyCost : null;
  };

  // Cost for one customer's invoices in the selected period, in priority
  // order: (1) real consultant name(s) recorded on the invoice row itself,
  // matched to the Consultant Master daily cost — multi-consultant rows
  // (e.g. "Faik Çakır +Güray Yurdakul") split the delivered days evenly
  // across the named people since the source file carries no per-person
  // share %; (2) for any remaining invoices with no consultant name on the
  // row, fall back to a matching entry in the manually maintained
  // Assignments ledger; (3) failing both, estimate from the blended
  // average consultant daily cost. costEstimated is true whenever any part
  // of the total relied on step (3).
  const computeCostForCustomerInvoices = (customerName: string, customerInvoices: Invoice[]): { cost: number; costEstimated: boolean } => {
    const namedInvoices = customerInvoices.filter(inv => (inv.consultantNames || []).length > 0);
    const unnamedInvoices = customerInvoices.filter(inv => !(inv.consultantNames || []).length);

    let cost = 0;
    let costEstimated = false;

    namedInvoices.forEach(inv => {
      const names = (inv.consultantNames as string[]).filter(Boolean);
      if (names.length === 0) return;
      const perPersonDays = inv.deliveredDays / names.length;
      names.forEach(n => {
        const rate = getConsultantDailyCost(n);
        if (rate === null) {
          costEstimated = true;
          cost += perPersonDays * blendedAvgDailyCost;
        } else {
          cost += perPersonDays * rate;
        }
      });
    });

    if (unnamedInvoices.length > 0) {
      const unnamedDays = unnamedInvoices.reduce((s, i) => s + i.deliveredDays, 0);
      const matchingAssignments = assignments.filter(
        a => isAssignmentInSelectedPeriod(a) && a.customerName.trim().toLowerCase() === customerName.trim().toLowerCase()
      );
      if (matchingAssignments.length > 0) {
        cost += matchingAssignments.reduce((sum, a) => {
          const cons = consultants.find(c => c.id === a.consultantId);
          return sum + getAllocatedDaysForPeriod(a) * (cons?.dailyCost ?? blendedAvgDailyCost);
        }, 0);
      } else {
        cost += unnamedDays * blendedAvgDailyCost;
        costEstimated = true;
      }
    }

    return { cost, costEstimated };
  };

  // Finds this customer's Accepted proposals in Proposal Management, using
  // a normalized (trimmed/lowercased, punctuation-insensitive) name match
  // in both directions to absorb formatting differences between the
  // accounting export's customer name and the CRM's company name.
  const normalizeCompanyName = (s: string) => (s || "").trim().toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");

  const findAcceptedProposalsForCustomer = (customerName: string): Proposal[] => {
    const target = normalizeCompanyName(customerName);
    if (!target) return [];
    return proposals.filter(p => {
      if (p.status !== "Accepted") return false;
      const pName = normalizeCompanyName(p.companyName);
      if (!pName) return false;
      return pName === target || pName.includes(target) || target.includes(pName);
    });
  };

  // Customer Grouping with rankings — revenue and days come from real
  // invoiced billing (the Monthly Billing Invoice Importer Panel), which is
  // the data source that's actually being populated via Excel/CSV/XLSX
  // upload. Cost is taken primarily from the consultant name(s) recorded
  // directly on each invoice row, matched to the Consultant Master daily
  // cost; the Assignments ledger and blended average are fallbacks only
  // (flagged with an estimate marker in the UI).
  const customerProfitability = useMemo(() => {
    const dataMap: { [customerName: string]: { revenue: number; days: number } } = {};
    const periodInvoices = invoices.filter(inv => isInSelectedPeriod(inv.month));

    periodInvoices.forEach(inv => {
      if (!dataMap[inv.customerName]) {
        dataMap[inv.customerName] = { revenue: 0, days: 0 };
      }
      dataMap[inv.customerName].revenue += inv.amount;
      dataMap[inv.customerName].days += inv.deliveredDays;
    });

    return Object.entries(dataMap).map(([name, val]) => {
      const customerInvoices = periodInvoices.filter(inv => inv.customerName === name);
      const { cost, costEstimated } = computeCostForCustomerInvoices(name, customerInvoices);

      const profit = val.revenue - cost;
      const margin = val.revenue > 0 ? (profit / val.revenue) * 100 : 0;
      const avgRate = val.days > 0 ? val.revenue / val.days : 0;
      return {
        name,
        revenue: val.revenue,
        days: val.days,
        profit,
        margin,
        avgRate,
        costEstimated
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [invoices, assignments, consultants, proposals, blendedAvgDailyCost, selectedMonth, isRangeMode, rangeStart, rangeEnd]);

  // Service Line ("Hizmet Hattı") Grouping — sourced from Proposal
  // Management rather than an optional "Service Type" column on the
  // invoice file (real accounting exports don't carry one). Each
  // customer's invoiced revenue in the period is attributed to their
  // Accepted proposal(s): a single accepted proposal gets 100% of that
  // customer's billing; multiple accepted proposals split it in proportion
  // to each proposal's grand total value. Customers with no matching
  // accepted proposal land in a dedicated "no match" bucket rather than
  // being silently dropped or lumped into "Other".
  const serviceProfitability = useMemo(() => {
    const periodInvoices = invoices.filter(inv => isInSelectedPeriod(inv.month));
    const byCustomer: { [customerName: string]: Invoice[] } = {};
    periodInvoices.forEach(inv => {
      if (!byCustomer[inv.customerName]) byCustomer[inv.customerName] = [];
      byCustomer[inv.customerName].push(inv);
    });

    const NO_MATCH_LABEL = t("No Matching Accepted Proposal");
    const lineMap: { [label: string]: { revenue: number; days: number; cost: number; anyEstimated: boolean } } = {};
    const addToLine = (label: string, revenue: number, days: number, cost: number, estimated: boolean) => {
      if (!lineMap[label]) lineMap[label] = { revenue: 0, days: 0, cost: 0, anyEstimated: false };
      lineMap[label].revenue += revenue;
      lineMap[label].days += days;
      lineMap[label].cost += cost;
      if (estimated) lineMap[label].anyEstimated = true;
    };

    Object.entries(byCustomer).forEach(([customerName, customerInvoices]) => {
      const revenue = customerInvoices.reduce((s, i) => s + i.amount, 0);
      const days = customerInvoices.reduce((s, i) => s + i.deliveredDays, 0);
      const { cost, costEstimated } = computeCostForCustomerInvoices(customerName, customerInvoices);

      const accepted = findAcceptedProposalsForCustomer(customerName);
      if (accepted.length === 0) {
        addToLine(NO_MATCH_LABEL, revenue, days, cost, costEstimated);
        return;
      }
      const totalWeight = accepted.reduce((s, p) => s + Math.max(1, p.grandTotal || p.totalBudget || 1), 0);
      accepted.forEach(p => {
        const weight = Math.max(1, p.grandTotal || p.totalBudget || 1) / totalWeight;
        const label = (p.services && p.services[0]) ? p.services[0] : (p.proposalSubject || t("Other"));
        addToLine(label, revenue * weight, days * weight, cost * weight, costEstimated);
      });
    });

    return Object.entries(lineMap)
      .map(([name, v]) => ({
        name,
        revenue: v.revenue,
        days: Math.round(v.days),
        margin: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
        avgRate: v.days > 0 ? v.revenue / v.days : 0,
        costEstimated: v.anyEstimated
      }))
      .filter(v => v.days > 0 || v.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [invoices, assignments, consultants, proposals, blendedAvgDailyCost, selectedMonth, isRangeMode, rangeStart, rangeEnd, lang]);

  // 3 & 6 Month Forecast calculator
  const forecasts = useMemo(() => {
    const baseMonth = isRangeMode ? rangeEnd : selectedMonth;
    const [yearStr, monthStr] = baseMonth.split("-");
    const startYear = parseInt(yearStr);
    const startMonthVal = parseInt(monthStr);

    const fMonths: string[] = [];
    for (let i = 0; i < 6; i++) {
      let mVal = startMonthVal + i;
      let yVal = startYear;
      if (mVal > 12) {
        yVal += Math.floor((mVal - 1) / 12);
        mVal = ((mVal - 1) % 12) + 1;
      }
      const mStr = mVal < 10 ? `0${mVal}` : `${mVal}`;
      fMonths.push(`${yVal}-${mStr}`);
    }

    const output = [];
    for (const m of fMonths) {
      const monthAssign = assignments.filter(a => isAssignmentActiveInMonth(a, m));
      const plannedDays = monthAssign.reduce((sum, curr) => sum + curr.allocatedDays, 0);
      const estimatedRev = monthAssign.reduce((sum, curr) => sum + (curr.allocatedDays * curr.customerDailyRate), 0);

      let monthCapacity = 0;
      consultants.filter(c => c.status === "Active").forEach(cons => {
        const cap = capacities.find(cp => cp.consultantId === cons.id && cp.month === m);
        monthCapacity += getNetCapacity(cap);
      });

      const util = monthCapacity > 0 ? (plannedDays / monthCapacity) * 100 : 0;
      output.push({
        month: m,
        plannedDays,
        capacityDays: monthCapacity,
        utilization: Math.round(util),
        revenue: estimatedRev > 0 ? estimatedRev : (plannedDays * 18000) // Fallback calculation
      });
    }
    return output;
  }, [assignments, consultants, capacities, selectedMonth, isRangeMode, rangeEnd]);

  // Management insights heuristic generator
  const localInsights = useMemo(() => {
    const list = [];
    
    // Check overload
    consultantProfitability.forEach(cp => {
      if (cp.allocatedDays > 20) {
        list.push({
          type: "danger",
          msg: t("{name} is severely overloaded in {month} ({days} planned days). Shift assignments to balance resource stress.")
            .replace("{name}", cp.name)
            .replace("{month}", selectedMonth)
            .replace("{days}", String(cp.allocatedDays))
        });
      } else if (cp.allocatedDays < 5 && cp.status === "Active") {
        list.push({
          type: "warning",
          msg: t("{name} has low assignment volume ({days} days) in {month}. Direct active sales pipelines to optimize utilization.")
            .replace("{name}", cp.name)
            .replace("{days}", String(cp.allocatedDays))
            .replace("{month}", selectedMonth)
        });
      }
    });

    // Check service profitability
    const bestService = serviceProfitability[0];
    if (bestService) {
      list.push({
        type: "success",
        msg: t("{name} is the highest revenue driver in {month}, generating {revenue} TL sales.")
          .replace("{name}", bestService.name)
          .replace("{month}", selectedMonth)
          .replace("{revenue}", formatSystemNumber(bestService.revenue))
      });
    }

    // Customer reliance checks
    const topCustomer = customerProfitability[0];
    if (topCustomer && metrics.totalRevenue > 0) {
      const share = (topCustomer.revenue / metrics.totalRevenue) * 100;
      if (share > 30) {
        list.push({
          type: "warning",
          msg: t("High Concentration Risk: {name} contributes {share}% of total monthly billing. Diversify service projects.")
            .replace("{name}", topCustomer.name)
            .replace("{share}", share.toFixed(0))
        });
      }
    }

    if (metrics.utilizationPercent < 75) {
      list.push({
        type: "danger",
        msg: t("Utilization Rate ({percent}%) is below target standard. Unsold capacity represents {revenue} TL lost revenue.")
          .replace("{percent}", metrics.utilizationPercent.toFixed(0))
          .replace("{revenue}", formatSystemNumber(metrics.lostOpportunityValue))
      });
    }

    return list;
  }, [consultantProfitability, serviceProfitability, customerProfitability, metrics, selectedMonth, lang, t]);

  // AI-Assisted Assessment Trigger via Gemini
   const triggerAiManagementReview = async () => {
    setIsAiLoading(true);
    setAiCoachingOutput("");

    try {
      const res = await fetch("/api/gemini/sales-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deals: [],
          query: `Revenue and Capacity Analysis Query:
- Month/Period Evaluated: ${isRangeMode ? `${rangeStart} to ${rangeEnd}` : selectedMonth}
- Total Revenue Generated: ${metrics.totalRevenue} TL
- Delivered Man-Days: ${metrics.deliveredDays} 
- Total Expected Capacity: ${metrics.totalNetCapacityDays} days
- Planned Working Days: ${metrics.plannedDays} days
- Utilization Rate: ${metrics.utilizationPercent.toFixed(1)}%
- Lost Bench Capacity Opportunity Cost: ${metrics.lostOpportunityValue} TL
- Average Consultant Daily Sales Rate: ${metrics.averageDailyRate} TL

Detailed Profitability Breakdown:
${JSON.stringify(consultantProfitability.map(c => ({ name: c.name, title: c.title, allocatedDays: c.allocatedDays, revenue: c.revenue, cost: c.cost })), null, 2)}

Please perform a thorough, critical, and direct Operational Excellence Revenue and Capacity Coaching Audit. Point out resource leakage, address pricing weaknesses, rate salesperson and project efficiency, and conclude with a specific 'MANAGEMENT ACTION PLAN' detailing Priority 1, Priority 2, Priority 3 with explicit Owners and KPIS in Turkish language.

CRITICAL FORMATTING INSTRUCTIONS: Your response MUST be output as beautiful, production-ready, structured HTML elements. Use elegant typography such as <h2 class="text-sm font-extrabold text-slate-905 dark:text-zinc-50 border-b pb-1 mt-4 mb-2 flex items-center gap-1.5 uppercase tracking-wider text-[#0078D4]">, <p class="mb-2 text-xs text-slate-800 dark:text-zinc-300 leading-relaxed font-semibold">, <div class="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-3 rounded my-2 text-xs"> for highlighting leaks/risks, and a nice table or grid for the management action plan with explicit columns ("Aksiyon", "Sorumlu", "KPI"). Do NOT wrap inside markdown three backticks code block (like \`\`\`html) - just output ready HTML.`
        })
      });

      const data = await res.json();
      if (data.success) {
        setAiCoachingOutput(data.coachResponse);
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      console.error(e);
      setAiCoachingOutput(`<div class="bg-rose-50 dark:bg-rose-950/25 border-l-4 border-rose-500 p-3 rounded text-rose-700 text-xs font-mono">
        <strong>${t("Audit Error:")}</strong> ${e.message || t("Could not connect to Gemini.")}. ${t("Please check Secrets or API configuration.")}
      </div>`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- ACTIONS: Consultant master data ---
  const handleSaveConsultant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultantForm.name.trim()) return;

    if (editingConsultant) {
      setConsultants(prev => prev.map(c => c.id === editingConsultant.id ? { ...c, ...consultantForm } : c));
      setEditingConsultant(null);
    } else {
      const newC: Consultant = {
        id: "c-" + Date.now(),
        ...consultantForm
      };
      setConsultants(prev => [...prev, newC]);
    }

    setConsultantForm({
      name: "",
      title: "",
      department: "Operational Excellence",
      dailyCost: 6000,
      dailySalesRate: 15000,
      internalCostRatio: 40,
      employmentType: "Full-Time",
      status: "Active"
    });
    setShowConsultantForm(false);
  };

  const handleEditConsultant = (c: Consultant) => {
    setEditingConsultant(c);
    setConsultantForm({
      name: c.name,
      title: c.title,
      department: c.department,
      dailyCost: c.dailyCost,
      dailySalesRate: c.dailySalesRate,
      internalCostRatio: c.internalCostRatio !== undefined ? c.internalCostRatio : parseFloat(((c.dailyCost / (c.dailySalesRate || 1)) * 100).toFixed(1)),
      employmentType: c.employmentType,
      status: c.status
    });
    setShowConsultantForm(true);
  };

  const toggleConsultantActive = (id: string) => {
    setConsultants(prev => prev.map(c => c.id === id ? { ...c, status: c.status === "Active" ? "Inactive" : "Active" } : c));
  };

  // --- ACTIONS: Capacity Adjustments ----
  const handleCapacityChange = (consultantId: string, field: keyof Omit<ConsultantCapacity, 'id' | 'consultantId' | 'month'>, val: number) => {
    setCapacities(prev => {
      const idx = prev.findIndex(c => c.consultantId === consultantId && c.month === selectedMonth);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [field]: val };
        return updated;
      } else {
        // Create baseline and insert
        const newCap: ConsultantCapacity = {
          id: "cap-" + Date.now(),
          consultantId,
          month: selectedMonth,
          workingDays: 22,
          vacation: 0,
          training: 0,
          sickLeave: 0,
          internalProjects: 0,
          [field]: val
        };
        return [...prev, newCap];
      }
    });
  };

  // --- ACTIONS: Project Assignments ---
  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.customerName.trim() || !assignmentForm.projectName.trim()) return;

    if (editingAssignment) {
      setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? { ...a, ...assignmentForm } : a));
      setEditingAssignment(null);
    } else {
      const newA: ProjectAssignment = {
        id: "pa-" + Date.now(),
        ...assignmentForm
      };
      setAssignments(prev => [...prev, newA]);
    }

    setAssignmentForm({
      customerName: "",
      projectName: "",
      serviceType: "Lean Manufacturing",
      consultantId: "c-1",
      allocatedDays: 10,
      month: selectedMonth,
      startDate: `${selectedMonth}-01`,
      endDate: `${selectedMonth}-15`,
      customerDailyRate: 18000,
      consultantDailyRate: 7000,
      revenueSharePercent: undefined
    });
    setShowAssignmentForm(false);
  };

  const handleDeleteAssignment = (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm(t("Are you sure you want to delete this invoice?"))) {
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      const logMsg = `${new Date().toLocaleTimeString()} - ${t("Invoice deleted (ID: {id}).").replace("{id}", id)}`;
      setImportLogs(prev => [logMsg, ...prev]);
    }
  };

  // --- INVOICE IMPORTER ---
  // This is now the general/standard upload format: it directly accepts the
  // real sales invoice export from the accounting system (Düzenleme Tarihi,
  // Müşteri, Kategori [=consultant name], Ara Toplam, Toplam KDV, Genel
  // Toplam, Miktar, Birim Fiyatı, KDV Oranı) with no invoice-code column
  // required — a code is generated automatically. The template below is
  // offered as a simplified fallback for anyone building the sheet by hand.
  const downloadSampleTemplate = () => {
    const headers = ["Düzenleme Tarihi", "Müşteri", "Danışman", "Miktar", "Birim Fiyatı", "Ara Toplam", "KDV Oranı", "Genel Toplam"];
    const rows = [
      ["2026-06-05", "Vestel Beyaz Eşya", "Gökhan Kuzu", 10, 18000, 180000, 20, 216000],
      ["2026-06-12", "Ford Otosan", "Kemal Doğan", 12, 19000, 228000, 20, 273600],
      ["2026-06-20", "Eczacıbaşı Karo", "Faik Çakır +Güray Yurdakul", 15, 20000, 300000, 20, 360000]
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Faturalar");
    XLSX.writeFile(wb, `fatura_yukleme_sablonu.xlsx`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processInvoiceFile(file);
    // Reset file input value to allow uploading same file again
    e.target.value = "";
  };

  // Reads .xlsx/.xls (binary, via SheetJS) and .csv (as UTF-8 text, also via
  // SheetJS so both formats share one row-object parser) and hands the
  // resulting array of {header: value} rows to parseAndSetInvoiceRows.
  const processInvoiceFile = (file: File) => {
    setImportError("");
    setImportSuccess("");

    const isCsv = /\.csv$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (!result) {
          setImportError(t("Selected file is empty or unreadable."));
          return;
        }
        const workbook = isCsv
          ? XLSX.read(result as string, { type: "string", cellDates: true })
          : XLSX.read(result as ArrayBuffer, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "", raw: true });
        parseAndSetInvoiceRows(rows, file.name);
      } catch (err: any) {
        setImportError(t("Error occurred: {error}").replace("{error}", err.message || t("File could not be read")));
      }
    };
    reader.onerror = () => {
      setImportError(t("File read error occurred."));
    };
    if (isCsv) {
      reader.readAsText(file, "UTF-8");
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  // Parses numbers written with either thousand-separator convention
  // ("110,600.00" or "110.600,00") as well as plain SheetJS numeric cells.
  const parseLocaleNumber = (raw: any): number => {
    if (typeof raw === "number") return raw;
    if (raw === null || raw === undefined) return 0;
    let s = String(raw).trim();
    if (!s) return 0;
    s = s.replace(/[^\d.,-]/g, "");
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (lastComma > -1) {
      const decimals = s.length - lastComma - 1;
      if (decimals <= 2 && (s.match(/,/g) || []).length === 1) {
        s = s.replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  // Excel date serials sometimes decode to a timestamp just shy of midnight
  // (e.g. 20:59:04 UTC) due to floating point imprecision in the stored
  // serial number — shifting by 12h before truncating to a calendar day
  // corrects this without needing timezone-specific handling.
  const excelDateToYMD = (d: Date): string => {
    const shifted = new Date(d.getTime() + 12 * 60 * 60 * 1000);
    const y = shifted.getUTCFullYear();
    const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
    const day = String(shifted.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Accepts a real Date object (from .xlsx cells), or a plain string date
  // in ISO (2026-06-20), Turkish (20.06.2026 / 20/06/2026) or free-text
  // ("29 June 2026") form, from .csv cells. Returns null when nothing
  // date-like can be recognized, so the caller can fall back to the
  // currently selected period instead of storing a bogus date.
  const parseCellDate = (raw: any): string | null => {
    if (!raw) return null;
    if (raw instanceof Date && !isNaN(raw.getTime())) {
      return excelDateToYMD(raw);
    }
    const s = String(raw).trim();
    if (!s) return null;
    let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return null;
  };

  // Splits a "Kategori"/"Danışman" cell that may name more than one
  // consultant on a shared invoice (e.g. "Faik Çakır +Güray Yurdakul") into
  // individual names.
  const splitConsultantNames = (raw: string): string[] => {
    return (raw || "")
      .split(/\s*[+,&/;]\s*|\s+ve\s+/i)
      .map(s => s.trim())
      .filter(Boolean);
  };

  // Maps a free-text service type cell onto the app's known service line
  // list. Kept only for the optional legacy "Hizmet Türü" column and the
  // manual invoice entry form — the Methodology / Service Line Margins
  // chart itself now sources its grouping from Proposal Management instead.
  const matchServiceType = (raw: string): string => {
    const clean = (raw || "").trim();
    if (!clean) return "Other";
    const lower = clean.toLowerCase();
    const found = SERVICE_TYPES_LIST.find((st) => st.toLowerCase() === lower || lower.includes(st.toLowerCase()) || st.toLowerCase().includes(lower));
    return found || clean;
  };

  const parseAndSetInvoiceRows = (rows: Record<string, any>[], filename: string) => {
    try {
      if (!rows || rows.length === 0) {
        setImportError(t("No data found in uploaded file."));
        return;
      }

      const rowKeys = Object.keys(rows[0] || {});
      const usedKeys = new Set<string>();
      const findKey = (keywords: string[]): string | null => {
        for (const k of rowKeys) {
          if (usedKeys.has(k)) continue;
          const lower = k.toLowerCase().trim();
          if (keywords.some(kw => lower.includes(kw))) {
            usedKeys.add(k);
            return k;
          }
        }
        return null;
      };

      // Claim order matters: specific/narrow labels are matched first so
      // the broad, catch-all "subtotal" search at the end doesn't steal a
      // column ("Genel Toplam", "Toplam KDV") that belongs to a more
      // specific field.
      const customerKey = findKey(["müşteri", "customer", "musteri", "firma", "unvan", "isim", "ad"]);
      const dateKey = findKey(["düzenleme tarihi", "duzenleme tarihi", "fatura tarihi", "işlem tarihi", "islem tarihi", "tarih", "date"]);
      const daysKey = findKey(["gün", "gun", "days", "adam gün", "satılan adam gün", "sure", "süre", "adet", "miktar"]);
      const rateKey = findKey(["birim fiyat", "birim", "rate", "daily rate", "fiyat", "ücret", "ucret"]);
      const grandTotalKey = findKey(["genel toplam", "kdv dahil toplam", "kdv dahil", "grand total"]);
      const vatRateKey = findKey(["kdv oranı", "kdv orani", "kdv oran", "vat rate"]);
      const vatAmountKey = findKey(["toplam kdv", "kdv tutarı", "kdv tutari", "vat amount"]);
      const consultantKey = findKey(["danışman", "danisman", "consultant", "personel", "sorumlu", "kategori"]);
      const serviceTypeKey = findKey(["hizmet türü", "hizmet turu", "hizmet hattı", "hizmet hatti", "metodoloji", "methodology", "service type", "servis"]);
      const subtotalKey = findKey(["ara toplam", "fatura toplamı", "fatura toplami", "net toplam", "toplam tutar", "fatura bedeli", "fatura tutarı", "subtotal", "toplam", "amount", "bedel", "tutar"]);

      const parsedInvoices: Invoice[] = [];
      let duplicateCount = 0;
      let addedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cName = String(customerKey ? row[customerKey] : row[rowKeys[0]] || "").trim();
        if (!cName) continue;

        const days = daysKey ? parseLocaleNumber(row[daysKey]) : 5;
        const rate = rateKey ? parseLocaleNumber(row[rateKey]) : 0;
        let subtotal = subtotalKey ? parseLocaleNumber(row[subtotalKey]) : 0;
        let grandTotal = grandTotalKey ? parseLocaleNumber(row[grandTotalKey]) : 0;

        if (subtotal === 0 && rate > 0 && days > 0) {
          subtotal = rate * days;
        }

        const rawVatRate = vatRateKey ? parseLocaleNumber(row[vatRateKey]) : 20;
        const vatRate = rawVatRate > 0 && rawVatRate < 1 ? rawVatRate * 100 : (rawVatRate || 20);
        let vatAmount = vatAmountKey ? parseLocaleNumber(row[vatAmountKey]) : Math.round(subtotal * (vatRate / 100));

        if (grandTotal === 0 && subtotal > 0) {
          grandTotal = subtotal + vatAmount;
        }
        if (subtotal === 0 && grandTotal > 0) {
          subtotal = Math.round(grandTotal / (1 + vatRate / 100));
          vatAmount = grandTotal - subtotal;
        }

        // Real per-row date drives which month this invoice belongs to —
        // import no longer force-assigns every row to whatever period is
        // currently selected in the UI. Rows without a recognizable date
        // (older/simple templates) fall back to the selected period so
        // nothing is silently dropped.
        let invoiceDate = `${selectedMonth}-20`;
        let month = selectedMonth;
        const parsedDate = dateKey ? parseCellDate(row[dateKey]) : null;
        if (parsedDate) {
          invoiceDate = parsedDate;
          month = parsedDate.substring(0, 7);
        }

        const consultantNames = consultantKey ? splitConsultantNames(String(row[consultantKey] || "")) : [];
        const serviceType = matchServiceType(serviceTypeKey ? String(row[serviceTypeKey] || "") : "");

        const isDup = invoices.some(inv =>
          inv.customerName.toLowerCase() === cName.toLowerCase() &&
          inv.month === month &&
          Math.abs(inv.amount - subtotal) < 1
        );
        if (isDup) {
          duplicateCount++;
        }

        parsedInvoices.push({
          id: "inv-parsed-" + Date.now() + "-" + i,
          invoiceNumber: `F-${month}-${1000 + i}`,
          customerName: cName,
          invoiceDate,
          month,
          amount: subtotal,
          deliveredDays: days,
          serviceType,
          status: "Paid",
          unitPrice: rate || (days > 0 ? Math.round(subtotal / days) : 0),
          vatRate: vatRate || 20,
          vatAmount,
          grandTotal,
          consultantNames
        });
        addedCount++;
      }

      if (parsedInvoices.length > 0) {
        setInvoices(prev => [...parsedInvoices, ...prev]);
        const logMsg = `${new Date().toLocaleTimeString()} - ${t("File [{filename}] loaded: {count} records parsed.").replace("{filename}", filename).replace("{count}", String(addedCount))}`;
        setImportLogs(prev => [logMsg, ...prev]);
        setImportSuccess(t("Invoice list loaded successfully! ({count} invoices added, {duplicates} possible duplicates detected).").replace("{count}", String(addedCount)).replace("{duplicates}", String(duplicateCount)));
      } else {
        setImportError(t("No valid invoice records could be read from the uploaded file. Please check the column headers."));
      }
    } catch (err: any) {
      setImportError(t("Error occurred: {error}").replace("{error}", err.message || t("File could not be read")));
    }
  };

  // --- EXPORT TOOLS ---
  const handleExportCSV = (type: string) => {
    let headers = "";
    let csvContent = "";

    if (type === "capacity") {
      headers = "Consultant,Working Days,Vacation,Training,Sick Leave,Internal Projects,Net Capacity\n";
      csvContent = consultants.map(c => {
        const cap = capacities.find(cp => cp.consultantId === c.id && cp.month === selectedMonth);
        const wDays = cap?.workingDays || 22;
        const vac = cap?.vacation || 0;
        const tr = cap?.training || 0;
        const sick = cap?.sickLeave || 0;
        const intP = cap?.internalProjects || 0;
        const net = wDays - (vac + tr + intP);
        return `"${c.name}",${wDays},${vac},${tr},${sick},${intP},${net}`;
      }).join("\n");
    } else if (type === "profitability") {
      headers = "Consultant,Title,Department,Allocated Days,Revenue,Labor Cost,Profit,Margin Percent\n";
      csvContent = consultantProfitability.map(c => {
        return `"${c.name}","${c.title}","${c.department}",${c.allocatedDays},${c.revenue},${c.cost},${c.profit},${c.margin.toFixed(1)}%`;
      }).join("\n");
    } else {
      // Revenue
      headers = "Invoice Number,Customer Name,Invoice Date,Month,Amount,Delivered Days,Service Type\n";
      csvContent = invoices.filter(i => i.month === selectedMonth).map(i => {
        return `"${i.invoiceNumber}","${i.customerName}","${i.invoiceDate}","${i.month}",${i.amount},${i.deliveredDays},"${i.serviceType}"`;
      }).join("\n");
    }

    const blob = new Blob([headers + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `GE_OPEX_${type}_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerPrint = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Font style header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(33, 37, 41); // dark charcoal
      doc.text("REVENUE & CAPACITY EXECUTIVE REPORT", 14, 20);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(110, 110, 110);
      doc.text(`Selected Operational Period: ${selectedMonth} | Report Generated: ${new Date().toLocaleDateString()}`, 14, 25);

      // Horizontal separator line
      doc.setDrawColor(220, 224, 230);
      doc.setLineWidth(0.4);
      doc.line(14, 28, 196, 28);

      // Section: KPI Financial Overview
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 120, 212); // Azure blue
      doc.text("I. PERIODIC FINANCIAL METRICS SUMMARY", 14, 35);

      // Let's compute actual totals
      const monthAssignments = assignments.filter(a => isAssignmentActiveInMonth(a, selectedMonth));
      const totalRevenue = monthAssignments.reduce((acc, a) => acc + (a.allocatedDays * a.customerDailyRate), 0);
      const totalCost = monthAssignments.reduce((acc, a) => acc + (a.allocatedDays * (a.consultantDailyRate || 7000)), 0);
      const netProfit = totalRevenue - totalCost;
      const marginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text("KPI Indicator Metric", 14, 42);
      doc.text("Value / Monthly Performance", 120, 42);

      doc.line(14, 44, 196, 44);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Total Projected Gross Billing Revenue (TL):", 14, 50);
      doc.setFont("helvetica", "bold");
      doc.text(`${formatSystemNumber(totalRevenue)} TL`, 120, 50);

      doc.setFont("helvetica", "normal");
      doc.text("Total Dynamic Labour Costs (TL):", 14, 56);
      doc.setFont("helvetica", "bold");
      doc.text(`${formatSystemNumber(totalCost)} TL`, 120, 56);

      doc.setFont("helvetica", "normal");
      doc.text("Projected EBIT Net Profit (TL):", 14, 62);
      doc.setFont("helvetica", "bold");
      doc.text(`${formatSystemNumber(netProfit)} TL`, 120, 62);

      doc.setFont("helvetica", "normal");
      doc.text("Corporate Target Margin Ratio (%):", 14, 68);
      doc.setFont("helvetica", "bold");
      doc.text(`% ${marginPct}`, 120, 68);

      doc.line(14, 71, 196, 71);

      // Section: Active Consultant Allocations
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 120, 212);
      doc.text("II. ACTIVE CONSULTANT ALLOCATION REGISTRY", 14, 80);

      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("Customer / Project Name", 14, 87);
      doc.text("Service Segment", 80, 87);
      doc.text("Allocated Days", 130, 87);
      doc.text("Expected Revenue", 160, 87);

      doc.line(14, 89, 196, 89);

      let yPos = 94;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      
      monthAssignments.forEach((ass) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
          doc.setFont("helvetica", "bold");
          doc.text("II. ACTIVE CONSULTANT ALLOCATION REGISTRY (Continued)", 14, 15);
          doc.line(14, 17, 196, 17);
          yPos = 22;
        }
        
        const customerSafe = (ass.customerName || "Customer").substring(0, 32);
        const projectSafe = (ass.projectName || "Scope unassigned").substring(0, 32);
        const serviceSafe = (ass.serviceType || "Other").substring(0, 24);

        doc.setFont("helvetica", "bold");
        doc.text(customerSafe, 14, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(projectSafe, 14, yPos + 3.5);

        doc.text(serviceSafe, 80, yPos);
        doc.text(`${ass.allocatedDays || 0} Days`, 130, yPos);
        
        const revVal = (ass.allocatedDays || 0) * (ass.customerDailyRate || 0);
        doc.text(`${formatSystemNumber(revVal)} TL`, 160, yPos);

        yPos += 10;
      });

      // Section: Active Invoices Monthly Register
      yPos += 4;
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 120, 212);
      doc.text("III. MONTHLY BILLING INVOICES REGISTRY", 14, yPos);
      yPos += 8;

      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("Invoice Code", 14, yPos);
      doc.text("Invoiced Client Name", 50, yPos);
      doc.text("Delivered Days", 130, yPos);
      doc.text("Amount (TL)", 160, yPos);

      yPos += 1.5;
      doc.line(14, yPos, 196, yPos);
      yPos += 5.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const monthInvoices = invoices.filter(i => i.month === selectedMonth);

      if (monthInvoices.length === 0) {
        doc.text("No separate invoices uploaded or synchronized for this period.", 14, yPos);
        yPos += 8;
      } else {
        monthInvoices.forEach((inv) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
            doc.setFont("helvetica", "bold");
            doc.text("III. MONTHLY BILLING INVOICES REGISTRY (Continued)", 14, 15);
            doc.line(14, 17, 196, 17);
            yPos = 22;
          }

          doc.text(inv.invoiceNumber || "INV-NEW", 14, yPos);
          doc.setFont("helvetica", "bold");
          doc.text((inv.customerName || "Customer").substring(0, 32), 50, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(`${inv.deliveredDays || 0} Days`, 130, yPos);
          doc.text(`${formatSystemNumber((inv.amount || 0))} TL`, 160, yPos);

          yPos += 8.5;
        });
      }

      doc.save(`GE_Opex_Revenue_Report_${selectedMonth}.pdf`);

    } catch (error: any) {
      console.error("PDF generation failure:", error);
      alert(t("PDF generation failed: {error}").replace("{error}", error.message));
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-zinc-100 font-sans" id="revenue-management-system-stage">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151515] p-5 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm print:shadow-none relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("Revenue & Consultant Capacity Management")}
          </h1>
          <p className="text-xs text-slate-550 max-w-2xl leading-relaxed">
            {t("Monitor gross margins, billable consultant man-days, lost opportunity bench values, and leverage advanced AI forecasts.")}
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1f1e1d] border border-slate-200 dark:border-zinc-800 p-1.5 px-3 rounded-lg">
            <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-[#EDEBE9] dark:border-[#323130]">
              <label className="text-[10px] text-slate-500 font-bold uppercase select-none cursor-pointer flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={isRangeMode}
                  onChange={(e) => setIsRangeMode(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#0078D4] focus:ring-[#0078D4] pointer-events-auto cursor-pointer"
                />
                <span>{t("Range Selection")}</span>
              </label>
            </div>

            {isRangeMode ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">{t("From:")}</span>
                <select
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="text-xs font-bold font-mono bg-transparent outline-none cursor-pointer border-none p-0 text-[#0078D4]"
                >
                  {dynamicMonths.map(m => (
                    <option key={m} value={m} className="bg-white dark:bg-zinc-900 text-slate-850 dark:text-zinc-200">{m}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 font-mono">{t("To:")}</span>
                <select
                  value={rangeEnd}
                  onChange={(e) => {
                    if (e.target.value >= rangeStart) {
                      setRangeEnd(e.target.value);
                    }
                  }}
                  className="text-xs font-bold font-mono bg-transparent outline-none cursor-pointer border-none p-0 text-[#0078D4]"
                >
                  {dynamicMonths.map(m => (
                    <option key={m} value={m} className="bg-white dark:bg-zinc-900 text-slate-850 dark:text-zinc-200">{m}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-mono font-bold">{t("Target Month:")}</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs font-bold font-mono bg-transparent outline-none cursor-pointer border-none p-0 text-[#0078D4]"
                >
                  {dynamicMonths.map(m => (
                    <option key={m} value={m} className="bg-white dark:bg-zinc-900 text-slate-850 dark:text-zinc-200">{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-105/40 dark:bg-zinc-900 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 text-[13px] font-bold rounded-md transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-white dark:bg-zinc-800 text-[#0078D4] dark:text-sky-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"
              }`}
            >
              {t("📊 Executive Dashboard")}
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`px-4 py-2 text-[13px] font-bold rounded-md transition-all cursor-pointer ${
                activeTab === "data"
                  ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"
              }`}
            >
              {t("🗄️ Operations & Data Input")}
            </button>
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE ROOT TAB */}
      {activeTab === "dashboard" ? (
        <div className="space-y-6">
          
          {/* SECTION 11 - EXECUTIVE KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* CARD 1: Total Revenue */}
            <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-205/65 dark:border-zinc-800/80 shadow-xs relative overflow-hidden">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                {t("Monthly Revenues")}
              </span>
              <div className="flex items-baseline gap-1.5 mt-2.5">
                <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100">{formatSystemNumber(metrics.totalRevenue)} TL</span>
                <span className="text-xs text-emerald-500 font-mono flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+12%</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center justify-between">
                <span>{t("Direct project invoicing")}</span>
                <span>{t("Active Month")}: {selectedMonth}</span>
              </div>
            </div>

            {/* CARD 2: Man-Days and Utilization */}
            <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-205/65 dark:border-zinc-800/80 shadow-xs relative overflow-hidden">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                {t("Consultant Utilization")}
              </span>
              <div className="flex items-baseline gap-1.5 mt-2.5">
                <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100">{metrics.utilizationPercent.toFixed(1)}%</span>
                <span className={`text-xs font-mono flex items-center gap-0.5 ${metrics.utilizationPercent >= 75 ? "text-emerald-500" : "text-rose-500 animate-pulse font-extrabold"}`}>
                  {metrics.utilizationPercent >= 75 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {metrics.utilizationPercent.toFixed(0)}% {t("Util")}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center justify-between">
                <span>{t("Sold")}: {metrics.soldDays}d / {t("Net")}: {metrics.totalNetCapacityDays}d</span>
                <span className="text-amber-500 font-bold">{t("Target")}: 80%</span>
              </div>
            </div>

            {/* CARD 3: Average Daily Sales Rate & Gross Margin */}
            <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-205/65 dark:border-zinc-800/80 shadow-xs relative overflow-hidden">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                {t("Gross Margin Rate")}
              </span>
              <div className="flex items-baseline gap-1.5 mt-2.5">
                <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatSystemNumber(metrics.grossMargin)} TL</span>
                <span className="text-xs text-sky-500 font-mono font-bold">({metrics.marginPercent.toFixed(0)}% {t("Margin")})</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center justify-between">
                <span>{t("Average Daily Rate")}:</span>
                <span className="font-bold">{metrics.averageDailyRate.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL/{t("day")}</span>
              </div>
            </div>

            {/* CARD 4: Lost Opportunity Value - HIGHLIGHT IN RED (Section 6) */}
            <div className="bg-rose-50/50 dark:bg-rose-950/20 p-5 rounded-xl border border-rose-150 dark:border-rose-900/60 shadow-xs relative overflow-hidden">
              <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider font-mono">
                {t("Lost Opportunity Cost / Bench Cost")}
              </span>
              <div className="flex items-baseline gap-1.5 mt-2.5">
                <span className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400">-{formatSystemNumber(metrics.lostOpportunityValue)} TL</span>
                <span className="text-xs text-rose-500 font-mono font-black animate-pulse">
                  {t("CRITICAL RISK")}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center justify-between">
                <span>{t("Remaining")}: {metrics.remainingDays} {t("unsold days")}</span>
                <span className="text-rose-600 font-bold tracking-tight">{t("Avg rate")}: 18,000 TL</span>
              </div>
            </div>

          </div>

          {/* SECOND CONTAINER CARD - HEATMAP & WORKLOAD SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* SECTION 7 - RESOURCE WORKLOAD HEATMAP */}
            <div className="lg:col-span-8 bg-white dark:bg-[#151515] p-6 rounded-xl border border-slate-200/50 dark:border-zinc-800 shadow-sm relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-5">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-850 dark:text-zinc-100 flex items-center gap-1.5">
                    <Calendar className="w-4.5 h-4.5 text-[#0078D4]" />
                    <span>{t("Resource Workload & Capacity Utilization Chart")}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t("Visualize consultant capacity days vs allocated working days for the chosen period.")}</p>
                </div>
              </div>

              <div className="h-64 mt-2 font-sans text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadBarData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                    <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis label={{ value: t('Days'), angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#71717A', fontSize: 10 } }} tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,120,212,0.03)' }} contentStyle={{ borderRadius: '8px', border: '1px solid #ECEEEF' }} formatter={(val, name) => [val, name === "utilization" ? t("Utilization %") : name]} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
                    <Bar dataKey="capacityDays" name={t("Capacity (Days)")} fill="#0078D4" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="allocatedDays" name={t("Allocated (Days)")} fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="utilization" name={t("Utilization Rate (%)")} fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SECTION 10 - FORECAST MODELS PLANNER */}
            <div className="lg:col-span-4 bg-white dark:bg-[#151515] p-6 rounded-xl border border-slate-200/50 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                    <TrendingUp className="w-4.5 h-4.5 text-rose-500" />
                    <span>{t("6-Month Capacity & Sales Forecast")}</span>
                  </h3>
                  <span className="text-[11px] font-mono bg-sky-50 dark:bg-sky-950/20 text-sky-600 px-2 py-0.5 rounded font-extrabold">{t("Statistical Projection")}</span>
                </div>

                <div className="h-64 font-sans text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecasts} margin={{ top: 10, right: -5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: '#71717A', fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" tickFormatter={(val) => `${(val / 1000)}k`} tick={{ fill: '#0078D4', fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: '#EF4444', fontSize: 9 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #ECEEEF' }} formatter={(val, name) => [name === "revenue" ? `${formatSystemNumber(val)} TL` : `${val} ${t("Days")}`, name === "revenue" ? t("Revenue") : name === "plannedDays" ? t("Allocated Days") : t("Capacity Days")]} />
                      <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10, marginTop: 10 }} />
                      <Bar yAxisId="left" dataKey="revenue" name={t("Revenue Forecast (TL)")} fill="#0078D4" radius={[3, 3, 0, 0]} opacity={0.85} maxBarSize={30} />
                      <Line yAxisId="right" type="monotone" dataKey="capacityDays" name={t("Capacity (Days)")} stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                      <Line yAxisId="right" type="monotone" dataKey="plannedDays" name={t("Planned (Days)")} stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">{t("Forecast Breakdowns:")}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {forecasts.slice(0, 3).map(f => (
                      <div key={f.month} className="p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-100 rounded-md text-center">
                        <span className="block text-[10px] font-bold text-[#0078D4] font-mono">{f.month}</span>
                        <span className="block text-xs font-bold font-mono mt-0.5 text-slate-900 dark:text-zinc-50">{Math.round(f.revenue / 1000)}k TL</span>
                        <span className="text-[9px] text-slate-400 font-mono">{t("Util: {percent}%").replace("{percent}", String(f.utilization))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 mt-4 text-[10px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
                <span>{t("Forecast details dual-axis representation. Left: sales value. Right: resource benchmarks.")}</span>
              </div>
            </div>

          </div>

          {/* RATING PANELS CONTAINER: PROFITABILITY BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* SECTION 8 - CUSTOMER PROFITABILITY */}
            <div className="lg:col-span-6 bg-white dark:bg-[#151515] p-6 rounded-xl border border-slate-200/50 dark:border-zinc-800 shadow-sm relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-850 dark:text-zinc-100 flex items-center gap-1.5">
                    <Building className="w-4.5 h-4.5 text-emerald-500" />
                    <span>{t("Customer Sales & Gross Profitability Rank")}</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-sans">{t("Based on imported invoices. Margin uses the real consultant named on each invoice row (matched to the Consultant Master daily cost) when available, otherwise the Assignments ledger, otherwise an estimated (~) blended consultant daily cost.")}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-zinc-800 font-bold text-slate-405 text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-1">{t("Customer Client")}</th>
                      <th className="py-2.5 text-center">{t("Billed Days")}</th>
                      <th className="py-2.5 text-right">{t("Revenue")}</th>
                      <th className="py-2.5 text-right">{t("Margin %")}</th>
                      <th className="py-2.5 text-center font-mono">{t("Avg Rate")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                    {customerProfitability.map((cp, idx) => (
                      <tr key={cp.name} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/50">
                        <td className="py-3 px-1 font-bold">
                          <span className="text-[11px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded mr-1 font-mono">{idx + 1}</span>
                          <span className="text-slate-800 dark:text-zinc-100">{cp.name}</span>
                        </td>
                        <td className="py-3 text-center font-mono text-slate-700">{cp.days} {t("Days")}</td>
                        <td className="py-3 text-right font-bold text-slate-800 font-mono">{formatSystemNumber(cp.revenue)} TL</td>
                        <td className="py-3 text-right">
                          <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400" title={cp.costEstimated ? t("Estimated cost basis (no matching assignment record for this customer).") : undefined}>
                            {cp.costEstimated && "~"}{cp.margin.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 text-center font-mono text-slate-500">
                          {formatSystemNumber(Math.round(cp.avgRate))}
                        </td>
                      </tr>
                    ))}
                    {customerProfitability.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-mono">{t("No invoices imported for this period yet. Use the Invoice Importer panel to upload your billing Excel/CSV.")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 9 - SERVICE TYPE PROFITABILITY */}
            <div className="lg:col-span-6 bg-white dark:bg-[#151515] p-6 rounded-xl border border-slate-200/50 dark:border-zinc-800 shadow-sm relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-850 dark:text-zinc-100 flex items-center gap-1.5">
                    <Layers className="w-4.5 h-4.5 text-sky-500" />
                    <span>{t("Methodology / Service Line Margins Share")}</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-sans">{t("Based on imported invoices, attributed to each customer's Accepted proposal(s) in Proposal Management. Customers with no matching accepted proposal are grouped separately below.")}</span>
                </div>
              </div>

              {serviceProfitability.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-6 h-52 font-sans text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={serviceProfitability}
                          nameKey="name"
                          dataKey="revenue"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={40}
                          paddingAngle={2}
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {serviceProfitability.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={["#0078D4", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#06B6D4"][idx % 6]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => `${formatSystemNumber(val)} TL`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="md:col-span-6 space-y-2.5">
                    {serviceProfitability.map((sp, idx) => {
                      const color = ["#0078D4", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#06B6D4"][idx % 6];
                      return (
                        <div key={sp.name} className="flex items-start gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: color }} />
                          <div className="flex-1">
                            <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                              <span>{sp.name}</span>
                              <span className="font-mono">{formatSystemNumber(sp.revenue)} TL</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-0.5">
                              <span>{t("Delivered: {days} days").replace("{days}", String(sp.days))}</span>
                              <span
                                className="text-emerald-500 font-bold"
                                title={sp.costEstimated ? t("Estimated cost basis (no matching assignment record for this customer).") : undefined}
                              >
                                {t("Margin: {amount}").replace("{amount}", `${sp.costEstimated ? "~" : ""}${sp.margin.toFixed(0)}%`)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-slate-400 font-mono text-xs text-center px-4">
                  {t("No invoices were found for this period.")}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-500 leading-relaxed">
                <strong>{t("Analysis Explanation:")}</strong> {t("This proportional pie diagram displays the exact billing volume across strategic consulting disciplines. Strong service lines with high delivery margins are critical to off-setting resource benchmark costs.")}
              </div>
            </div>

          </div>

          {/* CONSULTANTS MARGIN RATES & STAFF SUMMARY */}
          <div className="bg-white dark:bg-[#151515] p-6 rounded-xl border border-slate-205/65 dark:border-zinc-800/80 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-zinc-100 mb-4 flex items-center gap-1.5">
              <Users className="w-4.5 h-4.5 text-[#0078D4]" />
              <span>{t("Consultant Financial Performance & Direct Profit Margin")}</span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-150 dark:border-zinc-800 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-3">{t("Consultant")}</th>
                    <th className="py-3 text-center">{t("Allocated Working Days")}</th>
                    <th className="py-3 text-right">{t("Gross Sales Invoiced")}</th>
                    <th className="py-3 text-right">{t("Direct Employee Cost")}</th>
                    <th className="py-3 text-right">{t("Net Project Margin")}</th>
                    <th className="py-3 text-right">{t("Margin / Rate Value")}</th>
                    <th className="py-3 text-center">{t("Billing Efficiency")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                  {consultantProfitability.map((cp) => (
                    <tr key={cp.id} className="hover:bg-slate-55/35 dark:hover:bg-zinc-855/35">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-850 text-slate-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs">
                            {cp.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-850 dark:text-zinc-100 block">{cp.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{cp.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-mono text-slate-700 font-black">
                        {cp.allocatedDays} {t("Days")}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold">{formatSystemNumber(cp.revenue)} TL</td>
                      <td className="py-3.5 text-right font-mono text-slate-500">{formatSystemNumber(cp.cost)} TL</td>
                      <td className="py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                        {formatSystemNumber(cp.profit)} TL
                      </td>
                      <td className="py-3.5 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          cp.margin >= 60
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                            : cp.margin >= 40
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-950/20"
                        }`}>
                          {t("{percent}% Margin").replace("{percent}", cp.margin.toFixed(0))}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="w-full max-w-[80px] bg-slate-100 dark:bg-zinc-800 rounded-full h-2 inline-block overflow-hidden">
                          <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2" style={{ width: `${Math.min(100, (cp.allocatedDays / 22) * 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 12 & 14 - AI COPE DRIVEN ADVISORY PANEL */}
          <div className="bg-[#FAF9F8] dark:bg-[#1f1e1d] rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 flex flex-col gap-6 relative">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                  <span>{t("Gemini Revenue and Resource Optimization Assessment")}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {t("Generate instant, metrics-driven executive sales summaries and prescriptive action recommendations directly utilizing Gemini LLM.")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerAiManagementReview}
                  disabled={isAiLoading}
                  className="px-4 py-2.5 text-xs font-bold leading-none select-none rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isAiLoading ? "animate-spin" : ""}`} />
                  <span>{isAiLoading ? t("Preparing report for General Manager...") : t("Run AI Revenue Analysis")}</span>
                </button>
              </div>
            </div>

            {/* Render local heuristics warning insights side by side with AI output */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              <div className="lg:col-span-4 space-y-3.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-widest block">{t("System Diagnostics Logs:")}</span>
                
                {localInsights.map((li, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed ${
                    li.type === "danger"
                      ? "bg-rose-50/55 border-rose-150 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400"
                      : li.type === "warning"
                      ? "bg-amber-50/55 border-amber-150 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-405"
                      : "bg-emerald-50/55 border-emerald-150 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400"
                  }`}>
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-amber-500 inline-block mt-0.5" />
                    <span>{li.msg}</span>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-8 bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs min-h-[220px] max-h-[480px] overflow-y-auto">
                <span className="text-[10px] font-black uppercase text-[#0078D4] tracking-wider font-mono block mb-3.5">{t("AI Director Executive Performance Review:")}</span>
                
                {aiCoachingOutput ? (
                  <div 
                    className="text-sm leading-relaxed text-slate-900 dark:text-zinc-100 style-html-prose"
                    dangerouslySetInnerHTML={{ __html: aiCoachingOutput }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-3">
                    <Info className="w-10 h-10 text-[#0078D4] animate-bounce" />
                    <p className="text-xs font-medium font-sans">
                      {t("Gemini Commercial Excellence algorithm is loaded with sales logs. Click the button above to fetch executive strategy, loss assessments, and management plan owners.")}
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* SECTION 13 - EXPORTS CONTROLS BAR */}
          <div className="bg-white dark:bg-[#151515] hover:bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 dark:border-zinc-805/85 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-black text-slate-850 dark:text-slate-150 uppercase tracking-widest font-mono">{t("Preserve Filters & Export Options")}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{t("Extract raw tabular comma-delimited logs or produce a printable executive review layout.")}</p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleExportCSV("revenue")}
                className="px-4 py-2 text-xs font-bold bg-[#EDEBE9] hover:bg-[#DEDCDA] dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                <span>{t("Export Revenue Sheet (.CSV)")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportCSV("capacity")}
                className="px-4 py-2 text-xs font-bold bg-[#EDEBE9] hover:bg-[#DEDCDA] dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-500" />
                <span>{t("Export Capacity Report (.CSV)")}</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerPrint}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-black dark:bg-[#2d2c2b] text-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-sky-450" />
                <span>{t("Print Management PDF")}</span>
              </button>
            </div>
          </div>

        </div>
      ) : (
        // TAB: DATA INPUTS & OPERATIONS DECK
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sub-menu panel in data management */}
          <div className="lg:col-span-3 bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-200/55 dark:border-zinc-800/80 shadow-xs h-fit space-y-4">
            <h3 className="text-[13px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider font-mono">
              {t("DATA REPOSITORIES")}
            </h3>
            
            <nav className="space-y-1.5">
              <button
                onClick={() => setActiveDataSubTab("consultants")}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[12px] font-bold transition-all flex items-center justify-between ${
                  activeDataSubTab === "consultants"
                    ? "bg-slate-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{t("Consultant Master Setup")}</span>
                </div>
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-slate-550">
                  {consultants.length}
                </span>
              </button>

              <button
                onClick={() => setActiveDataSubTab("capacity")}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[12px] font-bold transition-all flex items-center justify-between ${
                  activeDataSubTab === "capacity"
                    ? "bg-slate-100 dark:bg-zinc-800 text-[#0078D4] dark:text-sky-450"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{t("Allocated Capacity Days")}</span>
                </div>
                <span className="text-[10px] font-mono bg-[#0078D4]/10 text-[#0078D4] px-1.5 py-0.5 rounded font-extrabold">
                  {t("Active")}
                </span>
              </button>

              <button
                onClick={() => setActiveDataSubTab("assignments")}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[12px] font-bold transition-all flex items-center justify-between ${
                  activeDataSubTab === "assignments"
                    ? "bg-slate-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>{t("Consultant Assignments")}</span>
                </div>
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-slate-550">
                  {assignments.length}
                </span>
              </button>

              <button
                onClick={() => setActiveDataSubTab("invoices")}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[12px] font-bold transition-all flex items-center justify-between ${
                  activeDataSubTab === "invoices"
                    ? "bg-slate-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{t("Invoices & Quick Uploads")}</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                  {invoices.length}
                </span>
              </button>
            </nav>
            
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-900/40 rounded-lg space-y-1 border border-slate-100 dark:border-zinc-800 text-[11px] leading-snug">
              <span className="text-[10px] uppercase font-bold text-slate-450 dark:text-zinc-500 font-mono block">
                {t("DATA INTEGRITY CHECK:")}
              </span>
              <p className="text-slate-500">
                {t("Altered rates or assignments directly ripple calculate dashboard results. Click Excel/CSV in dashboard to back up active rows.")}
              </p>
            </div>
          </div>

          {/* Core content block representing the sub-menu tables */}
          <div className="lg:col-span-9 bg-white dark:bg-[#151515] p-6 rounded-xl border border-slate-200/50 dark:border-zinc-800 shadow-sm relative min-h-[500px] flex flex-col justify-between">
            
            {/* SUB-TAB 1: CONSULTANTS MASTER LIST */}
            {activeDataSubTab === "consultants" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-zinc-800/80 pb-4">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {t("Consultant Master Registry")}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("Define corporate daily cost parameters and commercial billing rates.")}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingConsultant(null);
                      setConsultantForm({
                        name: "",
                        title: "",
                        department: "Operational Excellence",
                        dailyCost: 6000,
                        dailySalesRate: 15000,
                        employmentType: "Full-Time",
                        status: "Active"
                      });
                      setShowConsultantForm(true);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black dark:bg-[#2d2d2d] rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{t("Add Consultant Specialist")}</span>
                  </button>
                </div>

                {/* CONSULTANT DOCK FORM */}
                {showConsultantForm && (
                  <form onSubmit={handleSaveConsultant} className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl space-y-4 border border-slate-150 dark:border-zinc-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {t("Full Name")}
                        </label>
                        <input
                          type="text"
                          required
                          value={consultantForm.name}
                          onChange={(e) => setConsultantForm({ ...consultantForm, name: e.target.value })}
                          placeholder={t("e.g. Ahmet Yılmaz")}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {t("Title/Position")}
                        </label>
                        <input
                          type="text"
                          required
                          value={consultantForm.title}
                          onChange={(e) => setConsultantForm({ ...consultantForm, title: e.target.value })}
                          placeholder={t("e.g. Lean Project Manager")}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {t("Business Unit")}
                        </label>
                        <select
                          value={consultantForm.department}
                          onChange={(e) => setConsultantForm({ ...consultantForm, department: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        >
                          <option value="Operational Excellence">{t("Operational Excellence")}</option>
                          <option value="Industrial Engineering">{t("Industrial Engineering")}</option>
                          <option value="Sales Strategy">{t("Sales Strategy")}</option>
                          <option value="Management Consulting">{t("Management Consulting")}</option>
                        </select>
                      </div>

                      <div className="space-y-1 font-sans">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {t("Daily Internal Cost (TL)")}
                        </label>
                        <input
                          type="number"
                          value={consultantForm.dailyCost || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const sales = consultantForm.dailySalesRate || 0;
                            const ratio = sales > 0 ? parseFloat(((val / sales) * 100).toFixed(1)) : 0;
                            setConsultantForm({
                              ...consultantForm,
                              dailyCost: val,
                              internalCostRatio: ratio
                            });
                          }}
                          placeholder={t("e.g. 6000")}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        />
                      </div>

                      <div className="space-y-1 font-sans">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {t("Daily Standard Sales Rate (TL)")}
                        </label>
                        <input
                          type="number"
                          value={consultantForm.dailySalesRate || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (consultantForm.internalCostRatio) {
                              const cost = parseFloat(((val * consultantForm.internalCostRatio) / 100).toFixed(1));
                              setConsultantForm({
                                ...consultantForm,
                                dailySalesRate: val,
                                dailyCost: cost
                              });
                            } else if (consultantForm.dailyCost) {
                              const ratio = val > 0 ? parseFloat(((consultantForm.dailyCost / val) * 100).toFixed(1)) : 0;
                              setConsultantForm({
                                ...consultantForm,
                                dailySalesRate: val,
                                internalCostRatio: ratio
                              });
                            } else {
                              setConsultantForm({
                                ...consultantForm,
                                dailySalesRate: val
                              });
                            }
                          }}
                          placeholder={t("e.g. 15000")}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        />
                      </div>

                      <div className="space-y-1 font-sans">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {t("Cost Ratio (%)")}
                        </label>
                        <input
                          type="number"
                          value={consultantForm.internalCostRatio !== undefined ? consultantForm.internalCostRatio : ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const sales = consultantForm.dailySalesRate || 0;
                            const cost = parseFloat(((sales * val) / 100).toFixed(1));
                            setConsultantForm({
                              ...consultantForm,
                              internalCostRatio: val,
                              dailyCost: cost
                            });
                          }}
                          placeholder={t("e.g. 40")}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {t("Employment Typology")}
                        </label>
                        <select
                          value={consultantForm.employmentType}
                          onChange={(e) => setConsultantForm({ ...consultantForm, employmentType: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        >
                          <option value="Full-Time">{t("Full-Time (Employee)")}</option>
                          <option value="Part-Time">{t("Part-Time (Resource)")}</option>
                          <option value="Contractor">{t("Contractor (External)")}</option>
                        </select>
                      </div>

                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setShowConsultantForm(false)}
                        className="px-3.5 py-1.5 border border-slate-200 text-slate-500 rounded text-xs"
                      >
                        {t("Cancel")}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#0078D4] hover:bg-[#005a9e] text-white rounded text-xs font-bold"
                      >
                        {t("Register Consultant")}
                      </button>
                    </div>

                  </form>
                )}

                <div className="overflow-x-auto w-full border border-slate-150 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs font-sans min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-150 dark:border-zinc-800 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">{t("Name")}</th>
                        <th className="py-2.5">{t("Position")}</th>
                        <th className="py-2.5 text-right">{t("Daily Cost")}</th>
                        <th className="py-2.5 text-right">{t("Daily Sales Rate")}</th>
                        <th className="py-2.5 text-center">{t("Type")}</th>
                        <th className="py-2.5 text-center">{t("Status")}</th>
                        <th className="py-2.5 text-right px-3">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                      {consultants.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-extrabold">{c.name}</td>
                          <td className="py-3 text-slate-550">
                            {c.title} • {t(c.department)}
                          </td>
                          <td className="py-3 text-right font-mono">{formatSystemNumber(c.dailyCost)} TL</td>
                          <td className="py-3 text-right font-mono font-bold text-emerald-600">{formatSystemNumber(c.dailySalesRate)} TL</td>
                          <td className="py-3 text-center">
                            <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 font-mono px-2 py-0.5 rounded">
                              {t(c.employmentType)}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                            }`}>
                              {t(c.status)}
                            </span>
                          </td>
                          <td className="py-3 text-right space-x-1 px-3">
                            <button
                              onClick={() => handleEditConsultant(c)}
                              className="p-1 text-slate-400 hover:text-sky-500 rounded inline-block cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleConsultantActive(c.id)}
                              className="p-1 px-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded border border-slate-200 dark:border-zinc-700 cursor-pointer inline-block"
                            >
                              {c.status === "Active" ? t("Deactivate") : t("Activate")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: CAPACITY ADJUSTMENTS (Section 2) */}
            {activeDataSubTab === "capacity" && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {t("Consultant Capacity Calibrations ({month})").replace("{month}", selectedMonth)}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t("Define the number of weekly working days (man-days/week) for consultants to calculate their monthly capacity (weekly days x 4.4 standard).")}
                  </p>
                </div>

                <div className="overflow-x-auto w-full border border-slate-150 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs font-sans min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-150 dark:border-zinc-800 font-bold text-slate-400 text-[10px] uppercase">
                        <th className="py-2.5 px-3">{t("Consultant Name")}</th>
                        <th className="py-2.5 text-center">{t("Weekly Working Days (Man-Days / Week)")}</th>
                        <th className="py-2.5 text-center font-bold font-mono">{t("Calculated Monthly Capacity (Days)")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                      {consultants.filter(c => c.status === "Active").map(cons => {
                        const cap = capacities.find(cp => cp.consultantId === cons.id && cp.month === selectedMonth) || {
                          id: "cap-" + Date.now(),
                          consultantId: cons.id,
                          month: selectedMonth,
                          workingDays: 22,
                          vacation: 0,
                          training: 0,
                          sickLeave: 0,
                          internalProjects: 0,
                          manDaysPerWeek: 5
                        };

                        const currentMdpw = cap.manDaysPerWeek ?? 5;
                        const calculatedMonthly = Math.round(currentMdpw * 4.4);

                        const onMdpwChange = (valStr: string) => {
                          const val = parseFloat(valStr) || 0;
                          setCapacities(prev => {
                            const idx = prev.findIndex(c => c.consultantId === cons.id && c.month === selectedMonth);
                            if (idx !== -1) {
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], manDaysPerWeek: val };
                              return updated;
                            } else {
                              const newCap: ConsultantCapacity = {
                                ...cap,
                                manDaysPerWeek: val
                              };
                              return [...prev, newCap];
                            }
                          });
                        };

                        return (
                          <tr key={cons.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-bold">{cons.name}</td>
                            <td className="py-3 text-center">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="7"
                                value={currentMdpw}
                                onChange={(e) => onMdpwChange(e.target.value)}
                                className="w-32 p-1 py-1 text-center bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:border-blue-500 rounded font-mono text-xs font-bold mx-auto block"
                              />
                            </td>
                            <td className="py-3 text-center">
                              <span className="text-xs font-mono font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1.5 rounded-lg">
                                {calculatedMonthly} {t("Days (Monthly Net Capacity)")}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: PROJECT CONSULTANT ASSIGNMENTS (Section 3) */}
            {activeDataSubTab === "assignments" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {t("Consultant Project Allocation Registry")}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("Assign specialists to pipeline contracts and track revenue rates.")}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingAssignment(null);
                      setAssignmentForm({
                        customerName: "",
                        projectName: "",
                        serviceType: "Lean Manufacturing",
                        consultantId: consultants[0]?.id || "c-1",
                        allocatedDays: 10,
                        month: selectedMonth,
                        startDate: `${selectedMonth}-01`,
                        endDate: `${selectedMonth}-15`,
                        customerDailyRate: 18000,
                        consultantDailyRate: 7000,
                        revenueSharePercent: undefined
                      });
                      setShowAssignmentForm(true);
                    }}
                    className="px-3 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black dark:bg-[#2d2d2d] rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{t("Create Assignment")}</span>
                  </button>
                </div>

                {showAssignmentForm && (
                  <form onSubmit={handleSaveAssignment} className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl space-y-4 border border-slate-200 dark:border-zinc-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">{t("Customer Client")}</label>
                        <input
                          type="text"
                          required
                          value={assignmentForm.customerName}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, customerName: e.target.value })}
                          placeholder={t("e.g. Vestel Beyaz Eşya")}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">{t("Project / Engagement Scope")}</label>
                        <input
                          type="text"
                          required
                          value={assignmentForm.projectName}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, projectName: e.target.value })}
                          placeholder={t("e.g. Kaizen VSM Phase I")}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">{t("Consulting Discipline")}</label>
                        <select
                          value={assignmentForm.serviceType}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, serviceType: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        >
                          {SERVICE_TYPES_LIST.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">{t("Consultant Speciality")}</label>
                        <select
                          value={assignmentForm.consultantId}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, consultantId: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        >
                          {consultants.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.title})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">{t("Allocated billable days")}</label>
                        <input
                          type="number"
                          value={assignmentForm.allocatedDays}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, allocatedDays: parseInt(e.target.value, 10) || 5 })}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">{t("Customer daily rate (TL)")}</label>
                        <input
                          type="number"
                          value={assignmentForm.customerDailyRate}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, customerDailyRate: parseFloat(e.target.value) || 15000 })}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">{t("Start Date")}</label>
                        <input
                          type="date"
                          required
                          value={assignmentForm.startDate}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, startDate: e.target.value, month: e.target.value.substring(0, 7) })}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 focus:outline-[#0078D4]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">{t("End Date")}</label>
                        <input
                          type="date"
                          required={!assignmentForm.isOngoing}
                          disabled={assignmentForm.isOngoing}
                          value={assignmentForm.isOngoing ? "" : assignmentForm.endDate}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 disabled:bg-slate-100 dark:disabled:bg-zinc-800 disabled:text-slate-400 focus:outline-[#0078D4]"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          id="isOngoingCheckbox"
                          checked={!!assignmentForm.isOngoing}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, isOngoing: e.target.checked })}
                          className="w-4 h-4 rounded text-[#0078D4] focus:ring-[#0078D4] cursor-pointer"
                        />
                        <label htmlFor="isOngoingCheckbox" className="text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer select-none">
                          {t("Ongoing Project (No End Date)")}
                        </label>
                      </div>

                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setShowAssignmentForm(false)}
                        className="px-3.5 py-1.5 border border-slate-200 text-slate-500 rounded text-xs"
                      >
                        {t("Cancel")}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#0078D4] hover:bg-[#005a9e] text-white rounded text-xs font-bold"
                      >
                        {editingAssignment ? t("Update Allocation") : t("Submit Allocation")}
                      </button>
                    </div>

                  </form>
                )}

                <div className="overflow-x-auto w-full border border-slate-150 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs font-sans min-w-[850px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-150 dark:border-zinc-800 font-bold text-slate-450 text-[10px] uppercase">
                        <th className="py-2.5 px-3">{t("Customer & Scope")}</th>
                        <th className="py-2.5">{t("Methodology & Duration")}</th>
                        <th className="py-2.5 text-center">{t("Consultant Specialist")}</th>
                        <th className="py-2.5 text-center">{t("Allocated Days")}</th>
                        <th className="py-2.5 text-right">{t("Customer Daily Rate")}</th>
                        <th className="py-2.5 text-right font-mono">{t("Total Expected Billing")}</th>
                        <th className="py-2.5 text-right px-3">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                      {assignments.filter(a => isAssignmentActiveInMonth(a, selectedMonth)).map(ass => {
                        const cons = consultants.find(c => c.id === ass.consultantId);
                        return (
                          <tr key={ass.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3">
                              <span className="font-extrabold text-slate-850 dark:text-zinc-150 block">{ass.customerName}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{ass.projectName}</span>
                            </td>
                            <td className="py-3">
                              <span className="bg-sky-50 dark:bg-sky-950/20 text-[#0078D4] text-[10px] font-mono px-2 py-0.5 rounded font-bold block w-fit mb-1">
                                {ass.serviceType}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                {ass.startDate} {ass.isOngoing ? t("→ Ongoing") : `→ ${ass.endDate}`}
                              </span>
                            </td>
                            <td className="py-3 text-center font-bold text-slate-700 dark:text-zinc-300">{cons?.name || t("Unassigned")}</td>
                            <td className="py-3 text-center font-mono font-bold text-amber-600">{ass.allocatedDays} {t("Days")}</td>
                            <td className="py-3 text-right font-mono">{formatSystemNumber(ass.customerDailyRate)} TL</td>
                            <td className="py-3 text-right font-mono font-extrabold text-emerald-600">
                              {formatSystemNumber((ass.allocatedDays * ass.customerDailyRate))} TL
                            </td>
                            <td className="py-3 text-right space-x-1 px-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAssignment(ass);
                                  setAssignmentForm({
                                    customerName: ass.customerName,
                                    projectName: ass.projectName,
                                    serviceType: ass.serviceType,
                                    consultantId: ass.consultantId,
                                    allocatedDays: ass.allocatedDays,
                                    month: ass.month,
                                    startDate: ass.startDate || `${ass.month}-01`,
                                    endDate: ass.endDate || `${ass.month}-15`,
                                    customerDailyRate: ass.customerDailyRate,
                                    consultantDailyRate: ass.consultantDailyRate || 7000,
                                    revenueSharePercent: ass.revenueSharePercent,
                                    isOngoing: !!ass.isOngoing
                                  });
                                  setShowAssignmentForm(true);
                                }}
                                className="p-1 hover:bg-sky-50 dark:hover:bg-zinc-850 text-slate-400 hover:text-[#0078D4] rounded cursor-pointer inline-block"
                                title={t("Edit Assignment")}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAssignment(ass.id)}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded cursor-pointer inline-block"
                                title={t("Delete Assignment")}
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: INVOICE HISTORIES & IMPORTER (Section 4) */}
            {activeDataSubTab === "invoices" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 border-slate-100 dark:border-zinc-800 gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {t("Monthly Billing Invoice Importer Panel")}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("Upload the monthly revenue and invoice table from your accounting program in bulk.")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleTemplate}
                    className="px-3 py-1.5 text-xs font-bold text-[#0078D4] bg-sky-50 dark:bg-sky-950/20 hover:bg-sky-100 dark:hover:bg-sky-900/35 rounded-lg flex items-center gap-1.5 cursor-pointer border border-sky-100 dark:border-sky-950"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t("Download Sample Template (.xlsx)")}</span>
                  </button>
                </div>

                {/* Invoice Importer Drag & Drop Zone */}
                <div className="space-y-4">
                  <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 dark:bg-zinc-900 p-3 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <strong className="text-slate-800 dark:text-zinc-200">{t("Required Column Names:")}</strong> {t("Customer Name, Sold Man-Days, Unit Price, Invoice Subtotal / VAT-Included Total, VAT Info (or similar English/Turkish terms — your accounting system's own export column names, like \"Müşteri\", \"Miktar\", \"Ara Toplam\", \"Genel Toplam\", work as-is). The system matches them automatically.")} <strong className="text-slate-800 dark:text-zinc-200">{t("Date")}</strong> {t("column is optional but recommended — with it, each invoice lands in its real month automatically, and the Range filter above can show any custom date span.")} <strong className="text-slate-800 dark:text-zinc-200">{t("Consultant")}</strong> {t("column (e.g. \"Kategori\"/\"Danışman\") is optional but recommended — with it, margins use that consultant's real daily cost from the Consultant Master list instead of an estimate.")}
                  </div>

                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) processInvoiceFile(file);
                    }}
                    onClick={() => document.getElementById("csv-file-input")?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#0078D4] dark:hover:border-sky-500 rounded-xl p-8 text-center cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 bg-white dark:bg-[#151515] relative shadow-sm"
                  >
                    <input
                      type="file"
                      id="csv-file-input"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-full text-[#0078D4] dark:text-sky-400">
                        <Upload className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-zinc-100">
                          {t("Drag and Drop Invoice Excel/CSV File or Click to Browse")}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {t(".xlsx, .xls and .csv files are accepted. Each row's own date decides its month — the Target Period selector above only affects rows with no recognizable date.")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {importError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded border border-rose-100 dark:border-rose-900">
                      ❌ {importError}
                    </div>
                  )}

                  {importSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded border border-emerald-100 dark:border-emerald-900">
                      ✅ {importSuccess}
                    </div>
                  )}
                </div>

                {/* Import logs auditing */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-widest block">
                    {t("Activity logs & import history traces:")}
                  </span>
                  <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-3 rounded-lg max-h-[120px] overflow-y-auto space-y-1">
                    {importLogs.map((log, idx) => (
                      <p key={idx} className="font-mono text-[10px] text-slate-550">{log}</p>
                    ))}
                  </div>
                </div>

                {/* Invoices tabular layout */}
                <div className="space-y-2 pt-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-widest block">
                    {t("Invoiced accounts database registry:")}
                  </span>
                  <div className="overflow-x-auto w-full border border-slate-150 dark:border-zinc-800 rounded-xl">
                    <table className="w-full text-left text-xs font-sans min-w-[1150px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-150 dark:border-zinc-800 font-bold text-slate-450 text-[10px] uppercase">
                          <th className="py-2.5 px-3">{t("Invoice Code")}</th>
                          <th className="py-2.5 text-left">{t("Customer Name")}</th>
                          <th className="py-2.5 text-left">{t("Consultant")}</th>
                          <th className="py-2.5 text-center">{t("Date")}</th>
                          <th className="py-2.5 text-center">{t("Month")}</th>
                          <th className="py-2.5 text-center">{t("Delivered Days")}</th>
                          <th className="py-2.5 text-right">{t("Unit Price")}</th>
                          <th className="py-2.5 text-right">{t("Invoice Total")}</th>
                          <th className="py-2.5 text-center">{t("VAT Rate")}</th>
                          <th className="py-2.5 text-right">{t("VAT Amount")}</th>
                          <th className="py-2.5 text-right">{t("Total with VAT")}</th>
                          <th className="py-2.5 text-right px-3">{t("Actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                        {invoices.filter(i => isInSelectedPeriod(i.month)).map((inv) => {
                          const days = inv.deliveredDays || 0;
                          const unitPrice = inv.unitPrice || (days > 0 ? Math.round(inv.amount / days) : 0);
                          const vatRate = inv.vatRate !== undefined ? inv.vatRate : 20;
                          const vatAmount = inv.vatAmount !== undefined ? inv.vatAmount : Math.round(inv.amount * (vatRate / 100));
                          const grandTotal = inv.grandTotal !== undefined && inv.grandTotal > 0 ? inv.grandTotal : inv.amount + vatAmount;

                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/50 text-slate-800 dark:text-zinc-200">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{inv.invoiceNumber}</td>
                              <td className="py-2.5 font-extrabold text-slate-800 dark:text-zinc-150">{inv.customerName}</td>
                              <td className="py-2.5 text-slate-600 dark:text-zinc-400">{inv.consultantNames && inv.consultantNames.length > 0 ? inv.consultantNames.join(" + ") : "-"}</td>
                              <td className="py-2.5 text-center font-mono text-slate-500 dark:text-zinc-500">{inv.invoiceDate || "-"}</td>
                              <td className="py-2.5 text-center font-mono font-semibold text-slate-600 dark:text-zinc-400">{inv.month}</td>
                              <td className="py-2.5 text-center font-mono font-bold text-slate-700 dark:text-zinc-300">{days} {t("Days")}</td>
                              <td className="py-2.5 text-right font-mono text-slate-600 dark:text-zinc-400">{formatSystemNumber(unitPrice)} TL</td>
                              <td className="py-2.5 text-right font-mono font-bold text-slate-800 dark:text-zinc-200">{formatSystemNumber(inv.amount)} TL</td>
                              <td className="py-2.5 text-center font-mono text-amber-600">%{vatRate}</td>
                              <td className="py-2.5 text-right font-mono text-slate-600 dark:text-zinc-400">{formatSystemNumber(vatAmount)} TL</td>
                              <td className="py-2.5 text-right font-mono font-extrabold text-[#0078D4] dark:text-sky-400">{formatSystemNumber(grandTotal)} TL</td>
                              <td className="py-2.5 text-right px-3">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  className="p-1 text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-950/35 rounded transition-all cursor-pointer inline-flex items-center"
                                  title={t("Delete Invoice")}
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* Bottom info banner */}
            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 text-[10px] text-slate-450 font-mono text-center">
              {t("Active Environment Database Connection: LocalStorage Sandbox Encrypted. Last sync: {month}-20").replace("{month}", selectedMonth)}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
