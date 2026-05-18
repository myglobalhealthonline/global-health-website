/**
 * Central currency symbol map. Add new ISO 4217 codes here when a new
 * country is enabled. Falls back to the raw code with a trailing space
 * for any currency not in the map so the price still renders.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
  CZK: "Kč",
  BRL: "R$",
  RON: "lei",
  PLN: "zł",
  CHF: "CHF ",
  CAD: "C$",
  AUD: "A$",
};

/** Position of the symbol relative to the amount. Default: prefix. */
const CURRENCY_SUFFIX: Record<string, true> = {
  CZK: true,
  RON: true,
  PLN: true,
};

export function currencySymbol(code: string | null | undefined): string {
  if (!code) return "€";
  const normalized = code.trim().toUpperCase();
  return CURRENCY_SYMBOLS[normalized] ?? `${normalized} `;
}

/**
 * Format an amount in cents with the country's currency symbol.
 *   formatPrice(5000, "EUR")  → "€50.00"
 *   formatPrice(50000, "CZK") → "500 Kč"
 *   formatPrice(2500, "BRL")  → "R$25.00"
 */
export function formatPrice(
  amountCents: number,
  code: string | null | undefined,
  options?: { maximumFractionDigits?: number },
): string {
  const normalized = (code ?? "EUR").trim().toUpperCase();
  const symbol = currencySymbol(normalized);
  const major = amountCents / 100;
  const formatted = major.toLocaleString("en-IE", {
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    minimumFractionDigits: 0,
  });
  if (CURRENCY_SUFFIX[normalized]) {
    return `${formatted} ${symbol.trim()}`;
  }
  return `${symbol}${formatted}`;
}

/**
 * Round-number variant for catalog price tiles where decimals look noisy.
 *   formatPriceRounded(5000, "EUR") → "€50"
 */
export function formatPriceRounded(
  amountCents: number,
  code: string | null | undefined,
): string {
  return formatPrice(amountCents, code, { maximumFractionDigits: 0 });
}
