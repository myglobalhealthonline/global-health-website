import { describe, expect, it } from "vitest";
import {
  isRetiredHealthSlug,
  resolveHealthCanonicalServiceSlug,
} from "@/lib/seo/health-service-canonical";

describe("resolveHealthCanonicalServiceSlug", () => {
  it.each([
    ["portugal", "atestado-medico-online", "baixa-medica"],
    ["czechia", "neschopenka-online", "neschopenka-online"],
  ])("maps %s/%s to /services/%s", (country, slug, expected) => {
    expect(resolveHealthCanonicalServiceSlug(country, slug)).toBe(expected);
  });

  it.each([
    ["ireland", "diabetes"],
    ["ireland", "arabic-speaking-doctor"],
    ["ireland", "expat-healthcare"],
    ["ireland", "hypertension"],
    ["ireland", "international-students"],
    ["ireland", "migraine"],
    ["ireland", "online-prescription-ireland"],
    ["ireland", "respiratory-infections"],
    // Retired behind a redirect (see isRetiredHealthSlug below), not
    // canonical-only — resolveHealthCanonicalServiceSlug correctly knows
    // nothing about it.
    ["ireland", "sick-cert-online"],
    ["portugal", "diabetes"],
    ["portugal", "enxaqueca"],
    ["portugal", "hipertensao"],
    ["portugal", "infecoes-respiratorias"],
  ])("leaves %s/%s self-canonical", (country, slug) => {
    expect(resolveHealthCanonicalServiceSlug(country, slug)).toBeNull();
  });

  it("returns null for unknown country/slug combinations", () => {
    expect(resolveHealthCanonicalServiceSlug("spain", "diabetes")).toBeNull();
  });
});

describe("isRetiredHealthSlug", () => {
  it.each([
    ["ireland", "international-students"],
    ["ireland", "sick-cert-online"],
  ])("retires %s/%s behind a redirect", (country, slug) => {
    expect(isRetiredHealthSlug(country, slug)).toBe(true);
  });

  it.each([
    ["ireland", "diabetes"],
    ["portugal", "atestado-medico-online"],
  ])("leaves %s/%s live", (country, slug) => {
    expect(isRetiredHealthSlug(country, slug)).toBe(false);
  });
});
