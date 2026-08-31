import { describe, expect, it } from "vitest";
import { sanitizeCareerDescriptionHtml, sanitizePageBodyHtml } from "./sanitize-page-body";

describe("sanitizePageBodyHtml", () => {
  it("keeps the shared legal-content contract unchanged", () => {
    const html = sanitizePageBodyHtml(`
      <div style="text-align:center"><h2>Terms</h2><ul><li>One</li></ul></div>
    `);

    expect(html).toContain("<h2>Terms</h2><ul><li>One</li></ul>");
    expect(html).not.toContain("<div");
    expect(html).not.toContain("style=");
  });
});

describe("sanitizeCareerDescriptionHtml", () => {
  it("keeps editor blocks and semantic rich-text structure", () => {
    const html = sanitizeCareerDescriptionHtml(`
      <h2>Overview</h2>
      <div>First paragraph.</div>
      <div>Second paragraph.</div>
      <h3>Requirements</h3>
      <ul><li>Licensed doctor</li><li>Fluent Czech</li></ul>
      <h4>Preferred</h4>
      <ol><li>Telemedicine experience</li></ol>
    `);

    expect(html).toContain("<h2>Overview</h2>");
    expect(html).toContain("<div>First paragraph.</div>");
    expect(html).toContain("<div>Second paragraph.</div>");
    expect(html).toContain("<ul><li>Licensed doctor</li><li>Fluent Czech</li></ul>");
    expect(html).toContain("<h4>Preferred</h4>");
    expect(html).toContain("<ol><li>Telemedicine experience</li></ol>");
  });

  it("keeps safe authored alignment while removing executable or layout-breaking styles", () => {
    const html = sanitizeCareerDescriptionHtml(`
      <p style="text-align: center; font-size: 999rem; line-height: 99; position: fixed; background-image: url(javascript:alert(1))">
        Centered copy
      </p>
      <img src="https://example.com/photo.jpg" alt="Doctor" onerror="alert(1)">
      <script>alert(1)</script>
    `);

    expect(html).toContain("text-align:center");
    expect(html).not.toContain("position");
    expect(html).not.toContain("background-image");
    expect(html).not.toContain("font-size");
    expect(html).not.toContain("line-height");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<script");
  });
});
