"use client";

import { type CSSProperties, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconBtn } from "@/components/portal-atoms";
import { formatAppTime } from "@/lib/format-datetime";
import type { CalendarItem } from "./calendar-types";
import {
  durationMinutes,
  weekLabel,
  zonedMinutesOfDay,
  type WeekDay,
} from "./calendar-utils";

const HOUR_PX = 48; // row height per hour
const PX_PER_MIN = HOUR_PX / 60;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 20;
const CONSULT_FALLBACK_MIN = 30; // consultations carry no end time

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
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
};

type PositionedItem = {
  item: CalendarItem;
  top: number;
  height: number;
  lane: number;
  lanes: number;
};

function toneStyle(item: CalendarItem): CSSProperties {
  if (item.kind === "consultation") {
    return {
      borderColor: "var(--portal-info)",
      background: "var(--portal-info-soft)",
      color: "var(--portal-info-text)",
    };
  }
  switch (item.status) {
    case "OPEN":
      return {
        borderColor: "var(--portal-success)",
        background: "var(--portal-success-soft)",
        color: "var(--portal-success-text)",
      };
    case "BLOCKED":
      return {
        borderColor: "var(--portal-danger)",
        background: "var(--portal-danger-soft)",
        color: "var(--portal-danger-text)",
      };
    case "BOOKED":
      return {
        borderColor: "var(--portal-info)",
        background: "var(--portal-info-soft)",
        color: "var(--portal-info-text)",
      };
    default: // HELD
      return {
        borderColor: "var(--portal-warning)",
        background: "var(--portal-warning-soft)",
        color: "var(--portal-warning-text)",
      };
  }
}

function hourLabel(h: number): string {
  const display = ((h + 11) % 12) + 1;
  return `${display} ${h < 12 ? "AM" : "PM"}`;
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

/** Drop the BOOKED/HELD slot block when a consultation already occupies the
 *  same start — the consultation carries the patient name, the slot is noise. */
function dedupeBookedSlots(items: CalendarItem[]): CalendarItem[] {
  const consultStarts = new Set(
    items.filter((i) => i.kind === "consultation").map((i) => i.startAt),
  );
  return items.filter(
    (i) =>
      !(
        i.kind === "slot" &&
        (i.status === "BOOKED" || i.status === "HELD") &&
        consultStarts.has(i.startAt)
      ),
  );
}

export function WeekCalendar({
  anchorDayKey,
  weekDays,
  itemsByDay,
  tz,
  todayKey,
  onSelectOpenSlot,
  onSelectConsultation,
  onPrevWeek,
  onNextWeek,
  onToday,
}: Props) {
  // Positioned blocks per day + the visible hour window (expands to fit early
  // / late items so nothing is clipped).
  const { perDay, startHour, endHour } = useMemo(() => {
    let minHour = DEFAULT_START_HOUR;
    let maxHour = DEFAULT_END_HOUR;
    const perDay = new Map<string, PositionedItem[]>();
    for (const day of weekDays) {
      const raw = dedupeBookedSlots(itemsByDay.get(day.key) ?? []);
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

  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );
  const bodyHeight = (endHour - startHour) * HOUR_PX;

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
            Today
          </button>
          <IconBtn
            onClick={onPrevWeek}
            ariaLabel="Previous week"
            style={{ width: 32, height: 32, border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </IconBtn>
          <IconBtn
            onClick={onNextWeek}
            ariaLabel="Next week"
            style={{ width: 32, height: 32, border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronRight className="size-4" aria-hidden />
          </IconBtn>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="gh-week-grid" style={{ minWidth: 720 }}>
          {/* Day header row */}
          <div
            className="grid"
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
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
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
                  className="pr-2 text-right text-[10px] font-semibold"
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
              return (
                <div
                  key={d.key}
                  style={{
                    position: "relative",
                    height: bodyHeight,
                    borderLeft: "1px solid var(--portal-line)",
                  }}
                >
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
                    const height = Math.max(p.height * PX_PER_MIN - 2, 16);
                    const bookable =
                      p.item.kind === "slot" &&
                      p.item.status === "OPEN" &&
                      new Date(p.item.startAt).getTime() > Date.now();
                    const isConsult = p.item.kind === "consultation";
                    const label =
                      isConsult
                        ? p.item.meta?.patientName || p.item.title
                        : p.item.status === "OPEN"
                          ? "Open"
                          : p.item.status === "BLOCKED"
                            ? "Blocked"
                            : p.item.status;
                    const style: CSSProperties = {
                      position: "absolute",
                      top,
                      height,
                      left: `calc(${p.lane * laneWidth}% + 2px)`,
                      width: `calc(${laneWidth}% - 4px)`,
                      ...toneStyle(p.item),
                    };
                    const inner = (
                      <>
                        <span className="block truncate text-[11px] font-bold leading-tight">
                          {formatAppTime(p.item.startAt, tz)}
                        </span>
                        <span className="block truncate text-[11px] leading-tight">
                          {label}
                        </span>
                      </>
                    );
                    if (bookable) {
                      return (
                        <button
                          key={p.item.id}
                          type="button"
                          onClick={() => onSelectOpenSlot(p.item)}
                          title="Book this time"
                          className="gh-week-block gh-week-block--open rounded-md border px-1.5 py-1 text-left transition hover:brightness-105"
                          style={style}
                        >
                          {inner}
                        </button>
                      );
                    }
                    if (isConsult) {
                      return (
                        <button
                          key={p.item.id}
                          type="button"
                          onClick={() => onSelectConsultation(p.item)}
                          title={p.item.meta?.consultationType ?? p.item.title}
                          className="gh-week-block rounded-md border px-1.5 py-1 text-left transition hover:brightness-105"
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
                        className="gh-week-block rounded-md border px-1.5 py-1"
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
        <LegendDot tone="var(--portal-success)" label="Open · click to book" />
        <LegendDot tone="var(--portal-info)" label="Booked" />
        <LegendDot tone="var(--portal-danger)" label="Blocked" />
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
