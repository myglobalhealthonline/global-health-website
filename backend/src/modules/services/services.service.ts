import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminServiceCreateBody,
  AdminServiceUpdateBody,
  AdminServicesQuery,
} from "../../validations/admin-services.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";

export class ServiceCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "ServiceCountryNotFoundError";
  }
}

export class ServiceSpecialtyInvalidError extends Error {
  constructor(message = "Specialty not found or does not belong to this country") {
    super(message);
    this.name = "ServiceSpecialtyInvalidError";
  }
}

const adminServiceInclude = {
  country: { select: { id: true, code: true, name: true } },
  specialty: true,
} satisfies Prisma.ServiceInclude;

export type AdminServiceRecord = Prisma.ServiceGetPayload<{ include: typeof adminServiceInclude }>;

export type ListAdminServicesResult = {
  items: AdminServiceRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function listServices() {
  try {
    return await prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ country: { name: "asc" } }, { name: "asc" }],
      include: {
        country: true,
        specialty: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Services data is unavailable");
  }
}

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new ServiceCountryNotFoundError();
}

async function assertSpecialtyForCountry(specialtyId: string, countryId: string): Promise<void> {
  const row = await prisma.specialty.findUnique({
    where: { id: specialtyId },
    select: { id: true, countryId: true },
  });
  if (!row) {
    throw new ServiceSpecialtyInvalidError("Specialty not found");
  }
  if (row.countryId !== countryId) {
    throw new ServiceSpecialtyInvalidError();
  }
}

export async function listSpecialtiesForAdminCountry(countryId: string) {
  await assertCountryExists(countryId);
  try {
    return await prisma.specialty.findMany({
      where: { countryId },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true, active: true },
    });
  } catch (error) {
    throw normalizeDbError(error, "Specialties data is unavailable");
  }
}

function buildAdminServiceWhere(query: AdminServicesQuery): Prisma.ServiceWhereInput {
  const where: Prisma.ServiceWhereInput = {};

  if (query.countryId) {
    where.countryId = query.countryId;
  }
  if (query.countryCode) {
    where.country = { code: query.countryCode };
  }
  if (query.specialtyId) {
    where.specialtyId = query.specialtyId;
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  const term = query.search?.trim();
  if (term && term.length > 0) {
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { summary: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listAdminServices(query: AdminServicesQuery): Promise<ListAdminServicesResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const where = buildAdminServiceWhere(query);

  try {
    const total = await prisma.service.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const skip = (effectivePage - 1) * pageSize;

    const items = await prisma.service.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ country: { name: "asc" } }, { name: "asc" }],
      include: adminServiceInclude,
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
    throw normalizeDbError(error, "Services data is unavailable");
  }
}

export async function getAdminServiceById(id: string): Promise<AdminServiceRecord | null> {
  try {
    return await prisma.service.findUnique({
      where: { id },
      include: adminServiceInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Services data is unavailable");
  }
}

export async function createAdminService(input: AdminServiceCreateBody): Promise<AdminServiceRecord> {
  await assertCountryExists(input.countryId);
  if (input.specialtyId) {
    await assertSpecialtyForCountry(input.specialtyId, input.countryId);
  }

  try {
    return await prisma.service.create({
      data: {
        countryId: input.countryId,
        slug: input.slug,
        name: input.name,
        ...(input.summary !== undefined && { summary: input.summary }),
        ...(input.legacyPath !== undefined && { legacyPath: input.legacyPath }),
        ...(input.specialtyId !== undefined && { specialtyId: input.specialtyId }),
        ...(input.durationMinutes !== undefined && { durationMinutes: input.durationMinutes }),
        ...(input.basePriceCents !== undefined && { basePriceCents: input.basePriceCents }),
        ...(input.currencyCode !== undefined && { currencyCode: input.currencyCode }),
        isActive: input.isActive ?? true,
      },
      include: adminServiceInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Services data is unavailable");
  }
}

export async function updateAdminService(
  id: string,
  body: AdminServiceUpdateBody,
): Promise<AdminServiceRecord | null> {
  const existing = await prisma.service.findUnique({
    where: { id },
    select: { countryId: true, specialtyId: true },
  });
  if (!existing) return null;

  const nextCountryId = body.countryId ?? existing.countryId;
  if (body.countryId !== undefined) {
    await assertCountryExists(body.countryId);
  }

  const effectiveSpecialtyId =
    body.specialtyId !== undefined ? body.specialtyId : existing.specialtyId;

  if (effectiveSpecialtyId) {
    await assertSpecialtyForCountry(effectiveSpecialtyId, nextCountryId);
  }

  try {
    return await prisma.service.update({
      where: { id },
      data: {
        ...(body.countryId !== undefined && { countryId: body.countryId }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.summary !== undefined && { summary: body.summary }),
        ...(body.legacyPath !== undefined && { legacyPath: body.legacyPath }),
        ...(body.specialtyId !== undefined && { specialtyId: body.specialtyId }),
        ...(body.durationMinutes !== undefined && { durationMinutes: body.durationMinutes }),
        ...(body.basePriceCents !== undefined && { basePriceCents: body.basePriceCents }),
        ...(body.currencyCode !== undefined && { currencyCode: body.currencyCode }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: adminServiceInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Services data is unavailable");
  }
}

export async function disableAdminService(id: string): Promise<AdminServiceRecord | null> {
  const existing = await getAdminServiceById(id);
  if (!existing) return null;

  try {
    return await prisma.service.update({
      where: { id },
      data: { isActive: false },
      include: adminServiceInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Services data is unavailable");
  }
}
