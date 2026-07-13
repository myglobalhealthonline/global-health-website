/**
 * JSON-LD builders. Render the resulting object inside a
 * `<script type="application/ld+json">` tag. Keep payloads small —
 * Google ignores anything too far below the page topic.
 */
import { SITE_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site-url";

const SITE_URL = getSiteUrl();

export function organizationJsonLd(sameAs: string[] = []) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    // Official regulators / authorities the provider is registered with or
    // operates under. This is the AI-search authority signal — populated per
    // active country from CountryAuthorityLink rows (showInSchema).
    sameAs,
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

export type SchemaRegulator = { name: string; url?: string | null };
export type SchemaCredential = {
  label: string;
  bodyName: string;
  bodyUrl?: string | null;
};

/**
 * Build the `hasCredential` array for a Physician: the primary council
 * registration (recognisedBy the regulator) plus any confirmed extra
 * credentials (FRCP, fellowships) each recognisedBy their issuing body.
 * Returns undefined when there is nothing verified to assert — we never
 * emit empty/speculative credential claims.
 */
function buildHasCredential(input: {
  registrationNumber?: string | null;
  chamber?: string | null;
  division?: string | null;
  regulator?: SchemaRegulator | null;
  credentials?: SchemaCredential[];
}): Array<Record<string, unknown>> | undefined {
  const out: Array<Record<string, unknown>> = [];
  if (input.registrationNumber) {
    out.push({
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Medical registration",
      name: [input.chamber, input.registrationNumber].filter(Boolean).join(" "),
      ...(input.division ? { competencyRequired: input.division } : {}),
      ...(input.regulator
        ? {
            recognizedBy: {
              "@type": "Organization",
              name: input.regulator.name,
              ...(input.regulator.url ? { url: input.regulator.url } : {}),
            },
          }
        : {}),
    });
  }
  for (const cred of input.credentials ?? []) {
    out.push({
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Professional credential",
      name: cred.label,
      recognizedBy: {
        "@type": "Organization",
        name: cred.bodyName,
        ...(cred.bodyUrl ? { url: cred.bodyUrl } : {}),
      },
    });
  }
  return out.length > 0 ? out : undefined;
}

export function physicianJsonLd(doc: {
  name: string;
  title?: string | null;
  countryName?: string;
  url: string;
  imageSrc?: string;
  languages?: string[];
  registrationNumber?: string | null;
  chamber?: string | null;
  division?: string | null;
  regulator?: SchemaRegulator | null;
  credentials?: SchemaCredential[];
}) {
  const hasCredential = buildHasCredential(doc);
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doc.name,
    jobTitle: doc.title ?? "Physician",
    url: doc.url.startsWith("http") ? doc.url : `${SITE_URL}${doc.url}`,
    image: doc.imageSrc,
    knowsLanguage: doc.languages,
    areaServed: doc.countryName,
    ...(doc.registrationNumber
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: doc.chamber ?? "Medical registration",
            value: doc.registrationNumber,
          },
        }
      : {}),
    ...(hasCredential ? { hasCredential } : {}),
    ...(doc.regulator
      ? {
          memberOf: {
            "@type": "Organization",
            name: doc.regulator.name,
            ...(doc.regulator.url ? { url: doc.regulator.url } : {}),
          },
        }
      : {}),
  };
}

export function medicalBusinessJsonLd(country: {
  name: string;
  url: string;
  identifier?: { label?: string | null; value: string } | null;
  sameAs?: string[];
  regulator?: SchemaRegulator | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: `${SITE_NAME} · ${country.name}`,
    url: country.url.startsWith("http") ? country.url : `${SITE_URL}${country.url}`,
    medicalSpecialty: ["GeneralPractice", "Cardiology", "Dermatology", "Psychiatry"],
    areaServed: { "@type": "Country", name: country.name },
    ...(country.identifier
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: country.identifier.label ?? "Healthcare provider registration",
            value: country.identifier.value,
          },
        }
      : {}),
    ...(country.sameAs && country.sameAs.length > 0 ? { sameAs: country.sameAs } : {}),
    ...(country.regulator
      ? {
          memberOf: {
            "@type": "Organization",
            name: country.regulator.name,
            ...(country.regulator.url ? { url: country.regulator.url } : {}),
          },
        }
      : {}),
  };
}

/**
 * Schema.org `Article` for a clinically-reviewed blog post. `author` and
 * `reviewedBy` carry the named Physician with their council registration +
 * recognisedBy authority — the difference between anonymous content and
 * content AI search engines treat as clinically authoritative.
 */
