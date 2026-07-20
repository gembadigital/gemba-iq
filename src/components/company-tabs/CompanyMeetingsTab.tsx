import React, { useState } from "react";
import { CalendarClock, Plus, Trash2, Users } from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";
import { CrmDb } from "../../lib/CrmDb";

// Item 1: "Müşteriler sayfası, müşteriler kartında opex puanı kısmını
// kaldır. bunun yerine. Toplantı segmesi ekle. tarih eklensin ve toplantı
// tutanağı kısmı eklensin." — replaces the old "Lean Opex Matrix" tab
// (CompanyOpexTab) with a simple meeting log: date + meeting minutes
// (tutanak), stored per-company via CrmDb's generic KV store (same
// persistence pattern the old Opex tab used).

export interface CompanyMeeting {
  id: string;
  date: string; // yyyy-mm-dd
  notes: string; // tutanak
  createdAt: string;
  createdBy: string;
}

interface CompanyMeetingsTabProps {
  companyId: string;
  lang: "TR" | "EN";
  companyName: string;
  onLogTimelineEvent?: (title: string, desc: string, type: string) => void;
}

export default function CompanyMeetingsTab({
  companyId,
  onLogTimelineEvent,
}: CompanyMeetingsTabProps) {
  const { t } = useLanguage();
  const meetingsKey = `crm_company_meetings_${companyId}`;

  const [meetings, setMeetings] = useState<CompanyMeeting[]>(() =>
    CrmDb.getKv<CompanyMeeting[]>(meetingsKey, [])
  );
  const [newDate, setNewDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [newNotes, setNewNotes] = useState("");

  const persist = (updated: CompanyMeeting[]) => {
    setMeetings(updated);
    CrmDb.setKv(meetingsKey, updated);
  };

  const handleAddMeeting = () => {
    if (!newDate || !newNotes.trim()) return;
    const meeting: CompanyMeeting = {
      id: `meeting-${Date.now()}`,
      date: newDate,
      notes: newNotes.trim(),
      createdAt: new Date().toISOString(),
      createdBy: "Atakan Zehir",
    };
    const updated = [meeting, ...meetings].sort((a, b) => (a.date < b.date ? 1 : -1));
    persist(updated);
    if (onLogTimelineEvent) {
      onLogTimelineEvent(t("Meeting Logged"), `${newDate}: ${newNotes.trim().slice(0, 120)}`, "meeting");
    }
    setNewNotes("");
  };

  const handleDeleteMeeting = (id: string) => {
    persist(meetings.filter((m) => m.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans text-xs">
      {/* LEFT: Add Meeting Form (5 columns) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
            <CalendarClock className="w-4 h-4 text-violet-500" />
            <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
              {t("Log New Meeting")}
            </h4>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 font-mono">
              {t("Meeting Date")}
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full p-1.5 bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 font-mono">
              {t("Meeting Minutes")}
            </label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder={t("Meeting minutes / notes...")}
              className="w-full p-2 bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded text-xs text-slate-800 dark:text-zinc-200 focus:outline-none min-h-[140px] resize-y"
            />
          </div>

          <button
            type="button"
            onClick={handleAddMeeting}
            disabled={!newDate || !newNotes.trim()}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("Save Meeting")}
          </button>
        </div>
      </div>

      {/* RIGHT: Meeting History (7 columns) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white dark:bg-[#151515] p-5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
            <Users className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
              {t("Meeting History")}
            </h4>
          </div>

          {meetings.length === 0 ? (
            <div className="p-10 text-center">
              <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span className="text-slate-400">{t("No meetings logged for this account yet.")}</span>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {meetings.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/50 rounded-lg space-y-1.5 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-[11px]">
                      {m.date}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMeeting(m.id)}
                      className="p-1 opacity-60 group-hover:opacity-100 hover:bg-rose-100 dark:hover:bg-rose-950/20 text-rose-500 rounded transition-all cursor-pointer"
                      title={t("Delete")}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap text-[11px]">
                    {m.notes}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
