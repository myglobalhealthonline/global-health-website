import { cache } from "react";
import {
  fetchDoctorsByCountry,
  fetchHealthTestsByCountry,
  fetchPlansByCountry,
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
  kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY";
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  specialtyName: string | null;
  imageSrc?: string;
  /** Doctor IDs bookable for this service. Empty array = no assignment
   *  yet; the public consult flow will show "no doctors available". */
  assignedDoctorIds: string[];
};

export type CountryHealthTestCard = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  priceCents: number;
  currencyCode: string;
  sampleType: string | null;
  resultsTimeline: string | null;
  imageSrc: string | null;
  /** null = unlimited inventory; 0 = sold out; <=5 surfaces a "Only N
   *  left" badge on the public card. */
  stock: number | null;
};

export type CountryPricingPlanCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currencyCode: string;
  interval: string;
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
  /** Service IDs the doctor is bookable for, in admin-defined sort
   *  order. Empty array means no current ServiceDoctor assignments. */
  assignedServiceIds: string[];
  /** Formatted as "CHAMBER | NUMBER" (e.g. "IMC | 523449") when both
   *  fields are set on the DoctorCountry row, otherwise just the number. */
  imcRegistration?: string;
  medicalRegistrationUrl?: string;
  whatsappNumber?: string;
  /** Optional social profile URLs surfaced on doctor cards + clinic
   *  pages. Each is an absolute https:// URL pulled from the Doctor
   *  row. Admin sets them via the doctor edit form. */
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  /** Admin-chosen featured doctor for the country (stored in the Setting
   *  table). The /doctors page promotes the featured row into the
   *  FeaturedDoctor spotlight. */
  isFeatured?: boolean;
};

function readSpecialtyName(row: unknown): string | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return typeof r.name === "string" ? r.name : null;
}

function pickImagePath(row: unknown): string | undefined {
  const assets = (row as { assets?: unknown }).assets;
  if (!Array.isArray(assets)) return undefined;
  // Match `profileImageFromRow` in get-public-doctors.ts: prefer the
  // asset whose key matches the "-profile" convention, else fall back
  // to the first image (now ordered deterministically by backend).
  // Identical logic on both pickers so /doctors index + doctor detail
  // + home DoctorWall all render the same portrait per doctor.
  let firstImage: string | undefined;
  for (const a of assets) {
    if (!a || typeof a !== "object") continue;
    const rec = a as { kind?: unknown; path?: unknown; key?: unknown };
    if (rec.kind !== "IMAGE" || typeof rec.path !== "string") continue;
    const resolved = resolveTrustedAssetUrl(rec.path);
    if (!resolved) continue;
    if (typeof rec.key === "string" && /-profile$/i.test(rec.key)) {
      return resolved;
    }
    if (!firstImage) firstImage = resolved;
  }
  return firstImage;
}

