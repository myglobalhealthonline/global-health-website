import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  EXPECTED_EXISTING_LOCALES,
  EXPECTED_MISSING_LOCALES,
  EXPECTED_PRIMARY_IDS,
  assertExpectedExistingLocaleMatrix,
  buildRemainingWeek2TranslationPlan,
  parseApplyFlag,
} from "./add-remaining-week2-blog-translations-2026-08.js";
import type { Locale } from "./content/blog-seo-2026-08/types.js";
import { COVER_ALTS } from "./data/blog-cover-alts-2026-08.js";

const SUPPORTED_LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] satisfies readonly Locale[];
const bodyFor = (slug: string) => `<main data-slug="${slug}">body for ${slug}</main>`;
const renderStub = (post: { slug: string }) => bodyFor(post.slug);

const FIXTURE_POST_SETS = [
  fixtureSet("pt-baixa-medica-valor", "PT"),
  fixtureSet("ie-illness-benefit-payment", "EN"),
  fixtureSet("cz-vypocet-nemocenske", "CS"),
  fixtureSet("pt-atestado-carta-conducao", "PT"),
  fixtureSet("es-tension-alta-urgencias", "ES"),
  fixtureSet("ro-scade-tensiunea-rapid", "RO"),
] as const;

const EXPECTED_EXISTING_PAIRS = [
  "cz-vypocet-nemocenske:DE",
  "cz-vypocet-nemocenske:EN",
  "es-tension-alta-urgencias:DE",
  "es-tension-alta-urgencias:EN",
  "ie-illness-benefit-payment:DE",
  "ie-illness-benefit-payment:ES",
  "ie-illness-benefit-payment:PT",
  "ie-illness-benefit-payment:RO",
  "pt-atestado-carta-conducao:DE",
  "pt-atestado-carta-conducao:EN",
  "pt-baixa-medica-valor:DE",
  "pt-baixa-medica-valor:EN",
  "ro-scade-tensiunea-rapid:EN",
] as const;

const EXPECTED_MISSING_PAIRS = [
  "cz-vypocet-nemocenske:ES",
  "cz-vypocet-nemocenske:PT",
  "cz-vypocet-nemocenske:RO",
  "es-tension-alta-urgencias:CS",
  "es-tension-alta-urgencias:PT",
  "es-tension-alta-urgencias:RO",
  "ie-illness-benefit-payment:CS",
  "pt-atestado-carta-conducao:CS",
  "pt-atestado-carta-conducao:ES",
  "pt-atestado-carta-conducao:RO",
  "pt-baixa-medica-valor:CS",
  "pt-baixa-medica-valor:ES",
  "pt-baixa-medica-valor:RO",
  "ro-scade-tensiunea-rapid:CS",
  "ro-scade-tensiunea-rapid:DE",
  "ro-scade-tensiunea-rapid:ES",
  "ro-scade-tensiunea-rapid:PT",
] as const;

test("remaining Week 2 locale contract contains the exact 13 existing and 17 missing pairs", () => {
  assert.deepEqual(pairsFromMap(EXPECTED_EXISTING_LOCALES), [...EXPECTED_EXISTING_PAIRS]);
  assert.deepEqual(pairsFromMap(EXPECTED_MISSING_LOCALES), [...EXPECTED_MISSING_PAIRS]);
});

test("remaining Week 2 plan contains exactly the 17 absent non-base translations", () => {
  const plan = buildRemainingWeek2TranslationPlan(
    FIXTURE_POST_SETS,
    EXPECTED_PRIMARY_IDS,
    undefined,
    COVER_ALTS,
    renderStub,
  );

  assert.equal(EXPECTED_PRIMARY_IDS.size, 6);
  assert.equal(plan.length, 17);
  assert.deepEqual(
    plan.map((row) => `${row.key}:${row.locale}`).sort(),
    [...EXPECTED_MISSING_PAIRS],
  );
  assert.equal(new Set(plan.map((row) => row.slug)).size, 17);
  assert.ok(plan.every((row) => row.locale !== row.postLocale));
  assert.ok(plan.every((row) => row.content.includes("<main")));
  assert.ok(plan.every((row) => row.seoTitle.length <= 60));
  assert.ok(plan.every((row) => row.seoDescription.length <= 155));
  assert.ok(plan.every((row) => row.excerpt.length > 0));
  assert.ok(plan.every((row) => row.coverImageAlt));
});

