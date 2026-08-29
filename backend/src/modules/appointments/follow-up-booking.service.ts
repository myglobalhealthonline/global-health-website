import type { FastifyRequest } from "fastify";
import type { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  createManualBooking,
  type CreateManualBookingResult,
} from "./manual-booking.service.js";
import { slotOverlapsPause } from "../bookability/bookability.service.js";

/**
 * Doctor-initiated follow-up booking.
 *
 * A follow-up used to be a bare `Appointment` INSERT with a free-text
 * `scheduledAt`: it claimed no `DoctorTimeSlot` (so the doctor stayed
 * bookable at that hour and could be double-booked), minted no `Order`
 * (so nothing was ever charged despite a price being copied onto the
 * row), and notified nobody but admin — the patient was never told a
 * follow-up existed.
 *
 * This routes follow-ups through `createManualBooking`, the exact same
 * pipeline the admin walk-in flow uses, so the slot lifecycle and the
 * notification sequence are shared code rather than a parallel
 * re-implementation that drifts:
 *
 *   holdConsecutiveSlots (OPEN → HELD)  →  Order + CartItem  →  Stripe
 *   Checkout  →  startPrePaymentFlow (doctor WhatsApp + email + portal
 *   bell, patient WhatsApp + email, reminders)  →  unpaid invoice
 *
 * and on payment the webhook flips HELD → BOOKED and the outbox runs the
 * post-payment chain (Meet link, then patient WA → patient email →
 * doctor WA → doctor email → doctor portal bell). If the patient never
 * pays, the pre-payment deadline cancels the booking and releases the
 * slot back to the base grid — the same safety net every other booking
 * gets.
 *
 * Pricing: a follow-up costs exactly what the consultation it continues
 * cost. The source amount is passed as an explicit override so peak /
 * off-peak pricing cannot re-price it — otherwise the same follow-up
 * would cost more purely for landing in an evening slot.
 */

export class FollowUpSourceNotFoundError extends Error {
  constructor() {
    super("Source appointment not found");
    this.name = "FollowUpSourceNotFoundError";
  }
}

/**
 * The source consultation has no catalogue `Service` behind it (a legacy
 * import or a free-text booking). We refuse rather than guess: without a
 * service there is no duration to reserve, no doctor-assignment to check,
 * and no line item to bill.
 */
export class FollowUpSourceNotBillableError extends Error {
  constructor() {
    super(
      "This consultation has no linked service, so a follow-up can't be priced or scheduled. Ask an administrator to book it.",
    );
    this.name = "FollowUpSourceNotBillableError";
  }
}

/**
 * An in-person follow-up was asked for but neither the request nor the
 * source appointment carries a venue (older rows predate the clinic /
 * address fields). `createManualBooking` would reject this deeper in with
 * an untyped error; we catch it here so the doctor gets a 400 they can act
 * on rather than a 500.
 */
export class FollowUpVenueMissingError extends Error {
  constructor() {
    super(
      "This consultation has no clinic or address on record, so an in-person follow-up can't be booked. Choose Online, or ask an administrator to set the venue.",
    );
    this.name = "FollowUpVenueMissingError";
  }
}

export class FollowUpBookingUnavailableError extends Error {
  constructor() {
    super("This doctor or service is not accepting follow-up bookings at the selected time.");
    this.name = "FollowUpBookingUnavailableError";
  }
}

export type CreateFollowUpBookingInput = {
  /** Appointment being followed up. Must belong to `doctorId`. */
  sourceAppointmentId: string;
  /** Authenticated doctor — also the doctor the follow-up is booked with. */
  doctorId: string;
  /** The doctor's portal User id, recorded as the audit actor. */
  actorUserId: string | null;
  /** First base `DoctorTimeSlot` to claim, from the doctor's own calendar. */
  timeSlotId: string;
  consultationMode?: "ONLINE" | "IN_PERSON";
  /** Notification language picked in the follow-up dialog. Omitted → inherit
   *  the source appointment's, so a patient who has been written to in
   *  Portuguese keeps being written to in Portuguese. */
  notificationLocale?: LocaleCode | null;
  notes?: string | null;
  /** Defaults to "follow-up"; the dialog can pick another consultation type. */
  consultationType?: string;
  request?: FastifyRequest;
};

