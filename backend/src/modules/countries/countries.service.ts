import { Prisma } from "@prisma/client";
import type { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminCountryCreateBody,
  AdminCountryUpdateBody,
  CountryLegalProfileBody,
  CountryLegalDocumentBody,
  CountryLegalProfileTrustTranslationUpsertInput,
} from "../../validations/admin-countries.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { assertLocaleSupported, LocaleNotSupportedError } from "../shared/locale-support.js";
import { resolveTranslation } from "../shared/resolve-translation.js";
import type { DisclaimerTranslationInput } from "../../validations/admin-countries.schema.js";

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

/** Thrown when a translation write targets a legal profile that doesn't
 *  exist yet — mirrors the footer's "save the base footer before adding a
 *  translation" guard (there's no base row to override). */
export class LegalProfileMissingError extends Error {
  constructor(message = "Save the base legal profile before adding a translation") {
    super(message);
    this.name = "LegalProfileMissingError";
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
 * Lookup an active country by code (`ie`, `pt`, `es`, `cz`, `rm`; legacy aliases may exist).
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
        // Clinic timezone drives patient-facing slot display. The intake
        // requiredness flags are public too — the storefront booking form
        // needs them to mark phone/DOB/address/national-ID as required (or
        // not) instead of guessing, which previously caused a mismatch
        // between the form's "(optional)" label and the server's 400.
        bookingSetting: {
          select: {
            timezone: true,
            requirePhone: true,
            requireDateOfBirth: true,
            requireNationalId: true,
            requireAddress: true,
            collectUtenteNumber: true,
          },
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
          ...(input.accessModel !== undefined && { accessModel: input.accessModel }),
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
          ...(body.accessModel !== undefined && { accessModel: body.accessModel }),
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
    return await prisma.countryLegalProfile.findUnique({
      where: { countryId },
      // trustTranslations included additively alongside the pre-existing
      // disclaimerTranslations — same row shape, extra field — so the admin
      // UI can later prefill a per-locale trust-bar edit form.
      include: { disclaimerTranslations: true, trustTranslations: true },
    });
  } catch (error) {
    throw normalizeDbError(error, "Legal profile unavailable");
  }
}

/** Upsert per-locale disclaimer overrides. Additive per submitted locale; an
 *  entry whose fields are both empty removes the row so that locale falls back
 *  to the default-locale base columns. Locale must be enabled for the country
 *  (or be its default) — throws LocaleNotSupportedError otherwise. */
async function upsertDisclaimerTranslations(
  countryId: string,
  legalProfileId: string,
  translations: DisclaimerTranslationInput[],
): Promise<void> {
  await Promise.all(
    translations.map((entry) => assertLocaleSupported(countryId, entry.locale)),
  );
  await prisma.$transaction(
    translations.map((entry) => {
      const shortDisclaimer = entry.shortDisclaimer ?? null;
      const fullDisclaimer = entry.fullDisclaimer ?? null;
      if (!shortDisclaimer && !fullDisclaimer) {
        return prisma.countryDisclaimerTranslation.deleteMany({
          where: { legalProfileId, locale: entry.locale },
        });
      }
      const row = { shortDisclaimer, fullDisclaimer };
      return prisma.countryDisclaimerTranslation.upsert({
        where: { legalProfileId_locale: { legalProfileId, locale: entry.locale } },
        create: { legalProfileId, locale: entry.locale, ...row },
        update: row,
      });
    }),
  );
}

export async function upsertCountryLegalProfile(countryId: string, data: CountryLegalProfileBody) {
  const { disclaimerTranslations, ...profileData } = data;
  try {
    const profile = await prisma.countryLegalProfile.upsert({
      where: { countryId },
      create: { countryId, ...profileData },
      update: profileData,
    });
    if (disclaimerTranslations !== undefined) {
      await upsertDisclaimerTranslations(countryId, profile.id, disclaimerTranslations);
    }
    return await prisma.countryLegalProfile.findUniqueOrThrow({
      where: { id: profile.id },
      include: { disclaimerTranslations: true, trustTranslations: true },
    });
  } catch (error) {
    // Locale-support rejection is a client error (400), not a DB failure.
    if (error instanceof LocaleNotSupportedError) throw error;
    throw normalizeDbError(error, "Could not save legal profile");
  }
}

/**
 * Upsert one non-default-locale override of the legal profile's
 * translatable trust-bar text (regulatorName, providerRegistrationLabel,
 * emergencyNotice, dataProtectionLawName). `locale === country.defaultLocale`
 * writes the base CountryLegalProfile columns instead — mirrors
 * CountryFooterTranslation's PUT handler. Throws LegalProfileMissingError
 * when no base row exists yet (nothing to override).
 */
export async function upsertCountryLegalProfileTrustTranslation(
  countryId: string,
  data: CountryLegalProfileTrustTranslationUpsertInput,
) {
  const { locale, ...fields } = data;
  const country = await prisma.country.findUnique({
    where: { id: countryId },
    select: { defaultLocale: true },
  });
  if (!country) return null;
  const profile = await prisma.countryLegalProfile.findUnique({
    where: { countryId },
    select: { id: true },
  });
  if (!profile) throw new LegalProfileMissingError();

  await assertLocaleSupported(countryId, locale);
  try {
    if (locale === country.defaultLocale) {
      await prisma.countryLegalProfile.update({
        where: { id: profile.id },
        data: {
          ...(fields.regulatorName !== undefined && { regulatorName: fields.regulatorName }),
          ...(fields.providerRegistrationLabel !== undefined && {
            providerRegistrationLabel: fields.providerRegistrationLabel,
          }),
          ...(fields.emergencyNotice !== undefined && { emergencyNotice: fields.emergencyNotice }),
          ...(fields.dataProtectionLawName !== undefined && {
            dataProtectionLawName: fields.dataProtectionLawName,
          }),
        },
      });
    } else {
      await prisma.countryLegalProfileTrustTranslation.upsert({
        where: { legalProfileId_locale: { legalProfileId: profile.id, locale } },
        create: { legalProfileId: profile.id, locale, ...fields },
        update: fields,
      });
    }
    return await prisma.countryLegalProfile.findUniqueOrThrow({
      where: { id: profile.id },
      include: { disclaimerTranslations: true, trustTranslations: true },
    });
  } catch (error) {
    if (error instanceof LocaleNotSupportedError) throw error;
    throw normalizeDbError(error, "Could not save legal profile translation");
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
  providerRegistrationLabel: true,
  providerRegistrationNumber: true,
  providerRegistrationUrl: true,
  emergencyNumber: true,
  emergencyNotice: true,
  nonEmergencyHealthLine: true,
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
  shortDisclaimer: true,
  fullDisclaimer: true,
  disclaimerTranslations: {
    select: { locale: true, shortDisclaimer: true, fullDisclaimer: true },
  },
} satisfies Prisma.CountryLegalProfileSelect;

/** Public projection of a CountryAuthorityLink row (official regulator /
 *  authority with its verification URL). */
const PUBLIC_AUTHORITY_LINK_SELECT = {
  name: true,
  abbreviation: true,
  url: true,
  category: true,
  description: true,
  showInFooter: true,
  showInSchema: true,
} satisfies Prisma.CountryAuthorityLinkSelect;

const publicAuthorityLinksArgs = {
  where: { isActive: true },
  orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }],
  select: PUBLIC_AUTHORITY_LINK_SELECT,
} satisfies Prisma.Country$authorityLinksArgs;