test("base, existing, and remaining locales produce all six supported locales per Week 2 post", () => {
  const plan = buildRemainingWeek2TranslationPlan(
    FIXTURE_POST_SETS,
    EXPECTED_PRIMARY_IDS,
    undefined,
    COVER_ALTS,
    renderStub,
  );

  for (const set of FIXTURE_POST_SETS) {
    const baseLocale = set.posts[0]!.locale;
    const existingLocales = EXPECTED_EXISTING_LOCALES.get(set.key) ?? [];
    const missingLocales = plan.filter((row) => row.key === set.key).map((row) => row.locale);
    const translationLocales = [...existingLocales, ...missingLocales];

    assert.equal(translationLocales.length, 5, `${set.key}: expected five non-base translations`);
    assert.deepEqual(
      [...new Set([baseLocale, ...translationLocales])].sort(),
      [...SUPPORTED_LOCALES].sort(),
      `${set.key}: final locale matrix is incomplete`,
    );
  }
});

test("live-locale preflight accepts only the exact 13-row existing matrix", () => {
  const expectedRows = rowsFromMap(EXPECTED_EXISTING_LOCALES);

  assert.doesNotThrow(() => assertExpectedExistingLocaleMatrix(expectedRows));
  assert.throws(
    () => assertExpectedExistingLocaleMatrix(expectedRows.slice(1)),
    /existing locale matrix|expected/i,
  );
  assert.throws(
    () =>
      assertExpectedExistingLocaleMatrix([
        ...expectedRows,
        { key: "pt-baixa-medica-valor", locale: "ES" },
      ]),
    /existing locale matrix|unexpected/i,
  );
  assert.throws(
    () => assertExpectedExistingLocaleMatrix([...expectedRows, expectedRows[0]!]),
    /existing locale matrix|duplicate/i,
  );
});

test("remaining Week 2 importer is dry-run by default and applies only with --apply", () => {
  assert.equal(parseApplyFlag([]), false);
  assert.equal(parseApplyFlag(["--verbose"]), false);
  assert.equal(parseApplyFlag(["--apply"]), true);
  assert.equal(parseApplyFlag(["--verbose", "--apply"]), true);
});

test("published-parent concurrency guard preserves live parent and existing translation snapshots", () => {
  const source = readFileSync("scripts/add-remaining-week2-blog-translations-2026-08.ts", "utf8");

  assert.match(source, /parent\.status !== "DRAFT" && parent\.status !== "PUBLISHED"/);
  assert.match(source, /assertSnapshotsPreserved\(beforeParents, parents\)/);
  assert.match(source, /const beforeParents = await createTranslations/);
  assert.doesNotMatch(source, /tx\.blogPost\.update/);
  assert.doesNotMatch(source, /tx\.blogTranslation\.update/);
});

function pairsFromMap(localesByKey: ReadonlyMap<string, readonly Locale[]>): string[] {
  return [...localesByKey.entries()]
    .flatMap(([key, locales]) => locales.map((locale) => `${key}:${locale}`))
    .sort();
}

function rowsFromMap(localesByKey: ReadonlyMap<string, readonly Locale[]>): Array<{ key: string; locale: Locale }> {
  return [...localesByKey.entries()].flatMap(([key, locales]) =>
    locales.map((locale) => ({ key, locale })),
  );
}

function fixtureSet(key: string, primaryLocale: Locale) {
  const orderedLocales = [primaryLocale, ...SUPPORTED_LOCALES.filter((locale) => locale !== primaryLocale)];
  return {
    key,
    countryCode: "xx",
    targetKeyword: `${key} keyword`,
    searchVolume: 100,
    keywordDifficulty: 1,
    evidence: `${key} evidence`,
    serviceSlug: `${key}-service`,
    authorDoctorId: `${key}-author`,
    authorDisplayName: "Global Health Medical Team",
    reviewerDoctorId: `${key}-reviewer`,
    reviewerDisplayName: `${key} reviewer`,
    posts: orderedLocales.map((locale) => fixturePost(locale, `${key}-${locale.toLowerCase()}`)),
  };
}

function fixturePost(locale: Locale, slug: string) {
  return {
    locale,
    slug,
    title: `${slug} title`,
    excerpt: `${slug} excerpt`,
    seoTitle: `${slug} seo title`.slice(0, 60),
    seoDescription: `${slug} seo description`.slice(0, 155),
    category: "General Practice",
    article: {} as never,
  };
}
