/**
 * Helper utility to read and handle the active system currency from organization settings.
 */

export interface SystemCurrency {
  code: string;
  symbol: string;
}

export function getSystemCurrency(): SystemCurrency {
  const saved = localStorage.getItem("admin_org_settings");
  let defaultCurrency = "EUR (€)"; // System default is EUR (€)
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.defaultCurrency) {
        defaultCurrency = parsed.defaultCurrency;
      }
    } catch (e) {
      // ignore JSON parse errors
    }
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
