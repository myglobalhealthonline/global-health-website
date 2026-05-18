"use client";

import { useState, type ReactNode } from "react";

/**
 * Tab strip for the doctor appointment workspace.
 *
 * Renders every panel up-front (just hidden when inactive) so:
 *   - form drafts, chat scroll position, etc. don't reset on tab switch
 *   - tab switches are instant — no second SSR round-trip
 *
 * URL persistence intentionally omitted; the doctor is typically in
 * one tab per consult and bouncing between two screens, so a
 * `?tab=` param adds churn without payoff. Add `useSearchParams` later
 * if deep links to a specific tab become a real need.
 */
export type AppointmentTab = {
  id: string;
  label: string;
  /** Optional badge string (e.g. unread count, "draft", "signed"). */
  badge?: string | null;
  panel: ReactNode;
};

export function AppointmentTabs({
  tabs,
  initialTabId,
}: {
  tabs: AppointmentTab[];
  initialTabId?: string;
}) {
  const [active, setActive] = useState<string>(
    initialTabId && tabs.some((t) => t.id === initialTabId)
      ? initialTabId
      : tabs[0]?.id ?? "",
  );

  return (
    <div>
      <div
        role="tablist"
        aria-label="Appointment sections"
        className="sticky top-16 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-2 sm:-mx-7 sm:px-7"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={`relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-colors ${
                isActive
                  ? "bg-[var(--color-background-page)] font-bold text-[var(--color-brand-primary)] shadow-sm"
                  : "font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
              style={
                isActive
                  ? {
                      boxShadow: "inset 0 -2px 0 var(--color-brand-primary)",
                    }
                  : undefined
              }
            >
              {tab.label}
              {tab.badge ? (
                <span
                  className={`inline-flex items-center rounded-full px-1.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                    isActive
                      ? "bg-[var(--color-brand-primary)] text-white"
                      : "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]"
                  }`}
                  style={{ minWidth: 18, height: 16, lineHeight: "14px", justifyContent: "center" }}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
