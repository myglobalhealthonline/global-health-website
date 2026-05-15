import { LocaleCode, PageKey, Prisma, PublishStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminPageCreateBody,
  AdminPageUpdateBody,
  AdminPagesQuery,
} from "../../validations/admin-pages.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";

export class PageCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "PageCountryNotFoundError";
  }
}

export class PageLocaleNotSupportedError extends Error {
  constructor(message = "Locale is not enabled for this country") {
    super(message);
    this.name = "PageLocaleNotSupportedError";
  }
}

const adminPageInclude = {
  country: {
    select: { id: true, code: true, slug: true, name: true, defaultLocale: true },
  },
  heroImage: {
    select: { id: true, kind: true, key: true, path: true, altText: true },
  },
  ogImage: {
    select: { id: true, kind: true, key: true, path: true, altText: true },
  },
} satisfies Prisma.ContentPageInclude;

export type AdminPageRecord = Prisma.ContentPageGetPayload<{ include: typeof adminPageInclude }>;

export type ListAdminPagesResult = {
  items: AdminPageRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new PageCountryNotFoundError();
}

async function assertLocaleSupported(countryId: string, locale: LocaleCode): Promise<void> {
  const row = await prisma.countryLocale.findUnique({
    where: { countryId_locale: { countryId, locale } },
    select: { id: true },
  });
  if (!row) {
    const def = await prisma.country.findUnique({
      where: { id: countryId },
      select: { defaultLocale: true },
    });
    if (def?.defaultLocale !== locale) {
      throw new PageLocaleNotSupportedError();
    }
  }
}

function buildAdminPageWhere(query: AdminPagesQuery): Prisma.ContentPageWhereInput {
  const where: Prisma.ContentPageWhereInput = {};
  if (query.countryId) where.countryId = query.countryId;
  if (query.countryCode) where.country = { code: query.countryCode };
  if (query.pageKey) where.pageKey = query.pageKey;
  if (query.locale) where.locale = query.locale;
  if (query.status) where.status = query.status;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  const term = query.search?.trim();
  if (term && term.length > 0) {
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { heroTitle: { contains: term, mode: "insensitive" } },
      { seoTitle: { contains: term, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listAdminPages(query: AdminPagesQuery): Promise<ListAdminPagesResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const where = buildAdminPageWhere(query);

  try {
    const total = await prisma.contentPage.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const skip = (effectivePage - 1) * pageSize;

    const items = await prisma.contentPage.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { country: { name: "asc" } },
        { pageKey: "asc" },
        { locale: "asc" },
      ],
      include: adminPageInclude,
    });

    return {
      items,
      pagination: { page: effectivePage, pageSize, total, totalPages },
    };
  } catch (error) {
    throw normalizeDbError(error, "Pages data is unavailable");
  }
}

export async function getAdminPageById(id: string): Promise<AdminPageRecord | null> {
  try {
    return await prisma.contentPage.findUnique({ where: { id }, include: adminPageInclude });
  } catch (error) {
    throw normalizeDbError(error, "Pages data is unavailable");
  }
}

