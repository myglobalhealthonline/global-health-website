import type { Metadata } from "next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { countries as seedCountries } from "@/data/countries";

/**
 * Regression guard for the root ↔ market hreflang architecture
 * (SEO-FOUNDATION-004, 2026-08-13).
 *
 * The architecture these tests pin:
 *   • `/` — the content-negotiated country/language gate — belongs to NO
 *     hreflang cluster. It is not an alternate version of any market
 *     homepage, so it emits no `alternates.languages` at all.
 *   • Each market homepage keeps its own cluster: one `{lang}-{REGION}` row
 *     per supported locale, plus `x-default` → that market's default-locale
 *     home. No market cluster contains `/`.
 *
 * What this file deliberately does NOT assert: that a URL may never carry the
 * same hreflang value in two clusters. `pt-IE`, `pt-CZ`, `pt-PT` and `pt-BR`
 * are all legitimate and all distinct. Only the invariants the architecture
 * above actually requires are enforced here.
 */

/* ------------------------------------------------------------------- mocks */

const LOCALE = "en";

vi.mock("@/lib/i18n/get-page-locale", () => ({
  getPageLocale: vi.fn(async () => LOCALE),
}));

vi.mock("@/lib/content/get-public-countries", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    // The gate's metadata must not depend on the country list any more; kept
    // mocked so an accidental re-introduction fails here rather than hanging
    // on a network call.
    getPublicCountriesMerged: vi.fn(async () => seedCountries),
    getPublicCountryByCode: vi.fn(async (code: string) =>
      seedCountries.find((c) => c.code === code.toLowerCase()) ?? null,
    ),
  };
});

vi.mock("@/lib/content/get-page-content", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPageContent: vi.fn(async () => ({ record: null })),
}));

/* ------------------------------------------------------------------- setup */

const alternatesOf = (meta: Metadata) => meta.alternates ?? {};
const languagesOf = (meta: Metadata) =>
  (alternatesOf(meta).languages ?? {}) as Record<string, string>;
const robotsOf = (meta: Metadata) => meta.robots as { index?: boolean; follow?: boolean } | null;

/** country slug → { lang → metadata } for the locales under test. */
const homeMeta: Record<string, Record<string, Metadata>> = {};
let gateMeta: Metadata;

/** (slug, lang) pairs covering every market's default locale plus one
 *  non-default locale, which is where the removed return link used to differ. */
const CASES: Array<[string, string]> = [
  ["ireland", "en"],
  ["ireland", "cs"],
  ["portugal", "pt"],
  ["brazil", "pt"],
  ["czechia", "cs"],
  ["spain", "es"],
  ["romania", "ro"],
];

beforeAll(async () => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  const gate = await import("@/app/(global)/page");
  gateMeta = await gate.generateMetadata();
  const home = await import("@/app/[country]/[lang]/page");
  for (const [country, lang] of CASES) {
    homeMeta[country] ??= {};
    homeMeta[country][lang] = await home.generateMetadata({
      params: Promise.resolve({ country, lang }),
    });
  }
});

const configFor = (slug: string) => {
  const config = seedCountries.find((c) => c.slug === slug);
  if (!config) throw new Error(`no seed country for slug ${slug}`);
  return config;
};

/* ------------------------------------------------------------------- tests */

describe("global entry gate `/`", () => {
  it("emits no hreflang language cluster", () => {
    // `/` is a selector, not an alternate version of any market homepage.
    expect(alternatesOf(gateMeta).languages).toBeUndefined();
  });

  it("keeps its self-canonical on the bare origin", () => {
    expect(String(alternatesOf(gateMeta).canonical)).toBe(
      "https://www.myglobalhealth.online",
    );
  });

  it("stays indexable", () => {
    expect(robotsOf(gateMeta)?.index).toBe(true);
    expect(robotsOf(gateMeta)?.follow).toBe(true);
  });
});

