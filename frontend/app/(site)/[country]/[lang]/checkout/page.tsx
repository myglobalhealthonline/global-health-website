"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  FlaskConical,
  Loader2,
  Lock,
  Pill,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import { startCheckout } from "@/lib/api/cart-client";
import { fetchCurrentUser, type AuthUser } from "@/lib/api/auth-api";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import type { CartItem } from "@/lib/api/cart-types";

const KIND_ICON: Record<CartItem["kind"], typeof Stethoscope> = {
  GENERAL_CONSULTATION: Stethoscope,
  SPECIALIST_CONSULTATION: Stethoscope,
  HEALTH_TEST: FlaskConical,
  PRESCRIPTION_SERVICE: Pill,
};

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
      <>
        <GH2FlowHeader title="Checkout" activeStep={2} steps={["Cart", "Checkout", "Payment"]} />
        <section className="bg-[var(--color-background-soft)] px-5 py-12">
          <div className="mx-auto max-w-5xl">
            <p className="gh-body-sm">Loading...</p>
          </div>
        </section>
      </>
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
    <>
      <GH2FlowHeader
        title="Checkout"
        subtitle={needsShipping
          ? `Shipping in ${cart.countryCode.toUpperCase()} · paid in ${cart.currencyCode}`
          : `Online services · paid in ${cart.currencyCode}`}
        activeStep={2}
        steps={["Cart", "Checkout", "Payment"]}
      />
      <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-[var(--container-width)]">
          <Link href={cartHref} className="gh-link inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft className="size-4" aria-hidden />
            Back to cart
          </Link>

          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
            <form
              onSubmit={onSubmit}
              className="gh-card p-6 sm:p-8"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {/* 01 — Payer contact */}
              <div className="flex items-start gap-3">
                <span aria-hidden className="gh2-index mt-1" style={{ color: "rgba(29,75,54,0.40)" }}>
                  01
                </span>
                <div>
                  <h2 className="gh-h3" style={{ fontSize: "1.2rem" }}>Payer contact</h2>
                  <p className="gh-body-sm mt-1" style={{ fontSize: "0.8rem" }}>
                    Receipts and booking confirmations go here. Patient details for
                    each consultation were captured on the booking page.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                  className="mt-7 rounded-[var(--radius-card-sm)] border p-4 sm:p-5"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background-soft)" }}
                >
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: "var(--color-brand-primary)" }}
                  >
                    Consultations in this order
                  </p>
                  <ul className="mt-3 space-y-3">
                    {consultationLines.map((line) => (
                      <li
                        key={line.id}
                        className="rounded-[10px] border bg-white px-3.5 py-3"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                          {line.name}
                        </p>
                        <div className="mt-1.5 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
                          <span className="inline-flex items-center gap-2" style={{ color: "var(--color-text-body)" }}>
                            <User className="size-3.5 shrink-0" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                            {line.patient?.fullName ?? "Patient name missing"}
                            {line.patient?.bookingForOther ? (
                              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                (on their behalf)
                              </span>
                            ) : null}
                          </span>
                          {line.doctorName ? (
                            <span className="inline-flex items-center gap-2" style={{ color: "var(--color-text-body)" }}>
                              <Stethoscope className="size-3.5 shrink-0" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                              {line.doctorName}
                            </span>
                          ) : null}
                          {line.slotStartAt ? (
                            <span className="inline-flex items-center gap-2" style={{ color: "var(--color-text-body)" }}>
                              <CalendarDays className="size-3.5 shrink-0" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                              {formatAppDateTimeShort(line.slotStartAt)}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
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
                  <div
                    className="mt-8 flex items-start gap-3 border-t pt-7"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <span aria-hidden className="gh2-index mt-1" style={{ color: "rgba(29,75,54,0.40)" }}>
                      02
                    </span>
                    <div>
                      <h2 className="gh-h3" style={{ fontSize: "1.2rem" }}>Shipping address</h2>
                      <p className="gh-body-sm mt-1" style={{ fontSize: "0.8rem" }}>
                        Your test kit is delivered to this address.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                <p className="gh-status-error mt-5 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="gh2-btn-lime mt-7 w-full justify-center disabled:opacity-60 sm:w-auto"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Lock className="size-4" aria-hidden />
                )}
                {submitting ? "Redirecting to Stripe…" : `Pay ${formatPrice(total, cart.currencyCode)} securely`}
              </button>
              <p
                className="mt-3 flex items-center gap-1.5 text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                <ShieldCheck className="size-3.5 shrink-0" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                You will be redirected to Stripe to complete payment. We never store your card details.
              </p>
            </form>

            {/* Order summary */}
            <aside
              className="gh-card self-start overflow-hidden lg:sticky lg:top-[calc(var(--header-height)+16px)]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="p-6">
                <h2 className="gh-h3" style={{ fontSize: "1.125rem" }}>Order summary</h2>
                <ul className="mt-4 divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {cart.items.map((i) => {
                    const Icon = KIND_ICON[i.kind];
                    return (
                      <li key={i.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                        <span
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                          style={{ background: "var(--color-brand-mint-dim)" }}
                          aria-hidden
                        >
                          <Icon className="size-4" style={{ color: "var(--color-brand-primary)" }} strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold leading-snug" style={{ color: "var(--color-text-primary)" }}>
                              {i.name}
                              {i.quantity > 1 ? (
                                <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>
                                  {" "}× {i.quantity}
                                </span>
                              ) : null}
                            </p>
                            <p
                              className="text-sm font-bold [font-variant-numeric:tabular-nums]"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {formatPrice(i.lineTotalCents, cart.currencyCode)}
                            </p>
                          </div>
                          {i.slotStartAt ? (
                            <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                              {i.doctorName ? `${i.doctorName} · ` : ""}
                              {formatAppDateTimeShort(i.slotStartAt)}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <dl className="mt-4 space-y-2 border-t pt-4 text-sm" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex justify-between">
                    <dt style={{ color: "var(--color-text-muted)" }}>Subtotal</dt>
                    <dd className="font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "var(--color-text-primary)" }}>
                      {formatPrice(cart.subtotalCents, cart.currencyCode)}
                    </dd>
                  </div>
                  {shippingCents > 0 ? (
                    <div className="flex justify-between">
                      <dt style={{ color: "var(--color-text-muted)" }}>Shipping</dt>
                      <dd className="font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "var(--color-text-primary)" }}>
                        {formatPrice(shippingCents, cart.currencyCode)}
                      </dd>
                    </div>
                  ) : null}
                  <div
                    className="flex items-baseline justify-between border-t pt-3"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <dt className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Total</dt>
                    <dd
                      className="text-xl font-extrabold tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {formatPrice(total, cart.currencyCode)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Trust footer */}
              <div
                className="border-t px-6 py-4"
                style={{ borderColor: "var(--color-border)", background: "var(--color-background-soft)" }}
              >
                <ul className="space-y-2 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                  {[
                    { icon: ShieldCheck, label: "Secure payment powered by Stripe" },
                    { icon: Lock, label: "Encrypted — card details never stored" },
                  ].map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-2.5">
                      <Icon className="size-4 shrink-0" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
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
