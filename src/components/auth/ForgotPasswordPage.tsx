import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { useLanguage } from "../../lib/LanguageContext";
import AuthLayout, { AuthButton, AuthError, AuthField, AuthSuccess } from "./AuthLayout";

export default function ForgotPasswordPage() {
  const { resetPassword, user, initError } = useAuth();
  const { lang } = useLanguage();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const result = await resetPassword(email.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(
      lang === "TR"
        ? "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi."
        : "Password reset link has been sent to your email."
    );
  };

  const tr = lang === "TR";

  return (
    <AuthLayout
      title={tr ? "Şifremi Unuttum" : "Forgot Password"}
      subtitle={
        tr
          ? "E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz"
          : "We will send a password reset link to your email"
      }
      footer={
        <Link to="/login" className="font-semibold text-[#1E3A5F] dark:text-indigo-400 hover:underline">
          {tr ? "Giriş sayfasına dön" : "Back to sign in"}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={initError} />
        <AuthError message={error} />
        <AuthSuccess message={success} />
        <AuthField
          id="email"
          label={tr ? "E-posta" : "Email"}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@company.com"
          autoComplete="email"
        />
        <AuthButton loading={loading}>{tr ? "Sıfırlama Bağlantısı Gönder" : "Send Reset Link"}</AuthButton>
      </form>
    </AuthLayout>
  );
}
