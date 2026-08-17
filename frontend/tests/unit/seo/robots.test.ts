import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { PROD_SITE_URL } from "@/lib/seo/site-url";

/**
 * Regression guard for `app/robots.ts` (SEO-FOUNDATION-002).
 *
 * This file pins the CURRENT crawl policy. It is not a statement that the
 * policy is optimal — changing it is a deliberate act that must update this
 * test in the same commit, which is the whole point.
 */

const result = () => robots();

/** Every disallow string across every rule, flattened. */
const allDisallows = (): string[] => {
  const out: string[] = [];
  for (const rule of result().rules as Array<{ disallow?: string | string[] }>) {
    const d = rule.disallow;
    if (!d) continue;
    out.push(...(Array.isArray(d) ? d : [d]));
  }
  return out;
};

const rulesArray = () =>
  result().rules as Array<{ userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] }>;

describe("robots.txt policy", () => {
  it("allows the public site for the wildcard agent", () => {
    const wildcard = rulesArray().find((r) => r.userAgent === "*");
    expect(wildcard).toBeDefined();
    expect(wildcard?.allow).toBe("/");
  });

  it("never disallows the whole site", () => {
    // A bare "/" in disallow would deindex everything. The single most
    // expensive one-character regression this file can catch.
    expect(allDisallows()).not.toContain("/");
    for (const rule of rulesArray()) {
      expect(rule.allow).not.toBe(undefined);
    }
  });

  it("restricts admin, gated account subpages and the API", () => {
    const wildcard = rulesArray().find((r) => r.userAgent === "*");
    const disallow = wildcard?.disallow as string[];
    for (const path of ["/admin", "/admin/*", "/account/*", "/api/"]) {
      expect(disallow).toContain(path);
    }
  });

  it("leaves the noindexed auth pages crawlable", () => {
    // A Disallow here would hide the `noindex, nofollow` these pages already
    // serve, and `/login` alone has ~1,000 internal inlinks — exactly the
    // shape that produces a URL-only SERP entry. See the comment in robots.ts.
    const prefixes = allDisallows().map((d) => d.replace(/\*$/, ""));
    for (const path of [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/account",
    ]) {
      const blockedBy = prefixes.find((p) => path.startsWith(p));
      expect(blockedBy, `${path} blocked by robots rule "${blockedBy}"`).toBeUndefined();
    }
  });

  it("does not restrict any public content family", () => {
    // Country homes, doctors, services, lab tests, blog, legal, health
    // landing pages and tools are the entire indexable surface. A prefix
    // landing in the disallow list would silently deindex a whole family.
    const prefixes = allDisallows().map((d) => d.replace(/\*$/, ""));
    for (const path of [
      "/ireland/en",
      "/ireland/en/doctors/dr-example",
      "/ireland/en/services/gp-consultation-online",
      "/ireland/en/lab-tests/blood-panel",
      "/ireland/en/blog/example",
      "/ireland/en/legal/terms-of-service",
      "/ireland/en/health/diabetes",
      "/ireland/en/tools/bmi-calculator",
      "/ireland/en/pricing",
      "/ireland/en/book",
      "/blog/example",
      "/about",
      "/contact",
      "/faq",
      "/privacy",
      "/terms",
    ]) {
      const blockedBy = prefixes.find((p) => path.startsWith(p));
      expect(blockedBy, `${path} blocked by robots rule "${blockedBy}"`).toBeUndefined();
    }
  });

  it("references the sitemap on the production origin", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(robots().sitemap).toBe(`${PROD_SITE_URL}/sitemap.xml`);
    expect(String(robots().sitemap).startsWith("https://")).toBe(true);
  });

  it("keeps the AI answer-engine crawlers explicitly allowed", () => {
    // AEO eligibility (ChatGPT/Claude/Gemini/Perplexity citations) depends on
    // these named rules existing. Dropping one silently loses that surface.
    const agents = rulesArray()
      .map((r) => r.userAgent)
      .filter((ua): ua is string => typeof ua === "string");
    for (const bot of [
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "ClaudeBot",
      "Claude-SearchBot",
      "Claude-User",
      "anthropic-ai",
      "Google-Extended",
      "Gemini-Deep-Research",
      "PerplexityBot",
      "Perplexity-User",
    ]) {
      expect(agents).toContain(bot);
    }
  });

  it("gives every AI crawler the same restrictions as the wildcard agent", () => {
    // Divergence here is the failure mode: a portal path blocked for Google
    // but open to GPTBot leaks authenticated-area URLs into AI training/search.
    const wildcard = rulesArray().find((r) => r.userAgent === "*");
    const expected = [...(wildcard?.disallow as string[])].sort();
    for (const rule of rulesArray()) {
      expect([...(rule.disallow as string[])].sort()).toEqual(expected);
      expect(rule.allow).toBe("/");
    }
  });
});
