import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { getRootHtmlLang } from "@/lib/i18n/get-root-html-lang";
import { getSiteUrl } from "@/lib/seo/site-url";
import { CookieBanner } from "@/components/compliance/CookieBanner";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
// SVG flags via the `flag-icons` package. Loaded at the root so both
// public site + admin shell can render `<span class="fi fi-{iso2}">`.
import "flag-icons/css/flag-icons.min.css";
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
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ScrollToTop />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
