import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import {
  GONE_PATHS,
  RETIRED_LEGACY_PATHS,
  RETIRED_LEGACY_URLS,
  isGonePath,
} from "../../lib/seo/gone-content";

type Rule = { source: string; destination: string; permanent: boolean };

async function rules(): Promise<Rule[]> {
  const cfg = (nextConfig as unknown as { default?: { redirects: () => Promise<Rule[]> } }).default
    ?? (nextConfig as unknown as { redirects: () => Promise<Rule[]> });
  return cfg.redirects();
}

function toRegex(source: string): RegExp {
  let out = "";
  let i = 0;
  while (i < source.length) {
    if (source[i] === ":") {
      const name = /^\w+/.exec(source.slice(i + 1))?.[0];
      if (name) {
        i += 1 + name.length;
        if (source[i] === "(") {
          let depth = 0;
          const start = i;
          while (i < source.length) {
            if (source[i] === "(" && source[i - 1] !== "\\") depth++;
            else if (source[i] === ")" && source[i - 1] !== "\\") {
              depth--;
              if (depth === 0) { i++; break; }
            }
            i++;
          }
          out += `(${source.slice(start + 1, i - 1)})`;
        } else if (source[i] === "*") {
          i++;
          out += "(.*)";
        } else {
          out += "([^/]+)";
        }
        continue;
      }
    }
    const ch = source[i];
    out += /[.+^${}[]\\]/.test(ch) ? `\\${ch}` : ch;
    i++;
  }
  return new RegExp(`^${out}/?$`, "i");
}

const LAB_REDIRECTS = [
  ["/product-page/genetic-lactose-intolereance-test", "/ireland/en/lab-tests/genetic-lactose-intolerance-test"],
  ["/product-page/heart-health-home-test", "/ireland/en/lab-tests/heart-health-cholesterol-test"],
  ["/product-page/female-hormone-test", "/ireland/en/lab-tests/female-hormone-test"],
  ["/product-page/male-hormone-test", "/ireland/en/lab-tests/male-hormone-test"],
  ["/product-page/thyroid-home-blood-test", "/ireland/en/lab-tests/thyroid-function-test"],
  ["/product-page/psa-test-prostatic-specific-antigen", "/ireland/en/lab-tests/psa-prostate-test"],
  ["/product-page/amh-test-anti-m%C3%BCllerian-hormone", "/ireland/en/lab-tests/amh-fertility-test"],
  ["/product-page/gut-microbiome-test", "/ireland/en/lab-tests/gut-microbiome-test"],
  ["/product-page/coeliac-disease-test", "/ireland/en/lab-tests/genetic-coeliac-disease-test"],
  ["/product-page/osentia-fracture-risk-assessment-test", "/ireland/en/lab-tests/fracture-risk-assessment-test"],
  ["/product-page/general-health-blood-hometest", "/ireland/en/lab-tests/general-health-test"],
  ["/product-page/nutrition-and-lifestyle-home-dna-test", "/ireland/en/lab-tests/nutrition-lifestyle-dna-test"],
  ["/cs/product-page/amh-test-anti-m%C3%BCllerian-hormone", "/ireland/cs/lab-tests/amh-fertility-test"],
  ["/pt/product-page/genetic-lactose-intolereance-test", "/ireland/pt/lab-tests/genetic-lactose-intolerance-test"],
  ["/cs/home-health-tests-1/haemochromatosis-test", "/ireland/cs/lab-tests/genetic-haemochromatosis-test"],
  ["/home-health-tests-1/vitamin-b12-blood-test", "/ireland/en/lab-tests/vitamin-b12-test"],
] as const;

