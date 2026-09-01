import type { ReactNode } from "react";
import { headers } from "next/headers";
import { CookieBanner } from "@/components/compliance/CookieBanner";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import "../globals.css";

/**
 * Pre-hydration document guards, one shared source so the copies can't drift:
 *
 * 1. `.js` on <html> — flags JS-enabled visitors for `.gh-reveal-pending`.
 * 2. removeChild/insertBefore guards — fix the Chrome Google-Translate crash
 *    (facebook/react#11538): Translate wraps every text node in <font> tags,
 *    so React's next conditional render calls removeChild/insertBefore
 *    against a parent the node no longer belongs to, throws NotFoundError,
 *    and the nearest error boundary replaces the page ("Something went
 *    wrong"). The guard returns the node instead of throwing — worst case a
 *    stale translated text fragment lingers, but state updates and
 *    navigation keep working. Must be a Node.prototype patch (not
 *    translate="no"): users translating a page still get widgets translated.
 *
 * `__ghDomGuards` makes it idempotent — on routes where both the RootDocument
 * copy and the nonced portal copy execute (memed CSP), the patch applies once.
 */
export const DOM_GUARDS_JS =
  "document.documentElement.classList.add('js');" +
  "if(!window.__ghDomGuards&&typeof Node==='function'&&Node.prototype){" +
  "window.__ghDomGuards=1;" +
  "var rc=Node.prototype.removeChild;" +
  "Node.prototype.removeChild=function(c){if(c&&c.parentNode!==this){return c;}return rc.apply(this,arguments);};" +
  "var ib=Node.prototype.insertBefore;" +
  "Node.prototype.insertBefore=function(n,r){if(r&&r.parentNode!==this){return this.appendChild(n);}return ib.apply(this,arguments);};" +
  "}";

/**
 * The same guards, stamped with the request's CSP nonce, for the four
 * portal surfaces (/account, /admin, /doctor, /corporate) whose
 * `script-src 'nonce-…' 'strict-dynamic'` policy (proxy.ts nonceCsp) blocks
 * the un-nonced RootDocument copy — Next only auto-nonces its own framework
 * scripts, not JSX-authored ones. Mounted by those four layouts, which are
 * already dynamic (cookies()), so headers() costs nothing extra. On
 * /doctor/appointments/* (memedWidgetCsp — no nonce header) the attribute is
 * simply absent and 'unsafe-inline' admits the script.
 */
export async function PortalDomGuards() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: DOM_GUARDS_JS }} />;
}

/**
 * The shared `<html>`/`<body>` document shell.
 *
 * The app has NO `app/layout.tsx`: `[country]/[lang]` is hoisted to
 * root-layout level so `next/root-params` can hand it the real locale, which
 * is what puts the correct `lang` in the server-rendered bytes (previously a
 * hardcoded "en" corrected by an inline script, invisible to non-JS clients).
 * That means several root layouts — `[country]/[lang]`, `(global)`,
 * `(portal)`, `(redirect)` — plus `global-not-found`/`global-error`, each
 * owning its own document. This component is the one copy of everything they
 * share, so the skeleton can't drift between them.
 *
 * `globals.css` is imported here (public + shared rules, ships everywhere).
 * `portal.css` is deliberately NOT — it stays imported by the
 * `(admin)`/`(doctor)`/`account`/`corporate` layouts so public visitors never
 * download it. See CLAUDE.md.
 */
export function RootDocument({
  lang,
  cookieBanner = true,
  children,
}: {
  lang: string;
  /** Portal roots pass false: they load no analytics or marketing scripts
   *  (S-027), so there is nothing on those routes for consent to gate, and
   *  the fixed bar covered the mobile nav drawer. Consent is still collected
   *  on every public route. */
  cookieBanner?: boolean;
  children: ReactNode;
}) {
  return (
    <html lang={lang} className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Synchronous, must run before first paint: flags JS-enabled
            visitors so .gh-reveal-pending (globals.css) can hide
            entry-animation content pre-paint, avoiding the visible->hidden->
            visible flash from RevealOnScroll/HeroReveal mounting after
            content is already on screen. No-JS visitors never get this
            class, so SSR content stays fully visible (SEO/no-JS safe).
            Also carries the Google-Translate DOM guards — see DOM_GUARDS_JS.
            CSP-blocked on the nonce'd portal routes; PortalDomGuards is the
            nonced copy those layouts mount. */}
        <script dangerouslySetInnerHTML={{ __html: DOM_GUARDS_JS }} />
      </head>
      {/* No sitewide Doctify preconnect: the widget is intersection- and
          consent-gated (DoctifyReviewsLazy) and often never loads, so a
          global connection warm-up on every route is wasted setup that
          competes with connections the page actually needs. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Meta Pixel / GA4 are NOT here — they must never load on
            (portal) routes and must be consent-gated (S-027), so they live
            in the two public root layouts only. */}
        <ScrollToTop />
        {children}
        {cookieBanner ? <CookieBanner /> : null}
      </body>
    </html>
  );
}
