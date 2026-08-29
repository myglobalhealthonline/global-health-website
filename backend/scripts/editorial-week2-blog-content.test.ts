import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  WEEK2_POST_SETS,
  WEEK2_PRIMARY_POST_SETS,
  WEEK2_RESEARCH_POST_SETS,
} from "./content/blog-week2-2026-08/index.js";
import { renderArticle, wordCount } from "./content/blog-seo-2026-08/template.js";

const expectedLocales = new Map([
  ["pt-baixa-medica-valor", ["DE", "EN", "PT"]],
  ["ie-illness-benefit-payment", ["DE", "EN", "ES", "PT", "RO"]],
  ["cz-vypocet-nemocenske", ["CS", "DE", "EN"]],
  ["es-tension-alta-urgencias", ["DE", "EN", "ES"]],
  ["ro-scade-tensiunea-rapid", ["EN", "RO"]],
  ["pt-atestado-carta-conducao", ["DE", "EN", "PT"]],
]);

const primaryWordRanges = new Map([
  ["pt-baixa-medica-valor", [600, 900]],
  ["ie-illness-benefit-payment", [600, 900]],
  ["cz-vypocet-nemocenske", [600, 900]],
  ["pt-atestado-carta-conducao", [600, 900]],
  ["es-tension-alta-urgencias", [700, 1_200]],
  ["ro-scade-tensiunea-rapid", [700, 1_200]],
] as const);

test("Week 2 production preparation is restricted to the approved 19-locale matrix", () => {
  assert.equal(WEEK2_POST_SETS.length, 6);
  assert.equal(WEEK2_POST_SETS.flatMap((set) => set.posts).length, 19);

  for (const set of WEEK2_POST_SETS) {
    assert.deepEqual(
      set.posts.map((post) => post.locale).sort(),
      expectedLocales.get(set.key),
      `${set.key} locale plan drifted`,
    );
  }

  const slugs = WEEK2_POST_SETS.flatMap((set) => set.posts.map((post) => post.slug));
  assert.equal(new Set(slugs).size, slugs.length, "Week 2 slugs must be unique");
});

test("Week 2 preserves all 36 research variants outside the approved production manifest", () => {
  assert.equal(WEEK2_RESEARCH_POST_SETS.length, 6);
  assert.equal(WEEK2_RESEARCH_POST_SETS.flatMap((set) => set.posts).length, 36);
});

test("Week 2 primary cohort contains the six native-market drafts in rollout order", () => {
  assert.deepEqual(
    WEEK2_PRIMARY_POST_SETS.map((set) => [set.key, set.posts[0]?.locale]),
    [
      ["pt-baixa-medica-valor", "PT"],
      ["ie-illness-benefit-payment", "EN"],
      ["cz-vypocet-nemocenske", "CS"],
      ["pt-atestado-carta-conducao", "PT"],
      ["es-tension-alta-urgencias", "ES"],
      ["ro-scade-tensiunea-rapid", "RO"],
    ],
  );
});

