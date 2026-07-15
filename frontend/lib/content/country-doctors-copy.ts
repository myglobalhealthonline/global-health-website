import type { CountryCode } from "@/data/countries";
import type { CommonLocale } from "@/lib/i18n/types";

/**
 * Per-country/-locale copy overrides for the /doctors directory hero.
 *
 * Mirrors `country-home-copy.ts`: the shared `common.doctors` i18n bundle is
 * LANGUAGE-scoped (the English bundle renders on every English-speaking
 * market), so a market-specific claim can't live there without leaking to
 * every other market. This module layers a thin, code-owned override keyed
 * by `${code}:${locale}` OVER the shared bundle. A country/locale with no
 * entry keeps the generic copy verbatim — no leak.
 */

type DoctorsBundle = CommonLocale["doctors"];
type DoctorsOverride = Partial<DoctorsBundle>;

function key(code: CountryCode, locale: string): string {
  return `${code.toLowerCase()}:${locale.toLowerCase()}`;
}

const OVERRIDES: Record<string, DoctorsOverride> = {
  "ie:en": {
    // Availability pill: "{count} IMC-registered doctors and clinicians"
    // (count is computed, prefix stays dynamic).
    heroAvailablePlural: "IMC-registered doctors and clinicians",
    heroAvailableSingular: "IMC-registered doctor or clinician available",
    trustCard1Title: "IMC-registered",
    trustCard1Subtitle: "Fully verified",
    // EU Omnibus: the generic "4.9 rating / 2,000+ reviews" claim is
    // unverifiable and must not appear on the Ireland page.
    trustCard2Title: "Reviewed on Doctify",
    trustCard2Subtitle: "45,000 consultations in 2025",
  },
  // Same EU Omnibus liability applies regardless of page language — the
  // fabricated "4.9 rating / 2,000+ reviews" claim must not appear on the
  // Ireland page in any locale. Reuses each locale's already-translated
  // gpPage/specialistPage.hero.stat2 copy for consistency.
  "ie:es": {
    trustCard2Title: "Valorado en Doctify",
    trustCard2Subtitle: "45.000 consultas en 2025",
  },
  "ie:pt": {
    trustCard2Title: "Avaliado no Doctify",
    trustCard2Subtitle: "45.000 consultas em 2025",
  },
  "ie:cs": {
    trustCard2Title: "Hodnoceno na Doctify",
    trustCard2Subtitle: "45 000 konzultací v roce 2025",
  },
  "ie:ro": {
    trustCard2Title: "Evaluat pe Doctify",
    trustCard2Subtitle: "45.000 de consultații în 2025",
  },
  "ie:de": {
    trustCard2Title: "Bewertet auf Doctify",
    trustCard2Subtitle: "45.000 Konsultationen im Jahr 2025",
  },
};

/** Merge the country/locale override (if any) onto the `doctors` bundle. */
export function overrideDoctorsBundle(
  base: DoctorsBundle,
  code: CountryCode,
  locale: string,
): DoctorsBundle {
  const over = OVERRIDES[key(code, locale)];
  return over ? { ...base, ...over } : base;
}
