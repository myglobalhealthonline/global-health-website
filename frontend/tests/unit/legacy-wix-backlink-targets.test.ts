import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

/**
 * Every URL an external site actually links to (off-site authority batch,
 * 2026-08-19).
 *
 * The backlink profile was pulled in full and reduced to 36 distinct target
 * paths. Seven of them returned a hard 404 in production, which is link equity
 * thrown away — and one of those, `/services-1-4`, is the only link the site
 * has from a genuine Irish pharmacy.
 *
 * The subtle one was `/product-page/thyroid-home-blood-test`: the redirect
 * existed and fired, but its destination
 * (`/ireland/en/lab-tests/thyroid-function-test`) has never been published, so
 * it was a 301 straight into a 404. A rule can be present, correct-looking and
 * still dead at the far end — the assertion below pins the destinations that
 * matter to slugs that exist.
 */

type Rule = { source: string; destination: string; permanent: boolean };

async function rules(): Promise<Rule[]> {
  const cfg = (nextConfig as unknown as { default?: { redirects: () => Promise<Rule[]> } }).default
    ?? (nextConfig as unknown as { redirects: () => Promise<Rule[]> });
  return cfg.redirects();
}

/** Irish lab-test slugs published on the live site, checked 2026-08-19. */
const LIVE_LAB_TESTS = new Set([
  "amh-fertility-test",
  "female-hormone-test",
  "fracture-risk-assessment-test",
  "general-health-test",
  "genetic-coeliac-disease-test",
  "genetic-haemochromatosis-test",
  "genetic-lactose-intolerance-test",
  "gut-microbiome-test",
  "heart-health-cholesterol-test",
  "male-hormone-test",
  "nutrition-lifestyle-dna-test",
  "psa-prostate-test",
  "vitamin-b12-test",
  "vitamin-d-test",
]);

describe("legacy Wix paths that carry backlinks", () => {
  it("never sends a lab-test redirect to a slug that is not published", async () => {
    const dead = (await rules())
      .map((r) => /^\/ireland\/(?:en|:locale)\/lab-tests\/([a-z0-9-]+)$/.exec(r.destination))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => m[1])
      .filter((slug) => !LIVE_LAB_TESTS.has(slug));
    expect([...new Set(dead)]).toEqual([]);
  });

  it("catches unlisted /product-page slugs instead of 404ing them", async () => {
    const all = await rules();
    const catchAll = all.findIndex((r) => r.source === "/product-page/:slug");
    const lastAlias = all.reduce(
      (acc, r, i) => (r.source.startsWith("/product-page/") && !r.source.includes(":") ? i : acc),
      -1,
    );
    expect(catchAll).toBeGreaterThan(-1);
    expect(all[catchAll]!.destination).toBe("/ireland/en/lab-tests");
    // First match wins, so the exact aliases have to be declared above it.
    expect(lastAlias).toBeGreaterThan(-1);
    expect(catchAll).toBeGreaterThan(lastAlias);
  });

  it("rescues the paths that were returning 404", async () => {
    const bySource = new Map((await rules()).map((r) => [r.source, r.destination]));
    const expected: Array<[string, string]> = [
      ["/services-1-4", "/ireland/en"],
      ["/pricing-plans/:slug", "/ireland/en/pricing"],
      ["/product-page/haemochromatosis-test", "/ireland/en/lab-tests/genetic-haemochromatosis-test"],
      ["/product-page/vitamin-d-blood-test", "/ireland/en/lab-tests/vitamin-d-test"],
      ["/product-page/vitamin-b12-blood-test", "/ireland/en/lab-tests/vitamin-b12-test"],
      // Linked with a stray slash before the apostrophe.
      ["/portugal/traveler/'s-consultation", "/portugal/pt/services/consulta-do-viajante"],
    ];
    for (const [source, destination] of expected) {
      expect(bySource.get(source), source).toBe(destination);
    }
  });

  it("points the apostrophe traveller slugs at the service page, not the hub", async () => {
    const bySource = new Map((await rules()).map((r) => [r.source, r.destination]));
    // Eight referring domains — the largest non-homepage cluster in the profile.
    for (const source of [
      "/portugal/traveler's-consultation",
      "/:locale(cs|es|pt|ro)/portugal/traveler's-consultation",
    ]) {
      expect(bySource.get(source), source).toBe("/portugal/pt/services/consulta-do-viajante");
    }
  });

  it("sends the full-length Wix blog slug to the article that exists", async () => {
    const bySource = new Map((await rules()).map((r) => [r.source, r.destination]));
    expect(bySource.get("/post/hand-foot-and-mouth-disease-signs-and-treatment")).toBe(
      "/ireland/en/blog/hand-foot-and-mouth-disease-signs-and-treatment",
    );
  });
});
