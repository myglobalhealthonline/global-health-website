import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
