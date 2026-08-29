import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  EXPECTED_PRIMARY_IDS,
  buildManifest,
  buildWeek2TranslationPlan,
  inspectParentSnapshot,
} from "./add-week2-blog-translations-2026-08.js";
import { COVER_ALTS } from "./data/blog-cover-alts-2026-08.js";

const bodyFor = (slug: string) => `<main data-slug="${slug}">body for ${slug}</main>`;
const renderStub = (post: { slug: string }) => bodyFor(post.slug);
const FIXTURE_POST_SETS = [
  fixtureSet("pt-baixa-medica-valor", "PT", "pt-primary", [
    ["EN", "pt-english"],
    ["DE", "pt-german"],
  ]),
  fixtureSet("ie-illness-benefit-payment", "EN", "ie-primary", [
    ["RO", "ie-romanian"],
    ["ES", "ie-spanish"],
    ["PT", "ie-portuguese"],
    ["DE", "ie-german"],
  ]),
  fixtureSet("cz-vypocet-nemocenske", "CS", "cz-primary", [
    ["EN", "cz-english"],
    ["DE", "cz-german"],
  ]),
  fixtureSet("pt-atestado-carta-conducao", "PT", "pt-drive-primary", [
    ["EN", "pt-drive-english"],
    ["DE", "pt-drive-german"],
  ]),
  fixtureSet("es-tension-alta-urgencias", "ES", "es-primary", [
    ["EN", "es-english"],
    ["DE", "es-german"],
  ]),
  fixtureSet("ro-scade-tensiunea-rapid", "RO", "ro-primary", [["EN", "ro-english"]]),
] as const;

test("Week 2 translation plan contains exactly the 13 approved non-primary locales", () => {
  const plan = buildWeek2TranslationPlan(FIXTURE_POST_SETS, EXPECTED_PRIMARY_IDS, undefined, COVER_ALTS, renderStub);

  assert.equal(EXPECTED_PRIMARY_IDS.size, 6);
  assert.equal(plan.length, 13);
  assert.deepEqual(
    plan.map((row) => `${row.key}:${row.locale}`).sort(),
    [
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
    ],
  );
  assert.equal(new Set(plan.map((row) => row.slug)).size, 13);
  assert.ok(plan.every((row) => row.locale !== row.postLocale));
  assert.ok(plan.every((row) => row.content.includes("<main")));
  assert.ok(plan.every((row) => row.seoTitle.length <= 60));
  assert.ok(plan.every((row) => row.seoDescription.length <= 155));
  assert.ok(plan.every((row) => row.excerpt.length > 0));
});

test("Week 2 manifest includes localized cover alts when the reviewed copy is available", () => {
  const manifest = buildManifest(
    buildWeek2TranslationPlan(FIXTURE_POST_SETS, EXPECTED_PRIMARY_IDS, undefined, COVER_ALTS, renderStub),
  );
  assert.equal(manifest.length, 13);
  assert.ok(manifest.every((row) => row.hasCoverImageAlt));
  assert.equal(
    buildWeek2TranslationPlan(FIXTURE_POST_SETS, EXPECTED_PRIMARY_IDS, undefined, COVER_ALTS, renderStub).find(
      (row) => row.key === "ie-illness-benefit-payment" && row.locale === "RO",
    )?.coverImageAlt,
    COVER_ALTS["illness-benefit-ireland-payment-calendar-planning"]?.RO,
  );
});

test("Week 2 translation bodies use the production blog HTML sanitizer", () => {
  const unsafeRenderer = (post: { slug: string }) =>
    `<main><p onclick="alert(1)">${post.slug}</p><script>alert(2)</script></main>`;
  const plan = buildWeek2TranslationPlan(
    FIXTURE_POST_SETS,
    EXPECTED_PRIMARY_IDS,
    undefined,
    COVER_ALTS,
    unsafeRenderer,
  );

  assert.equal(plan.length, 13);
  assert.ok(plan.every((row) => row.content.includes("<main>")));
  assert.ok(plan.every((row) => !row.content.includes("<script")));
  assert.ok(plan.every((row) => !row.content.includes("onclick=")));
});

