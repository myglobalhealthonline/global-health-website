import type { ReactNode } from "react";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { toHtmlLang } from "@/lib/i18n/get-root-html-lang";
import { HtmlLangSync } from "@/components/layout/HtmlLangSync";

/**
 * Country/lang shell. Warms the slug↔code registry from live data
 * so the synchronous `countryCodeFromSlug` calls inside every page
 * handler resolve admin-added countries (whose codes + slugs aren't
 * in `data/countries.ts`) without each page having to remember to
 * await the merged loader.
 *
 * The call is wrapped in `cache(...)` upstream so it deduplicates
 * across every page that lands under this layout.
 *
 * Also corrects `<html lang>` for this route (P-001): the root layout ships
 * a static "en" default so it never reads cookies()/headers(); this layout
 * DOES receive `lang` as a real route param, so it can fix the attribute
 * client-side without reintroducing a dynamic API dependency.
 */
export default async function CountryLangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ country: string; lang: string }>;
}) {
  const [{ lang }] = await Promise.all([params, getPublicCountriesMerged()]);
  return (
    <>
      <HtmlLangSync lang={toHtmlLang(lang)} />
      {children}
    </>
  );
}
