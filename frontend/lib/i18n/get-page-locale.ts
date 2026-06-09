import { cookies, headers } from "next/headers";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import type { LocaleCode } from "@/lib/i18n/types";

export async function getPageLocale(): Promise<LocaleCode> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    headerLocale: headerStore.get("x-gh-locale") ?? undefined,
    cookieLocale: cookieStore.get("gh_locale")?.value,
    acceptLanguageHeader: headerStore.get("accept-language") ?? undefined,
  });
}
