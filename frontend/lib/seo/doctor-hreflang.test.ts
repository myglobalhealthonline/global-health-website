import { describe, expect, it } from "vitest";
import { getCountryByCode } from "@/data/countries";
import { indexableHreflangCluster } from "@/lib/seo/hreflang";
import {
  isPublicDoctorRecordIndexable,
  type PublicationIssue,
} from "@/lib/content/publication-validation";
import type { PublicDoctorRecord } from "@/lib/content/get-public-doctors";

/**
 * Doctor hreflang alignment. The profile page has always set `noindex` from
 * `isPublicDoctorRecordIndexable`, but its hreflang cluster was built from the
 * country's full locale list — so a noindexed variant was still advertised as a
 * publishable alternate by its five siblings, and the sitemap (which does
 * filter on the same rule) disagreed with both.
 *
 * These tests cover the two halves of the fix: the shared rule deciding which
 * locales are eligible, and the cluster builder turning that verdict into
 * `alternates.languages`. They deliberately reuse the SAME predicate the robots
 * tag and `app/sitemap.ts` call — a second, hreflang-specific publication rule
 * is exactly what this batch exists to prevent.
 */

const IE = getCountryByCode("ie")!;
const BR = getCountryByCode("br")!;
const CZ = getCountryByCode("cz")!;

/** A doctor record that satisfies every publication rule. */
function doctorRecord(overrides: Partial<PublicDoctorRecord> = {}): PublicDoctorRecord {
  return {
    fullName: "Dr Ahmed Maklad",
    title: "General Practitioner",
    bio:
      "Dr Maklad has practised general medicine for over fifteen years across " +
      "Czechia and Ireland, with a particular focus on chronic disease review, " +
      "men's health and same-day acute presentations in adults.",
    languages: ["English", "Czech", "Arabic"],
    specialties: ["General Practice"],
    imcRegistration: "123456",
    medicalRegistrationUrl: "https://www.medicalcouncil.ie/",
    qualifications: ["MB BCh BAO"],
    editorialChecklist: { readyToIndex: true },
    ...overrides,
  } as PublicDoctorRecord;
}

/** Locales of `country` in which `bySlug` reports the doctor indexable. */
function eligibleLocales(
  country: typeof IE,
  perLocale: Record<string, PublicDoctorRecord | undefined>,
): string[] {
  return (country.supportedLocales ?? [country.defaultLocale])
    .map((l) => l.toLowerCase())
    .filter((l) => {
      const record = perLocale[l];
      return record != null && isPublicDoctorRecordIndexable(record);
    });
}

describe("indexableHreflangCluster", () => {
  it("advertises an indexable doctor locale", () => {
    const cluster = indexableHreflangCluster(IE, "/doctors/dr-x", ["en"]);
    expect(cluster).toEqual({
      "en-IE": "/ireland/en/doctors/dr-x",
      "x-default": "/ireland/en/doctors/dr-x",
    });
  });

  it("excludes noindex locales — partial cluster only", () => {
    // The §4 case: en/es/pt publishable, de/cs/ro not.
    const cluster = indexableHreflangCluster(IE, "/doctors/dr-x", ["en", "es", "pt"]);
    expect(Object.keys(cluster!).sort()).toEqual(["en-IE", "es-IE", "pt-IE", "x-default"]);
    expect(cluster).not.toHaveProperty("de-IE");
    expect(cluster).not.toHaveProperty("cs-IE");
    expect(cluster).not.toHaveProperty("ro-IE");
  });

  it("advertises nothing when no locale qualifies (retired, gone or missing)", () => {
    expect(indexableHreflangCluster(IE, "/doctors/dr-grainne-ahern", [])).toBeUndefined();
  });

  it("points x-default at the market's own language when it qualifies", () => {
    const cluster = indexableHreflangCluster(IE, "/doctors/dr-x", ["pt", "en", "es"]);
    expect(cluster!["x-default"]).toBe("/ireland/en/doctors/dr-x");
  });

  it("never points x-default at an excluded locale", () => {
    // Default locale not publishable — x-default falls to the first locale in
    // the country's CONFIGURED order that is (Ireland: en, pt, es, cs, ro, de),
    // so `pt` wins over `es` regardless of the order the caller passed them in.
    const cluster = indexableHreflangCluster(IE, "/doctors/dr-x", ["es", "pt"]);
    expect(cluster!["x-default"]).toBe("/ireland/pt/doctors/dr-x");
    expect(Object.values(cluster!)).not.toContain("/ireland/en/doctors/dr-x");
  });

  it("is deterministic in the country's configured locale order, not the caller's", () => {
    const a = indexableHreflangCluster(IE, "/doctors/dr-x", ["ro", "es", "pt"]);
    const b = indexableHreflangCluster(IE, "/doctors/dr-x", ["pt", "ro", "es"]);
    expect(a).toEqual(b);
    expect(a!["x-default"]).toBe("/ireland/pt/doctors/dr-x");
  });

  it("does not invent locales a market does not support", () => {
    // Brazil runs pt/en/es only — cs/ro/de must never appear even if offered.
    const cluster = indexableHreflangCluster(BR, "/doctors/dr-renato-sarmento", [
      "pt",
      "en",
      "es",
      "cs",
      "ro",
      "de",
    ]);
    expect(Object.keys(cluster!).sort()).toEqual(["en-BR", "es-BR", "pt-BR", "x-default"]);
    expect(cluster!["x-default"]).toBe("/brazil/pt/doctors/dr-renato-sarmento");
  });

  it("builds each market's cluster under its own slug and region", () => {
    // A legitimately cross-market clinician gets an independent cluster per
    // market — never one market's URLs advertised under the other's region.
    const cz = indexableHreflangCluster(CZ, "/doctors/dr-ahmed-maklad", ["cs", "en"]);
    const ie = indexableHreflangCluster(IE, "/doctors/dr-ahmed-maklad", ["en"]);
    expect(cz!["cs-CZ"]).toBe("/czechia/cs/doctors/dr-ahmed-maklad");
    expect(ie!["en-IE"]).toBe("/ireland/en/doctors/dr-ahmed-maklad");
    expect(Object.keys(cz!)).not.toContain("en-IE");
    expect(Object.keys(ie!)).not.toContain("cs-CZ");
  });
});

