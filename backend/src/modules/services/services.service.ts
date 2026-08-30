import { LocaleCode, Prisma, ServiceKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminSpecialtyCreateBody,
  AdminSpecialtyUpdateBody,
  AdminServiceCreateBody,
  AdminServiceUpdateBody,
  AdminServicesQuery,
  ServiceTranslationInput,
  SpecialtyTranslationInput,
} from "../../validations/admin-services.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { sanitizeRichHtml } from "../../utils/sanitize-html.js";
import { resolveTranslation } from "../shared/resolve-translation.js";
import { timePhase } from "../../lib/perf/request-context.js";
import { assertLocaleSupported } from "../shared/locale-support.js";
import { resolveServiceLinksForPage } from "../service-links/service-links.service.js";
import { faqTranslationSelect, mergeFaqTranslation } from "../../services/service-faq.service.js";
import {
  resolveInsurancePrice,
  type InsuranceCompanyPricing,
} from "../pricing/insurance-pricing.service.js";
import {
  getServiceBookability,
  invalidateBookabilityCache,
} from "../bookability/bookability.service.js";
import type { BookabilitySummary } from "../bookability/bookability.service.js";
import { resolveBookabilityFailClosed } from "../bookability/bookability-policy.js";

const BOOKABILITY_CONCURRENCY = 8;

async function mapBookabilityBounded<T, R>(
  items: readonly T[],
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index]!);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(BOOKABILITY_CONCURRENCY, items.length) }, () => worker()),
  );
  return results;
}

function stripOperationalBookingPause<
  T extends {
    bookingPausedFrom?: Date | null;
    bookingPausedUntil?: Date | null;
    bookingPauseReason?: string | null;
  },
>(
  service: T,
): Omit<T, "bookingPausedFrom" | "bookingPausedUntil" | "bookingPauseReason"> {
  const {
    bookingPausedFrom: _bookingPausedFrom,
    bookingPausedUntil: _bookingPausedUntil,
    bookingPauseReason: _bookingPauseReason,
    ...publicService
  } = service;
  return publicService;
}

/** One insurance option surfaced to the public service payload / booking form. */
export type InsuranceOption = {
  companyId: string;
  name: string;
  insurancePriceCents: number;
};

/** Raw coverage row shape read alongside a service (company + override). */
type CoverageWithCompany = {
  overridePriceCents: number | null;
  company: { id: string; name: string } & InsuranceCompanyPricing;
};

/** Payout row read alongside a service — proves a doctor is in an insurer's network. */
type NetworkPayoutRow = { insuranceCompanyId: string; doctorId: string };

/**
 * Company ids with at least ONE in-network doctor for this service. A doctor
 * joins an insurer's network by having a payout set for that (company, service);
 * doctors without one never see that insurer's patients. Cross-checked against
 * the service's active assigned doctors so a stale payout can't resurrect a
 * doctor who was unassigned or deactivated.
 */
function insurersWithDoctors(
  payouts: NetworkPayoutRow[],
  assignedDoctorIds: Set<string>,
): Set<string> {
  const out = new Set<string>();
  for (const p of payouts) {
    if (assignedDoctorIds.has(p.doctorId)) out.add(p.insuranceCompanyId);
  }
  return out;
}

/**
 * Resolve the public insurance options for a service: one entry per active
 * company that covers it, priced via `resolveInsurancePrice` (FIXED override or
 * PERCENT-computed). Options that can't be priced (misconfigured) are dropped.
 *
 * An insurer is only offered when it has at least one in-network doctor for the
 * service (`eligibleCompanyIds`) — a company nobody will see patients for is
 * unbookable, so it must not appear in the booking dropdown or the SEO line.
 */
export function buildInsuranceOptions(
  basePriceCents: number | null,
  coverages: CoverageWithCompany[],
  eligibleCompanyIds: Set<string>,
): InsuranceOption[] {
  if (basePriceCents == null) return [];
  const out: InsuranceOption[] = [];
  for (const cov of coverages) {
    if (!eligibleCompanyIds.has(cov.company.id)) continue;
    const price = resolveInsurancePrice({
      basePriceCents,
      company: cov.company,
      coverage: { overridePriceCents: cov.overridePriceCents },
    });
    if (price == null) continue;
    out.push({ companyId: cov.company.id, name: cov.company.name, insurancePriceCents: price });
  }
  return out;
}

/**
 * Build the auto SEO line for a covered service, e.g.
 *   "We also have MediCare and SafeHealth for this service."
 * Returns null when the service has no insurance companies. English-only for
 * now (mirrors other server-derived marketing strings).
 */
export function buildInsuranceSeoLine(names: string[]): string | null {
  if (names.length === 0) return null;
  let list: string;
  if (names.length === 1) list = names[0];
  else if (names.length === 2) list = `${names[0]} and ${names[1]}`;
  else list = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `We also have ${list} for this service.`;
}

