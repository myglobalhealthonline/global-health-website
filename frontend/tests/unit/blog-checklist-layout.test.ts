import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(
  path.resolve(__dirname, "../../app/globals.css"),
  "utf8",
);

describe("authored blog checklist layout", () => {
  it("gives sanitized checklist items enough inset for the generated marker", () => {
    const checklistRule = globalsCss.match(
      /\.gh-article-body\.gh-article-editorial--authored-sections \.check-list > li:not\(\[class\]\)\s*\{([\s\S]*?)\}/,
    )?.[1];

    expect(checklistRule).toBeDefined();
    expect(checklistRule).toContain("position: relative;");
    expect(checklistRule).toContain("min-height: 24px;");
    expect(checklistRule).toContain("padding-left: 32px;");
  });

  it("keeps the checklist marker compact so linked labels do not overlap it", () => {
    const markerRule = globalsCss.match(
      /\.gh-article-body\.gh-article-editorial--authored-sections \.check-list > li:not\(\[class\]\)::before\s*\{([\s\S]*?)\}/,
    )?.[1];

    expect(markerRule).toBeDefined();
    expect(markerRule).toContain("width: 18px;");
    expect(markerRule).toContain("height: 18px;");
    expect(markerRule).toContain("background: #dfe9e1;");
    expect(markerRule).toContain("font-size: 11px;");
    expect(markerRule).toContain("line-height: 1;");
  });
});
