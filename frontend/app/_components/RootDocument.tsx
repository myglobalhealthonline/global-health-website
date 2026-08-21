import type { ReactNode } from "react";
import { CookieBanner } from "@/components/compliance/CookieBanner";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import "../globals.css";

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
            class, so SSR content stays fully visible (SEO/no-JS safe). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
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