/** Same as publicAuthorityLinksArgs but also pulls the translation rows,
 *  for callers that merge a requested locale (getPublicCountryTrust). */
const PUBLIC_AUTHORITY_LINK_SELECT_WITH_TRANSLATIONS = {
  ...PUBLIC_AUTHORITY_LINK_SELECT,
  translations: {
    select: { locale: true, name: true, abbreviation: true, description: true },
  },
} satisfies Prisma.CountryAuthorityLinkSelect;

type PublicAuthorityLinkWithTranslations = Prisma.CountryAuthorityLinkGetPayload<{
  select: typeof PUBLIC_AUTHORITY_LINK_SELECT_WITH_TRANSLATIONS;
}>;

/** True for Prisma's "table does not exist" error (P2021) — i.e. a
 *  *Translation migration hasn't been applied to this database yet. Callers
 *  use this to fail soft (serve the untranslated base row) instead of 500ing
 *  the whole request just because a locale was requested. */
function isMissingTableError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021"
  );
}

/** Merges one authority link's translatable text with the best translation
 *  for the requested locale (requested -> country default -> base columns). */
function mergeAuthorityLinkTranslation(
  link: PublicAuthorityLinkWithTranslations,
  requested: LocaleCode,
  defaultLocale: LocaleCode,
) {
  const { tr } = resolveTranslation(link.translations, requested, defaultLocale);
  const { translations: _translations, ...rest } = link;
  return {
    ...rest,
    name: tr?.name ?? link.name,
    abbreviation: tr?.abbreviation ?? link.abbreviation,
    description: tr?.description ?? link.description,
  };
}

