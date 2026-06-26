import { AssetKind, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

/**
 * Partner organisations shown in the per-country "Our partners" marquee.
 * Admin-managed: name, optional logo (Asset), optional outbound website link.
 */

const partnerInclude = {
  asset: { select: { path: true, altText: true } },
} satisfies Prisma.PartnerInclude;

type PartnerRow = Prisma.PartnerGetPayload<{ include: typeof partnerInclude }>;

export type PublicPartner = {
  id: string;
  name: string;
  websiteUrl: string | null;
  type: string | null;
  logoPath: string | null;
  sortOrder: number;
};

export type AdminPartner = PublicPartner & {
  countryId: string;
  active: boolean;
};

function toPublic(p: PartnerRow): PublicPartner {
  return {
    id: p.id,
    name: p.name,
    websiteUrl: p.websiteUrl,
    type: p.type,
    logoPath: p.asset?.path ?? null,
    sortOrder: p.sortOrder,
  };
}

function toAdmin(p: PartnerRow): AdminPartner {
  return { ...toPublic(p), countryId: p.countryId, active: p.active };
}

export type PartnerWriteInput = {
  name?: string;
  websiteUrl?: string | null;
  type?: string | null;
  /** Uploaded media path; undefined = leave logo as-is, null/"" = clear it. */
  logoImagePath?: string | null;
  sortOrder?: number;
  active?: boolean;
};

/** Keep the logo Asset in sync with the uploaded path (mirrors blog cover). */
async function syncPartnerLogo(
  existingAssetId: string | null,
  logoImagePath: string | null,
  altText: string,
): Promise<string | null> {
  if (!logoImagePath) {
    if (existingAssetId) {
      await prisma.asset.delete({ where: { id: existingAssetId } }).catch(() => {});
    }
    return null;
  }
  if (existingAssetId) {
    await prisma.asset.update({
      where: { id: existingAssetId },
      data: { path: logoImagePath, altText },
    });
    return existingAssetId;
  }
  const asset = await prisma.asset.create({
    data: {
      kind: AssetKind.LOGO,
      key: `partner-logo/${randomUUID()}`,
      path: logoImagePath,
      altText,
    },
  });
  return asset.id;
}

export class PartnerCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "PartnerCountryNotFoundError";
  }
}

/** Public marquee partners for a country (active only). */
export async function listPartnersByCountry(countryCode: string): Promise<PublicPartner[]> {
  try {
    const rows = await prisma.partner.findMany({
      where: { active: true, country: { code: countryCode, isActive: true } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: partnerInclude,
    });
    return rows.map(toPublic);
  } catch (error) {
    throw normalizeDbError(error, "Partners data is unavailable");
  }
}

/** All partners for a country (admin — includes inactive). */
export async function listAdminPartners(countryId: string): Promise<AdminPartner[]> {
  try {
    const rows = await prisma.partner.findMany({
      where: { countryId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: partnerInclude,
    });
    return rows.map(toAdmin);
  } catch (error) {
    throw normalizeDbError(error, "Partners data is unavailable");
  }
}

export async function createPartner(
  countryId: string,
  input: PartnerWriteInput & { name: string },
): Promise<AdminPartner> {
  const country = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!country) throw new PartnerCountryNotFoundError();
  try {
    const assetId = await syncPartnerLogo(null, input.logoImagePath ?? null, input.name);
    const row = await prisma.partner.create({
      data: {
        countryId,
        name: input.name,
        websiteUrl: input.websiteUrl ?? null,
        type: input.type ?? null,
        sortOrder: input.sortOrder ?? 0,
        active: input.active ?? true,
        assetId,
      },
      include: partnerInclude,
    });
    return toAdmin(row);
  } catch (error) {
    throw normalizeDbError(error, "Could not create partner");
  }
}

export async function updatePartner(
  id: string,
  input: PartnerWriteInput,
): Promise<AdminPartner | null> {
  const existing = await prisma.partner.findUnique({
    where: { id },
    select: { id: true, assetId: true, name: true },
  });
  if (!existing) return null;
  try {
    let assetId = existing.assetId;
    if (input.logoImagePath !== undefined) {
      assetId = await syncPartnerLogo(
        existing.assetId,
        input.logoImagePath ?? null,
        input.name ?? existing.name,
      );
    }
    const row = await prisma.partner.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.active !== undefined && { active: input.active }),
        ...(input.logoImagePath !== undefined && { assetId }),
      },
      include: partnerInclude,
    });
    return toAdmin(row);
  } catch (error) {
    throw normalizeDbError(error, "Could not update partner");
  }
}

export async function deletePartner(id: string): Promise<boolean> {
  const existing = await prisma.partner.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  try {
    await prisma.partner.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Could not delete partner");
  }
}
