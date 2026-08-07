import { describe, expect, it } from "vitest";
import { isGonePath } from "../../lib/seo/gone-content";
import nextConfig from "../../next.config";

/**
 * Departed-clinician content returns 410 Gone from middleware.
 *
 * The property under test is not "410 is returned" but "410 is returned
 * INSTEAD of a redirect". The broad `/{country}-doctors/:slug` rule would
 * otherwise 308 these onto a URL that answers 410 — two hops to say "gone",
 * the first of which asserts a live successor that does not exist.
 *
 * Next evaluates `redirects()` BEFORE middleware, so the broad rule must
 * explicitly exclude the gone slug (lib/seo/gone-content.ts) or the 410 is
 * never reached. The suite below is what enforces that.
 */

type Rule = { source: string; destination: string; permanent: boolean };

async function rules(): Promise<Rule[]> {
  const cfg = (nextConfig as unknown as { default?: { redirects: () => Promise<Rule[]> } }).default
    ?? (nextConfig as unknown as { redirects: () => Promise<Rule[]> });
  return cfg.redirects();
}

/** Every URL shape Dr Gráinne Ahern was reachable at, per the 90-day GSC export. */
const GONE = [
  "/ireland-doctors/dr-grainne-ahern",
  "/en/ireland-doctors/dr-grainne-ahern",
  "/pt/ireland-doctors/dr-grainne-ahern",
  "/es/ireland-doctors/dr-grainne-ahern",
  "/cs/ireland-doctors/dr-grainne-ahern",
  "/ro/ireland-doctors/dr-grainne-ahern",
  "/de/ireland-doctors/dr-grainne-ahern",
  "/ireland/en/doctors/dr-grainne-ahern",
  "/ireland/pt/doctors/dr-grainne-ahern",
  "/ireland/es/doctors/dr-grainne-ahern",
  "/ireland/cs/doctors/dr-grainne-ahern",
  "/ireland/ro/doctors/dr-grainne-ahern",
  "/ireland/de/doctors/dr-grainne-ahern",
];

/** The four variants that actually carried traffic — must never regress. */
const GSC_OBSERVED = [
  "/ireland-doctors/dr-grainne-ahern", // 69 clicks / 489 impressions
  "/ireland/en/doctors/dr-grainne-ahern", // 5 / 101
  "/ireland/cs/doctors/dr-grainne-ahern", // 0 / 6
  "/ireland/ro/doctors/dr-grainne-ahern", // 0 / 4
];

describe("gone paths — departed clinician", () => {
  it.each(GONE)("%s is Gone", (p) => {
    expect(isGonePath(p)).toBe(true);
  });

  it.each(GSC_OBSERVED)("%s (had GSC traffic) is Gone", (p) => {
    expect(isGonePath(p)).toBe(true);
  });

  it("tolerates trailing slash, case and percent-encoding", () => {
    expect(isGonePath("/ireland-doctors/dr-grainne-ahern/")).toBe(true);
    expect(isGonePath("/Ireland-Doctors/Dr-Grainne-Ahern")).toBe(true);
    expect(isGonePath("/ireland-doctors/dr-grainne-ahern%2F")).toBe(true);
    expect(isGonePath("/ireland/en/doctors/dr-grainne-ahern//")).toBe(true);
  });

  it("does not throw on a malformed escape sequence", () => {
    expect(() => isGonePath("/ireland-doctors/%E0%A4%A")).not.toThrow();
    expect(isGonePath("/ireland-doctors/%E0%A4%A")).toBe(false);
  });
});

describe("gone paths — blast radius", () => {
  it("does not capture the two implemented redirect mappings", () => {
    for (const p of [
      "/ireland-doctors/dr-miraim-faiz",
      "/pt/ireland-doctors/dr-miraim-faiz",
      "/ireland/en/doctors/dr-mariam-faiz",
      "/ireland-doctors/silvia-alexandra-raminhos-fernandes",
      "/ireland/en/doctors/silvia-alexandre-fernandes",
    ]) {
      expect(isGonePath(p), p).toBe(false);
    }
  });

  it("does not capture live doctors, listings or unrelated routes", () => {
    for (const p of [
      "/ireland/en/doctors",
      "/ireland/en/doctors/dr-raza-khan",
      "/ireland-doctors/dr-raza-khan",
      "/ireland/en",
      "/",
      "/ireland/en/services/sick-certificate-ireland",
      "/portugal/pt/doctors/dr-pedro-santos",
    ]) {
      expect(isGonePath(p), p).toBe(false);
    }
  });

  it("does not capture a slug that merely contains the gone slug", () => {
    expect(isGonePath("/ireland/en/doctors/dr-grainne-ahern-jr")).toBe(false);
    expect(isGonePath("/ireland/en/doctors/not-dr-grainne-ahern")).toBe(false);
  });
});

describe("gone paths — no redirect may intercept the 410", () => {
  /** Same balanced-paren scan as legacy-doctor-redirects.test.ts. */
  function toRegex(source: string): RegExp {
    let out = "";
    let i = 0;
    while (i < source.length) {
      const ch = source[i];
      if (ch === ":") {
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
          } else if (source[i] === "*") { i++; out += "(.*)"; }
          else out += "([^/]+)";
          continue;
        }
      }
      out += /[.+^${}[\]\\]/.test(ch) ? `\\${ch}` : ch;
      i++;
    }
    return new RegExp(`^${out}/?$`);
  }

  it("NO redirect rule matches any gone path", async () => {
    // The load-bearing assertion. Next evaluates `redirects()` BEFORE
    // middleware (verified empirically 2026-08-08 — with only the middleware
    // entry in place, /ireland-doctors/dr-grainne-ahern still answered 308).
    // So a single matching rule anywhere in the table silently reinstates the
    // `legacy -> 308 -> dead URL` shape and the 410 is never reached.
    const all = await rules();
    // Trailing-slash forms included deliberately: `skipTrailingSlashRedirect`
    // means the slash survives to the matcher, and path-to-regexp compiles
    // non-strict. A `$`-anchored exclusion silently failed to exclude them —
    // `/ireland-doctors/dr-grainne-ahern/` answered 308 while every sibling
    // answered 410. Found live, not by reasoning; keep both forms covered.
    for (const p of [...GONE, ...GONE.map((g) => `${g}/`)]) {
      const matching = all.filter((r) => toRegex(r.source).test(p));
      expect(matching.map((r) => r.source), `${p} is intercepted by a redirect`).toEqual([]);
    }
  });

  it("the broad Ireland rule still redirects a LIVE doctor", async () => {
    // The exclusion must be surgical: it removes exactly the gone slug and
    // leaves every other legacy doctor URL recoverable.
    const all = await rules();
    const hit = all.find((r) => toRegex(r.source).test("/ireland-doctors/dr-raza-khan"));
    expect(hit, "broad Ireland doctor rule no longer matches live slugs").toBeDefined();
    expect(hit!.destination).toBe("/ireland/en/doctors/:slug");
  });

  it("the exclusion did not disturb the two slug corrections", async () => {
    const all = await rules();
    for (const p of [
      "/ireland-doctors/dr-miraim-faiz",
      "/ireland-doctors/silvia-alexandra-raminhos-fernandes",
    ]) {
      const first = all.find((r) => toRegex(r.source).test(p));
      expect(first, p).toBeDefined();
      expect(first!.source, `${p} must still hit its specific rule`).not.toMatch(/:slug/);
    }
  });
});
