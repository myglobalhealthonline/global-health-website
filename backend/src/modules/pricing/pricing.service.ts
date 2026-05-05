import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminPricingCreateBody,
  AdminPricingQuery,
  AdminPricingUpdateBody,
} from "../../validations/admin-pricing.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";

export class PricingCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "PricingCountryNotFoundError";
  }
}

export class PricingCurrencyNotFoundError extends Error {
  constructor() {
    super("Currency code not found");
    this.name = "PricingCurrencyNotFoundError";
  }
}

export class PricingCountryChangeNotAllowedError extends Error {
  constructor() {
    super("Country cannot be changed on an existing pricing plan — create a new plan in the target country");
    this.name = "PricingCountryChangeNotAllowedError";
  }
}

const adminPricingInclude = {
  country: { select: { id: true, code: true, name: true } },
} satisfies Prisma.PricingPlanInclude;

export type AdminPricingPlanRecord = Prisma.PricingPlanGetPayload<{ include: typeof adminPricingInclude }>;

export type ListAdminPricingPlansResult = {
  items: AdminPricingPlanRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function listPricing() {
  try {
    return await prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ country: { name: "asc" } }, { priceCents: "asc" }],
      include: {
        country: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Pricing data is unavailable");
  }
}

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new PricingCountryNotFoundError();
}

async function assertCurrencyCodeExists(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  const row = await prisma.currency.findUnique({
    where: { code: normalized },
    select: { code: true },
  });
  if (!row) throw new PricingCurrencyNotFoundError();
}

function buildAdminPricingWhere(query: AdminPricingQuery): Prisma.PricingPlanWhereInput {
  const where: Prisma.PricingPlanWhereInput = {};

  if (query.countryId) {
    where.countryId = query.countryId;
  }
  if (query.countryCode) {
    where.country = { code: query.countryCode };
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  const term = query.search?.trim();
  if (term && term.length > 0) {
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listAdminPricingPlans(query: AdminPricingQuery): Promise<ListAdminPricingPlansResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const where = buildAdminPricingWhere(query);

  try {
    const total = await prisma.pricingPlan.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const skip = (effectivePage - 1) * pageSize;

    const items = await prisma.pricingPlan.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ country: { name: "asc" } }, { priceCents: "asc" }],
      include: adminPricingInclude,
    });

    return {
      items,
      pagination: {
        page: effectivePage,
        pageSize,
        total,
        totalPages,
      },
    };
  } catch (error) {
    throw normalizeDbError(error, "Pricing data is unavailable");
  }
}

export async function getAdminPricingPlanById(id: string): Promise<AdminPricingPlanRecord | null> {
  try {
    return await prisma.pricingPlan.findUnique({
      where: { id },
      include: adminPricingInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Pricing data is unavailable");
  }
}

export async function createAdminPricingPlan(input: AdminPricingCreateBody): Promise<AdminPricingPlanRecord> {
  await assertCountryExists(input.countryId);
  await assertCurrencyCodeExists(input.currencyCode);

  const currencyCode = input.currencyCode.trim().toUpperCase();

  try {
    return await prisma.pricingPlan.create({
      data: {
        countryId: input.countryId,
        slug: input.slug,
        name: input.name,
        ...(input.description !== undefined && { description: input.description }),
        priceCents: input.priceCents,
        currencyCode,
        interval: input.interval.trim(),
        isActive: input.isActive ?? true,
      },
      include: adminPricingInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Pricing data is unavailable");
  }
}

export async function updateAdminPricingPlan(
  id: string,
  body: AdminPricingUpdateBody,
): Promise<AdminPricingPlanRecord | null> {
  const existing = await prisma.pricingPlan.findUnique({
    where: { id },
    select: { countryId: true },
  });
  if (!existing) return null;

  if (body.countryId !== undefined && body.countryId !== existing.countryId) {
    throw new PricingCountryChangeNotAllowedError();
  }

  if (body.countryId !== undefined) {
    await assertCountryExists(body.countryId);
  }

  let nextCurrency = body.currencyCode;
  if (nextCurrency !== undefined) {
    await assertCurrencyCodeExists(nextCurrency);
    nextCurrency = nextCurrency.trim().toUpperCase();
  }

  try {
    return await prisma.pricingPlan.update({
      where: { id },
      data: {
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.priceCents !== undefined && { priceCents: body.priceCents }),
        ...(nextCurrency !== undefined && { currencyCode: nextCurrency }),
        ...(body.interval !== undefined && { interval: body.interval.trim() }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: adminPricingInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Pricing data is unavailable");
  }
}

export async function disableAdminPricingPlan(id: string): Promise<AdminPricingPlanRecord | null> {
  const existing = await prisma.pricingPlan.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  try {
    return await prisma.pricingPlan.update({
      where: { id },
      data: { isActive: false },
      include: adminPricingInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Pricing data is unavailable");
  }
}
