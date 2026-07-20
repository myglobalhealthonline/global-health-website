import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { listOpenSlotsForDoctorAndService } from "../doctor-availability/doctor-availability.service.js";
import {
  computeSlotPrice,
  getServicePeakConfig,
  type PricingType,
} from "../pricing/peak-pricing.service.js";
import { PartnerCountryNotFoundError } from "./partner-catalog.service.js";

/**
 * Slot feed for the partner booking API — call #2 of the three-step flow.
 *
 * Takes the ids handed out by the catalogue call and answers "when can THIS
 * doctor be booked for THIS service in THIS country". Two things make the
 * country parameter load-bearing rather than decorative:
 *
 *   1. Timezone. `DoctorTimeSlot.startAt` is stored UTC; the market's
 *      wall-clock meaning comes from `BookingSetting.timezone`. We return
 *      both the UTC instants and the `clinicTimezone` so the partner can
 *      render local times without guessing.
 *   2. Scoping. The same doctor may serve several markets; validating the
 *      (country, service, doctor) triple here means a caller scoped to one
 *      country can't enumerate another country's calendar.
 *
 * Prices are computed PER SLOT because peak pricing is time-of-day dependent
 * — the partner must charge what the slot says, not the catalogue's
 * `basePriceCents`.
 */

/** Don't advertise slots about to start; mirrors the public feed's buffer. */
const START_BUFFER_MS = 60 * 60 * 1000;

export type PartnerSlot = {
  /** `DoctorTimeSlot.id` — pass this back verbatim as `timeSlotId` when booking. */
  id: string;
  startAt: string;
  endAt: string;
  priceCents: number;
  pricingType: PricingType;
  currencyCode: string;
};

export type PartnerAvailability = {
  country: { id: string; code: string; timezone: string };
  service: { id: string; slug: string; name: string; durationMinutes: number | null };
  doctor: { id: string; slug: string; fullName: string };
  /** IANA zone the slot instants should be rendered in. */
  clinicTimezone: string;
  rangeStart: string;
  rangeEnd: string;
  slots: PartnerSlot[];
};

export class PartnerServiceNotFoundError extends Error {
  constructor() {
    super("Service not found or inactive for the chosen country.");
    this.name = "PartnerServiceNotFoundError";
  }
}

export class PartnerDoctorNotFoundError extends Error {
  constructor() {
    super("Doctor not found, inactive, or not assigned to this service.");
    this.name = "PartnerDoctorNotFoundError";
  }
}

export async function getPartnerAvailability(input: {
  countryCode: string;
  serviceId: string;
  doctorId: string;
  days: number;
}): Promise<PartnerAvailability> {
  const code = input.countryCode.trim().toLowerCase();
  try {
    const country = await prisma.country.findFirst({
      where: { code, isActive: true },
      select: {
        id: true,
        code: true,
        bookingSetting: { select: { timezone: true } },
      },
    });
    if (!country) throw new PartnerCountryNotFoundError();

    const service = await prisma.service.findFirst({
      where: { id: input.serviceId, countryId: country.id, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        durationMinutes: true,
        basePriceCents: true,
        currencyCode: true,
        country: { select: { currency: { select: { code: true } } } },
      },
    });
    if (!service) throw new PartnerServiceNotFoundError();

    // One query proves all three facts we need about the doctor: exists +
    // active, rostered in this country, and an approved provider of this
    // service. A miss on any of them is the same 404 — the caller shouldn't
    // be able to probe which doctors exist but aren't assigned.
    const doctor = await prisma.doctor.findFirst({
      where: {
        id: input.doctorId,
        active: true,
        OR: [
          { countryId: country.id },
          {
            additionalCountries: {
              some: { active: true, countryId: country.id },
            },
          },
        ],
        assignedServices: {
          some: { serviceId: service.id, isActive: true, status: "active" },
        },
      },
      select: { id: true, slug: true, fullName: true },
    });
    if (!doctor) throw new PartnerDoctorNotFoundError();

    const clinicTimezone = country.bookingSetting?.timezone ?? "UTC";
    const now = Date.now();
    const fromUtc = new Date(now + START_BUFFER_MS);
    const toUtc = new Date(now + input.days * 24 * 60 * 60 * 1000);

    const slots = await listOpenSlotsForDoctorAndService(
      doctor.id,
      service.durationMinutes ?? null,
      fromUtc,
      toUtc,
    );

    const peakConfig = await getServicePeakConfig(service.id);
    const fallbackCurrency =
      service.currencyCode ?? service.country.currency?.code ?? "EUR";
    const basePriceCents = service.basePriceCents ?? 0;

    return {
      country: { id: country.id, code: country.code, timezone: clinicTimezone },
      service: {
        id: service.id,
        slug: service.slug,
        name: service.name,
        durationMinutes: service.durationMinutes,
      },
      doctor,
      clinicTimezone,
      rangeStart: fromUtc.toISOString(),
      rangeEnd: toUtc.toISOString(),
      slots: slots.map((slot) => {
        const price = computeSlotPrice({
          config: peakConfig,
          basePriceCents,
          fallbackCurrency,
          slotStartUtc: new Date(slot.startAt),
          clinicTimezone,
        });
        return {
          id: slot.id,
          startAt: slot.startAt,
          endAt: slot.endAt,
          priceCents: price.unitPriceCents,
          pricingType: price.pricingType,
          currencyCode: price.currencyCode,
        };
      }),
    };
  } catch (error) {
    if (
      error instanceof PartnerCountryNotFoundError ||
      error instanceof PartnerServiceNotFoundError ||
      error instanceof PartnerDoctorNotFoundError
    ) {
      throw error;
    }
    throw normalizeDbError(error, "Availability is unavailable");
  }
}
