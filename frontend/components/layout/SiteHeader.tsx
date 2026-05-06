import Image from "next/image";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
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
        <Link href="/" className="flex min-w-0 shrink items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] text-white">
            <Stethoscope className="size-5" aria-hidden />
          </span>
          <Image
            src="/logos/global-health-wordmark-temp.svg"
            alt={`${siteName} temporary wordmark`}
            width={220}
            height={54}
            className="h-9 w-auto max-w-[160px] sm:h-10 sm:max-w-[190px] md:h-11"
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
