import { cookies, headers } from "next/headers";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import type { LocaleCode } from "@/lib/i18n/types";

/**
 * @param explicitLocale Wins over the visitor's cookie/header when it maps
 *   to a supported locale — e.g. a blog post's own `locale` field, so a
 *   Portuguese-language article renders its surrounding UI chrome (CTA,
 *   date format, "min read") in Portuguese regardless of the visitor's
 *   browsing locale.
 */
export async function getPageLocale(explicitLocale?: string | null): Promise<LocaleCode> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    explicitLocale: explicitLocale ?? undefined,
    headerLocale: headerStore.get("x-gh-locale") ?? undefined,
    cookieLocale: cookieStore.get("gh_locale")?.value,
    acceptLanguageHeader: headerStore.get("accept-language") ?? undefined,
  });
}
