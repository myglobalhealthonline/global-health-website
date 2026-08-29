import { Prisma, type DoctorSlotStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { TtlCache } from "../../lib/ttl-cache.js";
import { slotOverlapsPause, type BookingPause } from "../bookability/bookability-policy.js";
import {
  invalidateAvailabilityCaches,
  registerAvailabilityCache,
} from "./availability-cache-bus.js";
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

/**
 * Product-wide base grid. Recurring windows generate on it and consultations
 * consume consecutive base slots to fit their real length, so a resize snaps to
 * it too. Mirrors the frontend's `BASE_SLOT_MINUTES`.
 */
export const BASE_SLOT_MINUTES = 15;

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

/** A half-open UTC interval the bulk operations act on. */
export type SlotSpan = { fromUtc: Date; toUtc: Date };

/** Outcome shape shared by every bulk slot operation. Partial success is the
 *  normal case — a sweep across real working days routinely covers booked
 *  time — so the caller gets counts rather than an all-or-nothing error. */
export type BulkSlotResult = {
  /** Slots actually changed (blocked, unblocked, or removed). */
  changed: number;
  /** Slots left alone because they are BOOKED or HELD. */
  skippedOccupied: number;
  /** Ids that matched no slot of this doctor (only meaningful for id-based calls). */
  skippedMissing: number;
};

/**
 * Bulk block (or unblock) a doctor's slots across a UTC range — the
 * "whole day / vacation" control on the doctor calendar.
 *
 * Thin wrapper over `bulkSetSlotBlockInSpans` for the single-span callers.
 */
export async function bulkSetSlotBlockInRange(
  doctorId: string,
  fromUtc: Date,
  toUtc: Date,
  action: "BLOCK" | "UNBLOCK",
  reason?: string | null,
): Promise<{ updated: number }> {
  const result = await bulkSetSlotBlockInSpans(
    doctorId,
    [{ fromUtc, toUtc }],
    action,
    reason,
  );
  return { updated: result.changed };
}

/**
 * Block (or unblock) every eligible slot inside each of the given UTC spans.
 *
 * A list of spans rather than one range because the UI collects a date range
 * PLUS a daily time range ("09:00–13:00, Mon to Fri"). Flattening that into a
 * single Mon-09:00 → Fri-13:00 interval would also swallow the nights and the
 * afternoons in between, so the caller — which owns the display timezone —
 * expands it into one span per day and sends them together.
 *
 * BLOCK materialises the recurring-window slots for each span first, otherwise
 * a day whose rows do not exist yet would silently stay bookable. BOOKED/HELD
 * are never touched: those are real appointments and cart holds, and they come
 * back in `skippedOccupied` so the UI can say so.
 */
export async function bulkSetSlotBlockInSpans(
  doctorId: string,
  spans: SlotSpan[],
  action: "BLOCK" | "UNBLOCK",
  reason?: string | null,
): Promise<BulkSlotResult> {
  const valid = spans.filter((s) => s.toUtc > s.fromUtc);
  if (valid.length === 0) {
    return { changed: 0, skippedOccupied: 0, skippedMissing: 0 };
  }

  try {
    if (action === "BLOCK") {
      for (const span of valid) {
        await ensureSlotsForRange(doctorId, span.fromUtc, span.toUtc);
      }
    }

    const where = {
      doctorId,
      OR: valid.map((s) => ({ startAt: { gte: s.fromUtc, lt: s.toUtc } })),
    };
    const skippedOccupied = await prisma.doctorTimeSlot.count({
      where: { ...where, status: { in: ["BOOKED", "HELD"] } },
    });

    const result = await prisma.doctorTimeSlot.updateMany({
      where: { ...where, status: action === "BLOCK" ? "OPEN" : "BLOCKED" },
      data:
        action === "BLOCK"
          ? { status: "BLOCKED", blockReason: reason?.trim() || null }
          : { status: "OPEN", blockReason: null },
    });

    // Inventory changed either way — an unblocked slot must become bookable now,
    // not after the read cache's TTL.
    invalidateAvailabilityCaches();
    return { changed: result.count, skippedOccupied, skippedMissing: 0 };
  } catch (error) {
    throw normalizeDbError(error, "Could not update availability");
  }
}

/**
 * Remove every eligible slot inside the given UTC spans, permanently.
 *
 * The batch twin of `removeSlotForDate`: deleting rows alone does not stick,
 * because the generators re-materialise slots from the recurring windows on the
 * next availability read. Each removed span is therefore also written as a
 * `DoctorAvailabilityException`. The weekly windows themselves are untouched.
 */
export async function bulkRemoveSlotsInSpans(
  doctorId: string,
  spans: SlotSpan[],
  reason?: string | null,
): Promise<BulkSlotResult> {
  const valid = spans.filter((s) => s.toUtc > s.fromUtc);
  if (valid.length === 0) {
    return { changed: 0, skippedOccupied: 0, skippedMissing: 0 };
  }

  try {
    const where = {
      doctorId,
      OR: valid.map((s) => ({ startAt: { gte: s.fromUtc, lt: s.toUtc } })),
    };
    const rows = await prisma.doctorTimeSlot.findMany({
      where,
      select: { id: true, status: true, startAt: true, endAt: true },
    });
    const removable = rows.filter(
      (r) => r.status === "OPEN" || r.status === "BLOCKED",
    );
    const skippedOccupied = rows.length - removable.length;
    if (removable.length === 0) {
      return { changed: 0, skippedOccupied, skippedMissing: 0 };
    }

    const changed = await deleteSlotsWithExceptions(doctorId, removable, reason);
    invalidateAvailabilityCaches();
    return { changed, skippedOccupied, skippedMissing: 0 };
  } catch (error) {
    throw normalizeDbError(error, "Could not remove slots");
  }
}

/**
 * Block / unblock / remove an explicit set of slots — what the calendar's
 * multi-select posts. Ids are scoped by `doctorId` in the query, so one
 * doctor's slot id can never mutate another doctor's calendar even if the
 * caller is authorized for both.
 */
export async function bulkSlotActionByIds(
  doctorId: string,
  slotIds: string[],
  action: "BLOCK" | "UNBLOCK" | "REMOVE",
  reason?: string | null,
): Promise<BulkSlotResult> {
  const ids = [...new Set(slotIds)];
  if (ids.length === 0) {
    return { changed: 0, skippedOccupied: 0, skippedMissing: 0 };
  }

  try {
    const rows = await prisma.doctorTimeSlot.findMany({
      where: { id: { in: ids }, doctorId },
      select: { id: true, status: true, startAt: true, endAt: true },
    });
    const skippedMissing = ids.length - rows.length;
    const eligible = rows.filter(
      (r) => r.status === "OPEN" || r.status === "BLOCKED",
    );
    const skippedOccupied = rows.length - eligible.length;
    if (eligible.length === 0) {
      return { changed: 0, skippedOccupied, skippedMissing };
    }

    if (action === "REMOVE") {
      const changed = await deleteSlotsWithExceptions(doctorId, eligible, reason);
      invalidateAvailabilityCaches();
      return { changed, skippedOccupied, skippedMissing };
    }

    // Re-assert the source status in the filter: a slot already in the target
    // state isn't a change, and a booking that landed since the read above must
    // not be flipped.
    const result = await prisma.doctorTimeSlot.updateMany({
      where: {
        id: { in: eligible.map((r) => r.id) },
        doctorId,
        status: action === "BLOCK" ? "OPEN" : "BLOCKED",
      },
      data:
        action === "BLOCK"
          ? { status: "BLOCKED", blockReason: reason?.trim() || null }
          : { status: "OPEN", blockReason: null },
    });

    invalidateAvailabilityCaches();
    return { changed: result.count, skippedOccupied, skippedMissing };
  } catch (error) {
    throw normalizeDbError(error, "Could not update slots");
  }
}

/**
 * Dispatcher behind both bulk endpoints (doctor-scoped and admin-scoped), so
 * the two routes differ only in how they establish the doctor. Takes the
 * request body as parsed by the shared zod schema — ISO strings in, counts out.
 */
export async function runBulkSlotAction(
  doctorId: string,
  input: {
    action: "BLOCK" | "UNBLOCK" | "REMOVE";
    spans?: { fromUtc: string; toUtc: string }[];
    slotIds?: string[];
    reason?: string;
  },
): Promise<BulkSlotResult> {
  if (input.slotIds) {
    return bulkSlotActionByIds(doctorId, input.slotIds, input.action, input.reason);
  }
  const spans: SlotSpan[] = (input.spans ?? []).map((s) => ({
    fromUtc: new Date(s.fromUtc),
    toUtc: new Date(s.toUtc),
  }));
  return input.action === "REMOVE"
    ? bulkRemoveSlotsInSpans(doctorId, spans, input.reason)
    : bulkSetSlotBlockInSpans(doctorId, spans, input.action, input.reason);
}

/**
 * Delete slots and tombstone their spans in one transaction. Shared by the two
 * bulk removal paths; the exception rows are what stop `ensureSlotsForRange`
 * putting the slots straight back.
 */
async function deleteSlotsWithExceptions(
  doctorId: string,
  slots: { id: string; startAt: Date; endAt: Date }[],
  reason?: string | null,
): Promise<number> {
  const note = reason?.trim() || null;
  return prisma.$transaction(async (tx) => {
    // Exceptions first: if the delete loses a race the hole is already recorded.
    await tx.doctorAvailabilityException.deleteMany({
      where: { doctorId, startAt: { in: slots.map((s) => s.startAt) } },
    });
    await tx.doctorAvailabilityException.createMany({
      data: slots.map((s) => ({
        doctorId,
        startAt: s.startAt,
        endAt: s.endAt,
        reason: note,
      })),
      skipDuplicates: true,
    });
    // Status re-asserted here too — a booking claimed between the read and now
    // keeps its slot rather than losing it to a stale sweep.
    const deleted = await tx.doctorTimeSlot.deleteMany({
      where: {
        id: { in: slots.map((s) => s.id) },
        doctorId,
        status: { in: ["OPEN", "BLOCKED"] },
      },
    });
    return deleted.count;
  });
}

/**
 * Which generated candidates are not already on the calendar, by start instant.
 *
 * Extracted and exported for the regression test: this used to be a COUNT
 * comparison ("the range already holds as many slots as we'd generate, so skip
 * the insert"), which quietly assumed the existing rows were always a subset of
 * the candidates. A doctor with leftover BLOCKED slots from a deleted window
 * breaks that assumption — the leftovers out-number the new window's
 * candidates, generation skips the write, and the new window produces nothing.
 */
export function selectMissingSlots<T extends { startAt: Date }>(
  generated: T[],
  existingStarts: Date[],
): T[] {
  const taken = new Set(existingStarts.map((d) => d.getTime()));
  return generated.filter((g) => !taken.has(g.startAt.getTime()));
}

/**
 * Single-date holes in the recurring windows (`DoctorAvailabilityException`).
 * Loaded with a ±1 day pad so a candidate that starts just outside the queried
 * range but overlaps an exception is still dropped.
 */
async function listAvailabilityExceptions(
  doctorId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<{ startAt: Date; endAt: Date }[]> {
  const pad = 24 * 60 * 60 * 1000;
  return prisma.doctorAvailabilityException.findMany({
    where: {
      doctorId,
      startAt: { gte: new Date(fromUtc.getTime() - pad) },
      endAt: { lte: new Date(toUtc.getTime() + pad) },
    },
    select: { startAt: true, endAt: true },
  });
}

/**
 * Add slots at explicit instants, independent of the recurring weekly windows.
 *
 * The admin picks a date range and a daily time range; the UI expands that into
 * the concrete instants (it owns the display timezone) and hands them here. Rows
 * are flagged `isAdHoc` so the "window changed → drop stale future OPEN slots"
 * sweeps leave them alone: nothing derives them, so a sweep would delete them
 * for good. Any `DoctorAvailabilityException` covering an added span is cleared
 * too — adding a slot back where one was removed is the admin undoing that.
 *
 * Partial success is the point: a range almost always crosses times the doctor
 * already has slots for, and failing the whole request over one collision would
 * make the feature unusable. Clashes and past instants are skipped and counted,
 * never an error.
 */
export async function createAdHocSlots(
  doctorId: string,
  startAts: Date[],
  durationMinutes: number,
): Promise<{ created: number; skippedOverlap: number; skippedPast: number }> {
  const durationMs = durationMinutes * 60 * 1000;
  const now = Date.now();

  // Dedupe identical instants (a caller expanding overlapping ranges) and sort
  // so the in-memory overlap test below sees them in time order.
  const unique = [...new Map(startAts.map((d) => [d.getTime(), d])).values()].sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  const future = unique.filter((d) => d.getTime() > now);
  const skippedPast = unique.length - future.length;
  if (future.length === 0) return { created: 0, skippedOverlap: 0, skippedPast };

  const rangeStart = future[0];
  const rangeEnd = new Date(future[future.length - 1].getTime() + durationMs);

  try {
    // One read for the whole span instead of a query per candidate. Every
    // status counts: a BOOKED consultation blocks an add just as an OPEN slot
    // does.
    const occupied = await prisma.doctorTimeSlot.findMany({
      where: {
        doctorId,
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      select: { startAt: true, endAt: true },
    });

    const accepted: { doctorId: string; startAt: Date; endAt: Date; isAdHoc: true }[] = [];
    for (const startAt of future) {
      const endAt = new Date(startAt.getTime() + durationMs);
      if (occupied.some((row) => intervalsOverlap({ startAt, endAt }, row))) continue;
      accepted.push({ doctorId, startAt, endAt, isAdHoc: true });
      // Track it so two candidates in the same request can't overlap each other
      // (a caller passing a step shorter than the duration).
      occupied.push({ startAt, endAt });
    }
    const skippedOverlap = future.length - accepted.length;
    if (accepted.length === 0) return { created: 0, skippedOverlap, skippedPast };

    const created = await prisma.$transaction(async (tx) => {
      await tx.doctorAvailabilityException.deleteMany({
        where: {
          doctorId,
          OR: accepted.map((row) => ({
            startAt: { lt: row.endAt },
            endAt: { gt: row.startAt },
          })),
        },
      });
      const result = await tx.doctorTimeSlot.createMany({
        data: accepted,
        skipDuplicates: true,
      });
      return result.count;
    });

    // New bookable slots must show up in public listings now, not after the
    // read cache's TTL.
    invalidateAvailabilityCaches();
    return { created, skippedOverlap, skippedPast };
  } catch (error) {
    // Lost a race against a concurrent write the pre-flight read missed. The
    // batch insert aborts entirely on one conflicting row, so fall back to
    // inserting one at a time and count the losers as skipped.
    if (isExclusionViolation(error) || isUniqueViolation(error)) {
      return createAdHocSlotsOneByOne(doctorId, future, durationMs, skippedPast);
    }
    throw normalizeDbError(error, "Could not add slots");
  }
}

/** Row-at-a-time fallback for `createAdHocSlots` when the batch lost a race. */
async function createAdHocSlotsOneByOne(
  doctorId: string,
  startAts: Date[],
  durationMs: number,
  skippedPast: number,
): Promise<{ created: number; skippedOverlap: number; skippedPast: number }> {
  let created = 0;
  let skippedOverlap = 0;
  for (const startAt of startAts) {
    const endAt = new Date(startAt.getTime() + durationMs);
    try {
      await prisma.$transaction(async (tx) => {
        await tx.doctorAvailabilityException.deleteMany({
          where: { doctorId, startAt: { lt: endAt }, endAt: { gt: startAt } },
        });
        await tx.doctorTimeSlot.create({
          data: { doctorId, startAt, endAt, status: "OPEN", isAdHoc: true },
        });
      });
      created += 1;
    } catch (rowError) {
      if (isExclusionViolation(rowError) || isUniqueViolation(rowError)) {
        skippedOverlap += 1;
        continue;
      }
      throw normalizeDbError(rowError, "Could not add slots");
    }
  }
  invalidateAvailabilityCaches();
  return { created, skippedOverlap, skippedPast };
}

/**
 * Resize an OPEN/BLOCKED slot on the base grid. The start never moves.
 *
 * Lengthening swallows the following slots up to the new end: they must all be
 * OPEN or BLOCKED, because a BOOKED/HELD slot in the way is a real appointment
 * or a live cart hold. Shortening releases the freed tail back into base-grid
 * slots carrying the same status (and `isAdHoc`) as the slot they came from, so
 * a shrunk BLOCKED slot doesn't quietly re-open the time it gave up.
 *
 * Any `DoctorAvailabilityException` inside the new span is cleared: explicitly
 * extending over a previously-removed time is the admin overriding that removal.
 */
export async function resizeSlot(
  doctorId: string,
  slotId: string,
  durationMinutes: number,
): Promise<
  | { ok: true; slot: { id: string; startAt: Date; endAt: Date } }
  | { ok: false; code: "NOT_FOUND" | "OCCUPIED" | "BLOCKED_BY_BOOKING" }
> {
  const durationMs = durationMinutes * 60 * 1000;
  try {
    const slot = await prisma.doctorTimeSlot.findFirst({
      where: { id: slotId, doctorId },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        blockReason: true,
        isAdHoc: true,
      },
    });
    if (!slot) return { ok: false, code: "NOT_FOUND" };
    if (slot.status !== "OPEN" && slot.status !== "BLOCKED") {
      return { ok: false, code: "OCCUPIED" };
    }

    const newEnd = new Date(slot.startAt.getTime() + durationMs);
    if (newEnd.getTime() === slot.endAt.getTime()) {
      return { ok: true, slot: { id: slot.id, startAt: slot.startAt, endAt: slot.endAt } };
    }

    // Everything the resize touches, in one read: the slots between the old and
    // new end (absorbed when growing, irrelevant when shrinking).
    const neighbours = await prisma.doctorTimeSlot.findMany({
      where: {
        doctorId,
        id: { not: slot.id },
        startAt: { lt: newEnd },
        endAt: { gt: slot.startAt },
      },
      select: { id: true, status: true },
    });
    if (neighbours.some((n) => n.status !== "OPEN" && n.status !== "BLOCKED")) {
      return { ok: false, code: "BLOCKED_BY_BOOKING" };
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (neighbours.length > 0) {
        await tx.doctorTimeSlot.deleteMany({
          where: { id: { in: neighbours.map((n) => n.id) } },
        });
      }
      await tx.doctorAvailabilityException.deleteMany({
        where: { doctorId, startAt: { lt: newEnd }, endAt: { gt: slot.startAt } },
      });
      const row = await tx.doctorTimeSlot.update({
        where: { id: slot.id },
        data: { endAt: newEnd },
        select: { id: true, startAt: true, endAt: true },
      });

      // Shrinking: hand the tail back as base-grid slots rather than leaving a
      // hole only a recurring window could refill (an ad-hoc slot has none).
      if (newEnd < slot.endAt) {
        const freed: {
          doctorId: string;
          startAt: Date;
          endAt: Date;
          status: DoctorSlotStatus;
          blockReason: string | null;
          isAdHoc: boolean;
        }[] = [];
        const stepMs = BASE_SLOT_MINUTES * 60 * 1000;
        for (
          let t = newEnd.getTime();
          t + stepMs <= slot.endAt.getTime();
          t += stepMs
        ) {
          freed.push({
            doctorId,
            startAt: new Date(t),
            endAt: new Date(t + stepMs),
            status: slot.status,
            blockReason: slot.blockReason,
            isAdHoc: slot.isAdHoc,
          });
        }
        if (freed.length > 0) {
          await tx.doctorTimeSlot.createMany({ data: freed, skipDuplicates: true });
        }
      }
      return row;
    });

    invalidateAvailabilityCaches();
    return { ok: true, slot: updated };
  } catch (error) {
    if (isExclusionViolation(error) || isUniqueViolation(error)) {
      return { ok: false, code: "BLOCKED_BY_BOOKING" };
    }
    throw normalizeDbError(error, "Could not resize slot");
  }
}

/**
 * Remove ONE concrete slot for ONE date, permanently.
 *
 * Deleting the row alone would not stick — the generators re-materialise slots
 * from the recurring windows on every availability read — so this also writes a
 * `DoctorAvailabilityException` for the slot's exact span. The weekly window is
 * left completely untouched: the same weekday next week still generates.
 *
 * Only OPEN/BLOCKED slots can go: BOOKED/HELD carry a real appointment or a
 * live cart hold and must be cancelled through their own flow first.
 */
export async function removeSlotForDate(
  doctorId: string,
  slotId: string,
  reason?: string | null,
): Promise<
  | { ok: true; startAt: Date; endAt: Date }
  | { ok: false; code: "NOT_FOUND" | "OCCUPIED" }
> {
  try {
    const slot = await prisma.doctorTimeSlot.findFirst({
      where: { id: slotId, doctorId },
      select: { id: true, status: true, startAt: true, endAt: true },
    });
    if (!slot) return { ok: false, code: "NOT_FOUND" };
    if (slot.status !== "OPEN" && slot.status !== "BLOCKED") {
      return { ok: false, code: "OCCUPIED" };
    }

    await prisma.$transaction(async (tx) => {
      // Exception first, then the delete: if the transaction is retried or the
      // delete races another writer, the hole is already recorded and the slot
      // can't come back.
      await tx.doctorAvailabilityException.upsert({
        where: { doctorId_startAt: { doctorId, startAt: slot.startAt } },
        create: {
          doctorId,
          startAt: slot.startAt,
          endAt: slot.endAt,
          reason: reason?.trim() || null,
        },
        update: { endAt: slot.endAt, reason: reason?.trim() || null },
      });
      // Re-assert the status in the delete filter: a booking could have claimed
      // the slot between the read above and here, and a paid appointment must
      // never lose its slot to a stale Remove click.
      const deleted = await tx.doctorTimeSlot.deleteMany({
        where: { id: slot.id, doctorId, status: { in: ["OPEN", "BLOCKED"] } },
      });
      if (deleted.count === 0) throw new SlotAlreadyTakenError();
    });

    // The read caches key on doctor + date bucket, so a removed slot would
    // linger in a public listing for up to the TTL otherwise.
    invalidateAvailabilityCaches();
    return { ok: true, startAt: slot.startAt, endAt: slot.endAt };
  } catch (error) {
    if (error instanceof SlotAlreadyTakenError) return { ok: false, code: "OCCUPIED" };
    throw normalizeDbError(error, "Could not remove slot");
  }
}

/**
 * Every base-grid slot the doctor's recurring windows justify in
 * [fromUtc, toUtc) — the single definition of "a window-derived slot".
 *
 * Shared by generation (`ensureSlotsForRange`) and the window-change reconcile
 * (`reconcileWindowDerivedSlots`) on purpose: if the two computed candidates
 * independently they could disagree, and a slot neither side claimed would
 * either be deleted while still legitimate or linger while orphaned.
 */
async function windowSlotCandidates(
  doctorId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<{ doctorId: string; startAt: Date; endAt: Date }[]> {
  if (toUtc <= fromUtc) return [];

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
  if (windows.length === 0) return [];

  const tz = await resolveDoctorTimeZone(doctorId);
  // Admin-removed single dates. A candidate overlapping one of these is never
  // re-created, which is the whole point of the exception row.
  const exceptions = await listAvailabilityExceptions(doctorId, fromUtc, toUtc);
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
        if (exceptions.some((ex) => intervalsOverlap({ startAt, endAt }, ex))) {
          continue;
        }
        generated.push({ doctorId, startAt, endAt });
      }
    }
  }
  return generated;
}

