"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import {
  cancelSubscription,
  changePlan,
  getBillingPortalUrl,
} from "@/lib/api/me-subscription";
import { formatAppDate } from "@/lib/format-datetime";
import { interpolate } from "@/lib/subscription/format";
import { AdminCard, Btn, Pill, type PillTone } from "@/components/portal-atoms";

export interface PlanOption {
  id: string;
  name: string;
  priceLabel: string;
}

// The manage copy bundle (subscription.manage) — passed verbatim from the
// server page; it's plain JSON so it serializes across the boundary.
type ManageCopy = ReturnType<
  typeof import("@/lib/i18n/load-locale")["loadLocaleBundle"]
>["subscription"]["manage"];

export interface ManagePanelProps {
  t: ManageCopy;
  status: string;
  planName: string;
  priceLabel: string;
  nextBillingLabel: string | null;
  cancelAtPeriodEnd: boolean;
  pendingChangePlanName: string | null;
  pendingChangeDate: string | null;
  planOptions: PlanOption[];
  returnState: string | null;
  pricingHref: string;
}

function statusMeta(status: string, t: ManageCopy): { tone: PillTone; label: string } {
  switch (status) {
    case "ACTIVE":
      return { tone: "active", label: t.status_active };
    case "INCOMPLETE":
      return { tone: "pending", label: t.status_incomplete };
    case "PAST_DUE":
      return { tone: "pending", label: t.status_past_due };
    case "CANCELED":
      return { tone: "inactive", label: t.status_canceled };
    case "PAUSED":
      return { tone: "neutral", label: t.status_paused };
    default:
      return { tone: "neutral", label: status };
  }
}

