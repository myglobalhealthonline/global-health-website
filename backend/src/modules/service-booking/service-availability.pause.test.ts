import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

let serviceWhere: Record<string, unknown> | undefined;
let doctorWhere: Record<string, unknown> | undefined;
let listSlotCalls = 0;

let getServiceAggregatedAvailability:
  (typeof import("./service-availability.service.js"))["getServiceAggregatedAvailability"];

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        country: {
          findFirst: async () => ({ bookingSetting: { timezone: "UTC" } }),
        },
        service: {
          findFirst: async ({ where }: { where: Record<string, unknown> }) => {
            serviceWhere = where;
            return {
              id: "service-1",
              durationMinutes: 30,
              basePriceCents: 5000,
              currencyCode: "EUR",
              bookingPausedFrom: null,
              bookingPausedUntil: null,
              country: {
                currency: { code: "EUR" },
                bookingSetting: { bookingEnabled: false },
              },
            };
          },
        },
        doctor: {
          findMany: async ({ where }: { where: Record<string, unknown> }) => {
            doctorWhere = where;
            return [{ id: "doctor-1", slug: "doctor-one" }];
          },
        },
      },
    },
  });
  mock.module("../doctor-availability/doctor-availability.service.js", {
    namedExports: {
      releaseExpiredHeldSlotsForDoctors: async () => {},
      listOpenSlotsForDoctorAndService: async () => {
        listSlotCalls += 1;
        return [];
      },
    },
  });
  mock.module("../pricing/peak-pricing.service.js", {
    namedExports: {
      getServicePeakConfig: async () => null,
      computeSlotPrice: () => ({
        unitPriceCents: 5000,
        pricingType: "STANDARD",
        currencyCode: "EUR",
      }),
    },
  });

  ({ getServiceAggregatedAvailability } = await import("./service-availability.service.js"));
});

describe("service aggregated availability booking gates", () => {
  it("requires a PUBLIC service and an approved active assignment", async () => {
    await getServiceAggregatedAvailability("IE", "country-disabled", 14);

    assert.equal(serviceWhere?.visibility, "PUBLIC");
    assert.deepEqual(
      (doctorWhere?.assignedServices as { some: Record<string, unknown> }).some,
      { serviceId: "service-1", isActive: true, status: "active" },
    );
  });

  it("returns no slots without reading doctor inventory when country booking is disabled", async () => {
    const result = await getServiceAggregatedAvailability("IE", "country-disabled-2", 14);

    assert.equal(result.found, true);
    assert.deepEqual(result.slots, []);
    assert.deepEqual(result.doctorsByStart, {});
    assert.equal(listSlotCalls, 0);
  });
});
