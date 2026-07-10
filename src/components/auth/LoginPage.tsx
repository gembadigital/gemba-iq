import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { useLanguage } from "../../lib/LanguageContext";
import { setPendingInvitationToken } from "../../lib/invitationConstants";
import { getInvitationPreview } from "../../lib/invitationService";
import AuthLayout, { AuthButton, AuthError, AuthField } from "./AuthLayout";

export default function LoginPage() {
  const { signIn, user, initError } = useAuth();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token") || "";
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname
    ?? (inviteToken ? `/join?token=${encodeURIComponent(inviteToken)}` : "/");

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteLockedEmail, setInviteLockedEmail] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!inviteToken) return;
    setPendingInvitationToken(inviteToken);
    void (async () => {
      try {
        const preview = await getInvitationPreview(inviteToken);
        setEmail(preview.invited_email);
        setInviteLockedEmail(true);
      } catch {
        // Login can continue without preview.
      }
    })();
  }, [inviteToken]);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate(from, { replace: true });
  };

  const tr = lang === "TR";
  const authQuery = inviteToken ? `?token=${encodeURIComponent(inviteToken)}` : "";

  return (
    <AuthLayout
      title={tr ? "Giriş Yap" : "Sign In"}
      subtitle={
        inviteToken
          ? tr
            ? "Davetinizi tamamlamak için giriş yapın"
            : "Sign in to complete your invitation"
          : tr
            ? "Gemba IQ hesabınıza erişin"
            : "Access your Gemba IQ account"
      }
      footer={
        <span className="text-slate-500 dark:text-zinc-400">
          {tr ? "Hesabınız yok mu?" : "Don't have an account?"}{" "}
          <Link
            to={`/register${authQuery}`}
            className="font-semibold text-[#1E3A5F] dark:text-indigo-400 hover:underline"
          >
            {tr ? "Kayıt Ol" : "Register"}
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={initError} />
        <AuthError message={error} />
        <AuthField
          id="email"
          label={tr ? "E-posta" : "Email"}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder={t("you@company.com")}
          autoComplete="email"
          disabled={inviteLockedEmail}
        />
        <AuthField
          id="password"
          label={tr ? "Şifre" : "Password"}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-[#1E3A5F] dark:text-indigo-400 hover:underline"
          >
            {tr ? "Şifremi Unuttum" : "Forgot password?"}
          </Link>
        </div>
        <AuthButton loading={loading}>{tr ? "Giriş Yap" : "Sign In"}</AuthButton>
      </form>
    </AuthLayout>
  );
}
