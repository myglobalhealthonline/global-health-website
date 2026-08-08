import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

/**
 * Rule-ORDER regression cover for the legacy doctor slug corrections
 * (SEO legacy-redirect-recovery batch, 2026-08-08).
 *
 * Next matches `redirects()` in array order and stops at the first hit. The
 * broad `/{country}-doctors/:slug` rules rewrite the slug UNCHANGED, so any
 * slug that was renamed on the new platform lands on a 404 unless a specific
 * rule sits earlier in the array. That is precisely how these URLs were
 * losing their Google equity, and it is silent — the redirect still returns
 * 308, it just points at nothing.
 *
 * So the assertion that matters is not "a rule exists" but "the SPECIFIC rule
 * wins". Moving a specific rule below its broad sibling would leave every
 * other test green while quietly restoring the bug.
 */

type Rule = { source: string; destination: string; permanent: boolean };

async function rules(): Promise<Rule[]> {
  const cfg = (nextConfig as unknown as { default?: { redirects: () => Promise<Rule[]> } }).default
    ?? (nextConfig as unknown as { redirects: () => Promise<Rule[]> });
  return cfg.redirects();
}

/**
 * Mimics Next's `source` matching closely enough for ordering assertions:
 * `:name(a|b)` becomes that alternation, a bare `:name` becomes a single
 * non-empty segment. Anchored, because Next anchors too.
 */
/**
 * Single left-to-right scan. A regex-replace approach cannot do this: a
 * constrained param's own body may contain `(?:` / `(?!` groups (the gone-slug
 * exclusion does), and a later `:param` pass then eats the `:` out of `(?:`.
 * Consuming balanced parens as one unit is the only thing that stays correct.
 */
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
          // Consume to the matching close paren, tracking nesting.
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
    out += /[.+^${}[\]\\]/.test(ch) ? `\\${ch}` : ch;
    i++;
  }
  return new RegExp(`^${out}/?$`);
}

/** The rule Next would actually apply: first match wins. */
function firstMatch(all: Rule[], path: string): { rule: Rule; index: number } | null {
  for (let i = 0; i < all.length; i++) {
    if (toRegex(all[i].source).test(path)) return { rule: all[i], index: i };
  }
  return null;
}

function resolve(all: Rule[], path: string): string {
  const hit = firstMatch(all, path);
  if (!hit) return path;
  const m = toRegex(hit.rule.source).exec(path)!;
  let dest = hit.rule.destination;
  const names = [...hit.rule.source.matchAll(/:(\w+)/g)].map((x) => x[1]);
  names.forEach((n, i) => {
    dest = dest.replace(new RegExp(`:${n}\\b`, "g"), m[i + 1] ?? "");
  });
  return dest;
}

/** old path -> the corrected live slug it must reach, in ONE hop. */
const CORRECTIONS: Array<[string, string]> = [
  ["/ireland-doctors/dr-miraim-faiz", "/ireland/en/doctors/dr-mariam-faiz"],
  ["/pt/ireland-doctors/dr-miraim-faiz", "/ireland/en/doctors/dr-mariam-faiz"],
  ["/cs/ireland-doctors/dr-miraim-faiz", "/ireland/en/doctors/dr-mariam-faiz"],
  ["/es/ireland-doctors/dr-miraim-faiz", "/ireland/en/doctors/dr-mariam-faiz"],
  ["/ro/ireland-doctors/dr-miraim-faiz", "/ireland/en/doctors/dr-mariam-faiz"],
  [
    "/ireland-doctors/silvia-alexandra-raminhos-fernandes",
    "/ireland/en/doctors/silvia-alexandre-fernandes",
  ],
  [
    "/pt/ireland-doctors/silvia-alexandra-raminhos-fernandes",
    "/ireland/en/doctors/silvia-alexandre-fernandes",
  ],
];

/**
 * Legacy-redirect-recovery batch 2 (2026-08-08): the Vitor Pais mapping and
 * five collapsed 2-hop chains (broad rule -> alias-slug page redirect,
 * flattened to one). Same "specific rule must win, in one hop" property as
 * CORRECTIONS above, kept in a separate table because the entities span four
 * different countries instead of just Ireland.
 */
