import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminFaqCreateBody,
  AdminFaqsQuery,
  AdminFaqUpdateBody,
} from "../../validations/admin-faqs.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";

export class FaqCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "FaqCountryNotFoundError";
  }
}

const adminFaqInclude = {
  country: { select: { id: true, code: true, name: true } },
} satisfies Prisma.FaqInclude;

export type AdminFaqRecord = Prisma.FaqGetPayload<{ include: typeof adminFaqInclude }>;

export type ListAdminFaqsResult = {
  items: AdminFaqRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new FaqCountryNotFoundError();
}

function buildWhere(query: AdminFaqsQuery): Prisma.FaqWhereInput {
  const where: Prisma.FaqWhereInput = {};
  if (query.locale) where.locale = query.locale;
  if (query.countryId) where.countryId = query.countryId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  const term = query.search?.trim();
  if (term) {
    where.OR = [
      { question: { contains: term, mode: "insensitive" } },
      { answer: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
      { placementKey: { contains: term, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listAdminFaqs(query: AdminFaqsQuery): Promise<ListAdminFaqsResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const where = buildWhere(query);
  try {
    const total = await prisma.faq.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const skip = (effectivePage - 1) * pageSize;
    const items = await prisma.faq.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      include: adminFaqInclude,
    });
    return { items, pagination: { page: effectivePage, pageSize, total, totalPages } };
  } catch (error) {
    throw normalizeDbError(error, "FAQ data is unavailable");
  }
}

export async function getAdminFaqById(id: string): Promise<AdminFaqRecord | null> {
  try {
    return await prisma.faq.findUnique({ where: { id }, include: adminFaqInclude });
  } catch (error) {
    throw normalizeDbError(error, "FAQ data is unavailable");
  }
}

export async function createAdminFaq(input: AdminFaqCreateBody): Promise<AdminFaqRecord> {
  if (input.countryId) await assertCountryExists(input.countryId);
  try {
    return await prisma.faq.create({
      data: {
        countryId: input.countryId ?? null,
        question: input.question,
        answer: input.answer,
        locale: input.locale,
        category: input.category ?? null,
        placementKey: input.placementKey ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive ?? true,
      },
      include: adminFaqInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "FAQ data is unavailable");
  }
}

export async function updateAdminFaq(id: string, body: AdminFaqUpdateBody): Promise<AdminFaqRecord | null> {
  const existing = await prisma.faq.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  if (body.countryId) await assertCountryExists(body.countryId);
  try {
    return await prisma.faq.update({
      where: { id },
      data: {
        ...(body.countryId !== undefined && { countryId: body.countryId }),
        ...(body.question !== undefined && { question: body.question }),
        ...(body.answer !== undefined && { answer: body.answer }),
        ...(body.locale !== undefined && { locale: body.locale }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.placementKey !== undefined && { placementKey: body.placementKey }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: adminFaqInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "FAQ data is unavailable");
  }
}

export async function disableAdminFaq(id: string): Promise<AdminFaqRecord | null> {
  const existing = await prisma.faq.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    return await prisma.faq.update({
      where: { id },
      data: { isActive: false },
      include: adminFaqInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "FAQ data is unavailable");
  }
}
