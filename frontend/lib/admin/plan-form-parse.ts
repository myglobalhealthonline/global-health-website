/**
 * Parse the admin plan form (FormData) into the backend create/update body.
 * Pure + framework-free so it can be unit-tested. Price is entered in major
 * currency units (e.g. 20.00) and converted to integer cents here.
 */

export type PlanType = "ESSENTIAL" | "COMPREHENSIVE" | "PREMIUM";

export type PlanFormBody = {
  countryId?: string;
  /** Set only on create (plan type is immutable after). */
  planType?: PlanType;
  slug: string;
  name: string;
  shortDescription: string | null;
  longDescription: string | null;
  notesTerms: string | null;
  monthlyPriceCents: number;
  currencyCode: string;
  monthlyConsultationCredits: number;
  wellnessCreditsPerMonth: number;
  displayOrder: number;
  isFeatured: boolean;
  badgeLabel: string | null;
  familyEnabled: boolean;
  isActive: boolean;
};

const PLAN_TYPES: readonly PlanType[] = ["ESSENTIAL", "COMPREHENSIVE", "PREMIUM"];

export type ParsePlanResult =
  | { ok: true; data: PlanFormBody }
  | { ok: false; error: string };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function nullable(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

function intField(fd: FormData, key: string, fallback = 0): number {
  const v = str(fd, key);
  if (v === "") return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

/** Major-unit price (e.g. "20" or "20.50") → integer cents. NaN → null. */
export function majorToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function parsePlanForm(
  fd: FormData,
  opts: { includeCountry?: boolean } = {},
): ParsePlanResult {
  const slug = str(fd, "slug");
  const name = str(fd, "name");
  if (slug === "") return { ok: false, error: "Slug is required" };
  if (name === "") return { ok: false, error: "Name is required" };

  const cents = majorToCents(str(fd, "monthlyPrice"));
  if (cents === null) return { ok: false, error: "A valid monthly price is required" };

  const currencyCode = str(fd, "currencyCode").toUpperCase();
  if (currencyCode.length < 3) return { ok: false, error: "Currency code is required" };

  const data: PlanFormBody = {
    slug,
    name,
    shortDescription: nullable(fd, "shortDescription"),
    longDescription: nullable(fd, "longDescription"),
    notesTerms: nullable(fd, "notesTerms"),
    monthlyPriceCents: cents,
    currencyCode,
    monthlyConsultationCredits: intField(fd, "monthlyConsultationCredits"),
    wellnessCreditsPerMonth: intField(fd, "wellnessCreditsPerMonth"),
    displayOrder: intField(fd, "displayOrder"),
    isFeatured: bool(fd, "isFeatured"),
    badgeLabel: nullable(fd, "badgeLabel"),
    familyEnabled: bool(fd, "familyEnabled"),
    isActive: fd.has("isActive") ? bool(fd, "isActive") : true,
  };

  // Plan type is chosen at create (immutable after). Required when creating.
  if (opts.includeCountry) {
    const countryId = str(fd, "countryId");
    if (countryId === "") return { ok: false, error: "Country is required" };
    data.countryId = countryId;

    const planType = str(fd, "planType") as PlanType;
    if (!PLAN_TYPES.includes(planType)) return { ok: false, error: "Plan type is required" };
    data.planType = planType;
  }

  return { ok: true, data };
}