const CORRECTIONS_BATCH2: Array<[string, string]> = [
  ["/portugal-doctors/dr-vitor-pais", "/portugal/pt/doctors/dr-vitor-hugo-de-matos-pais"],
  ["/pt/portugal-doctors/dr-vitor-pais", "/portugal/pt/doctors/dr-vitor-hugo-de-matos-pais"],
  ["/cs/portugal-doctors/dr-vitor-pais", "/portugal/pt/doctors/dr-vitor-hugo-de-matos-pais"],
  ["/es/portugal-doctors/dr-vitor-pais", "/portugal/pt/doctors/dr-vitor-hugo-de-matos-pais"],
  ["/ro/portugal-doctors/dr-vitor-pais", "/portugal/pt/doctors/dr-vitor-hugo-de-matos-pais"],
  ["/ireland-doctors/dr.-mohamed-fadzly-mustafar", "/ireland/en/doctors/dr-mohamed-fadzly-bin-mohamed"],
  ["/pt/ireland-doctors/dr.-mohamed-fadzly-mustafar", "/ireland/en/doctors/dr-mohamed-fadzly-bin-mohamed"],
  ["/ireland-doctors/dr-khoiamul-islam", "/ireland/en/doctors/khoiamul-islam"],
  ["/ro/ireland-doctors/dr-khoiamul-islam", "/ireland/en/doctors/khoiamul-islam"],
  ["/ireland-doctors/dr-maristela-ferro-nepomuceno", "/ireland/en/doctors/maristela-ferro-nepomuceno"],
  ["/pt/ireland-doctors/dr-maristela-ferro-nepomuceno", "/ireland/en/doctors/maristela-ferro-nepomuceno"],
  ["/ro/ireland-doctors/dr-maristela-ferro-nepomuceno", "/ireland/en/doctors/maristela-ferro-nepomuceno"],
  ["/czechia-doctors/mudr-ahmed-maklad", "/czechia/cs/doctors/dr-ahmed-maklad"],
  ["/cs/czechia-doctors/mudr-ahmed-maklad", "/czechia/cs/doctors/dr-ahmed-maklad"],
  ["/es/czechia-doctors/mudr-ahmed-maklad", "/czechia/cs/doctors/dr-ahmed-maklad"],
  ["/ro/czechia-doctors/mudr-ahmed-maklad", "/czechia/cs/doctors/dr-ahmed-maklad"],
  ["/spain-doctors/javier-villarte-betancor", "/spain/es/doctors/dr-javier-villarte-betancor"],
  ["/es/spain-doctors/javier-villarte-betancor", "/spain/es/doctors/dr-javier-villarte-betancor"],
  ["/cs/spain-doctors/javier-villarte-betancor", "/spain/es/doctors/dr-javier-villarte-betancor"],
];

