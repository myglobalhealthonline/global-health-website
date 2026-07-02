"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarItem } from "./calendar-types";
import {
  buildMonthGrid,
  WEEKDAY_LABELS,
  monthLabel,
} from "./calendar-utils";

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
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="inline-flex size-8 items-center justify-center rounded-full transition hover:bg-[var(--portal-well)]"
            style={{ border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="inline-flex size-8 items-center justify-center rounded-full transition hover:bg-[var(--portal-well)]"
            style={{ border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Weekday row */}
      <div
        className="grid grid-cols-7"
        style={{ borderBottom: "1px solid var(--portal-line)" }}
      >
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--portal-muted)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="gh-calendar-grid grid grid-cols-7 overflow-hidden">
        {cells.map((cell) => {
          const items = itemsByDay.get(cell.key);
          const { consults, open, blocked, booked } = summarize(items);
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedDay;
          const hasAny = (items?.length ?? 0) > 0;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDay(cell.key)}
              className={`gh-calendar-day relative flex min-h-[68px] flex-col items-start gap-1 p-1 text-left transition sm:min-h-[92px] sm:p-1.5 ${
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
                    <span
                      className="inline-flex max-w-full items-center truncate rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                      style={{ background: "var(--portal-success-soft)", color: "var(--portal-success-text)" }}
                    >
                      {consults} consult{consults > 1 ? "s" : ""}
                    </span>
                  ) : null}
                  {booked > 0 ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
                      style={{ color: "var(--portal-info-text)" }}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: "var(--portal-info)" }} />
                      {booked}
                    </span>
                  ) : null}
                  {open > 0 ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
                      style={{ color: "var(--portal-success-text)" }}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: "var(--portal-success)" }} />
                      {open}
                    </span>
                  ) : null}
                  {blocked > 0 ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
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
