import { describe, expect, it } from "vitest";
import czechiaApprovedToolSeo from "./czechia-approved-tool-seo.json";
import portugalApprovedToolSeo from "./portugal-approved-tool-seo.json";
import { isToolMarket, toolHreflangAlternates, toolMarkets } from "./markets";
import { applyMarketBands, applyMarketToolCopy, getMarketFaq } from "./market-copy";
import { TOOL_SLUGS, getToolCopy, getToolsCopy } from "./registry";

/** Every market/locale pair that has hand-written market copy. */
const MARKETS: Record<string, string[]> = {
  ie: ["en"],
  pt: ["pt", "en"],
  es: ["es", "en"],
  cz: ["cs", "en"],
  ro: ["ro", "en"],
  br: ["pt", "en"],
};
const APPROVED_CZECH_TOOL_SLUGS = [
  "blood-pressure-chart",
  "bmi-calculator",
  "calorie-calculator",
  "osteoporosis-risk-checker",
] as const;

describe("toolMarkets", () => {
  it("covers every seeded market and each of its locales", () => {
    const markets = toolMarkets();
    expect(markets.length).toBeGreaterThanOrEqual(30);
    expect(new Set(markets.map((m) => m.code))).toEqual(
      new Set(["ie", "cz", "pt", "es", "ro", "br"]),
    );
  });

  it("gives every market/locale pair a unique BCP-47 tag", () => {
    const tags = toolMarkets().map((m) => m.hreflang);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("puts each market's default locale first", () => {
    const first = (code: string) => toolMarkets().find((m) => m.code === code)!.lang;
    expect(first("ie")).toBe("en");
    expect(first("cz")).toBe("cs");
    expect(first("br")).toBe("pt");
  });
});

describe("toolHreflangAlternates", () => {
  const alts = toolHreflangAlternates("/tools/bmi-calculator");

  it("is ONE cluster spanning markets, not one country's locales", () => {
    // The bug this replaced: the Ireland page listed only Ireland URLs, so
    // nothing linked it to the Brazilian or Spanish version.
    expect(alts["en-IE"]).toBe("/ireland/en/tools/bmi-calculator");
    expect(alts["pt-BR"]).toBe("/brazil/pt/tools/bmi-calculator");
    expect(alts["es-ES"]).toBe("/spain/es/tools/bmi-calculator");
    expect(alts["cs-CZ"]).toBe("/czechia/cs/tools/bmi-calculator");
    expect(alts["ro-RO"]).toBe("/romania/ro/tools/bmi-calculator");
    expect(alts["pt-PT"]).toBe("/portugal/pt/tools/bmi-calculator");
  });

  it("declares exactly one x-default for the whole cluster", () => {
    const defaults = Object.keys(alts).filter((tag) => tag === "x-default");
    expect(defaults).toHaveLength(1);
    expect(alts["x-default"]).toBe("/ireland/en/tools/bmi-calculator");
  });

  it("keeps Portuguese markets apart by region", () => {
    expect(alts["pt-PT"]).not.toBe(alts["pt-BR"]);
  });
});

describe("isToolMarket", () => {
  it("accepts a market's supported locales and rejects the rest", () => {
    expect(isToolMarket("ie", "en")).toBe(true);
    expect(isToolMarket("br", "pt")).toBe(true);
    expect(isToolMarket("br", "cs")).toBe(false); // not in Brazil's locales
    expect(isToolMarket("xx", "en")).toBe(false);
  });
});

describe("getMarketFaq", () => {
  const BMI = "bmi-calculator";

  it("gives each market its own entries in its own language", () => {
    expect(getMarketFaq("ie", "en", BMI)[0].question).toContain("HSE");
    expect(getMarketFaq("br", "pt", BMI)[0].question).toContain("SUS");
    expect(getMarketFaq("pt", "pt", BMI)[0].question).toContain("SNS");
    expect(getMarketFaq("cz", "cs", BMI)[0].question).toContain("BMI");
  });

  it("keeps same-language markets distinct — the whole point of the override", () => {
    // /portugal/pt and /brazil/pt share a language file; these must differ.
    const pt = JSON.stringify(getMarketFaq("pt", "pt", BMI));
    const br = JSON.stringify(getMarketFaq("br", "pt", BMI));
    expect(pt).not.toBe(br);
    // Same for the six English variants.
    expect(JSON.stringify(getMarketFaq("ie", "en", BMI))).not.toBe(
      JSON.stringify(getMarketFaq("es", "en", BMI)),
    );
  });

  it("keeps each tool's market FAQ to its own page", () => {
    // One tool's national FAQ landing on another was the failure mode the
    // slug key exists to prevent. Checked across ALL six tools, not just the
    // pair that happened to exist when this was written: two sessions adding
    // a tool each is exactly how a duplicated block gets registered twice.
    for (const [code, langs] of Object.entries(MARKETS)) {
      for (const lang of langs) {
        const seen = new Map<string, string>();
        for (const slug of TOOL_SLUGS) {
          const json = JSON.stringify(getMarketFaq(code, lang, slug));
          expect(seen.get(json), `${code}/${lang}: ${slug} repeats ${seen.get(json)}`).toBeUndefined();
          seen.set(json, slug);
        }
      }
    }
    expect(getMarketFaq("ie", "en", "not-a-tool")).toEqual([]);
  });

  it("gives every tool a market FAQ in every market and locale", () => {
    for (const [code, langs] of Object.entries(MARKETS)) {
      for (const lang of langs) {
        for (const slug of TOOL_SLUGS) {
          expect(getMarketFaq(code, lang, slug).length, `${code}/${lang}/${slug}`).toBeGreaterThan(
            0,
          );
        }
      }
    }
  });

  it("falls back to nothing for combinations with no market copy", () => {
    expect(getMarketFaq("ie", "cs", BMI)).toEqual([]);
    expect(getMarketFaq("xx", "en", BMI)).toEqual([]);
  });

  it("never leaves a placeholder unfilled — these are hand-written, not templated", () => {
    for (const slug of TOOL_SLUGS) {
      for (const [code, langs] of Object.entries(MARKETS)) {
        for (const lang of langs) {
          const items = getMarketFaq(code, lang, slug);
          expect(items.length).toBeGreaterThan(0);
          for (const item of items) {
            expect(item.question + item.answer).not.toMatch(/\{[a-z]+\}/);
          }
        }
      }
    }
  });
});

describe("applyMarketToolCopy / applyMarketBands", () => {
  const ptCopy = getToolCopy("pt", "bmi-calculator")!;
  const ptBands = getToolsCopy("pt").bands;

  it("applies only the clinically approved Czech tool metadata", () => {
    expect(Object.keys(czechiaApprovedToolSeo).sort()).toEqual([...APPROVED_CZECH_TOOL_SLUGS].sort());
    for (const [slug, seo] of Object.entries(czechiaApprovedToolSeo)) {
      const shared = getToolCopy("cs", slug)!;
      expect(applyMarketToolCopy("cz", "cs", slug, shared)).toMatchObject(seo);
      expect(applyMarketToolCopy("cz", "en", slug, shared)).toBe(shared);
      expect(applyMarketToolCopy("ie", "cs", slug, shared)).toBe(shared);
    }

    for (const slug of ["adhd-test", "due-date-calculator", "ovulation-calculator"]) {
      const shared = getToolCopy("cs", slug)!;
      expect(applyMarketToolCopy("cz", "cs", slug, shared)).toBe(shared);
    }
  });

  it("gives Brazil Brazilian Portuguese, not European", () => {
    const br = applyMarketToolCopy("br", "pt", "bmi-calculator", ptCopy);
    expect(br.lede).toContain("Insira");        // pt-PT says "Introduza"
    expect(br.cta.label).toBe("Agendar consulta"); // pt-PT says "Marcar consulta"
    expect(br.widget.note).toContain("triagem"); // pt-PT says "rastreio"
    expect(br.trustPoints.join(" ")).toContain("salvo"); // pt-PT says "guardado"
  });

  it("leaves Portugal on the shared pt copy", () => {
    expect(applyMarketToolCopy("pt", "pt", "bmi-calculator", ptCopy)).toBe(ptCopy);
    expect(applyMarketToolCopy("ie", "en", "bmi-calculator", ptCopy)).toBe(ptCopy);
  });

  it("applies only the approved Portugal blood-pressure metadata", () => {
    expect(Object.keys(portugalApprovedToolSeo)).toEqual(["blood-pressure-chart"]);
    const shared = getToolCopy("pt", "blood-pressure-chart")!;
    expect(applyMarketToolCopy("pt", "pt", "blood-pressure-chart", shared)).toMatchObject(
      portugalApprovedToolSeo["blood-pressure-chart"],
    );
    expect(applyMarketToolCopy("br", "pt", "blood-pressure-chart", shared)).not.toMatchObject(
      portugalApprovedToolSeo["blood-pressure-chart"],
    );
    expect(applyMarketToolCopy("pt", "en", "blood-pressure-chart", shared)).toBe(shared);
  });

  it("actually differentiates the two Portuguese markets", () => {
    const br = applyMarketToolCopy("br", "pt", "bmi-calculator", ptCopy);
    expect(JSON.stringify(br)).not.toBe(JSON.stringify(ptCopy));
    expect(br.sections).toHaveLength(ptCopy.sections.length);
    expect(br.faq).toHaveLength(ptCopy.faq.length);
  });

  it("overrides the band summaries too", () => {
    const br = applyMarketBands("br", "pt", ptBands);
    expect(br.bmi.overweight.summary).toContain("pressão arterial"); // pt-PT: "tensão arterial"
    expect(applyMarketBands("pt", "pt", ptBands)).toBe(ptBands);
  });

  it("gives Brazil its own blood-pressure wording and emergency number", () => {
    const ptBp = getToolCopy("pt", "blood-pressure-chart")!;
    const br = applyMarketToolCopy("br", "pt", "blood-pressure-chart", ptBp);
    expect(br.cardTitle).toContain("pressão arterial"); // pt-PT: "tensão arterial"
    expect(br.widget.urgentSymptoms).toContain("192"); // SAMU, not a generic line
    expect(br.sections).toHaveLength(ptBp.sections.length);
    // The BMI override must not leak onto this tool.
    expect(JSON.stringify(br)).not.toContain("índice de massa corporal");
  });

  it("keeps the interpolation placeholder intact through the merge", () => {
    const br = applyMarketToolCopy("br", "pt", "bmi-calculator", ptCopy);
    expect(br.metaTitle).toContain("{country}");
    expect(br.widget.gapAbove).toContain("{kg}");
  });
});
