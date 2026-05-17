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
  countryDoctors: (code: string) => `country:${code}:doctors`,
  countryDoctorBySlug: (code: string, slug: string) =>
    `country:${code}:doctors:${slug}`,
  countrySpecialties: (code: string) => `country:${code}:specialties`,
  countryServices: (code: string) => `country:${code}:services`,
  countryHealthTests: (code: string) => `country:${code}:health-tests`,
  countryPlans: (code: string) => `country:${code}:plans`,
  countryPage: (code: string, pageKey: string, locale: string) =>
    `country:${code}:pages:${pageKey}:${locale}`,
  globalDoctors: () => "global:doctors",
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

export async function fetchDoctors(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/doctors", {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: [SITE_CACHE_TAGS.globalDoctors()],
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
  return apiRequest<{ page: unknown }>(
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
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  return apiRequest<unknown[]>(
    `/api/countries/${encodeURIComponent(countryCode)}/doctors`,
    {
      timeoutMs,
      revalidate: REVALIDATE_SECONDS,
      tags: [SITE_CACHE_TAGS.countryDoctors(countryCode)],
    },
  );
}

export async function fetchDoctorByCountryAndSlug(
  countryCode: string,
  slug: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  return apiRequest<{ doctor: unknown }>(
    `/api/countries/${encodeURIComponent(countryCode)}/doctors/${encodeURIComponent(slug)}`,
    {
      timeoutMs,
      revalidate: REVALIDATE_SECONDS,
      tags: [
        SITE_CACHE_TAGS.countryDoctorBySlug(countryCode, slug),
        SITE_CACHE_TAGS.countryDoctors(countryCode),
      ],
    },
  );
}

export async function fetchSpecialtiesByCountry(
  countryCode: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  return apiRequest<unknown[]>(
    `/api/countries/${encodeURIComponent(countryCode)}/specialties`,
    {
      timeoutMs,
      revalidate: REVALIDATE_SECONDS,
      tags: [SITE_CACHE_TAGS.countrySpecialties(countryCode)],
    },
  );
}

export async function fetchHealthTestsByCountry(
  countryCode: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  return apiRequest<unknown[]>(
    `/api/countries/${encodeURIComponent(countryCode)}/health-tests`,
    {
      timeoutMs,
      revalidate: REVALIDATE_SECONDS,
      tags: [SITE_CACHE_TAGS.countryHealthTests(countryCode)],
    },
  );
}

export async function fetchPlansByCountry(
  countryCode: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  return apiRequest<unknown[]>(
    `/api/countries/${encodeURIComponent(countryCode)}/plans`,
    {
      timeoutMs,
      revalidate: REVALIDATE_SECONDS,
      tags: [SITE_CACHE_TAGS.countryPlans(countryCode)],
    },
  );
}

export async function fetchServicesByCountry(
  countryCode: string,
  kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY" | undefined,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const url = kind
    ? `/api/countries/${encodeURIComponent(countryCode)}/services?kind=${kind}`
    : `/api/countries/${encodeURIComponent(countryCode)}/services`;
  return apiRequest<unknown[]>(url, {
    timeoutMs,
    revalidate: REVALIDATE_SECONDS,
    tags: [SITE_CACHE_TAGS.countryServices(countryCode)],
  });
}
