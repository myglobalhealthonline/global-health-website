"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { CalendarDays, Search, Video } from "lucide-react";
import { formatAppTime } from "@/lib/format-datetime";
import type { CalendarItem } from "./calendar-types";
import { dayLabel, todayKey } from "./calendar-utils";

/** Live clock, viewer-tz. Only ticks while `active` (today's agenda is open) —
 *  DESIGN.md §5.18 "now" tick, the one ambient animation on this surface. */
function useNowLabel(tz: string, active: boolean): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!active) return;
    function tick() {
      setLabel(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date()),
      );
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [tz, active]);
  return label;
}

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

function consultationBadgeClass(status: string): string {
  if (status === "COMPLETED" || status === "PAID") return "gh-badge-success";
  if (status === "CANCELLED" || status === "FAILED") return "gh-badge-error";
  if (status === "CONTACTED" || status === "BOOKED") return "gh-badge-info";
  if (status === "UNDER_REVIEW") return "gh-badge-warning";
  return "gh-badge-neutral";
}

function humanizeStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function slotToneStyle(status: string): CSSProperties {
  switch (status) {
    case "OPEN":
      return { borderColor: "var(--portal-success)", background: "var(--portal-success-soft)", color: "var(--portal-success-text)" };
    case "BLOCKED":
      return { borderColor: "var(--portal-danger)", background: "var(--portal-danger-soft)", color: "var(--portal-danger-text)" };
    case "BOOKED":
      return { borderColor: "var(--portal-info)", background: "var(--portal-info-soft)", color: "var(--portal-info-text)" };
    default:
      return { borderColor: "var(--portal-warning)", background: "var(--portal-warning-soft)", color: "var(--portal-warning-text)" };
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
  const isToday = dayKey !== null && dayKey === todayKey(tz);
  const nowLabel = useNowLabel(tz, isToday);

  return (
    <div className="gh-agenda-panel gh-card flex h-full flex-col p-0">
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--portal-line)" }}
      >
        <CalendarDays className="size-4" style={{ color: "var(--portal-muted)" }} aria-hidden />
        <h3 className="text-sm font-bold" style={{ color: "var(--portal-text)" }}>
          {dayKey ? dayLabel(dayKey) : "Pick a day"}
        </h3>
        {isToday && nowLabel ? (
          <span aria-hidden className="gh-agenda-now ml-auto">
            <span className="gh-agenda-now__rail" />
            <span className="gh-agenda-now__tick" />
            <span className="gh-agenda-now__label">Now · {nowLabel}</span>
          </span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!dayKey ? (
          <div
            className="rounded-lg p-5 text-center"
            style={{ border: "1.5px dashed var(--portal-line-strong)", background: "var(--portal-well)" }}
          >
            <CalendarDays className="mx-auto size-7" style={{ color: "var(--portal-muted)" }} aria-hidden />
            <p className="mt-2 text-sm font-bold" style={{ color: "var(--portal-text)" }}>
              Select a day
            </p>
            <p className="mx-auto mt-1 max-w-xs text-[12px]" style={{ color: "var(--portal-muted)" }}>
              Consultations and availability slots for the selected day will appear here.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div
            className="rounded-lg p-5 text-center"
            style={{ border: "1.5px dashed var(--portal-line-strong)", background: "var(--portal-well)" }}
          >
            <Search className="mx-auto size-7" style={{ color: "var(--portal-muted)" }} aria-hidden />
            <p className="mt-2 text-sm font-bold" style={{ color: "var(--portal-text)" }}>
              {emptyLabel}
            </p>
            <p className="mx-auto mt-1 max-w-xs text-[12px]" style={{ color: "var(--portal-muted)" }}>
              Add availability or open another day to review appointments.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {consultations.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--portal-muted)" }}>
                  Consultations
                </p>
                <ul className="grid gap-2">
                  {consultations.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelectConsultation?.(item)}
                        className="gh-agenda-row flex w-full items-center gap-3 rounded-[var(--portal-radius)] px-3 py-2.5 text-left transition"
                        style={{ border: "1px solid var(--portal-line)", background: "var(--portal-surface)" }}
                      >
                        <span
                          className="inline-flex w-14 shrink-0 flex-col items-center rounded-md px-1 py-1"
                          style={{ background: "var(--portal-success-soft)", color: "var(--portal-success-text)" }}
                        >
                          <span className="text-sm font-bold leading-none">
                            {formatAppTime(item.startAt, tz)}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold" style={{ color: "var(--portal-text)" }}>
                            {item.title}
                          </span>
                          {item.meta?.consultationType ? (
                            <span className="block truncate text-xs" style={{ color: "var(--portal-muted)" }}>
                              {item.meta.consultationType}
                            </span>
                          ) : null}
                          {showDoctorName && item.meta?.doctorName ? (
                            <span className="block truncate text-xs" style={{ color: "var(--portal-muted)" }}>
                              {item.meta.doctorName}
                            </span>
                          ) : null}
                        </span>
                        <span className={`gh-badge ${consultationBadgeClass(item.status)} shrink-0`}>
                          {humanizeStatus(item.status)}
                        </span>
                        {item.meta?.meetingUrl ? (
                          <Video className="size-4 shrink-0" style={{ color: "var(--portal-success-text)" }} aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {slots.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--portal-muted)" }}>
                  Slots
                </p>
                <div className="flex flex-wrap gap-2">
                  {slots.map((item) => (
                    <span
                      key={item.id}
                      className="gh-agenda-chip inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                      style={slotToneStyle(item.status)}
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
