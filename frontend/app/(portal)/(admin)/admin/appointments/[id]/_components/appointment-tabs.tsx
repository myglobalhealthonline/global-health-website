"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PortalTabs, PortalTabPanel } from "@/components/PortalTabs";

/**
 * Tab strip for the admin appointment workspace — mirrors the doctor
 * appointment workspace's `AppointmentTabs` (same mounted+hidden pattern,
 * sticky PortalTabs variant, `?tab=` URL sync). Kept as a local admin
 * copy rather than a shared import: doctor's version lives in a
 * doctor-only `_components` folder and this one has no doctor-specific
 * behaviour (no DOCTOR_FOCUS_REVIEW_SEND_EVENT listener) to justify a
 * shared abstraction yet.
 */
export type AdminAppointmentTab = {
  id: string;
  label: string;
  badge?: string | null;
  badgeAlert?: boolean;
  /** Optional outline icon rendered left of the label (design brief §3). */
  icon?: ReactNode;
  panel: ReactNode;
};

export function AdminAppointmentTabs({
  tabs,
  initialTabId,
  ariaLabel,
}: {
  tabs: AdminAppointmentTab[];
  initialTabId?: string;
  ariaLabel?: string;
}) {
  const [active, setActive] = useState<string>(
    () => (initialTabId && tabs.some((t) => t.id === initialTabId) ? initialTabId : tabs[0]?.id ?? ""),
  );

  // Scroll to a URL hash target (e.g. `#patient-chat`, linked from the
  // admin messages inbox) inside whichever panel `?tab=` activated.
  // Tab *selection* is owned by PortalTabs' `syncParam` (reads `?tab=` on
  // mount) — this only handles the leftover in-panel scroll once the
  // panel is un-hidden.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const id = window.location.hash.slice(1);
      const t = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => window.clearTimeout(t);
    }
  }, []);

  return (
    <div className="gh-admin-appointment-tabs">
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
