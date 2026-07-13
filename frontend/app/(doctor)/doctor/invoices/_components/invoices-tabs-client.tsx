"use client";

import { useState, type ReactNode } from "react";
import { PortalTabs, PortalTabPanel } from "@/components/PortalTabs";

type Tab = "consultations" | "statement";

export function InvoicesTabsClient({
  tabConsultations,
  tabStatement,
  tabsAria,
  consultationsPanel,
  statementPanel,
}: {
  tabConsultations: string;
  tabStatement: string;
  tabsAria: string;
  consultationsPanel: ReactNode;
  statementPanel: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("consultations");

  return (
    <>
      <div className="mb-5">
        <PortalTabs
          ariaLabel={tabsAria}
          value={activeTab}
          onChange={(v) => setActiveTab(v as Tab)}
          items={[
            { value: "consultations", label: tabConsultations },
            { value: "statement", label: tabStatement },
          ]}
          syncParam="tab"
        />
      </div>
      <PortalTabPanel value="consultations" activeValue={activeTab}>
        {consultationsPanel}
      </PortalTabPanel>
      <PortalTabPanel value="statement" activeValue={activeTab}>
        {statementPanel}
      </PortalTabPanel>
    </>
  );
}
