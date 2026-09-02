/**
 * Canonical language registry — single source of truth for:
 *  - the admin doctor-edit multi-select (no more free-typed languages)
 *  - the public doctors-page language filter (proper labels, not codes)
 *  - normalising legacy free-typed values ("BANGLA", "Czech", "pt") to
 *    one canonical label so the same language never shows two ways.
 *
 * `code` is ISO 639-1 where one exists (used as the stable dedup key +
 * URL filter token). `label` is the English display name shown on
 * cards + chips. `aliases` lists the other spellings/native names we've
 * seen in existing data so `normalizeLanguage` can fold them in.
 *
 * Doctors store the `label` in `Doctor.languages` (the dropdown writes
 * canonical labels), so public cards render them verbatim and the
 * filter groups by `code`.
 */
export type LanguageEntry = {
  code: string;
  label: string;
  aliases?: string[];
};

export const LANGUAGES: readonly LanguageEntry[] = [
  { code: "en", label: "English" },
  { code: "ga", label: "Irish", aliases: ["gaeilge"] },
  { code: "pt", label: "Portuguese", aliases: ["português", "portugues"] },
  { code: "es", label: "Spanish", aliases: ["español", "espanol", "castellano"] },
  { code: "cs", label: "Czech", aliases: ["cz", "čeština", "cestina"] },
  { code: "ro", label: "Romanian", aliases: ["română", "romana"] },
  { code: "fr", label: "French", aliases: ["français", "francais"] },
  { code: "de", label: "German", aliases: ["deutsch"] },
  { code: "it", label: "Italian", aliases: ["italiano"] },
  { code: "pl", label: "Polish", aliases: ["polski"] },
  { code: "nl", label: "Dutch", aliases: ["nederlands"] },
  { code: "hi", label: "Hindi", aliases: ["हिन्दी"] },
  { code: "bn", label: "Bangla", aliases: ["bengali", "বাংলা"] },
  { code: "ur", label: "Urdu", aliases: ["اردو"] },
  { code: "pa", label: "Punjabi", aliases: ["ਪੰਜਾਬੀ", "panjabi"] },
  { code: "ar", label: "Arabic", aliases: ["العربية"] },
  { code: "he", label: "Hebrew", aliases: ["עברית", "ivrit", "iw"] },
  { code: "fa", label: "Persian", aliases: ["farsi", "فارسی", "dari"] },
  { code: "ru", label: "Russian", aliases: ["русский", "russkiy"] },
  { code: "uk", label: "Ukrainian", aliases: ["українська"] },
  { code: "tr", label: "Turkish", aliases: ["türkçe", "turkce"] },
  { code: "el", label: "Greek", aliases: ["ελληνικά", "ellinika"] },
  { code: "hu", label: "Hungarian", aliases: ["magyar"] },
  { code: "sk", label: "Slovak", aliases: ["slovenčina", "slovencina"] },
  { code: "sv", label: "Swedish", aliases: ["svenska"] },
  { code: "no", label: "Norwegian", aliases: ["norsk"] },
  { code: "da", label: "Danish", aliases: ["dansk"] },
  { code: "fi", label: "Finnish", aliases: ["suomi"] },
  { code: "zh", label: "Mandarin", aliases: ["chinese", "中文", "putonghua"] },
  { code: "yue", label: "Cantonese", aliases: ["廣東話"] },
  { code: "tl", label: "Tagalog", aliases: ["filipino"] },
  { code: "ja", label: "Japanese", aliases: ["日本語", "nihongo"] },
  { code: "ko", label: "Korean", aliases: ["한국어", "hangugeo"] },
  { code: "vi", label: "Vietnamese", aliases: ["tiếng việt"] },
  { code: "th", label: "Thai", aliases: ["ไทย"] },
  { code: "ml", label: "Malayalam", aliases: ["മലയാളം"] },
  { code: "ta", label: "Tamil", aliases: ["தமிழ்"] },
  { code: "te", label: "Telugu", aliases: ["తెలుగు"] },
  { code: "sw", label: "Swahili", aliases: ["kiswahili"] },
];

/** Just the display labels — feeds the admin multi-select options. */
export const LANGUAGE_LABELS: readonly string[] = LANGUAGES.map((l) => l.label);

// Lookup index built once: every code, label, and alias (all lowercased)
// → the canonical entry. Lets normalizeLanguage fold any stored spelling
// into one label.
const INDEX: Map<string, LanguageEntry> = (() => {
  const m = new Map<string, LanguageEntry>();
  for (const entry of LANGUAGES) {
    m.set(entry.code.toLowerCase(), entry);
    m.set(entry.label.toLowerCase(), entry);
    for (const alias of entry.aliases ?? []) m.set(alias.toLowerCase(), entry);
  }
  return m;
})();

/**
 * Fold any stored language token (code / label / alias / native name)
 * into its canonical entry. Returns null for an unrecognised token so
 * callers can decide whether to drop it or surface it raw.
 */
export function resolveLanguage(token: string): LanguageEntry | null {
  return INDEX.get(token.trim().toLowerCase()) ?? null;
}

/**
 * Canonical stable key for dedup + URL filter tokens. Recognised
 * languages → their ISO code; unrecognised tokens → the lowercased raw
 * value so they still group consistently (and stay visible rather than
 * being silently dropped).
 */
export function languageKey(token: string): string {
  return resolveLanguage(token)?.code ?? token.trim().toLowerCase();
}

/**
 * Display label for a token. Recognised → canonical label; unrecognised
 * → the trimmed raw value title-cased so it at least reads cleanly.
 */
export function languageLabel(token: string): string {
  const entry = resolveLanguage(token);
  if (entry) return entry.label;
  const raw = token.trim();
  return raw ? raw[0].toUpperCase() + raw.slice(1) : raw;
}

// Shared pt.json is PT-PT; Node's bare "pt" ICU data is pt-BR ("tcheco"
// instead of "checo"), so pin the region.
const DISPLAY_NAME_LOCALE: Record<string, string> = { pt: "pt-PT" };

/**
 * Locale-aware display label via Intl.DisplayNames (capitalised, since we
 * render these as list items). Falls back to the English canonical label
 * for unrecognised tokens or missing ICU data.
 */
export function localizedLanguageLabel(token: string, locale: string): string {
  const entry = resolveLanguage(token);
  if (!entry) return languageLabel(token);
  if (locale === "en" || locale.startsWith("en-")) return entry.label;
  try {
    const name = new Intl.DisplayNames([DISPLAY_NAME_LOCALE[locale] ?? locale], {
      type: "language",
    }).of(entry.code);
    if (!name || name === entry.code) return entry.label;
    return name[0].toUpperCase() + name.slice(1);
  } catch {
    return entry.label;
  }
}
