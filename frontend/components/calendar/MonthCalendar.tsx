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
    <div className="gh-card overflow-hidden p-0">
      {/* Header — month label + nav */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">
          {monthLabel(year, month)}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToday}
            className="rounded-[999px] border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-background-soft)]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="inline-flex size-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-background-soft)]"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="inline-flex size-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-background-soft)]"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Weekday row */}
      <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-background-soft)]">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
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
              className={`relative flex min-h-[78px] flex-col items-start gap-1 border-b border-r border-[var(--color-border)] p-1.5 text-left transition sm:min-h-[92px] ${
                cell.inMonth
                  ? "bg-[var(--color-background-page)]"
                  : "bg-[var(--color-background-soft)]"
              } ${isSelected ? "ring-2 ring-inset ring-[var(--color-brand-primary)]" : "hover:bg-[var(--color-background-soft)]"}`}
            >
              <span
                className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday
                    ? "bg-[var(--color-brand-primary)] text-white"
                    : cell.inMonth
                      ? "text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-muted)]"
                }`}
              >
                {cell.day}
              </span>

              {hasAny ? (
                <span className="mt-auto flex w-full flex-wrap gap-1">
                  {consults > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-emerald-800">
                      {consults} consult{consults > 1 ? "s" : ""}
                    </span>
                  ) : null}
                  {booked > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-700">
                      <span className="size-1.5 rounded-full bg-blue-500" />
                      {booked}
                    </span>
                  ) : null}
                  {open > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {open}
                    </span>
                  ) : null}
                  {blocked > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600">
                      <span className="size-1.5 rounded-full bg-rose-400" />
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
