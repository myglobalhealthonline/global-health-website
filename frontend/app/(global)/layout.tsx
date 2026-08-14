import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { rootMetadata } from "@/lib/seo/root-metadata";

/**
 * ROOT layout (owns `<html>`/`<body>`) for the public pages with NO
 * country/lang URL segment: the gateway home, /about, /blog, /cart,
 * /checkout, /contact, /faq, /patient-upload, /privacy, /reviews, /terms,
 * /verify, /brazil, /card-verify.
 *
 * Everything it used to do inline now lives in `PublicShell` — the 404
 * boundaries render the same chrome, and one copy means it cannot drift.
 */
export const metadata = rootMetadata;

export default function GlobalRootLayout({ children }: { children: ReactNode }) {
  return <PublicShell withDocument>{children}</PublicShell>;
}
