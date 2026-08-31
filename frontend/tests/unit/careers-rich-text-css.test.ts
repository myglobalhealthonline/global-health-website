import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
const page = fs.readFileSync(
  path.resolve(__dirname, "../../app/[country]/[lang]/careers/[slug]/page.tsx"),
  "utf8",
);

describe("careers rich-text styles", () => {
  it("restores semantic list markers and readable block rhythm after Tailwind preflight", () => {
    expect(css).toMatch(/\.gh-careers-prose :where\(ul\)[^{]*\{[^}]*list-style:\s*disc outside/);
    expect(css).toMatch(/\.gh-careers-prose :where\(ol\)[^{]*\{[^}]*list-style:\s*decimal outside/);
    expect(css).toMatch(/\.gh-careers-prose :where\(p\)[^{]*\{[^}]*margin:/);
    expect(css).toMatch(/\.gh-careers-prose > :where\(div\)[^{]*\{[^}]*margin:/);
    expect(css).toMatch(/\.gh-careers-prose :where\(li\)[^{]*\{[^}]*margin:/);
    expect(css).toMatch(/\.gh-careers-prose :where\(h4, h5, h6\)/);
  });

  it("uses an open editorial column and the existing forest glass material", () => {
    expect(page).toContain('<article className="gh-careers-job-main">');
    expect(page).toContain('<aside className="gh-careers-job-aside gh2-glass-forest gh2-dark-content">');
    expect(css).toMatch(/\.gh-careers-job-main\s*\{[^}]*padding:\s*0/);
    expect(css).toMatch(/\.gh-careers-job-aside\s*\{[^}]*color:\s*white/);
  });
});
