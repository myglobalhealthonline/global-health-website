"use client";

import { useEffect, useState } from "react";
import type { PublicPlan } from "@/data/pricing-plans";
import { hasAuthHintCookie, usePublicAuth } from "@/components/layout/PublicAuthContext";
import { getSubscription, type SubscriptionView } from "@/lib/api/me-subscription";
import {
  activeSubscriptionFor,
  safeReturnTo,
  subscribeHref,
} from "@/lib/subscription/pricing-personalization";
import { PricingPlanCard, type PricingPlanCardProps } from "./PricingPlanCard";

type Copy = PricingPlanCardProps["t"];
type NoteCopy = PricingPlanCardProps["note"];

/**
 * Per-visitor layer of /pricing, moved off the server (P-001).
 *
 * The page used to call `getServerAuthUser()` + `getServerSubscription()`
 * (both `cookies()`) and read `searchParams` just to mark "your current plan"
 * and thread `?returnTo` into the subscribe CTA — three dynamic reads that
 * made the whole route render per-request. The plan catalogue itself is the
 * same for every visitor, so it stays prerendered and only this thin
 * personalization runs client-side, exactly like `PublicAuthProvider` does
 * for the header avatar.
 *
 * First render is deliberately the anonymous shape (matching the prerendered
 * HTML); it upgrades after mount. Anonymous visitors — the vast majority —
 * skip the `/api/me/subscription` round-trip entirely via the `gh-auth-hint`
 * cookie, same as PublicAuthProvider.
 */

export function PricingPlansGrid({
  plans,
  t,
  note,
  countryCode,
  lang,
}: {
  plans: PublicPlan[];
  t: Copy;
  note: NoteCopy;
  countryCode: string;
  lang: string;
}) {
  const { user } = usePublicAuth();
  const [sub, setSub] = useState<SubscriptionView | null>(null);
  const [returnTo, setReturnTo] = useState<string | undefined>(undefined);

  // `window.location.search` rather than useSearchParams(): reading the hook
  // in a prerendered route would demand a Suspense boundary and de-opt the
  // shell, and this value only affects a link href after mount anyway.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate post-mount upgrade: the first client render must match the prerendered HTML
    setReturnTo(safeReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
  }, []);

  useEffect(() => {
    if (!hasAuthHintCookie()) return;
    let cancelled = false;
    getSubscription().then((res) => {
      if (!cancelled && res.ok) setSub(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isAuthenticated = Boolean(user);
  const activeSub = activeSubscriptionFor(sub, countryCode);
  const activePlanId = activeSub?.plan?.id ?? null;
  const hasActiveSub = Boolean(activeSub);

  return (
    <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <PricingPlanCard
          key={plan.id}
          plan={plan}
          t={t}
          note={note}
          ctaHref={subscribeHref(plan.id, countryCode, lang, isAuthenticated, returnTo)}
          isCurrentPlan={plan.id === activePlanId}
          hasActiveSub={hasActiveSub}
          // "Switch to this plan" lands on the manage panel with the
          // target preselected; the current plan's card just manages.
          manageHref={
            plan.id === activePlanId
              ? "/account/plans"
              : `/account/plans?plan=${encodeURIComponent(plan.id)}`
          }
        />
      ))}
    </div>
  );
}
