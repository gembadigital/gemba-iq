import React from "react";
import { User, Key, Globe, Sun, Bell, Shield } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface UserAccountSettingsProps {
  onClose: () => void;
}

const SECTIONS = [
  { id: "profile", icon: User, titleKey: "Profile Information" },
  { id: "password", icon: Key, titleKey: "Change Password" },
  { id: "language", icon: Globe, titleKey: "Language" },
  { id: "theme", icon: Sun, titleKey: "Theme" },
  { id: "notifications", icon: Bell, titleKey: "Notification Preferences" },
  { id: "security", icon: Shield, titleKey: "Security" },
] as const;

export default function UserAccountSettings({ onClose: _onClose }: UserAccountSettingsProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {SECTIONS.map(({ id, icon: Icon, titleKey }) => (
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
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("Coming soon")}
              </p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
