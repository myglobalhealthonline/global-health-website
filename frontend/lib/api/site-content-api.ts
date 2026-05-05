import { apiRequest } from "./client";

export type CountryApiRecord = {
  code: string;
  name: string;
  slug: string;
  legacyHomePath: string;
  teamPath: string;
  generalConsultationPath: string;
  specialistConsultationPath: string;
  defaultLocale: string;
  isActive: boolean;
};

export async function fetchCountries() {
  return apiRequest<CountryApiRecord[]>("/api/countries");
}

export async function fetchServices() {
  return apiRequest<unknown[]>("/api/services");
}

export async function fetchDoctors() {
  return apiRequest<unknown[]>("/api/doctors");
}

export async function fetchPricing() {
  return apiRequest<unknown[]>("/api/pricing");
}

export async function fetchAssets() {
  return apiRequest<unknown[]>("/api/assets");
}
