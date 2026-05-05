import type { CountryCode } from "@/data/countries";
import { fetchServices } from "@/lib/api/site-content-api";
import { cache } from "react";
import { isKnownCountryCode } from "@/lib/content/merge-public-content";
import { logPublicContentFallback } from "@/lib/content/public-content-source";

export type PublicServiceRecord = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  legacyPath: string | null;
  countryCode: CountryCode;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
};

function readCountryCode(row: unknown): CountryCode | undefined {
  if (!row || typeof row !== "object") return undefined;
  const c = (row as { code?: unknown }).code;
  return isKnownCountryCode(c) ? c : undefined;
}

function normalizeService(row: unknown): PublicServiceRecord | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const slug = typeof r.slug === "string" ? r.slug : null;
  const name = typeof r.name === "string" ? r.name : null;
  if (!id || !slug || !name) return null;

  const countryCode = readCountryCode(r.country);
  if (!countryCode) return null;

  const summary = typeof r.summary === "string" ? r.summary : null;
  const legacyPath =
    r.legacyPath === null || r.legacyPath === undefined
      ? null
      : typeof r.legacyPath === "string"
        ? r.legacyPath
        : null;
  const durationMinutes =
    typeof r.durationMinutes === "number" && Number.isFinite(r.durationMinutes)
      ? r.durationMinutes
      : null;
  const basePriceCents =
    typeof r.basePriceCents === "number" && Number.isFinite(r.basePriceCents)
      ? r.basePriceCents
      : null;
  const currencyCode =
    typeof r.currencyCode === "string" && r.currencyCode.length > 0 ? r.currencyCode : null;

  return {
    id,
    slug,
    name,
    summary,
    legacyPath,
    countryCode,
    durationMinutes,
    basePriceCents,
    currencyCode,
  };
}

export const getPublicServicesNormalized = cache(async (): Promise<PublicServiceRecord[]> => {
  const res = await fetchServices();
  if (!res.ok) {
    logPublicContentFallback("services", res.message);
    return [];
  }

  const out: PublicServiceRecord[] = [];
  for (const row of res.data) {
    const n = normalizeService(row);
    if (n) out.push(n);
  }
  return out;
});

export async function getPublicServicesForCountry(countryCode: CountryCode): Promise<PublicServiceRecord[]> {
  const all = await getPublicServicesNormalized();
  return all.filter((s) => s.countryCode === countryCode);
}

export function formatOptionalPrice(service: PublicServiceRecord): string | undefined {
  if (service.basePriceCents == null || !service.currencyCode) return undefined;
  const sym =
    service.currencyCode.toUpperCase() === "EUR"
      ? "EUR"
      : service.currencyCode.toUpperCase() === "USD"
        ? "USD"
        : service.currencyCode.toUpperCase();
  const amount = service.basePriceCents / 100;
  return `From ${sym} ${amount.toFixed(0)}`;
}
