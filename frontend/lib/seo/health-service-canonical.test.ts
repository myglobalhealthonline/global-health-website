import { describe, expect, it } from "vitest";
import { resolveHealthCanonicalServiceSlug } from "@/lib/seo/health-service-canonical";

describe("resolveHealthCanonicalServiceSlug", () => {
  it.each([
    ["ireland", "sick-cert-online", "sick-certificate-ireland"],
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
