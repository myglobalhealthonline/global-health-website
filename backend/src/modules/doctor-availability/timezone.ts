import { DateTime } from "luxon";

/**
 * Clinic-timezone helpers for slot generation.
 *
 * `DoctorAvailability.startMinute/endMinute` are wall-clock minutes in the
 * doctor's clinic timezone (`Country.bookingSetting.timezone`). Concrete
 * `DoctorTimeSlot` rows are stored as UTC instants. These helpers do the
 * DST-correct conversion between the two — luxon resolves the per-date UTC
 * offset (including spring-forward / fall-back days) so we never emit an
 * Invalid Date or a slot at the wrong instant.
 */

/** A calendar day in a clinic's timezone — no time component. */
export type CalendarDay = { year: number; month: number; day: number };

/** Date-only sort/compare key (YYYYMMDD as a number) for a calendar day. */
export function calendarDayNumber(day: CalendarDay): number {
  return day.year * 10000 + day.month * 100 + day.day;
}

/**
 * Date-only key (YYYYMMDD) read from a Date in UTC. `DoctorAvailability`
 * effective bounds are stored as UTC midnight / end-of-day, so comparing them
 * as plain calendar dates (rather than instants) keeps "from date → to date"
 * semantics correct regardless of the clinic's offset.
 */
export function utcCalendarDayNumber(date: Date): number {
  return (
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate()
  );
}

/** Calendar day plus its weekday, normalized to 0=Sun..6=Sat. */
export type ClinicLocalDay = CalendarDay & { weekday: number };

/**
 * True when the runtime recognizes the IANA zone string. Dependency-free
 * (uses `Intl`) so it can gate validation and defensive fallbacks without
 * pulling luxon into every caller.
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a wall-clock minute-of-day on a given clinic-local calendar day
 * into the exact UTC instant, honoring the zone's DST rules for that date.
 *
 *   zonedWallClockToUtc({ year: 2026, month: 7, day: 15 }, 540, "Europe/Bucharest")
 *     → 2026-07-15T06:00:00Z   (Bucharest = UTC+3 in July; 09:00 local)
 *
 * DST gaps (spring-forward): a wall time inside the skipped hour doesn't
 * exist; luxon advances to the next valid instant. DST overlaps (fall-back)
 * resolve to the earlier occurrence. Both are acceptable for clinic
 * scheduling and always yield a valid Date. An unknown zone falls back to
 * treating the wall clock as UTC so generation degrades gracefully.
 */
export function zonedWallClockToUtc(
  day: CalendarDay,
  minuteOfDay: number,
  timeZone: string,
): Date {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const dt = DateTime.fromObject(
    { year: day.year, month: day.month, day: day.day, hour, minute },
    { zone: timeZone },
  );
  if (!dt.isValid) {
    return new Date(Date.UTC(day.year, day.month - 1, day.day, hour, minute));
  }
  return dt.toUTC().toJSDate();
}

/**
 * Read the clinic-local minute-of-day (0..1439) for a UTC instant. The
 * inverse direction of `zonedWallClockToUtc`: given a stored slot `startAt`,
 * tell us where it falls in the clinic's day so we can compare it against a
 * wall-clock peak window. DST-correct because luxon resolves the per-date
 * offset. An unknown zone falls back to UTC.
 *
 *   utcToClinicMinuteOfDay(new Date("2026-07-15T16:00:00Z"), "Europe/Bucharest")
 *     → 1140   (19:00 local; Bucharest = UTC+3 in July)
 */
export function utcToClinicMinuteOfDay(utc: Date, timeZone: string): number {
  const zone = isValidTimeZone(timeZone) ? timeZone : "utc";
  const dt = DateTime.fromJSDate(utc).setZone(zone);
  if (!dt.isValid) {
    return utc.getUTCHours() * 60 + utc.getUTCMinutes();
  }
  return dt.hour * 60 + dt.minute;
}

/**
 * Enumerate every clinic-local calendar day overlapping [fromUtc, toUtc],
 * padded ±1 day at each edge. The padding matters: a clinic-local day's
 * slots can land on a UTC instant just outside the requested range because
 * of the zone offset, so we over-generate and let the caller trim with its
 * own `startAt < fromUtc || startAt >= toUtc` guard.
 *
 * `weekday` is normalized to 0=Sun..6=Sat to match `DoctorAvailability.weekday`
 * (and the historical `Date#getUTCDay()` contract the old loop relied on).
 */
export function eachClinicLocalDay(
  fromUtc: Date,
  toUtc: Date,
  timeZone: string,
): ClinicLocalDay[] {
  const zone = isValidTimeZone(timeZone) ? timeZone : "utc";
  let cursor = DateTime.fromJSDate(fromUtc)
    .setZone(zone)
    .startOf("day")
    .minus({ days: 1 });
  const end = DateTime.fromJSDate(toUtc)
    .setZone(zone)
    .startOf("day")
    .plus({ days: 1 });

  const days: ClinicLocalDay[] = [];
  while (cursor <= end) {
    days.push({
      year: cursor.year,
      month: cursor.month,
      day: cursor.day,
      // luxon weekday: 1=Mon..7=Sun → 0=Sun..6=Sat
      weekday: cursor.weekday % 7,
    });
    cursor = cursor.plus({ days: 1 });
  }
  return days;
}