export async function createFollowUpBooking(
  input: CreateFollowUpBookingInput,
): Promise<CreateManualBookingResult> {
  // Doctor-scoped lookup — a doctor may only follow up on their own
  // appointments, enforced here and not just in the UI.
  const source = await prisma.appointment.findFirst({
    where: { id: input.sourceAppointmentId, doctorId: input.doctorId },
    select: {
      id: true,
      countryCode: true,
      notificationLocale: true,
      fullName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      consultationMode: true,
      serviceId: true,
      amountCents: true,
      clinicId: true,
      locationAddress: true,
      // The account this appointment belongs to. Its address is the live one;
      // `source.email` is only a snapshot of what was typed at booking time.
      user: { select: { email: true } },
    },
  });
  if (!source) throw new FollowUpSourceNotFoundError();
  if (!source.serviceId) throw new FollowUpSourceNotBillableError();

  // Doctor follow-ups are not an implicit pause bypass. Validate the exact
  // selected slot (including full-span overlap) against the same country,
  // lifecycle, assignment, doctor-pause and service-pause gates as public
  // booking before entering the shared manual-booking pipeline.
  const [targetSlot, servicePolicy] = await Promise.all([
    prisma.doctorTimeSlot.findFirst({
      where: { id: input.timeSlotId, doctorId: input.doctorId, status: "OPEN" },
      select: {
        startAt: true,
        endAt: true,
        doctor: {
          select: {
            active: true,
            country: { select: { code: true } },
            additionalCountries: {
              where: { country: { code: source.countryCode }, active: true },
              select: { id: true },
              take: 1,
            },
            bookingPausedFrom: true,
            bookingPausedUntil: true,
          },
        },
      },
    }),
    prisma.service.findFirst({
      where: {
        id: source.serviceId,
        isActive: true,
        visibility: "PUBLIC",
        country: { code: source.countryCode, isActive: true },
      },
      select: {
        bookingPausedFrom: true,
        bookingPausedUntil: true,
        country: { select: { bookingSetting: { select: { bookingEnabled: true } } } },
        assignedDoctors: {
          where: { doctorId: input.doctorId, isActive: true, status: "active" },
          select: { id: true },
          take: 1,
        },
      },
    }),
  ]);
  const doctorInCountry =
    targetSlot?.doctor.country.code === source.countryCode ||
    (targetSlot?.doctor.additionalCountries.length ?? 0) > 0;
  if (
    !targetSlot ||
    !servicePolicy ||
    servicePolicy.country.bookingSetting?.bookingEnabled === false ||
    !targetSlot.doctor.active ||
    !doctorInCountry ||
    servicePolicy.assignedDoctors.length === 0 ||
    slotOverlapsPause(targetSlot, targetSlot.doctor) ||
    slotOverlapsPause(targetSlot, servicePolicy)
  ) {
    throw new FollowUpBookingUnavailableError();
  }

  // Book the follow-up against the patient's CURRENT address, not the one
  // frozen onto the source appointment. Downstream identity is keyed on email,
  // so a stale snapshot doesn't just mislabel the row — it fails to find the
  // account and mints a second patient for someone we already have.
  //
  // That is exactly how GH-2026-001488 was created on 2026-08-19: an admin
  // corrected the address at 09:57:21, the appointment row kept the old one,
  // and the doctor booked a follow-up 26 seconds later that read the stale
  // value and created a whole new patient. Appointment emails now travel with
  // a correction too, so both halves of that failure are closed.
  const patientEmail = source.user?.email ?? source.email;

  const mode = input.consultationMode ?? source.consultationMode;
  if (mode === "IN_PERSON" && !source.clinicId && !source.locationAddress?.trim()) {
    throw new FollowUpVenueMissingError();
  }

  return createManualBooking({
    adminUserId: input.actorUserId,
    patient: {
      email: patientEmail,
      fullName: source.fullName,
      phone: source.phone,
      // ISO date — createManualBooking slices the first 10 chars back off.
      dateOfBirth: source.dateOfBirth?.toISOString() ?? null,
    },
    // The duplicate-patient guard stays ON here. This path is not the safe one
    // it looks like: it created the 2026-08-19 duplicate, and it is the path
    // where nobody is watching, because the doctor never types an address and
    // so never sees which one is being used. With the live address resolved
    // above the guard is normally a no-op — the account exists, so the check
    // short-circuits — and it only speaks up when the follow-up would
    // genuinely start a second chart.
    serviceId: source.serviceId,
    doctorId: input.doctorId,
    timeSlotId: input.timeSlotId,
    consultationMode: mode,
    // Carry the original venue forward so an IN_PERSON follow-up passes the
    // "needs a clinic or address" guard without re-asking the doctor.
    clinicId: mode === "IN_PERSON" ? source.clinicId : null,
    locationAddress: mode === "IN_PERSON" ? source.locationAddress : null,
    notes: input.notes ?? null,
    countryCode: source.countryCode,
    // Explicit pick wins; otherwise carry the source consultation's language
    // rather than re-deriving from the country, which would switch languages
    // mid-thread for a patient booked in something other than the default.
    notificationLocale: input.notificationLocale ?? source.notificationLocale,
    followUpFromAppointmentId: source.id,
    // Null when the source was free / legacy-imported with no amount — then
    // the service's own price applies, rather than booking a priceless row.
    amountCentsOverride: source.amountCents,
    consultationTypeOverride: input.consultationType ?? "follow-up",
    origin: { source: "doctor_followup", actorRole: "DOCTOR" },
    request: input.request,
  });
}
