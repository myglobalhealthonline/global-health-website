"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconBtn } from "@/components/portal-atoms";
import type { CalendarItem } from "./calendar-types";
import {
  dropSlotsUnderConsultations,
  rangeLabel,
  zonedMinutesOfDay,
  type WeekDay,
} from "./calendar-utils";

/**
 * Week × time-band capacity grid — the calendar's overview at a scope the
 * per-slot grids cannot draw.
 *
 * The week grid renders one positioned block per slot. On "all doctors × all
 * countries" that is ~1,700 blocks in seven columns: every overlap gets its own
 * lane, lanes divide the column width, and the result is a wall of unreadable
 * slivers. The admin's question at that scope isn't "what is this 15-minute
 * block" — it's "where is capacity thin". So aggregate: one cell per day per
 * band, shaded by utilisation, click to drop into the lane view for that
 * day + band.
 */

const BAND_HOURS = 2;
// Hour window for a week with nothing on it — an empty grid still has to read
// as a working day. A week that does have content fits the window to that
// content instead.
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;

export type CapacityCell = {
  dayKey: string;
  startHour: number;
  total: number;
  booked: number;
  open: number;
  blocked: number;
};

type Props = {
  weekDays: WeekDay[];
  /** Items grouped by clinic-local day key (viewer tz already applied). */
  itemsByDay: Map<string, CalendarItem[]>;
  tz: string;
  todayKey: string;
  /** Drill into the lane view for one day + band. */
  onSelectCell: (dayKey: string, startHour: number) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
};

/** Utilisation → forest ramp. A `--portal-*` token can't be interpolated, so
 *  the five stops are literal and mixed here; they are the well → primary ramp
 *  the portal already uses for filled surfaces. */
const RAMP: [number, number, number][] = [
  [242, 244, 238], // --portal-well
  [207, 224, 211],
  [143, 184, 160],
  [77, 138, 106],
  [29, 75, 54], // --portal-primary
];

