"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { MobileOrderTotalBar } from "@/components/cart/MobileOrderTotalBar";
import { PlanCoverage, type PlanCoverageStrings } from "@/components/cart/PlanCoverage";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import { CART_ITEM_MAX_QTY, type BenefitSelection, type CartItem } from "@/lib/api/cart-types";
import { getCartPreview, type CartCoverageLine } from "@/lib/api/me-subscription";
import type { CommonLocale } from "@/lib/i18n/types";

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

export function CartPageClient({
  t,
  coverageT,
}: {
  t: CartT;
  coverageT: PlanCoverageStrings;
}) {
  const router = useRouter();
  const params = useParams<{ country: string; lang: string }>();
  const searchParams = useSearchParams();
  const { cart, loading, update, patchItem, remove, clear, refresh } = useCart();
  const [expiredFlash, setExpiredFlash] = useState(0);
  const [expiredItemsFlash, setExpiredItemsFlash] = useState<
    { name: string; doctorName: string | null }[]
  >([]);
  // Per-line subscription coverage (eligible selections + the resolved price
  // reason) for the benefit selector. Fetched from the read-only preview;
  // `coverageNonce` also forces the PlanCoverage panel to re-fetch in sync.
  const [coverageLines, setCoverageLines] = useState<Record<string, CartCoverageLine>>({});
  // Aggregate plan savings across consultation lines (subscriber's picked
  // benefits) — drives the benefit-adjusted order total (B5).
  const [coverageSaved, setCoverageSaved] = useState(0);
  const [coverageNonce, setCoverageNonce] = useState(0);
  const [benefitError, setBenefitError] = useState<string | null>(null);
  const loadCoverage = useCallback(async () => {
    const res = await getCartPreview();
    setCoverageLines(
      res.ok ? Object.fromEntries(res.data.lines.map((l) => [l.itemId, l])) : {},
    );
    setCoverageSaved(res.ok ? res.data.totalSavedCents : 0);
  }, []);
  // `?added=1` arrives from the consult booking form so the patient
  // gets explicit positive feedback after add-to-cart. `bDoctor`/`bWhen`/
  // `bPrice` (when present — consultation bookings only) name what was just
  // booked so the flash confirms the actual booking, not just "something
  // was added". Auto-clears after 4s and the URL is rewritten without the
  // flags so a refresh doesn't re-trigger the flash.
  const [showAddedFlash, setShowAddedFlash] = useState(
    () => searchParams?.get("added") === "1",
  );
  const [addedFlashDetail] = useState(() => {
    if (searchParams?.get("added") !== "1") return null;
    const doctor = searchParams.get("bDoctor");
    const when = searchParams.get("bWhen");
    const price = searchParams.get("bPrice");
    if (!doctor && !when) return null;
    return { doctor, when, price };
  });
  useEffect(() => {
    if (!showAddedFlash) return;
    const timer = setTimeout(() => setShowAddedFlash(false), 4_000);
    // Drop the query so a refresh doesn't re-flash. Replace, not push,
    // so the back button still goes where the patient expects.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("added");
      url.searchParams.delete("bDoctor");
      url.searchParams.delete("bWhen");
      url.searchParams.delete("bPrice");
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
  const steps = [t.stepCart, t.stepCheckout, t.stepPayment];

  // Show "slot expired" banner when server tells us it swept
  // reservations. The setState is conditional on a derived server
  // value, so a re-render won't loop (next render sees the new
  // `expiredFlash` but the cart.expiredHolds dep stays the same
  // until another sweep). The strict lint rule can't infer that —
  // disable rather than restructure.
  const expiredFlashRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (cart.expiredHolds && cart.expiredHolds > 0) {
      setExpiredFlash(cart.expiredHolds); // eslint-disable-line react-hooks/set-state-in-effect
      setExpiredItemsFlash(cart.expiredItems ?? []); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [cart.expiredHolds, cart.expiredItems]);
  // Scroll the expired-hold notice into view when it appears — it renders
  // above the fold today, but this keeps it noticed even if the page grows.
  useEffect(() => {
    if (expiredFlash > 0) {
      expiredFlashRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expiredFlash]);

  // Auto-refresh while there are active consultation holds so the
  // countdown stays accurate and expired items get swept.
  useEffect(() => {
    const hasHolds = cart.items.some((i) => i.heldUntil);
    if (!hasHolds) return;
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [cart.items, refresh]);

  // Load per-line coverage whenever the set of items changes (add/remove).
  // Synchronizing client state with a server fetch — same intentional pattern
  // as the cart refresh effects above; the strict rule can't infer it.
  const itemIdsKey = cart.items.map((i) => i.id).join(",");
  useEffect(() => {
    void loadCoverage(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadCoverage, itemIdsKey]);

  // Change a consultation line's benefit choice → persist + re-sync coverage.
  const onSelectBenefit = useCallback(
    async (itemId: string, selection: BenefitSelection) => {
      setBenefitError(null);
      const res = await patchItem(itemId, { benefitSelection: selection });
      if (!res.ok) {
        setBenefitError(res.message ?? null);
        return;
      }
      setCoverageNonce((n) => n + 1);
      await loadCoverage();
    },
    [patchItem, loadCoverage],
  );

  if (loading) {
    return (
      <>
        <GH2FlowHeader title={t.title} activeStep={1} steps={steps} />
        <section className="bg-[var(--color-background-soft)] px-5 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="gh-card flex items-center gap-3 p-6" role="status" aria-live="polite">
              <Clock
                className="size-5 shrink-0 animate-pulse motion-reduce:animate-none"
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
  // Savings only reduce the item subtotal (never shipping); clamp defensively.
  const payableSaved = Math.min(Math.max(0, coverageSaved), cart.subtotalCents);

  return (
    <>
      <GH2FlowHeader title={t.title} activeStep={1} steps={steps} />
      <section className="bg-[var(--color-background-soft)] px-5 pb-28 pt-12 sm:py-16 md:pb-16">
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
              className="gh-status-success mt-5 flex flex-col gap-1 rounded-[var(--radius-card-sm)] px-3 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                {t.addedToCart}
              </span>
              {addedFlashDetail ? (
                <span className="pl-6 font-normal">
                  {[addedFlashDetail.doctor, addedFlashDetail.when, addedFlashDetail.price]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ) : null}
            </div>
          ) : null}

          {expiredFlash > 0 ? (
            <div
              ref={expiredFlashRef}
              role="alert"
              className="gh-status-warning mt-5 flex flex-col gap-2 rounded-[var(--radius-card-sm)] px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="flex-1">
                  {(expiredFlash === 1 ? t.expiredSingular : t.expiredPlural).replace(
                    "{count}",
                    String(expiredFlash),
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setExpiredFlash(0);
                    setExpiredItemsFlash([]);
                  }}
                  className="rounded p-0.5 transition-colors hover:bg-black/5"
                  style={{ color: "var(--color-status-warning-text)" }}
                  aria-label={t.dismiss}
                >
                  ×
                </button>
              </div>
              {expiredItemsFlash.length > 0 ? (
                <ul className="flex flex-col gap-1.5 pl-6">
                  {expiredItemsFlash.map((item, i) => (
                    <li key={`${item.name}-${i}`} className="flex flex-wrap items-center gap-2">
                      <span>
                        {item.doctorName ? `${item.name} · ${item.doctorName}` : item.name}
                      </span>
                      <Link
                        href={countryHome}
                        className="rounded-full border border-current px-3 py-1 text-xs font-semibold transition-colors hover:bg-black/5"
                        style={{ color: "var(--color-status-warning-text)" }}
                      >
                        Pick another time
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Link
                  href={countryHome}
                  className="ml-6 self-start rounded-full border border-current px-3 py-1 text-xs font-semibold transition-colors hover:bg-black/5"
                  style={{ color: "var(--color-status-warning-text)" }}
                >
                  Pick another time
                </Link>
              )}
            </div>
          ) : null}

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
            {/* Items */}
            <div className="gh2-card-ivory overflow-hidden">
              <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {cart.items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    currency={cart.currencyCode}
                    t={t}
                    coverageLine={coverageLines[item.id]}
                    benefitError={benefitError}
                    onSelectBenefit={(sel) => onSelectBenefit(item.id, sel)}
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

            {/* Summary — dark forest glass, matches MobileOrderTotalBar's
                established premium treatment (spec §17). */}
            <aside
              id="cart-order-summary"
              className="gh2-glass-forest self-start p-6 lg:sticky lg:top-[calc(var(--header-height)+16px)]"
            >
              <PlanCoverage
                t={coverageT}
                loginHref={`/login?next=${encodeURIComponent(`${countryHome}/cart`)}`}
                plansHref={`${countryHome}/pricing?returnTo=${encodeURIComponent(`${countryHome}/cart`)}`}
                itemNames={Object.fromEntries(cart.items.map((i) => [i.id, i.name]))}
                refreshKey={coverageNonce}
              />
              <h2 className="text-[1.125rem] font-bold tracking-[-0.01em]" style={{ color: "rgba(255,255,255,0.95)" }}>
                {t.orderSummary}
              </h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt style={{ color: "var(--gh2-on-dark-muted)" }}>
                    {t.subtotalItems
                      .replace("{count}", String(cart.itemCount))
                      .replace("{unit}", cart.itemCount === 1 ? t.itemSingular : t.itemPlural)}
                  </dt>
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
                {/* Benefit-adjusted total (B5): subtract the plan savings the
                    subscriber selected so the displayed total equals the amount
                    Stripe will charge. */}
                {payableSaved > 0 ? (
                  <div className="flex justify-between">
                    <dt style={{ color: "var(--color-brand-accent)" }}>{t.planSavings}</dt>
                    <dd className="font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "var(--color-brand-accent)" }}>
                      −{formatPrice(payableSaved, cart.currencyCode)}
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
                    {formatPrice(Math.max(0, total - payableSaved), cart.currencyCode)}
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

              {/* Trust rows — light-on-dark, matches glass panel context. */}
              <ul
                className="mt-5 space-y-2.5 border-t pt-5 text-[13px]"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "var(--gh2-on-dark-muted)" }}
              >
                {[
                  { icon: ShieldCheck, label: t.trustSecure },
                  { icon: Lock, label: t.trustNoStore },
                  { icon: CalendarCheck, label: t.trustInstant },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>
      <MobileOrderTotalBar
        totalLabel={t.total}
        formattedTotal={formatPrice(Math.max(0, total - payableSaved), cart.currencyCode)}
        actionLabel={t.continueToCheckout}
        onAction={() => router.push(checkoutHref)}
        watchTargetId="cart-order-summary"
      />
    </>
  );
}

const BENEFIT_LABEL: Record<BenefitSelection, keyof CartT> = {
  PAY_NORMAL: "payNormally",
  USE_PLAN_CREDIT: "usePlanCredit",
  USE_PLAN_DISCOUNT: "usePlanDiscount",
};

function CartItemRow({
  item,
  currency,
  coverageLine,
  benefitError,
  onSelectBenefit,
  onIncrease,
  onDecrease,
  onRemove,
  t,
}: {
  item: CartItem;
  currency: string;
  coverageLine?: CartCoverageLine;
  benefitError?: string | null;
  onSelectBenefit: (selection: BenefitSelection) => void | Promise<void>;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  t: CartT;
}) {
  const isConsult =
    item.kind === "GENERAL_CONSULTATION" ||
    item.kind === "SPECIALIST_CONSULTATION";
  const countdown = useCountdown(item.heldUntil);
  // Visual-only urgency read off the existing countdown string (m:ss) — no
  // timer logic changes. "expired" and anything ≥ 60s stays the calm amber.
  const countdownUrgent =
    countdown !== null && countdown !== "expired" && countdown.split(":")[0] === "0";
  const atMax = item.quantity >= CART_ITEM_MAX_QTY;
  const KindIcon = KIND_ICON[item.kind];
  const itemKindLabel = kindLabel(item.kind, t);
  // Offer the benefit selector only when the plan actually gives this line a
  // real choice (more than just "pay normally"). Driven by the server preview.
  const options = coverageLine?.eligibleSelections ?? [];
  const showSelector = isConsult && options.length > 1;
  // Pending guard: while a benefit PATCH is in flight the options are
  // disabled + dimmed so rapid taps can't queue conflicting changes.
  const [benefitPending, setBenefitPending] = useState(false);

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

        {/* Beneficiary — when this line is booked for an approved dependent. */}
        {isConsult && item.familyMemberName ? (
          <p className="mt-2 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
            {t.benefitFor.replace("{name}", item.familyMemberName)}
          </p>
        ) : null}

        {/* Per-line benefit selector — only when the plan offers a real choice. */}
        {showSelector ? (
          <div className="mt-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--color-text-muted)" }}>
              {t.benefitLabel}
            </p>
            <div
              role="radiogroup"
              aria-label={t.benefitLabel}
              className="mt-1.5 inline-flex flex-wrap gap-1.5"
            >
              {options.map((opt) => {
                const active = item.benefitSelection === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-selected={active}
                    disabled={benefitPending}
                    onClick={() => {
                      if (benefitPending) return;
                      const result = onSelectBenefit(opt);
                      if (result && typeof result.then === "function") {
                        setBenefitPending(true);
                        void result.finally(() => setBenefitPending(false));
                      }
                    }}
                    className="gh2-selectable rounded-full px-3 text-[12px] font-semibold disabled:cursor-wait"
                  >
                    {t[BENEFIT_LABEL[opt]]}
                  </button>
                );
              })}
            </div>
            {coverageLine?.reason === "NOT_ENOUGH_CREDITS" ? (
              <p className="mt-1.5 text-[11.5px] font-semibold" style={{ color: "var(--color-status-warning-text)" }}>
                {t.notEnoughCreditsHint}
              </p>
            ) : null}
            {benefitError ? (
              <p role="alert" className="mt-1.5 text-[11.5px] font-semibold" style={{ color: "var(--color-status-error)" }}>
                {benefitError}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Automatic corporate-membership discount (no selection needed). */}
        {isConsult && coverageLine?.corporateDiscount ? (
          <p
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold"
            style={{ background: "var(--color-brand-mint-dim)", color: "var(--color-brand-primary)" }}
          >
            {coverageLine.corporateDiscount.planName} ({coverageLine.corporateDiscount.companyName})
            −{coverageLine.corporateDiscount.percent}% ·{" "}
            {formatPrice(coverageLine.corporateDiscount.amountCents, currency)} {t.corporateOff}
          </p>
        ) : null}

        {/* Consultation hold countdown. Expired uses amber too — it's
            an expected system state (10-minute hold lapsed), not a user
            failure, so the styling shouldn't read as an error. */}
        {isConsult && countdown ? (
          <p
            className="mt-2 inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] font-semibold [font-variant-numeric:tabular-nums]"
            style={{ color: countdownUrgent ? "var(--color-status-error)" : "var(--color-status-warning-text)" }}
          >
            <Clock className="size-3 shrink-0" aria-hidden />
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

        {/* Bottom row: quantity/booking control + remove, one consistent
            right-aligned cluster regardless of item kind (spec §17/§6). */}
        <div className="mt-3 flex items-center justify-end gap-3">
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
                aria-disabled={item.quantity <= 1}
                aria-label={t.decreaseQuantity}
                className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-background-soft)] disabled:opacity-30"
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
                className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-background-soft)] disabled:opacity-30"
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
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors hover:bg-[var(--color-status-error-bg)]"
            style={{ color: "var(--color-status-error)" }}
          >
            <Trash2 className="size-3.5 shrink-0" aria-hidden />
            {t.remove}
          </button>
        </div>
      </div>
    </li>
  );
}
