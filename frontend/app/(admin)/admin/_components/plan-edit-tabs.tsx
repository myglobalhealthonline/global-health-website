"use client";

import { useState, type ReactNode } from "react";

export type PlanTab = { id: string; label: string; content: ReactNode };

/**
 * Tabbed shell for the plan editor. Each tab's panel is server-rendered (passed
 * in as `content`) — this component only toggles which one is visible, so the
 * server-action forms inside each panel keep working. All panels stay mounted
 * (inactive ones `hidden`) so switching tabs never loses unsaved input.
 */
export function PlanEditTabs({ tabs }: { tabs: PlanTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        className="flex flex-wrap gap-1.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-1.5"
      >
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.id)}
              className={`rounded-[var(--radius-card-sm)] px-4 py-2 text-[13px] font-semibold transition-colors ${
                on
                  ? "bg-[var(--color-brand-primary)] text-white shadow-sm"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-background-page)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" hidden={t.id !== active}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
