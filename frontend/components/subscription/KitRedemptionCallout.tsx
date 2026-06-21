"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Sparkles } from "lucide-react";
import { getCredits, getRedemptions, type RedemptionKit } from "@/lib/api/me-subscription";
import { interpolate, progressPercent } from "@/lib/subscription/format";

export interface KitRedemptionCalloutCopy {
  title: string;
  body: string;
  cta: string;
  progress: string;
}

/**
 * Wellness-redemption callout on a health-test detail page (§11 / Phase 4).
 * Client-only: fetches the patient's redeemable kits and renders ONLY when this
 * kit is on their plan. Anonymous visitors / non-subscribers see nothing (no
 * flash) — the public page is unchanged for them.
 */
export function KitRedemptionCallout({
  healthTestId,
  copy,
  rewardsHref = "/account/rewards",
}: {
  healthTestId: string;
  copy: KitRedemptionCalloutCopy;
  rewardsHref?: string;
}) {
  const [kit, setKit] = useState<RedemptionKit | null>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const [r, c] = await Promise.all([getRedemptions(), getCredits()]);
      if (!active) return;
      if (r.ok) {
        const match = r.data.kits.find((k) => k.healthTestId === healthTestId) ?? null;
        setKit(match);
      }
      if (c.ok) setBalance(c.data.wellness.balance);
    })();
    return () => {
      active = false;
    };
  }, [healthTestId]);

  if (!kit) return null;

  const pct = progressPercent(Math.min(balance, kit.requiredWellnessCredits), kit.requiredWellnessCredits);

  return (
    <section className="mx-auto max-w-[var(--container-width)] px-5 md:px-10" style={{ padding: "clamp(24px,3vw,40px) 20px" }}>
      <div
        className="flex flex-col gap-4 rounded-[var(--radius-card)] p-6 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: "var(--color-background-soft)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-start gap-3">
          <span
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px]"
            style={{ background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-brand-mint) 100%)", color: "#143B30" }}
          >
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-bold tracking-[-0.01em]" style={{ color: "var(--color-text-primary)" }}>{copy.title}</p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              {interpolate(copy.body, { required: kit.requiredWellnessCredits, balance })}
            </p>
            <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full" style={{ background: "var(--color-background-page)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: kit.eligible ? "var(--color-brand-primary)" : "var(--color-brand-mint)" }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={interpolate(copy.progress, { progress: Math.min(balance, kit.requiredWellnessCredits), required: kit.requiredWellnessCredits })}
              />
            </div>
          </div>
        </div>
        <Link
          href={rewardsHref}
          className="gh-btn gh-btn-primary inline-flex shrink-0 justify-center"
        >
          <Gift className="size-4" aria-hidden />
          {copy.cta}
        </Link>
      </div>
    </section>
  );
}
