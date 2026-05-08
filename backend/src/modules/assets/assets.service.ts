import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminAssetCreateBody,
  AdminAssetsQuery,
  AdminAssetUpdateBody,
} from "../../validations/admin-assets.schema.js";
import { KINDS_REQUIRING_ALT } from "../../validations/admin-assets.schema.js";
import type { AdminAssetKind } from "../../validations/admin-assets.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";

export class AssetCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "AssetCountryNotFoundError";
  }
}

export class AssetDoctorInvalidError extends Error {
  constructor(message = "Doctor not found or does not match country") {
    super(message);
    this.name = "AssetDoctorInvalidError";
  }
}

export class AssetAltRequiredError extends Error {
  constructor() {
    super("altText is required for this asset kind");
    this.name = "AssetAltRequiredError";
  }
}

const adminAssetInclude = {
  country: { select: { id: true, code: true, name: true } },
  doctor: { select: { id: true, fullName: true, slug: true } },
} satisfies Prisma.AssetInclude;

export type AdminAssetRecord = Prisma.AssetGetPayload<{ include: typeof adminAssetInclude }>;

export type ListAdminAssetsResult = {
  items: AdminAssetRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function kindRequiresAlt(kind: AdminAssetKind): boolean {
  return KINDS_REQUIRING_ALT.includes(kind);
}

function assertAltForKind(kind: AdminAssetKind, altText: string | null | undefined): void {
  if (kindRequiresAlt(kind)) {
    if (altText === null || altText === undefined || String(altText).trim() === "") {
      throw new AssetAltRequiredError();
    }
  }
}

async function assertCountryExistsWhenSet(countryId: string | null | undefined): Promise<void> {
  if (countryId === null || countryId === undefined) return;
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new AssetCountryNotFoundError();
}

/** Resolves country from doctor if needed; returns effective countryId for the row. */
async function resolveCountryAndDoctor(
  countryId: string | null | undefined,
  doctorId: string | null | undefined,
): Promise<{ countryId: string | null; doctorId: string | null }> {
  if (doctorId) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, countryId: true },
    });
    if (!doctor) {
      throw new AssetDoctorInvalidError();
    }
    if (countryId != null && countryId !== doctor.countryId) {
      throw new AssetDoctorInvalidError("Doctor does not belong to the selected country");
    }
    return { countryId: doctor.countryId, doctorId: doctor.id };
  }
  await assertCountryExistsWhenSet(countryId ?? null);
  return { countryId: countryId ?? null, doctorId: null };
}

export async function listAssets() {
  try {
    return await prisma.asset.findMany({
      where: { isActive: true },
      orderBy: [{ kind: "asc" }, { key: "asc" }],
      include: {
        country: true,
        doctor: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Assets data is unavailable");
  }
}

function buildAdminAssetsWhere(query: AdminAssetsQuery): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = {};

  if (query.countryId) {
    where.countryId = query.countryId;
  }
  if (query.countryCode) {
    where.country = { code: query.countryCode };
  }
  if (query.kind) {
    where.kind = query.kind;
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  const term = query.search?.trim();
  if (term && term.length > 0) {
    where.OR = [
      { key: { contains: term, mode: "insensitive" } },
      { path: { contains: term, mode: "insensitive" } },
      { altText: { contains: term, mode: "insensitive" } },
      { usageNote: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listAdminAssets(query: AdminAssetsQuery): Promise<ListAdminAssetsResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const where = buildAdminAssetsWhere(query);

  try {
    const total = await prisma.asset.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const skip = (effectivePage - 1) * pageSize;

    const items = await prisma.asset.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ kind: "asc" }, { key: "asc" }],
      include: adminAssetInclude,
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
    throw normalizeDbError(error, "Assets data is unavailable");
  }
}

export async function getAdminAssetById(id: string): Promise<AdminAssetRecord | null> {
  try {
    return await prisma.asset.findUnique({
      where: { id },
      include: adminAssetInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Assets data is unavailable");
  }
}

export async function createAdminAsset(input: AdminAssetCreateBody): Promise<AdminAssetRecord> {
  const { countryId, doctorId } = await resolveCountryAndDoctor(input.countryId, input.doctorId);

  assertAltForKind(input.kind, input.altText);

  try {
    return await prisma.asset.create({
      data: {
        countryId,
        doctorId,
        kind: input.kind,
        key: input.key.trim(),
        path: input.path.trim(),
        altText: input.altText ?? null,
        usageNote: input.usageNote ?? null,
        isActive: input.isActive ?? true,
      },
      include: adminAssetInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Assets data is unavailable");
  }
}

export async function updateAdminAsset(id: string, body: AdminAssetUpdateBody): Promise<AdminAssetRecord | null> {
  const existing = await prisma.asset.findUnique({
    where: { id },
    select: {
      countryId: true,
      doctorId: true,
      kind: true,
      altText: true,
    },
  });
  if (!existing) return null;

  const nextCountryId = body.countryId !== undefined ? body.countryId : existing.countryId;
  const nextDoctorId = body.doctorId !== undefined ? body.doctorId : existing.doctorId;
  const { countryId: resolvedCountry, doctorId: resolvedDoctor } = await resolveCountryAndDoctor(
    nextCountryId,
    nextDoctorId,
  );

  const nextKind = (body.kind ?? existing.kind) as AdminAssetKind;
  const nextAlt = body.altText !== undefined ? body.altText : existing.altText;
  assertAltForKind(nextKind, nextAlt);

  try {
    return await prisma.asset.update({
      where: { id },
      data: {
        countryId: resolvedCountry,
        doctorId: resolvedDoctor,
        ...(body.kind !== undefined && { kind: body.kind }),
        ...(body.key !== undefined && { key: body.key.trim() }),
        ...(body.path !== undefined && { path: body.path.trim() }),
        ...(body.altText !== undefined && { altText: body.altText }),
        ...(body.usageNote !== undefined && { usageNote: body.usageNote }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: adminAssetInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Assets data is unavailable");
  }
}

export async function disableAdminAsset(id: string): Promise<AdminAssetRecord | null> {
  const existing = await prisma.asset.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  try {
    return await prisma.asset.update({
      where: { id },
      data: { isActive: false },
      include: adminAssetInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Assets data is unavailable");
  }
}

export async function purgeAdminAsset(id: string): Promise<boolean> {
  const existing = await prisma.asset.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  try {
    await prisma.asset.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Assets data is unavailable");
  }
}
