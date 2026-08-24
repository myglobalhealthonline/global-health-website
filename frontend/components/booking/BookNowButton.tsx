"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isBookingWorkflowHref } from "@/lib/routing/book-href";
import { trackAnalyticsEvent } from "@/lib/analytics/track";

/**
 * Client-side substitute for `<Link href>` on booking URLs carrying wizard
 * state. Those URLs only preselect fields; they are not separate landing pages.
 * A real `<button>` keeps keyboard/screen-reader support, while `router.push`
 * preserves browser history and back-button behaviour.
 */
/**
 * GA4 `begin_booking` — the top of the booking funnel.
 *
 * Fired from `BookCta` rather than from the /book page itself: this component
 * is the ONE thing every booking entry point on the public site routes
 * through (service pages, doctor cards, tool result nudges, homepage
 * quick-book), so instrumenting here cannot miss an entry point the way a
 * page-level mount would.
 *
 * Only the PATH is sent, never the query string — booking URLs carry
 * preselected service/doctor/slot state, and `?at=` timestamps plus doctor
 * ids are exactly the kind of thing that must not land in an analytics
 * property. `trackAnalyticsEvent` still applies the consent/production gates.
 */
function trackBeginBooking(href: string): void {
  const path = href.split("?")[0]?.split("#")[0] ?? "";
  trackAnalyticsEvent("begin_booking", { booking_path: path.slice(0, 100) });
}

export function BookNowButton({
  href,
  className,
  style,
  children,
  ariaLabel,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  ariaLabel?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        trackBeginBooking(href);
        router.push(href);
      }}
      className={className}
      style={style}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/**
 * Booking CTA that picks its own element: any wizard-state URL renders as the
 * client-side button above; the clean `/book` landing URL remains a crawlable
 * `<Link>`. Identical className/style/children either way.
 *
 * Server components may render this — it is a client component, so the
 * decision runs in the same place for SSR and hydration.
 */
export function BookCta({
  href,
  className,
  style,
  ariaLabel,
  children,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  children?: ReactNode;
}) {
  if (isBookingWorkflowHref(href)) {
    return (
      <BookNowButton href={href} className={className} style={style} ariaLabel={ariaLabel}>
        {children}
      </BookNowButton>
    );
  }
  return (
    <Link
      href={href}
      className={className}
      style={style}
      aria-label={ariaLabel}
      onClick={() => trackBeginBooking(href)}
    >
      {children}
    </Link>
  );
}
