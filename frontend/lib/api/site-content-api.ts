import { PUBLIC_CONTENT_FETCH_TIMEOUT_MS } from "@/lib/content/public-content-source";
import { apiRequest } from "./client";

/**
 * Public site fetchers. All reads use Next.js Data Cache with a 60-second
 * revalidate and a tag so admin server actions can `revalidateTag(...)` to
 * bust the cache surgically after a content edit.
 *
 * Tag scheme:
 *   countries
 *   country:{code}:doctors
 *   country:{code}:doctors:{slug}
 *   country:{code}:specialties
 *   country:{code}:services
 *   country:{code}:pages:{pageKey}:{locale}
 *   global:doctors           // legacy /api/doctors
 *   global:services          // legacy /api/services
 *   global:specialties       // legacy /api/specialties
 *   global:assets            // legacy /api/assets
 *   global:pricing           // legacy /api/pricing
 *   global:health-tests      // legacy /api/health-tests
 *   global:blog              // legacy /api/blog-posts
 */
const REVALIDATE_SECONDS = 60;
const COUNTRIES_REVALIDATE_SECONDS = 120;

export const SITE_CACHE_TAGS = {
  countries: () => "countries",
  countryDoctors: (code: string, locale?: string) =>
    locale ? `country:${code}:doctors:${locale}` : `country:${code}:doctors`,
  countryDoctorBySlug: (code: string, slug: string, locale?: string) =>
    locale ? `country:${code}:doctors:${slug}:${locale}` : `country:${code}:doctors:${slug}`,
  countrySpecialties: (code: string, locale?: string) =>
    locale ? `country:${code}:specialties:${locale}` : `country:${code}:specialties`,
  countryServices: (code: string, locale?: string) =>
    locale ? `country:${code}:services:${locale}` : `country:${code}:services`,
  serviceBySlug: (slug: string) => `service:${slug}`,
  countryHealthTests: (code: string, locale?: string) =>
    locale ? `country:${code}:health-tests:${locale}` : `country:${code}:health-tests`,
  healthTestBySlug: (slug: string) => `health-test:${slug}`,
  countryPlans: (code: string) => `country:${code}:plans`,
  countryPage: (code: string, pageKey: string, locale: string) =>
    `country:${code}:pages:${pageKey}:${locale}`,
  globalDoctors: (locale?: string) =>
    locale ? `global:doctors:${locale}` : "global:doctors",
  globalServices: () => "global:services",
  globalSpecialties: () => "global:specialties",
  globalAssets: () => "global:assets",
  globalPricing: () => "global:pricing",
  globalHealthTests: () => "global:health-tests",
  globalBlog: () => "global:blog",
};

export async function fetchCountries(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/countries", {
    timeoutMs,
    revalidate: COUNTRIES_REVALIDATE_SECONDS,
    tags: [SITE_CACHE_TAGS.countries()],
  });
}

export async function fetchServices(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/services", {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: [SITE_CACHE_TAGS.globalServices()],
  });
}

export async function fetchSpecialties(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/specialties", {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: [SITE_CACHE_TAGS.globalSpecialties()],
  });
}

export async function fetchDoctors(
  locale?: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const upper = toBackendLocale(locale);
  const url = upper ? `/api/doctors?locale=${upper}` : "/api/doctors";
  return apiRequest<unknown[]>(url, {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: upper
      ? [SITE_CACHE_TAGS.globalDoctors(), SITE_CACHE_TAGS.globalDoctors(upper)]
      : [SITE_CACHE_TAGS.globalDoctors()],
  });
}

export async function fetchPricing(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/pricing", {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: [SITE_CACHE_TAGS.globalPricing()],
  });
}

export async function fetchHealthTests(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/health-tests", {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: [SITE_CACHE_TAGS.globalHealthTests()],
  });
}

export async function fetchBlogPosts(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/blog-posts", {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: [SITE_CACHE_TAGS.globalBlog()],
  });
}

export async function fetchAssets(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/assets", {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: [SITE_CACHE_TAGS.globalAssets()],
  });
}

