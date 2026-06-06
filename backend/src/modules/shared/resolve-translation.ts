import type { LocaleCode } from "@prisma/client";

/**
 * Picks the best translation row for a requested locale, following the
 * CMS fallback chain: requested locale → country default locale → first
 * available translation (deterministic by locale) → none.
 *
 * Field-level merging (translation value ?? base column) is done by each
 * caller against the entity's own base columns, so a translation row that
 * only fills a subset of fields still falls back to the default-locale
 * base copy for the rest.
 */
export type ResolvedTranslation<T> = {
  /** The chosen translation row, or null when none exist at all. */
  tr: T | null;
  /** The locale that actually supplied the content (or defaultLocale). */
  resolvedLocale: LocaleCode;
};

export function resolveTranslation<T extends { locale: LocaleCode }>(
  translations: readonly T[],
  requested: LocaleCode,
  defaultLocale: LocaleCode,
): ResolvedTranslation<T> {
  const byRequested = translations.find((t) => t.locale === requested);
  if (byRequested) return { tr: byRequested, resolvedLocale: requested };

  const byDefault = translations.find((t) => t.locale === defaultLocale);
  if (byDefault) return { tr: byDefault, resolvedLocale: defaultLocale };

  const first = [...translations].sort((a, b) => a.locale.localeCompare(b.locale))[0] ?? null;
  return { tr: first, resolvedLocale: first?.locale ?? defaultLocale };
}
