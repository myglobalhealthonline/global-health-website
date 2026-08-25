import { beforeAll, describe, expect, it, vi } from "vitest";
import { PROD_SITE_URL } from "@/lib/seo/site-url";

/**
 * Regression guard for `app/sitemap.ts` (SEO-FOUNDATION-002).
 *
 * Every assertion here pins behaviour that is already live. The file exists so
 * later foundation batches cannot silently reintroduce a defect this sitemap
 * has already been fixed for. The four historical regressions the audit named
 * — empty Spain service URLs, omitted legal locales, redirecting blog URLs,
 * withheld Ireland doctors — each get a named test rather than a URL count.
 *
 * Deliberately NOT asserted: a total URL count. Content totals change legitimately.
 *
 * All content comes from fixtures below; no backend or DB is touched.
 */

/* ---------------------------------------------------------------- fixtures */

const F = vi.hoisted(() => {
  // Every timestamp in the fixture set. The "no build-time lastmod" test
  // asserts that nothing outside this set is ever emitted.
  const TS = {
    serviceIe: "2026-01-05T10:00:00.000Z",
    serviceEs: "2026-01-06T10:00:00.000Z",
    serviceCz: "2026-01-07T10:00:00.000Z",
    doctorIe: "2026-02-01T10:00:00.000Z",
    testIe: "2026-01-09T10:00:00.000Z",
    landingIe: "2026-01-10T10:00:00.000Z",
    landingCz: "2026-01-11T10:00:00.000Z",
    legalIeTerms: "2026-01-12T10:00:00.000Z",
    legalIePrivacy: "2026-01-13T10:00:00.000Z",
    blogGlobal: "2026-01-14T10:00:00.000Z",
    blogIe: "2026-01-15T10:00:00.000Z",
    planIe: "2026-01-16T10:00:00.000Z",
  };

  const countries = [
    {
      code: "ie",
      slug: "ireland",
      name: "Ireland",
      defaultLocale: "en",
      supportedLocales: ["en", "pt"],
      enabledFeatures: [
        "general-consultations",
        "specialist-consultations",
        "health-tests",
        "subscriptions",
      ],
    },
    {
      code: "es",
      slug: "spain",
      name: "Spain",
      defaultLocale: "es",
      supportedLocales: ["es", "en"],
      // No health-tests / specialist-consultations / subscriptions: the
      // feature-gated hub routes must not be emitted for this market.
      enabledFeatures: ["general-consultations"],
    },
    {
      code: "cz",
      slug: "czechia",
      name: "Czechia",
      defaultLocale: "cs",
      supportedLocales: ["cs"],
      enabledFeatures: ["general-consultations"],
    },
    {
      code: "br",
      slug: "brazil",
      name: "Brazil",
      defaultLocale: "pt",
      supportedLocales: ["pt", "en", "es"],
      enabledFeatures: ["general-consultations"],
    },
  ];

  const body = (word: string) =>
    `${word} `.repeat(40).trim(); // comfortably over the 120-char publication floor

  /** A service row as the public API merges it for ONE locale. */
  const service = (over: Record<string, unknown>) => ({
    id: "svc",
    kind: "GENERAL",
    slug: "gp-consultation-online",
    name: "GP consultation online",
    summary: null,
    seoTitle: null,
    seoDescription: null,
    heroTitle: null,
    heroDescription: null,
    detailBody: body("consultation"),
    ctaLabel: null,
    legacyPath: null,
    sortOrder: 0,
    durationMinutes: 15,
    basePriceCents: 3900,
    currencyCode: "EUR",
    imagePath: null,
    visibility: "PUBLIC",
    isActive: true,
    translatedFields: null,
    editorialChecklist: null,
    lastReviewedAt: null,
    ...over,
  });

  /** countryCode → locale → rows */
  const servicesByCountryLocale: Record<string, Record<string, unknown[]>> = {
    ie: {
      en: [service({ countryCode: "ie", resolvedLocale: "en", updatedAt: TS.serviceIe })],
      pt: [service({ countryCode: "ie", resolvedLocale: "en", updatedAt: TS.serviceIe })],
    },
    es: {
      es: [
        service({
          slug: "consulta-medica-online",
          countryCode: "es",
          resolvedLocale: "es",
          updatedAt: TS.serviceEs,
        }),
      ],
      // THE "24 empty Spain URLs" REGRESSION. The merge fell back to the
      // market default (`resolvedLocale: "es"`) and the body is an empty
      // `<p><br /></p>` — the page renders nothing and carries noindex.
      en: [
        service({
          slug: "consulta-medica-online",
          countryCode: "es",
          resolvedLocale: "es",
          detailBody: "<p><br /></p>",
          updatedAt: TS.serviceEs,
        }),
      ],
    },
    cz: {
      cs: [
        service({
          slug: "neschopenka-online",
          countryCode: "cz",
          resolvedLocale: "cs",
          updatedAt: TS.serviceCz,
        }),
      ],
    },
  };

  const doctor = (over: Record<string, unknown>) => ({
    id: "doc",
    slug: "dr-example",
    fullName: "Dr Example Clinician",
    title: "General Practitioner",
    bio: body("experienced"),
    imcRegistration: "IMC-123456",
    medicalRegistrationUrl: "https://example.test/register/123456",
    qualifications: ["MB BCh BAO"],
    languages: ["English"],
    specialties: ["General Practice"],
    countryCode: "ie",
    countryName: "Ireland",
    teamPath: "/team",
    profileImageFocalX: 50,
    profileImageFocalY: 50,
    profileImageZoom: 1,
    editorialChecklist: { readyToIndex: true },
    updatedAt: TS.doctorIe,
    ...over,
  });

  const doctorsByMarketLocale: Record<string, Record<string, unknown[]>> = {
    ie: {
      // THE "14 withheld Ireland doctors" REGRESSION: these rows only carry
      // the per-market registration number when read from the MARKET
      // endpoint. A doctor whose checklist is not ready must still be excluded.
      en: [
        doctor({}),
        doctor({ slug: "dr-draft", editorialChecklist: { readyToIndex: false } }),
      ],
      pt: [doctor({})],
    },
    es: { es: [], en: [] },
    cz: { cs: [] },
  };

  const healthTestsByCountry: Record<string, unknown[]> = {
    ie: [{ id: "t1", slug: "blood-panel", title: "Blood panel", updatedAt: TS.testIe }],
    es: [],
    cz: [],
  };

  const landingByCountry: Record<string, Array<Record<string, unknown>>> = {
    ie: [
      // Retired behind a 301 in next.config.ts — must never be submitted.
      { slug: "international-students", availableLocales: ["en"], updatedAt: TS.landingIe },
      // Real translations in both enabled locales.
      { slug: "diabetes", availableLocales: ["en", "pt"], updatedAt: TS.landingIe },
      // Only an English translation row — the pt URL would serve fallback copy.
      { slug: "migraine", availableLocales: ["en"], updatedAt: TS.landingIe },
      // Locale that the market does not enable at all.
      { slug: "hypertension", availableLocales: ["ro"], updatedAt: TS.landingIe },
    ],
    // Canonicalises onto /services/neschopenka-online — an alias, not a URL.
    cz: [{ slug: "neschopenka-online", availableLocales: ["cs"], updatedAt: TS.landingCz }],
    es: [],
  };

  const legalByCountry: Record<string, unknown> = {
    ie: {
      profile: null,
      documents: [
        { type: "TERMS_OF_SERVICE", locale: "EN", updatedAt: TS.legalIeTerms },
        { type: "TERMS_OF_SERVICE", locale: "PT", updatedAt: TS.legalIeTerms },
        // English only: the pt URL would serve the English fallback body.
        { type: "PRIVACY_POLICY", locale: "EN", updatedAt: TS.legalIePrivacy },
      ],
    },
    es: null,
    cz: null,
  };

  const globalBlogPosts = [
    { slug: "global-post", countries: [], publishedAt: TS.blogGlobal, localeVariants: [] },
    // Country-assigned: `/blog/{slug}` 308s to the country canonical, so the
    // bare URL must NOT be submitted. THE "redirecting blog URLs" REGRESSION.
    {
      slug: "ireland-post",
      countries: ["ie"],
      publishedAt: TS.blogIe,
      localeVariants: [
        { locale: "EN", slug: "ireland-post" },
        { locale: "PT", slug: "ireland-post-pt" },
      ],
    },
    {
      slug: "brazil-post",
      countries: ["br"],
      publishedAt: TS.blogIe,
      localeVariants: [
        { locale: "PT", slug: "brazil-post" },
        { locale: "CS", slug: "brazil-post-cs" },
        { locale: "DE", slug: "brazil-post-de" },
        { locale: "RO", slug: "brazil-post-ro" },
      ],
    },
  ];

  const blogByCountry: Record<string, unknown[]> = {
    ie: [globalBlogPosts[1]],
    es: [],
    cz: [],
    br: [globalBlogPosts[2]],
  };

  const plansByCountry: Record<string, unknown[]> = {
    ie: [{ id: "p1", updatedAt: TS.planIe }],
    es: [],
    cz: [],
  };

  return {
    TS,
    countries,
    servicesByCountryLocale,
    doctorsByMarketLocale,
    healthTestsByCountry,
    landingByCountry,
    legalByCountry,
    globalBlogPosts,
    blogByCountry,
    plansByCountry,
  };
});

