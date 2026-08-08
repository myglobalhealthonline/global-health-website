import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCountryByCode } from "@/data/countries";
import { indexableHreflangCluster } from "@/lib/seo/hreflang";
import type { PublicDoctorRecord } from "@/lib/content/get-public-doctors";

/**
 * Doctor hreflang alignment. The profile page has always set `noindex` from
 * `isPublicDoctorRecordIndexable`, but its hreflang cluster was built from the
 * country's full locale list — so a noindexed variant was still advertised as a
 * publishable alternate by its siblings, and the sitemap (which does filter on
 * the same rule) disagreed with both.
 *
 * The invariant these tests pin:
 *   • current page indexable → cluster of ONLY indexable locales, itself included
 *   • current page noindex   → no cluster at all, as neither target nor source
 *
 * They reuse the SAME predicate the robots tag and `app/sitemap.ts` call — a
 * second, hreflang-specific publication rule is what this batch exists to
 * prevent.
 */

const rosterByLocale = vi.hoisted(() => ({
  value: {} as Record<string, PublicDoctorRecord[]>,
}));

vi.mock("@/lib/content/get-public-doctors", () => ({
  getPublicDoctorsForMarket: vi.fn(async (_code: string, locale?: string) =>
    rosterByLocale.value[(locale ?? "").toLowerCase()] ?? [],
  ),
}));

const { doctorHreflangCluster } = await import("@/lib/seo/doctor-hreflang");
const { getPublicDoctorsForMarket } = await import("@/lib/content/get-public-doctors");

const IE = getCountryByCode("ie")!;
const PT = getCountryByCode("pt")!;
const CZ = getCountryByCode("cz")!;
const BR = getCountryByCode("br")!;

