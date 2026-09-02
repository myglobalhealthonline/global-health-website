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
import { notificationLocaleFromLang } from "@/lib/notification-locale";
import { getCartPreview, type CartCoverageLine } from "@/lib/api/me-subscription";
import { fetchCurrentUser, type AuthUser } from "@/lib/api/auth-api";
import { PhoneField } from "@/components/forms/phone-field";
import { dialCodeForCountrySlug } from "@/lib/phone/dial-codes";
import { PlanCoverage, type PlanCoverageStrings } from "@/components/cart/PlanCoverage";
import { corporateCoverageLabel } from "@/lib/corporate-coverage-label";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import type { CartItem } from "@/lib/api/cart-types";
import type { CommonLocale } from "@/lib/i18n/types";

type CheckoutT = CommonLocale["checkoutPage"];
type CartT = CommonLocale["cartPage"];

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
import { CouponField, type AppliedCoupon } from "./CouponField";

export function CheckoutPageClient({
  t,
  cartT,
  coverageT,
}: {
  t: CheckoutT;
  cartT: CartT;
  coverageT: PlanCoverageStrings;
}) {
  const router = useRouter();
  const params = useParams<{ country: string; lang: string }>();
  const { cart, loading } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Insurance orders don't pay here — the card is verified by an admin first.
  const [insurancePending, setInsurancePending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  // Plan savings the subscriber selected — so the pay button + total match the
  // amount Stripe charges (server recomputes the same benefits) (B5).
  const [coverageSaved, setCoverageSaved] = useState(0);
  const [coverageLines, setCoverageLines] = useState<CartCoverageLine[]>([]);
  // Applied discount code. `discountCents` is server-computed against this very
  // cart, so the summary never shows a figure the card is not charged — and it
  // is still only a hint: the checkout re-resolves the code and re-claims the
  // redemption cap inside its own transaction.
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  /**
   * The preview is a round-trip, and until it lands `coverageSaved` is 0 — so
   * the pay button reads "Pay €39 securely" for a second or two on an order
   * that will charge €0, and a fast buyer can press it. The amount it names has
   * to be an amount, so the button waits rather than showing a placeholder.
   *
   * Only the LABEL is at stake, never the charge: the server recomputes every
   * benefit at checkout (§13.2) and Stripe is handed the amount it derives.
   */
  const [previewLoading, setPreviewLoading] = useState(true);
  // Payer contact was already collected on the consult Details step (or comes
  // from the signed-in account) — show it read-only by default instead of
  // re-asking, and only unlock the fields if the buyer explicitly wants to
  // pay with different contact details than the ones already on file.
  const [editingContact, setEditingContact] = useState(false);

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
    void getCartPreview()
      .then((res) => {
        if (cancelled) return;
        setCoverageSaved(res.ok ? res.data.totalSavedCents : 0);
        setCoverageLines(res.ok ? res.data.lines : []);
      })
      // A failed preview must still release the button. Its own error path
      // already falls back to "no savings", and the server is the authority on
      // the price either way — leaving the button disabled would strand the
      // buyer on a working checkout.
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
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
  const steps = [cartT.stepCart, cartT.stepCheckout, cartT.stepPayment];

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
    // Don't bounce to the cart after an insurance checkout clears it — the
    // pending-verification panel must stay on screen.
    if (!loading && cart.items.length === 0 && !insurancePending) {
      router.replace(cartHref);
    }
  }, [loading, cart.items.length, router, cartHref, insurancePending]);

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
      notificationLocale: notificationLocaleFromLang(lang),
      couponCode: coupon?.code,
    });
    if (!res.ok) {
      setSubmitting(false);
      // The code stopped being usable between Apply and Pay — expired, spent by
      // somebody else, or disabled. Drop it and say so, rather than letting the
      // buyer discover a higher number on the Stripe page.
      if (res.code === "COUPON_INVALID") {
        setCoupon(null);
        setError(t.couponExpiredAtCheckout);
        return;
      }
      setError(res.message);
      return;
    }
    // Insurance order — no payment now. The card is verified by an admin, who
    // then sends a payment link by email + WhatsApp. Show a pending panel.
    if (res.data.insurancePendingVerification) {
      setSubmitting(false);
      setInsurancePending(true);
      return;
    }
    // Zero-total orders (fully covered by plan credit/discount) never get a
    // Stripe session — the order is already complete, so go straight to the
    // success page instead of assigning a null Stripe URL.
    if (res.data.free || !res.data.url) {
      window.location.assign(`${returnTo.replace(/\/checkout$/, "/checkout/success")}?orderId=${encodeURIComponent(res.data.orderId)}`);
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

  // Insurance pending-verification confirmation. Checked BEFORE the empty-cart
  // guard because the cart is cleared once the pending order is created.
  if (insurancePending) {
    return (
      <>
        <GH2FlowHeader title={t.title} activeStep={2} steps={steps} />
        <section className="bg-[var(--color-background-soft)] px-5 py-12">
          <div className="mx-auto max-w-2xl">
            <div className="gh-card p-8 text-center">
              <h2 className="gh-h3">We&rsquo;re verifying your insurance</h2>
              <p className="gh-body-sm mt-3">
                Thanks — your booking is reserved. Our team will verify your insurance card
                and email &amp; WhatsApp you a secure payment link to confirm your appointment.
                If we can&rsquo;t verify the card, we&rsquo;ll send you a link to book the same
                time at the standard price. No payment is taken until then.
              </p>
              <Link href={`/${params?.country}/${params?.lang}`} className="gh2-btn-lime mt-6 inline-flex">
                Back to home
              </Link>
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
              <h2 className="gh-h3">{cartT.emptyTitle}</h2>
              <p className="gh-body-sm mt-2">{cartT.emptyBody}</p>
              <Link
                href={countrySlug && lang ? `/${countrySlug}/${lang}` : "/"}
                className="gh2-btn-lime mt-6 inline-flex justify-center"
              >
                {cartT.startShopping}
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
  // A coupon and a benefit are mutually exclusive server-side, so these two
  // never both bite; clamped anyway so a stale figure can never invent a
  // negative total.
  const couponSaved = Math.min(
    Math.max(0, coupon?.discountCents ?? 0),
    Math.max(0, cart.subtotalCents - payableSaved),
  );
  const payableTotal = Math.max(0, total - payableSaved - couponSaved);
  // Split the savings row: corporate-membership discount gets its own labeled
  // line ("Corporate Standard (Acme) −10%"), plan benefits keep the generic
  // "Plan savings" label. Amounts are display-only — the server recomputes.
  const corporateDiscount =
    coverageLines.find((l) => l.corporateDiscount)?.corporateDiscount ?? null;
  const corporateSaved = Math.min(
    coverageLines.reduce((s, l) => s + (l.corporateDiscount?.amountCents ?? 0), 0),
    payableSaved,
  );
  const planSaved = payableSaved - corporateSaved;
  /**
   * A benefit can cover the order in full (§6.5/§31). That order never reaches
   * Stripe — checkout completes it and lands on the success page — so the
   * "you will be redirected to Stripe" note and "Pay €0.00 securely" are both
   * false there. Held behind the preview so it never flips mid-read.
   */
  const zeroTotal = !previewLoading && payableTotal === 0;
  const payLabel = submitting
    ? t.redirecting
    : zeroTotal
      ? t.confirmZeroTotal
      : t.paySecurely.replace("{amount}", formatPrice(payableTotal, cart.currencyCode));
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
            <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5">
              {/* Payer contact sub-panel. Email/name were already given on the
                  consult Details step (or come from the signed-in account) —
                  show them read-only and only reveal the editable fields if
                  the buyer explicitly asks to pay with different contact
                  details. Guests with nothing on file (e.g. a products-only
                  cart) get the editable form directly since there's nothing
                  to recap. */}
              <fieldset
                className="rounded-xl p-5"
                style={{ border: "1px solid rgba(29,75,54,0.10)", background: "#fff" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="gh-h3" style={{ fontSize: "1.2rem" }}>{t.payerContact}</h2>
                    <p className="gh-body-sm mt-1" style={{ fontSize: "0.8rem" }}>
                      {t.payerNote}
                    </p>
                  </div>
                  {defaults.email && !editingContact ? (
                    <button
                      type="button"
                      onClick={() => setEditingContact(true)}
                      className="gh-link text-xs font-semibold whitespace-nowrap"
                    >
                      Use a different contact for this payment?
                    </button>
                  ) : null}
                </div>

                {defaults.email && !editingContact ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="fullName" value={defaults.fullName} />
                    <input type="hidden" name="email" value={defaults.email} />
                    <input type="hidden" name="phone" value={defaults.phone} />
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t.fullName}
                      </span>
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {defaults.fullName || "—"}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t.email}
                      </span>
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {defaults.email}
                      </span>
                    </div>
                    {defaults.phone ? (
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                          {t.phoneOptional}
                        </span>
                        <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {defaults.phone}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : (
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
                )}
              </fieldset>

              {/* Consultations recap sub-panel */}
              {consultationLines.length > 0 ? (
                <fieldset
                  className="rounded-xl p-5"
                  style={{ border: "1px solid rgba(29,75,54,0.10)", background: "#fff" }}
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
                        className="rounded-[10px] border px-3.5 py-3"
                        style={{ borderColor: "var(--color-border)", background: "var(--color-background-soft)" }}
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
                </fieldset>
              ) : null}

              {/* Shipping sub-panel */}
              {needsShipping ? (
                <fieldset
                  className="rounded-xl p-5"
                  style={{ border: "1px solid rgba(29,75,54,0.10)", background: "#fff" }}
                >
                  <div>
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
                </fieldset>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="gh-status-error rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
                >
                  {error}
                </p>
              ) : null}

              {/* Mobile-only total recap: on small screens the order summary
                  aside renders below this form, so the buyer would otherwise
                  reach "Pay securely" without the final amount in view.
                  De-emphasized (plain text row, no card/button language) so
                  it reads as a recap, not a second CTA. */}
              <div className="flex items-baseline justify-between px-1 lg:hidden">
                <span className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
                  {t.total}
                </span>
                <span
                  className="text-base font-bold tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {formatPrice(payableTotal, cart.currencyCode)}
                </span>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submitting || previewLoading}
                  className="gh2-btn-lime w-full justify-center disabled:opacity-60 sm:w-auto"
                >
                  {submitting || previewLoading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Lock className="size-4" aria-hidden />
                  )}
                  {payLabel}
                </button>
              </div>
            </form>

            {/* Order summary — dark forest glass (spec §17), same treatment
                as the cart summary aside. */}
            <aside
              id="checkout-order-summary"
              className="gh2-glass-forest self-start overflow-hidden lg:sticky lg:top-[calc(var(--header-height)+16px)]"
            >
              <div className="p-6">
                {/* Read-only subscription coverage: which lines use a credit /
                    discount, the beneficiary, and total saved. Reserves nothing
                    — checkout recomputes authoritatively. */}
                <PlanCoverage
                  t={coverageT}
                  loginHref={`/login?next=${encodeURIComponent(returnTo)}`}
                  plansHref={`${countrySlug && lang ? `/${countrySlug}/${lang}` : ""}/pricing?returnTo=${encodeURIComponent(returnTo)}`}
                  itemNames={Object.fromEntries(cart.items.map((i) => [i.id, i.name]))}
                />
                <h2 className="text-[1.125rem] font-bold tracking-[-0.01em]" style={{ color: "rgba(255,255,255,0.95)" }}>
                  {t.orderSummary}
                </h2>
                <ul className="mt-4 divide-y" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                  {cart.items.map((i) => {
                    const Icon = KIND_ICON[i.kind];
                    return (
                      <li key={i.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                        <span
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                          style={{ background: "rgba(255,255,255,0.08)" }}
                          aria-hidden
                        >
                          <Icon className="size-4" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold leading-snug" style={{ color: "rgba(255,255,255,0.92)" }}>
                              {i.name}
                              {i.quantity > 1 ? (
                                <span className="font-normal" style={{ color: "var(--gh2-on-dark-muted)" }}>
                                  {" "}× {i.quantity}
                                </span>
                              ) : null}
                            </p>
                            <p
                              className="text-sm font-bold [font-variant-numeric:tabular-nums]"
                              style={{ color: "rgba(255,255,255,0.92)" }}
                            >
                              {formatPrice(i.lineTotalCents, cart.currencyCode)}
                            </p>
                          </div>
                          {i.slotStartAt ? (
                            <p className="mt-0.5 text-xs" style={{ color: "var(--gh2-on-dark-muted)" }}>
                              {i.doctorName ? `${i.doctorName} · ` : ""}
                              {formatAppDateTimeShort(i.slotStartAt)}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <CouponField
                  t={t}
                  applied={coupon}
                  onApply={setCoupon}
                  onRemove={() => setCoupon(null)}
                  readEmail={() =>
                    String(
                      (formRef.current?.elements.namedItem("email") as HTMLInputElement | null)
                        ?.value ?? "",
                    )
                  }
                  disabled={submitting}
                />
                <dl className="mt-4 space-y-2 border-t pt-4 text-sm" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                  <div className="flex justify-between">
                    <dt style={{ color: "var(--gh2-on-dark-muted)" }}>{t.subtotal}</dt>
                    <dd className="font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "#fff" }}>
                      {formatPrice(cart.subtotalCents, cart.currencyCode)}
                    </dd>
                  </div>
                  {shippingCents > 0 ? (
                    <div className="flex justify-between">
                      <dt style={{ color: "var(--gh2-on-dark-muted)" }}>{t.shipping}</dt>
                      <dd className="font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "#fff" }}>
                        {formatPrice(shippingCents, cart.currencyCode)}
                      </dd>
                    </div>
                  ) : null}
                  {planSaved > 0 ? (
                    <div className="flex justify-between">
                      <dt style={{ color: "var(--color-brand-accent)" }}>{cartT.planSavings}</dt>
                      <dd className="font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "var(--color-brand-accent)" }}>
                        −{formatPrice(planSaved, cart.currencyCode)}
                      </dd>
                    </div>
                  ) : null}
                  {corporateSaved > 0 && corporateDiscount ? (
                    <div className="flex justify-between gap-3">
                      <dt style={{ color: "var(--color-brand-accent)" }}>
                        {corporateDiscount.planName} ({corporateDiscount.companyName}){" "}
                        {corporateCoverageLabel(corporateDiscount, cart.currencyCode, {
                          copay: cartT.corporateCopay,
                          included: cartT.corporateIncluded,
                        })}
                      </dt>
                      <dd className="shrink-0 font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "var(--color-brand-accent)" }}>
                        −{formatPrice(corporateSaved, cart.currencyCode)}
                      </dd>
                    </div>
                  ) : null}
                  {couponSaved > 0 && coupon ? (
                    <div className="flex justify-between gap-3">
                      <dt style={{ color: "var(--color-brand-accent)" }}>
                        {t.couponDiscount.replace("{percent}", String(coupon.discountPercent))}
                      </dt>
                      <dd className="shrink-0 font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "var(--color-brand-accent)" }}>
                        −{formatPrice(couponSaved, cart.currencyCode)}
                      </dd>
                    </div>
                  ) : null}
                  <div
                    className="flex items-baseline justify-between border-t pt-3"
                    style={{ borderColor: "rgba(255,255,255,0.12)" }}
                  >
                    <dt className="text-base font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>{t.total}</dt>
                    <dd
                      className="text-xl font-extrabold tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
                      style={{ color: "var(--color-brand-accent)" }}
                    >
                      {formatPrice(payableTotal, cart.currencyCode)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Consolidated trust strip — merges the old two trust-message
                  styles (footer band + under-button redirect note) into one
                  light-on-dark strip inside the glass summary (spec §17). */}
              <div
                className="border-t px-6 py-4"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <ul className="space-y-2 text-[13px]" style={{ color: "var(--gh2-on-dark-muted)" }}>
                  {[
                    { icon: ShieldCheck, label: t.trustSecure },
                    { icon: Lock, label: t.trustEncrypted },
                    { icon: Lock, label: zeroTotal ? t.zeroTotalNote : t.redirectNote },
                  ].map(({ icon: Icon, label }, idx) => (
                    <li key={`${label}-${idx}`} className="flex items-center gap-2.5">
                      <Icon className="size-4 shrink-0" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
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
        actionLabel={payLabel}
        onAction={() => formRef.current?.requestSubmit()}
        pending={submitting || previewLoading}
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
