import { describe, expect, it, vi } from "vitest";
import { czechiaStaticPageSeo } from "@/lib/content/czechia-static-page-seo";
import { countries } from "@/data/countries";

vi.mock("@/lib/content/get-public-countries", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPublicCountryByCode: vi.fn(async (code: string) =>
    countries.find((country) => country.code === code.toLowerCase()) ?? null,
  ),
}));

const LEGAL_TITLES: Record<string, string> = {
  COMPLAINTS_PROCEDURE: "Postup při stížnostech",
  MEDICAL_DISCLAIMER: "Zdravotní prohlášení",
  PRIVACY_POLICY: "Zásady ochrany osobních údajů",
  REFUND_POLICY: "Zásady vracení peněz",
  TERMS_OF_SERVICE: "Obchodní podmínky",
};

vi.mock("@/lib/content/get-country-legal", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCountryLegalDocument: vi.fn(async (_code: string, type: string) => ({
    document: { title: LEGAL_TITLES[type] },
  })),
  getCountryLegal: vi.fn(async () => ({
    documents: Object.keys(LEGAL_TITLES).map((type) => ({ type, locale: "cs" })),
    profile: null,
  })),
}));

const EXPECTED = {
  about: {
    title: "O Global Health Česko | Online lékařská péče",
    description:
      "Global Health Česko nabízí videokonzultace s lékaři registrovanými u České lékařské komory. Zjistěte, kdo jsme a jak služba funguje.",
  },
  blog: {
    title: "Zdravotní články od registrovaných lékařů | Česko",
    description:
      "Zdravotní články pro Česko od registrovaných lékařů. Praktické informace, zdroje a jasné upozornění, kdy je potřeba osobní péče.",
    h1: "Zdravotní články od registrovaných lékařů",
  },
  book: {
    title: "Objednat online konzultaci | Global Health Česko",
    description:
      "Objednejte online konzultaci v Česku. Vyberte službu, lékaře a dostupný termín a poté bezpečně doplňte údaje pacienta.",
    h1: "Objednejte si online konzultaci",
  },
  careers: {
    title: "Kariéra v Global Health Česko",
    description:
      "Připojte se ke Global Health v Česku. Spolupracujeme s registrovanými lékaři, klinickou podporou a technologickými týmy v Evropě a Brazílii.",
  },
  contact: {
    title: "Kontakt | Global Health Česko",
    description:
      "Kontaktujte Global Health Česko telefonicky na +420 608 353 716 nebo e-mailem na info@myglobalhealth.online. Provozní údaje a sídlo najdete na stránce.",
    h1: "Kontakt | Global Health Česko",
  },
  faq: {
    title: "Časté otázky | Global Health Česko",
    description:
      "Odpovědi na časté otázky o rezervaci, platbě, videokonzultaci, soukromí a situacích, kdy online péče není vhodná.",
    h1: "Časté otázky k online péči",
  },
  legal: {
    title: "Právní informace | Global Health Česko",
    description:
      "Právní dokumenty, údaje o provozovateli a regulační informace pro služby Global Health v Česku. Vyberte příslušný dokument.",
    h1: "Právní informace",
  },
  "legal/complaints-procedure": {
    title: "Postup při stížnostech | Global Health Česko",
    description:
      "Postup pro podání a vyřízení stížnosti týkající se služeb Global Health v Česku, včetně kontaktních a regulačních údajů.",
  },
  "legal/medical-disclaimer": {
    title: "Zdravotní prohlášení | Global Health Česko",
    description:
      "Zdravotní prohlášení k online péči Global Health v Česku, včetně omezení služby a pokynů pro naléhavé zdravotní situace.",
  },
  "legal/privacy-policy": {
    title: "Ochrana osobních údajů | Global Health Česko",
    description:
      "Zásady zpracování osobních a zdravotních údajů ve službách Global Health v Česku, včetně kontaktů a práv uživatelů.",
  },
  "legal/refund-policy": {
    title: "Vrácení peněz | Global Health Česko",
    description:
      "Podmínky vrácení peněz za služby Global Health v Česku, včetně postupu, kontaktních údajů a případných omezení.",
  },
  "legal/terms-of-service": {
    title: "Obchodní podmínky | Global Health Česko",
    description:
      "Obchodní podmínky používání služeb Global Health v Česku, včetně práv, povinností, plateb a omezení online péče.",
  },
  press: {
    title: "Pro média | Global Health Česko",
    description:
      "Informace pro média o Global Health v Česku: provozovatel, regulace, působnost a kontakt na tiskové oddělení pro ověření údajů.",
  },
  pricing: {
    title: "Měsíční plány online péče | Global Health Česko",
    description:
      "Porovnejte měsíční plány online péče v Česku, kredity na konzultace a další výhody. Aktuální ceny a podmínky jsou uvedeny u každého plánu.",
    h1: "Měsíční plány online péče",
  },
} as const;

describe("Czechia core-page SEO", () => {
  it.each(Object.entries(EXPECTED))("returns exact approved copy for %s", (path, expected) => {
    expect(czechiaStaticPageSeo("cz", "cs", path)).toEqual(expected);
  });

  it("returns null for every other country and locale", () => {
    for (const { code } of countries) {
      for (const locale of ["en", "pt", "es", "cs", "ro", "de"]) {
        if (code === "cz" && locale === "cs") continue;
        for (const path of Object.keys(EXPECTED)) {
          expect(czechiaStaticPageSeo(code, locale, path), `${code}/${locale}/${path}`).toBeNull();
        }
      }
    }
    expect(czechiaStaticPageSeo("cz", "cs", "legal/cookie-policy")).toBeNull();
  });

  it("wires the approved title and description into every route", async () => {
    const routeModules = await Promise.all([
      import("@/app/[country]/[lang]/about/page"),
      import("@/app/[country]/[lang]/blog/page"),
      import("@/app/[country]/[lang]/book/page"),
      import("@/app/[country]/[lang]/careers/page"),
      import("@/app/[country]/[lang]/contact/page"),
      import("@/app/[country]/[lang]/faq/page"),
      import("@/app/[country]/[lang]/legal/page"),
      import("@/app/[country]/[lang]/press/page"),
      import("@/app/[country]/[lang]/pricing/page"),
    ]);
    const paths = ["about", "blog", "book", "careers", "contact", "faq", "legal", "press", "pricing"] as const;

    for (let index = 0; index < paths.length; index += 1) {
      const path = paths[index];
      const metadata = await routeModules[index].generateMetadata({
        params: Promise.resolve({ country: "czechia", lang: "cs" }),
      });
      const title = metadata.title as { absolute?: string };

      expect(title.absolute, `${path} title`).toBe(EXPECTED[path].title);
      expect(metadata.description, `${path} description`).toBe(EXPECTED[path].description);
    }

    const legalRoute = await import("@/app/[country]/[lang]/legal/[type]/page");
    for (const path of Object.keys(EXPECTED).filter((key) => key.startsWith("legal/"))) {
      const type = path.slice("legal/".length);
      const metadata = await legalRoute.generateMetadata({
        params: Promise.resolve({ country: "czechia", lang: "cs", type }),
      });
      const title = metadata.title as { absolute?: string };
      const expected = EXPECTED[path as keyof typeof EXPECTED];

      expect(title.absolute, `${path} title`).toBe(expected.title);
      expect(metadata.description, `${path} description`).toBe(expected.description);
    }
  }, 30_000);
});
