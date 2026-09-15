import { describe, expect, it } from "vitest";
import type { LocaleCode } from "@/lib/i18n/types";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { buildPublicMetadata, SEARCH_DESCRIPTION_LIMIT, SEARCH_DESCRIPTION_MIN, SEARCH_TITLE_LIMIT } from "@/lib/seo/page-seo";
import { applyMarketToolCopy } from "./market-copy";
import { marketToolDescription, toolMarkets } from "./markets";
import { TOOL_SLUGS, fillPlaceholders, getToolCopy } from "./registry";

/**
 * 2026-09-15 OpenSEO audit: tool pages served 56 over-long descriptions, 9
 * over-long titles and 20 duplicate descriptions (same-language copy under two
 * markets). Mirrors `app/[country]/[lang]/tools/[slug]/page.tsx`
 * generateMetadata for EVERY market/locale/tool, not just the crawled ones.
 */
const chars = (value: string) => Array.from(value).length;

const rows = toolMarkets().flatMap((market) =>
  TOOL_SLUGS.map((slug) => {
    const locale = market.lang as LocaleCode;
    const copy = applyMarketToolCopy(market.code, locale, slug, getToolCopy(locale, slug)!);
    const countryLabel = getCommonLocale(locale).countryNames?.[market.code] ?? market.code;
    const metadata = buildPublicMetadata({
      path: `/${market.slug}/${market.lang}/tools/${slug}`,
      title: fillPlaceholders(copy.metaTitle, { country: countryLabel }),
      description: marketToolDescription(copy.metaDescription, countryLabel),
    });
    const title = (metadata.title as { absolute: string }).absolute;
    return { url: `/${market.slug}/${market.lang}/tools/${slug}`, title, description: metadata.description as string };
  }),
);

describe("tool page search metadata budget, every market and locale", () => {
  it.each(rows)("$url", ({ title, description }) => {
    expect(chars(title)).toBeLessThanOrEqual(SEARCH_TITLE_LIMIT);
    expect(chars(description)).toBeLessThanOrEqual(SEARCH_DESCRIPTION_LIMIT);
    expect(chars(description)).toBeGreaterThanOrEqual(SEARCH_DESCRIPTION_MIN);
    expect(`${title} ${description}`).not.toContain("…");
  });

  it("no two tool URLs share a description or a title", () => {
    for (const field of ["description", "title"] as const) {
      const seen = new Map<string, string>();
      for (const row of rows) {
        expect(seen.get(row[field]), `${row.url} duplicates ${field} of ${seen.get(row[field])}`).toBeUndefined();
        seen.set(row[field], row.url);
      }
    }
  });

  it("names the market once when the copy already mentions it", () => {
    expect(marketToolDescription("Calcule o IMC no Brasil.", "Brasil")).toBe("Calcule o IMC no Brasil.");
    expect(marketToolDescription("Calcule o IMC.", "Irlanda")).toBe("Irlanda: Calcule o IMC.");
  });
});
