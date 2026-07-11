import { prisma } from "../../db/prisma.js";
import { resolveDoctorTimeZone } from "../doctor-availability/doctor-availability.service.js";
import {
  computeSlotPrice,
  getServicePeakConfig,
} from "../pricing/peak-pricing.service.js";
import { loadValidatedInsurancePrice } from "../pricing/insurance-pricing.service.js";

export interface EffectivePriceItem {
  id: string;
  kind: string;
  serviceId: string | null;
  doctorId: string | null;
  timeSlotId: string | null;
  /** Selected insurance company id (consultation lines). When set + valid for
   * the service, the negotiated insurance price replaces the peak/base price. */
  insuranceCompanyId?: string | null;
}

const CONSULTATION_KINDS = new Set(["GENERAL_CONSULTATION", "SPECIALIST_CONSULTATION"]);

/**
 * Re-derive the authoritative peak-adjusted unit price for every consultation
 * line from the CURRENT peak-pricing config + the slot's own clinic-local start
 * time. This is the anti-tamper recompute the checkout uses (§ orders.route):
 * the cart snapshot price is display-only and could be stale or forged. Shared
 * so the read-only price preview produces the same number the checkout charges.
 *
 * Non-consultation / incomplete lines are absent from the map (the caller keeps
 * the snapshot price for those).
 */
export async function computeEffectivePrices(
  items: EffectivePriceItem[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  await Promise.all(
    items.map(async (i) => {
      if (!CONSULTATION_KINDS.has(i.kind) || !i.serviceId || !i.doctorId || !i.timeSlotId) {
        return;
      }
      const [svc, slot, config] = await Promise.all([
        prisma.service.findUnique({
          where: { id: i.serviceId },
          select: {
            basePriceCents: true,
            currencyCode: true,
            country: { select: { currency: { select: { code: true } } } },
          },
        }),
        prisma.doctorTimeSlot.findUnique({
          where: { id: i.timeSlotId },
          select: { startAt: true },
        }),
        getServicePeakConfig(i.serviceId),
      ]);
      if (!svc || svc.basePriceCents == null || !slot) return;
      const tz = await resolveDoctorTimeZone(i.doctorId);
      const priced = computeSlotPrice({
        config,
        basePriceCents: svc.basePriceCents,
        fallbackCurrency: svc.currencyCode ?? svc.country.currency.code,
        slotStartUtc: slot.startAt,
        clinicTimezone: tz,
      });
      // Insurance wins over peak: a negotiated insurance price is a flat
      // per-service rate independent of time-of-day. Validated server-side
      // (coverage row must exist, company active + same country) so a forged
      // company id falls through to the peak/base price, never cheaper.
      if (i.insuranceCompanyId) {
        const insurancePrice = await loadValidatedInsurancePrice(
          i.serviceId,
          i.insuranceCompanyId,
        );
        if (insurancePrice != null) {
          out.set(i.id, insurancePrice);
          return;
        }
      }
      out.set(i.id, priced.unitPriceCents);
    }),
  );
  return out;
}
