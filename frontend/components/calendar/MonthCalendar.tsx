"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarItem } from "./calendar-types";
import {
  buildMonthGrid,
  WEEKDAY_LABELS,
  monthLabel,
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

const MAX_CHIPS = 3;

function chipTone(item: CalendarItem): { bg: string; text: string; dot: string } {
  if (item.kind === "consultation") {
    return {
      bg: "var(--portal-info-soft, rgba(51, 80, 91, 0.14))",
      text: "var(--portal-info-text)",
      dot: "var(--portal-info)",
    };
  }
  switch (item.status) {
    case "OPEN":
      return {
        bg: "var(--portal-success-soft)",
        text: "var(--portal-success-text)",
        dot: "var(--portal-success)",
      };
    case "BLOCKED":
      return {
        bg: "var(--portal-danger-soft, rgba(190, 60, 60, 0.14))",
        text: "var(--portal-danger-text)",
        dot: "var(--portal-danger)",
      };
    default: // BOOKED / HELD
      return {
        bg: "var(--portal-info-soft, rgba(51, 80, 91, 0.14))",
        text: "var(--portal-info-text)",
        dot: "var(--portal-info)",
      };
  }
}

function chipLabel(item: CalendarItem): string {
  if (item.kind === "consultation") return item.meta?.patientName || item.title;
  if (item.status === "OPEN") return "Open";
  if (item.status === "BLOCKED") return item.meta?.blockReason || "Blocked";
  return item.meta?.doctorName || item.status;
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
            className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em]"
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
          const visible = items.slice(0, MAX_CHIPS);
          const overflow = items.length - visible.length;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDay(cell.key)}
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
                <span className="mt-auto flex w-full flex-col gap-0.5">
                  {visible.map((item) => {
                    const tone = chipTone(item);
                    return (
                      <span
                        key={item.id}
                        title={`${chipLabel(item)} · ${item.title}`}
                        className="flex max-w-full items-center gap-1 truncate rounded-[4px] px-1 py-[1px] text-[10px] font-semibold leading-tight"
                        style={{ background: tone.bg, color: tone.text }}
                      >
                        <span
                          aria-hidden
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ background: tone.dot }}
                        />
                        <span className="truncate">{chipLabel(item)}</span>
                      </span>
                    );
                  })}
                  {overflow > 0 ? (
                    <span
                      className="px-1 text-[10px] font-bold"
                      style={{ color: "var(--portal-muted)" }}
                    >
                      +{overflow} more
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
