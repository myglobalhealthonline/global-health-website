import type { FastifyRequest } from "fastify";
import { prisma } from "../../db/prisma.js";
import {
  createManualBooking,
  type CreateManualBookingResult,
} from "./manual-booking.service.js";

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
      fullName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      consultationMode: true,
      serviceId: true,
      amountCents: true,
      clinicId: true,
      locationAddress: true,
    },
  });
  if (!source) throw new FollowUpSourceNotFoundError();
  if (!source.serviceId) throw new FollowUpSourceNotBillableError();

  const mode = input.consultationMode ?? source.consultationMode;
  if (mode === "IN_PERSON" && !source.clinicId && !source.locationAddress?.trim()) {
    throw new FollowUpVenueMissingError();
  }

  return createManualBooking({
    adminUserId: input.actorUserId,
    patient: {
      email: source.email,
      fullName: source.fullName,
      phone: source.phone,
      // ISO date — createManualBooking slices the first 10 chars back off.
      dateOfBirth: source.dateOfBirth?.toISOString() ?? null,
    },
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
    followUpFromAppointmentId: source.id,
    // Null when the source was free / legacy-imported with no amount — then
    // the service's own price applies, rather than booking a priceless row.
    amountCentsOverride: source.amountCents,
    consultationTypeOverride: input.consultationType ?? "follow-up",
    origin: { source: "doctor_followup", actorRole: "DOCTOR" },
    request: input.request,
  });
}
