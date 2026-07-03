"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Gift, Loader2, Lock, Sparkles } from "lucide-react";
import { redeemKit, type RedemptionKit } from "@/lib/api/me-subscription";
import { interpolate, progressPercent, remainingCredits } from "@/lib/subscription/format";
import { AdminCard, Btn } from "@/components/portal-atoms";

type RedeemCopy = ReturnType<
  typeof import("@/lib/i18n/load-locale")["loadLocaleBundle"]
>["subscription"]["redeem"];

export type RewardKit = RedemptionKit & { unlockMonths: number | null };

export interface RewardsPanelProps {
  t: RedeemCopy;
  kits: RewardKit[];
  wellnessBalance: number;
  prefillName: string;
  prefillCountry: string;
  returnState: string | null;
}

function reasonText(kit: RewardKit, balance: number, t: RedeemCopy): string {
  switch (kit.reason) {
    case "INSUFFICIENT_CREDITS":
      return interpolate(t.notEligibleCredits, {
        remaining: remainingCredits(balance, kit.requiredWellnessCredits),
      });
    case "OUT_OF_STOCK":
      return t.outOfStock;
    case "NOT_ELIGIBLE":
      return kit.unlockMonths && kit.unlockMonths > 0
        ? interpolate(t.notEligibleLocked, { months: kit.unlockMonths })
        : t.notEligibleNoSub;
    default:
      return t.notEligibleNoSub;
  }
}

export function RewardsPanel(props: RewardsPanelProps) {
  const { t } = props;
  const router = useRouter();
  const [openKit, setOpenKit] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function onRedeem(e: React.FormEvent<HTMLFormElement>, healthTestId: string) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    const res = await redeemKit({
      healthTestId,
      shipName: String(form.get("shipName") ?? ""),
      shipLine1: String(form.get("shipLine1") ?? ""),
      shipLine2: String(form.get("shipLine2") ?? "") || undefined,
      shipCity: String(form.get("shipCity") ?? ""),
      shipPostalCode: String(form.get("shipPostalCode") ?? ""),
      shipCountryCode: String(form.get("shipCountryCode") ?? ""),
      returnTo: "/account/rewards",
    });
    if (res.ok) {
      if (res.data.checkoutUrl) {
        window.location.assign(res.data.checkoutUrl);
        return;
      }
      // Instant confirm (postage-free).
      setSubmitting(false);
      setOpenKit(null);
      setConfirmed(true);
      router.refresh();
      return;
    }
    setSubmitting(false);
    setError(res.message || t.redeemError);
  }

  return (
    <div className="gh-patient-rewards-panel grid gap-5">
      {props.returnState === "ok" || confirmed ? (
        <div
          className="flex items-start gap-3 rounded-[12px] p-4 text-sm"
          style={{ background: "#ECFDF5", color: "#166534", border: "1px solid #BBF7D0" }}
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{t.state.approved}</p>
        </div>
      ) : null}
      {props.returnState === "cancelled" ? (
        <div
          className="rounded-[12px] p-4 text-sm"
          style={{ background: "var(--portal-well)", color: "var(--portal-text-2)", border: "1px solid var(--portal-line)" }}
          role="status"
        >
          {t.state.cancelled}
        </div>
      ) : null}

      {props.kits.map((kit) => {
        const pct = progressPercent(Math.min(props.wellnessBalance, kit.requiredWellnessCredits), kit.requiredWellnessCredits);
        const isOpen = openKit === kit.healthTestId;
        return (
          <AdminCard key={kit.healthTestId} className="gh-patient-reward-card">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="inline-flex size-10 items-center justify-center rounded-[12px]"
                  style={{ background: "linear-gradient(135deg, var(--portal-accent) 0%, var(--portal-mint) 100%)", color: "#143B30" }}
                >
                  <Sparkles className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-bold tracking-[-0.01em]" style={{ color: "var(--portal-text)" }}>{kit.name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--portal-muted)" }}>
                    {interpolate(t.progressLabel, {
                      progress: Math.min(props.wellnessBalance, kit.requiredWellnessCredits),
                      required: kit.requiredWellnessCredits,
                    })}
                  </p>
                </div>
              </div>
              {kit.eligible ? (
                <span className="text-xs font-bold" style={{ color: "var(--portal-primary)" }}>{t.eligible}</span>
              ) : null}
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--portal-well)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: kit.eligible ? "var(--portal-primary)" : "var(--portal-mint)",
                }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            {kit.eligible ? (
              <div className="mt-4">
                {!isOpen ? (
                  <Btn variant="primary" className="w-full justify-center sm:w-auto" iconLeft={<Gift className="size-4" aria-hidden />} onClick={() => { setOpenKit(kit.healthTestId); setError(null); }}>
                    {interpolate(t.redeemCta, { count: kit.requiredWellnessCredits })}
                  </Btn>
                ) : (
                  <form onSubmit={(e) => onRedeem(e, kit.healthTestId)} className="gh-patient-form-card grid gap-3">
                    <p className="text-xs leading-relaxed" style={{ color: "var(--portal-muted)" }}>{t.shippingNote}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input name="shipName" required minLength={2} maxLength={120} defaultValue={props.prefillName} placeholder="Full name" className="gh-input sm:col-span-2" />
                      <input name="shipLine1" required minLength={2} maxLength={200} placeholder="Address line 1" className="gh-input sm:col-span-2" />
                      <input name="shipLine2" maxLength={200} placeholder="Address line 2 (optional)" className="gh-input sm:col-span-2" />
                      <input name="shipCity" required minLength={1} maxLength={120} placeholder="City" className="gh-input" />
                      <input name="shipPostalCode" required minLength={1} maxLength={40} placeholder="Postal code" className="gh-input" />
                      <input name="shipCountryCode" required minLength={2} maxLength={4} defaultValue={props.prefillCountry} placeholder="Country" className="gh-input" style={{ textTransform: "uppercase" }} />
                    </div>
                    {error ? (
                      <p className="rounded-md px-3 py-2 text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }} role="alert">{error}</p>
                    ) : null}
                    <div className="gh-patient-form-actions grid gap-2 sm:flex sm:items-center">
                      <button type="submit" disabled={submitting} className="gh-btn gh-btn-primary inline-flex justify-center disabled:opacity-60">
                        {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Gift className="size-4" aria-hidden />}
                        {submitting ? t.redeeming : interpolate(t.redeemCta, { count: kit.requiredWellnessCredits })}
                      </button>
                      <button type="button" onClick={() => setOpenKit(null)} aria-label="Cancel redemption" className="inline-flex justify-center rounded-md border border-[var(--portal-line)] px-4 py-2 text-sm font-semibold text-[var(--portal-muted)] hover:bg-[var(--portal-well)]">
                        ×
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-sm" style={{ color: "var(--portal-muted)" }}>
                <Lock className="size-4 shrink-0" aria-hidden />
                {reasonText(kit, props.wellnessBalance, t)}
              </p>
            )}
          </AdminCard>
        );
      })}
    </div>
  );
}
