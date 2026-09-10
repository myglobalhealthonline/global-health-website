import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { AvailabilityDependencyCache, type UpdateAvailabilityDependencies } from "../../lib/availability-dependency-cache.js";
import { registerAvailabilityCache } from "../doctor-availability/availability-cache-bus.js";
import {
  listOpenSlotsForDoctorAndService,
  releaseExpiredHeldSlotsForDoctors,
} from "../doctor-availability/doctor-availability.service.js";
import { computeSlotPrice, getServicePeakConfig } from "../pricing/peak-pricing.service.js";
import { slotOverlapsPause } from "../bookability/bookability-policy.js";

/**
 * Aggregated availability for a single service across every doctor assigned to
 * it. Backs the service-first booking flow's TIME step (service → time →
 * doctor): the patient picks a time before a clinician, so we surface the union
 * of all assigned doctors' open slots, de-duplicated by start time, plus which
 * doctors can take each time so the next step can offer the choice.
 *
 * Short in-memory TTL cache (same rationale as the GP quick-book): each call
 * materialises N days of slots per doctor, so repeat reads while the patient
 * navigates the flow are served from memory.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const CONCURRENCY = 8;
const CACHE_TTL_MS = 45_000;
/** Matches the per-doctor/per-service availability routes' declared max
 *  (serviceAvailabilityQuerySchema) and the /book wizard's month picker span —
 *  a patient browsing 3-4 months out needs the fetch to actually reach that
 *  far, not just the near-term window this cap used to silently truncate to. */
const MAX_DAYS = 120;

export type ServiceAggSlot = {
  startAt: string;
  endAt: string;
  priceCents: number;
  pricingType: "STANDARD" | "PEAK" | "OFF_PEAK";
  currencyCode: string;
};

/** Which doctor (+ that doctor's concrete slot) can take a given start time. */
export type ServiceAggDoctorRef = {
  doctorId: string;
  doctorSlug: string;
  slotId: string;
};

export type ServiceAggregatedAvailability = {
  found: boolean;
  clinicTimezone: string;
  slots: ServiceAggSlot[];
  /** startAt ISO → eligible doctors for that exact time. */
  doctorsByStart: Record<string, ServiceAggDoctorRef[]>;
};

// ponytail: keyed by country:service:days — bounded by real catalog size,
// cap just guards against unbounded growth in a long-lived process.
const CACHE_MAX_ENTRIES = 2000;
const cache = new AvailabilityDependencyCache<ServiceAggregatedAvailability>(CACHE_MAX_ENTRIES, CACHE_TTL_MS);
registerAvailabilityCache((scope) => cache.invalidate(scope));

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

export async function getServiceAggregatedAvailability(
  countryCode: string,
  serviceSlug: string,
  days: number,
  /** When booking under an insurer, only doctors in that insurer's network for
   *  this service are offered (they must have a payout set for it). */
  insuranceCompanyId?: string | null,
): Promise<ServiceAggregatedAvailability> {
  const code = countryCode.trim().toLowerCase();
  const clampedDays = Math.min(MAX_DAYS, Math.max(1, days));
  // Insurer is part of the key — the eligible doctor pool differs per network,
  // so a shared key would serve one insurer's slots to another.
  const cacheKey = `${code}:${serviceSlug}:${clampedDays}:${insuranceCompanyId ?? "none"}`;
  return cache.resolve(cacheKey, {
    countryCode: code, requestServiceId: serviceSlug, pendingDoctors: true, pendingServices: true,
  }, (update) => loadServiceAggregatedAvailability(code, serviceSlug, clampedDays, insuranceCompanyId, update));
}

