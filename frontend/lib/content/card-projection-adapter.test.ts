import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Card-projection adapter (perf plan docs/plans/new.md §7.2).
 *
 * The projection path and the legacy path share ONE row mapper, so parity is
 * structural rather than asserted field by field — the tests that matter are
 * about which path runs and what happens when the projection is wrong:
 *
 *   projection 200 + valid  → cards from the projection, legacy never called
 *   projection unreachable  → legacy cards, page still renders, nothing thrown
 *   projection invalid      → legacy cards (never [], never a blank section)
 *   both paths fail         → the existing PublicContentUnavailableError throw
 *
 * A projection failure must never be mistaken for a confirmed-empty country.
 */

const API_URL = "http://backend.test";

type Getters = typeof import("@/lib/content/get-country-collections");
type Source = typeof import("@/lib/content/public-content-source");

let getters: Getters;
let PublicContentUnavailableError: Source["PublicContentUnavailableError"];

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  getters = await import("@/lib/content/get-country-collections");
  ({ PublicContentUnavailableError } = await import("@/lib/content/public-content-source"));
});

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ok = (data: unknown) => json(200, { ok: true, data });
const gone = () => json(404, { ok: false, message: "Not found" });
const unavailable = () => json(503, { ok: false, message: "Doctors data is unavailable" });