describe("eligibility comes from the shared doctor publication rule", () => {
  it("includes a locale whose market record is indexable", () => {
    const perLocale = { en: doctorRecord() };
    expect(eligibleLocales(IE, perLocale)).toEqual(["en"]);
    expect(indexableHreflangCluster(IE, "/doctors/d", eligibleLocales(IE, perLocale))).toEqual({
      "en-IE": "/ireland/en/doctors/d",
      "x-default": "/ireland/en/doctors/d",
    });
  });

  it("excludes a locale held back by publication state, not by a second rule", () => {
    // readyToIndex false is the ONLY difference: the page already noindexes it,
    // so the cluster must drop it too.
    const perLocale = {
      en: doctorRecord(),
      es: doctorRecord({ editorialChecklist: { readyToIndex: false } }),
      pt: doctorRecord({ bio: "Too short." }),
      cs: doctorRecord({ imcRegistration: undefined, medicalRegistrationUrl: undefined }),
    };
    expect(eligibleLocales(IE, perLocale)).toEqual(["en"]);
  });

  it("excludes a locale with no market record at all — invalid country profile", () => {
    // A slug that resolves only in another market never appears in this
    // market's roster, so it is simply absent rather than specially handled.
    expect(eligibleLocales(IE, { en: undefined, es: undefined })).toEqual([]);
    expect(indexableHreflangCluster(IE, "/doctors/foreign", [])).toBeUndefined();
  });

  it("keeps a partially published doctor's real locales", () => {
    // Mirrors the live pt/dr-tiago-miguel-figueira shape: publishable in
    // pt/en/es/de, held back in cs/ro.
    const PT = getCountryByCode("pt")!;
    const perLocale = {
      pt: doctorRecord(),
      en: doctorRecord(),
      es: doctorRecord(),
      de: doctorRecord(),
      cs: doctorRecord({ editorialChecklist: { readyToIndex: false } }),
      ro: doctorRecord({ editorialChecklist: { readyToIndex: false } }),
    };
    const eligible = eligibleLocales(PT, perLocale);
    expect(eligible.sort()).toEqual(["de", "en", "es", "pt"]);
    const cluster = indexableHreflangCluster(PT, "/doctors/dr-tiago-miguel-figueira", eligible);
    expect(Object.keys(cluster!).sort()).toEqual([
      "de-PT",
      "en-PT",
      "es-PT",
      "pt-PT",
      "x-default",
    ]);
    expect(cluster!["x-default"]).toBe("/portugal/pt/doctors/dr-tiago-miguel-figueira");
  });
});

describe("cluster is a subset of what the sitemap submits", () => {
  it("every advertised target is a locale the same rule marks indexable", () => {
    // The §8 invariant, stated as a property: whatever set of locales the rule
    // approves, the cluster's keys are exactly those locales plus x-default,
    // and x-default reuses one of their URLs rather than a seventh URL.
    for (const eligible of [["en"], ["en", "es"], ["es", "pt", "ro"], ["en", "pt", "cs", "de"]]) {
      const cluster = indexableHreflangCluster(IE, "/doctors/d", eligible)!;
      const targets = Object.entries(cluster)
        .filter(([tag]) => tag !== "x-default")
        .map(([, url]) => url);
      expect(targets.length).toBe(eligible.length);
      for (const url of targets) {
        expect(eligible).toContain(url.split("/")[2]);
      }
      expect(targets).toContain(cluster["x-default"]);
    }
  });
});

// Keeps the import meaningful if the issue shape is ever re-exported.
export type _Issue = PublicationIssue;
