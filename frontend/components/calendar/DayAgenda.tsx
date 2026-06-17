"use client";

import type { ReactNode } from "react";
import { CalendarDays, Video } from "lucide-react";
import { formatAppTime } from "@/lib/format-datetime";
import type { CalendarItem } from "./calendar-types";
import { dayLabel } from "./calendar-utils";

type Props = {
  dayKey: string | null;
  items: CalendarItem[];
  tz: string;
  emptyLabel?: string;
  /** Click handler for consultation rows (opens the detail dialog). */
  onSelectConsultation?: (item: CalendarItem) => void;
  /** Per-slot action (e.g. the doctor's block/unblock button). */
  renderSlotAction?: (item: CalendarItem) => ReactNode;
  /** Show the doctor name on each row (admin/patient views). */
  showDoctorName?: boolean;
};

function slotChipClass(status: string): string {
  switch (status) {
    case "OPEN":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "BLOCKED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "BOOKED":
      return "border-blue-200 bg-blue-50 text-blue-800";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

export function DayAgenda({
  dayKey,
  items,
  tz,
  emptyLabel = "Nothing scheduled.",
  onSelectConsultation,
  renderSlotAction,
  showDoctorName,
}: Props) {
  const consultations = items.filter((i) => i.kind === "consultation");
  const slots = items.filter((i) => i.kind === "slot");

  return (
    <div className="gh-card flex h-full flex-col p-0">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <CalendarDays className="size-4 text-[var(--color-text-muted)]" aria-hidden />
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
          {dayKey ? dayLabel(dayKey) : "Pick a day"}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!dayKey ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Select a day on the calendar to see its consultations and slots.
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">{emptyLabel}</p>
        ) : (
          <div className="grid gap-4">
            {consultations.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Consultations
                </p>
                <ul className="grid gap-2">
                  {consultations.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelectConsultation?.(item)}
                        className="flex w-full items-center gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2.5 text-left transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-background-soft)]"
                      >
                        <span className="inline-flex w-14 shrink-0 flex-col items-center rounded-md bg-emerald-50 px-1 py-1 text-emerald-800">
                          <span className="text-sm font-bold leading-none">
                            {formatAppTime(item.startAt, tz)}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--color-text-primary)]">
                            {item.title}
                          </span>
                          <span className="block truncate text-xs text-[var(--color-text-muted)]">
                            {item.meta?.consultationType ?? ""}
                            {showDoctorName && item.meta?.doctorName
                              ? ` · ${item.meta.doctorName}`
                              : ""}
                          </span>
                        </span>
                        {item.meta?.meetingUrl ? (
                          <Video className="size-4 shrink-0 text-emerald-600" aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {slots.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Slots
                </p>
                <div className="flex flex-wrap gap-2">
                  {slots.map((item) => (
                    <span
                      key={item.id}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${slotChipClass(item.status)}`}
                      title={item.meta?.blockReason ?? item.status}
                    >
                      <span className={item.status === "BLOCKED" ? "line-through" : ""}>
                        {formatAppTime(item.startAt, tz)}
                      </span>
                      {showDoctorName && item.meta?.doctorName ? (
                        <span className="font-normal opacity-80">
                          · {item.meta.doctorName}
                        </span>
                      ) : null}
                      {renderSlotAction ? renderSlotAction(item) : null}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
