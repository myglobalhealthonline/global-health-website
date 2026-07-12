"use client";

import { usePathname } from "next/navigation";

/**
 * 04-003: page-scoped "skip to booking" link, rendered only on the
 * `/[country]/[lang]/book` route, right after the generic skip link.
 * ponytail: hardcoded EN text — the only page-scoped skip link on the
 * site; move to the common i18n bundle if this pattern gets reused.
 */
export function BookingSkipLink() {
  const pathname = usePathname();
  if (!pathname?.endsWith("/book")) return null;
  return (
    <a href="#booking" className="gh-skip-link">
      Skip to booking
    </a>
  );
}
