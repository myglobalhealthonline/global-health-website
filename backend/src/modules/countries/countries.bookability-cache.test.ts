import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

let invalidations = 0;
let bookingSettingWrites = 0;

const country = {
  id: "country-1",
  code: "IE",
  name: "Ireland",
  slug: "ireland",
  defaultLocale: "EN",
  countryLocales: [{ locale: "EN", isDefault: true }],
  domains: [],
  bookingSetting: null,
};

let updateAdminCountry:
  (typeof import("./countries.service.js"))["updateAdminCountry"];

before(async () => {
  const tx = {
    country: {
      update: async () => country,
      findUnique: async () => country,
    },
    bookingSetting: {
      upsert: async () => {
        bookingSettingWrites += 1;
        return {};
      },
    },
  };

  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        country: { findUnique: async () => country },
        currency: { findUnique: async () => null },
        $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
      },
    },
  });
  mock.module("../bookability/bookability.service.js", {
    namedExports: {
      invalidateBookabilityCache: () => {
        invalidations += 1;
      },
    },
  });

  ({ updateAdminCountry } = await import("./countries.service.js"));
});

beforeEach(() => {
  invalidations = 0;
  bookingSettingWrites = 0;
});

describe("country booking-setting cache invalidation", () => {
  it("invalidates bookability after a booking setting update commits", async () => {
    await updateAdminCountry("country-1", {
      bookingSetting: { bookingEnabled: false },
    });

    assert.equal(bookingSettingWrites, 1);
    assert.equal(invalidations, 1);
  });

  it("does not invalidate bookability for unrelated country copy changes", async () => {
    await updateAdminCountry("country-1", { name: "Ireland updated" });

    assert.equal(bookingSettingWrites, 0);
    assert.equal(invalidations, 0);
  });
});
