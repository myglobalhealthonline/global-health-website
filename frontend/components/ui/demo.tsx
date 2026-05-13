"use client";

import FooterColumn from "@/components/ui/footer-column";
import type { SiteNavigationData } from "@/data/navigation";

type DemoProps = {
  siteName: string;
  navigation: SiteNavigationData;
};

export default function FooterDemo({ siteName, navigation }: DemoProps) {
  return (
    <div className="min-h-[40vh] bg-[var(--color-background-soft)]">
      <FooterColumn
        siteName={siteName}
        navigation={navigation}
        brandLogo={{
          src: "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=120&q=80",
          alt: `${siteName} demo logo`,
        }}
      />
    </div>
  );
}

