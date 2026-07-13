"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_BOOK_CTA_LABEL } from "@/lib/constants";

/**
 * Routes where a persistent "Book" bar is redundant or in the way — the
 * booking funnel itself plus the cart/checkout flow. Self-guarding so it
 * stays correct even if a caller mounts it on one of these pages.
 */
const HIDDEN_PATH_SEGMENTS = new Set(["book", "cart", "checkout"]);

export function StickyBookingCTA({
  href,
  label = DEFAULT_BOOK_CTA_LABEL,
}: {
  href: string;
  label?: string;
}) {
  const pathname = usePathname();
  const shouldHide = pathname
    ?.split("/")
    .some((segment) => HIDDEN_PATH_SEGMENTS.has(segment));

  if (shouldHide) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-fixed-bar)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
      {/* Floating pill — mirrors the navbar's gh-header-bookCta recipe
          exactly (same bg/ink/shadow), no bar/container behind it. */}
      <Link
        href={href}
        className="group pointer-events-auto flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand-accent)] px-5 py-3 text-base font-extrabold tracking-[-0.01em] text-[#0a1f14] shadow-[0_4px_16px_rgba(176,241,34,0.22)] transition-[transform,box-shadow,filter] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_10px_30px_rgba(176,241,34,0.32)] active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        {label}
      </Link>
    </div>
  );
}
