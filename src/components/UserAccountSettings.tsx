import React from "react";
import {
  Bell,
  Globe,
  Palette,
  PenLine,
  Sparkles,
  User,
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { useOrganization } from "../lib/OrganizationContext";

interface UserAccountSettingsProps {
  onClose: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}

const SECTIONS = [
  { id: "profile", icon: User, titleKey: "My Profile" },
  { id: "signature", icon: PenLine, titleKey: "Mail Signature" },
  { id: "notifications", icon: Bell, titleKey: "Notifications" },
  { id: "language", icon: Globe, titleKey: "Language" },
  { id: "theme", icon: Palette, titleKey: "Theme" },
  { id: "ai", icon: Sparkles, titleKey: "Personal AI Preferences" },
] as const;

export default function UserAccountSettings({
  darkMode,
  onToggleTheme,
}: UserAccountSettingsProps) {
  const { lang, setLang, t } = useLanguage();
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
              {t("Account")}
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

      {SECTIONS.filter((section) => section.id !== "profile").map(({ id, icon: Icon, titleKey }) => (
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
