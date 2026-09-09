import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

let gpServiceLookups = 0;
let doctorLookups = 0;
let delayGpServiceLookup = false;
let releaseGpServiceLookup: (() => void) | undefined;

let getGpAvailability:
  (typeof import("./gp-assignment.service.js"))["getGpAvailability"];
let getGpLanguages:
  (typeof import("./gp-assignment.service.js"))["getGpLanguages"];
let invalidateAvailabilityCaches:
  (typeof import("../doctor-availability/availability-cache-bus.js"))["invalidateAvailabilityCaches"];

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        country: { findFirst: async () => ({ bookingSetting: { timezone: "UTC" } }) },
        service: {
          findUnique: async () => ({
            bookingPausedFrom: null,
            bookingPausedUntil: null,
            country: { bookingSetting: { bookingEnabled: true } },
          }),
        },
        doctor: {
          findMany: async () => {
            doctorLookups += 1;
            return [
              {
                id: "doctor-1",
                languages: ["en"],
                bookingPausedFrom: null,
                bookingPausedUntil: null,
              },
            ];
          },
        },
      },
    },
  });
  mock.module("../doctor-availability/doctor-availability.service.js", {
    namedExports: {
      releaseExpiredHeldSlotsForDoctors: async () => {},
      listOpenSlotsForDoctorAndService: async () => [],
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
  mock.module("./gp-config.service.js", {
    namedExports: {
      resolveGpSameDayService: async () => {
        gpServiceLookups += 1;
        if (delayGpServiceLookup) {
          delayGpServiceLookup = false;
          await new Promise<void>((resolve) => {
            releaseGpServiceLookup = resolve;
          });
        }
        return {
          id: "gp-service-1",
          slug: "same-day-gp",
          durationMinutes: 30,
          basePriceCents: 5000,
          currencyCode: "EUR",
        };
      },
      getGpPriorityDoctorId: async () => null,
      claimNextRotationCursor: async () => 0,
    },
  });

  ({ getGpAvailability, getGpLanguages } = await import("./gp-assignment.service.js"));
  ({ invalidateAvailabilityCaches } = await import("../doctor-availability/availability-cache-bus.js"));
});

beforeEach(() => {
  gpServiceLookups = 0;
  doctorLookups = 0;
  delayGpServiceLookup = false;
  releaseGpServiceLookup = undefined;
  invalidateAvailabilityCaches();
});

describe("GP aggregate caches", () => {
  it("deduplicates a cold availability read and retries it after late invalidation", async () => {
    delayGpServiceLookup = true;
    const args = { countryCode: "ie", languageCode: "en", days: 2 };
    const first = getGpAvailability(args);
    const second = getGpAvailability(args);
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(gpServiceLookups, 1);
    invalidateAvailabilityCaches({ doctorIds: ["doctor-1"] });
    releaseGpServiceLookup?.();

    await Promise.all([first, second]);
    assert.equal(gpServiceLookups, 2);
  });

  it("invalidates the GP language cache", async () => {
    await getGpLanguages("ie", "marketing");
    await getGpLanguages("ie", "marketing");
    assert.equal(gpServiceLookups, 1);
    assert.equal(doctorLookups, 1);

    invalidateAvailabilityCaches({ doctorIds: ["doctor-1"] });
    await getGpLanguages("ie", "marketing");
    assert.equal(gpServiceLookups, 2);
    assert.equal(doctorLookups, 2);
  });
});
