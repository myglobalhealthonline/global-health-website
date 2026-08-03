import { describe, expect, it } from "vitest";
import { aggregateRatingJsonLd, organizationJsonLd } from "./structured-data";

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
