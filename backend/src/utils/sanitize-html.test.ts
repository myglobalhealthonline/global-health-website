import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeCareerHtml, sanitizeDoctorBio } from "./sanitize-html.js";

describe("sanitizeDoctorBio", () => {
  it("strips pasted text-fragment URLs and the heading they leave empty", () => {
    const url = "https://www.myglobalhealth.online/ro/romania-doctors/dr-x#:~:text=TO%C8%9AI%20DOCTORII,Powered%20by%20ElevenAgents";
    assert.equal(sanitizeDoctorBio(`<p>Bio</p><h3>${url}</h3>`), "<p>Bio</p>");
    assert.equal(sanitizeDoctorBio(`<h3>${url}</h3>`), null);
  });
});

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
