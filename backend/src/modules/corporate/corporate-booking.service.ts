import { randomUUID } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import {
  claimConsecutiveSlots,
  listOpenSlotsForDoctor,
  SlotAlreadyTakenError,
} from "../doctor-availability/doctor-availability.service.js";
import { assertCorporateServiceBookable } from "./corporate-benefit.service.js";
import { claimCorporateRequest } from "./corporate-status.service.js";

/**
 * Booking for the plan's own corporate consultations.
 *
 * These are NOT catalogue services: there is no price, no cart, no Order and
 * no Stripe session, so nothing here ever reaches commission, doctor payout or
 * invoicing (payout statements read `OrderItem.doctorPayoutCents`, and this
 * flow writes no OrderItem). What it DOES do is consume the assigned doctor's
 * ordinary availability exactly like a paid booking — same `DoctorTimeSlot`
 * grid, same atomic `claimConsecutiveSlots`, so a free corporate consultation
 * and a paid one can never double-book the same doctor.
 */

/** How far ahead the member can pick a slot. Same horizon the public booking
 *  funnel offers, so an assigned doctor's calendar reads the same either way. */
const SLOT_WINDOW_DAYS = 60;

export type CorporateServiceSlot = {
  id: string;
  startAt: string;
  endAt: string;
};

export type CorporateServiceListing = {
  id: string;
  name: string;
  description: string | null;
  role: string;
  durationMinutes: number;
  doctor: { id: string; fullName: string } | null;
};

/** The consultations this member's plan offers in their market, with the
 *  assigned doctor resolved. Slots are fetched separately (per consultation),
 *  because generating them for every row up front is wasted work when the
 *  member only ever opens one. */
export async function listCorporateServicesForPlan(input: {
  planId: string;
  countryCode: string;
}): Promise<CorporateServiceListing[]> {
  const rows = await prisma.corporatePlanService.findMany({
    where: {
      corporatePlanId: input.planId,
      isActive: true,
      OR: [{ countryCode: null }, { countryCode: input.countryCode.toLowerCase() }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      role: true,
      durationMinutes: true,
      doctor: { select: { id: true, fullName: true, active: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    role: row.role as string,
    durationMinutes: row.durationMinutes,
    // A deactivated doctor leaves the consultation visible but unbookable —
    // the member needs to see WHY there are no times rather than an empty page.
    doctor: row.doctor.active
      ? { id: row.doctor.id, fullName: row.doctor.fullName }
      : null,
  }));
}

/** Open slots on the assigned doctor's own calendar. */
export async function listCorporateServiceSlots(
  corporateServiceId: string,
): Promise<CorporateServiceSlot[]> {
  const row = await prisma.corporatePlanService.findFirst({
    where: { id: corporateServiceId, isActive: true },
    select: { doctor: { select: { id: true, active: true } } },
  });
  if (!row || !row.doctor.active) return [];
  const from = new Date();
  const to = new Date(from.getTime() + SLOT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return listOpenSlotsForDoctor(row.doctor.id, from, to);
}

export type CorporateBookingResult =
  | {
      ok: true;
      appointmentId: string;
      /** The membership row the eligibility gate matched, when it named one.
       *  Handed to `onCorporateAppointmentCreated` so the pre-assessment is
       *  stamped on THIS employee rather than re-derived from the booking. */
      employeeId?: string;
    }
  | { ok: false; status: number; message: string };

/**
 * Book a corporate consultation for the signed-in member.
 *
 * The eligibility gate runs BEFORE the transaction (it only reads), and any
 * open company request it found is consumed INSIDE it via
 * `claimCorporateRequest`, whose status-guarded updateMany is what stops two
 * simultaneous bookings both spending one request.
 */
export async function bookCorporateConsultation(input: {
  userId: string;
  corporateServiceId: string;
  timeSlotId: string;
  patient: {
    fullName: string;
    email: string;
    phone?: string | null;
    notes?: string | null;
    /** GDPR opt-IN for WhatsApp appointment updates. Defaults OFF — the
     *  confirmation send fails closed on anything but an explicit true. */
    whatsappConsent?: boolean;
  };
  consentAccepted: boolean;
}): Promise<CorporateBookingResult> {
  if (!input.consentAccepted) {
    return { ok: false, status: 400, message: "Consent is required to book" };
  }

  const gate = await assertCorporateServiceBookable({
    userId: input.userId,
    corporateServiceId: input.corporateServiceId,
  });
  if (!gate.ok) {
    // Same disclosure rule as the rest of the corporate surface: only an actual
    // member is told why, so a private consultation is not an existence oracle.
    return {
      ok: false,
      status: gate.isMember ? 403 : 404,
      message: gate.isMember ? gate.message : "Consultation not found",
    };
  }

  const corporateService = await prisma.corporatePlanService.findFirst({
    where: { id: input.corporateServiceId, isActive: true },
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      doctorId: true,
      countryCode: true,
      doctor: { select: { active: true, country: { select: { code: true } } } },
    },
  });
  if (!corporateService || !corporateService.doctor.active) {
    return { ok: false, status: 404, message: "Consultation not found" };
  }

  // The slot must belong to the ASSIGNED doctor. Without this check a member
  // could post any open slot id and book a doctor their plan never named.
  const slot = await prisma.doctorTimeSlot.findUnique({
    where: { id: input.timeSlotId },
    select: { doctorId: true, status: true },
  });
  if (!slot || slot.doctorId !== corporateService.doctorId) {
    return { ok: false, status: 400, message: "That time is not available" };
  }

  const appointmentId = randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await claimConsecutiveSlots(
        tx,
        input.timeSlotId,
        corporateService.durationMinutes,
      );
      await tx.appointment.create({
        data: {
          id: appointmentId,
          userId: input.userId,
          // The consultation's own market when pinned, else the doctor's.
          countryCode: corporateService.countryCode ?? corporateService.doctor.country.code,
          // `consultationType` is what every downstream surface already
          // renders as the consultation's title — patient list, doctor queue,
          // admin alerts, reminder emails, no-show messages. Manual bookings
          // put `service.name` here for the same reason; a serviceless
          // corporate booking puts its own name here and needs no other
          // display plumbing.
          consultationType: corporateService.name,
          fullName: input.patient.fullName,
          email: input.patient.email.toLowerCase(),
          phone: input.patient.phone || null,
          notes: input.patient.notes || null,
          consentAccepted: true,
          whatsappConsent: input.patient.whatsappConsent === true,
          status: "REQUEST_RECEIVED",
          consultationMode: "ONLINE",
          doctorId: claimed.doctorId,
          timeSlotId: input.timeSlotId,
          scheduledAt: claimed.startAt,
          corporateServiceId: corporateService.id,
          // Free at the point of use and never invoiced: PAID at zero, not
          // UNPAID, so no payment-chasing automation ever picks it up.
          amountCents: 0,
          paymentStatus: "PAID",
        },
      });
      if (gate.requestId) {
        await claimCorporateRequest(tx, gate.requestId, appointmentId);
      }
    });
  } catch (error) {
    if (error instanceof SlotAlreadyTakenError) {
      return { ok: false, status: 409, message: error.message };
    }
    throw error;
  }

  return { ok: true, appointmentId, ...(gate.employeeId ? { employeeId: gate.employeeId } : {}) };
}