/** Services for a country, filtered by kind. Skips inactive rows. */
export const getCountryServices = cache(async (
  countryCode: string,
  kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY",
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
    const assignedDoctorIds: string[] = [];
    const assignments = r.assignedDoctors;
    if (Array.isArray(assignments)) {
      for (const a of assignments) {
        if (!a || typeof a !== "object") continue;
        const id = (a as { doctorId?: unknown }).doctorId;
        if (typeof id === "string" && id.length > 0) assignedDoctorIds.push(id);
      }
    }
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
      assignedDoctorIds,
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
    const assignedServiceIds: string[] = [];
    const assignments = r.assignedServices;
    if (Array.isArray(assignments)) {
      for (const a of assignments) {
        if (!a || typeof a !== "object") continue;
        const id = (a as { serviceId?: unknown }).serviceId;
        if (typeof id === "string" && id.length > 0) assignedServiceIds.push(id);
      }
    }
    // Registration: backend computes imcRegistration = DoctorCountry.registrationNumber
    // for the queried country. chamberEntity (e.g. "IMC", "OMC") lives on the same row.
    const regNum =
      typeof r.imcRegistration === "string" && r.imcRegistration.trim()
        ? r.imcRegistration.trim()
        : null;
    const additionals = Array.isArray(r.additionalCountries) ? r.additionalCountries : [];
    const link = additionals[0] as { chamberEntity?: string | null } | undefined;
    const chamberEntity =
      typeof link?.chamberEntity === "string" && link.chamberEntity.trim()
        ? link.chamberEntity.trim()
        : null;
    const imcRegistration = regNum
      ? chamberEntity
        ? `${chamberEntity} | ${regNum}`
        : regNum
      : undefined;

    out.push({
      id: r.id,
      slug: r.slug,
      fullName: r.fullName,
      title: r.title,
      bio: typeof r.bio === "string" ? r.bio : null,
      languages,
      specialties,
      imageSrc: pickImagePath(row),
      assignedServiceIds,
      isFeatured: r.isFeatured === true,
      ...(imcRegistration ? { imcRegistration } : {}),
      ...(typeof r.medicalRegistrationUrl === "string" && r.medicalRegistrationUrl.trim()
        ? { medicalRegistrationUrl: r.medicalRegistrationUrl.trim() }
        : {}),
      ...(typeof r.whatsappNumber === "string" && r.whatsappNumber.trim()
        ? { whatsappNumber: r.whatsappNumber.trim() }
        : {}),
      ...(typeof r.instagramUrl === "string" && r.instagramUrl.trim()
        ? { instagramUrl: r.instagramUrl.trim() }
        : {}),
      ...(typeof r.facebookUrl === "string" && r.facebookUrl.trim()
        ? { facebookUrl: r.facebookUrl.trim() }
        : {}),
      ...(typeof r.linkedinUrl === "string" && r.linkedinUrl.trim()
        ? { linkedinUrl: r.linkedinUrl.trim() }
        : {}),
    });
  }
  return out;
});

/** Health tests for a country. Maps the HealthTest model to a card shape. */
export const getCountryHealthTests = cache(async (
  countryCode: string,
): Promise<CountryHealthTestCard[]> => {
  const res = await fetchHealthTestsByCountry(countryCode);
  if (!res.ok) {
    logPublicContentFallback(`country-health-tests:${countryCode}`, res.message);
    return [];
  }
  const out: CountryHealthTestCard[] = [];
  for (const row of res.data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.slug !== "string") continue;
    if (typeof r.title !== "string") continue;
    if (r.isActive === false) continue;
    const imagePath = typeof r.productImagePath === "string" ? r.productImagePath : null;
    out.push({
      id: r.id,
      slug: r.slug,
      title: r.title,
      shortDescription: typeof r.shortDescription === "string" ? r.shortDescription : null,
      priceCents: typeof r.priceCents === "number" ? r.priceCents : 0,
      currencyCode: typeof r.currencyCode === "string" ? r.currencyCode : "EUR",
      sampleType: typeof r.sampleType === "string" ? r.sampleType : null,
      resultsTimeline: typeof r.resultsTimeline === "string" ? r.resultsTimeline : null,
      imageSrc: imagePath ? resolveTrustedAssetUrl(imagePath) ?? null : null,
      stock: typeof r.stock === "number" ? r.stock : null,
    });
  }
  return out;
});

/** Active pricing plans for a country. Drives /[country]/[lang]/plans. */
export const getCountryPlans = cache(async (
  countryCode: string,
): Promise<CountryPricingPlanCard[]> => {
  const res = await fetchPlansByCountry(countryCode);
  if (!res.ok) {
    logPublicContentFallback(`country-plans:${countryCode}`, res.message);
    return [];
  }
  const out: CountryPricingPlanCard[] = [];
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
      description: typeof r.description === "string" ? r.description : null,
      priceCents: typeof r.priceCents === "number" ? r.priceCents : 0,
      currencyCode: typeof r.currencyCode === "string" ? r.currencyCode : "EUR",
      interval: typeof r.interval === "string" ? r.interval : "month",
    });
  }
  return out;
});
