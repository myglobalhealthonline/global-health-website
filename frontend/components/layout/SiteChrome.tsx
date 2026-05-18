"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { SiteNavigationData } from "@/data/navigation";
import type { AuthUser } from "@/lib/api/auth-api";

type Props = {
  children: ReactNode;
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  footerDecorImage?: { src: string; alt: string };
  authUser?: AuthUser | null;
  /** Per-country feature toggles, keyed by lowercased country code.
   *  Forwarded to SiteHeader/MobileNav so they can hide nav items for
   *  features the admin has disabled in /admin/country-features. */
  countryFeatures?: Record<string, string[] | undefined>;
};

export function SiteChrome({
  children,
  siteName,
  navigation,
  brandLogo,
  authUser,
  countryFeatures,
}: Props) {
  const pathname = usePathname();
  const isGatewayHome = pathname === "/";

  return (
    <>
      {isGatewayHome ? null : (
        <SiteHeader
          siteName={siteName}
          navigation={navigation}
          brandLogo={brandLogo}
          authUser={authUser}
          countryFeatures={countryFeatures}
        />
      )}
      <main id="main-content" className="grow">
        {children}
      </main>
      {isGatewayHome ? null : <SiteFooter siteName={siteName} />}
    </>
  );
}
