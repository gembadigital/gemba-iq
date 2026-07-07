import React, { useEffect, useState } from "react";
import { MailboxSession, ExchangeConfig } from "../types";
import { Lock, CheckCircle2, AlertCircle, HelpCircle, RefreshCw, Key } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface ConnectionStatusProps {
  session: MailboxSession | null;
  config: ExchangeConfig | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onActivateSandbox: () => void;
  onConnectWithToken: (token: string) => Promise<void>;
  onUpdateSession?: (session: MailboxSession) => void;
}

export default function ConnectionStatus({
  session,
  config,
  onConnect,
  onDisconnect,
  onActivateSandbox,
  onConnectWithToken,
  onUpdateSession
}: ConnectionStatusProps) {
  const { lang, t } = useLanguage();
  const [showGuide, setShowGuide] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [isConnectingToken, setIsConnectingToken] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editMail, setEditMail] = useState("");

  useEffect(() => {
    if (session) {
      setEditDisplayName(session.displayName);
      setEditMail(session.mail);
    }
  }, [session]);

  return (
    <div className="bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded-lg p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Key className="w-4.5 h-4.5 text-[#0078D4]" />
            {t("M365 Exchange Online Connection")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("Secure connection for individual Microsoft Graph operations")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {session?.isConnected ? (
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-semibold ${
                session.isSandbox 
                  ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-955/20 dark:border-amber-900/40 dark:text-amber-400 animate-pulse"
                  : "bg-[#f3f9fe] border-[#ddebf7] text-[#0078D4] dark:bg-blue-950/20 dark:border-brand-900/40 dark:text-brand-300"
              }`}>
                <CheckCircle2 className={`w-4 h-4 ${session.isSandbox ? "text-amber-500" : "text-[#0078D4]"}`} />
                {session.isSandbox ? t("Demo Sandbox Active") : t("Outlook Connected")}
              </div>
              <button
                id="btn-disconnect"
                onClick={onDisconnect}
                className="text-xs text-rose-600 dark:text-rose-405 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded font-bold border border-rose-200 dark:border-rose-900/40 transition-colors"
              >
                {t("Disconnect Mailbox")}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-connect-m365"
                onClick={onConnect}
                disabled={!config?.hasClientKeys}
                className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded transition-all ${
                  config?.hasClientKeys
                    ? "bg-[#0078D4] hover:bg-[#006cc0] text-white shadow-sm cursor-pointer"
                    : "bg-[#F3F2F1] dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-[#EDEBE9] dark:border-slate-750"
                }`}
                title={!config?.hasClientKeys ? t("Requires Azure configuration in Secrets") : t("Connect with official tenant App Registration flow")}
              >
                <Lock className="w-3.5 h-3.5" />
                {t("Connect M365 Exchange")}
              </button>
              <button
                id="btn-manual-token-toggle"
                onClick={() => setShowManualInput(!showManualInput)}
                className={`text-xs font-bold px-4 py-2.5 rounded border shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                  showManualInput
                    ? "bg-[#ddebf7] dark:bg-blue-950/40 text-[#0078D4] dark:text-brand-300 border-[#0078D4]"
                    : "bg-white dark:bg-[#252423] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0078D4] dark:text-brand-300 border-[#EDEBE9] dark:border-[#323130]"
                }`}
                title={t("Connect directly using a Microsoft Graph Explorer developer token")}
              >
                <Key className="w-3.5 h-3.5" />
                {t("Connect via Access Token (Zero Setup)")}
              </button>
              <button
                id="btn-activate-sandbox"
                onClick={onActivateSandbox}
                className="text-xs font-bold bg-white dark:bg-[#252423] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded border border-[#EDEBE9] dark:border-[#323130] shadow-sm transition-all cursor-pointer"
              >
                {t("Enable Sandbox Mode")}
              </button>
            </div>
          )}
        </div>
      </div>

      {showManualInput && !session?.isConnected && (
        <div className="mt-4 p-5 border border-[#0078D4]/30 bg-[#f3f9fe]/50 dark:bg-[#0f2335]/40 rounded space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#0078D4] dark:text-[#329bf0] uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4" />
              {t("Direct Microsoft Graph Token Connection")}
            </h3>
            <button
              onClick={() => {
                setShowManualInput(false);
                setTokenError("");
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold"
            >
              {t("Close Panel")}
            </button>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-355 leading-relaxed">
            If corporate firewalls, proxy locks, or Azure portal restrictions prevent App Registrations, you can bypass them completely. Simply sign into the official Microsoft tool to get a secure access token dynamically and paste it below:
          </p>
          
          <div className="p-3 bg-white dark:bg-[#11100f] rounded border border-[#EDEBE9] dark:border-[#323130] text-[11px] text-slate-600 dark:text-slate-300 space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>🚀 40-Second Token Grab Walkthrough (Crucial: Mail.Send & Mail.ReadWrite Consent):</span>
            </div>
            <ol className="list-decimal pl-4.5 space-y-1">
              <li>Open the official <a href="https://developer.microsoft.com/en-us/graph/graph-explorer" target="_blank" rel="noreferrer" className="text-[#0078D4] dark:text-[#329bf0] underline font-bold hover:text-[#006cc0]">Microsoft Graph Explorer</a> tab.</li>
              <li>Sign in using your corporate, educational, or personal M365 account (top right).</li>
              <li>Underneath the central query address bar, locate and click the <strong>Consent to permissions</strong> adjacent tab.</li>
              <li>Search for <strong><code>Mail.Send</code></strong> and <strong><code>Mail.ReadWrite</code></strong>, then click <strong>Consent</strong> next to both (accept the Microsoft authorization popup prompts).</li>
              <li>Once completed, click the <strong>Access token</strong> tab.</li>
              <li>Copy the full token string, return here, and paste it. That's it! (No azure setup required).</li>
            </ol>
          </div>

          <div className="space-y-2">
            <textarea
              id="input-manual-token"
              value={manualToken}
              onChange={(e) => {
                setManualToken(e.target.value);
                setTokenError("");
              }}
              placeholder="Paste your Microsoft Access Token starting with eyJ0eXAi..."
              className="w-full h-24 p-3 text-[11px] font-mono bg-white dark:bg-[#11100f] border border-[#EDEBE9] dark:border-[#323130] rounded focus:outline-none focus:ring-1 focus:ring-[#0078D4] resize-none"
            />
            {tokenError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Error: {tokenError}
              </p>
            )}
            <div className="flex justify-end gap-2.5">
              <button
                id="btn-submit-manual-token"
                disabled={isConnectingToken}
                onClick={async () => {
                  const cleanedToken = manualToken.trim();
                  if (!cleanedToken) {
                    setTokenError("Please paste an access token first.");
                    return;
                  }
                  setIsConnectingToken(true);
                  setTokenError("");
                  try {
                    await onConnectWithToken(cleanedToken);
                    setShowManualInput(false);
                    setManualToken("");
                  } catch (err: any) {
                    setTokenError(err.message || "Failed validating this access token. Ensure it is copied in full.");
                  } finally {
                    setIsConnectingToken(false);
                  }
                }}
                className={`text-xs font-bold px-5 py-2.5 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                  isConnectingToken ? "bg-slate-350 cursor-not-allowed" : "bg-[#0078D4] hover:bg-[#006cc0] text-white"
                }`}
              >
                {isConnectingToken ? ("Validating Session...") : ("Verify & Connect Exchange")}
              </button>
            </div>
          </div>
        </div>
      )}

      {session?.isConnected && (
        <div className="mt-4 p-4 bg-[#F3F2F1] dark:bg-[#252423] rounded border border-[#EDEBE9] dark:border-[#323130] space-y-4">
          {isEditingProfile ? (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center justify-between border-b pb-2 border-[#EDEBE9] dark:border-[#323130]">
                <span>{t("Configure Sender Identity Profile")}</span>
                <span className="text-[10px] text-[#0078D4] font-semibold">{t("Change to match target address")}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                {t("You can specify any custom sender display name and email address below (e.g., info@gembapartner.com).")} 
                {session?.isSandbox ? t(" Since Sandbox Mode is enabled, simulations and headers will reflect this customized sender identity.") : t(" Ensure your connected Microsoft 365 environment allows sending from this alias.")}
              </p>
              {session?.isSandbox && (
                <div className="p-3 bg-amber-50 dark:bg-amber-955/20 text-[11px] text-amber-800 dark:text-amber-400 border border-amber-200/50 rounded flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">⚠️ {t("Web Simulation Only Warning:")}</span>
                    <p className="mt-0.5 leading-relaxed text-[11px]">
                      {t("Because you are in Demo Sandbox Mode, typing info@gembapartner.com here only customizes the web dashboard report mockups. No network connections are made to your physical Outlook servers, so no draft messages will actually appear in your real mailbox.")}
                    </p>
                    <p className="mt-1 text-slate-500 text-[10px]">
                      {t("To send/draft real emails, you must click Disconnect and then connect with a real account or paste your Microsoft Graph access token.")}
                    </p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">{t("Display Name")}</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#11100f] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                    placeholder="e.g. Gemba Partner Info"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">{t("Sender Email Address")}</label>
                  <input
                    type="email"
                    value={editMail}
                    onChange={(e) => setEditMail(e.target.value)}
                    className="w-full text-xs p-2 rounded border border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#11100f] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                    placeholder="e.g. info@gembapartner.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    if (session) {
                      setEditDisplayName(session.displayName);
                      setEditMail(session.mail);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-850 rounded transition-all cursor-pointer"
                >
                  {t("Cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editMail.trim() || !editMail.includes("@")) {
                      alert(t("Please input a valid sender email address containing '@'."));
                      return;
                    }
                    if (onUpdateSession && session) {
                      onUpdateSession({
                        ...session,
                        displayName: editDisplayName.trim() || "Sender Name",
                        mail: editMail.trim(),
                        userPrincipalName: editMail.trim()
                      });
                    }
                    setIsEditingProfile(false);
                  }}
                  className="px-4 py-1.5 text-xs font-bold bg-[#0078D4] hover:bg-[#006cc0] text-white rounded transition-all cursor-pointer shadow-sm"
                >
                  {t("Save Profile Details")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-[#0078D4]/10 text-[#0078D4] dark:bg-brand-950/50 dark:text-brand-300 flex items-center justify-center font-bold text-xs shadow-inner flex-shrink-0">
                  {session.displayName.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 font-sans">
                  <h4 className="text-zs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center flex-wrap gap-2">
                    <span>{session.displayName}</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="text-[10px] text-[#0078D4] dark:text-[#329bf0] hover:underline font-bold font-sans cursor-pointer bg-[#0078D4]/5 hover:bg-[#0078D4]/15 dark:bg-[#0078D4]/10 dark:hover:bg-[#0078D4]/20 px-2 py-0.5 rounded transition-colors"
                      title={t("Click to edit your custom profile name or sender email address")}
                    >
                      ✏️ {t("Edit Sender Profile")}
                    </button>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                    {session.mail}
                  </p>
                </div>
              </div>
              <div className="text-[10px] font-mono bg-white dark:bg-[#11100f] border border-[#EDEBE9] dark:border-[#323130] px-2.5 py-1 rounded font-semibold text-slate-600 dark:text-slate-400 text-center self-start sm:self-center">
                {session.isSandbox ? t("SANDBOX SIMULATOR") : t("GRAPH API SECURE")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guide Trigger */}
      {!session?.isConnected && (
        <div className="mt-4 border-t border-[#EDEBE9] dark:border-[#323130] pt-4">
          <button
            id="btn-toggle-guide"
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs text-[#0078D4] dark:text-brand-300 hover:underline flex items-center gap-1.5 font-bold"
          >
            <HelpCircle className="w-4 h-4" />
            {!config?.hasClientKeys ? "Azure credentials missing? Show app registration guide" : "How is my mail session credentials handled?"}
          </button>

          {(showGuide || !config?.hasClientKeys) && (
            <div className="mt-4 p-5 rounded bg-[#F3F2F1] dark:bg-[#252423] text-slate-705 dark:text-slate-300 border border-[#EDEBE9] dark:border-[#323130] text-xs leading-relaxed space-y-3">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100 block mb-1">Azure App Registration Guide:</span>
                Configure Microsoft Entra ID (Azure AD) Client ID and Secret in your workspace secrets.
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>Go to the <a href="https://portal.azure.com" target="_blank" rel="noreferrer" className="text-[#0078D4] underline font-bold">Azure Portal</a> and select <strong>Microsoft Entra ID</strong> (App registrations).</li>
                <li>Create a <strong>New registration</strong>. Select <em>"Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)"</em>.</li>
                <li>
                  Add an <strong>Web Redirect URI</strong> matching your exact callback:
                  <code className="block bg-white dark:bg-[#11100f] p-2 rounded text-[10px] font-mono text-brand-600 dark:text-brand-400 mt-1 select-all break-all border border-[#EDEBE9] dark:border-[#323130]">
                    {config?.redirectUri || "https://your-app.run.app/auth/callback"}
                  </code>
                </li>
                <li>Go to <strong>Certificates & secrets</strong>, create a new client secret, and copy it.</li>
                <li>Go to <strong>API permissions</strong>, add <code>Mail.Send</code>, <code>Mail.ReadWrite</code>, and <code>User.Read</code> delegated permissions, and grant admin consent (if corporate policy requires).</li>
                <li>Place your Client ID and client secret in the secure **Secrets panel in AI Studio** as:
                  <div className="font-mono text-[10px] mt-1 space-y-0.5">
                    <p className="font-semibold text-[#0078D4] dark:text-brand-300">MICROSOFT_CLIENT_ID</p>
                    <p className="font-semibold text-[#0078D4] dark:text-brand-300">MICROSOFT_CLIENT_SECRET</p>
                  </div>
                </li>
              </ol>
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 p-3 rounded flex gap-2 border border-amber-200/60 dark:border-amber-900/60">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                <p>
                  <strong>No Azure account ready?</strong> Click "Enable Sandbox Mode" above. It hosts a full sandbox simulator with responsive open-rate simulations, recipient progress tracking, and executive PDF reporting instantly, requiring no cloud configurations!
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
