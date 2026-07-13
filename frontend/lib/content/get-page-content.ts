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
};

export type PublicPageContent = {
  record: PublicPageContentRecord | null;
  disabled: boolean;
};

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
  return { record: normalizeRecord(wrapper.record), disabled: false };
});
