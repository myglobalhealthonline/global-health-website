import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(
  path.resolve(__dirname, "../../app/globals.css"),
  "utf8",
);

describe("medical pattern strength", () => {
  it("keeps the original subtle opacity tokens", () => {
    expect(globalsCss).toContain("--medical-pattern-opacity: 0.022;");
    expect(globalsCss).toContain("--medical-pattern-dark-opacity: 0.04;");
    expect(globalsCss).toContain("--medical-pattern-soft-opacity: 0.016;");
  });

  it("keeps panel patterns at their original independent opacity", () => {
    const panelRule = globalsCss.match(
      /\.gh-medical-pattern-panel::before\s*\{([\s\S]*?)\}/,
    )?.[1];

    expect(panelRule).toBeDefined();
    expect(panelRule).toContain("opacity: 0.03;");
  });
});