/** Route the shared fetch mock by path, so each test states only what differs. */
function routeFetch(handlers: Record<string, () => Response>) {
  const calls: string[] = [];
  fetchMock.mockImplementation(async (input: unknown) => {
    const url = String(input);
    calls.push(url);
    for (const [needle, handler] of Object.entries(handlers)) {
      if (url.includes(needle)) return handler();
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  return calls;
}

/* --------------------------------- doctors -------------------------------- */

const doctorProjectionRow = {
  id: "doctor-1",
  slug: "jane-doe",
  fullName: "Jane Doe",
  title: "General Practitioner",
  bio: "Bio",
  languages: ["English"],
  specialties: [{ specialty: { name: "General Practice" } }],
  assets: [
    {
      kind: "IMAGE",
      path: "/api/media/doctor-1.jpg",
      altText: "Portrait",
      title: null,
      caption: null,
      description: null,
      focalX: 40,
      focalY: 60,
      zoom: 1.2,
    },
  ],
  assignedServices: [{ serviceId: "service-1" }],
  imcRegistration: "523449",
  additionalCountries: [{ chamberEntity: "IMC" }],
  registrationDivision: "General Division",
  registrationVerified: true,
  credentials: [{ label: "FRCP", bodyName: "RCP", bodyUrl: "https://rcp.example" }],
  medicalRegistrationUrl: "https://verify.example",
  instagramUrl: null,
  facebookUrl: null,
  linkedinUrl: null,
  isFeatured: true,
  editorialChecklist: { nonPhysician: true },
  bookability: { state: "BOOKABLE", reasonCode: null, nextAvailableAt: "2026-09-01T09:00:00.000Z" },
  bookabilityByServiceId: {
    "service-1": {
      state: "BOOKABLE",
      reasonCode: null,
      nextAvailableAt: "2026-09-01T09:00:00.000Z",
    },
  },
};

/** The legacy collection row: same doctor, plus the fields the projection drops. */
const doctorLegacyRow = {
  ...doctorProjectionRow,
  active: true,
  seoTitle: "SEO",
  seoDescription: "SEO description",
  qualifications: ["MB BCh BAO"],
  faqs: [{ id: "faq-1", question: "Q", answer: "A" }],
  country: { code: "IE", name: "Ireland", teamPath: "/team" },
};

const serviceProjectionRow = {
  id: "service-1",
  slug: "gp-consultation",
  name: "GP Consultation",
  summary: "Summary",
  kind: "GENERAL",
  durationMinutes: 15,
  basePriceCents: 6000,
  currencyCode: "EUR",
  isActive: true,
  assets: [{ kind: "IMAGE", path: "/api/media/service-1.jpg", altText: "Consultation" }],
  assignedDoctors: [{ doctorId: "doctor-1" }],
  insuranceOptions: [{ companyId: "ins-1", name: "MediCare", insurancePriceCents: 4500 }],
  bookability: { state: "BOOKABLE", reasonCode: null, nextAvailableAt: null },
};

const serviceLegacyRow = {
  ...serviceProjectionRow,
  detailBody: "<p>long detail body</p>",
  insuranceSeoLine: "We also have MediCare for this service.",
  seoTitle: "SEO",
};

describe("doctor card projection adapter", () => {
  it("uses the projection and never calls the legacy endpoint on success", async () => {
    const calls = routeFetch({ "/doctor-cards": () => ok([doctorProjectionRow]) });
    const cards = await getters.getCountryDoctors("ie", "en");
    expect(cards).toHaveLength(1);
    expect(cards[0]!.id).toBe("doctor-1");
    expect(calls.every((u) => u.includes("/doctor-cards"))).toBe(true);
  });

  it("produces a card identical to the legacy payload's", async () => {
    routeFetch({ "/doctor-cards": () => ok([doctorProjectionRow]) });
    const [fromProjection] = await getters.getCountryDoctors("ie", "en");
    routeFetch({
      "/doctor-cards": () => gone(),
      "/doctors": () => ok([doctorLegacyRow]),
    });
    const [fromLegacy] = await getters.getCountryDoctors("ie", "en");
    expect(fromProjection).toEqual(fromLegacy);
  });

  it("carries the chamber, non-physician and focal shims through the mapper", async () => {
    routeFetch({ "/doctor-cards": () => ok([doctorProjectionRow]) });
    const [card] = await getters.getCountryDoctors("ie", "en");
    expect(card!.imcRegistration).toBe("IMC | 523449");
    expect(card!.registrationChamber).toBe("IMC");
    expect(card!.registrationNumber).toBe("523449");
    expect(card!.nonPhysician).toBe(true);
    expect(card!.imageFocalX).toBe(40);
    expect(card!.imageFocalY).toBe(60);
    expect(card!.imageZoom).toBe(1.2);
  });

  it("falls back to the legacy endpoint when the projection is unreachable", async () => {
    const calls = routeFetch({
      "/doctor-cards": () => gone(),
      "/doctors": () => ok([doctorLegacyRow]),
    });
    const cards = await getters.getCountryDoctors("ie", "en");
    expect(cards).toHaveLength(1);
    expect(calls.some((u) => u.includes("/doctors?") || u.endsWith("/doctors"))).toBe(true);
  });

  it("falls back when a projection row is missing a required field", async () => {
    const { slug: _slug, ...noSlug } = doctorProjectionRow;
    routeFetch({
      "/doctor-cards": () => ok([noSlug]),
      "/doctors": () => ok([doctorLegacyRow]),
    });
    await expect(getters.getCountryDoctors("ie", "en")).resolves.toHaveLength(1);
  });

  it("falls back on a duplicate doctor id rather than rendering it twice", async () => {
    routeFetch({
      "/doctor-cards": () => ok([doctorProjectionRow, doctorProjectionRow]),
      "/doctors": () => ok([doctorLegacyRow]),
    });
    await expect(getters.getCountryDoctors("ie", "en")).resolves.toHaveLength(1);
  });

  it("falls back when bookabilityByServiceId does not cover every assigned service", async () => {
    // Renders fine, but every CTA for the uncovered service would be a silent
    // hard UNAVAILABLE — worse than a slower legacy request.
    routeFetch({
      "/doctor-cards": () => ok([{ ...doctorProjectionRow, bookabilityByServiceId: {} }]),
      "/doctors": () => ok([doctorLegacyRow]),
    });
    const cards = await getters.getCountryDoctors("ie", "en");
    expect(cards[0]!.bookabilityByServiceId["service-1"]).toBeDefined();
  });

  it("keeps the fail-loud throw when the legacy endpoint also fails", async () => {
    routeFetch({ "/doctor-cards": () => gone(), "/doctors": () => unavailable() });
    await expect(getters.getCountryDoctors("ie", "en")).rejects.toBeInstanceOf(
      PublicContentUnavailableError,
    );
  });

  it("treats an empty projection as a confirmed-empty country", async () => {
    const calls = routeFetch({ "/doctor-cards": () => ok([]) });
    await expect(getters.getCountryDoctors("ie", "en")).resolves.toEqual([]);
    expect(calls).toHaveLength(1);
  });
});

describe("service card projection adapter", () => {
  it("uses the projection and never calls the legacy endpoint on success", async () => {
    const calls = routeFetch({ "/service-cards": () => ok([serviceProjectionRow]) });
    const cards = await getters.getCountryServices("ie", "GENERAL", "en");
    expect(cards).toHaveLength(1);
    expect(calls.every((u) => u.includes("/service-cards"))).toBe(true);
  });

  it("produces a card identical to the legacy payload's", async () => {
    routeFetch({ "/service-cards": () => ok([serviceProjectionRow]) });
    const [fromProjection] = await getters.getCountryServices("ie", "GENERAL", "en");
    routeFetch({
      "/service-cards": () => gone(),
      "/services": () => ok([serviceLegacyRow]),
    });
    const [fromLegacy] = await getters.getCountryServices("ie", "GENERAL", "en");
    expect(fromProjection).toEqual(fromLegacy);
  });

  it("falls back to the legacy endpoint when the projection is unreachable", async () => {
    routeFetch({
      "/service-cards": () => gone(),
      "/services": () => ok([serviceLegacyRow]),
    });
    await expect(getters.getCountryServices("ie", "GENERAL", "en")).resolves.toHaveLength(1);
  });

  it("falls back when a projection row is missing a required field", async () => {
    const { name: _name, ...noName } = serviceProjectionRow;
    routeFetch({
      "/service-cards": () => ok([noName]),
      "/services": () => ok([serviceLegacyRow]),
    });
    await expect(getters.getCountryServices("ie", "GENERAL", "en")).resolves.toHaveLength(1);
  });

  it("keeps the fail-loud throw when the legacy endpoint also fails", async () => {
    routeFetch({ "/service-cards": () => gone(), "/services": () => unavailable() });
    await expect(getters.getCountryServices("ie", "GENERAL", "en")).rejects.toBeInstanceOf(
      PublicContentUnavailableError,
    );
  });
});
