import { describe, expect, it } from "vitest";
import {
  sanitizeDoctorBioHtml,
  toDoctorBioPlainText,
} from "./doctor-bio-format";

describe("sanitizeDoctorBioHtml", () => {
  it("wraps a plain-text bio in <p> and HTML-escapes special characters", () => {
    expect(sanitizeDoctorBioHtml("Dr. Smith & co.")).toBe(
      "<p>Dr. Smith &amp; co.</p>",
    );
  });

  it("returns an empty string for an empty input", () => {
    expect(sanitizeDoctorBioHtml("")).toBe("");
  });

  it("strips <script> tags", () => {
    const result = sanitizeDoctorBioHtml(
      "<p>Hi</p><script>alert(1)</script>",
    );
    expect(result).not.toContain("<script>");
    expect(result).toContain("<p>Hi</p>");
  });

  it("strips unquoted on* handlers (regression: regex sanitizer bypass)", () => {
    // The old homegrown regex sanitizer let `onerror=alert(1)` through
    // when the attribute value wasn't quoted. The sanitize-html library
    // we now use isn't fooled.
    const result = sanitizeDoctorBioHtml(
      "<p>Hi</p><img src=x onerror=alert(1)>",
    );
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("<img");
  });

  it("preserves allowed inline formatting", () => {
    const result = sanitizeDoctorBioHtml(
      "<p>Hello <strong>world</strong></p>",
    );
    expect(result).toBe("<p>Hello <strong>world</strong></p>");
  });

  it("drops disallowed tags but keeps their text content", () => {
    const result = sanitizeDoctorBioHtml(
      "<p>Greetings from <iframe src='x'>somewhere</iframe>.</p>",
    );
    expect(result).not.toContain("<iframe");
    expect(result).toContain("Greetings from");
    expect(result).toContain("somewhere");
  });
});

describe("toDoctorBioPlainText", () => {
  it("strips all tags and collapses whitespace", () => {
    expect(
      toDoctorBioPlainText("<p>Hello</p>  <p>  world</p>"),
    ).toBe("Hello world");
  });
});
