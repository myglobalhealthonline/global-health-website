"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartContext";

/**
 * Header cart icon — shows item count badge.
 * Always rendered; badge only when count > 0.
 */
export function CartIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const { cart } = useCart();
  const count = cart.itemCount;
  return (
    <Link
      href="/cart"
      aria-label={`Cart (${count} item${count === 1 ? "" : "s"})`}
      className={`relative inline-flex size-9 items-center justify-center rounded-full text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)] ${className ?? ""}`}
      style={style}
    >
      <ShoppingCart className="size-4" aria-hidden />
      {count > 0 ? (
        <span
          className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
          style={{ background: "var(--color-brand-primary)", height: 18 }}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