/** Display fields a ServiceTranslation can override, plus the locale key. */
const serviceTranslationSelect = {
  locale: true,
  name: true,
  summary: true,
  seoTitle: true,
  seoDescription: true,
  heroTitle: true,
  heroDescription: true,
  detailBody: true,
  ctaLabel: true,
} satisfies Prisma.ServiceTranslationSelect;

type ServiceDisplayBase = {
  name: string;
  summary: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  ctaLabel: string | null;
};

type ServiceTranslationRow = ServiceDisplayBase & { locale: LocaleCode };

const SERVICE_DISPLAY_FIELDS = [
  "name",
  "summary",
  "seoTitle",
  "seoDescription",
  "heroTitle",
  "heroDescription",
  "detailBody",
  "ctaLabel",
] as const satisfies readonly (keyof ServiceDisplayBase)[];

/**
 * Merge a service's base display columns with the best translation for the
 * requested locale (requested → default → first → base). Returns the row
 * with display fields overwritten by the resolved values, the raw
 * `translations` array stripped, and the locale that actually resolved.
 *
 * `translatedFields` names the display fields the resolved translation row
 * actually supplied. Everything else fell through to the base columns, which
 * are authored in the country's default locale — so a consumer rendering a
 * non-default locale can tell "this value is in my language" from "this value
 * is the market's own language leaking through the fallback". The public site
 * uses it to decide indexability and to pick a safe localized <title>.
 */
function mergeServiceTranslation<
  S extends ServiceDisplayBase & { translations: ServiceTranslationRow[] },
>(service: S, requested: LocaleCode, defaultLocale: LocaleCode): Omit<S, "translations"> & {
  resolvedLocale: LocaleCode;
  translatedFields: string[];
} {
  const { tr, resolvedLocale } = resolveTranslation(service.translations, requested, defaultLocale);
  const { translations: _translations, ...rest } = service;
  const translatedFields = tr
    ? SERVICE_DISPLAY_FIELDS.filter((field) => tr[field] != null)
    : [];
  return {
    ...rest,
    translatedFields,
    name: tr?.name ?? service.name,
    summary: tr?.summary ?? service.summary,
    seoTitle: tr?.seoTitle ?? service.seoTitle,
    seoDescription: tr?.seoDescription ?? service.seoDescription,
    heroTitle: tr?.heroTitle ?? service.heroTitle,
    heroDescription: tr?.heroDescription ?? service.heroDescription,
    detailBody: tr?.detailBody ?? service.detailBody,
    ctaLabel: tr?.ctaLabel ?? service.ctaLabel,
    resolvedLocale,
  };
}

/**
 * Upsert one ServiceTranslation row per supplied entry, keyed by
 * (serviceId, locale). Validates each locale is enabled for the country
 * and sanitizes rich HTML per locale. Sequential + additive, mirroring the
 * existing asset/doctor sync (not wrapped in a single transaction).
 */
async function upsertServiceTranslations(
  serviceId: string,
  countryId: string,
  translations: ServiceTranslationInput[],
): Promise<void> {
  // Validate every locale up front (in parallel — was N sequential reads),
  // then write all translations in one atomic transaction instead of a
  // sequential per-locale upsert loop.
  await Promise.all(
    translations.map((entry) => assertLocaleSupported(countryId, entry.locale)),
  );
  await prisma.$transaction(
    translations.map((entry) => {
      const detailBody = entry.detailBody === null ? null : sanitizeRichHtml(entry.detailBody);
      const data = {
        name: entry.name,
        summary: entry.summary,
        seoTitle: entry.seoTitle,
        seoDescription: entry.seoDescription,
        heroTitle: entry.heroTitle,
        heroDescription: entry.heroDescription,
        detailBody,
        ctaLabel: entry.ctaLabel,
      };
      return prisma.serviceTranslation.upsert({
        where: { serviceId_locale: { serviceId, locale: entry.locale } },
        create: { serviceId, locale: entry.locale, ...data },
        update: data,
      });
    }),
  );
}

const specialtyTranslationSelect = {
  locale: true,
  name: true,
  cardSummary: true,
} satisfies Prisma.SpecialtyTranslationSelect;

type SpecialtyDisplayBase = { name: string; cardSummary: string | null };
type SpecialtyTranslationRow = SpecialtyDisplayBase & { locale: LocaleCode };

/** Merge a specialty's base name/cardSummary with the best translation. */
function mergeSpecialtyTranslation<
  S extends SpecialtyDisplayBase & { translations: SpecialtyTranslationRow[] },
>(specialty: S, requested: LocaleCode, defaultLocale: LocaleCode): Omit<S, "translations"> & {
  resolvedLocale: LocaleCode;
} {
  const { tr, resolvedLocale } = resolveTranslation(
    specialty.translations,
    requested,
    defaultLocale,
  );
  const { translations: _translations, ...rest } = specialty;
  return {
    ...rest,
    name: tr?.name ?? specialty.name,
    cardSummary: tr?.cardSummary ?? specialty.cardSummary,
    resolvedLocale,
  };
}

