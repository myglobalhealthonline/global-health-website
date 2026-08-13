import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

/**
 * SEO-GROWTH-004: /home-br 404'd while its sibling legacy Wix-era homepage
 * aliases (/home, /home-cz, /home-pt, /home-sp, /home-rm) all redirected
 * correctly. Pure omission from the bare-path block — the locale-prefixed
 * variants (/:locale(es|pt)/home-br, /:locale(cs|ro)/home-br) already
 * existed and correctly targeted Brazil, so the intended destination was
 * never in doubt. Brazil's canonical homepage is /brazil/pt (defaultLocale
 * "pt", slug "brazil" — data/countries.ts).
 *
 * Helper functions duplicated from atestado-medico-legacy-redirect.test.ts /
 * sick-cert-legacy-redirects.test.ts rather than shared, matching those
 * files' own stated precedent.
 */

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

describe("/home-br legacy Wix homepage alias — redirects to the modern canonical", () => {
  it("resolves to /brazil/pt", async () => {
    const all = await rules();
    expect(resolve(all, "/home-br")).toBe("/brazil/pt");
  });

  it("is permanent and matched by the exact rule, not a broader pattern", async () => {
    const all = await rules();
    const hit = firstMatch(all, "/home-br")!;
    expect(hit).not.toBeNull();
    expect(hit.rule.permanent).toBe(true);
    expect(hit.rule.source).toBe("/home-br");
  });

  it("is a single hop — /brazil/pt is not itself a redirect source", async () => {
    const all = await rules();
    expect(firstMatch(all, "/brazil/pt"), "/brazil/pt is itself a redirect source — that is a chain").toBeNull();
  });

  it("does not disturb the sibling bare legacy homepage redirects", async () => {
    const all = await rules();
    expect(resolve(all, "/home")).toBe("/");
    expect(resolve(all, "/home-cz")).toBe("/czechia/cs");
    expect(resolve(all, "/home-pt")).toBe("/portugal/pt");
    expect(resolve(all, "/home-sp")).toBe("/spain/es");
    expect(resolve(all, "/home-rm")).toBe("/romania/ro");
  });

  it("does not disturb the locale-prefixed /home-br variants that already worked", async () => {
    const all = await rules();
    expect(resolve(all, "/es/home-br")).toBe("/brazil/es");
    expect(resolve(all, "/pt/home-br")).toBe("/brazil/pt");
    expect(resolve(all, "/cs/home-br")).toBe("/brazil/pt");
    expect(resolve(all, "/ro/home-br")).toBe("/brazil/pt");
  });
});
