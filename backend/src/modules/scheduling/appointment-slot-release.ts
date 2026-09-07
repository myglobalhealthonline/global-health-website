import { prisma } from "../../db/prisma.js";
import { releaseAppointmentSlot } from "../doctor-availability/doctor-availability.service.js";
import { releaseAppointmentTestSlot } from "../test-center-availability/test-center-availability.service.js";

/**
 * Release whichever slot an appointment holds, doctor or test centre.
 *
 * An appointment carries at most one of `timeSlotId` (a `DoctorTimeSlot`) and
 * `testCenterTimeSlotId` (a `TestCenterTimeSlot`), and the two live in
 * different tables with different release paths. Cancel paths call this instead
 * of either engine directly, because calling the doctor one for a test booking
 * matches nothing and returns silently — leaving the centre slot BOOKED forever
 * with no error, so the time is never resold.
 *
 * Lives in `scheduling/` rather than in either engine so neither has to import
 * the other.
 */
export async function releaseAnyAppointmentSlot(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { timeSlotId: true, testCenterTimeSlotId: true },
  });
  if (!appointment) return;
  if (appointment.timeSlotId) {
    await releaseAppointmentSlot(appointmentId);
  }
  if (appointment.testCenterTimeSlotId) {
    await releaseAppointmentTestSlot(appointmentId);
  }
}
