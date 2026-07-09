import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { useLanguage } from "../../lib/LanguageContext";
import AuthLayout, { AuthButton, AuthError, AuthField } from "./AuthLayout";

export default function LoginPage() {
  const { signIn, user, initError } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <AuthLayout
      title={tr ? "Giriş Yap" : "Sign In"}
      subtitle={tr ? "Gemba IQ hesabınıza erişin" : "Access your Gemba IQ account"}
      footer={
        <span className="text-slate-500 dark:text-zinc-400">
          {tr ? "Hesabınız yok mu?" : "Don't have an account?"}{" "}
          <Link to="/register" className="font-semibold text-[#1E3A5F] dark:text-indigo-400 hover:underline">
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
          placeholder="you@company.com"
          autoComplete="email"
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