describe("legacy URL cleanup", () => {
  it.each(LAB_REDIRECTS)("redirects %s to the exact live test", async (source, destination) => {
    const all = await rules();
    const hit = all.find((rule) => toRegex(rule.source).test(source));
    expect(hit, `no rule matches ${source}`).toBeDefined();
    const locale = /^\/(cs|es|pt|ro)\//.exec(source)?.[1];
    const resolvedDestination = locale
      ? hit!.destination.replace(":locale", locale)
      : hit!.destination;
    expect(resolvedDestination).toBe(destination);
    expect(hit!.permanent).toBe(true);
  });

  it("does not keep broad homepage redirects for removed or routable content", async () => {
    const all = await rules();
    for (const source of ["/gift-card", "/category/:slug"]) {
      expect(all.some((rule) => rule.source === source), source).toBe(false);
    }
  });

  it("sends home-delivery and category aliases to the closest live content", async () => {
    const all = await rules();
    expect(all).toContainEqual({
      source: "/:locale(cs|es|pt|ro)/home-delivery",
      destination: "/ireland/:locale/lab-tests",
      permanent: true,
    });
    expect(all).toContainEqual({
      source: "/:locale(cs|es|pt|ro)/category/all-products",
      destination: "/ireland/:locale/lab-tests",
      permanent: true,
    });
    expect(all).toContainEqual({
      source: "/category/health-education",
      destination: "/ireland/en/blog",
      permanent: true,
    });
    expect(all).toContainEqual({
      source: "/:locale(cs|es|pt|ro)/home-health-tests/:slug",
      destination: "/ireland/:locale/lab-tests",
      permanent: true,
    });
    expect(all).toContainEqual({
      source: "/:locale(cs|es|pt|ro)/home-health-tests-1/:slug",
      destination: "/ireland/:locale/lab-tests",
      permanent: true,
    });
  });

  it("maps parenthesized Wix test slugs to their exact current products", async () => {
    const all = await rules();
    expect(all).toContainEqual({
      source: "/home-health-tests-1/psa-test-%28prostatic-specific-antigen%29",
      destination: "/ireland/en/lab-tests/psa-prostate-test",
      permanent: true,
    });
    expect(all).toContainEqual({
      source: "/:locale(cs|es|pt|ro)/home-health-tests/amh-test-%28anti-m%C3%BCllerian-hormone%29",
      destination: "/ireland/:locale/lab-tests/amh-fertility-test",
      permanent: true,
    });
  });

  it("retires only the observed dead Wix aliases", () => {
    expect(RETIRED_LEGACY_PATHS.size).toBeGreaterThan(0);
    for (const path of RETIRED_LEGACY_PATHS) {
      expect(GONE_PATHS.has(path), path).toBe(true);
      expect(isGonePath(path), path).toBe(true);
    }
  });

  it("documents every path-level removal with the owner's dated decision", () => {
    for (const entry of RETIRED_LEGACY_URLS) {
      expect(entry.reason.length, entry.path).toBeGreaterThan(40);
      expect(entry.approvedBy, entry.path).toMatch(/owner/i);
      expect(entry.approvedBy, entry.path).toMatch(/2026-08-17/);
    }
  });

  it("lets every retired alias reach the 410 handler instead of a redirect", async () => {
    const all = await rules();
    for (const path of RETIRED_LEGACY_PATHS) {
      const candidates = [...new Set([path, decodeURIComponent(path), encodeURI(path)])];
      for (const candidate of candidates) {
        const matching = all.filter((rule) => toRegex(rule.source).test(candidate));
        expect(matching.map((rule) => rule.source), `${candidate} is intercepted`).toEqual([]);
      }
    }
  });

  it("retires sibling Wix-language variants without retiring canonical doctor pages", async () => {
    const all = await rules();
    for (const path of [
      "/pt/ireland-doctors/dr-andra-cristea",
      "/spain-doctors/dr-yliana-mu%C3%B1oz-bravo",
      "/es/portugal-doctors/dr-luis-infante",
    ]) {
      expect(isGonePath(path), path).toBe(true);
      const matching = all.filter((rule) => toRegex(rule.source).test(path));
      expect(matching.map((rule) => rule.source), `${path} is intercepted`).toEqual([]);
    }
  });

  it("does not treat the corresponding clinician entities as confirmed gone", () => {
    for (const path of [
      "/ireland/en/doctors/dr-andra-cristea",
      "/ireland/en/doctors/dr-mirza-aun-mohammad",
      "/spain/es/doctors/dr-irene-galve-moros",
      "/spain/es/doctors/dr-yliana-mu%C3%B1oz-bravo",
      "/portugal/pt/doctors/dr-luis-infante",
    ]) {
      expect(isGonePath(path), path).toBe(false);
    }
  });

  it("has no homepage fallback for unknown product-page paths", async () => {
    const all = await rules();
    expect(all).not.toContainEqual({ source: "/product-page/:slug", destination: "/", permanent: true });
    expect(all).not.toContainEqual({
      source: "/:locale(cs|es|pt|ro)/product-page/:slug",
      destination: "/",
      permanent: true,
    });
  });
});
