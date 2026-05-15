import { PUBLIC_CONTENT_FETCH_TIMEOUT_MS } from "@/lib/content/public-content-source";
import { apiRequest } from "./client";

export async function fetchCountries(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/countries", { timeoutMs });
}

export async function fetchServices(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/services", { timeoutMs });
}

export async function fetchSpecialties(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/specialties", { timeoutMs });
}

export async function fetchDoctors(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/doctors", { timeoutMs });
}

export async function fetchPricing(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/pricing", { timeoutMs });
}

export async function fetchHealthTests(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/health-tests", { timeoutMs });
}

export async function fetchBlogPosts(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/blog-posts", { timeoutMs });
}

export async function fetchAssets(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/assets", { timeoutMs });
}

export async function fetchPublicPage(
  countryCode: string,
  pageKey: "HOME" | "DOCTORS_INDEX" | "GENERAL_CONSULTATION" | "SPECIALIST_CONSULTATION",
  locale: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  return apiRequest<{ page: unknown }>(
    `/api/countries/${encodeURIComponent(countryCode)}/pages/${encodeURIComponent(pageKey)}?locale=${encodeURIComponent(locale)}`,
    { timeoutMs },
  );
}

export async function fetchDoctorsByCountry(
  countryCode: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  return apiRequest<unknown[]>(
    `/api/countries/${encodeURIComponent(countryCode)}/doctors`,
    { timeoutMs },
  );
}

export async function fetchDoctorByCountryAndSlug(
  countryCode: string,
  slug: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  return apiRequest<{ doctor: unknown }>(
    `/api/countries/${encodeURIComponent(countryCode)}/doctors/${encodeURIComponent(slug)}`,
    { timeoutMs },
  );
}

export async function fetchSpecialtiesByCountry(
  countryCode: string,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  return apiRequest<unknown[]>(
    `/api/countries/${encodeURIComponent(countryCode)}/specialties`,
    { timeoutMs },
  );
}

export async function fetchServicesByCountry(
  countryCode: string,
  kind: "GENERAL" | "SPECIALIST" | undefined,
  timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
) {
  const url = kind
    ? `/api/countries/${encodeURIComponent(countryCode)}/services?kind=${kind}`
    : `/api/countries/${encodeURIComponent(countryCode)}/services`;
  return apiRequest<unknown[]>(url, { timeoutMs });
}
