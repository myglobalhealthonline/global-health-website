"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { startCheckout } from "@/lib/api/cart-client";
import { formatPrice } from "@/lib/format-currency";

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ country: string; lang: string }>();
  const { cart, loading } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Route segments carry the active country/lang; build URLs from them
  // so back-links + Stripe return-URLs keep the country prefix.
  const countrySlug = params?.country ?? "";
  const lang = params?.lang ?? "";
  const cartHref = countrySlug && lang ? `/${countrySlug}/${lang}/cart` : "/cart";
  const returnTo =
    countrySlug && lang ? `/${countrySlug}/${lang}/checkout` : "/checkout";

  useEffect(() => {
    if (!loading && cart.items.length === 0) {
      router.replace(cartHref);
    }
  }, [loading, cart.items.length, router, cartHref]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    const res = await startCheckout({
      email: String(form.get("email") ?? ""),
      fullName: String(form.get("fullName") ?? ""),
      phone: String(form.get("phone") ?? "") || undefined,
      shipName: String(form.get("shipName") ?? ""),
      shipLine1: String(form.get("shipLine1") ?? ""),
      shipLine2: String(form.get("shipLine2") ?? "") || undefined,
      shipCity: String(form.get("shipCity") ?? ""),
      shipPostalCode: String(form.get("shipPostalCode") ?? ""),
      shipCountryCode: String(form.get("shipCountryCode") ?? cart.countryCode),
      // Stripe success/cancel URLs are built as `${returnTo}/success`
      // and `${returnTo}/cancelled` on the backend — pass the
      // country-scoped path so the user lands back inside their
      // country segment.
      returnTo,
    });
    if (!res.ok) {
      setSubmitting(false);
      setError(res.message);
      return;
    }
    window.location.assign(res.data.url);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  if (cart.items.length === 0) return null;

  const shippingCents = 500;
  const total = cart.subtotalCents + shippingCents;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href={cartHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to cart
      </Link>
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Checkout</h1>
      <p className="mt-2 text-sm text-slate-500">
        Shipping in {cart.countryCode.toUpperCase()} · paid in {cart.currencyCode}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field name="fullName" label="Full name" required />
            <Field name="email" label="Email" type="email" required autoComplete="email" />
            <Field name="phone" label="Phone (optional)" type="tel" autoComplete="tel" />
          </div>

          <h2 className="mt-8 text-lg font-bold text-slate-900">Shipping address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field name="shipName" label="Recipient name" required />
            <Field
              name="shipCountryCode"
              label="Country code (ISO)"
              required
              defaultValue={cart.countryCode.toUpperCase()}
              maxLength={4}
              uppercase
            />
            <Field name="shipLine1" label="Address line 1" required full />
            <Field name="shipLine2" label="Address line 2 (optional)" full />
            <Field name="shipCity" label="City" required />
            <Field name="shipPostalCode" label="Postal code" required />
          </div>

          {error ? (
            <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {submitting ? "Redirecting to Stripe…" : `Pay ${formatPrice(total, cart.currencyCode)}`}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            You will be redirected to Stripe to complete payment.
          </p>
        </form>

        <aside className="self-start rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="min-w-0 flex-1 text-slate-700">
                  {i.name}{" "}
                  <span className="text-slate-400">× {i.quantity}</span>
                </span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(i.lineTotalCents, cart.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-semibold text-slate-900">
                {formatPrice(cart.subtotalCents, cart.currencyCode)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Shipping</dt>
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
        </aside>
      </div>
    </main>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  autoComplete,
  full,
  defaultValue,
  maxLength,
  uppercase,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  full?: boolean;
  defaultValue?: string;
  maxLength?: number;
  uppercase?: boolean;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        maxLength={maxLength}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        style={uppercase ? { textTransform: "uppercase" } : undefined}
      />
    </label>
  );
}