test("all 36 Week 2 locale variants meet metadata, structure, linking and source gates", () => {
  for (const set of WEEK2_RESEARCH_POST_SETS) {
    assert.equal(set.authorDisplayName, "Global Health Medical Team", `${set.key} author display name drifted`);
    assert.ok(set.reviewerDoctorId, `${set.key} has no verified reviewer ID`);

    for (const post of set.posts) {
      const html = renderArticle(post.article);
      const words = wordCount(html);

      assert.match(post.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(post.seoTitle.length <= 60, `${post.slug} SEO title is too long`);
      assert.ok(post.seoDescription.length <= 155, `${post.slug} meta description is too long`);
      assert.ok(post.article.sections.length >= 5, `${post.slug} has too few sections`);
      assert.equal((html.match(/<h1>/g) ?? []).length, 1, `${post.slug} must have one h1`);
      assert.equal(
        new Set(post.article.sections.map((section) => section.id)).size,
        post.article.sections.length,
        `${post.slug} section IDs must be unique`,
      );
      assert.ok(post.article.faqs.length >= 2 && post.article.faqs.length <= 6);
      assert.match(html, /\/doctors/);
      assert.match(html, /\/contact/);
      assert.ok((html.match(/href="https:\/\/www\.myglobalhealth\.online\//g) ?? []).length >= 3);
      assert.ok((html.match(/rel="nofollow noopener"/g) ?? []).length >= 2);
      assert.doesNotMatch(html, /\/blog\/categories\//);
      assert.doesNotMatch(html, /\/health\//);
      assert.doesNotMatch(html, /\bTODO:|\bplaceholder\b|\bcoming soon\b/i);
    }
  }
});

test("Week 2 primary-language drafts meet the compact editorial standard", () => {
  for (const set of WEEK2_PRIMARY_POST_SETS) {
    const post = set.posts[0]!;
    const words = wordCount(renderArticle(post.article));
    const [minimum, maximum] = primaryWordRanges.get(set.key)!;

    assert.ok(words >= minimum && words <= maximum, `${post.slug} has ${words} words, expected ${minimum}-${maximum}`);
    assert.ok(post.article.faqs.length >= 2 && post.article.faqs.length <= 4, `${post.slug} should have 2-4 useful FAQs`);
  }
});
test("hypertension topics enforce medication, emergency and myth-correction safety", () => {
  for (const key of ["es-tension-alta-urgencias", "ro-scade-tensiunea-rapid"]) {
    const set = WEEK2_RESEARCH_POST_SETS.find((candidate) => candidate.key === key)!;
    for (const post of set.posts) {
      const html = renderArticle(post.article);
      assert.match(html, /112/);
      assert.match(html, /emerg|urgen|alarm|alarma|Notfall/i);
      assert.match(html, /do not|nu lua|no tom|não tom|nicht einnehm|sin plan|fără.*plan|ohne.*Plan|neužívejte|neměňte/i);
    }
  }

  const romanian = WEEK2_RESEARCH_POST_SETS.find((set) => set.key === "ro-scade-tensiunea-rapid")!;
  for (const post of romanian.posts) {
    const html = renderArticle(post.article);
    assert.match(html, /captopril/i);
    assert.doesNotMatch(html, /captopril\s+\d+\s*mg/i);
  }
});

test("Spain routes stable hypertension to GP care and selected cases to cardiology", () => {
  const set = WEEK2_RESEARCH_POST_SETS.find((candidate) => candidate.key === "es-tension-alta-urgencias")!;
  for (const post of set.posts) {
    const html = renderArticle(post.article);
    assert.match(html, /\/services\/enfermedades-cronicas-online/);
    assert.match(html, /\/services\/cardiologo-online/);
  }
});

test("Czech translated calculation guides link to the existing localized eNeschopenka articles", () => {
  const set = WEEK2_POST_SETS.find((candidate) => candidate.key === "cz-vypocet-nemocenske")!;
  const english = renderArticle(set.posts.find((post) => post.locale === "EN")!.article);
  const german = renderArticle(set.posts.find((post) => post.locale === "DE")!.article);

  assert.match(english, /\/czechia\/en\/blog\/neschopenka-czech-sick-note-explained/);
  assert.doesNotMatch(english, /sick-note-how-eneschopenka-works/);
  assert.match(german, /\/czechia\/de\/blog\/neschopenka-krankschreibung-in-tschechien/);
  assert.doesNotMatch(german, /krankschreibung-so-funktioniert-eneschopenka/);
});

test("Week 2 updater is dry-run by default and refuses unsafe records", () => {
  const updater = readFileSync(new URL("./update-week2-blog-drafts-2026-08.ts", import.meta.url), "utf8");
  assert.match(updater, /const APPLY = process\.argv\.includes\("--apply"\)/);
  assert.match(updater, /existing\.status !== "DRAFT"/);
  assert.match(updater, /existing\.publishedAt \|\| existing\.lastReviewedAt/);
  assert.match(updater, /existing\.translations\.length !== 0/);
  assert.match(updater, /currentChecklist\.seedHash !== currentHash/);
  assert.match(updater, /VERIFIED: six DRAFT records updated; zero translations; nothing published/);
});

