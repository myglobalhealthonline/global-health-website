import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { resolveLocale, toSupportedLocale } from "@/lib/i18n/resolve-locale";
import type { LocaleCode } from "@/lib/i18n/types";

/**
 * The language THIS PERSON chose, as opposed to the language a given URL
 * happens to be in.
 *
 * One resolver for the whole site, because the language used to live in four
 * places that drifted apart: the `gh_locale` cookie (rewritten by every
 * `/{country}/{lang}` URL the visitor touches), the `gh-last-country` cookie's
 * `lang` half, `User.preferredLocale`, and the URL segment itself. That drift
 * is what made the portal say English while the public site said Portuguese.
 *
 * Order: signed-in `User.preferredLocale` → `gh_locale` cookie / `x-gh-locale`
 * → Accept-Language → country default → "en". A `[lang]` URL segment is NOT in
 * this chain: it wins for RENDERING the page it names (callers pass it as
 * `explicitLocale`, see `getPageLocale`), but it is not a choice the person
 * made about the rest of the site.
 */
export const getSignedInLocale = cache(async (): Promise<LocaleCode | null> => {
  // Anonymous visitors are the majority and must not pay a backend round-trip:
  // no session cookie → nothing to look up.
  const jar = await cookies();
  if (!jar.get(AUTH_COOKIE_NAME)) return null;
  const user = await getServerAuthUser();
  return toSupportedLocale(user?.preferredLocale);
});

export async function getSelectedLocale(
  countryDefaultLocale?: string | null,
): Promise<LocaleCode> {
  const signedIn = await getSignedInLocale();
  if (signedIn) return signedIn;

  const [jar, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    headerLocale: headerStore.get("x-gh-locale") ?? undefined,
    cookieLocale: jar.get("gh_locale")?.value,
    acceptLanguageHeader: headerStore.get("accept-language") ?? undefined,
    countryDefaultLocale: toSupportedLocale(countryDefaultLocale) ?? undefined,
  });
}
