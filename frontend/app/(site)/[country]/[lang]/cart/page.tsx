"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  FlaskConical,
  Lock,
  Minus,
  Pill,
  Plus,
  ShieldCheck,
  Stethoscope,
  Trash2,
  User,
} from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import { CART_ITEM_MAX_QTY, type CartItem } from "@/lib/api/cart-types";
import type { CommonLocale, LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

type CartT = CommonLocale["cartPage"];

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

const KIND_ICON: Record<CartItem["kind"], typeof Stethoscope> = {
  GENERAL_CONSULTATION: Stethoscope,
  SPECIALIST_CONSULTATION: Stethoscope,
  HEALTH_TEST: FlaskConical,
  PRESCRIPTION_SERVICE: Pill,
};

function kindLabel(kind: CartItem["kind"], t: CartT): string {
  switch (kind) {
    case "GENERAL_CONSULTATION":
      return t.kindGeneral;
    case "SPECIALIST_CONSULTATION":
      return t.kindSpecialist;
    case "HEALTH_TEST":
      return t.kindTest;
    case "PRESCRIPTION_SERVICE":
      return t.kindPrescription;
  }
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
  const t = loadLocaleBundle((lang || "en") as LocaleCode).common.cartPage;
  const steps = [t.stepCart, t.stepCheckout, t.stepPayment];

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
      <>
        <GH2FlowHeader title={t.title} activeStep={1} steps={steps} />
        <section className="bg-[var(--color-background-soft)] px-5 py-12">
          <div className="mx-auto max-w-5xl">
            <p className="gh-body-sm">{t.loading}</p>
          </div>
        </section>
      </>
    );
  }

  if (cart.items.length === 0) {
    return (
      <>
        <GH2FlowHeader title={t.title} activeStep={1} steps={steps} />
        <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
          <div
            className="mx-auto flex max-w-3xl flex-col items-center rounded-[var(--radius-card)] border border-dashed bg-white px-6 py-16 text-center shadow-[var(--shadow-card)]"
            style={{ borderColor: "var(--color-border-strong)" }}
          >
            <span aria-hidden className="gh2-index text-[4rem] leading-none text-[rgba(29,75,54,0.16)]">00</span>
            <h1 className="gh-h3 mt-4">{t.emptyTitle}</h1>
            <p className="gh-body-sm mt-2 max-w-md">
              {t.emptyBody}
            </p>
            <Link href={countryHome} className="gh2-btn-lime mt-6">
              {t.startShopping}
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
      <GH2FlowHeader title={t.title} activeStep={1} steps={steps} />
      <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-[var(--container-width)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="gh-h2">{t.title}</h1>
              <p className="gh-body-sm mt-2">
                {cart.itemCount} {cart.itemCount === 1 ? t.itemSingular : t.itemPlural} ·{" "}
                {cart.countryCode.toUpperCase()} · {t.paidIn} {cart.currencyCode}
              </p>
            </div>
            <Link href={countryHome} className="gh-link inline-flex items-center gap-1.5 text-sm">
              <ArrowLeft className="size-4" aria-hidden />
              {t.continueShopping}
            </Link>
          </div>

          {showAddedFlash ? (
            <div
              role="status"
              className="gh-status-success mt-5 flex items-center gap-2 rounded-[var(--radius-card-sm)] px-3 py-2.5 text-sm font-semibold"
            >
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              <span>{t.addedToCart}</span>
            </div>
          ) : null}

          {expiredFlash > 0 ? (
            <div className="gh-status-warning mt-5 flex items-start gap-2 rounded-[var(--radius-card-sm)] px-3 py-2.5 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {(expiredFlash === 1 ? t.expiredSingular : t.expiredPlural).replace(
                  "{count}",
                  String(expiredFlash),
                )}
              </span>
              <button
                type="button"
                onClick={() => setExpiredFlash(0)}
                className="ml-auto rounded p-0.5 transition-colors hover:bg-black/5"
                style={{ color: "var(--color-status-warning-text)" }}
                aria-label={t.dismiss}
              >
                ×
              </button>
            </div>
          ) : null}

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
            {/* Items */}
            <div className="gh-card overflow-hidden">
              <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {cart.items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    currency={cart.currencyCode}
                    t={t}
                    onIncrease={() => void update(item.id, item.quantity + 1)}
                    onDecrease={() =>
                      item.quantity > 1 && void update(item.id, item.quantity - 1)
                    }
                    onRemove={() => void remove(item.id)}
                  />
                ))}
              </ul>

              <div
                className="flex items-center justify-end border-t px-5 py-3.5"
                style={{ borderColor: "var(--color-border)", background: "var(--color-background-soft)" }}
              >
                <button
                  type="button"
                  onClick={() => void clear()}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold underline-offset-2 transition-colors hover:underline"
                  style={{ color: "var(--color-status-error)" }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  {t.clearCart}
                </button>
              </div>
            </div>

            {/* Summary */}
            <aside
              className="gh-card self-start p-6 lg:sticky lg:top-[calc(var(--header-height)+16px)]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <h2 className="gh-h3" style={{ fontSize: "1.125rem" }}>{t.orderSummary}</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt style={{ color: "var(--color-text-muted)" }}>
                    {t.subtotalItems
                      .replace("{count}", String(cart.itemCount))
                      .replace("{unit}", cart.itemCount === 1 ? t.itemSingular : t.itemPlural)}
                  </dt>
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
                <div
                  className="flex items-baseline justify-between border-t pt-3"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <dt className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>{t.total}</dt>
                  <dd
                    className="text-xl font-extrabold tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {formatPrice(total, cart.currencyCode)}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => router.push(checkoutHref)}
                className="gh2-btn-lime mt-6 w-full justify-center"
              >
                {t.continueToCheckout}
                <ArrowRight className="size-4" aria-hidden />
              </button>

              {/* Trust rows */}
              <ul
                className="mt-5 space-y-2.5 border-t pt-5 text-[13px]"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
              >
                {[
                  { icon: ShieldCheck, label: t.trustSecure },
                  { icon: Lock, label: t.trustNoStore },
                  { icon: CalendarCheck, label: t.trustInstant },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
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
  t,
}: {
  item: CartItem;
  currency: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  t: CartT;
}) {
  const isConsult =
    item.kind === "GENERAL_CONSULTATION" ||
    item.kind === "SPECIALIST_CONSULTATION";
  const countdown = useCountdown(item.heldUntil);
  const atMax = item.quantity >= CART_ITEM_MAX_QTY;
  const KindIcon = KIND_ICON[item.kind];
  const itemKindLabel = kindLabel(item.kind, t);

  return (
    <li className="flex gap-4 p-5 sm:gap-5">
      {/* Kind icon tile */}
      <span
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] sm:size-14"
        style={{
          background: "var(--color-brand-mint-dim)",
          border: "1px solid rgba(29,75,54,0.10)",
        }}
        aria-hidden
      >
        <KindIcon className="size-5 sm:size-6" style={{ color: "var(--color-brand-primary)" }} strokeWidth={1.6} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-snug" style={{ color: "var(--color-text-primary)" }}>
              {item.name}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {itemKindLabel}
              {" · "}
              {formatPrice(item.unitPriceCents, currency)} {t.each}
            </p>
          </div>
          <p
            className="text-[15px] font-extrabold tracking-[-0.01em] [font-variant-numeric:tabular-nums]"
            style={{ color: "var(--color-text-primary)" }}
          >
            {formatPrice(item.lineTotalCents, currency)}
          </p>
        </div>

        {/* Consultation lines: doctor + slot + patient identity so the
            buyer can scan the cart and confirm what they're paying for
            without leaving the page. */}
        {isConsult ? (
          <div
            className="mt-3 grid gap-x-6 gap-y-1.5 rounded-[var(--radius-card-sm)] border px-3.5 py-3 text-[13px] sm:grid-cols-2"
            style={{ borderColor: "var(--color-border)", background: "var(--color-background-soft)" }}
          >
            {item.doctorName ? (
              <p className="flex items-center gap-2" style={{ color: "var(--color-text-body)" }}>
                <Stethoscope className="size-3.5 shrink-0" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                <span className="font-semibold">{item.doctorName}</span>
              </p>
            ) : null}
            {item.slotStartAt ? (
              <p className="flex items-center gap-2" style={{ color: "var(--color-text-body)" }}>
                <CalendarDays className="size-3.5 shrink-0" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                <span className="font-semibold">{formatAppDateTimeShort(item.slotStartAt)}</span>
              </p>
            ) : null}
            {item.patient?.fullName ? (
              <p className="flex items-center gap-2 sm:col-span-2" style={{ color: "var(--color-text-body)" }}>
                <User className="size-3.5 shrink-0" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                <span className="font-semibold">{item.patient.fullName}</span>
                {item.patient.bookingForOther ? (
                  <span className="gh-badge gh-badge-warning px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    {t.bookedForThem}
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
            className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold"
            style={{ color: "var(--color-status-warning-text)" }}
          >
            <Clock className="size-3" aria-hidden />
            {countdown === "expired"
              ? t.holdReleased
              : t.slotReserved.replace("{time}", countdown)}
          </p>
        ) : null}
        {!isConsult && atMax ? (
          <p className="mt-2 text-[11.5px] font-semibold" style={{ color: "var(--color-status-warning-text)" }}>
            {t.maxPerItem.replace("{max}", String(CART_ITEM_MAX_QTY))}
          </p>
        ) : null}

        {/* Bottom row: quantity controls + remove */}
        <div className="mt-3 flex items-center justify-between gap-4">
          {isConsult ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "var(--color-background-soft)", color: "var(--color-text-muted)" }}
            >
              {t.oneBooking}
            </span>
          ) : (
            <div
              className="inline-flex items-center rounded-full border bg-white"
              style={{ borderColor: "var(--color-border-strong)" }}
            >
              <button
                type="button"
                onClick={onDecrease}
                disabled={item.quantity <= 1}
                aria-label={t.decreaseQuantity}
                className="inline-flex size-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-background-soft)] disabled:opacity-30"
                style={{ color: "var(--color-text-body)" }}
              >
                <Minus className="size-3.5" aria-hidden />
              </button>
              <span
                className="min-w-[2.25rem] text-center text-sm font-bold [font-variant-numeric:tabular-nums]"
                style={{ color: "var(--color-text-primary)" }}
              >
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={onIncrease}
                disabled={atMax}
                aria-label={t.increaseQuantity}
                title={atMax ? t.maxPerItem.replace("{max}", String(CART_ITEM_MAX_QTY)) : undefined}
                className="inline-flex size-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-background-soft)] disabled:opacity-30"
                style={{ color: "var(--color-text-body)" }}
              >
                <Plus className="size-3.5" aria-hidden />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onRemove}
            aria-label={t.removeAria.replace("{name}", item.name)}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--color-status-error-bg)]"
            style={{ color: "var(--color-status-error)" }}
          >
            <Trash2 className="size-3.5" aria-hidden />
            {t.remove}
          </button>
        </div>
      </div>
    </li>
  );
}
