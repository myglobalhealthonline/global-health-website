"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Ban, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { IconBtn } from "@/components/portal-atoms";
import type { CalendarItem } from "./calendar-types";
import {
  durationMinutes,
  weekLabel,
  zonedMinutesOfDay,
  type WeekDay,
} from "./calendar-utils";

const HOUR_PX = 88; // row height per hour — roomy: a 15-min slot = 22px, no overlap
const PX_PER_MIN = HOUR_PX / 60;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 20;
const CONSULT_FALLBACK_MIN = 30; // consultations carry no end time
const MIN_BLOCK_PX = 18; // floor < a 15-min slot's 22px span, so blocks keep a gap

type Props = {
  /** Any calendar date inside the week to render ("YYYY-MM-DD"). */
  anchorDayKey: string;
  weekDays: WeekDay[];
  /** Items grouped by clinic-local day key (viewer tz already applied). */
  itemsByDay: Map<string, CalendarItem[]>;
  tz: string;
  todayKey: string;
  /** Fires when the admin clicks a bookable OPEN slot. */
  onSelectOpenSlot: (item: CalendarItem) => void;
  /** Fires when the admin clicks a booked consultation block. */
  onSelectConsultation: (item: CalendarItem) => void;
  /** Doctor mode: when provided, clicking an OPEN or BLOCKED slot toggles it
   *  (block / re-open) instead of opening the admin booking dialog. Omit for
   *  the admin booking flow. */
  onToggleSlot?: (item: CalendarItem) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  /** Copy overrides for the doctor portal (i18n). Admin omits this and
   *  gets the English defaults — admin is English-by-design. */
  labels?: {
    today?: string;
    prevWeekAria?: string;
    nextWeekAria?: string;
    clickToBlock?: string;
    clickToReopen?: string;
    bookThisTime?: string;
    legendOpen?: string;
    legendBooked?: string;
    legendBlocked?: string;
  };
};

type PositionedItem = {
  item: CalendarItem;
  top: number;
  height: number;
  lane: number;
  lanes: number;
};

// A solid, elevated block — used for every OCCUPIED state (booked, held,
// blocked) so it reads as a filled event, not empty space. `tone` is the base
// hex; text goes white and a shadow lifts it above the pale OPEN slots.
function solidTone(tone: string): CSSProperties {
  return {
    borderColor: tone,
    background: tone,
    color: "#fff",
    boxShadow: "0 1px 4px rgba(16, 23, 19, 0.22)",
    fontWeight: 600,
    zIndex: 2,
  };
}

// Deep slate for booked appointments — darker than --portal-info so the white
// patient name reads with strong contrast. Tokenized (portal.css
// --portal-booked-fill) so it's defined once alongside the other status tones.
const BOOKED_FILL = "var(--portal-booked-fill)";

function toneStyle(item: CalendarItem): CSSProperties {
  // Booked consultations are the thing an admin most needs to spot — solid fill.
  if (item.kind === "consultation") {
    return solidTone(BOOKED_FILL);
  }
  switch (item.status) {
    case "OPEN":
      // Available time recedes: pale, outline-forward, so booked blocks pop.
      return {
        borderColor: "var(--portal-success)",
        background: "var(--portal-success-soft)",
        color: "var(--portal-success-text)",
      };
    case "BLOCKED":
      return solidTone("var(--portal-danger)");
    case "BOOKED":
      return solidTone(BOOKED_FILL);
    default: // HELD
      return solidTone("var(--portal-warning)");
  }
}

/** Minutes-since-midnight "now", ticking every 30s in the given tz — used for
 *  the current-time indicator line. Null on the server (no flash of a wrong
 *  line before hydration). */
