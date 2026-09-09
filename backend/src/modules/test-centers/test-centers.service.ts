import { Prisma, type LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { resolveTranslation } from "../shared/resolve-translation.js";
import { sanitizeRichHtml } from "../../utils/sanitize-html.js";
import type {
  AdminExamTypeCreateBody,
  AdminExamTypesQuery,
  AdminExamTypeUpdateBody,
  AdminTestCenterCreateBody,
  AdminTestCentersQuery,
  AdminTestCenterUpdateBody,
  AdminTestCenterExamCreateBody,
  AdminTestCenterExamsQuery,
  AdminTestCenterExamUpdateBody,
  ExamTypeTranslationInput,
} from "../../validations/admin-test-centers.schema.js";

/** Shape shared by every paginated list in this module. */
export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Clamp the requested page to the last page that actually has rows, so a
 *  stale `?page=` in the admin URL shows the tail instead of an empty table. */
function paginate(page: number, pageSize: number, total: number) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
  return {
    skip: (effectivePage - 1) * pageSize,
    pagination: { page: effectivePage, pageSize, total, totalPages } satisfies Pagination,
  };
}

// ─── Typed domain errors ───────────────────────────────────────────────────

export class TestCenterCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "TestCenterCountryNotFoundError";
  }
}

export class TestCenterCurrencyNotFoundError extends Error {
  constructor() {
    super("Currency code not found");
    this.name = "TestCenterCurrencyNotFoundError";
  }
}

export class TestCenterNotFoundError extends Error {
  constructor() {
    super("Test center not found");
    this.name = "TestCenterNotFoundError";
  }
}

export class ExamTypeNotFoundError extends Error {
  constructor() {
    super("Exam type not found");
    this.name = "ExamTypeNotFoundError";
  }
}

// ─── Pricing ───────────────────────────────────────────────────────────────

/**
 * Patient-facing price for an offering. Derived at read time (never stored) so
 * a markup edit reprices instantly and backend + UI always agree:
 *  - FIXED   → cost + markupValue (markupValue is cents).
 *  - PERCENT → cost + round(cost * markupValue / 10000) (markupValue is basis
 *              points, 100 = 1.00%).
 */
export function computePatientPriceCents(
  costCents: number,
  markupMode: "FIXED" | "PERCENT",
  markupValue: number,
): number {
  if (markupMode === "FIXED") return costCents + markupValue;
  return costCents + Math.round((costCents * markupValue) / 10000);
}

// ─── Shared asserts ────────────────────────────────────────────────────────

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new TestCenterCountryNotFoundError();
}

async function assertCurrencyCodeExists(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  const row = await prisma.currency.findUnique({ where: { code: normalized }, select: { code: true } });
  if (!row) throw new TestCenterCurrencyNotFoundError();
}

async function assertExamTypeExists(examTypeId: string): Promise<void> {
  const row = await prisma.examType.findUnique({ where: { id: examTypeId }, select: { id: true } });
  if (!row) throw new ExamTypeNotFoundError();
}

// ─── Exam-type catalogue (global) ──────────────────────────────────────────

export type ExamTypeRecord = Prisma.ExamTypeGetPayload<Record<string, never>> & {
  offeringCount?: number;
};

function buildExamTypeWhere(query: {
  isActive?: boolean;
  category?: string;
  notOnCenterId?: string;
  search?: string;
}): Prisma.ExamTypeWhereInput {
  const where: Prisma.ExamTypeWhereInput = {};
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.category) where.category = { equals: query.category, mode: "insensitive" };
  if (query.notOnCenterId) {
    where.offerings = { none: { testCenterId: query.notOnCenterId } };
  }
  const term = query.search?.trim();
  if (term) {
    where.OR = [
      { code: { contains: term, mode: "insensitive" } },
      { name: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
    ];
  }
  return where;
}

// ─── Exam-type public content + translations ───────────────────────────────

type ExamTypeDisplayBase = {
  name: string;
  summary: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  preparationBody: string | null;
  ctaLabel: string | null;
};

