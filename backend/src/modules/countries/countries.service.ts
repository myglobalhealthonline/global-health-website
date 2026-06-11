import { Prisma } from "@prisma/client";
import type { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminCountryCreateBody,
  AdminCountryUpdateBody,
  CountryLegalProfileBody,
  CountryLegalDocumentBody,
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
  // Per-country BookingSetting (booking gate + intake rules). Surfaced
  // so the admin country edit page can render + edit these fields.
  // Optional one-to-one; `null` means "use schema defaults".
  bookingSetting: true,
} satisfies Prisma.CountryInclude;

export type AdminCountryRecord = Prisma.CountryGetPayload<{ include: typeof adminCountryInclude }>;

export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Lookup an active country by 2-letter code (`ie`, `pt`, `sp`, `cz`, `rm`).
 * Used by country-scoped public routes to 404 when an unknown code is
 * supplied instead of returning a misleading empty list.
 */
export async function getPublicCountryByCode(code: string): Promise<{ id: string; code: string } | null> {
  const country = await prisma.country.findFirst({
    where: { code: { equals: code, mode: "insensitive" }, isActive: true },
    select: { id: true, code: true },
  });
  return country;
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
        // Clinic timezone drives patient-facing slot display. Only the
        // timezone is public; the booking-intake flags stay admin-only.
        bookingSetting: { select: { timezone: true } },
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
          ...(body.enabledFeatures !== undefined && { enabledFeatures: body.enabledFeatures }),
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

      // BookingSetting — upsert when the admin form posted any of the
      // fields. `undefined` means leave the row alone; partial values
      // merge into the existing row (or schema defaults on first create).
      if (body.bookingSetting !== undefined) {
        const bs = body.bookingSetting;
        await tx.bookingSetting.upsert({
          where: { countryId: id },
          create: {
            countryId: id,
            ...(bs.bookingEnabled !== undefined && { bookingEnabled: bs.bookingEnabled }),
            ...(bs.requirePhone !== undefined && { requirePhone: bs.requirePhone }),
            ...(bs.requireDateOfBirth !== undefined && { requireDateOfBirth: bs.requireDateOfBirth }),
            ...(bs.timezone !== undefined && { timezone: bs.timezone }),
          },
          update: {
            ...(bs.bookingEnabled !== undefined && { bookingEnabled: bs.bookingEnabled }),
            ...(bs.requirePhone !== undefined && { requirePhone: bs.requirePhone }),
            ...(bs.requireDateOfBirth !== undefined && { requireDateOfBirth: bs.requireDateOfBirth }),
            ...(bs.timezone !== undefined && { timezone: bs.timezone }),
          },
        });
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

// ── CountryLegalProfile ────────────────────────────────────────────────────

export async function getCountryLegalProfile(countryId: string) {
  try {
    return await prisma.countryLegalProfile.findUnique({ where: { countryId } });
  } catch (error) {
    throw normalizeDbError(error, "Legal profile unavailable");
  }
}

export async function upsertCountryLegalProfile(countryId: string, data: CountryLegalProfileBody) {
  try {
    return await prisma.countryLegalProfile.upsert({
      where: { countryId },
      create: { countryId, ...data },
      update: data,
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not save legal profile");
  }
}

// ── CountryLegalDocument ───────────────────────────────────────────────────

export async function listCountryLegalDocuments(countryId: string) {
  try {
    return await prisma.countryLegalDocument.findMany({
      where: { countryId },
      orderBy: [{ type: "asc" }, { locale: "asc" }],
    });
  } catch (error) {
    throw normalizeDbError(error, "Legal documents unavailable");
  }
}

export async function getCountryLegalDocument(countryId: string, type: string, locale: string) {
  try {
    return await prisma.countryLegalDocument.findUnique({
      where: { countryId_type_locale: { countryId, type: type as never, locale } },
    });
  } catch (error) {
    throw normalizeDbError(error, "Legal document unavailable");
  }
}

export async function upsertCountryLegalDocument(countryId: string, data: CountryLegalDocumentBody) {
  try {
    return await prisma.countryLegalDocument.upsert({
      where: { countryId_type_locale: { countryId, type: data.type, locale: data.locale } },
      create: { countryId, ...data },
      update: {
        title: data.title,
        content: data.content,
        pdfPath: data.pdfPath,
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date() : null,
        version: { increment: 1 },
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not save legal document");
  }
}

export async function deleteCountryLegalDocument(id: string): Promise<boolean> {
  const existing = await prisma.countryLegalDocument.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  try {
    await prisma.countryLegalDocument.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Could not delete legal document");
  }
}

// ── Public legal reads (visitor-facing) ─────────────────────────────────────

/** Fields of CountryLegalProfile that are safe to show on the public site.
 *  Excludes internal-only contacts (billingEmail). */
const PUBLIC_LEGAL_PROFILE_SELECT = {
  legalCompanyName: true,
  legalAddress: true,
  publicPhones: true,
  publicEmails: true,
  supportEmail: true,
  companyRegistrationNumber: true,
  taxVatNumber: true,
  medicalRegistrationNumber: true,
  healthcareLicenseDetails: true,
  regulatorName: true,
  regulatorWebsite: true,
  companyRegistryUrl: true,
  medicalRegulatorUrl: true,
  healthcareAuthorityUrl: true,
  dataProtectionAuthorityUrl: true,
  disputeResolutionUrl: true,
  consumerProtectionUrl: true,
  dataProtectionLawName: true,
  dataProtectionPolicyTitle: true,
  dpoName: true,
  dpoEmail: true,
  disputeBodyName: true,
  disputeEmail: true,
  disputePhone: true,
  disputeProcessText: true,
  legalJurisdictionText: true,
  consumerRightsText: true,
} satisfies Prisma.CountryLegalProfileSelect;

/** Legal profile + published document index for one active country. */
export async function getPublicCountryLegal(code: string) {
  try {
    return await prisma.country.findFirst({
      where: { code: { equals: code, mode: "insensitive" }, isActive: true },
      select: {
        code: true,
        name: true,
        legalProfile: { select: PUBLIC_LEGAL_PROFILE_SELECT },
        legalDocuments: {
          where: { isPublished: true },
          select: {
            type: true,
            title: true,
            locale: true,
            version: true,
            publishedAt: true,
            updatedAt: true,
            pdfPath: true,
          },
          orderBy: [{ type: "asc" }, { locale: "asc" }],
        },
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Legal information unavailable");
  }
}

/** One published legal document with locale fallback: exact match → "en" →
 *  any published locale. Returns null when the country is inactive/unknown
 *  or no published document of that type exists. */
export async function getPublicCountryLegalDocument(
  code: string,
  type: CountryLegalDocumentBody["type"],
  locale: string,
) {
  try {
    const country = await prisma.country.findFirst({
      where: { code: { equals: code, mode: "insensitive" }, isActive: true },
      select: { id: true, code: true, name: true },
    });
    if (!country) return null;

    const candidates = await prisma.countryLegalDocument.findMany({
      where: { countryId: country.id, type, isPublished: true },
      orderBy: { locale: "asc" },
    });
    if (candidates.length === 0) return null;

    const wanted = locale.trim().toLowerCase();
    const doc =
      candidates.find((d) => d.locale.toLowerCase() === wanted) ??
      candidates.find((d) => d.locale.toLowerCase() === "en") ??
      candidates[0];
    return { country: { code: country.code, name: country.name }, document: doc };
  } catch (error) {
    throw normalizeDbError(error, "Legal document unavailable");
  }
}
