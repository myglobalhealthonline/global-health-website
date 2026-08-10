import { describe, expect, it } from "vitest";
import {
  isRetiredHealthSlug,
  resolveHealthCanonicalServiceSlug,
} from "@/lib/seo/health-service-canonical";

describe("resolveHealthCanonicalServiceSlug", () => {
  it.each([["czechia", "neschopenka-online", "neschopenka-online"]])(
    "maps %s/%s to /services/%s",
    (country, slug, expected) => {
      expect(resolveHealthCanonicalServiceSlug(country, slug)).toBe(expected);
    },
  );

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
    // Same as ireland:sick-cert-online — retired behind a redirect
    // (2026-08-11), not canonical-only.
    ["portugal", "atestado-medico-online"],
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
    ["portugal", "atestado-medico-online"],
  ])("retires %s/%s behind a redirect", (country, slug) => {
    expect(isRetiredHealthSlug(country, slug)).toBe(true);
  });

  it.each([
    ["ireland", "diabetes"],
    ["czechia", "neschopenka-online"],
  ])("leaves %s/%s live", (country, slug) => {
    expect(isRetiredHealthSlug(country, slug)).toBe(false);
  });
});

/**
 * AlsoAvailableIn gating (app/[country]/[lang]/health/[slug]/page.tsx):
 * `resolveHealthCanonicalServiceSlug` is the SAME predicate the page uses to
 * decide whether to suppress its `AlsoAvailableIn` cross-locale sibling
 * links (non-null => canonical alias => suppressed). page.tsx itself is
 * outside vitest's scope (see vitest.config.ts `include` — app/ is
 * excluded), so this predicate's truth table IS the regression test for
 * that gating decision.
 */
describe("AlsoAvailableIn gating predicate", () => {
  it("is non-null (suppress sibling links) for a canonical-alias health page", () => {
    expect(resolveHealthCanonicalServiceSlug("czechia", "neschopenka-online")).not.toBeNull();
  });

  it("is null (render sibling links normally) for an independent health page", () => {
    expect(resolveHealthCanonicalServiceSlug("ireland", "diabetes")).toBeNull();
  });
});
