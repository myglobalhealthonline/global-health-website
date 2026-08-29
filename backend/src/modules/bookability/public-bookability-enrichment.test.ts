import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

const country = {
  id: "country-1",
  code: "IE",
  slug: "ireland",
  name: "Ireland",
  defaultLocale: "EN",
  teamPath: "/ireland/doctors",
};

const service = {
  id: "service-1",
  countryId: country.id,
  kind: "GENERAL",
  slug: "general-consultation",
  name: "General consultation",
  summary: "See a doctor online",
  heroTitle: null,
  heroDescription: null,
  detailBody: null,
  ctaLabel: null,
  seoTitle: null,
  seoDescription: null,
  durationMinutes: 30,
  basePriceCents: 5000,
  currencyCode: "EUR",
  bookingPausedFrom: null,
  bookingPausedUntil: null,
  bookingPauseReason: null,
  country,
  assets: [],
  faqs: [],
  translations: [],
  assignedDoctors: [],
  insuranceCoverages: [],
  insuranceDoctorPayouts: [],
};

const doctor = {
  id: "doctor-1",
  countryId: country.id,
  slug: "dr-example",
  fullName: "Dr Example",
  title: "GP",
  bio: null,
  seoTitle: null,
  seoDescription: null,
  whatsappNumber: null,
  bookingPausedFrom: null,
  bookingPausedUntil: null,
  bookingPauseReason: null,
  medicalRegistrationUrl: null,
  country,
  specialties: [],
  assets: [],
  faqs: [],
  translations: [],
  additionalCountries: [],
  credentials: [],
  assignedServices: [{ serviceId: service.id, service }],
};

let listDoctors: (typeof import("../doctors/doctors.service.js"))["listDoctors"];
let getDoctorByCountryAndSlug:
  (typeof import("../doctors/doctors.service.js"))["getDoctorByCountryAndSlug"];
let listServices: (typeof import("../services/services.service.js"))["listServices"];
let getPublicServiceBySlug:
  (typeof import("../services/services.service.js"))["getPublicServiceBySlug"];

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        doctor: {
          findMany: async () => [doctor],
          findFirst: async () => doctor,
        },
        service: {
          findMany: async () => [service],
          findFirst: async () => service,
        },
      },
    },
  });
  mock.module("./bookability.service.js", {
    namedExports: {
      getDoctorBookability: async () => {
        throw new Error("availability datastore offline");
      },
      getServiceBookability: async () => {
        throw new Error("availability datastore offline");
      },
      invalidateBookabilityCache: () => {},
    },
  });
  mock.module("../doctors/featured-doctor.service.js", {
    namedExports: { getFeaturedDoctorId: async () => null },
  });
  mock.module("../service-links/service-links.service.js", {
    namedExports: { resolveServiceLinksForPage: async () => [] },
  });

  ({ listDoctors, getDoctorByCountryAndSlug } = await import("../doctors/doctors.service.js"));
  ({ listServices, getPublicServiceBySlug } = await import("../services/services.service.js"));
});

const unavailable = {
  state: "UNAVAILABLE",
  reasonCode: "NO_OPEN_SLOT",
  nextAvailableAt: null,
};

describe("public bookability enrichment failure containment", () => {
  it("keeps doctor listing content alive with a disabled booking state", async () => {
    const result = await listDoctors();
    assert.equal(result[0]?.id, doctor.id);
    assert.deepEqual(result[0]?.bookability, unavailable);
  });

  it("keeps a doctor profile alive with aggregate and pair summaries fail closed", async () => {
    const result = await getDoctorByCountryAndSlug("IE", doctor.slug);
    assert.equal(result?.id, doctor.id);
    assert.deepEqual(result?.bookability, unavailable);
    assert.deepEqual(result?.bookabilityByServiceId, {
      [service.id]: unavailable,
    });
  });

  it("keeps service listing content alive with a disabled booking state", async () => {
    const result = await listServices();
    assert.equal(result[0]?.id, service.id);
    assert.deepEqual(result[0]?.bookability, unavailable);
  });

  it("keeps a service detail page alive with a disabled booking state", async () => {
    const result = await getPublicServiceBySlug(service.slug, "IE");
    assert.equal(result?.id, service.id);
    assert.deepEqual(result?.bookability, unavailable);
  });
});
