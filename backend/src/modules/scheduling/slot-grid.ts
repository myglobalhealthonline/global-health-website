import { Prisma, type DoctorSlotStatus } from "@prisma/client";
// The timezone helpers are already owner-agnostic (they only ever see a zone
// string and wall-clock minutes). They still live under `doctor-availability/`
// for now: moving the file would touch every doctor import for no behavioural
// gain, so that cleanup is deliberately deferred.
import {
  calendarDayNumber,
  eachClinicLocalDay,
  utcCalendarDayNumber,
  zonedWallClockToUtc,
} from "../doctor-availability/timezone.js";

/**
 * Owner-agnostic slot-grid rules, shared by the doctor and test-center
 * availability services.
 *
 * Everything here is PURE — no Prisma queries, no caches, no owner concept.
 * That is the whole selection criterion for what belongs in this file: the two
 * services keep their own claim/generation code (which is raw SQL against their
 * own table, plus owner-specific pause and suspension policy), and share only
 * the arithmetic that decides which spans a set of weekly windows justifies and
 * which materialised rows have gone stale.
 *
 * These functions were extracted from `doctor-availability.service.ts`, which
 * re-exports them so no existing caller changed. `doctor-availability.test.ts`
 * passing untouched is the proof that the extraction was a pure move.
 */

/**
 * Product-wide base grid. Recurring windows generate on it and consultations
 * consume consecutive base slots to fit their real length, so a resize snaps to
 * it too. Mirrors the frontend's `BASE_SLOT_MINUTES`.
 */
export const BASE_SLOT_MINUTES = 15;

/**
 * Raised when a conditional claim (`UPDATE … WHERE status = 'OPEN'`) matches no
 * row. Defined here so the doctor and test-center services throw ONE class and
 * an `instanceof` check in a shared caller stays correct whichever booking path
 * produced it.
 */
export class SlotAlreadyTakenError extends Error {
  constructor() {
    super("This slot is no longer available. Please pick another.");
    this.name = "SlotAlreadyTakenError";
  }
}

/** A window's shape, independent of which table it was read from. */
export type AvailabilityWindow = {
  /** 0 = Sunday … 6 = Saturday. Matches `Date#getDay()`. */
  weekday: number;
  /** Wall-clock minutes from midnight, LOCAL to the owner's timezone. */
  startMinute: number;
  endMinute: number;
  slotDurationMinutes: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
};

export type SlotSpan = { startAt: Date; endAt: Date };

/**
 * True when two spans overlap: the first starts before the second ends AND
 * ends after the second starts. Exposed for unit tests of the mixed-duration
 * generation rules.
 */
export function intervalsOverlap(a: SlotSpan, b: SlotSpan): boolean {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

/**
 * Every base-grid span the given recurring windows justify in
 * [fromUtc, toUtc) — the single definition of "a window-derived slot".
 *
 * Shared by generation and the window-change reconcile on purpose: if the two
 * computed candidates independently they could disagree, and a slot neither
 * side claimed would either be deleted while still legitimate or linger while
 * orphaned.
 *
 * `exceptions` are admin-removed single dates; a candidate overlapping one is
 * never re-created, which is the whole point of the exception row.
 */
export function expandWindowCandidates(
  windows: AvailabilityWindow[],
  exceptions: SlotSpan[],
  timeZone: string,
  fromUtc: Date,
  toUtc: Date,
): SlotSpan[] {
  if (toUtc <= fromUtc) return [];
  if (windows.length === 0) return [];

  const generated: SlotSpan[] = [];

  // Iterate owner-local calendar days (not UTC midnights). `startMinute` is
  // wall-clock in `timeZone`; `zonedWallClockToUtc` resolves the per-date offset
  // so DST transitions land on the right instant. Edge days are over-generated
  // (eachClinicLocalDay pads ±1) and trimmed by the fromUtc/toUtc guard below.
  for (const day of eachClinicLocalDay(fromUtc, toUtc, timeZone)) {
    for (const win of windows) {
      if (win.weekday !== day.weekday) continue;
      // Effective bounds are date-only ("from date → to date"); compare as
      // calendar dates so a positive-offset zone isn't off by one at edges.
      const dayNum = calendarDayNumber(day);
      if (win.effectiveFrom && dayNum < utcCalendarDayNumber(win.effectiveFrom)) {
        continue;
      }
      if (win.effectiveUntil && dayNum > utcCalendarDayNumber(win.effectiveUntil)) {
        continue;
      }
      const duration = Math.max(5, win.slotDurationMinutes);
      for (
        let minute = win.startMinute;
        minute + duration <= win.endMinute;
        minute += duration
      ) {
        const startAt = zonedWallClockToUtc(day, minute, timeZone);
        const endAt = new Date(startAt.getTime() + duration * 60 * 1000);
        if (startAt < fromUtc || startAt >= toUtc) continue;
        if (exceptions.some((ex) => intervalsOverlap({ startAt, endAt }, ex))) {
          continue;
        }
        generated.push({ startAt, endAt });
      }
    }
  }
  return generated;
}

/**
 * Candidates with no existing row at the same start.
 *
 * Extracted and exported for the regression test: this used to be a COUNT
 * comparison ("the range already holds as many slots as we'd generate, so skip
 * the insert"), which quietly assumed the existing rows were always a subset of
 * the candidates. An owner with leftover BLOCKED slots from a deleted window
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
 * Materialised rows that no live window justifies any more.
 *
 * TWO RULES, and the difference between them is load-bearing:
 *
 *   • OPEN — exact-span match. A window whose step changed no longer generates
 *     the old spans, so they go.
 *   • BLOCKED — overlap match, NOT exact span. A block is the owner saying "I
 *     am busy then", and it does not come back: regeneration only ever mints
 *     OPEN. Applying the exact-span rule here would mean any window whose step
 *     drifted turned busy marks into bookable time on the next window edit —
 *     the same silent-loss bug this sweep exists to prevent, pointed at the
 *     owner instead. Only a block that overlaps NO live window is a true
 *     orphan, and those are what this deletes.
 */
export function selectStaleSlots<
  T extends { startAt: Date; endAt: Date; status?: DoctorSlotStatus },
>(existing: T[], candidates: SlotSpan[]): T[] {
  const span = (s: SlotSpan) => `${s.startAt.getTime()}:${s.endAt.getTime()}`;
  const owned = new Set(candidates.map(span));
  return existing.filter((e) => {
    if (e.status === "BLOCKED") {
      return !candidates.some((c) => intervalsOverlap(e, c));
    }
    return !owned.has(span(e));
  });
}

/** Prisma unique-constraint violation — here, @@unique([ownerId, startAt]). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/** Postgres exclusion-constraint violation (23P01) — not modeled in the Prisma schema. */
export function isExclusionViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("23P01") || message.toLowerCase().includes("exclusion constraint")
  );
}
