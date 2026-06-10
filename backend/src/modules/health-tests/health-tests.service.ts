import { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminHealthTestCreateBody,
  AdminHealthTestsQuery,
  AdminHealthTestUpdateBody,
  HealthTestTranslationInput,
} from "../../validations/admin-health-tests.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { resolveTranslation } from "../shared/resolve-translation.js";
import { assertLocaleSupported } from "../shared/locale-support.js";

/** Scalar display fields a HealthTestTranslation overrides. Array/JSON
 *  fields stay on the base row for now (no public detail page yet). */
const healthTestTranslationSelect = {
  locale: true,
  title: true,
  shortDescription: true,
  sampleType: true,
  resultsTimeline: true,
  heroButtonLabel: true,
  detailIntro: true,
  seoTitle: true,
  seoDescription: true,
} satisfies Prisma.HealthTestTranslationSelect;

type HealthTestDisplayBase = {
  title: string;
  shortDescription: string | null;
  sampleType: string | null;
  resultsTimeline: string | null;
  heroButtonLabel: string | null;
  detailIntro: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type HealthTestTranslationRow = HealthTestDisplayBase & { locale: LocaleCode };

function mergeHealthTestTranslation<
  S extends HealthTestDisplayBase & { translations: HealthTestTranslationRow[] },
>(test: S, requested: LocaleCode, defaultLocale: LocaleCode): Omit<S, "translations"> & {
  resolvedLocale: LocaleCode;
} {
  const { tr, resolvedLocale } = resolveTranslation(test.translations, requested, defaultLocale);
  const { translations: _translations, ...rest } = test;
  return {
    ...rest,
    title: tr?.title ?? test.title,
    shortDescription: tr?.shortDescription ?? test.shortDescription,
    sampleType: tr?.sampleType ?? test.sampleType,
    resultsTimeline: tr?.resultsTimeline ?? test.resultsTimeline,
    heroButtonLabel: tr?.heroButtonLabel ?? test.heroButtonLabel,
    detailIntro: tr?.detailIntro ?? test.detailIntro,
    seoTitle: tr?.seoTitle ?? test.seoTitle,
    seoDescription: tr?.seoDescription ?? test.seoDescription,
    resolvedLocale,
  };
}

/** Upsert one HealthTestTranslation row per entry, keyed (healthTestId, locale). */
async function upsertHealthTestTranslations(
  healthTestId: string,
  countryId: string,
  translations: HealthTestTranslationInput[],
): Promise<void> {
  // Validate locales in parallel, then write all rows in one atomic
  // transaction (was a sequential per-locale check + upsert loop).
  await Promise.all(
    translations.map((entry) => assertLocaleSupported(countryId, entry.locale)),
  );
  await prisma.$transaction(
    translations.map((entry) => {
      const data = {
        title: entry.title,
        shortDescription: entry.shortDescription,
        sampleType: entry.sampleType,
        resultsTimeline: entry.resultsTimeline,
        heroButtonLabel: entry.heroButtonLabel,
        detailIntro: entry.detailIntro,
        seoTitle: entry.seoTitle,
        seoDescription: entry.seoDescription,
      };
      return prisma.healthTestTranslation.upsert({
        where: { healthTestId_locale: { healthTestId, locale: entry.locale } },
        create: { healthTestId, locale: entry.locale, ...data },
        update: data,
      });
    }),
  );
}

export class HealthTestCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "HealthTestCountryNotFoundError";
  }
}

export class HealthTestCurrencyNotFoundError extends Error {
  constructor() {
    super("Currency code not found");
    this.name = "HealthTestCurrencyNotFoundError";
  }
}

export class HealthTestCountryChangeNotAllowedError extends Error {
  constructor() {
    super("Country cannot be changed on an existing health test");
    this.name = "HealthTestCountryChangeNotAllowedError";
  }
}

const adminHealthTestInclude = {
  country: { select: { id: true, code: true, name: true } },
  translations: { orderBy: { locale: "asc" as const } },
} satisfies Prisma.HealthTestInclude;

export type AdminHealthTestRecord = Prisma.HealthTestGetPayload<{ include: typeof adminHealthTestInclude }>;

export type ListAdminHealthTestsResult = {
  items: AdminHealthTestRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new HealthTestCountryNotFoundError();
}

async function assertCurrencyCodeExists(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  const row = await prisma.currency.findUnique({ where: { code: normalized }, select: { code: true } });
  if (!row) throw new HealthTestCurrencyNotFoundError();
}

function buildWhere(query: AdminHealthTestsQuery): Prisma.HealthTestWhereInput {
  const where: Prisma.HealthTestWhereInput = {};
  if (query.countryId) where.countryId = query.countryId;
  if (query.countryCode) where.country = { code: query.countryCode };
  if (query.isActive !== undefined) where.isActive = query.isActive;
  const term = query.search?.trim();
  if (term) {
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { shortDescription: { contains: term, mode: "insensitive" } },
      { sampleType: { contains: term, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listHealthTests() {
  try {
    return await prisma.healthTest.findMany({
      where: { isActive: true },
      orderBy: [{ country: { name: "asc" } }, { sortOrder: "asc" }, { title: "asc" }],
      include: { country: true },
    });
  } catch (error) {
    throw normalizeDbError(error, "Health test data is unavailable");
  }
}

export async function listHealthTestsByCountry(countryCode: string, locale?: LocaleCode) {
  try {
    const rows = await prisma.healthTest.findMany({
      where: { isActive: true, country: { code: { equals: countryCode, mode: "insensitive" } } },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      include: {
        country: { select: { id: true, code: true, name: true, defaultLocale: true } },
        translations: { select: healthTestTranslationSelect },
      },
    });
    return rows.map((row) =>
      mergeHealthTestTranslation(
        row,
        locale ?? row.country.defaultLocale,
        row.country.defaultLocale,
      ),
    );
  } catch (error) {
    throw normalizeDbError(error, "Health test data is unavailable");
  }
}

export async function listAdminHealthTests(query: AdminHealthTestsQuery): Promise<ListAdminHealthTestsResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const where = buildWhere(query);

  try {
    const total = await prisma.healthTest.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const skip = (effectivePage - 1) * pageSize;

    const items = await prisma.healthTest.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ country: { name: "asc" } }, { sortOrder: "asc" }, { title: "asc" }],
      include: adminHealthTestInclude,
    });

    return {
      items,
      pagination: { page: effectivePage, pageSize, total, totalPages },
    };
  } catch (error) {
    throw normalizeDbError(error, "Health test data is unavailable");
  }
}

