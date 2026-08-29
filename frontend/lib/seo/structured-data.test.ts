import { describe, expect, it } from "vitest";
import {
  aggregateRatingJsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
  consultationServiceOffersJsonLd,
  medicalClinicServiceJsonLd,
  medicalProcedureJsonLd,
  organizationJsonLd,
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
    expect(article.reviewedBy).toMatchObject({
      "@type": "Physician",
      name: "Dr Clinical Reviewer",
      identifier: {
        "@type": "PropertyValue",
        propertyID: "Medical Council",
        value: "67890",
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

  it("keeps the clinic service node but omits its ReserveAction when booking is unavailable", () => {
    const result = medicalClinicServiceJsonLd({
      serviceName: "Cardiology consultation",
      description: "Remote cardiology consultation.",
      specialty: "Cardiovascular",
      countryName: "Ireland",
      countrySlug: "ireland",
      url: "/ireland/en/services/cardiology",
      bookingUrl: null,
    });

    expect(result.availableService).not.toHaveProperty("potentialAction");
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
