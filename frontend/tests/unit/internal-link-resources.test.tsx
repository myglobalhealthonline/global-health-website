import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { homePageExtras } from "@/lib/content/country-home-copy";
import { ToolPage } from "@/lib/content/tool-page";
import { applyMarketToolCopy } from "@/lib/tools/market-copy";
import { getToolsCopy, TOOL_SLUGS } from "@/lib/tools/registry";
import type { CountryCode } from "@/data/countries";
import type { LocaleCode } from "@/lib/i18n/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

it("isolates homepage resources and tool readings to the five requested pages", () => {
  const homes: Record<string, string> = {
    "ro:ro": "/romania/ro/tools/calorie-calculator",
    "br:pt": "/brazil/pt/tools/calorie-calculator",
    "cz:cs": "/czechia/cs/tools/blood-pressure-chart",
  };
  const readings: Record<string, string> = {
    "es:es": "/spain/es/blog/tension-arterial-normal-tabla-edad-sexo",
    "pt:pt": "/portugal/pt/health/hipertensao",
  };
  for (const code of ["ie", "cz", "pt", "es", "ro", "br"] as CountryCode[]) {
    for (const lang of ["en", "cs", "pt", "es", "ro", "de"] as LocaleCode[]) {
      expect(homePageExtras(code, lang)?.resourceLink?.href).toBe(homes[`${code}:${lang}`]);
      for (const slug of TOOL_SLUGS) {
        const copy = applyMarketToolCopy(code, lang, slug, getToolsCopy(lang).tools[slug]);
        expect(copy.readingLink?.href).toBe(slug === "blood-pressure-chart" ? readings[`${code}:${lang}`] : undefined);
      }
    }
  }
});

it("renders the Spanish guide once as a server anchor without changing the calculator", () => {
  const html = renderToStaticMarkup(<ToolPage slug="blood-pressure-chart" ctx={{country:"spain",code:"es",lang:"es",countryLabel:"España",formatLocale:"es-ES"}} suggestions={[]} />);
  const href = 'href="/spain/es/blog/tension-arterial-normal-tabla-edad-sexo"';
  expect(html.split(href)).toHaveLength(2);
  expect(html).toContain("Qué significan los valores de tensión arterial");
  expect(html).toContain("<input");
});
