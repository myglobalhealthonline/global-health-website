import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist_Mono, Manrope } from "next/font/google";
import { SITE_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site-url";
import { CookieBanner } from "@/components/compliance/CookieBanner";
// SVG flags via the `flag-icons` package. Loaded at the root so both
// public site + admin shell can render `<span class="fi fi-{iso2}">`.
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

/**
 * Brand spec (Manual da Marca) names Gilroy Regular + Gilroy Black as
 * the typefaces. Gilroy is paid; Manrope is the standard free
 * substitute — same geometric humanist character, same x-height, same
 * open apertures. Two CSS variables wired so legacy refs to
 * --font-plus-jakarta still resolve (alias for one release; can be
 * removed once nothing references it).
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html
      lang={lang}
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
