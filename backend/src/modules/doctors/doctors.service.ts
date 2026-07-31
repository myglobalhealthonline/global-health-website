import { AssetKind, LocaleCode, Prisma, type AppointmentStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminDoctorCreateBody,
  AdminDoctorUpdateBody,
  AdminDoctorsQuery,
  DoctorTranslationInput,
} from "../../validations/admin-doctors.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { sanitizeRichHtml } from "../../utils/sanitize-html.js";
import { doctorProfileImageKey } from "../../utils/doctor-image-key.js";
import { resolveTranslation } from "../shared/resolve-translation.js";
import { assertLocaleSupported } from "../shared/locale-support.js";
import { getFeaturedDoctorId } from "./featured-doctor.service.js";
import { normalizeDoctorWhatsAppForStorage } from "../../lib/whatsapp/resolve-doctor-contact.js";
import { defaultChamberEntityForCountry } from "../../lib/doctor-registration-display.js";

/** Display fields a DoctorTranslation overrides. */
const doctorTranslationSelect = {
  locale: true,
  title: true,
  bio: true,
  seoTitle: true,
  seoDescription: true,
} satisfies Prisma.DoctorTranslationSelect;

const doctorMarketTranslationSelect = {
  locale: true,
  title: true,
  bio: true,
  seoTitle: true,
  seoDescription: true,
  seoKeywords: true,
} satisfies Prisma.DoctorMarketTranslationSelect;

const doctorFaqSelect = {
  id: true,
  locale: true,
  question: true,
  answer: true,
  category: true,
  sortOrder: true,
  isActive: true,
} satisfies Prisma.DoctorFaqSelect;

type DoctorDisplayBase = {
  title: string;
  bio: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type DoctorTranslationRow = DoctorDisplayBase & { locale: LocaleCode };

type DoctorMarketTranslationRow = {
  locale: LocaleCode;
  title: string | null;
  bio: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
};

const doctorCountryDivisionTranslationSelect = {
  locale: true,
  division: true,
} satisfies Prisma.DoctorCountryTranslationSelect;

type DoctorCountryDivisionTranslationRow = { locale: LocaleCode; division: string };

type DoctorFaqRow = {
  id: string;
  locale: LocaleCode;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
};

const publicSpecialtyTranslationSelect = {
  locale: true,
  name: true,
  cardSummary: true,
} satisfies Prisma.SpecialtyTranslationSelect;

type PublicSpecialtyRow = {
  id: string;
  slug: string;
  name: string;
  cardSummary: string | null;
  active: boolean;
  translations: Array<{
    locale: LocaleCode;
    name: string;
    cardSummary: string | null;
  }>;
};

export function mergeDoctorSpecialties<T extends { specialty: PublicSpecialtyRow }>(
  specialties: readonly T[],
  requested: LocaleCode,
  defaultLocale: LocaleCode,
) {
  return specialties.map(({ specialty, ...link }) => {
    const { tr } = resolveTranslation(specialty.translations, requested, defaultLocale);
    const { translations: _translations, ...base } = specialty;
    return {
      ...link,
      specialty: {
        ...base,
        name: tr?.name ?? specialty.name,
        cardSummary: tr?.cardSummary ?? specialty.cardSummary,
      },
    };
  });
}

/**
 * Merge a doctor's base title/bio/SEO with the best translation for the
 * requested locale (requested -> default -> first -> base), field by field.
 * fullName + qualifications are not translated, so they pass through.
 */
export function mergeDoctorTranslation<
  S extends DoctorDisplayBase & { translations: DoctorTranslationRow[] },
>(doctor: S, requested: LocaleCode, defaultLocale: LocaleCode): Omit<S, "translations"> & {
  resolvedLocale: LocaleCode;
} {
  const { tr, resolvedLocale } = resolveTranslation(doctor.translations, requested, defaultLocale);
  const { translations: _translations, ...rest } = doctor;
  return {
    ...rest,
    title: tr?.title ?? doctor.title,
    bio: tr?.bio ?? doctor.bio,
    seoTitle: tr?.seoTitle ?? doctor.seoTitle,
    seoDescription: tr?.seoDescription ?? doctor.seoDescription,
    resolvedLocale,
  };
}

/**
 * Layers a DoctorMarketTranslation row on top of the already
 * locale-merged doctor (from mergeDoctorTranslation). Resolved
 * independently, a market row that exists only in the country's default
 * locale would win the `resolveTranslation` default-fallback for every
 * requested locale and stomp already-correct per-locale DoctorTranslation
 * fields (the "selected English, page shows Portuguese" bug). Fix: only
 * apply the market row when its resolved locale matches the doctor-level
 * resolved locale — i.e. the market row is actually in the language we're
 * rendering, not just the fallback language. Mismatch -> ignore the market
 * row entirely and keep the doctor-merged object (seoKeywords []).
 */
export function mergeDoctorMarketTranslation<
  S extends DoctorDisplayBase & { resolvedLocale: LocaleCode },
>(
  doctor: S,
  marketTranslations: DoctorMarketTranslationRow[] | undefined,
  requested: LocaleCode,
  defaultLocale: LocaleCode,
): S & { resolvedMarketLocale: LocaleCode; seoKeywords: string[] } {
  const rows = marketTranslations ?? [];
  const { tr, resolvedLocale } = resolveTranslation(rows, requested, defaultLocale);
  if (resolvedLocale !== doctor.resolvedLocale) {
    return {
      ...doctor,
      seoKeywords: [],
      resolvedMarketLocale: doctor.resolvedLocale,
    };
  }
  return {
    ...doctor,
    title: tr?.title ?? doctor.title,
    bio: tr?.bio ?? doctor.bio,
    seoTitle: tr?.seoTitle ?? doctor.seoTitle,
    seoDescription: tr?.seoDescription ?? doctor.seoDescription,
    seoKeywords: tr?.seoKeywords ?? [],
    resolvedMarketLocale: resolvedLocale,
  };
}

function resolveDoctorFaqs(
  faqs: DoctorFaqRow[] | undefined,
  requested: LocaleCode,
  defaultLocale: LocaleCode,
): DoctorFaqRow[] {
  const active = (faqs ?? []).filter((faq) => faq.isActive);
  const requestedRows = active.filter((faq) => faq.locale === requested);
  const rows =
    requestedRows.length > 0
      ? requestedRows
      : active.filter((faq) => faq.locale === defaultLocale);
  return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.question.localeCompare(b.question));
}