/**
 * How far ahead a window change reconciles. Windows recur forever, so the sweep
 * needs a horizon; a year matches the frontend bulk tools' `MAX_RANGE_DAYS` and
 * covers every range the portal or a patient can browse to.
 */
export const WINDOW_SWEEP_HORIZON_DAYS = 366;

/**
 * How far ahead a window change materialises slots up front.
 *
 * Generation is otherwise lazy — a range only gets rows when something reads
 * it. That is fine for the booking flow (every read generates first) but it
 * means a doctor who adds a weekly window has slots ONLY for the weeks somebody
 * has since opened. Step the calendar to an unvisited week and it draws empty
 * under an ACTIVE window, which is indistinguishable from a bug and is exactly
 * the "my availability skipped a week" report. Pre-generating removes the
 * dependency on who browsed what.
 *
 * 120 days matches the calendar routes' own `MAX_RANGE_MS` clamp: no view can
 * request further out than this, so anything a doctor or patient can navigate to
 * is already materialised. Beyond it, the lazy path still covers reads.
 */
export const WINDOW_PREGENERATE_DAYS = 120;

/** What a generation pass actually wrote. See `ensureSlotsForRange`. */
export type GenerationResult = { created: number; skippedOverlap: number };

/**
 * `Doctor.active = false` is the platform's single suspension switch: it hides
 * the doctor from every public surface, blocks their login, and — through this
 * check — stops their schedule existing at all.
 *
 * A missing row is treated as suspended: if we cannot prove the doctor is
 * active, minting bookable slots for them is the worse failure.
 */
