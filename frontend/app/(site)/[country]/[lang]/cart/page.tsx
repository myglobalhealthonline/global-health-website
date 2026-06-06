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
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-500">Loading cart…</p>
      </main>
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
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <ShoppingCart className="size-10 text-slate-300" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Your cart is empty</h1>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              Browse our consultations and health tests to get started.
            </p>
            <Link
              href={countryHome}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Start shopping
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </main>
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
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Your cart</h1>
      <p className="mt-2 text-sm text-slate-500">
        {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"} ·{" "}
        {cart.countryCode.toUpperCase()} · {cart.currencyCode}
      </p>

      {showAddedFlash ? (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-900"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          <span>Added to your cart.</span>
        </div>
      ) : null}

      {expiredFlash > 0 ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {expiredFlash} consultation reservation{expiredFlash === 1 ? "" : "s"}{" "}
            expired (10-minute hold) and {expiredFlash === 1 ? "was" : "were"}
            {" "}released. Pick a new slot to continue.
          </span>
          <button
            type="button"
            onClick={() => setExpiredFlash(0)}
            className="ml-auto rounded p-0.5 text-amber-700 hover:bg-amber-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
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

          <div className="flex justify-between border-t border-slate-100 p-4">
            <Link href={countryHome} className="text-sm font-medium text-emerald-700 hover:underline">
              ← Continue shopping
            </Link>
            <button
              type="button"
              onClick={() => void clear()}
              className="text-sm font-medium text-rose-700 hover:underline"
            >
              Clear cart
            </button>
          </div>
        </div>

        {/* Summary */}
        <aside className="self-start rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-semibold text-slate-900">
                {formatPrice(cart.subtotalCents, cart.currencyCode)}
              </dd>
            </div>
            {shippingCents > 0 ? (
              <div className="flex justify-between">
                <dt className="text-slate-600">Shipping</dt>
                <dd className="font-semibold text-slate-900">
                  {formatPrice(shippingCents, cart.currencyCode)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-bold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">
                {formatPrice(total, cart.currencyCode)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => router.push(checkoutHref)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Checkout
            <ArrowRight className="size-4" aria-hidden />
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Payment is processed by Stripe. We never store your card details.
          </p>
        </aside>
      </div>
    </main>
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
        <p className="font-semibold text-slate-900">{item.name}</p>
        <p className="mt-1 text-xs text-slate-500">
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
          <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
            {item.doctorName ? (
              <p>
                <span className="text-slate-500">Doctor:</span>{" "}
                <span className="font-semibold text-slate-700">{item.doctorName}</span>
              </p>
            ) : null}
            {item.slotStartAt ? (
              <p>
                <span className="text-slate-500">When:</span>{" "}
                <span className="font-semibold text-slate-700">
                  {formatAppDateTimeShort(item.slotStartAt)}
                </span>
              </p>
            ) : null}
            {item.patient?.fullName ? (
              <p>
                <span className="text-slate-500">Patient:</span>{" "}
                <span className="font-semibold text-slate-700">{item.patient.fullName}</span>
                {item.patient.bookingForOther ? (
                  <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
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
            className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${
              countdown === "expired"
                ? "text-amber-800"
                : "text-amber-700"
            }`}
          >
            <Clock className="size-3" aria-hidden />
            {countdown === "expired"
              ? "Hold released — pick another slot"
              : `Reserved for ${countdown}`}
          </p>
        ) : null}
        {!isConsult && atMax ? (
          <p className="mt-1 text-[11px] font-semibold text-amber-700">
            Max {CART_ITEM_MAX_QTY} per item
          </p>
        ) : null}
      </div>

      {/* Quantity controls */}
      {isConsult ? (
        <span className="text-xs text-slate-500">1 booking</span>
      ) : (
        <div className="inline-flex items-center rounded-md border border-slate-300">
          <button
            type="button"
            onClick={onDecrease}
            disabled={item.quantity <= 1}
            aria-label="Decrease"
            className="px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
          <span className="min-w-[2ch] px-2 text-center text-sm font-semibold">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={onIncrease}
            disabled={atMax}
            aria-label="Increase"
            title={atMax ? `Max ${CART_ITEM_MAX_QTY} per item` : undefined}
            className="px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>
      )}

      <p className="min-w-[6rem] text-right font-bold text-slate-900">
        {formatPrice(item.lineTotalCents, currency)}
      </p>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.name}`}
        className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  );
}
