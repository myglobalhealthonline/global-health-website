import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import "flag-icons/css/flag-icons.min.css";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { getPublicAssetsNormalized } from "@/lib/content/get-public-assets";
import { DEFAULT_BRAND_LOGO } from "@/lib/content/brand-logo";
import {
  resolveFooterCtaDecorAsset,
  resolveSiteLogoAsset,
} from "@/lib/content/merge-ireland-home-media";
import { getSiteContext } from "@/lib/content/get-site-context";
import { getCountryByCode, type CountryCode } from "@/data/countries";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const cookieStore = await cookies();

  const headerCountry = requestHeaders.get("x-gh-country");
  const runtimeCountry =
    headerCountry && getCountryByCode(headerCountry as CountryCode)
      ? (headerCountry as CountryCode)
      : undefined;

  const [{ common, navigation }, assets, authUser] = await Promise.all([
    getSiteContext({
      explicitCountryCode: runtimeCountry,
      headerLocale: requestHeaders.get("x-gh-locale"),
      acceptLanguageHeader: requestHeaders.get("accept-language"),
      cookieLocale: cookieStore.get("gh_locale")?.value ?? null,
    }),
    getPublicAssetsNormalized(),
    getServerAuthUser(),
  ]);

  const brandLogo = resolveSiteLogoAsset(assets) ?? DEFAULT_BRAND_LOGO;
  const footerDecorImage = resolveFooterCtaDecorAsset(assets);

  return (
    <SiteChrome
      siteName={common.site.name}
      navigation={navigation}
      brandLogo={brandLogo}
      footerDecorImage={footerDecorImage}
      authUser={authUser}
    >
      {children}
    </SiteChrome>
  );
}
