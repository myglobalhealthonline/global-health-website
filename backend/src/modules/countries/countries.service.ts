import { Prisma } from "@prisma/client";
import type { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminCountryCreateBody,
  AdminCountryUpdateBody,
} from "../../validations/admin-countries.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";

export class CountryCurrencyNotFoundError extends Error {
  constructor() {
    super("Currency not found");
    this.name = "CountryCurrencyNotFoundError";
  }
}

export class CountryLocaleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CountryLocaleValidationError";
  }
}

const adminCountryInclude = {
  currency: true,
  countryLocales: { orderBy: { locale: "asc" as const } },
  domains: { orderBy: { domain: "asc" as const } },
} satisfies Prisma.CountryInclude;

export type AdminCountryRecord = Prisma.CountryGetPayload<{ include: typeof adminCountryInclude }>;

export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function listCountries() {
  try {
    return await prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        currency: true,
        countryLocales: {
          orderBy: { locale: "asc" },
        },
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Countries data is unavailable");
  }
}

export async function listAdminCurrencies() {
  try {
    return await prisma.currency.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, symbol: true, decimals: true },
    });
  } catch (error) {
    throw normalizeDbError(error, "Currencies data is unavailable");
  }
}

export async function listAdminCountries(): Promise<AdminCountryRecord[]> {
  try {
    return await prisma.country.findMany({
      orderBy: { name: "asc" },
      include: adminCountryInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Countries data is unavailable");
  }
}

export async function getAdminCountryById(id: string): Promise<AdminCountryRecord | null> {
  try {
    return await prisma.country.findUnique({
      where: { id },
      include: adminCountryInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Countries data is unavailable");
  }
}

function normalizePrimaryDomains(
  domains: { domain: string; isPrimary?: boolean }[],
): { domain: string; isPrimary: boolean }[] {
  const trimmed = domains.map((d) => ({
    domain: d.domain.trim(),
    isPrimary: d.isPrimary === true,
  }));
  if (trimmed.length === 0) return [];
  const primaryCount = trimmed.filter((d) => d.isPrimary).length;
  if (primaryCount === 0) {
    return trimmed.map((d, i) => ({ domain: d.domain, isPrimary: i === 0 }));
  }
  return trimmed;
}

export async function createAdminCountry(input: AdminCountryCreateBody): Promise<AdminCountryRecord> {
  const currency = await prisma.currency.findUnique({ where: { id: input.currencyId } });
  if (!currency) {
    throw new CountryCurrencyNotFoundError();
  }

  const domains = normalizePrimaryDomains(input.domains ?? []);

  try {
    return await prisma.$transaction(async (tx) => {
      const country = await tx.country.create({
        data: {
          code: input.code,
          name: input.name,
          slug: input.slug,
          legacyHomePath: input.legacyHomePath,
          teamPath: input.teamPath,
          generalConsultationPath: input.generalConsultationPath,
          specialistConsultationPath: input.specialistConsultationPath,
          defaultLocale: input.defaultLocale,
          currencyId: input.currencyId,
          isActive: input.isActive ?? true,
          countryLocales: {
            create: input.supportedLocales.map((locale) => ({
              locale,
              isDefault: locale === input.defaultLocale,
            })),
          },
          domains:
            domains.length > 0
              ? {
                  create: domains.map((d) => ({
                    domain: d.domain,
                    isPrimary: d.isPrimary,
                  })),
                }
              : undefined,
        },
        include: adminCountryInclude,
      });
      return country;
    });
  } catch (error) {
    throw normalizeDbError(error, "Countries data is unavailable");
  }
}

export async function updateAdminCountry(
  id: string,
  body: AdminCountryUpdateBody,
): Promise<AdminCountryRecord | null> {
  const existing = await prisma.country.findUnique({
    where: { id },
    include: { countryLocales: true },
  });

  if (!existing) return null;

  if (body.currencyId !== undefined) {
    const currency = await prisma.currency.findUnique({ where: { id: body.currencyId } });
    if (!currency) {
      throw new CountryCurrencyNotFoundError();
    }
  }

  const shouldPatchLocales =
    body.supportedLocales !== undefined || body.defaultLocale !== undefined;

  let localeCodes: LocaleCode[];
  if (body.supportedLocales !== undefined) {
    localeCodes = body.supportedLocales;
  } else {
    localeCodes = existing.countryLocales.map((row) => row.locale);
  }

  const effectiveDefault: LocaleCode = body.defaultLocale ?? existing.defaultLocale;

  if (shouldPatchLocales && !localeCodes.includes(effectiveDefault)) {
    throw new CountryLocaleValidationError(
      "defaultLocale must be included in supportedLocales (after merge)",
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.country.update({
        where: { id },
        data: {
          ...(body.code !== undefined && { code: body.code }),
          ...(body.name !== undefined && { name: body.name }),
          ...(body.slug !== undefined && { slug: body.slug }),
          ...(body.legacyHomePath !== undefined && { legacyHomePath: body.legacyHomePath }),
          ...(body.teamPath !== undefined && { teamPath: body.teamPath }),
          ...(body.generalConsultationPath !== undefined && {
            generalConsultationPath: body.generalConsultationPath,
          }),
          ...(body.specialistConsultationPath !== undefined && {
            specialistConsultationPath: body.specialistConsultationPath,
          }),
          ...(body.defaultLocale !== undefined && { defaultLocale: body.defaultLocale }),
          ...(body.currencyId !== undefined && { currencyId: body.currencyId }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });

      if (shouldPatchLocales) {
        await tx.countryLocale.deleteMany({ where: { countryId: id } });
        await tx.countryLocale.createMany({
          data: localeCodes.map((locale) => ({
            countryId: id,
            locale,
            isDefault: locale === effectiveDefault,
          })),
        });
      }

      if (body.domains !== undefined) {
        const normalized = normalizePrimaryDomains(body.domains);
        await tx.countryDomain.deleteMany({ where: { countryId: id } });
        if (normalized.length > 0) {
          await tx.countryDomain.createMany({
            data: normalized.map((d) => ({
              countryId: id,
              domain: d.domain,
              isPrimary: d.isPrimary,
            })),
          });
        }
      }

      const updated = await tx.country.findUnique({
        where: { id },
        include: adminCountryInclude,
      });
      if (!updated) throw new Error("Country missing after update");
      return updated;
    });
  } catch (error) {
    throw normalizeDbError(error, "Countries data is unavailable");
  }
}

export async function disableAdminCountry(id: string): Promise<AdminCountryRecord | null> {
  const existing = await getAdminCountryById(id);
  if (!existing) return null;

  try {
    return await prisma.country.update({
      where: { id },
      data: { isActive: false },
      include: adminCountryInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Countries data is unavailable");
  }
}

export async function purgeAdminCountry(id: string): Promise<boolean> {
  const existing = await prisma.country.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  try {
    await prisma.country.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Countries data is unavailable");
  }
}
