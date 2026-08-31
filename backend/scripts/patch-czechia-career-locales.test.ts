import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CZECHIA_CAREER_LOCALIZATIONS } from "./data/czechia-career-locales.js";
import {
  CONFIRMATION,
  assertApplyArguments,
  assertSafeLocalizations,
  validateCareerPatchState,
} from "./patch-czechia-career-locales.js";

const EXPECTED_LOCALES = ["CS", "DE", "EN", "ES", "PT", "RO"];

describe("Czechia careers localization patch", () => {
  it("provides complete semantic content for every enabled locale", () => {
    assert.deepEqual(Object.keys(CZECHIA_CAREER_LOCALIZATIONS).sort(), EXPECTED_LOCALES);

    for (const [locale, content] of Object.entries(CZECHIA_CAREER_LOCALIZATIONS)) {
      assert.ok(content.title.length >= 20, `${locale} title`);
      assert.ok(content.department.length >= 5, `${locale} department`);
      assert.ok(content.location.length >= 5, `${locale} location`);
      assert.ok(content.employmentType.length >= 10, `${locale} employment type`);
      assert.ok(content.minimumExperience.length >= 8, `${locale} experience`);
      assert.equal((content.descriptionHtml.match(/<h2>/g) ?? []).length, 5, `${locale} headings`);
      assert.equal((content.descriptionHtml.match(/<ul>/g) ?? []).length, 3, `${locale} lists`);
      assert.match(content.descriptionHtml, /<strong>Medicine Anytime, Anywhere\.<\/strong>/);
      assert.doesNotMatch(content.descriptionHtml, /<div>|•/);
    }
  });

  it("requires both the explicit token and the exact database host before applying", () => {
    const databaseUrl = "postgresql://user:password@production.example.com:5432/global_health";

    assert.doesNotThrow(() => assertApplyArguments(false, [], databaseUrl));
    assert.throws(
      () => assertApplyArguments(true, ["--confirm=wrong", "--confirm-host=production.example.com"], databaseUrl),
      /confirmation token/,
    );
    assert.throws(
      () => assertApplyArguments(true, [`--confirm=${CONFIRMATION}`, "--confirm-host=staging.example.com"], databaseUrl),
      /host confirmation/,
    );
    assert.doesNotThrow(() => assertApplyArguments(
      true,
      [`--confirm=${CONFIRMATION}`, "--confirm-host=production.example.com"],
      databaseUrl,
    ));
  });

  it("stores only HTML that already satisfies the shared careers sanitizer", () => {
    assert.doesNotThrow(assertSafeLocalizations);
  });

  it("rejects localized rows whose publication settings differ from the source", () => {
    const publishedAt = new Date("2026-08-31T15:00:00.000Z");
    const common = {
      countryId: "czechia",
      slug: "prakticky-lekar-cesko",
      workplaceMode: "REMOTE" as const,
      publishedAt,
      closesAt: null,
      createdByUserId: null,
      updatedByUserId: null,
      updatedAt: new Date(),
    };
    const source = {
      ...common,
      id: "cmtheyvc6002701qmkiaq84tb",
      locale: "CS" as const,
      status: "PUBLISHED" as const,
      ...CZECHIA_CAREER_LOCALIZATIONS.CS,
    };
    const unpublishedTranslation = {
      ...common,
      id: "english-translation",
      locale: "EN" as const,
      status: "DRAFT" as const,
      ...CZECHIA_CAREER_LOCALIZATIONS.EN,
    };

    assert.throws(() => validateCareerPatchState({
      id: "czechia",
      code: "cz",
      isActive: true,
      defaultLocale: "CS",
      countryLocales: EXPECTED_LOCALES.map((locale) => ({ locale })) as Array<{ locale: "CS" | "DE" | "EN" | "ES" | "PT" | "RO" }>,
    }, [source, unpublishedTranslation]), /shared settings/);
  });
});
