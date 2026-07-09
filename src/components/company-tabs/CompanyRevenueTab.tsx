import React, { useState, useMemo } from "react";
import { CrmDb, CrmDocument } from "../../lib/CrmDb";
import { getSystemCurrency } from "../../lib/currencyHelper";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { DollarSign, TrendingUp, Receipt, Plus, Sparkles, CheckCircle, RefreshCw, FileText } from "lucide-react";

interface CompanyRevenueTabProps {
  companyId: string;
  lang: "TR" | "EN";
  companyName: string;
  onLogTimelineEvent?: (title: string, desc: string, type: string) => void;
}

interface BillingItem {
  id: string;
  milestone: string;
  amount: number;
  date: string;
  status: "Paid" | "Pending" | "Draft";
}

export default function CompanyRevenueTab({
  companyId,
  lang,
  companyName,
  onLogTimelineEvent
}: CompanyRevenueTabProps) {
  // Fetch deals
  const deals = useMemo(() => {
    return CrmDb.getDealsByCompany(companyId);
  }, [companyId]);

  // Billing Schedule local state
  const [billingList, setBillingList] = useState<BillingItem[]>(() => {
    const key = `crm_company_billing_${companyId}`;
    const saved = CrmDb.getKv<BillingItem[] | null>(key, null);
    if (saved && saved.length > 0) return saved;

    // Default mock milestones based on deals
    const defaults: BillingItem[] = [
      { id: "b1", milestone: lang === "TR" ? "Aşama 1: Yalın Ön Teşhis ve VSM Değerlendirmesi (%30)" : "Milestone 1: Lean Diagnosis & VSM Assessment (30%)", amount: 15000, date: "2026-06-15", status: "Paid" },
      { id: "b2", milestone: lang === "TR" ? "Aşama 2: Kaizen Blitz & SMED Kalıp Hızlandırma (%40)" : "Milestone 2: Kaizen Blitz & SMED Speedup (40%)", amount: 20000, date: "2026-07-20", status: "Pending" },
      { id: "b3", milestone: lang === "TR" ? "Aşama 3: Standart İş SOP Kartları ve OEE Kapanış Raporu (%30)" : "Milestone 3: Standard SOP Deployment & Final OEE Audit (30%)", amount: 15000, date: "2026-08-30", status: "Draft" }
    ];
    CrmDb.setKv(key, defaults);
    return defaults;
  });

  const saveBillingList = (updated: BillingItem[]) => {
    setBillingList(updated);
    CrmDb.setKv(`crm_company_billing_${companyId}`, updated);
  };

  // Metrics
  const metrics = useMemo(() => {
    let signedValue = 0;
    let pipelineValue = 0;
    let weightedPipeline = 0;
    let activeDealsCount = 0;

    deals.forEach(d => {
      const val = Number(d.opportunityValue) || 0;
      if (d.stage === "Won" || d.stage === "Closed Won") {
        signedValue += val;
      } else if (d.stage !== "Lost" && d.stage !== "Closed Lost") {
        pipelineValue += val;
        weightedPipeline += val * ((Number(d.winProbability) || 50) / 100);
        activeDealsCount++;
      }
    });

    // If no deals exist, default some values for realistic mock rendering
    if (signedValue === 0 && deals.length === 0) {
      signedValue = 50000; // default initial contract
    }

    return {
      signedValue,
      pipelineValue,
      weightedPipeline: Math.round(weightedPipeline),
      activeDealsCount
    };
  }, [deals]);

  // Handle Mark as Paid
  const handleMarkAsPaid = (id: string, milestone: string, amount: number) => {
    const updated = billingList.map(b => b.id === id ? { ...b, status: "Paid" as const } : b);
    saveBillingList(updated);

    // Create a mock invoice document automatically!
    CrmDb.createDocument({
      companyId,
      name: `Invoice_${milestone.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)}.pdf`,
      type: "application/pdf",
      size: "124 KB",
      date: new Date().toISOString().split("T")[0]
    });

    if (onLogTimelineEvent) {
      onLogTimelineEvent(
        lang === "TR" ? "Fatura Tahsil Edildi" : "Milestone Invoice Collected",
        `${milestone} ödemesi olan ${getSystemCurrency().symbol}${amount.toLocaleString()} tutar tahsil edildi ve faturası düzenlendi.`,
        "opex"
      );
    }
  };

  // Add Custom Billing Milestone Form
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    milestone: "",
    amount: 10000,
    date: new Date().toISOString().split("T")[0],
    status: "Draft" as "Paid" | "Pending" | "Draft"
  });

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.milestone) return;

    const newItem: BillingItem = {
      id: `milestone-${Date.now()}`,
      milestone: newMilestone.milestone,
      amount: Number(newMilestone.amount) || 0,
      date: newMilestone.date,
      status: newMilestone.status
    };

    const updated = [...billingList, newItem];
    saveBillingList(updated);

    if (onLogTimelineEvent) {
      onLogTimelineEvent(
        lang === "TR" ? "Yeni Hakediş Eklediniz" : "New Billing Milestone Created",
        `${newMilestone.milestone} - ${getSystemCurrency().symbol}${newMilestone.amount.toLocaleString()}`,
        "system"
      );
    }

    setIsAddingMilestone(false);
    setNewMilestone({
      milestone: "",
      amount: 10000,
      date: new Date().toISOString().split("T")[0],
      status: "Draft"
    });
  };

  // Revenue Projection Chart Data (6-Month Forecast)
  const projectionChartData = useMemo(() => {
    const months = lang === "TR" 
      ? ["Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"] 
      : ["July", "August", "September", "October", "November", "December"];
    
    // Scale projection based on signed and pipeline deals
    const signedMonthly = Math.round(metrics.signedValue / 4);
    const pipelineMonthly = Math.round(metrics.weightedPipeline / 3);

    return [
      { month: months[0], "Contract Revenue": signedMonthly, "Pipeline (Weighted)": 0 },
      { month: months[1], "Contract Revenue": signedMonthly, "Pipeline (Weighted)": pipelineMonthly * 0.3 },
      { month: months[2], "Contract Revenue": Math.round(signedMonthly * 0.8), "Pipeline (Weighted)": pipelineMonthly * 0.6 },
      { month: months[3], "Contract Revenue": Math.round(signedMonthly * 0.5), "Pipeline (Weighted)": pipelineMonthly },
      { month: months[4], "Contract Revenue": 0, "Pipeline (Weighted)": Math.round(pipelineMonthly * 1.2) },
      { month: months[5], "Contract Revenue": 0, "Pipeline (Weighted)": Math.round(pipelineMonthly * 1.5) }
    ];
  }, [metrics, lang]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans text-xs">
      
      {/* LEFT: Invoicing / Milestones Schedule (7 columns) */}
      <div className="lg:col-span-7 space-y-4">
        
        {/* Core Financial Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="bg-white dark:bg-[#151515] p-4.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[9px] uppercase font-bold tracking-wider font-mono">{lang === "TR" ? "İmzalı Ciro" : "Contract Value"}</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-base font-extrabold text-slate-850 dark:text-white font-mono">
              {getSystemCurrency().symbol}{metrics.signedValue.toLocaleString()}
            </div>
            <p className="text-[9px] text-emerald-500 font-mono">✓ {lang === "TR" ? "Onaylı Taahhütler" : "Closed-Won Contract"}</p>
          </div>

          <div className="bg-white dark:bg-[#151515] p-4.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[9px] uppercase font-bold tracking-wider font-mono">{lang === "TR" ? "Açık Fırsatlar" : "Sales Pipeline"}</span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-base font-extrabold text-slate-850 dark:text-white font-mono">
              {getSystemCurrency().symbol}{metrics.pipelineValue.toLocaleString()}
            </div>
            <p className="text-[9px] text-indigo-500 font-mono">★ {metrics.activeDealsCount} {lang === "TR" ? "Aktif Fırsat" : "Deals in Pipeline"}</p>
          </div>

          <div className="bg-white dark:bg-[#151515] p-4.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[9px] uppercase font-bold tracking-wider font-mono">{lang === "TR" ? "Ağırlıklı Boru" : "Weighted Pipeline"}</span>
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            </div>
            <div className="text-base font-extrabold text-slate-850 dark:text-white font-mono">
              {getSystemCurrency().symbol}{metrics.weightedPipeline.toLocaleString()}
            </div>
            <p className="text-[9px] text-amber-500 font-mono">⚡ {lang === "TR" ? "Olasılık Bazlı Tahmin" : "Adjusted Probability"}</p>
          </div>

        </div>

        {/* Milestone Billing Table */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
                {lang === "TR" ? "Hakediş ve Faturalama Planı" : "Milestone Billing & Invoicing Plan"}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingMilestone(!isAddingMilestone)}
              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-slate-205 dark:border-zinc-700 rounded font-bold flex items-center gap-1 cursor-pointer transition-colors text-[10px]"
            >
              <Plus className="w-3 h-3" />
              <span>{lang === "TR" ? "Hakediş Ekle" : "Add Milestone"}</span>
            </button>
          </div>

          {/* Add Milestone Form */}
          {isAddingMilestone && (
            <form
              onSubmit={handleCreateMilestone}
              className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg space-y-3 animate-fadeIn"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">{lang === "TR" ? "Aşama / Açıklama *" : "Milestone Detail *"}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Milestone 4: OEE Verification Audit"
                    value={newMilestone.milestone}
                    onChange={(e) => setNewMilestone({ ...newMilestone, milestone: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">{lang === "TR" ? `Tutar (${getSystemCurrency().symbol}) *` : `Amount (${getSystemCurrency().symbol}) *`}</label>
                  <input
                    type="number"
                    required
                    value={newMilestone.amount}
                    onChange={(e) => setNewMilestone({ ...newMilestone, amount: Number(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">{lang === "TR" ? "Tahmini Tarih" : "Expected Date"}</label>
                  <input
                    type="date"
                    value={newMilestone.date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Status</label>
                  <select
                    value={newMilestone.status}
                    onChange={(e: any) => setNewMilestone({ ...newMilestone, status: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-1.5 pt-2 border-t border-dashed border-slate-205 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddingMilestone(false)}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold cursor-pointer"
                >
                  {lang === "TR" ? "İptal" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer"
                >
                  {lang === "TR" ? "Ekle" : "Confirm"}
                </button>
              </div>
            </form>
          )}

          {/* Billing List Data Grid */}
          <div className="overflow-x-auto border border-slate-100 dark:border-zinc-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                  <th className="p-3 pl-4">{lang === "TR" ? "Hakediş Aşama Kalemi" : "Milestone Description"}</th>
                  <th className="p-3">{lang === "TR" ? "Tarih" : "Expected Date"}</th>
                  <th className="p-3">{lang === "TR" ? "Tutar" : "Billing Value"}</th>
                  <th className="p-3">{lang === "TR" ? "Durum" : "Payment"}</th>
                  <th className="p-3 text-right pr-4">{lang === "TR" ? "İşlem" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-zinc-850">
                {billingList.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="p-3 pl-4 font-semibold text-slate-800 dark:text-zinc-200">{bill.milestone}</td>
                    <td className="p-3 font-mono text-slate-550 dark:text-zinc-400">{bill.date}</td>
                    <td className="p-3 font-extrabold text-slate-800 dark:text-zinc-100 font-mono">{getSystemCurrency().symbol}{bill.amount.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                        bill.status === "Paid" 
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" 
                          : bill.status === "Pending" 
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400" 
                            : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-450"
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="p-3 text-right pr-4">
                      {bill.status !== "Paid" && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsPaid(bill.id, bill.milestone, bill.amount)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 rounded font-bold cursor-pointer text-[10px] flex items-center gap-1 ml-auto"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>{lang === "TR" ? "Tahsil Et" : "Mark Paid"}</span>
                        </button>
                      )}
                      {bill.status === "Paid" && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {lang === "TR" ? "Tamamlandı" : "Completed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* RIGHT: Financial Projection AreaChart Forecast (5 columns) */}
      <div className="lg:col-span-5 space-y-4">
        
        {/* projected revenue 6-month forecast charting */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-2.5">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
              {lang === "TR" ? "6 Aylık Ciro Projeksiyonu" : "6-Month Projected Revenue Forecast"}
            </h4>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorContract" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} />
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="Contract Revenue"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorContract)"
                />
                <Area
                  type="monotone"
                  dataKey="Pipeline (Weighted)"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorPipeline)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Financial compliance check */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-xl flex items-start gap-2.5 text-xs font-sans">
          <Receipt className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-extrabold text-[11px] block">{lang === "TR" ? "Hakediş & Faturalama Uyarıcı" : "Invoicing Compliance Check"}</span>
            <p className="text-[11px] text-slate-650 dark:text-amber-300 leading-normal">
              {lang === "TR" 
                ? "Sözleşmeli işlerimizde, her aşama (ön teşhis, Kaizen, kapatma) tamamlandığında fatura tahsilatını onaylamanız hakedişlerinizin ve mali tablolarınızın doğru hesaplanması için kritiktir."
                : "Ensure each completed diagnostic milestone is immediately flagged. Approvals generate PDF logs within documents to lock revenue and ensure tax ledger alignment."}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