export async function getAdminHealthTestById(id: string): Promise<AdminHealthTestRecord | null> {
  try {
    return await prisma.healthTest.findUnique({ where: { id }, include: adminHealthTestInclude });
  } catch (error) {
    throw normalizeDbError(error, "Health test data is unavailable");
  }
}

export async function createAdminHealthTest(input: AdminHealthTestCreateBody): Promise<AdminHealthTestRecord> {
  await assertCountryExists(input.countryId);
  await assertCurrencyCodeExists(input.currencyCode);
  try {
    const created = await prisma.healthTest.create({
      data: {
        countryId: input.countryId,
        slug: input.slug,
        title: input.title,
        shortDescription: input.shortDescription,
        priceCents: input.priceCents,
        currencyCode: input.currencyCode.trim().toUpperCase(),
        productImagePath: input.productImagePath.trim(),
        galleryImagePaths: input.galleryImagePaths ?? [],
        sampleType: input.sampleType,
        resultsTimeline: input.resultsTimeline,
        heroButtonLabel: input.heroButtonLabel,
        detailIntro: input.detailIntro,
        whatThisTestCovers: input.whatThisTestCovers ?? [],
        whyGetTested: input.whyGetTested ?? [],
        extraSections: input.extraSections ?? Prisma.JsonNull,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        stock: input.stock ?? null,
        shippingCents: input.shippingCents ?? 0,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        legacyPath: input.legacyPath,
      },
      include: adminHealthTestInclude,
    });
    if (input.translations !== undefined) {
      await upsertHealthTestTranslations(created.id, input.countryId, input.translations);
      return await prisma.healthTest.findUniqueOrThrow({
        where: { id: created.id },
        include: adminHealthTestInclude,
      });
    }
    return created;
  } catch (error) {
    throw normalizeDbError(error, "Health test data is unavailable");
  }
}

export async function updateAdminHealthTest(id: string, body: AdminHealthTestUpdateBody): Promise<AdminHealthTestRecord | null> {
  const existing = await prisma.healthTest.findUnique({ where: { id }, select: { countryId: true } });
  if (!existing) return null;
  if (body.countryId !== undefined && body.countryId !== existing.countryId) {
    throw new HealthTestCountryChangeNotAllowedError();
  }
  if (body.countryId !== undefined) await assertCountryExists(body.countryId);
  if (body.currencyCode !== undefined) await assertCurrencyCodeExists(body.currencyCode);

  try {
    await prisma.healthTest.update({
      where: { id },
      data: {
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.shortDescription !== undefined && { shortDescription: body.shortDescription }),
        ...(body.priceCents !== undefined && { priceCents: body.priceCents }),
        ...(body.currencyCode !== undefined && { currencyCode: body.currencyCode.trim().toUpperCase() }),
        ...(body.productImagePath !== undefined && { productImagePath: body.productImagePath.trim() }),
        ...(body.galleryImagePaths !== undefined && { galleryImagePaths: body.galleryImagePaths }),
        ...(body.sampleType !== undefined && { sampleType: body.sampleType }),
        ...(body.resultsTimeline !== undefined && { resultsTimeline: body.resultsTimeline }),
        ...(body.heroButtonLabel !== undefined && { heroButtonLabel: body.heroButtonLabel }),
        ...(body.detailIntro !== undefined && { detailIntro: body.detailIntro }),
        ...(body.whatThisTestCovers !== undefined && { whatThisTestCovers: body.whatThisTestCovers }),
        ...(body.whyGetTested !== undefined && { whyGetTested: body.whyGetTested }),
        ...(body.extraSections !== undefined && { extraSections: body.extraSections ?? Prisma.JsonNull }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.stock !== undefined && { stock: body.stock }),
        ...(body.shippingCents !== undefined && { shippingCents: body.shippingCents }),
        ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle }),
        ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription }),
        ...(body.legacyPath !== undefined && { legacyPath: body.legacyPath }),
      },
    });
    if (body.translations !== undefined) {
      await upsertHealthTestTranslations(id, existing.countryId, body.translations);
    }
    return await prisma.healthTest.findUniqueOrThrow({
      where: { id },
      include: adminHealthTestInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Health test data is unavailable");
  }
}

export async function disableAdminHealthTest(id: string): Promise<AdminHealthTestRecord | null> {
  const existing = await prisma.healthTest.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    return await prisma.healthTest.update({
      where: { id },
      data: { isActive: false },
      include: adminHealthTestInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Health test data is unavailable");
  }
}

export async function purgeAdminHealthTest(id: string): Promise<boolean> {
  const existing = await prisma.healthTest.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  try {
    await prisma.healthTest.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Health test data is unavailable");
  }
}
