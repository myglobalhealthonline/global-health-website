import { prisma } from "../../db/prisma.js";
import { TtlCache } from "../../lib/ttl-cache.js";
import {
  invalidateAvailabilityCaches,
  registerAvailabilityCache,
} from "../doctor-availability/availability-cache-bus.js";
import { listOpenSlotsForDoctorAndService } from "../doctor-availability/doctor-availability.service.js";
import {
  deriveBookability,
  slotOverlapsPause,
  type BookabilitySummary,
  type BookingPause,
} from "./bookability-policy.js";

export type {
  BookabilityReasonCode,
  BookabilityState,
  BookabilitySummary,
  BookingPause,
} from "./bookability-policy.js";
export { deriveBookability, isPauseActiveAt, slotOverlapsPause } from "./bookability-policy.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PRIMARY_HORIZON_DAYS = 14;
const DEFAULT_LOOKAHEAD_DAYS = 90;
const CACHE_TTL_MS = 60_000;
const CONCURRENCY = 8;

const cache = new TtlCache<BookabilitySummary>(2000);
const inFlight = new Map<string, Promise<BookabilitySummary>>();
let cacheGeneration = 0;

function clearBookabilityCaches(): void {
  cacheGeneration += 1;
  cache.clear();
  inFlight.clear();
}

registerAvailabilityCache(clearBookabilityCaches);

function resolveCachedBookability(
  key: string,
  compute: () => Promise<BookabilitySummary>,
): Promise<BookabilitySummary> {
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const generation = cacheGeneration;
  const request = compute()
    .then((result) => {
      // A pause/slot/assignment write may invalidate while this read is still
      // running. Never repopulate the cache with a pre-invalidation result.
      if (generation === cacheGeneration) cache.set(key, result, CACHE_TTL_MS);
      return result;
    })
    .finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
}

export function invalidateBookabilityCache(): void {
  invalidateAvailabilityCaches();
}

export class BookingPauseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingPauseValidationError";
  }
}

export class BookingPauseTargetNotFoundError extends Error {
  constructor(entity: "Doctor" | "Service") {
    super(`${entity} not found`);
    this.name = "BookingPauseTargetNotFoundError";
  }
}

export type BookingPauseInput = {
  bookingPausedFrom: Date | null;
  bookingPausedUntil?: Date | null;
  bookingPauseReason?: string | null;
};

export function validateBookingPauseInput(input: BookingPauseInput) {
  const from = input.bookingPausedFrom;
  const until = input.bookingPausedUntil ?? null;
  if (!from) {
    return {
      bookingPausedFrom: null,
      bookingPausedUntil: null,
      bookingPauseReason: null,
    };
  }
  if (from && Number.isNaN(from.getTime())) {
    throw new BookingPauseValidationError("Pause start must be a valid UTC instant");
  }
  if (until && Number.isNaN(until.getTime())) {
    throw new BookingPauseValidationError("Pause end must be a valid UTC instant");
  }
  if (from && until && from >= until) {
    throw new BookingPauseValidationError("Pause end must be after pause start");
  }
  const reason = input.bookingPauseReason?.trim() || null;
  if (reason && reason.length > 500) {
    throw new BookingPauseValidationError("Pause reason must be 500 characters or fewer");
  }
  return {
    bookingPausedFrom: from,
    bookingPausedUntil: from ? until : null,
    bookingPauseReason: from ? reason : null,
  };
}

export async function setDoctorBookingPause(doctorId: string, input: BookingPauseInput) {
  const pause = validateBookingPauseInput(input);
  // Pause state is operational, not editorial. A Prisma model update would
  // advance Doctor.updatedAt (`@updatedAt`), which feeds the public sitemap's
  // lastmod. Update only the pause columns so SEO metadata remains invariant.
  const [updated] = await prisma.$queryRaw<Array<{
    id: string;
    bookingPausedFrom: Date | null;
    bookingPausedUntil: Date | null;
    bookingPauseReason: string | null;
  }>>`
    UPDATE "Doctor"
    SET "bookingPausedFrom" = ${pause.bookingPausedFrom},
        "bookingPausedUntil" = ${pause.bookingPausedUntil},
        "bookingPauseReason" = ${pause.bookingPauseReason}
    WHERE "id" = ${doctorId}
    RETURNING "id", "bookingPausedFrom", "bookingPausedUntil", "bookingPauseReason"
  `;
  if (!updated) throw new BookingPauseTargetNotFoundError("Doctor");
  invalidateBookabilityCache();
  return updated;
}

