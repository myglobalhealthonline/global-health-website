import { describe, expect, it } from "vitest";
import type { CountryDoctorCard, CountryServiceCard } from "./get-country-collections";
import {
  selectedServiceBookability,
  selectServiceDoctors,
  sortServiceDoctorSelectionsByBookability,
  sortDoctorsByServiceBookability,
} from "./service-doctor-selection";

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

  it("uses the doctor's best bookable service pair instead of the first assignment", () => {
    const paused = service({
      id: "svc-paused",
      slug: "paused-specialist",
      assignedDoctorIds: ["doc-multi"],
    });
    const open = service({
      id: "svc-open",
      slug: "open-specialist",
      assignedDoctorIds: ["doc-multi"],
    });
    const result = selectServiceDoctors(
      [
        doctor({
          id: "doc-multi",
          slug: "multi-specialist",
          assignedServiceIds: [paused.id, open.id],
          bookabilityByServiceId: {
            [paused.id]: {
              state: "UNAVAILABLE",
              reasonCode: "SERVICE_PAUSED",
              nextAvailableAt: null,
            },
            [open.id]: {
              state: "BOOKABLE",
              reasonCode: null,
              nextAvailableAt: "2026-09-01T09:00:00.000Z",
            },
          },
        }),
      ],
      [paused, open],
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ serviceId: open.id, serviceSlug: open.slug });
    expect(result[0].serviceNames).toEqual([paused.name, open.name]);
  });

  it("sorts a service roster by the exact doctor-service pair before callers slice it", () => {
    const serviceId = "svc-specialist";
    const unavailable = doctor({
      id: "doc-unavailable",
      slug: "unavailable",
      bookabilityByServiceId: {
        [serviceId]: {
          state: "UNAVAILABLE",
          reasonCode: "DOCTOR_PAUSED",
          nextAvailableAt: null,
        },
      },
    });
    const returning = doctor({
      id: "doc-returning",
      slug: "returning",
      bookabilityByServiceId: {
        [serviceId]: {
          state: "RETURNING",
          reasonCode: "DOCTOR_PAUSED",
          nextAvailableAt: "2026-09-05T09:00:00.000Z",
        },
      },
    });
    const bookable = doctor({
      id: "doc-bookable",
      slug: "bookable",
      bookabilityByServiceId: {
        [serviceId]: {
          state: "BOOKABLE",
          reasonCode: null,
          nextAvailableAt: "2026-09-01T09:00:00.000Z",
        },
      },
    });

    expect(
      sortDoctorsByServiceBookability([unavailable, returning, bookable], serviceId).map(
        (entry) => entry.slug,
      ),
    ).toEqual(["bookable", "returning", "unavailable"]);
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

  it("reads the chosen service pair summary instead of the doctor's aggregate summary", () => {
    const gp = service({
      id: "svc-gp",
      slug: "gp-consultation",
      assignedDoctorIds: ["doc-mixed"],
    });
    const [selection] = selectServiceDoctors(
      [
        doctor({
          id: "doc-mixed",
          slug: "mixed",
          assignedServiceIds: [gp.id],
          bookability: {
            state: "BOOKABLE",
            reasonCode: null,
            nextAvailableAt: "2026-09-01T09:00:00.000Z",
          },
          bookabilityByServiceId: {
            [gp.id]: {
              state: "UNAVAILABLE",
              reasonCode: "NO_OPEN_SLOT",
              nextAvailableAt: null,
            },
          },
        }),
      ],
      [gp],
    );

    expect(selectedServiceBookability(selection!)).toEqual({
      state: "UNAVAILABLE",
      reasonCode: "NO_OPEN_SLOT",
      nextAvailableAt: null,
    });
  });

  it("sorts selected doctors by the chosen service pair state before callers slice them", () => {
    const gp = service({
      id: "svc-gp",
      slug: "gp-consultation",
      assignedDoctorIds: ["doc-wrong-aggregate", "doc-real-slot"],
    });
    const selections = selectServiceDoctors(
      [
        doctor({
          id: "doc-wrong-aggregate",
          slug: "wrong-aggregate",
          assignedServiceIds: [gp.id],
          bookability: {
            state: "BOOKABLE",
            reasonCode: null,
            nextAvailableAt: "2026-09-01T09:00:00.000Z",
          },
          bookabilityByServiceId: {
            [gp.id]: {
              state: "UNAVAILABLE",
              reasonCode: "NO_OPEN_SLOT",
              nextAvailableAt: null,
            },
          },
        }),
        doctor({
          id: "doc-real-slot",
          slug: "real-slot",
          assignedServiceIds: [gp.id],
          bookability: {
            state: "UNAVAILABLE",
            reasonCode: "NO_OPEN_SLOT",
            nextAvailableAt: null,
          },
          bookabilityByServiceId: {
            [gp.id]: {
              state: "BOOKABLE",
              reasonCode: null,
              nextAvailableAt: "2026-09-01T09:00:00.000Z",
            },
          },
        }),
      ],
      [gp],
    );

    expect(sortServiceDoctorSelectionsByBookability(selections).map((entry) => entry.doctor.slug)).toEqual([
      "real-slot",
      "wrong-aggregate",
    ]);
  });
});