test("Week 2 parent preflight fails closed on status, dates, activity, body drift, existing translations, and manual edits", () => {
  const set = FIXTURE_POST_SETS.find((row) => row.key === "ie-illness-benefit-payment");
  assert.ok(set);
  const primary = set.posts[0]!;
  const base = {
    id: EXPECTED_PRIMARY_IDS.get(set.key)!,
    key: set.key,
    slug: primary.slug,
    locale: primary.locale,
    title: primary.title,
    excerpt: primary.excerpt,
    body: renderStub(primary),
    seoTitle: primary.seoTitle,
    seoDescription: primary.seoDescription,
    status: "DRAFT",
    isActive: true,
    publishedAt: null,
    lastReviewedAt: null,
    editorialChecklist: {
      seededBy: "seed-week2-blog-drafts-2026-08",
      seedHash: "",
    },
    translations: [] as Array<{ id: string; locale: string; slug: string }>,
  };
  base.editorialChecklist.seedHash = createBodyHash(base.body);

  assert.deepEqual(inspectParentSnapshot(base, set, renderStub), []);
  assert.match(inspectParentSnapshot({ ...base, status: "PUBLISHED" }, set, renderStub).join("\n"), /not DRAFT/);
  assert.match(
    inspectParentSnapshot({ ...base, publishedAt: new Date("2026-08-29T00:00:00.000Z") }, set, renderStub).join("\n"),
    /publishedAt/,
  );
  assert.match(
    inspectParentSnapshot({ ...base, lastReviewedAt: new Date("2026-08-29T00:00:00.000Z") }, set, renderStub).join("\n"),
    /lastReviewedAt/,
  );
  assert.match(inspectParentSnapshot({ ...base, isActive: false }, set, renderStub).join("\n"), /inactive/);
  assert.match(
    inspectParentSnapshot({ ...base, body: `${base.body}\n<p>edited</p>` }, set, renderStub).join("\n"),
    /body changed after seeding|approved Week 2 source/,
  );
  assert.match(
    inspectParentSnapshot({
      ...base,
      translations: [{ id: "tr-1", locale: "RO", slug: "existing-translation" }],
    }, set, renderStub).join("\n"),
    /translation rows already exist/,
  );
  assert.match(
    inspectParentSnapshot({ ...base, title: `${base.title} edited` }, set, renderStub).join("\n"),
    /title changed after seeding/,
  );
});

test("Week 2 script stays dry-run by default and creates translations only inside one transaction", () => {
  const source = readFileSync("scripts/add-week2-blog-translations-2026-08.ts", "utf8");

  assert.match(source, /const apply = argv\.includes\("--apply"\)/);
  assert.match(source, /if \(!apply\) return;/);
  assert.match(source, /await prisma\.\$transaction\(async \(tx\) =>/);
  assert.match(source, /\{ timeout: 30_000 \}/);
  assert.match(source, /SELECT "id" FROM "BlogPost"/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /lockedParents\.length !== parentIds\.length/);
  assert.match(source, /const parents = await loadParents\(postSets, tx\)/);
  assert.match(source, /await assertNoSlugCollisions\(plan, tx\)/);
  assert.match(source, /tx\.blogTranslation\.create/);
  assert.doesNotMatch(source, /tx\.blogPost\.update/);
  assert.match(source, /parent\.translations\.length !== 0/);
  assert.match(source, /base record is not DRAFT/);
  assert.match(source, /base record is inactive/);
  assert.match(source, /base record already has publishedAt/);
  assert.match(source, /base record already has lastReviewedAt/);
  assert.match(source, /body changed after seeding/);
  assert.match(source, /VERIFIED: 13 BlogTranslation rows created; six DRAFT parents unchanged; zero unapproved locales/);
});

function createBodyHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fixtureSet(
  key: string,
  primaryLocale: "EN" | "PT" | "ES" | "CS" | "RO" | "DE",
  primarySlug: string,
  translations: ReadonlyArray<readonly ["EN" | "PT" | "ES" | "CS" | "RO" | "DE", string]>,
) {
  return {
    key,
    countryCode: "xx",
    targetKeyword: `${key} keyword`,
    searchVolume: 100,
    keywordDifficulty: 1,
    evidence: `${key} evidence`,
    serviceSlug: `${key}-service`,
    authorDoctorId: `${key}-author`,
    authorDisplayName: `${key} author`,
    reviewerDoctorId: `${key}-reviewer`,
    reviewerDisplayName: `${key} reviewer`,
    posts: [
      fixturePost(primaryLocale, primarySlug),
      ...translations.map(([locale, slug]) => fixturePost(locale, slug)),
    ],
  };
}

function fixturePost(locale: "EN" | "PT" | "ES" | "CS" | "RO" | "DE", slug: string) {
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
