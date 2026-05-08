import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminBlogPostCreateBody,
  AdminBlogPostsQuery,
  AdminBlogPostUpdateBody,
} from "../../validations/admin-blog-posts.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";

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
        excerpt: input.excerpt ?? null,
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
    select: { id: true },
  });
  if (!existing) return null;

  if (body.countryId) await assertCountryExists(body.countryId);
  if (body.coverAssetId) await assertCoverAssetExists(body.coverAssetId);

  try {
    return await prisma.blogPost.update({
      where: { id },
      data: {
        ...(body.countryId !== undefined && { countryId: body.countryId }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.excerpt !== undefined && { excerpt: body.excerpt }),
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
      },
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
