import { cache } from "react";
import { fetchPublicPageContent } from "@/lib/api/site-content-api";
import { logPublicContentFallback } from "@/lib/content/public-content-source";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import type { LocaleCode } from "@/lib/i18n/types";
import type { PublicPageKey, PublicLocale } from "@/lib/content/get-public-page";

export type { PublicPageKey, PublicLocale } from "@/lib/content/get-public-page";
export { isSupportedLocale } from "@/lib/content/get-public-page";

export type PageContentSections = {
  intro: boolean;
  whoFor: boolean;
  whyChoose: boolean;
  faq: boolean;
  disclaimer: boolean;
  body: boolean;
};

export type PublicPageContentRecord = {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroTitleLead: string | null;
  heroTitleAccent: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  heroImageSrc: string | null;
  ogImageSrc: string | null;
  intro: string | null;
  whoForTitle: string | null;
  whoForIntro: string | null;
  whoForItems: string[];
  whyChooseTitle: string | null;
  whyChooseItems: string[];
  faq: Array<{ question: string; answer: string }>;
  disclaimerParagraphs: string[];
  disclaimerShort: string | null;
  body: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: PageContentSections;
  introTheme: "green" | "ivory" | null;
  whoForTheme: "green" | "ivory" | null;
  whyChooseTheme: "green" | "ivory" | null;
  faqTheme: "green" | "ivory" | null;
  disclaimerTheme: "green" | "ivory" | null;
  /** Locale the backend actually served this content from — differs from the
   *  requested locale when it fell back to the country default. */
  resolvedLocale: string | null;
  /** Field keys backfilled from the other-locale row (per-field fallback).
   *  Non-empty means the page mixes two languages — translation debt. */
  mixedLocaleFields: string[];
};

export type PublicPageContent = {
  record: PublicPageContentRecord | null;
  disabled: boolean;
};

/**
 * Whole-record fallback is useful to the admin API, but public locale routes
 * must not render a market-default record under a different language URL.
 * For an existing partial translation, retain its valid fields but remove the
 * individual values that the backend reports as default-locale backfills.
 */
export function sanitizePageContentForLocale(
  record: PublicPageContentRecord | null,
  locale: PublicLocale,
): PublicPageContentRecord | null {
  if (record?.resolvedLocale?.toLowerCase() !== locale.toLowerCase()) return null;
  if (record.mixedLocaleFields.length === 0) return record;

  const mixed = new Set(record.mixedLocaleFields);
  const localized = {
    ...record,
    heroTitle: mixed.has("heroTitle") ? null : record.heroTitle,
    heroSubtitle: mixed.has("heroSubtitle") ? null : record.heroSubtitle,
    heroTitleLead: mixed.has("heroTitleLead") ? null : record.heroTitleLead,
    heroTitleAccent: mixed.has("heroTitleAccent") ? null : record.heroTitleAccent,
    ctaLabel: mixed.has("ctaLabel") ? null : record.ctaLabel,
    intro: mixed.has("intro") ? null : record.intro,
    whoForTitle: mixed.has("whoForTitle") ? null : record.whoForTitle,
    whoForIntro: mixed.has("whoForIntro") ? null : record.whoForIntro,
    whoForItems: mixed.has("whoForItems") ? [] : record.whoForItems,
    whyChooseTitle: mixed.has("whyChooseTitle") ? null : record.whyChooseTitle,
    whyChooseItems: mixed.has("whyChooseItems") ? [] : record.whyChooseItems,
    faq: mixed.has("faq") ? [] : record.faq,
    disclaimerParagraphs: mixed.has("disclaimerParagraphs") ? [] : record.disclaimerParagraphs,
    disclaimerShort: mixed.has("disclaimerShort") ? null : record.disclaimerShort,
    body: mixed.has("body") ? null : record.body,
    seoTitle: mixed.has("seoTitle") ? null : record.seoTitle,
    seoDescription: mixed.has("seoDescription") ? null : record.seoDescription,
  };

  return {
    ...localized,
    sections: {
      intro: record.sections.intro && localized.intro !== null,
      whoFor:
        record.sections.whoFor && localized.whoForTitle !== null && localized.whoForItems.length > 0,
      whyChoose:
        record.sections.whyChoose &&
        localized.whyChooseTitle !== null &&
        localized.whyChooseItems.length > 0,
      faq: record.sections.faq && localized.faq.length > 0,
      disclaimer:
        record.sections.disclaimer && localized.disclaimerParagraphs.length > 0,
      body: record.sections.body && localized.body !== null,
    },
  };
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}

