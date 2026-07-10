import { randomUUID } from "node:crypto";
import { AssetKind, LocaleCode, Prisma, PublishStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminBlogCreateBody,
  AdminBlogUpdateBody,
  AdminBlogQuery,
} from "../../validations/admin-blog.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { sanitizeBlogHtml } from "../../utils/sanitize-html.js";

export class BlogCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "BlogCountryNotFoundError";
  }
}

const adminBlogInclude = {
  country: { select: { id: true, code: true, slug: true, name: true } },
  coverAsset: { select: { id: true, kind: true, key: true, path: true, altText: true } },
  translations: { orderBy: { locale: "asc" as const } },
  countries: {
    include: { country: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.BlogPostInclude;

export type AdminBlogRecord = Prisma.BlogPostGetPayload<{ include: typeof adminBlogInclude }>;

export type ListAdminBlogResult = {
  items: AdminBlogRecord[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new BlogCountryNotFoundError();
}

/**
 * Keep the cover Asset in sync with the form's coverImagePath:
 *   - empty path  → unlink + delete any existing cover asset
 *   - new post    → create an IMAGE asset, return its id
 *   - existing    → update the linked asset's path/alt in place
 */
async function syncCoverAsset(opts: {
  existingCoverAssetId: string | null;
  coverImagePath: string | null;
  coverImageAlt: string | null;
}): Promise<string | null> {
  const { existingCoverAssetId, coverImagePath, coverImageAlt } = opts;
  if (!coverImagePath) {
    if (existingCoverAssetId) {
      await prisma.asset.delete({ where: { id: existingCoverAssetId } }).catch(() => {});
    }
    return null;
  }
  if (existingCoverAssetId) {
    await prisma.asset.update({
      where: { id: existingCoverAssetId },
      data: { path: coverImagePath, altText: coverImageAlt },
    });
    return existingCoverAssetId;
  }
  const asset = await prisma.asset.create({
    data: {
      kind: AssetKind.IMAGE,
      key: `blog-cover/${randomUUID()}`,
      path: coverImagePath,
      altText: coverImageAlt,
    },
  });
  return asset.id;
}

function buildAdminBlogWhere(query: AdminBlogQuery): Prisma.BlogPostWhereInput {
  const where: Prisma.BlogPostWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.locale) where.locale = query.locale;
  if (query.countryId) where.countryId = query.countryId;
  if (query.authorDisplayName) {
    where.authorDisplayName = { contains: query.authorDisplayName, mode: "insensitive" };
  }
  if (query.hasTranslation === true) {
    where.translations = { some: {} };
  } else if (query.hasTranslation === false) {
    where.translations = { none: {} };
  }
  const term = query.search?.trim();
  if (term && term.length > 0) {
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listAdminBlogPosts(query: AdminBlogQuery): Promise<ListAdminBlogResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const where = buildAdminBlogWhere(query);

  try {
    const total = await prisma.blogPost.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const skip = (effectivePage - 1) * pageSize;

    const items = await prisma.blogPost.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ updatedAt: "desc" }],
      include: adminBlogInclude,
    });

    return { items, pagination: { page: effectivePage, pageSize, total, totalPages } };
  } catch (error) {
    throw normalizeDbError(error, "Blog data is unavailable");
  }
}

export async function getAdminBlogPostById(id: string): Promise<AdminBlogRecord | null> {
  try {
    return await prisma.blogPost.findUnique({ where: { id }, include: adminBlogInclude });
  } catch (error) {
    throw normalizeDbError(error, "Blog data is unavailable");
  }
}

/** Published posts publish-dated to now when the editor leaves it blank. */
function resolvePublishedAt(
  status: PublishStatus | undefined,
  publishedAt: Date | null | undefined,
): Date | null {
  if (publishedAt) return publishedAt;
  if (status === PublishStatus.PUBLISHED) return new Date();
  return null;
}