type ExamTypeTranslationRow = ExamTypeDisplayBase & { locale: LocaleCode };

const EXAM_TYPE_DISPLAY_FIELDS = [
  "name",
  "summary",
  "seoTitle",
  "seoDescription",
  "heroTitle",
  "heroDescription",
  "detailBody",
  "preparationBody",
  "ctaLabel",
] as const satisfies readonly (keyof ExamTypeDisplayBase)[];

export const examTypeTranslationSelect = {
  locale: true,
  name: true,
  summary: true,
  seoTitle: true,
  seoDescription: true,
  heroTitle: true,
  heroDescription: true,
  detailBody: true,
  preparationBody: true,
  ctaLabel: true,
} satisfies Prisma.ExamTypeTranslationSelect;

/**
 * Merge an exam type's base display columns with the best translation for the
 * requested locale (requested → default → base). Returns the row with display
 * fields overwritten, the raw `translations` array stripped, and the locale
 * that actually resolved.
 *
 * `translatedFields` names the fields the resolved row actually supplied.
 * Everything else fell through to the base columns, so a consumer rendering a
 * non-default locale can tell "this is in my language" from "this is the
 * catalogue's own language leaking through the fallback" — which is what the
 * public site needs to decide indexability.
 */
export function mergeExamTypeTranslation<
  E extends ExamTypeDisplayBase & { translations: ExamTypeTranslationRow[] },
>(
  examType: E,
  requested: LocaleCode,
  defaultLocale: LocaleCode,
): Omit<E, "translations"> & {
  resolvedLocale: LocaleCode;
  translatedFields: string[];
} {
  const { tr, resolvedLocale } = resolveTranslation(
    examType.translations,
    requested,
    defaultLocale,
  );
  const { translations: _translations, ...rest } = examType;
  const translatedFields = tr
    ? EXAM_TYPE_DISPLAY_FIELDS.filter((field) => tr[field] != null)
    : [];
  return {
    ...rest,
    translatedFields,
    name: tr?.name ?? examType.name,
    summary: tr?.summary ?? examType.summary,
    seoTitle: tr?.seoTitle ?? examType.seoTitle,
    seoDescription: tr?.seoDescription ?? examType.seoDescription,
    heroTitle: tr?.heroTitle ?? examType.heroTitle,
    heroDescription: tr?.heroDescription ?? examType.heroDescription,
    detailBody: tr?.detailBody ?? examType.detailBody,
    preparationBody: tr?.preparationBody ?? examType.preparationBody,
    ctaLabel: tr?.ctaLabel ?? examType.ctaLabel,
    resolvedLocale,
  };
}

/**
 * Upsert one ExamTypeTranslation per supplied entry, keyed by
 * (examTypeId, locale). Additive per submitted locale; rich HTML is sanitized.
 *
 * ONE DELIBERATE DIVERGENCE from `upsertServiceTranslations`: no
 * `assertLocaleSupported` call. That guard checks the locale is enabled for the
 * owning COUNTRY, and an ExamType has none — it is one global catalogue reused
 * by every market, so any LocaleCode is valid here. Price and availability stay
 * per-center; only the copy is global.
 *
 * Writes go through the caller's transaction client so the base row and its
 * translations commit together.
 */
async function upsertExamTypeTranslations(
  tx: Prisma.TransactionClient,
  examTypeId: string,
  translations: ExamTypeTranslationInput[],
): Promise<void> {
  for (const entry of translations) {
    const detailBody =
      entry.detailBody == null ? entry.detailBody : sanitizeRichHtml(entry.detailBody);
    const preparationBody =
      entry.preparationBody == null
        ? entry.preparationBody
        : sanitizeRichHtml(entry.preparationBody);
    const data = {
      name: entry.name,
      summary: entry.summary,
      seoTitle: entry.seoTitle,
      seoDescription: entry.seoDescription,
      heroTitle: entry.heroTitle,
      heroDescription: entry.heroDescription,
      detailBody,
      preparationBody,
      ctaLabel: entry.ctaLabel,
    };
    await tx.examTypeTranslation.upsert({
      where: { examTypeId_locale: { examTypeId, locale: entry.locale } },
      create: { examTypeId, locale: entry.locale, ...data },
      update: data,
    });
  }
}

