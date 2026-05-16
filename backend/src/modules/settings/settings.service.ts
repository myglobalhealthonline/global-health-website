import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

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

export async function upsertSetting(key: string, value: unknown): Promise<void> {
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
