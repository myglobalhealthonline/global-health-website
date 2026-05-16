/**
 * JSON-LD builders. Render the resulting object inside a
 * `<script type="application/ld+json">` tag. Keep payloads small —
 * Google ignores anything too far below the page topic.
 */
import { SITE_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site-url";

const SITE_URL = getSiteUrl();

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    sameAs: [],
    areaServed: [
      { "@type": "Country", name: "Ireland" },
      { "@type": "Country", name: "Portugal" },
      { "@type": "Country", name: "Spain" },
      { "@type": "Country", name: "Czechia" },
      { "@type": "Country", name: "Romania" },
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/book-online?q={query}`,
      "query-input": "required name=query",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

export function physicianJsonLd(doc: {
  name: string;
  title?: string | null;
  countryName?: string;
  url: string;
  imageSrc?: string;
  languages?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doc.name,
    jobTitle: doc.title ?? "Physician",
    url: doc.url.startsWith("http") ? doc.url : `${SITE_URL}${doc.url}`,
    image: doc.imageSrc,
    knowsLanguage: doc.languages,
    areaServed: doc.countryName,
  };
}

export function medicalBusinessJsonLd(country: { name: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: `${SITE_NAME} · ${country.name}`,
    url: country.url.startsWith("http") ? country.url : `${SITE_URL}${country.url}`,
    medicalSpecialty: ["GeneralPractice", "Cardiology", "Dermatology", "Psychiatry"],
    areaServed: { "@type": "Country", name: country.name },
  };
}

/**
 * Schema.org `MedicalProcedure` for a consultation page. Helps AI search
 * engines (Google AI Overviews, Perplexity) cite the page when a patient
 * asks about general/specialist consultations in a given country.
 */
export function medicalProcedureJsonLd(input: {
  name: string;
  description: string;
  countryName: string;
  url: string;
  bookingUrl: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: input.name,
    description: input.description,
    procedureType: "https://schema.org/TherapeuticProcedure",
    url: input.url.startsWith("http") ? input.url : `${SITE_URL}${input.url}`,
    bodyLocation: undefined,
    preparation: "Have your symptoms, medications list, and ID ready for the video call.",
    howPerformed: "Video consultation via Google Meet with a licensed clinician.",
    followup: "Prescriptions and follow-up referrals are issued during or shortly after the call.",
    potentialAction: {
      "@type": "ReserveAction",
      target: input.bookingUrl.startsWith("http") ? input.bookingUrl : `${SITE_URL}${input.bookingUrl}`,
    },
    provider: {
      "@type": "MedicalOrganization",
      name: SITE_NAME,
      areaServed: { "@type": "Country", name: input.countryName },
    },
  };
}

type AnyLd = Record<string, unknown>;

/** Serialise one or many JSON-LD payloads safely (escapes `</`). */
export function ldJson(...payloads: AnyLd[]): string {
  const data = payloads.length === 1 ? payloads[0] : payloads;
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