/** Upsert one SpecialtyTranslation row per entry, keyed (specialtyId, locale). */
async function upsertSpecialtyTranslations(
  specialtyId: string,
  countryId: string,
  translations: SpecialtyTranslationInput[],
): Promise<void> {
  await Promise.all(
    translations.map((entry) => assertLocaleSupported(countryId, entry.locale)),
  );
  await prisma.$transaction(
    translations.map((entry) => {
      const data = { name: entry.name, cardSummary: entry.cardSummary };
      return prisma.specialtyTranslation.upsert({
        where: { specialtyId_locale: { specialtyId, locale: entry.locale } },
        create: { specialtyId, locale: entry.locale, ...data },
        update: data,
      });
    }),
  );
}

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
  assets: {
    where: { isActive: true, kind: "IMAGE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, key: true, path: true, altText: true, usageNote: true },
  },
  // Doctor assignments — admin needs the current set to render the
  // multi-select. We include the doctor's slug/name/country so the form
  // can group + filter without a second fetch.
  assignedDoctors: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      doctor: {
        select: {
          id: true,
          slug: true,
          fullName: true,
          countryId: true,
          active: true,
        },
      },
    },
  },
  // Per-locale CMS content for the admin translation tabs (form pre-fill).
  translations: { orderBy: { locale: "asc" as const } },
  // Named author / clinical reviewer doctor (E-E-A-T) — the admin form's
  // doctor pickers need name to display the current selection.
  authorDoctor: { select: { id: true, fullName: true } },
  reviewerDoctor: { select: { id: true, fullName: true } },
  // Insurance: which active companies cover this service, and the doctor↔insurer
  // network rows. Lets the manual-booking form offer an insurer + narrow the
  // doctor list without extra round-trips (mirrors the public payload).
  insuranceCoverages: {
    where: { company: { isActive: true } },
    orderBy: [
      { company: { sortOrder: "asc" as const } },
      { company: { name: "asc" as const } },
    ],
    select: {
      overridePriceCents: true,
      company: {
        select: { id: true, name: true, pricingMode: true, discountPercent: true },
      },
    },
  },
  insuranceDoctorPayouts: {
    where: { doctorAmountCents: { not: null }, company: { isActive: true } },
    select: { insuranceCompanyId: true, doctorId: true },
  },
} satisfies Prisma.ServiceInclude;

export type AdminServiceRecord = Prisma.ServiceGetPayload<{ include: typeof adminServiceInclude }>;

/** Admin insurance option — the public shape plus the in-network doctor ids so
 *  the manual-booking form can narrow its doctor select client-side. */
export type AdminInsuranceOption = InsuranceOption & { doctorIds: string[] };

/** An admin service row with its resolved insurance options attached (raw
 *  coverage/payout rows stripped). */
export type AdminServiceListRecord = Omit<
  AdminServiceRecord,
  "insuranceCoverages" | "insuranceDoctorPayouts"
> & { insuranceOptions: AdminInsuranceOption[] };

/**
 * Insurance options for an admin service record: active companies covering it
 * that have at least one in-network doctor among the service's active
 * assignments, each with that insurer's doctor ids. Same eligibility rule as
 * the public payload — an insurer nobody will see patients for is not bookable.
 */
export function buildAdminInsuranceOptions(row: AdminServiceRecord): AdminInsuranceOption[] {
  const assignedDoctorIds = new Set(
    row.assignedDoctors
      .filter((a) => a.isActive && a.status === "active" && a.doctor.active)
      .map((a) => a.doctorId),
  );
  const doctorIdsByCompany = new Map<string, string[]>();
  for (const p of row.insuranceDoctorPayouts) {
    if (!assignedDoctorIds.has(p.doctorId)) continue;
    const list = doctorIdsByCompany.get(p.insuranceCompanyId) ?? [];
    list.push(p.doctorId);
    doctorIdsByCompany.set(p.insuranceCompanyId, list);
  }
  return buildInsuranceOptions(
    row.basePriceCents,
    row.insuranceCoverages,
    new Set(doctorIdsByCompany.keys()),
  ).map((o) => ({ ...o, doctorIds: doctorIdsByCompany.get(o.companyId) ?? [] }));
}