describe("legacy doctor slug corrections", () => {
  it.each(CORRECTIONS)("%s resolves to the corrected slug", async (from, to) => {
    expect(resolve(await rules(), from)).toBe(to);
  });

  it("the specific rule wins over the broad /{country}-doctors/:slug rule", async () => {
    const all = await rules();
    for (const [from] of CORRECTIONS) {
      const hit = firstMatch(all, from)!;
      expect(hit, from).not.toBeNull();
      // The winning rule must name the slug literally, not capture it.
      expect(hit.rule.source, `${from} was captured by a broad rule`).not.toMatch(/:slug/);
    }
  });

  it("every correction sits earlier in the array than every rule that would swallow it", async () => {
    const all = await rules();
    for (const [from] of CORRECTIONS) {
      const specific = firstMatch(all, from)!.index;
      const broadIndexes = all
        .map((r, i) => ({ r, i }))
        .filter(({ r, i }) => i !== specific && /:slug/.test(r.source) && toRegex(r.source).test(from))
        .map(({ i }) => i);
      for (const b of broadIndexes) {
        expect(specific, `${from}: specific rule #${specific} must precede broad rule #${b}`).toBeLessThan(b);
      }
    }
  });

  it("is a single hop — no destination is itself redirected again", async () => {
    const all = await rules();
    for (const [, to] of CORRECTIONS) {
      expect(firstMatch(all, to), `${to} is itself a redirect source — that is a chain`).toBeNull();
    }
  });

  it("is permanent", async () => {
    const all = await rules();
    for (const [from] of CORRECTIONS) {
      expect(firstMatch(all, from)!.rule.permanent).toBe(true);
    }
  });

  it("never leaves the market or corrupts the locale", async () => {
    const all = await rules();
    for (const [from] of CORRECTIONS) {
      const dest = resolve(all, from);
      // Source names the Ireland roster; destination must stay /ireland/en/.
      expect(from).toMatch(/ireland-doctors/);
      expect(dest.startsWith("/ireland/en/doctors/"), `${from} -> ${dest}`).toBe(true);
      expect(dest).not.toMatch(/:\w+/); // no unsubstituted params
      expect(dest).not.toMatch(/\/(cs|es|pt|ro|de)\//); // no locale leaked into the path
    }
  });

  it("does not terminate on a slug the broad rule would have produced", async () => {
    // The whole point: the naive rewrite is what 404s.
    const all = await rules();
    expect(resolve(all, "/ireland-doctors/dr-miraim-faiz")).not.toBe(
      "/ireland/en/doctors/dr-miraim-faiz",
    );
    expect(resolve(all, "/ireland-doctors/silvia-alexandra-raminhos-fernandes")).not.toBe(
      "/ireland/en/doctors/silvia-alexandra-raminhos-fernandes",
    );
  });

  it("the order guard actually bites — reordering reintroduces the 404", async () => {
    // Proves the assertions above are load-bearing rather than vacuous: with
    // the specific rules moved after their broad sibling, the resolver hands
    // back the naive slug — the exact 404 this batch fixed.
    const all = await rules();
    const specific = all.filter((r) => /dr-miraim-faiz/.test(r.source));
    const rest = all.filter((r) => !/dr-miraim-faiz/.test(r.source));
    expect(specific.length).toBeGreaterThan(0);
    const broken = [...rest, ...specific];
    expect(resolve(broken, "/ireland-doctors/dr-miraim-faiz")).toBe(
      "/ireland/en/doctors/dr-miraim-faiz", // 404 — what production was doing
    );
  });

  it("leaves untouched slugs on the broad rule", async () => {
    const all = await rules();
    expect(resolve(await rules(), "/ireland-doctors/dr-raza-khan")).toBe(
      "/ireland/en/doctors/dr-raza-khan",
    );
    expect(firstMatch(all, "/ireland-doctors/dr-raza-khan")!.rule.source).toMatch(/:slug/);
  });
});

/**
 * Batch 2 (2026-08-08): Vitor Pais plus five collapsed 2-hop chains. Same
 * "specific rule wins, one hop, permanent" property as CORRECTIONS above.
 */
describe("legacy-redirect-recovery batch 2", () => {
  it.each(CORRECTIONS_BATCH2)("%s resolves to the corrected slug", async (from, to) => {
    expect(resolve(await rules(), from)).toBe(to);
  });

  it("the specific rule wins over its broad sibling, for every entry", async () => {
    const all = await rules();
    for (const [from] of CORRECTIONS_BATCH2) {
      const hit = firstMatch(all, from)!;
      expect(hit, from).not.toBeNull();
      expect(hit.rule.source, `${from} was captured by a broad rule`).not.toMatch(/:slug/);
    }
  });

  it("every correction sits earlier in the array than every rule that would swallow it", async () => {
    const all = await rules();
    for (const [from] of CORRECTIONS_BATCH2) {
      const specific = firstMatch(all, from)!.index;
      const broadIndexes = all
        .map((r, i) => ({ r, i }))
        .filter(({ r, i }) => i !== specific && /:slug/.test(r.source) && toRegex(r.source).test(from))
        .map(({ i }) => i);
      for (const b of broadIndexes) {
        expect(specific, `${from}: specific rule #${specific} must precede broad rule #${b}`).toBeLessThan(b);
      }
    }
  });

  it("is a single hop — no destination is itself redirected again", async () => {
    const all = await rules();
    for (const [, to] of CORRECTIONS_BATCH2) {
      expect(firstMatch(all, to), `${to} is itself a redirect source — that is a chain`).toBeNull();
    }
  });

  it("is permanent and stays within the source URL's own market", async () => {
    const all = await rules();
    const marketOf = (path: string) =>
      /ireland-doctors/.test(path)
        ? "ireland"
        : /czechia-doctors/.test(path)
          ? "czechia"
          : /spain-doctors/.test(path)
            ? "spain"
            : /portugal-doctors/.test(path)
              ? "portugal"
              : null;
    for (const [from, to] of CORRECTIONS_BATCH2) {
      expect(firstMatch(all, from)!.rule.permanent).toBe(true);
      const market = marketOf(from);
      expect(market, from).not.toBeNull();
      expect(to.startsWith(`/${market}/`), `${from} -> ${to} left its own market`).toBe(true);
      expect(to).not.toMatch(/:\w+/); // no unsubstituted params
    }
  });

  it("does not terminate on the naive slug the broad rule alone would have produced", async () => {
    const all = await rules();
    expect(resolve(all, "/czechia-doctors/mudr-ahmed-maklad")).not.toBe(
      "/czechia/cs/doctors/mudr-ahmed-maklad", // the intermediate hop this batch flattened away
    );
    expect(resolve(all, "/portugal-doctors/dr-vitor-pais")).not.toBe(
      "/portugal/pt/doctors/dr-vitor-pais", // 404 before this batch — no such live slug
    );
  });
});
