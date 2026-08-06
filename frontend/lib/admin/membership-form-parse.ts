/**
 * Parse the private-membership admin forms (FormData) into backend bodies.
 * Pure + framework-free so it can be unit-tested, mirroring plan-form-parse.ts.
 *
 * Money is entered in major currency units (e.g. 45.00) and converted to
 * integer cents here. The cross-field benefit invariants are NOT re-implemented
 * — the backend Zod schema and the migration's CHECK constraints own those; this
 * only shapes the payload and clears the fields the chosen type does not use, so
 * a leftover value from a previously-selected type can never be submitted.
 */

export type MembershipServiceKind = "GENERAL" | "SPECIALIST";
export type MembershipBenefitType = "ALLOWANCE" | "PERCENT" | "FIXED" | "EXCLUDED";
export type MembershipFallbackType = "NONE" | "PERCENT" | "FIXED";
export type MembershipAllowancePool = "SHARED" | "PER_PERSON";

export type MembershipPlanFormBody = {
  countryId?: string;
  slug: string;
  name: string;
  internalNotes: string | null;
  isActive: boolean;
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  payerAmountCents: number | null;
  payerCurrency: string | null;
  payerNotes: string | null;
};

export type MembershipLevelFormBody = {
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  familyEnabled: boolean;
  maxDependents: number;
  allowancePool: MembershipAllowancePool;
};

export type MembershipBenefitFormBody = {
  serviceKind: MembershipServiceKind | null;
  serviceId: string | null;
  benefitType: MembershipBenefitType;
  allowanceCount: number | null;
  percentOff: number | null;
  fixedPriceCents: number | null;
  fallbackType: MembershipFallbackType;
  fallbackPercent: number | null;
  fallbackFixedCents: number | null;
  isActive: boolean;
};

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

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

function nullableInt(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function nullableFloat(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number.parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

/** Major-unit money (e.g. "45" or "45.50") → integer cents. Blank → null. */
export function majorToCents(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function parseMembershipPlanForm(
  fd: FormData,
  opts: { includeCountry?: boolean } = {},
): ParseResult<MembershipPlanFormBody> {
  const slug = str(fd, "slug");
  const name = str(fd, "name");
  if (!slug) return { ok: false, error: "Slug is required" };
  if (!name) return { ok: false, error: "Name is required" };

  const payerAmountRaw = str(fd, "payerAmountMajor");
  const payerAmountCents = payerAmountRaw === "" ? null : majorToCents(payerAmountRaw);
  if (payerAmountRaw !== "" && payerAmountCents === null) {
    return { ok: false, error: "Payer amount must be a number" };
  }

  const body: MembershipPlanFormBody = {
    slug,
    name,
    internalNotes: nullable(fd, "internalNotes"),
    isActive: bool(fd, "isActive"),
    payerName: nullable(fd, "payerName"),
    payerEmail: nullable(fd, "payerEmail"),
    payerPhone: nullable(fd, "payerPhone"),
    payerAmountCents,
    payerCurrency: nullable(fd, "payerCurrency"),
    payerNotes: nullable(fd, "payerNotes"),
  };

  if (opts.includeCountry) {
    const countryId = str(fd, "countryId");
    if (!countryId) return { ok: false, error: "Country is required" };
    body.countryId = countryId;
  }
  return { ok: true, data: body };
}

export function parseMembershipLevelForm(fd: FormData): ParseResult<MembershipLevelFormBody> {
  const slug = str(fd, "slug");
  const name = str(fd, "name");
  if (!slug) return { ok: false, error: "Slug is required" };
  if (!name) return { ok: false, error: "Name is required" };

  const familyEnabled = bool(fd, "familyEnabled");
  // Dependents are meaningless without family, and the backend rejects the
  // combination — zero it here so unchecking "family" in the form does not
  // bounce the whole save on a leftover number.
  const maxDependents = familyEnabled ? intField(fd, "maxDependents", 0) : 0;

  const pool = str(fd, "allowancePool");
  return {
    ok: true,
    data: {
      slug,
      name,
      sortOrder: intField(fd, "sortOrder", 0),
      isActive: bool(fd, "isActive"),
      familyEnabled,
      maxDependents,
      allowancePool: pool === "SHARED" ? "SHARED" : "PER_PERSON",
    },
  };
}

const BENEFIT_TYPES: readonly MembershipBenefitType[] = [
  "ALLOWANCE",
  "PERCENT",
  "FIXED",
  "EXCLUDED",
];
const FALLBACK_TYPES: readonly MembershipFallbackType[] = ["NONE", "PERCENT", "FIXED"];

export function parseMembershipBenefitForm(fd: FormData): ParseResult<MembershipBenefitFormBody> {
  const rawType = str(fd, "benefitType") as MembershipBenefitType;
  if (!BENEFIT_TYPES.includes(rawType)) return { ok: false, error: "Choose a benefit type" };

  // One radio drives which target field is meaningful; the other is discarded
  // so a stale value cannot make the row target both (§3.3).
  const targetMode = str(fd, "targetMode");
  let serviceKind: MembershipServiceKind | null = null;
  let serviceId: string | null = null;
  if (targetMode === "service") {
    serviceId = nullable(fd, "serviceId");
    if (!serviceId) return { ok: false, error: "Choose a service" };
  } else {
    const kind = str(fd, "serviceKind");
    if (kind !== "GENERAL" && kind !== "SPECIALIST") {
      return { ok: false, error: "Choose a consultation type" };
    }
    serviceKind = kind;
  }

  const rawFallback = str(fd, "fallbackType") as MembershipFallbackType;
  // A fallback is only valid on an allowance row, so anything else is forced
  // back to NONE rather than rejected — the form hides the control there.
  const fallbackType: MembershipFallbackType =
    rawType === "ALLOWANCE" && FALLBACK_TYPES.includes(rawFallback) ? rawFallback : "NONE";

  const fixedPriceCents = rawType === "FIXED" ? majorToCents(str(fd, "fixedPriceMajor")) : null;
  if (rawType === "FIXED" && fixedPriceCents === null) {
    return { ok: false, error: "Member price is required for a fixed-price benefit" };
  }
  const fallbackFixedCents =
    fallbackType === "FIXED" ? majorToCents(str(fd, "fallbackFixedMajor")) : null;
  if (fallbackType === "FIXED" && fallbackFixedCents === null) {
    return { ok: false, error: "Fallback price is required" };
  }

  return {
    ok: true,
    data: {
      serviceKind,
      serviceId,
      benefitType: rawType,
      allowanceCount: rawType === "ALLOWANCE" ? nullableInt(fd, "allowanceCount") : null,
      percentOff: rawType === "PERCENT" ? nullableFloat(fd, "percentOff") : null,
      fixedPriceCents,
      fallbackType,
      fallbackPercent: fallbackType === "PERCENT" ? nullableFloat(fd, "fallbackPercent") : null,
      fallbackFixedCents,
      isActive: bool(fd, "isActive"),
    },
  };
}
