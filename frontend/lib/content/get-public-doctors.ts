import type { CountryCode } from "@/data/countries";
import { fetchDoctors, fetchDoctorsByCountry, fetchDoctorsCount } from "@/lib/api/site-content-api";
import { cache } from "react";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { isKnownCountryCode } from "@/lib/content/merge-public-content";
import { logPublicContentFallback } from "@/lib/content/public-content-source";

/** Parses `Languages: a, b.` from seeded/CMS bio lines. Returns null if not present. */
export function parseLanguagesFromDoctorBio(bio: string | null | undefined): string[] | null {
  if (!bio) return null;
  const m = bio.match(/Languages:\s*([^.]*?)(?:\.|$)/i);
  if (!m) return null;
  const parts = m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : null;
}

/** Parses `IMC: value` from bio. Returns null if not present. */
export function parseImcFromDoctorBio(bio: string | null | undefined): string | null {
  if (!bio) return null;
  const m = bio.match(/IMC:\s*([^\n.]+)/i);
  return m?.[1]?.trim() || null;
}

/** Parses `WhatsApp: value` from bio. Returns null if not present. */
export function parseWhatsappFromDoctorBio(bio: string | null | undefined): string | null {
  if (!bio) return null;
  const m = bio.match(/WhatsApp:\s*([^\n.]+)/i);
  return m?.[1]?.trim() || null;
}

export type PublicDoctorRecord = {
  id: string;
  slug: string;
  fullName: string;
  title: string;
  bio: string | null;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  faqs?: Array<{ id: string; question: string; answer: string; category?: string | null }>;
  imcRegistration?: string;
  medicalRegistrationUrl?: string;
  qualifications?: string[];
  whatsappNumber?: string;
  languages?: string[];
  countryCode: CountryCode;
  countryName: string;
  teamPath: string;
  specialties: string[];
  /** Resolved safe URL/path for Next/Image when the API returns a profile asset. */
  profileImageSrc?: string;
  profileImageAltText?: string;
  profileImageTitle?: string;
  profileImageCaption?: string;
  profileImageDescription?: string;
  /** Focal point (0-100, default 50) + zoom (1-3, default 1). */
  profileImageFocalX: number;
  profileImageFocalY: number;
  profileImageZoom: number;
  editorialChecklist?: Record<string, unknown>;
  /** ISO timestamp string, when the backend row includes one (Prisma @updatedAt). */
  updatedAt?: string;
};

function readCountry(row: unknown): { code: CountryCode; name: string; teamPath: string } | undefined {
  if (!row || typeof row !== "object") return undefined;
  const r = row as Record<string, unknown>;
  const code = r.code;
  const name = typeof r.name === "string" ? r.name : "";
  const teamPath = typeof r.teamPath === "string" ? r.teamPath : "";
  if (!isKnownCountryCode(code) || !name || !teamPath) return undefined;
  return { code, name, teamPath };
}

function profileImageFromRow(row: unknown):
  | {
      src: string;
      altText?: string;
      title?: string;
      caption?: string;
      description?: string;
      focalX: number;
      focalY: number;
      zoom: number;
    }
  | undefined {
  const assets = (row as { assets?: unknown }).assets;
  if (!Array.isArray(assets)) return undefined;
  // Backend orders active profile images newest-first. Trust that order
  // so a newer doctor-uploaded photo cannot be overridden by an older
  // canonical admin key.
  for (const a of assets) {
    if (!a || typeof a !== "object") continue;
    const rec = a as {
      kind?: unknown;
      path?: unknown;
      altText?: unknown;
      title?: unknown;
      caption?: unknown;
      description?: unknown;
      focalX?: unknown;
      focalY?: unknown;
      zoom?: unknown;
    };
    if (rec.kind !== "IMAGE" || typeof rec.path !== "string") continue;
    const url = resolveTrustedAssetUrl(rec.path);
    if (!url) continue;
    return {
      src: url,
      ...(typeof rec.altText === "string" && rec.altText.trim()
        ? { altText: rec.altText.trim() }
        : {}),
      ...(typeof rec.title === "string" && rec.title.trim()
        ? { title: rec.title.trim() }
        : {}),
      ...(typeof rec.caption === "string" && rec.caption.trim()
        ? { caption: rec.caption.trim() }
        : {}),
      ...(typeof rec.description === "string" && rec.description.trim()
        ? { description: rec.description.trim() }
        : {}),
      focalX: typeof rec.focalX === "number" ? rec.focalX : 50,
      focalY: typeof rec.focalY === "number" ? rec.focalY : 50,
      zoom: typeof rec.zoom === "number" ? rec.zoom : 1,
    };
  }
  return undefined;
}