/* ------------------------------------------------------------------- mocks */
// Only the data fetchers are mocked. Every decision helper the sitemap relies
// on (publication-validation, landing-locale-eligibility,
// health-service-canonical, exactLocalesForLegalType, country-features,
// hreflang, newest-timestamp) runs for real — otherwise these tests would
// assert the mocks rather than the behaviour.

vi.mock("@/lib/content/get-public-countries", () => ({
  getPublicCountriesMerged: vi.fn(async () => F.countries),
}));

vi.mock("@/lib/content/get-public-services", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPublicServicesForCountry: vi.fn(
    async (code: string, locale?: string) =>
      F.servicesByCountryLocale[code]?.[(locale ?? "en").toLowerCase()] ?? [],
  ),
}));

const getPublicDoctorsForMarket = vi.hoisted(() =>
  vi.fn(
    async (code: string, locale?: string) =>
      F.doctorsByMarketLocale[code]?.[(locale ?? "en").toLowerCase()] ?? [],
  ),
);
vi.mock("@/lib/content/get-public-doctors", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPublicDoctorsForMarket,
}));

vi.mock("@/lib/content/get-country-collections", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCountryHealthTests: vi.fn(async (code: string) => F.healthTestsByCountry[code] ?? []),
}));

vi.mock("@/lib/api/site-content-api", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchLandingSlugs: vi.fn(async (code: string) => ({
    ok: true as const,
    data: { landingPages: F.landingByCountry[code] ?? [] },
  })),
}));

