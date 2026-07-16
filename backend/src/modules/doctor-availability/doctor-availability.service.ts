import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { TtlCache } from "../../lib/ttl-cache.js";
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
 * Every clinic timezone a doctor can be viewed in: their primary country's
 * `bookingSetting.timezone` first, followed by each additional country they're
 * rostered in (`Doctor.additionalCountries`). Deduped + validated. Drives the
 * doctor calendar's display-only timezone switcher — availability is still
 * authored in the primary clinic zone (`resolveDoctorTimeZone`); this just
 * lists the zones a multi-country doctor may want to *read* their day in.
 */
export async function resolveDoctorTimeZones(doctorId: string): Promise<string[]> {
  const row = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      country: { select: { bookingSetting: { select: { timezone: true } } } },
      additionalCountries: {
        select: {
          country: { select: { bookingSetting: { select: { timezone: true } } } },
        },
      },
    },
  });
  const zones: string[] = [];
  const push = (tz: string | null | undefined) => {
    if (tz && isValidTimeZone(tz) && !zones.includes(tz)) zones.push(tz);
  };
  push(row?.country?.bookingSetting?.timezone);
  for (const ac of row?.additionalCountries ?? []) {
    push(ac.country?.bookingSetting?.timezone);
  }
  if (zones.length === 0) zones.push("UTC");
  return zones;
}

/**
 * Bulk block (or unblock) a doctor's slots across a UTC range — the
 * "whole day / vacation" control on the doctor calendar.
 *
 * BLOCK: materialises slots for the range first (so a day with no concrete
 * rows yet still gets blocked), then flips every OPEN slot in [fromUtc, toUtc)
 * to BLOCKED with the given reason. BOOKED/HELD are left untouched — those are
 * real appointments/cart holds and must be cancelled through their own flow.
 *
 * UNBLOCK: flips BLOCKED slots in the range back to OPEN and clears the reason.
 * Returns the number of slots changed.
 */
export async function bulkSetSlotBlockInRange(
  doctorId: string,
  fromUtc: Date,
  toUtc: Date,
  action: "BLOCK" | "UNBLOCK",
  reason?: string | null,
): Promise<{ updated: number }> {
  if (toUtc <= fromUtc) return { updated: 0 };
  try {
    if (action === "BLOCK") {
      // Make sure recurring-window slots exist before we block the span,
      // otherwise a not-yet-materialised day would silently stay bookable.
      await ensureSlotsForRange(doctorId, fromUtc, toUtc);
      const result = await prisma.doctorTimeSlot.updateMany({
        where: {
          doctorId,
          status: "OPEN",
          startAt: { gte: fromUtc, lt: toUtc },
        },
        data: { status: "BLOCKED", blockReason: reason ?? null },
      });
      return { updated: result.count };
    }
    const result = await prisma.doctorTimeSlot.updateMany({
      where: {
        doctorId,
        status: "BLOCKED",
        startAt: { gte: fromUtc, lt: toUtc },
      },
      data: { status: "OPEN", blockReason: null },
    });
    return { updated: result.count };
  } catch (error) {
    throw normalizeDbError(error, "Could not update availability");
  }
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

  // Skip the createMany round-trip + row locks on the hot read path when every
  // generated slot already exists. Generation is deterministic for the range,
  // so once the range holds at least as many slots as we'd generate, the
  // skipDuplicates insert would be a pure no-op. `existing < generated.length`
  // still runs the write after slots are consumed/collapsed or a new window
  // widens the set.
  const existing = await prisma.doctorTimeSlot.count({
    where: { doctorId, startAt: { gte: fromUtc, lt: toUtc } },
  });
  if (existing >= generated.length) return;

  try {
    await prisma.doctorTimeSlot.createMany({
      data: generated,
      skipDuplicates: true,
    });
  } catch (error) {
    // A concurrent caller (e.g. a different service for the same doctor) may
    // have created an overlapping slot between our in-process check above
    // and this write — the DB-level exclusion constraint
    // (no_overlapping_doctor_slots) catches what the in-memory `existing`
    // array can't. Batch insert aborts entirely on one conflicting row, so
    // fall back to inserting one at a time and drop just the row(s) that
    // lost the race.
    if (isExclusionViolation(error)) {
      for (const row of generated) {
        try {
          await prisma.doctorTimeSlot.create({ data: row });
        } catch (rowError) {
          if (!isExclusionViolation(rowError)) {
            throw normalizeDbError(rowError, "Slot generation unavailable");
          }
        }
      }
      return;
    }
    throw normalizeDbError(error, "Slot generation unavailable");
  }
}

