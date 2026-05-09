import { Prisma, PublishStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminBlogPostCreateBody,
  AdminBlogPostsQuery,
  AdminBlogPostUpdateBody,
} from "../../validations/admin-blog-posts.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { deriveBlogExcerpt } from "./blog-publication-helpers.js";

export class BlogCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "BlogCountryNotFoundError";
  }
}

export class BlogCoverAssetInvalidError extends Error {
  constructor() {
    super("coverAssetId not found");
    this.name = "BlogCoverAssetInvalidError";
  }
}

const adminBlogPostInclude = {
  country: { select: { id: true, code: true, name: true } },
  coverAsset: { select: { id: true, kind: true, key: true, path: true } },
} satisfies Prisma.BlogPostInclude;

export type AdminBlogPostRecord = Prisma.BlogPostGetPayload<{ include: typeof adminBlogPostInclude }>;

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ListAdminBlogPostsResult = {
  items: AdminBlogPostRecord[];
  pagination: Pagination;
};

const publicBlogPostInclude = {
  country: { select: { id: true, code: true, name: true } },
} satisfies Prisma.BlogPostInclude;

export type PublicBlogPostRecord = Prisma.BlogPostGetPayload<{ include: typeof publicBlogPostInclude }>;

function readReadyToIndex(editorialChecklist: unknown): boolean {
  if (!editorialChecklist || typeof editorialChecklist !== "object" || Array.isArray(editorialChecklist)) return false;
  return (editorialChecklist as { readyToIndex?: unknown }).readyToIndex === true;
}

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new BlogCountryNotFoundError();
}

async function assertCoverAssetExists(coverAssetId: string): Promise<void> {
  const row = await prisma.asset.findUnique({ where: { id: coverAssetId }, select: { id: true } });
  if (!row) throw new BlogCoverAssetInvalidError();
}

