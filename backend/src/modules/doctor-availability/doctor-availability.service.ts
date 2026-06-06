import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import {
  calendarDayNumber,
  eachClinicLocalDay,
  isValidTimeZone,
  utcCalendarDayNumber,
  zonedWallClockToUtc,
} from "./timezone.js";

/**
 * Doctor availability + concrete time-slot service.
 *
 * Model:
 *   • `DoctorAvailability` rows describe a *recurring weekly window*
 *     (e.g. "Mon 09:00-17:00, 30 min slots"). Stored in UTC minute-of-day
 *     for the MVP — the doctor portal renders/edits in the browser's
 *     local timezone via `toLocaleString`, and we document the UTC
 *     storage so admins don't get surprised.
 *   • `DoctorTimeSlot` rows are *concrete bookable slots* derived from
 *     the windows. We lazily generate them when the public availability
 *     endpoint is hit so the DB stays tidy for doctors that don't yet
 *     get bookings.
 *
 * Atomic claim:
 *   The booking flow's `claimDoctorSlot` does a single
 *   `UPDATE … WHERE id=? AND status='OPEN'` so two patients hitting
 *   submit at the same instant can't both grab the same slot.
 */

export class SlotAlreadyTakenError extends Error {
  constructor() {
    super("This slot is no longer available. Please pick another.");
    this.name = "SlotAlreadyTakenError";
  }
}

/**
 * The timezone a doctor's availability wall-clock minutes are expressed in:
 * their clinic's `Country.bookingSetting.timezone`. This single value drives
 * both slot generation (here) and display (frontend), so "09:00" always means
 * 09:00 clinic-local to the doctor and the patient alike. Falls back to UTC
 * for doctors with no country booking setting or an unrecognized zone.
 */
export async function resolveDoctorTimeZone(doctorId: string): Promise<string> {
  const row = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      country: { select: { bookingSetting: { select: { timezone: true } } } },
    },
  });
  const tz = row?.country?.bookingSetting?.timezone;
  return tz && isValidTimeZone(tz) ? tz : "UTC";
}

/**
 * Ensure DoctorTimeSlot rows exist for every window across the requested
 * date range. Idempotent — uses `createMany({ skipDuplicates: true })`
 * against the `@@unique([doctorId, startAt])` index. Doctors with no
 * availability rows produce zero slots.
 */
