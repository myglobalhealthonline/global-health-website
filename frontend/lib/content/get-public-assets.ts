import { fetchAssets } from "@/lib/api/site-content-api";
import { cache } from "react";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { isKnownCountryCode } from "@/lib/content/merge-public-content";
import { logPublicContentFallback } from "@/lib/content/public-content-source";
import type { CountryCode } from "@/data/countries";

export type PublicAssetRecord = {
  id: string;
  kind: string;
  key: string;
  path: string;
  altText: string | null;
  countryCode: CountryCode | null;
  doctorSlug: string | null;
};

function normalizeAsset(row: unknown): PublicAssetRecord | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const kind = typeof r.kind === "string" ? r.kind : null;
  const key = typeof r.key === "string" ? r.key : null;
  const path = typeof r.path === "string" ? r.path : null;
  if (!id || !kind || !key || !path) return null;

  const altText =
    r.altText === null || r.altText === undefined
      ? null
      : typeof r.altText === "string"
        ? r.altText
        : null;

  let countryCode: CountryCode | null = null;
  const country = r.country;
  if (country && typeof country === "object") {
    const code = (country as { code?: unknown }).code;
    if (isKnownCountryCode(code)) countryCode = code;
  }

  let doctorSlug: string | null = null;
  const doctor = r.doctor;
  if (doctor && typeof doctor === "object") {
    const slug = (doctor as { slug?: unknown }).slug;
    doctorSlug = typeof slug === "string" ? slug : null;
  }

  return {
    id,
    kind,
    key,
    path,
    altText,
    countryCode,
    doctorSlug,
  };
}

export const getPublicAssetsNormalized = cache(async (): Promise<PublicAssetRecord[]> => {
  const res = await fetchAssets();
  if (!res.ok) {
    logPublicContentFallback("assets", res.message);
    return [];
  }

  const out: PublicAssetRecord[] = [];
  for (const row of res.data) {
    const n = normalizeAsset(row);
    if (n) out.push(n);
  }
  return out;
});

export function pickSafeAssetPath(path: string): string | undefined {
  return resolveTrustedAssetUrl(path);
}

const IMAGE_OR_LOGO_KINDS = new Set(["IMAGE", "LOGO"]);

export function findAssetByKey(
  assets: PublicAssetRecord[],
  key: string,
  kinds: Set<string> = IMAGE_OR_LOGO_KINDS,
): PublicAssetRecord | undefined {
  return assets.find((a) => a.key === key && kinds.has(a.kind) && pickSafeAssetPath(a.path) !== undefined);
}

export function pickFirstAssetByKeys(
  assets: PublicAssetRecord[],
  keys: readonly string[],
  kinds: Set<string> = IMAGE_OR_LOGO_KINDS,
): PublicAssetRecord | undefined {
  for (const key of keys) {
    const hit = findAssetByKey(assets, key, kinds);
    if (hit) return hit;
  }
  return undefined;
}

/** Prefer doctor-linked IMAGE asset; safe local paths only. */
export async function resolveDoctorProfileImageUrl(doctorSlug: string): Promise<string | undefined> {
  const assets = await getPublicAssetsNormalized();
  const candidates = assets.filter(
    (a) =>
      a.kind === "IMAGE" &&
      a.doctorSlug === doctorSlug &&
      pickSafeAssetPath(a.path) !== undefined,
  );
  const first = candidates[0];
  return first ? pickSafeAssetPath(first.path) : undefined;
}
