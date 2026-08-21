import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/**
 * "Is this consultation actually bought?" — the single answer every
 * consultation-time automation asks before it contacts anyone.
 *
 * Why this exists: on 2026-08-21 a Spain manual booking that was never paid
 * (order PENDING, deadline still in the future because a reschedule never
 * moved it) reached its start time with a Meet link the doctor had pasted in
 * himself, and the doctor-no-show cron nudged him about a consultation that
 * did not exist. None of the reminder/no-show queries looked at payment at
 * all. They do now, through this clause.
 *
 * Two signals, OR'd, because either alone has a gap:
 *   - `Appointment.paymentStatus = PAID` — stamped by the payment webhook
 *     (complete-order-payment.service.ts) and pre-stamped on corporate
 *     bookings, which are free at the point of use and must still get their
 *     reminders (corporate-booking.service.ts).
 *   - a linked Order that is PAID — catches a row whose appointment-level
 *     flag was missed (legacy imports, partial fulfilment repairs).
 *
 * Deliberately NOT status-based: AppointmentStatus has no "confirmed" member
 * (REQUEST_RECEIVED / UNDER_REVIEW / CONTACTED / CANCELLED / COMPLETED), so an
 * unpaid manual booking sits in REQUEST_RECEIVED exactly like a paid one.
 */
export const paidAppointmentWhere: Prisma.AppointmentWhereInput = {
  OR: [
    { paymentStatus: "PAID" },
    {
      orderAppointments: {
        some: {
          order: {
            OR: [{ status: "PAID" }, { paymentStatus: "PAID" }],
          },
        },
      },
    },
  ],
};

/** Single-row form of `paidAppointmentWhere`, for request-time guards. */
export async function isAppointmentPaid(appointmentId: string): Promise<boolean> {
  const match = await prisma.appointment.findFirst({
    where: { id: appointmentId, ...paidAppointmentWhere },
    select: { id: true },
  });
  return match != null;
}
