import { describe, expect, it } from "vitest";
import { prepareBlogArticleHtml } from "./blog-table-of-contents";

describe("prepareBlogArticleHtml", () => {
  it("removes embedded TOC markup and builds a left-rail TOC from article headings", () => {
    const html = `
      <nav class="toc-strip" aria-label="Table of contents">
        <div class="toc-inner"><h2>Table of contents</h2></div>
      </nav>
      <main>
        <article class="section">
          <h2 class="section-title">Overview</h2>
          <p>Clinical summary.</p>
          <h3>When to seek care</h3>
        </article>
      </main>
    `;

    const prepared = prepareBlogArticleHtml(html);

    expect(prepared.html).not.toContain("toc-strip");
    expect(prepared.items).toEqual([{ id: "overview", label: "Overview", level: 2 }]);
    expect(prepared.html).toContain('<h2 class="section-title" id="overview">Overview</h2>');
    expect(prepared.html).toContain("<h3>When to seek care</h3>");
  });

  it("preserves existing heading ids and skips the demoted page title", () => {
    const html = `
      <header class="article-intro">
        <h2 data-blog-h1>How online prescriptions work</h2>
      </header>
      <section class="article-section">
        <h2 id="eligibility">Eligibility</h2>
        <h3 id="timing">Timing</h3>
      </section>
    `;

    const prepared = prepareBlogArticleHtml(html);

    expect(prepared.items).toEqual([{ id: "eligibility", label: "Eligibility", level: 2 }]);
    expect(prepared.html).toContain('<h2 data-blog-h1>How online prescriptions work</h2>');
  });

  it("creates unique ids for duplicate headings and decodes simple entities", () => {
    const html = `
      <h2>Symptoms &amp; causes</h2>
      <h2>Symptoms &amp; causes</h2>
      <h3>What&#39;s next?</h3>
    `;

    const prepared = prepareBlogArticleHtml(html);

    expect(prepared.items).toEqual([
      { id: "symptoms-causes", label: "Symptoms & causes", level: 2 },
      { id: "symptoms-causes-2", label: "Symptoms & causes", level: 2 },
    ]);
    expect(prepared.html).toContain('id="symptoms-causes"');
    expect(prepared.html).toContain('id="symptoms-causes-2"');
  });

  it("keeps a contents rail for headingless articles", () => {
    const prepared = prepareBlogArticleHtml("<p>Short medical update.</p>", "Medical update");

    expect(prepared.items).toEqual([
      { id: "blog-article-content", label: "Medical update", level: 2 },
    ]);
  });
});
