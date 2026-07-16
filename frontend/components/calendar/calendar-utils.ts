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
export function tzOffsetMinutes(date: Date, tz: string): number {
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

/** Convert a wall-clock `datetime-local` value ("YYYY-MM-DDTHH:mm") read in
 *  `tz` into a UTC ISO instant. Empty/invalid input returns "". */
export function zonedLocalDateTimeToUtc(local: string, tz: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offset = tzOffsetMinutes(new Date(guess), tz);
  return new Date(guess - offset * 60000).toISOString();
}

/** UTC instant of local midnight on `dayKey` in `tz`. */
export function zonedDayStartUtc(dayKey: string, tz: string): Date {
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

// ── Week-grid helpers ────────────────────────────────────────────────────────
// The admin doctor-availability page renders a Google-Calendar-style week grid
// (7 day columns × hour rows). Placement is by clinic-local wall-clock minutes,
// so a slot lands on the right day + row regardless of DST.

export type WeekDay = { key: string; weekday: string; dayNum: number };

/** 0 = Sun … 6 = Sat for a calendar date (timezone-independent). */
export function dayOfWeek(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Shift a "YYYY-MM-DD" key by whole days (calendar math, no timezone). */
export function addDaysKey(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dayKeyOf(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Shift by whole weeks — used by the week nav (prev/next). */
export function addWeeksKey(dayKey: string, delta: number): string {
  return addDaysKey(dayKey, delta * 7);
}

/** Monday-first list of the 7 day cells for the week containing `anchorDayKey`. */
export function weekDaysOf(anchorDayKey: string): WeekDay[] {
  const mondayOffset = (dayOfWeek(anchorDayKey) + 6) % 7;
  const monday = addDaysKey(anchorDayKey, -mondayOffset);
  return WEEKDAY_LABELS.map((weekday, i) => {
    const key = addDaysKey(monday, i);
    return { key, weekday, dayNum: Number(key.split("-")[2]) };
  });
}

/** ISO UTC window covering the clinic-local Mon→Sun week for `anchorDayKey`. */
export function weekRangeIso(
  anchorDayKey: string,
  tz: string,
): { fromIso: string; toIso: string } {
  const days = weekDaysOf(anchorDayKey);
  const from = zonedDayStartUtc(days[0].key, tz);
  const to = zonedDayStartUtc(addDaysKey(days[6].key, 1), tz);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

/** "23–29 June 2026" (or "30 Jun – 6 Jul 2026" across a month boundary). */
export function weekLabel(anchorDayKey: string): string {
  const days = weekDaysOf(anchorDayKey);
  const first = days[0].key.split("-").map(Number);
  const last = days[6].key.split("-").map(Number);
  const sameMonth = first[1] === last[1] && first[0] === last[0];
  const fmt = (parts: number[], withMonthYear: boolean) =>
    new Intl.DateTimeFormat("en-IE", {
      day: "numeric",
      ...(withMonthYear ? { month: "short", year: "numeric" } : {}),
      timeZone: "UTC",
    }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])));
  return sameMonth
    ? `${first[2]}–${fmt(last, true)}`
    : `${fmt(first, true)} – ${fmt(last, true)}`;
}

/** Parse a "YYYY-MM-DD" week anchor from a search param; falls back to today
 *  in `tz`. Any calendar date in the target week works as the anchor. */
export function parseWeekAnchor(
  value: string | null | undefined,
  tz: string,
): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return todayKey(tz);
}

/** Clinic-local minutes-since-midnight (0–1439) for an instant. DST-safe:
 *  reads the wall clock directly in `tz` rather than doing offset arithmetic. */
export function zonedMinutesOfDay(iso: string, tz: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/** Duration between two ISO instants in whole minutes (≥ 0). */
export function durationMinutes(startIso: string, endIso: string): number {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 60000));
}

/**
 * Last resort only: a consultation with neither a claimed slot nor a service
 * duration behind it. Everything else arrives with a real `endAt` and is drawn
 * across the minutes it actually occupies.
 */
export const CONSULT_FALLBACK_MIN = 30;

/**
 * A consultation occupies its whole time span, so drop ANY slot block — OPEN,
 * BOOKED, or HELD — that starts inside a consultation *of the same doctor*. A
 * booked time then never shows a duplicate green "open" slot (or a redundant
 * booked slot) beside the patient block: the consultation carries the patient
 * name, and that doctor's slot underneath it is noise.
 *
 * Scoping by doctor is load-bearing on the all-doctors admin calendar: one
 * doctor being booked at 09:00 says nothing about whether the rest of the
 * roster is free then. Matching on time alone hid every other doctor's open
 * 09:00 slot and rendered the whole roster as unavailable.
 *
 * Single-doctor surfaces (the doctor's own portal) stamp no doctorId on
 * anything — there is only one doctor to speak of — so everything unscoped
 * shares one bucket and dedupes on time exactly as it always has. Only a grid
 * that actually names its doctors gets per-doctor scoping. A slot is kept when
 * its doctor has no consultations, and an unscoped consultation never hides a
 * *named* doctor's slot: showing a real open slot beats hiding one.
 */
const UNSCOPED_DOCTOR = "__unscoped__";

export function dropSlotsUnderConsultations(
  items: CalendarItem[],
): CalendarItem[] {
  const spansByDoctor = new Map<string, { start: number; end: number }[]>();
  for (const i of items) {
    if (i.kind !== "consultation") continue;
    const key = i.meta?.doctorId ?? UNSCOPED_DOCTOR;
    const start = new Date(i.startAt).getTime();
    const durMin = i.endAt
      ? durationMinutes(i.startAt, i.endAt)
      : CONSULT_FALLBACK_MIN;
    const list = spansByDoctor.get(key) ?? [];
    list.push({ start, end: start + durMin * 60_000 });
    spansByDoctor.set(key, list);
  }
  if (spansByDoctor.size === 0) return items;
  return items.filter((i) => {
    if (i.kind !== "slot") return true;
    const spans = spansByDoctor.get(i.meta?.doctorId ?? UNSCOPED_DOCTOR);
    if (!spans) return true;
    const s = new Date(i.startAt).getTime();
    return !spans.some((c) => s >= c.start && s < c.end);
  });
}
