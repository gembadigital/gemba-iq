import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Copy,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";
import { useOrganization } from "../../lib/OrganizationContext";
import {
  cancelOrganizationInvitation,
  createOrganizationInvitation,
  fetchOrganizationDirectory,
  fetchInvitationEmailConfig,
  sendCreatedInvitationEmail,
  updateOrganizationMemberRole,
} from "../../lib/invitationService";
import {
  APP_ROLES,
  formatAppRole,
  normalizeAppRole,
  type AppRole,
} from "../../lib/roleHelpers";
import type {
  CreatedInvitationResult,
  OrganizationDirectoryInvitation,
  OrganizationDirectoryMember,
} from "../../types/organization";

interface OrganizationUsersPanelProps {
  onAuditLog?: (action: string, detail: string) => void;
}

type DirectoryRow =
  | (OrganizationDirectoryMember & { rowType: "member" })
  | (OrganizationDirectoryInvitation & { rowType: "invitation" });

function formatDate(value: string | null | undefined, lang: "TR" | "EN"): string {
  if (!value) return lang === "TR" ? "—" : "—";
  try {
    return new Date(value).toLocaleString(lang === "TR" ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function roleBadgeClass(role: AppRole): string {
  return role === "ADMIN"
    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
    : "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300";
}

export default function OrganizationUsersPanel({ onAuditLog }: OrganizationUsersPanelProps) {
  const { lang, t } = useLanguage();
  const { membership, actorName, companyName, isAdmin, refreshOrganization } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<OrganizationDirectoryMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationDirectoryInvitation[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("USER");
  const [roleSelections, setRoleSelections] = useState<Record<string, AppRole>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
    link?: string;
    invitation?: CreatedInvitationResult;
    fullName?: string;
    emailSent?: boolean;
  } | null>(null);

  const canManage = isAdmin;

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const directory = await fetchOrganizationDirectory();
      setMembers(directory.members || []);
      setInvitations(directory.invitations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to load users."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  useEffect(() => {
    if (!canManage) return;
    void (async () => {
      const config = await fetchInvitationEmailConfig();
      setEmailConfigured(config.emailConfigured);
    })();
  }, [canManage]);

  useEffect(() => {
    setRoleSelections((current) => {
      const next: Record<string, AppRole> = {};
      members.forEach((member) => {
        next[member.membership_id] = current[member.membership_id] ?? normalizeAppRole(member.role);
      });
      return next;
    });
  }, [members]);

  const rows = useMemo<DirectoryRow[]>(() => {
    const pendingRows: DirectoryRow[] = invitations.map((invitation) => ({
      ...invitation,
      rowType: "invitation",
    }));
    const memberRows: DirectoryRow[] = members.map((member) => ({
      ...member,
      rowType: "member",
    }));
    return [...pendingRows, ...memberRows];
  }, [invitations, members]);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !inviteEmail.trim()) return;

    setInviteLoading(true);
    setInviteMessage(null);
    try {
      const invitation = await createOrganizationInvitation(inviteEmail.trim(), inviteRole);
      const inviteLink = `${window.location.origin}/join?token=${invitation.token}`;
      const fullName = inviteName.trim();
      setInviteName("");
      setInviteEmail("");
      setInviteRole("USER");
      setInviteOpen(false);
      setInviteMessage({
        type: "success",
        text: t("Invitation created. Share the link to invite the user."),
        link: inviteLink,
        invitation,
        fullName,
        emailSent: false,
      });
      onAuditLog?.(
        "Kullanıcı Davet Edildi",
        `${invitation.invited_email} için ${formatAppRole(inviteRole)} rolüyle davet oluşturuldu.`
      );
      await loadDirectory();
      await refreshOrganization();
    } catch (err) {
      setInviteMessage({
        type: "error",
        text: err instanceof Error ? err.message : t("Failed to create invitation."),
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!inviteMessage?.invitation || !emailConfigured || emailSending) return;

    setEmailSending(true);
    try {
      const result = await sendCreatedInvitationEmail(inviteMessage.invitation, inviteMessage.fullName);
      setInviteMessage({
        type: "success",
        text: result.emailSent
          ? t("Invitation email sent to {email}.").replace("{email}", result.invitation.invited_email)
          : result.message || t("Invitation created. Share the link to invite the user."),
        link: result.inviteLink,
        invitation: result.invitation,
        fullName: inviteMessage.fullName,
        emailSent: result.emailSent,
      });
    } catch (err) {
      setInviteMessage({
        ...inviteMessage,
        type: "error",
        text: err instanceof Error ? err.message : t("Failed to send invitation."),
      });
    } finally {
      setEmailSending(false);
    }
  };

  const handleCancelInvite = async (invitationId: string, email: string) => {
    if (!canManage) return;
    try {
      await cancelOrganizationInvitation(invitationId);
      onAuditLog?.("Davet İptal Edildi", `${email} için bekleyen davet iptal edildi.`);
      await loadDirectory();
    } catch (err) {
      setInviteMessage({
        type: "error",
        text: err instanceof Error ? err.message : t("Failed to cancel invitation."),
      });
    }
  };

  const handleSaveRole = async (row: OrganizationDirectoryMember) => {
    if (!canManage || row.user_id === membership?.user_id) return;
    const nextRole = roleSelections[row.membership_id] ?? normalizeAppRole(row.role);
    setSavingRoleId(row.membership_id);
    setInviteMessage(null);
    try {
      await updateOrganizationMemberRole(row.membership_id, nextRole);
      onAuditLog?.("Rol Güncellendi", `${row.email} rolü ${formatAppRole(nextRole)} olarak güncellendi.`);
      await loadDirectory();
      await refreshOrganization();
      setInviteMessage({
        type: "success",
        text: t("Role updated successfully."),
      });
    } catch (err) {
      setInviteMessage({
        type: "error",
        text: err instanceof Error ? err.message : t("Failed to update user role."),
      });
    } finally {
      setSavingRoleId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f11] shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#1E3A5F]/10 text-[#1E3A5F] dark:text-indigo-300 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
              {t("User Management")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
              {t("Manage active users, roles, and pending invitations for {company}.").replace("{company}", companyName)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadDirectory()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("Refresh")}
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => setInviteOpen((open) => !open)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1E3A5F] hover:bg-[#162d4a] transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                {t("Invite User")}
              </button>
            )}
          </div>
        </div>

        {!canManage && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            <Shield className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {t("Only ADMIN can manage invitations and roles.")}
            </span>
          </div>
        )}

        {inviteMessage && (
          <div
            className={`mx-6 mt-4 rounded-xl border px-4 py-3 text-sm ${
              inviteMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50/70 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                {inviteMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <div className="space-y-2">
                  <p>{inviteMessage.text}</p>
                  {inviteMessage.link && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-[11px] px-2 py-1 rounded bg-white/70 dark:bg-black/30 border border-current/10 break-all">
                        {inviteMessage.link}
                      </code>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(inviteMessage.link || "")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-[#1E3A5F] text-white"
                      >
                        <Copy className="w-3 h-3" />
                        {t("Copy Link")}
                      </button>
                      {emailConfigured && inviteMessage.invitation && !inviteMessage.emailSent && (
                        <button
                          type="button"
                          disabled={emailSending}
                          onClick={() => void handleSendEmail()}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-white/80 dark:bg-black/30 border border-current/10"
                        >
                          <Mail className="w-3 h-3" />
                          {emailSending ? t("Sending...") : t("Send Email")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setInviteMessage(null)} className="text-current/70 hover:text-current">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {inviteOpen && canManage && (
          <form onSubmit={handleInvite} className="mx-6 mt-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/30 p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Plus className="w-3.5 h-3.5" />
              {t("New Invitation")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                  {t("Name")}
                </span>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder={t("Full Name")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#0c0c0e] text-sm"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                  {t("Email")}
                </span>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t("you@company.com")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#0c0c0e] text-sm"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                  {t("Role")}
                </span>
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as AppRole)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold ${roleBadgeClass(inviteRole)}`}
                >
                  {APP_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {formatAppRole(role)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setInviteOpen(false);
                  setInviteName("");
                  setInviteEmail("");
                  setInviteRole("USER");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-60"
              >
                {inviteLoading ? t("Creating...") : t("Create Invitation")}
              </button>
            </div>
          </form>
        )}

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 dark:bg-zinc-900/60 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t("Name")}</th>
                  <th className="px-4 py-3">{t("Email")}</th>
                  <th className="px-4 py-3">{t("Role")}</th>
                  <th className="px-4 py-3">{t("Status")}</th>
                  <th className="px-4 py-3">{t("Last Login")}</th>
                  <th className="px-4 py-3">{t("Created Date")}</th>
                  <th className="px-4 py-3 text-right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      {t("Loading users...")}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      {t("No users found yet.")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    if (row.rowType === "invitation") {
                      return (
                        <tr key={`invite-${row.id}`} className="hover:bg-slate-50/70 dark:hover:bg-zinc-900/30">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900 dark:text-zinc-100">—</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900 dark:text-zinc-100">{row.invited_email}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {t("Awaiting acceptance")}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${roleBadgeClass(normalizeAppRole(row.role))}`}>
                              {formatAppRole(row.role)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                              <Clock3 className="w-3 h-3" />
                              {t("Pending")}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-500">—</td>
                          <td className="px-4 py-4 text-slate-600 dark:text-zinc-400">
                            {formatDate(row.created_at, lang)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => void handleCancelInvite(row.id, row.invited_email)}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                              >
                                {t("Cancel")}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }

                    const currentRole = normalizeAppRole(row.role);
                    const selectedRole = roleSelections[row.membership_id] ?? currentRole;
                    const isSelf = row.user_id === membership?.user_id;
                    const hasRoleChange = selectedRole !== currentRole;

                    return (
                      <tr key={`member-${row.membership_id}`} className="hover:bg-slate-50/70 dark:hover:bg-zinc-900/30">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900 dark:text-zinc-100">
                            {row.full_name || row.email}
                          </div>
                          {row.job_title && (
                            <div className="text-[11px] text-slate-400 mt-1">{row.job_title}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-600 dark:text-zinc-400">
                          {row.email}
                        </td>
                        <td className="px-4 py-4">
                          {canManage && !isSelf ? (
                            <select
                              value={selectedRole}
                              onChange={(event) =>
                                setRoleSelections((current) => ({
                                  ...current,
                                  [row.membership_id]: event.target.value as AppRole,
                                }))
                              }
                              className={`min-w-[150px] px-2.5 py-1.5 rounded-lg border text-xs font-bold ${roleBadgeClass(selectedRole)}`}
                            >
                              {APP_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {formatAppRole(role)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${roleBadgeClass(currentRole)}`}>
                              {formatAppRole(currentRole)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t("Active")}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600 dark:text-zinc-400">
                          {formatDate(row.last_login, lang)}
                        </td>
                        <td className="px-4 py-4 text-slate-600 dark:text-zinc-400">
                          {formatDate(row.joined_at, lang)}
                        </td>
                        <td className="px-4 py-4 text-right text-xs text-slate-400">
                          {isSelf ? (
                            t("You")
                          ) : hasRoleChange ? (
                            <button
                              type="button"
                              disabled={savingRoleId === row.membership_id}
                              onClick={() => void handleSaveRole(row)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-60"
                            >
                              {savingRoleId === row.membership_id ? t("Saving...") : t("Save changes")}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            {t("Managed by {name}. Invitations expire after 7 days and must be accepted with the invited email.").replace("{name}", actorName)}
          </p>
        </div>
      </div>
    </div>
  );
}
