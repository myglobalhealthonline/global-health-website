"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_BOOK_CTA_LABEL } from "@/lib/constants";

/**
 * Routes where a persistent "Book" bar is redundant or in the way — the
 * booking funnel itself plus the cart/checkout flow. Self-guarding so it
 * stays correct even if a caller mounts it on one of these pages.
 */
const HIDDEN_ON = ["/book", "/cart", "/checkout"];

export function StickyBookingCTA({
  href,
  label = DEFAULT_BOOK_CTA_LABEL,
}: {
  href: string;
  label?: string;
}) {
  const pathname = usePathname();
  if (pathname && HIDDEN_ON.some((seg) => pathname.includes(seg))) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-white/95 px-4 pt-3 shadow-[0_-14px_40px_rgba(15,46,37,0.14)] backdrop-blur-md md:hidden motion-reduce:transition-none pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <Link href={href} className="gh2-btn-lime w-full justify-center text-base">
        {label}
      </Link>
    </div>
  );
}