export async function isDoctorSuspended(doctorId: string): Promise<boolean> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { active: true },
  });
  return !doctor?.active;
}

/**
 * Materialise (and reconcile) a doctor's slots after their windows changed.
 *
 * Order matters: reconcile first so stale rows can't occupy a start instant the
 * new shape needs — `selectMissingSlots` keys on the start, so a leftover row
 * there would make the fresh candidate look already-present and the new window
 * would generate nothing at that time. Then generate forward.
 *
 * Never throws: a window edit that succeeded must not report failure because
 * materialisation hiccupped, and the lazy read path regenerates regardless.
 */
async function refreshWindowSlots(doctorId: string): Promise<GenerationResult> {
  try {
    await reconcileWindowDerivedSlots(doctorId);
    const now = new Date();
    return await ensureSlotsForRange(
      doctorId,
      now,
      new Date(now.getTime() + WINDOW_PREGENERATE_DAYS * 24 * 60 * 60 * 1000),
    );
  } catch {
    return { created: 0, skippedOverlap: 0 };
  }
}

/**
 * Existing slots no window justifies any more. Two rules, because the two
 * statuses cost very different things to get wrong.
 *
 * OPEN — matched on the EXACT span. Comparing `endAt` as well as `startAt`
 * catches duration drift: a legacy 30-min slot at 09:00 shares its start with a
 * 15-min candidate at 09:00, so a start-only match would keep the coarse row,
 * and the 09:15 candidate would then die on the overlap exclusion constraint,
 * leaving the doctor on a grid their window no longer describes. Deleting a
 * live OPEN slot is cheap: generation re-mints it on the next read.
 *
 * BLOCKED — kept if it OVERLAPS any candidate at all, span mismatch included.
 * A block is the doctor saying "I am busy then", and it does not come back:
 * regeneration only ever mints OPEN. Applying the exact-span rule here would
 * mean any window whose step drifted turned the doctor's busy marks into
 * bookable time on the next window edit — the same silent-loss bug this sweep
 * exists to prevent, pointed at the doctor instead. Only a block that overlaps
 * NO live window is a true orphan, and those are what this deletes.
 */
