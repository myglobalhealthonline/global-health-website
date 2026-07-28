import type { MetadataRoute } from "next";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { countrySlug } from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { getPublicDoctorBySlug, getPublicDoctorsNormalized } from "@/lib/content/get-public-doctors";
import { isPublicDoctorRecordIndexable } from "@/lib/content/publication-validation";
import { getPublicServicesForCountry } from "@/lib/content/get-public-services";
import { getCountryHealthTests } from "@/lib/content/get-country-collections";
import { fetchLandingSlugs } from "@/lib/api/site-content-api";
import { listBlogPosts } from "@/lib/content/get-public-blog";
import { hreflangRegion } from "@/lib/seo/hreflang";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { getCountryLegal, LEGAL_TYPE_SLUGS } from "@/lib/content/get-country-legal";
import { getCountryPlans } from "@/lib/content/get-country-plans";
import { newestTimestamp } from "@/lib/seo/newest-timestamp";

/**
 * Phase 1 sitemap. Emits only canonical, indexable routes.
 *   • Country home + the four section routes per country (live admin list,
 *     not the hardcoded five — see `getPublicCountriesMerged`)
 *   • Doctor profile pages
 *
 * Excluded:
 *   • The global entry `/` — it's a country picker, not a content target.
 *   • The country root `/{country}` — redirects to `/{country}/{defaultLocale}`.
 *   • Auth + account routes.
 *   • Every legacy Wix slug — kept out of the sitemap, but served by proxy
 *     308s to their new URL. They are deliberately NOT disallowed in
 *     robots.txt: Googlebot has to crawl a legacy URL to see the 308, and
 *     those URLs still hold the ranking equity from the Wix site (they out-
 *     rank their own targets today). Blocking them would strand that equity
 *     permanently, so leave robots.txt alone.
 */