export async function setServiceBookingPause(serviceId: string, input: BookingPauseInput) {
  const pause = validateBookingPauseInput(input);
  // Keep Service.updatedAt reserved for content/lifecycle edits; sitemap
  // lastmod must not change merely because bookings were paused or resumed.
  const [updated] = await prisma.$queryRaw<Array<{
    id: string;
    bookingPausedFrom: Date | null;
    bookingPausedUntil: Date | null;
    bookingPauseReason: string | null;
  }>>`
    UPDATE "Service"
    SET "bookingPausedFrom" = ${pause.bookingPausedFrom},
        "bookingPausedUntil" = ${pause.bookingPausedUntil},
        "bookingPauseReason" = ${pause.bookingPauseReason}
    WHERE "id" = ${serviceId}
    RETURNING "id", "bookingPausedFrom", "bookingPausedUntil", "bookingPauseReason"
  `;
  if (!updated) throw new BookingPauseTargetNotFoundError("Service");
  invalidateBookabilityCache();
  return updated;
}

type ApprovedDoctor = {
  id: string;
  bookingPausedFrom: Date | null;
  bookingPausedUntil: Date | null;
};

type BookableService = {
  id: string;
  durationMinutes: number | null;
  bookingPausedFrom: Date | null;
  bookingPausedUntil: Date | null;
  country: {
    bookingSetting: { bookingEnabled: boolean } | null;
  };
  assignedDoctors: { doctor: ApprovedDoctor }[];
};

function horizon(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(value!)));
}

async function evaluateService(
  service: BookableService,
  now: Date,
  primaryHorizonDays: number,
  lookaheadDays: number,
): Promise<BookabilitySummary> {
  const doctors = service.assignedDoctors.map((assignment) => assignment.doctor);
  const countryBookingEnabled = service.country.bookingSetting?.bookingEnabled !== false;
  if (!countryBookingEnabled || doctors.length === 0) {
    return deriveBookability({
      now,
      countryBookingEnabled,
      approvedDoctorIds: doctors.map((doctor) => doctor.id),
      primarySlots: [],
      lookaheadSlots: [],
    });
  }
  const lookaheadEnd = new Date(now.getTime() + lookaheadDays * DAY_MS);
  const primaryEndMs = now.getTime() + primaryHorizonDays * DAY_MS;
  const servicePause: BookingPause = {
    bookingPausedFrom: service.bookingPausedFrom,
    bookingPausedUntil: service.bookingPausedUntil,
  };

  const slots: { doctorId: string; startAt: string }[] = [];
  for (let i = 0; i < doctors.length; i += CONCURRENCY) {
    const batch = doctors.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((doctor) =>
        listOpenSlotsForDoctorAndService(
          doctor.id,
          service.durationMinutes,
          now,
          lookaheadEnd,
        ),
      ),
    );
    results.forEach((doctorSlots, index) => {
      for (const slot of doctorSlots) {
        if (
          slotOverlapsPause(
            { startAt: new Date(slot.startAt), endAt: new Date(slot.endAt) },
            servicePause,
          )
        ) {
          continue;
        }
        slots.push({ doctorId: batch[index].id, startAt: slot.startAt });
      }
    });
  }

  const doctorPauses = Object.fromEntries(
    doctors.map((doctor) => [
      doctor.id,
      {
        bookingPausedFrom: doctor.bookingPausedFrom,
        bookingPausedUntil: doctor.bookingPausedUntil,
      },
    ]),
  );
  return deriveBookability({
    now,
    countryBookingEnabled,
    approvedDoctorIds: doctors.map((doctor) => doctor.id),
    servicePause,
    doctorPauses,
    primarySlots: slots.filter((slot) => Date.parse(slot.startAt) < primaryEndMs),
    lookaheadSlots: slots.filter((slot) => Date.parse(slot.startAt) >= primaryEndMs),
  });
}

type SummaryOptions = {
  countryCode: string;
  now?: Date;
  primaryHorizonDays?: number;
  lookaheadDays?: number;
};

