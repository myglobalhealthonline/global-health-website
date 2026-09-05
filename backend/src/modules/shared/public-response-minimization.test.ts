import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../db/prisma.js";
import {
  getDoctorByCountryAndSlug,
  listDoctors,
  listDoctorsByCountry,
} from "../doctors/doctors.service.js";
import {
  getPublicServiceBySlug,
  listServices,
  listServicesByCountry,
  listSpecialties,
  listSpecialtiesByCountry,
} from "../services/services.service.js";

/**
 * PR-1 — public doctor / service / specialty responses are explicit
 * allow-lists, not whatever Prisma happens to return.
 *
 * The public readers used to `include:` the model root, so every scalar
 * column shipped and two module-private helpers blacklisted a handful of
 * them afterwards. That published a person's `dateOfBirth`, the legacy
 * migration id, the internal `editorialChecklist`, per-doctor RBAC flags,
 * the cross-border payout the clinic pays, the service's legacy path and the
 * internal per-country routing config — and any column added to a Prisma
 * model later would have joined them automatically.
 *
 * These tests run the REAL readers against the isolated local test database,
 * so the assertions exercise the actual `select` allow-lists rather than a
 * mock's idea of a row. Each fixture row below sets every private column to a
 * non-null, recognisable value: a reader that leaks one cannot pass by
 * accident on a null.
 *
 * They pin the CONTRACT as an exact key set, not a list of absences. A column
 * added to a Prisma model in future fails here until it is deliberately added
 * to the allow-list — the property a blacklist can never give.
 */

const PRIVATE_DOCTOR_FIELDS = [
  "dateOfBirth", // personal information
  "legacyMongoId", // legacy migration
  "editorialChecklist", // internal moderation / editorial
  "whatsappNumber", // private clinic contact
  "bookingPausedFrom", // internal booking-pause controls
  "bookingPausedUntil",
  "bookingPauseReason",
  "canCreateManualAppointments", // per-doctor RBAC
  "canRequestCrossJurisdictionRx",
  "isCountryDirector",
  "trustpilotInviteEnabled", // internal operational
  "crossBorderRxEnabled", // internal commercial
  "crossBorderRxPriceCents",
  "crossBorderRxPayoutCents",
  "countryId",
  "createdAt",
] as const;

const PRIVATE_SERVICE_FIELDS = [
  "legacyPath", // legacy migration
  "editorialChecklist", // internal moderation / editorial
  "bookingPausedFrom", // internal booking-pause controls
  "bookingPausedUntil",
  "bookingPauseReason",
  "consultationSetting", // internal per-country operational config
  "bookingSetting",
  "countryId",
  "createdAt",
] as const;

const PRIVATE_COUNTRY_FIELDS = [
  "enabledFeatures",
  "accessModel",
  "commissionReceiptEnabled",
  "currencyId",
  "legacyHomePath",
  "generalConsultationPath",
  "specialistConsultationPath",
  "isActive",
  "createdAt",
  "updatedAt",
] as const;

/** Public country projection. */
const PUBLIC_COUNTRY_KEYS = ["id", "code", "slug", "name", "defaultLocale", "teamPath"];

/** Service / specialty images. */
const PUBLIC_ASSET_KEYS_MINIMAL = ["id", "kind", "key", "path", "altText"];

/** Doctor portraits additionally carry the framing + caption fields the
 *  profile template renders. `usageNote` is an internal admin note. */
const PUBLIC_ASSET_KEYS_DOCTOR = [
  ...PUBLIC_ASSET_KEYS_MINIMAL,
  "title",
  "caption",
  "description",
  "focalX",
  "focalY",
  "zoom",
];

const PUBLIC_DOCTOR_KEYS = [
  "id",
  "slug",
  "fullName",
  "title",
  "bio",
  "seoTitle",
  "seoDescription",
  "lastReviewedAt",
  "medicalRegistrationUrl",
  "qualifications",
  "instagramUrl",
  "facebookUrl",
  "linkedinUrl",
  "languages",
  "active",
  "updatedAt",
  "resolvedLocale",
  // Derived editorial signals — the two booleans the public site needs,
  // in place of the raw admin-authored `editorialChecklist` JSON.
  "readyToIndex",
  "nonPhysician",
];

