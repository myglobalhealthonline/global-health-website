"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, LogIn, Sparkles } from "lucide-react";
import { getCartPreview, type CartCoverageView } from "@/lib/api/me-subscription";
import { formatPrice } from "@/lib/format-currency";
import { interpolate } from "@/lib/subscription/format";

/** The `subscription.coverage` locale slice, resolved server-side and passed
 *  in as a prop so this client component no longer imports the all-locale
 *  bundle (P-001). Type-only `import()` — erased at build, ships nothing. */
export type PlanCoverageStrings = (typeof import("@/locales/en/subscription.json"))["coverage"];

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
  t,
  loginHref,
  plansHref,
  itemNames,
  refreshKey,
}: {
  t: PlanCoverageStrings;
  loginHref: string;
  plansHref: string;
  itemNames: Record<string, string>;
  /** Bump to force a re-fetch (e.g. after the cart page changes a line's
   *  benefit selection) so the savings + per-line state stay in sync. */
  refreshKey?: number;
}) {
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

  // Every call site mounts this inside a .gh2-glass-forest dark card (cart +
  // checkout order summary) — colors are on-dark tokens, not the light-theme
  // text vars (which read as near-invisible dark green on the near-black
  // glass background).
  const shell = "mb-5 border-b pb-5";
  const headerRow = "flex items-center gap-2.5";
  const iconStyle = { color: "var(--color-brand-accent)" } as const;
  const onDarkPrimary = "rgba(255, 255, 255, 0.95)";
  const onDarkBody = "rgba(255, 255, 255, 0.85)";
  const onDarkMuted = "var(--gh2-on-dark-muted)";
  const onDarkBorder = "rgba(255, 255, 255, 0.14)";
  const onDarkWarn = "#FCD34D";
  const pillBg = "rgba(255, 255, 255, 0.10)";

  if (state.kind === "guest") {
    return (
      <div className={shell} style={{ borderColor: onDarkBorder }}>
        <p className={headerRow} style={{ color: onDarkPrimary }}>
          <Sparkles className="size-4 shrink-0" style={iconStyle} aria-hidden />
          <span className="text-sm font-semibold">{t.guestPrompt}</span>
        </p>
        <Link
          href={loginHref}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline"
          style={{ color: "var(--color-brand-accent)" }}
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
      <div className={shell} style={{ borderColor: onDarkBorder }}>
        <p className={headerRow}>
          <Award className="size-4 shrink-0" style={iconStyle} aria-hidden />
          <span className="text-sm font-bold" style={{ color: onDarkPrimary }}>{t.upsellTitle}</span>
        </p>
        <p className="mt-1.5 text-[13px]" style={{ color: onDarkMuted }}>{t.upsell}</p>
        <Link
          href={plansHref}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline"
          style={{ color: "var(--color-brand-accent)" }}
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
        tone: "var(--color-brand-accent)",
      };
    }
    if (line.mode === "CREDIT") return { label: t.included, tone: "var(--color-brand-accent)" };
    if (line.mode === "FIXED" || line.mode === "PERCENT")
      return { label: t.discounted, tone: "var(--color-brand-accent)" };
    // NORMAL / NOT_COVERED — explain WHY so the buyer can act (warning tone).
    switch (line.reason) {
      case "LOCKED":
        return { label: t.locked, tone: onDarkWarn };
      case "NOT_ENOUGH_CREDITS":
        return { label: t.notEnoughCredits, tone: onDarkWarn };
      case "FAMILY_UNAVAILABLE":
      case "NOT_OWNED":
      case "FAMILY_NOT_ENABLED":
      case "SERVICE_NOT_FAMILY_USABLE":
      case "MEMBER_NOT_ALLOWED":
        return { label: t.familyUnavailable, tone: onDarkWarn };
      default:
        return { label: t.notCovered, tone: onDarkMuted };
    }
  };

  return (
    <div className={shell} style={{ borderColor: onDarkBorder }}>
      <p className={headerRow}>
        <Award className="size-4 shrink-0" style={iconStyle} aria-hidden />
        <span className="text-sm font-bold" style={{ color: onDarkPrimary }}>
          {v.planName ?? corporateLine?.corporateDiscount?.planName ?? t.title}
        </span>
      </p>

      {v.totalSavedCents > 0 ? (
        <p className="mt-1.5 text-[15px] font-extrabold tracking-[-0.01em]" style={{ color: "var(--color-brand-accent)" }}>
          {interpolate(t.youSave, { amount: formatPrice(v.totalSavedCents, currency) })}
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {v.lines.map((line) => {
          const b = badge(line);
          return (
            <li key={line.itemId} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate" style={{ color: onDarkBody }} title={`${itemNames[line.itemId] ?? "—"}${line.familyMemberName ? ` · ${line.familyMemberName}` : ""}`}>
                {itemNames[line.itemId] ?? "—"}
                {line.familyMemberName ? (
                  <span className="ml-1.5 text-[11px]" style={{ color: onDarkMuted }}>
                    · {line.familyMemberName}
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: pillBg, color: b.tone }}>
                  {b.label}
                </span>
                <span className="font-semibold [font-variant-numeric:tabular-nums]" style={{ color: onDarkPrimary }}>
                  {line.finalUnitPriceCents === 0 ? formatPrice(0, currency) : formatPrice(line.finalUnitPriceCents, currency)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {v.consultationCreditsRemaining >= 0 && v.lines.some((l) => l.mode === "CREDIT") ? (
        <p className="mt-3 border-t pt-3 text-[12px]" style={{ borderColor: onDarkBorder, color: onDarkMuted }}>
          {interpolate(t.creditsLeft, { count: v.consultationCreditsRemaining })}
        </p>
      ) : null}
    </div>
  );
}