export async function getServiceBookability(
  args: SummaryOptions & { serviceId?: string; serviceSlug?: string },
): Promise<BookabilitySummary> {
  if (!args.serviceId && !args.serviceSlug) {
    throw new Error("A service id or slug is required");
  }
  const now = args.now ?? new Date();
  const primaryDays = horizon(args.primaryHorizonDays, DEFAULT_PRIMARY_HORIZON_DAYS, 30);
  const lookaheadDays = horizon(args.lookaheadDays, DEFAULT_LOOKAHEAD_DAYS, 90);
  const code = args.countryCode.trim().toLowerCase();
  const key = `service:${code}:${args.serviceId ?? args.serviceSlug}:${primaryDays}:${lookaheadDays}:${Math.floor(now.getTime() / CACHE_TTL_MS)}`;
  return resolveCachedBookability(key, async () => {
    const service = await prisma.service.findFirst({
      where: {
        ...(args.serviceId ? { id: args.serviceId } : { slug: args.serviceSlug }),
        isActive: true,
        visibility: "PUBLIC",
        country: { code, isActive: true },
      },
      select: {
        id: true,
        durationMinutes: true,
        bookingPausedFrom: true,
        bookingPausedUntil: true,
        country: { select: { bookingSetting: { select: { bookingEnabled: true } } } },
        assignedDoctors: {
          where: {
            isActive: true,
            status: "active",
            doctor: {
              active: true,
              OR: [
                { country: { code, isActive: true } },
                {
                  additionalCountries: {
                    some: { active: true, country: { code, isActive: true } },
                  },
                },
              ],
            },
          },
          select: {
            doctor: {
              select: {
                id: true,
                bookingPausedFrom: true,
                bookingPausedUntil: true,
              },
            },
          },
        },
      },
    });
    return service
      ? evaluateService(service, now, primaryDays, Math.max(primaryDays, lookaheadDays))
      : { state: "UNAVAILABLE", reasonCode: "NO_APPROVED_DOCTOR", nextAvailableAt: null };
  });
}

export async function getDoctorBookability(
  args: SummaryOptions & { doctorId: string; serviceId?: string },
): Promise<BookabilitySummary> {
  const now = args.now ?? new Date();
  const primaryDays = horizon(args.primaryHorizonDays, DEFAULT_PRIMARY_HORIZON_DAYS, 30);
  const lookaheadDays = horizon(args.lookaheadDays, DEFAULT_LOOKAHEAD_DAYS, 90);
  const code = args.countryCode.trim().toLowerCase();
  const key = `doctor:${code}:${args.doctorId}:${args.serviceId ?? "any"}:${primaryDays}:${lookaheadDays}:${Math.floor(now.getTime() / CACHE_TTL_MS)}`;
  return resolveCachedBookability(key, async () => {
    const services = await prisma.service.findMany({
      where: {
        ...(args.serviceId ? { id: args.serviceId } : {}),
        isActive: true,
        visibility: "PUBLIC",
        country: { code, isActive: true },
        assignedDoctors: {
          some: {
            doctorId: args.doctorId,
            isActive: true,
            status: "active",
            doctor: {
              active: true,
              OR: [
                { country: { code, isActive: true } },
                {
                  additionalCountries: {
                    some: { active: true, country: { code, isActive: true } },
                  },
                },
              ],
            },
          },
        },
      },
      select: {
        id: true,
        durationMinutes: true,
        bookingPausedFrom: true,
        bookingPausedUntil: true,
        country: { select: { bookingSetting: { select: { bookingEnabled: true } } } },
        assignedDoctors: {
          where: { doctorId: args.doctorId, isActive: true, status: "active" },
          select: {
            doctor: {
              select: {
                id: true,
                bookingPausedFrom: true,
                bookingPausedUntil: true,
              },
            },
          },
        },
      },
    });
    if (services.length === 0) {
      return {
        state: "UNAVAILABLE",
        reasonCode: "NO_APPROVED_DOCTOR",
        nextAvailableAt: null,
      };
    }

    const summaries = await Promise.all(
      services.map((service) =>
        evaluateService(service, now, primaryDays, Math.max(primaryDays, lookaheadDays)),
      ),
    );
    const byEarliest = (a: BookabilitySummary, b: BookabilitySummary) =>
      (a.nextAvailableAt ?? "9999").localeCompare(b.nextAvailableAt ?? "9999");
    return (
      summaries.filter((summary) => summary.state === "BOOKABLE").sort(byEarliest)[0]
      ?? summaries.filter((summary) => summary.state === "RETURNING").sort(byEarliest)[0]
      ?? summaries[0]
    );
  });
}
