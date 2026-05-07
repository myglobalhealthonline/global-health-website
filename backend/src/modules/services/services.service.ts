import { Prisma, ServiceKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminSpecialtyCreateBody,
  AdminSpecialtyUpdateBody,
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

export class ServiceKindInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceKindInvalidError";
  }
}

export class SpecialtyNotFoundError extends Error {
  constructor() {
    super("Specialty not found");
    this.name = "SpecialtyNotFoundError";
  }
}

const adminServiceInclude = {
  country: { select: { id: true, code: true, name: true } },
  specialty: true,
  assets: {
    where: { isActive: true, kind: "IMAGE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, key: true, path: true, altText: true, usageNote: true },
  },
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
      orderBy: [{ country: { name: "asc" } }, { kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        country: true,
        specialty: true,
        assets: {
          where: { isActive: true, kind: "IMAGE" },
          orderBy: { createdAt: "asc" },
          select: { id: true, kind: true, key: true, path: true, altText: true, usageNote: true },
        },
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Services data is unavailable");
  }
}

export async function listSpecialties() {
  try {
    const items = await prisma.specialty.findMany({
      where: { active: true },
      orderBy: [{ country: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        country: true,
        primaryService: {
          select: {
            id: true,
            slug: true,
            name: true,
            summary: true,
            kind: true,
            durationMinutes: true,
            basePriceCents: true,
            currencyCode: true,
            legacyPath: true,
            isActive: true,
          },
        },
        services: {
          where: { isActive: true, kind: ServiceKind.SPECIALIST },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            slug: true,
            name: true,
            summary: true,
            kind: true,
            durationMinutes: true,
            basePriceCents: true,
            currencyCode: true,
            legacyPath: true,
            isActive: true,
          },
        },
        assets: {
          where: { isActive: true, kind: "IMAGE" },
          orderBy: { createdAt: "asc" },
          select: { id: true, kind: true, key: true, path: true, altText: true, usageNote: true },
        },
      },
    });
    return items.map((item) => ({
      ...item,
      primaryService: item.primaryService?.isActive ? item.primaryService : item.services[0] ?? null,
    }));
  } catch (error) {
    throw normalizeDbError(error, "Specialties data is unavailable");
  }
}

const adminSpecialtyInclude = {
  primaryService: {
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      kind: true,
      durationMinutes: true,
      basePriceCents: true,
      currencyCode: true,
      legacyPath: true,
      isActive: true,
    },
  },
  services: {
    where: { isActive: true, kind: ServiceKind.SPECIALIST },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      kind: true,
      durationMinutes: true,
      basePriceCents: true,
      currencyCode: true,
      legacyPath: true,
      isActive: true,
    },
  },
  assets: {
    where: { isActive: true, kind: "IMAGE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, key: true, path: true, altText: true, usageNote: true },
  },
} satisfies Prisma.SpecialtyInclude;

async function syncOwnedImageAsset(input: {
  owner: { countryId: string; specialtyId?: string; serviceId?: string };
  path: string | null | undefined;
  key: string;
  usageNote: string;
}) {
  const where: Prisma.AssetWhereInput = input.owner.specialtyId
    ? { specialtyId: input.owner.specialtyId, kind: "IMAGE" }
    : { serviceId: input.owner.serviceId, kind: "IMAGE" };

  if (!input.path) {
    await prisma.asset.deleteMany({ where });
    return;
  }

  const existing = await prisma.asset.findFirst({
    where,
    select: { id: true },
  });

  const data = {
    countryId: input.owner.countryId,
    specialtyId: input.owner.specialtyId ?? null,
    serviceId: input.owner.serviceId ?? null,
    doctorId: null,
    kind: "IMAGE" as const,
    key: input.key,
    path: input.path,
    usageNote: input.usageNote,
    isActive: true,
  };

  if (existing) {
    await prisma.asset.update({
      where: { id: existing.id },
      data,
    });
    return;
  }

  await prisma.asset.create({ data });
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

function assertServiceKindForSpecialty(kind: ServiceKind, specialtyId: string | null | undefined): void {
  if (kind === ServiceKind.SPECIALIST && !specialtyId) {
    throw new ServiceKindInvalidError("Specialist services require a specialty");
  }
  if (kind !== ServiceKind.SPECIALIST && specialtyId) {
    throw new ServiceKindInvalidError("Only specialist services can be linked to a specialty");
  }
}

export async function listSpecialtiesForAdminCountry(countryId: string) {
  await assertCountryExists(countryId);
  try {
    const items = await prisma.specialty.findMany({
      where: { countryId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: adminSpecialtyInclude,
    });
    return items.map((item) => ({
      ...item,
      primaryService: item.primaryService?.isActive ? item.primaryService : item.services[0] ?? null,
    }));
  } catch (error) {
    throw normalizeDbError(error, "Specialties data is unavailable");
  }
}

export async function createAdminSpecialty(input: AdminSpecialtyCreateBody) {
  await assertCountryExists(input.countryId);
  try {
    const specialty = await prisma.specialty.create({
      data: {
        countryId: input.countryId,
        slug: input.slug,
        name: input.name,
        ...(input.cardSummary !== undefined && { cardSummary: input.cardSummary }),
        ...(input.cardThemeColor !== undefined && { cardThemeColor: input.cardThemeColor }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        active: input.active ?? true,
      },
      include: adminSpecialtyInclude,
    });
    await syncOwnedImageAsset({
      owner: { countryId: specialty.countryId, specialtyId: specialty.id },
      path: input.imagePath,
      key: `specialty-card:${specialty.id}`,
      usageNote: "Specialty listing card image",
    });
    const record = await prisma.specialty.findUniqueOrThrow({
      where: { id: specialty.id },
      include: adminSpecialtyInclude,
    });
    return {
      ...record,
      primaryService: record.primaryService?.isActive ? record.primaryService : record.services[0] ?? null,
    };
  } catch (error) {
    throw normalizeDbError(error, "Specialties data is unavailable");
  }
}

export async function updateAdminSpecialty(id: string, body: AdminSpecialtyUpdateBody) {
  const existing = await prisma.specialty.findUnique({
    where: { id },
    select: { id: true, countryId: true },
  });
  if (!existing) return null;

  try {
    const specialty = await prisma.specialty.update({
      where: { id },
      data: {
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.cardSummary !== undefined && { cardSummary: body.cardSummary }),
        ...(body.cardThemeColor !== undefined && { cardThemeColor: body.cardThemeColor }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.active !== undefined && { active: body.active }),
      },
      include: adminSpecialtyInclude,
    });
    if (body.imagePath !== undefined) {
      await syncOwnedImageAsset({
        owner: { countryId: existing.countryId, specialtyId: id },
        path: body.imagePath,
        key: `specialty-card:${id}`,
        usageNote: "Specialty listing card image",
      });
    }
    const record = await prisma.specialty.findUniqueOrThrow({
      where: { id: specialty.id },
      include: adminSpecialtyInclude,
    });
    return {
      ...record,
      primaryService: record.primaryService?.isActive ? record.primaryService : record.services[0] ?? null,
    };
  } catch (error) {
    throw normalizeDbError(error, "Specialties data is unavailable");
  }
}

export async function disableAdminSpecialty(id: string) {
  const existing = await prisma.specialty.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;

  try {
    return await prisma.specialty.update({
      where: { id },
      data: { active: false },
      include: adminSpecialtyInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Specialties data is unavailable");
  }
}

function buildAdminServiceWhere(query: AdminServicesQuery): Prisma.ServiceWhereInput {
  const where: Prisma.ServiceWhereInput = {};

  if (query.kind) {
    where.kind = query.kind;
  }
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
      orderBy: [{ country: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
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
  assertServiceKindForSpecialty(input.kind, input.specialtyId);
  if (input.specialtyId) {
    await assertSpecialtyForCountry(input.specialtyId, input.countryId);
  }

  try {
    const service = await prisma.service.create({
      data: {
        countryId: input.countryId,
        kind: input.kind,
        slug: input.slug,
        name: input.name,
        ...(input.summary !== undefined && { summary: input.summary }),
        ...(input.heroTitle !== undefined && { heroTitle: input.heroTitle }),
        ...(input.heroDescription !== undefined && { heroDescription: input.heroDescription }),
        ...(input.detailBody !== undefined && { detailBody: input.detailBody }),
        ...(input.ctaLabel !== undefined && { ctaLabel: input.ctaLabel }),
        ...(input.legacyPath !== undefined && { legacyPath: input.legacyPath }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.specialtyId !== undefined && { specialtyId: input.specialtyId }),
        ...(input.durationMinutes !== undefined && { durationMinutes: input.durationMinutes }),
        ...(input.basePriceCents !== undefined && { basePriceCents: input.basePriceCents }),
        ...(input.currencyCode !== undefined && { currencyCode: input.currencyCode }),
        isActive: input.isActive ?? true,
      },
      include: adminServiceInclude,
    });
    await syncOwnedImageAsset({
      owner: { countryId: input.countryId, serviceId: service.id },
      path: input.imagePath,
      key: `service-hero:${service.id}`,
      usageNote: "Service detail hero image",
    });
    return prisma.service.findUniqueOrThrow({
      where: { id: service.id },
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
    select: { countryId: true, specialtyId: true, kind: true },
  });
  if (!existing) return null;

  const nextCountryId = body.countryId ?? existing.countryId;
  const nextKind = body.kind ?? existing.kind;
  if (body.countryId !== undefined) {
    await assertCountryExists(body.countryId);
  }

  const effectiveSpecialtyId =
    body.specialtyId !== undefined ? body.specialtyId : existing.specialtyId;

  assertServiceKindForSpecialty(nextKind, effectiveSpecialtyId);
  if (effectiveSpecialtyId) {
    await assertSpecialtyForCountry(effectiveSpecialtyId, nextCountryId);
  }

  try {
    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(body.countryId !== undefined && { countryId: body.countryId }),
        ...(body.kind !== undefined && { kind: body.kind }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.summary !== undefined && { summary: body.summary }),
        ...(body.heroTitle !== undefined && { heroTitle: body.heroTitle }),
        ...(body.heroDescription !== undefined && { heroDescription: body.heroDescription }),
        ...(body.detailBody !== undefined && { detailBody: body.detailBody }),
        ...(body.ctaLabel !== undefined && { ctaLabel: body.ctaLabel }),
        ...(body.legacyPath !== undefined && { legacyPath: body.legacyPath }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.specialtyId !== undefined && { specialtyId: body.specialtyId }),
        ...(body.durationMinutes !== undefined && { durationMinutes: body.durationMinutes }),
        ...(body.basePriceCents !== undefined && { basePriceCents: body.basePriceCents }),
        ...(body.currencyCode !== undefined && { currencyCode: body.currencyCode }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: adminServiceInclude,
    });
    if (body.imagePath !== undefined) {
      await syncOwnedImageAsset({
        owner: { countryId: nextCountryId, serviceId: id },
        path: body.imagePath,
        key: `service-hero:${id}`,
        usageNote: "Service detail hero image",
      });
    }
    return prisma.service.findUniqueOrThrow({
      where: { id: service.id },
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
