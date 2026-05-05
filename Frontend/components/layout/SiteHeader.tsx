import Link from "next/link";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { MobileNav } from "@/components/layout/MobileNav";
import type { SiteNavigationData } from "@/data/navigation";

export function SiteHeader({
  siteName,
  navigation,
}: {
  siteName: string;
  navigation: SiteNavigationData;
}) {
  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-foreground shrink-0 text-lg font-semibold tracking-tight"
        >
          {siteName}
        </Link>
        <DesktopNav navigation={navigation} />
        <div className="flex items-center md:hidden">
          <MobileNav siteName={siteName} navigation={navigation} />
        </div>
      </div>
    </header>
  );
}
