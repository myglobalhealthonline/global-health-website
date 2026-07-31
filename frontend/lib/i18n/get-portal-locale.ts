import "server-only";

import { getPageLocale } from "@/lib/i18n/get-page-locale";
import type { LocaleCode } from "@/lib/i18n/types";

/**
 * Portal UI language. Thin alias for the site-wide chain
 * (`getSelectedLocale`): the signed-in user's own `User.preferredLocale` first,
 * the `gh_locale` cookie only as a fallback for an account that never picked a
 * language.
 *
 * Kept as its own export because portal callers must never pass an
 * `explicitLocale` — a portal route has no `[lang]` segment to honour, and the
 * name documents that the portals deliberately do not trust the shared cookie
 * (the public site rewrites it from every `/{country}/{lang}` URL, which is
 * what used to flip the portal to Portuguese mid-session).
 */
export function getPortalLocale(): Promise<LocaleCode> {
  return getPageLocale();
}
