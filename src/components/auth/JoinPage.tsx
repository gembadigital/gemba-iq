import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { useLanguage } from "../../lib/LanguageContext";
import { useOrganization } from "../../lib/OrganizationContext";
import {
  clearPendingInvitationToken,
  formatOrganizationRole,
  setPendingInvitationToken,
} from "../../lib/invitationConstants";
import {
  acceptOrganizationInvitation,
  getInvitationPreview,
} from "../../lib/invitationService";
import AuthLayout, { AuthError, AuthSuccess } from "./AuthLayout";
import AuthLoadingScreen from "./AuthLoadingScreen";

export default function JoinPage() {
  const { user, loading: authLoading } = useAuth();
  const { refreshOrganization, membership, loading: orgLoading, needsOnboarding } = useOrganization();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";
  const tr = lang === "TR";

  const [previewLoading, setPreviewLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof getInvitationPreview>> | null>(null);

  console.log("[invite-debug] JoinPage render state", {
    authLoading,
    previewLoading,
    accepting,
    orgLoading,
    userEmail: user?.email ?? null,
    needsOnboarding,
  });

  useEffect(() => {
    console.log("[invite-debug] JoinPage mounted", {
      token,
      href: window.location.href,
    });
  }, []);

  useEffect(() => {
    console.log("[invite-debug] JoinPage auth user", {
      userId: user?.id ?? null,
      email: user?.email ?? null,
      authLoading,
    });
  }, [user, authLoading]);

  useEffect(() => {
    if (!token) {
      console.log("[invite-debug] getInvitationPreview skipped", { reason: "missing token" });
      setPreviewLoading(false);
      setError(t("Invalid invitation link."));
      return;
    }

    setPendingInvitationToken(token);

    let mounted = true;
    void (async () => {
      console.log("[invite-debug] getInvitationPreview started", { token });
      try {
        const data = await getInvitationPreview(token);
        if (!mounted) return;
        console.log("[invite-debug] getInvitationPreview success", {
          token,
          organizationName: data.organization_name,
          invitedEmail: data.invited_email,
          role: data.role,
          status: data.status,
          isExpired: data.is_expired,
        });
        setPreview(data);
        if (data.is_expired) {
          setError(t("This invitation has expired."));
        }
      } catch (err) {
        if (!mounted) return;
        console.log("[invite-debug] getInvitationPreview failure", {
          token,
          error: err instanceof Error ? err.message : String(err),
        });
        setError(err instanceof Error ? err.message : t("Invitation not found."));
      } finally {
        if (mounted) setPreviewLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, t]);

  useEffect(() => {
    if (!user || !token || previewLoading || preview?.is_expired || accepting) return;
    if (membership) {
      console.log("[invite-debug] final redirect destination", {
        destination: "/",
        reason: "JoinPage existing membership",
      });
      clearPendingInvitationToken();
      console.log("[race-trace] JoinPage immediately before navigate('/')", {
        reason: "existing membership",
      });
      navigate("/", { replace: true });
      return;
    }

    let mounted = true;
    void (async () => {
      setAccepting(true);
      setError(null);
      console.log("[invite-debug] acceptOrganizationInvitation started", {
        token,
        userId: user.id,
        email: user.email,
      });
      try {
        await acceptOrganizationInvitation(token, {
          fullName: (user.user_metadata?.full_name as string | undefined) || undefined,
        });
        console.log("[invite-debug] acceptOrganizationInvitation success", {
          token,
          userId: user.id,
          email: user.email,
        });
        clearPendingInvitationToken();
        await refreshOrganization();
        if (!mounted) return;
        setSuccess(tr ? "Organizasyona katıldınız. Yönlendiriliyorsunuz..." : "You joined the organization. Redirecting...");
        console.log("[invite-debug] final redirect destination", {
          destination: "/",
          reason: "JoinPage accept success",
        });
        console.log("[race-trace] JoinPage immediately before navigate('/')", {
          reason: "accept success",
        });
        navigate("/", { replace: true });
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : t("Failed to accept invitation.");
        console.log("[invite-debug] acceptOrganizationInvitation failure", {
          token,
          userId: user.id,
          email: user.email,
          error: message,
        });
        if (message.toLowerCase().includes("already belongs")) {
          console.log("[invite-debug] final redirect destination", {
            destination: "/",
            reason: "JoinPage already belongs to organization",
          });
          clearPendingInvitationToken();
          console.log("[race-trace] JoinPage immediately before navigate('/')", {
            reason: "already belongs",
          });
          navigate("/", { replace: true });
          return;
        }
        setError(message);
      } finally {
        if (mounted) setAccepting(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    user,
    token,
    previewLoading,
    preview?.is_expired,
    membership,
    accepting,
    navigate,
    refreshOrganization,
    tr,
  ]);

  if (authLoading || previewLoading || (user && (orgLoading || accepting))) {
    console.log("[invite-debug] JoinPage returning AuthLoadingScreen", {
      authLoading,
      previewLoading,
      accepting,
      orgLoading,
      userEmail: user?.email ?? null,
      needsOnboarding,
    });
    return <AuthLoadingScreen />;
  }

  if (user && membership) {
    console.log("[invite-debug] final redirect destination", {
      destination: "/",
      reason: "JoinPage Navigate existing membership",
    });
    return <Navigate to="/" replace />;
  }

  const authQuery = token ? `?token=${encodeURIComponent(token)}` : "";
  const loginHref = `/login${authQuery}`;
  const registerHref = `/register${authQuery}`;

  return (
    <AuthLayout
      title={tr ? "Organizasyon Daveti" : "Organization Invitation"}
      subtitle={
        preview
          ? tr
            ? `${preview.organization_name} sizi Gemba IQ'a davet etti`
            : `${preview.organization_name} invited you to Gemba IQ`
          : tr
            ? "Davet bilgileri yükleniyor"
            : "Loading invitation details"
      }
      footer={
        <span className="text-slate-500 dark:text-zinc-400 text-xs">
          {tr ? "Gemba IQ güvenli çoklu kiracı çalışma alanı" : "Gemba IQ secure multi-tenant workspace"}
        </span>
      }
    >
      <div className="space-y-4">
        <AuthError message={error} />
        <AuthSuccess message={success} />

        {preview && !preview.is_expired && (
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  {tr ? "Organizasyon" : "Organization"}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-zinc-100">{preview.organization_name}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                {formatOrganizationRole(preview.role, lang)}
              </span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                {tr ? "Davet Edilen E-posta" : "Invited Email"}
              </p>
              <p className="text-sm font-mono text-slate-800 dark:text-zinc-200">{preview.invited_email}</p>
            </div>
          </div>
        )}

        {!user && preview && !preview.is_expired && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to={loginHref}
              className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold text-white bg-[#1E3A5F] hover:bg-[#162d4a] transition-colors"
            >
              {tr ? "Giriş Yap" : "Sign In"}
            </Link>
            <Link
              to={registerHref}
              className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold text-[#1E3A5F] dark:text-indigo-300 border border-[#1E3A5F]/20 dark:border-indigo-900/50 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              {tr ? "Hesap Oluştur" : "Create Account"}
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