/** Upsert one DoctorTranslation row per entry, keyed (doctorId, locale).
 *  Validates each locale is enabled for the country, sanitizes bio. */
async function upsertDoctorTranslations(
  tx: Prisma.TransactionClient,
  doctorId: string,
  countryId: string,
  translations: DoctorTranslationInput[],
): Promise<void> {
  // Validate locales in parallel (was N sequential reads) before the
  // transactional upsert loop below.
  await Promise.all(
    translations.map((entry) => assertLocaleSupported(countryId, entry.locale)),
  );
  for (const entry of translations) {
    const data = {
      title: entry.title,
      bio: entry.bio === null || entry.bio === undefined ? null : sanitizeRichHtml(entry.bio),
      seoTitle: entry.seoTitle ?? null,
      seoDescription: entry.seoDescription ?? null,
    };
    await tx.doctorTranslation.upsert({
      where: { doctorId_locale: { doctorId, locale: entry.locale } },
      create: { doctorId, locale: entry.locale, ...data },
      update: data,
    });
  }
}

export class DoctorCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "DoctorCountryNotFoundError";
  }
}

export class DoctorSpecialtyInvalidError extends Error {
  constructor(message = "Specialty not found or does not belong to this country") {
    super(message);
    this.name = "DoctorSpecialtyInvalidError";
  }
}

/** Create/update sync assets + M:N countries; default 5s Prisma timeout is too low on Windows dev. */
const ADMIN_DOCTOR_TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;

async function syncLegacyImcRegistrationToPrimaryCountry(
  tx: Prisma.TransactionClient,
  doctorId: string,
  countryId: string,
  imcRegistration: string | null | undefined,
): Promise<void> {
  const number = imcRegistration?.trim();
  if (!number) return;

  const country = await tx.country.findUnique({
    where: { id: countryId },
    select: { code: true },
  });
  if (!country) return;

  const chamberEntity = defaultChamberEntityForCountry(country.code);
  await tx.doctorCountry.upsert({
    where: { doctorId_countryId: { doctorId, countryId } },
    update: {
      registrationNumber: number,
      chamberEntity,
      active: true,
    },
    create: {
      doctorId,
      countryId,
      registrationNumber: number,
      chamberEntity,
      active: true,
    },
  });
}

async function ensurePrimaryDoctorCountry(
  tx: Prisma.TransactionClient,
  doctorId: string,
  countryId: string,
): Promise<void> {
  await tx.doctorCountry.upsert({
    where: { doctorId_countryId: { doctorId, countryId } },
    create: { doctorId, countryId, active: true },
    update: { active: true },
  });
}

const adminDoctorInclude = {
  country: {
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
      defaultLocale: true,
    },
  },
  additionalCountries: {
    include: {
      country: {
        select: { id: true, code: true, name: true, slug: true, defaultLocale: true },
      },
    },
  },
  specialties: {
    include: {
      specialty: {
        select: { id: true, slug: true, name: true, active: true },
      },
    },
  },
  assignedServices: {
    where: { isActive: true, status: "active" },
    select: {
      serviceId: true,
      service: {
        select: { kind: true },
      },
    },
  },
  assets: {
    where: { kind: AssetKind.IMAGE, isActive: true },
    orderBy: [{ updatedAt: "desc" as const }, { id: "desc" as const }],
    select: {
      id: true,
      kind: true,
      key: true,
      path: true,
      altText: true,
      title: true,
      caption: true,
      description: true,
      focalX: true,
      focalY: true,
      zoom: true,
    },
  },
  /**
   * Linked login user (User.doctorId one-to-one). Powers the
   * "Account access" card on /admin/doctors/[id] so the admin can see
   * invite state (no account / pending / verified) without a second
   * round-trip.
   */
  loginUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
      emailVerifiedAt: true,
      isActive: true,
      createdAt: true,
    },
  },
  // Per-locale CMS content for the admin translation tabs (form pre-fill).
  translations: { orderBy: { locale: "asc" as const } },
  // Per-country cross-border prescriber price + payout (form pre-fill).
  crossBorderRxCountries: {
    select: { countryId: true, priceCents: true, payoutCents: true },
  },
} satisfies Prisma.DoctorInclude;

export type AdminDoctorRecord = Prisma.DoctorGetPayload<{ include: typeof adminDoctorInclude }>;

