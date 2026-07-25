"use client";

import { useState, type ReactNode } from "react";
import { BadgeCheck, Gift } from "lucide-react";
import { PortalTabs, PortalTabPanel } from "@/components/PortalTabs";

type Tab = "membership" | "rewards";

export function MembershipTabsClient({
  tabMembership,
  tabRewards,
  tabsAria,
  membershipPanel,
  rewardsPanel,
}: {
  tabMembership: string;
  tabRewards: string;
  tabsAria: string;
  membershipPanel: ReactNode;
  rewardsPanel: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("membership");

  return (
    <>
      <div className="mb-5">
        <PortalTabs
          ariaLabel={tabsAria}
          value={activeTab}
          onChange={(v) => setActiveTab(v as Tab)}
          items={[
            { value: "membership", label: tabMembership, icon: <BadgeCheck aria-hidden /> },
            { value: "rewards", label: tabRewards, icon: <Gift aria-hidden /> },
          ]}
          syncParam="tab"
        />
      </div>
      <PortalTabPanel value="membership" activeValue={activeTab}>
        {membershipPanel}
      </PortalTabPanel>
      <PortalTabPanel value="rewards" activeValue={activeTab}>
        {rewardsPanel}
      </PortalTabPanel>
    </>
  );
}
