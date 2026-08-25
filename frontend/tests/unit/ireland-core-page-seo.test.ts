import { describe, expect, it, vi } from "vitest";
import en from "@/locales/en/common.json";
import { overrideDoctorsBundle } from "@/lib/content/country-doctors-copy";
import { irelandStaticPageSeo } from "@/lib/content/ireland-static-page-seo";
import { countries } from "@/data/countries";

vi.mock("@/lib/content/get-public-countries", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPublicCountryByCode: vi.fn(async (code: string) =>
    countries.find((country) => country.code === code.toLowerCase()) ?? null,
  ),
}));

const LOCALES = ["en", "pt", "es", "cs", "ro", "de"] as const;
const STATIC_PAGES = ["PRICING", "ABOUT", "CONTACT"] as const;

describe("Ireland core-page SEO", () => {
  it("resolves the English doctors hero H1 to online-doctor and Ireland trust intent", () => {
    const doctors = overrideDoctorsBundle(en.doctors, "ie", "en");
    const h1 = [doctors.heroTitleLead, doctors.heroTitleAccent, doctors.heroTitleTrail]
      .filter(Boolean)
      .join(" ");

    expect(h1).toMatch(/online doctors/i);
    expect(h1).toMatch(/Ireland|IMC/i);
  });

  it.each(STATIC_PAGES)("provides complete six-locale copy for %s", (page) => {
    for (const locale of LOCALES) {
      const copy = irelandStaticPageSeo(page, locale);

      expect(copy.title.trim(), `${page}:${locale} title`).not.toBe("");
      expect(copy.description.trim(), `${page}:${locale} description`).not.toBe("");
      expect(copy.h1.trim(), `${page}:${locale} h1`).not.toBe("");
    }
  });

  it("keeps the English pricing page focused on online GP monthly plans in Ireland", () => {
    const pricing = irelandStaticPageSeo("PRICING", "en");

    expect(pricing.title).toMatch(/online GP/i);
    expect(pricing.title).toMatch(/Ireland/i);
    expect(pricing.h1).toMatch(/online GP/i);
    expect(pricing.h1).toMatch(/Ireland/i);
    expect(`${pricing.title} ${pricing.h1}`).toMatch(/monthly|plan/i);
  });

  it("keeps About on branded online-clinic entity intent without targeting the doctors query", () => {
    const about = irelandStaticPageSeo("ABOUT", "en");
    const copy = `${about.title} ${about.h1}`;

    expect(copy).toMatch(/Global Health/i);
    expect(copy).toMatch(/online clinic/i);
    expect(copy).not.toMatch(/online doctors/i);
  });

  it("keeps Contact on branded contact intent without targeting the GP query", () => {
    const contact = irelandStaticPageSeo("CONTACT", "en");
    const copy = `${contact.title} ${contact.h1}`;

    expect(copy).toMatch(/contact/i);
    expect(copy).toMatch(/Global Health/i);
    expect(copy).not.toMatch(/online GP/i);
  });

  it("keeps every localized title and description within the search-snippet budget", () => {
    for (const page of STATIC_PAGES) {
      for (const locale of LOCALES) {
        const copy = irelandStaticPageSeo(page, locale);

        expect(copy.title.length, `${page}:${locale} title`).toBeLessThanOrEqual(60);
        expect(copy.description.length, `${page}:${locale} description`).toBeGreaterThanOrEqual(120);
        expect(copy.description.length, `${page}:${locale} description`).toBeLessThanOrEqual(160);
      }
    }
  });

  it("does not duplicate pricing, About, or Contact titles in any locale", () => {
    for (const locale of LOCALES) {
      const titles = STATIC_PAGES.map((page) => irelandStaticPageSeo(page, locale).title);
      expect(new Set(titles).size, locale).toBe(STATIC_PAGES.length);
    }
  });

  it("wires the Ireland copy into each route's real metadata output", async () => {
    const [pricing, about, contact] = await Promise.all([
      import("@/app/[country]/[lang]/pricing/page"),
      import("@/app/[country]/[lang]/about/page"),
      import("@/app/[country]/[lang]/contact/page"),
    ]);

    for (const locale of ["en", "pt"] as const) {
      const params = Promise.resolve({ country: "ireland", lang: locale });
      const outputs = await Promise.all([
        pricing.generateMetadata({ params }),
        about.generateMetadata({ params }),
        contact.generateMetadata({ params }),
      ]);

      STATIC_PAGES.forEach((page, index) => {
        const title = outputs[index].title as { absolute?: string };
        expect(title.absolute, `${page}:${locale}`).toBe(
          irelandStaticPageSeo(page, locale).title,
        );
        expect(outputs[index].description, `${page}:${locale}`).toBe(
          irelandStaticPageSeo(page, locale).description,
        );
      });
    }
  });

  it("does not apply Ireland metadata to another market", async () => {
    const contact = await import("@/app/[country]/[lang]/contact/page");
    const metadata = await contact.generateMetadata({
      params: Promise.resolve({ country: "portugal", lang: "en" }),
    });
    const title = metadata.title as { absolute?: string };

    expect(title.absolute).not.toBe(irelandStaticPageSeo("CONTACT", "en").title);
    expect(title.absolute).toMatch(/Portugal/i);
  });
});
