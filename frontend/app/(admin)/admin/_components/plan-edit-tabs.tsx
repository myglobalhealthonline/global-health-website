"use client";

import { useState, type ReactNode } from "react";

export type PlanTab = { id: string; label: string; content: ReactNode };

/**
 * Tabbed shell for the plan editor. Each tab's panel is server-rendered (passed
 * in as `content`) — this component only toggles which one is visible, so the
 * server-action forms inside each panel keep working. All panels stay mounted
 * (inactive ones `hidden`) so switching tabs never loses unsaved input.
 */
export function PlanEditTabs({ tabs, defaultTabId }: { tabs: PlanTab[]; defaultTabId?: string }) {
  const initial =
    defaultTabId && tabs.some((t) => t.id === defaultTabId) ? defaultTabId : tabs[0]?.id ?? "";
  const [active, setActive] = useState(initial);

  return (
    <div className="gh-admin-plan-tabs flex flex-col gap-5">
      <div
        role="tablist"
        className="gh-admin-plan-tablist flex flex-wrap gap-1.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-1.5"
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
              className={`gh-admin-plan-tab rounded-[var(--radius-card-sm)] px-4 py-2 text-[13px] font-semibold transition-colors ${
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
        <div key={t.id} role="tabpanel" hidden={t.id !== active} className="gh-admin-plan-panel">
          {t.content}
        </div>
      ))}
    </div>
  );
}
