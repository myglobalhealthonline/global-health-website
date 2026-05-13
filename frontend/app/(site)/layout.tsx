import type { ReactNode } from "react";

/**
 * Minimal public-site layout during the portal rebuild. The previous chrome
 * (header, footer, country picker, navigation) was wired to API endpoints that
 * no longer exist. The full public site lands in a later rebuild effort.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
