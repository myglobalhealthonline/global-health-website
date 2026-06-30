"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DOCTOR_FOCUS_REVIEW_SEND_EVENT } from "@/lib/doctor-appointment-ui";

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
  /** Amber dot styling for pending-send counts. */
  badgeAlert?: boolean;
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

  useEffect(() => {
    const handler = () => {
      if (tabs.some((t) => t.id === "documents")) {
        setActive("documents");
      }
    };
    window.addEventListener(DOCTOR_FOCUS_REVIEW_SEND_EVENT, handler);
    return () => window.removeEventListener(DOCTOR_FOCUS_REVIEW_SEND_EVENT, handler);
  }, [tabs]);

  return (
    <div className="gh-doctor-appointment-tabs">
      <div
        role="tablist"
        aria-label="Appointment sections"
        className="gh-portal-tabs gh-doctor-appointment-tablist sticky top-[58px] z-10 -mx-4 mb-4 flex items-center gap-1 overflow-x-auto border-b border-[var(--color-border)] bg-white/80 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6"
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
              className={`relative inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-colors ${
                isActive
                  ? "bg-[var(--color-brand-primary)] font-bold text-white shadow-sm"
                  : "font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tab.label}
              {tab.badge ? (
                <span
                  className={`inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-extrabold leading-none ${
                    tab.badgeAlert
                      ? "bg-amber-400 text-[#0a281f]"
                      : isActive
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
