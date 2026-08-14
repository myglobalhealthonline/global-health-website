import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { GONE_DOCTORS, GONE_PATHS } from "@/lib/seo/gone-content";

/**
 * §4 of `docs/plans/seo-implementation-brief-2026-08-14.md` — the build-time
 * assertion that retires a class of defect.
 *
 * The Czech 404s and the `gone-content.ts` policy were the same failure: a
 * redirect map and a removal list that nothing validates against the live
 * doctor set. The team catches these when something surfaces them; nothing
 * surfaces them. `SEO-GROWTH-002` sat in the ledger marked "CLOSED — VERIFIED
 * BY PRODUCTION CHECK" while the URL it named returned 404.
 *
 * Three assertions, one per bullet in §4:
 *   1. No redirect terminates in a 404. Every literal (non-parameterised)
 *      redirect source is followed to its terminal status.
 *   2. Every sitemap entry returns 200 AND is indexable. A `noindex` page
 *      listed in the sitemap is the defect; a `noindex` page absent from it is
 *      not (see the 2026-08-14 decision note in seo-control-state.md §5b).
 *   3. Every `GONE_DOCTORS` entry carries a click cost and a named approver,
 *      and actually answers 410.
 *
 * NETWORK-GATED. Assertions 1 and 2 need to know which slugs are real, which is
 * live data — a route-shape check would not have caught cyplinska/hlavaty/
 * lavrov at all, because `/czechia/[lang]/doctors/[slug]` exists; the slugs do
 * not. So this file is inert unless `SEO_CHECK_BASE` is set, and PR CI stays
 * offline and fast. The dedicated CI job sets it. Assertion 3 is offline and
 * always runs.
 *
 *   SEO_CHECK_BASE=https://www.myglobalhealth.online pnpm --filter frontend test seo-live-urls
 */

const BASE = process.env.SEO_CHECK_BASE?.replace(/\/+$/, "");
const live = BASE ? describe : describe.skip;

/** Concurrency cap. Politeness, and it keeps a full run under a minute. */
const POOL = 12;
const TIMEOUT_MS = 30_000;

type Probe = { url: string; status: number; hops: number; finalUrl: string; noindex: boolean };

async function probe(path: string, { readBody = false } = {}): Promise<Probe> {
  const url = BASE + path;
  let current = url;
  let hops = 0;
  for (;;) {
    const res = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "gh-seo-url-check/1.0" },
    });
    const location = res.headers.get("location");
    if (location && res.status >= 300 && res.status < 400) {
      if (hops >= 5) return { url, status: res.status, hops, finalUrl: current, noindex: false };
      current = new URL(location, current).toString();
      hops += 1;
      continue;
    }
    let noindex = false;
    if (readBody && res.ok) {
      const html = await res.text();
      // Next emits the robots meta as a `<meta name="robots" content="...">`
      // tag; `noindex` may sit alongside `nofollow`/`max-image-preview`.
      noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
    }
    return { url, status: res.status, hops, finalUrl: current, noindex };
  }
}

