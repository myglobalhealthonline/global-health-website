import type { FastifyRequest } from "fastify";
import { prisma } from "../../db/prisma.js";
import { createManualBooking } from "../appointments/manual-booking.service.js";

/**
 * Call #3 of the partner flow: turn a (country, service, doctor, slot,
 * patient) tuple into a real booking.
 *
 * This deliberately delegates to `createManualBooking` rather than
 * re-implementing the pipeline. That one function already owns the parts
 * that are easy to get subtly wrong and expensive to get wrong twice:
 * atomic slot claim, doctor↔service↔country eligibility, peak/insurance
 * pricing, patient account provisioning, Order + OrderItem creation, the
 * Stripe checkout session, the pre-payment notification flow, invoice
 * issuance, and the audit row. A parallel implementation here would drift
 * from the admin path the first time any of those rules changed.
 *
 * What this layer adds is provenance (`origin`) and a response shaped for a
 * machine caller — notably WITHOUT the patient's temporary portal password.
 * The admin console shows that so a human can read it back over the phone;
 * handing it to an external system would put patient login credentials in a
 * third party's logs for no operational gain, since the patient receives
 * their own portal-access email regardless.
 */

/**
 * Flat on the wire — the booking body carries exactly one person, so a
 * `patient` wrapper would nest without disambiguating. The grouping is
 * restored below when handing off to `createManualBooking`, which is shared
 * with the admin console and keeps its own shape.
 */
export type CreatePartnerBookingInput = {
  countryCode: string;
  serviceId: string;
  doctorId: string;
  timeSlotId: string;
  email: string;
  fullName: string;
  phone: string;
  dateOfBirth?: string | null;
  /** Fiscal / taxpayer number — NIF, CPF, PPS, CNP, DIČ. */
  taxIdNumber?: string | null;
  nationalIdNumber?: string | null;
  passportNumber?: string | null;
  /** Portugal only. */
  utenteNumber?: string | null;
  /** Single line: street, city and postcode together. */
  address?: string | null;
  notes?: string | null;
  partnerClientId: string;
  request?: FastifyRequest;
};

export type PartnerBookingResult = {
  bookingId: string;
  orderId: string;
  patientUserId: string;
  status: string;
  paymentStatus: string;
  /** UTC instant the consultation starts, derived from the claimed slot. */
  scheduledAt: string | null;
  amountCents: number | null;
  currencyCode: string | null;
  /** Stripe Checkout URL to send the patient to. Null when Stripe isn't
   *  configured for the country or session creation failed — the booking
   *  still exists and is payable from the patient portal. */
  paymentUrl: string | null;
  /** One-click portal set-password link (7-day invite token). */
  setPasswordUrl: string;
  /** False when the patient notification/automation step failed. The booking
   *  is still valid; the partner may want to follow up out-of-band. */
  notificationsQueued: boolean;
};

export async function createPartnerBooking(
  input: CreatePartnerBookingInput,
): Promise<PartnerBookingResult> {
  const result = await createManualBooking({
    // No User row to attribute this to — the actor is an integration, which
    // `createManualBooking` already supports via a null admin id. The
    // PartnerApiClient id lands in the audit metadata via `origin` instead.
    adminUserId: null,
    // Re-nest the flat wire fields into the shape createManualBooking uses.
    patient: {
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth ?? null,
      taxIdNumber: input.taxIdNumber ?? null,
      nationalIdNumber: input.nationalIdNumber ?? null,
      passportNumber: input.passportNumber ?? null,
      utenteNumber: input.utenteNumber ?? null,
      // The partner contract takes one address line; the patient record
      // stores street/city/country separately. City and country are left
      // unset rather than guessed — a wrong split is worse than an absent
      // one, and nothing downstream parses the street line.
      addressLine1: input.address ?? null,
    },
    serviceId: input.serviceId,
    doctorId: input.doctorId,
    timeSlotId: input.timeSlotId,
    // Duration always comes from the chosen service. The partner picks a
    // service, and the service defines how long its consultation runs —
    // letting the caller override it would let an external system book 5
    // minutes of a 30-minute consultation.
    durationMinutes: null,
    // Partner bookings are always remote consultations, so there is no
    // clinic or street address to attach.
    consultationMode: "ONLINE",
    clinicId: null,
    locationAddress: null,
    notes: input.notes ?? null,
    countryCode: input.countryCode,
    // Insurance-backed booking is not offered through the partner API: it
    // requires the doctor to be in the insurer's network and an admin to
    // have verified the card in person. Partner bookings are standard price.
    insuranceCompanyId: null,
    insurancePolicyNumber: null,
    request: input.request,
    origin: {
      source: "partner_api",
      actorRole: "PARTNER_API",
      partnerClientId: input.partnerClientId,
    },
  });

  // Read back the persisted booking rather than echoing the request: the
  // authoritative scheduledAt comes from the slot that was actually claimed,
  // and the amount from the pricing rules that were actually applied.
  const appointment = await prisma.appointment.findUnique({
    where: { id: result.appointmentId },
    select: {
      status: true,
      paymentStatus: true,
      scheduledAt: true,
      amountCents: true,
      currencyCode: true,
    },
  });

  return {
    bookingId: result.appointmentId,
    orderId: result.orderId,
    patientUserId: result.patientUserId,
    status: appointment?.status ?? "REQUEST_RECEIVED",
    paymentStatus: appointment?.paymentStatus ?? "UNPAID",
    scheduledAt: appointment?.scheduledAt?.toISOString() ?? null,
    amountCents: appointment?.amountCents ?? null,
    currencyCode: appointment?.currencyCode ?? null,
    paymentUrl: result.paymentUrl,
    setPasswordUrl: result.setPasswordUrl,
    notificationsQueued: result.emailQueued,
  };
}
