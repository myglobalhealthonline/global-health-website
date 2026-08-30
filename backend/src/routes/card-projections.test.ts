import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";
import type { LocaleCode } from "@prisma/client";

/**
 * Contract tests for the additive card projections (perf plan
 * docs/plans/new.md phases 3-4). They pin the emitted key set (no private or
 * detail-only field may leak), the locale fallback chain, the market-row
 * guard, the registration/chamber shims the frontend mapper reads, and the
 * bookabilityByServiceId key coverage a card CTA depends on.
 *
 * Prisma is mocked, so one fixture row feeds both the legacy shape and the
 * projection: the assertions below are about what the projection EMITS, not
 * about the query planner.
 */

const BOOKABLE = { state: "BOOKABLE", reasonCode: null, nextAvailableAt: "2026-09-01T09:00:00.000Z" };
const UNAVAILABLE = { state: "UNAVAILABLE", reasonCode: "NO_OPEN_SLOT", nextAvailableAt: null };

const doctorRow = {
  id: "doctor-1",
  slug: "jane-doe",
  fullName: "Jane Doe",
  title: "General Practitioner",
  bio: "Base bio",
  languages: ["English", "Irish"],
  editorialChecklist: { nonPhysician: true, other: "ignored" },
  medicalRegistrationUrl: "https://doctor-level.example/verify",
  instagramUrl: "https://instagram.com/janedoe",
  facebookUrl: null,
  linkedinUrl: null,
  // Private fields the legacy row carries; the projection must never emit them.
  whatsappNumber: "+353000000000",
  bookingPausedFrom: new Date("2026-01-01T00:00:00.000Z"),
  bookingPausedUntil: null,
  bookingPauseReason: "leave",
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  qualifications: ["MB BCh BAO"],
  faqs: [{ id: "faq-1", locale: "EN", question: "Q", answer: "A", sortOrder: 0, isActive: true }],
  country: { defaultLocale: "EN" },
  specialties: [
    {
      specialty: {
        name: "General Practice",
        translations: [{ locale: "PT", name: "Clinica Geral" }],
      },
    },
  ],
  translations: [{ locale: "PT", title: "Medico de familia", bio: "Bio PT" }],
  assets: [
    {
      path: "/api/media/doctor-1.jpg",
      altText: "Portrait",
      title: "T",
      caption: "C",
      description: "D",
      focalX: 40,
      focalY: 60,
      zoom: 1.2,
    },
  ],
  additionalCountries: [
    {
      country: { defaultLocale: "EN" },
      chamberEntity: "IMC",
      registrationNumber: "523449",
      registrationUrl: "https://market-level.example/verify",
      division: "General Division",
      isVerified: true,
      translations: [{ locale: "PT", title: "Market PT title", bio: "Market PT bio" }],
      divisionTranslations: [{ locale: "PT", division: "Divisao Geral" }],
    },
  ],
  credentials: [
    { label: "FRCP", bodyName: "RCP", bodyUrl: "https://rcp.example", countryCode: "IE" },
    { label: "Global", bodyName: "WHO", bodyUrl: null, countryCode: null },
    { label: "Other market", bodyName: "OM", bodyUrl: null, countryCode: "PT" },
  ],
  assignedServices: [{ serviceId: "service-1" }, { serviceId: "service-2" }],
};

const serviceRow = {
  id: "service-1",
  slug: "gp-consultation",
  name: "GP Consultation",
  summary: "Base summary",
  kind: "GENERAL",
  durationMinutes: 15,
  basePriceCents: 6000,
  currencyCode: "EUR",
  detailBody: "<p>long detail body</p>",
  seoTitle: "SEO title",
  bookingPausedFrom: new Date("2026-01-01T00:00:00.000Z"),
  bookingPausedUntil: null,
  bookingPauseReason: "leave",
  country: { defaultLocale: "EN" },
  assets: [{ path: "/api/media/service-1.jpg", altText: "Consultation" }],
  assignedDoctors: [{ doctorId: "doctor-1" }, { doctorId: "doctor-2" }],
  translations: [{ locale: "PT", name: "Consulta GP", summary: "Resumo PT" }],
  insuranceCoverages: [
    {
      overridePriceCents: 4500,
      company: { id: "ins-1", name: "MediCare", pricingMode: "FIXED", discountPercent: null },
    },
    {
      overridePriceCents: 3000,
      company: { id: "ins-2", name: "NoDoctors", pricingMode: "FIXED", discountPercent: null },
    },
  ],
  insuranceDoctorPayouts: [{ insuranceCompanyId: "ins-1", doctorId: "doctor-1" }],
};

