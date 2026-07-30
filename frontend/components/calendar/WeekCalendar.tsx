"use client";

import {
  Fragment,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Ban,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoveVertical,
  Square,
  Trash2,
  User,
} from "lucide-react";
import { IconBtn } from "@/components/portal-atoms";
import type { CalendarItem } from "./calendar-types";
import {
  CONSULT_FALLBACK_MIN,
  dropSlotsUnderConsultations,
  durationMinutes,
  zonedMinutesOfDay,
  type WeekDay,
} from "./calendar-utils";

// Row height per hour. Sized so the *smallest* slot a doctor can author
// (15 min = 40px) still fits a two-line block — time range + patient name —
// without clipping. Everything longer scales up from there.
const HOUR_PX = 160;
const PX_PER_MIN = HOUR_PX / 60;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 20;
const MIN_BLOCK_PX = 34; // floor < a 15-min slot's 40px span, so blocks keep a gap
// Height tiers: a block only shows what it can render without clipping.
const TWO_LINE_PX = 38; // time range + name
const THREE_LINE_PX = 58; // + doctor or consultation type
const GUTTER_PX = 56; // hour-label column
const MIN_LANE_PX = 74; // narrower than this and a lane can't show a name
// Narrowest a single day column can go before it stops reading as a day
// column (time + name clipped past usefulness) — floor for the per-day
// width used to size the visible-day count (see perDayMinPx below). Widened
// per-lane on laney weeks (all-doctors grid) so a stack of overlapping
// blocks doesn't shrink to nameless slivers. Days that don't fit slide into
// view via the day-step arrows — never a horizontal scrollbar.
const MIN_DAY_COL_PX = 200;

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
  /** Admin mode: block an OPEN slot. Renders a small ⃠ button in the block's
   *  top-right corner — the block's own click stays the booking flow, so
   *  blocking never costs the admin an extra step to book. */
  onBlockSlot?: (item: CalendarItem) => void;
  /** Admin mode: clicking a BLOCKED slot re-opens it. Without this, blocked
   *  blocks render as inert divs (the doctor portal uses onToggleSlot). */
  onSelectBlockedSlot?: (item: CalendarItem) => void;
  /** Admin mode: delete an OPEN or BLOCKED slot outright (that date only).
   *  Renders a 🗑 corner button beside the block one. */
  onRemoveSlot?: (item: CalendarItem) => void;
  /** Admin mode: change an OPEN or BLOCKED slot's length on the base grid. */
  onResizeSlot?: (item: CalendarItem) => void;
  /** Multi-select: while on, clicking an OPEN/BLOCKED slot selects it instead
   *  of running that slot's normal action, and the corner buttons step aside.
   *  Booked time is never selectable — bulk actions must not touch it. */
  selectionMode?: boolean;
  /** Bare slot ids currently selected (no `s-` prefix). */
  selectedIds?: Set<string>;
  onToggleSelect?: (item: CalendarItem) => void;
  /** Disables the block/unblock affordances while a mutation is in flight. */
  slotActionsBusy?: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  /** Multi-doctor surfaces (the admin calendar on "All doctors") label every
   *  block with its doctor — without it, side-by-side lanes are anonymous and
   *  an open slot doesn't say whose it is. Single-doctor pages omit it: the
   *  page header already names the doctor. */
  showDoctorName?: boolean;
  /** Copy overrides for the doctor portal (i18n). Admin omits this and
   *  gets the English defaults — admin is English-by-design. */
  labels?: {
    today?: string;
    prevWeekAria?: string;
    nextWeekAria?: string;
    clickToBlock?: string;
    clickToReopen?: string;
    bookThisTime?: string;
    blockThisTime?: string;
    removeThisSlot?: string;
    resizeThisSlot?: string;
    selectSlot?: string;
    deselectSlot?: string;
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

/** "23–29 June 2026" (or "30 Jun – 6 Jul 2026" across a month boundary) for
 *  an arbitrary [firstKey, lastKey] range — unlike calendar-utils' weekLabel
 *  (always the full Mon-Sun week), this reflects whatever subset of days is
 *  actually visible, so a windowed 4-day view says "10–13 Aug", not the
 *  underlying week's "10–16 Aug". */
function rangeLabel(firstKey: string, lastKey: string): string {
  const first = firstKey.split("-").map(Number);
  const last = lastKey.split("-").map(Number);
  const sameMonth = first[1] === last[1] && first[0] === last[0];
  const fmt = (parts: number[], withMonthYear: boolean) =>
    new Intl.DateTimeFormat("en-IE", {
      day: "numeric",
      ...(withMonthYear ? { month: "short", year: "numeric" } : {}),
      timeZone: "UTC",
    }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])));
  if (firstKey === lastKey) return fmt(first, true);
  return sameMonth
    ? `${first[2]}–${fmt(last, true)}`
    : `${fmt(first, true)} – ${fmt(last, true)}`;
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

