"use client";

import type { CSSProperties, ReactNode } from "react";
import { useTransition } from "react";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { isBookingWorkflowHref } from "@/lib/routing/book-href";
import { trackAnalyticsEvent } from "@/lib/analytics/track";
import { trackBookingClick } from "@/lib/analytics/booking";
import type { BookabilitySummary } from "@/lib/content/get-country-collections";

export type BookabilityActionProps = {
  serviceKind?: string;
  bookability?: BookabilitySummary;
  unavailableLabel?: string;
  returningLabel?: string;
  nextAvailableLabel?: string;
};

function actionStatus({
  bookability,
  unavailableLabel,
  returningLabel,
  nextAvailableLabel,
}: BookabilityActionProps): { disabled: boolean; label?: string } {
  if (!bookability) return { disabled: false };
  // RETURNING + NO_OPEN_SLOT means nothing opens within the short marketing
  // horizon but a real later slot exists (nextAvailableAt is set) — the
  // /book wizard's own month picker can reach it, so the CTA must stay live.
  // UNAVAILABLE + NO_OPEN_SLOT is the different case where nothing is open
  // even in the wider lookahead (nextAvailableAt is null) — that one, and
  // any pause/no-doctor reason, has genuinely nothing to book.
  const reachable = bookability.state === "BOOKABLE" ||
    (bookability.state === "RETURNING" && bookability.reasonCode === "NO_OPEN_SLOT");
  if (!reachable) {
    if (bookability.state === "UNAVAILABLE") {
      return { disabled: true, label: unavailableLabel ?? "Not accepting online bookings" };
    }
    return { disabled: true, label: returningLabel ?? "Appointments are not open yet" };
  }
  // Still hint at the later date when it's known, without blocking the click.
  return { disabled: false, label: bookability.state === "RETURNING" ? nextAvailableLabel : undefined };
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
function trackBeginBooking(href: string, serviceKind?: string): void {
  trackBookingClick(href, serviceKind);
  const path = href.split("?")[0]?.split("#")[0] ?? "";
  trackAnalyticsEvent("begin_booking", { booking_path: path.slice(0, 100) });
}

function LinkPendingIndicator() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="size-[1em] animate-spin" aria-hidden /> : null;
}

export function BookNowButton({
  serviceKind,
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
  const [isPending, startTransition] = useTransition();
  const status = actionStatus({
    bookability,
    unavailableLabel,
    returningLabel,
    nextAvailableLabel,
  });
  return (
    <button
      type="button"
      disabled={status.disabled || isPending}
      onClick={
        status.disabled
          ? undefined
          : () => {
              trackBeginBooking(href, serviceKind);
              startTransition(() => router.push(href));
            }
      }
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100`}
      style={style}
      aria-label={status.disabled ? status.label : ariaLabel}
      aria-busy={isPending || undefined}
    >
      {status.disabled ? status.label : children}
      {isPending ? <Loader2 className="size-[1em] animate-spin" aria-hidden /> : null}
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
  serviceKind,
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
    nextAvailableLabel,
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
        serviceKind={serviceKind}
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
      onClick={() => trackBeginBooking(href, serviceKind)}
    >
      {children}
      <LinkPendingIndicator />
      {status.label ? (
        <span className="text-[0.78em] font-semibold opacity-75">{status.label}</span>
      ) : null}
    </Link>
  );
}