export async function fetchPublicPage(
  countryCode: string,
  pageKey:
    | "HOME"
    | "DOCTORS_INDEX"
    | "GENERAL_CONSULTATION"
    | "SPECIALIST_CONSULTATION"
    | "PRESCRIPTIONS"
    | "HEALTH_TESTS",
  locale: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  return apiRequest<{ page: unknown; disabled?: boolean }>(
    `/api/countries/${encodeURIComponent(countryCode)}/pages/${encodeURIComponent(pageKey)}?locale=${encodeURIComponent(locale)}`,
    {
      timeoutMs,
      revalidate: REVALIDATE_SECONDS,
      tags: [SITE_CACHE_TAGS.countryPage(countryCode, pageKey, locale)],
    },
  );
}

export async function fetchDoctorsByCountry(
  countryCode: string,
  locale?: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const upper = toBackendLocale(locale);
  const url = upper
    ? `/api/countries/${encodeURIComponent(countryCode)}/doctors?locale=${upper}`
    : `/api/countries/${encodeURIComponent(countryCode)}/doctors`;
  return apiRequest<unknown[]>(url, {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: upper
      ? [
          SITE_CACHE_TAGS.countryDoctors(countryCode),
          SITE_CACHE_TAGS.countryDoctors(countryCode, upper),
        ]
      : [SITE_CACHE_TAGS.countryDoctors(countryCode)],
  });
}

export async function fetchDoctorByCountryAndSlug(
  countryCode: string,
  slug: string,
  locale?: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const upper = toBackendLocale(locale);
  const url = upper
    ? `/api/countries/${encodeURIComponent(countryCode)}/doctors/${encodeURIComponent(slug)}?locale=${upper}`
    : `/api/countries/${encodeURIComponent(countryCode)}/doctors/${encodeURIComponent(slug)}`;
  return apiRequest<{ doctor: unknown }>(url, {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: upper
      ? [
          SITE_CACHE_TAGS.countryDoctorBySlug(countryCode, slug),
          SITE_CACHE_TAGS.countryDoctorBySlug(countryCode, slug, upper),
          SITE_CACHE_TAGS.countryDoctors(countryCode),
        ]
      : [
          SITE_CACHE_TAGS.countryDoctorBySlug(countryCode, slug),
          SITE_CACHE_TAGS.countryDoctors(countryCode),
        ],
  });
}

/** Locale arrives lowercase from the `[lang]` route segment; the backend
 *  LocaleCode enum is uppercase. Normalize at the fetch boundary. */
function toBackendLocale(locale?: string): string | undefined {
  return locale ? locale.toUpperCase() : undefined;
}

export async function fetchSpecialtiesByCountry(
  countryCode: string,
  locale?: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const upper = toBackendLocale(locale);
  const url = upper
    ? `/api/countries/${encodeURIComponent(countryCode)}/specialties?locale=${upper}`
    : `/api/countries/${encodeURIComponent(countryCode)}/specialties`;
  return apiRequest<unknown[]>(url, {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    // Dual tag: the base tag busts every locale at once (admin edits call
    // it), the locale tag scopes the cached payload per language.
    tags: upper
      ? [
          SITE_CACHE_TAGS.countrySpecialties(countryCode),
          SITE_CACHE_TAGS.countrySpecialties(countryCode, upper),
        ]
      : [SITE_CACHE_TAGS.countrySpecialties(countryCode)],
  });
}

export async function fetchHealthTestsByCountry(
  countryCode: string,
  locale?: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const upper = toBackendLocale(locale);
  const url = upper
    ? `/api/countries/${encodeURIComponent(countryCode)}/health-tests?locale=${upper}`
    : `/api/countries/${encodeURIComponent(countryCode)}/health-tests`;
  return apiRequest<unknown[]>(url, {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: upper
      ? [
          SITE_CACHE_TAGS.countryHealthTests(countryCode),
          SITE_CACHE_TAGS.countryHealthTests(countryCode, upper),
        ]
      : [SITE_CACHE_TAGS.countryHealthTests(countryCode)],
  });
}

