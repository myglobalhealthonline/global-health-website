import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { supportedLocaleCodes, type LocaleCode } from "@/lib/i18n/types";
import { NotFoundClient, type NotFoundCopy } from "./_components/NotFoundClient";

/**
 * Root 404 boundary. MUST stay free of `cookies()`/`headers()`/`searchParams`
 * — Next renders this into every route's RSC payload, so one dynamic API call
 * here makes the ENTIRE site render at request time (P-001; this file's
 * `getPageLocale()` call was the single reason 0 pages were prerendered).
 * Locale selection happens in the client child instead.
 */
const copy = Object.fromEntries(
  supportedLocaleCodes.map((code) => [code, getCommonLocale(code).notFound]),
) as Record<LocaleCode, NotFoundCopy>;

export default function NotFound() {
  return <NotFoundClient copy={copy} />;
}
