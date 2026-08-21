import type { ReactNode } from "react";
import { RootDocument } from "@/app/_components/RootDocument";
import { rootMetadata } from "@/lib/seo/root-metadata";

/**
 * ROOT layout (owns `<html>`/`<body>`) for everything that is not the public
 * marketing site: /admin, /doctor, /account, /login & friends, /corporate,
 * /pay, /print, /share, /unauthorized.
 *
 * `lang="en"` is static here on purpose — these are authenticated surfaces,
 * not indexable content, and their locale comes from the in-portal language
 * preference rather than the URL. Reading it server-side would need
 * cookies()/headers() in a ROOT layout, the exact thing that un-statics
 * everything below it (P-001).
 *
 * Deliberately does NOT import `portal.css`: that stays in the
 * `(admin)`/`(doctor)`/`account`/`corporate` layouts so /login, /pay, /print
 * and /share don't download portal-only rules. See CLAUDE.md.
 * MetaPixel/GoogleAnalytics are absent for the same reason as before the
 * multi-root split — they must never load on portal routes (S-027).
 */
export const metadata = rootMetadata;

export default function PortalRootLayout({ children }: { children: ReactNode }) {
  // No consent bar: portal routes load no analytics/marketing scripts (S-027),
  // so there is nothing here for consent to gate, and the fixed bar sat over
  // the mobile nav drawer. The public roots still show it.
  return (
    <RootDocument lang="en" cookieBanner={false}>
      {children}
    </RootDocument>
  );
}