export function selectStaleSlots<
  T extends { startAt: Date; endAt: Date; status?: DoctorSlotStatus },
>(existing: T[], candidates: { startAt: Date; endAt: Date }[]): T[] {
  const span = (s: { startAt: Date; endAt: Date }) =>
    `${s.startAt.getTime()}:${s.endAt.getTime()}`;
  const owned = new Set(candidates.map(span));
  return existing.filter((e) => {
    if (e.status === "BLOCKED") {
      return !candidates.some((c) => intervalsOverlap(e, c));
    }
    return !owned.has(span(e));
  });
}

/**
 * Reconcile a doctor's future slots against their CURRENT windows — run after
 * any window is changed, paused, or deleted.
 *
 * Slot rows are materialised, not derived at read time, so a window that moves
 * (Fri → Mon), narrows, or disappears leaves its old slots behind. Those rows
 * are unreachable from the UI's "Weekly windows" list, no generator can ever
 * re-derive them, and an OPEN one is still bookable by a patient — a booking on
 * a day the doctor no longer works.
 *
 * What survives, and why:
 *   • BOOKED / HELD — a real appointment or a live cart hold. Never touched
 *     here; those go through cancellation.
 *   • `isAdHoc` — added for one specific date, with no window behind it. There
 *     is nothing to reconcile against, so the sweep must not judge them.
 *   • OPEN / BLOCKED whose exact span a live window still generates. A BLOCKED
 *     slot inside live hours is the doctor deliberately marking themselves busy
 *     and is left exactly as it is.
 *
 * Everything else in the horizon goes. Regeneration stays lazy: the next range
 * read calls `ensureSlotsForRange`, which re-mints from the new shape.
 */
