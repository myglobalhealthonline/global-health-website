import { describe, expect, it } from "vitest";
import type { CountryDoctorCard, CountryServiceCard } from "./get-country-collections";
import { selectServiceDoctors } from "./service-doctor-selection";

function service(
  overrides: Partial<CountryServiceCard> & Pick<CountryServiceCard, "id" | "slug">,
): CountryServiceCard {
  return {
    name: overrides.slug,
    summary: "",
    kind: "GENERAL",
    durationMinutes: 30,
    basePriceCents: 5000,
    currencyCode: "EUR",
    assignedDoctorIds: [],
    insuranceOptions: [],
    bookability: { state: "BOOKABLE", reasonCode: null, nextAvailableAt: null },
    ...overrides,
  };
}

function doctor(
  overrides: Partial<CountryDoctorCard> & Pick<CountryDoctorCard, "id" | "slug">,
): CountryDoctorCard {
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

describe("selectServiceDoctors", () => {
  const acute = service({
    id: "svc-acute",
    slug: "acute-medical-consultation",
    assignedDoctorIds: ["doc-gp", "doc-featured"],
  });
  const chronic = service({
    id: "svc-chronic",
    slug: "chronic-disease-consultation",
    assignedDoctorIds: ["doc-gp"],
  });

  it("includes only doctors with reciprocal assignments to an active service", () => {
    const result = selectServiceDoctors(
      [
        doctor({ id: "doc-gp", slug: "assigned-gp", assignedServiceIds: [acute.id] }),
        doctor({ id: "doc-specialist", slug: "specialist-only", assignedServiceIds: ["svc-specialist"] }),
        doctor({ id: "doc-one-sided", slug: "one-sided", assignedServiceIds: [acute.id] }),
      ],
      [{ ...acute, assignedDoctorIds: ["doc-gp"] }],
    );

    expect(result.map((entry) => entry.doctor.slug)).toEqual(["assigned-gp"]);
  });

  it("deduplicates multi-assigned doctors and retains all matching service names", () => {
    const result = selectServiceDoctors(
      [doctor({ id: "doc-gp", slug: "assigned-gp", assignedServiceIds: [acute.id, chronic.id] })],
      [acute, chronic],
    );

    expect(result).toHaveLength(1);
    expect(result[0].serviceSlug).toBe(acute.slug);
    expect(result[0].serviceNames).toEqual([acute.name, chronic.name]);
  });

  it("orders featured doctors first without mutating the input arrays", () => {
    const doctors = [
      doctor({ id: "doc-gp", slug: "assigned-gp", assignedServiceIds: [acute.id] }),
      doctor({ id: "doc-featured", slug: "featured-gp", assignedServiceIds: [acute.id], isFeatured: true }),
    ];
    const originalDoctors = [...doctors];
    const originalAssignments = [...acute.assignedDoctorIds];

    const result = selectServiceDoctors(doctors, [acute]);

    expect(result.map((entry) => entry.doctor.slug)).toEqual(["featured-gp", "assigned-gp"]);
    expect(doctors).toEqual(originalDoctors);
    expect(acute.assignedDoctorIds).toEqual(originalAssignments);
  });
});
