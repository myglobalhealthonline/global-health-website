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
    <header className="border-border/80 bg-background/95 supports-[backdrop-filter]:bg-background/88 sticky top-0 z-40 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex h-[4.6rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <span
            aria-hidden
            className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-sky-700 text-base font-bold text-white shadow-sm"
          >
            GH
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-cyan-700">
              Medical Clinic
            </span>
            <span className="text-foreground text-lg font-semibold tracking-tight transition-colors group-hover:text-cyan-800">
              {siteName}
            </span>
          </span>
        </Link>
        <DesktopNav navigation={navigation} />
        <div className="flex items-center md:hidden">
          <MobileNav siteName={siteName} navigation={navigation} />
        </div>
      </div>
    </header>
  );
}