/** Legal profile + published document index + authority links for one active country. */
export async function getPublicCountryLegal(code: string) {
  try {
    return await prisma.country.findFirst({
      where: { code: { equals: code, mode: "insensitive" }, isActive: true },
      select: {
        code: true,
        name: true,
        legalProfile: { select: PUBLIC_LEGAL_PROFILE_SELECT },
        authorityLinks: publicAuthorityLinksArgs,
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
      // Explicit select keeps internal fields (id, countryId) out of the
      // public payload even if a future route spreads the document object.
      select: {
        type: true,
        title: true,
        content: true,
        pdfPath: true,
        locale: true,
        version: true,
        publishedAt: true,
        updatedAt: true,
      },
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

/**
 * Lightweight trust payload for the footer trust bar + Organization/
 * MedicalBusiness schema. SSR'd by the Next layout for every public page in
 * a `/[country]/[lang]/*` scope, so it is intentionally minimal: provider
 * registration (ERS for Portugal), emergency signposting, and the country's
 * official authority links. Returns null when the country is unknown/inactive.
 *
 * `locale` is optional and additive: omitted -> current behavior (country
 * default-locale copy from the base columns). When supplied, translatable
 * text fields (regulatorName, providerRegistrationLabel, emergencyNotice,
 * dataProtectionLawName, and each authority link's name/abbreviation/
 * description) resolve via the requested -> country-default -> base-column
 * fallback chain (resolve-translation.ts). URLs/numbers/IDs never change
 * per locale and always come from the base row.
 */
export async function getPublicCountryTrust(code: string, locale?: LocaleCode) {
  try {
    // Base select stays exactly as it was before translations existed (no
    // trustTranslations, no authority-link translations) so this query
    // never touches the new *Translation tables — those only exist once
    // their migration has been applied to a given database. The
    // translation lookups below run separately and fail soft (see
    // isMissingTableError) so a `?locale=` request degrades to the base
    // row instead of 500ing when the migration isn't applied yet.
    const country = await prisma.country.findFirst({
      where: { code: { equals: code, mode: "insensitive" }, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        defaultLocale: true,
        legalProfile: {
          select: {
            id: true,
            regulatorName: true,
            regulatorWebsite: true,
            providerRegistrationLabel: true,
            providerRegistrationNumber: true,
            providerRegistrationUrl: true,
            emergencyNumber: true,
            emergencyNotice: true,
            nonEmergencyHealthLine: true,
            dataProtectionLawName: true,
          },
        },
        authorityLinks: publicAuthorityLinksArgs,
      },
    });
    if (!country) return null;
    const requested = locale ?? country.defaultLocale;
    const p = country.legalProfile;

    let trustTranslations: Prisma.CountryLegalProfileTrustTranslationGetPayload<{
      select: {
        locale: true;
        regulatorName: true;
        providerRegistrationLabel: true;
        emergencyNotice: true;
        dataProtectionLawName: true;
      };
    }>[] = [];
    let authorityLinksWithTranslations: PublicAuthorityLinkWithTranslations[] | null = null;
    if (locale) {
      try {
        [trustTranslations, authorityLinksWithTranslations] = await Promise.all([
          p
            ? prisma.countryLegalProfileTrustTranslation.findMany({
                where: { legalProfileId: p.id },
                select: {
                  locale: true,
                  regulatorName: true,
                  providerRegistrationLabel: true,
                  emergencyNotice: true,
                  dataProtectionLawName: true,
                },
              })
            : Promise.resolve([]),
          prisma.countryAuthorityLink.findMany({
            where: { countryId: country.id, isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: PUBLIC_AUTHORITY_LINK_SELECT_WITH_TRANSLATIONS,
          }),
        ]);
      } catch (error) {
        if (!isMissingTableError(error)) throw error;
        // Migration not applied yet — fall back to the base (untranslated)
        // row/links fetched above.
        trustTranslations = [];
        authorityLinksWithTranslations = null;
      }
    }

    const trustTr = resolveTranslation(trustTranslations, requested, country.defaultLocale);
    const regulatorName = trustTr.tr?.regulatorName ?? p?.regulatorName ?? null;
    const providerRegistrationLabel =
      trustTr.tr?.providerRegistrationLabel ?? p?.providerRegistrationLabel ?? null;
    const emergencyNotice = trustTr.tr?.emergencyNotice ?? p?.emergencyNotice ?? null;
    const dataProtectionLawName =
      trustTr.tr?.dataProtectionLawName ?? p?.dataProtectionLawName ?? "GDPR";
    const authorityLinks = authorityLinksWithTranslations
      ? authorityLinksWithTranslations.map((link) =>
          mergeAuthorityLinkTranslation(link, requested, country.defaultLocale),
        )
      : country.authorityLinks;
    return {
      country: { code: country.code, name: country.name },
      regulator:
        regulatorName || p?.regulatorWebsite
          ? { name: regulatorName, url: p?.regulatorWebsite ?? null }
          : null,
      providerRegistration:
        p?.providerRegistrationNumber || providerRegistrationLabel
          ? {
              label: providerRegistrationLabel,
              number: p?.providerRegistrationNumber ?? null,
              url: p?.providerRegistrationUrl ?? null,
            }
          : null,
      emergency: {
        number: p?.emergencyNumber ?? "112",
        notice: emergencyNotice,
        nonEmergencyLine: p?.nonEmergencyHealthLine ?? null,
      },
      dataProtectionLawName,
      authorityLinks,
      resolvedLocale: trustTr.resolvedLocale,
    };
  } catch (error) {
    throw normalizeDbError(error, "Trust information unavailable");
  }
}
