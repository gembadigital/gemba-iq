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
  INVITABLE_ROLES,
  canInviteUsers,
  formatOrganizationRole,
} from "../../lib/invitationConstants";
import {
  cancelOrganizationInvitation,
  fetchOrganizationDirectory,
  sendInvitationEmail,
} from "../../lib/invitationService";
import type {
  OrganizationDirectoryInvitation,
  OrganizationDirectoryMember,
  OrganizationRole,
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

export default function OrganizationUsersPanel({ onAuditLog }: OrganizationUsersPanelProps) {
  const { lang } = useLanguage();
  const { membership, actorName, companyName, refreshOrganization } = useOrganization();
  const tr = lang === "TR";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<OrganizationDirectoryMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationDirectoryInvitation[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("consultant");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
    link?: string;
  } | null>(null);

  const canManage = canInviteUsers(membership?.role);

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const directory = await fetchOrganizationDirectory();
      setMembers(directory.members || []);
      setInvitations(directory.invitations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

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
      const result = await sendInvitationEmail(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setInviteOpen(false);
      setInviteMessage({
        type: "success",
        text: result.emailSent
          ? tr
            ? `Davet e-postası ${result.invitation.invited_email} adresine gönderildi.`
            : `Invitation email sent to ${result.invitation.invited_email}.`
          : result.message ||
            (tr
              ? "Davet oluşturuldu. Bağlantıyı paylaşarak kullanıcıyı davet edebilirsiniz."
              : "Invitation created. Share the link to invite the user."),
        link: result.inviteLink,
      });
      onAuditLog?.(
        "Kullanıcı Davet Edildi",
        `${result.invitation.invited_email} için ${inviteRole} rolüyle davet gönderildi.`
      );
      await loadDirectory();
      await refreshOrganization();
    } catch (err) {
      setInviteMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to send invitation.",
      });
    } finally {
      setInviteLoading(false);
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
        text: err instanceof Error ? err.message : "Failed to cancel invitation.",
      });
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
                {tr ? "Kullanıcılar ve İzinler" : "Users & Permissions"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                {tr
                  ? `${companyName} organizasyonundaki aktif kullanıcıları ve bekleyen davetleri yönetin.`
                  : `Manage active users and pending invitations for ${companyName}.`}
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
              {tr ? "Yenile" : "Refresh"}
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => setInviteOpen((open) => !open)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1E3A5F] hover:bg-[#162d4a] transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                {tr ? "Kullanıcı Davet Et" : "Invite User"}
              </button>
            )}
          </div>
        </div>

        {!canManage && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            <Shield className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {tr
                ? "Davet gönderme yetkisi yalnızca Sahip ve Yönetici rollerinde bulunur."
                : "Only Owner and Admin roles can send invitations."}
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
                        {tr ? "Kopyala" : "Copy"}
                      </button>
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
              {tr ? "Yeni Davet" : "New Invitation"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                  {tr ? "E-posta" : "Email"}
                </span>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#0c0c0e] text-sm"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                  {tr ? "Rol" : "Role"}
                </span>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#0c0c0e] text-sm"
                >
                  {INVITABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {formatOrganizationRole(role, lang)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700"
              >
                {tr ? "İptal" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-60"
              >
                {inviteLoading ? (tr ? "Gönderiliyor..." : "Sending...") : tr ? "Davet Gönder" : "Send Invitation"}
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
                  <th className="px-4 py-3">{tr ? "Kullanıcı" : "User"}</th>
                  <th className="px-4 py-3">{tr ? "Durum" : "Status"}</th>
                  <th className="px-4 py-3">{tr ? "Rol" : "Role"}</th>
                  <th className="px-4 py-3">{tr ? "Son Giriş" : "Last Login"}</th>
                  <th className="px-4 py-3">{tr ? "Davet / Katılım" : "Invite / Joined"}</th>
                  <th className="px-4 py-3 text-right">{tr ? "İşlem" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      {tr ? "Kullanıcılar yükleniyor..." : "Loading users..."}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      {tr ? "Henüz kullanıcı bulunmuyor." : "No users found yet."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    if (row.rowType === "invitation") {
                      return (
                        <tr key={`invite-${row.id}`} className="hover:bg-slate-50/70 dark:hover:bg-zinc-900/30">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900 dark:text-zinc-100">{row.invited_email}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {tr ? "Davet bekliyor" : "Awaiting acceptance"}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                              <Clock3 className="w-3 h-3" />
                              {tr ? "Beklemede" : "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-zinc-800">
                              {formatOrganizationRole(row.role, lang)}
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
                                {tr ? "İptal Et" : "Cancel"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`member-${row.membership_id}`} className="hover:bg-slate-50/70 dark:hover:bg-zinc-900/30">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900 dark:text-zinc-100">
                            {row.full_name || row.email}
                          </div>
                          <div className="text-xs text-slate-500">{row.email}</div>
                          {row.job_title && (
                            <div className="text-[11px] text-slate-400 mt-1">{row.job_title}</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {tr ? "Aktif" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                            {formatOrganizationRole(row.role, lang)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600 dark:text-zinc-400">
                          {formatDate(row.last_login, lang)}
                        </td>
                        <td className="px-4 py-4 text-slate-600 dark:text-zinc-400">
                          {formatDate(row.joined_at, lang)}
                        </td>
                        <td className="px-4 py-4 text-right text-xs text-slate-400">
                          {row.user_id === membership?.user_id ? (tr ? "Siz" : "You") : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            {tr
              ? `Yönetici: ${actorName}. Davetler 7 gün geçerlidir ve yalnızca davet edilen e-posta ile kabul edilebilir.`
              : `Managed by ${actorName}. Invitations expire after 7 days and must be accepted with the invited email.`}
          </p>
        </div>
      </div>
    </div>
  );
}