/** Swapped by the locale-merge drift tests below; every other test uses the
 *  single canonical row. */
let doctorRows: (typeof doctorRow)[] = [doctorRow];

type DoctorsModule = typeof import("../modules/doctors/doctors.service.js");
let mergeDoctorTranslation: DoctorsModule["mergeDoctorTranslation"];
let mergeDoctorMarketTranslation: DoctorsModule["mergeDoctorMarketTranslation"];
let listDoctorCardsByCountry: DoctorsModule["listDoctorCardsByCountry"];
let listServiceCardsByCountry: (typeof import("../modules/services/services.service.js"))["listServiceCardsByCountry"];

before(async () => {
  mock.module("../db/prisma.js", {
    namedExports: {
      prisma: {
        doctor: { findMany: async () => doctorRows },
        service: { findMany: async () => [serviceRow] },
      },
    },
  });
  mock.module("../modules/bookability/bookability.service.js", {
    namedExports: {
      getCountryBookabilityBatch: async () => ({
        services: new Map(),
        doctors: new Map(),
        doctorServices: new Map(),
      }),
      readBatchServiceBookability: () => BOOKABLE,
      readBatchDoctorBookability: (
        _batch: unknown,
        _doctorId: string,
        serviceIds: readonly string[],
      ) => ({
        bookability: BOOKABLE,
        bookabilityByServiceId: Object.fromEntries(
          serviceIds.map((id) => [id, id === "service-2" ? UNAVAILABLE : BOOKABLE]),
        ),
      }),
      getDoctorBookability: async () => BOOKABLE,
      getServiceBookability: async () => BOOKABLE,
      invalidateBookabilityCache: () => {},
    },
  });
  mock.module("../modules/doctors/featured-doctor.service.js", {
    namedExports: { getFeaturedDoctorId: async () => "doctor-1" },
  });

  ({ listDoctorCardsByCountry, mergeDoctorTranslation, mergeDoctorMarketTranslation } =
    await import("../modules/doctors/doctors.service.js"));
  ({ listServiceCardsByCountry } = await import("../modules/services/services.service.js"));
});

