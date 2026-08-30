import { prisma } from "../../db/prisma.js";
import { TtlCache } from "../../lib/ttl-cache.js";
import {
  invalidateAvailabilityCaches,
  registerAvailabilityCache,
} from "../doctor-availability/availability-cache-bus.js";
import {
  listOpenSlotsForDoctorAndService,
  releaseExpiredHeldSlotsForDoctors,
} from "../doctor-availability/doctor-availability.service.js";
import {
  deriveBookability,
  resolveBookabilityFailClosed,
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

/** How a service evaluation reads a doctor's open slots. Injectable so a
 *  batch can memoize the fan-out per (doctor, duration) instead of repeating
 *  the same read once per doctor/service pair. */
type SlotLoader = (
  doctorId: string,
  serviceDurationMinutes: number | null,
  fromUtc: Date,
  toUtc: Date,
) => Promise<Array<{ startAt: string; endAt: string }>>;

const defaultSlotLoader: SlotLoader = (doctorId, duration, fromUtc, toUtc) =>
  listOpenSlotsForDoctorAndService(doctorId, duration, fromUtc, toUtc, {
    skipExpiredRelease: true,
  });

type EvaluateOptions = {
  /** The caller already swept expired holds for every doctor in the batch. */
  skipExpiredRelease?: boolean;
  loadSlots?: SlotLoader;
};

async function evaluateService(
  service: BookableService,
  now: Date,
  primaryHorizonDays: number,
  lookaheadDays: number,
  options: EvaluateOptions = {},
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

  // Expired cart holds are doctor-scoped, not service-scoped. Sweep the
  // complete doctor set once before the slot fan-out instead of issuing one
  // release query per doctor (and repeating it for every summary).
  if (!options.skipExpiredRelease) {
    await releaseExpiredHeldSlotsForDoctors(doctors.map((doctor) => doctor.id));
  }

  const loadSlots = options.loadSlots ?? defaultSlotLoader;
  const slots: { doctorId: string; startAt: string }[] = [];
  for (let i = 0; i < doctors.length; i += CONCURRENCY) {
    const batch = doctors.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((doctor) =>
        loadSlots(doctor.id, service.durationMinutes, now, lookaheadEnd),
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

/* ------------------------------------------------------------------ *
 * Country-level batch (perf plan docs/plans/new.md 7.4)
 * ------------------------------------------------------------------ */

export type CountryBookabilityBatch = {
  /** serviceId -> aggregate summary across every approved doctor. */
  services: Map<string, BookabilitySummary>;
  /** doctorId -> aggregate summary across every service the doctor takes. */
  doctors: Map<string, BookabilitySummary>;
  /** doctorId -> serviceId -> summary for that exact pair. */
  doctorServices: Map<string, Map<string, BookabilitySummary>>;
};

/** Same shape the per-item readers use, so a doctor with no approved service
 *  reads identically whichever path produced it. */
const NO_APPROVED_DOCTOR: BookabilitySummary = {
  state: "UNAVAILABLE",
  reasonCode: "NO_APPROVED_DOCTOR",
  nextAvailableAt: null,
};

/** getDoctorBookability's aggregate rule, extracted verbatim: earliest
 *  BOOKABLE, else earliest RETURNING, else the first summary. */
function pickDoctorSummary(summaries: readonly BookabilitySummary[]): BookabilitySummary {
  const byEarliest = (a: BookabilitySummary, b: BookabilitySummary) =>
    (a.nextAvailableAt ?? "9999").localeCompare(b.nextAvailableAt ?? "9999");
  return (
    summaries.filter((summary) => summary.state === "BOOKABLE").sort(byEarliest)[0]
    ?? summaries.filter((summary) => summary.state === "RETURNING").sort(byEarliest)[0]
    ?? summaries[0]
    ?? { ...NO_APPROVED_DOCTOR }
  );
}

/**
 * NOT WIRED INTO THE CARD PROJECTIONS. It only WRITES the per-item cache and
 * never reads it, and has no single-flight, so every call recomputed a whole
 * market from scratch (~4.2 s on production IE vs <30 ms for the cached
 * per-item readers). Kept because it is the base for the real fix: make it
 * cache-aware/single-flighted, or compute only the requested pairs. Re-measure
 * with `Server-Timing: bookability;dur=` before wiring it back — the
 * query-count test does not catch this.
 *
 * Resolve every public bookability summary a country's card collections need
 * in one pass: one service+roster metadata query instead of one per summary,
 * one expired-hold sweep instead of one per service, and one slot read per
 * (doctor, service duration) instead of one per doctor/service pair.
 *
 * It changes HOW the inputs are loaded, never what they mean: the same
 * `evaluateService` and `deriveBookability` decide every result, from a single
 * frozen `now`, with the same horizons, pause overlap, approved-doctor
 * filtering and aggregate priority as the per-item readers. Results are
 * written into the per-item cache under the exact same keys, so a later
 * `getServiceBookability` / `getDoctorBookability` for the same input hits the
 * cache rather than recomputing a possibly-different answer.
 */
export async function getCountryBookabilityBatch(
  args: SummaryOptions,
): Promise<CountryBookabilityBatch> {
  const now = args.now ?? new Date();
  const primaryDays = horizon(args.primaryHorizonDays, DEFAULT_PRIMARY_HORIZON_DAYS, 30);
  const lookaheadDays = horizon(args.lookaheadDays, DEFAULT_LOOKAHEAD_DAYS, 90);
  const effectiveLookahead = Math.max(primaryDays, lookaheadDays);
  const code = args.countryCode.trim().toLowerCase();
  const bucket = Math.floor(now.getTime() / CACHE_TTL_MS);
  const generation = cacheGeneration;

  const services = await prisma.service.findMany({
    where: {
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
            select: { id: true, bookingPausedFrom: true, bookingPausedUntil: true },
          },
        },
      },
    },
  });

  // One sweep for the whole batch. Expired holds are doctor-scoped, so
  // repeating it per service would issue the same write N times.
  const doctorIds = [
    ...new Set(services.flatMap((s) => s.assignedDoctors.map((a) => a.doctor.id))),
  ];
  await releaseExpiredHeldSlotsForDoctors(doctorIds);

  // Memoized per (doctor, duration): the same read otherwise repeats once per
  // pair. Safe because the batch shares one frozen `now` and one horizon.
  const slotReads = new Map<string, Promise<Array<{ startAt: string; endAt: string }>>>();
  const loadSlots: SlotLoader = (doctorId, duration, fromUtc, toUtc) => {
    const key = `${doctorId}|${duration ?? "null"}`;
    let pending = slotReads.get(key);
    if (!pending) {
      pending = listOpenSlotsForDoctorAndService(doctorId, duration, fromUtc, toUtc, {
        skipExpiredRelease: true,
      });
      slotReads.set(key, pending);
    }
    return pending;
  };
  const evaluate = (service: BookableService) =>
    resolveBookabilityFailClosed(() =>
      evaluateService(service, now, primaryDays, effectiveLookahead, {
        skipExpiredRelease: true,
        loadSlots,
      }),
    );

  const cacheSet = (key: string, summary: BookabilitySummary) => {
    if (generation === cacheGeneration) cache.set(key, summary, CACHE_TTL_MS);
  };
  const horizonKey = `${primaryDays}:${lookaheadDays}:${bucket}`;

  const serviceSummaries = new Map<string, BookabilitySummary>();
  const doctorServices = new Map<string, Map<string, BookabilitySummary>>();

  for (const service of services) {
    const aggregate = await evaluate(service);
    serviceSummaries.set(service.id, aggregate);
    cacheSet(`service:${code}:${service.id}:${horizonKey}`, aggregate);

    for (const assignment of service.assignedDoctors) {
      const pair = await evaluate({ ...service, assignedDoctors: [assignment] });
      const doctorId = assignment.doctor.id;
      let byService = doctorServices.get(doctorId);
      if (!byService) {
        byService = new Map<string, BookabilitySummary>();
        doctorServices.set(doctorId, byService);
      }
      byService.set(service.id, pair);
      cacheSet(`doctor:${code}:${doctorId}:${service.id}:${horizonKey}`, pair);
    }
  }

  const doctorSummaries = new Map<string, BookabilitySummary>();
  for (const [doctorId, byService] of doctorServices) {
    const aggregate = pickDoctorSummary([...byService.values()]);
    doctorSummaries.set(doctorId, aggregate);
    cacheSet(`doctor:${code}:${doctorId}:any:${horizonKey}`, aggregate);
  }

  return { services: serviceSummaries, doctors: doctorSummaries, doctorServices };
}

/** A doctor with no approved service, or a service the doctor does not take,
 *  reads UNAVAILABLE/NO_APPROVED_DOCTOR — the same answer the per-item reader
 *  gives for an empty service set. */
export function readBatchDoctorBookability(
  batch: CountryBookabilityBatch,
  doctorId: string,
  serviceIds: readonly string[],
): { bookability: BookabilitySummary; bookabilityByServiceId: Record<string, BookabilitySummary> } {
  const byService = batch.doctorServices.get(doctorId);
  const bookabilityByServiceId: Record<string, BookabilitySummary> = {};
  for (const serviceId of new Set(serviceIds)) {
    bookabilityByServiceId[serviceId] = byService?.get(serviceId) ?? { ...NO_APPROVED_DOCTOR };
  }
  return {
    bookability: batch.doctors.get(doctorId) ?? { ...NO_APPROVED_DOCTOR },
    bookabilityByServiceId,
  };
}

export function readBatchServiceBookability(
  batch: CountryBookabilityBatch,
  serviceId: string,
): BookabilitySummary {
  return batch.services.get(serviceId) ?? { ...NO_APPROVED_DOCTOR };
}
