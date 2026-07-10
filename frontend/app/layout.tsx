import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { getRootHtmlLang } from "@/lib/i18n/get-root-html-lang";
import { getSiteUrl } from "@/lib/seo/site-url";
import { CookieBanner } from "@/components/compliance/CookieBanner";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Online medical consultations with licensed clinicians across Ireland, Czechia, Portugal, Spain, and Romania.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description:
      "Online medical consultations with licensed clinicians across Ireland, Czechia, Portugal, Spain, and Romania.",
    url: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // P-001: no cookies()/headers() here — see getRootHtmlLang() for why.
  const lang = getRootHtmlLang();
  return (
    <html
      lang={lang}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://www.doctify.com" />
        <link rel="dns-prefetch" href="https://www.doctify.com" />
      </head>
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
