import assert from "node:assert/strict";
import { before, mock, test } from "node:test";

before(() => {
  mock.module("../../db/prisma.js", { namedExports: { prisma: {
    country: { findMany: async ({ where }: { where: { code: { in: string[]; mode?: string } } }) => {
      const code = "cz";
      return where.code.in.some(c => where.code.mode === "insensitive" ? c.toLowerCase() === code : c === code)
        ? [{ code, name: "Czechia", isActive: true }] : [];
    } },
    setting: { findMany: async () => [{ key: "review.destination:CZ", value: { sendReviewRequests: false, googleReviewUrl: "https://g.page/r/CZPoObaUvwL8ECE/review" } }] },
  } } });
});
test("lowercase database countries expose the saved uppercase-key GBP settings", async () => {
  const { getAdminCountryReviewDestinations } = await import("./settings.service.js");
  const countries = await getAdminCountryReviewDestinations();
  assert.deepEqual(countries, [{ countryCode: "CZ", countryName: "Czechia", isActive: true, sendReviewRequests: false, googleReviewUrl: "https://g.page/r/CZPoObaUvwL8ECE/review" }]);
});