function rampFill(utilisation: number): string {
  const x = Math.min(0.999, Math.max(0, utilisation)) * (RAMP.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = RAMP[i];
  const b = RAMP[i + 1] ?? RAMP[RAMP.length - 1];
  const mix = (n: 0 | 1 | 2) => Math.round(a[n] + (b[n] - a[n]) * f);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}

/** White text only once the fill is dark enough to carry it. */
function rampInk(utilisation: number): string {
  return utilisation >= 0.45 ? "#fff" : "var(--portal-text)";
}

export function CapacityCalendar({
  weekDays,
  itemsByDay,
  tz,
  todayKey,
  onSelectCell,
  onPrevWeek,
  onNextWeek,
  onToday,
}: Props) {
  const { cells, startHour, endHour } = useMemo(() => {
    // Slots hidden under a consultation of the same doctor are that
    // consultation, counted once — same rule the week grid draws by.
    const perDay = new Map<string, CalendarItem[]>();
    let contentMin: number | null = null;
    let contentMax: number | null = null;
    for (const day of weekDays) {
      const kept = dropSlotsUnderConsultations(itemsByDay.get(day.key) ?? []);
      perDay.set(day.key, kept);
      for (const item of kept) {
        const start = zonedMinutesOfDay(item.startAt, tz);
        contentMin = contentMin === null ? start : Math.min(contentMin, start);
        contentMax = contentMax === null ? start : Math.max(contentMax, start);
      }
    }
    const start =
      contentMin === null
        ? DEFAULT_START_HOUR
        : Math.floor(Math.floor(contentMin / 60) / BAND_HOURS) * BAND_HOURS;
    const end =
      contentMax === null
        ? DEFAULT_END_HOUR
        : Math.min(
            24,
            Math.max(
              start + BAND_HOURS,
              Math.ceil((Math.floor(contentMax / 60) + 1) / BAND_HOURS) * BAND_HOURS,
            ),
          );

    const cells = new Map<string, CapacityCell>();
    for (const day of weekDays) {
      for (let h = start; h < end; h += BAND_HOURS) {
        cells.set(`${day.key}:${h}`, {
          dayKey: day.key,
          startHour: h,
          total: 0,
          booked: 0,
          open: 0,
          blocked: 0,
        });
      }
      for (const item of perDay.get(day.key) ?? []) {
        const hour = Math.floor(zonedMinutesOfDay(item.startAt, tz) / 60);
        const band = Math.floor(hour / BAND_HOURS) * BAND_HOURS;
        const cell = cells.get(`${day.key}:${band}`);
        if (!cell) continue;
        cell.total += 1;
        if (item.kind === "consultation" || item.status === "BOOKED" || item.status === "HELD") {
          cell.booked += 1;
        } else if (item.status === "BLOCKED") {
          cell.blocked += 1;
        } else {
          cell.open += 1;
        }
      }
    }
    return { cells, startHour: start, endHour: end };
  }, [weekDays, itemsByDay, tz]);

  const bands = Array.from(
    { length: Math.max(1, Math.ceil((endHour - startHour) / BAND_HOURS)) },
    (_, i) => startHour + i * BAND_HOURS,
  );
  const gridColumns = `78px repeat(${weekDays.length}, minmax(0, 1fr))`;

  return (
    <div className="gh-calendar-panel gh-card overflow-hidden p-0">
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--portal-line)" }}
      >
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--portal-text)" }}>
            {weekDays.length
              ? rangeLabel(weekDays[0].key, weekDays[weekDays.length - 1].key)
              : ""}
          </h2>
          <p className="text-portal-micro" style={{ color: "var(--portal-muted)" }}>
            Each cell: booked of total · click to open the lane view
          </p>
        </div>
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

      <div className="gh-capacity-scroll px-4 py-4">
        <div className="gh-capacity-grid" style={{ gridTemplateColumns: gridColumns }}>
          <div />
          {weekDays.map((d) => {
            const isToday = d.key === todayKey;
            return (
              <div key={d.key} className="pb-2 text-center">
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
                      ? { background: "var(--portal-primary)", color: "#fff" }
                      : { color: "var(--portal-text)" }
                  }
                >
                  {d.dayNum}
                </div>
              </div>
            );
          })}

          {bands.map((band) => (
            <Band
              key={band}
              band={band}
              weekDays={weekDays}
              cells={cells}
              onSelectCell={onSelectCell}
            />
          ))}
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-4 px-4 py-2.5 text-xs"
        style={{ borderTop: "1px solid var(--portal-line)", color: "var(--portal-muted)" }}
      >
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-[120px] rounded-sm"
            style={{
              background: `linear-gradient(90deg, ${RAMP.map((c) => `rgb(${c.join(",")})`).join(", ")})`,
            }}
          />
          0% → 100% booked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full"
            style={{ background: "var(--portal-danger)" }}
          />
          contains blocked time
        </span>
      </div>
    </div>
  );
}

function Band({
  band,
  weekDays,
  cells,
  onSelectCell,
}: {
  band: number;
  weekDays: WeekDay[];
  cells: Map<string, CapacityCell>;
  onSelectCell: (dayKey: string, startHour: number) => void;
}) {
  const label = `${String(band).padStart(2, "0")}–${String(band + BAND_HOURS).padStart(2, "0")}`;
  return (
    <>
      <div
        className="flex items-center justify-end pr-2.5 text-portal-micro font-bold"
        style={{ color: "var(--portal-muted)" }}
      >
        {label}
      </div>
      {weekDays.map((d) => {
        const cell = cells.get(`${d.key}:${band}`);
        const total = cell?.total ?? 0;
        if (!total) {
          return (
            <div
              key={d.key}
              className="gh-capacity-cell gh-capacity-cell--empty"
              aria-label={`${d.weekday} ${label} · no slots`}
            >
              <span className="text-portal-micro" style={{ color: "var(--portal-muted)" }}>
                —
              </span>
            </div>
          );
        }
        const booked = cell?.booked ?? 0;
        const utilisation = booked / total;
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onSelectCell(d.key, band)}
            title={`${d.weekday} ${label} · ${booked} of ${total} booked${
              cell?.blocked ? ` · ${cell.blocked} blocked` : ""
            }`}
            className="gh-capacity-cell"
            style={{ background: rampFill(utilisation), color: rampInk(utilisation) }}
          >
            <span className="text-sm font-bold leading-none">
              {booked}/{total}
            </span>
            <span className="mt-1 text-portal-micro font-semibold opacity-80">
              {Math.round(utilisation * 100)}% booked
            </span>
            {cell?.blocked ? (
              <span
                aria-hidden
                className="absolute right-1.5 top-1.5 size-[7px] rounded-full"
                style={{ background: "var(--portal-danger)" }}
              />
            ) : null}
          </button>
        );
      })}
    </>
  );
}
