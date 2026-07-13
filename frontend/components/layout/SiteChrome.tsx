import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BookingSkipLink } from "@/components/layout/BookingSkipLink";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import { CountryTrustBar } from "@/components/sections/CountryTrustBar";
import { EMERGENCY_NOTICE } from "@/lib/constants";
import type { SiteNavigationData } from "@/data/navigation";
import type { CountryConfig } from "@/data/countries";
import type { LocaleCode } from "@/lib/i18n/types";
import { registerCountrySlugs } from "@/lib/routing/country-slug";
import type { ParsedSitePath } from "@/lib/routing/path-rewrites";
import type { PublicCountryFooter } from "@/lib/content/get-country-footers";
import type { CountryTrust } from "@/lib/content/get-country-trust";

type Props = {
  children: ReactNode;
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  footerDecorImage?: { src: string; alt: string };
  countryFeatures?: Record<string, string[] | undefined>;
  /** Per-country footer overrides keyed by lowercase country code.
   *  Missing or null entries fall back to the global defaults. */
  countryFooters?: Record<string, PublicCountryFooter | null>;
  /** Active country's medical-authority trust signals. When present the
   *  footer renders the country trust bar (regulator, provider registration,
   *  emergency) instead of the generic emergency disclaimer. */
  countryTrust?: CountryTrust | null;
  initialLastCountry?: { slug: string; lang: string } | null;
  countries: CountryConfig[];
  /** Locale the server actually rendered this request in. */
  currentLocale?: LocaleCode;
  /** Request pathname, parsed server-side (from `x-gh-pathname`). */
  parsed: ParsedSitePath;
  /** True on the gateway home ("/") — header/footer/trust bar are hidden
   *  there, the page body owns the full-bleed country picker instead. */
  isGatewayHome: boolean;
};

export function SiteChrome({
  children,
  siteName,
  navigation,
  brandLogo,
  countryFeatures,
  countryFooters,
  countryTrust,
  initialLastCountry,
  countries,
  currentLocale,
  parsed,
  isGatewayHome,
}: Props) {
  // Warm the client-side slug registry with the merged country list (including
  // admin-added countries) so path parsing in the header switchers resolves
  // correctly after client-side navigation. The registry is cold on the client
  // even when it was warmed during SSR.
  registerCountrySlugs(countries);

  return (
    <>
      <a href="#main-content" className="gh-skip-link">
        Skip to content
      </a>
      {/* 04-003: the booking wizard is a single-task flow reached from the
       * portal — a keyboard user tabbing past the generic skip link still
       * has to tab through the entire shared header (nav, switchers, cart,
       * bell, avatar) before reaching the first service card. This second
       * skip link, page-scoped to `/book`, jumps straight to it. Uses
       * `usePathname()` (client-side) rather than `parsed.rest` — the
       * `[country]/[lang]/layout.tsx` above intentionally keeps `parsed`
       * built from route params only (`rest: []`) to stay static-generation
       * safe; see that file's comment. */}
      <BookingSkipLink />
      {isGatewayHome ? null : (
        <SiteHeader
          siteName={siteName}
          navigation={navigation}
          brandLogo={brandLogo}
          countryFeatures={countryFeatures}
          initialLastCountry={initialLastCountry}
          countries={countries}
          currentLocale={currentLocale}
          parsed={parsed}
        />
      )}
      <main id="main-content" className="grow">
        {children}
      </main>
      {isGatewayHome ? null : countryTrust ? (
        <CountryTrustBar trust={countryTrust} locale={currentLocale} />
      ) : (
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
          parsed={parsed}
        />
      )}
    </>
  );
}
