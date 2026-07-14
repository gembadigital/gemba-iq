/**
 * Helper utility to read and handle the active system currency from organization settings.
 */
import { CrmDb } from "./CrmDb";

// Must exactly match the key used in App.tsx and AdministrationCenter.tsx.
const ADMIN_ORG_SETTINGS_KEY = "crm_admin_org_settings";

export interface SystemCurrency {
  code: string;
  symbol: string;
}

export function getSystemCurrency(): SystemCurrency {
  const saved = CrmDb.getKv<Record<string, any> | null>(ADMIN_ORG_SETTINGS_KEY, null);
  let defaultCurrency = "EUR (€)"; // System default is EUR (€)
  if (saved && saved.defaultCurrency) {
    defaultCurrency = saved.defaultCurrency;
  }

  let code = "EUR";
  let symbol = "€";

  if (defaultCurrency.includes("TRY") || defaultCurrency.includes("₺")) {
    code = "TRY";
    symbol = "₺";
  } else if (defaultCurrency.includes("USD") || defaultCurrency.includes("$")) {
    code = "USD";
    symbol = "$";
  } else if (defaultCurrency.includes("EUR") || defaultCurrency.includes("€")) {
    code = "EUR";
    symbol = "€";
  } else if (defaultCurrency.includes("GBP") || defaultCurrency.includes("£")) {
    code = "GBP";
    symbol = "£";
  }

  return { code, symbol };
}

export function getSystemLocale(): string {
  const lang = localStorage.getItem("system_language") || "TR";
  return lang === "EN" ? "en-US" : "tr-TR";
}

export function formatSystemCurrency(v: number): string {
  const { code } = getSystemCurrency();
  return new Intl.NumberFormat(getSystemLocale(), {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0
  }).format(v);
}

export function formatSystemNumber(v: number): string {
  return new Intl.NumberFormat(getSystemLocale()).format(v);
}
