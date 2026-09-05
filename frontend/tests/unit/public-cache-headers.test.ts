import { describe, expect, it } from "vitest";
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import nextConfig from "../../next.config";
import { countries } from "@/data/countries";

/**
 * FE-1 — the public shared-cache policy must reach ONLY localized public
 * country pages.
 *
 * `headers()` carries a family of rules shaped `/:country/:lang…` that hand
 * out `public, s-maxage=60, stale-while-revalidate=300`. Both params were
 * unconstrained, so path-to-regexp — the matcher Next itself compiles these
 * sources with — read any two-segment path as a country/locale pair:
 * `/admin/doctors`, `/account/profile`, `/api/example`, `/doctor/…` and the
 * portal, payment and print surfaces all collected a header telling every
 * CDN and reverse proxy in front of the origin that the response is shared
 * cacheable. The deeper rules widened it further: `/api/admin/doctors/:id`
 * matched `/:country/:lang/(…|doctors|…)/:slug`.
 *
 * Cookies, auth and dynamic rendering may each keep such a response out of a
 * cache in practice, but a response that explicitly SAYS `public` cannot rely
 * on them — the header is the contract, so it is what this test pins.
 *
 * Uses `next/dist/compiled/path-to-regexp` (the same compiled copy Next uses,
 * and the same harness as `redirect-chains.test.ts`) so the assertions run on
 * real matcher semantics, not on how the source string reads.
 */

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

/** The exact policy under test. Pinned as a literal so a change to the
 *  durations fails here rather than being silently followed. */
const PUBLIC_PAGE_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

const rules = (await nextConfig.headers!()) as HeaderRule[];

const matchers = rules.map((rule) => {
  // Next bundles a path-to-regexp whose call returns the RegExp directly and
  // fills a `keys` array; newer ones return `{ regexp, keys }`. Accept both,
  // as redirect-chains.test.ts does.
  const keys: Array<{ name: string | number }> = [];
  const built = pathToRegexp(rule.source, keys) as RegExp | { regexp: RegExp };
  return { rule, regexp: built instanceof RegExp ? built : built.regexp };
});

/**
 * The Cache-Control a request would actually come back with. Next applies
 * every matching rule in array order and a later rule wins on a repeated
 * header key (the media-proxy rule at the end of `headers()` relies on
 * exactly that), so the LAST match is the effective value.
 */
function cacheControlFor(pathname: string): string | null {
  let value: string | null = null;
  for (const { rule, regexp } of matchers) {
    if (!regexp.test(pathname)) continue;
    for (const header of rule.headers) {
      if (header.key.toLowerCase() === "cache-control") value = header.value;
    }
  }
  return value;
}

/* ------------------------------------------------------------------ *
 * Canonical markets — read from the repository's own country registry so
 * this test cannot drift into a second country/locale source.
 * ------------------------------------------------------------------ */

const COUNTRY_SEGMENTS = countries.flatMap((c) => [c.slug, c.code]);
/** Every locale any market declares. `next.config.ts` constrains `:lang` to
 *  this union uniformly, exactly as its redirect rules already do. */
const LOCALE_SEGMENTS = [...new Set(countries.flatMap((c) => c.supportedLocales))].sort();

describe("FE-1 — public cache header is scoped to localized public country routes", () => {
  it("the canonical registry still describes six markets and six locales", () => {
    expect(countries.map((c) => c.code).sort()).toEqual(["br", "cz", "es", "ie", "pt", "ro"]);
    expect(countries.map((c) => c.slug).sort()).toEqual([
      "brazil",
      "czechia",
      "ireland",
      "portugal",
      "romania",
      "spain",
    ]);
    expect(LOCALE_SEGMENTS).toEqual(["cs", "de", "en", "es", "pt", "ro"]);
  });

  it("every valid country/locale landing route keeps the public policy", () => {
    for (const country of COUNTRY_SEGMENTS) {
      for (const lang of LOCALE_SEGMENTS) {
        expect(cacheControlFor(`/${country}/${lang}`), `/${country}/${lang}`).toBe(
          PUBLIC_PAGE_CACHE,
        );
      }
    }
  });

  it("the six market defaults named in the FE-1 brief keep the public policy", () => {
    for (const path of ["/ie/en", "/cz/cs", "/pt/pt", "/es/es", "/ro/ro", "/br/pt"]) {
      expect(cacheControlFor(path), path).toBe(PUBLIC_PAGE_CACHE);
    }
  });

  it("the localized public sub-routes keep the public policy", () => {
    const paths = [
      "/ireland/en/gp-consultation-online",
      "/ireland/en/see-a-specialist",
      "/ireland/en/repeat-prescription-request",
      "/ireland/en/lab-tests",
      "/ireland/en/doctors",
      "/ireland/en/blog",
      "/ireland/en/lab-tests/full-blood-count",
      "/ireland/en/doctors/dr-example",
      "/ireland/en/blog/example-post",
      "/ireland/en/services/example-service",
      "/ireland/en/health/example-page",
      "/ireland/en/tools/bmi-calculator",
      "/ireland/en/legal",
      "/ireland/en/legal/privacy-policy",
      "/czechia/cs/doctors",
      "/brazil/pt/blog/example-post",
      "/ie/en/doctors",
    ];
    for (const path of paths) {
      expect(cacheControlFor(path), path).toBe(PUBLIC_PAGE_CACHE);
    }
  });

  it("authenticated, API and non-public surfaces never receive the public policy", () => {
    const paths = [
      // Two-segment sensitive surfaces — the original finding.
      "/admin/doctors",
      "/admin/patients",
      "/account/profile",
      "/account/medical-files",
      "/api/example",
      "/api/health",
      "/doctor/appointments",
      "/doctor/patients",
      "/corporate/dashboard",
      "/corporate/employees",
      "/pay/example",
      "/print/example",
      "/share/example",
      "/unauthorized/example",
      "/checkout/success",
      "/card-verify/example",
      "/reviews/rate",
      "/brazil/consent",
      // Deeper sensitive paths the sub-route rules also reached.
      "/api/admin/doctors/example-id",
      "/api/admin/services/example-id",
      "/api/doctor/services/example-id",
      "/admin/countries/example-id/legal",
      "/doctor/profile/ireland",
      // Invalid country / locale combinations.
      "/ie/invalid",
      "/invalid/en",
      "/invalid/invalid",
    ];
    for (const path of paths) {
      expect(cacheControlFor(path), path).not.toBe(PUBLIC_PAGE_CACHE);
    }
  });

  it("the media proxy keeps its own (different) public policy", () => {
    expect(cacheControlFor("/api/media/doctor-1-profile")).toBe(
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
  });

  it("no rule later in the array re-applies the public policy to a private path", () => {
    // `cacheControlFor` already resolves last-match-wins; this pins the
    // complementary property — that no rule carrying the public policy has a
    // source able to match a private path at all, so rule ORDER can neither
    // rescue nor break the assertions above.
    const publicRules = matchers.filter(({ rule }) =>
      rule.headers.some(
        (h) => h.key.toLowerCase() === "cache-control" && h.value === PUBLIC_PAGE_CACHE,
      ),
    );
    expect(publicRules.length).toBeGreaterThan(0);
    for (const path of ["/admin/doctors", "/account/profile", "/api/example", "/doctor/x"]) {
      for (const { rule, regexp } of publicRules) {
        expect(regexp.test(path), `${rule.source} must not match ${path}`).toBe(false);
      }
    }
  });
});
