"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, LogIn, Sparkles } from "lucide-react";
import { getCartPreview, type CartCoverageView } from "@/lib/api/me-subscription";
import { formatPrice } from "@/lib/format-currency";
import { interpolate } from "@/lib/subscription/format";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";

type CoverageState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "hidden" }
  | { kind: "data"; view: CartCoverageView };

/**
 * Cart/checkout subscription-coverage panel (§6). Calls the read-only
 * /api/me/cart-preview and shows whether each consultation is included (credit,
 * €0), discounted, or not covered, plus the total saved — BEFORE paying. Guests
 * get a "log in to use plan benefits" prompt; logged-in non-subscribers get a
 * "subscribe & save" upsell. Nothing is reserved here.
 */
export function PlanCoverage({
  lang,
  loginHref,
  plansHref,
  itemNames,
  refreshKey,
}: {
  lang: string;
  loginHref: string;
  plansHref: string;
  itemNames: Record<string, string>;
  /** Bump to force a re-fetch (e.g. after the cart page changes a line's
   *  benefit selection) so the savings + per-line state stay in sync. */
  refreshKey?: number;
}) {
  const t = loadLocaleBundle((lang || "en") as LocaleCode).subscription.coverage;
  const [state, setState] = useState<CoverageState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    void getCartPreview().then((res) => {
      if (!active) return;
      if (!res.ok) {
        setState({ kind: res.status === 401 ? "guest" : "hidden" });
        return;
      }
      setState({ kind: "data", view: res.data });
    });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (state.kind === "loading" || state.kind === "hidden") return null;

  const shell = "mb-5 border-b pb-5";
  const headerRow = "flex items-center gap-2.5";
  const iconStyle = { color: "var(--color-brand-primary)" } as const;

  if (state.kind === "guest") {
    return (
      <div className={shell} style={{ borderColor: "var(--color-border)" }}>
        <p className={headerRow} style={{ color: "var(--color-text-primary)" }}>
          <Sparkles className="size-4 shrink-0" style={iconStyle} aria-hidden />
          <span className="text-sm font-semibold">{t.guestPrompt}</span>
        </p>
        <Link
          href={loginHref}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline"
          style={{ color: "var(--color-brand-primary)" }}
        >
          <LogIn className="size-4" aria-hidden />
          {t.login}
        </Link>
      </div>
    );
  }

  const v = state.view;
  const currency = v.currencyCode ?? "EUR";
  const corporateLine = v.lines.find((l) => l.corporateDiscount);

  // Logged-in but no active subscription → upsell. Corporate members are
  // exempt — their automatic membership discount renders below instead.
  if (!v.subscriptionId && !corporateLine) {
    return (
      <div className={shell} style={{ borderColor: "var(--color-border)" }}>
        <p className={headerRow}>
          <Award className="size-4 shrink-0" style={iconStyle} aria-hidden />
          <span className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t.upsellTitle}</span>
        </p>
        <p className="mt-1.5 text-[13px]" style={{ color: "var(--color-text-muted)" }}>{t.upsell}</p>
        <Link
          href={plansHref}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline"
          style={{ color: "var(--color-brand-primary)" }}
        >
          {t.viewPlans}
        </Link>
      </div>
    );
  }

  const badge = (line: CartCoverageView["lines"][number]): { label: string; tone: string } => {
    if (line.corporateDiscount) {
      return {
        label: `${line.corporateDiscount.planName} −${line.corporateDiscount.percent}%`,
        tone: "var(--color-brand-primary)",
      };
    }
    if (line.mode === "CREDIT") return { label: t.included, tone: "var(--color-brand-primary)" };
    if (line.mode === "FIXED" || line.mode === "PERCENT")
      return { label: t.discounted, tone: "var(--color-brand-primary)" };
    // NORMAL / NOT_COVERED — explain WHY so the buyer can act (warning tone).
    const warn = "var(--color-status-warning-text)";
    switch (line.reason) {
      case "LOCKED":
        return { label: t.locked, tone: warn };
      case "NOT_ENOUGH_CREDITS":
        return { label: t.notEnoughCredits, tone: warn };
      case "FAMILY_UNAVAILABLE":
      case "NOT_OWNED":
      case "FAMILY_NOT_ENABLED":
      case "SERVICE_NOT_FAMILY_USABLE":
      case "MEMBER_NOT_ALLOWED":
        return { label: t.familyUnavailable, tone: warn };
      default:
        return { label: t.notCovered, tone: "var(--color-text-muted)" };
    }
  };

  return (
    <div className={shell} style={{ borderColor: "var(--color-border)" }}>
      <p className={headerRow}>
        <Award className="size-4 shrink-0" style={iconStyle} aria-hidden />
        <span className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
          {v.planName ?? corporateLine?.corporateDiscount?.planName ?? t.title}
        </span>
      </p>

      {v.totalSavedCents > 0 ? (
        <p className="mt-1.5 text-[15px] font-extrabold tracking-[-0.01em]" style={{ color: "var(--color-brand-primary)" }}>
          {interpolate(t.youSave, { amount: formatPrice(v.totalSavedCents, currency) })}
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {v.lines.map((line) => {
          const b = badge(line);
          return (
            <li key={line.itemId} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate" style={{ color: "var(--color-text-body)" }}>
                {itemNames[line.itemId] ?? "—"}
                {line.familyMemberName ? (
                  <span className="ml-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    · {line.familyMemberName}
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--color-background-soft)", color: b.tone }}>
                  {b.label}
                </span>
                <span className="font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "var(--color-text-primary)" }}>
                  {line.finalUnitPriceCents === 0 ? formatPrice(0, currency) : formatPrice(line.finalUnitPriceCents, currency)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {v.consultationCreditsRemaining >= 0 && v.lines.some((l) => l.mode === "CREDIT") ? (
        <p className="mt-3 border-t pt-3 text-[12px]" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
          {interpolate(t.creditsLeft, { count: v.consultationCreditsRemaining })}
        </p>
      ) : null}
    </div>
  );
}