export type ListAdminDoctorsResult = {
  items: AdminDoctorRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

// ponytail: hard cap, not full page/pageSize — the public doctor listings
// currently render the whole roster with no "load older" UI, and the
// roster is admin-curated (grows slowly), so a generous cap just bounds
// worst-case response size without changing today's behavior.
const PUBLIC_DOCTORS_LIST_CAP = 300;

export async function listDoctors(locale?: LocaleCode) {
  try {
    const rows = await prisma.doctor.findMany({
      where: { active: true },
      orderBy: [{ country: { name: "asc" } }, { fullName: "asc" }],
      take: PUBLIC_DOCTORS_LIST_CAP,
      include: {
        country: true,
        specialties: {
          include: {
            specialty: {
              include: { translations: { select: publicSpecialtyTranslationSelect } },
            },
          },
        },
        assets: {
          where: { isActive: true, kind: AssetKind.IMAGE },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        },
        translations: { select: doctorTranslationSelect },
      },
    });
    // Each doctor merges to the requested locale, falling back to their own
    // country's default locale (then base columns). Same id either way.
    return rows.map((d) => {
      const requestedLocale = locale ?? d.country.defaultLocale;
      const merged = mergeDoctorTranslation(d, requestedLocale, d.country.defaultLocale);
      return stripPrivateContact({
        ...merged,
        specialties: mergeDoctorSpecialties(
          d.specialties,
          requestedLocale,
          d.country.defaultLocale,
        ),
      });
    });
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

/**
 * Count of active doctors across every market. Backs the homepage's
 * "N doctors across Europe" stat — same `where` as `listDoctors` so the
 * number matches the roster, without paying for the full payload + includes
 * (and without the PUBLIC_DOCTORS_LIST_CAP undercounting `.length` would).
 */
export async function countActiveDoctors(): Promise<number> {
  try {
    return await prisma.doctor.count({ where: { active: true } });
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

/**
 * Public roster for a country. Includes doctors whose *primary* country is
 * this one PLUS doctors linked in via the DoctorCountry join (active rows
 * only). Linked rows are deduped if the primary already matches.
 */
export async function listDoctorsByCountry(countryCode: string, locale?: LocaleCode) {
  try {
    const rows = await prisma.doctor.findMany({
      where: {
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
      orderBy: [{ fullName: "asc" }],
      take: PUBLIC_DOCTORS_LIST_CAP,
      include: {
        country: { select: { id: true, code: true, slug: true, name: true, defaultLocale: true, teamPath: true } },
        specialties: {
          include: {
            specialty: {
              include: { translations: { select: publicSpecialtyTranslationSelect } },
            },
          },
        },
        translations: { select: doctorTranslationSelect },
        faqs: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { question: "asc" }],
          select: doctorFaqSelect,
        },
        assets: {
          where: { isActive: true, kind: AssetKind.IMAGE },
          // Deterministic newest-first ordering. The doctor portal and
          // admin image flows both update the canonical profile asset, so
          // updatedAt DESC makes the latest confirmed profile image win.
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            kind: true,
            key: true,
            path: true,
            altText: true,
            title: true,
            caption: true,
            description: true,
            focalX: true,
            focalY: true,
            zoom: true,
          },
        },
        // Per-market registration row. The single DoctorCountry record
        // for the country being viewed replaces the legacy
        // Doctor.imcRegistration field via the post-mapper below — once
        // every reader is on this path, the legacy column drops.
        additionalCountries: {
          where: { country: { code: countryCode } },
          select: {
            id: true,
            countryId: true,
            active: true,
            country: { select: { id: true, code: true, name: true, defaultLocale: true } },
            chamberEntity: true,
            registrationNumber: true,
            registrationUrl: true,
            division: true,
            isVerified: true,
            translations: { select: doctorMarketTranslationSelect },
            divisionTranslations: { select: doctorCountryDivisionTranslationSelect },
          },
          take: 1,
        },
        // Confirmed extra credentials (FRCP, MICGP, fellowships) scoped to
        // this country or global (countryCode null). Drives profile display
        // + Physician hasCredential/recognizedBy schema.
        credentials: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
          select: { label: true, bodyName: true, bodyUrl: true, countryCode: true },
        },
        // Services the doctor is bookable for in this country. Doctor
        // profile page uses this to scope the service list shown next
        // to the calendar.
        assignedServices: {
          where: {
            isActive: true,
            status: "active",
            service: {
              isActive: true,
              visibility: "PUBLIC",
              country: { code: countryCode, isActive: true },
            },
          },
          orderBy: { sortOrder: "asc" },
          select: { serviceId: true },
        },
      },
    });
    // Flag the country's featured doctor (admin-chosen, stored in the
    // Setting table — no Doctor column). The public /doctors page pulls
    // this row out into the FeaturedDoctor spotlight.
    const featuredId = await getFeaturedDoctorId(countryCode);
    return rows.map((d) => {
      const market = d.additionalCountries[0];
      const marketDefaultLocale = market?.country.defaultLocale ?? d.country.defaultLocale;
      const requestedLocale = locale ?? marketDefaultLocale;
      const merged = mergeDoctorTranslation(d, requestedLocale, marketDefaultLocale);
      const marketMerged = mergeDoctorMarketTranslation(
        merged,
        market?.translations,
        requestedLocale,
        marketDefaultLocale,
      );
      return {
        ...stripPrivateContact(
          overrideImcRegistrationFromCountry({
            ...marketMerged,
            specialties: mergeDoctorSpecialties(
              d.specialties,
              requestedLocale,
              marketDefaultLocale,
            ),
          }, countryCode, requestedLocale, marketDefaultLocale),
        ),
        faqs: resolveDoctorFaqs(d.faqs, requestedLocale, marketDefaultLocale),
        isFeatured: d.id === featuredId,
      };
    });
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

type DoctorCredentialRow = {
  label: string;
  bodyName: string;
  bodyUrl: string | null;
  countryCode: string | null;
};

/**
 * Strip clinic-private contact details from a PUBLIC doctor payload. A
 * doctor's phone (WhatsApp) number is for clinic↔clinician contact only and
 * must never appear on public pages or in the public API. (The doctor's email
 * lives on the linked User record, which these public reads never select — so
 * email is already admin/clinic-only.)
 */
function stripPrivateContact<T extends { whatsappNumber?: string | null }>(
  doctor: T,
): Omit<T, "whatsappNumber"> {
  const { whatsappNumber: _omit, ...rest } = doctor;
  return rest;
}

/**
 * Phase 2 shim: the legacy `Doctor.imcRegistration` column is gone.
 * Every public payload that used to surface it now gets the value
 * computed from `DoctorCountry.registrationNumber` for the country
 * being viewed. Frontend display code stays on the legacy field name
 * — only the data source moved.
 *
 * Trust-authority extension: also surfaces the chamber (IMC/OM/…), the
 * register division (IMC General/Specialist), the verified flag, and the
 * doctor's confirmed extra credentials filtered to this country (or global).
 */
function overrideImcRegistrationFromCountry<
  T extends {
    additionalCountries?: Array<{
      chamberEntity: string | null;
      registrationNumber: string | null;
      registrationUrl?: string | null;
      division?: string | null;
      divisionTranslations?: DoctorCountryDivisionTranslationRow[];
      isVerified: boolean;
    }>;
    credentials?: DoctorCredentialRow[];
    medicalRegistrationUrl?: string | null;
  },
>(
  doctor: T,
  countryCode: string,
  requestedLocale: LocaleCode,
  defaultLocale: LocaleCode,
): T & {
  imcRegistration: string | null;
  registrationChamber: string | null;
  registrationDivision: string | null;
  registrationVerified: boolean;
  credentials: DoctorCredentialRow[];
} {
  const link = doctor.additionalCountries?.[0];
  const code = countryCode.toUpperCase();
  const credentials = (doctor.credentials ?? []).filter(
    (c) => !c.countryCode || c.countryCode.toUpperCase() === code,
  );
  const { tr: divisionTr } = resolveTranslation(
    link?.divisionTranslations ?? [],
    requestedLocale,
    defaultLocale,
  );
  return {
    ...doctor,
    // Per-country verify link wins over the legacy doctor-level URL so a
    // multi-country doctor links to the right chamber on each market's page.
    medicalRegistrationUrl: link?.registrationUrl ?? doctor.medicalRegistrationUrl ?? null,
    imcRegistration: link?.registrationNumber ?? null,
    registrationChamber: link?.chamberEntity ?? null,
    registrationDivision: divisionTr?.division ?? link?.division ?? null,
    registrationVerified: link?.isVerified ?? false,
    credentials,
  };
}

/**
 * Single-profile lookup by `{ country code, doctor slug }`. Doctor's slug
 * is globally scoped to its primary country (schema `@@unique([countryId, slug])`),
 * but multi-country listings mean the URL `/{otherCountry}/{lang}/doctors/{slug}`
 * is also valid — we accept the match if the doctor is linked into that
 * country via DoctorCountry.
 */
export async function getDoctorByCountryAndSlug(
  countryCode: string,
  slug: string,
  locale?: LocaleCode,
) {
  try {
    const doctor = await prisma.doctor.findFirst({
      where: {
        slug,
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
      include: {
        country: { select: { id: true, code: true, slug: true, name: true, defaultLocale: true, teamPath: true } },
        specialties: {
          include: {
            specialty: {
              include: { translations: { select: publicSpecialtyTranslationSelect } },
            },
          },
        },
        translations: { select: doctorTranslationSelect },
        faqs: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { question: "asc" }],
          select: doctorFaqSelect,
        },
        assets: {
          where: { isActive: true, kind: AssetKind.IMAGE },
          // Match the listing endpoint's newest-first asset ordering so
          // the same doctor renders the same portrait on list and detail.
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            kind: true,
            key: true,
            path: true,
            altText: true,
            title: true,
            caption: true,
            description: true,
            focalX: true,
            focalY: true,
            zoom: true,
          },
        },
        // Per-market registration row for this country (see Phase 2
        // note on overrideImcRegistrationFromCountry below).
        additionalCountries: {
          where: { country: { code: countryCode } },
          select: {
            id: true,
            countryId: true,
            active: true,
            country: { select: { id: true, code: true, name: true, defaultLocale: true } },
            chamberEntity: true,
            registrationNumber: true,
            registrationUrl: true,
            division: true,
            isVerified: true,
            translations: { select: doctorMarketTranslationSelect },
            divisionTranslations: { select: doctorCountryDivisionTranslationSelect },
          },
          take: 1,
        },
        // Confirmed extra credentials (FRCP, MICGP, fellowships) scoped to
        // this country or global (countryCode null). Drives profile display
        // + Physician hasCredential/recognizedBy schema.
        credentials: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
          select: { label: true, bodyName: true, bodyUrl: true, countryCode: true },
        },
        // Active service assignments scoped to the country being viewed.
        assignedServices: {
          where: {
            isActive: true,
            service: {
              isActive: true,
              country: { code: countryCode, isActive: true },
            },
          },
          orderBy: { sortOrder: "asc" },
          include: {
            service: {
              select: {
                id: true,
                slug: true,
                name: true,
                kind: true,
                summary: true,
                durationMinutes: true,
                basePriceCents: true,
                currencyCode: true,
              },
            },
          },
        },
      },
    });
    if (!doctor) return null;
    const market = doctor.additionalCountries[0];
    const marketDefaultLocale = market?.country.defaultLocale ?? doctor.country.defaultLocale;
    const requestedLocale = locale ?? marketDefaultLocale;
    const merged = mergeDoctorTranslation(doctor, requestedLocale, marketDefaultLocale);
    const marketMerged = mergeDoctorMarketTranslation(
      merged,
      market?.translations,
      requestedLocale,
      marketDefaultLocale,
    );
      return {
        ...stripPrivateContact(
          overrideImcRegistrationFromCountry({
            ...marketMerged,
            specialties: mergeDoctorSpecialties(
              doctor.specialties,
              requestedLocale,
              marketDefaultLocale,
            ),
          }, countryCode, requestedLocale, marketDefaultLocale),
        ),
      faqs: resolveDoctorFaqs(doctor.faqs, requestedLocale, marketDefaultLocale),
    };
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new DoctorCountryNotFoundError();
}

async function assertSpecialtiesForCountry(specialtyIds: string[], countryId: string): Promise<void> {
  if (specialtyIds.length === 0) return;
  const rows = await prisma.specialty.findMany({
    where: { id: { in: specialtyIds } },
    select: { id: true, countryId: true },
  });
  if (rows.length !== specialtyIds.length) {
    throw new DoctorSpecialtyInvalidError("One or more specialties were not found");
  }
  for (const row of rows) {
    if (row.countryId !== countryId) {
      throw new DoctorSpecialtyInvalidError();
    }
  }
}

function buildAdminDoctorWhere(query: AdminDoctorsQuery): Prisma.DoctorWhereInput {
  const andClauses: Prisma.DoctorWhereInput[] = [];

  if (query.countryId) {
    andClauses.push({
      OR: [
        { countryId: query.countryId },
        { additionalCountries: { some: { active: true, countryId: query.countryId } } },
      ],
    });
  }
  if (query.countryCode) {
    andClauses.push({
      OR: [
        { country: { code: query.countryCode } },
        { additionalCountries: { some: { active: true, country: { code: query.countryCode } } } },
      ],
    });
  }

  if (query.serviceKind) {
    andClauses.push({
      assignedServices: {
        some: {
          isActive: true,
          status: "active",
          service: { kind: query.serviceKind, isActive: true },
        },
      },
    });
  }
  if (query.isActive !== undefined) {
    andClauses.push({ active: query.isActive });
  }

  const term = query.search?.trim();
  if (term && term.length > 0) {
    andClauses.push({
      OR: [
        { fullName: { contains: term, mode: "insensitive" } },
        { title: { contains: term, mode: "insensitive" } },
        { bio: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  return andClauses.length === 0 ? {} : andClauses.length === 1 ? andClauses[0]! : { AND: andClauses };
}

export async function listAdminDoctors(query: AdminDoctorsQuery): Promise<ListAdminDoctorsResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const where = buildAdminDoctorWhere(query);

  try {
    const total = await prisma.doctor.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const skip = (effectivePage - 1) * pageSize;

    const items = await prisma.doctor.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ country: { name: "asc" } }, { fullName: "asc" }],
      include: adminDoctorInclude,
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
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

export async function getAdminDoctorById(id: string): Promise<AdminDoctorRecord | null> {
  try {
    return await prisma.doctor.findUnique({
      where: { id },
      include: adminDoctorInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

async function syncProfileImageAsset(
  doctorId: string,
  countryId: string,
  profileImagePath: string | null | undefined,
  imageSeo?: {
    profileImageAltText?: string | null;
    profileImageTitle?: string | null;
    profileImageCaption?: string | null;
    profileImageDescription?: string | null;
    profileImageFocalX?: number;
    profileImageFocalY?: number;
    profileImageZoom?: number;
  },
): Promise<void> {
  const key = doctorProfileImageKey(doctorId);

  if (profileImagePath === undefined) {
    return;
  }

  if (profileImagePath === null || profileImagePath === "") {
    await prisma.asset.deleteMany({
      where: {
        doctorId,
        kind: AssetKind.IMAGE,
        key,
      },
    });
    return;
  }

  // Deactivate any OTHER active IMAGE assets for this doctor before
  // writing the admin's canonical row. The doctor-portal upload flow
  // (POST /api/doctor/profile/photo) creates a separately-keyed asset
  // and deactivates everything else — if that ran after a prior admin
  // upload, the canonical `doctor-<id>-profile` row was left with
  // `isActive: false`. Public reads filter `isActive: true`, so the
  // doctor-portal row keeps winning and the admin's update appears to
  // "revert" after a few hours. Forcing isActive=true on upsert + sweeping
  // siblings here gives admin the last word.
  await prisma.$transaction([
    prisma.asset.updateMany({
      where: {
        doctorId,
        kind: AssetKind.IMAGE,
        isActive: true,
        NOT: { key },
      },
      data: { isActive: false },
    }),
    prisma.asset.upsert({
      where: {
        kind_key: { kind: AssetKind.IMAGE, key },
      },
      create: {
        kind: AssetKind.IMAGE,
        key,
        path: profileImagePath,
        doctorId,
        countryId,
        altText: imageSeo?.profileImageAltText ?? null,
        title: imageSeo?.profileImageTitle ?? null,
        caption: imageSeo?.profileImageCaption ?? null,
        description: imageSeo?.profileImageDescription ?? null,
        focalX: imageSeo?.profileImageFocalX ?? 50,
        focalY: imageSeo?.profileImageFocalY ?? 50,
        zoom: imageSeo?.profileImageZoom ?? 1,
        isActive: true,
      },
      update: {
        path: profileImagePath,
        doctorId,
        countryId,
        ...(imageSeo?.profileImageAltText !== undefined && {
          altText: imageSeo.profileImageAltText,
        }),
        ...(imageSeo?.profileImageTitle !== undefined && {
          title: imageSeo.profileImageTitle,
        }),
        ...(imageSeo?.profileImageCaption !== undefined && {
          caption: imageSeo.profileImageCaption,
        }),
        ...(imageSeo?.profileImageDescription !== undefined && {
          description: imageSeo.profileImageDescription,
        }),
        ...(imageSeo?.profileImageFocalX !== undefined && {
          focalX: imageSeo.profileImageFocalX,
        }),
        ...(imageSeo?.profileImageFocalY !== undefined && {
          focalY: imageSeo.profileImageFocalY,
        }),
        ...(imageSeo?.profileImageZoom !== undefined && {
          zoom: imageSeo.profileImageZoom,
        }),
        isActive: true,
      },
    }),
  ]);
}

/**
 * Sync the additional-country listings for a doctor. The primary country
 * stays on `Doctor.countryId` and is excluded from this set — only "extra"
 * countries the doctor practises in get a DoctorCountry row.
 *
 * Behavior on UNCHECKED countries:
 *   - If the row holds registration data (chamberEntity or registrationNumber),
 *     it is DEACTIVATED (`active: false`) — the row is preserved so the
 *     medical-registration that admins entered separately via the
 *     /admin/doctors/:id/registrations/:countryId endpoint is never silently
 *     destroyed by an unrelated profile save. Re-ticking the country in the
 *     profile form (or saving the registration again) re-activates the row.
 *   - If the row is empty (no registration data), it is DELETED — pure
 *     visibility toggle, no data to preserve.
 *
 * Pass `additionalCountryIds: undefined` to skip the sync entirely.
 */
async function syncAdditionalCountries(
  tx: Prisma.TransactionClient,
  doctorId: string,
  primaryCountryId: string,
  additionalCountryIds: string[] | undefined,
): Promise<void> {
  if (additionalCountryIds === undefined) return;
  // DoctorCountry is the canonical market row, including the primary country.
  const desired = new Set(
    [primaryCountryId, ...additionalCountryIds],
  );
  const existing = await tx.doctorCountry.findMany({
    where: { doctorId },
    select: {
      id: true,
      countryId: true,
      active: true,
      chamberEntity: true,
      registrationNumber: true,
    },
  });
  const existingIds = new Set(existing.map((r) => r.countryId));

  const toCreate = [...desired].filter((id) => !existingIds.has(id));
  const toRemove = existing.filter((r) => !desired.has(r.countryId));
  const toReactivate = existing.filter(
    (r) => desired.has(r.countryId) && !r.active,
  );

  // Split removals: deactivate rows that hold registration data,
  // delete rows that are empty.
  const removeWithData = toRemove.filter(
    (r) => Boolean(r.chamberEntity) || Boolean(r.registrationNumber),
  );
  const removeEmpty = toRemove.filter(
    (r) => !r.chamberEntity && !r.registrationNumber,
  );

  if (removeEmpty.length > 0) {
    await tx.doctorCountry.deleteMany({
      where: { id: { in: removeEmpty.map((r) => r.id) } },
    });
  }
  if (removeWithData.length > 0) {
    await tx.doctorCountry.updateMany({
      where: { id: { in: removeWithData.map((r) => r.id) } },
      data: { active: false },
    });
  }
  if (toReactivate.length > 0) {
    await tx.doctorCountry.updateMany({
      where: { id: { in: toReactivate.map((r) => r.id) } },
      data: { active: true },
    });
  }
  if (toCreate.length > 0) {
    await tx.doctorCountry.createMany({
      data: toCreate.map((countryId) => ({ doctorId, countryId })),
    });
  }
}

export async function createAdminDoctor(input: AdminDoctorCreateBody): Promise<AdminDoctorRecord> {
  await assertCountryExists(input.countryId);
  await assertSpecialtiesForCountry(input.specialtyIds, input.countryId);
  const primaryCountry = await prisma.country.findUnique({
    where: { id: input.countryId },
    select: { code: true },
  });

  try {
    const doctor = await prisma.$transaction(async (tx) => {
      const created = await tx.doctor.create({
        data: {
          countryId: input.countryId,
          slug: input.slug,
          fullName: input.fullName,
          title: input.title,
          bio: sanitizeRichHtml(input.bio),
          // Phase 2: imcRegistration column is gone. The admin schema
          // still accepts the field for backward compat with old form
          // submissions (a stale frontend cache might POST it); we just
          // drop it on the floor here. Real per-country registrations
          // are saved via /api/admin/doctors/:id/registrations/:countryId.
          medicalRegistrationUrl: input.medicalRegistrationUrl ?? null,
          qualifications: input.qualifications ?? [],
          whatsappNumber: normalizeDoctorWhatsAppForStorage(
            input.whatsappNumber,
            primaryCountry?.code,
          ),
          instagramUrl: input.instagramUrl ?? null,
          facebookUrl: input.facebookUrl ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          languages: input.languages ?? [],
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          active: input.active ?? true,
          specialties: {
            create: input.specialtyIds.map((specialtyId) => ({
              specialty: { connect: { id: specialtyId } },
            })),
          },
        },
        include: adminDoctorInclude,
      });

      const path = input.profileImagePath;
      if (path !== undefined && path !== null && path !== "") {
        await tx.asset.upsert({
          where: {
            kind_key: {
              kind: AssetKind.IMAGE,
              key: doctorProfileImageKey(created.id),
            },
          },
          create: {
            kind: AssetKind.IMAGE,
            key: doctorProfileImageKey(created.id),
            path,
            doctorId: created.id,
            countryId: input.countryId,
            altText: input.profileImageAltText ?? null,
            title: input.profileImageTitle ?? null,
            caption: input.profileImageCaption ?? null,
            description: input.profileImageDescription ?? null,
            focalX: input.profileImageFocalX ?? 50,
            focalY: input.profileImageFocalY ?? 50,
            zoom: input.profileImageZoom ?? 1,
          },
          update: {
            path,
            doctorId: created.id,
            countryId: input.countryId,
            altText: input.profileImageAltText ?? null,
            title: input.profileImageTitle ?? null,
            caption: input.profileImageCaption ?? null,
            description: input.profileImageDescription ?? null,
            focalX: input.profileImageFocalX ?? 50,
            focalY: input.profileImageFocalY ?? 50,
            zoom: input.profileImageZoom ?? 1,
          },
        });
      }

      // Multi-country listings — the M:N join only carries additional
      // countries; the primary one lives on Doctor.countryId.
      await ensurePrimaryDoctorCountry(tx, created.id, input.countryId);
      await syncAdditionalCountries(
        tx,
        created.id,
        input.countryId,
        input.additionalCountryIds,
      );

      if (input.translations !== undefined) {
        await upsertDoctorTranslations(tx, created.id, input.countryId, input.translations);
      }

      await syncLegacyImcRegistrationToPrimaryCountry(
        tx,
        created.id,
        input.countryId,
        input.imcRegistration,
      );

      return tx.doctor.findUniqueOrThrow({
        where: { id: created.id },
        include: adminDoctorInclude,
      });
    }, ADMIN_DOCTOR_TX_OPTIONS);

    return doctor;
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

export type UpdateAdminDoctorResult = {
  doctor: AdminDoctorRecord;
  /**
   * Populated when the PATCH changed `Doctor.countryId`. Lets the route
   * handler emit a precise audit record (`from`/`to`) and bust caches
   * for the OLD country code in addition to the new one.
   */
  countryChange: {
    fromCountryId: string;
    fromCountryCode: string | null;
    toCountryId: string;
    toCountryCode: string | null;
  } | null;
};

export async function updateAdminDoctor(
  id: string,
  body: AdminDoctorUpdateBody,
): Promise<UpdateAdminDoctorResult | null> {
  const existing = await prisma.doctor.findUnique({
    where: { id },
    select: {
      countryId: true,
      country: { select: { code: true } },
    },
  });
  if (!existing) return null;

  const nextCountryId = body.countryId ?? existing.countryId;
  const countryChanging =
    body.countryId !== undefined && body.countryId !== existing.countryId;

  // Honor admin-supplied specialtyIds when present (validated against the
  // NEW primary country). When the country changes and admin did NOT send a
  // new specialty list, clear the existing assignments — they belong to the
  // old country and would FK-conflict with new-country specialties.
  const nextSpecialtyIds =
    body.specialtyIds !== undefined
      ? body.specialtyIds
      : countryChanging
        ? []
        : undefined;
  if (nextSpecialtyIds !== undefined && nextSpecialtyIds.length > 0) {
    await assertSpecialtiesForCountry(nextSpecialtyIds, nextCountryId);
  }

  const nextCountryCode =
    countryChanging && body.countryId
      ? (
          await prisma.country.findUnique({
            where: { id: body.countryId },
            select: { code: true },
          })
        )?.code ?? existing.country.code
      : existing.country.code;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.doctor.update({
        where: { id },
        data: {
          ...(body.countryId !== undefined && { countryId: body.countryId }),
          ...(body.slug !== undefined && { slug: body.slug }),
          ...(body.fullName !== undefined && { fullName: body.fullName }),
          ...(body.title !== undefined && { title: body.title }),
          ...(body.bio !== undefined && { bio: sanitizeRichHtml(body.bio) }),
          // Phase 2: imcRegistration column dropped — silently ignore
          // any legacy frontend that still posts it. Real registrations
          // live on DoctorCountry rows now.
          ...(body.medicalRegistrationUrl !== undefined && { medicalRegistrationUrl: body.medicalRegistrationUrl }),
          ...(body.qualifications !== undefined && { qualifications: body.qualifications }),
          ...(body.whatsappNumber !== undefined && {
            whatsappNumber: normalizeDoctorWhatsAppForStorage(
              body.whatsappNumber,
              nextCountryCode,
            ),
          }),
          ...(body.instagramUrl !== undefined && { instagramUrl: body.instagramUrl }),
          ...(body.facebookUrl !== undefined && { facebookUrl: body.facebookUrl }),
          ...(body.linkedinUrl !== undefined && { linkedinUrl: body.linkedinUrl }),
          ...(body.languages !== undefined && { languages: body.languages }),
          ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle }),
          ...(body.seoDescription !== undefined && {
            seoDescription: body.seoDescription,
          }),
          ...(body.active !== undefined && { active: body.active }),
          ...(body.canCreateManualAppointments !== undefined && {
            canCreateManualAppointments: body.canCreateManualAppointments,
          }),
          ...(body.canRequestCrossJurisdictionRx !== undefined && {
            canRequestCrossJurisdictionRx: body.canRequestCrossJurisdictionRx,
          }),
          ...(body.isCountryDirector !== undefined && {
            isCountryDirector: body.isCountryDirector,
          }),
          ...(body.trustpilotInviteEnabled !== undefined && {
            trustpilotInviteEnabled: body.trustpilotInviteEnabled,
          }),
          ...(body.crossBorderRxEnabled !== undefined && {
            crossBorderRxEnabled: body.crossBorderRxEnabled,
          }),
          ...(body.crossBorderRxPriceCents !== undefined && {
            crossBorderRxPriceCents: body.crossBorderRxPriceCents,
          }),
          ...(body.crossBorderRxPayoutCents !== undefined && {
            crossBorderRxPayoutCents: body.crossBorderRxPayoutCents,
          }),
        },
        include: { country: { select: { id: true, code: true } } },
      });

      if (nextSpecialtyIds !== undefined) {
        await tx.doctorSpecialty.deleteMany({ where: { doctorId: id } });
        if (nextSpecialtyIds.length > 0) {
          await tx.doctorSpecialty.createMany({
            data: nextSpecialtyIds.map((specialtyId) => ({ doctorId: id, specialtyId })),
          });
        }
      }

      const effectiveCountryId = updated.countryId;
      await ensurePrimaryDoctorCountry(tx, id, effectiveCountryId);
      await syncProfileImageAsset(id, effectiveCountryId, body.profileImagePath, body);

      if (body.translations !== undefined) {
        await upsertDoctorTranslations(tx, id, effectiveCountryId, body.translations);
      }

      await syncAdditionalCountries(
        tx,
        id,
        effectiveCountryId,
        body.additionalCountryIds,
      );

      // Country-director grants. MUST run after syncAdditionalCountries above —
      // it creates/removes the DoctorCountry rows this flips, so flipping first
      // would lose a grant on a market added in the same save.
      //
      // Clear-then-set (rather than a diff) so an unticked country is always
      // revoked, and both updateMany calls are scoped by `doctorId` so a stray
      // countryId can only ever match a market the doctor actually operates in.
      if (body.directorCountryIds !== undefined) {
        await tx.doctorCountry.updateMany({
          where: { doctorId: id, directorAccess: true },
          data: { directorAccess: false },
        });
        if (body.directorCountryIds.length > 0) {
          await tx.doctorCountry.updateMany({
            where: { doctorId: id, countryId: { in: body.directorCountryIds } },
            data: { directorAccess: true },
          });
        }
      }

      // Per-country cross-border prescriber price + payout. Upsert each entry;
      // a row with neither price nor payout is deleted so that country falls out
      // of the requesting-doctor picker ("not set" → not offered).
      if (body.crossBorderRxCountries !== undefined) {
        for (const entry of body.crossBorderRxCountries) {
          if (entry.priceCents == null && entry.payoutCents == null) {
            await tx.doctorCrossBorderRxCountry.deleteMany({
              where: { doctorId: id, countryId: entry.countryId },
            });
            continue;
          }
          await tx.doctorCrossBorderRxCountry.upsert({
            where: { doctorId_countryId: { doctorId: id, countryId: entry.countryId } },
            create: {
              doctorId: id,
              countryId: entry.countryId,
              priceCents: entry.priceCents,
              payoutCents: entry.payoutCents,
            },
            update: { priceCents: entry.priceCents, payoutCents: entry.payoutCents },
          });
        }
      }

      if (body.imcRegistration !== undefined) {
        await syncLegacyImcRegistrationToPrimaryCountry(
          tx,
          id,
          effectiveCountryId,
          body.imcRegistration,
        );
      }

      // When the primary country changed, repoint the existing portrait
      // Asset.countryId so country-scoped admin asset queries don't keep
      // classifying the doctor's image under the OLD country. syncProfileImageAsset
      // above only fires when the admin actually re-uploaded — for a country-only
      // PATCH we still need to repoint the row in place.
      if (countryChanging && body.profileImagePath === undefined) {
        await tx.asset.updateMany({
          where: {
            doctorId: id,
            kind: AssetKind.IMAGE,
            key: doctorProfileImageKey(id),
          },
          data: { countryId: effectiveCountryId },
        });
      }

      // When the primary country changed, prune ServiceDoctor join rows
      // that point at services the doctor is no longer reachable from.
      // Effective country set = new primary + supplied additionalCountryIds
      // (when omitted, we fall back to the rows currently in DoctorCountry).
      if (countryChanging) {
        const effectiveCountryIds = new Set<string>([effectiveCountryId]);
        if (body.additionalCountryIds !== undefined) {
          for (const cid of body.additionalCountryIds) {
            effectiveCountryIds.add(cid);
          }
        } else {
          const linked = await tx.doctorCountry.findMany({
            where: { doctorId: id, active: true },
            select: { countryId: true },
          });
          for (const link of linked) effectiveCountryIds.add(link.countryId);
        }
        await tx.serviceDoctor.deleteMany({
          where: {
            doctorId: id,
            service: { countryId: { notIn: [...effectiveCountryIds] } },
          },
        });
      }

      const refreshed = await tx.doctor.findUniqueOrThrow({
        where: { id },
        include: adminDoctorInclude,
      });
      return {
        doctor: refreshed,
        countryChange: countryChanging
          ? {
              fromCountryId: existing.countryId,
              fromCountryCode: existing.country?.code ?? null,
              toCountryId: effectiveCountryId,
              toCountryCode: updated.country?.code ?? null,
            }
          : null,
      } satisfies UpdateAdminDoctorResult;
    }, ADMIN_DOCTOR_TX_OPTIONS);

    return result;
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

export async function disableAdminDoctor(id: string): Promise<AdminDoctorRecord | null> {
  const existing = await prisma.doctor.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  try {
    return await prisma.doctor.update({
      where: { id },
      data: { active: false },
      include: adminDoctorInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

export async function purgeAdminDoctor(id: string): Promise<boolean> {
  const existing = await prisma.doctor.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  try {
    await prisma.doctor.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

/**
 * Clinical rows that make a hard delete impossible. Every one of these is
 * `onDelete: Restrict` on a non-nullable `doctorId`, so Postgres refuses the
 * delete (P2003) while any exist — and they are retained medical records, so
 * the right answer is to deactivate the doctor, never to cascade them away.
 */
export type DoctorDeleteBlockers = {
  consultations: number;
  prescriptions: number;
  examResults: number;
  generatedDocuments: number;
  appointmentDocuments: number;
  medicalNotes: number;
};

export type DoctorDeleteImpact = {
  /** Bookings that have not happened yet — purging unassigns, never deletes. */
  futureAppointments: number;
  pastAppointments: number;
  blockers: DoctorDeleteBlockers;
  /** True when any blocker count is non-zero, i.e. the purge cannot proceed. */
  blocked: boolean;
};

/** Statuses that mean the appointment is still live (not cancelled/completed). */
const OPEN_APPOINTMENT_STATUSES = [
  "REQUEST_RECEIVED",
  "UNDER_REVIEW",
  "CONTACTED",
] as const satisfies readonly AppointmentStatus[];

/**
 * Count everything a hard delete of this doctor would touch, so the admin UI
 * can warn precisely and the purge route can enforce the same rules.
 * Returns null when the doctor does not exist.
 */
export async function getDoctorDeleteImpact(
  id: string,
  now: Date = new Date(),
): Promise<DoctorDeleteImpact | null> {
  const existing = await prisma.doctor.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  try {
    // "Future" = still going to happen: a slot booked ahead of now, or an open
    // request that has not been scheduled yet. Cancelled/completed are neither.
    const futureAppointmentWhere = {
      doctorId: id,
      status: { in: [...OPEN_APPOINTMENT_STATUSES] },
      OR: [{ scheduledAt: { gt: now } }, { scheduledAt: null }],
    };

    const [
      totalAppointments,
      futureAppointments,
      consultations,
      prescriptions,
      examResults,
      generatedDocuments,
      appointmentDocuments,
      medicalNotes,
    ] = await prisma.$transaction([
      prisma.appointment.count({ where: { doctorId: id } }),
      prisma.appointment.count({ where: futureAppointmentWhere }),
      prisma.consultation.count({ where: { doctorId: id } }),
      prisma.prescription.count({ where: { doctorId: id } }),
      prisma.examResult.count({ where: { doctorId: id } }),
      prisma.generatedDocument.count({ where: { doctorId: id } }),
      prisma.appointmentDocument.count({ where: { doctorId: id } }),
      prisma.medicalNote.count({ where: { createdByDoctorId: id } }),
    ]);

    const blockers: DoctorDeleteBlockers = {
      consultations,
      prescriptions,
      examResults,
      generatedDocuments,
      appointmentDocuments,
      medicalNotes,
    };

    return {
      futureAppointments,
      pastAppointments: totalAppointments - futureAppointments,
      blockers,
      blocked: Object.values(blockers).some((count) => count > 0),
    };
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}
