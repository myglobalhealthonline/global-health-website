import { describe, expect, it } from "vitest";
import { isAllowedEditorElement, isSafeEditorHref } from "@/app/(portal)/(admin)/admin/_components/rich-text-html-field";

describe("isSafeEditorHref", () => {
  it("allows normal links and rejects executable, credentialed, or protocol-relative URLs", () => {
    expect(isSafeEditorHref("/careers/doctor")).toBe(true);
    expect(isSafeEditorHref("https://example.com/job")).toBe(true);
    expect(isSafeEditorHref("mailto:careers@example.com")).toBe(true);
    expect(isSafeEditorHref("javascript:alert(1)")).toBe(false);
    expect(isSafeEditorHref("//tracker.example/pixel")).toBe(false);
    expect(isSafeEditorHref("https://user:secret@example.com/job")).toBe(false);
  });

  it("allows only supported HTML elements and rejects executable namespaces/tags", () => {
    const html = "http://www.w3.org/1999/xhtml";
    expect(isAllowedEditorElement("p", html)).toBe(true);
    expect(isAllowedEditorElement("svg", "http://www.w3.org/2000/svg")).toBe(false);
    expect(isAllowedEditorElement("math", "http://www.w3.org/1998/Math/MathML")).toBe(false);
    expect(isAllowedEditorElement("script", html)).toBe(false);
    expect(isAllowedEditorElement("template", html)).toBe(false);
    expect(isAllowedEditorElement("custom-element", html)).toBe(false);
  });
});
