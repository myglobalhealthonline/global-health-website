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
