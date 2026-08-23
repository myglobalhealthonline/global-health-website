import assert from "node:assert/strict";
import test from "node:test";

import {
  SICK_CERT_BLOG_COPY,
  assertClinicalReviewGate,
  buildSickCertBlogBody,
  parseIsoReviewDate,
  sickCertApprovalSha256,
  validateSickCertBlogBody,
} from "./ie-sick-cert-blog-content.js";

const EXISTING_DESIGN = `<style>@scope (.gh-article-body) {
  .gh-blog {} .article-intro {} .hero-panel {} .article-nav {}
  .article-section {} .section-ivory {} .section-forest {}
  .check-list {} .alert-warn {} .faq-section {} .disclaimer {}
}</style>`;

const visibleWords = (html: string) =>
  html
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

test("reuses the established designed blog system", () => {
  const body = buildSickCertBlogBody(`${EXISTING_DESIGN}<main>Old article</main>`);

  assert.ok(body.startsWith(EXISTING_DESIGN));
  assert.match(body, /<main class="gh-blog" lang="en-IE">/);
  assert.match(body, /class="article-intro article-lede"/);
  assert.match(body, /class="article-nav"/);
  assert.match(body, /class="article-section section-ivory"/);
  assert.match(body, /class="article-section section-forest"/);
  assert.doesNotMatch(body, /Old article|gh-blog-compact/);
  assert.doesNotMatch(body, /<h1[\s>]/i);
});

test("answers the search intent and keeps verified guidance", () => {
  const body = buildSickCertBlogBody(`${EXISTING_DESIGN}<main>Old article</main>`);

  assert.match(body, /medical assessment, not buying a document/i);
  assert.match(body, /\/ireland\/en\/services\/sick-certificate-ireland/);
  assert.match(body, /\/ireland\/en\/blog\/illness-benefit-ireland-how-to-claim/);
  assert.match(body, /workplacerelations\.ie/);
  assert.match(body, /gov\.ie\/en\/service\/ddf6e3-illness-benefit/);
  assert.match(body, /do not appear to distinguish between an in-person and remote consultation/i);
});

test("keeps the designed article focused", () => {
  const body = buildSickCertBlogBody(`${EXISTING_DESIGN}<main>Old article</main>`);
  const wordCount = visibleWords(body).length;

  assert.ok(wordCount >= 1_000 && wordCount <= 1_300, `Expected 1000-1300 words, got ${wordCount}`);
  assert.equal((body.match(/<h2\b/gi) ?? []).length, 5);
  assert.equal((body.match(/<details\b/gi) ?? []).length, 4);
  assert.equal((body.match(/class="article-section section-(?:ivory|forest)"/g) ?? []).length, 6);
  assert.equal((body.match(/href="\/ireland\/en\/services\/sick-certificate-ireland"/g) ?? []).length, 1);
});

test("rejects stale prices and absolute acceptance claims", () => {
  const body = buildSickCertBlogBody(`${EXISTING_DESIGN}<main>Old article</main>`);

  assert.deepEqual(validateSickCertBlogBody(body), []);
  assert.doesNotMatch(body, /€39|same legal standing|employers? (?:must|will) accept|[—–]/i);
});

test("fails closed when the existing article design is unavailable", () => {
  assert.throws(() => buildSickCertBlogBody("<main>Unstyled article</main>"), /designed <style> block/i);
  assert.throws(
    () => buildSickCertBlogBody('<style>.gh-blog {}</style><main>Incomplete design</main>'),
    /missing selectors/i,
  );
});

test("ships useful metadata and a text-free cover", () => {
  assert.equal(SICK_CERT_BLOG_COPY.title, "How to Get a Sick Cert Online in Ireland");
  assert.ok(SICK_CERT_BLOG_COPY.seoTitle.length <= 60);
  assert.ok(SICK_CERT_BLOG_COPY.seoDescription.length <= 155);
  assert.equal(SICK_CERT_BLOG_COPY.coverImagePath, "/images/ireland/blog/sick-cert-online-ireland-2026-v2.webp");
  assert.doesNotMatch(SICK_CERT_BLOG_COPY.coverImageAlt, /sick certs in ireland/i);
});

test("accepts a real ISO review date and rejects normalized calendar dates", () => {
  assert.equal(parseIsoReviewDate("2026-08-23")?.toISOString(), "2026-08-23T12:00:00.000Z");
  assert.throws(() => parseIsoReviewDate("2026-02-31"), /valid calendar date/i);
  assert.throws(() => parseIsoReviewDate("23-08-2026"), /YYYY-MM-DD/);
});

test("binds clinical approval to the exact designed body", () => {
  const body = buildSickCertBlogBody(`${EXISTING_DESIGN}<main>Old article</main>`);
  const hash = sickCertApprovalSha256(body);

  assert.doesNotThrow(() => assertClinicalReviewGate(false, null));
  assert.throws(() => assertClinicalReviewGate(true, null), /Refusing to apply/);
  assert.throws(
    () => assertClinicalReviewGate(true, parseIsoReviewDate("2026-08-23"), "wrong", hash),
    /exact reviewed copy/,
  );
  assert.doesNotThrow(() =>
    assertClinicalReviewGate(true, parseIsoReviewDate("2026-08-23"), hash, hash),
  );
});
