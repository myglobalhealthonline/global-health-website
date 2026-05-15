import { cache } from "react";
import { fetchPublicPage } from "@/lib/api/site-content-api";
import { logPublicContentFallback } from "@/lib/content/public-content-source";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";

export type PublicPageKey =
  | "HOME"
  | "DOCTORS_INDEX"
  | "GENERAL_CONSULTATION"
  | "SPECIALIST_CONSULTATION";

export type PublicLocale = "en" | "pt" | "es" | "cs" | "ro" | "de";

const LOCALE_TO_BACKEND: Record<PublicLocale, string> = {
  en: "EN",
  pt: "PT",
  es: "ES",
  cs: "CS",
  ro: "RO",
  de: "DE",
};

export type PublicPageImage = {
  id: string;
  path: string;
  src?: string;
  altText: string | null;
};

export type PublicPageRecord = {
  id: string;
  countryId: string;
  pageKey: PublicPageKey;
  locale: string;
  status: "DRAFT" | "PUBLISHED";
  title: string;
  body: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroImage: PublicPageImage | null;
  ogImage: PublicPageImage | null;
};

function isPageKey(v: unknown): v is PublicPageKey {
  return v === "HOME" || v === "DOCTORS_INDEX" || v === "GENERAL_CONSULTATION" || v === "SPECIALIST_CONSULTATION";
}

function readImage(raw: unknown): PublicPageImage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const path = typeof r.path === "string" ? r.path : null;
  if (!id || !path) return null;
  const altText = typeof r.altText === "string" ? r.altText : null;
  const src = resolveTrustedAssetUrl(path) ?? undefined;
  return { id, path, src, altText };
}

function normalizePage(raw: unknown): PublicPageRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (typeof r.countryId !== "string") return null;
  if (!isPageKey(r.pageKey)) return null;
  if (typeof r.locale !== "string") return null;
  if (typeof r.title !== "string") return null;
  const status = r.status === "PUBLISHED" || r.status === "DRAFT" ? r.status : "DRAFT";
  return {
    id: r.id,
    countryId: r.countryId,
    pageKey: r.pageKey,
    locale: r.locale,
    status,
    title: r.title,
    body: typeof r.body === "string" ? r.body : "",
    heroTitle: typeof r.heroTitle === "string" ? r.heroTitle : null,
    heroSubtitle: typeof r.heroSubtitle === "string" ? r.heroSubtitle : null,
    ctaLabel: typeof r.ctaLabel === "string" ? r.ctaLabel : null,
    ctaHref: typeof r.ctaHref === "string" ? r.ctaHref : null,
    seoTitle: typeof r.seoTitle === "string" ? r.seoTitle : null,
    seoDescription: typeof r.seoDescription === "string" ? r.seoDescription : null,
    heroImage: readImage(r.heroImage),
    ogImage: readImage(r.ogImage),
  };
}

export function isSupportedLocale(value: string): value is PublicLocale {
  return value in LOCALE_TO_BACKEND;
}

export const getPublicPage = cache(async (
  countryCode: string,
  pageKey: PublicPageKey,
  locale: PublicLocale,
): Promise<PublicPageRecord | null> => {
  const backendLocale = LOCALE_TO_BACKEND[locale];
  const res = await fetchPublicPage(countryCode, pageKey, backendLocale);
  if (!res.ok) {
    logPublicContentFallback(`page:${countryCode}:${pageKey}:${locale}`, res.message);
    return null;
  }
  const wrapper = res.data as { page?: unknown } | null;
  if (!wrapper || typeof wrapper !== "object") return null;
  return normalizePage(wrapper.page);
});
