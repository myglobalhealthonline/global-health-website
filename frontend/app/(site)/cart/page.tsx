"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { formatPrice } from "@/lib/format-currency";

export default function CartPage() {
  const router = useRouter();
  const { cart, loading, update, remove, clear } = useCart();

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-500">Loading cart…</p>
      </main>
    );
  }

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <ShoppingCart className="size-10 text-slate-300" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Your cart is empty</h1>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Browse our health tests and online prescription products to get started.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Start shopping
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </main>
    );
  }

  const shippingCents = 500;
  const total = cart.subtotalCents + shippingCents;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Your cart</h1>
      <p className="mt-2 text-sm text-slate-500">
        {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"} ·{" "}
        {cart.countryCode.toUpperCase()} · {cart.currencyCode}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.kind === "HEALTH_TEST"
                      ? "Health test"
                      : item.kind === "PRESCRIPTION_SERVICE"
                        ? "Online prescription"
                        : "Consultation"}
                    {" · "}
                    {formatPrice(item.unitPriceCents, cart.currencyCode)} each
                  </p>
                </div>

                {/* Quantity */}
                {item.kind === "GENERAL_CONSULTATION" ||
                item.kind === "SPECIALIST_CONSULTATION" ? (
                  <span className="text-xs text-slate-500">1 booking</span>
                ) : (
                  <div className="inline-flex items-center rounded-md border border-slate-300">
                    <button
                      type="button"
                      onClick={() =>
                        item.quantity > 1 && void update(item.id, item.quantity - 1)
                      }
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
                      onClick={() => void update(item.id, item.quantity + 1)}
                      aria-label="Increase"
                      className="px-2 py-1 text-slate-600 hover:bg-slate-50"
                    >
                      <Plus className="size-3.5" aria-hidden />
                    </button>
                  </div>
                )}

                <p className="min-w-[6rem] text-right font-bold text-slate-900">
                  {formatPrice(item.lineTotalCents, cart.currencyCode)}
                </p>

                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex justify-between border-t border-slate-100 p-4">
            <Link href="/" className="text-sm font-medium text-emerald-700 hover:underline">
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
            <div className="flex justify-between">
              <dt className="text-slate-600">Shipping (flat)</dt>
              <dd className="font-semibold text-slate-900">
                {formatPrice(shippingCents, cart.currencyCode)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-bold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">
                {formatPrice(total, cart.currencyCode)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => router.push("/checkout")}
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
  );
}