// Rendered at request time: the detail-page entries (doctors, services,
// lab tests, landing pages, blog) come from the backend API, which is not
// reachable during the static build — a build-time render silently drops
// them all (the try/catch fallbacks fire) and ships a section-pages-only
// sitemap. force-dynamic keeps the sitemap complete; crawler traffic on
// /sitemap.xml is rare enough that per-request rendering is fine.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const urls: MetadataRoute.Sitemap = [];

  const countries = await getPublicCountriesMerged();

  /** Enabled locales for a country, lowercase, default first. */
  const countryLangs = (country: (typeof countries)[number]): string[] => {
    const defaultLang = (country.defaultLocale ?? "en").toLowerCase();
    const langs =
      country.supportedLocales && country.supportedLocales.length > 0
        ? country.supportedLocales.map((l) => l.toLowerCase())
        : [defaultLang];
    return [defaultLang, ...langs.filter((l) => l !== defaultLang)];
  };

  /** Push one URL per enabled locale with hreflang alternates. */
  const pushLocalized = (
    country: (typeof countries)[number],
    path: string,
    priority: number,
    extra?: Partial<MetadataRoute.Sitemap[number]>,
    langsOverride?: string[],
  ) => {
    const slug = `/${country.slug || countrySlug(country.code)}`;
    const region = hreflangRegion(country.code);
    const langs = langsOverride ?? countryLangs(country);
    if (langs.length === 0) return;
    const languages: Record<string, string> = {};
    for (const lang of langs) {
      languages[`${lang}-${region}`] = `${base}${slug}/${lang}${path}`;
    }
    languages["x-default"] = `${base}${slug}/${langs[0]}${path}`;
    for (const lang of langs) {
      urls.push({
        url: `${base}${slug}/${lang}${path}`,
        changeFrequency: "weekly",
        priority,
        alternates: { languages },
        ...extra,
      });
    }
  };

  // Hub/list pages (country home, /doctors, /blog, /pricing …) have no
  // timestamp of their own — they're generated from whatever content sits
  // under them. We accumulate the newest child timestamp per country as the
  // detail loops below run, then date each hub from its own children (see
  // "Country home + section pages" at the end of this file). Deliberately NOT
  // build time: a lastModified that changes on every deploy teaches Google the
  // signal is noise and gets it discounted sitewide, including for the detail
  // pages where it IS accurate.
  type StampKey = "service" | "doctor" | "blog" | "legal" | "landing" | "test" | "plan";
  const stamps = new Map<string, Partial<Record<StampKey, string>>>();
  const bump = (code: string, key: StampKey, ts: string | null | undefined) => {
    const forCountry = stamps.get(code) ?? {};
    const winner = newestTimestamp(forCountry[key], ts);
    if (!winner) return;
    forCountry[key] = winner;
    stamps.set(code, forCountry);
  };
  const ALL_STAMP_KEYS: StampKey[] = [
    "service",
    "doctor",
    "blog",
    "legal",
    "landing",
    "test",
    "plan",
  ];
  /**
   * Newest of the given child timestamps for a country.
   *
   * Falls back to the country's newest content of ANY type when the requested
   * types have none: a market with zero plan rows still has a real /pricing
   * page, and leaving it undated (60 URLs did) tells Google nothing at all.
   * Still never build time — see the note above.
   */
  const newest = (code: string, ...keys: StampKey[]): string | undefined => {
    const forCountry = stamps.get(code);
    if (!forCountry) return undefined;
    return (
      newestTimestamp(...keys.map((k) => forCountry[k])) ??
      newestTimestamp(...ALL_STAMP_KEYS.map((k) => forCountry[k]))
    );
  };
  const dated = (ts: string | undefined) => (ts ? { lastModified: ts } : undefined);

  // Service detail pages — active public GP/specialist services per country.
  // (PRESCRIPTION/HOME_DELIVERY kinds stay out: hidden from the public site
  // for Ads compliance.)
  for (const country of countries) {
    try {
      const services = await getPublicServicesForCountry(country.code);
      for (const s of services) {
        if (s.kind !== "GENERAL" && s.kind !== "SPECIALIST") continue;
        bump(country.code, "service", s.updatedAt);
        pushLocalized(country, `/services/${s.slug}`, 0.7, dated(s.updatedAt ?? undefined));
      }
    } catch {
      // Service list unavailable — keep the rest of the sitemap.
    }
  }

  // Lab-test detail pages.
  for (const country of countries) {
    try {
      const tests = await getCountryHealthTests(country.code);
      for (const t of tests) {
        bump(country.code, "test", t.updatedAt);
        pushLocalized(country, `/lab-tests/${t.slug}`, 0.6, dated(t.updatedAt ?? undefined));
      }
    } catch {
      // Test list unavailable — keep the rest of the sitemap.
    }
  }

  // SEO landing pages — published condition/audience pages per country.
  // Indexed here (Rule 6) but deliberately absent from nav + listing pages.
  // One entry per enabled locale, each carrying hreflang alternates so Google
  // indexes the translated variants and understands they are the same page.
  for (const country of countries) {
    try {
      const res = await fetchLandingSlugs(country.code);
      if (!res.ok) continue;
      const slug = `/${country.slug || countrySlug(country.code)}`;
      const defaultLang = (country.defaultLocale ?? "en").toLowerCase();
      const region = hreflangRegion(country.code);
      const langs =
        country.supportedLocales && country.supportedLocales.length > 0
          ? country.supportedLocales.map((l) => l.toLowerCase())
          : [defaultLang];
      for (const page of res.data.landingPages) {
        bump(country.code, "landing", page.updatedAt);
        const languages: Record<string, string> = {};
        for (const lang of langs) {
          languages[`${lang}-${region}`] = `${base}${slug}/${lang}/health/${page.slug}`;
        }
        languages["x-default"] = `${base}${slug}/${defaultLang}/health/${page.slug}`;
        for (const lang of langs) {
          urls.push({
            url: `${base}${slug}/${lang}/health/${page.slug}`,
            lastModified: page.updatedAt,
            changeFrequency: "monthly",
            priority: 0.6,
            alternates: { languages },
          });
        }
      }
    } catch {
      // Landing list unavailable for this country — skip, keep the rest.
    }
  }

  // Country legal pages — the index (always renders) + each doc type that
  // actually has a published row. One published row of a type, in ANY
  // locale, makes it resolve for every enabled locale: the public API falls
  // back exact-locale → "en" → any published row (see
  // getPublicCountryLegalDocument in backend/src/modules/countries/countries.service.ts),
  // matching the per-country (not per-locale) availability the page itself
  // relies on. MEDICAL_DISCLAIMER also counts when only the profile's
  // fullDisclaimer is set, mirroring the page's disclaimer fallback. Enum
  // types with no data anywhere (e.g. COOKIE_POLICY) are skipped — driven by
  // the API response, not the enum.
  for (const country of countries) {
    try {
      const legal = await getCountryLegal(country.code);
      // Newest published row per type, across locales — the page resolves one
      // row for every locale (exact → "en" → any), so every locale variant of
      // a type shares that type's timestamp.
      const stampByType = new Map<string, string>();
      for (const d of legal?.documents ?? []) {
        const winner = newestTimestamp(stampByType.get(d.type), d.updatedAt);
        if (winner) stampByType.set(d.type, winner);
        bump(country.code, "legal", d.updatedAt);
      }
      // Default locale ONLY. Legal pages were 231 of 1353 sitemap URLs — 17%
      // of the crawl budget — for boilerplate that answers no query (nothing
      // legal appears anywhere in Search Console's query report) and that
      // Google was already declining: 65% indexed, 71 of them sharing 17
      // titles because "Cookie Policy · Ireland" is identical in all six
      // locales. Submitting six near-duplicates per document spends crawl on
      // the pages that earn nothing, while real content still waits.
      //
      // Every locale variant stays live, linked from the footer, and fully
      // indexable — this drops them from the SUBMITTED set, nothing more.
      // Compliance needs these reachable, not searchable.
      const legalLangs = [countryLangs(country)[0]];
      pushLocalized(country, "/legal", 0.3, dated(newest(country.code, "legal")), legalLangs);
      const types = new Set((legal?.documents ?? []).map((d) => d.type));
      // The profile-only MEDICAL_DISCLAIMER fallback carries no timestamp of
      // its own — it stays undated rather than borrowing an unrelated one.
      if (legal?.profile?.fullDisclaimer) types.add("MEDICAL_DISCLAIMER");
      for (const type of types) {
        pushLocalized(
          country,
          `/legal/${LEGAL_TYPE_SLUGS[type]}`,
          0.3,
          dated(stampByType.get(type)),
          legalLangs,
        );
      }
    } catch {
      // Legal data unavailable for this country — keep the rest of the sitemap.
    }
  }

  // Static legal / global pages.
  urls.push(
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.4 },
  );
  // `/blog` (global index) is pushed after the post loop below, so it can be
  // dated from the newest post. The five above are hand-authored pages with no
  // row behind them — nothing honest to date them from, so they stay undated.

  // Blog posts — published, admin-managed. [] when API unavailable.
  // Global posts (no countries assigned) canonicalize at the bare URL;
  // country-specific posts get one entry per assigned country × enabled
  // locale (via pushLocalized), matching the redirect/canonical scheme in
  // blog-post-page.tsx.
  let newestPostAt: string | undefined;
  try {
    const posts = await listBlogPosts();
    for (const p of posts) {
      newestPostAt = newestTimestamp(newestPostAt, p.publishedAt);
      urls.push({
        url: `${base}/blog/${p.slug}`,
        lastModified: p.publishedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // Blog list unavailable — sitemap still emits the rest.
  }
  urls.push({
    url: `${base}/blog`,
    changeFrequency: "weekly",
    priority: 0.6,
    ...dated(newestPostAt),
  });

  for (const country of countries) {
    try {
      const countryPosts = await listBlogPosts(country.code);
      for (const p of countryPosts) {
        if (p.countries.length === 0) continue; // already emitted above as a bare-URL entry
        bump(country.code, "blog", p.publishedAt);
        // A blog post has exactly one authored locale (BlogListItem carries
        // no per-locale translation), so every OTHER enabled locale for this
        // country would just be an English-body page with noindex set by
        // buildBlogPostMetadata — don't submit those to Google. Only the
        // post's actual content locale is emitted here.
        pushLocalized(country, `/blog/${p.slug}`, 0.5, { lastModified: p.publishedAt }, [p.locale.toLowerCase()]);
      }
    } catch {
      // Blog list unavailable for this country — keep the rest of the sitemap.
    }
  }

  // Doctor profile pages — one entry per (doctor, locale), restricted to
  // locale variants that actually render indexable. `buildDoctorProfileMetadata`
  // sets noindex when a locale's translation/market row fails editorial
  // validation; submitting those variants to Google anyway just trains a
  // "noindex in sitemap" penalty, so we apply the identical predicate here
  // (`isPublicDoctorRecordIndexable`, same helper the page uses) before
  // listing a locale.
  try {
    const byCode = new Map(countries.map((c) => [c.code, c]));
    const allDoctors = await getPublicDoctorsNormalized();
    for (const d of allDoctors) {
      const country = byCode.get(d.countryCode);
      if (!country) continue;
      const indexableLangs = (
        await Promise.all(
          countryLangs(country).map(async (lang) => {
            const localized = await getPublicDoctorBySlug(d.slug, lang);
            return localized && isPublicDoctorRecordIndexable(localized) ? lang : null;
          }),
        )
      ).filter((lang): lang is string => lang !== null);
      if (indexableLangs.length === 0) continue;
      bump(country.code, "doctor", d.updatedAt);
      pushLocalized(
        country,
        `/doctors/${d.slug}`,
        0.7,
        dated(d.updatedAt ?? undefined),
        indexableLangs,
      );
    }
  } catch {
    // Doctor list unavailable — sitemap still emits the country tree.
  }

  // Plan rows back-date /pricing only; the plans themselves have no public
  // URL of their own, so nothing is pushed here.
  for (const country of countries) {
    if (!isCountryFeatureEnabled(country, "subscriptions")) continue;
    try {
      for (const p of await getCountryPlans(country.code)) bump(country.code, "plan", p.updatedAt);
    } catch {
      // Plan list unavailable — /pricing just stays undated.
    }
  }

  // Country home + section pages — every enabled locale, with hreflang
  // alternates so Google indexes each translated variant.
  // Section routes gated by a per-country feature flag (see
  // `isCountryFeatureEnabled`) are skipped for countries that don't have
  // the flag — those routes `notFound()` at request time, so listing them
  // unconditionally submitted dead 404s to Search Console for markets
  // without that product line (e.g. /lab-tests, /see-a-specialist before
  // a market has health-tests / specialist-consultations turned on).
  //
  // Runs LAST because each hub is dated from the child content gathered by
  // the loops above. Sitemap entry order is not significant to crawlers.
  for (const country of countries) {
    const code = country.code;
    // The country home surfaces every content type, so any of them changing
    // is a real change to it.
    pushLocalized(country, "", 0.9, dated(newest(code, "service", "doctor", "blog", "legal", "landing", "test", "plan")));
    pushLocalized(country, "/doctors", 0.8, dated(newest(code, "doctor")));
    if (isCountryFeatureEnabled(country, "general-consultations")) {
      pushLocalized(country, "/gp-consultation-online", 0.8, dated(newest(code, "service")));
    }
    if (isCountryFeatureEnabled(country, "specialist-consultations")) {
      pushLocalized(country, "/see-a-specialist", 0.8, dated(newest(code, "service", "doctor")));
    }
    // /book lists the bookable services and the doctors who staff them.
    pushLocalized(country, "/book", 0.85, dated(newest(code, "service", "doctor")));
    if (isCountryFeatureEnabled(country, "health-tests")) {
      pushLocalized(country, "/lab-tests", 0.7, dated(newest(code, "test")));
    }
    if (isCountryFeatureEnabled(country, "subscriptions")) {
      pushLocalized(country, "/pricing", 0.6, dated(newest(code, "plan")));
    }
    pushLocalized(country, "/blog", 0.6, dated(newest(code, "blog")));
  }

  return urls;
}
