import React, { useEffect, useState } from "react";
import { Mail, User, Plus, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { useOrganization } from "../lib/OrganizationContext";
import {
  PersonalMailbox,
  connectPersonalMailbox,
  disconnectPersonalMailbox,
  fetchPersonalMailbox,
  testPersonalMailbox,
} from "../lib/personalMailbox";

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

  const [mailbox, setMailbox] = useState<PersonalMailbox | null>(null);
  const [mailboxAddress, setMailboxAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPersonalMailbox()
      .then((data) => {
        if (cancelled) return;
        setMailbox(data);
        setMailboxAddress(data.mailbox_address || actorEmail || "");
      })
      .catch((err) => {
        if (cancelled) return;
        setMailboxAddress(actorEmail || "");
        setMessage({ text: err.message || t("Failed to load personal mailbox."), type: "error" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    const trimmed = mailboxAddress.trim();
    if (!trimmed) return;
    setBusy(true);
    setMessage(null);
    try {
      const data = await connectPersonalMailbox(trimmed);
      setMailbox(data);
      setMessage({ text: t("Personal mailbox connected."), type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || t("Failed to connect personal mailbox."), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await disconnectPersonalMailbox();
      setMailbox(data);
      setMessage({ text: t("Personal mailbox disconnected."), type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || t("Failed to disconnect personal mailbox."), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await testPersonalMailbox();
      setMessage({
        text: t("Test email sent to {email}.").replace("{email}", result.recipient),
        type: "success",
      });
    } catch (err: any) {
      setMessage({ text: err.message || t("Failed to send test email."), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const status = mailbox?.status || "Disconnected";

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
              {t("Connect your own Microsoft 365 mailbox below to send email as yourself.")}
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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t("Personal Mailbox")}
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                  status === "Connected"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : status === "Expired"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                      : "bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("Connect your own Microsoft 365 address to send email as yourself, separately from the shared Organization Mailbox.")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("Loading...")}
          </div>
        ) : (
          <>
            {mailbox?.mailbox_address && (
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                <div className="font-bold">{mailbox.mailbox_address}</div>
                {mailbox.connected_at && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    {t("Connected:")} {new Date(mailbox.connected_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={mailboxAddress}
                onChange={(e) => setMailboxAddress(e.target.value)}
                placeholder="ad.soyad@sirket.com"
                disabled={busy}
                className="flex-1 text-xs bg-white dark:bg-black/35 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold disabled:opacity-60"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={busy || !mailboxAddress.trim()}
                  className="p-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 text-white bg-blue-650 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  {t("Connect")}
                </button>
                {status !== "Disconnected" && (
                  <>
                    <button
                      type="button"
                      onClick={handleTest}
                      disabled={busy || status !== "Connected"}
                      className="p-2.5 px-4 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t("Test")}
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={busy}
                      className="p-2.5 px-4 text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t("Disconnect")}
                    </button>
                  </>
                )}
              </div>
            </div>

            {message && (
              <p
                className={`text-xs font-semibold ${
                  message.type === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {message.text}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
