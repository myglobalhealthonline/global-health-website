import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { TtlCache } from "../../lib/ttl-cache.js";
import { listOpenSlotsForDoctorAndService } from "../doctor-availability/doctor-availability.service.js";
import { computeSlotPrice, getServicePeakConfig } from "../pricing/peak-pricing.service.js";
import {
  resolveGpSameDayService,
  getGpPriorityDoctorId,
  claimNextRotationCursor,
  type GpSameDayService,
} from "./gp-config.service.js";

/**
 * Same-day GP auto-assignment engine.
 *
 * Two entry points back the homepage timeslot-first flow:
 *   - `getGpAvailability`  — aggregated DISTINCT open times across every GP
 *     doctor who speaks the chosen language. The patient never sees doctors,
 *     only times that ≥1 eligible clinician can take.
 *   - `resolveGpAssignment` — given a chosen time, pick ONE doctor (priority
 *     doctor inside 24h, else fair round-robin) and return that doctor's
 *     concrete slot id for the cart to claim. Records a GpAssignmentLog row.
 *
 * "GP doctor" = active, listed in the country, and assigned (ServiceDoctor,
 * status active) to the resolved same-day GENERAL service. Language match is
 * done case-insensitively against the free-text `Doctor.languages[]`.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const PRIORITY_WINDOW_MS = 24 * HOUR_MS;
/** 1h buffer so we never surface a slot that is about to start. */
const START_BUFFER_MS = HOUR_MS;

/**
 * Short-lived in-memory cache. The homepage panel auto-loads availability on
 * every visit, and each call materialises 14 days of slots per eligible doctor
 * (the expensive part). A few-second TTL collapses the repeat reads to ~free
 * without risking stale bookings — the cart-add still atomically re-claims the
 * slot, so a slot booked within the TTL just 409s and the patient retries.
 */
const AVAILABILITY_TTL_MS = 45_000;
const LANGUAGES_TTL_MS = 5 * 60_000;
// ponytail: keyed by country[:language], so real growth is tiny — the cap
// just guards against unbounded growth in a long-lived process.
const CACHE_MAX_ENTRIES = 1000;
const availabilityCache = new TtlCache<GpAvailabilityResult>(CACHE_MAX_ENTRIES);
const languagesCache = new TtlCache<{ configured: boolean; languages: string[] }>(CACHE_MAX_ENTRIES);

export type GpAvailabilitySlot = {
  /** ISO start (UTC). Distinct across the eligible doctor pool. */
  startAt: string;
  endAt: string;
  priceCents: number;
  pricingType: "STANDARD" | "PEAK" | "OFF_PEAK";
  currencyCode: string;
};

export type GpAvailabilityResult = {
  service: GpSameDayService | null;
  clinicTimezone: string;
  slots: GpAvailabilitySlot[];
};

export type GpAssignmentReason = "PRIORITY_24H" | "ROTATION" | "ONLY_AVAILABLE";

export class GpServiceUnavailableError extends Error {
  constructor() {
    super("No same-day GP service is configured for this country.");
    this.name = "GpServiceUnavailableError";
  }
}
export class GpNoDoctorError extends Error {
  constructor() {
    super("No GP doctor is available for that language and time.");
    this.name = "GpNoDoctorError";
  }
}

type EligibleDoctor = { id: string };

/** Active, in-country, GP-service-assigned doctors who speak `languageCode`. */
async function listEligibleGpDoctors(
  countryCode: string,
  serviceId: string,
  languageCode: string,
): Promise<EligibleDoctor[]> {
  const code = countryCode.trim().toLowerCase();
  const rows = await prisma.doctor.findMany({
    where: {
      active: true,
      OR: [
        { country: { code, isActive: true } },
        {
          additionalCountries: {
            some: { active: true, country: { code, isActive: true } },
          },
        },
      ],
      assignedServices: {
        some: { serviceId, isActive: true, status: "active" },
      },
    },
    select: { id: true, languages: true },
  });
  const lang = languageCode.trim().toLowerCase();
  return rows
    .filter((d) => d.languages.some((l) => l.trim().toLowerCase() === lang))
    .map((d) => ({ id: d.id }));
}

