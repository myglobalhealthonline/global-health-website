"use client";

import { useState, type ReactNode } from "react";
import { PortalTabs, PortalTabPanel } from "@/components/PortalTabs";

type Tab = "history" | "consult" | "chart";

/**
 * Converts the patient-record main column from one long scroll into tabs
 * per audit §15/§17 (07-patient-record.md). Panels stay mounted (hidden
 * attribute, PortalTabs default) so the chart form's dirty-tracking /
 * unsaved-changes guard (07-004, Wave 1) keeps working when the doctor
 * switches tabs — it's a visibility toggle, not an unmount.
 */
export function PatientRecordTabs({
  tabsAria,
  tabHistoryLabel,
  tabConsultLabel,
  tabChartLabel,
  historyPanel,
  consultPanel,
  chartPanel,
}: {
  tabsAria: string;
  tabHistoryLabel: string;
  tabConsultLabel: string;
  tabChartLabel: string;
  historyPanel: ReactNode;
  consultPanel: ReactNode;
  chartPanel: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("history");

  return (
    <>
      <div className="mb-4">
        <PortalTabs
          ariaLabel={tabsAria}
          value={activeTab}
          onChange={(v) => setActiveTab(v as Tab)}
          items={[
            { value: "history", label: tabHistoryLabel },
            { value: "consult", label: tabConsultLabel },
            { value: "chart", label: tabChartLabel },
          ]}
          syncParam="tab"
        />
      </div>
      <PortalTabPanel value="history" activeValue={activeTab}>
        {historyPanel}
      </PortalTabPanel>
      <PortalTabPanel value="consult" activeValue={activeTab}>
        {consultPanel}
      </PortalTabPanel>
      <PortalTabPanel value="chart" activeValue={activeTab}>
        {chartPanel}
      </PortalTabPanel>
    </>
  );
}
