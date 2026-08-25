import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ES_TENSION_ARTERIAL_NORMAL } from "./content/blog-week1-2026-08/es-tension-arterial-normal.js";
import { RO_TENSIUNE_ARTERIALA_NORMALA } from "./content/blog-week1-2026-08/ro-tensiune-arteriala-normala.js";
import { PT_AUTODECLARACAO } from "./content/blog-seo-2026-08/pt-autodeclaracao.js";
import { renderArticle, wordCount } from "./content/blog-seo-2026-08/template.js";

const cases = [
  {
    set: ES_TENSION_ARTERIAL_NORMAL,
    locales: ["ES"],
    servicePath: "/services/cardiologo-online",
    requiredSourceHosts: ["escardio.org", "seh-lelha.org"],
  },
  {
    set: RO_TENSIUNE_ARTERIALA_NORMALA,
    locales: ["RO"],
    servicePath: "/services/boli-cronice-online",
    requiredSourceHosts: ["escardio.org", "cardioportal.ro"],
  },
] as const;

test("Week 1 blood-pressure sets use only the planned migration-corridor locales", () => {
  for (const item of cases) {
    assert.deepEqual(item.set.posts.map((post) => post.locale), item.locales);
  }
});

test("Week 1 blood-pressure drafts meet CMS and clinical content gates", () => {
  for (const item of cases) {
    assert.ok(item.set.authorDoctorId);
    assert.ok(item.set.reviewerDoctorId);

    for (const post of item.set.posts) {
      const html = renderArticle(post.article);
      const words = wordCount(html);

      assert.match(post.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(post.seoTitle.length <= 60, `${post.slug} SEO title is too long`);
      assert.ok(post.seoDescription.length <= 155, `${post.slug} meta description is too long`);
      assert.ok(words >= 1_500 && words <= 2_500, `${post.slug} has ${words} words`);
      assert.ok(post.article.faqs.length >= 4 && post.article.faqs.length <= 6);
      assert.match(html, new RegExp(item.servicePath.replaceAll("/", "\\/")));
      assert.match(html, /\/doctors/);
      assert.match(html, /\/contact/);
      assert.match(html, /112/);
      assert.match(html, /single reading|una sola medici[oó]n|o singur[ăa] valoare|ein einzelner messwert/i);

      for (const host of item.requiredSourceHosts) {
        assert.match(html, new RegExp(host.replaceAll(".", "\\.")));
      }
    }
  }
});

test("Spain hypertension guidance links routine GP management and specialist escalation", () => {
  const post = ES_TENSION_ARTERIAL_NORMAL.posts[0];
  const html = renderArticle(post.article);

  assert.match(html, /\/services\/enfermedades-cronicas-online/);
  assert.match(html, /atenci[oó]n primaria|m[eé]dico de familia|consulta de enfermedades cr[oó]nicas/i);
  assert.match(html, /\/services\/cardiologo-online/);
});

test("Portugal explains CIT versus sick leave and when to use each document", () => {
  const post = PT_AUTODECLARACAO.posts.find((item) => item.locale === "PT");
  assert.ok(post);
  const html = renderArticle(post.article);

  assert.match(html, /CIT e (?:a )?baixa m[eé]dica n[aã]o s[aã]o dois documentos diferentes/i);
  assert.match(html, /autodeclara[cç][aã]o.*aus[eê]ncia curta/is);
  assert.match(html, /pedir.*CIT|CIT.*pedir/is);
});

test("Romania links routine GP hypertension management to chronic care", () => {
  const post = RO_TENSIUNE_ARTERIALA_NORMALA.posts[0];
  const html = renderArticle(post.article);

  assert.match(html, /medicul de familie poate coordona/i);
  assert.match(html, /\/services\/boli-cronice-online/);
});

test("published Spain updater is exact-record, dry-run and state preserving", () => {
  const updater = readFileSync(
    new URL("./update-published-es-blood-pressure-2026-08.ts", import.meta.url),
    "utf8",
  );
  assert.match(updater, /const APPLY = process\.argv\.includes\("--apply"\)/);
  assert.match(updater, /cmt5txqqn0000s8ju2rz5zg1u/);
  assert.match(updater, /EXPECTED_CURRENT_HASH/);
  assert.match(updater, /existing\.status !== "PUBLISHED"/);
  assert.match(updater, /existing\.translations\.length !== 5/);
  assert.match(updater, /publishedAt: existing\.publishedAt/);
  assert.match(updater, /lastReviewedAt: existing\.lastReviewedAt/);
  assert.match(updater, /VERIFIED: published Spanish article corrected; state and translations preserved/);
});
