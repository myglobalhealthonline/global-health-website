import { getAppointmentDayBucket, type AppointmentDayBucket } from "./format-datetime";

export type DayGroup<T> = {
  key: string;
  /** "unscheduled" for rows with no `scheduledAt` — never returned by
   *  `getAppointmentDayBucket`, added here so callers can special-case it. */
  bucket: AppointmentDayBucket | "unscheduled";
  /** Formatted weekday+date, populated only for `bucket === "later"`
   *  (see `getAppointmentDayBucket`) — "today"/"tomorrow" headers use a
   *  translated string from the caller's locale bundle instead. */
  label: string;
  items: T[];
};

/**
 * Groups appointment rows by calendar day, ascending, for the doctor portal
 * appointments list and dashboard "upcoming schedule" panel — both render
 * one color-coded header per group from this so proximity (today / tomorrow
 * / later) is visible without reading every row's date.
 *
 * Callers should pre-filter/pre-sort `rows` (e.g. exclude CANCELLED/
 * COMPLETED) — this only buckets by day and preserves input order within
 * each bucket. Unscheduled rows have no day to bucket into and are
 * returned as a single leading group.
 */
export function groupAppointmentsByDay<T extends { scheduledAt: string | null }>(
  rows: T[],
): DayGroup<T>[] {
  const unscheduled = rows.filter((a) => !a.scheduledAt);
  const scheduled = rows.filter((a) => a.scheduledAt);
  const byDay = new Map<string, DayGroup<T>>();
  for (const a of scheduled) {
    const { bucket, dayKey, label } = getAppointmentDayBucket(a.scheduledAt as string);
    if (!byDay.has(dayKey)) byDay.set(dayKey, { key: dayKey, bucket, label, items: [] });
    byDay.get(dayKey)!.items.push(a);
  }
  const groups = [...byDay.values()];
  if (unscheduled.length > 0) {
    groups.unshift({ key: "unscheduled", bucket: "unscheduled", label: "", items: unscheduled });
  }
  return groups;
}
