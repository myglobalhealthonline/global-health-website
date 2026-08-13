import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scopeBlogHtml, BLOG_SCOPE_CLASS } from "./scope-blog-html";

/**
 * Pull the CSS that ends up inside the single `<style>` block scopeBlogHtml
 * emits. Returns "" when the block was dropped entirely (fail-closed).
 */
function scopedCss(html: string): string {
  const out = scopeBlogHtml(html);
  const m = out.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return m ? m[1] : "";
}

const wrap = (css: string) => `<div><style>${css}</style><p>hi</p></div>`;

describe("scopeBlogHtml", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it("passes through HTML with no <style> unchanged in structure", () => {
    const out = scopeBlogHtml("<p>hello <strong>world</strong></p>");
    expect(out).toContain("hello");
    expect(out).toContain("<strong>world</strong>");
  });

  it("wraps author CSS in an @scope block bound to the article container", () => {
    const css = scopedCss(wrap(".card { color: red; }"));
    expect(css).toContain(`@scope (.${BLOG_SCOPE_CLASS})`);
    expect(css).toContain(".card");
    expect(css).toContain("color: red");
  });

  it("keeps @media / @supports blocks, still inside @scope", () => {
    const css = scopedCss(
      wrap("@media (min-width: 40rem) { .a { color: blue } } @supports (display: grid) { .b { display: grid } }"),
    );
    expect(css).toContain("@media");
    expect(css).toContain("@supports");
    expect(css).toContain(".a");
    expect(css).toContain(".b");
  });

  it("namespaces @keyframes and rewrites animation references", () => {
    const css = scopedCss(
      wrap("@keyframes spin { from { opacity: 0 } to { opacity: 1 } } .x { animation: spin 2s linear; } .y { animation-name: spin; }"),
    );
    expect(css).toContain("@keyframes ghblog-spin");
    // reference rewritten in both shorthand and longhand
    expect(css).toMatch(/animation:\s*ghblog-spin/);
    expect(css).toMatch(/animation-name:\s*ghblog-spin/);
    // the bare global name must not survive as a keyframes identifier
    expect(css).not.toMatch(/@keyframes spin\b/);
  });

  it("drops @import (whole rule) but keeps the rest of the block", () => {
    const css = scopedCss(wrap("@import url('https://evil.example/x.css'); .safe { color: green }"));
    expect(css).not.toContain("@import");
    expect(css).toContain(".safe");
    expect(warn).toHaveBeenCalled();
  });

  it("drops @charset and @namespace", () => {
    const css = scopedCss(wrap('@charset "utf-8"; @namespace svg url(http://www.w3.org/2000/svg); .a { color: red }'));
    expect(css).not.toContain("@charset");
    expect(css).not.toContain("@namespace");
    expect(css).toContain(".a");
  });

  it("strips declarations using expression(...)", () => {
    const css = scopedCss(wrap(".a { width: expression(alert(1)); color: red }"));
    expect(css).not.toMatch(/expression\s*\(/i);
    expect(css).toContain("color: red");
    expect(warn).toHaveBeenCalled();
  });

  it("strips declarations with url(javascript:...)", () => {
    const css = scopedCss(wrap(".a { background: url(javascript:alert(1)); color: red }"));
    expect(css).not.toMatch(/javascript:/i);
    expect(css).toContain("color: red");
  });

  it("strips url() with non-http/non-data-image schemes but keeps http(s) and data:image", () => {
    const dropped = scopedCss(wrap(".a { background: url('//tracker.example/p.gif'); }"));
    expect(dropped).not.toContain("tracker.example");

    const kept = scopedCss(
      wrap(".b { background: url('https://cdn.example/bg.png'); } .c { background: url(data:image/png;base64,AAAA); }"),
    );
    expect(kept).toContain("https://cdn.example/bg.png");
    expect(kept).toContain("data:image/png");
  });

  it("fails closed (drops whole block) on unbalanced braces without throwing", () => {
    expect(() => scopeBlogHtml(wrap(".a { color: red"))).not.toThrow();
    expect(scopedCss(wrap(".a { color: red"))).toBe("");
    expect(warn).toHaveBeenCalled();
  });

  it("fails closed on an extra closing brace (the @scope-escape vector)", () => {
    // The classic escape: close the rule early, then run unscoped CSS.
    expect(scopedCss(wrap(".a { color: red } } body { display: none }"))).toBe("");
  });

  it("fails closed on non-CSS junk and weird escapes", () => {
    expect(() => scopeBlogHtml(wrap("this is not css at all !!!"))).not.toThrow();
    expect(scopedCss(wrap("this is not css at all !!!"))).toBe("");
  });

  it("regression: large editorial block with comments + many class selectors stays scoped", () => {
    const article = `
      /* Hand, foot & mouth — editorial design block */
      .hfm-hero { position: relative; padding: 2rem; background-color: #0b3d2e; color: #fff; }
      .hfm-hero__title { font-size: 2.5rem; line-height: 1.1; }
      .hfm-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
      @media (max-width: 48rem) { .hfm-grid { grid-template-columns: 1fr; } }
      .hfm-card { border-radius: 12px; padding: 1.25rem; background: #f5f3ee; }
      @keyframes hfm-fade { from { opacity: 0 } to { opacity: 1 } }
      .hfm-card--in { animation: hfm-fade 400ms ease-out both; }
    `;
    const css = scopedCss(wrap(article));
    expect(css).not.toBe("");
    expect(css).toContain(`@scope (.${BLOG_SCOPE_CLASS})`);
    expect(css).toContain(".hfm-hero");
    expect(css).toContain(".hfm-grid");
    expect(css).toContain("@media");
    expect(css).toContain("@keyframes ghblog-hfm-fade");
    expect(css).toMatch(/animation:\s*ghblog-hfm-fade/);
    // still balanced — one style block, structurally closed
    expect((css.match(/\{/g) ?? []).length).toBe((css.match(/\}/g) ?? []).length);
  });

  it("still strips <script> (sanitize layer intact)", () => {
    const out = scopeBlogHtml("<div><script>alert(1)</script><p>ok</p></div>");
    expect(out).not.toContain("<script");
    expect(out).toContain("ok");
  });

  describe("h1 demotion carries the author's h1 styling", () => {
    it("stamps the demoted heading and mirrors h1 selectors onto it", () => {
      const out = scopeBlogHtml(
        `<style>.gh-blog h1 { color: #FFFFFF; font-size: 5rem; } .gh-blog h2 { color: #1D4B36; }</style>` +
          `<main class="gh-blog"><h1>Hero title</h1><h2>Section</h2></main>`,
      );
      // Semantic demotion still happens (one <h1> per page).
      expect(out).not.toMatch(/<h1[\s>]/);
      expect(out).toContain("<h2 data-blog-h1>Hero title</h2>");
      // …and the author's h1 rule now also matches it, at higher specificity
      // than their generic h2 rule, so the hero title keeps its own colour.
      const css = scopedCss(out);
      expect(css).toMatch(/\.gh-blog h1,\s*\.gh-blog h2\[data-blog-h1\]/);
      // Original selector is kept, never replaced.
      expect(css).toContain(".gh-blog h1");
    });

    it("mirrors bare and grouped h1 selectors, and leaves lookalikes alone", () => {
      const css = scopedCss(
        `<style>h1 { color: red } .hero h1, .promo h1 { color: blue } .h1 { color: green } h1-legacy { color: pink }</style>`,
      );
      expect(css).toMatch(/^\s*h1,\s*h2\[data-blog-h1\]/m);
      expect(css).toContain(".hero h2[data-blog-h1]");
      expect(css).toContain(".promo h2[data-blog-h1]");
      // `.h1` is a class and `h1-legacy` a different type — neither is an h1.
      expect(css).not.toContain(".h2[data-blog-h1]");
      expect(css).not.toContain("h2[data-blog-h1]-legacy");
    });

    it("leaves style blocks without h1 selectors untouched", () => {
      const css = scopedCss(`<style>.card { color: #111 } h2 { color: #222 }</style>`);
      expect(css).not.toContain("data-blog-h1");
    });
  });
});
