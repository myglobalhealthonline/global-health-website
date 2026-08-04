import type { CountryConfig } from "@/data/countries";
import { isCountryFeatureEnabled, type CountryFeatureKey } from "@/lib/content/country-features";
import { fillTemplate, getCountryContact, type CountryContact } from "@/lib/content/country-contact";

/**
 * Per-country About-page facts and copy (SEO plan, 2026-08-04).
 *
 * WHY THIS EXISTS
 * `/about` is one strong global page about the company. It cannot answer the
 * question a visitor in a given market actually asks: which doctors see me,
 * in which language, and what can I actually book here. Those answers differ
 * per market, so each market gets its own About page at
 * `/{country}/{lang}/about` — the same pattern as the contact pages.
 *
 * NO DUPLICATED FACTS
 * Regulator, registered office, emergency number, certificate noun and
 * benefit body all live once in `country-contact.ts`; this module reads them
 * from there. Only About-specific facts are added below.
 *
 * ONLY VERIFIABLE CLAIMS
 * `entity` carries registry numbers that already appear on the global /about
 * page. Nothing here asserts doctor counts, consultation volumes or premises
 * for a market — an invented locality or capacity signal on a medical domain
 * is a site-wide risk.
 *
 * TRANSLATION
 * Every sentence is translated once per locale in `about.json → country`;
 * the per-market facts are substituted in. No locale falls back to another
 * language and nothing is machine-translated at request time.
 */

/** Bookable things a market can offer, in the order they are listed. */
export const ABOUT_OFFERINGS = ["gp", "certificates", "specialist", "labTests", "plans"] as const;
export type AboutOfferingKey = (typeof ABOUT_OFFERINGS)[number];

/**
 * Offering → the country feature that actually gates it. Read live so the
 * page can never advertise something the market has switched off.
 * Certificates ride on general consultations: they are issued by the GP who
 * assessed you, never sold as a standalone product.
 */
const OFFERING_FEATURE: Record<AboutOfferingKey, CountryFeatureKey> = {
  gp: "general-consultations",
  certificates: "general-consultations",
  specialist: "specialist-consultations",
  labTests: "health-tests",
  plans: "subscriptions",
};

export type CountryAbout = {
  /**
   * Locale codes consultations are actually delivered in, in this market.
   * Mirrors the market's phone languages — the page renders the names from
   * the active locale's bundle, so the list reads translated everywhere.
   */
  consultLanguages: string[];
  /** Legal entity serving the market. Registry numbers only, no marketing. */
  entity: string;
};

const CZ_ENTITY = "Global Guest s.r.o. (IČO: 19071680), registered in Czechia";

export const COUNTRY_ABOUT: Record<string, CountryAbout> = {
  ie: {
    consultLanguages: ["en"],
    entity: `Global Health, the Irish-registered branch (CRO 910267) of ${CZ_ENTITY}`,
  },
  cz: { consultLanguages: ["cs", "en"], entity: CZ_ENTITY },
  pt: { consultLanguages: ["pt", "en"], entity: CZ_ENTITY },
  es: { consultLanguages: ["es", "en"], entity: CZ_ENTITY },
  ro: { consultLanguages: ["ro", "en"], entity: CZ_ENTITY },
  br: { consultLanguages: ["pt", "en"], entity: CZ_ENTITY },
};

export function getCountryAbout(code: string): CountryAbout | null {
  return COUNTRY_ABOUT[code.toLowerCase()] ?? null;
}

/** Offerings this market has switched on, in `ABOUT_OFFERINGS` order. */
export function aboutOfferings(country: CountryConfig): AboutOfferingKey[] {
  return ABOUT_OFFERINGS.filter((key) => isCountryFeatureEnabled(country, OFFERING_FEATURE[key]));
}