vi.mock("@/lib/content/get-public-blog", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listBlogPosts: vi.fn(async (code?: string) =>
    code ? (F.blogByCountry[code] ?? []) : F.globalBlogPosts,
  ),
}));

vi.mock("@/lib/content/get-country-legal", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCountryLegal: vi.fn(async (code: string) => F.legalByCountry[code] ?? null),
}));

vi.mock("@/lib/content/get-country-plans", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCountryPlans: vi.fn(async (code: string) => F.plansByCountry[code] ?? []),
}));

/* ------------------------------------------------------------------- setup */

type Entry = {
  url: string;
  lastModified?: string | Date;
  alternates?: { languages?: Record<string, string> };
};

let entries: Entry[];
let urls: string[];
const base = PROD_SITE_URL;
const at = (url: string) => entries.find((e) => e.url === url);

beforeAll(async () => {
  // Pin the origin so the URL-construction assertions mean something.
  delete process.env.NEXT_PUBLIC_SITE_URL;
  const { default: sitemap } = await import("@/app/sitemap");
  entries = (await sitemap()) as Entry[];
  urls = entries.map((e) => e.url);
});

/* ------------------------------------------------------------------- tests */

describe("sitemap — URL construction", () => {
  it("builds every URL on the production origin", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url.startsWith(`${base}/`) || url === base).toBe(true);
      expect(() => new URL(url)).not.toThrow();
    }
  });

  it("emits the domain root without a trailing slash", () => {
    // The gate's own <link rel=canonical> is the bare origin; a slashed entry
    // would make the sitemap the one place that disagrees with it.
    expect(urls).toContain(base);
    expect(urls).not.toContain(`${base}/`);
  });

  it("emits no duplicate URLs", () => {
    const seen = new Map<string, number>();
    for (const url of urls) seen.set(url, (seen.get(url) ?? 0) + 1);
    expect([...seen.entries()].filter(([, n]) => n > 1)).toEqual([]);
  });

  it("gives every localized entry a self-referencing hreflang cluster", () => {
    for (const entry of entries) {
      const languages = entry.alternates?.languages;
      if (!languages) continue;
      expect(Object.values(languages)).toContain(entry.url);
      expect(languages["x-default"]).toBeDefined();
      for (const target of Object.values(languages)) {
        expect(target.startsWith(`${base}/`)).toBe(true);
      }
    }
  });
});

