import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { getRootHtmlLang } from "@/lib/i18n/get-root-html-lang";
import { getSiteUrl } from "@/lib/seo/site-url";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { CookieBanner } from "@/components/compliance/CookieBanner";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import "./globals.css";

const rootFallback = buildPublicMetadata({
  path: "/",
  title: SITE_NAME,
  description:
    "Online medical consultations with licensed clinicians across Ireland, Czechia, Portugal, Spain, and Romania.",
  kind: "country",
  subtitle: "Medicine Anytime Anywhere",
});

export const metadata: Metadata = {
  ...rootFallback,
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Online medical consultations with licensed clinicians across Ireland, Czechia, Portugal, Spain, and Romania.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getRootHtmlLang();
  return (
    <html
      lang={lang}
      className="h-full antialiased"
      suppressHydrationWarning
    >
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
        {/* Meta Pixel moved to app/(site)/layout.tsx (MetaPixel component) —
            it must never load on (auth)/(admin)/(doctor) portal routes and
            must be consent-gated (S-027). */}
        <ScrollToTop />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
