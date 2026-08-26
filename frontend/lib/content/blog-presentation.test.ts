import { describe, expect, it } from "vitest";
import { editorialBlogBodyClassName, editorialBlogBodyLayout } from "./blog-presentation";

describe("editorialBlogBodyLayout", () => {
  it("recognises the direct table-of-contents family used by the original pilot", () => {
    const html = `<style>.section{color:red}</style><section class="hero article-lede">Intro</section><nav class="toc-strip">Contents</nav><main><article class="section">Copy</article></main>`;

    expect(editorialBlogBodyLayout(html)).toBe("direct-toc");
    expect(editorialBlogBodyClassName(html)).toContain("gh-article-editorial--direct-toc");
    expect(editorialBlogBodyClassName(html)).toContain("gh-article-calm");
  });

  it("recognises nested designed bodies without forcing them into the pilot grid", () => {
    const ghBatch = `<style>.article-section{padding:4rem}</style><main class="gh-blog"><header class="article-intro article-lede">Answer first</header><nav class="article-nav">Contents</nav><section class="article-section">Copy</section></main>`;
    const diabetes = `<style>.toc{padding:2rem}</style><header class="hero article-lede">Summary</header><nav class="toc">Contents</nav><main>Copy</main>`;

    expect(editorialBlogBodyLayout(ghBatch)).toBe("authored-sections");
    expect(editorialBlogBodyLayout(diabetes)).toBe("authored-sections");
    expect(editorialBlogBodyClassName(ghBatch)).not.toContain("gh-article-calm");
  });

  it("uses a readable single-column layout for plain rich text", () => {
    const html = `<h2>When to seek care</h2><p>Plain article copy.</p>`;

    expect(editorialBlogBodyLayout(html)).toBe("plain");
    expect(editorialBlogBodyClassName(html)).toContain("gh-article-editorial--plain");
  });
});
