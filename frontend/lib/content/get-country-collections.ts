import { cache } from "react";
import {
  fetchDoctorsByCountry,
  fetchServicesByCountry,
  fetchSpecialtiesByCountry,
} from "@/lib/api/site-content-api";
import { logPublicContentFallback } from "@/lib/content/public-content-source";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";

/**
 * Data-driven country collections used by the country-scoped landing pages
 * (general consultation, specialist consultation, doctors index, home, ...).
 *
 * Each function returns a normalized array shaped for the existing
 * `ServicesGrid` / `SpecialtiesGrid` / `DoctorsSection` components — pages
 * stay thin, presentational components stay reusable.
 */

export type CountryServiceCard = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  kind: "GENERAL" | "SPECIALIST";
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  specialtyName: string | null;
  imageSrc?: string;
};

export type CountrySpecialtyCard = {
  id: string;
  slug: string;
  name: string;
  cardSummary: string | null;
  cardThemeColor: string | null;
};

export type CountryDoctorCard = {
  id: string;
  slug: string;
  fullName: string;
  title: string;
  bio: string | null;
  languages: string[];
  specialties: string[];
  imageSrc?: string;
};

function readSpecialtyName(row: unknown): string | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return typeof r.name === "string" ? r.name : null;
}

function pickImagePath(row: unknown): string | undefined {
  const assets = (row as { assets?: unknown }).assets;
  if (!Array.isArray(assets)) return undefined;
  for (const a of assets) {
    if (!a || typeof a !== "object") continue;
    const rec = a as { kind?: unknown; path?: unknown };
    if (rec.kind !== "IMAGE" || typeof rec.path !== "string") continue;
    const resolved = resolveTrustedAssetUrl(rec.path);
    if (resolved) return resolved;
  }
  return undefined;
}

/** General or specialist services for a country. Skips inactive rows. */
export const getCountryServices = cache(async (
  countryCode: string,
  kind: "GENERAL" | "SPECIALIST",
): Promise<CountryServiceCard[]> => {
  const res = await fetchServicesByCountry(countryCode, kind);
  if (!res.ok) {
    logPublicContentFallback(`country-services:${countryCode}:${kind}`, res.message);
    return [];
  }
  const out: CountryServiceCard[] = [];
  for (const row of res.data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.slug !== "string") continue;
    if (typeof r.name !== "string") continue;
    if (r.isActive === false) continue;
    out.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      summary: typeof r.summary === "string" ? r.summary : "",
      kind,
      durationMinutes: typeof r.durationMinutes === "number" ? r.durationMinutes : null,
      basePriceCents: typeof r.basePriceCents === "number" ? r.basePriceCents : null,
      currencyCode: typeof r.currencyCode === "string" ? r.currencyCode : null,
      specialtyName: readSpecialtyName(r.specialty),
      imageSrc: pickImagePath(row),
    });
  }
  return out;
});

/** Specialties (categories) for a country. */
export const getCountrySpecialties = cache(async (
  countryCode: string,
): Promise<CountrySpecialtyCard[]> => {
  const res = await fetchSpecialtiesByCountry(countryCode);
  if (!res.ok) {
    logPublicContentFallback(`country-specialties:${countryCode}`, res.message);
    return [];
  }
  const out: CountrySpecialtyCard[] = [];
  for (const row of res.data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.slug !== "string") continue;
    if (typeof r.name !== "string") continue;
    if (r.active === false) continue;
    out.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      cardSummary: typeof r.cardSummary === "string" ? r.cardSummary : null,
      cardThemeColor: typeof r.cardThemeColor === "string" ? r.cardThemeColor : null,
    });
  }
  return out;
});

/** Doctors active in a country, scoped via the country-scoped backend endpoint. */
export const getCountryDoctors = cache(async (
  countryCode: string,
): Promise<CountryDoctorCard[]> => {
  const res = await fetchDoctorsByCountry(countryCode);
  if (!res.ok) {
    logPublicContentFallback(`country-doctors:${countryCode}`, res.message);
    return [];
  }
  const out: CountryDoctorCard[] = [];
  for (const row of res.data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.slug !== "string") continue;
    if (typeof r.fullName !== "string" || typeof r.title !== "string") continue;
    if (r.active === false) continue;
    const specialties: string[] = [];
    const specs = r.specialties;
    if (Array.isArray(specs)) {
      for (const link of specs) {
        const name = readSpecialtyName((link as { specialty?: unknown })?.specialty);
        if (name) specialties.push(name);
      }
    }
    const languages = Array.isArray(r.languages)
      ? r.languages.filter((v): v is string => typeof v === "string")
      : [];
    out.push({
      id: r.id,
      slug: r.slug,
      fullName: r.fullName,
      title: r.title,
      bio: typeof r.bio === "string" ? r.bio : null,
      languages,
      specialties,
      imageSrc: pickImagePath(row),
    });
  }
  return out;
});
