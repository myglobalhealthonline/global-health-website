import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminContentPageCreateBody,
  AdminContentPagesQuery,
  AdminContentPageUpdateBody,
} from "../../validations/admin-content-pages.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";

export class ContentPageCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "ContentPageCountryNotFoundError";
  }
}

const adminContentPageInclude = {
  country: { select: { id: true, code: true, name: true } },
} satisfies Prisma.ContentPageInclude;

export type AdminContentPageRecord = Prisma.ContentPageGetPayload<{ include: typeof adminContentPageInclude }>;

export type ListAdminContentPagesResult = {
  items: AdminContentPageRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new ContentPageCountryNotFoundError();
}

function buildWhere(query: AdminContentPagesQuery): Prisma.ContentPageWhereInput {
  const where: Prisma.ContentPageWhereInput = {};
  if (query.locale) where.locale = query.locale;
  if (query.countryId) where.countryId = query.countryId;
  if (query.status) where.status = query.status;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  const term = query.search?.trim();
  if (term) {
    where.OR = [
      { pageKey: { contains: term, mode: "insensitive" } },
      { title: { contains: term, mode: "insensitive" } },
      { seoTitle: { contains: term, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listAdminContentPages(
  query: AdminContentPagesQuery,
): Promise<ListAdminContentPagesResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const where = buildWhere(query);
  try {
    const total = await prisma.contentPage.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const skip = (effectivePage - 1) * pageSize;
    const items = await prisma.contentPage.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ pageKey: "asc" }, { locale: "asc" }],
      include: adminContentPageInclude,
    });
    return { items, pagination: { page: effectivePage, pageSize, total, totalPages } };
  } catch (error) {
    throw normalizeDbError(error, "Content pages data is unavailable");
  }
}

export async function getAdminContentPageById(id: string): Promise<AdminContentPageRecord | null> {
  try {
    return await prisma.contentPage.findUnique({ where: { id }, include: adminContentPageInclude });
  } catch (error) {
    throw normalizeDbError(error, "Content pages data is unavailable");
  }
}

export async function createAdminContentPage(
  input: AdminContentPageCreateBody,
): Promise<AdminContentPageRecord> {
  if (input.countryId) await assertCountryExists(input.countryId);
  try {
    return await prisma.contentPage.create({
      data: {
        countryId: input.countryId ?? null,
        pageKey: input.pageKey,
        title: input.title,
        body: input.body,
        locale: input.locale,
        status: input.status,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        lastReviewedAt: input.lastReviewedAt ?? null,
        isActive: input.isActive ?? true,
      },
      include: adminContentPageInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Content pages data is unavailable");
  }
}

export async function updateAdminContentPage(
  id: string,
  body: AdminContentPageUpdateBody,
): Promise<AdminContentPageRecord | null> {
  const existing = await prisma.contentPage.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  if (body.countryId) await assertCountryExists(body.countryId);

  try {
    return await prisma.contentPage.update({
      where: { id },
      data: {
        ...(body.countryId !== undefined && { countryId: body.countryId }),
        ...(body.pageKey !== undefined && { pageKey: body.pageKey }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.body !== undefined && { body: body.body }),
        ...(body.locale !== undefined && { locale: body.locale }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle }),
        ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription }),
        ...(body.lastReviewedAt !== undefined && { lastReviewedAt: body.lastReviewedAt }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: adminContentPageInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Content pages data is unavailable");
  }
}

export async function disableAdminContentPage(id: string): Promise<AdminContentPageRecord | null> {
  const existing = await prisma.contentPage.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    return await prisma.contentPage.update({
      where: { id },
      data: { isActive: false },
      include: adminContentPageInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Content pages data is unavailable");
  }
}

export async function purgeAdminContentPage(id: string): Promise<boolean> {
  const existing = await prisma.contentPage.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  try {
    await prisma.contentPage.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Content pages data is unavailable");
  }
}
