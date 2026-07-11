import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { ensureSlotsForRange } from "../doctor-availability/doctor-availability.service.js";
import { mapAppointmentOrders } from "../orders/appointment-order-number.js";

/**
 * Admin cross-doctor calendar.
 *
 * Aggregates two things in one UTC window for the admin calendar surface:
 *   • every doctor's concrete time-slots (OPEN / BLOCKED / BOOKED / HELD)
 *   • every scheduled consultation (Appointment.scheduledAt set)
 *
 * Read-only — admins view + filter here; slot edits stay in the doctor portal
 * and the existing admin availability endpoints. Slots are materialised on
 * read (same lazy generation the doctor/public readers use) so a recurring
 * window shows even before a patient ever hits the public booking page.
 */

export type AdminCalendarSlot = {
  id: string;
  doctorId: string;
  doctorName: string;
  startAt: string;
  endAt: string;
  status: string;
  blockReason: string | null;
};

export type AdminCalendarConsultation = {
  id: string;
  doctorId: string | null;
  doctorName: string | null;
  patientName: string;
  consultationType: string;
  status: string;
  scheduledAt: string;
  meetingUrl: string | null;
  countryCode: string;
};

export type AdminCalendarPayload = {
  slots: AdminCalendarSlot[];
  consultations: AdminCalendarConsultation[];
};

export type AdminCalendarFilters = {
  fromUtc: Date;
  toUtc: Date;
  doctorId?: string | null;
  consultationType?: string | null;
  countryCode?: string | null;
};

export async function getAdminCalendar(
  filters: AdminCalendarFilters,
): Promise<AdminCalendarPayload> {
  const { fromUtc, toUtc, doctorId, consultationType, countryCode } = filters;
  try {
    // 1. Materialise recurring slots for the doctors in scope. Bounded to
    //    doctors that actually have an availability window so we don't loop
    //    over the whole roster; ensureSlotsForRange is idempotent + cheap
    //    once the rows exist.
    const doctorsInScope = await prisma.doctor.findMany({
      where: {
        availabilities: { some: {} },
        ...(doctorId ? { id: doctorId } : {}),
        ...(countryCode ? { country: { code: countryCode } } : {}),
      },
      select: { id: true },
      take: 500,
    });
    for (const d of doctorsInScope) {
      await ensureSlotsForRange(d.id, fromUtc, toUtc);
    }

    const [slotRows, apptRows] = await Promise.all([
      prisma.doctorTimeSlot.findMany({
        where: {
          startAt: { gte: fromUtc, lt: toUtc },
          ...(doctorId ? { doctorId } : {}),
          ...(countryCode ? { doctor: { country: { code: countryCode } } } : {}),
        },
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          doctorId: true,
          startAt: true,
          endAt: true,
          status: true,
          blockReason: true,
          doctor: { select: { fullName: true } },
        },
        take: 5000,
      }),
      prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: fromUtc, lt: toUtc },
          // Cancelled consultations drop off the calendar (slot already freed).
          status: { not: "CANCELLED" },
          ...(doctorId ? { doctorId } : {}),
          ...(consultationType ? { consultationType } : {}),
          ...(countryCode ? { countryCode } : {}),
        },
        orderBy: { scheduledAt: "asc" },
        select: {
          id: true,
          doctorId: true,
          fullName: true,
          consultationType: true,
          status: true,
          scheduledAt: true,
          meetingUrl: true,
          countryCode: true,
          doctor: { select: { fullName: true } },
        },
        take: 5000,
      }),
    ]);

    const orderMap = await mapAppointmentOrders(
      apptRows.filter((a) => a.scheduledAt).map((a) => a.id),
    );

    return {
      slots: slotRows.map((s) => ({
        id: s.id,
        doctorId: s.doctorId,
        doctorName: s.doctor?.fullName ?? "—",
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
        status: s.status,
        blockReason: s.blockReason,
      })),
      consultations: (() => {
        const scheduled = apptRows.filter((a) => a.scheduledAt);
        return scheduled.map((a) => ({
          id: a.id,
          doctorId: a.doctorId ?? null,
          doctorName: a.doctor?.fullName ?? null,
          patientName: a.fullName,
          consultationType: a.consultationType,
          status: a.status as string,
          scheduledAt: a.scheduledAt!.toISOString(),
          meetingUrl: a.meetingUrl,
          countryCode: a.countryCode,
          orderId: orderMap.get(a.id)?.orderId ?? null,
          orderNumber: orderMap.get(a.id)?.orderNumber ?? null,
        }));
      })(),
    };
  } catch (error) {
    throw normalizeDbError(error, "Calendar is temporarily unavailable");
  }
}
