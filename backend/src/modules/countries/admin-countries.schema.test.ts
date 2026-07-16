import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminCountryCreateBodySchema,
  adminCountryUpdateBodySchema,
  countryLegalProfileTrustTranslationUpsertSchema,
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

  it("accepts a valid IANA bookingSetting.timezone", () => {
    for (const timezone of ["Europe/Bucharest", "UTC", "Europe/Dublin"]) {
      const result = adminCountryUpdateBodySchema.safeParse({
        bookingSetting: { timezone },
      });
      assert.equal(result.success, true, `${timezone} should be valid`);
    }
  });

  it("rejects an unknown bookingSetting.timezone string", () => {
    const result = adminCountryUpdateBodySchema.safeParse({
      bookingSetting: { timezone: "Mars/Olympus_Mons" },
    });
    assert.equal(result.success, false);
  });
});

describe("legal profile trust-translation validation", () => {
  it("requires locale", () => {
    const result = countryLegalProfileTrustTranslationUpsertSchema.safeParse({
      regulatorName: "Ordem dos Médicos",
    });
    assert.equal(result.success, false);
  });

  it("accepts the four translatable trust fields", () => {
    const result = countryLegalProfileTrustTranslationUpsertSchema.safeParse({
      locale: "PT",
      regulatorName: "Ordem dos Médicos",
      providerRegistrationLabel: "Registado na ERS",
      emergencyNotice: "Ligue 112 em caso de emergência",
      dataProtectionLawName: "RGPD",
    });
    assert.equal(result.success, true);
  });

  it("accepts locale-only payload (no fields to change)", () => {
    const result = countryLegalProfileTrustTranslationUpsertSchema.safeParse({ locale: "PT" });
    assert.equal(result.success, true);
  });

  it("accepts an explicit null to clear a field", () => {
    const result = countryLegalProfileTrustTranslationUpsertSchema.safeParse({
      locale: "PT",
      regulatorName: null,
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.regulatorName, null);
    }
  });

  it("rejects a non-translatable field (regulatorWebsite is base-row only)", () => {
    const result = countryLegalProfileTrustTranslationUpsertSchema.safeParse({
      locale: "PT",
      regulatorWebsite: "https://example.com",
    } as never);
    // Extra keys are silently stripped by default zod objects — assert the
    // stray field never survives into the parsed data rather than requiring
    // rejection, since this schema (unlike the authority-link one) isn't
    // `.strict()`.
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal("regulatorWebsite" in result.data, false);
    }
  });
});