function useNowMinutes(tz: string): number | null {
  const [minutes, setMinutes] = useState<number | null>(null);
  useEffect(() => {
    function tick() {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
      const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
      setMinutes(h * 60 + m);
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [tz]);
  return minutes;
}

// 24-hour gutter label, matching the 24-hour block times below.
function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

// Slot status isn't color-only: a small glyph rides next to the time so
// color-blind users can tell BLOCKED/BOOKED/HELD apart without the legend.
// OPEN has no icon — its pale outline already reads as "empty".
function statusIcon(status: string) {
  switch (status) {
    case "BLOCKED":
      return <Ban className="size-3 shrink-0" aria-hidden />;
    case "BOOKED":
      return <User className="size-3 shrink-0" aria-hidden />;
    case "HELD":
      return <Clock className="size-3 shrink-0" aria-hidden />;
    default:
      return null;
  }
}

/** Greedy lane packing so overlapping blocks sit side-by-side instead of
 *  stacking. Single-doctor overlaps are rare (a booked slot + its consultation
 *  are deduped upstream), but time-off blocks can still coincide. */
function packDay(items: CalendarItem[], tz: string): PositionedItem[] {
  const sorted = [...items].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const laneEnds: number[] = []; // end-minute of the last item in each lane
  const placed = sorted.map((item) => {
    const start = zonedMinutesOfDay(item.startAt, tz);
    const dur = item.endAt
      ? durationMinutes(item.startAt, item.endAt)
      : CONSULT_FALLBACK_MIN;
    const end = start + Math.max(dur, 1);
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    return { item, start, end, lane };
  });
  const lanes = laneEnds.length || 1;
  return placed.map((p) => ({
    item: p.item,
    top: p.start,
    height: p.end - p.start,
    lane: p.lane,
    lanes,
  }));
}

/** A consultation occupies its whole time span. Drop ANY slot block — OPEN,
 *  BOOKED, or HELD — that starts inside a consultation, so a booked time never
 *  shows a duplicate green "open" slot (or a redundant booked slot) beside the
 *  patient block. The consultation carries the patient name; the slot is noise. */
function dropSlotsUnderConsultations(items: CalendarItem[]): CalendarItem[] {
  const consults = items
    .filter((i) => i.kind === "consultation")
    .map((c) => {
      const start = new Date(c.startAt).getTime();
      const durMin = c.endAt ? durationMinutes(c.startAt, c.endAt) : CONSULT_FALLBACK_MIN;
      return { start, end: start + durMin * 60_000 };
    });
  if (consults.length === 0) return items;
  return items.filter((i) => {
    if (i.kind !== "slot") return true;
    const s = new Date(i.startAt).getTime();
    return !consults.some((c) => s >= c.start && s < c.end);
  });
}

export function WeekCalendar({
  anchorDayKey,
  weekDays,
  itemsByDay,
  tz,
  todayKey,
  onSelectOpenSlot,
  onSelectConsultation,
  onToggleSlot,
  onPrevWeek,
  onNextWeek,
  onToday,
  labels,
}: Props) {
  const t = {
    today: labels?.today ?? "Today",
    prevWeekAria: labels?.prevWeekAria ?? "Previous week",
    nextWeekAria: labels?.nextWeekAria ?? "Next week",
    clickToBlock: labels?.clickToBlock ?? "Click to block (mark busy)",
    clickToReopen: labels?.clickToReopen ?? "Click to re-open",
    bookThisTime: labels?.bookThisTime ?? "Book this time",
    legendOpen: labels?.legendOpen ?? "Open · click to book",
    legendBooked: labels?.legendBooked ?? "Booked",
    legendBlocked: labels?.legendBlocked ?? "Blocked",
  };
  // Positioned blocks per day + the visible hour window (expands to fit early
  // / late items so nothing is clipped).
  const { perDay, startHour, endHour } = useMemo(() => {
    let minHour = DEFAULT_START_HOUR;
    let maxHour = DEFAULT_END_HOUR;
    const perDay = new Map<string, PositionedItem[]>();
    for (const day of weekDays) {
      const raw = dropSlotsUnderConsultations(itemsByDay.get(day.key) ?? []);
      const positioned = packDay(raw, tz);
      for (const p of positioned) {
        minHour = Math.min(minHour, Math.floor(p.top / 60));
        maxHour = Math.max(maxHour, Math.ceil((p.top + p.height) / 60));
      }
      perDay.set(day.key, positioned);
    }
    return {
      perDay,
      startHour: Math.max(0, minHour),
      endHour: Math.min(24, Math.max(maxHour, minHour + 1)),
    };
  }, [weekDays, itemsByDay, tz]);

  // Explicit 24-hour clock (en-GB, hour12:false) so every block reads the same
  // — en-IE, used elsewhere, flips to AM/PM which looked inconsistent.
  const fmtTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: tz,
      }),
    [tz],
  );

  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );
  const bodyHeight = (endHour - startHour) * HOUR_PX;
  const nowMinutes = useNowMinutes(tz);
  const nowTop =
    nowMinutes !== null ? (nowMinutes - startHour * 60) * PX_PER_MIN : null;

  return (
    <div className="gh-calendar-panel gh-card overflow-hidden p-0">
      {/* Header — week label + nav */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--portal-line)" }}
      >
        <h2 className="text-base font-bold" style={{ color: "var(--portal-text)" }}>
          {weekLabel(anchorDayKey)}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToday}
            className="rounded-[999px] px-3 py-1.5 text-xs font-semibold transition hover:bg-[var(--portal-well)]"
            style={{ border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            {t.today}
          </button>
          <IconBtn
            onClick={onPrevWeek}
            ariaLabel={t.prevWeekAria}
            style={{ width: 32, height: 32, border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </IconBtn>
          <IconBtn
            onClick={onNextWeek}
            ariaLabel={t.nextWeekAria}
            style={{ width: 32, height: 32, border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronRight className="size-4" aria-hidden />
          </IconBtn>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="gh-week-grid" style={{ minWidth: 720 }}>
          {/* Day header row — sticky while the hour grid scrolls */}
          <div
            className="gh-week-header-row grid"
            style={{
              gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))",
              borderBottom: "1px solid var(--portal-line)",
            }}
          >
            <div />
            {weekDays.map((d) => {
              const isToday = d.key === todayKey;
              return (
                <div
                  key={d.key}
                  className="px-2 py-2 text-center"
                  style={{ borderLeft: "1px solid var(--portal-line)" }}
                >
                  <div
                    className="text-portal-micro font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--portal-muted)" }}
                  >
                    {d.weekday}
                  </div>
                  <div
                    className="mx-auto mt-1 flex size-7 items-center justify-center rounded-full text-sm font-bold"
                    style={
                      isToday
                        ? { background: "var(--portal-info)", color: "#fff" }
                        : { color: "var(--portal-text)" }
                    }
                  >
                    {d.dayNum}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time gutter + day columns */}
          <div
            className="grid"
            style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}
          >
            {/* Hour gutter */}
            <div style={{ position: "relative", height: bodyHeight }}>
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="pr-2 text-right text-portal-micro font-semibold"
                  style={{
                    position: "absolute",
                    top: i * HOUR_PX - 6,
                    right: 0,
                    color: "var(--portal-muted)",
                  }}
                >
                  {hourLabel(h)}
                </div>
              ))}
            </div>

            {/* One positioned column per day */}
            {weekDays.map((d) => {
              const positioned = perDay.get(d.key) ?? [];
              const isTodayCol = d.key === todayKey;
              return (
                <div
                  key={d.key}
                  className={isTodayCol ? "gh-week-day-col--today" : undefined}
                  style={{
                    position: "relative",
                    height: bodyHeight,
                    borderLeft: "1px solid var(--portal-line)",
                  }}
                >
                  {isTodayCol && nowTop !== null && nowTop >= 0 && nowTop <= bodyHeight ? (
                    <div className="gh-week-now-line" style={{ top: nowTop }}>
                      <span className="gh-week-now-dot" aria-hidden />
                    </div>
                  ) : null}
                  {/* Hour gridlines */}
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      style={{
                        position: "absolute",
                        top: i * HOUR_PX,
                        left: 0,
                        right: 0,
                        borderTop: "1px solid var(--portal-line)",
                        opacity: 0.5,
                      }}
                    />
                  ))}

                  {positioned.map((p) => {
                    const laneWidth = 100 / p.lanes;
                    const top = (p.top - startHour * 60) * PX_PER_MIN;
                    const height = Math.max(
                      p.height * PX_PER_MIN - 2,
                      MIN_BLOCK_PX,
                    );
                    const bookable =
                      p.item.kind === "slot" &&
                      p.item.status === "OPEN" &&
                      new Date(p.item.startAt).getTime() > Date.now();
                    const isConsult = p.item.kind === "consultation";
                    // A booked availability slot that knows its patient (doctor
                    // calendar) reads + behaves like a consultation block:
                    // patient name as the hero, click to open the detail drawer.
                    const isBookedWithPatient =
                      p.item.kind === "slot" &&
                      p.item.status === "BOOKED" &&
                      Boolean(p.item.meta?.patientName);
                    const showPatient = isConsult || isBookedWithPatient;
                    const patientName =
                      p.item.meta?.patientName || p.item.title;
                    const style: CSSProperties = {
                      position: "absolute",
                      top,
                      height,
                      left: `calc(${p.lane * laneWidth}% + 2px)`,
                      width: `calc(${laneWidth}% - 4px)`,
                      ...toneStyle(p.item),
                    };
                    const time = fmtTime.format(new Date(p.item.startAt));
                    // Booked block: patient NAME is the hero, kept inside the
                    // block bounds (truncate + the block clips overflow). Open
                    // and blocked slots show only the time — colour carries the
                    // status (green = open, red = blocked), no text label.
                    const inner = showPatient ? (
                      <>
                        <span className="block truncate text-portal-micro font-semibold leading-none opacity-90">
                          {time}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-portal-meta font-bold leading-tight">
                          <User className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{patientName}</span>
                        </span>
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-portal-thead font-bold leading-tight">
                        {statusIcon(p.item.status)}
                        <span className="truncate">{time}</span>
                      </span>
                    );
                    // Doctor mode: click an OPEN/BLOCKED slot to toggle it.
                    const toggleable =
                      onToggleSlot &&
                      p.item.kind === "slot" &&
                      (p.item.status === "OPEN" || p.item.status === "BLOCKED");
                    if (toggleable) {
                      return (
                        <button
                          key={p.item.id}
                          type="button"
                          onClick={() => onToggleSlot(p.item)}
                          title={
                            p.item.status === "OPEN"
                              ? t.clickToBlock
                              : t.clickToReopen
                          }
                          className="gh-week-block overflow-hidden rounded-md border px-1.5 py-1 text-left transition hover:brightness-105"
                          style={style}
                        >
                          {inner}
                        </button>
                      );
                    }
                    if (bookable) {
                      return (
                        <button
                          key={p.item.id}
                          type="button"
                          onClick={() => onSelectOpenSlot(p.item)}
                          title={t.bookThisTime}
                          className="gh-week-block gh-week-block--open overflow-hidden rounded-md border px-1.5 py-1 text-left transition hover:brightness-105"
                          style={style}
                        >
                          {inner}
                        </button>
                      );
                    }
                    if (isConsult || isBookedWithPatient) {
                      return (
                        <button
                          key={p.item.id}
                          type="button"
                          onClick={() => onSelectConsultation(p.item)}
                          title={p.item.meta?.consultationType ?? p.item.title}
                          className="gh-week-block overflow-hidden rounded-md border px-1.5 py-1 text-left transition hover:brightness-105"
                          style={style}
                        >
                          {inner}
                        </button>
                      );
                    }
                    return (
                      <div
                        key={p.item.id}
                        title={p.item.meta?.blockReason ?? p.item.status}
                        className="gh-week-block overflow-hidden rounded-md border px-1.5 py-1"
                        style={style}
                      >
                        {inner}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-xs"
        style={{ borderTop: "1px solid var(--portal-line)", color: "var(--portal-muted)" }}
      >
        <LegendDot tone="var(--portal-success)" label={t.legendOpen} />
        <LegendDot tone="var(--portal-info)" label={t.legendBooked} />
        <LegendDot tone="var(--portal-danger)" label={t.legendBlocked} />
      </div>
    </div>
  );
}

function LegendDot({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: tone }} />
      {label}
    </span>
  );
}