export async function createAdminBlogPost(input: AdminBlogCreateBody): Promise<AdminBlogRecord> {
  if (input.countryId) await assertCountryExists(input.countryId);

  const coverAssetId = await syncCoverAsset({
    existingCoverAssetId: null,
    coverImagePath: input.coverImagePath ?? null,
    coverImageAlt: input.coverImageAlt ?? null,
  });

  try {
    return await prisma.blogPost.create({
      data: {
        slug: input.slug,
        coverAssetId,
        title: input.title,
        excerpt: input.excerpt ?? null,
        // BlogPost.body is NOT NULL — coalesce to "" if the sanitizer
        // strips the input down to nothing.
        body: sanitizeBlogHtml(input.body) ?? "",
        status: input.status ?? PublishStatus.DRAFT,
        locale: input.locale ?? LocaleCode.EN,
        category: input.category ?? null,
        authorDisplayName: input.authorDisplayName ?? null,
        reviewerDisplayName: input.reviewerDisplayName ?? null,
        authorDoctorId: input.authorDoctorId ?? null,
        reviewerDoctorId: input.reviewerDoctorId ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        countryId: input.countryId ?? null,
        publishedAt: resolvePublishedAt(input.status, input.publishedAt ?? null),
        isActive: input.isActive ?? true,
      },
      include: adminBlogInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Blog data is unavailable");
  }
}

export async function updateAdminBlogPost(
  id: string,
  body: AdminBlogUpdateBody,
): Promise<AdminBlogRecord | null> {
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, status: true, publishedAt: true, coverAssetId: true },
  });
  if (!existing) return null;
  if (body.countryId) await assertCountryExists(body.countryId);

  // Cover image: only touched when the form submitted the field. The admin
  // form always sends it, so editing without changing it re-saves the same
  // path (no-op); clearing it (empty) unlinks + deletes the asset.
  let nextCoverAssetId: string | null | undefined;
  if (body.coverImagePath !== undefined) {
    nextCoverAssetId = await syncCoverAsset({
      existingCoverAssetId: existing.coverAssetId,
      coverImagePath: body.coverImagePath ?? null,
      coverImageAlt: body.coverImageAlt ?? null,
    });
  }

  // Stamp publishedAt the first time a post flips to PUBLISHED without one.
  const becomingPublished =
    body.status === PublishStatus.PUBLISHED && !existing.publishedAt && body.publishedAt == null;

  try {
    return await prisma.blogPost.update({
      where: { id },
      data: {
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.excerpt !== undefined && { excerpt: body.excerpt }),
        ...(body.body !== undefined && { body: sanitizeBlogHtml(body.body) ?? "" }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.locale !== undefined && { locale: body.locale }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.authorDisplayName !== undefined && {
          authorDisplayName: body.authorDisplayName,
        }),
        ...(body.reviewerDisplayName !== undefined && {
          reviewerDisplayName: body.reviewerDisplayName,
        }),
        ...(body.authorDoctorId !== undefined && { authorDoctorId: body.authorDoctorId }),
        ...(body.reviewerDoctorId !== undefined && { reviewerDoctorId: body.reviewerDoctorId }),
        ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle }),
        ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription }),
        ...(body.countryId !== undefined && { countryId: body.countryId }),
        ...(body.publishedAt !== undefined && { publishedAt: body.publishedAt }),
        ...(becomingPublished && { publishedAt: new Date() }),
        ...(nextCoverAssetId !== undefined && { coverAssetId: nextCoverAssetId }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.status === PublishStatus.PUBLISHED && { lastReviewedAt: new Date() }),
      },
      include: adminBlogInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Blog data is unavailable");
  }
}