export async function reconcileWindowDerivedSlots(
  doctorId: string,
  now: Date = new Date(),
): Promise<number> {
  try {
    const horizonEnd = new Date(
      now.getTime() + WINDOW_SWEEP_HORIZON_DAYS * 24 * 60 * 60 * 1000,
    );
    const [candidates, existing] = await Promise.all([
      windowSlotCandidates(doctorId, now, horizonEnd),
      prisma.doctorTimeSlot.findMany({
        where: {
          doctorId,
          status: { in: ["OPEN", "BLOCKED"] },
          isAdHoc: false,
          startAt: { gte: now, lt: horizonEnd },
        },
        // `status` drives which staleness rule applies — see selectStaleSlots.
        select: { id: true, startAt: true, endAt: true, status: true },
      }),
    ]);
    const stale = selectStaleSlots(existing, candidates);
    if (stale.length === 0) return 0;

    // Re-assert status in the delete filter: a patient could have claimed one of
    // these between the read and here, and a paid appointment must never lose
    // its slot to a window edit.
    const deleted = await prisma.doctorTimeSlot.deleteMany({
      where: {
        id: { in: stale.map((s) => s.id) },
        doctorId,
        status: { in: ["OPEN", "BLOCKED"] },
      },
    });
    invalidateAvailabilityCaches();
    return deleted.count;
  } catch (error) {
    throw normalizeDbError(error, "Could not reconcile doctor slots");
  }
}

/**
 * Ensure DoctorTimeSlot rows exist for every window across the requested
 * date range. Idempotent — uses `createMany({ skipDuplicates: true })`
 * against the `@@unique([doctorId, startAt])` index. Doctors with no
 * availability rows produce zero slots. Spans carrying a
 * `DoctorAvailabilityException` are skipped, which is what makes an admin's
 * one-off slot removal permanent.
 *
 * Returns what it did. `skippedOverlap` is the important one: candidates the
 * exclusion constraint refused are dropped rather than raised (a booked slot
 * legitimately occupies the span), so without a count in the return the caller
 * has no way to tell "generated a full week" from "generated nothing, silently".
 */
