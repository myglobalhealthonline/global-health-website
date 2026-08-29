import { describe, expect, it } from "vitest";
import { buildDoctorDirectoryView, type DoctorDirectoryContext } from "./doctor-directory";
import type { CountryDoctorCard } from "@/lib/content/get-country-collections";

// ponytail: minimal fixtures — only the fields the filter predicate + view
// model actually read.
function doc(overrides: Partial<CountryDoctorCard> & Pick<CountryDoctorCard, "id" | "slug" | "fullName">): CountryDoctorCard {
  return {
    title: "Dr.",
    bio: null,
    languages: [],
    specialties: [],
    assignedServiceIds: [],
    bookability: { state: "BOOKABLE", reasonCode: null, nextAvailableAt: null },
    bookabilityByServiceId: {},
    ...overrides,
  };
}

const i18n = {
  theTeamBadge: "",
  heroTitleLead: "",
  heroTitleAccent: "",
  heroTitleTrail: "",
  heroLedeTemplate: "",
  heroAvailableSingular: "",
  heroAvailablePlural: "",
  onboardingTitle: "",
  onboardingBodyTemplate: "",
  bottomCtaTitle: "",
  bottomCtaAccent: "",
  filterSpeaks: "Speaks",
  filterType: "Type",
  filterTypeGP: "GP",
  filterTypeSpecialist: "Specialist",
  clearFilters: "Clear",
  viewProfile: "View profile",
  bookAppointment: "Book",
  pickTime: "Pick a time",
  filters: "Filters",
  bioFallbackTemplate: "Licensed clinician available for online consultations in {country}.",
  verifyRegistrationAria: "Verify registration on the official register",
  languagesMoreTemplate: "{languages} & More",
  showResults: "Show results",
  featuredClinician: "Featured clinician",
  registrationLabel: "Registration",
  verifiedSuffix: "Verified",
  languagesLabel: "Languages",
};

const gpService = "svc-gp";
const specialistService = "svc-specialist";

const doctors: CountryDoctorCard[] = [
  doc({ id: "1", slug: "gp-english", fullName: "GP English", languages: ["English"], assignedServiceIds: [gpService] }),
  doc({ id: "2", slug: "gp-spanish", fullName: "GP Spanish", languages: ["Spanish"], assignedServiceIds: [gpService] }),
  doc({
    id: "3",
    slug: "specialist-featured",
    fullName: "Specialist Featured",
    languages: ["English", "Spanish"],
    assignedServiceIds: [specialistService],
    isFeatured: true,
  }),
];

function ctx(): DoctorDirectoryContext {
  return {
    countryName: "Ireland",
    countrySlug: "ie",
    lang: "en",
    doctors,
    generalServiceIds: [gpService],
    specialistServiceIds: [specialistService],
    verifyUrl: undefined,
    i18n,
    bookingAvailability: {
      notAcceptingOnlineBookings: "Not accepting online bookings",
      returningOn: "Appointments reopen {date}",
      nextAvailable: "Next available {date}",
    },
    bookingTimezone: "Europe/Dublin",
  };
}

