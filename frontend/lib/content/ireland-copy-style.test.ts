import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COUNTRY_CONTACT } from "./country-contact";
import { EXTRAS } from "./country-home-copy";
import { irelandStaticPageSeo } from "./ireland-static-page-seo";

const EM_DASH = /—/u;
const IRELAND_LOCALES = ["en", "pt", "es", "cs", "ro", "de"] as const;
const IRELAND_STATIC_PAGES = ["PRICING", "ABOUT", "CONTACT"] as const;
const IRELAND_TOOL_FAQ_SECTIONS = [
  "BMI_MARKET_FAQ",
  "CALORIE_MARKET_FAQ",
  "BP_MARKET_FAQ",
  "DUE_DATE_MARKET_FAQ",
  "OVULATION_MARKET_FAQ",
  "ADHD_MARKET_FAQ",
  "OSTEOPOROSIS_MARKET_FAQ",
] as const;

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

function expectNoEmDash(label: string, value: unknown) {
  for (const text of collectStrings(value)) {
    expect(text, `${label} contains an em dash: ${text}`).not.toMatch(EM_DASH);
  }
}

function extractIrelandFaqBlock(source: string, sectionName: string): string {
  const pattern = new RegExp(
    `const\\s+${sectionName}\\s*:\\s*MarketFaq\\s*=\\s*\\{[\\s\\S]*?\\bie:\\s*\\{([\\s\\S]*?)\\n\\s*\\},\\n\\s*pt:\\s*\\{`,
    "u",
  );
  const match = source.match(pattern);
  expect(match, `Could not find Ireland block for ${sectionName}`).toBeTruthy();
  return match?.[1] ?? "";
}

describe("Ireland public copy style", () => {
  it("country-home-copy Ireland locale overrides contain no em dashes", () => {
    for (const locale of IRELAND_LOCALES) {
      expectNoEmDash(`EXTRAS[IE:${locale}]`, EXTRAS[`IE:${locale}`]);
    }
  });

  it("Ireland contact copy contains no em dashes", () => {
    expectNoEmDash("COUNTRY_CONTACT.ie.copy.en", COUNTRY_CONTACT.ie.copy.en);
  });

  it("Ireland static page SEO copy contains no em dashes", () => {
    for (const locale of IRELAND_LOCALES) {
      for (const page of IRELAND_STATIC_PAGES) {
        expectNoEmDash(
          `irelandStaticPageSeo(${page}, ${locale})`,
          irelandStaticPageSeo(page, locale),
        );
      }
    }
  });

  it("Ireland tool FAQ source blocks contain no em dashes", () => {
    const source = readFileSync(new URL("../tools/market-copy.ts", import.meta.url), "utf8");
    for (const section of IRELAND_TOOL_FAQ_SECTIONS) {
      expectNoEmDash(section, extractIrelandFaqBlock(source, section));
    }
  });
});