/** A doctor record that satisfies every publication rule. */
function doctorRecord(overrides: Partial<PublicDoctorRecord> = {}): PublicDoctorRecord {
  return {
    slug: "dr-ahmed-maklad",
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

/** Publish `slug` in exactly these locales; every other locale gets an empty roster. */
function publishIn(locales: string[], overrides: Partial<PublicDoctorRecord> = {}) {
  rosterByLocale.value = Object.fromEntries(
    locales.map((l) => [l, [doctorRecord(overrides)]]),
  );
}

beforeEach(() => {
  rosterByLocale.value = {};
  vi.mocked(getPublicDoctorsForMarket).mockClear();
});

describe("current page INDEXABLE", () => {
  it("1. all siblings indexable → full cluster", async () => {
    publishIn(["en", "pt", "es", "cs", "ro", "de"]);
    const cluster = await doctorHreflangCluster(IE, "dr-ahmed-maklad", "en", true);
    expect(Object.keys(cluster!).sort()).toEqual([
      "cs-IE",
      "de-IE",
      "en-IE",
      "es-IE",
      "pt-IE",
      "ro-IE",
      "x-default",
    ]);
    expect(cluster!["en-IE"]).toBe("/ireland/en/doctors/dr-ahmed-maklad");
  });

  it("2. some siblings noindex → partial cluster", async () => {
    // Mirrors the live pt/dr-tiago-miguel-figueira shape.
    publishIn(["pt", "en", "es", "de"], { slug: "dr-tiago-miguel-figueira" });
    const cluster = await doctorHreflangCluster(PT, "dr-tiago-miguel-figueira", "pt", true);
    expect(Object.keys(cluster!).sort()).toEqual([
      "de-PT",
      "en-PT",
      "es-PT",
      "pt-PT",
      "x-default",
    ]);
    expect(cluster).not.toHaveProperty("cs-PT");
    expect(cluster).not.toHaveProperty("ro-PT");
  });

  it("includes the current locale without consulting the roster for it", async () => {
    // The current locale's verdict is the page's own `indexable`, so no roster
    // read is spent on it — only the five siblings.
    publishIn([]);
    const cluster = await doctorHreflangCluster(IE, "dr-ahmed-maklad", "en", true);
    expect(cluster).toEqual({
      "en-IE": "/ireland/en/doctors/dr-ahmed-maklad",
      "x-default": "/ireland/en/doctors/dr-ahmed-maklad",
    });
    expect(vi.mocked(getPublicDoctorsForMarket).mock.calls.map((c) => c[1])).toEqual([
      "pt",
      "es",
      "cs",
      "ro",
      "de",
    ]);
  });

  it("excludes a sibling held back by publication state, not by a second rule", async () => {
    rosterByLocale.value = {
      es: [doctorRecord()],
      pt: [doctorRecord({ editorialChecklist: { readyToIndex: false } })],
      cs: [doctorRecord({ bio: "Too short." })],
      ro: [doctorRecord({ imcRegistration: undefined, medicalRegistrationUrl: undefined })],
      de: [],
    };
    const cluster = await doctorHreflangCluster(IE, "dr-ahmed-maklad", "en", true);
    expect(Object.keys(cluster!).sort()).toEqual(["en-IE", "es-IE", "x-default"]);
  });

  it("excludes a sibling whose roster holds a different doctor entirely", async () => {
    rosterByLocale.value = { pt: [doctorRecord({ slug: "someone-else" })] };
    const cluster = await doctorHreflangCluster(IE, "dr-ahmed-maklad", "en", true);
    expect(Object.keys(cluster!).sort()).toEqual(["en-IE", "x-default"]);
  });

  it("5. x-default never points at a noindex locale", async () => {
    // Default locale (en) is NOT the current page and is not published; the
    // current page is `pt`, so x-default must land on a published locale.
    publishIn(["pt", "es"]);
    const cluster = await doctorHreflangCluster(IE, "dr-ahmed-maklad", "pt", true);
    expect(cluster!["x-default"]).toBe("/ireland/pt/doctors/dr-ahmed-maklad");
    expect(Object.values(cluster!)).not.toContain("/ireland/en/doctors/dr-ahmed-maklad");
  });

  it("prefers the market's own language for x-default when it qualifies", async () => {
    publishIn(["en", "pt", "es"]);
    const cluster = await doctorHreflangCluster(IE, "dr-ahmed-maklad", "es", true);
    expect(cluster!["x-default"]).toBe("/ireland/en/doctors/dr-ahmed-maklad");
  });

  it("6. legitimate cross-market doctors keep an independent cluster per market", async () => {
    publishIn(["cs", "en", "pt", "es", "ro", "de"]);
    const cz = await doctorHreflangCluster(CZ, "dr-ahmed-maklad", "cs", true);
    const ie = await doctorHreflangCluster(IE, "dr-ahmed-maklad", "en", true);
    expect(cz!["cs-CZ"]).toBe("/czechia/cs/doctors/dr-ahmed-maklad");
    expect(cz!["x-default"]).toBe("/czechia/cs/doctors/dr-ahmed-maklad");
    expect(ie!["en-IE"]).toBe("/ireland/en/doctors/dr-ahmed-maklad");
    expect(ie!["x-default"]).toBe("/ireland/en/doctors/dr-ahmed-maklad");
    expect(Object.keys(cz!)).not.toContain("en-IE");
    expect(Object.keys(ie!)).not.toContain("cs-CZ");
  });

  it("does not invent locales a market does not support", async () => {
    publishIn(["pt", "en", "es", "cs", "ro", "de"], { slug: "dr-renato-sarmento" });
    const cluster = await doctorHreflangCluster(BR, "dr-renato-sarmento", "pt", true);
    expect(Object.keys(cluster!).sort()).toEqual(["en-BR", "es-BR", "pt-BR", "x-default"]);
  });
});

describe("current page NOINDEX", () => {
  it("3. valid indexable siblings exist → still zero alternates", async () => {
    // The live /portugal/cs/doctors/dr-tiago-miguel-figueira case: pt/en/es/de
    // are genuinely publishable, but this page is noindex so it participates in
    // no cluster, as neither target nor source.
    publishIn(["pt", "en", "es", "de"], { slug: "dr-tiago-miguel-figueira" });
    const cluster = await doctorHreflangCluster(PT, "dr-tiago-miguel-figueira", "cs", false);
    expect(cluster).toBeUndefined();
  });

  it("4. no valid siblings → zero alternates", async () => {
    publishIn([]);
    expect(await doctorHreflangCluster(IE, "dr-arooj-iqbal-lodhi", "en", false)).toBeUndefined();
  });

  it("reads no market rosters at all when the page is noindex", async () => {
    publishIn(["pt", "en", "es", "de"]);
    await doctorHreflangCluster(PT, "dr-tiago-miguel-figueira", "cs", false);
    expect(vi.mocked(getPublicDoctorsForMarket)).not.toHaveBeenCalled();
  });

  it("covers retired, gone and foreign-market slugs without a rule of their own", async () => {
    // A retired doctor 410s at the edge and a foreign-market slug is absent
    // from this market's roster; both arrive here as "not indexable".
    publishIn([]);
    expect(await doctorHreflangCluster(IE, "dr-grainne-ahern", "en", false)).toBeUndefined();
    expect(await doctorHreflangCluster(IE, "dr-silvina-irale", "en", false)).toBeUndefined();
  });
});

describe("cluster shape", () => {
  it("advertises exactly the eligible locales plus an x-default reusing one of them", () => {
    // The §8 invariant as a property of the builder itself.
    for (const eligible of [["en"], ["en", "es"], ["es", "pt", "ro"], ["en", "pt", "cs", "de"]]) {
      const cluster = indexableHreflangCluster(IE, "/doctors/d", eligible)!;
      const targets = Object.entries(cluster)
        .filter(([tag]) => tag !== "x-default")
        .map(([, url]) => url);
      expect(targets.length).toBe(eligible.length);
      for (const url of targets) expect(eligible).toContain(url.split("/")[2]);
      expect(targets).toContain(cluster["x-default"]);
    }
  });

  it("returns undefined rather than an empty cluster", () => {
    expect(indexableHreflangCluster(IE, "/doctors/d", [])).toBeUndefined();
  });
});