/** Clinic timezone for a country (all its doctors share it). Falls back to UTC. */
async function resolveCountryTimeZone(countryCode: string): Promise<string> {
  try {
    const country = await prisma.country.findFirst({
      where: { code: countryCode.trim().toLowerCase() },
      include: { bookingSetting: { select: { timezone: true } } },
    });
    return country?.bookingSetting?.timezone ?? "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Aggregated open times across all eligible GP doctors for a language.
 * De-duplicated by start time — one time appears once even when several
 * doctors are free then. Prices are resolved per slot from the service's
 * peak-pricing config exactly as the cart will charge.
 */
function cacheAvailability(key: string, value: GpAvailabilityResult): GpAvailabilityResult {
  availabilityCache.set(key, value, AVAILABILITY_TTL_MS);
  return value;
}

export async function getGpAvailability(args: {
  countryCode: string;
  languageCode: string;
  days: number;
}): Promise<GpAvailabilityResult> {
  const { countryCode, languageCode } = args;
  const days = Math.min(30, Math.max(1, args.days));
  const cacheKey = `${countryCode.toLowerCase()}:${languageCode.toLowerCase()}:${days}`;
  const cached = availabilityCache.get(cacheKey);
  if (cached) return cached;
  try {
    const clinicTimezone = await resolveCountryTimeZone(countryCode);
    const service = await resolveGpSameDayService(countryCode);
    if (!service) return cacheAvailability(cacheKey, { service: null, clinicTimezone, slots: [] });

    const eligible = await listEligibleGpDoctors(countryCode, service.id, languageCode);
    if (eligible.length === 0) return cacheAvailability(cacheKey, { service, clinicTimezone, slots: [] });

    const now = Date.now();
    const fromUtc = new Date(now + START_BUFFER_MS);
    const toUtc = new Date(now + days * DAY_MS);

    const peakConfig = await getServicePeakConfig(service.id);
    const fallbackCurrency = service.currencyCode;
    const basePriceCents = service.basePriceCents ?? 0;

    // Fetch each eligible doctor's open slots in parallel (each call also
    // materialises that doctor's slots for the range, the expensive part).
    // Chunked so we never open more than CONCURRENCY DB connections at once.
    const CONCURRENCY = 8;
    const perDoctorSlots: { startAt: string; endAt: string }[][] = [];
    for (let i = 0; i < eligible.length; i += CONCURRENCY) {
      const batch = eligible.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map((doc) =>
          listOpenSlotsForDoctorAndService(
            doc.id,
            service.durationMinutes,
            fromUtc,
            toUtc,
          ),
        ),
      );
      perDoctorSlots.push(...results);
    }

    // Merge, keyed by start time so a time several doctors offer shows once.
    const byStart = new Map<string, GpAvailabilitySlot>();
    for (const slots of perDoctorSlots) {
      for (const slot of slots) {
        if (byStart.has(slot.startAt)) continue;
        const priced = computeSlotPrice({
          config: peakConfig,
          basePriceCents,
          fallbackCurrency,
          slotStartUtc: new Date(slot.startAt),
          clinicTimezone,
        });
        byStart.set(slot.startAt, {
          startAt: slot.startAt,
          endAt: slot.endAt,
          priceCents: priced.unitPriceCents,
          pricingType: priced.pricingType,
          currencyCode: priced.currencyCode,
        });
      }
    }

    const slots = Array.from(byStart.values()).sort((a, b) =>
      a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0,
    );
    return cacheAvailability(cacheKey, { service, clinicTimezone, slots });
  } catch (error) {
    throw normalizeDbError(error, "Same-day availability is unavailable");
  }
}

/**
 * Distinct consultation languages offered by the GP doctor pool for a country.
 * Powers the homepage language dropdown. Returns `configured: false` when the
 * country has no same-day GP service set up at all.
 */
export async function getGpLanguages(countryCode: string): Promise<{
  configured: boolean;
  languages: string[];
}> {
  const cacheKey = countryCode.toLowerCase();
  const cached = languagesCache.get(cacheKey);
  if (cached) return cached;
  const store = (value: { configured: boolean; languages: string[] }) => {
    languagesCache.set(cacheKey, value, LANGUAGES_TTL_MS);
    return value;
  };
  try {
    const service = await resolveGpSameDayService(countryCode);
    if (!service) return store({ configured: false, languages: [] });

    const code = countryCode.trim().toLowerCase();
    const rows = await prisma.doctor.findMany({
      where: {
        active: true,
        OR: [
          { country: { code, isActive: true } },
          {
            additionalCountries: {
              some: { active: true, country: { code, isActive: true } },
            },
          },
        ],
        assignedServices: {
          some: { serviceId: service.id, isActive: true, status: "active" },
        },
      },
      select: { languages: true },
    });

    const set = new Set<string>();
    for (const row of rows) {
      for (const lang of row.languages) {
        const norm = lang.trim().toLowerCase();
        if (norm) set.add(norm);
      }
    }
    return store({ configured: true, languages: Array.from(set).sort() });
  } catch (error) {
    throw normalizeDbError(error, "Could not load consultation languages");
  }
}

export type GpAssignment = {
  doctorId: string;
  timeSlotId: string;
  serviceId: string;
  serviceSlug: string;
  reason: GpAssignmentReason;
  startAt: string;
  endAt: string;
};

/**
 * Resolve which GP doctor takes a chosen same-day slot.
 *
 * Rules (in order):
 *   1. Priority doctor (Dr. Tiago) — assigned first when the slot starts within
 *      the next 24h AND he is among the eligible candidates for that time.
 *   2. Fair round-robin — a per-(country, service, language) cursor cycles
 *      through the remaining eligible candidates so bookings spread evenly.
 *   3. Single candidate — flagged ONLY_AVAILABLE.
 *
 * Correctness (no double-booking) is guaranteed downstream by the atomic
 * OPEN→HELD claim in the cart; this only decides *which* doctor to offer.
 */
export async function resolveGpAssignment(args: {
  countryCode: string;
  languageCode: string;
  startAtISO: string;
}): Promise<GpAssignment> {
  const { countryCode, languageCode, startAtISO } = args;
  const startAt = new Date(startAtISO);
  if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
    throw new GpNoDoctorError();
  }

  try {
    const service = await resolveGpSameDayService(countryCode);
    if (!service) throw new GpServiceUnavailableError();

    const eligible = await listEligibleGpDoctors(countryCode, service.id, languageCode);
    if (eligible.length === 0) throw new GpNoDoctorError();
    const eligibleIds = eligible.map((d) => d.id);

    // Candidates = eligible doctors with a run of consecutive OPEN base slots
    // STARTING exactly at this time and covering the service duration (base
    // grid + consume — a 30-min GP consult needs two 15-min base slots).
    // Deterministic order (doctorId) so the rotation cursor is stable.
    const durMs = (service.durationMinutes ?? 0) * 60_000;
    const spanEnd = new Date(startAt.getTime() + Math.max(durMs, 1));
    const slotRows = await prisma.doctorTimeSlot.findMany({
      where: {
        doctorId: { in: eligibleIds },
        startAt: { gte: startAt, lt: spanEnd },
      },
      select: { id: true, doctorId: true, startAt: true, endAt: true, status: true },
      orderBy: [{ doctorId: "asc" }, { startAt: "asc" }],
    });
    const byDoctor = new Map<string, typeof slotRows>();
    for (const r of slotRows) {
      const list = byDoctor.get(r.doctorId) ?? [];
      list.push(r);
      byDoctor.set(r.doctorId, list);
    }
    const candidates: {
      id: string;
      doctorId: string;
      startAt: Date;
      endAt: Date;
    }[] = [];
    for (const doctorId of [...eligibleIds].sort()) {
      const rows = byDoctor.get(doctorId) ?? [];
      // Must have an OPEN base slot starting exactly at `startAt`.
      if (
        rows.length === 0 ||
        rows[0].startAt.getTime() !== startAt.getTime() ||
        rows[0].status !== "OPEN"
      ) {
        continue;
      }
      if (durMs <= 0) {
        candidates.push({
          id: rows[0].id,
          doctorId,
          startAt: rows[0].startAt,
          endAt: rows[0].endAt,
        });
        continue;
      }
      // Greedily extend across contiguous OPEN base slots to cover the duration.
      let coverEnd = rows[0].endAt.getTime();
      let k = 0;
      while (coverEnd - startAt.getTime() < durMs) {
        const next = rows[k + 1];
        if (
          !next ||
          next.status !== "OPEN" ||
          next.startAt.getTime() !== rows[k].endAt.getTime()
        ) {
          break;
        }
        k += 1;
        coverEnd = rows[k].endAt.getTime();
      }
      if (coverEnd - startAt.getTime() >= durMs) {
        candidates.push({
          id: rows[0].id,
          doctorId,
          startAt: rows[0].startAt,
          endAt: new Date(startAt.getTime() + durMs),
        });
      }
    }
    if (candidates.length === 0) throw new GpNoDoctorError();

    let chosen = candidates[0];
    let reason: GpAssignmentReason;

    const priorityDoctorId = await getGpPriorityDoctorId(countryCode);
    const withinWindow = startAt.getTime() <= Date.now() + PRIORITY_WINDOW_MS;
    const priorityCandidate =
      priorityDoctorId && withinWindow
        ? candidates.find((c) => c.doctorId === priorityDoctorId)
        : undefined;

    if (priorityCandidate) {
      chosen = priorityCandidate;
      reason = "PRIORITY_24H";
    } else if (candidates.length === 1) {
      chosen = candidates[0];
      reason = "ONLY_AVAILABLE";
    } else {
      // Fair round-robin across the candidate pool for this lane. Atomic
      // claim-and-advance so two concurrent assignments never read the same
      // cursor value (see gp-config.service.ts:claimNextRotationCursor).
      const cursor = await claimNextRotationCursor(countryCode, service.id, languageCode);
      chosen = candidates[cursor % candidates.length];
      reason = "ROTATION";
    }

    // Audit row — keyed by slot id so the post-payment Appointment can
    // back-fill language + reason, and admins can review the decision.
    await prisma.gpAssignmentLog.upsert({
      where: { timeSlotId: chosen.id },
      create: {
        timeSlotId: chosen.id,
        doctorId: chosen.doctorId,
        countryCode: countryCode.trim().toLowerCase(),
        serviceId: service.id,
        languageCode: languageCode.trim().toLowerCase(),
        reason,
      },
      update: {
        doctorId: chosen.doctorId,
        languageCode: languageCode.trim().toLowerCase(),
        reason,
      },
    });

    return {
      doctorId: chosen.doctorId,
      timeSlotId: chosen.id,
      serviceId: service.id,
      serviceSlug: service.slug,
      reason,
      startAt: chosen.startAt.toISOString(),
      endAt: chosen.endAt.toISOString(),
    };
  } catch (error) {
    if (
      error instanceof GpNoDoctorError ||
      error instanceof GpServiceUnavailableError
    ) {
      throw error;
    }
    throw normalizeDbError(error, "Could not assign a GP doctor");
  }
}
