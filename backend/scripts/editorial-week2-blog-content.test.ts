import assert from "node:assert/strict";
import { test } from "node:test";
import { WEEK2_POST_SETS } from "./content/blog-week2-2026-08/index.js";
import { renderArticle, wordCount } from "./content/blog-seo-2026-08/template.js";

const expectedLocales = new Map([
  ["pt-baixa-medica-valor", ["CS", "DE", "EN", "ES", "PT", "RO"]],
  ["ie-illness-benefit-payment", ["CS", "DE", "EN", "ES", "PT", "RO"]],
  ["cz-vypocet-nemocenske", ["CS", "DE", "EN", "ES", "PT", "RO"]],
  ["es-tension-alta-urgencias", ["CS", "DE", "EN", "ES", "PT", "RO"]],
  ["ro-scade-tensiunea-rapid", ["CS", "DE", "EN", "ES", "PT", "RO"]],
  ["pt-atestado-carta-conducao", ["CS", "DE", "EN", "ES", "PT", "RO"]],
]);

test("Week 2 contains every planned topic and locale", () => {
  assert.equal(WEEK2_POST_SETS.length, 6);
  assert.equal(WEEK2_POST_SETS.flatMap((set) => set.posts).length, 36);

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

test("Week 2 drafts meet metadata, structure, linking and source gates", () => {
  for (const set of WEEK2_POST_SETS) {
    assert.ok(set.authorDoctorId, `${set.key} has no verified author ID`);
    assert.ok(set.reviewerDoctorId, `${set.key} has no verified reviewer ID`);

    for (const post of set.posts) {
      const html = renderArticle(post.article);
      const words = wordCount(html);

      assert.match(post.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(post.seoTitle.length <= 60, `${post.slug} SEO title is too long`);
      assert.ok(post.seoDescription.length <= 155, `${post.slug} meta description is too long`);
      assert.ok(words >= 900 && words <= 2_600, `${post.slug} has ${words} words`);
      assert.ok(post.article.sections.length >= 5, `${post.slug} has too few sections`);
      assert.equal((html.match(/<h1>/g) ?? []).length, 1, `${post.slug} must have one h1`);
      assert.equal(
        new Set(post.article.sections.map((section) => section.id)).size,
        post.article.sections.length,
        `${post.slug} section IDs must be unique`,
      );
      assert.ok(post.article.faqs.length >= 4 && post.article.faqs.length <= 6);
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
test("hypertension topics enforce medication, emergency and myth-correction safety", () => {
  for (const key of ["es-tension-alta-urgencias", "ro-scade-tensiunea-rapid"]) {
    const set = WEEK2_POST_SETS.find((candidate) => candidate.key === key)!;
    for (const post of set.posts) {
      const html = renderArticle(post.article);
      assert.match(html, /112/);
      assert.match(html, /emerg|urgen|alarm|alarma|Notfall/i);
      assert.match(html, /do not|nu lua|no tom|não tom|nicht einnehm|sin plan|fără.*plan|ohne.*Plan|neužívejte|neměňte/i);
    }
  }

  const romanian = WEEK2_POST_SETS.find((set) => set.key === "ro-scade-tensiunea-rapid")!;
  for (const post of romanian.posts) {
    const html = renderArticle(post.article);
    assert.match(html, /captopril/i);
    assert.doesNotMatch(html, /captopril\s+\d+\s*mg/i);
  }
});

test("Spain routes stable hypertension to GP care and selected cases to cardiology", () => {
  const set = WEEK2_POST_SETS.find((candidate) => candidate.key === "es-tension-alta-urgencias")!;
  for (const post of set.posts) {
    const html = renderArticle(post.article);
    assert.match(html, /\/services\/enfermedades-cronicas-online/);
    assert.match(html, /\/services\/cardiologo-online/);
  }
});