export type PublicSlot = {
  id: string;
  startAt: string;
  endAt: string;
};

/**
 * Short in-memory TTL cache for the per-doctor slot reads — same rationale +
 * TTL as the aggregated service-availability cache. Materialising N days of
 * slots per doctor is the expensive part; repeat reads while a patient
 * navigates the flow (and the aggregated path's fan-out) are served from
 * memory. Reads only — writes (claim/hold/block) are never cached. Stale reads
 * are safe: slot claim is an atomic race-safe UPDATE, so a shown-but-taken
 * slot simply fails to claim. The range is bucketed to the TTL so callers
 * passing a fresh `new Date()` each call still hit within the window.
 */
const SLOT_CACHE_TTL_MS = 45_000;
// ponytail: cap total cached ranges so a long-lived process can't grow this
// forever as more doctors/services/date-buckets get queried — oldest entry
// evicts first once the cap is hit (see TtlCache).
const SLOT_CACHE_MAX_ENTRIES = 2000;
const slotCache = new TtlCache<PublicSlot[]>(SLOT_CACHE_MAX_ENTRIES);

function slotCacheKey(
  doctorId: string,
  serviceDurationMinutes: number | null,
  fromUtc: Date,
  toUtc: Date,
): string {
  const bucket = (d: Date) => Math.floor(d.getTime() / SLOT_CACHE_TTL_MS);
  return `${doctorId}:${serviceDurationMinutes ?? "base"}:${bucket(fromUtc)}:${bucket(toUtc)}`;
}

