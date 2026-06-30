import { prisma } from "../../db/prisma.js";
import { getSetting, upsertSetting, deleteSetting } from "../settings/settings.service.js";

/**
 * Configuration + state for the same-day GP quick-book flow.
 *
 * Three pieces of admin/runtime state live in the generic Setting key/value
 * table (no new schema columns, matching the existing `featured_doctor:` pattern):
 *
 *   gp_same_day_service:<country>   → { serviceId }   — THE GENERAL service the
 *       homepage "Same-Day Consultation" books. Admin-chosen per country.
 *   gp_priority_doctor:<country>    → { doctorId }    — the priority GP (Dr.
 *       Tiago) who jumps the queue inside the 24h window.
 *   gp_rotation_cursor:<country>:<serviceId>:<lang> → { index } — round-robin
 *       cursor advanced on each non-priority assignment for fair rotation.
 *
 * `resolveGpSameDayService` falls back to the country's sole active GENERAL
 * service when no explicit setting exists, so a single-GP-service country works
 * with zero admin configuration.
 */

function serviceKey(countryCode: string): string {
  return `gp_same_day_service:${countryCode.trim().toLowerCase()}`;
}
function priorityKey(countryCode: string): string {
  return `gp_priority_doctor:${countryCode.trim().toLowerCase()}`;
}
function cursorKey(countryCode: string, serviceId: string, languageCode: string): string {
  return `gp_rotation_cursor:${countryCode.trim().toLowerCase()}:${serviceId}:${languageCode.trim().toLowerCase()}`;
}

export type GpSameDayService = {
  id: string;
  slug: string;
  name: string;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string;
  countryCode: string;
};

/**
 * Resolve the GENERAL service the same-day flow books for a country.
 *
 * Priority:
 *   1. The admin-configured service (Setting `gp_same_day_service:<code>`),
 *      provided it is still an active GENERAL service in this country.
 *   2. Fallback: the country's active GENERAL services ordered by sortOrder —
 *      returns the first. (One-GP-service countries need no configuration;
 *      multi-service countries should set the Setting to disambiguate.)
 *
 * Returns null when the country has no active GENERAL service at all.
 */
export async function resolveGpSameDayService(
  countryCode: string,
): Promise<GpSameDayService | null> {
  const code = countryCode.trim().toLowerCase();
  const configured = await getSetting<{ serviceId: string }>(serviceKey(code));

  const baseWhere = {
    kind: "GENERAL" as const,
    isActive: true,
    country: { code, isActive: true },
  };

  // 1. Configured service — must still satisfy the GENERAL/active/in-country
  //    invariant, otherwise fall through to the automatic pick.
  if (configured?.serviceId) {
    const svc = await prisma.service.findFirst({
      where: { id: configured.serviceId, ...baseWhere },
      include: { country: { include: { currency: true } } },
    });
    if (svc) return toServiceDto(svc);
  }

  // 2. Automatic fallback — first active GENERAL service by sort order.
  const fallback = await prisma.service.findFirst({
    where: baseWhere,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { country: { include: { currency: true } } },
  });
  return fallback ? toServiceDto(fallback) : null;
}

type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  country: { code: string; currency: { code: string } };
};

function toServiceDto(svc: ServiceRow): GpSameDayService {
  return {
    id: svc.id,
    slug: svc.slug,
    name: svc.name,
    durationMinutes: svc.durationMinutes,
    basePriceCents: svc.basePriceCents,
    currencyCode: svc.currencyCode ?? svc.country.currency.code,
    countryCode: svc.country.code,
  };
}

/** The configured priority GP doctor id for a country, or null when unset. */
export async function getGpPriorityDoctorId(countryCode: string): Promise<string | null> {
  const value = await getSetting<{ doctorId: string }>(priorityKey(countryCode));
  return value?.doctorId ?? null;
}

/** Admin setters — write `null` to clear. */
export async function setGpSameDayServiceId(
  countryCode: string,
  serviceId: string | null,
): Promise<void> {
  if (serviceId === null) {
    await deleteSetting(serviceKey(countryCode));
    return;
  }
  await upsertSetting(serviceKey(countryCode), { serviceId });
}

export async function setGpPriorityDoctorId(
  countryCode: string,
  doctorId: string | null,
): Promise<void> {
  if (doctorId === null) {
    await deleteSetting(priorityKey(countryCode));
    return;
  }
  await upsertSetting(priorityKey(countryCode), { doctorId });
}

/**
 * Read the current round-robin cursor for a (country, service, language) lane.
 * Defaults to 0 when no rotation has happened yet.
 */
export async function readRotationCursor(
  countryCode: string,
  serviceId: string,
  languageCode: string,
): Promise<number> {
  const value = await getSetting<{ index: number }>(
    cursorKey(countryCode, serviceId, languageCode),
  );
  const idx = value?.index;
  return typeof idx === "number" && Number.isFinite(idx) && idx >= 0 ? idx : 0;
}

/**
 * Advance the round-robin cursor for a lane to `nextIndex`.
 *
 * Not atomic with the read — two simultaneous assignments may land on the same
 * doctor, which only nudges fairness, never correctness (the atomic OPEN→HELD
 * slot claim in the cart still prevents any double-booking).
 */
export async function writeRotationCursor(
  countryCode: string,
  serviceId: string,
  languageCode: string,
  nextIndex: number,
): Promise<void> {
  await upsertSetting(cursorKey(countryCode, serviceId, languageCode), {
    index: nextIndex,
  });
}