function faqList(v: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (x): x is { question: string; answer: string } =>
        !!x &&
        typeof x === "object" &&
        typeof (x as Record<string, unknown>).question === "string" &&
        typeof (x as Record<string, unknown>).answer === "string",
    )
    .map((x) => ({ question: x.question, answer: x.answer }));
}

function boolField(v: unknown): boolean {
  return v === true;
}

function themeField(v: unknown): "green" | "ivory" | null {
  return v === "green" || v === "ivory" ? v : null;
}

/**
 * Maps an admin-selected section theme ("green"/"ivory"/unset) to the
 * component-level `theme` prop value. Unset -> `fallback`, which callers
 * pass as today's hardcoded literal for that section, so an unset theme
 * renders byte-identical to before this feature existed.
 */
export function themeProp<T extends string>(v: string | null | undefined, fallback: T): "dark" | "light" | T {
  return v === "green" ? "dark" : v === "ivory" ? "light" : fallback;
}

function normalizeRecord(raw: unknown): PublicPageContentRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const heroImagePath = str(r.heroImagePath);
  const ogImagePath = str(r.ogImagePath);
  const sectionsRaw = (r.sections && typeof r.sections === "object" ? r.sections : {}) as Record<
    string,
    unknown
  >;

  return {
    heroTitle: str(r.heroTitle),
    heroSubtitle: str(r.heroSubtitle),
    heroTitleLead: str(r.heroTitleLead),
    heroTitleAccent: str(r.heroTitleAccent),
    ctaLabel: str(r.ctaLabel),
    ctaHref: str(r.ctaHref),
    heroImageSrc: heroImagePath ? resolveTrustedAssetUrl(heroImagePath) ?? null : null,
    ogImageSrc: ogImagePath ? resolveTrustedAssetUrl(ogImagePath) ?? null : null,
    intro: str(r.intro),
    whoForTitle: str(r.whoForTitle),
    whoForIntro: str(r.whoForIntro),
    whoForItems: stringList(r.whoForItems),
    whyChooseTitle: str(r.whyChooseTitle),
    whyChooseItems: stringList(r.whyChooseItems),
    faq: faqList(r.faq),
    disclaimerParagraphs: stringList(r.disclaimerParagraphs),
    disclaimerShort: str(r.disclaimerShort),
    body: str(r.body),
    seoTitle: str(r.seoTitle),
    seoDescription: str(r.seoDescription),
    sections: {
      intro: boolField(sectionsRaw.intro),
      whoFor: boolField(sectionsRaw.whoFor),
      whyChoose: boolField(sectionsRaw.whyChoose),
      faq: boolField(sectionsRaw.faq),
      disclaimer: boolField(sectionsRaw.disclaimer),
      body: boolField(sectionsRaw.body),
    },
    introTheme: themeField(r.introTheme),
    whoForTheme: themeField(r.whoForTheme),
    whyChooseTheme: themeField(r.whyChooseTheme),
    faqTheme: themeField(r.faqTheme),
    disclaimerTheme: themeField(r.disclaimerTheme),
    resolvedLocale: typeof r.resolvedLocale === "string" ? r.resolvedLocale : null,
    mixedLocaleFields: stringList(r.mixedLocaleFields),
  };
}

/**
 * Public fetcher for the new DB-backed structured page content
 * (`PageContent`/`PageContentTranslation`), mirroring `get-public-page.ts`
 * exactly: same base-URL resolution (via `apiRequest`), same 60s
 * revalidate + tag scheme, same error tolerance (any failure -> `{record:
 * null, disabled: false}` so pages fall back to i18n copy rather than
 * crash).
 */
export const getPageContent = cache(async (
  countryCode: string,
  pageKey: PublicPageKey,
  locale: PublicLocale,
): Promise<PublicPageContent> => {
  const backendLocale = (locale as LocaleCode).toUpperCase();
  const res = await fetchPublicPageContent(countryCode, pageKey, backendLocale);
  if (!res.ok) {
    logPublicContentFallback(`page-content:${countryCode}:${pageKey}:${locale}`, res.message);
    return { record: null, disabled: false };
  }
  const wrapper = res.data as { record?: unknown; disabled?: boolean } | null;
  if (!wrapper || typeof wrapper !== "object") return { record: null, disabled: false };
  if (wrapper.disabled) return { record: null, disabled: true };
  const record = normalizeRecord(wrapper.record);
  return {
    record: sanitizePageContentForLocale(record, locale),
    disabled: false,
  };
});