function buildWhere(query: AdminBlogPostsQuery): Prisma.BlogPostWhereInput {
  const where: Prisma.BlogPostWhereInput = {};
  if (query.locale) where.locale = query.locale;
  if (query.countryId) where.countryId = query.countryId;
  if (query.status) where.status = query.status;
  if (query.isActive !== undefined) where.isActive = query.isActive;

  const term = query.search?.trim();
  if (term) {
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { excerpt: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
      { authorDisplayName: { contains: term, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listAdminBlogPosts(query: AdminBlogPostsQuery): Promise<ListAdminBlogPostsResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const where = buildWhere(query);
  try {
    const total = await prisma.blogPost.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const skip = (effectivePage - 1) * pageSize;
    const items = await prisma.blogPost.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: adminBlogPostInclude,
    });
    return { items, pagination: { page: effectivePage, pageSize, total, totalPages } };
  } catch (error) {
    throw normalizeDbError(error, "Blog posts data is unavailable");
  }
}

export async function getAdminBlogPostById(id: string): Promise<AdminBlogPostRecord | null> {
  try {
    return await prisma.blogPost.findUnique({
      where: { id },
      include: adminBlogPostInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Blog posts data is unavailable");
  }
}

export async function createAdminBlogPost(input: AdminBlogPostCreateBody): Promise<AdminBlogPostRecord> {
  if (input.countryId) await assertCountryExists(input.countryId);
  if (input.coverAssetId) await assertCoverAssetExists(input.coverAssetId);

  try {
    return await prisma.blogPost.create({
      data: {
        countryId: input.countryId ?? null,
        slug: input.slug,
        title: input.title,
        excerpt:
          input.status === PublishStatus.PUBLISHED
            ? deriveBlogExcerpt(input.excerpt, input.body)
            : input.excerpt ?? null,
        body: input.body,
        status: input.status,
        locale: input.locale,
        category: input.category ?? null,
        authorDisplayName: input.authorDisplayName ?? null,
        coverAssetId: input.coverAssetId ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        publishedAt: input.publishedAt ?? null,
        isActive: input.isActive ?? true,
        ...(input.status === PublishStatus.PUBLISHED
          ? {
              reviewerDisplayName:
                input.reviewerDisplayName?.trim() ||
                input.authorDisplayName?.trim() ||
                "Global Health",
              lastReviewedAt: input.publishedAt ?? new Date(),
              editorialChecklist: { readyToIndex: true } as Prisma.InputJsonValue,
            }
          : {}),
      },
      include: adminBlogPostInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Blog posts data is unavailable");
  }
}

export async function updateAdminBlogPost(
  id: string,
  body: AdminBlogPostUpdateBody,
): Promise<AdminBlogPostRecord | null> {
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: {
      id: true,
      excerpt: true,
      body: true,
      authorDisplayName: true,
      reviewerDisplayName: true,
      publishedAt: true,
      lastReviewedAt: true,
      status: true,
    },
  });
  if (!existing) return null;

  if (body.countryId) await assertCountryExists(body.countryId);
  if (body.coverAssetId) await assertCoverAssetExists(body.coverAssetId);

  const nextStatus = body.status ?? existing.status;
  const nextBody = body.body !== undefined ? body.body : existing.body;
  const nextExcerptSource = body.excerpt !== undefined ? body.excerpt : existing.excerpt;
  const nextAuthor = body.authorDisplayName !== undefined ? body.authorDisplayName : existing.authorDisplayName;
  const nextPublishedAt = body.publishedAt !== undefined ? body.publishedAt : existing.publishedAt;
  const nextReviewerSource =
    body.reviewerDisplayName !== undefined ? body.reviewerDisplayName : existing.reviewerDisplayName;

  try {
    const data: Prisma.BlogPostUpdateInput = {
      ...(body.countryId !== undefined && { countryId: body.countryId }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.locale !== undefined && { locale: body.locale }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.authorDisplayName !== undefined && { authorDisplayName: body.authorDisplayName }),
      ...(body.coverAssetId !== undefined && { coverAssetId: body.coverAssetId }),
      ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle }),
      ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription }),
      ...(body.publishedAt !== undefined && { publishedAt: body.publishedAt }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    };

    if (body.excerpt !== undefined) {
      data.excerpt = body.excerpt;
    }

    if (nextStatus === PublishStatus.PUBLISHED) {
      data.excerpt = deriveBlogExcerpt(
        nextExcerptSource === null ? undefined : nextExcerptSource,
        nextBody,
      );
      const reviewer =
        (typeof nextReviewerSource === "string" ? nextReviewerSource.trim() : "") ||
        (nextAuthor?.trim() ?? "") ||
        "Global Health";
      data.reviewerDisplayName = reviewer;
      data.lastReviewedAt = nextPublishedAt ?? existing.lastReviewedAt ?? new Date();
      data.editorialChecklist = { readyToIndex: true } as Prisma.InputJsonValue;
    } else if (body.status === PublishStatus.DRAFT) {
      data.editorialChecklist = Prisma.JsonNull;
      data.lastReviewedAt = null;
      data.reviewerDisplayName = null;
    }

    return await prisma.blogPost.update({
      where: { id },
      data,
      include: adminBlogPostInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Blog posts data is unavailable");
  }
}

export async function disableAdminBlogPost(id: string): Promise<AdminBlogPostRecord | null> {
  const existing = await prisma.blogPost.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    return await prisma.blogPost.update({
      where: { id },
      data: { isActive: false },
      include: adminBlogPostInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Blog posts data is unavailable");
  }
}

export async function purgeAdminBlogPost(id: string): Promise<boolean> {
  const existing = await prisma.blogPost.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  try {
    await prisma.blogPost.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Blog posts data is unavailable");
  }
}

export async function listPublicBlogPosts(): Promise<PublicBlogPostRecord[]> {
  try {
    const rows = await prisma.blogPost.findMany({
      where: {
        isActive: true,
        status: "PUBLISHED",
        reviewerDisplayName: { not: null },
        lastReviewedAt: { not: null },
      },
      orderBy: [{ lastReviewedAt: "desc" }, { updatedAt: "desc" }],
      include: publicBlogPostInclude,
    });
    return rows.filter((row) => readReadyToIndex(row.editorialChecklist));
  } catch (error) {
    throw normalizeDbError(error, "Public blog posts data is unavailable");
  }
}
