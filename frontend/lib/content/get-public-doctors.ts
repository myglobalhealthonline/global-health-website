import type { CountryCode } from "@/data/countries";
import { fetchDoctors } from "@/lib/api/site-content-api";
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

export type PublicDoctorRecord = {
  id: string;
  slug: string;
  fullName: string;
  title: string;
  bio: string | null;
  countryCode: CountryCode;
  countryName: string;
  teamPath: string;
  specialties: string[];
  /** Resolved safe URL/path for Next/Image when the API returns a profile asset. */
  profileImageSrc?: string;
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

function profileImageFromRow(row: unknown): string | undefined {
  const assets = (row as { assets?: unknown }).assets;
  if (!Array.isArray(assets)) return undefined;
  for (const a of assets) {
    if (!a || typeof a !== "object") continue;
    const rec = a as { kind?: unknown; path?: unknown };
    if (rec.kind !== "IMAGE" || typeof rec.path !== "string") continue;
    const url = resolveTrustedAssetUrl(rec.path);
    if (url) return url;
  }
  return undefined;
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

function normalizeDoctor(row: unknown): PublicDoctorRecord | null {
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
  const profileImageSrc = profileImageFromRow(row);

  return {
    id,
    slug,
    fullName,
    title,
    bio,
    countryCode: country.code,
    countryName: country.name,
    teamPath: country.teamPath,
    specialties: specialtyNames(row),
    ...(profileImageSrc ? { profileImageSrc } : {}),
  };
}

export const getPublicDoctorsNormalized = cache(async (): Promise<PublicDoctorRecord[]> => {
  const res = await fetchDoctors();
  if (!res.ok) {
    logPublicContentFallback("doctors", res.message);
    return [];
  }

  const out: PublicDoctorRecord[] = [];
  for (const row of res.data) {
    const n = normalizeDoctor(row);
    if (n) out.push(n);
  }
  return out;
});

export async function getPublicDoctorsForCountry(countryCode: CountryCode): Promise<PublicDoctorRecord[]> {
  const all = await getPublicDoctorsNormalized();
  return all.filter((d) => d.countryCode === countryCode);
}

export async function getPublicDoctorBySlug(slug: string): Promise<PublicDoctorRecord | undefined> {
  const all = await getPublicDoctorsNormalized();
  return all.find((d) => d.slug === slug);
}
