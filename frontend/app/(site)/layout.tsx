import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSiteContext } from "@/lib/content/get-site-context";
import { getCountryByCode, type CountryCode } from "@/data/countries";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const cookieStore = await cookies();

  const headerCountry = requestHeaders.get("x-gh-country");
  const runtimeCountry = headerCountry && getCountryByCode(headerCountry as CountryCode)
    ? (headerCountry as CountryCode)
    : undefined;

  const { common, navigation } = await getSiteContext({
    explicitCountryCode: runtimeCountry,
    headerLocale: requestHeaders.get("x-gh-locale"),
    acceptLanguageHeader: requestHeaders.get("accept-language"),
    cookieLocale: cookieStore.get("gh_locale")?.value ?? null,
  });

  return (
    <>
      <SiteHeader siteName={common.site.name} navigation={navigation} />
      <main id="main-content" className="grow">
        {children}
      </main>
      <SiteFooter siteName={common.site.name} navigation={navigation} />
    </>
  );
}
