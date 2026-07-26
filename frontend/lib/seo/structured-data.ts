/**
 * JSON-LD builders. Render the resulting object inside a
 * `<script type="application/ld+json">` tag. Keep payloads small —
 * Google ignores anything too far below the page topic.
 */
import { SITE_NAME } from "@/lib/constants";
import { toDoctorBioPlainText } from "@/lib/content/doctor-bio-format";
import { getSiteUrl } from "@/lib/seo/site-url";

const SITE_URL = getSiteUrl();

/** Trim schema prose to a whole word under `max` chars. */
function truncateForSchema(text: string, max: number): string | undefined {
  const clean = text.trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:\s]+$/, "")}…`;
}

// Shared @id anchors so every block that repeats the org/website inline can
// be joined into one entity graph instead of being read as duplicate nodes.
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

// Official social profiles that always belong in the entity's `sameAs`,
// regardless of which country the visitor is in. Per-country regulator
// authority URLs are merged on top of these (passed by the layout).
const BASE_SAME_AS = [
  "https://www.instagram.com/globalhealth_ie/",
  "https://www.instagram.com/globalhealth_es/",
  "https://www.instagram.com/globalhealth_ro/",
  "https://www.instagram.com/globalhealth_pt/",
  "https://www.instagram.com/globalhealth_cz/",
  "https://www.tiktok.com/@globalhealth.online",
  "https://www.linkedin.com/company/myglobalhealth.online",
  "https://www.youtube.com/@GlobalHealth-y9o",
  "https://www.wikidata.org/wiki/Q140363271",
];

export function organizationJsonLd(sameAs: string[] = []) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: "Global Guest s.r.o.",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logos/global-health-light.png`,
      width: 399,
      height: 260,
    },
    foundingDate: "2023",
    slogan: "Medicine Anytime Anywhere",
    description:
      "Global Health connects patients with locally-licensed doctors across multiple markets in Europe and Latin America. No waiting rooms, no call centres, transparent pricing. GDPR compliant.",
    // Official social profiles + per-country regulators / authorities the
    // provider is registered with. This is the AI-search authority signal —
    // regulator URLs are populated per active country from CountryAuthorityLink
    // rows (showInSchema) and merged on top of the base social profiles.
    sameAs: [...BASE_SAME_AS, ...sameAs],
    areaServed: [
      { "@type": "Country", name: "Ireland" },
      { "@type": "Country", name: "Portugal" },
      { "@type": "Country", name: "Spain" },
      { "@type": "Country", name: "Czech Republic" },
      { "@type": "Country", name: "Romania" },
      { "@type": "Country", name: "Brazil" },
    ],
    medicalSpecialty: [
      "General Practice",
      "Cardiology",
      "Neurology",
      "Pediatrics",
      "Dermatology",
      "Psychiatry",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "info@myglobalhealth.online",
      contactType: "customer service",
      availableLanguage: [
        "English",
        "Portuguese",
        "Spanish",
        "Czech",
        "Romanian",
        "Arabic",
        "Urdu",
      ],
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "CZ",
      addressLocality: "Prague",
    },
    identifier: [
      {
        "@type": "PropertyValue",
        name: "Czech company registration",
        value: "IČO: 19071680",
      },
      {
        "@type": "PropertyValue",
        name: "Irish company registration",
        value: "CRO: 910267",
      },
      {
        "@type": "PropertyValue",
        name: "NRPZS",
        value: "4687/2026",
      },
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
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
  specialty?: string | null;
  /** Profile-image SEO metadata (Asset.altText / caption) — promotes the bare
   *  image URL to a captioned ImageObject so image search has something to
   *  read beyond the file name. */
  imageAltText?: string | null;
  imageCaption?: string | null;
  /** Doctor bio (may contain HTML) — becomes the Physician `description`. */
  bio?: string | null;
}) {
  const hasCredential = buildHasCredential(doc);
  const description = doc.bio ? truncateForSchema(toDoctorBioPlainText(doc.bio), 300) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doc.name,
    jobTitle: doc.title ?? "Physician",
    url: doc.url.startsWith("http") ? doc.url : `${SITE_URL}${doc.url}`,
    ...(description ? { description } : {}),
    image: doc.imageSrc
      ? {
          "@type": "ImageObject",
          url: doc.imageSrc.startsWith("http") ? doc.imageSrc : `${SITE_URL}${doc.imageSrc}`,
          ...(doc.imageCaption ? { caption: doc.imageCaption } : {}),
          ...(doc.imageAltText ? { name: doc.imageAltText } : {}),
        }
      : undefined,
    knowsLanguage: doc.languages,
    areaServed: doc.countryName,
    ...(doc.specialty ? { medicalSpecialty: doc.specialty } : {}),
    worksFor: {
      "@type": "MedicalOrganization",
      "@id": ORGANIZATION_ID,
      name: SITE_NAME,
      url: SITE_URL,
    },
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
    // memberOf (council registration) only asserted for team members who
    // actually hold a registration number with that regulator — a country's
    // `regulator` is resolved once for every doctor on the page, but allied
    // health / non-physician team members (e.g. wellness consultants,
    // manual therapists) have no `registrationNumber` and must not inherit
    // the country's medical-council membership as a blanket default.
    ...(doc.regulator && doc.registrationNumber
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
  dateModified?: string | null;
  imageSrc?: string | null;
  authorName?: string | null;
  authorPhysician?: Parameters<typeof physicianJsonLd>[0] | null;
  reviewerPhysician?: Parameters<typeof physicianJsonLd>[0] | null;
  /** Free-text topic (e.g. a blog post's category) — emitted as a generic
   *  `about.name`. Deliberately typed `Thing`, not `MedicalCondition`: we
   *  only have a category label here, never a coded clinical entity. */
  about?: string | null;
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
    ...(input.about ? { about: { "@type": "Thing", name: input.about } } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    author,
    ...(input.reviewerPhysician
      ? { reviewedBy: physicianJsonLd(input.reviewerPhysician) }
      : {}),
    // `lastReviewed` is WebPage/MedicalWebPage vocabulary (same precedent as
    // putting `reviewedBy` on this Article node). Sourced from the exact
    // same field as `dateModified` so the two can never drift apart.
    ...(input.dateModified ? { lastReviewed: input.dateModified } : {}),
    publisher: {
      "@type": "MedicalOrganization",
      "@id": ORGANIZATION_ID,
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
      "@id": ORGANIZATION_ID,
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
    provider: { "@type": "MedicalOrganization", "@id": ORGANIZATION_ID, name: SITE_NAME },
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
  /** Named clinical reviewer (Physician schema) for this service page's
   *  content — same `reviewedBy` precedent as the blog Article schema.
   *  Omitted entirely when the country has no named reviewer. */
  reviewerPhysician?: ReturnType<typeof physicianJsonLd> | null;
  /** ISO timestamp of the admin-set clinical review date. Same field feeds
   *  both `dateModified` and `lastReviewed` (WebPage/MedicalWebPage
   *  vocabulary, same precedent as the blog Article schema) — omitted
   *  entirely when the service has no review date set. */
  dateModified?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: `${SITE_NAME} · ${input.countryName}`,
    url: input.url.startsWith("http") ? input.url : `${SITE_URL}${input.url}`,
    medicalSpecialty: input.specialty,
    areaServed: { "@type": "Country", name: input.countryName },
    ...(input.reviewerPhysician ? { reviewedBy: input.reviewerPhysician } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified, lastReviewed: input.dateModified } : {}),
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

/**
 * Schema.org `Service` + nested `Offer[]` for a priced consultation hub (e.g.
 * the GP consultation page). One `Offer` per bookable service card actually
 * rendered on the page — prices/currency are passed in from the same
 * server-fetched catalogue the page renders, never hardcoded, so the schema
 * can't drift from what a visitor sees.
 */
export function consultationServiceOffersJsonLd(input: {
  name: string;
  description: string;
  serviceType: string;
  countryName: string;
  url: string;
  offers: Array<{
    name: string;
    url: string;
    priceCents: number;
    currencyCode: string;
    durationMinutes?: number | null;
  }>;
}) {
  if (input.offers.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    serviceType: input.serviceType,
    url: input.url.startsWith("http") ? input.url : `${SITE_URL}${input.url}`,
    areaServed: { "@type": "Country", name: input.countryName },
    provider: { "@type": "MedicalOrganization", "@id": ORGANIZATION_ID, name: SITE_NAME },
    offers: input.offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      url: offer.url.startsWith("http") ? offer.url : `${SITE_URL}${offer.url}`,
      price: (offer.priceCents / 100).toFixed(2),
      priceCurrency: offer.currencyCode,
      availability: "https://schema.org/InStock",
      ...(offer.durationMinutes != null
        ? { eligibleDuration: { "@type": "QuantitativeValue", value: offer.durationMinutes, unitCode: "MIN" } }
        : {}),
    })),
  };
}

/**
 * Schema.org `Product` + nested `Offer` for one subscription plan tier on the
 * pricing page. Called once per plan from the same server-fetched plan list
 * the cards render, so price/currency always match what's on screen.
 */
export function subscriptionPlanProductJsonLd(input: {
  name: string;
  description?: string | null;
  url: string;
  priceCents: number;
  currencyCode: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.url.startsWith("http") ? input.url : `${SITE_URL}${input.url}`,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      price: (input.priceCents / 100).toFixed(2),
      priceCurrency: input.currencyCode,
      availability: "https://schema.org/InStock",
      url: input.url.startsWith("http") ? input.url : `${SITE_URL}${input.url}`,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: (input.priceCents / 100).toFixed(2),
        priceCurrency: input.currencyCode,
        unitCode: "MON",
        billingDuration: 1,
        billingIncrement: 1,
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
