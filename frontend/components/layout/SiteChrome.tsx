"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { SiteNavigationData } from "@/data/navigation";
import type { AuthUser } from "@/lib/api/auth-api";
import type { CountryConfig } from "@/data/countries";
import type { PublicCountryFooter } from "@/lib/content/get-country-footers";

type Props = {
  children: ReactNode;
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  footerDecorImage?: { src: string; alt: string };
  authUser?: AuthUser | null;
  countryFeatures?: Record<string, string[] | undefined>;
  /** Per-country footer overrides keyed by lowercase country code.
   *  Missing or null entries fall back to the global defaults. */
  countryFooters?: Record<string, PublicCountryFooter | null>;
  initialLastCountry?: { slug: string; lang: string } | null;
  countries: CountryConfig[];
};

export function SiteChrome({
  children,
  siteName,
  navigation,
  brandLogo,
  authUser,
  countryFeatures,
  countryFooters,
  initialLastCountry,
  countries,
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
          initialLastCountry={initialLastCountry}
          countries={countries}
        />
      )}
      <main id="main-content" className="grow">
        {children}
      </main>
      {isGatewayHome ? null : (
        <SiteFooter
          siteName={siteName}
          countryFeatures={countryFeatures}
          countryFooters={countryFooters}
          countries={countries}
        />
      )}
    </>
  );
}
