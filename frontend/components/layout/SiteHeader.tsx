import Image from "next/image";
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
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[rgba(255,255,255,0.96)] backdrop-blur-md">
      <div className="mx-auto flex h-[var(--header-height)] max-w-[var(--container-width)] items-center justify-between gap-3 px-4 sm:gap-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink items-center">
          <Image
            src="/logos/global-health-wordmark-temp.svg"
            alt={`${siteName} temporary wordmark`}
            width={220}
            height={54}
            className="h-10 w-auto max-w-[168px] sm:h-11 sm:max-w-[210px] md:h-[46px]"
            priority
          />
        </Link>
        <DesktopNav navigation={navigation} />
        <div className="flex items-center lg:hidden">
          <MobileNav siteName={siteName} navigation={navigation} />
        </div>
      </div>
    </header>
  );
}