export async function disableAdminBlogPost(id: string): Promise<AdminBlogRecord | null> {
  const existing = await prisma.blogPost.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    return await prisma.blogPost.update({
      where: { id },
      data: { isActive: false, status: PublishStatus.DRAFT },
      include: adminBlogInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Blog data is unavailable");
  }
}

// ── BlogTranslation ───────────────────────────────────────────────────────────

export async function listBlogTranslations(postId: string) {
  try {
    return await prisma.blogTranslation.findMany({
      where: { postId },
      orderBy: { locale: "asc" },
    });
  } catch (error) {
    throw normalizeDbError(error, "Blog translations unavailable");
  }
}

export async function upsertBlogTranslation(
  postId: string,
  locale: string,
  data: {
    title: string;
    slug: string;
    excerpt?: string | null;
    content?: string | null;
    seoTitle?: string | null;
    seoDesc?: string | null;
  },
) {
  try {
    return await prisma.blogTranslation.upsert({
      where: { postId_locale: { postId, locale } },
      create: { postId, locale, ...data },
      update: data,
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not save blog translation");
  }
}

export async function deleteBlogTranslation(postId: string, locale: string): Promise<boolean> {
  const existing = await prisma.blogTranslation.findUnique({
    where: { postId_locale: { postId, locale } },
    select: { id: true },
  });
  if (!existing) return false;
  try {
    await prisma.blogTranslation.delete({ where: { id: existing.id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Could not delete blog translation");
  }
}

// ── BlogPostCountry ───────────────────────────────────────────────────────────

export async function setBlogPostCountries(postId: string, countryIds: string[]): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.blogPostCountry.deleteMany({ where: { postId } });
      if (countryIds.length > 0) {
        await tx.blogPostCountry.createMany({
          data: countryIds.map((countryId) => ({ postId, countryId })),
          skipDuplicates: true,
        });
      }
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not update blog post countries");
  }
}

export async function purgeAdminBlogPost(id: string): Promise<boolean> {
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, coverAssetId: true },
  });
  if (!existing) return false;
  try {
    await prisma.blogPost.delete({ where: { id } });
    // Clean up the dedicated cover asset so it doesn't orphan.
    if (existing.coverAssetId) {
      await prisma.asset.delete({ where: { id: existing.coverAssetId } }).catch(() => {});
    }
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Blog data is unavailable");
  }
}

// ── Public read ──────────────────────────────────────────────────────

/** Named clinician linked as a blog post's author / clinical reviewer.
 *  Carries the council registration so the Article schema can emit a
 *  Physician author/reviewedBy block (the E-E-A-T citation signal). */
export type PublicBlogDoctor = {
  name: string;
  slug: string;
  countryCode: string | null;
  countrySlug: string | null;
  registrationNumber: string | null;
  chamberEntity: string | null;
};

export type PublicBlogPost = {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: string | null;
  author: string | null;
  reviewer: string | null;
  publishedAt: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  authorDoctor: PublicBlogDoctor | null;
  reviewerDoctor: PublicBlogDoctor | null;
};

type BlogDoctorRow = {
  fullName: string;
  slug: string;
  country: { code: string; slug: string } | null;
  additionalCountries: Array<{
    registrationNumber: string | null;
    chamberEntity: string | null;
    country: { code: string };
  }>;
};

/** Flatten a linked doctor, preferring the registration for the doctor's
 *  own primary country, falling back to the first registration on file. */
function toBlogDoctor(row: BlogDoctorRow | null): PublicBlogDoctor | null {
  if (!row) return null;
  const primaryCode = row.country?.code ?? null;
  const reg =
    row.additionalCountries.find((r) => r.country.code === primaryCode) ??
    row.additionalCountries[0] ??
    null;
  return {
    name: row.fullName,
    slug: row.slug,
    countryCode: primaryCode,
    countrySlug: row.country?.slug ?? null,
    registrationNumber: reg?.registrationNumber ?? null,
    chamberEntity: reg?.chamberEntity ?? null,
  };
}

function toPublicBlogPost(row: {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: string | null;
  authorDisplayName: string | null;
  reviewerDisplayName: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  coverAsset: { path: string; altText: string | null } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  authorDoctor: BlogDoctorRow | null;
  reviewerDoctor: BlogDoctorRow | null;
}): PublicBlogPost {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    category: row.category,
    author: row.authorDisplayName,
    reviewer: row.reviewerDisplayName,
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    coverImageUrl: row.coverAsset?.path ?? null,
    coverImageAlt: row.coverAsset?.altText ?? null,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    authorDoctor: toBlogDoctor(row.authorDoctor),
    reviewerDoctor: toBlogDoctor(row.reviewerDoctor),
  };
}

/** Doctor projection for a blog author/reviewer — name, profile slug, and
 *  per-country registrations (so the Article schema can pick the right one). */
const blogDoctorSelect = {
  fullName: true,
  slug: true,
  country: { select: { code: true, slug: true } },
  additionalCountries: {
    where: { active: true, registrationNumber: { not: null } },
    select: {
      registrationNumber: true,
      chamberEntity: true,
      country: { select: { code: true } },
    },
  },
} satisfies Prisma.DoctorSelect;

const publicBlogSelect = {
  slug: true,
  title: true,
  excerpt: true,
  body: true,
  category: true,
  authorDisplayName: true,
  reviewerDisplayName: true,
  publishedAt: true,
  createdAt: true,
  coverAsset: { select: { path: true, altText: true } },
  seoTitle: true,
  seoDescription: true,
  authorDoctor: { select: blogDoctorSelect },
  reviewerDoctor: { select: blogDoctorSelect },
} satisfies Prisma.BlogPostSelect;

// ponytail: hard cap, not full page/pageSize — the public blog index
// currently renders the whole list client-side with no "load older" UI.
// Newest-first order means the cap only ever trims the tail of old
// content, never today's posts.
const PUBLIC_BLOG_LIST_CAP = 300;

export async function getPublicBlogPosts(locale?: LocaleCode): Promise<PublicBlogPost[]> {
  try {
    const rows = await prisma.blogPost.findMany({
      where: {
        status: PublishStatus.PUBLISHED,
        isActive: true,
        ...(locale ? { locale } : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: PUBLIC_BLOG_LIST_CAP,
      select: publicBlogSelect,
    });
    return rows.map(toPublicBlogPost);
  } catch (error) {
    throw normalizeDbError(error, "Blog data is unavailable");
  }
}

export async function getPublicBlogPostBySlug(
  slug: string,
  locale?: LocaleCode,
): Promise<PublicBlogPost | null> {
  try {
    const row = await prisma.blogPost.findFirst({
      where: {
        slug,
        status: PublishStatus.PUBLISHED,
        isActive: true,
        ...(locale ? { locale } : {}),
      },
      orderBy: [{ publishedAt: "desc" }],
      select: publicBlogSelect,
    });
    return row ? toPublicBlogPost(row) : null;
  } catch (error) {
    throw normalizeDbError(error, "Blog data is unavailable");
  }
}
