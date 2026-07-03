"use client";

import { useState, type ReactNode } from "react";
import { PortalTabs } from "@/components/PortalTabs";

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
      <PortalTabs
        ariaLabel="Plan editor sections"
        value={active}
        onChange={setActive}
        items={tabs.map((t) => ({ value: t.id, label: t.label }))}
      />

      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" hidden={t.id !== active} className="gh-admin-plan-panel">
          {t.content}
        </div>
      ))}
    </div>
  );
}
