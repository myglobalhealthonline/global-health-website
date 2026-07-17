import "server-only";

import { revalidateTag } from "next/cache";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";

export type DoctorProfileCacheContext = {
  countryCode: string;
  slug: string;
  additionalCountryCodes?: string[];
};

function isDoctorProfileCacheContext(
  value: unknown,
): value is DoctorProfileCacheContext {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const additional = record.additionalCountryCodes;
  return (
    typeof record.countryCode === "string" &&
    record.countryCode.trim() !== "" &&
    typeof record.slug === "string" &&
    record.slug.trim() !== "" &&
    (additional === undefined ||
      (Array.isArray(additional) && additional.every((code) => typeof code === "string")))
  );
}

function readDoctorProfileCacheContext(text: string): DoctorProfileCacheContext | null {
  try {
    const json = JSON.parse(text) as {
      ok?: unknown;
      data?: { cache?: unknown };
    };
    if (json.ok !== true) return null;
    return isDoctorProfileCacheContext(json.data?.cache) ? json.data.cache : null;
  } catch {
    return null;
  }
}

/**
 * Busts every public cache a doctor's profile appears in: the global roster,
 * and each market's roster + their profile page in that market.
 *
 * Callers that hold the backend's raw response should use
 * `revalidateDoctorProfileCacheFromApiText`; this is the entry point for
 * callers that already have the parsed `cache` block (e.g. the admin
 * profile-change approval, which applies the edit server-side).
 */
export function revalidateDoctorProfileCache(cache: DoctorProfileCacheContext): void {
  const countryCodes = new Set<string>([cache.countryCode]);
  for (const code of cache.additionalCountryCodes ?? []) {
    if (typeof code === "string" && code.trim() !== "") {
      countryCodes.add(code);
    }
  }

  revalidateTag(SITE_CACHE_TAGS.globalDoctors(), "max");
  for (const code of countryCodes) {
    revalidateTag(SITE_CACHE_TAGS.countryDoctors(code), "max");
    revalidateTag(SITE_CACHE_TAGS.countryDoctorBySlug(code, cache.slug), "max");
  }
}

export function revalidateDoctorProfileCacheFromApiText(text: string): void {
  const cache = readDoctorProfileCacheContext(text);
  if (!cache) return;
  revalidateDoctorProfileCache(cache);
}
