import { describe, expect, it } from "vitest";
import { pathToRegexp, compile } from "next/dist/compiled/path-to-regexp";
import nextConfig from "../../next.config";

/**
 * Every redirect must land on its target in ONE hop.
 *
 * `seo-live-urls` already asserts that no redirect terminates in a 404, but it
 * probes production and follows up to 5 hops — a rule that redirects into
 * another rule passes it while quietly costing a hop and leaking PageRank.
 * This is the offline half: it reads the same ordered rule list Next itself
 * evaluates and re-feeds each destination through it.
 *
 * It exists because of the 2026-08-15 batch. Retiring `/about`, `/blog` and
 * `/faq` meant five pre-existing rules that terminated on those paths
 * (`/pt/about`, `/careers` x2, `/{locale}/blog`, `/{locale}/about`,
 * `/frequent-asked-questions`) would each have become a two-hop chain if they
 * had been left pointing where they were. They were repointed; this proves it,
 * and fails if anyone repoints them back or adds a rule that lands on a source.
 *
 * Offline and always runs — no network, no SEO_CHECK_BASE gate.
 */

type Rule = { source: string; destination: string; permanent?: boolean };

/** Sample values for parameterised sources, so they can be followed too. */
const SAMPLES: Record<string, string> = {
  locale: "pt",
  slug: "example-slug",
  country: "ireland",
  lang: "en",
  n: "2",
  path: "example",
  type: "privacy-policy",
  serviceSlug: "example-service",
  id: "example-id",
  all: "example.png",
};

const rules = (await nextConfig.redirects!()) as Rule[];

const matchers = rules.map((rule) => {
  try {
    // Next bundles an older path-to-regexp whose call returns the RegExp
    // directly and fills a `keys` array; newer ones return `{ regexp, keys }`.
    // Accept both so this test doesn't break on a Next upgrade.
    const keys: Array<{ name: string | number }> = [];
    const built = pathToRegexp(rule.source, keys) as RegExp | { regexp: RegExp };
    const regexp = built instanceof RegExp ? built : built.regexp;
    return {
      rule,
      regexp,
      keys,
      toDestination: compile(rule.destination, { validate: false }),
    };
  } catch {
    // A source path-to-regexp cannot parse is a separate problem; skip it here
    // rather than failing this test for the wrong reason.
    return null;
  }
});

/** First matching rule wins — the same order Next applies. */
function resolveOnce(path: string): { rule: Rule; destination: string } | null {
  for (const entry of matchers) {
    if (!entry) continue;
    const match = entry.regexp.exec(path);
    if (!match) continue;
    const params: Record<string, string> = {};
    entry.keys.forEach((key, i) => {
      const name = String(key.name);
      params[name] = match[i + 1] ?? SAMPLES[name] ?? "x";
    });
    let destination = entry.rule.destination;
    try {
      destination = entry.toDestination(params);
    } catch {
      // Destination needs a param the source didn't supply — leave it literal.
    }
    return { rule: entry.rule, destination };
  }
  return null;
}

/** A source with its `:params` filled in, so it can be fed to the matcher. */
function concreteSource(source: string): string {
  return source
    .replace(/:([A-Za-z0-9_]+)\([^)]*\)/g, (_, name: string) => SAMPLES[name] ?? "x")
    .replace(/:([A-Za-z0-9_]+)\*/g, (_, name: string) => SAMPLES[name] ?? "x")
    .replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => SAMPLES[name] ?? "x");
}

describe("redirect map", () => {
  it("has redirects configured", () => {
    expect(rules.length).toBeGreaterThan(0);
  });

  it("never redirects to a path that is itself redirected (no chains, no loops)", () => {
    const chains: string[] = [];

    for (const rule of rules) {
      const start = concreteSource(rule.source);
      const first = resolveOnce(start);
      if (!first) continue;

      const second = resolveOnce(first.destination);
      if (!second) continue;

      // A rule whose destination re-matches ITSELF (e.g. a `:path*` catch-all
      // that also matches its own target) is a loop, not merely a chain.
      const kind = second.rule.source === first.rule.source ? "LOOP" : "CHAIN";
      chains.push(
        `${kind}: ${rule.source} -> ${first.destination} -> ${second.destination}` +
          ` (second rule: ${second.rule.source})`,
      );
    }

    expect(chains).toEqual([]);
  });

  it("keeps the retired global pages pointing straight at a country page", () => {
    // The 2026-08-15 retirement. Each must be present, permanent, and land on a
    // /{country}/{lang}/... path rather than another bare global URL.
    for (const source of ["/about", "/faq", "/blog"]) {
      const rule = rules.find((r) => r.source === source);
      expect(rule, `${source} has no redirect`).toBeDefined();
      expect(rule!.permanent, `${source} must be a 301`).toBe(true);
      expect(rule!.destination).toMatch(/^\/[a-z]+\/[a-z]{2}\//);
    }
  });

  it("has no redirect still terminating on a retired page", () => {
    const retired = new Set(["/about", "/faq", "/blog"]);
    const offenders = rules
      .filter((r) => retired.has(r.destination))
      .map((r) => `${r.source} -> ${r.destination}`);

    expect(offenders).toEqual([]);
  });
});
