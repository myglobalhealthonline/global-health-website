import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSiteContext } from "@/lib/content/get-site-context";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { common, navigation } = await getSiteContext("en");

  return (
    <>
      <SiteHeader siteName={common.site.name} navigation={navigation} />
      <main id="main-content" className="grow">
        {children}
      </main>
      <SiteFooter siteName={common.site.name} navigation={navigation} />
    </>
  );
}