describe("doctor-card projection", () => {
  it("emits exactly the card contract keys and no private or detail fields", async () => {
    const [card] = await listDoctorCardsByCountry("ie");
    assert.deepEqual(
      Object.keys(card!).sort(),
      [
        "additionalCountries",
        "assets",
        "assignedServices",
        "bio",
        "bookability",
        "bookabilityByServiceId",
        "credentials",
        "editorialChecklist",
        "facebookUrl",
        "fullName",
        "id",
        "imcRegistration",
        "instagramUrl",
        "isFeatured",
        "languages",
        "linkedinUrl",
        "medicalRegistrationUrl",
        "registrationDivision",
        "registrationVerified",
        "slug",
        "specialties",
        "title",
      ].sort(),
    );
  });

  it("never emits whatsappNumber, booking-pause, FAQ or SEO fields", async () => {
    const [card] = await listDoctorCardsByCountry("ie");
    const json = JSON.stringify(card);
    for (const forbidden of [
      "whatsappNumber",
      "bookingPausedFrom",
      "bookingPauseReason",
      "seoTitle",
      "seoDescription",
      "qualifications",
      "faqs",
    ]) {
      assert.equal(json.includes(forbidden), false, `${forbidden} leaked into the projection`);
    }
  });

  it("emits raw fullName so marketDisplayName stays a frontend transform", async () => {
    const [card] = await listDoctorCardsByCountry("ie");
    assert.equal(card!.fullName, "Jane Doe");
  });

  it("shims the chamber into additionalCountries[0] for the frontend mapper", async () => {
    const [card] = await listDoctorCardsByCountry("ie");
    assert.deepEqual(card!.additionalCountries, [{ chamberEntity: "IMC" }]);
    assert.equal(card!.imcRegistration, "523449");
  });

  it("shims nonPhysician into editorialChecklist and nulls it otherwise", async () => {
    const [card] = await listDoctorCardsByCountry("ie");
    assert.deepEqual(card!.editorialChecklist, { nonPhysician: true });
  });

  it("prefers the market registration URL over the doctor-level one", async () => {
    const [card] = await listDoctorCardsByCountry("ie");
    assert.equal(card!.medicalRegistrationUrl, "https://market-level.example/verify");
  });

  it("filters credentials to this country plus global entries", async () => {
    const [card] = await listDoctorCardsByCountry("ie");
    assert.deepEqual(
      card!.credentials.map((c) => c.label),
      ["FRCP", "Global"],
    );
  });

  it("falls back to base columns for a locale with no translation", async () => {
    const [card] = await listDoctorCardsByCountry("ie", "EN");
    assert.equal(card!.title, "General Practitioner");
    assert.equal(card!.bio, "Base bio");
    assert.deepEqual(card!.specialties, [{ specialty: { name: "General Practice" } }]);
  });

  it("applies the market row only when it resolves to the doctor locale", async () => {
    const [card] = await listDoctorCardsByCountry("ie", "PT");
    assert.equal(card!.title, "Market PT title");
    assert.equal(card!.bio, "Market PT bio");
    assert.equal(card!.registrationDivision, "Divisao Geral");
    assert.deepEqual(card!.specialties, [{ specialty: { name: "Clinica Geral" } }]);
  });

  it("covers every assigned service id in bookabilityByServiceId", async () => {
    const [card] = await listDoctorCardsByCountry("ie");
    assert.deepEqual(
      Object.keys(card!.bookabilityByServiceId).sort(),
      card!.assignedServices.map((a) => a.serviceId).sort(),
    );
    assert.deepEqual(card!.bookabilityByServiceId["service-2"], UNAVAILABLE);
    assert.deepEqual(card!.bookability, BOOKABLE);
  });

  it("keeps the full image field set cards render", async () => {
    const [card] = await listDoctorCardsByCountry("ie");
    assert.deepEqual(card!.assets, [
      {
        kind: "IMAGE",
        path: "/api/media/doctor-1.jpg",
        altText: "Portrait",
        title: "T",
        caption: "C",
        description: "D",
        focalX: 40,
        focalY: 60,
        zoom: 1.2,
      },
    ]);
  });

  it("marks the country featured doctor", async () => {
    const [card] = await listDoctorCardsByCountry("ie");
    assert.equal(card!.isFeatured, true);
  });
});

describe("service-card projection", () => {
  it("emits exactly the card contract keys", async () => {
    const [card] = await listServiceCardsByCountry("ie");
    assert.deepEqual(
      Object.keys(card!).sort(),
      [
        "assets",
        "assignedDoctors",
        "basePriceCents",
        "bookability",
        "currencyCode",
        "durationMinutes",
        "id",
        "insuranceOptions",
        "isActive",
        "kind",
        "name",
        "slug",
        "summary",
      ].sort(),
    );
  });

  it("drops detail body, SEO and booking-pause fields", async () => {
    const json = JSON.stringify((await listServiceCardsByCountry("ie"))[0]);
    for (const forbidden of [
      "detailBody",
      "seoTitle",
      "insuranceSeoLine",
      "bookingPausedFrom",
      "bookingPauseReason",
      "insuranceCoverages",
      "insuranceDoctorPayouts",
    ]) {
      assert.equal(json.includes(forbidden), false, `${forbidden} leaked into the projection`);
    }
  });

  it("emits isActive so the frontend mapper keeps the row", async () => {
    const [card] = await listServiceCardsByCountry("ie");
    assert.equal(card!.isActive, true);
  });

  it("offers only insurers that have an in-network doctor", async () => {
    const [card] = await listServiceCardsByCountry("ie");
    assert.deepEqual(card!.insuranceOptions, [
      { companyId: "ins-1", name: "MediCare", insurancePriceCents: 4500 },
    ]);
  });

  it("keeps assignment order and the legacy asset field set", async () => {
    const [card] = await listServiceCardsByCountry("ie");
    assert.deepEqual(card!.assignedDoctors, [{ doctorId: "doctor-1" }, { doctorId: "doctor-2" }]);
    assert.deepEqual(card!.assets, [
      { kind: "IMAGE", path: "/api/media/service-1.jpg", altText: "Consultation" },
    ]);
  });

  it("falls back to base display columns, then applies the requested locale", async () => {
    const [enCard] = await listServiceCardsByCountry("ie", undefined, "EN");
    assert.equal(enCard!.name, "GP Consultation");
    assert.equal(enCard!.summary, "Base summary");
    const [ptCard] = await listServiceCardsByCountry("ie", undefined, "PT");
    assert.equal(ptCard!.name, "Consulta GP");
    assert.equal(ptCard!.summary, "Resumo PT");
  });

  it("carries the bookability summary through", async () => {
    const [card] = await listServiceCardsByCountry("ie");
    assert.deepEqual(card!.bookability, BOOKABLE);
  });
});

