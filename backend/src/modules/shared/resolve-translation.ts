import type { LocaleCode } from "@prisma/client";

/**
 * Picks the best translation row for a requested locale, following the
 * CMS fallback chain: requested locale -> country default locale -> none.
 *
 * We intentionally do NOT fall back to an arbitrary third-language row.
 * If a requested/default-locale translation is missing, callers should use
 * the entity's base columns instead of leaking unrelated-language content
 * into the public response.
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

  return { tr: null, resolvedLocale: defaultLocale };
}
