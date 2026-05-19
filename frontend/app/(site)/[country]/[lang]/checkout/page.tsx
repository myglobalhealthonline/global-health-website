"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { startCheckout } from "@/lib/api/cart-client";
import { fetchCurrentUser, type AuthUser } from "@/lib/api/auth-api";
import { formatPrice } from "@/lib/format-currency";

/**
 * Checkout = payment.
 *
 * Patient intake (name, DOB, notes, consent) was already collected
 * on the consult page and is sitting on the cart items. Checkout
 * only handles:
 *   - payer contact (email, name, phone) for the Order + Stripe receipt
 *   - shipping address when the cart contains a physical item
 *   - the Stripe handoff
 *
 * Defaults: signed-in patient first, then the first consultation
 * line's patient snapshot (covers guest bookings that never logged
 * in). Each field stays editable so the buyer can override.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ country: string; lang: string }>();
  const { cart, loading } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchCurrentUser();
      if (cancelled) return;
      setMe(res.ok ? res.data.user : null);
      setAuthLoaded(true);
    })().catch(() => {
      if (!cancelled) setAuthLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const countrySlug = params?.country ?? "";
  const lang = params?.lang ?? "";
  const cartHref = countrySlug && lang ? `/${countrySlug}/${lang}/cart` : "/cart";
  const returnTo =
    countrySlug && lang ? `/${countrySlug}/${lang}/checkout` : "/checkout";

  // Payer defaults — prefer signed-in account, then fall back to the
  // first consultation line's patient snapshot. Guests booking purely
  // products land on blank fields (which they fill in to receive their
  // Stripe receipt).
  const consultationPatient = useMemo(() => {
    const consultLine = cart.items.find(
      (i) =>
        (i.kind === "GENERAL_CONSULTATION" ||
          i.kind === "SPECIALIST_CONSULTATION") &&
        i.patient,
    );
    return consultLine?.patient ?? null;
  }, [cart.items]);

  const defaults = useMemo(() => {
    return {
      fullName: me?.fullName ?? consultationPatient?.fullName ?? "",
      email: me?.email ?? consultationPatient?.email ?? "",
      phone: me?.phone ?? consultationPatient?.phone ?? "",
    };
  }, [me, consultationPatient]);

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
      returnTo,
    });
    if (!res.ok) {
      setSubmitting(false);
      setError(res.message);
      return;
    }
    window.location.assign(res.data.url);
  }

  if (loading || !authLoaded) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  if (cart.items.length === 0) return null;

  const shippingCents = cart.items.reduce(
    (s, i) => s + (i.shippingCents ?? 0) * i.quantity,
    0,
  );
  const total = cart.subtotalCents + shippingCents;
  // Shipping address gate. HEALTH_TEST kits always ship physically.
  // Other kinds only need it when admin set a non-zero shipping fee.
  const needsShipping = cart.items.some(
    (i) => i.kind === "HEALTH_TEST" || (i.shippingCents ?? 0) > 0,
  );

  // List the booked consultation patients so the buyer sees what
  // they're paying for. Edits live on the consult page, not here.
  const consultationLines = cart.items.filter(
    (i) =>
      i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION",
  );

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
        {needsShipping
          ? `Shipping in ${cart.countryCode.toUpperCase()} · paid in ${cart.currencyCode}`
          : `Online services · paid in ${cart.currencyCode}`}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">Payer contact</h2>
            <p className="mt-1 text-xs text-slate-500">
              Receipts and booking confirmations go here. Patient details for
              each consultation were captured on the booking page.
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              name="fullName"
              label="Full name"
              required
              defaultValue={defaults.fullName}
              autoComplete="name"
            />
            <Field
              name="email"
              label="Email"
              type="email"
              required
              autoComplete="email"
              defaultValue={defaults.email}
            />
            <Field
              name="phone"
              label="Phone (optional)"
              type="tel"
              autoComplete="tel"
              defaultValue={defaults.phone}
            />
          </div>

          {consultationLines.length > 0 ? (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Consultations in this order
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {consultationLines.map((line) => (
                  <li key={line.id}>
                    <span className="font-semibold">
                      {line.patient?.fullName ?? "Patient name missing"}
                    </span>
                    {line.patient?.bookingForOther ? (
                      <span className="ml-1 text-xs text-slate-500">
                        (booked on their behalf)
                      </span>
                    ) : null}
                    <span className="text-slate-500"> — {line.name}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                Need to change a patient?{" "}
                <Link href={cartHref} className="font-semibold text-emerald-700 underline">
                  Edit the cart line
                </Link>
                .
              </p>
            </div>
          ) : null}

          {needsShipping ? (
            <>
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
            </>
          ) : null}

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
