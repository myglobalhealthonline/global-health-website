import Image from "next/image";
import Link from "next/link";

import { DesktopNav } from "@/components/layout/DesktopNav";
import { MobileNav } from "@/components/layout/MobileNav";
import type { SiteNavigationData } from "@/data/navigation";

const DEFAULT_LOGO = "/logos/global-health-official.png";

function isRealLogo(src?: string): boolean {
  if (!src) return false;
  if (src.includes("temp") || src.includes("placeholder")) return false;
  return true;
}

export function SiteHeader({
  siteName,
  navigation,
  brandLogo,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  /** CMS logo when uploaded (Railway /api/media or safe local path). */
  brandLogo?: { src: string; alt: string };
}) {
  const hasRealLogo = isRealLogo(brandLogo?.src);
  const logoSrc = hasRealLogo ? brandLogo!.src : DEFAULT_LOGO;
  const logoAlt = hasRealLogo ? brandLogo!.alt : `${siteName} logo`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[rgba(255,255,255,0.96)] backdrop-blur-md">
      <div className="mx-auto flex h-[var(--header-height)] max-w-[var(--container-width)] items-center justify-between gap-3 px-4 sm:gap-5 sm:px-6 lg:grid lg:grid-cols-[320px_1fr_320px] lg:items-center lg:gap-0 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2.5 lg:w-[320px]">
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={280}
            height={120}
            className="h-14 w-auto max-w-[240px] sm:h-16 sm:max-w-[280px] md:h-[4.5rem] md:max-w-[320px]"
            priority
          />
        </Link>
        <DesktopNav className="lg:justify-center" navigation={navigation} />
        <div className="hidden lg:block" aria-hidden />
        <div className="flex items-center lg:hidden">
          <MobileNav siteName={siteName} navigation={navigation} brandLogo={brandLogo} />
        </div>
      </div>
    </header>
  );
}