export type ListAdminServicesResult = {
  /** Each row carries its resolved `insuranceOptions` (bookable insurers +
   *  their in-network doctor ids) for the manual-booking form. */
  items: AdminServiceListRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function listServices(locale?: LocaleCode) {
  // Public catalogue — corporate/admin-only services are NEVER listed here
  // (ServiceVisibility gate, corporate plan doc §3.2).
  try {
    const rows = await prisma.service.findMany({
      where: { isActive: true, visibility: "PUBLIC" },
      orderBy: [{ country: { name: "asc" } }, { kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        country: true,
        assets: {
          where: { isActive: true, kind: "IMAGE" },
          orderBy: { createdAt: "asc" },
          select: { id: true, kind: true, key: true, path: true, altText: true, usageNote: true },
        },
        translations: { select: serviceTranslationSelect },
      },
    });
    const mapped = rows.map((row) => stripOperationalBookingPause(
        mergeServiceTranslation(row, locale ?? row.country.defaultLocale, row.country.defaultLocale),
    ));
    const summaries = await mapBookabilityBounded(
      rows,
      (service) =>
        resolveBookabilityFailClosed(() =>
          getServiceBookability({
            countryCode: service.country.code,
            serviceId: service.id,
          }),
        ),
    );
    return mapped.map((service, index) => ({ ...service, bookability: summaries[index]! }));
  } catch (error) {
    throw normalizeDbError(error, "Services data is unavailable");
  }
}

export async function listServicesByCountry(
  countryCode: string,
  kind?: ServiceKind,
  locale?: LocaleCode,
) {
  try {
    const rows = await prisma.service.findMany({
      where: {
        isActive: true,
        // Corporate/admin-only services never appear on public country pages.
        visibility: "PUBLIC",
        country: { code: countryCode, isActive: true },
        ...(kind ? { kind } : {}),
      },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        country: {
          select: { id: true, code: true, slug: true, name: true, defaultLocale: true },
        },
        assets: {
          where: { isActive: true, kind: "IMAGE" },
          orderBy: { createdAt: "asc" },
          select: { id: true, kind: true, key: true, path: true, altText: true, usageNote: true },
        },
        // Doctor assignments — only the join rows whose doctor is
        // currently active. The public consult flow uses this to
        // scope the doctor card grid by the chosen service.
        assignedDoctors: {
          where: {
            isActive: true,
            status: "active",
            doctor: {
              active: true,
              OR: [
                { country: { code: countryCode, isActive: true } },
                {
                  additionalCountries: {
                    some: {
                      active: true,
                      country: { code: countryCode, isActive: true },
                    },
                  },
                },
              ],
            },
          },
          orderBy: { sortOrder: "asc" },
          select: { doctorId: true },
        },
        translations: { select: serviceTranslationSelect },
        insuranceCoverages: {
          where: { company: { isActive: true } },
          orderBy: [{ company: { sortOrder: "asc" } }, { company: { name: "asc" } }],
          select: {
            overridePriceCents: true,
            company: {
              select: { id: true, name: true, pricingMode: true, discountPercent: true },
            },
          },
        },
        // Doctor↔insurer network rows: a set payout means the doctor takes this
        // service under that insurer. Drives which insurers are bookable at all.
        insuranceDoctorPayouts: {
          where: { doctorAmountCents: { not: null }, company: { isActive: true } },
          select: { insuranceCompanyId: true, doctorId: true },
        },
      },
    });
    // Merge each row to the requested locale (falling back to the
    // country default + base columns). Same Service.id either way.
    const mapped = rows.map((row) => {
      const merged = mergeServiceTranslation(
        row,
        locale ?? row.country.defaultLocale,
        row.country.defaultLocale,
      );
      const assignedDoctorIds = new Set(row.assignedDoctors.map((a) => a.doctorId));
      const insuranceOptions = buildInsuranceOptions(
        row.basePriceCents,
        row.insuranceCoverages,
        insurersWithDoctors(row.insuranceDoctorPayouts, assignedDoctorIds),
      );
      const {
        insuranceCoverages: _insuranceCoverages,
        insuranceDoctorPayouts: _insuranceDoctorPayouts,
        ...mergedRest
      } = merged;
      return stripOperationalBookingPause({
        ...mergedRest,
        insuranceOptions,
        insuranceSeoLine: buildInsuranceSeoLine(insuranceOptions.map((o) => o.name)),
      });
    });
    const summaries = await mapBookabilityBounded(
      rows,
      (service) =>
        resolveBookabilityFailClosed(() =>
          getServiceBookability({ countryCode, serviceId: service.id }),
        ),
    );
    return mapped.map((service, index) => ({ ...service, bookability: summaries[index]! }));
  } catch (error) {
    throw normalizeDbError(error, "Services data is unavailable");
  }
}

export async function listSpecialtiesByCountry(countryCode: string, locale?: LocaleCode) {
  try {
    const rows = await prisma.specialty.findMany({
      where: { active: true, country: { code: countryCode, isActive: true } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        country: {
          select: { id: true, code: true, slug: true, name: true, defaultLocale: true },
        },
        translations: { select: specialtyTranslationSelect },
      },
    });
    return rows.map((row) =>
      mergeSpecialtyTranslation(
        row,
        locale ?? row.country.defaultLocale,
        row.country.defaultLocale,
      ),
    );
  } catch (error) {
    throw normalizeDbError(error, "Specialties data is unavailable");
  }
}

export async function listSpecialties(locale?: LocaleCode) {
  try {
    const items = await prisma.specialty.findMany({
      where: { active: true },
      orderBy: [{ country: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        country: true,
        assets: {
          where: { isActive: true, kind: "IMAGE" },
          orderBy: { createdAt: "asc" },
          select: { id: true, kind: true, key: true, path: true, altText: true, usageNote: true },
        },
        translations: { select: specialtyTranslationSelect },
      },
    }).then((rows) =>
      rows.map((row) =>
        mergeSpecialtyTranslation(row, locale ?? row.country.defaultLocale, row.country.defaultLocale),
      ),
    );
    return items;
  } catch (error) {
    throw normalizeDbError(error, "Specialties data is unavailable");
  }
}

const adminSpecialtyInclude = {
  assets: {
    where: { isActive: true, kind: "IMAGE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, key: true, path: true, altText: true, usageNote: true },
  },
  translations: { orderBy: { locale: "asc" as const } },
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

export async function listSpecialtiesForAdminCountry(countryId: string) {
  await assertCountryExists(countryId);
  try {
    return await prisma.specialty.findMany({
      where: { countryId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: adminSpecialtyInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Specialties data is unavailable");
  }
}

export async function getAdminSpecialtyById(id: string) {
  try {
    const record = await prisma.specialty.findUnique({
      where: { id },
      include: adminSpecialtyInclude,
    });
    if (!record) return null;
    return record;
  } catch (error) {
    throw normalizeDbError(error, "Specialty data is unavailable");
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
    if (input.translations !== undefined) {
      await upsertSpecialtyTranslations(specialty.id, specialty.countryId, input.translations);
    }
    return await prisma.specialty.findUniqueOrThrow({
      where: { id: specialty.id },
      include: adminSpecialtyInclude,
    });
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
    if (body.translations !== undefined) {
      await upsertSpecialtyTranslations(id, existing.countryId, body.translations);
    }
    return await prisma.specialty.findUniqueOrThrow({
      where: { id: specialty.id },
      include: adminSpecialtyInclude,
    });
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

export async function purgeAdminSpecialty(id: string): Promise<boolean> {
  const existing = await prisma.specialty.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;

  try {
    await prisma.specialty.delete({ where: { id } });
    return true;
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
      // Resolve insurance options per row and strip the raw join rows they were
      // derived from — the admin form only needs the resolved options.
      items: items.map((row) => {
        const {
          insuranceCoverages: _insuranceCoverages,
          insuranceDoctorPayouts: _insuranceDoctorPayouts,
          ...rest
        } = row;
        return { ...rest, insuranceOptions: buildAdminInsuranceOptions(row) };
      }),
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

/**
 * Replace the ServiceDoctor join rows for a service with the supplied
 * doctorIds set. Idempotent — no-op when the array matches the existing
 * set. Doctors whose primary country doesn't match the service country
 * are filtered out unless they have a DoctorCountry link to that
 * country (so admin can't accidentally attach a Romania-only doctor to
 * an Ireland service).
 */
async function syncServiceDoctorAssignments(
  serviceId: string,
  doctorIds: string[],
  serviceCountryId: string,
): Promise<void> {
  const unique = Array.from(new Set(doctorIds.map((id) => id.trim()).filter(Boolean)));

  if (unique.length === 0) {
    await prisma.serviceDoctor.deleteMany({ where: { serviceId } });
    invalidateBookabilityCache();
    return;
  }

  // Eligibility: doctor's primary country == service country OR doctor
  // has a DoctorCountry row for the service country.
  const eligible = await prisma.doctor.findMany({
    where: {
      id: { in: unique },
      OR: [
        { countryId: serviceCountryId },
        { additionalCountries: { some: { active: true, countryId: serviceCountryId } } },
      ],
    },
    select: { id: true },
  });
  const eligibleIds = new Set(eligible.map((d) => d.id));
  const filtered = unique.filter((id) => eligibleIds.has(id));

  await prisma.$transaction(async (tx) => {
    await tx.serviceDoctor.deleteMany({
      where: {
        serviceId,
        doctorId: { notIn: filtered.length > 0 ? filtered : ["__none__"] },
      },
    });
    if (filtered.length === 0) return;
    for (let index = 0; index < filtered.length; index++) {
      const doctorId = filtered[index]!;
      await tx.serviceDoctor.upsert({
        where: {
          serviceId_doctorId: { serviceId, doctorId },
        },
        create: {
          serviceId,
          doctorId,
          sortOrder: index,
          isActive: true,
          selectedBy: "admin",
          status: "active",
        },
        update: {
          sortOrder: index,
          isActive: true,
          selectedBy: "admin",
          status: "active",
        },
      });
    }
  });
  invalidateBookabilityCache();
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

  try {
    const service = await prisma.service.create({
      data: {
        countryId: input.countryId,
        kind: input.kind,
        slug: input.slug,
        name: input.name,
        ...(input.summary !== undefined && { summary: input.summary }),
        ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle }),
        ...(input.seoDescription !== undefined && { seoDescription: input.seoDescription }),
        ...(input.heroTitle !== undefined && { heroTitle: input.heroTitle }),
        ...(input.heroDescription !== undefined && { heroDescription: input.heroDescription }),
        ...(input.detailBody !== undefined && {
          detailBody: input.detailBody === null ? null : sanitizeRichHtml(input.detailBody),
        }),
        ...(input.ctaLabel !== undefined && { ctaLabel: input.ctaLabel }),
        ...(input.lastReviewedAt !== undefined && { lastReviewedAt: input.lastReviewedAt }),
        ...(input.authorDisplayName !== undefined && { authorDisplayName: input.authorDisplayName }),
        ...(input.reviewerDisplayName !== undefined && {
          reviewerDisplayName: input.reviewerDisplayName,
        }),
        ...(input.authorDoctorId !== undefined && { authorDoctorId: input.authorDoctorId }),
        ...(input.reviewerDoctorId !== undefined && { reviewerDoctorId: input.reviewerDoctorId }),
        ...(input.legacyPath !== undefined && { legacyPath: input.legacyPath }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.durationMinutes !== undefined && { durationMinutes: input.durationMinutes }),
        ...(input.basePriceCents !== undefined && { basePriceCents: input.basePriceCents }),
        ...(input.currencyCode !== undefined && { currencyCode: input.currencyCode }),
        ...(input.galleryImagePaths !== undefined && {
          galleryImagePaths: input.galleryImagePaths,
        }),
        ...(input.shippingCents !== undefined && { shippingCents: input.shippingCents }),
        ...(input.visibility !== undefined && { visibility: input.visibility }),
        // The inner cross-jurisdiction prescription service is never public —
        // force ADMIN_ONLY so it can't leak into listings / slug lookups /
        // sitemaps / the public cart, regardless of the form. Deliberately
        // AFTER the explicit visibility above so it always wins.
        ...(input.kind === "ASYNC_PRESCRIPTION" && { visibility: "ADMIN_ONLY" as const }),
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
    if (input.doctorIds !== undefined) {
      await syncServiceDoctorAssignments(
        service.id,
        input.doctorIds,
        input.countryId,
      );
    }
    if (input.translations !== undefined) {
      await upsertServiceTranslations(service.id, input.countryId, input.translations);
    }
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
    select: { countryId: true, kind: true },
  });
  if (!existing) return null;

  const nextCountryId = body.countryId ?? existing.countryId;
  if (body.countryId !== undefined) {
    await assertCountryExists(body.countryId);
  }

  try {
    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(body.countryId !== undefined && { countryId: body.countryId }),
        ...(body.kind !== undefined && { kind: body.kind }),
        ...(body.visibility !== undefined && { visibility: body.visibility }),
        // Keep the inner cross-jurisdiction prescription service ADMIN_ONLY
        // (mirror of create above). Checked against the EFFECTIVE kind so an
        // explicit `visibility: PUBLIC` cannot expose an existing
        // ASYNC_PRESCRIPTION row. Listed last so it always wins.
        ...((body.kind ?? existing.kind) === "ASYNC_PRESCRIPTION" && {
          visibility: "ADMIN_ONLY" as const,
        }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.summary !== undefined && { summary: body.summary }),
        ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle }),
        ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription }),
        ...(body.heroTitle !== undefined && { heroTitle: body.heroTitle }),
        ...(body.heroDescription !== undefined && { heroDescription: body.heroDescription }),
        ...(body.detailBody !== undefined && {
          detailBody: body.detailBody === null ? null : sanitizeRichHtml(body.detailBody),
        }),
        ...(body.ctaLabel !== undefined && { ctaLabel: body.ctaLabel }),
        ...(body.lastReviewedAt !== undefined && { lastReviewedAt: body.lastReviewedAt }),
        ...(body.authorDisplayName !== undefined && { authorDisplayName: body.authorDisplayName }),
        ...(body.reviewerDisplayName !== undefined && {
          reviewerDisplayName: body.reviewerDisplayName,
        }),
        ...(body.authorDoctorId !== undefined && { authorDoctorId: body.authorDoctorId }),
        ...(body.reviewerDoctorId !== undefined && { reviewerDoctorId: body.reviewerDoctorId }),
        ...(body.legacyPath !== undefined && { legacyPath: body.legacyPath }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.durationMinutes !== undefined && { durationMinutes: body.durationMinutes }),
        ...(body.basePriceCents !== undefined && { basePriceCents: body.basePriceCents }),
        ...(body.currencyCode !== undefined && { currencyCode: body.currencyCode }),
        ...(body.galleryImagePaths !== undefined && {
          galleryImagePaths: body.galleryImagePaths,
        }),
        ...(body.shippingCents !== undefined && { shippingCents: body.shippingCents }),
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
    if (body.doctorIds !== undefined) {
      await syncServiceDoctorAssignments(id, body.doctorIds, nextCountryId);
    }
    if (body.translations !== undefined) {
      await upsertServiceTranslations(id, nextCountryId, body.translations);
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

export async function purgeAdminService(id: string): Promise<boolean> {
  const existing = await prisma.service.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  try {
    await prisma.service.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Services data is unavailable");
  }
}

/**
 * Public: resolve a service by slug + country code; include visible FAQs.
 * When `locale` is supplied the display fields (name, summary, hero copy,
 * detailBody, cta, seo) are merged to that language (requested → country
 * default → base), mirroring `listServicesByCountry`. The raw `translations`
 * array is stripped and a `resolvedLocale` is added. Returns null when no
 * matching row exists.
 */
export async function getPublicServiceBySlug(
  slug: string,
  countryCode?: string,
  locale?: LocaleCode,
) {
  try {
    const row = await prisma.service.findFirst({
      where: {
        slug,
        isActive: true,
        visibility: "PUBLIC",
        ...(countryCode ? { country: { code: countryCode, isActive: true } } : {}),
      },
      include: {
        country: {
          select: { id: true, code: true, slug: true, name: true, defaultLocale: true },
        },
        assets: {
          where: { isActive: true, kind: "IMAGE" },
          orderBy: { createdAt: "asc" },
          select: { id: true, kind: true, key: true, path: true, altText: true, usageNote: true },
        },
        faqs: {
          where: { isVisible: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            question: true,
            answer: true,
            sortOrder: true,
            translations: { select: faqTranslationSelect },
          },
        },
        translations: { select: serviceTranslationSelect },
        // Active doctor assignments + the doctor↔insurer network rows. An
        // insurer is only offered when at least one assigned doctor has a payout
        // set for it (i.e. agreed to see that insurer's patients).
        assignedDoctors: {
          where: {
            isActive: true,
            status: "active",
            doctor: { active: true },
          },
          select: {
            doctorId: true,
            doctor: {
              select: {
                countryId: true,
                additionalCountries: {
                  where: { active: true },
                  select: { countryId: true },
                },
              },
            },
          },
        },
        insuranceCoverages: {
          where: { company: { isActive: true } },
          orderBy: [{ company: { sortOrder: "asc" } }, { company: { name: "asc" } }],
          select: {
            overridePriceCents: true,
            company: {
              select: { id: true, name: true, pricingMode: true, discountPercent: true },
            },
          },
        },
        insuranceDoctorPayouts: {
          where: { doctorAmountCents: { not: null }, company: { isActive: true } },
          select: { insuranceCompanyId: true, doctorId: true },
        },
      },
    });
    if (!row) return null;
    const merged = mergeServiceTranslation(
      row,
      locale ?? row.country.defaultLocale,
      row.country.defaultLocale,
    );
    const faqs = row.faqs.map((faq) =>
      mergeFaqTranslation(faq, merged.resolvedLocale, row.country.defaultLocale),
    );
    // Contextual internal-link callouts (locale-merged, capped at 4).
    const links = await resolveServiceLinksForPage(
      row.id,
      merged.resolvedLocale,
      row.country.defaultLocale,
    );
    const assignedDoctorIds = new Set(
      row.assignedDoctors
        .filter(
          (assignment) =>
            assignment.doctor.countryId === row.country.id ||
            assignment.doctor.additionalCountries.some(
              (market) => market.countryId === row.country.id,
            ),
        )
        .map((assignment) => assignment.doctorId),
    );
    const insuranceOptions = buildInsuranceOptions(
      row.basePriceCents,
      row.insuranceCoverages,
      insurersWithDoctors(row.insuranceDoctorPayouts, assignedDoctorIds),
    );
    const bookability = await resolveBookabilityFailClosed(() =>
      getServiceBookability({
        countryCode: row.country.code,
        serviceId: row.id,
      }),
    );
    // Strip the raw coverage/network rows — only the resolved options/SEO line ship.
    const {
      insuranceCoverages: _insuranceCoverages,
      insuranceDoctorPayouts: _insuranceDoctorPayouts,
      assignedDoctors: _assignedDoctors,
      ...mergedRest
    } = merged;
    return stripOperationalBookingPause({
      ...mergedRest,
      faqs,
      links,
      // Same ids the country services list already publishes. The booking
      // wizard needs them to offer a clinician: a corporate service is never
      // in that list, so this detail read is its only source.
      assignedDoctorIds: [...assignedDoctorIds],
      insuranceOptions,
      insuranceSeoLine: buildInsuranceSeoLine(insuranceOptions.map((o) => o.name)),
      bookability,
    });
  } catch (error) {
    throw normalizeDbError(error, "Service data is unavailable");
  }
}

export async function reorderAdminServices(
  items: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  if (items.length === 0) return;
  try {
    await prisma.$transaction(
      items.map(({ id, sortOrder }) =>
        prisma.service.update({ where: { id }, data: { sortOrder } }),
      ),
    );
  } catch (error) {
    throw normalizeDbError(error, "Could not reorder services");
  }
}

export async function reorderAdminSpecialties(
  items: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  if (items.length === 0) return;
  try {
    await prisma.$transaction(
      items.map(({ id, sortOrder }) =>
        prisma.specialty.update({ where: { id }, data: { sortOrder } }),
      ),
    );
  } catch (error) {
    throw normalizeDbError(error, "Could not reorder specialties");
  }
}

/* ------------------------------------------------------------------ *
 * Public service-card projection (perf plan docs/plans/new.md §7.1)
 * ------------------------------------------------------------------ */

/** One card row. Deliberately raw-payload-shaped: the frontend keeps using
 *  its existing `CountryServiceCard` mapper unchanged, so parity is by
 *  construction rather than by a second normalizer. */
export type PublicServiceCard = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  kind: ServiceKind;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  isActive: true;
  assets: Array<{ kind: "IMAGE"; path: string; altText: string | null }>;
  assignedDoctors: Array<{ doctorId: string }>;
  insuranceOptions: InsuranceOption[];
  bookability: BookabilitySummary;
};

/**
 * Card-only variant of `listServicesByCountry`. Same `where`, `orderBy`,
 * translation fallback, assignment scoping, insurance derivation and
 * bookability resolver — only the selected columns and the emitted keys are
 * narrowed to what a service card actually renders. Detail bodies, FAQs, SEO
 * fields, raw country/coverage/payout rows and `insuranceSeoLine` are dropped.
 *
 * The legacy endpoint is untouched and remains the runtime fallback.
 */
export async function listServiceCardsByCountry(
  countryCode: string,
  kind?: ServiceKind,
  locale?: LocaleCode,
): Promise<PublicServiceCard[]> {
  try {
    const rows = await timePhase("query", () => prisma.service.findMany({
      where: {
        isActive: true,
        visibility: "PUBLIC",
        country: { code: countryCode, isActive: true },
        ...(kind ? { kind } : {}),
      },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        summary: true,
        kind: true,
        durationMinutes: true,
        basePriceCents: true,
        currencyCode: true,
        country: { select: { defaultLocale: true } },
        // Legacy select omits title/caption/description/focal/zoom for
        // services; copied verbatim so card media stays byte-identical.
        assets: {
          where: { isActive: true, kind: "IMAGE" },
          orderBy: { createdAt: "asc" },
          select: { path: true, altText: true },
        },
        assignedDoctors: {
          where: {
            isActive: true,
            status: "active",
            doctor: {
              active: true,
              OR: [
                { country: { code: countryCode, isActive: true } },
                {
                  additionalCountries: {
                    some: { active: true, country: { code: countryCode, isActive: true } },
                  },
                },
              ],
            },
          },
          orderBy: { sortOrder: "asc" },
          select: { doctorId: true },
        },
        translations: { select: { locale: true, name: true, summary: true } },
        insuranceCoverages: {
          where: { company: { isActive: true } },
          orderBy: [{ company: { sortOrder: "asc" } }, { company: { name: "asc" } }],
          select: {
            overridePriceCents: true,
            company: {
              select: { id: true, name: true, pricingMode: true, discountPercent: true },
            },
          },
        },
        insuranceDoctorPayouts: {
          where: { doctorAmountCents: { not: null }, company: { isActive: true } },
          select: { insuranceCompanyId: true, doctorId: true },
        },
      },
    }));
    // NOT the country batch: it only WRITES the bookability cache, so it
    // recomputed the whole market on every request. The per-item reader
    // answers from the 60 s cache — see §7.4 and the regression note on
    // getCountryBookabilityBatch.
    const summaries = await timePhase("bookability", () =>
      mapBookabilityBounded(rows, (service) =>
        resolveBookabilityFailClosed(() =>
          getServiceBookability({ countryCode, serviceId: service.id }),
        ),
      ),
    );
    return rows.map((row, index) => {
      const defaultLocale = row.country.defaultLocale;
      const { tr } = resolveTranslation(
        row.translations,
        locale ?? defaultLocale,
        defaultLocale,
      );
      const assignedDoctorIds = new Set(row.assignedDoctors.map((a) => a.doctorId));
      return {
        id: row.id,
        slug: row.slug,
        name: tr?.name ?? row.name,
        summary: tr?.summary ?? row.summary,
        kind: row.kind,
        durationMinutes: row.durationMinutes,
        basePriceCents: row.basePriceCents,
        currencyCode: row.currencyCode,
        isActive: true as const,
        assets: row.assets.map((a) => ({
          kind: "IMAGE" as const,
          path: a.path,
          altText: a.altText,
        })),
        assignedDoctors: row.assignedDoctors.map((a) => ({ doctorId: a.doctorId })),
        insuranceOptions: buildInsuranceOptions(
          row.basePriceCents,
          row.insuranceCoverages,
          insurersWithDoctors(row.insuranceDoctorPayouts, assignedDoctorIds),
        ),
        bookability: summaries[index]!,
      };
    });
  } catch (error) {
    throw normalizeDbError(error, "Services data is unavailable");
  }
}
