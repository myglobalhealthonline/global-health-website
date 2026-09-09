import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";
import { LocaleCode } from "@prisma/client";

const row = {
  slug: "original", title: "Original", excerpt: "Original excerpt", body: `<p>${"word ".repeat(500_000)}</p>`,
  locale: LocaleCode.EN, category: "Guide", authorDisplayName: "Author", reviewerDisplayName: "Reviewer",
  publishedAt: new Date("2026-09-01T00:00:00Z"), createdAt: new Date("2026-09-01T00:00:00Z"),
  lastReviewedAt: null, coverAsset: { path: "/cover.webp", altText: "Original cover" },
  seoTitle: "SEO", seoDescription: "Description", authorDoctor: null, reviewerDoctor: null,
  countries: [{ country: { code: "pt", slug: "portugal" } }],
  ctaService: { slug: "gp", name: "GP", isActive: true, country: { slug: "portugal" } },
  translations: [
    { locale: "PT", slug: "traduzido", title: "Traduzido", excerpt: "Resumo", content: `<script>${"ignored ".repeat(1000)}</script><p>${"palavra ".repeat(201)}</p>`, seoTitle: "SEO PT", seoDesc: "Descricao", coverImageAlt: "Capa" },
    { locale: "ES", slug: "empty", title: "Empty", excerpt: null, content: " \n\t ", seoTitle: null, seoDesc: null, coverImageAlt: null },
  ],
};
let service: typeof import("./blog.service.js");

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: { prisma: { blogPost: { findMany: async () => [row], findFirst: async () => row } } },
  });
  service = await import("./blog.service.js");
});

describe("public blog summary response", () => {
  it("removes multi-megabyte HTML while preserving card/routing/CTA metadata", async () => {
    const [full] = await service.getPublicBlogPosts();
    const [summary] = await service.getPublicBlogPosts(undefined, undefined, "summary");
    assert.ok(Buffer.byteLength(JSON.stringify(full)) > 2_000_000);
    assert.ok(Buffer.byteLength(JSON.stringify(summary)) < 2_000);
    assert.equal("body" in summary!, false);
    assert.equal("translations" in summary!, false);
    assert.equal(JSON.stringify(summary).includes('"content"'), false);
    const { body, ...metadata } = full as import("./blog.service.js").PublicBlogPost;
    assert.equal(body, row.body);
    assert.deepEqual(summary, { ...metadata, readingTime: 2500 });
    assert.deepEqual(summary!.ctaService, { slug: "gp", name: "GP", countrySlug: "portugal" });
  });

  it("uses the translated reading time and excludes whitespace-only variants", async () => {
    const [summary] = await service.getPublicBlogPosts(LocaleCode.PT, "pt", "summary");
    assert.equal(summary!.slug, "traduzido");
    assert.equal(summary!.title, "Traduzido");
    assert.equal(summary!.excerpt, "Resumo");
    assert.equal(summary!.coverImageAlt, "Capa");
    assert.equal((summary as import("./blog.service.js").PublicBlogSummary).readingTime, 2);
    assert.deepEqual(summary!.localeVariants, [{ locale: "EN", slug: "original" }, { locale: "PT", slug: "traduzido" }]);
    const detail = await service.getPublicBlogPostBySlug("traduzido", LocaleCode.PT, "pt");
    assert.equal(detail!.body, row.translations[0]!.content);
    assert.equal(detail!.seoTitle, "SEO PT");
    const [full] = await service.getPublicBlogPosts(LocaleCode.PT, "pt", "full");
    assert.deepEqual(full, detail);
  });
});
