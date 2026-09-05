import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { ensureSlotsForRange } from "../doctor-availability/doctor-availability.service.js";
import { mapAppointmentOrders } from "../orders/appointment-order-number.js";
import { resolveConsultationEndAt } from "../appointments/consultation-end.js";

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
  /** True when this consultation is still booked with a suspended doctor.
   *  Suspension hides slots but never touches existing bookings, so admin has
   *  to be able to see which ones need reassigning. */
  doctorSuspended: boolean;
  patientName: string;
  consultationType: string;
  status: string;
  scheduledAt: string;
  /** True end of the consultation. Taken from the claimed slot (the collapsed
   *  row already spans the booking's real length), falling back to the
   *  service's `durationMinutes` for appointments with no slot. Null only when
   *  neither is known — the calendar then falls back to its own default rather
   *  than drawing a wrong span. */
  endAt: string | null;
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
  /** A single country code, or `{ in: [...] }` when the caller has clamped the
   *  window to a LOCAL_ADMIN's assigned folders (AZ-1). An empty `in` list is
   *  intentional: an out-of-scope request draws an empty calendar rather than
   *  falling back to every country. */
  countryCode?: string | { in: string[] } | null;
};

export async function getAdminCalendar(
  filters: AdminCalendarFilters,
): Promise<AdminCalendarPayload> {
  const { fromUtc, toUtc, doctorId, consultationType, countryCode } = filters;
  try {
    // A doctor can serve markets beyond their primary country
    // (`additionalCountries`), and the admin doctor roster scopes that way
    // too. The calendar has to match: otherwise a doctor who is selectable in
    // the country-scoped filter would draw an empty grid.
    const doctorCountryWhere: Prisma.DoctorWhereInput | null = countryCode
      ? {
          OR: [
            { country: { code: countryCode } },
            {
              additionalCountries: {
                some: { active: true, country: { code: countryCode } },
              },
            },
          ],
        }
      : null;

    // 1. Materialise recurring slots for the doctors in scope. Bounded to
    //    doctors that actually have an availability window so we don't loop
    //    over the whole roster; ensureSlotsForRange is idempotent + cheap
    //    once the rows exist.
    const doctorsInScope = await prisma.doctor.findMany({
      where: {
        // Suspended doctors (active = false) generate no schedule and show no
        // slots. Without this the calendar both re-minted and displayed their
        // slots, so a suspended doctor still looked bookable to admin staff.
        active: true,
        availabilities: { some: {} },
        ...(doctorId ? { id: doctorId } : {}),
        ...(doctorCountryWhere ?? {}),
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
          // Hides slot rows left behind from before the doctor was suspended.
          // Generation is already gated, but the historic rows persist until
          // the purge sweeps them, and un-suspending must bring them back.
          doctor: { active: true, ...(doctorCountryWhere ?? {}) },
          ...(doctorId ? { doctorId } : {}),
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
          // Legacy-Mongo imports are historical records, not live schedule. The
          // import flattened them all to COMPLETED but kept their original
          // scheduledAt, so any that land in the viewed window would otherwise
          // draw as real consultations. They stay visible everywhere else.
          legacyMongoId: null,
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
          // `active` rides along so the calendar can mark consultations still
          // booked with a suspended doctor. They are deliberately NOT hidden —
          // a real patient holds that appointment and staff have to see it to
          // reassign or cancel it deliberately.
          doctor: { select: { fullName: true, active: true } },
          // Real consultation length: the claimed slot spans it exactly (a
          // 45-min consult collapsed its base slots into one [start,+45) row).
          // `service.durationMinutes` covers appointments booked without a slot.
          timeSlot: { select: { endAt: true } },
          service: { select: { durationMinutes: true } },
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
          doctorSuspended: a.doctor ? !a.doctor.active : false,
          patientName: a.fullName,
          consultationType: a.consultationType,
          status: a.status as string,
          scheduledAt: a.scheduledAt!.toISOString(),
          endAt: resolveConsultationEndAt(a),
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