export function articleJsonLd(input: {
  title: string;
  description?: string | null;
  url: string;
  datePublished?: string | null;
  imageSrc?: string | null;
  authorName?: string | null;
  authorPhysician?: Parameters<typeof physicianJsonLd>[0] | null;
  reviewerPhysician?: Parameters<typeof physicianJsonLd>[0] | null;
}) {
  const author = input.authorPhysician
    ? physicianJsonLd(input.authorPhysician)
    : input.authorName
      ? { "@type": "Person", name: input.authorName }
      : { "@type": "Organization", name: SITE_NAME };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    url: input.url.startsWith("http") ? input.url : `${SITE_URL}${input.url}`,
    ...(input.imageSrc ? { image: input.imageSrc } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    author,
    ...(input.reviewerPhysician
      ? { reviewedBy: physicianJsonLd(input.reviewerPhysician) }
      : {}),
    publisher: {
      "@type": "MedicalOrganization",
      name: SITE_NAME,
      url: SITE_URL,
    },
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
    followup: "Clinical notes, referrals and follow-up guidance are issued during or shortly after the call.",
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

/** Neutral service-hub schema. Unlike the detail-page MedicalProcedure
 * builder, this makes no assumptions about video provider, preparation,
 * documentation or follow-up that are not present in the hub payload. */
export function medicalServiceHubJsonLd(input: {
  name: string;
  description: string;
  countryName: string;
  url: string;
  bookingUrl?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    serviceType: "Online specialist consultation",
    url: input.url.startsWith("http") ? input.url : `${SITE_URL}${input.url}`,
    areaServed: { "@type": "Country", name: input.countryName },
    provider: { "@type": "MedicalOrganization", name: SITE_NAME },
    ...(input.bookingUrl
      ? {
          potentialAction: {
            "@type": "ReserveAction",
            target: input.bookingUrl.startsWith("http")
              ? input.bookingUrl
              : `${SITE_URL}${input.bookingUrl}`,
          },
        }
      : {}),
  };
}

/** ItemList for a country health-test hub. Product-specific medical and offer
 * claims remain on detail pages; the hub asserts only visible names/URLs. */
export function catalogueItemListJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/** Best-guess Schema.org MedicalSpecialty for a service, from its slug/kind.
 *  Falls back to PrimaryCare for general GP services. */
export function medicalSpecialtyForService(kind: string, slug: string): string {
  const s = slug.toLowerCase();
  const map: Array<[RegExp, string]> = [
    [/cardio/, "Cardiovascular"],
    [/neuro/, "Neurologic"],
    [/derma|skin/, "Dermatology"],
    [/psychiatr/, "Psychiatric"],
    [/psycholog|mental/, "Psychiatric"],
    [/paediatr|pediatr/, "Pediatric"],
    [/nutrition|diet/, "Nutrition"],
    [/physio|musculoskeletal|pain|orthop/, "PhysicalMedicine"],
    [/gastro/, "Gastroenterologic"],
    [/endocrin|diabet|weight|thyroid/, "Endocrine"],
    [/pneumo|respiratory|pulmon/, "Pulmonary"],
    [/rheumat/, "Rheumatologic"],
    [/uro|mens-health/, "Urologic"],
    [/gyn|womens-health/, "Gynecologic"],
    [/onco/, "Oncologic"],
  ];
  for (const [re, val] of map) if (re.test(s)) return val;
  return "PrimaryCare";
}

/**
 * Schema.org `MedicalClinic` for a service page, carrying the page's
 * `medicalSpecialty` and the bookable consultation as `availableService`
 * (a MedicalProcedure with a ReserveAction). Emitted alongside FAQPage so the
 * page advertises `MedicalClinic + MedicalSpecialty + FAQPage` per the SEO spec.
 */
export function medicalClinicServiceJsonLd(input: {
  serviceName: string;
  description: string;
  specialty: string;
  countryName: string;
  url: string;
  bookingUrl: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: `${SITE_NAME} · ${input.countryName}`,
    url: input.url.startsWith("http") ? input.url : `${SITE_URL}${input.url}`,
    medicalSpecialty: input.specialty,
    areaServed: { "@type": "Country", name: input.countryName },
    availableService: {
      "@type": "MedicalProcedure",
      name: input.serviceName,
      ...(input.description ? { description: input.description } : {}),
      howPerformed: "Secure video consultation with a registered clinician.",
      potentialAction: {
        "@type": "ReserveAction",
        target: input.bookingUrl.startsWith("http")
          ? input.bookingUrl
          : `${SITE_URL}${input.bookingUrl}`,
      },
    },
  };
}

type AnyLd = Record<string, unknown>;

/** Serialise one or many JSON-LD payloads safely (escapes `</`). */
export function ldJson(...payloads: AnyLd[]): string {
  const data = payloads.length === 1 ? payloads[0] : payloads;
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
