import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import {
  canSendReviewInvite,
  countryReviewSettingKey,
  parseCountryReviewSetting,
  toPatientReviewDestinations,
  type PatientReviewDestination,
} from "../review-invites/review-destinations.js";

/**
 * Thin wrapper around the generic Setting key/value table.
 *
 * All values are JSON. Reads/writes go through here so consumers don't have
 * to know about Prisma directly and we get a single place to evolve schemas
 * for individual keys (versioning, defaults, validation).
 */

export type AggregateSnapshot = {
  rating: number;
  count: number;
  updatedAt: string;
};

export type PublicReviewConfig = {
  trustpilot: {
    businessUnitId: string | null;
    reviewUrl: string | null;
    aggregate: AggregateSnapshot | null;
  };
  google: {
    placeId: string | null;
    aggregate: AggregateSnapshot | null;
  };
  doctify: {
    clinicId: string | null;
    aggregate: AggregateSnapshot | null;
  };
  primaryProvider: "TRUSTPILOT" | "GOOGLE" | "DOCTIFY" | null;
};

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    return (row?.value as T | undefined) ?? null;
  } catch (error) {
    throw normalizeDbError(error, "Could not read setting");
  }
}

// Allowlist of keys the Setting table is permitted to hold. The Setting
// table is a generic key/value store; without an allowlist a future caller
// (or a bug) could write to an arbitrary key that influences app behaviour.
// Exact keys plus a small set of dynamic prefixes (e.g. per-country
// featured-doctor rows keyed `featured_doctor:<code>`).
const WRITABLE_SETTING_KEYS = new Set<string>([
  "review.trustpilot.businessUnitId",
  "review.trustpilot.reviewUrl",
  "review.trustpilot.aggregate",
  "review.google.placeId",
  "review.google.aggregate",
  "review.doctify.clinicId",
  "review.doctify.aggregate",
  "review.primaryProvider",
]);
const WRITABLE_SETTING_PREFIXES = [
  "featured_doctor:",
  "review.destination:",
  // Same-day GP quick-book config + rotation state (per country).
  "gp_same_day_service:",
  "gp_priority_doctor:",
  "gp_rotation_cursor:",
];

function assertWritableKey(key: string): void {
  if (WRITABLE_SETTING_KEYS.has(key)) return;
  if (WRITABLE_SETTING_PREFIXES.some((p) => key.startsWith(p))) return;
  throw new Error(`Refusing to write to unrecognised setting key: ${key}`);
}

export async function upsertSetting(key: string, value: unknown): Promise<void> {
  assertWritableKey(key);
  try {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: value as object },
      update: { value: value as object },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not write setting");
  }
}

export async function deleteSetting(key: string): Promise<void> {
  assertWritableKey(key);
  try {
    await prisma.setting.delete({ where: { key } }).catch(() => undefined);
  } catch (error) {
    throw normalizeDbError(error, "Could not delete setting");
  }
}

/** Read the full review-provider config in one round-trip. */
export async function getPublicReviewConfig(): Promise<PublicReviewConfig> {
  try {
    const rows = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "review.trustpilot.businessUnitId",
            "review.trustpilot.reviewUrl",
            "review.trustpilot.aggregate",
            "review.google.placeId",
            "review.google.aggregate",
            "review.doctify.clinicId",
            "review.doctify.aggregate",
            "review.primaryProvider",
          ],
        },
      },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));

    function asString(v: unknown): string | null {
      return typeof v === "string" && v.trim().length > 0 ? v : null;
    }
    function asAggregate(v: unknown): AggregateSnapshot | null {
      if (!v || typeof v !== "object") return null;
      const obj = v as Partial<AggregateSnapshot>;
      if (typeof obj.rating !== "number" || typeof obj.count !== "number") return null;
      if (obj.rating < 0 || obj.rating > 5) return null;
      return {
        rating: obj.rating,
        count: obj.count,
        updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
      };
    }
    function asPrimaryProvider(v: unknown): "TRUSTPILOT" | "GOOGLE" | "DOCTIFY" | null {
      if (v === "TRUSTPILOT" || v === "GOOGLE" || v === "DOCTIFY") return v;
      return null;
    }

    return {
      trustpilot: {
        businessUnitId: asString(map.get("review.trustpilot.businessUnitId")),
        reviewUrl: asString(map.get("review.trustpilot.reviewUrl")),
        aggregate: asAggregate(map.get("review.trustpilot.aggregate")),
      },
      google: {
        placeId: asString(map.get("review.google.placeId")),
        aggregate: asAggregate(map.get("review.google.aggregate")),
      },
      doctify: {
        clinicId: asString(map.get("review.doctify.clinicId")),
        aggregate: asAggregate(map.get("review.doctify.aggregate")),
      },
      primaryProvider: asPrimaryProvider(map.get("review.primaryProvider")),
    };
  } catch (error) {
    throw normalizeDbError(error, "Could not read review config");
  }
}

export type AdminCountryReviewDestination = {
  countryCode: string;
  countryName: string;
  sendReviewRequests: boolean;
  googleReviewUrl: string | null;
  doctifyReviewUrl: string | null;
};

export async function getAdminCountryReviewDestinations(): Promise<AdminCountryReviewDestination[]> {
  try {
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { name: "asc" },
    });
    const keys = countries.map((country) => countryReviewSettingKey(country.code));
    const settings = keys.length
      ? await prisma.setting.findMany({ where: { key: { in: keys } } })
      : [];
    const values = new Map(settings.map((setting) => [setting.key, setting.value]));

    return countries.map((country) => {
      const stored = parseCountryReviewSetting(values.get(countryReviewSettingKey(country.code)));
      return {
        countryCode: country.code.toUpperCase(),
        countryName: country.name,
        sendReviewRequests: stored?.sendReviewRequests ?? false,
        googleReviewUrl: stored?.googleReviewUrl ?? null,
        doctifyReviewUrl: stored?.doctifyReviewUrl ?? null,
      };
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not read country review destinations");
  }
}

async function getCountryReviewDeliveryConfig(
  countryCode: string | null | undefined,
): Promise<{
  countrySetting: ReturnType<typeof parseCountryReviewSetting>;
  trustpilotReviewUrl: string | null;
}> {
  const countryKey = countryCode ? countryReviewSettingKey(countryCode) : null;
  const keys = ["review.trustpilot.reviewUrl", ...(countryKey ? [countryKey] : [])];
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const countrySetting = countryKey
    ? parseCountryReviewSetting(values.get(countryKey))
    : null;
  const trustpilotValue = values.get("review.trustpilot.reviewUrl");
  const trustpilotReviewUrl = typeof trustpilotValue === "string" ? trustpilotValue : null;
  return { countrySetting, trustpilotReviewUrl };
}

export async function canSendReviewInviteForCountry(
  countryCode: string | null | undefined,
): Promise<boolean> {
  try {
    return canSendReviewInvite(await getCountryReviewDeliveryConfig(countryCode));
  } catch (error) {
    throw normalizeDbError(error, "Could not read review invitation setting");
  }
}

export async function getPatientReviewDestinations(
  countryCode: string | null | undefined,
): Promise<PatientReviewDestination[]> {
  try {
    const { countrySetting, trustpilotReviewUrl } =
      await getCountryReviewDeliveryConfig(countryCode);
    return toPatientReviewDestinations({ countrySetting, trustpilotReviewUrl });
  } catch (error) {
    throw normalizeDbError(error, "Could not read patient review destinations");
  }
}
