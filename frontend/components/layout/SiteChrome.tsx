"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import { EMERGENCY_NOTICE } from "@/lib/constants";
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
      <a href="#main-content" className="gh-skip-link">
        Skip to content
      </a>
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
        <aside
          aria-label="Medical disclaimer"
          style={{
            background: "var(--color-background-soft)",
            borderTop: "1px solid rgba(29,75,54,0.10)",
          }}
        >
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 py-6">
            <MedicalDisclaimer variant="short" text={EMERGENCY_NOTICE} />
          </div>
        </aside>
      )}
      {isGatewayHome ? null : (
        <SiteFooter
          siteName={siteName}
          navigation={navigation}
          countryFeatures={countryFeatures}
          countryFooters={countryFooters}
          countries={countries}
        />
      )}
    </>
  );
}
