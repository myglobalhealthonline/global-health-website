"use client";

import { useEffect } from "react";
import { rememberCountry } from "@/lib/routing/last-country";

/**
 * Refreshes the `gh-last-country` cookie whenever the URL has a real
 * country segment. Pure side effect, no markup — split out of SiteHeader
 * so the header itself can be a Server Component.
 */
export function RememberCountryOnMount({
  country,
  lang,
}: {
  country: string | null;
  lang: string | null;
}) {
  useEffect(() => {
    if (country && lang) rememberCountry(country, lang);
  }, [country, lang]);

  return null;
}
