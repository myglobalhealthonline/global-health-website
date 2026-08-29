import { cache } from "react";
import { apiRequest } from "@/lib/api/client";
import { BLOG_AUTHOR_NAME } from "@/lib/content/blog-byline";
import { logPublicContentFallback } from "@/lib/content/public-content-source";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";

/** Cache tag for public blog reads — busted by admin create/edit/delete. */
export const PUBLIC_BLOG_TAG = "public-blog";

export type BlogListItem = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  publishedAt: string;
  readingTime: number;
  coverImageSrc: string | null;
  coverImageAlt: string | null;
  /** Countries this post is scoped to. Empty = global (shown everywhere). */
  countries: Array<{ code: string; slug: string }>;
  /** The locale this row was served in (raw Prisma enum casing, e.g. "PT").
   *  Equals the post's authored locale unless a BlogTranslation for the
   *  requested locale was served in its place. */
  locale: string;
  /** Every locale this post is published in, each with that locale's own
   *  slug — the authored locale first, then one entry per translation.
   *  sitemap.ts emits one URL per entry. */
  localeVariants: Array<{ locale: string; slug: string }>;
};

/** Named clinician linked as a post's author / clinical reviewer. */
export type BlogDoctor = {
  name: string;
  slug: string;
  countryCode: string | null;
  countrySlug: string | null;
  registrationNumber: string | null;
  chamberEntity: string | null;
};

export type BlogPostFull = BlogListItem & {
  body: string;
  /** The language the post's own title/excerpt/body are written in (admin
   *  "Language" field) — drives which locale bundle the detail page's UI
   *  chrome (CTA, "min read", date format) renders in, not the visitor's
   *  browsing locale. Raw Prisma enum casing (e.g. "PT"); normalize before use. */
  locale: string;
  seoTitle: string | null;
  seoDescription: string | null;
  reviewer: string | null;
  authorDoctor: BlogDoctor | null;
  reviewerDoctor: BlogDoctor | null;
  ctaService: { slug: string; name: string; countrySlug: string } | null;
  lastReviewedAt: string | null;
};

type ApiBlogPost = {
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  body?: unknown;
  locale?: unknown;
  countries?: unknown;
  localeVariants?: unknown;
  category?: unknown;
  author?: unknown;
  reviewer?: unknown;
  publishedAt?: unknown;
  coverImageUrl?: unknown;
  coverImageAlt?: unknown;
  seoTitle?: unknown;
  seoDescription?: unknown;
  authorDoctor?: unknown;
  reviewerDoctor?: unknown;
  ctaService?: unknown;
  lastReviewedAt?: unknown;
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function normalizeBlogDoctor(raw: unknown): BlogDoctor | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name);
  const slug = str(r.slug);
  if (!name || !slug) return null;
  return {
    name,
    slug,
    countryCode: str(r.countryCode) || null,
    countrySlug: str(r.countrySlug) || null,
    registrationNumber: str(r.registrationNumber) || null,
    chamberEntity: str(r.chamberEntity) || null,
  };
}

function normalizeCtaService(raw: unknown): { slug: string; name: string; countrySlug: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const slug = str(r.slug);
  const name = str(r.name);
  const countrySlug = str(r.countrySlug);
  if (!slug || !name || !countrySlug) return null;
  return { slug, name, countrySlug };
}

function normalizeLocaleVariants(raw: unknown, fallback: { locale: string; slug: string }): Array<{ locale: string; slug: string }> {
  if (!Array.isArray(raw)) return [fallback];
  const out = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const r = entry as Record<string, unknown>;
      const locale = str(r.locale).toUpperCase();
      const slug = str(r.slug);
      return locale && slug ? { locale, slug } : null;
    })
    .filter((v): v is { locale: string; slug: string } => v !== null);
  return out.length > 0 ? out : [fallback];
}

function normalizeCountries(raw: unknown): Array<{ code: string; slug: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const r = entry as Record<string, unknown>;
      const code = str(r.code);
      const slug = str(r.slug);
      return code && slug ? { code, slug } : null;
    })
    .filter((c): c is { code: string; slug: string } => c !== null);
}

