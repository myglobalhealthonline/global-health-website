import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

describe("careers rich-text styles", () => {
  it("restores semantic list markers and readable block rhythm after Tailwind preflight", () => {
    expect(css).toMatch(/\.gh-careers-prose :where\(ul\)[^{]*\{[^}]*list-style:\s*disc outside/);
    expect(css).toMatch(/\.gh-careers-prose :where\(ol\)[^{]*\{[^}]*list-style:\s*decimal outside/);
    expect(css).toMatch(/\.gh-careers-prose :where\(p\)[^{]*\{[^}]*margin:/);
    expect(css).toMatch(/\.gh-careers-prose > :where\(div\)[^{]*\{[^}]*margin:/);
    expect(css).toMatch(/\.gh-careers-prose :where\(li\)[^{]*\{[^}]*margin:/);
    expect(css).toMatch(/\.gh-careers-prose :where\(h4, h5, h6\)/);
  });
});
