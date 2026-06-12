import type { ServicePeakPricing, ServicePeakWindow } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { utcToClinicMinuteOfDay } from "../doctor-availability/timezone.js";

/**
 * Peak-hour pricing authority.
 *
 * A single place that turns a stored peak-pricing config + a slot's UTC start
 * instant into the price the patient sees and pays. Every surface (public
 * availability, cart add, checkout) routes through `computeSlotPrice` so the
 * displayed price and the charged price can never diverge.
 *
 * The peak PRICE is one value applied across ONE OR MORE peak windows. A slot
 * is PEAK when its clinic-local start falls inside ANY window. Each window is a
 * clinic-local minute-of-day range with an EXCLUSIVE end (18:00–22:00 → a
 * 22:00 slot is off-peak).
 */

export type PricingType = "STANDARD" | "PEAK" | "OFF_PEAK";

export type PeakWindow = { startMinute: number; endMinute: number };

/** Stored config plus its windows — what the pricing logic reads. */
export type PeakPricingConfig = ServicePeakPricing & {
  windows: ServicePeakWindow[];
};

export type SlotPrice = {
  unitPriceCents: number;
  pricingType: PricingType;
  currencyCode: string;
};

export type ComputeSlotPriceArgs = {
  /** Stored config (with windows), or null when the service has no row. */
  config: PeakPricingConfig | null;
  /** Flat service price used for STANDARD pricing and as a safety fallback. */
  basePriceCents: number;
  /** Currency to report for STANDARD pricing (service/country currency). */
  fallbackCurrency: string;
  /** The slot's UTC start instant (DoctorTimeSlot.startAt). */
  slotStartUtc: Date;
  /** Clinic timezone the peak windows are expressed in. */
  clinicTimezone: string;
};

/** True when a clinic-local minute falls inside any window [start, end). */
export function isPeakMinute(minuteOfDay: number, windows: PeakWindow[]): boolean {
  return windows.some((w) => minuteOfDay >= w.startMinute && minuteOfDay < w.endMinute);
}

/**
 * Decide a slot's price. Pure: no I/O, fully unit-testable.
 *
 *   - no config, disabled, or no windows → STANDARD (basePriceCents)
 *   - slot start inside ANY clinic-local window [start, end) → PEAK
 *   - otherwise                                              → OFF_PEAK
 */
export function computeSlotPrice(args: ComputeSlotPriceArgs): SlotPrice {
  const { config, basePriceCents, fallbackCurrency, slotStartUtc, clinicTimezone } =
    args;

  if (!config || !config.enabled || config.windows.length === 0) {
    return {
      unitPriceCents: basePriceCents,
      pricingType: "STANDARD",
      currencyCode: fallbackCurrency,
    };
  }

  const minuteOfDay = utcToClinicMinuteOfDay(slotStartUtc, clinicTimezone);
  const isPeak = isPeakMinute(minuteOfDay, config.windows);

  return {
    unitPriceCents: isPeak ? config.peakPriceCents : config.offPeakPriceCents,
    pricingType: isPeak ? "PEAK" : "OFF_PEAK",
    currencyCode: config.currencyCode,
  };
}

/** Load a service's peak-pricing config + its windows (null when none). */
export async function getServicePeakConfig(
  serviceId: string,
): Promise<PeakPricingConfig | null> {
  try {
    return await prisma.servicePeakPricing.findUnique({
      where: { serviceId },
      include: { windows: { orderBy: { sortOrder: "asc" } } },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not read peak pricing");
  }
}

export type UpsertPeakPricingInput = {
  enabled: boolean;
  peakPriceCents: number;
  offPeakPriceCents: number;
  currencyCode: string;
  /** One or more peak windows. Replaces any existing windows wholesale. */
  windows: PeakWindow[];
};

/**
 * Create or replace a service's peak-pricing config (keyed by serviceId),
 * including its full window set. Runs in a transaction so the row + windows
 * never diverge.
 */
export async function upsertServicePeakConfig(
  serviceId: string,
  input: UpsertPeakPricingInput,
): Promise<PeakPricingConfig> {
  const { windows, ...pricing } = input;
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.servicePeakPricing.upsert({
        where: { serviceId },
        create: { serviceId, ...pricing },
        update: { ...pricing },
      });
      await tx.servicePeakWindow.deleteMany({ where: { pricingId: row.id } });
      if (windows.length > 0) {
        await tx.servicePeakWindow.createMany({
          data: windows.map((w, i) => ({
            pricingId: row.id,
            startMinute: w.startMinute,
            endMinute: w.endMinute,
            sortOrder: i,
          })),
        });
      }
      return tx.servicePeakPricing.findUniqueOrThrow({
        where: { id: row.id },
        include: { windows: { orderBy: { sortOrder: "asc" } } },
      });
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not save peak pricing");
  }
}
