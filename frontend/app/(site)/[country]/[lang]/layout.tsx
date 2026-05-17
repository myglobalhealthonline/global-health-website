import type { ReactNode } from "react";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";

/**
 * Country/lang shell. Warms the slug↔code registry from live data
 * so the synchronous `countryCodeFromSlug` calls inside every page
 * handler resolve admin-added countries (whose codes + slugs aren't
 * in `data/countries.ts`) without each page having to remember to
 * await the merged loader.
 *
 * The call is wrapped in `cache(...)` upstream so it deduplicates
 * across every page that lands under this layout.
 */
export default async function CountryLangLayout({
  children,
}: {
  children: ReactNode;
}) {
  await getPublicCountriesMerged();
  return <>{children}</>;
}
