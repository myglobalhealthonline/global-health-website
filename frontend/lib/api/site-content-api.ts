import { PUBLIC_CONTENT_FETCH_TIMEOUT_MS } from "@/lib/content/public-content-source";
import { apiRequest } from "./client";

export async function fetchCountries(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/countries", { timeoutMs });
}

export async function fetchServices(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/services", { timeoutMs });
}

export async function fetchDoctors(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/doctors", { timeoutMs });
}

export async function fetchPricing(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/pricing", { timeoutMs });
}

export async function fetchAssets(timeoutMs = PUBLIC_CONTENT_FETCH_TIMEOUT_MS) {
  return apiRequest<unknown[]>("/api/assets", { timeoutMs });
}
