"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DOCTOR_FOCUS_REVIEW_SEND_EVENT } from "@/lib/doctor-appointment-ui";
import { PortalTabs } from "@/components/PortalTabs";

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
      <div className="sticky top-[58px] z-10 -mx-4 mb-4 bg-white/80 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6">
        <PortalTabs
          ariaLabel="Appointment sections"
          value={active}
          onChange={setActive}
          items={tabs.map((tab) => ({
            value: tab.id,
            label: tab.label,
            badge: tab.badge,
            badgeAlert: tab.badgeAlert,
          }))}
        />
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`gh-tabpanel-${tab.id}`}
          aria-labelledby={`gh-tab-${tab.id}`}
          hidden={tab.id !== active}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
