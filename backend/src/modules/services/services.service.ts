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
import { assertLocaleSupported } from "../shared/locale-support.js";

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

/**
 * Merge a service's base display columns with the best translation for the
 * requested locale (requested → default → first → base). Returns the row
 * with display fields overwritten by the resolved values, the raw
 * `translations` array stripped, and the locale that actually resolved.
 */
function mergeServiceTranslation<
  S extends ServiceDisplayBase & { translations: ServiceTranslationRow[] },
>(service: S, requested: LocaleCode, defaultLocale: LocaleCode): Omit<S, "translations"> & {
  resolvedLocale: LocaleCode;
} {
  const { tr, resolvedLocale } = resolveTranslation(service.translations, requested, defaultLocale);
  const { translations: _translations, ...rest } = service;
  return {
    ...rest,
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
  specialty: true,
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

export async function listServicesByCountry(
  countryCode: string,
  kind?: ServiceKind,
  locale?: LocaleCode,
) {
  try {
    const rows = await prisma.service.findMany({
      where: {
        isActive: true,
        country: { code: countryCode, isActive: true },
        ...(kind ? { kind } : {}),
      },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        country: {
          select: { id: true, code: true, slug: true, name: true, defaultLocale: true },
        },
        specialty: true,
        assets: {
          where: { isActive: true, kind: "IMAGE" },
          orderBy: { createdAt: "asc" },
          select: { id: true, kind: true, key: true, path: true, altText: true, usageNote: true },
        },
        // Doctor assignments — only the join rows whose doctor is
        // currently active. The public consult flow uses this to
        // scope the doctor card grid by the chosen service.
        assignedDoctors: {
          where: { isActive: true, doctor: { active: true } },
          orderBy: { sortOrder: "asc" },
          select: { doctorId: true },
        },
        translations: { select: serviceTranslationSelect },
      },
    });
    // Merge each row to the requested locale (falling back to the
    // country default + base columns). Same Service.id either way.
    return rows.map((row) =>
      mergeServiceTranslation(row, locale ?? row.country.defaultLocale, row.country.defaultLocale),
    );
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

export async function getAdminSpecialtyById(id: string) {
  try {
    const record = await prisma.specialty.findUnique({
      where: { id },
      include: adminSpecialtyInclude,
    });
    if (!record) return null;
    return {
      ...record,
      primaryService: record.primaryService?.isActive ? record.primaryService : record.services[0] ?? null,
    };
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
    if (body.translations !== undefined) {
      await upsertSpecialtyTranslations(id, existing.countryId, body.translations);
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

export async function purgeAdminSpecialty(id: string): Promise<boolean> {
  const existing = await prisma.specialty.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.service.deleteMany({ where: { specialtyId: id } });
      await tx.specialty.delete({ where: { id } });
    });
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
    return;
  }

  // Eligibility: doctor's primary country == service country OR doctor
  // has a DoctorCountry row for the service country.
  const eligible = await prisma.doctor.findMany({
    where: {
      id: { in: unique },
      OR: [
        { countryId: serviceCountryId },
        { additionalCountries: { some: { countryId: serviceCountryId } } },
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
        ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle }),
        ...(input.seoDescription !== undefined && { seoDescription: input.seoDescription }),
        ...(input.heroTitle !== undefined && { heroTitle: input.heroTitle }),
        ...(input.heroDescription !== undefined && { heroDescription: input.heroDescription }),
        ...(input.detailBody !== undefined && {
          detailBody: input.detailBody === null ? null : sanitizeRichHtml(input.detailBody),
        }),
        ...(input.ctaLabel !== undefined && { ctaLabel: input.ctaLabel }),
        ...(input.legacyPath !== undefined && { legacyPath: input.legacyPath }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.specialtyId !== undefined && { specialtyId: input.specialtyId }),
        ...(input.durationMinutes !== undefined && { durationMinutes: input.durationMinutes }),
        ...(input.basePriceCents !== undefined && { basePriceCents: input.basePriceCents }),
        ...(input.currencyCode !== undefined && { currencyCode: input.currencyCode }),
        ...(input.galleryImagePaths !== undefined && {
          galleryImagePaths: input.galleryImagePaths,
        }),
        ...(input.shippingCents !== undefined && { shippingCents: input.shippingCents }),
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
        ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle }),
        ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription }),
        ...(body.heroTitle !== undefined && { heroTitle: body.heroTitle }),
        ...(body.heroDescription !== undefined && { heroDescription: body.heroDescription }),
        ...(body.detailBody !== undefined && {
          detailBody: body.detailBody === null ? null : sanitizeRichHtml(body.detailBody),
        }),
        ...(body.ctaLabel !== undefined && { ctaLabel: body.ctaLabel }),
        ...(body.legacyPath !== undefined && { legacyPath: body.legacyPath }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.specialtyId !== undefined && { specialtyId: body.specialtyId }),
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