/** Base-column content fields shared by the create and update writers. */
function examTypeContentData(body: {
  summary?: string | null;
  imagePath?: string | null;
  galleryImagePaths?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  heroTitle?: string | null;
  heroDescription?: string | null;
  detailBody?: string | null;
  preparationBody?: string | null;
  ctaLabel?: string | null;
  durationMinutes?: number;
  isBookable?: boolean;
}) {
  return {
    ...(body.summary !== undefined && { summary: body.summary }),
    ...(body.imagePath !== undefined && { imagePath: body.imagePath }),
    ...(body.galleryImagePaths !== undefined && {
      galleryImagePaths: body.galleryImagePaths,
    }),
    ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle }),
    ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription }),
    ...(body.heroTitle !== undefined && { heroTitle: body.heroTitle }),
    ...(body.heroDescription !== undefined && {
      heroDescription: body.heroDescription,
    }),
    // Rich HTML — sanitized on the way in, never on the way out.
    ...(body.detailBody !== undefined && {
      detailBody: body.detailBody == null ? null : sanitizeRichHtml(body.detailBody),
    }),
    ...(body.preparationBody !== undefined && {
      preparationBody:
        body.preparationBody == null ? null : sanitizeRichHtml(body.preparationBody),
    }),
    ...(body.ctaLabel !== undefined && { ctaLabel: body.ctaLabel }),
    ...(body.durationMinutes !== undefined && {
      durationMinutes: body.durationMinutes,
    }),
    ...(body.isBookable !== undefined && { isBookable: body.isBookable }),
  };
}

/** Paginated — the catalogue carries thousands of rows once a supplier price
 *  list is imported, so this never returns the whole table. */
export async function listAdminExamTypes(query: AdminExamTypesQuery) {
  const where = buildExamTypeWhere(query);
  try {
    const total = await prisma.examType.count({ where });
    const { skip, pagination } = paginate(query.page, query.pageSize, total);
    const rows = await prisma.examType.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { offerings: true } },
        // The admin edit form prefills its per-locale tabs from these. Bounded
        // by pageSize and by six locales, so this stays a small join even once
        // a supplier price list has filled the catalogue.
        translations: { select: examTypeTranslationSelect },
      },
    });
    return {
      items: rows.map((row) => ({ ...row, offeringCount: row._count.offerings })),
      pagination,
    };
  } catch (error) {
    throw normalizeDbError(error, "Exam type data is unavailable");
  }
}

/** Distinct category labels, for the admin filter dropdown. Cheap enough to
 *  compute on demand — the catalogue has ~15 of them, not thousands. */
export async function listAdminExamTypeCategories(): Promise<string[]> {
  try {
    const rows = await prisma.examType.findMany({
      where: { category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });
    return rows.map((row) => row.category).filter((c): c is string => Boolean(c));
  } catch (error) {
    throw normalizeDbError(error, "Exam type data is unavailable");
  }
}

export async function createAdminExamType(input: AdminExamTypeCreateBody) {
  try {
    // Base row and its translations commit together — a failing locale must
    // not leave the exam type created with the copy half-applied.
    return await prisma.$transaction(async (tx) => {
      const row = await tx.examType.create({
        data: {
          code: input.code,
          name: input.name,
          slug: input.slug,
          category: input.category,
          description: input.description,
          sortOrder: input.sortOrder ?? 0,
          isActive: input.isActive ?? true,
          ...examTypeContentData(input),
        },
      });
      if (input.translations?.length) {
        await upsertExamTypeTranslations(tx, row.id, input.translations);
      }
      return row;
    });
  } catch (error) {
    throw normalizeDbError(error, "Exam type data is unavailable");
  }
}

export async function updateAdminExamType(id: string, body: AdminExamTypeUpdateBody) {
  const existing = await prisma.examType.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.examType.update({
        where: { id },
        data: {
          ...(body.code !== undefined && { code: body.code }),
          ...(body.name !== undefined && { name: body.name }),
          ...(body.slug !== undefined && { slug: body.slug }),
          ...(body.category !== undefined && { category: body.category }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          ...examTypeContentData(body),
        },
      });
      if (body.translations?.length) {
        await upsertExamTypeTranslations(tx, row.id, body.translations);
      }
      return row;
    });
  } catch (error) {
    throw normalizeDbError(error, "Exam type data is unavailable");
  }
}