const PUBLIC_SERVICE_KEYS = [
  "id",
  "kind",
  "slug",
  "name",
  "summary",
  "seoTitle",
  "seoDescription",
  "seoKeywords",
  "heroTitle",
  "heroDescription",
  "detailBody",
  "ctaLabel",
  "sortOrder",
  "durationMinutes",
  "basePriceCents",
  "currencyCode",
  "shippingCents",
  "isActive",
  "visibility",
  "galleryImagePaths",
  "lastReviewedAt",
  "authorDisplayName",
  "reviewerDisplayName",
  "authorDoctorId",
  "reviewerDoctorId",
  "updatedAt",
  "resolvedLocale",
  "translatedFields",
];

const PUBLIC_SPECIALTY_KEYS = [
  "id",
  "slug",
  "name",
  "cardSummary",
  "cardThemeColor",
  "sortOrder",
  "active",
];

/** Keys the payload carries that the allow-list does not name. */
function extraKeys(payload: object, allowed: readonly string[]): string[] {
  return Object.keys(payload).filter((key) => !allowed.includes(key));
}

function assertNoPrivateKeys(payload: object, forbidden: readonly string[], label: string) {
  const leaked = Object.keys(payload).filter((key) => (forbidden as readonly string[]).includes(key));
  assert.deepEqual(leaked, [], `${label} must not expose ${leaked.join(", ")}`);
}

