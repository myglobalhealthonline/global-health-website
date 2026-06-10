"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import { CART_ITEM_MAX_QTY } from "@/lib/api/cart-types";

/** Live "Xm Ys" countdown until a consultation slot hold expires. */
function useCountdown(heldUntil: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!heldUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [heldUntil]);
  if (!heldUntil) return null;
  const ms = new Date(heldUntil).getTime() - now;
  if (ms <= 0) return "expired";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CartPage() {
  const router = useRouter();
  const params = useParams<{ country: string; lang: string }>();
  const searchParams = useSearchParams();
  const { cart, loading, update, remove, clear, refresh } = useCart();
  const [expiredFlash, setExpiredFlash] = useState(0);
  // `?added=1` arrives from the consult booking form so the patient
  // gets explicit positive feedback after add-to-cart. Auto-clears
  // after 4s and the URL is rewritten without the flag so a refresh
  // doesn't re-trigger the flash.
  const [showAddedFlash, setShowAddedFlash] = useState(
    () => searchParams?.get("added") === "1",
  );
  useEffect(() => {
    if (!showAddedFlash) return;
    const timer = setTimeout(() => setShowAddedFlash(false), 4_000);
    // Drop the query so a refresh doesn't re-flash. Replace, not push,
    // so the back button still goes where the patient expects.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("added");
      window.history.replaceState(null, "", url.toString());
    }
    return () => clearTimeout(timer);
  }, [showAddedFlash]);
  // Route segments carry the active country/lang; build URLs from them
  // so the cart + checkout flow keeps the prefix the user picked.
  const countrySlug = params?.country ?? "";
  const lang = params?.lang ?? "";
  const countryHome = countrySlug && lang ? `/${countrySlug}/${lang}` : "/";
  const checkoutHref = countrySlug && lang ? `/${countrySlug}/${lang}/checkout` : "/checkout";

  // Show "slot expired" banner when server tells us it swept
  // reservations. The setState is conditional on a derived server
  // value, so a re-render won't loop (next render sees the new
  // `expiredFlash` but the cart.expiredHolds dep stays the same
  // until another sweep). The strict lint rule can't infer that —
  // disable rather than restructure.
  useEffect(() => {
    if (cart.expiredHolds && cart.expiredHolds > 0) {
      setExpiredFlash(cart.expiredHolds); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [cart.expiredHolds]);

  // Auto-refresh while there are active consultation holds so the
  // countdown stays accurate and expired items get swept.
  useEffect(() => {
    const hasHolds = cart.items.some((i) => i.heldUntil);
    if (!hasHolds) return;
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [cart.items, refresh]);

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="gh-body-sm">Loading cart…</p>
      </section>
    );
  }

  if (cart.items.length === 0) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: countrySlug.toUpperCase(), href: countryHome },
            { label: "Cart" },
          ]}
        />
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div
            className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed px-6 py-16 text-center"
            style={{ borderColor: "var(--color-border-strong)", background: "var(--color-background-soft)" }}
          >
            <ShoppingCart className="size-10" style={{ color: "var(--color-border-strong)" }} aria-hidden />
            <h1 className="gh-h3 mt-4">Your cart is empty</h1>
            <p className="gh-body-sm mt-2 max-w-md">
              Browse our consultations and health tests to get started.
            </p>
            <Link href={countryHome} className="gh-btn gh-btn-primary mt-6">
              Start shopping
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </>
    );
  }

  // Per-item shipping snapshot, summed over the cart. Online
  // consultations have shippingCents=0 by default — a cart of just
  // consultations totals to subtotal with no shipping line.
  const shippingCents = cart.items.reduce(
    (s, i) => s + (i.shippingCents ?? 0) * i.quantity,
    0,
  );
  const total = cart.subtotalCents + shippingCents;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: countrySlug.toUpperCase(), href: countryHome },
          { label: "Cart" },
        ]}
      />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="gh-h1">Your cart</h1>
      <p className="gh-body-sm mt-2">
        {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"} ·{" "}
        {cart.countryCode.toUpperCase()} · {cart.currencyCode}
      </p>

      {showAddedFlash ? (
        <div
          role="status"
          className="gh-status-success mt-4 flex items-center gap-2 rounded-[var(--radius-card-sm)] px-3 py-2.5 text-sm font-semibold"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          <span>Added to your cart.</span>
        </div>
      ) : null}

      {expiredFlash > 0 ? (
        <div className="gh-status-warning mt-4 flex items-start gap-2 rounded-[var(--radius-card-sm)] px-3 py-2.5 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {expiredFlash} consultation reservation{expiredFlash === 1 ? "" : "s"}{" "}
            expired (10-minute hold) and {expiredFlash === 1 ? "was" : "were"}
            {" "}released. Pick a new slot to continue.
          </span>
          <button
            type="button"
            onClick={() => setExpiredFlash(0)}
            className="ml-auto rounded p-0.5 transition-colors hover:bg-black/5"
            style={{ color: "var(--color-status-warning-text)" }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <div className="gh-card overflow-hidden">
          <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {cart.items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                currency={cart.currencyCode}
                onIncrease={() => void update(item.id, item.quantity + 1)}
                onDecrease={() =>
                  item.quantity > 1 && void update(item.id, item.quantity - 1)
                }
                onRemove={() => void remove(item.id)}
              />
            ))}
          </ul>

          <div className="flex justify-between border-t p-4" style={{ borderColor: "var(--color-border)" }}>
            <Link href={countryHome} className="gh-link text-sm">
              ← Continue shopping
            </Link>
            <button
              type="button"
              onClick={() => void clear()}
              className="text-sm font-semibold underline-offset-2 hover:underline"
              style={{ color: "var(--color-status-error)" }}
            >
              Clear cart
            </button>
          </div>
        </div>

        {/* Summary */}
        <aside className="gh-card self-start p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="gh-h3" style={{ fontSize: "1.125rem" }}>Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt style={{ color: "var(--color-text-muted)" }}>Subtotal</dt>
              <dd className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {formatPrice(cart.subtotalCents, cart.currencyCode)}
              </dd>
            </div>
            {shippingCents > 0 ? (
              <div className="flex justify-between">
                <dt style={{ color: "var(--color-text-muted)" }}>Shipping</dt>
                <dd className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {formatPrice(shippingCents, cart.currencyCode)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t pt-3 text-base" style={{ borderColor: "var(--color-border)" }}>
              <dt className="font-bold" style={{ color: "var(--color-text-primary)" }}>Total</dt>
              <dd className="font-bold" style={{ color: "var(--color-text-primary)" }}>
                {formatPrice(total, cart.currencyCode)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => router.push(checkoutHref)}
            className="gh-btn gh-btn-primary mt-6 w-full"
          >
            Checkout
            <ArrowRight className="size-4" aria-hidden />
          </button>
          <p className="gh-body-sm mt-3" style={{ fontSize: "0.75rem" }}>
            Payment is processed by Stripe. We never store your card details.
          </p>
        </aside>
      </div>
    </section>
    </>
  );
}

function CartItemRow({
  item,
  currency,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: import("@/lib/api/cart-types").CartItem;
  currency: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  const isConsult =
    item.kind === "GENERAL_CONSULTATION" ||
    item.kind === "SPECIALIST_CONSULTATION";
  const countdown = useCountdown(item.heldUntil);
  const atMax = item.quantity >= CART_ITEM_MAX_QTY;

  return (
    <li className="flex items-center gap-4 p-5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.name}</p>
        <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
          {item.kind === "HEALTH_TEST"
            ? "Health test"
            : item.kind === "PRESCRIPTION_SERVICE"
              ? "Online prescription"
              : "Consultation"}
          {" · "}
          {formatPrice(item.unitPriceCents, currency)} each
        </p>
        {/* Consultation lines: doctor + slot + patient identity so the
            buyer can scan the cart and confirm what they're paying for
            without leaving the page. */}
        {isConsult ? (
          <div className="mt-1.5 space-y-0.5 text-xs" style={{ color: "var(--color-text-body)" }}>
            {item.doctorName ? (
              <p>
                <span style={{ color: "var(--color-text-muted)" }}>Doctor:</span>{" "}
                <span className="font-semibold" style={{ color: "var(--color-text-body)" }}>{item.doctorName}</span>
              </p>
            ) : null}
            {item.slotStartAt ? (
              <p>
                <span style={{ color: "var(--color-text-muted)" }}>When:</span>{" "}
                <span className="font-semibold" style={{ color: "var(--color-text-body)" }}>
                  {formatAppDateTimeShort(item.slotStartAt)}
                </span>
              </p>
            ) : null}
            {item.patient?.fullName ? (
              <p>
                <span style={{ color: "var(--color-text-muted)" }}>Patient:</span>{" "}
                <span className="font-semibold" style={{ color: "var(--color-text-body)" }}>{item.patient.fullName}</span>
                {item.patient.bookingForOther ? (
                  <span className="gh-badge gh-badge-warning ml-1.5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    Booked for them
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}
        {/* Consultation hold countdown. Expired uses amber too — it's
            an expected system state (10-minute hold lapsed), not a user
            failure, so the styling shouldn't read as an error. */}
        {isConsult && countdown ? (
          <p
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: "var(--color-status-warning-text)" }}
          >
            <Clock className="size-3" aria-hidden />
            {countdown === "expired"
              ? "Hold released — pick another slot"
              : `Reserved for ${countdown}`}
          </p>
        ) : null}
        {!isConsult && atMax ? (
          <p className="mt-1 text-[11px] font-semibold" style={{ color: "var(--color-status-warning-text)" }}>
            Max {CART_ITEM_MAX_QTY} per item
          </p>
        ) : null}
      </div>

      {/* Quantity controls */}
      {isConsult ? (
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>1 booking</span>
      ) : (
        <div
          className="inline-flex items-center rounded-[var(--radius-card-sm)] border"
          style={{ borderColor: "var(--color-border)" }}
        >
          <button
            type="button"
            onClick={onDecrease}
            disabled={item.quantity <= 1}
            aria-label="Decrease"
            className="px-2 py-1 transition-colors hover:bg-[var(--color-background-soft)] disabled:opacity-40"
            style={{ color: "var(--color-text-body)" }}
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
          <span className="min-w-[2ch] px-2 text-center text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={onIncrease}
            disabled={atMax}
            aria-label="Increase"
            title={atMax ? `Max ${CART_ITEM_MAX_QTY} per item` : undefined}
            className="px-2 py-1 transition-colors hover:bg-[var(--color-background-soft)] disabled:opacity-40"
            style={{ color: "var(--color-text-body)" }}
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>
      )}

      <p className="min-w-[6rem] text-right font-bold" style={{ color: "var(--color-text-primary)" }}>
        {formatPrice(item.lineTotalCents, currency)}
      </p>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.name}`}
        className="rounded-[var(--radius-card-sm)] p-1.5 transition-colors hover:bg-[var(--color-status-error-bg)]"
        style={{ color: "var(--color-status-error)" }}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  );
}
