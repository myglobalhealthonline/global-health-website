import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

/**
 * SEO-GROWTH-005: /brazil-team, /general-consultation-br and /specialty-br
 * 404'd while every sibling market (Ireland, Czechia, Portugal, Spain,
 * Romania) had working bare-path redirects for the same three legacy
 * Wix-era route families. Same class of omission as /home-br
 * (SEO-GROWTH-004, home-br-legacy-redirect.test.ts): data/countries.ts
 * already declared `teamPath: "/brazil-team"`, `generalConsultationPath:
 * "/general-consultation-br"`, `specialistPath: "/specialty-br"`, and
 * lib/routing/legacy-route-map.ts already mapped all three prefixes to
 * "br" — the bare redirect rule in next.config.ts was simply never added.
 *
 * /specialty-br is NOT a copy of the sibling pattern: next.config.ts's own
 * HAS_SPECIALIST group (`"(ireland|portugal|spain|romania)"`) documents
 * that /see-a-specialist is off for Brazil, same as Czechia — visiting
 * /brazil/pt/see-a-specialist 404s (specialist-consultation/page.tsx
 * gates on the "specialist-consultations" country feature). So /specialty-br
 * follows the /specialty-cz precedent and lands on the country hub
 * (/brazil/pt), not on /brazil/pt/see-a-specialist.
 *
 * Helper functions duplicated from home-br-legacy-redirect.test.ts, matching
 * that file's own stated precedent (in turn duplicated from
 * atestado-medico-legacy-redirect.test.ts / sick-cert-legacy-redirects.test.ts).
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

describe("/brazil-team legacy Wix team alias — redirects to the modern canonical", () => {
  it("resolves to /brazil/pt/doctors", async () => {
    const all = await rules();
    expect(resolve(all, "/brazil-team")).toBe("/brazil/pt/doctors");
  });

  it("is permanent and matched by the exact rule, not a broader pattern", async () => {
    const all = await rules();
    const hit = firstMatch(all, "/brazil-team")!;
    expect(hit).not.toBeNull();
    expect(hit.rule.permanent).toBe(true);
    expect(hit.rule.source).toBe("/brazil-team");
  });

  it("is a single hop — /brazil/pt/doctors is not itself a redirect source", async () => {
    const all = await rules();
    expect(
      firstMatch(all, "/brazil/pt/doctors"),
      "/brazil/pt/doctors is itself a redirect source — that is a chain",
    ).toBeNull();
  });

  it("matches the sibling team redirects (Ireland, Portugal)", async () => {
    const all = await rules();
    expect(resolve(all, "/ireland-team")).toBe("/ireland/en/doctors");
    expect(resolve(all, "/portugal-team")).toBe("/portugal/pt/doctors");
  });
});

describe("/general-consultation-br legacy Wix alias — redirects to the modern canonical", () => {
  it("resolves to /brazil/pt/gp-consultation-online", async () => {
    const all = await rules();
    expect(resolve(all, "/general-consultation-br")).toBe("/brazil/pt/gp-consultation-online");
  });

  it("is permanent and matched by the exact rule, not a broader pattern", async () => {
    const all = await rules();
    const hit = firstMatch(all, "/general-consultation-br")!;
    expect(hit).not.toBeNull();
    expect(hit.rule.permanent).toBe(true);
    expect(hit.rule.source).toBe("/general-consultation-br");
  });

  it("is a single hop — /brazil/pt/gp-consultation-online is not itself a redirect source", async () => {
    const all = await rules();
    expect(
      firstMatch(all, "/brazil/pt/gp-consultation-online"),
      "/brazil/pt/gp-consultation-online is itself a redirect source — that is a chain",
    ).toBeNull();
  });

  it("matches the sibling general-consultation redirects (Ireland, Portugal)", async () => {
    const all = await rules();
    expect(resolve(all, "/general-consultation-ie")).toBe("/ireland/en/gp-consultation-online");
    expect(resolve(all, "/general-consultation-pt")).toBe("/portugal/pt/gp-consultation-online");
  });
});

describe("/specialty-br legacy Wix alias — redirects to the country hub (specialist-consultations is off for Brazil)", () => {
  it("resolves to /brazil/pt, NOT /brazil/pt/see-a-specialist", async () => {
    const all = await rules();
    expect(resolve(all, "/specialty-br")).toBe("/brazil/pt");
  });

  it("is permanent and matched by the exact rule, not a broader pattern", async () => {
    const all = await rules();
    const hit = firstMatch(all, "/specialty-br")!;
    expect(hit).not.toBeNull();
    expect(hit.rule.permanent).toBe(true);
    expect(hit.rule.source).toBe("/specialty-br");
  });

  it("is a single hop — /brazil/pt is not itself a redirect source", async () => {
    const all = await rules();
    expect(firstMatch(all, "/brazil/pt"), "/brazil/pt is itself a redirect source — that is a chain").toBeNull();
  });

  it("follows the /specialty-cz precedent (country hub), not the /specialty-pt precedent (see-a-specialist)", async () => {
    const all = await rules();
    // Czechia: specialist-consultations is also off — same hub fallback.
    expect(resolve(all, "/specialty-cz")).toBe("/czechia/cs");
    // Portugal: specialist-consultations IS on — goes straight to the listing.
    expect(resolve(all, "/specialty-pt")).toBe("/portugal/pt/see-a-specialist");
  });
});

describe("Brazil legacy redirects do not disturb existing coverage", () => {
  it("still resolves /home-br to /brazil/pt (SEO-GROWTH-004, unchanged)", async () => {
    const all = await rules();
    expect(resolve(all, "/home-br")).toBe("/brazil/pt");
  });
});
