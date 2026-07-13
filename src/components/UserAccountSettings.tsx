import React from "react";
import { Mail, User } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { useOrganization } from "../lib/OrganizationContext";

interface UserAccountSettingsProps {
  onClose: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}

export default function UserAccountSettings({
  darkMode: _darkMode,
  onToggleTheme: _onToggleTheme,
}: UserAccountSettingsProps) {
  const { t } = useLanguage();
  const { actorName, actorEmail } = useOrganization();

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#11100f] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {t("Personal Scope")}
            </p>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              {t("My Account")}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("Personal Microsoft 365 mailbox integration will be available in Phase 2.")}
            </p>
          </div>
          <div className="text-right text-xs">
            <div className="font-bold text-slate-900 dark:text-slate-100">{actorName}</div>
            <div className="text-slate-500 dark:text-slate-400">{actorEmail}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#11100f] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("My Profile")}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("Name, email, and identity come from your authenticated user profile.")}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200/80 dark:border-blue-950/50 bg-blue-50/20 dark:bg-blue-950/10 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("Personal Mailbox")}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("Personal Microsoft 365 mailbox integration will be available in Phase 2.")}
            </p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              {t("No personal mailbox actions are available in Phase 1.")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
