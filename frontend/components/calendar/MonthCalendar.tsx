"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarItem } from "./calendar-types";
import {
  buildMonthGrid,
  WEEKDAY_LABELS,
  monthLabel,
  dayLabel,
} from "./calendar-utils";
import { IconBtn } from "@/components/portal-atoms";

type Props = {
  year: number;
  month: number; // 1-12
  itemsByDay: Map<string, CalendarItem[]>;
  selectedDay: string | null;
  todayKey: string;
  onSelectDay: (key: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
};

function summarize(items: CalendarItem[] | undefined) {
  let consults = 0;
  let open = 0;
  let blocked = 0;
  let booked = 0;
  for (const it of items ?? []) {
    if (it.kind === "consultation") consults += 1;
    else if (it.status === "OPEN") open += 1;
    else if (it.status === "BLOCKED") blocked += 1;
    else if (it.status === "BOOKED" || it.status === "HELD") booked += 1;
  }
  return { consults, open, blocked, booked };
}

/** Accessible name for a day cell — the visible counts are color-coded dots
 *  only (open/blocked/booked), so screen-reader users need the full
 *  breakdown spelled out (CAL-04-004). */
function buildDayAriaLabel(
  key: string,
  consults: number,
  open: number,
  blocked: number,
  booked: number,
): string {
  const parts: string[] = [];
  if (consults > 0) parts.push(`${consults} consultation${consults > 1 ? "s" : ""}`);
  if (open > 0) parts.push(`${open} open slot${open > 1 ? "s" : ""}`);
  if (blocked > 0) parts.push(`${blocked} blocked slot${blocked > 1 ? "s" : ""}`);
  if (booked > 0) parts.push(`${booked} booked slot${booked > 1 ? "s" : ""}`);
  return parts.length > 0 ? `${dayLabel(key)}, ${parts.join(", ")}` : dayLabel(key);
}

export function MonthCalendar({
  year,
  month,
  itemsByDay,
  selectedDay,
  todayKey,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onToday,
}: Props) {
  const cells = buildMonthGrid(year, month);

  return (
    <div className="gh-calendar-panel gh-card overflow-hidden p-0">
      {/* Header — month label + nav */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--portal-line)" }}
      >
        <h2 className="text-base font-bold" style={{ color: "var(--portal-text)" }}>
          {monthLabel(year, month)}
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
            onClick={onPrevMonth}
            ariaLabel="Previous month"
            style={{ width: 32, height: 32, border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </IconBtn>
          <IconBtn
            onClick={onNextMonth}
            ariaLabel="Next month"
            style={{ width: 32, height: 32, border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronRight className="size-4" aria-hidden />
          </IconBtn>
        </div>
      </div>

      {/* Weekday row */}
      <div
        className="grid grid-cols-7"
        style={{ borderBottom: "1px solid var(--portal-line)" }}
      >
        {WEEKDAY_LABELS.map((d, i) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-portal-micro font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--portal-muted)", opacity: i >= 5 ? 0.6 : 1 }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="gh-calendar-grid grid grid-cols-7 overflow-hidden">
        {cells.map((cell) => {
          const items = itemsByDay.get(cell.key) ?? [];
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedDay;
          const hasAny = items.length > 0;
          const { consults, open, blocked, booked } = summarize(items);
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDay(cell.key)}
              aria-label={buildDayAriaLabel(cell.key, consults, open, blocked, booked)}
              className={`gh-calendar-day gh-calendar-day--tappable relative flex min-h-[68px] flex-col items-start gap-1 p-1 text-left transition sm:min-h-[92px] sm:p-1.5 ${
                cell.inMonth ? "" : "gh-calendar-day-outside"
              } ${isSelected ? "gh-calendar-day-selected" : ""}`}
              style={{
                borderBottom: "1px solid var(--portal-line-soft)",
                borderRight: "1px solid var(--portal-line-soft)",
                background: cell.inMonth ? "var(--portal-surface)" : "var(--portal-well)",
              }}
            >
              <span
                className={`gh-calendar-day-number inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday ? "gh-calendar-day-number--today" : ""
                } ${isSelected ? "gh-calendar-day-number--selected" : ""}`}
                style={
                  !isToday && !isSelected
                    ? { color: cell.inMonth ? "var(--portal-text)" : "var(--portal-muted)" }
                    : undefined
                }
              >
                {cell.day}
              </span>

              {hasAny ? (
                <span className="mt-auto flex w-full flex-wrap gap-1">
                  {consults > 0 ? (
                    <>
                      {/* Full word badge — enough room from sm: up. */}
                      <span
                        className="hidden max-w-full items-center truncate rounded-full px-1.5 py-0.5 text-portal-micro font-bold leading-none sm:inline-flex"
                        style={{ background: "var(--portal-success-soft)", color: "var(--portal-success-text)" }}
                      >
                        {consults} consult{consults > 1 ? "s" : ""}
                      </span>
                      {/* Narrow-width fallback — dot + numeral, matches the
                          open/booked/blocked pattern below (05-003). */}
                      <span
                        className="inline-flex items-center gap-0.5 text-portal-micro font-semibold sm:hidden"
                        style={{ color: "var(--portal-success-text)" }}
                      >
                        <span className="size-1.5 rounded-full" style={{ background: "var(--portal-success)" }} />
                        {consults}
                      </span>
                    </>
                  ) : null}
                  {booked > 0 ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-portal-micro font-semibold"
                      style={{ color: "var(--portal-info-text)" }}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: "var(--portal-info)" }} />
                      {booked}
                    </span>
                  ) : null}
                  {open > 0 ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-portal-micro font-semibold"
                      style={{ color: "var(--portal-success-text)" }}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: "var(--portal-success)" }} />
                      {open}
                    </span>
                  ) : null}
                  {blocked > 0 ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-portal-micro font-semibold"
                      style={{ color: "var(--portal-danger-text)" }}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: "var(--portal-danger)" }} />
                      {blocked}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
