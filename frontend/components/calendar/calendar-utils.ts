/**
 * Pure date helpers for the calendar surfaces. Grid math runs on UTC
 * calendar dates (no timezone — a month grid is just calendar dates);
 * item placement uses `localDayKey` so a slot/consultation lands on the
 * day it falls on in the *viewer's* timezone.
 */
import type { CalendarItem } from "./calendar-types";

export type DayCell = {
  year: number;
  month: number; // 1-12
  day: number;
  key: string; // "YYYY-MM-DD"
  inMonth: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Monday-first weekday headers (matches EU clinic convention). */
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function dayKeyOf(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 6×7 grid of calendar dates for `month` (1-12), Monday-first, padded with
 *  trailing/leading days from adjacent months. */
export function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=Sun
  const mondayOffset = (firstWeekday + 6) % 7;
  const startMs = Date.UTC(year, month - 1, 1 - mondayOffset);
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startMs + i * 86400000);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    cells.push({ year: y, month: m, day, key: dayKeyOf(y, m, day), inMonth: m === month });
  }
  return cells;
}

/** "YYYY-MM-DD" for an ISO instant rendered in `tz`. en-CA emits ISO order. */
export function localDayKey(iso: string, tz: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function groupItemsByLocalDay(
  items: CalendarItem[],
  tz: string,
): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const it of items) {
    const key = localDayKey(it.startAt, tz);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(it);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.startAt.localeCompare(b.startAt));
  }
  return map;
}

export function todayKey(tz: string): string {
  return localDayKey(new Date().toISOString(), tz);
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-IE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

/** ISO UTC window covering the visible 42-cell grid (± a day of padding) —
 *  used to scope the availability / calendar fetch for a month. */
export function monthGridRangeIso(
  year: number,
  month: number,
): { fromIso: string; toIso: string } {
  const grid = buildMonthGrid(year, month);
  const first = grid[0];
  const last = grid[grid.length - 1];
  const fromMs = Date.UTC(first.year, first.month - 1, first.day) - 86400000;
  const toMs = Date.UTC(last.year, last.month - 1, last.day) + 2 * 86400000;
  return { fromIso: new Date(fromMs).toISOString(), toIso: new Date(toMs).toISOString() };
}

/** "2026-06-18" → "Thu 18 June 2026". */
export function dayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y) return dayKey;
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Parse "YYYY-MM" → {year, month}; falls back to the current month. */
export function parseYearMonth(value: string | null | undefined): {
  year: number;
  month: number;
} {
  if (value) {
    const m = /^(\d{4})-(\d{2})$/.exec(value);
    if (m) return { year: Number(m[1]), month: Number(m[2]) };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function yearMonthParam(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

/** Minutes `tz` is ahead of UTC at `date` (e.g. +60 for Europe/Lisbon in DST). */
function tzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour === "24" ? "0" : map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** UTC instant of local midnight on `dayKey` in `tz`. */
function zonedDayStartUtc(dayKey: string, tz: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const offset = tzOffsetMinutes(new Date(guess), tz);
  return new Date(guess - offset * 60000);
}

/**
 * UTC ISO window for a span of clinic-local days [fromDayKey, toDayKey]
 * (inclusive) — used by the doctor's whole-day / date-range time-off control.
 * `toDayKey` defaults to `fromDayKey` (a single day). The window runs from the
 * start of the first day to the start of the day *after* the last.
 */
export function zonedDayRangeUtc(
  fromDayKey: string,
  toDayKey: string,
  tz: string,
): { fromIso: string; toIso: string } {
  const from = zonedDayStartUtc(fromDayKey, tz);
  // start of (toDay + 1)
  const [y, m, d] = toDayKey.split("-").map(Number);
  const nextDayKey = dayKeyOf(
    ...((): [number, number, number] => {
      const next = new Date(Date.UTC(y, m - 1, d + 1));
      return [next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()];
    })(),
  );
  const to = zonedDayStartUtc(nextDayKey, tz);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}
