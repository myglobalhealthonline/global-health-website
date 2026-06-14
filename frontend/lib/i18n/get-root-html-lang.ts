import { cookies, headers } from "next/headers";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getRequestContext } from "@/lib/routing/get-request-context";

const supportedHtmlLangs = new Set(["en", "pt", "es", "cs", "ro", "de"]);

function toHtmlLang(locale: string): string {
  const base = locale.split("-")[0].toLowerCase();
  return supportedHtmlLangs.has(base) ? base : "en";
}

function pathnameFromNextUrlHeader(nextUrl: string | null): string | null {
  if (!nextUrl) return null;
  try {
    return new URL(nextUrl, "http://localhost").pathname;
  } catch {
    return nextUrl.startsWith("/") ? nextUrl.split("?")[0] ?? null : null;
  }
}

/**
 * Resolve the BCP-47 base language for the root `<html lang>` attribute.
 *
 * Uses the same routing context as `proxy.ts` (pathname → locale) so SSR
 * matches country/lang URLs like `/ireland/pt` even when only `next-url`
 * is available to the root layout.
 */
export async function getRootHtmlLang(): Promise<string> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  const pathname =
    headerStore.get("x-gh-pathname") ??
    pathnameFromNextUrlHeader(headerStore.get("next-url"));

  const routingContext = pathname
    ? getRequestContext({
        host: headerStore.get("host"),
        pathname,
        acceptLanguageHeader: headerStore.get("accept-language"),
        localeCookie: cookieStore.get("gh_locale")?.value ?? null,
      })
    : null;

  // Path-derived locale wins for /{country}/{lang}/… URLs. Fall back to
  // proxy header + cookies on routes without a stamped pathname (admin, auth).
  const locale =
    routingContext?.locale ??
    resolveLocale({
      headerLocale: headerStore.get("x-gh-locale"),
      cookieLocale: cookieStore.get("gh_locale")?.value,
      acceptLanguageHeader: headerStore.get("accept-language"),
    });

  return toHtmlLang(locale);
}
