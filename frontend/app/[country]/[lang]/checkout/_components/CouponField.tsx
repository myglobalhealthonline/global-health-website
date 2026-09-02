"use client";

import { useState } from "react";
import { Tag, X } from "lucide-react";
import { checkCoupon } from "@/lib/api/cart-client";
import type { CommonLocale } from "@/lib/i18n/types";

export type AppliedCoupon = { code: string; discountPercent: number; discountCents: number };

type CheckoutT = CommonLocale["checkoutPage"];

/**
 * Discount-code entry, mounted inside the (dark) order summary because it
 * changes the total rather than the payer's details.
 *
 * Two things about the copy are deliberate:
 *
 *  - Every IDENTITY failure renders the single `couponInvalid` string. The
 *    server does not tell us whether a code is unknown, expired, spent or
 *    reserved for somebody else — distinguishing them would make the endpoint
 *    an enumeration oracle — so the UI must not invent a distinction either.
 *  - The cart-shaped refusals DO get their own sentence, because they are
 *    actionable: the buyer can drop the insurance card or pick "pay normally".
 *
 * The email is read from the live checkout form at click time rather than
 * lifted into React state, so the page keeps its uncontrolled-form convention.
 */
export function CouponField({
  t,
  applied,
  onApply,
  onRemove,
  readEmail,
  disabled,
}: {
  t: CheckoutT;
  applied: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
  /** Reads the current value of the checkout form's email input. */
  readEmail: () => string;
  disabled?: boolean;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function messageFor(reason: string | null): string {
    switch (reason) {
      case "BENEFIT_LINE":
        return t.couponNotWithBenefit;
      case "COVERAGE_LINE":
        return t.couponNotWithInsurance;
      case "COMMISSION_MARKET":
        return t.couponNotAvailableHere;
      case "BELOW_MINIMUM":
        return t.couponBelowMinimum;
      default:
        return t.couponInvalid;
    }
  }

  async function apply() {
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    // A personal code cannot be decided without knowing who is booking, so the
    // email is a precondition rather than an optional extra.
    const email = readEmail().trim();
    if (!email) {
      setError(t.couponNeedsEmail);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await checkCoupon({ code: trimmed, email });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    if (!res.data.valid) {
      setError(messageFor(res.data.reason));
      return;
    }
    setCode("");
    onApply({
      code: res.data.code,
      discountPercent: res.data.discountPercent,
      discountCents: res.data.discountCents,
    });
  }

  if (applied) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
        style={{ borderColor: "var(--color-brand-accent)", background: "rgba(176,241,34,0.08)" }}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-brand-accent)" }}>
          <Tag className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{t.couponApplied.replace("{code}", applied.code)}</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline"
          style={{ color: "var(--gh2-on-dark-muted)" }}
        >
          <X className="size-3.5" aria-hidden />
          {t.couponRemove}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <label
        htmlFor="couponCode"
        className="mb-1.5 block text-[13px] font-semibold"
        style={{ color: "var(--gh2-on-dark-muted)" }}
      >
        {t.couponLabel}
      </label>
      <div className="flex gap-2">
        <input
          id="couponCode"
          name="couponCode"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          disabled={disabled || busy}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            // Enter inside the summary must not submit the checkout form.
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder={t.couponPlaceholder}
          className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold tracking-[0.08em] uppercase outline-none"
          style={{
            borderColor: "rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
          }}
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={disabled || busy || code.trim().length === 0}
          className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"
          style={{ background: "var(--color-brand-accent)", color: "#0a1f14" }}
        >
          {busy ? t.couponApplying : t.couponApply}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[13px]" style={{ color: "#ffb4a8" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