export async function listOpenSlotsForDoctor(
  doctorId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<PublicSlot[]> {
  const cacheKey = slotCacheKey(doctorId, null, fromUtc, toUtc);
  const cached = slotCache.get(cacheKey);
  if (cached) return cached;
  try {
    await releaseExpiredHeldSlots(doctorId);
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
    const result = rows.map((r) => ({
      id: r.id,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
    }));
    slotCache.set(cacheKey, result, SLOT_CACHE_TTL_MS);
    return result;
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

/** Postgres exclusion-constraint violation (23P01) — not modeled in the Prisma schema. */
function isExclusionViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("23P01") || message.toLowerCase().includes("exclusion constraint");
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
    // A concurrent caller (e.g. a different service for the same doctor) may
    // have created an overlapping slot between our in-process check above
    // and this write — the DB-level exclusion constraint
    // (no_overlapping_doctor_slots) catches what the in-memory `existing`
    // array can't. Batch insert aborts entirely on one conflicting row, so
    // fall back to inserting one at a time and drop just the row(s) that
    // lost the race.
    if (isExclusionViolation(error)) {
      for (const row of generated) {
        try {
          await prisma.doctorTimeSlot.create({ data: row });
        } catch (rowError) {
          if (!isExclusionViolation(rowError)) {
            throw normalizeDbError(rowError, "Slot generation unavailable");
          }
        }
      }
      return;
    }
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
  opts?: {
    /**
     * Skip this doctor's per-call expired-hold release. Set by the aggregated
     * fan-out callers (service-first + GP quick-book) that release every
     * eligible doctor's expired holds in ONE batched query up front, so the
     * hot read path doesn't fire an O(doctors) release loop (P-005).
     */
    skipExpiredRelease?: boolean;
  },
): Promise<PublicSlot[]> {
  const cacheKey = slotCacheKey(doctorId, serviceDurationMinutes, fromUtc, toUtc);
  const cached = slotCache.get(cacheKey);
  if (cached) return cached;
  try {
    if (!opts?.skipExpiredRelease) {
      await releaseExpiredHeldSlots(doctorId);
    }
    await ensureSlotsForRange(doctorId, fromUtc, toUtc);
    // Fetch ALL slots (not just OPEN) so a BOOKED/BLOCKED/HELD slot correctly
    // breaks a run — a consult can't start where it wouldn't fit before the
    // next occupied slot.
    const rows = await prisma.doctorTimeSlot.findMany({
      where: { doctorId, startAt: { gte: fromUtc, lt: toUtc } },
      orderBy: { startAt: "asc" },
      select: { id: true, startAt: true, endAt: true, status: true },
    });

    const durMs = (serviceDurationMinutes ?? 0) * 60_000;
    // No service duration → every OPEN base slot is a candidate as-is.
    if (durMs <= 0) {
      const base = rows
        .filter((r) => r.status === "OPEN")
        .map((r) => ({
          id: r.id,
          startAt: r.startAt.toISOString(),
          endAt: r.endAt.toISOString(),
        }));
      slotCache.set(cacheKey, base, SLOT_CACHE_TTL_MS);
      return base;
    }

    // Sliding window: from each OPEN slot, greedily extend across contiguous
    // OPEN base slots (startAt === previous endAt) until the run covers the
    // service duration. Emit a candidate start (id = first base slot) with
    // endAt = start + service duration (the true consultation length).
    const out: PublicSlot[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].status !== "OPEN") continue;
      const startMs = rows[i].startAt.getTime();
      let coverEnd = rows[i].endAt.getTime();
      let j = i;
      while (coverEnd - startMs < durMs) {
        const next = rows[j + 1];
        if (
          !next ||
          next.status !== "OPEN" ||
          next.startAt.getTime() !== rows[j].endAt.getTime()
        ) {
          break;
        }
        j += 1;
        coverEnd = rows[j].endAt.getTime();
      }
      if (coverEnd - startMs >= durMs) {
        out.push({
          id: rows[i].id,
          startAt: rows[i].startAt.toISOString(),
          endAt: new Date(startMs + durMs).toISOString(),
        });
      }
    }
    slotCache.set(cacheKey, out, SLOT_CACHE_TTL_MS);
    return out;
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
  // Used by admin when an appointment is cancelled — return the slot's time
  // to the base grid unless it was BLOCKED (admin manually held).
  await releaseSlotsToBaseGrid([slotId]);
}

/**
 * Consume a run of consecutive OPEN base slots for a booking of length
 * `durationMinutes`, collapsing them into ONE slot of the true consultation
 * length. Base grid + consume model (DESIGN: flexible consultation durations):
 *
 *   - The day is materialised as fixed base slots (e.g. 15 min). A 45-min
 *     consult must occupy 45 min, so it consumes the three consecutive base
 *     slots [09:00,09:15,09:30] and leaves a single [09:00,09:45) row.
 *   - We EXTEND the first (start) slot's `endAt` to `start + D` and DELETE the
 *     subsumed rows. Because the exclusion constraint uses half-open
 *     `[start,end)` ranges, deleting the trailing rows BEFORE widening the
 *     first means the widened range never overlaps a live row.
 *   - The surviving row keeps the start slot's id, so `Appointment.timeSlotId`
 *     stays 1:1 and every caller keeps passing a single slot id.
 *
 * `durationMinutes` is rounded UP to a whole number of base steps (a 20-min
 * service on a 15-min grid books 30). Pass `finalStatus: "HELD"` for a cart
 * reservation (the payment webhook later flips that one row HELD→BOOKED with
 * no geometry change); `"BOOKED"` for a direct claim.
 *
 * Race-safe: rows are locked `FOR UPDATE` in ascending `startAt` order (a
 * global lock order → deadlock-free). A concurrent claim over any shared row
 * finds it gone or non-OPEN and fails validation → `SlotAlreadyTakenError`.
 * The GiST exclusion constraint is the backstop.
 *
 * Must run inside the caller's `$transaction`.
 */
async function consumeConsecutiveSlots(
  client: Prisma.TransactionClient,
  startSlotId: string,
  durationMinutes: number | null,
  finalStatus: "BOOKED" | "HELD",
): Promise<{ doctorId: string; startAt: Date; endAt: Date }> {
  try {
    // 1. Lock the start slot; must be OPEN + future.
    const startRows = await client.$queryRaw<
      { id: string; doctorId: string; startAt: Date; endAt: Date; status: string }[]
    >(Prisma.sql`
      SELECT "id", "doctorId", "startAt", "endAt", "status"
      FROM "DoctorTimeSlot"
      WHERE "id" = ${startSlotId}
      FOR UPDATE
    `);
    const start = startRows[0];
    if (!start || start.status !== "OPEN" || start.startAt <= new Date()) {
      throw new SlotAlreadyTakenError();
    }

    const baseMs = start.endAt.getTime() - start.startAt.getTime();
    // Round the requested duration up to a whole number of base steps.
    const requestedMs = Math.max(0, (durationMinutes ?? 0) * 60_000);
    const spanMs =
      requestedMs <= baseMs ? baseMs : Math.ceil(requestedMs / baseMs) * baseMs;
    const targetEnd = new Date(start.startAt.getTime() + spanMs);

    // 2. Lock the whole run in start-order.
    const run = await client.$queryRaw<
      { id: string; startAt: Date; endAt: Date; status: string }[]
    >(Prisma.sql`
      SELECT "id", "startAt", "endAt", "status"
      FROM "DoctorTimeSlot"
      WHERE "doctorId" = ${start.doctorId}
        AND "startAt" >= ${start.startAt}
        AND "startAt" < ${targetEnd}
      ORDER BY "startAt" ASC
      FOR UPDATE
    `);

    // 3. Validate: contiguous, all OPEN, exactly tiling [start, targetEnd).
    let prevEnd = start.startAt.getTime();
    for (const r of run) {
      if (r.status !== "OPEN") throw new SlotAlreadyTakenError();
      if (r.startAt.getTime() !== prevEnd) throw new SlotAlreadyTakenError();
      prevEnd = r.endAt.getTime();
    }
    if (prevEnd !== targetEnd.getTime()) {
      // Not enough contiguous OPEN base slots (a booked/blocked slot or a
      // window edge breaks the run before the consult fits).
      throw new SlotAlreadyTakenError();
    }

    // 4. Delete subsumed rows FIRST, then widen + set status on the survivor.
    const subsumed = run.filter((r) => r.id !== startSlotId).map((r) => r.id);
    if (subsumed.length > 0) {
      await client.$executeRaw(Prisma.sql`
        DELETE FROM "DoctorTimeSlot" WHERE "id" IN (${Prisma.join(subsumed)})
      `);
    }
    const updated = await client.$queryRaw<
      { doctorId: string; startAt: Date; endAt: Date }[]
    >(Prisma.sql`
      UPDATE "DoctorTimeSlot"
      SET "endAt" = ${targetEnd},
          "status" = ${finalStatus}::"DoctorSlotStatus",
          "updatedAt" = NOW()
      WHERE "id" = ${startSlotId} AND "status" = 'OPEN'
      RETURNING "doctorId", "startAt", "endAt"
    `);
    if (updated.length === 0) throw new SlotAlreadyTakenError();
    return updated[0];
  } catch (error) {
    if (error instanceof SlotAlreadyTakenError) throw error;
    if (isExclusionViolation(error)) throw new SlotAlreadyTakenError();
    throw normalizeDbError(error, "Doctor slot is no longer available");
  }
}

/** Book a run of base slots (OPEN → BOOKED) at the consultation's true length. */
export async function claimConsecutiveSlots(
  client: Prisma.TransactionClient,
  startSlotId: string,
  durationMinutes: number | null,
): Promise<{ doctorId: string; startAt: Date; endAt: Date }> {
  return consumeConsecutiveSlots(client, startSlotId, durationMinutes, "BOOKED");
}

/** Reserve a run of base slots (OPEN → HELD) for a cart/checkout hold. */
export async function holdConsecutiveSlots(
  client: Prisma.TransactionClient,
  startSlotId: string,
  durationMinutes: number | null,
): Promise<{ doctorId: string; startAt: Date; endAt: Date }> {
  return consumeConsecutiveSlots(client, startSlotId, durationMinutes, "HELD");
}

/**
 * Return one or more consumed slots (HELD or BOOKED) to the base grid: delete
 * the collapsed rows and re-materialise fresh base slots across the freed
 * spans. Replaces the old "flip status back to OPEN" — a collapsed row is a
 * single wide slot, so flipping it OPEN would leave a coarse slot that a later
 * short consult would over-book. Idempotent + safe to call with ids that no
 * longer exist or were BLOCKED (those are skipped).
 */
export async function releaseSlotsToBaseGrid(slotIds: string[]): Promise<void> {
  if (slotIds.length === 0) return;
  try {
    const rows = await prisma.doctorTimeSlot.findMany({
      where: { id: { in: slotIds }, status: { in: ["HELD", "BOOKED"] } },
      select: { id: true, doctorId: true, startAt: true, endAt: true },
    });
    if (rows.length === 0) return;
    await prisma.doctorTimeSlot.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    // Re-materialise base slots per doctor across the union of freed spans.
    const spans = new Map<string, { from: Date; to: Date }>();
    for (const r of rows) {
      const cur = spans.get(r.doctorId);
      spans.set(r.doctorId, {
        from: cur && cur.from < r.startAt ? cur.from : r.startAt,
        to: cur && cur.to > r.endAt ? cur.to : r.endAt,
      });
    }
    for (const [doctorId, span] of spans) {
      await ensureSlotsForRange(doctorId, span.from, span.to);
    }
  } catch (error) {
    throw normalizeDbError(error, "Doctor slot release failed");
  }
}

/**
 * Return slots stuck in HELD past the cart-hold grace window back to OPEN.
 * Cart holds expire after ~10 min (CartItem.heldUntil); without this sweep
 * an abandoned cart would leave its slot HELD — and therefore permanently
 * unbookable — because the public reader only surfaces OPEN slots. Run from
 * the slot readers so an expired hold is reclaimed the next time anyone
 * looks at the doctor's availability. 15-min grace stays clear of an
 * in-progress 10-min checkout.
 *
 * ONLY cart holds. A HELD slot with an Appointment behind it is a booked
 * consultation awaiting payment (admin manual booking / AI booking), whose
 * patient has until `Order.paymentDueAt` — 1h to 24h before the consult, see
 * computePrePaymentPlan — to pay. Releasing those on the 15-min cart clock
 * reopened the slot for double-booking, SetNull'd the appointment's
 * `timeSlotId` (schema: onDelete: SetNull), and left the eventual payment
 * unable to claim its own slot. Their release is owned by the pre-payment
 * deadline (`cancelPrePaymentOrder`) and the admin/doctor cancel paths.
 */
export async function releaseExpiredHeldSlots(doctorId: string): Promise<void> {
  return releaseExpiredHeldSlotsForDoctors([doctorId]);
}

/**
 * Batched form of `releaseExpiredHeldSlots`: sweep expired HELD slots for a
 * SET of doctors in ONE query instead of one query per doctor. The aggregated
 * availability readers (service-first + GP quick-book) call this once for the
 * whole eligible pool before their per-doctor slot loop, turning an
 * O(doctors) release fan-out into a single read (+ writes only for the rare
 * doctors that actually hold a stale row). `releaseSlotsToBaseGrid` already
 * groups the freed spans per doctor, so a mixed batch re-materialises each
 * doctor's base grid exactly as the single-doctor path did.
 */
export async function releaseExpiredHeldSlotsForDoctors(
  doctorIds: string[],
): Promise<void> {
  if (doctorIds.length === 0) return;
  try {
    const stale = await prisma.doctorTimeSlot.findMany({
      where: {
        doctorId: { in: doctorIds },
        status: "HELD",
        updatedAt: { lt: new Date(Date.now() - 15 * 60_000) },
        // Cart holds only — a hold carrying an appointment is a real booking
        // waiting on payment; the pre-payment deadline releases it, not us.
        appointment: { is: null },
      },
      select: { id: true },
    });
    if (stale.length === 0) return;
    // Delete the collapsed HELD rows + re-materialise base slots so the freed
    // time returns to the grid at base granularity, not as coarse rows.
    await releaseSlotsToBaseGrid(stale.map((s) => s.id));
  } catch (error) {
    throw normalizeDbError(error, "Doctor availability is unavailable");
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
    // Detach first so the 1:1 FK is clear, then return the booked slot's time
    // to the base grid (delete the collapsed row + re-materialise base slots).
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { timeSlotId: null },
    });
    await releaseSlotsToBaseGrid([slotId]);
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
        // Base grid step (default 15). Consultations consume consecutive base
        // slots to fit their real length — see consumeConsecutiveSlots.
        slotDurationMinutes: input.slotDurationMinutes ?? 15,
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
