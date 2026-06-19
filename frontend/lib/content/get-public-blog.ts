import { cache } from "react";
import { apiRequest } from "@/lib/api/client";
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
  seoTitle: string | null;
  seoDescription: string | null;
  reviewer: string | null;
  authorDoctor: BlogDoctor | null;
  reviewerDoctor: BlogDoctor | null;
};

type ApiBlogPost = {
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  body?: unknown;
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

/** Rough reading-time estimate from the HTML body (200 wpm, min 1). */
function readingTimeFromHtml(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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
    category: str(raw.category) || "Health guide",
    author: str(raw.author) || "Global Health Editorial Team",
    publishedAt,
    readingTime: readingTimeFromHtml(body),
    coverImageSrc: coverUrl ? resolveTrustedAssetUrl(coverUrl) ?? coverUrl : null,
    coverImageAlt: str(raw.coverImageAlt) || null,
    seoTitle: str(raw.seoTitle) || null,
    seoDescription: str(raw.seoDescription) || null,
    reviewer: str(raw.reviewer) || null,
    authorDoctor: normalizeBlogDoctor(raw.authorDoctor),
    reviewerDoctor: normalizeBlogDoctor(raw.reviewerDoctor),
  };
}

/** All published, admin-managed posts (newest-first). [] when unavailable. */
const fetchPublishedPosts = cache(async (): Promise<BlogPostFull[]> => {
  const res = await apiRequest<{ posts?: ApiBlogPost[] }>("/api/blog", {
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
export async function listBlogPosts(): Promise<BlogListItem[]> {
  const posts = await fetchPublishedPosts();
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
  }));
}

/** Full post for the detail page; null when the slug is unknown or unavailable.
 *  Fetches the single post directly via /api/blog/:slug so the detail page
 *  has its own Data-Cache entry independent of the all-posts list. */
export async function getBlogPost(slug: string): Promise<BlogPostFull | null> {
  const res = await apiRequest<{ post?: ApiBlogPost }>(`/api/blog/${encodeURIComponent(slug)}`, {
    revalidate: 300,
    tags: [PUBLIC_BLOG_TAG],
  });
  if (!res.ok) {
    // Fall back to the all-posts list (handles the case where the backend
    // supports listing but the single-post endpoint is unavailable).
    const posts = await fetchPublishedPosts();
    return posts.find((p) => p.slug === slug) ?? null;
  }
  return res.data?.post ? normalizeApiPost(res.data.post) : null;
}
