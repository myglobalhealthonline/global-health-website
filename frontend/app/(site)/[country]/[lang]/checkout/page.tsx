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
        <p className="gh-body-sm">Loading…</p>
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
      <Link href={cartHref} className="gh-link mb-4 inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" aria-hidden />
        Back to cart
      </Link>
      <h1 className="gh-h1">Checkout</h1>
      <p className="gh-body-sm mt-2">
        {needsShipping
          ? `Shipping in ${cart.countryCode.toUpperCase()} · paid in ${cart.currencyCode}`
          : `Online services · paid in ${cart.currencyCode}`}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form
          onSubmit={onSubmit}
          className="gh-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div>
            <h2 className="gh-h3" style={{ fontSize: "1.125rem" }}>Payer contact</h2>
            <p className="gh-body-sm mt-1" style={{ fontSize: "0.75rem" }}>
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
            <div
              className="mt-6 rounded-[var(--radius-card-sm)] border p-4"
              style={{ borderColor: "var(--color-border)", background: "var(--color-background-soft)" }}
            >
              <p className="gh-eyebrow text-xs font-bold uppercase tracking-wider">
                Consultations in this order
              </p>
              <ul className="mt-2 space-y-1.5 text-sm" style={{ color: "var(--color-text-body)" }}>
                {consultationLines.map((line) => (
                  <li key={line.id}>
                    <span className="font-semibold">
                      {line.patient?.fullName ?? "Patient name missing"}
                    </span>
                    {line.patient?.bookingForOther ? (
                      <span className="ml-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        (booked on their behalf)
                      </span>
                    ) : null}
                    <span style={{ color: "var(--color-text-muted)" }}> — {line.name}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                Need to change a patient?{" "}
                <Link href={cartHref} className="gh-link">
                  Edit the cart line
                </Link>
                .
              </p>
            </div>
          ) : null}

          {needsShipping ? (
            <>
              <h2 className="gh-h3 mt-8" style={{ fontSize: "1.125rem" }}>Shipping address</h2>
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
            <p className="gh-status-error mt-4 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="gh-btn gh-btn-primary mt-6 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {submitting ? "Redirecting to Stripe…" : `Pay ${formatPrice(total, cart.currencyCode)}`}
          </button>
          <p className="gh-body-sm mt-2" style={{ fontSize: "0.75rem" }}>
            You will be redirected to Stripe to complete payment.
          </p>
        </form>

        <aside className="gh-card self-start p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="gh-h3" style={{ fontSize: "1.125rem" }}>Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="min-w-0 flex-1" style={{ color: "var(--color-text-body)" }}>
                  {i.name}{" "}
                  <span style={{ color: "var(--color-text-muted)" }}>× {i.quantity}</span>
                </span>
                <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {formatPrice(i.lineTotalCents, cart.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t pt-4 text-sm" style={{ borderColor: "var(--color-border)" }}>
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
    <label className={`flex min-w-0 flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {label} {required ? <span style={{ color: "var(--color-status-error)" }}>*</span> : null}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        maxLength={maxLength}
        className="gh-input"
        style={uppercase ? { textTransform: "uppercase" } : undefined}
      />
    </label>
  );
}
