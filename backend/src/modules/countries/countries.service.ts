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
import { invalidateBookabilityCache } from "../bookability/bookability.service.js";

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

/* ------------------------------------------------------------------ *
 * PR-1 — the public `/api/countries` projection.
 *
 * `listCountries` used to `include:` the Country model root plus the whole
 * `Currency` relation, so the endpoint published the FK `currencyId`, the
 * medical-access `accessModel`, the billing-model `commissionReceiptEnabled`,
 * both row timestamps and a `Currency` row nothing public reads. This
 * `select` decides what leaves the database, so a column added to the model
 * later cannot appear in public JSON until it is added here on purpose.
 *
 * This projection is deliberately WIDER than the nested country selection in
 * doctors.service.ts / services.service.ts: `/api/countries` is where the
 * frontend builds its routing table, so the four path columns, the feature
 * gates and the booking intake rules are public contract, not leaks. Their
 * single consumer is `frontend/lib/content/get-public-countries.ts`
 * (`extractBackendCountryOverlay` + `getPublicBookingRequirements`) — check
 * it before narrowing anything below.
 *
 * `isActive` is absent on purpose rather than by oversight: the reader's own
 * `where` pins it to `true`, and availability reaches the frontend as
 * presence in this array (an inactive market is simply skipped).
 * ------------------------------------------------------------------ */
const publicCountrySelect = {
  id: true,
  code: true,
  name: true,
  slug: true,
  defaultLocale: true,
  // Country/locale routing + the legacy redirect targets.
  legacyHomePath: true,
  teamPath: true,
  generalConsultationPath: true,
  specialistConsultationPath: true,
  // Nav, footer and sitemap feature gates (/admin/country-features).
  enabledFeatures: true,
  // Supported locales. Only `locale` is read; `isDefault` is redundant with
  // the `defaultLocale` column above.
  countryLocales: {
    orderBy: { locale: "asc" as const },
    select: { locale: true },
  },
  // Clinic timezone drives patient-facing slot display. The intake
  // requiredness flags are public too — the storefront booking form needs
  // them to mark phone/DOB/address/national-ID as required (or not) instead
  // of guessing, which previously caused a mismatch between the form's
  // "(optional)" label and the server's 400. `bookingEnabled` and
  // `doctorServiceSelfSelectApproval` are internal and stay out.
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
} satisfies Prisma.CountrySelect;

