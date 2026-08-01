"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  CalendarPlus,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Square,
  Trash2,
  Unlock,
  User,
} from "lucide-react";
import { AppMenu, AppMenuItem, AppMenuLabel, AppMenuSeparator } from "@/components/AppMenu";
import { IconBtn } from "@/components/portal-atoms";
import type { CalendarItem } from "./calendar-types";
import { LegendDot, statusIcon, toneStyle } from "./calendar-block-ui";
import {
  CONSULT_FALLBACK_MIN,
  dayLabel,
  dropSlotsUnderConsultations,
  durationMinutes,
  zonedMinutesOfDay,
} from "./calendar-utils";

/**
 * Resource (lane) grid: ONE ROW PER DOCTOR for a single day, time running left
 * to right. The week grid stacks every doctor into the same seven columns, so
 * at "all doctors" scope its overlap lanes shrink each block to a sliver. Here
 * the doctor IS the axis, so a block's width only ever means duration —
 * adding doctors adds rows, never narrows anything.
 *
 * Actions live in a per-slot menu rather than corner buttons. A 15-minute block
 * is ~40px wide at this scale, which fits two 20px icons and nothing else; the
 * menu works at every width, states each action in words, and keeps the
 * markup free of buttons nested inside buttons.
 */

// Horizontal scale. 15 min = 40px — wide enough to read as a distinct block,
// and a 12-hour day lands at ~1,920px, which scrolls rather than compressing.
const HOUR_PX = 160;
const PX_PER_MIN = HOUR_PX / 60;
// Hour window for a day with nothing on it — an empty grid still has to read
// as a working day. A day with content fits the window to that content.
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;
// Floor on the fitted window, so a single 15-min slot doesn't collapse the
// grid to one lonely hour.
const MIN_SPAN_HOURS = 4;
const MIN_BLOCK_PX = 26;
// A full "09:00 – 09:30" range needs this much width; narrower blocks show the
// start time alone rather than a clipped range, which reads as a bug.
const LABEL_FULL_PX = 118;
const NAME_COL_PX = 208;
const LANE_PX = 46;

type DoctorLane = {
  doctorId: string;
  doctorName: string;
  items: CalendarItem[];
};

type Props = {
  /** Clinic-local day this grid draws ("YYYY-MM-DD"). */
  dayKey: string;
  /** Items already grouped onto `dayKey` in the viewer's tz. */
  items: CalendarItem[];
  tz: string;
  todayKey: string;
  /** Scroll this hour into view on mount — the capacity grid hands over the
   *  band the admin clicked, so the drill-down lands where they were looking. */
  focusHour?: number | null;
  onSelectOpenSlot: (item: CalendarItem) => void;
  onSelectConsultation: (item: CalendarItem) => void;
  onBlockSlot: (item: CalendarItem) => void;
  onUnblockSlot: (item: CalendarItem) => void;
  onRemoveSlot: (item: CalendarItem) => void;
  /** Bare slot ids currently selected (no `s-` prefix). */
  selectedIds: Set<string>;
  onToggleSelect: (item: CalendarItem) => void;
  /** Bulk endpoints are doctor-scoped, so a selection may only span one
   *  doctor. Set once the first slot is picked; other lanes then offer no
   *  select action until the selection is cleared. */
  selectionDoctorId: string | null;
  slotActionsBusy: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
};

function laneOf(item: CalendarItem): { id: string; name: string } {
  return {
    id: item.meta?.doctorId ?? "__unassigned__",
    name: item.meta?.doctorName ?? "Unassigned",
  };
}

