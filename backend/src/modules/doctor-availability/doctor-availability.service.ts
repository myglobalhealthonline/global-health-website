import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class SlotAlreadyTakenError extends Error {
  constructor() {
    super("This slot is no longer available. Please pick another.");
    this.name = "SlotAlreadyTakenError";
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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

  const generated: { doctorId: string; startAt: Date; endAt: Date }[] = [];
  const dayStart = startOfUtcDay(fromUtc);
  const dayEnd = startOfUtcDay(toUtc);

  for (
    let day = dayStart.getTime();
    day <= dayEnd.getTime();
    day += MS_PER_DAY
  ) {
    const dayDate = new Date(day);
    const weekday = dayDate.getUTCDay();
    for (const win of windows) {
      if (win.weekday !== weekday) continue;
      if (win.effectiveFrom && dayDate < win.effectiveFrom) continue;
      if (win.effectiveUntil && dayDate > win.effectiveUntil) continue;
      const duration = Math.max(5, win.slotDurationMinutes);
      for (
        let minute = win.startMinute;
        minute + duration <= win.endMinute;
        minute += duration
      ) {
        const startAt = new Date(dayDate.getTime() + minute * 60 * 1000);
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
 * Claim a slot for a booking. Atomic in one statement — the WHERE clause
 * gates on `status = 'OPEN'`, so a race-loser sees zero rows updated and
 * we throw `SlotAlreadyTakenError`. Caller is expected to wrap this and
 * the appointment INSERT in the same transaction.
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
    WHERE "id" = ${slotId} AND "status" = 'OPEN'
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
