import React, { useState } from "react";
import { useOrganization } from "../../lib/OrganizationContext";
import { useLanguage } from "../../lib/LanguageContext";
import AuthLayout, { AuthButton, AuthError, AuthField } from "../auth/AuthLayout";

const COUNTRIES = [
  "Turkey",
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Netherlands",
  "United Arab Emirates",
  "Other",
];

export default function WelcomeWizard() {
  const { completeOnboarding } = useOrganization();
  const { lang, setLang } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Turkey");
  const [language, setLanguage] = useState<"TR" | "EN">(lang);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tr = language === "TR";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !companyName.trim()) {
      setError(tr ? "Ad soyad ve şirket adı zorunludur." : "Full name and company name are required.");
      return;
    }

    setLoading(true);
    setLang(language);
    const result = await completeOnboarding({
      fullName: fullName.trim(),
      companyName: companyName.trim(),
      jobTitle: jobTitle.trim(),
      phone: phone.trim(),
      country: country.trim(),
      language,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <AuthLayout
      title={tr ? "Hoş Geldiniz" : "Welcome"}
      subtitle={
        tr
          ? "Gemba IQ çalışma alanınızı oluşturmak için birkaç bilgi paylaşın"
          : "Tell us a few details to set up your Gemba IQ workspace"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={error} />

        <AuthField
          id="fullName"
          label={tr ? "Ad Soyad" : "Full Name"}
          value={fullName}
          onChange={setFullName}
          placeholder={tr ? "Adınız Soyadınız" : "Your full name"}
          autoComplete="name"
        />

        <AuthField
          id="companyName"
          label={tr ? "Şirket Adı" : "Company Name"}
          value={companyName}
          onChange={setCompanyName}
          placeholder={tr ? "Şirketinizin adı" : "Your company name"}
        />

        <AuthField
          id="jobTitle"
          label={tr ? "Ünvan" : "Job Title"}
          value={jobTitle}
          onChange={setJobTitle}
          placeholder={tr ? "Örn. Satış Direktörü" : "e.g. Sales Director"}
        />

        <AuthField
          id="phone"
          label={tr ? "Telefon" : "Phone"}
          value={phone}
          onChange={setPhone}
          placeholder="+90 555 000 0000"
          autoComplete="tel"
        />

        <div>
          <label htmlFor="country" className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
            {tr ? "Ülke" : "Country"}
          </label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#0c0c0e] text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="language" className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
            {tr ? "Dil" : "Language"}
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "TR" | "EN")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#0c0c0e] text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
          >
            <option value="TR">Türkçe</option>
            <option value="EN">English</option>
          </select>
        </div>

        <AuthButton loading={loading}>{tr ? "Çalışma Alanını Oluştur" : "Create Workspace"}</AuthButton>
      </form>
    </AuthLayout>
  );
}
