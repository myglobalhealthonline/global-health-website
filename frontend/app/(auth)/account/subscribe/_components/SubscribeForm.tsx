"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Lock } from "lucide-react";
import { devActivateSubscription, startSubscription } from "@/lib/api/me-subscription";

export interface SubscribeFormProps {
  planId: string;
  planName: string;
  priceLabel: string;
  perMonth: string;
  billedMonthly: string;
  whatYouGet: string;
  features: string[];
  consentLabel: string;
  consentRequired: string;
  termsLink: string;
  termsHref: string;
  submitLabel: string;
  submittingLabel: string;
  secureNote: string;
  errorLabel: string;
  planSummaryLabel: string;
  /** Where Stripe returns after the subscription payment. Defaults to the manage
   *  screen; the cart→subscribe funnel passes the cart path so benefits show
   *  there immediately (§6c). */
  returnTo?: string;
}

/**
 * Subscribe confirm form (client). Renders the plan summary, a consent
 * checkbox that GATES the subscribe action (§40 — recurring-charge mandate),
 * then POSTs to /api/me/subscription and redirects to the returned Stripe
 * Checkout URL. returnTo points at the manage screen so the post-payment
 * return state lands there.
 */
export function SubscribeForm(props: SubscribeFormProps) {
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consented) {
      setError(props.consentRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    const returnTo = props.returnTo ?? "/account/membership";
    const res = await startSubscription(props.planId, returnTo);
    if (res.ok && res.data.checkoutUrl) {
      const url = res.data.checkoutUrl;
      // The fake billing driver (local/dev) has no payable hosted checkout — it
      // returns a fake-billing.local URL. Activate the subscription directly and
      // land on the portal instead of navigating to a dead host. Production
      // returns a real Stripe Checkout URL, which we follow as normal. Match the
      // host exactly (not substring) so a real URL carrying that text in a query
      // param can't divert the flow — and the dev-activate route 403s in prod.
      let isFakeCheckout = false;
      try {
        isFakeCheckout = new URL(url).hostname === "fake-billing.local";
      } catch {
        isFakeCheckout = false;
      }
      if (isFakeCheckout) {
        await devActivateSubscription();
        window.location.assign(`${returnTo}?subscription=ok`);
        return;
      }
      window.location.assign(url);
      return;
    }
    setSubmitting(false);
    setError(res.ok ? props.errorLabel : res.message || props.errorLabel);
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-6">
      <div className="gh-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
          {props.planSummaryLabel}
        </p>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <h2 className="font-extrabold tracking-[-0.02em]" style={{ fontSize: "1.5rem", color: "var(--color-text-primary)" }}>
            {props.planName}
          </h2>
          <p className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-extrabold" style={{ fontSize: "1.75rem", color: "var(--color-text-primary)" }}>
              {props.priceLabel}
            </span>
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {props.perMonth}
            </span>
          </p>
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
          {props.billedMonthly}
        </p>

        <div className="my-5 h-px w-full" style={{ background: "var(--color-border)" }} />

        <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
          {props.whatYouGet}
        </p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {props.features.map((line, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--color-text-primary)" }}>
              <Check className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} style={{ color: "var(--color-brand-primary)" }} aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <label className="flex items-start gap-3 text-sm" style={{ color: "var(--color-text-primary)" }}>
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => {
            setConsented(e.target.checked);
            if (e.target.checked) setError(null);
          }}
          className="mt-0.5 size-4 shrink-0 rounded border-[var(--color-border)]"
          aria-describedby="subscribe-terms-link"
        />
        <span>
          {props.consentLabel}{" "}
          <Link
            id="subscribe-terms-link"
            href={props.termsHref}
            className="font-semibold underline"
            style={{ color: "var(--color-brand-primary)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            {props.termsLink}
          </Link>
        </span>
      </label>

      {error ? (
        <p className="rounded-md px-3 py-2 text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }} role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={submitting || !consented}
          className="gh-btn gh-btn-primary inline-flex w-full justify-center disabled:opacity-60 sm:w-auto"
          aria-disabled={submitting || !consented}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Lock className="size-4" aria-hidden />
          )}
          {submitting ? props.submittingLabel : props.submitLabel}
        </button>
        <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {props.secureNote}
        </p>
      </div>
    </form>
  );
}
