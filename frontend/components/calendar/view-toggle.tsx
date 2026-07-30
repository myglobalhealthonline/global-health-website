"use client";

export type CalendarView = "month" | "week";

/**
 * Month ↔ Week segmented control. Lifted out of the admin calendar so the
 * doctor portal shows the same control in the same place; the view itself
 * lives in the URL on both surfaces, so a week survives a refresh and can be
 * linked to.
 */
export function ViewToggle({
  view,
  onChange,
  labels,
  ariaLabel = "Calendar view",
}: {
  view: CalendarView;
  onChange: (next: CalendarView) => void;
  /** Doctor portal passes localized copy; admin takes the English defaults. */
  labels?: { month?: string; week?: string };
  ariaLabel?: string;
}) {
  const text: Record<CalendarView, string> = {
    month: labels?.month ?? "Month",
    week: labels?.week ?? "Week",
  };
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-[999px] p-0.5"
      style={{ border: "1px solid var(--portal-line-strong)" }}
    >
      {(["month", "week"] as const).map((v) => {
        const active = v === view;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            className="gh-calendar-view-btn rounded-[999px] px-3 py-1 text-xs font-semibold"
            style={
              active
                ? { background: "var(--portal-info)", color: "#fff" }
                : { color: "var(--portal-text)" }
            }
          >
            {text[v]}
          </button>
        );
      })}
    </div>
  );
}
