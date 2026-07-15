/**
 * Deep-merges a translated locale bundle over the English source so that a
 * key missing from the locale file (undefined) falls back to English instead
 * of rendering empty. Arrays and primitives (including "") from the locale
 * win wholesale when present — only a genuinely absent key falls back.
 */
export function deepMergeLocale<T>(en: T, locale: T | undefined): T {
  if (locale === undefined) return en;
  if (Array.isArray(en) || Array.isArray(locale)) return locale as T;
  if (
    en !== null &&
    typeof en === "object" &&
    locale !== null &&
    typeof locale === "object"
  ) {
    const result: Record<string, unknown> = { ...(en as Record<string, unknown>) };
    for (const key of Object.keys(locale as Record<string, unknown>)) {
      result[key] = deepMergeLocale(
        (en as Record<string, unknown>)[key],
        (locale as Record<string, unknown>)[key],
      );
    }
    return result as T;
  }
  return locale;
}