function readDoctorFaqs(row: unknown): PublicDoctorRecord["faqs"] {
  const faqs = (row as { faqs?: unknown }).faqs;
  if (!Array.isArray(faqs)) return undefined;
  const out: NonNullable<PublicDoctorRecord["faqs"]> = [];
  for (const faq of faqs) {
    if (!faq || typeof faq !== "object") continue;
    const f = faq as Record<string, unknown>;
    if (typeof f.question !== "string" || typeof f.answer !== "string") continue;
    out.push({
      id: typeof f.id === "string" ? f.id : f.question,
      question: f.question,
      answer: f.answer,
      category: typeof f.category === "string" ? f.category : null,
    });
  }
  return out.length > 0 ? out : undefined;
}

function specialtyNames(row: unknown): string[] {
  if (!row || typeof row !== "object") return [];
  const specs = (row as { specialties?: unknown }).specialties;
  if (!Array.isArray(specs)) return [];
  const names: string[] = [];
  for (const link of specs) {
    if (link && typeof link === "object" && "specialty" in link) {
      const sp = (link as { specialty?: unknown }).specialty;
      if (sp && typeof sp === "object" && typeof (sp as { name?: unknown }).name === "string") {
        names.push((sp as { name: string }).name);
      }
    }
  }
  return names;
}

