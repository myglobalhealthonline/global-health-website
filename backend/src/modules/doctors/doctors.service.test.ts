import assert from "node:assert/strict";
import test from "node:test";
import { LocaleCode } from "@prisma/client";
import { mergeDoctorMarketTranslation, mergeDoctorTranslation } from "./doctors.service.js";

const EN = LocaleCode.EN;
const PT = LocaleCode.PT;

function baseDoctor() {
  return {
    title: "Base title",
    bio: "Base bio",
    seoTitle: "Base seo title",
    seoDescription: "Base seo description",
    translations: [] as Array<{
      locale: LocaleCode;
      title: string;
      bio: string | null;
      seoTitle: string | null;
      seoDescription: string | null;
    }>,
  };
}

test("mergeDoctorTranslation: requested-locale row wins over base columns", () => {
  const doctor = {
    ...baseDoctor(),
    translations: [{ locale: EN, title: "EN title", bio: "EN bio", seoTitle: "EN seo", seoDescription: "EN seo desc" }],
  };
  const merged = mergeDoctorTranslation(doctor, EN, PT);
  assert.equal(merged.resolvedLocale, EN);
  assert.equal(merged.title, "EN title");
});

test("market masking: doctor has requested-locale DoctorTranslation + market row ONLY in default locale -> market ignored, requested-locale doctor fields kept", () => {
  const doctor = {
    ...baseDoctor(),
    translations: [{ locale: EN, title: "EN title", bio: "EN bio", seoTitle: "EN seo", seoDescription: "EN seo desc" }],
  };
  // Market default locale is PT; requested is EN. Doctor-level resolves to EN.
  const merged = mergeDoctorTranslation(doctor, EN, PT);
  const marketRows = [
    { locale: PT, title: "PT market title", bio: "PT market bio", seoTitle: "PT market seo", seoDescription: "PT market seo desc", seoKeywords: ["pt", "keyword"] },
  ];
  const result = mergeDoctorMarketTranslation(merged, marketRows, EN, PT);

  // Market row resolves to PT (default fallback) while doctor resolved to EN
  // -> locales differ -> market must be ignored entirely.
  assert.equal(result.title, "EN title");
  assert.equal(result.bio, "EN bio");
  assert.equal(result.seoTitle, "EN seo");
  assert.equal(result.seoDescription, "EN seo desc");
  assert.deepEqual(result.seoKeywords, []);
  assert.equal(result.resolvedMarketLocale, EN);
});

test("market applies: market row exists in the requested locale -> overrides doctor fields", () => {
  const doctor = {
    ...baseDoctor(),
    translations: [{ locale: EN, title: "EN title", bio: "EN bio", seoTitle: "EN seo", seoDescription: "EN seo desc" }],
  };
  const merged = mergeDoctorTranslation(doctor, EN, PT);
  const marketRows = [
    { locale: EN, title: "EN market title", bio: "EN market bio", seoTitle: "EN market seo", seoDescription: "EN market seo desc", seoKeywords: ["en", "keyword"] },
  ];
  const result = mergeDoctorMarketTranslation(merged, marketRows, EN, PT);

  assert.equal(result.title, "EN market title");
  assert.equal(result.bio, "EN market bio");
  assert.deepEqual(result.seoKeywords, ["en", "keyword"]);
  assert.equal(result.resolvedMarketLocale, EN);
});

test("market applies: doctor has no translation rows at all + market default-locale row -> market row still applies (base columns are the default-locale copy)", () => {
  const doctor = baseDoctor(); // no translations at all
  const merged = mergeDoctorTranslation(doctor, EN, PT); // resolvedLocale falls back to PT (default)
  assert.equal(merged.resolvedLocale, PT);

  const marketRows = [
    { locale: PT, title: "PT market title", bio: "PT market bio", seoTitle: "PT market seo", seoDescription: "PT market seo desc", seoKeywords: ["pt"] },
  ];
  const result = mergeDoctorMarketTranslation(merged, marketRows, EN, PT);

  // Market resolves to PT (default), doctor also resolved to PT -> locales match -> applies.
  assert.equal(result.title, "PT market title");
  assert.deepEqual(result.seoKeywords, ["pt"]);
  assert.equal(result.resolvedMarketLocale, PT);
});

test("market applies: no market rows at all -> doctor-merged fields pass through unchanged", () => {
  const doctor = {
    ...baseDoctor(),
    translations: [{ locale: EN, title: "EN title", bio: "EN bio", seoTitle: "EN seo", seoDescription: "EN seo desc" }],
  };
  const merged = mergeDoctorTranslation(doctor, EN, PT);
  const result = mergeDoctorMarketTranslation(merged, undefined, EN, PT);

  assert.equal(result.title, "EN title");
  assert.deepEqual(result.seoKeywords, []);
  assert.equal(result.resolvedMarketLocale, EN);
});
