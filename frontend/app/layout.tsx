import type { Metadata } from "next";
import { headers } from "next/headers";
import { SITE_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site-url";
import { CookieBanner } from "@/components/compliance/CookieBanner";
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

// Map a full locale code (e.g. "pt-br") to a base BCP-47 lang for the
// <html lang> attribute. The proxy stamps x-gh-locale on every request.
function htmlLang(localeHeader: string | null): string {
  const base = (localeHeader ?? "en").split("-")[0].toLowerCase();
  const supported = new Set(["en", "pt", "es", "cs", "ro", "de"]);
  return supported.has(base) ? base : "en";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = htmlLang((await headers()).get("x-gh-locale"));
  return (
    <html lang={lang} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
