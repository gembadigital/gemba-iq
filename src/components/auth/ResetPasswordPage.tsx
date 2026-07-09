import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { useLanguage } from "../../lib/LanguageContext";
import { supabase } from "../../lib/supabaseClient";
import AuthLayout, { AuthButton, AuthError, AuthField, AuthSuccess } from "./AuthLayout";

export default function ResetPasswordPage() {
  const { updatePassword, session } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: recoverySession } }) => {
      setReady(true);
      if (!recoverySession) {
        setError(
          lang === "TR"
            ? "Geçersiz veya süresi dolmuş sıfırlama bağlantısı. Lütfen yeni bir bağlantı isteyin."
            : "Invalid or expired reset link. Please request a new one."
        );
      }
    });
  }, [lang]);

  if (session && success) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError(lang === "TR" ? "Şifre en az 6 karakter olmalıdır." : "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError(lang === "TR" ? "Şifreler eşleşmiyor." : "Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(
      lang === "TR"
        ? "Şifreniz güncellendi. Uygulamaya yönlendiriliyorsunuz..."
        : "Your password has been updated. Redirecting to the app..."
    );
    setTimeout(() => navigate("/", { replace: true }), 1500);
  };

  const tr = lang === "TR";

  if (!ready) {
    return null;
  }

  return (
    <AuthLayout
      title={tr ? "Şifreyi Sıfırla" : "Reset Password"}
      subtitle={tr ? "Yeni şifrenizi belirleyin" : "Set your new password"}
      footer={
        <Link to="/login" className="font-semibold text-[#1E3A5F] dark:text-indigo-400 hover:underline">
          {tr ? "Giriş sayfasına dön" : "Back to sign in"}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={error} />
        <AuthSuccess message={success} />
        <AuthField
          id="password"
          label={tr ? "Yeni Şifre" : "New Password"}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <AuthField
          id="confirmPassword"
          label={tr ? "Yeni Şifre Tekrar" : "Confirm New Password"}
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        <AuthButton loading={loading} disabled={!!error && !session}>
          {tr ? "Şifreyi Güncelle" : "Update Password"}
        </AuthButton>
      </form>
    </AuthLayout>
  );
}
