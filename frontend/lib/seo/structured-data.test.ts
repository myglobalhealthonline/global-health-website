import { describe, expect, it } from "vitest";
import {
  aggregateRatingJsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
  consultationServiceOffersJsonLd,
  countryMedicalOrganizationJsonLd,
  healthToolJsonLd,
  medicalClinicServiceJsonLd,
  medicalProcedureJsonLd,
  medicalSpecialtyForService,
  organizationJsonLd,
  physicianJsonLd,
} from "./structured-data";

const FRESH = new Date().toISOString();
const STALE = new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString();

describe("aggregateRatingJsonLd", () => {
  it("emits nothing for a null aggregate", () => {
    expect(aggregateRatingJsonLd(null)).toBeUndefined();
    expect(aggregateRatingJsonLd(undefined)).toBeUndefined();
  });

  it("emits nothing for a zero-count aggregate", () => {
    expect(aggregateRatingJsonLd({ rating: 4.8, count: 0, updatedAt: FRESH })).toBeUndefined();
  });

  it("emits nothing for a zero/negative rating", () => {
    expect(aggregateRatingJsonLd({ rating: 0, count: 120, updatedAt: FRESH })).toBeUndefined();
    expect(aggregateRatingJsonLd({ rating: -1, count: 120, updatedAt: FRESH })).toBeUndefined();
  });

  it("emits nothing for a rating outside the 0-5 scale", () => {
    expect(aggregateRatingJsonLd({ rating: 5.5, count: 120, updatedAt: FRESH })).toBeUndefined();
  });

  it("emits nothing for a non-integer count", () => {
    expect(aggregateRatingJsonLd({ rating: 4.8, count: 12.5, updatedAt: FRESH })).toBeUndefined();
  });

  it("emits nothing for an unparseable updatedAt", () => {
    expect(
      aggregateRatingJsonLd({ rating: 4.8, count: 120, updatedAt: "not-a-date" }),
    ).toBeUndefined();
  });

  it("emits nothing once the aggregate is stale (>~13 months old)", () => {
    expect(aggregateRatingJsonLd({ rating: 4.8, count: 120, updatedAt: STALE })).toBeUndefined();
  });

  it("emits a real AggregateRating for a fresh, positive, real snapshot", () => {
    expect(aggregateRatingJsonLd({ rating: 4.8, count: 213, updatedAt: FRESH })).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.8,
      reviewCount: 213,
      bestRating: 5,
      worstRating: 1,
    });
  });
});

describe("organizationJsonLd + aggregateRating wiring", () => {
  it("uses canonical MedicalSpecialty enumeration URLs", () => {
    const global = organizationJsonLd();
    const country = countryMedicalOrganizationJsonLd({
      name: "Ireland",
      slug: "ireland",
      url: "/ireland/en",
    });

    expect(global.medicalSpecialty).toEqual([
      "https://schema.org/PrimaryCare",
      "https://schema.org/Cardiovascular",
      "https://schema.org/Neurologic",
      "https://schema.org/Pediatric",
      "https://schema.org/Dermatology",
      "https://schema.org/Psychiatric",
    ]);
    expect(country.medicalSpecialty).toEqual([
      "https://schema.org/PrimaryCare",
      "https://schema.org/Cardiovascular",
      "https://schema.org/Dermatology",
      "https://schema.org/Psychiatric",
    ]);
  });

  it.each([
    ["nutrition-consultation", "DietNutrition"],
    ["online-physio", "Physiotherapy"],
    ["orthopaedic-pain", "Musculoskeletal"],
    ["acute-medical-consultation", "PrimaryCare"],
  ])("maps %s to a valid MedicalSpecialty member", (slug, expected) => {
    expect(medicalSpecialtyForService("consultation", slug)).toBe(expected);
  });

  it("omits aggregateRating entirely when the guard returns undefined (production's empty state)", () => {
    const org = organizationJsonLd([], aggregateRatingJsonLd(null));
    expect(org).not.toHaveProperty("aggregateRating");
    expect(JSON.stringify(org)).not.toContain("AggregateRating");
  });

  it("includes aggregateRating only when a real snapshot was resolved", () => {
    const org = organizationJsonLd([], aggregateRatingJsonLd({ rating: 4.9, count: 50, updatedAt: FRESH }));
    expect(org).toHaveProperty("aggregateRating");
    expect((org as { aggregateRating?: { ratingValue: number } }).aggregateRating?.ratingValue).toBe(4.9);
  });
});

describe("articleJsonLd blog author attribution", () => {
  it("uses the canonical medical-team Organization while retaining a named clinician reviewer", () => {
    const article = articleJsonLd({
      title: "When to seek medical help",
      url: "/ireland/en/blog/when-to-seek-medical-help",
      dateModified: "2026-08-30T12:34:56.000Z",
      authorName: "Global Health Medical Team",
      authorPhysician: {
        name: "Dr Legacy Author",
        url: "/ireland/en/doctors/legacy-author",
        registrationNumber: "12345",
        chamber: "Medical Council",
      },
      reviewerPhysician: {
        name: "Dr Clinical Reviewer",
        url: "/ireland/en/doctors/clinical-reviewer",
        registrationNumber: "67890",
        chamber: "Medical Council",
      },
    });

    expect(article.author).toMatchObject({
      "@type": "Organization",
      name: "Global Health Medical Team",
    });
    expect(article).not.toHaveProperty("reviewedBy");
    expect(article).not.toHaveProperty("lastReviewed");
    expect(article.dateModified).toBe("2026-08-30T12:34:56.000Z");
    expect(article.mainEntityOfPage).toMatchObject({
      "@type": "MedicalWebPage",
      lastReviewed: "2026-08-30",
      reviewedBy: {
        "@type": "Person",
        name: "Dr Clinical Reviewer",
        identifier: {
          "@type": "PropertyValue",
          propertyID: "Medical Council",
          value: "67890",
        },
      },
    });
  });
});

