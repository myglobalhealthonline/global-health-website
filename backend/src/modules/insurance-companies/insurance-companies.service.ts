import { InsurancePricingMode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { resolveInsurancePrice } from "../pricing/insurance-pricing.service.js";

export type InsuranceCompanyInput = {
  name: string;
  pricingMode: InsurancePricingMode;
  discountPercent?: number | null;
  isActive?: boolean;
  sortOrder?: number;
};

const COMPANY_SELECT = {
  id: true,
  countryId: true,
  name: true,
  pricingMode: true,
  discountPercent: true,
  isActive: true,
  sortOrder: true,
} as const;

/** Normalize a company's pricing fields: PERCENT keeps its percent, FIXED drops it. */
function normalizePricing(mode: InsurancePricingMode, discountPercent?: number | null) {
  return mode === InsurancePricingMode.PERCENT
    ? { pricingMode: mode, discountPercent: discountPercent ?? 0 }
    : { pricingMode: mode, discountPercent: null };
}

export async function listInsuranceCompanies(countryId: string) {
  try {
    return await prisma.insuranceCompany.findMany({
      where: { countryId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { ...COMPANY_SELECT, _count: { select: { coverages: true } } },
    });
  } catch (error) {
    throw normalizeDbError(error, "Insurance companies unavailable");
  }
}

export async function createInsuranceCompany(countryId: string, input: InsuranceCompanyInput) {
  const country = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!country) return null;
  try {
    return await prisma.insuranceCompany.create({
      data: {
        countryId,
        name: input.name,
        ...normalizePricing(input.pricingMode, input.discountPercent),
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
      select: COMPANY_SELECT,
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not create insurance company");
  }
}

export async function updateInsuranceCompany(id: string, input: Partial<InsuranceCompanyInput>) {
  const existing = await prisma.insuranceCompany.findUnique({
    where: { id },
    select: { id: true, pricingMode: true },
  });
  if (!existing) return null;
  // If the mode changes, re-normalize the percent for the NEW mode.
  const nextMode = input.pricingMode ?? existing.pricingMode;
  const pricing =
    input.pricingMode !== undefined || input.discountPercent !== undefined
      ? normalizePricing(nextMode, input.discountPercent)
      : {};
  try {
    return await prisma.insuranceCompany.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...pricing,
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
      select: COMPANY_SELECT,
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not update insurance company");
  }
}

export async function deleteInsuranceCompany(id: string): Promise<boolean> {
  const existing = await prisma.insuranceCompany.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  try {
    await prisma.insuranceCompany.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Could not delete insurance company");
  }
}

export type CoverageServiceRow = {
  serviceId: string;
  name: string;
  basePriceCents: number | null;
  currencyCode: string | null;
  covered: boolean;
  overridePriceCents: number | null;
  /** Resolved insurance price for display (FIXED override or PERCENT-computed). */
  insurancePriceCents: number | null;
};

/**
 * Every active service in the company's country, LEFT-joined with this
 * company's coverage state. Drives the admin coverage editor: which services
 * the company covers + the per-service price (typed for FIXED, computed for
 * PERCENT).
 */
export async function listCountryServicesWithCoverage(
  countryId: string,
  companyId: string,
): Promise<{ companyId: string; pricingMode: InsurancePricingMode; discountPercent: number | null; services: CoverageServiceRow[] } | null> {
  const company = await prisma.insuranceCompany.findFirst({
    where: { id: companyId, countryId },
    select: { id: true, pricingMode: true, discountPercent: true },
  });
  if (!company) return null;
  try {
    const [services, coverages] = await Promise.all([
      prisma.service.findMany({
        where: { countryId, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          basePriceCents: true,
          currencyCode: true,
          country: { select: { currency: { select: { code: true } } } },
        },
      }),
      prisma.insuranceServiceCoverage.findMany({
        where: { insuranceCompanyId: companyId },
        select: { serviceId: true, overridePriceCents: true },
      }),
    ]);
    const coverageByServiceId = new Map(coverages.map((c) => [c.serviceId, c]));
    const rows: CoverageServiceRow[] = services.map((svc) => {
      const cov = coverageByServiceId.get(svc.id);
      const covered = cov !== undefined;
      const insurancePriceCents =
        covered && svc.basePriceCents != null
          ? resolveInsurancePrice({
              basePriceCents: svc.basePriceCents,
              company,
              coverage: { overridePriceCents: cov?.overridePriceCents ?? null },
            })
          : null;
      return {
        serviceId: svc.id,
        name: svc.name,
        basePriceCents: svc.basePriceCents,
        currencyCode: svc.currencyCode ?? svc.country.currency.code,
        covered,
        overridePriceCents: cov?.overridePriceCents ?? null,
        insurancePriceCents,
      };
    });
    return {
      companyId: company.id,
      pricingMode: company.pricingMode,
      discountPercent: company.discountPercent,
      services: rows,
    };
  } catch (error) {
    throw normalizeDbError(error, "Could not load service coverage");
  }
}

export type CoverageInputItem = {
  serviceId: string;
  covered: boolean;
  /** FIXED companies only — the admin-typed price. Ignored for PERCENT. */
  overridePriceCents?: number | null;
};

/**
 * Replace a company's full coverage set in one transaction. Covered services
 * are upserted (FIXED carries its per-service override; PERCENT stores null and
 * derives at read time); un-covered services have their coverage row removed.
 * Services from other countries are rejected so a company can never cover a
 * service outside its market.
 */
export async function setCompanyCoverage(
  companyId: string,
  items: CoverageInputItem[],
): Promise<boolean> {
  const company = await prisma.insuranceCompany.findUnique({
    where: { id: companyId },
    select: { id: true, countryId: true, pricingMode: true },
  });
  if (!company) return false;

  const covered = items.filter((i) => i.covered);
  const serviceIds = covered.map((i) => i.serviceId);
  // Validate every covered service belongs to the company's country.
  if (serviceIds.length > 0) {
    const valid = await prisma.service.count({
      where: { id: { in: serviceIds }, countryId: company.countryId },
    });
    if (valid !== serviceIds.length) {
      throw new Error("One or more services do not belong to this company's country");
    }
  }
  const isFixed = company.pricingMode === InsurancePricingMode.FIXED;

  try {
    await prisma.$transaction(async (tx) => {
      // Drop coverage for services no longer selected.
      await tx.insuranceServiceCoverage.deleteMany({
        where: {
          insuranceCompanyId: companyId,
          ...(serviceIds.length > 0 ? { serviceId: { notIn: serviceIds } } : {}),
        },
      });
      for (const item of covered) {
        const overridePriceCents = isFixed ? item.overridePriceCents ?? null : null;
        await tx.insuranceServiceCoverage.upsert({
          where: {
            insuranceCompanyId_serviceId: {
              insuranceCompanyId: companyId,
              serviceId: item.serviceId,
            },
          },
          create: { insuranceCompanyId: companyId, serviceId: item.serviceId, overridePriceCents },
          update: { overridePriceCents },
        });
      }
    });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Could not save service coverage");
  }
}
