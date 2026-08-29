import { describe, expect, it } from "vitest";
import type { CountryDoctorCard, CountryServiceCard } from "./get-country-collections";
import { selectSpecialistDoctors } from "./specialist-doctor-selection";

function service(overrides: Partial<CountryServiceCard> & Pick<CountryServiceCard, "id" | "slug">): CountryServiceCard {
  return {
    name: overrides.slug,
    summary: "",
    kind: "SPECIALIST",
    durationMinutes: 30,
    basePriceCents: 5000,
    currencyCode: "EUR",
    assignedDoctorIds: [],
    insuranceOptions: [],
    bookability: { state: "BOOKABLE", reasonCode: null, nextAvailableAt: null },
    ...overrides,
  };
}

function doctor(overrides: Partial<CountryDoctorCard> & Pick<CountryDoctorCard, "id" | "slug">): CountryDoctorCard {
  return {
    fullName: overrides.slug,
    title: "Doctor",
    bio: null,
    languages: [],
    specialties: [],
    assignedServiceIds: [],
    bookability: { state: "BOOKABLE", reasonCode: null, nextAvailableAt: null },
    bookabilityByServiceId: {},
    ...overrides,
  };
}

describe("selectSpecialistDoctors", () => {
  const dermatology = service({ id: "svc-derm", slug: "dermatology", assignedDoctorIds: ["doc-1"] });
  const cardiology = service({ id: "svc-cardio", slug: "cardiology", assignedDoctorIds: ["doc-1"] });

  it("includes assigned doctors even when specialty metadata is missing", () => {
    const result = selectSpecialistDoctors(
      [doctor({ id: "doc-1", slug: "assigned-no-specialty", assignedServiceIds: [dermatology.id] })],
      [dermatology],
    );

    expect(result).toHaveLength(1);
    expect(result[0].serviceSlug).toBe("dermatology");
  });

  it("excludes doctors with specialty metadata but no active specialist assignment", () => {
    const result = selectSpecialistDoctors(
      [doctor({ id: "doc-1", slug: "specialty-only", specialties: ["Dermatology"] })],
      [dermatology],
    );

    expect(result).toEqual([]);
  });

  it("excludes doctors assigned only to services outside the active specialist set", () => {
    const result = selectSpecialistDoctors(
      [doctor({ id: "doc-1", slug: "general-only", assignedServiceIds: ["svc-general"] })],
      [dermatology],
    );

    expect(result).toEqual([]);
  });

  it("deduplicates doctors assigned to multiple specialist services", () => {
    const result = selectSpecialistDoctors(
      [
        doctor({
          id: "doc-1",
          slug: "multi-assigned",
          assignedServiceIds: [cardiology.id, dermatology.id],
        }),
      ],
      [dermatology, cardiology],
    );

    expect(result).toHaveLength(1);
    expect(result[0].serviceSlug).toBe("dermatology");
    expect(result[0].serviceNames).toEqual(["dermatology", "cardiology"]);
  });

  it("orders featured doctors first and otherwise preserves deterministic API order", () => {
    const result = selectSpecialistDoctors(
      [
        doctor({ id: "doc-a", slug: "first", assignedServiceIds: [dermatology.id] }),
        doctor({ id: "doc-b", slug: "featured", assignedServiceIds: [dermatology.id], isFeatured: true }),
        doctor({ id: "doc-c", slug: "third", assignedServiceIds: [cardiology.id] }),
      ],
      [
        { ...dermatology, assignedDoctorIds: ["doc-a", "doc-b"] },
        { ...cardiology, assignedDoctorIds: ["doc-c"] },
      ],
    );

    expect(result.map((entry) => entry.doctor.slug)).toEqual(["featured", "first", "third"]);
  });

  it("does not cap a roster larger than six doctors", () => {
    const roster = Array.from({ length: 8 }, (_, index) =>
      doctor({ id: `doc-${index}`, slug: `doctor-${index}`, assignedServiceIds: [dermatology.id] }),
    );
    const result = selectSpecialistDoctors(roster, [
      { ...dermatology, assignedDoctorIds: roster.map((entry) => entry.id) },
    ]);

    expect(result).toHaveLength(8);
  });
});
