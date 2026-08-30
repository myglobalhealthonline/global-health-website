import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ES_TENSION_ARTERIAL_NORMAL } from "./content/blog-week1-2026-08/es-tension-arterial-normal.js";
import { RO_TENSIUNE_ARTERIALA_NORMALA } from "./content/blog-week1-2026-08/ro-tensiune-arteriala-normala.js";
import { PT_AUTODECLARACAO } from "./content/blog-seo-2026-08/pt-autodeclaracao.js";
import { IE_ILLNESS_BENEFIT } from "./content/blog-seo-2026-08/ie-illness-benefit.js";
import { renderArticle, wordCount } from "./content/blog-seo-2026-08/template.js";
import {
  ENGLISH_REPLACEMENTS,
  replaceExactly,
} from "./update-published-ie-illness-benefit-2026-08.js";

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

test("Ireland Illness Benefit guidance covers both electronic and paper certificates", () => {
  const expectedRoutes = {
    EN: [/electronically/i, /post the paper certificate/i],
    PT: [/eletronicamente/i, /certificado em papel/i],
    ES: [/electrónicamente/i, /certificado en papel/i],
    CS: [/elektronicky/i, /papírové potvrzení/i],
    RO: [/electronic/i, /certificat pe hârtie/i],
    DE: [/elektronisch/i, /Papierbescheinigung/i],
  } as const;

  for (const post of IE_ILLNESS_BENEFIT.posts) {
    const html = renderArticle(post.article);
    for (const pattern of expectedRoutes[post.locale]) assert.match(html, pattern);
  }
});

test("Ireland correction is exact and idempotent", () => {
  const legacy = ENGLISH_REPLACEMENTS.map(([before]) => before).join(" | ");
  const corrected = replaceExactly(legacy, ENGLISH_REPLACEMENTS, "EN");

  assert.match(corrected, /Irish Medical Council\. The doctor/);
  assert.match(corrected, /post the paper certificate/i);
  assert.match(corrected, /D01 WY03/);
  assert.doesNotMatch(corrected, /not something you post yourself/i);
  assert.equal(replaceExactly(corrected, ENGLISH_REPLACEMENTS, "EN"), corrected);
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

test("published Ireland updater is surgical, dry-run and concurrency guarded", () => {
  const updater = readFileSync(
    new URL("./update-published-ie-illness-benefit-2026-08.ts", import.meta.url),
    "utf8",
  );
  assert.match(updater, /const APPLY = process\.argv\.includes\("--apply"\)/);
  assert.match(updater, /illness-benefit-ireland-how-to-claim/);
  assert.match(updater, /replaceExactly/);
  assert.match(updater, /EXPECTED_RECORD_ID/);
  assert.match(updater, /updatedAt: existing\.updatedAt/);
  assert.match(updater, /isolationLevel: "Serializable"/);
  assert.match(updater, /fingerprint\(locked\) !== preparedFingerprint/);
  assert.match(updater, /VERIFIED: Illness Benefit submission guidance corrected; publication state preserved/);
});