async function loadServiceAggregatedAvailability(
  code: string,
  serviceSlug: string,
  clampedDays: number,
  insuranceCompanyId: string | null | undefined,
  update: UpdateAvailabilityDependencies,
): Promise<ServiceAggregatedAvailability> {
  try {
    const clinicTimezone = await resolveCountryTimeZone(code);
    const empty: ServiceAggregatedAvailability = {
      found: false,
      clinicTimezone,
      slots: [],
      doctorsByStart: {},
    };

    const service = await prisma.service.findFirst({
      where: {
        slug: serviceSlug,
        isActive: true,
        visibility: "PUBLIC",
        country: { code, isActive: true },
      },
      select: {
        id: true,
        durationMinutes: true,
        basePriceCents: true,
        currencyCode: true,
        bookingPausedFrom: true,
        bookingPausedUntil: true,
        country: {
          select: {
            currency: { select: { code: true } },
            bookingSetting: { select: { bookingEnabled: true } },
          },
        },
      },
    });
    update({ serviceIds: service ? [service.id] : [], pendingServices: false });
    if (!service) {
      update({ doctorIds: [], pendingDoctors: false });
      return empty;
    }

    // Active doctors assigned to the service + reachable from this country.
    // Matches the per-doctor availability route's gate (ServiceDoctor.isActive).
    // Under an insurer, narrow to that insurer's network: a doctor is in-network
    // for a service only when the admin set them a payout for it. No in-network
    // doctor ⇒ zero slots ("no doctors available for this insurer").
    const doctors = await prisma.doctor.findMany({
      where: {
        active: true,
        OR: [
          { country: { code, isActive: true } },
          { additionalCountries: { some: { active: true, country: { code, isActive: true } } } },
        ],
        assignedServices: {
          some: { serviceId: service.id, isActive: true, status: "active" },
        },
        ...(insuranceCompanyId
          ? {
              insuranceDoctorPayouts: {
                some: {
                  serviceId: service.id,
                  insuranceCompanyId,
                  doctorAmountCents: { not: null },
                },
              },
            }
          : {}),
      },
      select: { id: true, slug: true },
    });
    update({ doctorIds: doctors.map((doctor) => doctor.id), pendingDoctors: false });

    const found: ServiceAggregatedAvailability = {
      found: true,
      clinicTimezone,
      slots: [],
      doctorsByStart: {},
    };
    if (service.country.bookingSetting?.bookingEnabled === false) {
      return found;
    }
    if (doctors.length === 0) {
      return found;
    }

    const now = new Date();
    const toUtc = new Date(now.getTime() + clampedDays * DAY_MS);
    const peakConfig = await getServicePeakConfig(service.id);
    const basePriceCents = service.basePriceCents ?? 0;
    const fallbackCurrency = service.currencyCode ?? service.country.currency.code;

    // Release every eligible doctor's expired holds in ONE query up front so
    // the per-doctor loop below doesn't fan out into an O(doctors) release
    // sweep (P-005). Each slot read then skips its own release.
    await releaseExpiredHeldSlotsForDoctors(doctors.map((d) => d.id));

    // Fetch every assigned doctor's slots in bounded-parallel batches.
    const perDoctor: { doctor: { id: string; slug: string }; slots: { id: string; startAt: string; endAt: string }[] }[] =
      [];
    for (let i = 0; i < doctors.length; i += CONCURRENCY) {
      const batch = doctors.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (doctor) => ({
          doctor,
          slots: await listOpenSlotsForDoctorAndService(
            doctor.id,
            service.durationMinutes,
            now,
            toUtc,
            { skipExpiredRelease: true },
          ),
        })),
      );
      perDoctor.push(...results);
    }

    const byStart = new Map<string, ServiceAggSlot>();
    const doctorsByStart: Record<string, ServiceAggDoctorRef[]> = {};
    for (const { doctor, slots } of perDoctor) {
      for (const slot of slots) {
        if (
          slotOverlapsPause(
            { startAt: new Date(slot.startAt), endAt: new Date(slot.endAt) },
            {
              bookingPausedFrom: service.bookingPausedFrom,
              bookingPausedUntil: service.bookingPausedUntil,
            },
          )
        ) {
          continue;
        }
        (doctorsByStart[slot.startAt] ??= []).push({
          doctorId: doctor.id,
          doctorSlug: doctor.slug,
          slotId: slot.id,
        });
        if (!byStart.has(slot.startAt)) {
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
    }

    found.slots = Array.from(byStart.values()).sort((a, b) =>
      a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0,
    );
    found.doctorsByStart = doctorsByStart;
    return found;
  } catch (error) {
    throw normalizeDbError(error, "Service availability is unavailable");
  }
}
