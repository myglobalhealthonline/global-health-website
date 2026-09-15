import { describe, expect, it } from "vitest";
import brazil from "./brazil-editorial-copy.json";
import { brazilOnly, loadLocaleBundle } from "./load-locale";

function leaves(obj: unknown, prefix = ""): Array<[string, string]> {
  if (typeof obj === "string") return [[prefix, obj]];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    leaves(v, prefix ? `${prefix}.${k}` : k),
  );
}
const at = (obj: unknown, path: string) =>
  path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
const tokens = (v: string) => (v.match(/\{[^}]+\}/g) ?? []).sort();

describe("Brazil pt-BR locale layer", () => {
  it("overrides only existing pt strings and keeps their placeholders", () => {
    const shared = loadLocaleBundle("pt");
    for (const [path, value] of leaves(brazil.pt)) {
      const original = at(shared, path);
      expect(typeof original, path).toBe("string");
      expect(tokens(value), path).toEqual(tokens(original as string));
      // "licenciada" is kept on the compliance line: same claim as the shared copy, only the law changes.
      if (path === "common.footer.euCompliant") continue;
      expect(value, path).not.toMatch(
        /registad|registo|equipa|marcaç|\bmarcar\b|\bmarque\b|doente|ecrã|telemóvel|contacto|subscriç|anónim|actualiz|consoante|call centre|licenciad|connosco|Em direto|Saltar|no próprio dia/i,
      );
    }
  });

  it("applies to Brazil pt only and leaves every other market's bundle untouched", () => {
    const shared = loadLocaleBundle("pt");
    const original = JSON.stringify(shared);
    const brazilPt = loadLocaleBundle("pt", "brazil");
    expect(brazilPt.common.navigation.contact).toBe("Contato");
    // Arrays replace wholesale in deepMergeLocale: the override must keep every step.
    expect(brazilPt.subscription.howItWorks.steps).toHaveLength(shared.subscription.howItWorks.steps.length);
    for (const locale of ["pt", "en", "es"] as const) {
      expect(loadLocaleBundle(locale, "brazil").subscription.howItWorks.availability).not.toMatch(/Irlanda|Ireland/);
      expect(loadLocaleBundle(locale, "brazil").subscription.pricing.lede).not.toMatch(/especialistas|specialist/i);
    }
    expect(loadLocaleBundle("pt", "portugal").subscription.howItWorks.availability).toBe("Apenas Irlanda");
    expect(loadLocaleBundle("pt", "br")).toBe(brazilPt);
    for (const country of [undefined, "pt", "portugal", "ie", "ireland", "cz", "czechia"]) {
      expect(loadLocaleBundle("pt", country)).toBe(shared);
    }
    expect(JSON.stringify(shared)).toBe(original);
    // en/es: only the footer compliance line differs (LGPD, not the EU GDPR).
    for (const locale of ["en", "es", "pt"] as const) {
      const br = loadLocaleBundle(locale, "brazil");
      expect(br.common.footer.euCompliant).toMatch(/LGPD/);
      expect(br.common.footer.euCompliant).not.toMatch(/GDPR|RGPD/);
      if (locale !== "pt") {
        // Only the footer line and the pricing trust title may differ in common.
        const strip = (c: typeof br.common) => ({ ...c, footer: { ...c.footer, euCompliant: "" }, pricingPage: { ...c.pricingPage, trustLicensedTitle: "" } });
        expect(strip(br.common)).toEqual(strip(loadLocaleBundle(locale).common));
      }
    }
  });

  it("gates new call sites to Brazil only", () => {
    expect(brazilOnly("br")).toBe("br");
    expect(brazilOnly("brazil")).toBe("brazil");
    for (const c of ["ro", "romania", "es", "spain", "pt", undefined, null]) expect(brazilOnly(c)).toBeUndefined();
  });
});
