"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isBookingWorkflowHref } from "@/lib/routing/book-href";
import { trackAnalyticsEvent } from "@/lib/analytics/track";
import type { BookabilitySummary } from "@/lib/content/get-country-collections";

export type BookabilityActionProps = {
  bookability?: BookabilitySummary;
  unavailableLabel?: string;
  returningLabel?: string;
  nextAvailableLabel?: string;
};

function actionStatus({
  bookability,
  unavailableLabel,
  returningLabel,
}: BookabilityActionProps): { disabled: boolean; label?: string } {
  if (bookability?.state === "UNAVAILABLE") {
    return { disabled: true, label: unavailableLabel ?? "Not accepting online bookings" };
  }
  if (bookability?.state === "RETURNING") {
    return { disabled: true, label: returningLabel ?? "Appointments are not open yet" };
  }
  // A verified future slot makes this action BOOKABLE; it should not rewrite
  // the familiar CTA with inventory detail. Return/leave dates belong only to
  // the disabled RETURNING state above.
  return { disabled: false };
}

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
  bookability,
  unavailableLabel,
  returningLabel,
  nextAvailableLabel,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  ariaLabel?: string;
} & BookabilityActionProps) {
  const router = useRouter();
  const status = actionStatus({
    bookability,
    unavailableLabel,
    returningLabel,
  });
  return (
    <button
      type="button"
      disabled={status.disabled}
      onClick={
        status.disabled
          ? undefined
          : () => {
              trackBeginBooking(href);
              router.push(href);
            }
      }
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100`}
      style={style}
      aria-label={status.disabled ? status.label : ariaLabel}
    >
      {status.disabled ? status.label : children}
      {!status.disabled && status.label ? (
        <span className="text-[0.78em] font-semibold opacity-75">{status.label}</span>
      ) : null}
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
  bookability,
  unavailableLabel,
  returningLabel,
  nextAvailableLabel,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  children?: ReactNode;
} & BookabilityActionProps) {
  const status = actionStatus({
    bookability,
    unavailableLabel,
    returningLabel,
  });
  if (status.disabled) {
    return (
      <button
        type="button"
        disabled
        className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100`}
        style={style}
        aria-label={status.label}
      >
        {status.label}
      </button>
    );
  }
  if (isBookingWorkflowHref(href)) {
    return (
      <BookNowButton
        href={href}
        className={className}
        style={style}
        ariaLabel={ariaLabel}
        bookability={bookability}
        nextAvailableLabel={nextAvailableLabel}
      >
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
      {status.label ? (
        <span className="text-[0.78em] font-semibold opacity-75">{status.label}</span>
      ) : null}
    </Link>
  );
}