export async function createAdminPage(input: AdminPageCreateBody): Promise<AdminPageRecord> {
  await assertCountryExists(input.countryId);
  await assertLocaleSupported(input.countryId, input.locale);

  try {
    return await prisma.contentPage.create({
      data: {
        countryId: input.countryId,
        pageKey: input.pageKey,
        locale: input.locale,
        status: input.status ?? PublishStatus.DRAFT,
        title: input.title,
        body: input.body,
        heroTitle: input.heroTitle ?? null,
        heroSubtitle: input.heroSubtitle ?? null,
        heroImageAssetId: input.heroImageAssetId ?? null,
        heroImagePath: input.heroImagePath ?? null,
        ctaLabel: input.ctaLabel ?? null,
        ctaHref: input.ctaHref ?? null,
        ogImageAssetId: input.ogImageAssetId ?? null,
        ogImagePath: input.ogImagePath ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        isActive: input.isActive ?? true,
      },
      include: adminPageInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Pages data is unavailable");
  }
}

export async function updateAdminPage(
  id: string,
  body: AdminPageUpdateBody,
): Promise<AdminPageRecord | null> {
  const existing = await prisma.contentPage.findUnique({
    where: { id },
    select: { id: true, countryId: true, locale: true },
  });
  if (!existing) return null;

  const targetCountryId = body.countryId ?? existing.countryId;
  const targetLocale = body.locale ?? existing.locale;
  if (body.countryId !== undefined || body.locale !== undefined) {
    await assertCountryExists(targetCountryId);
    await assertLocaleSupported(targetCountryId, targetLocale);
  }

  try {
    return await prisma.contentPage.update({
      where: { id },
      data: {
        ...(body.countryId !== undefined && { countryId: body.countryId }),
        ...(body.pageKey !== undefined && { pageKey: body.pageKey }),
        ...(body.locale !== undefined && { locale: body.locale }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.body !== undefined && { body: body.body }),
        ...(body.heroTitle !== undefined && { heroTitle: body.heroTitle }),
        ...(body.heroSubtitle !== undefined && { heroSubtitle: body.heroSubtitle }),
        ...(body.heroImageAssetId !== undefined && { heroImageAssetId: body.heroImageAssetId }),
        ...(body.heroImagePath !== undefined && { heroImagePath: body.heroImagePath }),
        ...(body.ctaLabel !== undefined && { ctaLabel: body.ctaLabel }),
        ...(body.ctaHref !== undefined && { ctaHref: body.ctaHref }),
        ...(body.ogImageAssetId !== undefined && { ogImageAssetId: body.ogImageAssetId }),
        ...(body.ogImagePath !== undefined && { ogImagePath: body.ogImagePath }),
        ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle }),
        ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.status === PublishStatus.PUBLISHED && { lastReviewedAt: new Date() }),
      },
      include: adminPageInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Pages data is unavailable");
  }
}

export async function disableAdminPage(id: string): Promise<AdminPageRecord | null> {
  const existing = await prisma.contentPage.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    return await prisma.contentPage.update({
      where: { id },
      data: { isActive: false, status: PublishStatus.DRAFT },
      include: adminPageInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Pages data is unavailable");
  }
}

export async function purgeAdminPage(id: string): Promise<boolean> {
  const existing = await prisma.contentPage.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  try {
    await prisma.contentPage.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Pages data is unavailable");
  }
}

const publicPageInclude = {
  heroImage: { select: { id: true, kind: true, key: true, path: true, altText: true } },
  ogImage: { select: { id: true, kind: true, key: true, path: true, altText: true } },
} satisfies Prisma.ContentPageInclude;

export type PublicPageRecord = Prisma.ContentPageGetPayload<{ include: typeof publicPageInclude }>;

/**
 * Public read: returns the published ContentPage row for (countryCode, pageKey, locale)
 * with a locale fallback chain — exact locale → country defaultLocale → null.
 */
export async function getPublicPage(
  countryCode: string,
  pageKey: PageKey,
  locale: LocaleCode,
): Promise<PublicPageRecord | null> {
  try {
    const country = await prisma.country.findUnique({
      where: { code: countryCode },
      select: { id: true, defaultLocale: true, isActive: true },
    });
    if (!country || !country.isActive) return null;

    const exact = await prisma.contentPage.findUnique({
      where: { countryId_pageKey_locale: { countryId: country.id, pageKey, locale } },
      include: publicPageInclude,
    });
    if (exact && exact.status === PublishStatus.PUBLISHED && exact.isActive) {
      return exact;
    }

    if (locale !== country.defaultLocale) {
      const fallback = await prisma.contentPage.findUnique({
        where: {
          countryId_pageKey_locale: {
            countryId: country.id,
            pageKey,
            locale: country.defaultLocale,
          },
        },
        include: publicPageInclude,
      });
      if (fallback && fallback.status === PublishStatus.PUBLISHED && fallback.isActive) {
        return fallback;
      }
    }

    return null;
  } catch (error) {
    throw normalizeDbError(error, "Pages data is unavailable");
  }
}
