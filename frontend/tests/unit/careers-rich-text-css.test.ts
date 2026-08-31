import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
const page = fs.readFileSync(
  path.resolve(__dirname, "../../app/[country]/[lang]/careers/[slug]/page.tsx"),
  "utf8",
);
const applicationForm = fs.readFileSync(
  path.resolve(__dirname, "../../app/[country]/[lang]/careers/[slug]/_components/job-application-form.tsx"),
  "utf8",
);

describe("careers rich-text styles", () => {
  it("restores semantic list markers and readable block rhythm after Tailwind preflight", () => {
    expect(css).toMatch(/\.gh-article-body:not\(\.gh-article-raw\)[^{]*\{[^}]*line-height:\s*1\.75/);
    expect(css).toMatch(/\.gh-article-body:not\(\.gh-article-raw\) :where\(ul\)[^{]*\{[^}]*list-style:\s*disc/);
    expect(css).toMatch(/\.gh-article-body:not\(\.gh-article-raw\) :where\(ol\)[^{]*\{[^}]*list-style:\s*decimal/);
    expect(page).toContain('className="gh-article-body max-w-[76ch]"');
    expect(page).not.toContain("gh-careers-prose");
  });

  it("uses an open editorial column and the existing forest glass material", () => {
    expect(page).toContain('<article className="gh-careers-job-main">');
    expect(page).toContain('<aside className="gh-careers-job-aside gh2-glass-forest gh2-dark-content">');
    expect(css).toMatch(/\.gh-careers-job-main\s*\{[^}]*padding:\s*0/);
    expect(css).toMatch(/\.gh-careers-job-aside\s*\{[^}]*color:\s*white/);
  });

  it("matches service-page heading hierarchy and uses forest glass for applications", () => {
    expect(css).toMatch(/\.gh-article-body:not\(\.gh-article-raw\) :where\(h1, h2\)[^{]*\{[^}]*font-size:\s*clamp\(/);
    expect(css).toMatch(/\.gh-article-body:not\(\.gh-article-raw\) :where\(h3\)[^{]*\{[^}]*font-size:\s*clamp\(/);
    expect(applicationForm).toContain(
      'className="gh-careers-application gh2-glass-forest gh2-dark-content"',
    );
    expect(applicationForm).toContain(
      'className="gh-careers-application-success gh2-glass-forest gh2-dark-content"',
    );
    expect(css).toMatch(/\.gh-careers-application\s*\{[^}]*color:\s*var\(--color-text-body\)/);
    expect(css).toMatch(/\.gh-careers-application h2\s*\{[^}]*color:\s*var\(--color-text-primary\)/);
    expect(css).toMatch(/\.gh-careers-application-success\s*\{[^}]*color:\s*var\(--color-text-primary\)/);
    expect(css).toMatch(/\.gh-careers-application input:not\(\[type="checkbox"\]\):focus[^{]*\{[^}]*rgba\(176,241,34,\.16\)/);
  });
});