/** Locale-bundle shape the templates arrive in (about.json → `country`). */
export type AboutCopyTemplates = {
  breadcrumb: string;
  watermark: string;
  titleTemplate: string;
  descriptionTemplate: string;
  h1Template: string;
  introOffice: string;
  introOnline: string;
  offerHeading: string;
  offerBodyTemplate: string;
  languagesHeading: string;
  languagesBodyTemplate: string;
  whoHeading: string;
  whoBodyTemplate: string;
  globalLinkLabel: string;
  trustDoctorsTitle: string;
  trustLanguagesTitle: string;
  trustBaseTitle: string;
  trustOnlineTitle: string;
  trustOnlineSubtitle: string;
  ctaBook: string;
  ctaDoctors: string;
  ctaContact: string;
  faqEyebrow: string;
  faqHeading: string;
  faq1Q: string;
  faq1AOffice: string;
  faq1AOnline: string;
  faq2Q: string;
  faq2A: string;
  faq3Q: string;
  faq3A: string;
  faq4Q: string;
  faq4A: string;
} & Record<string, string>;

export type AboutOffering = { key: AboutOfferingKey; title: string; body: string };

export type AboutCopy = {
  /** <title>. Kept under ~60 chars — see lib/seo/page-seo.ts. */
  title: string;
  /** Meta description. Kept under ~155 chars. */
  description: string;
  h1: string;
  intro: string;
  offerHeading: string;
  offerBody: string;
  offerings: AboutOffering[];
  languagesHeading: string;
  languagesBody: string;
  languageNames: string[];
  whoHeading: string;
  whoBody: string;
  faqHeading: string;
  faqs: Array<{ question: string; answer: string }>;
};

/** Translated language names for the market's consultation languages. */
function languageNames(codes: string[], t: AboutCopyTemplates): string[] {
  return codes.map((code) => t[`lang_${code}`] ?? code.toUpperCase());
}

/**
 * Builds a market's About copy from the active locale's templates, with the
 * market's own facts substituted in. Offerings come from the live feature
 * flags, so the copy and the FAQ can never advertise a disabled service.
 */
export function resolveAboutCopy(
  country: CountryConfig,
  contact: CountryContact,
  about: CountryAbout,
  t: AboutCopyTemplates,
  /** Market name in the ACTIVE locale — "Brasil" on a PT page, not "Brazil". */
  countryName: string = country.name,
): AboutCopy {
  const names = languageNames(about.consultLanguages, t);
  const vars: Record<string, string> = {
    country: countryName,
    // Markets with premises lead with the city (it is what people search);
    // online-only markets claim no locality at all.
    place: contact.facts.city ?? countryName,
    city: contact.facts.city ?? countryName,
    regulator: contact.regulator.name,
    languages: names.join(" / "),
    emergency: contact.facts.emergency,
    benefitBody: contact.facts.benefitBody,
    certificate: contact.facts.certificateNoun,
    entity: about.entity,
    email: contact.email,
  };

  const offerings: AboutOffering[] = aboutOfferings(country).map((key) => ({
    key,
    title: fillTemplate(t[`offer_${key}_title`] ?? key, vars),
    body: fillTemplate(t[`offer_${key}_body`] ?? "", vars),
  }));
  const withServices = { ...vars, services: offerings.map((o) => o.title).join(", ") };

  return {
    title: fillTemplate(t.titleTemplate, vars),
    description: fillTemplate(t.descriptionTemplate, vars),
    h1: fillTemplate(t.h1Template, vars),
    intro: fillTemplate(contact.office ? t.introOffice : t.introOnline, vars),
    offerHeading: fillTemplate(t.offerHeading, vars),
    offerBody: fillTemplate(t.offerBodyTemplate, vars),
    offerings,
    languagesHeading: fillTemplate(t.languagesHeading, vars),
    languagesBody: fillTemplate(t.languagesBodyTemplate, vars),
    languageNames: names,
    whoHeading: fillTemplate(t.whoHeading, vars),
    whoBody: fillTemplate(t.whoBodyTemplate, vars),
    faqHeading: fillTemplate(t.faqHeading, vars),
    faqs: [
      {
        question: fillTemplate(t.faq1Q, vars),
        answer: fillTemplate(contact.office ? t.faq1AOffice : t.faq1AOnline, vars),
      },
      { question: fillTemplate(t.faq2Q, vars), answer: fillTemplate(t.faq2A, vars) },
      { question: fillTemplate(t.faq3Q, withServices), answer: fillTemplate(t.faq3A, withServices) },
      { question: fillTemplate(t.faq4Q, vars), answer: fillTemplate(t.faq4A, vars) },
    ],
  };
}

/** Re-exported so the page resolves both halves of a market from one import. */
export { getCountryContact };
