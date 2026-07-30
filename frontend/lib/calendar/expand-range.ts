import { BASE_SLOT_MINUTES } from "@/lib/constants";
import { zonedLocalDateTimeToUtc } from "@/components/calendar/calendar-utils";

/**
 * Turning "these dates, these hours" into the start instant of every base-grid
 * slot it covers — what adding availability posts.
 *
 * Conversion happens here, in the timezone the calendar is displaying, so the
 * API never has to guess a zone. Block / unblock / remove no longer come
 * through this path: they act on the slots ticked on the grid, by id.
 */

/** Matches the API's per-request bound. */
export const MAX_RANGE_SLOTS = 2000;
/** A year of days is plenty and keeps a fat-fingered date out of trouble. */
export const MAX_RANGE_DAYS = 366;

export type RangeProblem =
  | "END_DATE_BEFORE_START"
  | "NO_MATCHING_DAYS"
  | "BAD_TIME"
  | "TOO_SHORT"
  | "TOO_MANY";

/** Every "YYYY-MM-DD" from `from` to `to` inclusive; empty if inverted or
 *  unparseable. Iterated in UTC because these are calendar dates, not
 *  instants — DST must not skip or repeat a day. */
export function eachDate(from: string, to: string): string[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  const out: string[] = [];
  for (let t = start; t <= end; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
    if (out.length >= MAX_RANGE_DAYS) break;
  }
  return out;
}

/** 0 = Sunday … 6 = Saturday for a "YYYY-MM-DD", matching `Date#getDay()` and
 *  the weekday column on DoctorAvailability. Read in UTC because the string is
 *  a calendar date, not an instant. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Minutes since midnight for "HH:mm"; null when unparseable. */
export function toMinutes(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return mins >= 0 && mins <= 24 * 60 ? mins : null;
}

export function minutesToHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

type ParsedRange = { dates: string[]; startMin: number; endMin: number };

/** Shared validation for both expansions. `00:00` as an end time means
 *  end-of-day, not minute zero — an evening clinic running to midnight is
 *  legitimate and must not trip the "end after start" guard.
 *
 *  `weekdays` narrows the range to particular days of the week ("every Monday
 *  and Wednesday between these dates"); empty or omitted means every day. */
function parseRange(
  fromDate: string,
  toDate: string,
  startTime: string,
  endTime: string,
  weekdays?: number[],
): { parsed: ParsedRange } | { problem: RangeProblem } {
  const all = eachDate(fromDate, toDate);
  const dates =
    weekdays && weekdays.length > 0
      ? all.filter((d) => weekdays.includes(weekdayOf(d)))
      : all;
  if (all.length === 0) return { problem: "END_DATE_BEFORE_START" };
  if (dates.length === 0) return { problem: "NO_MATCHING_DAYS" };
  const startMin = toMinutes(startTime);
  const rawEnd = toMinutes(endTime);
  if (startMin === null || rawEnd === null) return { problem: "BAD_TIME" };
  const endMin = rawEnd === 0 ? 24 * 60 : rawEnd;
  if (endMin - startMin < BASE_SLOT_MINUTES) return { problem: "TOO_SHORT" };
  return { parsed: { dates, startMin, endMin } };
}

/**
 * Start instant of every base-grid slot in the range — what "add slots" posts.
 */
export function expandSlotStarts(
  fromDate: string,
  toDate: string,
  startTime: string,
  endTime: string,
  tz: string,
  weekdays?: number[],
): { instants: string[]; problem: RangeProblem | null } {
  const result = parseRange(fromDate, toDate, startTime, endTime, weekdays);
  if ("problem" in result) return { instants: [], problem: result.problem };
  const { dates, startMin, endMin } = result.parsed;

  const out: string[] = [];
  for (const date of dates) {
    for (let m = startMin; m + BASE_SLOT_MINUTES <= endMin; m += BASE_SLOT_MINUTES) {
      const iso = zonedLocalDateTimeToUtc(`${date}T${minutesToHhmm(m)}`, tz);
      if (iso) out.push(iso);
      if (out.length > MAX_RANGE_SLOTS) {
        return { instants: [], problem: "TOO_MANY" };
      }
    }
  }
  return { instants: out, problem: null };
}

/** How many base-grid slots a range covers — for "Block 96 slots" style copy. */
export function countRangeSlots(
  fromDate: string,
  toDate: string,
  startTime: string,
  endTime: string,
  weekdays?: number[],
): number {
  const result = parseRange(fromDate, toDate, startTime, endTime, weekdays);
  if ("problem" in result) return 0;
  const { dates, startMin, endMin } = result.parsed;
  const perDay = Math.floor((endMin - startMin) / BASE_SLOT_MINUTES);
  return dates.length * perDay;
}
