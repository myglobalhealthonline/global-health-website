import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = path.resolve(__dirname, "../..");

const splitHeroFiles = [
  "components/templates/DoctorProfileTemplate.tsx",
  "app/(site)/[country]/[lang]/services/[serviceSlug]/page.tsx",
  "app/(site)/[country]/[lang]/tests/[testSlug]/page.tsx",
];

describe("split hero scrolling", () => {
  it.each(splitHeroFiles)("lets the document scroll in %s", (relativePath) => {
    const source = readFileSync(path.join(frontendRoot, relativePath), "utf8");
    const heroClass = source.match(/className="([^"]*gh-inline-split-hero[^"]*)"/)?.[1];
    const panelClass = source.match(/className="([^"]*gh-inline-panel-base[^"]*)"/)?.[1];

    expect(heroClass).toBeDefined();
    expect(heroClass).not.toContain("overflow-hidden");
    expect(source).not.toContain("HeroFitContent");
    expect(panelClass).toBeDefined();
    expect(panelClass).not.toMatch(/overflow-y-(?:auto|scroll)|max-h-|h-screen/);
  });
});