// SEO-FOUNDATION-005 — every page builds its breadcrumb `name` strings from
// the locale bundle (see breadcrumb-locale.test.ts); this only pins the
// shared builder's own contract: sequential position, absolute item URLs,
// and pure passthrough of whatever names it's given.
describe("breadcrumbJsonLd", () => {
  it("emits sequential positions and resolves relative URLs against the site", () => {
    const result = breadcrumbJsonLd([
      { name: "Domů", url: "/" },
      { name: "Česko", url: "/czechia/cs" },
      { name: "Lékaři", url: "/czechia/cs/doctors" },
    ]);
    expect(result["@type"]).toBe("BreadcrumbList");
    const items = result.itemListElement as Array<{ position: number; name: string; item: string }>;
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items.map((i) => i.name)).toEqual(["Domů", "Česko", "Lékaři"]);
    for (const item of items) {
      expect(item.item.startsWith("http")).toBe(true);
    }
  });

  it("leaves an already-absolute item URL untouched", () => {
    const result = breadcrumbJsonLd([{ name: "Home", url: "https://example.com/x" }]);
    const items = result.itemListElement as Array<{ item: string }>;
    expect(items[0].item).toBe("https://example.com/x");
  });
});

describe("booking availability schema parity", () => {
  it("keeps MedicalProcedure content but omits ReserveAction when booking is unavailable", () => {
    const result = medicalProcedureJsonLd({
      name: "Online GP consultation",
      description: "Speak with a clinician online.",
      countryName: "Ireland",
      url: "/ireland/en/gp-consultation-online",
      bookingUrl: null,
    });

    expect(result).not.toHaveProperty("potentialAction");
    expect(result).toMatchObject({
      "@type": "MedicalProcedure",
      name: "Online GP consultation",
    });
  });

  it("keeps the service page entity but omits its ReserveAction when booking is unavailable", () => {
    const result = medicalClinicServiceJsonLd({
      serviceName: "Cardiology consultation",
      description: "Remote cardiology consultation.",
      specialty: "Cardiovascular",
      url: "/ireland/en/services/cardiology",
      bookingUrl: null,
      dateModified: "2026-08-30T12:34:56.000Z",
    });

    expect(result).toMatchObject({
      "@type": "MedicalWebPage",
      specialty: "https://schema.org/Cardiovascular",
      mainEntity: { "@type": "MedicalProcedure" },
    });
    expect(result.mainEntity).not.toHaveProperty("potentialAction");
    expect(result).not.toHaveProperty("availableService");
    expect(result.dateModified).toBe("2026-08-30T12:34:56.000Z");
    expect(result.lastReviewed).toBe("2026-08-30");
  });

  it("emits InStock offers only for services whose visible Book action is enabled", () => {
    const result = consultationServiceOffersJsonLd({
      name: "Consultations",
      description: "Available consultations.",
      serviceType: "Online consultation",
      countryName: "Ireland",
      url: "/ireland/en/gp-consultation-online",
      offers: [
        {
          name: "Available GP",
          url: "/ireland/en/services/available-gp",
          priceCents: 5900,
          currencyCode: "EUR",
          bookable: true,
        },
        {
          name: "Paused GP",
          url: "/ireland/en/services/paused-gp",
          priceCents: 5900,
          currencyCode: "EUR",
          bookable: false,
        },
      ],
    });

    expect(result?.offers).toHaveLength(1);
    expect(result?.offers[0]).toMatchObject({
      name: "Available GP",
      availability: "https://schema.org/InStock",
    });
    expect(JSON.stringify(result)).not.toContain("Paused GP");
  });
});

describe("physicianJsonLd specialty typing", () => {
  it("models an individual clinician as a Person without an unverified specialty enum", () => {
    const physician = physicianJsonLd({
      name: "Dr Example",
      url: "/ireland/en/doctors/dr-example",
      specialty: "Cardiología",
      countryName: "Ireland",
    });

    expect(physician["@type"]).toBe("Person");
    expect(physician).not.toHaveProperty("medicalSpecialty");
    expect(physician).not.toHaveProperty("areaServed");
    expect(physician.knowsAbout).toBe("Cardiología");
  });
});

describe("healthToolJsonLd", () => {
  it("describes a free health tool as a page without inventing app reviews", () => {
    const tool = healthToolJsonLd({
      name: "BMI calculator",
      description: "Calculate body mass index.",
      url: "/portugal/cs/tools/bmi-calculator",
    });

    expect(tool["@type"]).toBe("MedicalWebPage");
    expect(tool.isAccessibleForFree).toBe(true);
    expect(tool).not.toHaveProperty("aggregateRating");
    expect(tool).not.toHaveProperty("review");
    expect(tool).not.toHaveProperty("offers");
  });
});
