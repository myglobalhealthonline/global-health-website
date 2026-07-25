import { RootDocument } from "./RootDocument";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { supportedLocaleCodes, type LocaleCode } from "@/lib/i18n/types";
import { NotFoundClient, type NotFoundCopy } from "./NotFoundClient";

/**
 * The branded 404, rendered by `app/global-not-found.tsx`. It owns the whole
 * document because there is no `app/layout.tsx` to supply one — see the
 * comment there for which 404s reach it and which do not.
 *
 * MUST stay free of `cookies()`/`headers()`/`searchParams`: a dynamic API in
 * a 404 boundary makes the ENTIRE site render at request time (P-001; a
 * `getPageLocale()` call in the old `app/not-found.tsx` was the single reason
 * 0 pages were prerendered). All six locale slices ship instead and the
 * client child picks — ~30 short strings, far cheaper than losing static
 * generation.
 */
const copy = Object.fromEntries(
  supportedLocaleCodes.map((code) => [code, getCommonLocale(code).notFound]),
) as Record<LocaleCode, NotFoundCopy>;

export function NotFoundPage() {
  return (
    <RootDocument lang="en">
      <NotFoundClient copy={copy} />
    </RootDocument>
  );
}
