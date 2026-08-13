import { describe, expect, it } from "vitest";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { countries } from "@/data/countries";
import { buildSiteNavigationData } from "@/data/navigation";

/**
 * Regression test for SEO-GROWTH-001: the footer's "Clinics" country links
 * used to point at `legacyHomePath` (old Wix-era aliases like `/home-pt`).
 * Those already 301/308-redirect correctly, but the footer renders on every
 * page, so Googlebot kept re-crawling the legacy URL instead of letting it
 * age out of the index in favor of the modern canonical `/{slug}/{locale}`
 * homepage. See frontend/data/navigation.ts footerColumns "clinics" links.
 */
const LEGACY_HREFS = ["/home", "/home-pt", "/home-cz", "/home-sp", "/home-rm", "/home-br"];

describe("footer clinics links (buildSiteNavigationData)", () => {
  const nav = buildSiteNavigationData(getCommonLocale("en"), countries);
  const countryNames = new Set(countries.map((c) => c.name));
  const clinicsLinks = nav.footerColumns.find((col) =>
    col.links.some((l) => countryNames.has(l.label)),
  )!.links;

  const hrefByCountry = Object.fromEntries(
    clinicsLinks.map((l, i) => [countries[i]!.code, l.href]),
  );

  it.each([
    ["ie", "/ireland/en"],
    ["pt", "/portugal/pt"],
    ["cz", "/czechia/cs"],
    ["es", "/spain/es"],
    ["ro", "/romania/ro"],
    ["br", "/brazil/pt"],
  ])("%s resolves to the modern canonical homepage %s", (code, expected) => {
    expect(hrefByCountry[code]).toBe(expected);
  });

  it("never links a legacy Wix-era alias", () => {
    for (const link of clinicsLinks) {
      expect(LEGACY_HREFS).not.toContain(link.href);
    }
  });
});
