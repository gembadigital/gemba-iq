import React, { useEffect, useState } from "react";
import { XCircle, CalendarClock } from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";

// Shared "why did we lose this" modal, used by both:
// - DealManagementView.tsx (Kanban drag-drop + list-view stage select, when a
//   deal moves into a "Lost" stage)
// - ProposalManagementView.tsx (the "Reject" button in the proposal detail
//   drawer, replacing the old native prompt())
//
// Captures a fixed loss-reason option (+ optional free-text note) and an
// optional re-contact reminder date range. The caller is responsible for
// persisting the result onto the Deal/Proposal and for creating the
// CrmDb reminder task (see DealManagementView/ProposalManagementView).

export const LOSS_REASON_OPTIONS = [
  "Project cancelled",
  "Postponed",
  "Went with different company",
  "Proposal too expensive",
  "Other",
] as const;

export interface LossReasonResult {
  lossReason: string;
  lossReasonNote?: string;
  reminderStart?: string;
  reminderEnd?: string;
}

interface LossReasonModalProps {
  open: boolean;
  contextLabel: string;
  onCancel: () => void;
  onConfirm: (result: LossReasonResult) => void;
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function LossReasonModal({ open, contextLabel, onCancel, onConfirm }: LossReasonModalProps) {
  const { t } = useLanguage();
  const [lossReason, setLossReason] = useState<string>("");
  const [lossReasonNote, setLossReasonNote] = useState("");
  const [createReminder, setCreateReminder] = useState(true);
  const [reminderStart, setReminderStart] = useState("");
  const [reminderEnd, setReminderEnd] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setLossReason("");
      setLossReasonNote("");
      setCreateReminder(true);
      const today = new Date();
      setReminderStart(addDays(today, 90));
      setReminderEnd(addDays(today, 97));
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const handleStartChange = (value: string) => {
    setReminderStart(value);
    if (value && reminderEnd && reminderEnd < value) {
      setReminderEnd(addDays(new Date(value), 7));
    }
  };

  const handleSubmit = () => {
    if (!lossReason) {
      setError(t("Please select a loss reason."));
      return;
    }
    if (createReminder) {
      if (!reminderStart || !reminderEnd) {
        setError(t("Please set both reminder dates, or turn the reminder off."));
        return;
      }
      if (reminderEnd < reminderStart) {
        setError(t("End date must be after start date."));
        return;
      }
    }
    onConfirm({
      lossReason,
      lossReasonNote: lossReasonNote.trim() || undefined,
      reminderStart: createReminder ? reminderStart : undefined,
      reminderEnd: createReminder ? reminderEnd : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loss-reason-modal-title"
    >
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-scaleIn text-xs p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-full shrink-0 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 id="loss-reason-modal-title" className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
              {t("Loss Reason")}
            </h3>
            {contextLabel && (
              <p className="text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug truncate max-w-[22rem]">
                {contextLabel}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              {t("Why was this lost?")}
            </label>
            <select
              value={lossReason}
              onChange={(e) => { setLossReason(e.target.value); setError(""); }}
              className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-2 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100"
            >
              <option value="">{t("-- Select --")}</option>
              {LOSS_REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{t(opt)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              {t("Loss reason notes (optional)")}
            </label>
            <textarea
              value={lossReasonNote}
              onChange={(e) => setLossReasonNote(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-2 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 resize-none"
              placeholder={t("Any extra context (optional)")}
            />
          </div>

          <div className="border-t border-slate-200 dark:border-zinc-800 pt-3">
            <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={createReminder}
                onChange={(e) => setCreateReminder(e.target.checked)}
                className="rounded"
              />
              <CalendarClock className="w-3.5 h-3.5" />
              {t("Create a re-contact reminder")}
            </label>
            {createReminder && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-slate-500 dark:text-zinc-400 mb-1">
                    {t("Re-contact window start")}
                  </label>
                  <input
                    type="date"
                    value={reminderStart}
                    onChange={(e) => { handleStartChange(e.target.value); setError(""); }}
                    className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-zinc-400 mb-1">
                    {t("Re-contact window end")}
                  </label>
                  <input
                    type="date"
                    value={reminderEnd}
                    min={reminderStart || undefined}
                    onChange={(e) => { setReminderEnd(e.target.value); setError(""); }}
                    className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100"
                  />
                </div>
                <p className="col-span-2 text-slate-400 dark:text-zinc-500 leading-snug">
                  {t("A reminder email will be sent to the owner (or admin) when this window starts.")}
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg font-semibold cursor-pointer"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-1.5 rounded-lg font-bold text-white cursor-pointer bg-rose-600 hover:bg-rose-700"
          >
            {t("Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