describe("sitemap — non-canonical and redirecting URLs are excluded", () => {
  it("omits the country root, which redirects to the default locale", () => {
    for (const slug of ["ireland", "spain", "czechia"]) {
      expect(urls).not.toContain(`${base}/${slug}`);
    }
  });

  it("omits a retired /health/ page that is 301'd in next.config.ts", () => {
    expect(urls).not.toContain(`${base}/ireland/en/health/international-students`);
    // …while a live sibling in the same market is still submitted.
    expect(urls).toContain(`${base}/ireland/en/health/diabetes`);
  });

  it("omits a /health/ page that canonicalizes onto a /services/ twin", () => {
    expect(urls).not.toContain(`${base}/czechia/cs/health/neschopenka-online`);
    expect(urls).toContain(`${base}/czechia/cs/services/neschopenka-online`);
  });

  it("omits country-assigned blog posts from the bare /blog/{slug} URL", () => {
    // `/blog/ireland-post` 308s to the country canonical. Submitting it put
    // 16 redirecting URLs in the sitemap.
    expect(urls).not.toContain(`${base}/blog/ireland-post`);
    expect(urls).toContain(`${base}/blog/global-post`);
    expect(urls).toContain(`${base}/ireland/en/blog/ireland-post`);
    expect(urls).toContain(`${base}/ireland/pt/blog/ireland-post-pt`);
  });
});

describe("sitemap — locale eligibility", () => {
  it("omits a service locale whose content fell back to the market default", () => {
    // The 24 empty Spain URLs: `<p><br /></p>` bodies submitted for every
    // supported locale regardless of whether a translation exists.
    expect(urls).toContain(`${base}/spain/es/services/consulta-medica-online`);
    expect(urls).not.toContain(`${base}/spain/en/services/consulta-medica-online`);
    // Same rule for Ireland's pt variant, which resolves to en.
    expect(urls).toContain(`${base}/ireland/en/services/gp-consultation-online`);
    expect(urls).not.toContain(`${base}/ireland/pt/services/gp-consultation-online`);
  });

  it("submits every legal locale that has its own exact-locale row", () => {
    // The regression this protects is the OPPOSITE of the one above: legal
    // locale variants were hreflang-referenced but never submitted (79 URLs).
    expect(urls).toContain(`${base}/ireland/en/legal/terms-of-service`);
    expect(urls).toContain(`${base}/ireland/pt/legal/terms-of-service`);
    expect(urls).toContain(`${base}/ireland/en/legal`);
    expect(urls).toContain(`${base}/ireland/pt/legal`);
  });

  it("omits a legal locale that would serve the fallback body", () => {
    expect(urls).toContain(`${base}/ireland/en/legal/privacy-policy`);
    expect(urls).not.toContain(`${base}/ireland/pt/legal/privacy-policy`);
  });

  it("omits a legal type with no published row anywhere", () => {
    expect(urls.some((u) => u.includes("/legal/cookie-policy"))).toBe(false);
  });

  it("submits a landing page only in locales that have a real translation", () => {
    expect(urls).toContain(`${base}/ireland/en/health/diabetes`);
    expect(urls).toContain(`${base}/ireland/pt/health/diabetes`);
    expect(urls).toContain(`${base}/ireland/en/health/migraine`);
    expect(urls).not.toContain(`${base}/ireland/pt/health/migraine`);
    // Translation exists, but the market does not enable that locale.
    expect(urls.some((u) => u.includes("/health/hypertension"))).toBe(false);
  });

  it("omits blog translations in locales the assigned market does not support", () => {
    expect(urls).toContain(`${base}/brazil/pt/blog/brazil-post`);
    for (const [locale, slug] of [
      ["cs", "brazil-post-cs"],
      ["de", "brazil-post-de"],
      ["ro", "brazil-post-ro"],
    ]) {
      expect(urls).not.toContain(`${base}/brazil/${locale}/blog/${slug}`);
    }
  });
});