export async function fetchPlansByCountry(
  countryCode: string,
  locale?: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const upper = toBackendLocale(locale);
  const url = upper
    ? `/api/countries/${encodeURIComponent(countryCode)}/plans?locale=${upper}`
    : `/api/countries/${encodeURIComponent(countryCode)}/plans`;
  return apiRequest<{ plans: unknown[] }>(url, {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: upper
      ? [SITE_CACHE_TAGS.countryPlans(countryCode), `${SITE_CACHE_TAGS.countryPlans(countryCode)}:${upper}`]
      : [SITE_CACHE_TAGS.countryPlans(countryCode)],
  });
}

export async function fetchServicesByCountry(
  countryCode: string,
  kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY" | undefined,
  locale?: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const upper = toBackendLocale(locale);
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  if (upper) params.set("locale", upper);
  const qs = params.toString();
  const url = qs
    ? `/api/countries/${encodeURIComponent(countryCode)}/services?${qs}`
    : `/api/countries/${encodeURIComponent(countryCode)}/services`;
  return apiRequest<unknown[]>(url, {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: upper
      ? [
          SITE_CACHE_TAGS.countryServices(countryCode),
          SITE_CACHE_TAGS.countryServices(countryCode, upper),
        ]
      : [SITE_CACHE_TAGS.countryServices(countryCode)],
  });
}

/** Single service detail (admin CMS content) for the public detail page. */
export async function fetchServiceDetail(
  slug: string,
  countryCode: string,
  locale?: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const upper = toBackendLocale(locale);
  const params = new URLSearchParams({ countryCode });
  if (upper) params.set("locale", upper);
  return apiRequest<{ service: unknown }>(
    `/api/services/${encodeURIComponent(slug)}?${params.toString()}`,
    {
      timeoutMs,
      revalidate: REVALIDATE_SECONDS,
      tags: [
        SITE_CACHE_TAGS.serviceBySlug(slug),
        SITE_CACHE_TAGS.countryServices(countryCode),
      ],
    },
  );
}

/** Published SEO landing slugs for a country (feeds the sitemap). */
export async function fetchLandingSlugs(
  countryCode: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  return apiRequest<{ landingPages: Array<{ slug: string; updatedAt: string }> }>(
    `/api/public/countries/${encodeURIComponent(countryCode)}/landing-pages`,
    { timeoutMs, revalidate: REVALIDATE_SECONDS, tags: [`landing:${countryCode}`] },
  );
}

/** One published SEO landing page resolved to a locale. */
export async function fetchLandingPage(
  slug: string,
  countryCode: string,
  locale?: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const upper = toBackendLocale(locale);
  const params = upper ? `?locale=${upper}` : "";
  return apiRequest<{ page: unknown }>(
    `/api/public/countries/${encodeURIComponent(countryCode)}/landing-pages/${encodeURIComponent(slug)}${params}`,
    { timeoutMs, revalidate: REVALIDATE_SECONDS, tags: [`landing:${countryCode}:${slug}`] },
  );
}

/** Single health-test detail (admin CMS content) for the public detail page. */
export async function fetchHealthTestDetail(
  slug: string,
  countryCode: string,
  locale?: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const upper = toBackendLocale(locale);
  const params = new URLSearchParams({ countryCode });
  if (upper) params.set("locale", upper);
  return apiRequest<{ healthTest: unknown }>(
    `/api/health-tests/${encodeURIComponent(slug)}?${params.toString()}`,
    {
      timeoutMs,
      revalidate: REVALIDATE_SECONDS,
      tags: [
        SITE_CACHE_TAGS.healthTestBySlug(slug),
        SITE_CACHE_TAGS.countryHealthTests(countryCode),
      ],
    },
  );
}

export type ServiceFaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export async function fetchServiceFaqs(
  serviceSlug: string,
  countryCode?: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
): Promise<ServiceFaqItem[]> {
  const params = new URLSearchParams();
  if (countryCode) params.set("countryCode", countryCode);
  const qs = params.toString();
  const url = `/api/services/${encodeURIComponent(serviceSlug)}/faqs${qs ? `?${qs}` : ""}`;
  const result = await apiRequest<{ faqs: ServiceFaqItem[] }>(url, {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: [`service:${serviceSlug}:faqs`],
  });
  if (!result.ok) return [];
  return result.data.faqs;
}
