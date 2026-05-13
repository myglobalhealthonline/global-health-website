import { cache } from "react";
import { fetchBlogPosts } from "@/lib/api/site-content-api";
import { pickSafeAssetPath } from "@/lib/content/get-public-assets";
import { validateAdminBlogPayload } from "@/lib/content/publication-validation";
import { logPublicContentFallback } from "@/lib/content/public-content-source";

export type PublicBlogPostRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  contentFormat: "html" | "text";
  category: string;
  authorDisplayName: string;
  reviewerDisplayName: string;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  lastReviewedAt: string;
  updatedAt: string;
  editorialChecklist: Record<string, unknown> | null;
  coverImageSrc: string | null;
  coverImageAlt: string | null;
};

function detectBlogContentFormat(body: string): "html" | "text" {
  const trimmedBody = body.trim();
  if (!trimmedBody) return "text";

  // Detect likely rich HTML content while preserving support for plain text bodies.
  return /<\/?[a-z][\s\S]*>/i.test(trimmedBody) ? "html" : "text";
}

function readReadyToIndex(editorialChecklist: unknown): boolean {
  if (!editorialChecklist || typeof editorialChecklist !== "object" || Array.isArray(editorialChecklist)) return false;
  return (editorialChecklist as { readyToIndex?: unknown }).readyToIndex === true;
}

function normalizeBlogPost(row: unknown): PublicBlogPostRecord | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;

  const id = typeof r.id === "string" ? r.id : null;
  const slug = typeof r.slug === "string" ? r.slug : null;
  const title = typeof r.title === "string" ? r.title : null;
  const excerpt = typeof r.excerpt === "string" ? r.excerpt : null;
  const body = typeof r.body === "string" ? r.body : null;
  const category = typeof r.category === "string" ? r.category : null;
  const authorDisplayName = typeof r.authorDisplayName === "string" ? r.authorDisplayName : null;
  const reviewerDisplayName = typeof r.reviewerDisplayName === "string" ? r.reviewerDisplayName : null;
  const lastReviewedAt = typeof r.lastReviewedAt === "string" ? r.lastReviewedAt : null;
  const updatedAt = typeof r.updatedAt === "string" ? r.updatedAt : null;
  const editorialChecklist =
    r.editorialChecklist && typeof r.editorialChecklist === "object"
      ? (r.editorialChecklist as Record<string, unknown>)
      : null;

  if (
    !id ||
    !slug ||
    !title ||
    !excerpt ||
    !body ||
    !category ||
    !authorDisplayName ||
    !reviewerDisplayName ||
    !lastReviewedAt ||
    !updatedAt ||
    !readReadyToIndex(editorialChecklist)
  ) {
    return null;
  }

  const validation = validateAdminBlogPayload({
    title,
    excerpt,
    body,
    seoTitle: typeof r.seoTitle === "string" ? r.seoTitle : null,
    seoDescription: typeof r.seoDescription === "string" ? r.seoDescription : null,
    authorDisplayName,
    updatedAt: lastReviewedAt,
    category,
    status: "PUBLISHED",
  });

  if (validation.shouldNoindex) return null;

  let coverImageSrc: string | null = null;
  let coverImageAlt: string | null = null;
  const coverRaw = r.coverAsset;
  if (coverRaw && typeof coverRaw === "object" && !Array.isArray(coverRaw)) {
    const cover = coverRaw as Record<string, unknown>;
    const coverPath = typeof cover.path === "string" ? cover.path : null;
    if (coverPath) {
      const safe = pickSafeAssetPath(coverPath);
      if (safe) coverImageSrc = safe;
    }
    const alt = cover.altText;
    if (typeof alt === "string" && alt.trim()) coverImageAlt = alt.trim();
  }

  return {
    id,
    slug,
    title,
    excerpt,
    body,
    contentFormat: detectBlogContentFormat(body),
    category,
    authorDisplayName,
    reviewerDisplayName,
    seoTitle: typeof r.seoTitle === "string" ? r.seoTitle : null,
    seoDescription: typeof r.seoDescription === "string" ? r.seoDescription : null,
    publishedAt: typeof r.publishedAt === "string" ? r.publishedAt : null,
    lastReviewedAt,
    updatedAt,
    editorialChecklist,
    coverImageSrc,
    coverImageAlt,
  };
}

export const getApprovedPublicBlogPosts = cache(async (): Promise<PublicBlogPostRecord[]> => {
  const res = await fetchBlogPosts();
  if (!res.ok) {
    logPublicContentFallback("blog-posts", res.message);
    return [];
  }

  const seenSlugs = new Set<string>();
  const posts: PublicBlogPostRecord[] = [];
  for (const row of res.data) {
    const normalized = normalizeBlogPost(row);
    if (!normalized) continue;
    // Guard against duplicate slugs across locales/countries on a slug-only public route.
    if (seenSlugs.has(normalized.slug)) continue;
    seenSlugs.add(normalized.slug);
    posts.push(normalized);
  }
  return posts;
});

export async function getApprovedPublicBlogPostBySlug(slug: string): Promise<PublicBlogPostRecord | null> {
  const posts = await getApprovedPublicBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export function splitBlogBodyToParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
}

