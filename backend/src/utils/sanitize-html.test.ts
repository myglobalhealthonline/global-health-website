import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeCareerHtml } from "./sanitize-html.js";

describe("sanitizeCareerHtml", () => {
  it("keeps prose while removing remote media and layout-breaking styles", () => {
    const html = sanitizeCareerHtml(`
      <h2>Role</h2>
      <p style="text-align:center;font-size:999rem;line-height:99">Details</p>
      <img src="https://tracker.example/pixel.gif" onerror="alert(1)">
    `) ?? "";

    assert.match(html, /<h2>Role<\/h2>/);
    assert.match(html, /text-align:center/);
    assert.doesNotMatch(html, /font-size|line-height|<img|onerror|tracker\.example/);
  });
});