export async function ensureSlotsForRange(
  doctorId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<void> {
  if (toUtc <= fromUtc) return;

  const windows = await prisma.doctorAvailability.findMany({
    where: {
      doctorId,
      isActive: true,
      OR: [
        { effectiveFrom: null, effectiveUntil: null },
        { effectiveFrom: null, effectiveUntil: { gte: fromUtc } },
        { effectiveFrom: { lte: toUtc }, effectiveUntil: null },
        { effectiveFrom: { lte: toUtc }, effectiveUntil: { gte: fromUtc } },
      ],
    },
    select: {
      weekday: true,
      startMinute: true,
      endMinute: true,
      slotDurationMinutes: true,
      effectiveFrom: true,
      effectiveUntil: true,
    },
  });
  if (windows.length === 0) return;

  const tz = await resolveDoctorTimeZone(doctorId);
  const generated: { doctorId: string; startAt: Date; endAt: Date }[] = [];

  // Iterate clinic-local calendar days (not UTC midnights). `startMinute` is
  // wall-clock in `tz`; `zonedWallClockToUtc` resolves the per-date offset so
  // DST transitions land on the right instant. Edge days are over-generated
  // (eachClinicLocalDay pads ±1) and trimmed by the fromUtc/toUtc guard below.
  for (const day of eachClinicLocalDay(fromUtc, toUtc, tz)) {
    for (const win of windows) {
      if (win.weekday !== day.weekday) continue;
      // Effective bounds are date-only ("from date → to date"); compare as
      // calendar dates so a positive-offset clinic isn't off by one at edges.
      const dayNum = calendarDayNumber(day);
      if (win.effectiveFrom && dayNum < utcCalendarDayNumber(win.effectiveFrom))
        continue;
      if (win.effectiveUntil && dayNum > utcCalendarDayNumber(win.effectiveUntil))
        continue;
      const duration = Math.max(5, win.slotDurationMinutes);
      for (
        let minute = win.startMinute;
        minute + duration <= win.endMinute;
        minute += duration
      ) {
        const startAt = zonedWallClockToUtc(day, minute, tz);
        const endAt = new Date(startAt.getTime() + duration * 60 * 1000);
        if (startAt < fromUtc || startAt >= toUtc) continue;
        generated.push({ doctorId, startAt, endAt });
      }
    }
  }

  if (generated.length === 0) return;

  try {
    await prisma.doctorTimeSlot.createMany({
      data: generated,
      skipDuplicates: true,
    });
  } catch (error) {
    throw normalizeDbError(error, "Slot generation unavailable");
  }
}

export type PublicSlot = {
  id: string;
  startAt: string;
  endAt: string;
};

export async function listOpenSlotsForDoctor(
  doctorId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<PublicSlot[]> {
  try {
    await ensureSlotsForRange(doctorId, fromUtc, toUtc);
    const rows = await prisma.doctorTimeSlot.findMany({
      where: {
        doctorId,
        status: "OPEN",
        startAt: { gte: fromUtc, lt: toUtc },
      },
      orderBy: { startAt: "asc" },
      select: { id: true, startAt: true, endAt: true },
    });
    return rows.map((r) => ({
      id: r.id,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
    }));
  } catch (error) {
    throw normalizeDbError(error, "Doctor availability is unavailable");
  }
}

/**
 * Pure overlap test. Two intervals overlap when the first starts before
 * the second ends AND ends after the second starts. Exposed for unit
 * tests of the mixed-duration generation rules.
 */
export function intervalsOverlap(
  a: { startAt: Date; endAt: Date },
  b: { startAt: Date; endAt: Date },
): boolean {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

/**
 * Mixed-duration-safe slot generation for a specific service. Same
 * shape as `ensureSlotsForRange` but the slot duration comes from the
 * service (with the doctor's recurring window as a fallback), and
 * every candidate is dropped if it would overlap an existing slot in
 * any status. That way a 30-min general slot at 09:00 and a 60-min
 * specialist slot at 09:00 can't both exist for the same doctor.
 */
export async function ensureServiceSlotsForRange(
  doctorId: string,
  serviceDurationMinutes: number | null,
  fromUtc: Date,
  toUtc: Date,
): Promise<void> {
  if (toUtc <= fromUtc) return;
  const fallback = 30;
  const desiredDuration = Math.max(5, serviceDurationMinutes ?? fallback);

  const windows = await prisma.doctorAvailability.findMany({
    where: {
      doctorId,
      isActive: true,
      OR: [
        { effectiveFrom: null, effectiveUntil: null },
        { effectiveFrom: null, effectiveUntil: { gte: fromUtc } },
        { effectiveFrom: { lte: toUtc }, effectiveUntil: null },
        { effectiveFrom: { lte: toUtc }, effectiveUntil: { gte: fromUtc } },
      ],
    },
    select: {
      weekday: true,
      startMinute: true,
      endMinute: true,
      slotDurationMinutes: true,
      effectiveFrom: true,
      effectiveUntil: true,
    },
  });
  if (windows.length === 0) return;

  const tz = await resolveDoctorTimeZone(doctorId);

  // Pre-fetch every existing slot for this doctor in the range so we
  // can run the overlap test in-process instead of hammering the DB
  // per candidate.
  const existing = await prisma.doctorTimeSlot.findMany({
    where: {
      doctorId,
      startAt: { gte: new Date(fromUtc.getTime() - 24 * 60 * 60 * 1000) },
      endAt: { lte: new Date(toUtc.getTime() + 24 * 60 * 60 * 1000) },
    },
    select: { startAt: true, endAt: true },
  });

  const generated: { doctorId: string; startAt: Date; endAt: Date }[] = [];

  // Clinic-local day iteration, DST-aware — see ensureSlotsForRange for the
  // rationale. `tz` is the doctor's clinic timezone.
  for (const day of eachClinicLocalDay(fromUtc, toUtc, tz)) {
    for (const win of windows) {
      if (win.weekday !== day.weekday) continue;
      // Effective bounds are date-only ("from date → to date"); compare as
      // calendar dates so a positive-offset clinic isn't off by one at edges.
      const dayNum = calendarDayNumber(day);
      if (win.effectiveFrom && dayNum < utcCalendarDayNumber(win.effectiveFrom))
        continue;
      if (win.effectiveUntil && dayNum > utcCalendarDayNumber(win.effectiveUntil))
        continue;
      // Service duration trumps the window's own duration when set.
      // Plan's rule: service.durationMinutes ?? availability.slotDurationMinutes ?? 30.
      const duration =
        serviceDurationMinutes != null && serviceDurationMinutes > 0
          ? desiredDuration
          : Math.max(5, win.slotDurationMinutes);
      for (
        let minute = win.startMinute;
        minute + duration <= win.endMinute;
        minute += duration
      ) {
        const startAt = zonedWallClockToUtc(day, minute, tz);
        const endAt = new Date(startAt.getTime() + duration * 60 * 1000);
        if (startAt < fromUtc || startAt >= toUtc) continue;
        // Drop the candidate if any existing slot overlaps. Pure interval
        // math — works for OPEN, HELD, BOOKED, and BLOCKED alike.
        const collides = existing.some((row) =>
          intervalsOverlap({ startAt, endAt }, row),
        );
        if (collides) continue;
        generated.push({ doctorId, startAt, endAt });
        // Track the just-added candidate so other windows on the same
        // day don't fight over the same minutes.
        existing.push({ startAt, endAt });
      }
    }
  }

  if (generated.length === 0) return;

  try {
    await prisma.doctorTimeSlot.createMany({
      data: generated,
      skipDuplicates: true,
    });
  } catch (error) {
    throw normalizeDbError(error, "Slot generation unavailable");
  }
}

/**
 * Service-scoped public availability.
 *
 * Returns any OPEN slot in the range whose duration is **at least** the
 * service's duration. The original (Phase 3) plan called for strict
 * equality, but QA caught a real case: a doctor's recurring window was
 * generated at 30 min, then the admin assigned them to a 25-min
 * service. Strict equality returned zero rows even though the doctor
 * was clearly available. The overlap guard in `ensureServiceSlotsForRange`
 * already prevents two services fighting over the same minutes, so
 * relaxing the listing filter to `≥` is safe — the patient just gets a
 * little buffer (5 min in the example) and the doctor's calendar stays
 * blocked for the slot's full length.
 *
 * If you need strict equality back (e.g. for billing systems that bill
 * by slot length), flip the comparator to `===` and regenerate
 * existing slots to match service durations.
 */
export async function listOpenSlotsForDoctorAndService(
  doctorId: string,
  serviceDurationMinutes: number | null,
  fromUtc: Date,
  toUtc: Date,
): Promise<PublicSlot[]> {
  try {
    await ensureServiceSlotsForRange(
      doctorId,
      serviceDurationMinutes,
      fromUtc,
      toUtc,
    );
    const rows = await prisma.doctorTimeSlot.findMany({
      where: {
        doctorId,
        status: "OPEN",
        startAt: { gte: fromUtc, lt: toUtc },
      },
      orderBy: { startAt: "asc" },
      select: { id: true, startAt: true, endAt: true },
    });
    const minDuration = serviceDurationMinutes ?? 0;
    return rows
      .filter((r) => {
        if (minDuration === 0) return true;
        const minutes = Math.round((r.endAt.getTime() - r.startAt.getTime()) / 60000);
        return minutes >= minDuration;
      })
      .map((r) => ({
        id: r.id,
        startAt: r.startAt.toISOString(),
        endAt: r.endAt.toISOString(),
      }));
  } catch (error) {
    throw normalizeDbError(error, "Doctor availability is unavailable");
  }
}

/**
 * Claim a slot for a booking. Atomic in one statement — the WHERE clause
 * gates on `status = 'OPEN'` AND `startAt > NOW()`, so:
 *   - a race-loser (another booking already took it) sees zero updated
 *     rows and we throw `SlotAlreadyTakenError`.
 *   - a stale past slot that somehow stayed OPEN (e.g. nobody hit the
 *     public availability endpoint to age it out) is also refused, so a
 *     hand-crafted payload can't book yesterday.
 * Caller is expected to wrap this and the appointment INSERT in the
 * same transaction.
 *
 * Pass a Prisma transaction client when calling from inside `$transaction`.
 */
export async function claimDoctorSlot(
  client: Prisma.TransactionClient,
  slotId: string,
): Promise<{ doctorId: string; startAt: Date; endAt: Date }> {
  const rows = await client.$queryRaw<
    { doctorId: string; startAt: Date; endAt: Date }[]
  >(Prisma.sql`
    UPDATE "DoctorTimeSlot"
    SET "status" = 'BOOKED', "updatedAt" = NOW()
    WHERE "id" = ${slotId} AND "status" = 'OPEN' AND "startAt" > NOW()
    RETURNING "doctorId", "startAt", "endAt"
  `);
  if (rows.length === 0) {
    throw new SlotAlreadyTakenError();
  }
  return rows[0];
}

export async function releaseDoctorSlot(slotId: string): Promise<void> {
  // Used by admin when an appointment is cancelled — return the slot to
  // OPEN unless it was BLOCKED (admin manually held).
  try {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "DoctorTimeSlot"
      SET "status" = 'OPEN', "updatedAt" = NOW()
      WHERE "id" = ${slotId} AND "status" = 'BOOKED'
    `);
  } catch (error) {
    throw normalizeDbError(error, "Doctor slot release failed");
  }
}

/**
 * Detach + release the slot currently bound to an Appointment.
 *
 * Called when:
 *   • Admin / doctor reschedules an appointment (the old slot is now
 *     a phantom booking).
 *   • Admin cancels the appointment outright.
 *
 * Idempotent: re-runs against an already-detached appointment are a
 * no-op. Returns the slot id we released (or null if nothing to do)
 * so the caller can record an audit row.
 */
export async function releaseAppointmentSlot(
  appointmentId: string,
): Promise<string | null> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { timeSlotId: true },
    });
    if (!appt?.timeSlotId) return null;
    const slotId = appt.timeSlotId;
    await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointmentId },
        data: { timeSlotId: null },
      }),
      prisma.doctorTimeSlot.updateMany({
        where: { id: slotId, status: "BOOKED" },
        data: { status: "OPEN" },
      }),
    ]);
    return slotId;
  } catch (error) {
    throw normalizeDbError(error, "Could not release booked slot");
  }
}

export type AdminAvailabilityRow = {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  slotDurationMinutes: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  isActive: boolean;
};

export async function listAdminAvailability(doctorId: string): Promise<AdminAvailabilityRow[]> {
  try {
    const rows = await prisma.doctorAvailability.findMany({
      where: { doctorId },
      orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      weekday: r.weekday,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      slotDurationMinutes: r.slotDurationMinutes,
      effectiveFrom: r.effectiveFrom ? r.effectiveFrom.toISOString() : null,
      effectiveUntil: r.effectiveUntil ? r.effectiveUntil.toISOString() : null,
      isActive: r.isActive,
    }));
  } catch (error) {
    throw normalizeDbError(error, "Doctor availability is unavailable");
  }
}

export async function createAdminAvailability(
  doctorId: string,
  input: {
    weekday: number;
    startMinute: number;
    endMinute: number;
    slotDurationMinutes?: number;
    effectiveFrom?: Date | null;
    effectiveUntil?: Date | null;
  },
): Promise<AdminAvailabilityRow> {
  try {
    const row = await prisma.doctorAvailability.create({
      data: {
        doctorId,
        weekday: input.weekday,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
        slotDurationMinutes: input.slotDurationMinutes ?? 30,
        effectiveFrom: input.effectiveFrom ?? null,
        effectiveUntil: input.effectiveUntil ?? null,
      },
    });
    return {
      id: row.id,
      weekday: row.weekday,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      slotDurationMinutes: row.slotDurationMinutes,
      effectiveFrom: row.effectiveFrom ? row.effectiveFrom.toISOString() : null,
      effectiveUntil: row.effectiveUntil ? row.effectiveUntil.toISOString() : null,
      isActive: row.isActive,
    };
  } catch (error) {
    throw normalizeDbError(error, "Doctor availability is unavailable");
  }
}

export async function patchAdminAvailability(
  doctorId: string,
  availabilityId: string,
  input: {
    weekday?: number;
    startMinute?: number;
    endMinute?: number;
    slotDurationMinutes?: number;
    effectiveFrom?: Date | null;
    effectiveUntil?: Date | null;
    isActive?: boolean;
  },
): Promise<AdminAvailabilityRow | null> {
  try {
    const existing = await prisma.doctorAvailability.findFirst({
      where: { id: availabilityId, doctorId },
      select: { id: true },
    });
    if (!existing) return null;

    const row = await prisma.doctorAvailability.update({
      where: { id: availabilityId },
      data: {
        ...(input.weekday !== undefined && { weekday: input.weekday }),
        ...(input.startMinute !== undefined && { startMinute: input.startMinute }),
        ...(input.endMinute !== undefined && { endMinute: input.endMinute }),
        ...(input.slotDurationMinutes !== undefined && {
          slotDurationMinutes: input.slotDurationMinutes,
        }),
        ...(input.effectiveFrom !== undefined && { effectiveFrom: input.effectiveFrom }),
        ...(input.effectiveUntil !== undefined && { effectiveUntil: input.effectiveUntil }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    return {
      id: row.id,
      weekday: row.weekday,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      slotDurationMinutes: row.slotDurationMinutes,
      effectiveFrom: row.effectiveFrom ? row.effectiveFrom.toISOString() : null,
      effectiveUntil: row.effectiveUntil ? row.effectiveUntil.toISOString() : null,
      isActive: row.isActive,
    };
  } catch (error) {
    throw normalizeDbError(error, "Doctor availability is unavailable");
  }
}

export async function deleteAdminAvailability(
  doctorId: string,
  availabilityId: string,
): Promise<boolean> {
  try {
    const result = await prisma.doctorAvailability.deleteMany({
      where: { id: availabilityId, doctorId },
    });
    return result.count > 0;
  } catch (error) {
    throw normalizeDbError(error, "Doctor availability is unavailable");
  }
}
