import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

/**
 * Portugal atestado-medico-online health alias — retired behind a redirect
 * (ranking-growth batch, 2026-08-11). Same failure mode as Ireland's
 * sick-cert-online (see sick-cert-legacy-redirects.test.ts): the canonical
 * tag already pointed at /services/baixa-medica (SEO audit 2.4b), but Google
 * kept the ES/RO/PT alias variants independently indexed and ranking
 * Portugal's own "atestado médico online" query instead of the pt page or
 * the service page (ES alias ~108 PT-market impressions/3mo, PT alias ~39,
 * RO alias ~18). A real redirect is needed to fully consolidate the signal.
 *
 * Helper functions duplicated from sick-cert-legacy-redirects.test.ts rather
 * than shared, matching that file's own stated precedent.
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

const HEALTH_ALIAS_LOCALES = ["en", "pt", "es", "cs", "ro", "de"];

describe("atestado-medico-online health alias — retired behind a redirect", () => {
  it.each(HEALTH_ALIAS_LOCALES)(
    "/portugal/%s/health/atestado-medico-online resolves to the service page in its own locale",
    (lang) => {
      return rules().then((all) => {
        expect(resolve(all, `/portugal/${lang}/health/atestado-medico-online`)).toBe(
          `/portugal/${lang}/services/baixa-medica`,
        );
      });
    },
  );

  it("is a single hop — the service page destination is not itself a redirect source", async () => {
    const all = await rules();
    for (const lang of HEALTH_ALIAS_LOCALES) {
      const dest = `/portugal/${lang}/services/baixa-medica`;
      expect(firstMatch(all, dest), `${dest} is itself a redirect source — that is a chain`).toBeNull();
    }
  });

  it("is permanent and matched by the specific rule, not a broader health/:slug pattern", async () => {
    const all = await rules();
    for (const lang of HEALTH_ALIAS_LOCALES) {
      const from = `/portugal/${lang}/health/atestado-medico-online`;
      const hit = firstMatch(all, from)!;
      expect(hit, from).not.toBeNull();
      expect(hit.rule.permanent).toBe(true);
      expect(hit.rule.source, `${from} was captured by a broader rule`).not.toMatch(/:slug/);
    }
  });

  it("does not redirect the unrelated driving-license service", async () => {
    const all = await rules();
    for (const lang of HEALTH_ALIAS_LOCALES) {
      expect(
        firstMatch(all, `/portugal/${lang}/services/certificado-medico-carta-de-conducao`),
      ).toBeNull();
    }
  });

  it("leaves unrelated /health/ pages self-canonical (no rule fires)", async () => {
    const all = await rules();
    for (const slug of ["diabetes", "enxaqueca", "hipertensao", "infecoes-respiratorias"]) {
      expect(firstMatch(all, `/portugal/en/health/${slug}`)).toBeNull();
    }
  });

  it("does not disturb Ireland's sick-cert-online retirement", async () => {
    const all = await rules();
    expect(resolve(all, "/ireland/en/health/sick-cert-online")).toBe(
      "/ireland/en/services/sick-certificate-ireland",
    );
  });
});
