import React from "react";
import { AlertTriangle } from "lucide-react";

// Shared confirm dialog - see docs/IYILESTIRME_PLANI.md Faz 4.
//
// Goal: replace scattered native confirm()/alert() calls (169 call sites
// across the app before this) with one consistent, branded modal. Pair this
// component with the useConfirm() hook (src/lib/useConfirm.tsx), which gives
// call sites the exact same call shape as the native confirm() they're
// replacing: `const ok = await confirm({ title, message }); if (ok) { ... }`.
//
// Being introduced module-by-module as each screen is revisited, starting
// with CompaniesView.tsx - not a single big-bang rewrite of all 169 call
// sites at once (too risky to verify in one pass).

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
    >
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl animate-scaleIn text-xs p-5">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-full shrink-0 ${
              danger
                ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                : "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 id="confirm-modal-title" className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
              {title}
            </h3>
            <p id="confirm-modal-message" className="text-slate-500 dark:text-zinc-400 mt-1 leading-snug">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg font-semibold cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-lg font-bold text-white cursor-pointer ${
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