export async function disableAdminExamType(id: string) {
  const existing = await prisma.examType.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    return await prisma.examType.update({ where: { id }, data: { isActive: false } });
  } catch (error) {
    throw normalizeDbError(error, "Exam type data is unavailable");
  }
}

// ─── Test centers (country-scoped) ─────────────────────────────────────────

const testCenterExamInclude = {
  examType: { select: { id: true, code: true, name: true, slug: true, category: true } },
} satisfies Prisma.TestCenterExamInclude;

/** A center can carry a whole supplier catalogue (thousands of offerings), so
 *  the center payload only reports how many it has — the rows themselves come
 *  from the paginated `/exams` endpoint. */
const testCenterInclude = {
  country: { select: { id: true, code: true, name: true } },
  _count: { select: { exams: true } },
} satisfies Prisma.TestCenterInclude;

type TestCenterRecord = Prisma.TestCenterGetPayload<{ include: typeof testCenterInclude }>;
type TestCenterExamRecord = Prisma.TestCenterExamGetPayload<{ include: typeof testCenterExamInclude }>;

/** Attach the computed patient price to an offering row for the API/UI. */
function toOfferingDto(row: TestCenterExamRecord) {
  return {
    id: row.id,
    testCenterId: row.testCenterId,
    examTypeId: row.examTypeId,
    examTypeCode: row.examType.code,
    examTypeName: row.examType.name,
    examTypeCategory: row.examType.category,
    supplierCode: row.supplierCode,
    turnaroundDays: row.turnaroundDays,
    costCents: row.costCents,
    markupMode: row.markupMode,
    markupValue: row.markupValue,
    patientPriceCents: computePatientPriceCents(row.costCents, row.markupMode, row.markupValue),
    currencyCode: row.currencyCode,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toTestCenterDto(row: TestCenterRecord) {
  const { _count, ...rest } = row;
  return { ...rest, examCount: _count.exams };
}

export async function listAdminTestCenters(query: AdminTestCentersQuery) {
  const where: Prisma.TestCenterWhereInput = {};
  if (query.countryId) where.countryId = query.countryId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  const term = query.search?.trim();
  if (term) {
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
    ];
  }
  try {
    const rows = await prisma.testCenter.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: testCenterInclude,
    });
    return rows.map(toTestCenterDto);
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

export async function getAdminTestCenterById(id: string) {
  try {
    const row = await prisma.testCenter.findUnique({ where: { id }, include: testCenterInclude });
    return row ? toTestCenterDto(row) : null;
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

export async function createAdminTestCenter(input: AdminTestCenterCreateBody) {
  await assertCountryExists(input.countryId);
  try {
    const created = await prisma.testCenter.create({
      data: {
        countryId: input.countryId,
        name: input.name,
        slug: input.slug,
        addressLine: input.addressLine,
        city: input.city,
        phone: input.phone,
        email: input.email,
        notes: input.notes,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
      include: testCenterInclude,
    });
    return toTestCenterDto(created);
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

export async function updateAdminTestCenter(id: string, body: AdminTestCenterUpdateBody) {
  const existing = await prisma.testCenter.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    await prisma.testCenter.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.addressLine !== undefined && { addressLine: body.addressLine }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    const row = await prisma.testCenter.findUniqueOrThrow({ where: { id }, include: testCenterInclude });
    return toTestCenterDto(row);
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

export async function disableAdminTestCenter(id: string) {
  const existing = await prisma.testCenter.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    const row = await prisma.testCenter.update({
      where: { id },
      data: { isActive: false },
      include: testCenterInclude,
    });
    return toTestCenterDto(row);
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

export async function purgeAdminTestCenter(id: string): Promise<boolean> {
  const existing = await prisma.testCenter.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  try {
    await prisma.testCenter.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

// ─── Exam offerings on a center ────────────────────────────────────────────

/** Paginated — a center importing a full supplier price list holds thousands
 *  of offerings. `search` matches the supplier's code, our GH reference and the
 *  exam name, which is how admins actually look a row up. */
export async function listTestCenterExams(testCenterId: string, query: AdminTestCenterExamsQuery) {
  const center = await prisma.testCenter.findUnique({ where: { id: testCenterId }, select: { id: true } });
  if (!center) throw new TestCenterNotFoundError();

  const where: Prisma.TestCenterExamWhereInput = { testCenterId };
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.category) {
    where.examType = { category: { equals: query.category, mode: "insensitive" } };
  }
  const term = query.search?.trim();
  if (term) {
    where.OR = [
      { supplierCode: { contains: term, mode: "insensitive" } },
      { examType: { code: { contains: term, mode: "insensitive" } } },
      { examType: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  try {
    const total = await prisma.testCenterExam.count({ where });
    const { skip, pagination } = paginate(query.page, query.pageSize, total);
    const rows = await prisma.testCenterExam.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ examType: { name: "asc" } }],
      include: testCenterExamInclude,
    });
    return { items: rows.map(toOfferingDto), pagination };
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

export async function createTestCenterExam(testCenterId: string, input: AdminTestCenterExamCreateBody) {
  const center = await prisma.testCenter.findUnique({ where: { id: testCenterId }, select: { id: true } });
  if (!center) throw new TestCenterNotFoundError();
  await assertExamTypeExists(input.examTypeId);
  await assertCurrencyCodeExists(input.currencyCode);
  try {
    const created = await prisma.testCenterExam.create({
      data: {
        testCenterId,
        examTypeId: input.examTypeId,
        supplierCode: input.supplierCode ?? null,
        turnaroundDays: input.turnaroundDays ?? null,
        costCents: input.costCents,
        markupMode: input.markupMode,
        markupValue: input.markupValue,
        currencyCode: input.currencyCode.trim().toUpperCase(),
        isActive: input.isActive ?? true,
      },
      include: testCenterExamInclude,
    });
    return toOfferingDto(created);
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

export async function updateTestCenterExam(
  offeringId: string,
  body: AdminTestCenterExamUpdateBody,
) {
  const existing = await prisma.testCenterExam.findUnique({ where: { id: offeringId }, select: { id: true } });
  if (!existing) return null;
  if (body.currencyCode !== undefined) await assertCurrencyCodeExists(body.currencyCode);
  try {
    const row = await prisma.testCenterExam.update({
      where: { id: offeringId },
      data: {
        ...(body.supplierCode !== undefined && { supplierCode: body.supplierCode }),
        ...(body.turnaroundDays !== undefined && { turnaroundDays: body.turnaroundDays }),
        ...(body.costCents !== undefined && { costCents: body.costCents }),
        ...(body.markupMode !== undefined && { markupMode: body.markupMode }),
        ...(body.markupValue !== undefined && { markupValue: body.markupValue }),
        ...(body.currencyCode !== undefined && { currencyCode: body.currencyCode.trim().toUpperCase() }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: testCenterExamInclude,
    });
    return toOfferingDto(row);
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

export async function deleteTestCenterExam(offeringId: string): Promise<boolean> {
  const existing = await prisma.testCenterExam.findUnique({ where: { id: offeringId }, select: { id: true } });
  if (!existing) return false;
  try {
    await prisma.testCenterExam.delete({ where: { id: offeringId } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

// ─── Test-centre locations (physical branches) ─────────────────────────────

export class TestCenterLocationNotFoundError extends Error {
  constructor() {
    super("Test center location not found");
    this.name = "TestCenterLocationNotFoundError";
  }
}

/**
 * A centre must always keep at least one location: the calendar, the bookings
 * and the address a patient is told to attend all hang off one. Deleting the
 * last one would leave a centre that can be priced but never booked, and would
 * orphan the address on any appointment already made.
 */
export class LastTestCenterLocationError extends Error {
  constructor() {
    super("A test center must keep at least one location");
    this.name = "LastTestCenterLocationError";
  }
}

export async function listTestCenterLocations(testCenterId: string) {
  try {
    return await prisma.testCenterLocation.findMany({
      where: { testCenterId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

export async function createTestCenterLocation(
  testCenterId: string,
  input: {
    name: string;
    slug: string;
    addressLine?: string | null;
    city?: string | null;
    phone?: string | null;
    notes?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  },
) {
  const centre = await prisma.testCenter.findUnique({
    where: { id: testCenterId },
    select: { id: true },
  });
  if (!centre) throw new TestCenterNotFoundError();
  try {
    return await prisma.testCenterLocation.create({
      data: {
        testCenterId,
        name: input.name,
        slug: input.slug,
        addressLine: input.addressLine ?? null,
        city: input.city ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

export async function updateTestCenterLocation(
  testCenterId: string,
  locationId: string,
  body: {
    name?: string;
    slug?: string;
    addressLine?: string | null;
    city?: string | null;
    phone?: string | null;
    notes?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  },
) {
  // Scoped by centre as well as id — that pairing is what stops one centre
  // editing another's branch by guessing an id.
  const existing = await prisma.testCenterLocation.findFirst({
    where: { id: locationId, testCenterId },
    select: { id: true },
  });
  if (!existing) return null;
  try {
    return await prisma.testCenterLocation.update({
      where: { id: locationId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.addressLine !== undefined && { addressLine: body.addressLine }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

/**
 * Delete a branch. Refuses the last one (see LastTestCenterLocationError) and
 * refuses any branch that still has a booked or held slot — deleting it would
 * cascade the slot away and strand a patient holding an appointment for it.
 */
export async function deleteTestCenterLocation(
  testCenterId: string,
  locationId: string,
): Promise<boolean> {
  const existing = await prisma.testCenterLocation.findFirst({
    where: { id: locationId, testCenterId },
    select: { id: true },
  });
  if (!existing) return false;

  const remaining = await prisma.testCenterLocation.count({ where: { testCenterId } });
  if (remaining <= 1) throw new LastTestCenterLocationError();

  const liveSlots = await prisma.testCenterTimeSlot.count({
    where: { testCenterLocationId: locationId, status: { in: ["HELD", "BOOKED"] } },
  });
  if (liveSlots > 0) throw new LastTestCenterLocationError();

  try {
    await prisma.testCenterLocation.delete({ where: { id: locationId } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Test center data is unavailable");
  }
}

// ─── Public "Book a Test" catalogue ────────────────────────────────────────

/**
 * The gate every public read shares: the exam is published AND at least one
 * active centre in a live market carries it.
 *
 * Written once because the three public endpoints must agree exactly — a
 * catalogue that lists an exam whose detail page 404s (or worse, whose slots
 * are bookable when it should be hidden) is the failure mode this prevents.
 */
function publicExamWhere(countryCode: string): Prisma.ExamTypeWhereInput {
  return {
    isActive: true,
    isBookable: true,
    offerings: {
      some: {
        isActive: true,
        testCenter: {
          isActive: true,
          // Country codes are stored lowercase; match insensitively so a
          // "PT" in the URL resolves the same as "pt".
          country: { code: { equals: countryCode, mode: "insensitive" }, isActive: true },
        },
      },
    },
  };
}

/** The centres in this country that carry a given exam, cheapest first. */
function publicOfferingsFilter(countryCode: string) {
  return {
    where: {
      isActive: true,
      testCenter: {
        isActive: true,
        country: { code: { equals: countryCode, mode: "insensitive" }, isActive: true },
      },
    },
    include: {
      testCenter: {
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
          // Only live branches: an inactive one generates no slots, so
          // offering it would be a dead end for the patient.
          locations: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              slug: true,
              addressLine: true,
              city: true,
              phone: true,
            },
          },
        },
      },
    },
  } satisfies Prisma.ExamType$offeringsArgs;
}

export type PublicExamCard = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  imagePath: string | null;
  category: string | null;
  /** Cheapest patient price across the centres offering it in this country. */
  fromPriceCents: number;
  currencyCode: string;
  centreCount: number;
  resolvedLocale: LocaleCode;
  translatedFields: string[];
};

/**
 * Bookable exams in one country, with the cheapest price a patient could pay.
 *
 * Price is computed from cost + markup at read time and never stored — see
 * `computePatientPriceCents`. The cart snapshots it at add-to-cart, so a markup
 * edit mid-checkout cannot surprise the patient.
 */
export async function listPublicExamTypes(
  countryCode: string,
  locale?: LocaleCode,
): Promise<PublicExamCard[]> {
  try {
    const country = await prisma.country.findFirst({
      where: { code: { equals: countryCode, mode: "insensitive" }, isActive: true },
      select: { defaultLocale: true },
    });
    if (!country) return [];

    const rows = await prisma.examType.findMany({
      where: publicExamWhere(countryCode),
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        translations: { select: examTypeTranslationSelect },
        offerings: publicOfferingsFilter(countryCode),
      },
    });

    return rows
      .map((row) => {
        const prices = row.offerings.map((o) =>
          computePatientPriceCents(o.costCents, o.markupMode, o.markupValue),
        );
        // Defensive: publicExamWhere guarantees at least one offering, but a
        // row with none must not surface a nonsense "from €0".
        if (prices.length === 0) return null;
        const merged = mergeExamTypeTranslation(
          { ...row, translations: row.translations },
          locale ?? country.defaultLocale,
          country.defaultLocale,
        );
        return {
          id: row.id,
          slug: row.slug,
          name: merged.name,
          summary: merged.summary,
          imagePath: row.imagePath,
          category: row.category,
          fromPriceCents: Math.min(...prices),
          currencyCode: row.offerings[0]!.currencyCode,
          centreCount: row.offerings.length,
          resolvedLocale: merged.resolvedLocale,
          translatedFields: merged.translatedFields,
        };
      })
      .filter((card): card is PublicExamCard => card !== null);
  } catch (error) {
    throw normalizeDbError(error, "Test catalogue is unavailable");
  }
}

/** One physical branch a patient can attend. */
export type PublicExamLocation = {
  id: string;
  name: string;
  slug: string;
  addressLine: string | null;
  city: string | null;
  phone: string | null;
};

/**
 * A provider offering the exam, and the branches it can be attended at.
 *
 * The price is on the PROVIDER, not the branch: a chain charges the same for an
 * exam everywhere, so the patient chooses a branch for convenience, not cost.
 */
export type PublicExamCentre = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  patientPriceCents: number;
  currencyCode: string;
  turnaroundDays: number | null;
  locations: PublicExamLocation[];
};

export type PublicExamDetail = PublicExamCard & {
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  preparationBody: string | null;
  ctaLabel: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  galleryImagePaths: string[];
  durationMinutes: number;
  centres: PublicExamCentre[];
};

/** One exam plus every centre in this country that performs it. */
export async function getPublicExamTypeBySlug(
  countryCode: string,
  slug: string,
  locale?: LocaleCode,
): Promise<PublicExamDetail | null> {
  try {
    const country = await prisma.country.findFirst({
      where: { code: { equals: countryCode, mode: "insensitive" }, isActive: true },
      select: { defaultLocale: true },
    });
    if (!country) return null;

    const row = await prisma.examType.findFirst({
      where: { ...publicExamWhere(countryCode), slug },
      include: {
        translations: { select: examTypeTranslationSelect },
        offerings: publicOfferingsFilter(countryCode),
      },
    });
    if (!row || row.offerings.length === 0) return null;

    const merged = mergeExamTypeTranslation(
      { ...row, translations: row.translations },
      locale ?? country.defaultLocale,
      country.defaultLocale,
    );
    const centres: PublicExamCentre[] = row.offerings
      .map((o) => ({
        id: o.testCenter.id,
        name: o.testCenter.name,
        slug: o.testCenter.slug,
        phone: o.testCenter.phone,
        patientPriceCents: computePatientPriceCents(
          o.costCents,
          o.markupMode,
          o.markupValue,
        ),
        currencyCode: o.currencyCode,
        turnaroundDays: o.turnaroundDays,
        locations: o.testCenter.locations,
      }))
      // A provider with no live branch cannot be attended, so it is not an
      // option — offering it would dead-end the patient at the slot picker.
      .filter((centre) => centre.locations.length > 0)
      .sort((a, b) => a.patientPriceCents - b.patientPriceCents);
    if (centres.length === 0) return null;

    return {
      id: row.id,
      slug: row.slug,
      name: merged.name,
      summary: merged.summary,
      imagePath: row.imagePath,
      category: row.category,
      fromPriceCents: Math.min(...centres.map((c) => c.patientPriceCents)),
      currencyCode: centres[0]!.currencyCode,
      centreCount: centres.length,
      resolvedLocale: merged.resolvedLocale,
      translatedFields: merged.translatedFields,
      heroTitle: merged.heroTitle,
      heroDescription: merged.heroDescription,
      detailBody: merged.detailBody,
      preparationBody: merged.preparationBody,
      ctaLabel: merged.ctaLabel,
      seoTitle: merged.seoTitle,
      seoDescription: merged.seoDescription,
      galleryImagePaths: row.galleryImagePaths,
      durationMinutes: row.durationMinutes,
      centres,
    };
  } catch (error) {
    throw normalizeDbError(error, "Test catalogue is unavailable");
  }
}

/**
 * Resolve an (exam, centre) pair for booking, re-applying every public gate.
 *
 * The slot endpoint calls this rather than trusting the URL: a patient could
 * otherwise ask for slots at a centre that no longer carries the exam, book
 * one, and arrive for a test nobody there performs.
 */
export async function resolvePublicExamOffering(
  countryCode: string,
  examSlug: string,
  centreSlug: string,
  locationSlug: string,
): Promise<{
  examTypeId: string;
  testCenterId: string;
  testCenterLocationId: string;
  durationMinutes: number;
  patientPriceCents: number;
  currencyCode: string;
} | null> {
  try {
    const offering = await prisma.testCenterExam.findFirst({
      where: {
        isActive: true,
        examType: { slug: examSlug, isActive: true, isBookable: true },
        testCenter: {
          slug: centreSlug,
          isActive: true,
          country: { code: { equals: countryCode, mode: "insensitive" }, isActive: true },
          // The branch must belong to this provider and be live — resolving
          // the pair together is what stops a slot read against a branch the
          // provider no longer operates.
          locations: { some: { slug: locationSlug, isActive: true } },
        },
      },
      include: {
        examType: { select: { id: true, durationMinutes: true } },
        testCenter: {
          select: {
            id: true,
            locations: {
              where: { slug: locationSlug, isActive: true },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!offering) return null;
    const location = offering.testCenter.locations[0];
    if (!location) return null;
    return {
      examTypeId: offering.examType.id,
      testCenterId: offering.testCenter.id,
      testCenterLocationId: location.id,
      durationMinutes: offering.examType.durationMinutes,
      patientPriceCents: computePatientPriceCents(
        offering.costCents,
        offering.markupMode,
        offering.markupValue,
      ),
      currencyCode: offering.currencyCode,
    };
  } catch (error) {
    throw normalizeDbError(error, "Test catalogue is unavailable");
  }
}