describe("buildDoctorDirectoryView", () => {
  it("no filters: full roster minus the featured doctor in the grid, featured in the spotlight", () => {
    const view = buildDoctorDirectoryView(ctx(), [], []);
    expect(view.doctorCards.map((d) => d.name)).toEqual(["GP English", "GP Spanish"]);
    expect(view.spotlight?.name).toBe("Specialist Featured");
    expect(view.hasActive).toBe(false);
  });

  it("language filter (?lang=es): only doctors who speak Spanish, AND-with-type semantics unaffected", () => {
    const view = buildDoctorDirectoryView(ctx(), ["es"], []);
    // GP Spanish matches directly; the featured specialist also speaks
    // Spanish so it's pulled into the spotlight, not double-counted in grid.
    expect(view.doctorCards.map((d) => d.name)).toEqual(["GP Spanish"]);
    expect(view.spotlight?.name).toBe("Specialist Featured");
    expect(view.hasActive).toBe(true);
  });

  it("comma-joined multi-value (?lang=es,en) OR's within the group", () => {
    const view = buildDoctorDirectoryView(ctx(), ["es,en"], []);
    expect(view.doctorCards.map((d) => d.name).sort()).toEqual(["GP English", "GP Spanish"]);
  });

  it("repeated-param multi-value (?lang=es&lang=en) behaves the same as comma-joined", () => {
    const view = buildDoctorDirectoryView(ctx(), ["es", "en"], []);
    expect(view.doctorCards.map((d) => d.name).sort()).toEqual(["GP English", "GP Spanish"]);
  });

  it("type filter (?type=specialist): only the specialist, spotlighted (not duplicated in grid)", () => {
    const view = buildDoctorDirectoryView(ctx(), [], ["specialist"]);
    expect(view.doctorCards).toEqual([]);
    expect(view.spotlight?.name).toBe("Specialist Featured");
  });

  it("type filter (?type=gp): featured specialist excluded entirely, so no spotlight", () => {
    const view = buildDoctorDirectoryView(ctx(), [], ["gp"]);
    expect(view.doctorCards.map((d) => d.name).sort()).toEqual(["GP English", "GP Spanish"]);
    expect(view.spotlight).toBeNull();
  });

  it("combined lang+type is AND across groups: GP who speaks Spanish only", () => {
    const view = buildDoctorDirectoryView(ctx(), ["es"], ["gp"]);
    expect(view.doctorCards.map((d) => d.name)).toEqual(["GP Spanish"]);
  });

  it("unrecognised type token is dropped, same as no type filter", () => {
    const view = buildDoctorDirectoryView(ctx(), [], ["nonsense"]);
    expect(view.doctorCards.map((d) => d.name)).toEqual(["GP English", "GP Spanish"]);
  });

  it("keeps unavailable doctor cards visible but orders them after bookable cards", () => {
    const unavailableFirst = doc({
      id: "paused",
      slug: "paused",
      fullName: "Paused Doctor",
      assignedServiceIds: [gpService],
      bookability: {
        state: "UNAVAILABLE",
        reasonCode: "DOCTOR_PAUSED",
        nextAvailableAt: null,
      },
    });
    const availableSecond = doc({
      id: "open",
      slug: "open",
      fullName: "Open Doctor",
      assignedServiceIds: [gpService],
    });
    const view = buildDoctorDirectoryView(
      { ...ctx(), doctors: [unavailableFirst, availableSecond] },
      [],
      [],
    );

    expect(view.doctorCards.map((entry) => entry.name)).toEqual([
      "Open Doctor",
      "Paused Doctor",
    ]);
  });

  it("keeps a doctor with an in-horizon slot on the standard Book CTA", () => {
    const availableDoctor = doc({
      id: "open-with-slot",
      slug: "open-with-slot",
      fullName: "Open With Slot",
      assignedServiceIds: [gpService],
      bookability: {
        state: "BOOKABLE",
        reasonCode: null,
        nextAvailableAt: "2026-09-03T09:00:00.000Z",
      },
    });
    const view = buildDoctorDirectoryView(
      { ...ctx(), doctors: [availableDoctor] },
      [],
      [],
    );

    expect(view.doctorCards[0]).toMatchObject({
      name: "Open With Slot",
      bookability: { state: "BOOKABLE" },
      bookLabel: "Pick a time",
      nextAvailableLabel: undefined,
    });
  });

  it("preserves the explicitly featured doctor's spotlight identity even when unavailable", () => {
    const featuredUnavailable = doc({
      id: "featured-paused",
      slug: "featured-paused",
      fullName: "Featured Paused",
      isFeatured: true,
      assignedServiceIds: [specialistService],
      bookability: {
        state: "UNAVAILABLE",
        reasonCode: "DOCTOR_PAUSED",
        nextAvailableAt: null,
      },
    });
    const view = buildDoctorDirectoryView(
      { ...ctx(), doctors: [featuredUnavailable, doctors[0]!] },
      [],
      [],
    );

    expect(view.spotlight?.name).toBe("Featured Paused");
    expect(view.spotlight?.bookability?.state).toBe("UNAVAILABLE");
    expect(view.doctorCards.map((entry) => entry.name)).toEqual(["GP English"]);
  });

  it("filter chips only render for types the country actually has", () => {
    const view = buildDoctorDirectoryView(ctx(), [], []);
    const typeGroup = view.filterGroups.find((g) => g.heading === "Type");
    expect(typeGroup?.options.map((o) => o.token)).toEqual(["gp", "specialist"]);
  });

  it("toggleHref preserves the other active filter group", () => {
    const view = buildDoctorDirectoryView(ctx(), ["es"], ["gp"]);
    const typeGroup = view.filterGroups.find((g) => g.heading === "Type")!;
    const gpOption = typeGroup.options.find((o) => o.token === "gp")!;
    // Toggling off "gp" (currently active) should drop &type= but keep &lang=es.
    expect(gpOption.href).toBe("/ie/en/doctors?lang=es");
  });
});

