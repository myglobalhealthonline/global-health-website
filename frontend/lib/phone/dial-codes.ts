/**
 * Country → international dial code, for every phone picker in the app.
 *
 * The option list is the full ISO 3166-1 set (see `./countries`), with the
 * app's active markets pinned to the top; the picker UI
 * (`components/forms/country-dial-select`) adds search so a long list stays
 * usable.
 *
 * Phones are always stored as "+<dial> <national>" (e.g. "+353 871234567")
 * so downstream WhatsApp/SMS normalization is unambiguous.
 */
import {
  COUNTRIES,
  COUNTRY_SEARCH_ALIASES,
  PRIORITY_COUNTRY_CODES,
  type Country,
} from "./countries";

export type DialOption = {
  /** Stable key for the option (app or ISO country code, lowercase). */
  key: string;
  /** ISO 3166-1 alpha-2 code, for the flag glyph. */
  code: string;
  /** E.164 calling prefix WITHOUT the leading + (e.g. "353"). */
  dial: string;
  /** Human label for the dropdown (e.g. "Ireland"). */
  label: string;
  /** True for the app's active markets, which sort to the top. */
  priority: boolean;
};

const BY_CODE = new Map<string, Country>(COUNTRIES.map((c) => [c.code, c]));

function toOption(c: Country, priority: boolean): DialOption {
  return { key: c.code, code: c.code, dial: c.dial, label: c.name, priority };
}

/** Active markets first (business order), then every other country A→Z. */
export const DIAL_OPTIONS: DialOption[] = [
  ...PRIORITY_COUNTRY_CODES.flatMap((code) => {
    const c = BY_CODE.get(code);
    return c ? [toOption(c, true)] : [];
  }),
  // Sorted here rather than trusted from the source list: hand-keeping ~230
  // rows in collation order is a losing game ("U.S. Virgin Islands" alone
  // does not sort where it looks like it should).
  ...COUNTRIES.filter((c) => !(PRIORITY_COUNTRY_CODES as readonly string[]).includes(c.code))
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .map((c) => toOption(c, false)),
];

/** How many leading options are pinned markets (the picker draws a divider). */
export const PRIORITY_OPTION_COUNT = DIAL_OPTIONS.filter((o) => o.priority).length;

/**
 * The app's own country codes, which are NOT all ISO: "sp" is Spain and "rm"
 * is Romania in routing/cart/doctor records. Kept explicit so legacy rows keep
 * resolving, and used as the narrow fallback map for slug lookups.
 */
const APP_DIAL_BY_CODE: Record<string, string> = {
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

/** Every ISO code plus the app's legacy aliases resolve to a dial code. */
const DIAL_BY_CODE: Record<string, string> = {
  ...Object.fromEntries(COUNTRIES.map((c) => [c.code, c.dial])),
  ...APP_DIAL_BY_CODE,
};

/** "Côte d'Ivoire" → "cote-divoire" — matches the site's URL slug style. */
function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Country-name slugs (URL segments) → dial code, for surfaces that only
 *  know the route slug (e.g. /ireland/…). Generated from the country names,
 *  plus the aliases the routes actually use. */
const DIAL_BY_SLUG: Record<string, string> = {
  ...Object.fromEntries(COUNTRIES.map((c) => [slugify(c.name), c.dial])),
  czech: "420",
  "czech-republic": "420",
  uk: "44",
  "great-britain": "44",
  england: "44",
  usa: "1",
  "united-states-of-america": "1",
  uae: "971",
  holland: "31",
  "ivory-coast": "225",
  "south-korea": "82",
};

/** App primary market — the default dial code when a country can't be mapped. */
export const DEFAULT_DIAL = "353"; // Ireland

/** Default dial code for a booking country code; falls back to Ireland (+353). */
export function dialCodeForCountry(code: string | null | undefined): string {
  if (!code) return DEFAULT_DIAL;
  return DIAL_BY_CODE[code.trim().toLowerCase()] ?? DEFAULT_DIAL;
}

/** Default dial code for a country URL slug (e.g. "ireland" → "353"). Falls
 *  back to the app's own 2-letter codes, then Ireland. The fallback stays on
 *  the narrow app map on purpose — probing the full ISO set with the first two
 *  letters of an arbitrary slug produces confident nonsense ("atlantis" → AT,
 *  Austria). */
export function dialCodeForCountrySlug(slug: string | null | undefined): string {
  if (!slug) return DEFAULT_DIAL;
  const s = slug.trim().toLowerCase();
  return DIAL_BY_SLUG[s] ?? APP_DIAL_BY_CODE[s.slice(0, 2)] ?? DEFAULT_DIAL;
}

/** Longest-first list of known dial codes, for prefix matching in splitPhone.
 *  Longest-first matters for the +1 block: "+1876…" is Jamaica, not a US
 *  number starting 876. Still ambiguous INSIDE the NANP (a US number
 *  starting 787 parses as Puerto Rico); only a real libphonenumber parse
 *  fixes that — add one when it actually bites. */
const KNOWN_DIALS = [...new Set(Object.values(DIAL_BY_CODE))].sort(
  (a, b) => b.length - a.length,
);

/** First country carrying this dial code (the picker's label for it). */
export function countryForDial(dial: string): DialOption | undefined {
  const d = dial.trim().replace(/^\+/, "");
  return DIAL_OPTIONS.find((o) => o.dial === d);
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Filter the picker list by a free-text query. Matches country name (accent
 * insensitive, e.g. "reunion" finds Réunion), ISO code, dial code with or
 * without "+", and common alternate names ("UAE", "Holland", "Burma").
 *
 * Ranking: name prefix > alias/dial prefix > substring anywhere. Ties keep the
 * list order, so pinned markets stay on top.
 */
export function searchDialOptions(query: string, options = DIAL_OPTIONS): DialOption[] {
  const q = normalize(query).replace(/^\+/, "");
  if (!q) return options;
  const digits = q.replace(/\D/g, "");

  const scored: { option: DialOption; rank: number }[] = [];
  for (const option of options) {
    const name = normalize(option.label);
    const aliases = (COUNTRY_SEARCH_ALIASES[option.code] ?? []).map(normalize);
    let rank = -1;

    if (name.startsWith(q)) rank = 0;
    else if (digits && option.dial.startsWith(digits)) rank = 1;
    else if (aliases.some((a) => a.startsWith(q))) rank = 1;
    else if (option.code === q) rank = 1;
    else if (name.includes(q)) rank = 2;
    else if (aliases.some((a) => a.includes(q))) rank = 3;

    if (rank >= 0) scored.push({ option, rank });
  }

  return scored
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((s) => s.option);
}

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
 *   "+421902123456"  → { dial: "421", national: "902123456" }
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
