import { cache } from "react";
import {
  fetchDoctorsByCountry,
  fetchHealthTestsByCountry,
  fetchPartnersByCountry,
  fetchHealthTestDetail,
  fetchServiceDetail,
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

export type ServiceFaq = { id: string; question: string; answer: string };

/** Full service detail (admin CMS content) for the public service page. */
export type CountryServiceDetail = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY";
  heroTitle: string | null;
  heroDescription: string | null;
  /** Sanitized rich HTML authored in admin. Safe for scoped innerHTML. */
  detailBody: string | null;
  ctaLabel: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  specialtyName: string | null;
  imageSrc: string | null;
  gallery: string[];
  faqs: ServiceFaq[];
};

export type HealthTestFaqItem = { id: string; question: string; answer: string };

/** Full health-test detail (admin CMS content) for the public test page. */
export type CountryHealthTestDetail = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  detailIntro: string | null;
  heroButtonLabel: string | null;
  sampleType: string | null;
  resultsTimeline: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  priceCents: number;
  currencyCode: string;
  stock: number | null;
  imageSrc: string | null;
  gallery: string[];
  whatThisTestCovers: string[];
  whyGetTested: string[];
  /** Admin "extra sections" JSON — array of { title, body } when authored. */
  extraSections: Array<{ title: string; body: string }>;
  faqs: HealthTestFaqItem[];
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
  /** Raw registration number + chamber (e.g. "523449", "IMC") — unformatted,
   *  for schema/identifier use. `imcRegistration` is the display string. */
  registrationNumber?: string;
  registrationChamber?: string;
  /** Register division/scope (IMC General/Specialist Division) where set. */
  registrationDivision?: string;
  /** Admin-verified registration flag (sighted documentation). */
  registrationVerified?: boolean;
  /** Confirmed extra professional credentials (FRCP, SPC fellowship, …)
   *  scoped to this country. Only admin-confirmed entries. */
  credentials?: Array<{ label: string; bodyName: string; bodyUrl?: string }>;
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

/** Services for a country, filtered by kind. Skips inactive rows. When a
 *  locale is passed the backend returns display fields merged to that
 *  language (falling back to the country default). */
export const getCountryServices = cache(async (
  countryCode: string,
  kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY",
  locale?: string,
): Promise<CountryServiceCard[]> => {
  const res = await fetchServicesByCountry(countryCode, kind, locale);
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
  locale?: string,
): Promise<CountrySpecialtyCard[]> => {
  const res = await fetchSpecialtiesByCountry(countryCode, locale);
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
  locale?: string,
): Promise<CountryDoctorCard[]> => {
  const res = await fetchDoctorsByCountry(countryCode, locale);
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

    const registrationDivision =
      typeof r.registrationDivision === "string" && r.registrationDivision.trim()
        ? r.registrationDivision.trim()
        : undefined;
    const credentials = Array.isArray(r.credentials)
      ? r.credentials
          .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object")
          .map((c) => ({
            label: typeof c.label === "string" ? c.label : "",
            bodyName: typeof c.bodyName === "string" ? c.bodyName : "",
            bodyUrl: typeof c.bodyUrl === "string" ? c.bodyUrl : undefined,
          }))
          .filter((c) => c.label && c.bodyName)
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
      assignedServiceIds,
      isFeatured: r.isFeatured === true,
      ...(imcRegistration ? { imcRegistration } : {}),
      ...(regNum ? { registrationNumber: regNum } : {}),
      ...(chamberEntity ? { registrationChamber: chamberEntity } : {}),
      ...(registrationDivision ? { registrationDivision } : {}),
      ...(r.registrationVerified === true ? { registrationVerified: true } : {}),
      ...(credentials.length > 0 ? { credentials } : {}),
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
  locale?: string,
): Promise<CountryHealthTestCard[]> => {
  const res = await fetchHealthTestsByCountry(countryCode, locale);
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

export type CountryPartnerCard = {
  id: string;
  name: string;
  websiteUrl: string | null;
  type: string | null;
  logoSrc: string | null;
};

/** Active partners for a country's "Our partners" marquee. */
export const getCountryPartners = cache(async (
  countryCode: string,
): Promise<CountryPartnerCard[]> => {
  const res = await fetchPartnersByCountry(countryCode);
  if (!res.ok) {
    logPublicContentFallback(`country-partners:${countryCode}`, res.message);
    return [];
  }
  const out: CountryPartnerCard[] = [];
  for (const row of res.data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.name !== "string") continue;
    const logoPath = typeof r.logoPath === "string" ? r.logoPath : null;
    out.push({
      id: r.id,
      name: r.name,
      websiteUrl: typeof r.websiteUrl === "string" ? r.websiteUrl : null,
      type: typeof r.type === "string" && r.type.trim() ? r.type : null,
      logoSrc: logoPath ? resolveTrustedAssetUrl(logoPath) ?? null : null,
    });
  }
  return out;
});

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function resolveGallery(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const p of value) {
    if (typeof p !== "string") continue;
    const resolved = resolveTrustedAssetUrl(p);
    if (resolved) out.push(resolved);
  }
  return out;
}

/** Parse the admin `extraSections` JSON into a list of titled prose blocks.
 *  Tolerates either { title, body } or { heading, content } shapes; skips
 *  entries without renderable text. */
