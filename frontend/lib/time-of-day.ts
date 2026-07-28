/**
 * Wall-clock time-of-day helpers for availability windows.
 *
 * An `<input type="time">` can only express 00:00–23:59, so a window that ends
 * at midnight comes back as "00:00". Parsed naively that is minute 0, which
 * fails every `end > start` guard — a perfectly normal 16:00 → midnight evening
 * clinic gets rejected with "End time must be after start time".
 *
 * The API models end-of-day as minute 1440 (`endMinute` is `min(1).max(24*60)`
 * on both availability routes, and slot generation stops at
 * `minute + duration <= endMinute`, so no slot ever starts at 1440). End times
 * therefore go through `endTimeToMinutes`, which maps "00:00" onto that
 * boundary; start times keep the plain parse.
 */

export const MINUTES_IN_DAY = 24 * 60;

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Parse a START time (or any plain wall-clock value). */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Parse an END time: midnight means end-of-day (1440), never minute 0. */
export function endTimeToMinutes(t: string): number {
  const min = timeToMinutes(t);
  return min === 0 ? MINUTES_IN_DAY : min;
}

/** Value for an `<input type="time">` — 1440 has to round-trip as "00:00". */
export function minutesToTimeInput(min: number): string {
  return formatMinutes(min % MINUTES_IN_DAY);
}

/** Display label — an end-of-day window reads better as "24:00" than "00:00". */
export function minutesToTimeLabel(min: number): string {
  return formatMinutes(min);
}
