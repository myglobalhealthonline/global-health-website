import { describe, expect, it } from "vitest";
import { exactLocalesForLegalType, type PublicCountryLegal } from "./get-country-legal";

/**
 * International-locale batch (2026-08-09). The public legal API falls back
 * exact-locale -> "en" -> any-published-row, so `getCountryLegalDocument`
 * 200s for every supported locale once ONE locale has a real row — verified
 * live: 46 of 297 country x locale x type combinations render the wrong
 * language as a result (e.g. /ireland/pt/legal/cookie-policy in English).
 * `exactLocalesForLegalType` is the single source of truth both sitemap.ts
 * (which locale variants to submit) and legal/[type]/page.tsx (noindex vs
 * indexable, hreflang cluster) key off — these tests lock its three input
 * shapes: a real per-type document row, a MEDICAL_DISCLAIMER per-locale
 * translation row, and MEDICAL_DISCLAIMER's un-localized base column.
 */
function legal(overrides: Partial<PublicCountryLegal>): PublicCountryLegal {
  return {
    country: { code: "xx", name: "Test" },
    profile: null,
    documents: [],
    ...overrides,
  };
}

describe("exactLocalesForLegalType", () => {
  it("returns only the locales with a real document row for that exact type", () => {
    const data = legal({
      documents: [
        { type: "COOKIE_POLICY", title: "t", locale: "EN", version: 1, publishedAt: null, updatedAt: "now", hasPdf: false },
        { type: "COOKIE_POLICY", title: "t", locale: "PT", version: 1, publishedAt: null, updatedAt: "now", hasPdf: false },
        { type: "TERMS_OF_SERVICE", title: "t", locale: "ES", version: 1, publishedAt: null, updatedAt: "now", hasPdf: false },
      ],
    });
    expect(exactLocalesForLegalType(data, "COOKIE_POLICY", "en")).toEqual(new Set(["en", "pt"]));
    expect(exactLocalesForLegalType(data, "TERMS_OF_SERVICE", "en")).toEqual(new Set(["es"]));
  });

  it("a type with zero rows anywhere resolves to an empty set (never falsely eligible)", () => {
    const data = legal({ documents: [] });
    expect(exactLocalesForLegalType(data, "GDPR_NOTICE", "en")).toEqual(new Set());
  });

  it("MEDICAL_DISCLAIMER counts a profile.disclaimerTranslations row with real content", () => {
    const data = legal({
      profile: {
        legalCompanyName: null, legalAddress: null, publicPhones: [], publicEmails: [],
        supportEmail: null, companyRegistrationNumber: null, taxVatNumber: null,
        medicalRegistrationNumber: null, healthcareLicenseDetails: null, regulatorName: null,
        regulatorWebsite: null, providerRegistrationLabel: null, providerRegistrationNumber: null,
        providerRegistrationUrl: null, emergencyNumber: null, emergencyNotice: null,
        nonEmergencyHealthLine: null, companyRegistryUrl: null, medicalRegulatorUrl: null,
        healthcareAuthorityUrl: null, dataProtectionAuthorityUrl: null, disputeResolutionUrl: null,
        consumerProtectionUrl: null, dataProtectionLawName: null, dataProtectionPolicyTitle: null,
        dpoName: null, dpoEmail: null, disputeBodyName: null, disputeEmail: null, disputePhone: null,
        disputeProcessText: null, legalJurisdictionText: null, consumerRightsText: null,
        shortDisclaimer: null, fullDisclaimer: null,
        disclaimerTranslations: [
          { locale: "PT", shortDisclaimer: null, fullDisclaimer: "Texto real em português." },
          { locale: "ES", shortDisclaimer: null, fullDisclaimer: null },
        ],
      },
    });
    const exact = exactLocalesForLegalType(data, "MEDICAL_DISCLAIMER", "en");
    expect(exact.has("pt")).toBe(true);
    expect(exact.has("es")).toBe(false);
  });

  it("MEDICAL_DISCLAIMER's un-localized base fullDisclaimer counts as the country's default locale only", () => {
    const data = legal({
      profile: {
        legalCompanyName: null, legalAddress: null, publicPhones: [], publicEmails: [],
        supportEmail: null, companyRegistrationNumber: null, taxVatNumber: null,
        medicalRegistrationNumber: null, healthcareLicenseDetails: null, regulatorName: null,
        regulatorWebsite: null, providerRegistrationLabel: null, providerRegistrationNumber: null,
        providerRegistrationUrl: null, emergencyNumber: null, emergencyNotice: null,
        nonEmergencyHealthLine: null, companyRegistryUrl: null, medicalRegulatorUrl: null,
        healthcareAuthorityUrl: null, dataProtectionAuthorityUrl: null, disputeResolutionUrl: null,
        consumerProtectionUrl: null, dataProtectionLawName: null, dataProtectionPolicyTitle: null,
        dpoName: null, dpoEmail: null, disputeBodyName: null, disputeEmail: null, disputePhone: null,
        disputeProcessText: null, legalJurisdictionText: null, consumerRightsText: null,
        shortDisclaimer: null, fullDisclaimer: "Base English disclaimer text.",
        disclaimerTranslations: [],
      },
    });
    const exact = exactLocalesForLegalType(data, "MEDICAL_DISCLAIMER", "en");
    expect(exact).toEqual(new Set(["en"]));
  });

  it("other types are unaffected by MEDICAL_DISCLAIMER-only profile data", () => {
    const data = legal({
      profile: {
        legalCompanyName: null, legalAddress: null, publicPhones: [], publicEmails: [],
        supportEmail: null, companyRegistrationNumber: null, taxVatNumber: null,
        medicalRegistrationNumber: null, healthcareLicenseDetails: null, regulatorName: null,
        regulatorWebsite: null, providerRegistrationLabel: null, providerRegistrationNumber: null,
        providerRegistrationUrl: null, emergencyNumber: null, emergencyNotice: null,
        nonEmergencyHealthLine: null, companyRegistryUrl: null, medicalRegulatorUrl: null,
        healthcareAuthorityUrl: null, dataProtectionAuthorityUrl: null, disputeResolutionUrl: null,
        consumerProtectionUrl: null, dataProtectionLawName: null, dataProtectionPolicyTitle: null,
        dpoName: null, dpoEmail: null, disputeBodyName: null, disputeEmail: null, disputePhone: null,
        disputeProcessText: null, legalJurisdictionText: null, consumerRightsText: null,
        shortDisclaimer: null, fullDisclaimer: "Base English disclaimer text.",
        disclaimerTranslations: [],
      },
    });
    expect(exactLocalesForLegalType(data, "PRIVACY_POLICY", "en")).toEqual(new Set());
  });

  it("null legal data resolves to an empty set rather than throwing", () => {
    expect(exactLocalesForLegalType(null, "COOKIE_POLICY", "en")).toEqual(new Set());
    expect(exactLocalesForLegalType(undefined, "MEDICAL_DISCLAIMER", "en")).toEqual(new Set());
  });
});
