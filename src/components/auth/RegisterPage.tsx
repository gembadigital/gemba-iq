import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { useLanguage } from "../../lib/LanguageContext";
import AuthLayout, { AuthButton, AuthError, AuthField, AuthSuccess } from "./AuthLayout";

export default function RegisterPage() {
  const { signUp, user, initError } = useAuth();
  const { lang } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (password.length < 6) {
      setError(lang === "TR" ? "Şifre en az 6 karakter olmalıdır." : "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError(lang === "TR" ? "Şifreler eşleşmiyor." : "Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.needsEmailVerification) {
      setSuccess(
        lang === "TR"
          ? "Kayıt başarılı. Lütfen hesabınızı etkinleştirmek için e-postanızdaki doğrulama bağlantısına tıklayın."
          : "Registration successful. Please check your email and click the verification link to activate your account."
      );
      return;
    }

    setSuccess(lang === "TR" ? "Kayıt başarılı. Giriş yapabilirsiniz." : "Registration successful. You can sign in now.");
  };

  const tr = lang === "TR";

  return (
    <AuthLayout
      title={tr ? "Kayıt Ol" : "Create Account"}
      subtitle={tr ? "Gemba IQ için yeni bir hesap oluşturun" : "Create a new Gemba IQ account"}
      footer={
        <span className="text-slate-500 dark:text-zinc-400">
          {tr ? "Zaten hesabınız var mı?" : "Already have an account?"}{" "}
          <Link to="/login" className="font-semibold text-[#1E3A5F] dark:text-indigo-400 hover:underline">
            {tr ? "Giriş Yap" : "Sign In"}
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={initError} />
        <AuthError message={error} />
        <AuthSuccess message={success} />
        <AuthField
          id="fullName"
          label={tr ? "Ad Soyad" : "Full Name"}
          value={fullName}
          onChange={setFullName}
          placeholder={tr ? "Adınız Soyadınız" : "Your full name"}
          autoComplete="name"
        />
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
          autoComplete="new-password"
        />
        <AuthField
          id="confirmPassword"
          label={tr ? "Şifre Tekrar" : "Confirm Password"}
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        <AuthButton loading={loading}>{tr ? "Kayıt Ol" : "Register"}</AuthButton>
      </form>
    </AuthLayout>
  );
}