describe("PR-1 public response data minimization", () => {
  let bootError: unknown = null;
  let fixture: {
    countryCode: string;
    doctorSlug: string;
    serviceSlug: string;
    specialtySlug: string;
  } | null = null;

  const suffix = String(Date.now()).slice(-8);
  let createdCurrencyId: string | null = null;
  const createdCountryIds: string[] = [];

  before(async () => {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");

      const currency = await prisma.currency.create({
        data: { code: `Y${suffix.slice(-7)}`, symbol: "$", decimals: 2 },
      });
      createdCurrencyId = currency.id;

      // Wide enough that a row leaked by a crashed earlier run (or a parallel
      // shard) does not collide on `Country.code`'s unique index — a single
      // trailing digit gave only ten possibilities.
      const countryCode = `P${suffix.slice(-5)}`;
      const country = await prisma.country.create({
        data: {
          code: countryCode,
          name: `PR1 ${suffix}`,
          slug: `pr1-${suffix}`,
          legacyHomePath: `/pr1-${suffix}`,
          teamPath: `/pr1-${suffix}/team`,
          generalConsultationPath: `/pr1-${suffix}/general`,
          specialistConsultationPath: `/pr1-${suffix}/specialist`,
          currencyId: currency.id,
          defaultLocale: "EN",
          isActive: true,
          enabledFeatures: ["MEMBERSHIPS"],
          commissionReceiptEnabled: true,
          countryLocales: { create: [{ locale: "EN", isDefault: true }] },
        },
      });
      createdCountryIds.push(country.id);

      const specialty = await prisma.specialty.create({
        data: {
          countryId: country.id,
          slug: `pr1-spec-${suffix}`,
          name: "PR1 Cardiology",
          cardSummary: "Heart care",
          cardThemeColor: "#123456",
          active: true,
        },
      });

      // Every private column set to a recognisable non-null value, so a leak
      // cannot hide behind a null.
      const doctor = await prisma.doctor.create({
        data: {
          countryId: country.id,
          slug: `pr1-doctor-${suffix}`,
          fullName: "Dr PR1 Example",
          title: "General Practitioner",
          bio: "Twenty years in primary care.",
          qualifications: ["MB BCh BAO"],
          languages: ["en", "pt"],
          medicalRegistrationUrl: "https://example.invalid/register",
          instagramUrl: "https://example.invalid/ig",
          facebookUrl: "https://example.invalid/fb",
          linkedinUrl: "https://example.invalid/li",
          active: true,
          legacyMongoId: `5f2b1c9e8a7d6b00${suffix}`,
          dateOfBirth: new Date("1980-05-04"),
          whatsappNumber: "+353870000000",
          editorialChecklist: {
            readyToIndex: true,
            nonPhysician: false,
            internalNote: "chase the signed contract before launch",
          },
          bookingPausedFrom: new Date("2026-01-01"),
          bookingPausedUntil: new Date("2026-01-02"),
          bookingPauseReason: "INTERNAL: annual leave, do not publish",
          canCreateManualAppointments: true,
          canRequestCrossJurisdictionRx: true,
          isCountryDirector: true,
          trustpilotInviteEnabled: true,
          crossBorderRxEnabled: true,
          crossBorderRxPriceCents: 4500,
          crossBorderRxPayoutCents: 3000,
          specialties: { create: [{ specialtyId: specialty.id }] },
          additionalCountries: {
            create: [
              {
                countryId: country.id,
                active: true,
                chamberEntity: "IMC",
                registrationNumber: "123456",
                registrationUrl: "https://example.invalid/verify",
                division: "General",
                isVerified: true,
              },
            ],
          },
          credentials: {
            create: [
              { label: "MICGP", bodyName: "ICGP", bodyUrl: null, isActive: true, sortOrder: 0 },
            ],
          },
          faqs: {
            create: [
              {
                locale: "EN",
                question: "Do you see children?",
                answer: "Yes, from age two.",
                isActive: true,
                sortOrder: 0,
              },
            ],
          },
        },
      });

      const service = await prisma.service.create({
        data: {
          countryId: country.id,
          kind: "GENERAL",
          slug: `pr1-service-${suffix}`,
          name: "PR1 General consultation",
          summary: "See a doctor online",
          seoKeywords: ["gp online"],
          durationMinutes: 30,
          basePriceCents: 5000,
          currencyCode: "EUR",
          shippingCents: 0,
          isActive: true,
          visibility: "PUBLIC",
          legacyPath: `/pr1-${suffix}/legacy/general`,
          editorialChecklist: { readyToIndex: true, internalNote: "pricing pending legal" },
          consultationSetting: { internalRoutingRule: "round-robin" },
          bookingSetting: { internalLeadTimeMinutes: 90 },
          bookingPausedFrom: new Date("2026-01-01"),
          bookingPausedUntil: new Date("2026-01-02"),
          bookingPauseReason: "INTERNAL: capacity freeze",
          assignedDoctors: {
            create: [{ doctorId: doctor.id, isActive: true, status: "active", sortOrder: 0 }],
          },
        },
      });

      // One image per owner, each carrying an internal usage note.
      await prisma.asset.createMany({
        data: [
          {
            countryId: country.id,
            doctorId: doctor.id,
            kind: "IMAGE",
            key: `pr1-doctor-photo:${doctor.id}`,
            path: "/api/media/pr1-doctor.png",
            altText: "Dr PR1 Example",
            isActive: true,
            usageNote: "INTERNAL: replace once the new shoot lands",
          },
          {
            countryId: country.id,
            serviceId: service.id,
            kind: "IMAGE",
            key: `pr1-service-card:${service.id}`,
            path: "/api/media/pr1-service.png",
            altText: "PR1 service",
            isActive: true,
            usageNote: "INTERNAL: stock photo, licence expires 2027",
          },
          {
            countryId: country.id,
            specialtyId: specialty.id,
            kind: "IMAGE",
            key: `pr1-specialty-card:${specialty.id}`,
            path: "/api/media/pr1-specialty.png",
            altText: "PR1 specialty",
            isActive: true,
            usageNote: "INTERNAL: awaiting brand sign-off",
          },
        ],
      });

      fixture = {
        countryCode,
        doctorSlug: doctor.slug,
        serviceSlug: service.slug,
        specialtySlug: specialty.slug,
      };
    } catch (err) {
      bootError = err;
    }
  });

  after(async () => {
    if (createdCountryIds.length > 0) {
      await prisma.country.deleteMany({ where: { id: { in: createdCountryIds } } });
    }
    if (createdCurrencyId) {
      await prisma.currency.deleteMany({ where: { id: createdCurrencyId } });
    }
    await prisma.$disconnect();
  });

  function ready(t: { skip: (reason?: string) => void }) {
    if (!fixture) {
      t.skip(`database unavailable: ${String(bootError)}`);
      return null;
    }
    return fixture;
  }

  /** The global listings are not country-scoped, so pick our own row out. */
  function mine<T extends { slug: string }>(rows: readonly T[], slug: string): T {
    const row = rows.find((r) => r.slug === slug);
    assert.ok(row, `fixture row ${slug} missing from the public listing`);
    return row;
  }

  /* ---------------------------------------------------------------- *
   * Doctors
   * ---------------------------------------------------------------- */

  it("GET /api/doctors — exact public key set, no private columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listDoctors(), f.doctorSlug);
    assertNoPrivateKeys(row, PRIVATE_DOCTOR_FIELDS, "/api/doctors");
    assert.deepEqual(
      extraKeys(row, [...PUBLIC_DOCTOR_KEYS, "country", "specialties", "assets", "bookability"]),
      [],
    );
  });

  it("GET /api/countries/:code/doctors — exact public key set, no private columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listDoctorsByCountry(f.countryCode), f.doctorSlug);
    assertNoPrivateKeys(row, PRIVATE_DOCTOR_FIELDS, "country doctor roster");
    assert.deepEqual(
      extraKeys(row, [
        ...PUBLIC_DOCTOR_KEYS,
        "country",
        "specialties",
        "assets",
        "additionalCountries",
        "credentials",
        "faqs",
        "assignedServices",
        "resolvedMarketLocale",
        "seoKeywords",
        "imcRegistration",
        "registrationChamber",
        "registrationDivision",
        "registrationVerified",
        "isFeatured",
        "bookability",
        "bookabilityByServiceId",
      ]),
      [],
    );
  });

  it("GET /api/countries/:code/doctors/:slug — exact public key set, no private columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = await getDoctorByCountryAndSlug(f.countryCode, f.doctorSlug);
    assert.ok(row);
    assertNoPrivateKeys(row, PRIVATE_DOCTOR_FIELDS, "doctor profile");
    assert.deepEqual(
      extraKeys(row, [
        ...PUBLIC_DOCTOR_KEYS,
        "country",
        "specialties",
        "assets",
        "additionalCountries",
        "credentials",
        "faqs",
        "assignedServices",
        "resolvedMarketLocale",
        "seoKeywords",
        "imcRegistration",
        "registrationChamber",
        "registrationDivision",
        "registrationVerified",
        "bookability",
        "bookabilityByServiceId",
      ]),
      [],
    );
  });

  it("nested country on a doctor payload cannot reintroduce internal columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listDoctors(), f.doctorSlug);
    assertNoPrivateKeys(row.country, PRIVATE_COUNTRY_FIELDS, "doctor.country");
    assert.deepEqual(extraKeys(row.country, PUBLIC_COUNTRY_KEYS), []);
  });

  it("nested assets on a doctor payload do not carry the internal usage note", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listDoctors(), f.doctorSlug);
    const image = row.assets[0];
    assert.ok(image, "fixture doctor must have a portrait");
    assert.deepEqual(extraKeys(image, PUBLIC_ASSET_KEYS_DOCTOR), []);
  });

  it("nested specialties on a doctor payload are explicitly mapped", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listDoctorsByCountry(f.countryCode), f.doctorSlug);
    const link = row.specialties[0];
    assert.ok(link, "fixture doctor must have a specialty link");
    assert.deepEqual(extraKeys(link, ["specialty"]), []);
    assert.deepEqual(extraKeys(link.specialty, PUBLIC_SPECIALTY_KEYS), []);
  });

  it("nested market rows on a doctor payload are explicitly mapped", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = await getDoctorByCountryAndSlug(f.countryCode, f.doctorSlug);
    assert.ok(row);
    const market = row.additionalCountries[0];
    assert.ok(market, "fixture doctor must have a market link");
    assert.deepEqual(
      extraKeys(market, [
        "id",
        "countryId",
        "active",
        "country",
        "chamberEntity",
        "registrationNumber",
        "registrationUrl",
        "division",
        "isVerified",
        "translations",
        "divisionTranslations",
      ]),
      [],
    );
    assert.deepEqual(
      extraKeys(market.country, ["id", "code", "name", "defaultLocale"]),
      [],
      "the market's nested country must not widen to the full Country row",
    );
  });

  it("nested service assignments carry no ServiceDoctor operational columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    // `ServiceDoctor.doctorAmountCents` is the doctor's per-service payout and
    // `selectedBy` an internal audit column. An `include:` here used to ship
    // both to anonymous callers.
    const profile = await getDoctorByCountryAndSlug(f.countryCode, f.doctorSlug);
    assert.ok(profile);
    const assignment = profile.assignedServices[0];
    assert.ok(assignment, "fixture doctor must be assigned to the service");
    assert.deepEqual(extraKeys(assignment, ["serviceId", "service"]), []);
    assert.deepEqual(
      extraKeys(assignment.service, [
        "id",
        "slug",
        "name",
        "kind",
        "summary",
        "durationMinutes",
        "basePriceCents",
        "currencyCode",
      ]),
      [],
    );

    const rosterRow = mine(await listDoctorsByCountry(f.countryCode), f.doctorSlug);
    const rosterAssignment = rosterRow.assignedServices[0];
    assert.ok(rosterAssignment);
    assert.deepEqual(extraKeys(rosterAssignment, ["serviceId"]), []);
  });

  it("nested doctor FAQs are explicitly mapped", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = await getDoctorByCountryAndSlug(f.countryCode, f.doctorSlug);
    assert.ok(row);
    const faq = row.faqs[0];
    assert.ok(faq, "fixture doctor must have an FAQ");
    assert.deepEqual(
      extraKeys(faq, ["id", "locale", "question", "answer", "category", "sortOrder", "isActive"]),
      [],
    );
  });

  it("keeps the professional and booking data the public site needs", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = await getDoctorByCountryAndSlug(f.countryCode, f.doctorSlug);
    assert.ok(row);
    // Booking-required identifiers.
    assert.ok(row.id);
    assert.equal(row.slug, f.doctorSlug);
    assert.equal(row.country.code, f.countryCode);
    assert.equal(row.assignedServices.length, 1);
    // Legitimate professional information.
    assert.equal(row.fullName, "Dr PR1 Example");
    assert.equal(row.title, "General Practitioner");
    assert.equal(row.bio, "Twenty years in primary care.");
    assert.deepEqual(row.qualifications, ["MB BCh BAO"]);
    assert.deepEqual(row.languages, ["en", "pt"]);
    assert.deepEqual(
      row.credentials.map((c) => c.label),
      ["MICGP"],
    );
    // Market-specific registration data.
    assert.equal(row.imcRegistration, "123456");
    assert.equal(row.registrationChamber, "IMC");
    assert.equal(row.registrationDivision, "General");
    assert.equal(row.registrationVerified, true);
    // Per-country verify link wins over the doctor-level URL.
    assert.equal(row.medicalRegistrationUrl, "https://example.invalid/verify");
    // Locale merge output.
    assert.equal(row.resolvedLocale, "EN");
    // Bookability is still computed.
    assert.ok(row.bookability);
    assert.ok("bookabilityByServiceId" in row);
  });

  it("exposes the derived editorial signals in place of the raw checklist", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = await getDoctorByCountryAndSlug(f.countryCode, f.doctorSlug);
    assert.ok(row);
    assert.equal(row.readyToIndex, true);
    assert.equal(row.nonPhysician, false);
    // The internal note that shared the blob must not have travelled with them.
    assert.equal(JSON.stringify(row).includes("chase the signed contract"), false);
  });

  /* ---------------------------------------------------------------- *
   * Services
   * ---------------------------------------------------------------- */

  it("GET /api/services — exact public key set, no private columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listServices(), f.serviceSlug);
    assertNoPrivateKeys(row, PRIVATE_SERVICE_FIELDS, "/api/services");
    assert.deepEqual(
      extraKeys(row, [...PUBLIC_SERVICE_KEYS, "country", "assets", "bookability"]),
      [],
    );
  });

  it("GET /api/countries/:code/services — exact public key set, no private columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listServicesByCountry(f.countryCode), f.serviceSlug);
    assertNoPrivateKeys(row, PRIVATE_SERVICE_FIELDS, "country services");
    assert.deepEqual(
      extraKeys(row, [
        ...PUBLIC_SERVICE_KEYS,
        "country",
        "assets",
        "assignedDoctors",
        "insuranceOptions",
        "insuranceSeoLine",
        "bookability",
      ]),
      [],
    );
  });

  it("GET /api/services/:slug — exact public key set, no private columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = await getPublicServiceBySlug(f.serviceSlug, f.countryCode);
    assert.ok(row);
    assertNoPrivateKeys(row, PRIVATE_SERVICE_FIELDS, "service detail");
    assert.deepEqual(
      extraKeys(row, [
        ...PUBLIC_SERVICE_KEYS,
        "country",
        "assets",
        "faqs",
        "links",
        "assignedDoctorIds",
        "insuranceOptions",
        "insuranceSeoLine",
        "bookability",
      ]),
      [],
    );
  });

  it("nested country on a service payload cannot reintroduce internal columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listServices(), f.serviceSlug);
    assertNoPrivateKeys(row.country, PRIVATE_COUNTRY_FIELDS, "service.country");
    assert.deepEqual(extraKeys(row.country, PUBLIC_COUNTRY_KEYS), []);
  });

  it("nested assets on a service payload do not carry the internal usage note", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listServices(), f.serviceSlug);
    const image = row.assets[0];
    assert.ok(image, "fixture service must have an image");
    assert.deepEqual(extraKeys(image, PUBLIC_ASSET_KEYS_MINIMAL), []);
  });

  it("keeps the catalogue, pricing and booking data the public site needs", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = await getPublicServiceBySlug(f.serviceSlug, f.countryCode);
    assert.ok(row);
    // Booking-required identifiers.
    assert.ok(row.id);
    assert.equal(row.slug, f.serviceSlug);
    assert.equal(row.kind, "GENERAL");
    assert.equal(row.assignedDoctorIds.length, 1);
    // Pricing.
    assert.equal(row.basePriceCents, 5000);
    assert.equal(row.currencyCode, "EUR");
    assert.equal(row.durationMinutes, 30);
    assert.equal(row.shippingCents, 0);
    // Indexability inputs the sitemap and robots tag read.
    assert.equal(row.isActive, true);
    assert.equal(row.visibility, "PUBLIC");
    assert.equal(row.resolvedLocale, "EN");
    assert.ok(Array.isArray(row.translatedFields));
    // SEO + E-E-A-T.
    assert.deepEqual(row.seoKeywords, ["gp online"]);
    assert.ok("lastReviewedAt" in row);
    assert.ok("authorDoctorId" in row);
    assert.ok("reviewerDoctorId" in row);
    // Bookability is still computed.
    assert.ok(row.bookability);
  });

  it("keeps sitemap lastModified on the global services list", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listServices(), f.serviceSlug);
    assert.ok(row.updatedAt instanceof Date);
  });

  /* ---------------------------------------------------------------- *
   * Specialties
   * ---------------------------------------------------------------- */

  it("GET /api/specialties — exact public key set", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listSpecialties(), f.specialtySlug);
    assert.deepEqual(
      extraKeys(row, [...PUBLIC_SPECIALTY_KEYS, "country", "assets", "resolvedLocale"]),
      [],
    );
  });

  it("GET /api/countries/:code/specialties — exact public key set", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listSpecialtiesByCountry(f.countryCode), f.specialtySlug);
    assert.deepEqual(
      extraKeys(row, [...PUBLIC_SPECIALTY_KEYS, "country", "resolvedLocale"]),
      [],
    );
  });

  it("nested country on a specialty payload cannot reintroduce internal columns", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listSpecialties(), f.specialtySlug);
    assertNoPrivateKeys(row.country, PRIVATE_COUNTRY_FIELDS, "specialty.country");
    assert.deepEqual(extraKeys(row.country, PUBLIC_COUNTRY_KEYS), []);
  });

  it("nested assets on a specialty payload do not carry the internal usage note", async (t) => {
    const f = ready(t);
    if (!f) return;
    const row = mine(await listSpecialties(), f.specialtySlug);
    const image = row.assets[0];
    assert.ok(image, "fixture specialty must have an image");
    assert.deepEqual(extraKeys(image, PUBLIC_ASSET_KEYS_MINIMAL), []);
  });
});
