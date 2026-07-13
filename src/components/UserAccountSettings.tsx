import React, { useMemo } from "react";
import {
  Bell,
  CheckCircle2,
  Globe,
  Mail,
  Palette,
  PenLine,
  Sparkles,
  User,
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { useOrganization } from "../lib/OrganizationContext";
import type { MailboxSession } from "../types";

interface UserAccountSettingsProps {
  onClose: () => void;
  session: MailboxSession | null;
  darkMode: boolean;
  onToggleTheme: () => void;
}

const SECTIONS = [
  { id: "profile", icon: User, titleKey: "My Profile" },
  { id: "m365", icon: Mail, titleKey: "Microsoft 365 Connection" },
  { id: "signature", icon: PenLine, titleKey: "Mail Signature" },
  { id: "notifications", icon: Bell, titleKey: "Notifications" },
  { id: "language", icon: Globe, titleKey: "Language" },
  { id: "theme", icon: Palette, titleKey: "Theme" },
  { id: "ai", icon: Sparkles, titleKey: "Personal AI Preferences" },
] as const;

export default function UserAccountSettings({
  session,
  darkMode,
  onToggleTheme,
}: UserAccountSettingsProps) {
  const { lang, setLang, t } = useLanguage();
  const { actorName, actorEmail } = useOrganization();

  const defaultMailbox = useMemo(
    () => session
      ? {
          id: session.mail || "organization-mailbox",
          mailboxAddress: session.mail,
          displayName: session.displayName,
          provider: "Microsoft 365",
          status: session.isConnected ? "Connected" : "Expired",
          connectedAt: new Date().toISOString(),
          defaultMailbox: true,
        }
      : null,
    [session]
  );

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
              {t("These settings belong only to the signed-in user. Organization resources are managed separately by ADMIN.")}
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

      <section className="rounded-2xl border border-blue-200/80 dark:border-blue-950/50 bg-blue-50/20 dark:bg-blue-950/10 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("Microsoft 365 Connection")}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("Microsoft 365 is connected by ADMIN at organization scope. Your account automatically uses the organization mailbox.")}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t("Mailbox Connections")}
            </h4>
            <span className="text-[10px] font-bold text-slate-400">
              {t("Multiple mailbox ready")}
            </span>
          </div>

          {defaultMailbox ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-800 p-3 text-xs">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">
                    {defaultMailbox.mailboxAddress}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {defaultMailbox.provider} · {t("Organization shared mailbox")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {defaultMailbox.defaultMailbox && (
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 text-[10px] font-bold">
                      {t("Default Mailbox")}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                    <CheckCircle2 className="h-3 w-3" />
                    {t(defaultMailbox.status)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("No organization mailbox is connected yet. Ask an ADMIN to connect Microsoft 365 in Organization Settings.")}
            </p>
          )}
        </div>
      </section>

      {SECTIONS.filter((section) => !["profile", "m365"].includes(section.id)).map(({ id, icon: Icon, titleKey }) => (
        <section
          key={id}
          className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#11100f] p-5"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t(titleKey)}
              </h3>
              {id === "language" ? (
                <div className="mt-3 flex gap-2">
                  {(["TR", "EN"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setLang(option)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        lang === option
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : id === "theme" ? (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {darkMode ? t("Switch to Light Theme") : t("Switch to Dark Theme")}
                </button>
              ) : (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("Personal setting reserved for the signed-in user.")}
                </p>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
