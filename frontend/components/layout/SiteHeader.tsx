"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { MobileNav } from "@/components/layout/MobileNav";
import type { SiteNavigationData } from "@/data/navigation";
import type { AuthUser } from "@/lib/api/auth-api";
import { cn } from "@/lib/utils/cn";

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
  authUser,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  authUser?: AuthUser | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const hasRealLogo = isRealLogo(brandLogo?.src);
  const logoSrc = hasRealLogo ? brandLogo!.src : DEFAULT_LOGO;
  const logoAlt = hasRealLogo ? brandLogo!.alt : `${siteName} logo`;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full bg-[var(--color-brand-primary)] transition-[border-color] duration-300",
        scrolled
          ? "border-b border-white/20"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-[var(--header-height)] max-w-[var(--container-width)] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2.5"
        >
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={280}
            height={120}
            className="h-12 w-auto max-w-[200px] sm:h-14 sm:max-w-[240px] md:h-16 md:max-w-[260px]"
            priority
          />
        </Link>

        <div className="hidden flex-1 items-center pl-6 lg:flex">
          <DesktopNav navigation={navigation} />
        </div>

        <div className="flex items-center lg:hidden">
          <MobileNav
            siteName={siteName}
            navigation={navigation}
            brandLogo={brandLogo}
            authUser={authUser}
          />
        </div>
      </div>
    </header>
  );
}