export function normalizePublicDoctorRecord(row: unknown): PublicDoctorRecord | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const slug = typeof r.slug === "string" ? r.slug : null;
  const fullName = typeof r.fullName === "string" ? r.fullName : null;
  const title = typeof r.title === "string" ? r.title : null;
  if (!id || !slug || !fullName || !title) return null;

  const country = readCountry(r.country);
  if (!country) return null;

  const bio = typeof r.bio === "string" ? r.bio : null;
  const seoTitle =
    typeof r.seoTitle === "string" && r.seoTitle.trim() !== "" ? r.seoTitle.trim() : undefined;
  const seoDescription =
    typeof r.seoDescription === "string" && r.seoDescription.trim() !== ""
      ? r.seoDescription.trim()
      : undefined;
  const seoKeywords = Array.isArray(r.seoKeywords)
    ? r.seoKeywords
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean)
    : undefined;
  const imcRegistration =
    typeof r.imcRegistration === "string" && r.imcRegistration.trim() !== ""
      ? r.imcRegistration.trim()
      : undefined;
  const medicalRegistrationUrl =
    typeof r.medicalRegistrationUrl === "string" && r.medicalRegistrationUrl.trim() !== ""
      ? r.medicalRegistrationUrl.trim()
      : undefined;
  const qualifications = Array.isArray(r.qualifications)
    ? r.qualifications
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean)
    : undefined;
  const whatsappNumber =
    typeof r.whatsappNumber === "string" && r.whatsappNumber.trim() !== ""
      ? r.whatsappNumber.trim()
      : undefined;
  const languages = Array.isArray(r.languages)
    ? r.languages
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean)
    : undefined;
  const profileImage = profileImageFromRow(row);
  const faqs = readDoctorFaqs(row);
  const editorialChecklist =
    r.editorialChecklist && typeof r.editorialChecklist === "object"
      ? (r.editorialChecklist as Record<string, unknown>)
      : undefined;
  const updatedAt = typeof r.updatedAt === "string" ? r.updatedAt : undefined;

  return {
    id,
    slug,
    fullName,
    title,
    bio,
    ...(seoTitle ? { seoTitle } : {}),
    ...(seoDescription ? { seoDescription } : {}),
    ...(seoKeywords && seoKeywords.length > 0 ? { seoKeywords } : {}),
    ...(faqs ? { faqs } : {}),
    ...(imcRegistration ? { imcRegistration } : {}),
    ...(medicalRegistrationUrl ? { medicalRegistrationUrl } : {}),
    ...(qualifications && qualifications.length > 0 ? { qualifications } : {}),
    ...(whatsappNumber ? { whatsappNumber } : {}),
    ...(languages && languages.length > 0 ? { languages } : {}),
    countryCode: country.code,
    countryName: country.name,
    teamPath: country.teamPath,
    specialties: specialtyNames(row),
    ...(profileImage?.src ? { profileImageSrc: profileImage.src } : {}),
    ...(profileImage?.altText ? { profileImageAltText: profileImage.altText } : {}),
    ...(profileImage?.title ? { profileImageTitle: profileImage.title } : {}),
    ...(profileImage?.caption ? { profileImageCaption: profileImage.caption } : {}),
    ...(profileImage?.description
      ? { profileImageDescription: profileImage.description }
      : {}),
    profileImageFocalX: profileImage?.focalX ?? 50,
    profileImageFocalY: profileImage?.focalY ?? 50,
    profileImageZoom: profileImage?.zoom ?? 1,
    ...(editorialChecklist ? { editorialChecklist } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export const getPublicDoctorsNormalized = cache(
  async (locale?: string): Promise<PublicDoctorRecord[]> => {
    const res = await fetchDoctors(locale);
    if (!res.ok) {
      logPublicContentFallback("doctors", res.message);
      return [];
    }

    const out: PublicDoctorRecord[] = [];
    for (const row of res.data) {
      const n = normalizePublicDoctorRecord(row);
      if (n) out.push(n);
    }
    return out;
  },
);

/**
 * A market's roster, normalized — the SAME representation the doctor profile
 * page resolves from (`/api/countries/{code}/doctors`, which is the list form
 * of the by-slug endpoint `resolveDoctorProfilePageData` uses).
 *
 * Use this, never `getPublicDoctorsNormalized`, whenever publication or
 * indexability is being decided. The global `/api/doctors` roster is built by
 * `listDoctors`, which does NOT include the `additionalCountries` join, so the
 * per-market registration fields (`imcRegistration`, resolved from
 * `DoctorCountry.registrationNumber`) are absent from every row — which made
 * `validatePublicDoctorRecord` fail the "credentials" rule for 14 live,
 * self-canonical Ireland doctors and drop them from the sitemap.
 *
 * NOTE: `record.countryCode` is the doctor's PRIMARY country, not the market
 * queried here — a doctor rostered into this market via an active
 * `DoctorCountry` row keeps their own primary code. Build URLs from the country
 * you asked for, not from the record.
 */
export const getPublicDoctorsForMarket = cache(
  async (countryCode: string, locale?: string): Promise<PublicDoctorRecord[]> => {
    const res = await fetchDoctorsByCountry(countryCode, locale);
    if (!res.ok) {
      logPublicContentFallback(`country-doctors:${countryCode}`, res.message);
      return [];
    }
    const out: PublicDoctorRecord[] = [];
    for (const row of res.data) {
      const n = normalizePublicDoctorRecord(row);
      if (n) out.push(n);
    }
    return out;
  },
);

/** Active-doctor headcount (count projection). Replaces fetching the full
 *  roster just to read `.length` on the homepage. */
export const getPublicDoctorsCount = cache(async (): Promise<number> => {
  const res = await fetchDoctorsCount();
  if (!res.ok) {
    logPublicContentFallback("doctors:count", res.message);
    return 0;
  }
  return typeof res.data.count === "number" ? res.data.count : 0;
});

export async function getPublicDoctorsForCountry(
  countryCode: CountryCode,
  locale?: string,
): Promise<PublicDoctorRecord[]> {
  const all = await getPublicDoctorsNormalized(locale);
  return all.filter((d) => d.countryCode === countryCode);
}

export async function getPublicDoctorBySlug(
  slug: string,
  locale?: string,
): Promise<PublicDoctorRecord | undefined> {
  const all = await getPublicDoctorsNormalized(locale);
  return all.find((d) => d.slug === slug);
}
