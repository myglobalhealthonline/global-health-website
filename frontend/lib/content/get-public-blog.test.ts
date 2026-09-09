import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiRequest }));
import { getBlogPost, listBlogPosts, listRelatedBlogPosts, readingTimeFromHtml } from "./get-public-blog";

beforeEach(() => apiRequest.mockReset());

describe("public blog list fetches", () => {
  const summary = { slug: "translated", title: "Translated", excerpt: "Summary", locale: "PT", readingTime: 7,
    localeVariants: [{ locale: "PT", slug: "translated" }], countries: [{ code: "pt", slug: "portugal" }],
    ctaService: { slug: "gp", name: "GP", countrySlug: "portugal" } };

  it("requests summaries and preserves supplied reading time and related-service matching", async () => {
    apiRequest.mockResolvedValue({ ok: true, data: { posts: [summary] } });
    const posts = await listBlogPosts("pt", "pt");
    expect(posts[0]).toMatchObject({ slug: "translated", readingTime: 7, localeVariants: summary.localeVariants });
    expect(apiRequest.mock.calls[0][0]).toBe("/api/blog?view=summary&countryCode=pt&locale=PT");
    await expect(listRelatedBlogPosts("pt", "pt", { serviceSlug: "gp" })).resolves.toEqual([
      { slug: "translated", title: "Translated", excerpt: "Summary" },
    ]);
  });

  it("explicitly requests full content for the legacy failed-detail fallback", async () => {
    apiRequest.mockResolvedValueOnce({ ok: false, message: "Unavailable" });
    apiRequest.mockResolvedValueOnce({ ok: true, data: { posts: [{ ...summary, body: "<p>Article body</p>" }] } });
    const post = await getBlogPost("translated", "pt", "pt");
    expect(post?.body).toBe("<p>Article body</p>");
    expect(apiRequest.mock.calls[1][0]).toBe("/api/blog?view=full&countryCode=pt&locale=PT");
  });
});

describe("readingTimeFromHtml", () => {
  it("keeps empty and short articles at one minute", () => {
    expect(readingTimeFromHtml("")).toBe(1);
    expect(readingTimeFromHtml("<p>A short update.</p>")).toBe(1);
  });

  it("uses visible prose at 200 words per minute", () => {
    const prose = Array.from({ length: 400 }, (_, index) => `word${index}`).join(" ");

    expect(readingTimeFromHtml(`<article><p>${prose}</p></article>`)).toBe(2);
  });

  it("ignores style and script contents", () => {
    const prose = Array.from({ length: 201 }, (_, index) => `word${index}`).join(" ");
    const css = Array.from({ length: 2_000 }, (_, index) => `.x${index}{color:red}`).join(" ");
    const js = Array.from({ length: 2_000 }, (_, index) => `token${index}`).join(" ");

    expect(
      readingTimeFromHtml(`<style>${css}</style><script>${js}</script><p>${prose}</p>`),
    ).toBe(2);
  });
});