export async function ensureSlotsForRange(
  doctorId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<GenerationResult> {
  if (toUtc <= fromUtc) return { created: 0, skippedOverlap: 0 };
  // A suspended doctor generates nothing. This is the gate that makes
  // suspension stick: slot rows are re-minted on every availability read, so
  // deleting them elsewhere only lasts until the next admin or patient view.
  // Their availability windows are left intact so un-suspending restores the
  // schedule exactly as it was.
  if (await isDoctorSuspended(doctorId)) return { created: 0, skippedOverlap: 0 };

  const generated = await windowSlotCandidates(doctorId, fromUtc, toUtc);
  if (generated.length === 0) return { created: 0, skippedOverlap: 0 };

  // Insert only the candidates that are genuinely missing, and skip the write
  // entirely when none are.
  //
  // This used to compare COUNTS — "the range already holds at least as many
  // slots as we'd generate, so the insert would be a no-op". That assumed the
  // existing rows are always a subset of the candidates, which breaks the
  // moment the two sets don't line up: a doctor with a week of BLOCKED slots
  // left over from an old window adds a new window, the leftovers out-number
  // the new candidates, and generation silently does nothing — the window is
  // listed but produces no slots, forever. Comparing the actual instants costs
  // one column instead of a count and cannot be fooled that way.
  const existingRows = await prisma.doctorTimeSlot.findMany({
    where: { doctorId, startAt: { gte: fromUtc, lt: toUtc } },
    select: { startAt: true },
  });
  const missing = selectMissingSlots(
    generated,
    existingRows.map((r) => r.startAt),
  );
  if (missing.length === 0) return { created: 0, skippedOverlap: 0 };

  try {
    await prisma.doctorTimeSlot.createMany({
      data: missing,
      skipDuplicates: true,
    });
    return { created: missing.length, skippedOverlap: 0 };
  } catch (error) {
    // A concurrent caller may have created an overlapping slot between the
    // in-process check above and this write, and a longer existing slot can
    // overlap a candidate without sharing its start — either way the DB-level
    // exclusion constraint (no_overlapping_doctor_slots) catches it. A batch
    // insert aborts entirely on one conflicting row, so fall back to inserting
    // one at a time and drop just the losers.
    if (isExclusionViolation(error)) {
      let created = 0;
      let skippedOverlap = 0;
      for (const row of missing) {
        try {
          await prisma.doctorTimeSlot.create({ data: row });
          created += 1;
        } catch (rowError) {
          if (!isExclusionViolation(rowError) && !isUniqueViolation(rowError)) {
            throw normalizeDbError(rowError, "Slot generation unavailable");
          }
          skippedOverlap += 1;
        }
      }
      return { created, skippedOverlap };
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
const slotReadsInFlight = new Map<string, Promise<PublicSlot[]>>();
type DoctorSlotInventory = {
  rows: Array<{
    id: string;
    startAt: Date;
    endAt: Date;
    status: DoctorSlotStatus;
  }>;
  pause: BookingPause | null;
};
const slotInventoryCache = new TtlCache<DoctorSlotInventory>(SLOT_CACHE_MAX_ENTRIES);
const slotInventoryReadsInFlight = new Map<string, Promise<DoctorSlotInventory>>();
const expiredHoldSweepCache = new TtlCache<true>(SLOT_CACHE_MAX_ENTRIES);
const expiredHoldSweepsInFlight = new Map<string, Promise<void>>();
let slotCacheGeneration = 0;
// Any write that changes inventory clears every availability cache, not just
// this one — see availability-cache-bus.
registerAvailabilityCache(() => {
  slotCacheGeneration += 1;
  slotReadsInFlight.clear();
  slotInventoryReadsInFlight.clear();
  expiredHoldSweepsInFlight.clear();
  slotCache.clear();
  slotInventoryCache.clear();
  expiredHoldSweepCache.clear();
});

async function loadDoctorBookingPause(doctorId: string): Promise<BookingPause | null> {
  return prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { bookingPausedFrom: true, bookingPausedUntil: true },
  });
}

/**
 * The slot itself was still open, but the booking tuple ceased to be valid at
 * claim time (market disabled, service/doctor lifecycle changed, assignment
 * revoked, or a pause overlaps the claimed span). Kept separate from
 * `SlotAlreadyTakenError` so callers can return an availability-specific
 * message while still rolling the slot mutation back in the same transaction.
 */
export class BookingClaimUnavailableError extends Error {
  constructor() {
    super("This doctor or service is not accepting bookings at the selected time.");
    this.name = "BookingClaimUnavailableError";
  }
}

export type BookingClaimContext = {
  countryCode: string;
  serviceId: string;
  doctorId: string;
};

function slotCacheKey(
  doctorId: string,
  serviceDurationMinutes: number | null,
  fromUtc: Date,
  toUtc: Date,
  skipExpiredRelease: boolean,
): string {
  const bucket = (d: Date) => Math.floor(d.getTime() / SLOT_CACHE_TTL_MS);
  return `${doctorId}:${serviceDurationMinutes ?? "base"}:${skipExpiredRelease ? "skip" : "released"}:${bucket(fromUtc)}:${bucket(toUtc)}`;
}

function slotInventoryCacheKey(
  doctorId: string,
  fromUtc: Date,
  toUtc: Date,
  skipExpiredRelease: boolean,
): string {
  const bucket = (d: Date) => Math.floor(d.getTime() / SLOT_CACHE_TTL_MS);
  return `${doctorId}:${skipExpiredRelease ? "skip" : "released"}:${bucket(fromUtc)}:${bucket(toUtc)}`;
}

/**
 * Materialise and load a doctor's raw slot rows once per date bucket.
 * Service duration only affects the in-memory contiguous-run calculation, so
 * repeating this database work for every assigned service cannot change the
 * answer and was the source of the cold-cache query explosion.
 */
function loadDoctorSlotInventory(
  doctorId: string,
  fromUtc: Date,
  toUtc: Date,
  skipExpiredRelease: boolean,
): Promise<DoctorSlotInventory> {
  const key = slotInventoryCacheKey(doctorId, fromUtc, toUtc, skipExpiredRelease);
  const cached = slotInventoryCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = slotInventoryReadsInFlight.get(key);
  if (pending) return pending;

  const generation = slotCacheGeneration;
  const request = (async () => {
    // Public slot rows minted before a doctor was suspended must stay hidden.
    // Keep this guard inside the shared inventory load so concurrent service
    // durations perform the lifecycle check once for the doctor/date window.
    if (await isDoctorSuspended(doctorId)) return { rows: [], pause: null };
    if (!skipExpiredRelease) await releaseExpiredHeldSlots(doctorId);
    await ensureSlotsForRange(doctorId, fromUtc, toUtc);
    const [rows, pause] = await Promise.all([
      prisma.doctorTimeSlot.findMany({
        where: { doctorId, startAt: { gte: fromUtc, lt: toUtc } },
        orderBy: { startAt: "asc" },
        select: { id: true, startAt: true, endAt: true, status: true },
      }),
      loadDoctorBookingPause(doctorId),
    ]);
    return { rows, pause };
  })()
    .then((result) => {
      if (generation === slotCacheGeneration) {
        slotInventoryCache.set(key, result, SLOT_CACHE_TTL_MS);
      }
      return result;
    })
    .finally(() => {
      if (slotInventoryReadsInFlight.get(key) === request) {
        slotInventoryReadsInFlight.delete(key);
      }
    });
  slotInventoryReadsInFlight.set(key, request);
  return request;
}

function resolveCachedSlotRead(
  key: string,
  load: () => Promise<PublicSlot[]>,
): Promise<PublicSlot[]> {
  const cached = slotCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = slotReadsInFlight.get(key);
  if (pending) return pending;

  const generation = slotCacheGeneration;
  const request = load()
    .then((result) => {
      // A booking or admin slot write may clear caches while this read is still
      // running. Never re-seed the cache with pre-invalidation data.
      if (generation === slotCacheGeneration) slotCache.set(key, result, SLOT_CACHE_TTL_MS);
      return result;
    })
    .finally(() => {
      if (slotReadsInFlight.get(key) === request) slotReadsInFlight.delete(key);
    });
  slotReadsInFlight.set(key, request);
  return request;
}

export async function listOpenSlotsForDoctor(
  doctorId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<PublicSlot[]> {
  const cacheKey = slotCacheKey(doctorId, null, fromUtc, toUtc, false);
  return resolveCachedSlotRead(cacheKey, async () => {
    try {
      const { rows, pause } = await loadDoctorSlotInventory(
        doctorId,
        fromUtc,
        toUtc,
        false,
      );
      return rows
        .filter((row) => row.status === "OPEN")
        .map((row) => ({
          id: row.id,
          startAt: row.startAt.toISOString(),
          endAt: row.endAt.toISOString(),
        }))
        .filter((slot) =>
          !slotOverlapsPause(
            { startAt: new Date(slot.startAt), endAt: new Date(slot.endAt) },
            pause,
          ),
        );
    } catch (error) {
      throw normalizeDbError(error, "Doctor availability is unavailable");
    }
  });
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

/** Prisma unique-constraint violation — here, @@unique([doctorId, startAt]). */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
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

  // Admin-removed single dates count as occupied for the overlap test below, so
  // a longer service-duration candidate can't fill a hole the admin punched.
  existing.push(...(await listAvailabilityExceptions(doctorId, fromUtc, toUtc)));

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
  const skipExpiredRelease = opts?.skipExpiredRelease === true;
  const cacheKey = slotCacheKey(
    doctorId,
    serviceDurationMinutes,
    fromUtc,
    toUtc,
    skipExpiredRelease,
  );
  return resolveCachedSlotRead(cacheKey, async () => {
    try {
      // Fetch ALL slots (not just OPEN) so a BOOKED/BLOCKED/HELD slot correctly
      // breaks a run — a consult can't start where it wouldn't fit before the
      // next occupied slot. The raw inventory is shared across service
      // durations; only the calculation below is duration-specific.
      const { rows: rawRows, pause } = await loadDoctorSlotInventory(
        doctorId,
        fromUtc,
        toUtc,
        skipExpiredRelease,
      );
      // Paused rows are removed before the contiguous-duration pass, so a
      // consultation can neither start inside nor bridge across a pause.
      const rows = rawRows.filter((row) => !slotOverlapsPause(row, pause));

      const durMs = (serviceDurationMinutes ?? 0) * 60_000;
      // No service duration → every OPEN base slot is a candidate as-is.
      if (durMs <= 0) {
        return rows
          .filter((r) => r.status === "OPEN")
          .map((r) => ({
            id: r.id,
            startAt: r.startAt.toISOString(),
            endAt: r.endAt.toISOString(),
          }));
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
      return out;
    } catch (error) {
      throw normalizeDbError(error, "Doctor availability is unavailable");
    }
  });
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
    UPDATE "DoctorTimeSlot" AS slot
    SET "status" = 'BOOKED', "updatedAt" = NOW()
    WHERE slot."id" = ${slotId}
      AND slot."status" = 'OPEN'
      AND slot."startAt" > NOW()
      AND NOT EXISTS (
        SELECT 1
        FROM "Doctor" AS doctor
        WHERE doctor."id" = slot."doctorId"
          AND doctor."bookingPausedFrom" IS NOT NULL
          AND doctor."bookingPausedFrom" < slot."endAt"
          AND (
            doctor."bookingPausedUntil" IS NULL
            OR doctor."bookingPausedUntil" > slot."startAt"
          )
      )
    RETURNING slot."doctorId", slot."startAt", slot."endAt"
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

/**
 * Revalidate the complete booking tuple at the moment a slot is claimed.
 *
 * Public availability is advisory and can become stale. This guard belongs in
 * the same transaction as the OPEN -> HELD/BOOKED mutation so a direct API
 * call, a stale picker, or a concurrent lifecycle change cannot turn a hidden
 * or paused tuple into a booking. A missing BookingSetting keeps the historic
 * default (`bookingEnabled = true`); an explicit false closes the market.
 */
export async function assertBookingClaimAllowed(
  client: Prisma.TransactionClient,
  claimed: { doctorId: string; startAt: Date; endAt: Date },
  context: BookingClaimContext,
): Promise<void> {
  if (claimed.doctorId !== context.doctorId) {
    throw new BookingClaimUnavailableError();
  }

  const countryCode = context.countryCode.trim().toLowerCase();
  const policy = await client.service.findFirst({
    where: {
      id: context.serviceId,
      isActive: true,
      visibility: "PUBLIC",
      country: { code: countryCode, isActive: true },
    },
    select: {
      bookingPausedFrom: true,
      bookingPausedUntil: true,
      country: {
        select: { bookingSetting: { select: { bookingEnabled: true } } },
      },
      assignedDoctors: {
        where: {
          doctorId: context.doctorId,
          isActive: true,
          status: "active",
          doctor: {
            active: true,
            OR: [
              { country: { code: countryCode, isActive: true } },
              {
                additionalCountries: {
                  some: {
                    active: true,
                    country: { code: countryCode, isActive: true },
                  },
                },
              },
            ],
          },
        },
        select: {
          doctor: {
            select: {
              bookingPausedFrom: true,
              bookingPausedUntil: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  const assignedDoctor = policy?.assignedDoctors[0]?.doctor;
  if (
    !policy ||
    !assignedDoctor ||
    policy.country.bookingSetting?.bookingEnabled === false ||
    slotOverlapsPause(claimed, policy) ||
    slotOverlapsPause(claimed, assignedDoctor)
  ) {
    throw new BookingClaimUnavailableError();
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
 * Manual/partner/follow-up slot hold with the authoritative booking policy in
 * the same transaction. Callers must not preflight and then use the unguarded
 * hold: doing so reintroduces a race between the policy read and slot claim.
 */
export async function holdConsecutiveSlotsForBooking(
  client: Prisma.TransactionClient,
  startSlotId: string,
  durationMinutes: number | null,
  context: BookingClaimContext,
): Promise<{ doctorId: string; startAt: Date; endAt: Date }> {
  const held = await consumeConsecutiveSlots(client, startSlotId, durationMinutes, "HELD");
  await assertBookingClaimAllowed(client, held, context);
  return held;
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
  const uniqueDoctorIds = [...new Set(doctorIds)];
  if (uniqueDoctorIds.length === 0) return;

  const waits = new Set<Promise<void>>();
  const unsweptDoctorIds: string[] = [];
  for (const doctorId of uniqueDoctorIds) {
    if (expiredHoldSweepCache.get(doctorId)) continue;
    const pending = expiredHoldSweepsInFlight.get(doctorId);
    if (pending) waits.add(pending);
    else unsweptDoctorIds.push(doctorId);
  }

  if (unsweptDoctorIds.length > 0) {
    const generation = slotCacheGeneration;
    const request = sweepExpiredHeldSlots(unsweptDoctorIds)
      .then(() => {
        if (generation !== slotCacheGeneration) return;
        for (const doctorId of unsweptDoctorIds) {
          expiredHoldSweepCache.set(doctorId, true, SLOT_CACHE_TTL_MS);
        }
      })
      .finally(() => {
        for (const doctorId of unsweptDoctorIds) {
          if (expiredHoldSweepsInFlight.get(doctorId) === request) {
            expiredHoldSweepsInFlight.delete(doctorId);
          }
        }
      });
    for (const doctorId of unsweptDoctorIds) {
      expiredHoldSweepsInFlight.set(doctorId, request);
    }
    waits.add(request);
  }

  await Promise.all(waits);
}

async function sweepExpiredHeldSlots(doctorIds: string[]): Promise<void> {
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
/**
 * Point a rescheduled appointment at a real slot again.
 *
 * The admin order page and the doctor workspace both move a consultation by
 * writing a freeform `scheduledAt`: they release the old DoctorTimeSlot and
 * leave `Appointment.timeSlotId` NULL, so the new time is backed by nothing
 * and the base grid still offers it to the next patient who opens the booking
 * page — a double-book waiting to happen.
 *
 * Best-effort by design: an admin may deliberately place a consultation off
 * the doctor's grid (out of hours, between slots), and that must keep working.
 * When no OPEN slot starts exactly at the new time — or another booking wins
 * the race for it — we return null and leave the appointment slotless, which
 * is exactly the old behaviour.
 *
 * `durationMinutes` should be the span of the slot that was just released so
 * a 45-minute consult doesn't silently shrink to the 15-minute base grid.
 */
export async function reclaimSlotForRescheduledAppointment(
  appointmentId: string,
  doctorId: string | null,
  startAt: Date | null,
  durationMinutes: number | null,
): Promise<string | null> {
  if (!doctorId || !startAt) return null;

  const windowEnd = new Date(
    startAt.getTime() + Math.max(durationMinutes ?? 0, 1) * 60_000,
  );
  // The grid is materialised lazily, so a date nobody has browsed yet has no
  // rows to claim.
  await ensureSlotsForRange(doctorId, startAt, windowEnd).catch(() => undefined);

  const candidate = await prisma.doctorTimeSlot.findFirst({
    where: { doctorId, startAt, status: "OPEN" },
    select: { id: true },
  });
  if (!candidate) return null;

  try {
    return await prisma.$transaction(async (tx) => {
      const claimed = await claimConsecutiveSlots(tx, candidate.id, durationMinutes);
      if (claimed.startAt.getTime() !== startAt.getTime()) {
        throw new SlotAlreadyTakenError();
      }
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { timeSlotId: candidate.id },
      });
      return candidate.id;
    });
  } catch {
    // Lost the race, or the run of base slots doesn't cover the consult's
    // length. Leave the appointment slotless rather than failing the move.
    return null;
  }
}

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
    // Materialise the new window's slots now rather than leaving each week to
    // whoever opens it first — see WINDOW_PREGENERATE_DAYS.
    await refreshWindowSlots(doctorId);
    // The windows drive generation, so the cached slot views are now stale.
    invalidateAvailabilityCaches();
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
    // The window moved, narrowed, or paused, so slots minted from its old shape
    // may no longer be justified by any window. Reconcile before returning:
    // leaving it to a later read would mean a patient can book a slot on a day
    // the doctor just removed. Then re-materialise the new shape, so widening a
    // window fills every week in the horizon rather than only the visited ones.
    await refreshWindowSlots(doctorId);
    // The windows drive generation, so the cached slot views are now stale.
    invalidateAvailabilityCaches();
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
    // After the row is gone, so the reconcile's candidate set no longer counts
    // this window. Drops every future OPEN/BLOCKED slot it was the only source
    // for; slots another window still justifies stay.
    if (result.count > 0) await reconcileWindowDerivedSlots(doctorId);
    // The windows drive generation, so the cached slot views are now stale.
    invalidateAvailabilityCaches();
    return result.count > 0;
  } catch (error) {
    throw normalizeDbError(error, "Doctor availability is unavailable");
  }
}