export async function listCountries() {
  try {
    return await prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: publicCountrySelect,
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
          ...(input.commissionReceiptEnabled !== undefined && {
            commissionReceiptEnabled: input.commissionReceiptEnabled,
          }),
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
    const updatedCountry = await prisma.$transaction(async (tx) => {
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
          ...(body.commissionReceiptEnabled !== undefined && {
            commissionReceiptEnabled: body.commissionReceiptEnabled,
          }),
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
    if (body.bookingSetting !== undefined) {
      invalidateBookabilityCache();
    }
    return updatedCountry;
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

// ── Country delete impact (AZ-3) ───────────────────────────────────────────

/**
 * Categories of durable record that a country purge must never destroy. Any
 * non-zero count refuses the delete outright — there is no `force` override,
 * because none of these can be recreated and several are legally retained.
 *
 * `Country` is the root of an 80-table `ON DELETE CASCADE` closure (measured
 * against this schema, not assumed from the model names), so a bare
 * `country.delete()` reached, among others:
 *
 *   MembershipPlan.primaryCountryId → MembershipEnrollment → allowance
 *   balances, usage ledger, claim tokens and invite logs; Service.countryId →
 *   MembershipBenefit → allowance balances; Doctor.countryId → the doctor's
 *   bank account, credentials, signed confidentiality agreement and support
 *   threads; CountryLegalDocument.
 *
 * and SET NULL gutted what it did not delete: `Appointment.doctorId`,
 * `.serviceId`, `.clinicId`, `.healthTestId`, `.timeSlotId` and
 * `PatientProfile.pricingPlanId`.
 *
 * A few of these categories are `onDelete: Restrict` and would have refused
 * the delete anyway (the clinical records, `JobListing`, `UserSubscription`,
 * `HealthTestRedemption`) — but as a bare P2003, after the caller had already
 * been told the delete was safe. They are counted here so the answer is the
 * same one the admin was shown.
 *
 * Composite categories are documented where they occur. Counts are per
 * category, and one record can be counted in two of them (an appointment for a
 * consultation with one of this country's doctors is both `appointments` and
 * `clinicalRecords`), so they do not sum to a row total and are never
 * presented as one.
 */
export type CountryDeleteBlockers = {
  /** Doctor rows primary to this market, plus DoctorCountry roster links from
   *  doctors primary elsewhere (whose market bank account cascades with it). */
  doctors: number;
  /** Appointments in this market, or attached to one of its doctors,
   *  services, clinics, health tests or time slots. */
  appointments: number;
  /** Consultations, prescriptions, exam results, generated documents,
   *  attached documents and medical notes authored by this market's doctors. */
  clinicalRecords: number;
  /** Patient profiles pointing at one of this market's pricing plans — a
   *  purge would silently null the reference on a patient row. */
  patientRecords: number;
  membershipEnrollments: number;
  allowanceBalances: number;
  allowanceUsage: number;
  /** Subscriptions billed in this market or on one of its pricing plans. */
  subscriptions: number;
  /** Orders, order items, doctor bank accounts, market bank accounts and
   *  health-test redemptions. */
  financialRecords: number;
  /** Corporate companies, plan services and benefit rules reaching this
   *  market. */
  corporateRecords: number;
  /** Published legal terms — the versions patients accepted. */
  legalDocuments: number;
  /** `onDelete: Restrict`; the delete cannot succeed while any exist. */
  jobListings: number;
};

/**
 * Country-owned configuration that the cascade removes. Safe to lose ONLY
 * because the blocker list above is exhaustive over these rows' durable
 * descendants: a service with allowance balances or appointments, a pricing
 * plan with subscriptions, a health test with redemptions and a membership
 * plan with enrollments each block before any of this is reached.
 *
 * A summary of the principal groups, not a row-by-row inventory of all 80
 * cascaded tables — translations, FAQs, peak-pricing windows and the like
 * follow their parent.
 */
export type CountryDeleteRemovableConfiguration = {
  locales: number;
  domains: number;
  clinics: number;
  specialties: number;
  services: number;
  healthTests: number;
  pricingPlans: number;
  membershipPlans: number;
  /** Content pages and their per-section content rows. */
  contentPages: number;
  seoLandingPages: number;
  /** Media assets, badges and partners. */
  mediaAssets: number;
  testCenters: number;
  insuranceCompanies: number;
  /** Consultation/booking settings, footer, data policy, legal profile and
   *  authority links — the country's singleton settings rows. */
  marketSettings: number;
};

/**
 * `onDelete: SetNull` rows that SURVIVE the purge but lose their country
 * link. Reported, never blocked and never touched by this code: they are
 * editorial rows, not durable member, financial or clinical history. The
 * SET NULL edges that WOULD corrupt durable data — appointments, patient
 * profiles — are counted as blockers above instead.
 */
export type CountryDeleteDetachedRecords = {
  blogPosts: number;
  faqs: number;
  reviews: number;
};

export type CountryDeleteImpact = {
  /** True when any blocker count is non-zero, i.e. the purge cannot proceed. */
  blocked: boolean;
  blockers: CountryDeleteBlockers;
  removableConfiguration: CountryDeleteRemovableConfiguration;
  detachedRecords: CountryDeleteDetachedRecords;
};

export class CountryDeleteBlockedError extends Error {
  constructor(readonly impact: CountryDeleteImpact) {
    super("Country has durable records that must be retained");
    this.name = "CountryDeleteBlockedError";
  }
}

/** Reads through either the shared client or a transaction client, so the
 *  informational endpoint and the enforced re-check share one implementation. */
type CountryCountClient = Prisma.TransactionClient;

const sum = (counts: number[]) => counts.reduce((total, n) => total + n, 0);

async function countCountryBlockers(
  db: CountryCountClient,
  countryId: string,
  countryCode: string,
): Promise<CountryDeleteBlockers> {
  const doctorInCountry = { doctor: { countryId } };
  const [
    doctors,
    doctorCountryLinks,
    appointments,
    consultations,
    prescriptions,
    examResults,
    generatedDocuments,
    appointmentDocuments,
    medicalNotes,
    patientRecords,
    membershipEnrollments,
    allowanceBalances,
    allowanceUsage,
    subscriptions,
    orders,
    orderItems,
    doctorBankAccounts,
    marketBankAccounts,
    healthTestRedemptions,
    corporateCompanies,
    corporatePlanServices,
    corporateBenefitRules,
    legalDocuments,
    jobListings,
  ] = await Promise.all([
    db.doctor.count({ where: { countryId } }),
    db.doctorCountry.count({ where: { countryId } }),
    db.appointment.count({
      where: {
        OR: [
          { countryCode },
          doctorInCountry,
          { service: { countryId } },
          { clinic: { countryId } },
          { healthTest: { countryId } },
          { timeSlot: { doctor: { countryId } } },
        ],
      },
    }),
    db.consultation.count({ where: doctorInCountry }),
    db.prescription.count({ where: doctorInCountry }),
    db.examResult.count({ where: doctorInCountry }),
    db.generatedDocument.count({ where: doctorInCountry }),
    db.appointmentDocument.count({ where: doctorInCountry }),
    db.medicalNote.count({ where: { createdByDoctor: { countryId } } }),
    db.patientProfile.count({ where: { pricingPlan: { countryId } } }),
    db.membershipEnrollment.count({ where: { countryId } }),
    db.membershipAllowanceBalance.count({
      where: { OR: [{ holderEnrollment: { countryId } }, { benefit: { countryId } }] },
    }),
    db.membershipUsageLedger.count({ where: { enrollment: { countryId } } }),
    db.userSubscription.count({ where: { OR: [{ countryCode }, { plan: { countryId } }] } }),
    db.order.count({ where: { countryCode } }),
    db.orderItem.count({ where: { healthTest: { countryId } } }),
    db.doctorBankAccount.count({ where: doctorInCountry }),
    db.doctorMarketBankAccount.count({ where: { doctorCountry: { countryId } } }),
    db.healthTestRedemption.count({ where: { healthTest: { countryId } } }),
    db.corporateCompany.count({ where: { countryCode } }),
    db.corporatePlanService.count({ where: { OR: [{ countryCode }, doctorInCountry] } }),
    db.corporateBenefitRule.count({ where: { service: { countryId } } }),
    db.countryLegalDocument.count({ where: { countryId } }),
    db.jobListing.count({ where: { countryId } }),
  ]);

  return {
    doctors: doctors + doctorCountryLinks,
    appointments,
    clinicalRecords: sum([
      consultations,
      prescriptions,
      examResults,
      generatedDocuments,
      appointmentDocuments,
      medicalNotes,
    ]),
    patientRecords,
    membershipEnrollments,
    allowanceBalances,
    allowanceUsage,
    subscriptions,
    financialRecords: sum([
      orders,
      orderItems,
      doctorBankAccounts,
      marketBankAccounts,
      healthTestRedemptions,
    ]),
    corporateRecords: sum([corporateCompanies, corporatePlanServices, corporateBenefitRules]),
    legalDocuments,
    jobListings,
  };
}

async function countRemovableConfiguration(
  db: CountryCountClient,
  countryId: string,
): Promise<CountryDeleteRemovableConfiguration> {
  const where = { where: { countryId } };
  const [
    locales,
    domains,
    clinics,
    specialties,
    services,
    healthTests,
    pricingPlans,
    membershipPlans,
    contentPages,
    pageContents,
    seoLandingPages,
    assets,
    badges,
    partners,
    testCenters,
    insuranceCompanies,
    consultationSettings,
    bookingSettings,
    footers,
    dataPolicies,
    legalProfiles,
    authorityLinks,
  ] = await Promise.all([
    db.countryLocale.count(where),
    db.countryDomain.count(where),
    db.clinic.count(where),
    db.specialty.count(where),
    db.service.count(where),
    db.healthTest.count(where),
    db.pricingPlan.count(where),
    db.membershipPlan.count({ where: { primaryCountryId: countryId } }),
    db.contentPage.count(where),
    db.pageContent.count(where),
    db.seoLandingPage.count(where),
    db.asset.count(where),
    db.badge.count(where),
    db.partner.count(where),
    db.testCenter.count(where),
    db.insuranceCompany.count(where),
    db.consultationSetting.count(where),
    db.bookingSetting.count(where),
    db.countryFooter.count(where),
    db.countryDataPolicy.count(where),
    db.countryLegalProfile.count(where),
    db.countryAuthorityLink.count(where),
  ]);

  return {
    locales,
    domains,
    clinics,
    specialties,
    services,
    healthTests,
    pricingPlans,
    membershipPlans,
    contentPages: contentPages + pageContents,
    seoLandingPages,
    mediaAssets: sum([assets, badges, partners]),
    testCenters,
    insuranceCompanies,
    marketSettings: sum([
      consultationSettings,
      bookingSettings,
      footers,
      dataPolicies,
      legalProfiles,
      authorityLinks,
    ]),
  };
}

async function countDetachedRecords(
  db: CountryCountClient,
  countryId: string,
): Promise<CountryDeleteDetachedRecords> {
  const where = { where: { countryId } };
  const [blogPosts, faqs, reviews] = await Promise.all([
    db.blogPost.count(where),
    db.faq.count(where),
    db.review.count(where),
  ]);
  return { blogPosts, faqs, reviews };
}

async function buildCountryDeleteImpact(
  db: CountryCountClient,
  countryId: string,
  countryCode: string,
): Promise<CountryDeleteImpact> {
  const [blockers, removableConfiguration, detachedRecords] = await Promise.all([
    countCountryBlockers(db, countryId, countryCode),
    countRemovableConfiguration(db, countryId),
    countDetachedRecords(db, countryId),
  ]);
  return {
    blocked: Object.values(blockers).some((count) => count > 0),
    blockers,
    removableConfiguration,
    detachedRecords,
  };
}

/**
 * Count everything a hard delete of this country would destroy, detach or
 * refuse, so the admin UI can warn precisely. Counts only — no names, no
 * addresses, no identifiers, nothing derived from a patient record.
 *
 * Informational: a caller must NOT treat a clear result as permission to
 * delete. `purgeAdminCountry` recomputes the same blockers inside the
 * deletion transaction, under a lock, and that recomputation is the decision.
 *
 * Returns null when the country does not exist.
 */
export async function getCountryDeleteImpact(id: string): Promise<CountryDeleteImpact | null> {
  const existing = await prisma.country.findUnique({
    where: { id },
    select: { id: true, code: true },
  });
  if (!existing) return null;

  try {
    return await buildCountryDeleteImpact(prisma, existing.id, existing.code);
  } catch (error) {
    throw normalizeDbError(error, "Countries data is unavailable");
  }
}

/**
 * Rows whose EXISTENCE is what a blocker counts, and which are reached
 * through a direct child of Country rather than through Country itself.
 *
 * Locking the Country row `FOR UPDATE` is necessary but not sufficient. It
 * does close the obvious race — every direct child's INSERT takes
 * `FOR KEY SHARE` on the Country row, which `FOR UPDATE` conflicts with, so
 * no new doctor, service, pricing plan or membership plan can appear between
 * the count and the delete. But `MembershipEnrollment` has no foreign key to
 * Country at all: its INSERT takes `FOR KEY SHARE` on the MembershipPlan row,
 * so a country lock alone leaves exactly the race AZ-3 is about — impact says
 * zero, an enrollment is created, the purge cascades it away.
 *
 * Locking these parent rows too closes it: the dependent INSERT and the
 * purge's `FOR UPDATE` contend for the same row, so either the writer commits
 * first and the recount inside this transaction sees it, or the purge holds
 * the lock and the writer cannot commit before the decision is made. There is
 * no interleaving in which the write is accepted and then silently cascaded.
 *
 * Fixed order, so two concurrent purges of different countries cannot
 * deadlock against each other.
 *
 * KNOWN RESIDUAL, stated rather than hidden: some durable rows reach a market
 * only through a plain `countryCode` STRING with no foreign key at all —
 * `Order`, `UserSubscription`, `CorporateCompany`, and an `Appointment` booked
 * before a doctor or service is assigned. There is no row to lock for those,
 * so one created between the recount and the commit is not seen. It is NOT a
 * cascade: nothing references the Country row, so the record survives the
 * purge intact and merely carries a country code that no longer resolves.
 * That is the entire exposure — a dangling market code on a surviving record,
 * never a deleted or corrupted one — and it needs a schema change (real
 * foreign keys on those columns) to close, which is out of scope here.
 */
const COUNTRY_PURGE_LOCK_TABLES = [
  "Doctor",
  "DoctorCountry",
  "Service",
  "PricingPlan",
  "HealthTest",
  "Clinic",
  "MembershipPlan",
] as const;

/**
 * Hard-delete a country, but only when nothing durable hangs off it.
 *
 * Returns false when the country does not exist, true when it was deleted,
 * and throws `CountryDeleteBlockedError` (carrying the recomputed impact)
 * when it holds membership, financial, appointment, patient, clinical, legal
 * or corporate history. There is deliberately no override: the caller's
 * confirmation is not part of the safety decision.
 */
export async function purgeAdminCountry(id: string): Promise<boolean> {
  const existing = await prisma.country.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  try {
    return await prisma.$transaction(
      async (tx) => {
        // Re-read the row locked. Anything decided before this point is a
        // stale snapshot, including the impact the admin was shown.
        const [locked] = await tx.$queryRaw<{ id: string; code: string }[]>(
          Prisma.sql`SELECT "id", "code" FROM "Country" WHERE "id" = ${id} FOR UPDATE`,
        );
        if (!locked) return false;

        for (const table of COUNTRY_PURGE_LOCK_TABLES) {
          const column = table === "MembershipPlan" ? "primaryCountryId" : "countryId";
          await tx.$executeRaw(
            Prisma.sql`SELECT "id" FROM ${Prisma.raw(`"${table}"`)} WHERE ${Prisma.raw(`"${column}"`)} = ${id} FOR UPDATE`,
          );
        }

        const blockers = await countCountryBlockers(tx, locked.id, locked.code);
        if (Object.values(blockers).some((count) => count > 0)) {
          const [removableConfiguration, detachedRecords] = await Promise.all([
            countRemovableConfiguration(tx, locked.id),
            countDetachedRecords(tx, locked.id),
          ]);
          throw new CountryDeleteBlockedError({
            blocked: true,
            blockers,
            removableConfiguration,
            detachedRecords,
          });
        }

        await tx.country.delete({ where: { id } });
        return true;
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
  } catch (error) {
    if (error instanceof CountryDeleteBlockedError) throw error;
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
 *  (or be its default) — throws LocaleNotSupportedError otherwise.
 *
 *  CA-4: writes through the caller's transaction client so the base
 *  CountryLegalProfile row and its disclaimer overrides commit together. */
async function upsertDisclaimerTranslations(
  tx: Prisma.TransactionClient,
  countryId: string,
  legalProfileId: string,
  translations: DisclaimerTranslationInput[],
): Promise<void> {
  await Promise.all(
    translations.map((entry) => assertLocaleSupported(countryId, entry.locale)),
  );
  for (const entry of translations) {
    const shortDisclaimer = entry.shortDisclaimer ?? null;
    const fullDisclaimer = entry.fullDisclaimer ?? null;
    if (!shortDisclaimer && !fullDisclaimer) {
      await tx.countryDisclaimerTranslation.deleteMany({
        where: { legalProfileId, locale: entry.locale },
      });
      continue;
    }
    const row = { shortDisclaimer, fullDisclaimer };
    await tx.countryDisclaimerTranslation.upsert({
      where: { legalProfileId_locale: { legalProfileId, locale: entry.locale } },
      create: { legalProfileId, locale: entry.locale, ...row },
      update: row,
    });
  }
}

/** Base legal profile + its disclaimer overrides commit in one interactive
 *  transaction (CA-4). Prisma's default 5s timeout is too low on Windows dev
 *  boxes, same reason as ADMIN_DOCTOR_TX_OPTIONS in doctors.service.ts. */
const LEGAL_PROFILE_TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;

export async function upsertCountryLegalProfile(countryId: string, data: CountryLegalProfileBody) {
  const { disclaimerTranslations, ...profileData } = data;
  try {
    return await prisma.$transaction(async (tx) => {
      const profile = await tx.countryLegalProfile.upsert({
        where: { countryId },
        create: { countryId, ...profileData },
        update: profileData,
      });
      if (disclaimerTranslations !== undefined) {
        await upsertDisclaimerTranslations(tx, countryId, profile.id, disclaimerTranslations);
      }
      return await tx.countryLegalProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: { disclaimerTranslations: true, trustTranslations: true },
      });
    }, LEGAL_PROFILE_TX_OPTIONS);
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