export function WeekCalendar({
  anchorDayKey,
  weekDays,
  itemsByDay,
  tz,
  todayKey,
  onSelectOpenSlot,
  onSelectConsultation,
  onToggleSlot,
  onBlockSlot,
  onSelectBlockedSlot,
  onRemoveSlot,
  onResizeSlot,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
  slotActionsBusy = false,
  onPrevWeek,
  onNextWeek,
  onToday,
  showDoctorName = false,
  labels,
}: Props) {
  const t = {
    today: labels?.today ?? "Today",
    prevWeekAria: labels?.prevWeekAria ?? "Previous week",
    nextWeekAria: labels?.nextWeekAria ?? "Next week",
    clickToBlock: labels?.clickToBlock ?? "Click to block (mark busy)",
    clickToReopen: labels?.clickToReopen ?? "Click to re-open",
    bookThisTime: labels?.bookThisTime ?? "Book this time",
    blockThisTime: labels?.blockThisTime ?? "Block this time (mark unavailable)",
    removeThisSlot: labels?.removeThisSlot ?? "Remove this slot (this date only)",
    resizeThisSlot: labels?.resizeThisSlot ?? "Change this slot's length",
    selectSlot: labels?.selectSlot ?? "Select this slot",
    deselectSlot: labels?.deselectSlot ?? "Deselect this slot",
    legendOpen: labels?.legendOpen ?? "Open · click to book",
    legendBooked: labels?.legendBooked ?? "Booked",
    legendBlocked: labels?.legendBlocked ?? "Blocked",
  };
  // Measure the scroll container so the grid renders only as many day
  // columns as actually fit at a legible width — no forced horizontal
  // scrollbar on tablet/mobile. Falls back to all 7 days until measured
  // (matches the previous desktop behaviour, avoids a layout flash there).
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Lane count over the FULL week (not just the visible window) — visible
  // days feed the day-count calc below, so basing lane width on only the
  // visible days' lanes would create a feedback loop (fewer visible days ->
  // different lane count -> different visible-day count -> ...). Cheap: just
  // the max lane count, no positioning.
  const weekMaxLanes = useMemo(() => {
    let max = 1;
    for (const day of weekDays) {
      const raw = dropSlotsUnderConsultations(itemsByDay.get(day.key) ?? []);
      for (const p of packDay(raw, tz)) max = Math.max(max, p.lanes);
    }
    return max;
  }, [weekDays, itemsByDay, tz]);

  // A laney day (overlapping blocks split into side-by-side lanes) needs a
  // wider column than a plain single-lane day, or names clip. No case forces
  // a horizontal scrollbar anymore: worst case (many lanes, narrow screen)
  // is exactly 1 day shown, not an overflowing grid.
  const perDayMinPx = Math.max(MIN_DAY_COL_PX, weekMaxLanes * MIN_LANE_PX);
  const visibleCount = containerWidth
    ? Math.min(7, Math.max(1, Math.floor((containerWidth - GUTTER_PX) / perDayMinPx)))
    : 7;

  // Sliding day-window when fewer than 7 columns fit. Resets to the start of
  // the week whenever the week itself changes (new anchor) or the visible
  // count grows enough that the current offset would run past the end.
  const [rawWindowStart, setWindowStart] = useState(0);
  // Reset during render (React's "adjust state when a prop changes" pattern)
  // rather than in an effect: the old effect version painted one frame of the
  // new week still scrolled to the previous week's offset before correcting.
  const [prevAnchorDayKey, setPrevAnchorDayKey] = useState(anchorDayKey);
  if (prevAnchorDayKey !== anchorDayKey) {
    setPrevAnchorDayKey(anchorDayKey);
    setWindowStart(0);
  }
  // Clamping is derived, not stored — a widened container can no longer leave
  // the offset past the last column for a frame.
  const maxWindowStart = Math.max(0, weekDays.length - visibleCount);
  const windowStart = Math.min(rawWindowStart, maxWindowStart);

  const visibleDays = useMemo(
    () => weekDays.slice(windowStart, windowStart + visibleCount),
    [weekDays, windowStart, visibleCount],
  );
  const isWindowed = visibleCount < weekDays.length;
  const atWindowStart = windowStart <= 0;
  const atWindowEnd = windowStart + visibleCount >= weekDays.length;

  // Step the window by one day. At either edge, roll into the adjacent week
  // (refetches via the existing prev/next-week handlers) and land the window
  // on that week's near edge — so paging feels continuous across week
  // boundaries instead of stopping dead at day 1 or day 7.
  function stepDay(dir: -1 | 1) {
    if (dir === -1) {
      if (atWindowStart) {
        onPrevWeek();
        setWindowStart(maxWindowStart);
      } else {
        setWindowStart(Math.max(0, windowStart - 1));
      }
    } else {
      if (atWindowEnd) {
        onNextWeek();
        setWindowStart(0);
      } else {
        setWindowStart(Math.min(maxWindowStart, windowStart + 1));
      }
    }
  }

  // Positioned blocks per day + the visible hour window (expands to fit early
  // / late items so nothing is clipped). Lane count for width purposes comes
  // from weekMaxLanes above, not from here — this is render data only.
  const { perDay, startHour, endHour } = useMemo(() => {
    let minHour = DEFAULT_START_HOUR;
    let maxHour = DEFAULT_END_HOUR;
    const perDay = new Map<string, PositionedItem[]>();
    for (const day of visibleDays) {
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
  }, [visibleDays, itemsByDay, tz]);

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
          {visibleDays.length
            ? rangeLabel(visibleDays[0].key, visibleDays[visibleDays.length - 1].key)
            : ""}
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
          {/* Single chevron pair, dual-purpose: steps by day (rolling into
              the adjacent week at either edge via stepDay) once the grid is
              windowed to fewer than 7 columns; otherwise steps by week, same
              as before. */}
          <IconBtn
            onClick={() => (isWindowed ? stepDay(-1) : onPrevWeek())}
            ariaLabel={t.prevWeekAria}
            style={{ width: 32, height: 32, border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </IconBtn>
          <IconBtn
            onClick={() => (isWindowed ? stepDay(1) : onNextWeek())}
            ariaLabel={t.nextWeekAria}
            style={{ width: 32, height: 32, border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronRight className="size-4" aria-hidden />
          </IconBtn>
        </div>
      </div>

      <div className="gh-week-scroll" ref={scrollRef}>
        <div className="gh-week-grid">
          {/* Day header row — sticky while the hour grid scrolls */}
          <div
            className="gh-week-header-row grid"
            style={{
              gridTemplateColumns: `${GUTTER_PX}px repeat(${visibleDays.length}, minmax(0, 1fr))`,
              borderBottom: "1px solid var(--portal-line)",
            }}
          >
            <div />
            {visibleDays.map((d) => {
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
            style={{
              gridTemplateColumns: `${GUTTER_PX}px repeat(${visibleDays.length}, minmax(0, 1fr))`,
            }}
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
            {visibleDays.map((d) => {
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
                    // Geometry is kept separate from the tone so a block that
                    // needs a corner action (OPEN + admin) can hand the
                    // position to a wrapper and the colours to the inner
                    // button — the action button can't nest inside it.
                    const geometry: CSSProperties = {
                      position: "absolute",
                      top,
                      height,
                      left: `calc(${p.lane * laneWidth}% + 2px)`,
                      width: `calc(${laneWidth}% - 4px)`,
                    };
                    const style: CSSProperties = {
                      ...geometry,
                      ...toneStyle(p.item),
                    };
                    // Draw the SPAN, not just the start: a 45-min consult that
                    // reads "09:00" alone is silently assumed to be the grid's
                    // base step. "09:00 – 09:45" can't be misread.
                    const startLabel = fmtTime.format(new Date(p.item.startAt));
                    const endLabel = p.item.endAt
                      ? fmtTime.format(new Date(p.item.endAt))
                      : null;
                    const timeLabel = endLabel
                      ? `${startLabel} – ${endLabel}`
                      : startLabel;
                    const consultType = p.item.meta?.consultationType ?? null;
                    const doctorName = p.item.meta?.doctorName ?? null;
                    // On an all-doctors grid the doctor outranks the type: it's
                    // what tells two adjacent lanes apart.
                    const subLabel =
                      showDoctorName && doctorName ? doctorName : consultType;
                    // Only render what fits — a clipped line reads as a
                    // rendering bug, not as density.
                    const showSecond = height >= TWO_LINE_PX;
                    const showThird = height >= THREE_LINE_PX && Boolean(subLabel);
                    // Booked block: patient NAME is the hero, kept inside the
                    // block bounds (truncate + the block clips overflow). Open
                    // and blocked slots lead with the time — colour carries the
                    // status (green = open, red = blocked) — and pick up the
                    // doctor only where the grid spans several.
                    const inner = showPatient ? (
                      <>
                        <span className="block truncate text-portal-micro font-semibold leading-none opacity-90">
                          {timeLabel}
                        </span>
                        {showSecond ? (
                          <span className="mt-1 flex items-center gap-1 text-portal-meta font-bold leading-tight">
                            <User className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{patientName}</span>
                          </span>
                        ) : null}
                        {showThird ? (
                          <span className="mt-0.5 block truncate text-portal-micro font-medium leading-none opacity-80">
                            {subLabel}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 text-portal-thead font-bold leading-tight">
                          {statusIcon(p.item.status)}
                          <span className="truncate">{timeLabel}</span>
                        </span>
                        {showDoctorName && doctorName && showSecond ? (
                          <span className="mt-0.5 block truncate text-portal-micro font-medium leading-tight opacity-80">
                            {doctorName}
                          </span>
                        ) : null}
                      </>
                    );
                    // Hover always carries the full record, even when the block
                    // was too short to draw every line.
                    const fullTitle = showPatient
                      ? [timeLabel, patientName, doctorName, consultType]
                          .filter(Boolean)
                          .join(" · ")
                      : [timeLabel, doctorName, p.item.status]
                          .filter(Boolean)
                          .join(" · ");
                    // Selection wins over every other click behaviour: while
                    // picking slots for a bulk action, a stray click must not
                    // also book, block, or open a dialog.
                    const selectable =
                      selectionMode &&
                      Boolean(onToggleSelect) &&
                      p.item.kind === "slot" &&
                      (p.item.status === "OPEN" || p.item.status === "BLOCKED");
                    if (selectable) {
                      const bareId = p.item.id.replace(/^s-/, "");
                      const isSelected = selectedIds?.has(bareId) ?? false;
                      return (
                        <button
                          key={p.item.id}
                          type="button"
                          onClick={() => onToggleSelect?.(p.item)}
                          aria-pressed={isSelected}
                          title={`${timeLabel} · ${
                            isSelected ? t.deselectSlot : t.selectSlot
                          }`}
                          className="gh-week-block overflow-hidden rounded-md border px-1.5 py-1 text-left transition hover:brightness-105"
                          style={{
                            ...style,
                            // Ring rather than a colour change: the status tone
                            // still has to read while selecting.
                            outline: isSelected
                              ? "2px solid var(--portal-info)"
                              : undefined,
                            outlineOffset: isSelected ? "-2px" : undefined,
                            opacity: isSelected ? 1 : 0.75,
                          }}
                        >
                          <span className="flex items-center gap-1">
                            {isSelected ? (
                              <CheckSquare className="size-3 shrink-0" aria-hidden />
                            ) : (
                              <Square className="size-3 shrink-0 opacity-60" aria-hidden />
                            )}
                            <span className="min-w-0 flex-1">{inner}</span>
                          </span>
                        </button>
                      );
                    }
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
                          title={`${timeLabel} · ${
                            p.item.status === "OPEN"
                              ? t.clickToBlock
                              : t.clickToReopen
                          }`}
                          className="gh-week-block overflow-hidden rounded-md border px-1.5 py-1 text-left transition hover:brightness-105"
                          style={style}
                        >
                          {inner}
                        </button>
                      );
                    }
                    // Admin corner actions. `null` when this surface passes no
                    // admin handlers (doctor portal, patient views) — then the
                    // block renders exactly as it did before.
                    const cornerActions =
                      p.item.kind === "slot" &&
                      (p.item.status === "OPEN" || p.item.status === "BLOCKED") &&
                      ((onBlockSlot && p.item.status === "OPEN") ||
                        onResizeSlot ||
                        onRemoveSlot) ? (
                        // z-2 keeps the actions above their own block (solid
                        // tones sit at z-2) but BELOW the sticky day-header row
                        // (z-3, portal.css) — at z-3 they painted over the
                        // weekday labels when the grid was scrolled.
                        <span className="absolute right-0.5 top-0.5 z-[2] inline-flex gap-0.5">
                          {onBlockSlot && p.item.status === "OPEN" ? (
                            <CornerAction
                              label={t.blockThisTime}
                              title={`${timeLabel} · ${t.blockThisTime}`}
                              disabled={slotActionsBusy}
                              onClick={() => onBlockSlot(p.item)}
                            >
                              <Ban className="size-3" aria-hidden />
                            </CornerAction>
                          ) : null}
                          {onResizeSlot ? (
                            <CornerAction
                              label={t.resizeThisSlot}
                              title={`${timeLabel} · ${t.resizeThisSlot}`}
                              disabled={slotActionsBusy}
                              onClick={() => onResizeSlot(p.item)}
                            >
                              <MoveVertical className="size-3" aria-hidden />
                            </CornerAction>
                          ) : null}
                          {onRemoveSlot ? (
                            <CornerAction
                              label={t.removeThisSlot}
                              title={`${timeLabel} · ${t.removeThisSlot}`}
                              disabled={slotActionsBusy}
                              onClick={() => onRemoveSlot(p.item)}
                            >
                              <Trash2 className="size-3" aria-hidden />
                            </CornerAction>
                          ) : null}
                        </span>
                      ) : null;

                    if (bookable) {
                      const bookButton = (
                        <button
                          type="button"
                          onClick={() => onSelectOpenSlot(p.item)}
                          title={`${timeLabel} · ${t.bookThisTime}`}
                          className="gh-week-block gh-week-block--open overflow-hidden rounded-md border px-1.5 py-1 text-left transition hover:brightness-105"
                          style={
                            cornerActions
                              ? {
                                  position: "absolute",
                                  inset: 0,
                                  ...toneStyle(p.item),
                                }
                              : style
                          }
                        >
                          {inner}
                        </button>
                      );
                      if (!cornerActions) {
                        return <Fragment key={p.item.id}>{bookButton}</Fragment>;
                      }
                      // Admin: the block itself still books; the corner buttons
                      // block or remove the slot instead.
                      return (
                        <div key={p.item.id} style={geometry}>
                          {bookButton}
                          {cornerActions}
                        </div>
                      );
                    }
                    if (
                      onSelectBlockedSlot &&
                      p.item.kind === "slot" &&
                      p.item.status === "BLOCKED"
                    ) {
                      const reopenButton = (
                        <button
                          type="button"
                          disabled={slotActionsBusy}
                          onClick={() => onSelectBlockedSlot(p.item)}
                          title={`${timeLabel} · ${
                            p.item.meta?.blockReason ?? t.legendBlocked
                          } · ${t.clickToReopen}`}
                          className="gh-week-block overflow-hidden rounded-md border px-1.5 py-1 text-left transition hover:brightness-105 disabled:opacity-60"
                          style={
                            cornerActions
                              ? { position: "absolute", inset: 0, ...toneStyle(p.item) }
                              : style
                          }
                        >
                          {inner}
                        </button>
                      );
                      if (!cornerActions) {
                        return <Fragment key={p.item.id}>{reopenButton}</Fragment>;
                      }
                      return (
                        <div key={p.item.id} style={geometry}>
                          {reopenButton}
                          {cornerActions}
                        </div>
                      );
                    }
                    if (isConsult || isBookedWithPatient) {
                      return (
                        <button
                          key={p.item.id}
                          type="button"
                          onClick={() => onSelectConsultation(p.item)}
                          title={fullTitle}
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
                        title={
                          p.item.meta?.blockReason
                            ? `${timeLabel} · ${p.item.meta.blockReason}`
                            : fullTitle
                        }
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

/** Small solid-red icon button riding in a slot block's top-right corner —
 *  the admin's block/remove affordances. Deliberately tiny (20px) so it fits
 *  even a 15-min block's 40px span without covering the time label. */
function CornerAction({
  label,
  title,
  disabled,
  onClick,
  children,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={title}
      className="gh-week-block-action inline-flex size-5 items-center justify-center rounded-md border opacity-70 shadow-sm transition hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
      // Neutral surface, not another red fill: a danger-toned button on a
      // BLOCKED block's danger-toned fill was a red square on red.
      style={{
        borderColor: "var(--portal-line-strong)",
        background: "var(--portal-surface)",
        color: "var(--portal-danger)",
      }}
    >
      {children}
    </button>
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