export function LaneCalendar({
  dayKey,
  items,
  tz,
  todayKey,
  focusHour = null,
  onSelectOpenSlot,
  onSelectConsultation,
  onBlockSlot,
  onUnblockSlot,
  onRemoveSlot,
  selectedIds,
  onToggleSelect,
  selectionDoctorId,
  slotActionsBusy,
  onPrevDay,
  onNextDay,
  onToday,
}: Props) {
  const { lanes, startHour, endHour, counts } = useMemo(() => {
    const kept = dropSlotsUnderConsultations(items);
    const byDoctor = new Map<string, DoctorLane>();
    let contentMin: number | null = null;
    let contentMax: number | null = null;
    const counts = { total: 0, booked: 0, open: 0, blocked: 0 };
    for (const item of kept) {
      const { id, name } = laneOf(item);
      const lane = byDoctor.get(id) ?? { doctorId: id, doctorName: name, items: [] };
      lane.items.push(item);
      byDoctor.set(id, lane);

      const start = zonedMinutesOfDay(item.startAt, tz);
      const end =
        start +
        Math.max(
          item.endAt ? durationMinutes(item.startAt, item.endAt) : CONSULT_FALLBACK_MIN,
          1,
        );
      contentMin = contentMin === null ? start : Math.min(contentMin, start);
      contentMax = contentMax === null ? end : Math.max(contentMax, end);

      counts.total += 1;
      if (item.kind === "consultation" || item.status === "BOOKED" || item.status === "HELD") {
        counts.booked += 1;
      } else if (item.status === "BLOCKED") {
        counts.blocked += 1;
      } else {
        counts.open += 1;
      }
    }
    const lanes = [...byDoctor.values()].sort((a, b) =>
      a.doctorName.localeCompare(b.doctorName),
    );
    for (const lane of lanes) {
      lane.items.sort((a, b) => a.startAt.localeCompare(b.startAt));
    }
    if (contentMin === null || contentMax === null) {
      return { lanes, startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR, counts };
    }
    const start = Math.max(0, Math.floor(contentMin / 60));
    const end = Math.min(24, Math.max(Math.ceil(contentMax / 60), start + MIN_SPAN_HOURS));
    return { lanes, startHour: start, endHour: end, counts };
  }, [items, tz]);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const trackWidth = (endHour - startHour) * HOUR_PX;

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

  // Land on the band the admin drilled into (or the first block), not at the
  // left edge of a day that may start hours earlier.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledKey = useRef("");
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || focusHour === null) return;
    const key = `${dayKey}:${focusHour}`;
    if (lastScrolledKey.current === key) return;
    lastScrolledKey.current = key;
    // After paint, not during the effect: the track's width is set from state
    // in the same commit, so a scrollLeft written now is clamped against a
    // container that hasn't been laid out yet and lands short.
    const raf = requestAnimationFrame(() => {
      // A quarter-hour of lead so the first block of the band doesn't sit
      // flush under the sticky doctor column.
      el.scrollLeft = Math.max(0, (focusHour - startHour) * HOUR_PX - HOUR_PX / 4);
    });
    return () => cancelAnimationFrame(raf);
  }, [dayKey, focusHour, startHour, trackWidth]);

  const now = useNow(tz);
  const nowLeft =
    dayKey === todayKey && now.minutes !== null
      ? (now.minutes - startHour * 60) * PX_PER_MIN
      : null;

  return (
    <div className="gh-calendar-panel gh-card overflow-hidden p-0">
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--portal-line)" }}
      >
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--portal-text)" }}>
            {dayLabel(dayKey)}
          </h2>
          <p className="text-portal-micro" style={{ color: "var(--portal-muted)" }}>
            {lanes.length} {lanes.length === 1 ? "doctor" : "doctors"} · {counts.total} slots ·{" "}
            {counts.booked} booked · {counts.open} open
            {counts.blocked ? ` · ${counts.blocked} blocked` : ""}
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
            onClick={onPrevDay}
            ariaLabel="Previous day"
            style={{ width: 32, height: 32, border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </IconBtn>
          <IconBtn
            onClick={onNextDay}
            ariaLabel="Next day"
            style={{ width: 32, height: 32, border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronRight className="size-4" aria-hidden />
          </IconBtn>
        </div>
      </div>

      {lanes.length === 0 ? (
        <p className="px-4 py-10 text-center text-portal-compact" style={{ color: "var(--portal-muted)" }}>
          No slots or consultations on this day.
        </p>
      ) : (
        <div className="gh-lane-scroll" ref={scrollRef}>
          <div style={{ width: NAME_COL_PX + trackWidth }}>
            {/* Hour ruler — sticky while the lanes scroll vertically */}
            <div className="gh-lane-ruler" style={{ display: "flex" }}>
              <div
                className="gh-lane-name-col flex items-end px-3 pb-1.5 text-portal-micro font-bold uppercase tracking-[0.12em]"
                style={{ width: NAME_COL_PX, color: "var(--portal-muted)" }}
              >
                Doctor
              </div>
              <div style={{ position: "relative", width: trackWidth, height: 30 }}>
                {hours.map((h, i) => (
                  <span
                    key={h}
                    className="absolute bottom-1.5 text-portal-micro font-bold"
                    style={{ left: i * HOUR_PX + 4, color: "var(--portal-muted)" }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
            </div>

            {lanes.map((lane) => {
              const selectable =
                selectionDoctorId === null || selectionDoctorId === lane.doctorId;
              return (
                <div key={lane.doctorId} className="gh-lane-row" style={{ display: "flex" }}>
                  <div
                    className="gh-lane-name-col flex items-center gap-2.5 px-3 py-1.5"
                    style={{ width: NAME_COL_PX }}
                  >
                    <span
                      aria-hidden
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-portal-micro font-bold"
                      style={{ background: "var(--portal-well)", color: "var(--portal-primary)" }}
                    >
                      {initials(lane.doctorName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-portal-compact font-bold">
                        {lane.doctorName}
                      </span>
                      <span
                        className="block truncate text-portal-micro font-semibold"
                        style={{ color: "var(--portal-muted)" }}
                      >
                        {lane.items.length} {lane.items.length === 1 ? "slot" : "slots"}
                      </span>
                    </span>
                  </div>

                  <div
                    className="gh-lane-track"
                    style={{ position: "relative", width: trackWidth, height: LANE_PX }}
                  >
                    {hours.map((h, i) => (
                      <span
                        key={h}
                        aria-hidden
                        className="gh-lane-gridline"
                        style={{ left: i * HOUR_PX }}
                      />
                    ))}
                    {nowLeft !== null && nowLeft >= 0 && nowLeft <= trackWidth ? (
                      <span aria-hidden className="gh-lane-now-line" style={{ left: nowLeft }} />
                    ) : null}

                    {lane.items.map((item) => (
                      <LaneBlock
                        key={item.id}
                        item={item}
                        startHour={startHour}
                        tz={tz}
                        fmtTime={fmtTime}
                        nowMs={now.ms}
                        selected={selectedIds.has(item.id.replace(/^s-/, ""))}
                        selectable={selectable}
                        busy={slotActionsBusy}
                        onSelectOpenSlot={onSelectOpenSlot}
                        onSelectConsultation={onSelectConsultation}
                        onBlockSlot={onBlockSlot}
                        onUnblockSlot={onUnblockSlot}
                        onRemoveSlot={onRemoveSlot}
                        onToggleSelect={onToggleSelect}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-xs"
        style={{ borderTop: "1px solid var(--portal-line)", color: "var(--portal-muted)" }}
      >
        <LegendDot tone="var(--portal-success)" label="Open · click for actions" />
        <LegendDot tone="var(--portal-booked-fill)" label="Booked" />
        <LegendDot tone="var(--portal-danger)" label="Blocked" />
        <LegendDot tone="var(--portal-accent)" label="Now" />
      </div>
    </div>
  );
}

/** One positioned block, with its action menu. */
function LaneBlock({
  item,
  startHour,
  tz,
  fmtTime,
  nowMs,
  selected,
  selectable,
  busy,
  onSelectOpenSlot,
  onSelectConsultation,
  onBlockSlot,
  onUnblockSlot,
  onRemoveSlot,
  onToggleSelect,
}: {
  item: CalendarItem;
  startHour: number;
  tz: string;
  fmtTime: Intl.DateTimeFormat;
  /** Null until the first client tick — a slot can't be judged past or future
   *  without a clock, so booking stays off until one arrives. */
  nowMs: number | null;
  selected: boolean;
  selectable: boolean;
  busy: boolean;
  onSelectOpenSlot: (item: CalendarItem) => void;
  onSelectConsultation: (item: CalendarItem) => void;
  onBlockSlot: (item: CalendarItem) => void;
  onUnblockSlot: (item: CalendarItem) => void;
  onRemoveSlot: (item: CalendarItem) => void;
  onToggleSelect: (item: CalendarItem) => void;
}) {
  const start = zonedMinutesOfDay(item.startAt, tz);
  const minutes = Math.max(
    item.endAt ? durationMinutes(item.startAt, item.endAt) : CONSULT_FALLBACK_MIN,
    1,
  );
  const left = (start - startHour * 60) * PX_PER_MIN;
  const width = Math.max(minutes * PX_PER_MIN - 3, MIN_BLOCK_PX);

  const startLabel = fmtTime.format(new Date(item.startAt));
  const endLabel = item.endAt ? fmtTime.format(new Date(item.endAt)) : null;
  const timeLabel = endLabel ? `${startLabel} – ${endLabel}` : startLabel;
  const isConsult = item.kind === "consultation";
  const patientName = item.meta?.patientName || (isConsult ? item.title : null);
  const title = [timeLabel, patientName, item.meta?.blockReason, isConsult ? null : item.status]
    .filter(Boolean)
    .join(" · ");

  const manageable =
    item.kind === "slot" &&
    (item.status === "OPEN" || item.status === "BLOCKED") &&
    Boolean(item.meta?.doctorId);
  const bookable =
    item.kind === "slot" &&
    item.status === "OPEN" &&
    Boolean(item.meta?.doctorId) &&
    Boolean(item.meta?.countryCode) &&
    nowMs !== null &&
    new Date(item.startAt).getTime() > nowMs;
  const openable = isConsult || (item.status === "BOOKED" && Boolean(patientName));

  const body = (
    <span className="flex min-w-0 items-center gap-1.5">
      {selected ? <CheckSquare className="size-3 shrink-0" aria-hidden /> : statusIcon(item.status)}
      <span className="truncate">
        {patientName || (width >= LABEL_FULL_PX ? timeLabel : startLabel)}
      </span>
    </span>
  );

  const style = {
    position: "absolute" as const,
    left: left + 1,
    width,
    top: 4,
    bottom: 4,
    ...toneStyle(item),
    ...(selected
      ? { outline: "2px solid var(--portal-info)", outlineOffset: "1px" }
      : null),
  };

  // Booked time is never bulk-editable and has no per-slot admin action beyond
  // opening the record, so it stays a plain button rather than a menu trigger.
  if (!manageable) {
    if (openable) {
      return (
        <button
          type="button"
          title={title}
          onClick={() => onSelectConsultation(item)}
          className="gh-lane-block overflow-hidden rounded-md border px-2 text-left transition hover:brightness-105"
          style={style}
        >
          {body}
        </button>
      );
    }
    return (
      <span title={title} className="gh-lane-block overflow-hidden rounded-md border px-2" style={style}>
        {body}
      </span>
    );
  }

  return (
    <AppMenu
      align="start"
      contentClassName="gh-portal-menu-content min-w-[210px] p-1.5"
      trigger={
        <button
          type="button"
          title={`${title} · click for actions`}
          className="gh-lane-block overflow-hidden rounded-md border px-2 text-left transition hover:brightness-105"
          style={style}
        >
          {body}
        </button>
      }
    >
      <AppMenuLabel className="gh-portal-menu-label">
        {timeLabel} · {item.meta?.doctorName ?? "Slot"}
      </AppMenuLabel>
      {bookable ? (
        <AppMenuItem asChild>
          <button
            type="button"
            className="gh-portal-menu-item gh-portal-menu-item--icon w-full disabled:opacity-50"
            onClick={() => onSelectOpenSlot(item)}
          >
            <CalendarPlus className="size-3.5" aria-hidden /> Book this time
          </button>
        </AppMenuItem>
      ) : null}
      {item.status === "OPEN" ? (
        <AppMenuItem asChild>
          <button
            type="button"
            disabled={busy}
            className="gh-portal-menu-item gh-portal-menu-item--icon w-full disabled:opacity-50"
            onClick={() => onBlockSlot(item)}
          >
            <Ban className="size-3.5" aria-hidden /> Block this time
          </button>
        </AppMenuItem>
      ) : (
        <AppMenuItem asChild>
          <button
            type="button"
            disabled={busy}
            className="gh-portal-menu-item gh-portal-menu-item--icon w-full disabled:opacity-50"
            onClick={() => onUnblockSlot(item)}
          >
            <Unlock className="size-3.5" aria-hidden /> Re-open this slot
          </button>
        </AppMenuItem>
      )}
      <AppMenuItem asChild>
        <button
          type="button"
          disabled={busy}
          className="gh-portal-menu-item gh-portal-menu-item--icon w-full disabled:opacity-50"
          onClick={() => onRemoveSlot(item)}
        >
          <Trash2 className="size-3.5" aria-hidden /> Remove slot (this date)
        </button>
      </AppMenuItem>
      <AppMenuSeparator className="gh-portal-menu-separator" />
      {selectable ? (
        <AppMenuItem asChild>
          <button
            type="button"
            disabled={busy}
            className="gh-portal-menu-item gh-portal-menu-item--icon w-full disabled:opacity-50"
            onClick={() => onToggleSelect(item)}
          >
            {selected ? (
              <>
                <Square className="size-3.5" aria-hidden /> Deselect
              </>
            ) : (
              <>
                <CheckSquare className="size-3.5" aria-hidden /> Select for bulk action
              </>
            )}
          </button>
        </AppMenuItem>
      ) : (
        // Bulk endpoints take one doctor, so a selection can't span lanes.
        <p className="gh-portal-menu-note">
          <User className="size-3.5" aria-hidden /> Clear the selection to pick slots from this
          doctor
        </p>
      )}
    </AppMenu>
  );
}

function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** "Now" as clinic-local minutes-since-midnight AND an epoch instant, ticking
 *  every 30s. Both are null on the server: reading the clock during render is
 *  impure, and a block's "is this still bookable" answer has to come from the
 *  same tick that draws the current-time line. */
function useNow(tz: string): { minutes: number | null; ms: number | null } {
  const [now, setNow] = useState<{ minutes: number | null; ms: number | null }>({
    minutes: null,
    ms: null,
  });
  useEffect(() => {
    function tick() {
      const at = new Date();
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(at);
      const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
      const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
      setNow({ minutes: h * 60 + m, ms: at.getTime() });
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [tz]);
  return now;
}