/** Rough reading-time estimate from the HTML body (200 wpm, min 1). */
export function readingTimeFromHtml(html: string): number {
  const text = html
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function normalizeApiPost(raw: ApiBlogPost): BlogPostFull | null {
  const slug = str(raw.slug);
  const title = str(raw.title);
  const body = str(raw.body);
  if (!slug || !title) return null;
  const publishedAt = str(raw.publishedAt) || new Date(0).toISOString();
  const coverUrl = str(raw.coverImageUrl);
  return {
    slug,
    title,
    excerpt: str(raw.excerpt),
    body,
    locale: str(raw.locale) || "EN",
    localeVariants: normalizeLocaleVariants(raw.localeVariants, {
      locale: str(raw.locale) || "EN",
      slug,
    }),
    countries: normalizeCountries(raw.countries),
    category: str(raw.category) || "Health guide",
    author: str(raw.author) || BLOG_AUTHOR_NAME,
    publishedAt,
    readingTime: readingTimeFromHtml(body),
    coverImageSrc: coverUrl ? resolveTrustedAssetUrl(coverUrl) ?? coverUrl : null,
    coverImageAlt: str(raw.coverImageAlt) || null,
    seoTitle: str(raw.seoTitle) || null,
    seoDescription: str(raw.seoDescription) || null,
    reviewer: str(raw.reviewer) || null,
    authorDoctor: normalizeBlogDoctor(raw.authorDoctor),
    reviewerDoctor: normalizeBlogDoctor(raw.reviewerDoctor),
    ctaService: normalizeCtaService(raw.ctaService),
    lastReviewedAt: str(raw.lastReviewedAt) || null,
  };
}

/** All published, admin-managed posts (newest-first). [] when unavailable.
 *  No countryCode = global posts only (see blog.service.ts's
 *  countryVisibilityWhere) — the bare, no-country-context /blog route. */
const fetchPublishedPosts = cache(async (countryCode?: string, locale?: string): Promise<BlogPostFull[]> => {
  const params = new URLSearchParams();
  if (countryCode) params.set("countryCode", countryCode);
  if (locale) params.set("locale", locale.toUpperCase());
  const qs = params.size > 0 ? `?${params.toString()}` : "";
  const res = await apiRequest<{ posts?: ApiBlogPost[] }>(`/api/blog${qs}`, {
    revalidate: 60,
    tags: [PUBLIC_BLOG_TAG],
  });
  if (!res.ok) {
    logPublicContentFallback("blog:list", res.message);
    return [];
  }
  const posts = Array.isArray(res.data?.posts) ? res.data.posts : [];
  return posts.map(normalizeApiPost).filter((p): p is BlogPostFull => p !== null);
});

/** Card list for the blog index. */
export async function listBlogPosts(countryCode?: string, locale?: string): Promise<BlogListItem[]> {
  const posts = await fetchPublishedPosts(countryCode, locale);
  return posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    author: p.author,
    publishedAt: p.publishedAt,
    readingTime: p.readingTime,
    coverImageSrc: p.coverImageSrc,
    coverImageAlt: p.coverImageAlt,
    countries: p.countries,
    locale: p.locale,
    localeVariants: p.localeVariants,
  }));
}

/** A blog link-back rendered on a service or lab-test page. `slug` is already
 *  the requested locale's own slug (the API swaps it), so the href is
 *  `/{country}/{lang}/blog/{slug}` with no further mapping. */
export type RelatedBlogLink = { slug: string; title: string; excerpt: string };

/**
 * Published posts to link back to from a commercial page. The articles link
 * DOWN to their market's service page, `/doctors` and `/contact`; without this
 * nothing links back UP into them, so a new article's only inbound link is the
 * sitemap.
 *
 * With `serviceSlug` this is an exact match on the post's CTA service — the
 * article that was written for THIS page. Without it (the lab-test hub, which
 * is not a Service), it is the market's newest posts.
 */
export async function listRelatedBlogPosts(
  countryCode: string,
  locale: string,
  opts: { serviceSlug?: string; limit?: number } = {},
): Promise<RelatedBlogLink[]> {
  const posts = await fetchPublishedPosts(countryCode, locale);
  const matched = opts.serviceSlug
    ? posts.filter((p) => p.ctaService?.slug === opts.serviceSlug)
    : posts;
  return matched
    .slice(0, opts.limit ?? 3)
    .map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt }));
}

/** Full post for the detail page; null when the slug is unknown or unavailable.
 *  Fetches the single post directly via /api/blog/:slug so the detail page
 *  has its own Data-Cache entry independent of the all-posts list. A
 *  country-scoped route passes `countryCode` to gate visibility; the bare
 *  route omits it to fetch the post regardless of country assignment (it
 *  needs `post.countries` to decide whether to redirect). */
export async function getBlogPost(slug: string, countryCode?: string, locale?: string): Promise<BlogPostFull | null> {
  const params = new URLSearchParams();
  if (countryCode) params.set("countryCode", countryCode);
  if (locale) params.set("locale", locale.toUpperCase());
  const qs = params.size > 0 ? `?${params.toString()}` : "";
  const res = await apiRequest<{ post?: ApiBlogPost }>(`/api/blog/${encodeURIComponent(slug)}${qs}`, {
    revalidate: 300,
    tags: [PUBLIC_BLOG_TAG],
  });
  if (!res.ok) {
    // Fall back to the all-posts list (handles the case where the backend
    // supports listing but the single-post endpoint is unavailable).
    const posts = await fetchPublishedPosts(countryCode, locale);
    return posts.find((p) => p.slug === slug || p.localeVariants.some((v) => v.slug === slug)) ?? null;
  }
  return res.data?.post ? normalizeApiPost(res.data.post) : null;
}
