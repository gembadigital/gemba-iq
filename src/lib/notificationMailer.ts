// Otomatik sistem hatırlatma e-postaları için paylaşılan gönderim katmanı.
// Önceden bu mantık sadece TasksView.tsx içinde (görev hatırlatma/eskalasyon
// motoru için) yaşıyordu; Fırsat Yönetimi'ndeki aşama hatırlatma motoru
// (dealReminderEngine.ts) da aynı gerçek posta kutusu bağlantısını ve aynı
// "system reminder" yetkilendirmesini kullanması gerektiğinden buraya
// çıkarıldı — iki motorun farklı/tutarsız davranması istenmiyor.
import { getSupabase } from "./supabaseClient";
import { fetchPersonalMailbox } from "./personalMailbox";
import { fetchOrganizationMailbox } from "./organizationMailbox";
import { fetchOrganizationDirectory } from "./invitationService";
import type { OrganizationDirectoryMember } from "../types/organization";

export type MailSenderSource = "personal" | "organization" | null;

// Kurumsal (Organization) posta kutusu bağlıysa o tercih edilir, değilse
// kişisel Microsoft 365 kutusuna düşülür — TasksView.tsx'teki mevcut
// davranışla birebir aynı (bkz. o dosyadaki mailSenderSource useEffect'i).
export async function detectMailSenderSource(): Promise<MailSenderSource> {
  const [personalResult, orgResult] = await Promise.allSettled([
    fetchPersonalMailbox(),
    fetchOrganizationMailbox(),
  ]);
  if (orgResult.status === "fulfilled" && orgResult.value.mailbox.status === "Connected") {
    return "organization";
  }
  if (personalResult.status === "fulfilled" && personalResult.value.status === "Connected") {
    return "personal";
  }
  return null;
}

export async function fetchOrgMembersSafe(): Promise<OrganizationDirectoryMember[]> {
  try {
    const dir = await fetchOrganizationDirectory();
    return dir.members || [];
  } catch {
    return [];
  }
}

// Bir isimli sorumlu (assignee/owner) için gerçek e-posta adresini çözer:
// kayıtta zaten bir e-posta varsa onu kullanır, yoksa organizasyon
// dizininde (orgMembers) isim eşleşmesiyle arar.
export function resolveMemberEmail(
  name: string | undefined,
  storedEmail: string | undefined,
  orgMembers: OrganizationDirectoryMember[]
): string {
  if (storedEmail && storedEmail.includes("@")) return storedEmail;
  if (!name) return "";
  const member = orgMembers.find((m) => (m.full_name?.trim() || m.email) === name);
  return member?.email || "";
}

export interface DispatchableNotification {
  recipientEmail: string;
  subject: string;
  bodyHtml: string;
}

export interface DispatchResult {
  status: "sent" | "failed" | "skipped";
  errorNote?: string;
}

// Gerçek gönderim: /api/mail/send üzerinden, purpose: "reminder" ile
// (sistem kaynaklı otomatik hatırlatma — bkz. api/mail/[...action].js
// sendHandler'daki "Fix 5" yetkilendirme notu). Gerçek bir alıcı e-postası
// veya bağlı bir posta kutusu yoksa, sahte bir "sent" günlüğü yerine
// dürüstçe "skipped"/"failed" döner.
export async function dispatchNotificationEmail(
  notif: DispatchableNotification,
  mailSenderSource: MailSenderSource
): Promise<DispatchResult> {
  if (!notif.recipientEmail || !notif.recipientEmail.includes("@")) {
    return { status: "skipped" };
  }
  if (!mailSenderSource) {
    return {
      status: "failed",
      errorNote: "Bağlı bir posta kutusu yok (Kişisel veya Kurumsal Microsoft 365 mailbox bağlantısı gerekli).",
    };
  }
  try {
    const supabase = getSupabase();
    const {
      data: { session },
    } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

    const res = await fetch("/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        recipient: notif.recipientEmail,
        subject: notif.subject,
        body: notif.bodyHtml,
        source: mailSenderSource,
        purpose: "reminder",
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      return { status: "failed", errorNote: payload?.error || "Mail delivery failed." };
    }
    return { status: "sent" };
  } catch (err) {
    return {
      status: "failed",
      errorNote: err instanceof Error ? err.message : "Network error while sending mail.",
    };
  }
}