describe("sitemap — doctors", () => {
  it("reads doctors from the per-market endpoint, not the global roster", () => {
    // The global `/api/doctors` roster omits the additionalCountries join, so
    // every row is missing the per-market registration number the validator
    // requires — which silently withheld 14 live, indexable Ireland doctors.
    expect(getPublicDoctorsForMarket).toHaveBeenCalledWith("ie", "en");
    expect(getPublicDoctorsForMarket).toHaveBeenCalledWith("ie", "pt");
    expect(urls).toContain(`${base}/ireland/en/doctors/dr-example`);
    expect(urls).toContain(`${base}/ireland/pt/doctors/dr-example`);
  });

  it("omits a doctor whose editorial checklist is not ready to index", () => {
    expect(urls.some((u) => u.includes("/doctors/dr-draft"))).toBe(false);
  });
});

describe("sitemap — feature-gated hub routes", () => {
  it("emits gated hubs only for markets with the feature enabled", () => {
    expect(urls).toContain(`${base}/ireland/en/lab-tests`);
    expect(urls).toContain(`${base}/ireland/en/pricing`);
    expect(urls).toContain(`${base}/ireland/en/see-a-specialist`);
    // Spain has only general-consultations: the rest 404 at request time.
    expect(urls).not.toContain(`${base}/spain/es/lab-tests`);
    expect(urls).not.toContain(`${base}/spain/es/pricing`);
    expect(urls).not.toContain(`${base}/spain/es/see-a-specialist`);
    expect(urls).toContain(`${base}/spain/es/gp-consultation-online`);
  });

  it("emits the ungated hubs for every market", () => {
    for (const [slug, lang] of [
      ["ireland", "en"],
      ["spain", "es"],
      ["czechia", "cs"],
    ]) {
      for (const path of ["", "/doctors", "/book", "/blog", "/about", "/contact"]) {
        expect(urls).toContain(`${base}/${slug}/${lang}${path}`);
      }
    }
  });

  it("emits the cross-market tool pages", () => {
    expect(urls.some((u) => u.includes("/tools/"))).toBe(true);
  });
});

describe("sitemap — lastmod", () => {
  it("never emits a build-time timestamp", () => {
    // A lastModified that moves on every deploy teaches Google the signal is
    // noise and gets it discounted sitewide. Every emitted value must come
    // from real content, i.e. from the fixture set.
    const allowed = new Set<string>(Object.values(F.TS));
    for (const entry of entries) {
      if (entry.lastModified === undefined) continue;
      expect(allowed, `${entry.url} has an unexpected lastModified`).toContain(
        String(entry.lastModified),
      );
    }
  });

  it("dates a hub from its own child content", () => {
    expect(at(`${base}/ireland/en/doctors`)?.lastModified).toBe(F.TS.doctorIe);
    expect(at(`${base}/ireland/en/pricing`)?.lastModified).toBe(F.TS.planIe);
    expect(at(`${base}/ireland/en/blog`)?.lastModified).toBe(F.TS.blogIe);
    // Country home takes the newest child of ANY type — the doctor row here.
    expect(at(`${base}/ireland/en`)?.lastModified).toBe(F.TS.doctorIe);
  });

  it("falls back to the market's newest content when a hub's own type is empty", () => {
    // Czechia has no blog rows; its /blog hub must still be dated from the
    // market's newest content of any type rather than shipping undated (60
    // URLs did).
    expect(at(`${base}/czechia/cs/blog`)?.lastModified).toBe(F.TS.serviceCz);
    expect(at(`${base}/czechia/cs`)?.lastModified).toBe(F.TS.serviceCz);
  });

  it("leaves code-resident pages undated rather than inventing a date", () => {
    for (const url of [
      `${base}/ireland/en/contact`,
      `${base}/ireland/en/about`,
      `${base}/about`,
      `${base}/faq`,
      base,
    ]) {
      expect(at(url)?.lastModified).toBeUndefined();
    }
  });
});
