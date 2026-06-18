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
  { key: "pk", dial: "92", label: "Pakistan" },
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
  pk: "92",
};

/** Country-name slugs (URL segments) → dial code, for surfaces that only
 *  know the route slug (e.g. /ireland/…). */
const DIAL_BY_SLUG: Record<string, string> = {
  ireland: "353",
  czechia: "420",
  czech: "420",
  "czech-republic": "420",
  portugal: "351",
  spain: "34",
  romania: "40",
  malta: "356",
  brazil: "55",
  "united-kingdom": "44",
  uk: "44",
  pakistan: "92",
};

/** App primary market — the default dial code when a country can't be mapped. */
export const DEFAULT_DIAL = "353"; // Ireland

/** Default dial code for a booking country code; falls back to Ireland (+353). */
export function dialCodeForCountry(code: string | null | undefined): string {
  if (!code) return DEFAULT_DIAL;
  return DIAL_BY_CODE[code.trim().toLowerCase()] ?? DEFAULT_DIAL;
}

/** Default dial code for a country URL slug (e.g. "ireland" → "353"). Falls
 *  back to the 2-letter code map, then Ireland. */
export function dialCodeForCountrySlug(slug: string | null | undefined): string {
  if (!slug) return DEFAULT_DIAL;
  const s = slug.trim().toLowerCase();
  return DIAL_BY_SLUG[s] ?? DIAL_BY_CODE[s.slice(0, 2)] ?? DEFAULT_DIAL;
}

/** Longest-first list of known dial codes, for prefix matching in splitPhone. */
const KNOWN_DIALS = [...new Set(Object.values(DIAL_BY_CODE))].sort(
  (a, b) => b.length - a.length,
);

/** Build the stored phone value from a dial code + national number.
 *  Empty national number → "" (keeps "optional phone" semantics). */
export function combinePhone(dial: string, national: string): string {
  const d = dial.trim().replace(/^\+/, "");
  const n = national.trim();
  if (!n) return "";
  return `+${d} ${n}`;
}

export type PhoneParts = { dial: string; national: string };

/**
 * Split a stored/prefilled phone into a dial code + national number.
 *   "+353 871234567" → { dial: "353", national: "871234567" }
 *   "+421902123456"  → { dial: "421", national: "902123456" }  (unknown code kept)
 *   "0871234567"     → { dial: fallbackDial, national: "0871234567" }
 * National part keeps digits only. When the value carries no "+", the whole
 * thing is treated as the national number under `fallbackDial`.
 */
export function splitPhone(
  raw: string | null | undefined,
  fallbackDial: string = DEFAULT_DIAL,
): PhoneParts {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { dial: fallbackDial, national: "" };

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    for (const d of KNOWN_DIALS) {
      if (digits.startsWith(d) && digits.length > d.length) {
        return { dial: d, national: digits.slice(d.length) };
      }
    }
    // Unknown country code — keep a best-effort 1–3 digit prefix as the dial
    // so the number still round-trips, rather than dropping the code.
    const guess = digits.slice(0, Math.min(3, Math.max(1, digits.length - 6)));
    return { dial: guess || fallbackDial, national: digits.slice(guess.length) };
  }

  return { dial: fallbackDial, national: trimmed.replace(/\D/g, "") };
}
