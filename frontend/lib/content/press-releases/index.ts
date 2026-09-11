import type { LocaleCode } from "@/lib/i18n/types";
import { en } from "./en";
import { cs } from "./cs";
import { pt } from "./pt";
import { es } from "./es";
import { ro } from "./ro";
import { de } from "./de";

/**
 * Press releases, one market each. The release text is code-resident (not CMS)
 * and translated into every locale the market serves — each locale file must
 * cover every slug, which `satisfies PressReleaseCopySet` enforces at compile
 * time. The original-language text is the issued release, reproduced verbatim;
 * the other locales are translations of it and say so on the page.
 */
export const PRESS_RELEASE_SLUGS = [
  "global-health-launches-new-platform",
  "global-health-launches-online-platform-czechia",
] as const;

export type PressReleaseSlug = (typeof PRESS_RELEASE_SLUGS)[number];

export type PressBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string; cite: string };

export type PressReleaseCopy = {
  title: string;
  /** Sub-headline under the title; the hero lede. */
  standfirst: string;
  /** "City, Country — Month Year", as printed on the release. */
  dateline: string;
  /** Meta description, ≤160 chars. */
  description: string;
  body: PressBlock[];
  /** Media contact's role line, when the contact is a named person. */
  contactRole?: string;
};

export type PressReleaseCopySet = Record<PressReleaseSlug, PressReleaseCopy>;

export type PressRelease = {
  slug: PressReleaseSlug;
  /** Market the release was issued for; it is published only under that market. */
  countryCode: string;
  /** Month the release was issued (`YYYY-MM`) — the release gives no day. */
  published: string;
  /** Language the release was issued in. */
  originalLocale: LocaleCode;
  mediaContact: { name: string; email: string; phone?: { display: string; e164: string } };
};

const RELEASES: PressRelease[] = [
  {
    slug: "global-health-launches-online-platform-czechia",
    countryCode: "cz",
    published: "2026-09",
    originalLocale: "cs",
    mediaContact: { name: "Global Health", email: "press.czechia@myglobalhealth.online" },
  },
  {
    slug: "global-health-launches-new-platform",
    countryCode: "ie",
    published: "2026-07",
    originalLocale: "en",
    mediaContact: {
      name: "Dr. Tiago Miguel Figueira",
      email: "globalhealth@myglobalhealth.online",
      phone: { display: "085 765 8743", e164: "+353857658743" },
    },
  },
];

const COPY: Record<LocaleCode, PressReleaseCopySet> = { en, cs, pt, es, ro, de };

/** A market's releases, newest first. */
export function listPressReleases(countryCode: string): PressRelease[] {
  return RELEASES.filter((r) => r.countryCode === countryCode).sort((a, b) =>
    b.published.localeCompare(a.published),
  );
}

export function getPressRelease(countryCode: string, slug: string): PressRelease | null {
  return RELEASES.find((r) => r.countryCode === countryCode && r.slug === slug) ?? null;
}

export function pressReleaseCopy(slug: PressReleaseSlug, lang: LocaleCode): PressReleaseCopy {
  return (COPY[lang] ?? COPY.en)[slug];
}

/** "July 2026" / "září 2026" — month precision, matching the release. */
export function formatPressMonth(published: string, lang: string): string {
  return new Date(`${published}-01T00:00:00Z`).toLocaleDateString(lang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
