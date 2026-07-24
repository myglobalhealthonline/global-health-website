import { prisma } from "../../db/prisma.js";
import { isValidTimeZone } from "../doctor-availability/timezone.js";

/**
 * The timezone STAFF-facing notifications (doctor + admin) are written in.
 *
 * Patient-facing messages keep the patient's own zone — a patient who booked
 * from Spain must read "10:00 (Spain)". The doctor working that consultation
 * and the admin team watching it work in the market the SERVICE belongs to, so
 * they must read the same appointment as "09:00 (Portugal)".
 *
 * The service's country is the authority, not the doctor's profile country: a
 * clinician rostered in several markets (Doctor.additionalCountries) takes
 * bookings in each of them, and the booked service decides which clock their
 * day is on. `Doctor.countryId` is only the last fallback, for legacy rows with
 * no service link.
 *
 * Resolution order:
 *   1. Service → Country.bookingSetting.timezone   (the booked market)
 *   2. Order/Appointment `countryCode` → same      (free-text bookings)
 *   3. Doctor's primary country                    (legacy safety net)
 *   4. "UTC"                                       (never an Invalid Date)
 */
export type StaffTimeZoneSource = {
  /** `OrderItem.serviceId` / `Appointment.serviceId` — the booked service. */
  serviceId?: string | null;
  /** `Order.countryCode` / `Appointment.countryCode` — stored lowercase. */
  countryCode?: string | null;
  /** Assigned doctor, used only when neither of the above resolves. */
  doctorId?: string | null;
};

const bookingTimezoneSelect = {
  country: { select: { bookingSetting: { select: { timezone: true } } } },
} as const;

function usable(tz: string | null | undefined): string | null {
  const trimmed = tz?.trim();
  return trimmed && isValidTimeZone(trimmed) ? trimmed : null;
}

export async function resolveStaffTimeZone(src: StaffTimeZoneSource): Promise<string> {
  if (src.serviceId) {
    const service = await prisma.service
      .findUnique({ where: { id: src.serviceId }, select: bookingTimezoneSelect })
      .catch(() => null);
    const tz = usable(service?.country?.bookingSetting?.timezone);
    if (tz) return tz;
  }

  const code = src.countryCode?.trim();
  if (code) {
    // Country codes are stored lowercase; an exact match on an upper-cased
    // value silently returns null, so compare case-insensitively.
    const country = await prisma.country
      .findFirst({
        where: { code: { equals: code, mode: "insensitive" } },
        select: { bookingSetting: { select: { timezone: true } } },
      })
      .catch(() => null);
    const tz = usable(country?.bookingSetting?.timezone);
    if (tz) return tz;
  }

  if (src.doctorId) {
    const doctor = await prisma.doctor
      .findUnique({ where: { id: src.doctorId }, select: bookingTimezoneSelect })
      .catch(() => null);
    const tz = usable(doctor?.country?.bookingSetting?.timezone);
    if (tz) return tz;
  }

  return "UTC";
}