/**
 * Drift guard. The projection REPLICATES the two-stage locale merge
 * (`mergeDoctorTranslation` then `mergeDoctorMarketTranslation`) rather than
 * calling those helpers, because they require the full display-field base type
 * — including the SEO columns the projection exists to drop. That copy would
 * otherwise drift silently if someone edited the originals, so these cases run
 * the SAME fixture through both and require the same title/bio out.
 *
 * The market row is the subtle half: it must only win when it resolved to the
 * same locale as the doctor-level row, otherwise a market row that exists only
 * in the country's default locale stomps a correct per-locale bio.
 */
describe("doctor-card projection — locale merge parity with the shared helpers", () => {
  const MERGE_CASES: Array<{
    name: string;
    requested: LocaleCode;
    translations: Array<{ locale: LocaleCode; title: string; bio: string }>;
    marketTranslations: Array<{ locale: LocaleCode; title: string; bio: string }>;
  }> = [
    {
      name: "market row in the requested locale wins",
      requested: "PT" as const,
      translations: [{ locale: "PT", title: "Doctor PT", bio: "Doctor bio PT" }],
      marketTranslations: [{ locale: "PT", title: "Market PT", bio: "Market bio PT" }],
    },
    {
      name: "market row in another locale is ignored, doctor row kept",
      requested: "PT" as const,
      translations: [{ locale: "PT", title: "Doctor PT", bio: "Doctor bio PT" }],
      marketTranslations: [{ locale: "EN", title: "Market EN", bio: "Market bio EN" }],
    },
    {
      name: "no market row at all",
      requested: "PT" as const,
      translations: [{ locale: "PT", title: "Doctor PT", bio: "Doctor bio PT" }],
      marketTranslations: [],
    },
    {
      name: "neither row has the requested locale, both fall back to base",
      requested: "CS" as const,
      translations: [{ locale: "PT", title: "Doctor PT", bio: "Doctor bio PT" }],
      marketTranslations: [{ locale: "PT", title: "Market PT", bio: "Market bio PT" }],
    },
    {
      name: "only the market row carries the requested locale",
      requested: "PT" as const,
      translations: [],
      marketTranslations: [{ locale: "PT" as LocaleCode, title: "Market PT", bio: "Market bio PT" }],
    },
  ];

  for (const testCase of MERGE_CASES) {
    it(testCase.name, async () => {
      const market = {
        ...doctorRow.additionalCountries[0]!,
        translations: testCase.marketTranslations,
      };
      doctorRows = [
        {
          ...doctorRow,
          translations: testCase.translations,
          additionalCountries: [market],
        },
      ];
      try {
        const [card] = await listDoctorCardsByCountry("ie", testCase.requested);

        const defaultLocale = market.country.defaultLocale as LocaleCode;
        const merged = mergeDoctorTranslation(
          {
            title: doctorRow.title,
            bio: doctorRow.bio,
            seoTitle: doctorRow.seoTitle,
            seoDescription: doctorRow.seoDescription,
            translations: testCase.translations.map((t) => ({
              ...t,
              seoTitle: null,
              seoDescription: null,
            })),
          },
          testCase.requested,
          defaultLocale,
        );
        const expected = mergeDoctorMarketTranslation(
          merged,
          testCase.marketTranslations.map((t) => ({
            ...t,
            seoTitle: null,
            seoDescription: null,
            seoKeywords: [],
          })),
          testCase.requested,
          defaultLocale,
        );

        assert.equal(card!.title, expected.title);
        assert.equal(card!.bio, expected.bio);
      } finally {
        doctorRows = [doctorRow];
      }
    });
  }
});
