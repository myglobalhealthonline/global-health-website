import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { TtlCache } from "../../lib/ttl-cache.js";
import { listOpenSlotsForDoctorAndService } from "../doctor-availability/doctor-availability.service.js";
import { computeSlotPrice, getServicePeakConfig } from "../pricing/peak-pricing.service.js";

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
const cache = new TtlCache<ServiceAggregatedAvailability>(CACHE_MAX_ENTRIES);

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
): Promise<ServiceAggregatedAvailability> {
  const code = countryCode.trim().toLowerCase();
  const clampedDays = Math.min(30, Math.max(1, days));
  const cacheKey = `${code}:${serviceSlug}:${clampedDays}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const clinicTimezone = await resolveCountryTimeZone(code);
    const empty: ServiceAggregatedAvailability = {
      found: false,
      clinicTimezone,
      slots: [],
      doctorsByStart: {},
    };

    const service = await prisma.service.findFirst({
      where: { slug: serviceSlug, isActive: true, country: { code, isActive: true } },
      select: {
        id: true,
        durationMinutes: true,
        basePriceCents: true,
        currencyCode: true,
        country: { select: { currency: { select: { code: true } } } },
      },
    });
    if (!service) {
      cache.set(cacheKey, empty, CACHE_TTL_MS);
      return empty;
    }

    // Active doctors assigned to the service + reachable from this country.
    // Matches the per-doctor availability route's gate (ServiceDoctor.isActive).
    const doctors = await prisma.doctor.findMany({
      where: {
        active: true,
        OR: [
          { country: { code, isActive: true } },
          { additionalCountries: { some: { active: true, country: { code, isActive: true } } } },
        ],
        assignedServices: { some: { serviceId: service.id, isActive: true } },
      },
      select: { id: true, slug: true },
    });

    const found: ServiceAggregatedAvailability = {
      found: true,
      clinicTimezone,
      slots: [],
      doctorsByStart: {},
    };
    if (doctors.length === 0) {
      cache.set(cacheKey, found, CACHE_TTL_MS);
      return found;
    }

    const now = new Date();
    const toUtc = new Date(now.getTime() + clampedDays * DAY_MS);
    const peakConfig = await getServicePeakConfig(service.id);
    const basePriceCents = service.basePriceCents ?? 0;
    const fallbackCurrency = service.currencyCode ?? service.country.currency.code;

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
          ),
        })),
      );
      perDoctor.push(...results);
    }

    const byStart = new Map<string, ServiceAggSlot>();
    const doctorsByStart: Record<string, ServiceAggDoctorRef[]> = {};
    for (const { doctor, slots } of perDoctor) {
      for (const slot of slots) {
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
    cache.set(cacheKey, found, CACHE_TTL_MS);
    return found;
  } catch (error) {
    throw normalizeDbError(error, "Service availability is unavailable");
  }
}
