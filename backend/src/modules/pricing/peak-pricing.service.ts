import type { ServicePeakPricing } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { utcToClinicMinuteOfDay } from "../doctor-availability/timezone.js";

/**
 * Peak-hour pricing authority.
 *
 * A single place that turns a stored `ServicePeakPricing` config + a slot's
 * UTC start instant into the price the patient sees and pays. Every surface
 * (public availability, cart add, checkout) routes through `computeSlotPrice`
 * so the displayed price and the charged price can never diverge.
 *
 * The peak window is a clinic-local minute-of-day range with an EXCLUSIVE
 * end (18:00–22:00 → a 22:00 slot is off-peak).
 */

export type PricingType = "STANDARD" | "PEAK" | "OFF_PEAK";

export type SlotPrice = {
  unitPriceCents: number;
  pricingType: PricingType;
  currencyCode: string;
};

export type ComputeSlotPriceArgs = {
  /** Stored config, or null when the service has no peak-pricing row. */
  config: ServicePeakPricing | null;
  /** Flat service price used for STANDARD pricing and as a safety fallback. */
  basePriceCents: number;
  /** Currency to report for STANDARD pricing (service/country currency). */
  fallbackCurrency: string;
  /** The slot's UTC start instant (DoctorTimeSlot.startAt). */
  slotStartUtc: Date;
  /** Clinic timezone the peak window is expressed in. */
  clinicTimezone: string;
};

/**
 * Decide a slot's price. Pure: no I/O, fully unit-testable.
 *
 *   - no config or disabled  → STANDARD (basePriceCents, fallbackCurrency)
 *   - slot start inside the clinic-local window [start, end) → PEAK
 *   - otherwise               → OFF_PEAK
 *
 * The config's own `currencyCode` wins when peak pricing is active so the
 * admin can price a service independently of the country default if needed.
 */
export function computeSlotPrice(args: ComputeSlotPriceArgs): SlotPrice {
  const { config, basePriceCents, fallbackCurrency, slotStartUtc, clinicTimezone } =
    args;

  if (!config || !config.enabled) {
    return {
      unitPriceCents: basePriceCents,
      pricingType: "STANDARD",
      currencyCode: fallbackCurrency,
    };
  }

  const minuteOfDay = utcToClinicMinuteOfDay(slotStartUtc, clinicTimezone);
  const isPeak =
    minuteOfDay >= config.peakStartMinute && minuteOfDay < config.peakEndMinute;

  return {
    unitPriceCents: isPeak ? config.peakPriceCents : config.offPeakPriceCents,
    pricingType: isPeak ? "PEAK" : "OFF_PEAK",
    currencyCode: config.currencyCode,
  };
}

/** Load a service's peak-pricing config (null when none exists). */
export async function getServicePeakConfig(
  serviceId: string,
): Promise<ServicePeakPricing | null> {
  try {
    return await prisma.servicePeakPricing.findUnique({ where: { serviceId } });
  } catch (error) {
    throw normalizeDbError(error, "Could not read peak pricing");
  }
}

export type UpsertPeakPricingInput = {
  enabled: boolean;
  peakStartMinute: number;
  peakEndMinute: number;
  peakPriceCents: number;
  offPeakPriceCents: number;
  currencyCode: string;
};

/** Create or replace a service's peak-pricing config (keyed by serviceId). */
export async function upsertServicePeakConfig(
  serviceId: string,
  input: UpsertPeakPricingInput,
): Promise<ServicePeakPricing> {
  try {
    return await prisma.servicePeakPricing.upsert({
      where: { serviceId },
      create: { serviceId, ...input },
      update: { ...input },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not save peak pricing");
  }
}
