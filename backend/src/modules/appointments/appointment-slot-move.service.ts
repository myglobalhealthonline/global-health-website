import { prisma } from "../../db/prisma.js";
import {
  reclaimSlotForRescheduledAppointment,
  releaseAppointmentSlot,
} from "../doctor-availability/doctor-availability.service.js";

/**
 * Moving a consultation's DoctorTimeSlot, shared by every admin writer that can
 * change `scheduledAt` or `doctorId`.
 *
 * A DoctorTimeSlot belongs to ONE doctor at ONE time, so BOTH dimensions have to
 * move the reservation — a doctor swap at an unchanged clock time included. Two
 * separate admin endpoints each got a piece of this wrong and produced the same
 * outcome: the appointment points at a time nothing reserves, the booking page
 * keeps offering that hour, and a second patient buys it.
 *
 *   - `/appointments/:id/update` gated release AND reclaim on the time alone, so
 *     a doctor swap left the slot on the OLD doctor's calendar (2026-09-08: one
 *     doctor, one hour, a manual booking and a website booking).
 *   - `/appointments/:id/schedule` released the old slot on a time change and
 *     never reclaimed anything, so every move through the "schedule call" form
 *     left the new time unreserved.
 */

export class TargetSlotUnavailableError extends Error {
  constructor() {
    super(
      "That doctor already has something in the diary at this time. Pick another time or another doctor.",
    );
    this.name = "TargetSlotUnavailableError";
  }
}

/** Length of the reservation being given up, so the new one keeps it. */
export async function readSlotMinutes(slotId: string | null): Promise<number | null> {
  if (!slotId) return null;
  const slot = await prisma.doctorTimeSlot.findUnique({
    where: { id: slotId },
    select: { startAt: true, endAt: true },
  });
  if (!slot) return null;
  return Math.round((slot.endAt.getTime() - slot.startAt.getTime()) / 60_000);
}

/**
 * Refuse a move onto an hour the target doctor has already given away — BEFORE
 * anything is written.
 *
 * The reclaim is best-effort by design (an off-grid admin time has no row to
 * claim and must still be allowed), so without this check a collision degrades
 * to "appointment silently slotless", which reads as a successful save while
 * leaving the hour on sale for the next patient.
 *
 * Only an existing non-OPEN row counts as a collision. No row at all means
 * off-grid or not-yet-materialised, which stays permitted exactly as before.
 */
export async function assertTargetSlotFree(
  doctorId: string | null,
  startAt: Date | null,
  ignoreSlotId: string | null,
): Promise<void> {
  if (!doctorId || !startAt) return;
  const occupied = await prisma.doctorTimeSlot.findFirst({
    where: {
      doctorId,
      startAt,
      status: { not: "OPEN" },
      ...(ignoreSlotId ? { id: { not: ignoreSlotId } } : {}),
    },
    select: { id: true },
  });
  if (occupied) throw new TargetSlotUnavailableError();
}

/**
 * Hand the old reservation back to the grid and claim the new one. Returns the
 * slot now backing the appointment, or null when the target time is off-grid —
 * the pre-existing lenient behaviour for admin times outside a doctor's roster.
 *
 * Call `assertTargetSlotFree` first: this deliberately does not fail the move,
 * because by the time it runs the appointment row is already written.
 */
export async function moveAppointmentSlot(input: {
  appointmentId: string;
  currentSlotId: string | null;
  nextDoctorId: string | null;
  nextScheduledAt: Date | null;
  slotMinutes: number | null;
}): Promise<string | null> {
  if (input.currentSlotId) {
    await releaseAppointmentSlot(input.appointmentId).catch(() => undefined);
  }
  return reclaimSlotForRescheduledAppointment(
    input.appointmentId,
    input.nextDoctorId,
    input.nextScheduledAt,
    input.slotMinutes,
  ).catch(() => null);
}
