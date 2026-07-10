import React from "react";
import { Link } from "react-router-dom";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  logoSrc?: string;
}

export default function AuthLayout({ title, subtitle, children, footer, logoSrc = "/logos/GIQ.png" }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#09090b] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={logoSrc} alt="Gemba IQ" className="h-12 w-auto object-contain mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 text-center">{subtitle}</p>
        </div>

        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-sm p-6 sm:p-8">
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm">{footer}</div>}

        <div className="mt-10 flex justify-center">
          <img src="/logos/Gdogo5.png" alt="Gemba Digital" className="h-8 w-auto object-contain opacity-80" />
        </div>
      </div>
    </div>
  );
}

interface AuthFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
}

export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  disabled = false,
}: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#0c0c0e] text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] dark:focus:border-indigo-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      />
    </div>
  );
}

interface AuthButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export function AuthButton({ children, loading, disabled, type = "submit", onClick, variant = "primary" }: AuthButtonProps) {
  const base =
    "w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer";
  const styles =
    variant === "primary"
      ? "bg-[#1E3A5F] hover:bg-[#162c4a] text-white shadow-sm"
      : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700";

  return (
    <button type={type} onClick={onClick} disabled={loading || disabled} className={`${base} ${styles}`}>
      {loading && (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

export function AuthLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-[#1E3A5F] dark:text-indigo-400 hover:underline">
      {children}
    </Link>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2.5 text-sm text-rose-700 dark:text-rose-300">
      {message}
    </div>
  );
}

export function AuthSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
      {message}
    </div>
  );
}