function readExtraSections(value: unknown): Array<{ title: string; body: string }> {
  if (!Array.isArray(value)) return [];
  const out: Array<{ title: string; body: string }> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    const title =
      typeof r.title === "string" ? r.title : typeof r.heading === "string" ? r.heading : "";
    const body =
      typeof r.body === "string" ? r.body : typeof r.content === "string" ? r.content : "";
    if (!body.trim() && !title.trim()) continue;
    out.push({ title, body });
  }
  return out;
}

function readFaqs(value: unknown): ServiceFaq[] {
  if (!Array.isArray(value)) return [];
  const out: ServiceFaq[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    if (typeof r.question !== "string" || typeof r.answer !== "string") continue;
    out.push({
      id: typeof r.id === "string" ? r.id : r.question,
      question: r.question,
      answer: r.answer,
    });
  }
  return out;
}

/** Single service detail (admin CMS content) for the public service page.
 *  Returns null when the slug doesn't resolve for this country. */
export const getCountryServiceDetail = cache(async (
  countryCode: string,
  slug: string,
  locale?: string,
): Promise<CountryServiceDetail | null> => {
  const res = await fetchServiceDetail(slug, countryCode, locale);
  if (!res.ok) {
    logPublicContentFallback(`service-detail:${countryCode}:${slug}`, res.message);
    return null;
  }
  const row = res.data.service;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.slug !== "string" || typeof r.name !== "string") {
    return null;
  }
  const kind = typeof r.kind === "string" ? r.kind : "GENERAL";
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    summary: typeof r.summary === "string" ? r.summary : "",
    kind: kind as CountryServiceDetail["kind"],
    heroTitle: typeof r.heroTitle === "string" ? r.heroTitle : null,
    heroDescription: typeof r.heroDescription === "string" ? r.heroDescription : null,
    detailBody: typeof r.detailBody === "string" ? r.detailBody : null,
    ctaLabel: typeof r.ctaLabel === "string" ? r.ctaLabel : null,
    seoTitle: typeof r.seoTitle === "string" ? r.seoTitle : null,
    seoDescription: typeof r.seoDescription === "string" ? r.seoDescription : null,
    durationMinutes: typeof r.durationMinutes === "number" ? r.durationMinutes : null,
    basePriceCents: typeof r.basePriceCents === "number" ? r.basePriceCents : null,
    currencyCode: typeof r.currencyCode === "string" ? r.currencyCode : null,
    specialtyName: readSpecialtyName(r.specialty),
    imageSrc: pickImagePath(row) ?? null,
    gallery: resolveGallery(r.galleryImagePaths),
    faqs: readFaqs(r.faqs),
  };
});

/** Single health-test detail (admin CMS content) for the public test page.
 *  Returns null when the slug doesn't resolve for this country. */
export const getCountryHealthTestDetail = cache(async (
  countryCode: string,
  slug: string,
  locale?: string,
): Promise<CountryHealthTestDetail | null> => {
  const res = await fetchHealthTestDetail(slug, countryCode, locale);
  if (!res.ok) {
    logPublicContentFallback(`health-test-detail:${countryCode}:${slug}`, res.message);
    return null;
  }
  const row = res.data.healthTest;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.slug !== "string" || typeof r.title !== "string") {
    return null;
  }
  const imagePath = typeof r.productImagePath === "string" ? r.productImagePath : null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    shortDescription: typeof r.shortDescription === "string" ? r.shortDescription : null,
    detailIntro: typeof r.detailIntro === "string" ? r.detailIntro : null,
    heroButtonLabel: typeof r.heroButtonLabel === "string" ? r.heroButtonLabel : null,
    sampleType: typeof r.sampleType === "string" ? r.sampleType : null,
    resultsTimeline: typeof r.resultsTimeline === "string" ? r.resultsTimeline : null,
    seoTitle: typeof r.seoTitle === "string" ? r.seoTitle : null,
    seoDescription: typeof r.seoDescription === "string" ? r.seoDescription : null,
    priceCents: typeof r.priceCents === "number" ? r.priceCents : 0,
    currencyCode: typeof r.currencyCode === "string" ? r.currencyCode : "EUR",
    stock: typeof r.stock === "number" ? r.stock : null,
    imageSrc: imagePath ? resolveTrustedAssetUrl(imagePath) ?? null : null,
    gallery: resolveGallery(r.galleryImagePaths),
    whatThisTestCovers: readStringArray(r.whatThisTestCovers),
    whyGetTested: readStringArray(r.whyGetTested),
    extraSections: readExtraSections(r.extraSections),
    faqs: readHealthTestFaqs(r.faqs),
  };
});

function readHealthTestFaqs(raw: unknown): HealthTestFaqItem[] {
  if (!Array.isArray(raw)) return [];
  const out: HealthTestFaqItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const i = item as Record<string, unknown>;
    if (typeof i.id !== "string" || typeof i.question !== "string" || typeof i.answer !== "string") continue;
    out.push({ id: i.id, question: i.question, answer: i.answer });
  }
  return out;
}

// Subscription plan cards moved to `lib/content/get-country-plans.ts` (Sprint 3)
// against the Wave-0 PricingPlan shape (monthlyPriceCents / billingInterval /
// per-rule unlockAfterPaidMonths). The legacy reader here targeted the old
// pre-rename columns and a `/plans` route that never shipped — removed.
