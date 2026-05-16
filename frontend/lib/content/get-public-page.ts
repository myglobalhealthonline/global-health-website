import { cache } from "react";
import { fetchPublicPage } from "@/lib/api/site-content-api";
import { logPublicContentFallback } from "@/lib/content/public-content-source";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { supportedLocaleCodes, type LocaleCode } from "@/lib/i18n/types";

export type PublicPageKey =
  | "HOME"
  | "DOCTORS_INDEX"
  | "GENERAL_CONSULTATION"
  | "SPECIALIST_CONSULTATION";

/**
 * Public locale alias = the same LocaleCode union from `lib/i18n/types`.
 * Adding a new locale = add it to `supportedLocaleCodes` (and the Prisma
 * `LocaleCode` enum) — no edits required here.
 */
export type PublicLocale = LocaleCode;

const SUPPORTED_LOCALE_SET = new Set<string>(supportedLocaleCodes);

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
  /** Linked Asset (when the admin picked from the asset library). */
  heroImage: PublicPageImage | null;
  ogImage: PublicPageImage | null;
  /** Inline path stored on the ContentPage row when the admin uploaded
   *  directly into the page editor (the common path). */
  heroImagePath: string | null;
  ogImagePath: string | null;
  /** Pre-resolved absolute URL for the hero image (asset.src OR resolved path).
   *  Use this in the renderer. */
  heroImageSrc: string | null;
  ogImageSrc: string | null;
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

  const heroImage = readImage(r.heroImage);
  const ogImage = readImage(r.ogImage);
  const heroImagePath = typeof r.heroImagePath === "string" ? r.heroImagePath : null;
  const ogImagePath = typeof r.ogImagePath === "string" ? r.ogImagePath : null;

  // Prefer linked Asset URL when present, otherwise resolve the inline path
  // saved by the admin form (heroImagePath / ogImagePath). Either path
  // produces an absolute URL that the renderer can drop into <img src>.
  const heroImageSrc =
    heroImage?.src ?? (heroImagePath ? resolveTrustedAssetUrl(heroImagePath) ?? null : null);
  const ogImageSrc =
    ogImage?.src ?? (ogImagePath ? resolveTrustedAssetUrl(ogImagePath) ?? null : null);

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
    heroImage,
    ogImage,
    heroImagePath,
    ogImagePath,
    heroImageSrc,
    ogImageSrc,
  };
}

export function isSupportedLocale(value: string): value is PublicLocale {
  return SUPPORTED_LOCALE_SET.has(value);
}

export const getPublicPage = cache(async (
  countryCode: string,
  pageKey: PublicPageKey,
  locale: PublicLocale,
): Promise<PublicPageRecord | null> => {
  // Backend uses the uppercase Prisma `LocaleCode` enum values.
  const backendLocale = locale.toUpperCase();
  const res = await fetchPublicPage(countryCode, pageKey, backendLocale);
  if (!res.ok) {
    logPublicContentFallback(`page:${countryCode}:${pageKey}:${locale}`, res.message);
    return null;
  }
  const wrapper = res.data as { page?: unknown } | null;
  if (!wrapper || typeof wrapper !== "object") return null;
  return normalizePage(wrapper.page);
});
