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
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled
          ? "border-b border-white/15 bg-[var(--color-background-dark)]/95 backdrop-blur-md shadow-sm"
          : "border-b border-transparent bg-[var(--color-background-dark)]",
      )}
    >
      <div className="mx-auto grid h-[var(--header-height)] max-w-[var(--container-width)] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2.5"
        >
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={280}
            height={120}
            className="h-10 w-auto max-w-[180px] sm:h-11 sm:max-w-[220px] md:h-12 md:max-w-[240px]"
            priority
          />
        </Link>

        <div className="hidden min-w-0 items-center px-4 lg:flex">
          <DesktopNav navigation={navigation} authUser={authUser} />
        </div>

        <div className="flex items-center justify-self-end lg:hidden">
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