export function ManagePanel(props: ManagePanelProps) {
  const { t } = props;
  const router = useRouter();
  const [busy, setBusy] = useState<null | "portal" | "cancel" | "change">(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const meta = statusMeta(props.status, t);
  const canCancel =
    !props.cancelAtPeriodEnd && (props.status === "ACTIVE" || props.status === "PAST_DUE");
  const canChange =
    props.planOptions.length > 0 && (props.status === "ACTIVE" || props.status === "PAST_DUE");

  // Return / status banner (success, SCA action-required, INCOMPLETE, cancelled).
  const banner = (() => {
    if (props.status === "INCOMPLETE") return { kind: "info" as const, text: t.return.incomplete, action: "portal" as const };
    if (props.status === "PAST_DUE") return { kind: "warn" as const, text: t.return.actionRequired, action: "portal" as const };
    if (props.returnState === "ok" && props.status === "ACTIVE") return { kind: "ok" as const, text: t.return.ok };
    if (props.returnState === "cancelled") return { kind: "info" as const, text: t.return.cancelled };
    return null;
  })();

  async function openPortal() {
    setBusy("portal");
    setNotice(null);
    const res = await getBillingPortalUrl("/account/membership");
    if (res.ok && res.data.portalUrl) {
      window.location.href = res.data.portalUrl;
      return;
    }
    setBusy(null);
    setNotice({ kind: "error", text: res.ok ? "" : res.message });
  }

  async function doCancel() {
    if (!window.confirm(t.cancelConfirm)) return;
    setBusy("cancel");
    setNotice(null);
    const res = await cancelSubscription();
    setBusy(null);
    if (res.ok) {
      const date = res.data.currentPeriodEnd ? formatAppDate(res.data.currentPeriodEnd) : "";
      setNotice({ kind: "ok", text: interpolate(t.cancelScheduled, { date }) });
      router.refresh();
    } else {
      setNotice({ kind: "error", text: res.message });
    }
  }

  async function doChange() {
    if (!selectedPlan) return;
    setBusy("change");
    setNotice(null);
    const res = await changePlan(selectedPlan);
    setBusy(null);
    if (res.ok) {
      const date = res.data.pendingChangeEffectiveAt ? formatAppDate(res.data.pendingChangeEffectiveAt) : "";
      setNotice({ kind: "ok", text: interpolate(t.changeScheduled, { date }) });
      setSelectedPlan("");
      router.refresh();
    } else {
      setNotice({ kind: "error", text: res.message });
    }
  }

  return (
    <div className="grid max-w-2xl gap-5">
      {banner ? (
        <div
          className="flex items-start gap-3 rounded-[12px] p-4 text-sm"
          style={
            banner.kind === "ok"
              ? { background: "#ECFDF5", color: "#166534", border: "1px solid #BBF7D0" }
              : banner.kind === "warn"
                ? { background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }
                : { background: "var(--color-background-soft)", color: "var(--color-text-body)", border: "1px solid var(--color-border)" }
          }
          role="status"
        >
          {banner.kind === "ok" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <div>
            <p>{banner.text}</p>
            {"action" in banner && banner.action === "portal" ? (
              <button
                type="button"
                onClick={openPortal}
                className="mt-2 font-semibold underline"
                disabled={busy === "portal"}
              >
                {t.return.completePayment}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <AdminCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
              {t.currentPlan}
            </p>
            <h2 className="mt-1 font-extrabold tracking-[-0.02em]" style={{ fontSize: "1.4rem", color: "var(--color-text-primary)" }}>
              {props.planName}
            </h2>
          </div>
          <Pill tone={meta.tone} withDot>
            {meta.label}
          </Pill>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t.monthlyPrice}</dt>
            <dd className="mt-0.5 font-semibold" style={{ color: "var(--color-text-primary)" }}>{props.priceLabel}</dd>
          </div>
          {props.nextBillingLabel ? (
            <div>
              <dt className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t.nextBilling}</dt>
              <dd className="mt-0.5 font-semibold" style={{ color: "var(--color-text-primary)" }}>{props.nextBillingLabel}</dd>
            </div>
          ) : null}
        </dl>

        {props.cancelAtPeriodEnd && props.nextBillingLabel ? (
          <p className="mt-4 text-sm" style={{ color: "#92400E" }}>
            {interpolate(t.cancelAtPeriodEnd, { date: props.nextBillingLabel })}
          </p>
        ) : null}
        {props.pendingChangePlanName && props.pendingChangeDate ? (
          <p className="mt-4 text-sm" style={{ color: "var(--color-text-body)" }}>
            {interpolate(t.pendingChange, { plan: props.pendingChangePlanName, date: props.pendingChangeDate })}
          </p>
        ) : null}
      </AdminCard>

      {notice ? (
        <p
          className="rounded-md px-3 py-2 text-sm"
          style={
            notice.kind === "ok"
              ? { background: "#ECFDF5", color: "#166534" }
              : { background: "#FEE2E2", color: "#991B1B" }
          }
          role="status"
        >
          {notice.text}
        </p>
      ) : null}

      {canChange ? (
        <AdminCard>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{t.upgrade}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>{t.changeNote}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="gh-input max-w-xs"
              aria-label={t.change}
            >
              <option value="">{t.change}…</option>
              {props.planOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.priceLabel}
                </option>
              ))}
            </select>
            <Btn
              variant="secondary"
              onClick={doChange}
              disabled={!selectedPlan || busy === "change"}
              iconLeft={busy === "change" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : undefined}
            >
              {busy === "change" ? t.changing : t.change}
            </Btn>
          </div>
        </AdminCard>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Btn
          variant="soft"
          onClick={openPortal}
          disabled={busy === "portal"}
          iconLeft={busy === "portal" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
        >
          {t.manageBilling}
        </Btn>
        {canCancel ? (
          <Btn
            variant="danger"
            onClick={doCancel}
            disabled={busy === "cancel"}
            iconLeft={busy === "cancel" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : undefined}
          >
            {busy === "cancel" ? t.canceling : t.cancel}
          </Btn>
        ) : null}
        <Link href={props.pricingHref} className="text-sm font-semibold underline" style={{ color: "var(--color-brand-primary)" }}>
          {t.change}
        </Link>
      </div>
    </div>
  );
}
