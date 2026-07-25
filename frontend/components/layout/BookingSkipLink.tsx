"use client";

import { usePathname } from "next/navigation";

/**
 * 04-003: page-scoped "skip to booking" link, rendered only on the
 * `/[country]/[lang]/book` route, right after the generic skip link.
 * The label is resolved server-side in SiteChrome and passed down — this is
 * a client component, so it must not pull in the locale bundles itself.
 */
export function BookingSkipLink({ label }: { label: string }) {
  const pathname = usePathname();
  if (!pathname?.endsWith("/book")) return null;
  return (
    <a href="#booking" className="gh-skip-link">
      {label}
    </a>
  );
}
