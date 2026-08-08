"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isPreselectionPairHref } from "@/lib/routing/book-href";

/**
 * Client-side substitute for `<Link href>` on booking URLs that preselect
 * BOTH a service and a doctor (see `isPreselectionPairHref`). Those pairs are
 * a doctor x service cross-product — rendering them as anchors made ~2,800
 * URLs crawlable for no reason, since their only job is preselecting two
 * wizard fields. A real `<button>` keeps keyboard/screen-reader support for
 * free; `router.push` keeps browser history/back-button behaviour identical
 * to what a link would have done.
 */
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
      onClick={() => router.push(href)}
      className={className}
      style={style}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/**
 * Booking CTA that picks its own element: a service+doctor preselection pair
 * renders as the client-side button above, every other booking href stays a
 * real crawlable `<Link>`. Identical className/style/children either way, so
 * call sites swap `<Link>` for `<BookCta>` and nothing else changes.
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
  if (isPreselectionPairHref(href)) {
    return (
      <BookNowButton href={href} className={className} style={style} ariaLabel={ariaLabel}>
        {children}
      </BookNowButton>
    );
  }
  return (
    <Link href={href} className={className} style={style} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
