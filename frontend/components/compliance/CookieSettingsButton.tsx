"use client";

import { openCookiePreferences } from "./cookie-consent";

/**
 * Reopens the consent bar. Exists as its own client component so
 * SiteFooter (a Server Component by design) and the privacy page can both
 * drop it in without taking on a client boundary of their own.
 */
export function CookieSettingsButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <button type="button" onClick={openCookiePreferences} className={className}>
      {label}
    </button>
  );
}
