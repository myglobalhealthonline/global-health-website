import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminCountryCreateBodySchema,
  adminCountryUpdateBodySchema,
} from "../../validations/admin-countries.schema.js";

describe("admin countries validation", () => {
  const validBase = {
    code: "xx",
    name: "Testland",
    slug: "testland",
    legacyHomePath: "/home-xx",
    teamPath: "/test-team",
    generalConsultationPath: "/general-xx",
    specialistConsultationPath: "/specialty-xx",
    defaultLocale: "EN",
    supportedLocales: ["EN", "PT"],
    currencyId: "curr_1",
  } as const;

  it("rejects defaultLocale not included in supportedLocales", () => {
    const result = adminCountryCreateBodySchema.safeParse({
      ...validBase,
      defaultLocale: "DE",
      supportedLocales: ["EN"],
    });
    assert.equal(result.success, false);
  });

  it("rejects route paths without leading slash", () => {
    const result = adminCountryCreateBodySchema.safeParse({
      ...validBase,
      legacyHomePath: "no-slash",
    });
    assert.equal(result.success, false);
  });

  it("rejects duplicate locales", () => {
    const result = adminCountryCreateBodySchema.safeParse({
      ...validBase,
      supportedLocales: ["EN", "EN"],
    });
    assert.equal(result.success, false);
  });

  it("rejects multiple primary domains", () => {
    const result = adminCountryCreateBodySchema.safeParse({
      ...validBase,
      domains: [
        { domain: "a.example.com", isPrimary: true },
        { domain: "b.example.com", isPrimary: true },
      ],
    });
    assert.equal(result.success, false);
  });

  it("accepts valid create payload", () => {
    const result = adminCountryCreateBodySchema.safeParse(validBase);
    assert.equal(result.success, true);
  });

  it("update accepts partial payload with locales + default aligned", () => {
    const result = adminCountryUpdateBodySchema.safeParse({
      supportedLocales: ["CS", "EN"],
      defaultLocale: "CS",
    });
    assert.equal(result.success, true);
  });

  it("update rejects mismatched defaultLocale when locales supplied together", () => {
    const result = adminCountryUpdateBodySchema.safeParse({
      supportedLocales: ["EN"],
      defaultLocale: "PT",
    });
    assert.equal(result.success, false);
  });
});
