import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import type {
  AdminExamTypeCreateBody,
  AdminExamTypesQuery,
  AdminExamTypeUpdateBody,
  AdminTestCenterCreateBody,
  AdminTestCentersQuery,
  AdminTestCenterUpdateBody,
  AdminTestCenterExamCreateBody,
  AdminTestCenterExamUpdateBody,
} from "../../validations/admin-test-centers.schema.js";

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

export async function listAdminExamTypes(query: AdminExamTypesQuery) {
  const where: Prisma.ExamTypeWhereInput = {};
  if (query.isActive !== undefined) where.isActive = query.isActive;
  const term = query.search?.trim();
  if (term) {
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
    ];
  }
  try {
    const rows = await prisma.examType.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { offerings: true } } },
    });
    return rows.map((row) => ({ ...row, offeringCount: row._count.offerings }));
  } catch (error) {
    throw normalizeDbError(error, "Exam type data is unavailable");
  }
}

export async function createAdminExamType(input: AdminExamTypeCreateBody) {
  try {
    return await prisma.examType.create({
      data: {
        name: input.name,
        slug: input.slug,
        category: input.category,
        description: input.description,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Exam type data is unavailable");
  }
}

export async function updateAdminExamType(id: string, body: AdminExamTypeUpdateBody) {
  const existing = await prisma.examType.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    return await prisma.examType.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
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
  examType: { select: { id: true, name: true, slug: true, category: true } },
} satisfies Prisma.TestCenterExamInclude;

const testCenterInclude = {
  country: { select: { id: true, code: true, name: true } },
  exams: {
    orderBy: [{ examType: { name: "asc" } }] as Prisma.TestCenterExamOrderByWithRelationInput[],
    include: testCenterExamInclude,
  },
} satisfies Prisma.TestCenterInclude;

type TestCenterRecord = Prisma.TestCenterGetPayload<{ include: typeof testCenterInclude }>;
type TestCenterExamRecord = Prisma.TestCenterExamGetPayload<{ include: typeof testCenterExamInclude }>;

/** Attach the computed patient price to an offering row for the API/UI. */
function toOfferingDto(row: TestCenterExamRecord) {
  return {
    id: row.id,
    testCenterId: row.testCenterId,
    examTypeId: row.examTypeId,
    examTypeName: row.examType.name,
    examTypeCategory: row.examType.category,
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
  const { exams, ...rest } = row;
  return { ...rest, exams: exams.map(toOfferingDto) };
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

export async function listTestCenterExams(testCenterId: string) {
  const center = await prisma.testCenter.findUnique({ where: { id: testCenterId }, select: { id: true } });
  if (!center) throw new TestCenterNotFoundError();
  try {
    const rows = await prisma.testCenterExam.findMany({
      where: { testCenterId },
      orderBy: [{ examType: { name: "asc" } }],
      include: testCenterExamInclude,
    });
    return rows.map(toOfferingDto);
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
