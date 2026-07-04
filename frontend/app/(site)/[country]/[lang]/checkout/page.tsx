"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { MobileOrderTotalBar } from "@/components/cart/MobileOrderTotalBar";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import { startCheckout } from "@/lib/api/cart-client";
import { getCartPreview } from "@/lib/api/me-subscription";
import { fetchCurrentUser, type AuthUser } from "@/lib/api/auth-api";
import { PhoneField } from "@/components/forms/phone-field";
import { dialCodeForCountrySlug } from "@/lib/phone/dial-codes";
import { PlanCoverage } from "@/components/cart/PlanCoverage";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import type { CartItem } from "@/lib/api/cart-types";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

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
  const formRef = useRef<HTMLFormElement>(null);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  // Plan savings the subscriber selected — so the pay button + total match the
  // amount Stripe charges (server recomputes the same benefits) (B5).
  const [coverageSaved, setCoverageSaved] = useState(0);

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

  useEffect(() => {
    let cancelled = false;
    void getCartPreview().then((res) => {
      if (!cancelled) setCoverageSaved(res.ok ? res.data.totalSavedCents : 0);
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
  const common = loadLocaleBundle((lang || "en") as LocaleCode).common;
  const t = common.checkoutPage;
  const steps = [common.cartPage.stepCart, common.cartPage.stepCheckout, common.cartPage.stepPayment];

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
        <GH2FlowHeader title={t.title} activeStep={2} steps={steps} />
        <section className="bg-[var(--color-background-soft)] px-5 py-12">
          <div className="mx-auto max-w-5xl">
            <div
              className="gh-card flex items-center gap-3 p-6"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="size-5 shrink-0 animate-spin motion-reduce:animate-none"
                style={{ color: "var(--color-brand-primary)" }}
                aria-hidden
              />
              <p className="gh-body-sm m-0">{t.loading}</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (cart.items.length === 0) {
    // The redirect effect above sends the user back to the cart; render an
    // explicit empty state instead of a blank frame in case the redirect is
    // slow or missed (e.g. backend/cart preview unavailable).
    return (
      <>
        <GH2FlowHeader title={t.title} activeStep={2} steps={steps} />
        <section className="bg-[var(--color-background-soft)] px-5 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="gh-card p-8 text-center">
              <h2 className="gh-h3">{common.cartPage.emptyTitle}</h2>
              <p className="gh-body-sm mt-2">{common.cartPage.emptyBody}</p>
              <Link
                href={countrySlug && lang ? `/${countrySlug}/${lang}` : "/"}
                className="gh2-btn-lime mt-6 inline-flex justify-center"
              >
                {common.cartPage.startShopping}
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  const shippingCents = cart.items.reduce(
    (s, i) => s + (i.shippingCents ?? 0) * i.quantity,
    0,
  );
  const total = cart.subtotalCents + shippingCents;
  const payableSaved = Math.min(Math.max(0, coverageSaved), cart.subtotalCents);
  const payableTotal = Math.max(0, total - payableSaved);
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
        title={t.title}
        subtitle={needsShipping
          ? t.subtitleShipping.replace("{country}", cart.countryCode.toUpperCase()).replace("{currency}", cart.currencyCode)
          : t.subtitleOnline.replace("{currency}", cart.currencyCode)}
        activeStep={2}
        steps={steps}
      />
      <section className="bg-[var(--color-background-soft)] px-5 pb-28 pt-12 sm:py-16 md:pb-16">
        <div className="mx-auto max-w-[var(--container-width)]">
          <Link href={cartHref} className="gh-link inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft className="size-4" aria-hidden />
            {t.backToCart}
          </Link>

          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
            <form
              ref={formRef}
              onSubmit={onSubmit}
              className="gh-card p-6 sm:p-8"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div>
                <h2 className="gh-h3" style={{ fontSize: "1.2rem" }}>{t.payerContact}</h2>
                <p className="gh-body-sm mt-1" style={{ fontSize: "0.8rem" }}>
                  {t.payerNote}
                </p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  name="fullName"
                  label={t.fullName}
                  required
                  defaultValue={defaults.fullName}
                  autoComplete="name"
                />
                <Field
                  name="email"
                  label={t.email}
                  type="email"
                  required
                  autoComplete="email"
                  defaultValue={defaults.email}
                />
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                    {t.phoneOptional}
                  </span>
                  <PhoneField
                    name="phone"
                    defaultValue={defaults.phone}
                    defaultDial={dialCodeForCountrySlug(countrySlug)}
                  />
                </label>
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
                    {t.consultationsInOrder}
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
                            {line.patient?.fullName ?? t.patientNameMissing}
                            {line.patient?.bookingForOther ? (
                              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                {t.onTheirBehalf}
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
                    {t.needChangePatient}{" "}
                    <Link href={cartHref} className="gh-link">
                      {t.editCartLine}
                    </Link>
                    .
                  </p>
                </div>
              ) : null}

              {needsShipping ? (
                <>
                  <div
                    className="mt-8 border-t pt-7"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <h2 className="gh-h3" style={{ fontSize: "1.2rem" }}>{t.shippingAddress}</h2>
                    <p className="gh-body-sm mt-1" style={{ fontSize: "0.8rem" }}>
                      {t.shippingNote}
                    </p>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field name="shipName" label={t.recipientName} required />
                    <Field
                      name="shipCountryCode"
                      label={t.countryCodeIso}
                      required
                      defaultValue={cart.countryCode.toUpperCase()}
                      maxLength={4}
                      uppercase
                    />
                    <Field name="shipLine1" label={t.addressLine1} required full />
                    <Field name="shipLine2" label={t.addressLine2} full />
                    <Field name="shipCity" label={t.city} required />
                    <Field name="shipPostalCode" label={t.postalCode} required />
                  </div>
                </>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="gh-status-error mt-5 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
                >
                  {error}
                </p>
              ) : null}

              {/* Mobile-only total recap: on small screens the order summary
                  aside renders below this form, so the buyer would otherwise
                  reach "Pay securely" without the final amount in view. */}
              <div
                className="mt-6 flex items-baseline justify-between rounded-[var(--radius-card-sm)] border px-4 py-3 lg:hidden"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-background-soft)",
                }}
              >
                <span className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {t.total}
                </span>
                <span
                  className="text-lg font-extrabold tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {formatPrice(payableTotal, cart.currencyCode)}
                </span>
              </div>

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
                {submitting ? t.redirecting : t.paySecurely.replace("{amount}", formatPrice(payableTotal, cart.currencyCode))}
              </button>
              <p
                className="mt-3 flex items-center gap-1.5 text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                <ShieldCheck className="size-3.5 shrink-0" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                {t.redirectNote}
              </p>
            </form>

            {/* Order summary */}
            <aside
              id="checkout-order-summary"
              className="gh-card self-start overflow-hidden lg:sticky lg:top-[calc(var(--header-height)+16px)]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="p-6">
                {/* Read-only subscription coverage: which lines use a credit /
                    discount, the beneficiary, and total saved. Reserves nothing
                    — checkout recomputes authoritatively. */}
                <PlanCoverage
                  lang={lang}
                  loginHref={`/login?next=${encodeURIComponent(returnTo)}`}
                  plansHref={`${countrySlug && lang ? `/${countrySlug}/${lang}` : ""}/pricing?returnTo=${encodeURIComponent(returnTo)}`}
                  itemNames={Object.fromEntries(cart.items.map((i) => [i.id, i.name]))}
                />
                <h2 className="gh-h3" style={{ fontSize: "1.125rem" }}>{t.orderSummary}</h2>
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
                    <dt style={{ color: "var(--color-text-muted)" }}>{t.subtotal}</dt>
                    <dd className="font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "var(--color-text-primary)" }}>
                      {formatPrice(cart.subtotalCents, cart.currencyCode)}
                    </dd>
                  </div>
                  {shippingCents > 0 ? (
                    <div className="flex justify-between">
                      <dt style={{ color: "var(--color-text-muted)" }}>{t.shipping}</dt>
                      <dd className="font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "var(--color-text-primary)" }}>
                        {formatPrice(shippingCents, cart.currencyCode)}
                      </dd>
                    </div>
                  ) : null}
                  {payableSaved > 0 ? (
                    <div className="flex justify-between">
                      <dt style={{ color: "var(--color-brand-primary)" }}>{common.cartPage.planSavings}</dt>
                      <dd className="font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "var(--color-brand-primary)" }}>
                        −{formatPrice(payableSaved, cart.currencyCode)}
                      </dd>
                    </div>
                  ) : null}
                  <div
                    className="flex items-baseline justify-between border-t pt-3"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <dt className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>{t.total}</dt>
                    <dd
                      className="text-xl font-extrabold tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {formatPrice(payableTotal, cart.currencyCode)}
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
                    { icon: ShieldCheck, label: t.trustSecure },
                    { icon: Lock, label: t.trustEncrypted },
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
      <MobileOrderTotalBar
        totalLabel={t.total}
        formattedTotal={formatPrice(payableTotal, cart.currencyCode)}
        actionLabel={submitting ? t.redirecting : t.paySecurely.replace("{amount}", formatPrice(payableTotal, cart.currencyCode))}
        onAction={() => formRef.current?.requestSubmit()}
        pending={submitting}
        watchTargetId="checkout-order-summary"
      />
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
