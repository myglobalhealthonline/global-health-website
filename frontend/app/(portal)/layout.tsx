import type { ReactNode } from "react";
import { headers } from "next/headers";
import { RootDocument } from "@/app/_components/RootDocument";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { toHtmlLang } from "@/lib/i18n/html-lang";
import { rootMetadata } from "@/lib/seo/root-metadata";

/**
 * ROOT layout (owns `<html>`/`<body>`) for everything that is not the public
 * marketing site: /admin, /doctor, /account, /login & friends, /corporate,
 * /pay, /print, /share, /unauthorized.
 *
 * `<html lang>` is resolved per request (A11Y-001, WCAG 2.2 §3.1.1 *Language
 * of Page*). It used to be a hard-coded "en" on the grounds that reading it
 * server-side would need cookies()/headers() in a ROOT layout and un-static
 * everything below (P-001). That trade-off does not exist on THIS root:
 *
 *   • The public trees that P-001 is about — `[country]/[lang]` and
 *     `(global)` — are separate root layouts and are not touched. The
 *     `[country]/[lang]` root still takes its language from its own route
 *     param, so its `generateStaticParams` prerender is unchanged.
 *   • Every portal subtree under this root is ALREADY dynamic: the
 *     `(admin)`, `account`, `doctor` and `corporate` layouts each call
 *     `getServerAuthUser()`/`cookies()`, and /login, /print and /share are
 *     `force-dynamic`. `/unauthorized` — a noindex 403 landing with fixed
 *     English copy — is the only page this converts, and it renders no data.
 *
 * So the account, doctor and corporate portals now announce themselves in the
 * language they actually render in (en/cs/de/es/pt/ro), in the SERVER-RENDERED
 * bytes: no inline correction script, no post-hydration fixup, correct for a
 * screen reader at first paint and for a client with no JS at all.
 *
 * `/admin` and `/unauthorized` stay English: neither loads a locale bundle, so
 * their copy really is English-only and a `lang="cs"` there would mis-announce
 * English words — the same SC 3.1.1 defect this batch fixes, pointed the other
 * way. (`/unauthorized` is the 403 landing the admin and doctor layouts
 * redirect a role-mismatched user to, so a Czech-preference patient reaches it
 * routinely.) The predicate is anchored on a segment boundary:
 * `/administrator` and `/admin-tools` are not `/admin`.
 *
 * The pathname comes from the proxy-stamped `x-gh-pathname` request header,
 * which `proxy.ts` SETS (never merges) on every request it processes. That
 * "every request" is load-bearing and was not true when this shipped: the
 * proxy's old `PUBLIC_FILE` guard (`/\.(.*)$/`) short-circuited any pathname
 * containing a dot before the stamping ran, and `/admin/patients/{email}` and
 * `/doctor/patients/{email}` address the patient by email, so both fell out of
 * the rule below — and shipped with no CSP at all, which was the bigger half.
 * Closed in Batch 15b: the proxy now identifies a static asset from the
 * request's `Sec-Fetch-Dest`, not from a dot in the path. The `?? "/"` fallback
 * stays a belt-and-braces default rather than an operating mode; that the
 * header is always present under real proxy execution is pinned by LANG-6 in
 * tests/unit/portal-document-lang.test.tsx.
 *
 * `getPortalLocale()` is the site's one locale resolver, not a second copy:
 * signed-in `User.preferredLocale` → `gh_locale`/`x-gh-locale` →
 * Accept-Language → "en", with the signed-in preference deliberately winning
 * over the shared public-site cookie. Its session lookup is the React-cached
 * `getServerAuthUser()` the child layouts already call, so resolving the
 * language here adds no second `/api/auth/me` round-trip per navigation.
 *
 * `app/global-error.tsx` keeps `lang="en"`: it is a client-side last-resort
 * boundary that replaces the whole document, so it can reach no server
 * request context, and deriving the attribute from a client-read cookie would
 * guarantee a hydration mismatch on the one element that must not have
 * suppressed diffs. Recorded as a deliberate residual limitation in
 * docs/plans/frontend-accessibility-backlog.md.
 *
 * Deliberately does NOT import `portal.css`: that stays in the
 * `(admin)`/`(doctor)`/`account`/`corporate` layouts so /login, /pay, /print
 * and /share don't download portal-only rules. See CLAUDE.md.
 * MetaPixel/GoogleAnalytics are absent for the same reason as before the
 * multi-root split — they must never load on portal routes (S-027).
 */
export const metadata = rootMetadata;

/** The portal surfaces whose copy is hard-coded English: `/admin` and
 *  everything under it, plus the `/unauthorized` 403 landing. Anchored at the
 *  start and closed on a segment boundary, so nothing that merely begins with
 *  those letters (`/administrator`, `/admin-tools`) is caught. */
const ENGLISH_ONLY_ROUTE = /^\/(?:admin|unauthorized)(?:\/|$)/;

export default async function PortalRootLayout({ children }: { children: ReactNode }) {
  const pathname = (await headers()).get("x-gh-pathname") ?? "/";
  const lang = ENGLISH_ONLY_ROUTE.test(pathname) ? "en" : toHtmlLang(await getPortalLocale());

  // No consent bar: portal routes load no analytics/marketing scripts (S-027),
  // so there is nothing here for consent to gate, and the fixed bar sat over
  // the mobile nav drawer. The public roots still show it.
  return (
    <RootDocument lang={lang} cookieBanner={false}>
      {children}
    </RootDocument>
  );
}
