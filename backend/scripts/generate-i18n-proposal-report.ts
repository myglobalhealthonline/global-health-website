import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/db/prisma.js";

const LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const;
type Locale = (typeof LOCALES)[number];

type Proposal = {
  entity: string;
  parentId: string;
  slug: string | null;
  field: string;
  sourceLanguage: Locale | string;
  targetLocale: Locale | string;
  sourceText: string | null;
  proposedText: null;
  status: "MANUAL_TRANSLATION_REQUIRED";
  humanReview: true;
  reason: string;
};

const SENSITIVE = /medical|bio|description|body|answer|question|title|seo|cta|label|summary|intro|disclaimer|legal|terms|feature|content|name/i;

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  return JSON.stringify(value);
}

function missing(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function addField(
  out: Proposal[],
  entity: string,
  parentId: string,
  slug: string | null,
  field: string,
  sourceLanguage: Locale | string,
  targetLocale: Locale | string,
  existingValue: unknown,
  sourceValue: unknown,
) {
  if (missing(existingValue) && !missing(sourceValue)) {
    out.push({
      entity,
      parentId,
      slug,
      field,
      sourceLanguage,
      targetLocale,
      sourceText: text(sourceValue),
      proposedText: null,
      status: "MANUAL_TRANSLATION_REQUIRED",
      humanReview: true,
      reason: SENSITIVE.test(field)
        ? "Sensitive medical/legal/pricing/SEO/advertising copy requires qualified human translation and review."
        : "No approved source translation is available; do not guess or copy another locale.",
    });
  }
}

function countryTargets(country: { defaultLocale: string; countryLocales: Array<{ locale: string }> }): Locale[] {
  const enabled = country.countryLocales.map((row) => row.locale).filter((locale): locale is Locale => LOCALES.includes(locale as Locale));
  return enabled.filter((locale) => locale !== country.defaultLocale);
}

function rowsByLocale(rows: Array<{ locale: string }>) {
  return new Map(rows.map((row) => [row.locale, row as Record<string, unknown>]));
}

async function main() {
  const proposals: Proposal[] = [];
  const countries = await prisma.country.findMany({
    select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } },
  });
  const byCode = new Map(countries.map((country) => [country.code, country]));

  const services = await prisma.service.findMany({
    select: {
      id: true, slug: true, name: true, summary: true, seoTitle: true, seoDescription: true,
      heroTitle: true, heroDescription: true, detailBody: true, ctaLabel: true,
      country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } },
      translations: { select: { locale: true, name: true, summary: true, seoTitle: true, seoDescription: true, heroTitle: true, heroDescription: true, detailBody: true, ctaLabel: true } },
      faqs: { select: { id: true, question: true, answer: true, translations: { select: { locale: true, question: true, answer: true } } } },
    },
  });
  const serviceFields = ["name", "summary", "seoTitle", "seoDescription", "heroTitle", "heroDescription", "detailBody", "ctaLabel"] as const;
  for (const service of services) {
    const targets = countryTargets(service.country);
    const translations = rowsByLocale(service.translations);
    const base = service as unknown as Record<string, unknown>;
    for (const locale of targets) {
      const row = translations.get(locale);
      for (const field of serviceFields) {
        addField(proposals, "ServiceTranslation", service.id, service.slug, field, service.country.defaultLocale, locale, row?.[field], base[field]);
      }
    }
    for (const faq of service.faqs) {
      const faqTranslations = rowsByLocale(faq.translations);
      for (const locale of targets) {
        const row = faqTranslations.get(locale);
        addField(proposals, "ServiceFaqTranslation", faq.id, service.slug, "question", service.country.defaultLocale, locale, row?.question, faq.question);
        addField(proposals, "ServiceFaqTranslation", faq.id, service.slug, "answer", service.country.defaultLocale, locale, row?.answer, faq.answer);
      }
    }
  }

  const doctors = await prisma.doctor.findMany({
    select: { id: true, slug: true, title: true, bio: true, seoTitle: true, seoDescription: true, country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } }, translations: { select: { locale: true, title: true, bio: true, seoTitle: true, seoDescription: true } } },
  });
  for (const doctor of doctors) {
    const rows = rowsByLocale(doctor.translations);
    for (const locale of countryTargets(doctor.country)) {
      const row = rows.get(locale);
      for (const field of ["title", "bio", "seoTitle", "seoDescription"] as const) addField(proposals, "DoctorTranslation", doctor.id, doctor.slug, field, doctor.country.defaultLocale, locale, row?.[field], doctor[field]);
    }
  }

  const specialties = await prisma.specialty.findMany({
    select: { id: true, slug: true, name: true, cardSummary: true, country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } }, translations: { select: { locale: true, name: true, cardSummary: true } } },
  });
  for (const specialty of specialties) {
    const rows = rowsByLocale(specialty.translations);
    for (const locale of countryTargets(specialty.country)) {
      const row = rows.get(locale);
      addField(proposals, "SpecialtyTranslation", specialty.id, specialty.slug, "name", specialty.country.defaultLocale, locale, row?.name, specialty.name);
      addField(proposals, "SpecialtyTranslation", specialty.id, specialty.slug, "cardSummary", specialty.country.defaultLocale, locale, row?.cardSummary, specialty.cardSummary);
    }
  }

  const healthTests = await prisma.healthTest.findMany({
    select: {
      id: true, slug: true, title: true, shortDescription: true, sampleType: true, resultsTimeline: true, heroButtonLabel: true, detailIntro: true, whatThisTestCovers: true, whyGetTested: true, extraSections: true, seoTitle: true, seoDescription: true,
      country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } },
      translations: { select: { locale: true, title: true, shortDescription: true, sampleType: true, resultsTimeline: true, heroButtonLabel: true, detailIntro: true, whatThisTestCovers: true, whyGetTested: true, extraSections: true, seoTitle: true, seoDescription: true } },
      faqs: { select: { id: true, question: true, answer: true, translations: { select: { locale: true, question: true, answer: true } } } },
    },
  });
  const healthFields = ["title", "shortDescription", "sampleType", "resultsTimeline", "heroButtonLabel", "detailIntro", "whatThisTestCovers", "whyGetTested", "extraSections", "seoTitle", "seoDescription"] as const;
  for (const test of healthTests) {
    const rows = rowsByLocale(test.translations);
    for (const locale of countryTargets(test.country)) {
      const row = rows.get(locale);
      for (const field of healthFields) addField(proposals, "HealthTestTranslation", test.id, test.slug, field, test.country.defaultLocale, locale, row?.[field], test[field]);
      for (const faq of test.faqs) {
        const faqRows = rowsByLocale(faq.translations);
        const faqRow = faqRows.get(locale);
        addField(proposals, "HealthTestFaqTranslation", faq.id, test.slug, "question", test.country.defaultLocale, locale, faqRow?.question, faq.question);
        addField(proposals, "HealthTestFaqTranslation", faq.id, test.slug, "answer", test.country.defaultLocale, locale, faqRow?.answer, faq.answer);
      }
    }
  }

  const landingPages = await prisma.seoLandingPage.findMany({
    select: { id: true, slug: true, country: { select: { defaultLocale: true, countryLocales: { select: { locale: true } } } }, translations: { select: { locale: true, title: true, seoTitle: true, seoDescription: true, bodyHtml: true } } },
  });
  for (const page of landingPages) {
    const rows = rowsByLocale(page.translations);
    for (const locale of countryTargets(page.country)) {
      const row = rows.get(locale);
      for (const field of ["title", "seoTitle", "seoDescription", "bodyHtml"] as const) addField(proposals, "SeoLandingPageTranslation", page.id, page.slug, field, page.country.defaultLocale, locale, row?.[field]);
    }
  }

  const plans = await prisma.pricingPlan.findMany({
    select: { id: true, slug: true, name: true, shortDescription: true, longDescription: true, badgeLabel: true, notesTerms: true, country: { select: { defaultLocale: true, countryLocales: { select: { locale: true } } } }, translations: { select: { locale: true, name: true, shortDescription: true, longDescription: true, notesTerms: true, features: true } } },
  });
  for (const plan of plans) {
    const rows = rowsByLocale(plan.translations);
    for (const locale of countryTargets(plan.country)) {
      const row = rows.get(locale);
      for (const field of ["name", "shortDescription", "longDescription", "notesTerms", "features"] as const) addField(proposals, "PlanTranslation", plan.id, plan.slug, field, plan.country.defaultLocale, locale, row?.[field] ?? plan[field]);
      // badgeLabel has no translation column in PlanTranslation; report it
      // explicitly instead of silently putting localized text into a base row.
      if (!missing(plan.badgeLabel)) addField(proposals, "PricingPlan", plan.id, plan.slug, "badgeLabel (translation architecture gap)", plan.country.defaultLocale, locale, plan.badgeLabel);
    }
  }

  const legalProfiles = await prisma.countryLegalProfile.findMany({
    select: { id: true, country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } }, shortDisclaimer: true, fullDisclaimer: true, disclaimerTranslations: { select: { locale: true, shortDisclaimer: true, fullDisclaimer: true } } },
  });
  for (const profile of legalProfiles) {
    const rows = rowsByLocale(profile.disclaimerTranslations);
    for (const locale of countryTargets(profile.country)) {
      const row = rows.get(locale);
      addField(proposals, "CountryDisclaimerTranslation", profile.id, profile.country.code, "shortDisclaimer", profile.country.defaultLocale, locale, row?.shortDisclaimer ?? profile.shortDisclaimer);
      addField(proposals, "CountryDisclaimerTranslation", profile.id, profile.country.code, "fullDisclaimer", profile.country.defaultLocale, locale, row?.fullDisclaimer ?? profile.fullDisclaimer);
    }
  }

  const serviceLinks = await prisma.serviceLink.findMany({
    select: { id: true, source: { select: { slug: true, country: { select: { defaultLocale: true, countryLocales: { select: { locale: true } } } } } }, translations: { select: { locale: true, heading: true, body: true, ctaLabel: true } } },
  });
  for (const link of serviceLinks) {
    const rows = rowsByLocale(link.translations);
    for (const locale of countryTargets(link.source.country)) {
      const row = rows.get(locale);
      for (const field of ["heading", "body", "ctaLabel"] as const) addField(proposals, "ServiceLinkTranslation", link.id, link.source.slug, field, link.source.country.defaultLocale, locale, row?.[field]);
    }
  }

  const blogPosts = await prisma.blogPost.findMany({
    select: { id: true, slug: true, locale: true, title: true, excerpt: true, body: true, seoTitle: true, seoDescription: true, country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } }, translations: { select: { locale: true, title: true, slug: true, excerpt: true, content: true, seoTitle: true, seoDesc: true } } },
  });
  for (const post of blogPosts) {
    if (!post.country || post.locale !== post.country.defaultLocale) continue;
    const rows = rowsByLocale(post.translations);
    for (const locale of countryTargets(post.country)) {
      const row = rows.get(locale);
      for (const field of ["title", "slug", "excerpt", "content", "seoTitle", "seoDesc"] as const) addField(proposals, "BlogTranslation", post.id, post.slug, field, post.locale, locale, row?.[field] ?? post[field === "content" ? "body" : field === "seoDesc" ? "seoDescription" : field]);
    }
  }

  // Direct-locale content models: each locale is a separate parent row, so
  // report missing rows rather than inventing a new translation table.
  const pages = await prisma.contentPage.findMany({ select: { id: true, pageKey: true, locale: true, title: true, body: true, heroTitle: true, heroSubtitle: true, ctaLabel: true, seoTitle: true, seoDescription: true, country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } } } });
  const pageFields = ["title", "body", "heroTitle", "heroSubtitle", "ctaLabel", "seoTitle", "seoDescription"] as const;
  for (const page of pages) {
    const country = byCode.get(page.country.code);
    if (!country || page.locale !== country.defaultLocale) continue;
    const existing = new Set(pages.filter((candidate) => candidate.country.code === page.country.code && candidate.pageKey === page.pageKey).map((candidate) => candidate.locale));
    for (const locale of countryTargets(page.country)) if (!existing.has(locale)) for (const field of pageFields) addField(proposals, "ContentPage", page.id, page.pageKey, field, page.locale, locale, page[field]);
  }

  const outputPath = path.resolve(process.env.I18N_REPORT_PATH?.trim() || path.join(process.cwd(), "..", "docs", "i18n-missing-translation-report.json"));
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), supportedLocales: LOCALES, writeMode: "PROPOSAL_ONLY", note: "proposedText is intentionally null until qualified human translation approval", count: proposals.length, proposals }, null, 2));
  console.log(`Proposal rows: ${proposals.length}`);
  console.log(`Report -> ${outputPath}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