async function mapPool<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(POOL, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

type Rule = { source: string; destination: string; permanent: boolean };

async function redirectRules(): Promise<Rule[]> {
  const cfg = (nextConfig as unknown as { default?: { redirects: () => Promise<Rule[]> } }).default
    ?? (nextConfig as unknown as { redirects: () => Promise<Rule[]> });
  return cfg.redirects();
}

/** Sources with no `:param` — a literal URL we can actually request. */
const isLiteral = (source: string) => !/[:(*]/.test(source);

async function sitemapUrls(): Promise<string[]> {
  const res = await fetch(`${BASE}/sitemap.xml`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  expect(res.status, "sitemap.xml must be fetchable").toBe(200);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .filter((p, i, a) => a.indexOf(p) === i);
}

describe("GONE_DOCTORS entries are documented decisions, not oversights", () => {
  // Offline — this one runs on every PR.
  it.each(GONE_DOCTORS.map((d) => [d.slug, d] as const))(
    "%s carries a click cost and a named approver",
    (_slug, d) => {
      expect(d.clickCost.trim().length, `${d.slug}: clickCost is empty`).toBeGreaterThan(0);
      expect(d.approvedBy.trim().length, `${d.slug}: approvedBy is empty`).toBeGreaterThan(0);
      // A cost with no number is a sentence, not a measurement.
      expect(d.clickCost, `${d.slug}: clickCost quotes no figure`).toMatch(/\d/);
    },
  );

  it("no redirect rule points at a slug that is listed as gone", async () => {
    // The exact bug `slugMatcherExcludingGone` exists to prevent, asserted at
    // the rule level rather than trusting the lookahead compiled correctly.
    const rules = await redirectRules();
    for (const rule of rules) {
      for (const d of GONE_DOCTORS) {
        if (/:\w/.test(rule.destination)) continue; // parameterised — covered by the live pass
        expect(
          rule.destination.endsWith(`/${d.slug}`),
          `${rule.source} -> ${rule.destination} points at gone slug ${d.slug}`,
        ).toBe(false);
      }
    }
  });
});

live("live URL assertions (SEO_CHECK_BASE)", () => {
  it(
    "no redirect terminates in a 404",
    async () => {
      const rules = await redirectRules();
      const literal = rules.filter((r) => isLiteral(r.source));
      const parameterised = rules.length - literal.length;

      const results = await mapPool(literal, (r) => probe(r.source));
      const dead = results.filter((r) => r.status >= 400 && !GONE_PATHS.has(new URL(r.url).pathname));

      // No silent caps: say plainly what this pass could not cover.
      console.log(
        `[seo] probed ${literal.length} literal redirect sources; ` +
          `${parameterised} parameterised rules NOT covered (a :slug rule has no ` +
          `single URL to probe — its dead-slug failures are only visible against a ` +
          `legacy-slug corpus from GSC, which this check does not have).`,
      );

      expect(
        dead.map((r) => `${r.url} -> ${r.status} (${r.hops} hops, final ${r.finalUrl})`),
        "these redirects terminate in an error",
      ).toEqual([]);
    },
    300_000,
  );

  it(
    "the three Czech P0 fixtures resolve 200 in one hop",
    async () => {
      // Fixtures per §4: the exact URLs that were 308 -> 404 on 2026-08-14.
      const fixtures = [
        "/czechia-doctors/mudr-jana-cyplinska",
        "/czechia-doctors/mudr-libor-hlavaty",
        "/czechia-doctors/mudr-andrei-lavrov",
      ];
      const results = await mapPool(fixtures, (p) => probe(p));
      for (const r of results) {
        expect(r.status, `${r.url} -> ${r.status}`).toBe(200);
        expect(r.hops, `${r.url} took ${r.hops} hops`).toBeLessThanOrEqual(1);
      }
    },
    120_000,
  );

  it(
    "every sitemap entry returns 200 and is indexable",
    async () => {
      const paths = await sitemapUrls();
      const results = await mapPool(paths, (p) => probe(p, { readBody: true }));

      const notOk = results.filter((r) => r.status !== 200 || r.hops > 0);
      const noindexed = results.filter((r) => r.status === 200 && r.noindex);

      console.log(`[seo] checked ${paths.length} sitemap URLs`);
      expect(
        notOk.map((r) => `${r.url} -> ${r.status} (${r.hops} hops)`),
        "sitemap entries must be live, canonical URLs — not redirects or errors",
      ).toEqual([]);
      expect(
        noindexed.map((r) => r.url),
        "a noindex page listed in the sitemap is the defect (the reverse is not)",
      ).toEqual([]);
    },
    900_000,
  );

  it(
    "every GONE_DOCTORS URL shape actually answers 410",
    async () => {
      const paths = [...GONE_PATHS];
      const results = await mapPool(paths, (p) => probe(p));
      const wrong = results.filter((r) => r.status !== 410);
      expect(
        wrong.map((r) => `${r.url} -> ${r.status} (${r.hops} hops)`),
        "a listed-gone URL that does not answer 410 means the exclusion regressed",
      ).toEqual([]);
    },
    300_000,
  );
});
