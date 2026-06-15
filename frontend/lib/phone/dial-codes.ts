/**
 * App country code → international dial code, for the manual-booking phone
 * picker. Keyed by the app's OWN country codes (note: Spain = "sp",
 * Romania = "rm") plus ISO aliases ("es"/"ro") so a lookup never misses.
 *
 * Phones are always stored as "+<dial> <national>" (e.g. "+353 871234567")
 * so downstream WhatsApp/SMS normalization is unambiguous.
 */
export type DialOption = {
  /** Stable key for the option (app or ISO country code, lowercase). */
  key: string;
  /** E.164 calling prefix WITHOUT the leading + (e.g. "353"). */
  dial: string;
  /** Human label for the dropdown (e.g. "Ireland"). */
  label: string;
};

/** Ordered list shown in the dropdown — active markets first, then extras. */
export const DIAL_OPTIONS: DialOption[] = [
  { key: "ie", dial: "353", label: "Ireland" },
  { key: "cz", dial: "420", label: "Czechia" },
  { key: "pt", dial: "351", label: "Portugal" },
  { key: "sp", dial: "34", label: "Spain" },
  { key: "rm", dial: "40", label: "Romania" },
  { key: "mt", dial: "356", label: "Malta" },
  { key: "br", dial: "55", label: "Brazil" },
  { key: "gb", dial: "44", label: "United Kingdom" },
];

/** Both the app code and the ISO code resolve to a dial code. */
const DIAL_BY_CODE: Record<string, string> = {
  ie: "353",
  cz: "420",
  pt: "351",
  sp: "34",
  es: "34",
  rm: "40",
  ro: "40",
  mt: "356",
  br: "55",
  gb: "44",
  uk: "44",
};

/** App primary market — the default dial code when a country can't be mapped. */
export const DEFAULT_DIAL = "353"; // Ireland

/** Default dial code for a booking country; falls back to Ireland (+353). */
export function dialCodeForCountry(code: string | null | undefined): string {
  if (!code) return DEFAULT_DIAL;
  return DIAL_BY_CODE[code.trim().toLowerCase()] ?? DEFAULT_DIAL;
}
