import "server-only";

import { cache } from "react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { toSupportedLocale } from "@/lib/i18n/resolve-locale";
import type { LocaleCode } from "@/lib/i18n/types";

/**
 * Portal UI language — the signed-in user's OWN selection
 * (`User.preferredLocale`, written by the portal language switcher), not the
 * shared `gh_locale` cookie.
 *
 * Why the portals can't use `getPageLocale()` (cookie/header chain): that one
 * cookie is shared with the public site, and the public site keeps rewriting
 * it from the URL's `[lang]` segment (`proxy.ts`) or from a country pick
 * (`CountryEntryGate`, `CountrySwitcher`). Every portal→public excursion —
 * even a `<Link>` PREFETCH of the patient portal's "Book consultation" CTA,
 * whose href carries the *country's* default locale — silently retagged the
 * whole portal to that language for a year. Reading the account's explicit
 * choice makes those writes irrelevant to portal chrome.
 *
 * Falls back to `getPageLocale()` only when the account has never chosen a
 * language (preferredLocale null) or the session can't be read.
 *
 * `cache()`-wrapped, and `getServerAuthUser` is cached too, so a layout + its
 * page + nested server components share ONE `/api/auth/me` round-trip.
 */
export const getPortalLocale = cache(async (): Promise<LocaleCode> => {
  const user = await getServerAuthUser();
  const chosen = toSupportedLocale(user?.preferredLocale);
  return chosen ?? (await getPageLocale());
});
