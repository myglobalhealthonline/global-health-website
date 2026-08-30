import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

/**
 * Sick-cert legacy-signal consolidation (ranking-growth batch, 2026-08-09).
 *
 * The ES/RO `/health/sick-cert-online` variants had a canonical tag pointing
 * at the service page (2026-08-03) but stayed `index,follow` — Google kept
 * them independently indexed and ranking (168 impr/pos 28.1, 13 impr/pos
 * 16.3 over 90 days) despite the foreign canonical. This batch retires all
 * six locale variants behind a real redirect instead. `/ireland/sick-leave`
 * already redirected to the service page (2026-07-24 sweep) — covered here
 * only as a regression guard, not a new rule.
 */

type Rule = { source: string; destination: string; permanent: boolean };

async function rules(): Promise<Rule[]> {
  const cfg = (nextConfig as unknown as { default?: { redirects: () => Promise<Rule[]> } }).default
    ?? (nextConfig as unknown as { redirects: () => Promise<Rule[]> });
  return cfg.redirects();
}

// Same left-to-right param scanner as legacy-doctor-redirects.test.ts — kept
// local rather than shared, matching that file's own precedent.
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

const HEALTH_ALIAS_LOCALES = ["en", "pt", "es", "cs", "ro", "de"];

describe("sick-cert-online health alias — retired behind a redirect", () => {
  it.each(HEALTH_ALIAS_LOCALES)("/ireland/%s/health/sick-cert-online resolves to the service page", (lang) => {
    return rules().then((all) => {
      expect(resolve(all, `/ireland/${lang}/health/sick-cert-online`)).toBe(
        `/ireland/${lang}/services/sick-certificate-ireland`,
      );
    });
  });

  it("is a single hop — the service page destination is not itself a redirect source", async () => {
    const all = await rules();
    for (const lang of HEALTH_ALIAS_LOCALES) {
      const dest = `/ireland/${lang}/services/sick-certificate-ireland`;
      expect(firstMatch(all, dest), `${dest} is itself a redirect source — that is a chain`).toBeNull();
    }
  });

  it("is permanent and matched by the specific rule, not a broader health/:slug pattern", async () => {
    const all = await rules();
    for (const lang of HEALTH_ALIAS_LOCALES) {
      const from = `/ireland/${lang}/health/sick-cert-online`;
      const hit = firstMatch(all, from)!;
      expect(hit, from).not.toBeNull();
      expect(hit.rule.permanent).toBe(true);
      expect(hit.rule.source, `${from} was captured by a broader rule`).not.toMatch(/:slug/);
    }
  });

  it("does not disturb the sibling international-students retirement", async () => {
    const all = await rules();
    expect(resolve(all, "/ireland/en/health/international-students")).toBe(
      "/ireland/en/gp-consultation-online",
    );
  });

  it("leaves unrelated /health/ pages self-canonical (no rule fires)", async () => {
    const all = await rules();
    for (const slug of ["diabetes", "hypertension", "migraine", "expat-healthcare"]) {
      expect(firstMatch(all, `/ireland/en/health/${slug}`)).toBeNull();
    }
  });
});

describe("/ireland/sick-leave — regression guard (fixed 2026-07-24, not new this batch)", () => {
  it("resolves to the service page in one hop", async () => {
    const all = await rules();
    // Both the bare and the localized legacy path land on the SAME canonical
    // service URL. The second expectation used to assert the bare
    // /ireland/en/sick-certificate-ireland slug, which contradicted this
    // test's own title and the line above it. Verified against production
    // 2026-08-30: /ireland/en/sick-leave 308s to
    // /ireland/en/services/sick-certificate-ireland, so the rule is right and
    // the expectation was stale.
    expect(resolve(all, "/ireland/sick-leave")).toBe("/ireland/en/services/sick-certificate-ireland");
    expect(resolve(all, "/ireland/en/sick-leave")).toBe(
      "/ireland/en/services/sick-certificate-ireland",
    );
  });

  it("the exact rule wins over the broad /ireland/:slug catch-all", async () => {
    const all = await rules();
    const hit = firstMatch(all, "/ireland/sick-leave")!;
    expect(hit.rule.source).not.toMatch(/:slug/);
  });

  it("is permanent", async () => {
    const all = await rules();
    expect(firstMatch(all, "/ireland/sick-leave")!.rule.permanent).toBe(true);
  });
});

describe("current informational + transactional pages are untouched", () => {
  it("neither the blog article nor the service page matches any redirect rule", async () => {
    const all = await rules();
    expect(firstMatch(all, "/ireland/en/blog/sick-certificate-ireland-employee-rights")).toBeNull();
    for (const lang of HEALTH_ALIAS_LOCALES) {
      expect(firstMatch(all, `/ireland/${lang}/services/sick-certificate-ireland`)).toBeNull();
    }
  });
});
