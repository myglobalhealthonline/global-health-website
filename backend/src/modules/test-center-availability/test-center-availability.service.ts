import { Prisma, type DoctorSlotStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { TtlCache } from "../../lib/ttl-cache.js";
import {
  invalidateAvailabilityCaches,
  registerAvailabilityCache,
} from "../doctor-availability/availability-cache-bus.js";
import { isValidTimeZone } from "../doctor-availability/timezone.js";
import {
  BASE_SLOT_MINUTES,
  SlotAlreadyTakenError,
  WINDOW_PREGENERATE_DAYS,
  WINDOW_SWEEP_HORIZON_DAYS,
  expandWindowCandidates,
  intervalsOverlap,
  isExclusionViolation,
  isUniqueViolation,
  selectMissingSlots,
  selectStaleSlots,
  type GenerationResult,
  type SlotSpan,
} from "../scheduling/slot-grid.js";

/**
 * Test-center availability + concrete time-slot service ("Book a Test").
 *
 * Deliberately a SIBLING of `doctor-availability.service.ts` rather than a
 * generalisation of it. The shared part — the pure window/candidate/staleness
 * arithmetic — lives in `scheduling/slot-grid.ts` and is imported by both. What
 * is NOT shared, and why:
 *
 *   • The claim paths are raw SQL naming their own table. Parameterising a
 *     table name needs `Prisma.raw`, which turns the double-booking-critical
 *     query into string concatenation.
 *   • The doctor path carries policy with no test-center analogue: doctor
 *     suspension, per-doctor booking pauses inside the claim predicate,
 *     multi-country timezone rosters, and the service+doctor booking-claim
 *     context. A center has none of those; a generic engine would carry dead
 *     branches through the live doctor claim.
 *   • The doctor module owns process-global caches whose keys are doctor ids.
 *     Re-keying those by owner kind is a rewrite of the concurrency model under
 *     the live booking flow.
 *
 * The model is otherwise identical: `TestCenterAvailability` describes a
 * recurring weekly window in center-local wall-clock minutes,
 * `TestCenterTimeSlot` rows are concrete bookable slots lazily derived from
 * those windows, and `TestCenterAvailabilityException` rows are single-date
 * tombstones so an admin's removal is not immediately regenerated.
 *
 * Atomic claim: `claimTestCenterSlot` does a single
 * `UPDATE … WHERE id = ? AND status = 'OPEN'`, so two patients hitting submit
 * at the same instant cannot both take the same slot. The partial GiST
 * exclusion constraint `no_overlapping_test_center_slots` is the backstop
 * against two distinct overlapping rows.
 */

/**
 * The timezone a center's availability wall-clock minutes are expressed in:
 * its `Country.bookingSetting.timezone`. Falls back to UTC for a center whose
 * country has no booking setting or an unrecognised zone.
 *
 * Single-valued, unlike `resolveDoctorTimeZones`: a center is a physical
 * address in exactly one country, so there is no multi-market roster to offer.
 */
export async function resolveTestCenterTimeZone(testCenterId: string): Promise<string> {
  const row = await prisma.testCenter.findUnique({
    where: { id: testCenterId },
    select: {
      country: { select: { bookingSetting: { select: { timezone: true } } } },
    },
  });
  const tz = row?.country?.bookingSetting?.timezone;
  return tz && isValidTimeZone(tz) ? tz : "UTC";
}

/**
 * Whether a center may generate bookable inventory at all.
 *
 * Fail-closed and deliberately checks the COUNTRY too: deactivating a market
 * must stop its centers taking bookings, and a center row read in isolation
 * cannot see that. Mirrors the role `isDoctorSuspended` plays for doctors —
 * this is the gate that makes deactivation stick, because slot rows are
 * re-minted on every availability read, so deleting them elsewhere would only
 * last until the next view. Windows are left intact so re-activating restores
 * the schedule exactly as it was.
 */
export async function isTestCenterInactive(testCenterId: string): Promise<boolean> {
  const center = await prisma.testCenter.findUnique({
    where: { id: testCenterId },
    select: { isActive: true, country: { select: { isActive: true } } },
  });
  if (!center) return true;
  return !center.isActive || !center.country?.isActive;
}

/**
 * Single-date holes in the recurring windows. Loaded with a ±1 day pad so a
 * candidate that starts just outside the queried range but overlaps an
 * exception is still dropped.
 */
async function listAvailabilityExceptions(
  testCenterId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<SlotSpan[]> {
  const pad = 24 * 60 * 60 * 1000;
  return prisma.testCenterAvailabilityException.findMany({
    where: {
      testCenterId,
      startAt: { gte: new Date(fromUtc.getTime() - pad) },
      endAt: { lte: new Date(toUtc.getTime() + pad) },
    },
    select: { startAt: true, endAt: true },
  });
}

/**
 * Every base-grid slot the center's recurring windows justify in
 * [fromUtc, toUtc). Shared by generation and the window-change reconcile so the
 * two can never disagree about what a window owns.
 */
async function windowSlotCandidates(
  testCenterId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<{ testCenterId: string; startAt: Date; endAt: Date }[]> {
  if (toUtc <= fromUtc) return [];

  const windows = await prisma.testCenterAvailability.findMany({
    where: {
      testCenterId,
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

  const tz = await resolveTestCenterTimeZone(testCenterId);
  const exceptions = await listAvailabilityExceptions(testCenterId, fromUtc, toUtc);
  return expandWindowCandidates(windows, exceptions, tz, fromUtc, toUtc).map(
    (span) => ({ testCenterId, ...span }),
  );
}

/**
 * Ensure `TestCenterTimeSlot` rows exist for every window across the requested
 * range. Idempotent — inserts only the genuinely missing instants (comparing
 * actual starts, never counts) and relies on `@@unique([testCenterId, startAt])`
 * plus the exclusion constraint as the concurrent-writer backstop.
 *
 * `skippedOverlap` in the return matters: candidates the exclusion constraint
 * refused are dropped rather than raised (a booked slot legitimately occupies
 * the span), so without a count the caller cannot tell "generated a full week"
 * from "generated nothing, silently".
 */
export async function ensureSlotsForRange(
  testCenterId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<GenerationResult> {
  if (toUtc <= fromUtc) return { created: 0, skippedOverlap: 0 };
  if (await isTestCenterInactive(testCenterId)) {
    return { created: 0, skippedOverlap: 0 };
  }

  const generated = await windowSlotCandidates(testCenterId, fromUtc, toUtc);
  if (generated.length === 0) return { created: 0, skippedOverlap: 0 };

  const existingRows = await prisma.testCenterTimeSlot.findMany({
    where: { testCenterId, startAt: { gte: fromUtc, lt: toUtc } },
    select: { startAt: true },
  });
  const missing = selectMissingSlots(
    generated,
    existingRows.map((r) => r.startAt),
  );
  if (missing.length === 0) return { created: 0, skippedOverlap: 0 };

  try {
    await prisma.testCenterTimeSlot.createMany({
      data: missing,
      skipDuplicates: true,
    });
    return { created: missing.length, skippedOverlap: 0 };
  } catch (error) {
    // A concurrent caller may have created an overlapping slot between the
    // in-process check above and this write, and a longer existing slot can
    // overlap a candidate without sharing its start. A batch insert aborts
    // entirely on one conflicting row, so fall back to one-at-a-time and drop
    // just the losers.
    if (isExclusionViolation(error)) {
      let created = 0;
      let skippedOverlap = 0;
      for (const row of missing) {
        try {
          await prisma.testCenterTimeSlot.create({ data: row });
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

/**
 * Reconcile a center's future slots against its CURRENT windows — run after any
 * window is changed, paused, or deleted.
 *
 * Slot rows are materialised, not derived at read time, so a window that moves,
 * narrows, or disappears leaves its old slots behind: unreachable from the UI's
 * window list, re-derivable by no generator, and still bookable by a patient —
 * a booking on a day the center no longer opens.
 *
 * What survives: BOOKED / HELD (a real appointment or a live cart hold — those
 * go through cancellation), `isAdHoc` rows (nothing derives them, so the sweep
 * must not judge them), and OPEN / BLOCKED whose exact span a live window still
 * generates. See `selectStaleSlots` for why BLOCKED uses an overlap rule.
 */
export async function reconcileWindowDerivedSlots(
  testCenterId: string,
  now: Date = new Date(),
): Promise<number> {
  try {
    const horizonEnd = new Date(
      now.getTime() + WINDOW_SWEEP_HORIZON_DAYS * 24 * 60 * 60 * 1000,
    );
    const [candidates, existing] = await Promise.all([
      windowSlotCandidates(testCenterId, now, horizonEnd),
      prisma.testCenterTimeSlot.findMany({
        where: {
          testCenterId,
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

    // Re-assert status in the delete filter: a patient could have claimed one
    // of these between the read and here, and a paid booking must never lose
    // its slot to a window edit.
    const deleted = await prisma.testCenterTimeSlot.deleteMany({
      where: {
        id: { in: stale.map((s) => s.id) },
        testCenterId,
        status: { in: ["OPEN", "BLOCKED"] },
      },
    });
    invalidateAvailabilityCaches();
    return deleted.count;
  } catch (error) {
    throw normalizeDbError(error, "Could not reconcile test center slots");
  }
}

/**
 * Reconcile, then materialise the pregenerate horizon. Run after any window
 * write so widening a window fills every week in reach rather than only the
 * weeks someone happens to open. Never throws — a generation failure must not
 * fail the admin's window edit, which is already committed.
 */
async function refreshWindowSlots(testCenterId: string): Promise<GenerationResult> {
  try {
    await reconcileWindowDerivedSlots(testCenterId);
    const now = new Date();
    return await ensureSlotsForRange(
      testCenterId,
      now,
      new Date(now.getTime() + WINDOW_PREGENERATE_DAYS * 24 * 60 * 60 * 1000),
    );
  } catch {
    return { created: 0, skippedOverlap: 0 };
  }
}

// ---------------------------------------------------------------------------
// Public read path
// ---------------------------------------------------------------------------

export type PublicSlot = {
  id: string;
  startAt: string;
  endAt: string;
};

const SLOT_CACHE_TTL_MS = 45_000;
const SLOT_CACHE_MAX_ENTRIES = 2000;
const slotCache = new TtlCache<PublicSlot[]>(SLOT_CACHE_MAX_ENTRIES);
const expiredHoldSweepCache = new TtlCache<true>(SLOT_CACHE_MAX_ENTRIES);

// Own cache instances, registered on the shared bus so any write that changes
// bookable inventory anywhere clears these too.
registerAvailabilityCache(() => {
  slotCache.clear();
  expiredHoldSweepCache.clear();
});

function slotCacheKey(testCenterId: string, fromUtc: Date, toUtc: Date): string {
  return `${testCenterId}:${fromUtc.getTime()}:${toUtc.getTime()}`;
}

/**
 * OPEN slots a patient may book at this center in [fromUtc, toUtc).
 *
 * Generates lazily first (so a center that has never been viewed still offers
 * its windows) and sweeps expired cart holds, so an abandoned checkout's slot
 * is reclaimed the next time anyone looks.
 *
 * `minimumDurationMinutes` filters to slots with a long enough contiguous OPEN
 * run behind them — an exam needing 30 minutes must not be offered a 15-minute
 * slot that a booked appointment starts right after.
 */
export async function listOpenSlotsForTestCenter(
  testCenterId: string,
  fromUtc: Date,
  toUtc: Date,
  minimumDurationMinutes = 0,
): Promise<PublicSlot[]> {
  if (toUtc <= fromUtc) return [];
  const key = `${slotCacheKey(testCenterId, fromUtc, toUtc)}:${minimumDurationMinutes}`;
  const cached = slotCache.get(key);
  if (cached) return cached;

  try {
    await releaseExpiredHeldSlotsForTestCenters([testCenterId]);
    await ensureSlotsForRange(testCenterId, fromUtc, toUtc);

    const rows = await prisma.testCenterTimeSlot.findMany({
      where: {
        testCenterId,
        status: "OPEN",
        startAt: { gte: fromUtc, lt: toUtc },
      },
      orderBy: { startAt: "asc" },
      select: { id: true, startAt: true, endAt: true },
    });

    const usable =
      minimumDurationMinutes > 0
        ? filterSlotsWithContiguousRun(rows, minimumDurationMinutes)
        : rows;

    const result = usable.map((r) => ({
      id: r.id,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
    }));
    slotCache.set(key, result, SLOT_CACHE_TTL_MS);
    return result;
  } catch (error) {
    throw normalizeDbError(error, "Test center availability is unavailable");
  }
}

/**
 * Keep only slots that start a contiguous OPEN run of at least
 * `minimumDurationMinutes`. Mirrors what `consumeConsecutiveSlots` will demand
 * at claim time, so the picker never offers a start the claim would reject.
 *
 * Advisory, like all public availability: the authoritative check is the
 * `FOR UPDATE` validation inside the claim transaction.
 *
 * Exported for unit tests — the rule it encodes (an exam is only offered a
 * start it can actually finish from) is worth pinning independently of the DB.
 */
export function filterSlotsWithContiguousRun<T extends { startAt: Date; endAt: Date }>(
  slots: T[],
  minimumDurationMinutes: number,
): T[] {
  const needMs = minimumDurationMinutes * 60_000;
  return slots.filter((slot) => {
    let end = slot.endAt.getTime();
    if (end - slot.startAt.getTime() >= needMs) return true;
    // Walk forward while rows tile exactly; any gap or missing row ends the run.
    for (const next of slots) {
      if (next.startAt.getTime() !== end) continue;
      end = next.endAt.getTime();
      if (end - slot.startAt.getTime() >= needMs) return true;
    }
    return end - slot.startAt.getTime() >= needMs;
  });
}

// ---------------------------------------------------------------------------
// Claim / hold / release
// ---------------------------------------------------------------------------

/**
 * Atomically take a single slot. One statement, so two concurrent callers
 * cannot both win.
 *
 * Note what is NOT here versus `claimDoctorSlot`: no booking-pause sub-select.
 * A center has no pause concept — it is either active (with its country) or it
 * generates no inventory at all, which `ensureSlotsForRange` already enforces.
 */
export async function claimTestCenterSlot(
  client: Prisma.TransactionClient,
  slotId: string,
): Promise<{ testCenterId: string; startAt: Date; endAt: Date }> {
  const rows = await client.$queryRaw<
    { testCenterId: string; startAt: Date; endAt: Date }[]
  >(Prisma.sql`
    UPDATE "TestCenterTimeSlot" AS slot
    SET "status" = 'BOOKED', "updatedAt" = NOW()
    WHERE slot."id" = ${slotId}
      AND slot."status" = 'OPEN'
      AND slot."startAt" > NOW()
    RETURNING slot."testCenterId", slot."startAt", slot."endAt"
  `);
  if (rows.length === 0) {
    throw new SlotAlreadyTakenError();
  }
  return rows[0];
}

/**
 * Consume a run of consecutive OPEN base slots for a booking of length
 * `durationMinutes`, collapsing them into ONE slot of the true exam length.
 * Same base-grid-and-consume model the doctor flow uses:
 *
 *   - The day is materialised as fixed base slots. A 45-min exam must occupy
 *     45 min, so it consumes three consecutive 15-min rows and leaves a single
 *     [09:00, 09:45) row.
 *   - Subsumed rows are DELETED BEFORE the survivor is widened. Because the
 *     exclusion constraint uses half-open `[start, end)` ranges, that ordering
 *     means the widened range never overlaps a live row.
 *   - The survivor keeps the start slot's id, so `Appointment.testCenterTimeSlotId`
 *     stays 1:1 and every caller keeps passing a single slot id.
 *
 * Race-safe: rows are locked `FOR UPDATE` in ascending `startAt` order (a
 * global lock order, so deadlock-free). A concurrent claim over any shared row
 * finds it gone or non-OPEN and fails validation.
 */
async function consumeConsecutiveSlots(
  client: Prisma.TransactionClient,
  startSlotId: string,
  durationMinutes: number | null,
  finalStatus: "BOOKED" | "HELD",
): Promise<{ testCenterId: string; startAt: Date; endAt: Date }> {
  try {
    // 1. Lock the start slot; must be OPEN + future.
    const startRows = await client.$queryRaw<
      {
        id: string;
        testCenterId: string;
        startAt: Date;
        endAt: Date;
        status: string;
      }[]
    >(Prisma.sql`
      SELECT "id", "testCenterId", "startAt", "endAt", "status"
      FROM "TestCenterTimeSlot"
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
      FROM "TestCenterTimeSlot"
      WHERE "testCenterId" = ${start.testCenterId}
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
      // Not enough contiguous OPEN base slots — a booked/blocked slot or a
      // window edge breaks the run before the exam fits.
      throw new SlotAlreadyTakenError();
    }

    // 4. Delete subsumed rows FIRST, then widen + set status on the survivor.
    const subsumed = run.filter((r) => r.id !== startSlotId).map((r) => r.id);
    if (subsumed.length > 0) {
      await client.$executeRaw(Prisma.sql`
        DELETE FROM "TestCenterTimeSlot" WHERE "id" IN (${Prisma.join(subsumed)})
      `);
    }
    const updated = await client.$queryRaw<
      { testCenterId: string; startAt: Date; endAt: Date }[]
    >(Prisma.sql`
      UPDATE "TestCenterTimeSlot"
      SET "endAt" = ${targetEnd},
          "status" = ${finalStatus}::"DoctorSlotStatus",
          "updatedAt" = NOW()
      WHERE "id" = ${startSlotId} AND "status" = 'OPEN'
      RETURNING "testCenterId", "startAt", "endAt"
    `);
    if (updated.length === 0) throw new SlotAlreadyTakenError();
    return updated[0];
  } catch (error) {
    if (error instanceof SlotAlreadyTakenError) throw error;
    if (isExclusionViolation(error)) throw new SlotAlreadyTakenError();
    throw normalizeDbError(error, "Test center slot is no longer available");
  }
}

/** Claim a run outright (BOOKED) — direct booking with no cart step. */
export async function claimConsecutiveTestCenterSlots(
  client: Prisma.TransactionClient,
  startSlotId: string,
  durationMinutes: number | null,
): Promise<{ testCenterId: string; startAt: Date; endAt: Date }> {
  return consumeConsecutiveSlots(client, startSlotId, durationMinutes, "BOOKED");
}

/**
 * Reserve a run for a cart line (HELD). The payment webhook later flips that
 * one row HELD→BOOKED with no geometry change.
 */
export async function holdTestCenterConsecutiveSlots(
  client: Prisma.TransactionClient,
  startSlotId: string,
  durationMinutes: number | null,
): Promise<{ testCenterId: string; startAt: Date; endAt: Date }> {
  return consumeConsecutiveSlots(client, startSlotId, durationMinutes, "HELD");
}

/**
 * Return collapsed HELD/BOOKED rows to the base grid: delete them, then
 * re-materialise base slots across the union of freed spans so the time comes
 * back at base granularity rather than as one coarse row.
 *
 * MUST only ever be passed `TestCenterTimeSlot` ids. Feeding it a
 * `DoctorTimeSlot` id matches zero rows and no-ops SILENTLY, leaving a slot
 * held forever with no error — callers holding a mixed set must partition by
 * column first.
 */
export async function releaseTestCenterSlotsToBaseGrid(
  slotIds: string[],
): Promise<void> {
  if (slotIds.length === 0) return;
  try {
    const rows = await prisma.testCenterTimeSlot.findMany({
      where: { id: { in: slotIds }, status: { in: ["HELD", "BOOKED"] } },
      select: { id: true, testCenterId: true, startAt: true, endAt: true },
    });
    if (rows.length === 0) return;
    await prisma.testCenterTimeSlot.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    const spans = new Map<string, { from: Date; to: Date }>();
    for (const r of rows) {
      const cur = spans.get(r.testCenterId);
      spans.set(r.testCenterId, {
        from: cur && cur.from < r.startAt ? cur.from : r.startAt,
        to: cur && cur.to > r.endAt ? cur.to : r.endAt,
      });
    }
    for (const [testCenterId, span] of spans) {
      await ensureSlotsForRange(testCenterId, span.from, span.to);
    }
    invalidateAvailabilityCaches();
  } catch (error) {
    throw normalizeDbError(error, "Test center slot release failed");
  }
}

/** Release one slot — used when a test booking is cancelled. */
export async function releaseTestCenterSlot(slotId: string): Promise<void> {
  await releaseTestCenterSlotsToBaseGrid([slotId]);
}

/**
 * Return slots stuck in HELD past the cart-hold grace window back to the grid.
 *
 * ONLY cart holds. A HELD slot with an Appointment behind it is a real booking
 * awaiting payment (admin manual booking), whose patient has until
 * `Order.paymentDueAt` to pay. Releasing those on the 15-minute cart clock
 * would reopen the slot for double-booking and SetNull the appointment's slot
 * link. Their release is owned by the pre-payment deadline and the admin cancel
 * paths — same rule as the doctor sweep.
 */
async function sweepExpiredHeldSlots(testCenterIds: string[]): Promise<void> {
  try {
    const stale = await prisma.testCenterTimeSlot.findMany({
      where: {
        testCenterId: { in: testCenterIds },
        status: "HELD",
        updatedAt: { lt: new Date(Date.now() - 15 * 60_000) },
        appointment: { is: null },
      },
      select: { id: true },
    });
    if (stale.length === 0) return;
    await releaseTestCenterSlotsToBaseGrid(stale.map((s) => s.id));
  } catch (error) {
    throw normalizeDbError(error, "Test center availability is unavailable");
  }
}

/**
 * Sweep expired cart holds for these centers, at most once per TTL each.
 * Called from the read paths so an abandoned cart's slot is reclaimed the next
 * time anyone looks at the center's availability.
 */
export async function releaseExpiredHeldSlotsForTestCenters(
  testCenterIds: string[],
): Promise<void> {
  const unique = [...new Set(testCenterIds)].filter(
    (id) => !expiredHoldSweepCache.get(id),
  );
  if (unique.length === 0) return;
  await sweepExpiredHeldSlots(unique);
  for (const id of unique) {
    expiredHoldSweepCache.set(id, true, SLOT_CACHE_TTL_MS);
  }
}

/**
 * Claim a slot for an appointment being rescheduled onto a new time, releasing
 * the old one. Returns the claimed span so the caller can restamp
 * `Appointment.scheduledAt`.
 */
export async function reclaimTestCenterSlotForRescheduledAppointment(
  appointmentId: string,
  newSlotId: string,
  durationMinutes: number | null,
): Promise<{ testCenterId: string; startAt: Date; endAt: Date }> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { testCenterTimeSlotId: true },
  });
  const previousSlotId = appointment?.testCenterTimeSlotId ?? null;

  const claimed = await prisma.$transaction((tx) =>
    consumeConsecutiveSlots(tx, newSlotId, durationMinutes, "BOOKED"),
  );

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { testCenterTimeSlotId: newSlotId, scheduledAt: claimed.startAt },
  });

  // Only after the new slot is safely held: releasing first would let another
  // patient take the old time while this reschedule is still in flight.
  if (previousSlotId && previousSlotId !== newSlotId) {
    await releaseTestCenterSlotsToBaseGrid([previousSlotId]);
  }
  invalidateAvailabilityCaches();
  return claimed;
}

/** Free the center slot behind a cancelled appointment. */
export async function releaseAppointmentTestSlot(
  appointmentId: string,
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { testCenterTimeSlotId: true },
  });
  if (!appointment?.testCenterTimeSlotId) return;
  await releaseTestCenterSlotsToBaseGrid([appointment.testCenterTimeSlotId]);
}

// ---------------------------------------------------------------------------
// Admin CRUD — same row shape as the doctor one so the UI type is reused
// ---------------------------------------------------------------------------

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

function toAdminRow(r: {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  slotDurationMinutes: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  isActive: boolean;
}): AdminAvailabilityRow {
  return {
    id: r.id,
    weekday: r.weekday,
    startMinute: r.startMinute,
    endMinute: r.endMinute,
    slotDurationMinutes: r.slotDurationMinutes,
    effectiveFrom: r.effectiveFrom ? r.effectiveFrom.toISOString() : null,
    effectiveUntil: r.effectiveUntil ? r.effectiveUntil.toISOString() : null,
    isActive: r.isActive,
  };
}

export async function listAdminAvailability(
  testCenterId: string,
): Promise<AdminAvailabilityRow[]> {
  try {
    const rows = await prisma.testCenterAvailability.findMany({
      where: { testCenterId },
      orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
    });
    return rows.map(toAdminRow);
  } catch (error) {
    throw normalizeDbError(error, "Test center availability is unavailable");
  }
}

export async function createAdminAvailability(
  testCenterId: string,
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
    const row = await prisma.testCenterAvailability.create({
      data: {
        testCenterId,
        weekday: input.weekday,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
        // Base grid step. Exams consume consecutive base slots to fit their
        // real length — see consumeConsecutiveSlots.
        slotDurationMinutes: input.slotDurationMinutes ?? 15,
        effectiveFrom: input.effectiveFrom ?? null,
        effectiveUntil: input.effectiveUntil ?? null,
      },
    });
    await refreshWindowSlots(testCenterId);
    invalidateAvailabilityCaches();
    return toAdminRow(row);
  } catch (error) {
    throw normalizeDbError(error, "Test center availability is unavailable");
  }
}

export async function patchAdminAvailability(
  testCenterId: string,
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
    const existing = await prisma.testCenterAvailability.findFirst({
      where: { id: availabilityId, testCenterId },
      select: { id: true },
    });
    if (!existing) return null;

    const row = await prisma.testCenterAvailability.update({
      where: { id: availabilityId },
      data: {
        ...(input.weekday !== undefined && { weekday: input.weekday }),
        ...(input.startMinute !== undefined && { startMinute: input.startMinute }),
        ...(input.endMinute !== undefined && { endMinute: input.endMinute }),
        ...(input.slotDurationMinutes !== undefined && {
          slotDurationMinutes: input.slotDurationMinutes,
        }),
        ...(input.effectiveFrom !== undefined && {
          effectiveFrom: input.effectiveFrom,
        }),
        ...(input.effectiveUntil !== undefined && {
          effectiveUntil: input.effectiveUntil,
        }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    // The window moved, narrowed, or paused, so slots minted from its old shape
    // may no longer be justified. Reconcile before returning: leaving it to a
    // later read would mean a patient can book a slot on a day the center just
    // removed.
    await refreshWindowSlots(testCenterId);
    invalidateAvailabilityCaches();
    return toAdminRow(row);
  } catch (error) {
    throw normalizeDbError(error, "Test center availability is unavailable");
  }
}

export async function deleteAdminAvailability(
  testCenterId: string,
  availabilityId: string,
): Promise<boolean> {
  try {
    const result = await prisma.testCenterAvailability.deleteMany({
      where: { id: availabilityId, testCenterId },
    });
    // After the row is gone, so the reconcile's candidate set no longer counts
    // this window. Drops every future OPEN/BLOCKED slot it was the only source
    // for; slots another window still justifies stay.
    if (result.count > 0) await reconcileWindowDerivedSlots(testCenterId);
    invalidateAvailabilityCaches();
    return result.count > 0;
  } catch (error) {
    throw normalizeDbError(error, "Test center availability is unavailable");
  }
}

// ---------------------------------------------------------------------------
// Admin slot management — ad-hoc add, block/unblock, resize, remove.
//
// Mirrors the doctor slot tools so the shared admin week grid behaves
// identically for a center. The one structural difference is what is absent:
// there is no per-owner booking pause to honour, because a center that stops
// taking bookings is deactivated and then generates no inventory at all.
// ---------------------------------------------------------------------------

/** A UTC range the bulk tools operate over. */
export type SlotRange = { fromUtc: Date; toUtc: Date };

export type BulkSlotResult = {
  /** Slots actually changed (blocked, unblocked, or removed). */
  changed: number;
  /** Slots left alone because they are BOOKED or HELD. */
  skippedOccupied: number;
  /** Ids that matched no slot of this center (only meaningful for id-based calls). */
  skippedMissing: number;
};

/**
 * Record a tombstone for each removed span, THEN delete the rows.
 *
 * Order matters: if the delete loses a race or the transaction is retried, the
 * hole is already recorded and the next generation pass cannot resurrect the
 * slot. Status is re-asserted in the delete filter so a booking claimed between
 * the caller's read and here keeps its slot.
 */
async function deleteSlotsWithExceptions(
  testCenterId: string,
  slots: { id: string; startAt: Date; endAt: Date }[],
  reason?: string | null,
): Promise<number> {
  const note = reason?.trim() || null;
  return prisma.$transaction(async (tx) => {
    await tx.testCenterAvailabilityException.deleteMany({
      where: { testCenterId, startAt: { in: slots.map((s) => s.startAt) } },
    });
    await tx.testCenterAvailabilityException.createMany({
      data: slots.map((s) => ({
        testCenterId,
        startAt: s.startAt,
        endAt: s.endAt,
        reason: note,
      })),
      skipDuplicates: true,
    });
    const deleted = await tx.testCenterTimeSlot.deleteMany({
      where: {
        id: { in: slots.map((s) => s.id) },
        testCenterId,
        status: { in: ["OPEN", "BLOCKED"] },
      },
    });
    return deleted.count;
  });
}

/**
 * Add slots at explicit instants, independent of the recurring windows.
 *
 * Rows are flagged `isAdHoc` so the window-reconcile sweeps leave them alone —
 * nothing derives them, so a sweep would delete them for good. Any exception
 * covering an added span is cleared: adding a slot back where one was removed
 * is the admin undoing that removal.
 *
 * Partial success is the point. A range almost always crosses times the center
 * already has slots for, and failing the whole request over one collision would
 * make the tool unusable; clashes and past instants are counted, never raised.
 */
export async function createAdHocSlots(
  testCenterId: string,
  startAts: Date[],
  durationMinutes: number,
): Promise<{ created: number; skippedOverlap: number; skippedPast: number }> {
  const durationMs = durationMinutes * 60 * 1000;
  const now = Date.now();

  const unique = [...new Map(startAts.map((d) => [d.getTime(), d])).values()].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
  const future = unique.filter((d) => d.getTime() > now);
  const skippedPast = unique.length - future.length;
  if (future.length === 0) return { created: 0, skippedOverlap: 0, skippedPast };

  const rangeStart = future[0];
  const rangeEnd = new Date(future[future.length - 1].getTime() + durationMs);

  try {
    // One read for the whole span. Every status counts: a BOOKED exam blocks an
    // add just as an OPEN slot does.
    const occupied = await prisma.testCenterTimeSlot.findMany({
      where: { testCenterId, startAt: { lt: rangeEnd }, endAt: { gt: rangeStart } },
      select: { startAt: true, endAt: true },
    });

    const accepted: {
      testCenterId: string;
      startAt: Date;
      endAt: Date;
      isAdHoc: true;
    }[] = [];
    for (const startAt of future) {
      const endAt = new Date(startAt.getTime() + durationMs);
      if (occupied.some((row) => intervalsOverlap({ startAt, endAt }, row))) continue;
      accepted.push({ testCenterId, startAt, endAt, isAdHoc: true });
      // Track it so two candidates in the same request can't overlap each other.
      occupied.push({ startAt, endAt });
    }
    const skippedOverlap = future.length - accepted.length;
    if (accepted.length === 0) return { created: 0, skippedOverlap, skippedPast };

    const created = await prisma.$transaction(async (tx) => {
      await tx.testCenterAvailabilityException.deleteMany({
        where: {
          testCenterId,
          OR: accepted.map((row) => ({
            startAt: { lt: row.endAt },
            endAt: { gt: row.startAt },
          })),
        },
      });
      const result = await tx.testCenterTimeSlot.createMany({
        data: accepted,
        skipDuplicates: true,
      });
      return result.count;
    });

    invalidateAvailabilityCaches();
    return { created, skippedOverlap, skippedPast };
  } catch (error) {
    // Lost a race the pre-flight read missed. A batch insert aborts entirely on
    // one conflicting row, so retry one at a time and count the losers.
    if (isExclusionViolation(error) || isUniqueViolation(error)) {
      return createAdHocSlotsOneByOne(testCenterId, future, durationMs, skippedPast);
    }
    throw normalizeDbError(error, "Could not add slots");
  }
}

async function createAdHocSlotsOneByOne(
  testCenterId: string,
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
        await tx.testCenterAvailabilityException.deleteMany({
          where: { testCenterId, startAt: { lt: endAt }, endAt: { gt: startAt } },
        });
        await tx.testCenterTimeSlot.create({
          data: { testCenterId, startAt, endAt, status: "OPEN", isAdHoc: true },
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
 * Remove one slot for one date, leaving a tombstone so the recurring window
 * does not simply mint it again on the next read.
 */
export async function removeSlotForDate(
  testCenterId: string,
  slotId: string,
  reason?: string | null,
): Promise<
  | { ok: true; startAt: Date; endAt: Date }
  | { ok: false; code: "NOT_FOUND" | "OCCUPIED" }
> {
  try {
    const slot = await prisma.testCenterTimeSlot.findFirst({
      where: { id: slotId, testCenterId },
      select: { id: true, status: true, startAt: true, endAt: true },
    });
    if (!slot) return { ok: false, code: "NOT_FOUND" };
    if (slot.status !== "OPEN" && slot.status !== "BLOCKED") {
      return { ok: false, code: "OCCUPIED" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.testCenterAvailabilityException.upsert({
        where: { testCenterId_startAt: { testCenterId, startAt: slot.startAt } },
        create: {
          testCenterId,
          startAt: slot.startAt,
          endAt: slot.endAt,
          reason: reason?.trim() || null,
        },
        update: { endAt: slot.endAt, reason: reason?.trim() || null },
      });
      // Re-assert status: a booking could have claimed the slot between the
      // read above and here, and a paid booking must never lose its slot to a
      // stale Remove click.
      const deleted = await tx.testCenterTimeSlot.deleteMany({
        where: { id: slot.id, testCenterId, status: { in: ["OPEN", "BLOCKED"] } },
      });
      if (deleted.count === 0) throw new SlotAlreadyTakenError();
    });

    invalidateAvailabilityCaches();
    return { ok: true, startAt: slot.startAt, endAt: slot.endAt };
  } catch (error) {
    if (error instanceof SlotAlreadyTakenError) return { ok: false, code: "OCCUPIED" };
    throw normalizeDbError(error, "Could not remove slot");
  }
}

/** Block or unblock every eligible slot inside the given ranges. */
export async function bulkSetSlotBlockInSpans(
  testCenterId: string,
  ranges: SlotRange[],
  action: "BLOCK" | "UNBLOCK",
  reason?: string | null,
): Promise<BulkSlotResult> {
  const valid = ranges.filter((s) => s.toUtc > s.fromUtc);
  if (valid.length === 0) return { changed: 0, skippedOccupied: 0, skippedMissing: 0 };

  try {
    // Blocking a range the center has never materialised must still work, so
    // generate first — otherwise "block next Tuesday" silently does nothing.
    if (action === "BLOCK") {
      for (const range of valid) {
        await ensureSlotsForRange(testCenterId, range.fromUtc, range.toUtc);
      }
    }

    const where = {
      testCenterId,
      OR: valid.map((s) => ({ startAt: { gte: s.fromUtc, lt: s.toUtc } })),
    };
    const skippedOccupied = await prisma.testCenterTimeSlot.count({
      where: { ...where, status: { in: ["BOOKED", "HELD"] } },
    });

    const result = await prisma.testCenterTimeSlot.updateMany({
      where: { ...where, status: action === "BLOCK" ? "OPEN" : "BLOCKED" },
      data:
        action === "BLOCK"
          ? { status: "BLOCKED", blockReason: reason?.trim() || null }
          : { status: "OPEN", blockReason: null },
    });

    invalidateAvailabilityCaches();
    return { changed: result.count, skippedOccupied, skippedMissing: 0 };
  } catch (error) {
    throw normalizeDbError(error, "Could not update availability");
  }
}

/** Remove every eligible slot inside the given ranges, leaving tombstones. */
export async function bulkRemoveSlotsInSpans(
  testCenterId: string,
  ranges: SlotRange[],
  reason?: string | null,
): Promise<BulkSlotResult> {
  const valid = ranges.filter((s) => s.toUtc > s.fromUtc);
  if (valid.length === 0) return { changed: 0, skippedOccupied: 0, skippedMissing: 0 };

  try {
    const rows = await prisma.testCenterTimeSlot.findMany({
      where: {
        testCenterId,
        OR: valid.map((s) => ({ startAt: { gte: s.fromUtc, lt: s.toUtc } })),
      },
      select: { id: true, status: true, startAt: true, endAt: true },
    });
    const removable = rows.filter((r) => r.status === "OPEN" || r.status === "BLOCKED");
    const skippedOccupied = rows.length - removable.length;
    if (removable.length === 0) {
      return { changed: 0, skippedOccupied, skippedMissing: 0 };
    }

    const changed = await deleteSlotsWithExceptions(testCenterId, removable, reason);
    invalidateAvailabilityCaches();
    return { changed, skippedOccupied, skippedMissing: 0 };
  } catch (error) {
    throw normalizeDbError(error, "Could not remove slots");
  }
}

/** Same three actions, addressed by explicit slot id. */
export async function bulkSlotActionByIds(
  testCenterId: string,
  slotIds: string[],
  action: "BLOCK" | "UNBLOCK" | "REMOVE",
  reason?: string | null,
): Promise<BulkSlotResult> {
  const ids = [...new Set(slotIds)];
  if (ids.length === 0) return { changed: 0, skippedOccupied: 0, skippedMissing: 0 };

  try {
    const rows = await prisma.testCenterTimeSlot.findMany({
      where: { id: { in: ids }, testCenterId },
      select: { id: true, status: true, startAt: true, endAt: true },
    });
    const skippedMissing = ids.length - rows.length;
    const eligible = rows.filter((r) => r.status === "OPEN" || r.status === "BLOCKED");
    const skippedOccupied = rows.length - eligible.length;
    if (eligible.length === 0) {
      return { changed: 0, skippedOccupied, skippedMissing };
    }

    if (action === "REMOVE") {
      const changed = await deleteSlotsWithExceptions(testCenterId, eligible, reason);
      invalidateAvailabilityCaches();
      return { changed, skippedOccupied, skippedMissing };
    }

    // Re-assert the source status: a slot already in the target state isn't a
    // change, and a booking that landed since the read must not be flipped.
    const result = await prisma.testCenterTimeSlot.updateMany({
      where: {
        id: { in: eligible.map((r) => r.id) },
        testCenterId,
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

/** Entry point for the grid's bulk toolbar: ids win over ranges when both come. */
export async function runBulkSlotAction(
  testCenterId: string,
  input: {
    action: "BLOCK" | "UNBLOCK" | "REMOVE";
    spans?: { fromUtc: string; toUtc: string }[];
    slotIds?: string[];
    reason?: string;
  },
): Promise<BulkSlotResult> {
  if (input.slotIds) {
    return bulkSlotActionByIds(testCenterId, input.slotIds, input.action, input.reason);
  }
  const ranges: SlotRange[] = (input.spans ?? []).map((s) => ({
    fromUtc: new Date(s.fromUtc),
    toUtc: new Date(s.toUtc),
  }));
  return input.action === "REMOVE"
    ? bulkRemoveSlotsInSpans(testCenterId, ranges, input.reason)
    : bulkSetSlotBlockInSpans(testCenterId, ranges, input.action, input.reason);
}

/**
 * Change one slot's length by dragging its edge in the grid.
 *
 * Growing absorbs the neighbours it covers; shrinking hands the tail back as
 * base-grid rows rather than leaving a hole only a recurring window could
 * refill (an ad-hoc slot has none). A neighbour that is BOOKED or HELD refuses
 * the whole resize.
 */
export async function resizeSlot(
  testCenterId: string,
  slotId: string,
  durationMinutes: number,
): Promise<
  | { ok: true; slot: { id: string; startAt: Date; endAt: Date } }
  | { ok: false; code: "NOT_FOUND" | "OCCUPIED" | "BLOCKED_BY_BOOKING" }
> {
  const durationMs = durationMinutes * 60 * 1000;
  try {
    const slot = await prisma.testCenterTimeSlot.findFirst({
      where: { id: slotId, testCenterId },
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
      return {
        ok: true,
        slot: { id: slot.id, startAt: slot.startAt, endAt: slot.endAt },
      };
    }

    const neighbours = await prisma.testCenterTimeSlot.findMany({
      where: {
        testCenterId,
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
        await tx.testCenterTimeSlot.deleteMany({
          where: { id: { in: neighbours.map((n) => n.id) } },
        });
      }
      await tx.testCenterAvailabilityException.deleteMany({
        where: { testCenterId, startAt: { lt: newEnd }, endAt: { gt: slot.startAt } },
      });
      const row = await tx.testCenterTimeSlot.update({
        where: { id: slot.id },
        data: { endAt: newEnd },
        select: { id: true, startAt: true, endAt: true },
      });

      if (newEnd < slot.endAt) {
        const freed: {
          testCenterId: string;
          startAt: Date;
          endAt: Date;
          status: DoctorSlotStatus;
          blockReason: string | null;
          isAdHoc: boolean;
        }[] = [];
        const stepMs = BASE_SLOT_MINUTES * 60 * 1000;
        for (let t = newEnd.getTime(); t + stepMs <= slot.endAt.getTime(); t += stepMs) {
          freed.push({
            testCenterId,
            startAt: new Date(t),
            endAt: new Date(t + stepMs),
            status: slot.status,
            blockReason: slot.blockReason,
            isAdHoc: slot.isAdHoc,
          });
        }
        if (freed.length > 0) {
          await tx.testCenterTimeSlot.createMany({ data: freed, skipDuplicates: true });
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
 * Every slot in a range, whatever its status — the admin calendar's read.
 * Generates first so an unvisited week renders its windows.
 */
export async function listAdminSlotsInRange(
  testCenterId: string,
  fromUtc: Date,
  toUtc: Date,
): Promise<
  {
    id: string;
    startAt: string;
    endAt: string;
    status: DoctorSlotStatus;
    blockReason: string | null;
    isAdHoc: boolean;
  }[]
> {
  if (toUtc <= fromUtc) return [];
  try {
    await releaseExpiredHeldSlotsForTestCenters([testCenterId]);
    await ensureSlotsForRange(testCenterId, fromUtc, toUtc);
    const rows = await prisma.testCenterTimeSlot.findMany({
      where: { testCenterId, startAt: { gte: fromUtc, lt: toUtc } },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        blockReason: true,
        isAdHoc: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      status: r.status,
      blockReason: r.blockReason,
      isAdHoc: r.isAdHoc,
    }));
  } catch (error) {
    throw normalizeDbError(error, "Test center availability is unavailable");
  }
}