/**
 * Internal-discovery batch (2026-08-09). `/doctors` renders through a client
 * `useState` carousel (`DoctorTeamTemplate`, PAGE_SIZE=6) — a crawler landing
 * cold on the route (no JS execution) can only ever see whichever cards that
 * component chooses to mount. On production this meant every country's
 * roster beyond the first 6 non-featured doctors had no inlink from its own
 * listing page at all: Ireland's 22 doctors, 7 discoverable (1 featured + 6
 * paged), 15 orphaned from this page.
 *
 * The fix adds an always-rendered link index below the carousel, sourced
 * from the SAME `doctors` prop the carousel slices — so its correctness
 * depends entirely on `buildDoctorDirectoryView` never truncating that array
 * itself. These tests pin that invariant at the data layer, where it can
 * actually be tested (no jsdom/testing-library in this repo, so
 * `DoctorTeamTemplate`'s JSX is exercised live in the browser, not here).
 */
describe("buildDoctorDirectoryView never truncates the grid — the crawlable-index fix's precondition", () => {
  function bigRoster(n: number): CountryDoctorCard[] {
    return Array.from({ length: n }, (_, i) =>
      doc({ id: String(i), slug: `doctor-${i}`, fullName: `Doctor ${i}`, assignedServiceIds: [gpService] }),
    );
  }

  it("a roster far larger than the carousel's PAGE_SIZE (6) comes back whole", () => {
    const bigCtx: DoctorDirectoryContext = { ...ctx(), doctors: bigRoster(22) };
    const view = buildDoctorDirectoryView(bigCtx, [], []);
    expect(view.doctorCards).toHaveLength(22);
    expect(view.doctorCards.every((d) => typeof d.href === "string" && d.href.length > 0)).toBe(true);
  });

  it("every card keeps a real href and a non-empty name — what the index renders as anchor text", () => {
    const bigCtx: DoctorDirectoryContext = { ...ctx(), doctors: bigRoster(30) };
    const view = buildDoctorDirectoryView(bigCtx, [], []);
    for (const d of view.doctorCards) {
      expect(d.href, d.name).toMatch(/^\/ie\/en\/doctors\/doctor-\d+$/);
      expect(d.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("totalDoctorCount matches the actual card count returned, not a fixed page size", () => {
    const bigCtx: DoctorDirectoryContext = { ...ctx(), doctors: bigRoster(19) };
    const view = buildDoctorDirectoryView(bigCtx, [], []);
    // 19 total minus 0 featured here (bigRoster sets none) = 19 in the grid.
    expect(view.totalDoctorCount).toBe(19);
    expect(view.doctorCards).toHaveLength(19);
  });
});
