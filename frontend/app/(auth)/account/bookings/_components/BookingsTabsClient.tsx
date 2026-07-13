"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, CalendarRange } from "lucide-react";
import { PortalTabs, PortalTabPanel } from "@/components/PortalTabs";

type Tab = "list" | "calendar";

export function BookingsTabsClient({
  tabList,
  tabCalendar,
  tabsAria,
  listPanel,
  calendarPanel,
}: {
  tabList: string;
  tabCalendar: string;
  tabsAria: string;
  listPanel: ReactNode;
  calendarPanel: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("list");

  return (
    <>
      <div className="mb-5">
        <PortalTabs
          ariaLabel={tabsAria}
          value={activeTab}
          onChange={(v) => setActiveTab(v as Tab)}
          items={[
            { value: "list", label: tabList, icon: <CalendarDays aria-hidden /> },
            { value: "calendar", label: tabCalendar, icon: <CalendarRange aria-hidden /> },
          ]}
          syncParam="tab"
        />
      </div>
      <PortalTabPanel value="list" activeValue={activeTab}>
        {listPanel}
      </PortalTabPanel>
      <PortalTabPanel value="calendar" activeValue={activeTab}>
        {calendarPanel}
      </PortalTabPanel>
    </>
  );
}
