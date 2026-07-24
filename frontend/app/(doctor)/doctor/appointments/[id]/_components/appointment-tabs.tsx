"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  DOCTOR_FOCUS_MEETING_LINK_EVENT,
  DOCTOR_FOCUS_REVIEW_SEND_EVENT,
} from "@/lib/doctor-appointment-ui";
import { PortalTabs, PortalTabPanel } from "@/components/PortalTabs";

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
  /** Optional outline icon rendered left of the label (design brief §3). */
  icon?: ReactNode;
  panel: ReactNode;
};

export function AppointmentTabs({
  tabs,
  initialTabId,
  ariaLabel,
}: {
  tabs: AppointmentTab[];
  initialTabId?: string;
  ariaLabel?: string;
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

  // Header "Create meeting link" CTA (no meetingUrl yet, UX-005): jump to
  // Overview and focus the meeting-URL field instead of leaving the doctor
  // to hunt for it — same dispatch/listen pattern as the review-send focus
  // above, just targeting a field instead of a tab.
  useEffect(() => {
    const handler = () => {
      if (tabs.some((t) => t.id === "overview")) {
        setActive("overview");
      }
      window.setTimeout(() => {
        const field = document.getElementById("meeting-url-field");
        if (field instanceof HTMLInputElement) {
          field.scrollIntoView({ behavior: "smooth", block: "center" });
          field.focus();
        }
      }, 150);
    };
    window.addEventListener(DOCTOR_FOCUS_MEETING_LINK_EVENT, handler);
    return () => window.removeEventListener(DOCTOR_FOCUS_MEETING_LINK_EVENT, handler);
  }, [tabs]);

  // Scroll to a URL hash target (e.g. `#patient-chat`) inside whichever
  // panel `?tab=` activated. Tab *selection* itself is now owned by
  // PortalTabs' `syncParam` (reads `?tab=` on mount, keeps it in sync on
  // click) — this effect only handles the leftover in-panel scroll.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const id = window.location.hash.slice(1);
      // Wait a tick so the panel is un-hidden before scrolling.
      const t = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => window.clearTimeout(t);
    }
  }, []);

  return (
    <div className="gh-doctor-appointment-tabs" data-tour="appointment-tabs">
      <PortalTabs
        ariaLabel={ariaLabel ?? "Appointment sections"}
        value={active}
        onChange={setActive}
        sticky
        syncParam="tab"
        items={tabs.map((tab) => ({
          value: tab.id,
          label: tab.label,
          badge: tab.badge,
          badgeAlert: tab.badgeAlert,
          icon: tab.icon,
        }))}
      />

      <div className="mt-4 grid gap-4">
        {tabs.map((tab) => (
          <PortalTabPanel key={tab.id} value={tab.id} activeValue={active}>
            {tab.panel}
          </PortalTabPanel>
        ))}
      </div>
    </div>
  );
}
