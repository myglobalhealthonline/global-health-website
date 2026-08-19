"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartContext";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

/**
 * Build the canonical cart URL for the cart's active country. Falls
 * back to the legacy `/cart` redirect when the cart hasn't fixed a
 * country yet (rare — cart only mints on first add).
 */
function buildCartHref(cartCountryCode: string): string {
  const config = cartCountryCode
    ? getCountryByCode(cartCountryCode.toLowerCase() as CountryCode)
    : null;
  if (!config) return "/cart";
  const slug = COUNTRY_CODE_TO_SLUG[config.code] ?? config.code;
  const lang = (config.defaultLocale ?? "en").toLowerCase();
  return `/${slug}/${lang}/cart`;
}

/**
 * Header cart icon — shows item count badge.
 * Always rendered; badge only when count > 0.
 */
export function CartIcon({
  className,
  style,
  /** Dark sticky header — icon must be light on forest background. */
  variant = "light",
}: {
  className?: string;
  style?: React.CSSProperties;
  variant?: "light" | "dark";
}) {
  const { cart } = useCart();
  const count = cart.itemCount;
  const href = buildCartHref(cart.countryCode);
  const isDark = variant === "dark";
  return (
    <Link
      href={href}
      className={`relative -mx-1 inline-flex size-11 items-center justify-center rounded-full ${
        isDark
          ? "text-white hover:bg-white/12"
          : "text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
      } ${className ?? ""}`}
      style={style}
    >
      {/* sr-only, not aria-label — an icon-only anchor otherwise ships as an
          internal link with no anchor text. */}
      <span className="sr-only">{`Cart (${count} item${count === 1 ? "" : "s"})`}</span>
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
