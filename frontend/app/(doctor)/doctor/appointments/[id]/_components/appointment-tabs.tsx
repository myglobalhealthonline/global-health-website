"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  // Deep-link: `?tab=<id>` (e.g. from the notification bell) selects the
  // starting tab, falling back to the `initialTabId` prop then the first tab.
  const tabParam = searchParams.get("tab");
  const [active, setActive] = useState<string>(() => {
    if (tabParam && tabs.some((t) => t.id === tabParam)) return tabParam;
    if (initialTabId && tabs.some((t) => t.id === initialTabId)) return initialTabId;
    return tabs[0]?.id ?? "";
  });

  useEffect(() => {
    const handler = () => {
      if (tabs.some((t) => t.id === "documents")) {
        setActive("documents");
      }
    };
    window.addEventListener(DOCTOR_FOCUS_REVIEW_SEND_EVENT, handler);
    return () => window.removeEventListener(DOCTOR_FOCUS_REVIEW_SEND_EVENT, handler);
  }, [tabs]);

  // After activating a tab via `?tab=`, scroll to the URL hash target (e.g.
  // `#patient-chat`) inside the now-visible panel.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tabParam comes from the URL, only known post-mount
    if (tabParam && tabs.some((t) => t.id === tabParam)) setActive(tabParam);
    if (typeof window !== "undefined" && window.location.hash) {
      const id = window.location.hash.slice(1);
      // Wait a tick so the panel is un-hidden before scrolling.
      const t = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => window.clearTimeout(t);
    }
  }, [tabParam, tabs]);

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
