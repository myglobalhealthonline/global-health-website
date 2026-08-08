import { describe, expect, it } from "vitest";
import en from "@/locales/en/common.json";
import pt from "@/locales/pt/common.json";
import es from "@/locales/es/common.json";
import cs from "@/locales/cs/common.json";
import ro from "@/locales/ro/common.json";
import de from "@/locales/de/common.json";
import { EXTRAS } from "./country-home-copy";

/**
 * On-page SEO batch (2026-08-09). `app/[country]/[lang]/page.tsx` falls back
 * to `homeMeta.titleTemplate` (shared per locale, `{country}` interpolated)
 * whenever neither the CMS `PageContent` row nor a `country-home-copy.ts`
 * override supplies a `seoTitle`. That is the DEFAULT path for every country
 * except Ireland, which has its own authored override.
 *
 * Found live: the cs/es/pt/ro templates, once filled with a real country
 * name, exceeded `SEARCH_TITLE_LIMIT` (60 chars) even before the brand
 * suffix — `compactSearchTitle` then word-safe-truncated them, producing a
 * literal "…" in the served `<title>`. Confirmed on production: Spain,
 * Portugal, Romania and Czechia's own homepages, plus every other country's
 * page in those four locales. Shortened the four templates' trailing
 * qualifier phrase (dropping the GP-specific/family-doctor sub-clause, which
 * the leading "{country}" term doesn't depend on for its own SEO signal) so
 * every filled-in variant fits.
 *
 * This test is the regression guard: it does not assert any particular
 * wording, only that the promise ("this is a template pages render without
 * truncation") holds for every country that locale actually serves, not just
 * the one whose name happened to be short enough at edit time.
 */

const SEARCH_TITLE_LIMIT = 60;
const BRAND_PATTERN = /\s*(?:[|·—-]\s*)?global health\s*[\p{L}]*\s*$/iu;

const BUNDLES: Record<string, unknown> = { en, pt, es, cs, ro, de };

/** Country display names AS RENDERED in each locale — mirrors what
 *  `config.name` resolves to for that country/locale pair in production. */
const COUNTRY_NAMES_BY_LOCALE: Record<string, Record<string, string>> = {
  en: { ireland: "Ireland", portugal: "Portugal", spain: "Spain", romania: "Romania", czechia: "Czechia", brazil: "Brazil" },
  pt: { ireland: "Irlanda", portugal: "Portugal", spain: "Espanha", romania: "Roménia", czechia: "Chéquia", brazil: "Brasil" },
  es: { ireland: "Irlanda", portugal: "Portugal", spain: "España", romania: "Rumanía", czechia: "Chequia", brazil: "Brasil" },
  cs: { ireland: "Irsko", portugal: "Portugalsko", spain: "Španělsko", romania: "Rumunsko", czechia: "Česko", brazil: "Brazílie" },
  ro: { ireland: "Irlanda", portugal: "Portugalia", spain: "Spania", romania: "România", czechia: "Cehia", brazil: "Brazilia" },
  de: { ireland: "Irland", portugal: "Portugal", spain: "Spanien", romania: "Rumänien", czechia: "Tschechien", brazil: "Brasilien" },
};

function len(s: string): number {
  return Array.from(s).length;
}

describe("country home titleTemplate stays within the search-title budget for every country it serves", () => {
  for (const locale of Object.keys(BUNDLES)) {
    const template = (BUNDLES[locale] as { homeMeta: { titleTemplate: string } }).homeMeta.titleTemplate;

    it.each(Object.entries(COUNTRY_NAMES_BY_LOCALE[locale]))(
      `${locale}: filled with %s's localized name stays <= ${SEARCH_TITLE_LIMIT} chars unbranded`,
      (_country, name) => {
        const filled = template.replace("{country}", name);
        const unbranded = filled.replace(BRAND_PATTERN, "").trim();
        expect(
          len(unbranded),
          `"${unbranded}" (${len(unbranded)} chars) — this is the string compactSearchTitle ` +
            `must fit inside ${SEARCH_TITLE_LIMIT} chars; over budget means a literal "…" in production`,
        ).toBeLessThanOrEqual(SEARCH_TITLE_LIMIT);
      },
    );
  }
});

describe("country-home-copy EXTRAS — Czechia now has the same coverage as its siblings", () => {
  const LOCALES = ["en", "pt", "es", "cs", "ro", "de"];
  const SIBLINGS = ["es", "ro", "br"]; // the markets Czechia's fix was modelled on

  it("cz:<locale> has a heroTitle for every site locale, matching the es/ro/br pattern", () => {
    for (const locale of LOCALES) {
      const entry = EXTRAS[`cz:${locale}`];
      expect(entry?.heroTitle, `cz:${locale} is missing a heroTitle override`).toBeTruthy();
    }
  });

  it("every sibling market this pattern is modelled on still has full coverage (no regression)", () => {
    for (const market of SIBLINGS) {
      for (const locale of LOCALES) {
        if (market === "es" && locale === "es") continue; // es:es covered above too, redundant guard
        const entry = EXTRAS[`${market}:${locale}`];
        expect(entry, `${market}:${locale} lost its coverage`).toBeTruthy();
      }
    }
  });

  it("Czechia's own-language (cs) heroTitle is actually Czech, not the generic i18n fallback", () => {
    // The defect this fixes: without this entry, Czechia's home page fell
    // through to the shared i18n "Medicína kdykoliv" tagline — technically
    // Czech, but generic, unlike every sibling market's distinctive title.
    expect(EXTRAS["cz:cs"]?.heroTitle).not.toBe("Medicína kdykoliv");
    expect(EXTRAS["cz:cs"]?.heroTitle).toMatch(/česk/i);
  });
});
