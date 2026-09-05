// Akıllı E-posta Birleştirici (CampaignDesigner) için e-posta doğrulama
// servisi. Doğrulama, umuterturk/email-verifier (MIT) tarafından işletilen
// ücretsiz genel API'ye (rapid-email-verifier.fly.dev) sunucu tarafındaki
// /api/organization/email-verify-batch proxy'si üzerinden yapılır — bkz.
// api/organization/[...action].js emailVerifyBatchHandler. İstemci
// tarayıcısı bu üçüncü taraf servisi hiç görmez, sadece kendi Gemba IQ
// backend'imizi çağırır.
import { getSupabase } from "./supabaseClient";

export type EmailVerificationStatus =
  | "VALID"
  | "PROBABLY_VALID"
  | "INVALID_FORMAT"
  | "INVALID_DOMAIN"
  | "INVALID_MAILBOX"
  | "DISPOSABLE"
  | "UNKNOWN";

export interface EmailVerificationResult {
  email: string;
  validations: {
    syntax?: boolean;
    domain_exists?: boolean;
    mx_records?: boolean;
    mailbox_exists?: boolean;
    is_disposable?: boolean;
    is_role_based?: boolean;
  };
  score?: number;
  status: EmailVerificationStatus | string;
  aliasOf?: string;
}

const MAX_BATCH_SIZE = 100;

async function getAccessToken(): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured.");
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) throw new Error("You must be signed in.");
  return session.access_token;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

// `emails` içindeki tekrarları ve boş değerleri temizler, sonucu orijinal
// (normalize edilmemiş) e-posta değerine göre bir Map olarak döner —
// çağıran taraf sonucu kendi listesindeki her satıra tekrar eşleştirebilir.
export async function verifyEmails(emails: string[]): Promise<Map<string, EmailVerificationResult>> {
  const uniqueEmails = Array.from(
    new Set(emails.map((e) => String(e || "").trim()).filter(Boolean))
  );
  const resultMap = new Map<string, EmailVerificationResult>();
  if (uniqueEmails.length === 0) return resultMap;

  const accessToken = await getAccessToken();
  const batches = chunk(uniqueEmails, MAX_BATCH_SIZE);

  for (const batch of batches) {
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch("/api/organization/email-verify-batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ emails: batch }),
    });
    // eslint-disable-next-line no-await-in-loop
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Email verification failed.");
    }
    for (const result of (data.results || []) as EmailVerificationResult[]) {
      resultMap.set(result.email, result);
    }
  }

  return resultMap;
}