describe("market homepage clusters", () => {
  it("never point at the global gate", () => {
    // The regression: `/portugal/pt` emitted `pt → /`, `/ireland/en` emitted
    // `en → /`, and so on — six pages each declaring the same
    // content-negotiated URL to be a different language.
    for (const [country, lang] of CASES) {
      const languages = languagesOf(homeMeta[country][lang]);
      for (const [tag, target] of Object.entries(languages)) {
        expect(String(target), `${country}/${lang} → ${tag}`).not.toBe("/");
      }
    }
  });

  it("carry no language-only hreflang key", () => {
    // Every market row is region-qualified; the only non-region key allowed
    // in a market cluster is `x-default`.
    for (const [country, lang] of CASES) {
      for (const tag of Object.keys(languagesOf(homeMeta[country][lang]))) {
        if (tag === "x-default") continue;
        expect(tag, `${country}/${lang}`).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      }
    }
  });

  it("contain exactly this market's supported locales, and nothing else", () => {
    for (const [country, lang] of CASES) {
      const config = configFor(country);
      const region = config.code.toUpperCase();
      const languages = languagesOf(homeMeta[country][lang]);
      const expected = new Set(
        config.supportedLocales.map((l) => `${l.toLowerCase()}-${region}`),
      );
      const actual = new Set(Object.keys(languages).filter((t) => t !== "x-default"));
      expect(actual, `${country}/${lang}`).toEqual(expected);
      for (const [tag, target] of Object.entries(languages)) {
        if (tag === "x-default") continue;
        expect(String(target)).toBe(`/${country}/${tag.split("-")[0]}`);
      }
    }
  });

  it("keep exactly one x-default, pointing at the market's default locale", () => {
    for (const [country, lang] of CASES) {
      const config = configFor(country);
      const languages = languagesOf(homeMeta[country][lang]);
      expect(String(languages["x-default"]), `${country}/${lang}`).toBe(
        `/${country}/${config.defaultLocale.toLowerCase()}`,
      );
    }
  });

  it("stay reciprocal across the market's own locale variants", () => {
    // Every locale variant of a market advertises the identical cluster, so
    // each member names every other member — including itself.
    for (const country of Object.keys(homeMeta)) {
      const langs = Object.keys(homeMeta[country]);
      if (langs.length < 2) continue;
      const clusters = langs.map((l) => languagesOf(homeMeta[country][l]));
      for (const cluster of clusters.slice(1)) {
        expect(cluster, country).toEqual(clusters[0]);
      }
      const region = configFor(country).code.toUpperCase();
      for (const lang of langs) {
        expect(Object.values(clusters[0]).map(String)).toContain(`/${country}/${lang}`);
        expect(clusters[0][`${lang}-${region}`]).toBeDefined();
      }
    }
  });

  it("keeps each homepage self-canonical and indexable", () => {
    for (const [country, lang] of CASES) {
      const meta = homeMeta[country][lang];
      expect(String(alternatesOf(meta).canonical)).toBe(
        `https://www.myglobalhealth.online/${country}/${lang}`,
      );
      expect(robotsOf(meta)?.index, `${country}/${lang}`).toBe(true);
      expect(robotsOf(meta)?.follow, `${country}/${lang}`).toBe(true);
    }
  });
});

describe("Portugal and Brazil stay separate markets", () => {
  it("keeps pt-PT and pt-BR in disjoint clusters", () => {
    const portugal = languagesOf(homeMeta.portugal.pt);
    const brazil = languagesOf(homeMeta.brazil.pt);

    expect(portugal["pt-PT"]).toBe("/portugal/pt");
    expect(brazil["pt-BR"]).toBe("/brazil/pt");
    // Neither market claims the other's URLs.
    expect(portugal["pt-BR"]).toBeUndefined();
    expect(brazil["pt-PT"]).toBeUndefined();
    for (const target of Object.values(portugal)) {
      expect(String(target).startsWith("/portugal/")).toBe(true);
    }
    for (const target of Object.values(brazil)) {
      expect(String(target).startsWith("/brazil/")).toBe(true);
    }
    // …and neither claims the generic `pt` that used to point at `/`.
    expect(portugal.pt).toBeUndefined();
    expect(brazil.pt).toBeUndefined();
  });
});
