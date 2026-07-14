import type { CountryCode } from "@/data/countries";
import type { loadLocaleBundle } from "@/lib/i18n/load-locale";

/**
 * Per-country/-locale copy overrides for the country HOME hub page.
 *
 * The shared i18n `home`/`services` bundles are LANGUAGE-scoped — the English
 * bundle renders on Portugal/en, Spain/en, etc. too. Market-specific copy (a
 * clinic brief written for one country) can't live there without leaking to
 * every other market's same-language view. This module layers a thin,
 * code-owned override keyed by `${code}:${locale}` OVER the shared bundle:
 *
 *   page CMS record  ▸  this override  ▸  shared i18n default
 *
 * A country/locale with no entry keeps the generic copy verbatim, so nothing
 * crosses markets. Two consumption shapes:
 *   • `homePageExtras()` — flat, page-level strings read directly (SEO, H1,
 *     hero paragraph, hero bullets, services H2).
 *   • `overrideHomeBundle()` — deep-merges nested overrides into the `home`
 *     bundle so downstream `t.team.headline`, `t.statsBand.*`, etc. just work.
 */

type HomeBundle = ReturnType<typeof loadLocaleBundle>["home"];
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Page-level strings consumed directly (not part of the `home` bundle). */
export type HomePageExtras = {
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  /** H1 — rendered plain (no accent underline) when set. */
  heroTitle?: string;
  /** Hero paragraph below the H1. */
  heroSubtitle?: string;
  /** Hero trust bullets, verbatim (no country name appended). Exactly three. */
  heroBullets?: string[];
  /** Services section H2. */
  servicesHeadline?: string;
};

function key(code: CountryCode, locale: string): string {
  return `${code}:${locale}`;
}

const EXTRAS: Record<string, HomePageExtras> = {
  "IE:en": {
    seoTitle:
      "Online Doctor Ireland | IMC-Registered GPs & Specialists | Same Day",
    seoDescription:
      "See an IMC-registered doctor by video call today — GP consultations, sick certs, specialist referrals. Same-day appointments anywhere in Ireland. From €45.",
    ogTitle: "Online Doctor Ireland — See a Doctor Today | Global Health",
    ogDescription:
      "IMC-registered GPs and specialists by video call — sick certs, prescriptions, referrals. Same-day appointments anywhere in Ireland.",
    heroTitle: "Online Doctor Ireland — IMC-registered physicians, same day.",
    heroSubtitle:
      "GP consultations, sick certs, specialist referrals and medical support — by secure video call, from anywhere in Ireland. Same-day appointments available.",
    heroBullets: [
      "IMC-registered doctors",
      "Same-day appointments",
      "Valid sick certs & prescriptions",
    ],
    servicesHeadline: "GP and specialist consultations — from €45.",
  },
};

const BUNDLE: Record<string, DeepPartial<HomeBundle>> = {
  "IE:en": {
    countryHero: {
      // Availability badge reads "3 doctors available" instead of "3 available".
      available: "doctors available",
    },
    trust: {
      licensedPlural: "IMC-registered doctors",
      // Regulator tile renders "{IMC} {gdpr}" → "IMC registered · verified".
      gdpr: "registered · verified",
    },
    team: {
      headline: "Named doctors. Verified registration.",
      headlineAccent: "No anonymous rotas.",
    },
    statsBand: {
      stat1Label: "IMC-registered doctors",
      stat1Caption: "Registered with the Irish Medical Council.",
    },
    howItWorks: {
      step1Body:
        "Browse GP consultations, sick certs and specialist referrals. Filter by language, specialty, or price.",
      step2Body:
        "Select an IMC-registered doctor and choose an open appointment slot from their live calendar.",
      step3Body:
        "Join the secure video consultation from any device. Receive a clinical note, prescription or sick cert when clinically indicated.",
    },
    finalCta: {
      body: "Browse IMC-registered doctors, then choose an open appointment time. Same-day appointments available.",
    },
  },
};

export function homePageExtras(
  code: CountryCode,
  locale: string,
): HomePageExtras | null {
  return EXTRAS[key(code, locale)] ?? null;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, over: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(over)) {
    return (over === undefined ? base : (over as T));
  }
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(over)) {
    out[k] = k in base ? deepMerge(out[k], over[k]) : over[k];
  }
  return out as T;
}

/** Deep-merge the country/locale override (if any) onto the home bundle. */
export function overrideHomeBundle(
  base: HomeBundle,
  code: CountryCode,
  locale: string,
): HomeBundle {
  const over = BUNDLE[key(code, locale)];
  return over ? deepMerge(base, over) : base;
}
