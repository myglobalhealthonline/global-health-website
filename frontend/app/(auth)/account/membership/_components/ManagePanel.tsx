"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import {
  cancelScheduledChange,
  cancelSubscription,
  changePlan,
  getBillingPortalUrl,
  getSubscription,
} from "@/lib/api/me-subscription";
import { formatAppDate } from "@/lib/format-datetime";
import { interpolate } from "@/lib/subscription/format";
import { AdminCard, Btn, Pill, type PillTone } from "@/components/portal-atoms";

export interface PlanOption {
  id: string;
  name: string;
  priceLabel: string;
  /** Monthly price in cents — to label each option as an upgrade or downgrade. */
  priceCents: number;
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
  /** Current plan monthly price in cents — to classify changes up/down. */
  currentPriceCents: number;
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
  const [busy, setBusy] = useState<null | "portal" | "cancel" | "change" | "cancelChange">(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const meta = statusMeta(props.status, t);
  const canCancel =
    !props.cancelAtPeriodEnd && (props.status === "ACTIVE" || props.status === "PAST_DUE");
  const canChange =
    props.planOptions.length > 0 && (props.status === "ACTIVE" || props.status === "PAST_DUE");

  // Webhook race after a successful Stripe return (B4): the page reads status
  // once, server-side, and the activating webhook may not have landed yet — so
  // a freshly-paid subscriber would otherwise see the INCOMPLETE "complete your
  // payment" scold. When we returned with ?subscription=ok but status isn't yet
  // ACTIVE, poll GET /api/me/subscription (2s, ~30s cap); on ACTIVE we refresh
  // the server render (→ success banner); on timeout we show a soft
  // "still processing" state with a refresh CTA — never the scold.
  const shouldConfirm =
    props.returnState === "ok" && props.status !== "ACTIVE" && props.status !== "CANCELED";
  const [confirmPhase, setConfirmPhase] = useState<"idle" | "confirming" | "timeout">(
    shouldConfirm ? "confirming" : "idle",
  );
  const deadlineRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldConfirm) {
      setConfirmPhase("idle");
      return;
    }
    setConfirmPhase("confirming");
    deadlineRef.current = Date.now() + 30_000;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (cancelled) return;
      const res = await getSubscription();
      if (cancelled) return;
      if (res.ok && res.data.status === "ACTIVE") {
        router.refresh(); // server re-render flips to the success banner
        return;
      }
      if (Date.now() >= (deadlineRef.current ?? 0)) {
        setConfirmPhase("timeout");
        return;
      }
      timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shouldConfirm, router]);

  // Return / status banner (success, SCA action-required, INCOMPLETE, cancelled).
  const banner = (() => {
    if (confirmPhase === "confirming")
      return { kind: "info" as const, text: t.return.confirming, spinner: true as const };
    if (confirmPhase === "timeout")
      return { kind: "info" as const, text: t.return.stillProcessing, action: "refresh" as const };
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
      window.location.assign(res.data.portalUrl);
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
    const opt = props.planOptions.find((p) => p.id === selectedPlan);
    // Confirm the deferred change up-front, showing the exact effective date —
    // the next billing date — so it's clear nothing changes (or is charged) today.
    const confirmMsg = interpolate(t.changeConfirm, {
      plan: opt?.name ?? "",
      date: props.nextBillingLabel ?? "",
    });
    if (!window.confirm(confirmMsg)) return;
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

  async function doCancelChange() {
    setBusy("cancelChange");
    setNotice(null);
    const res = await cancelScheduledChange();
    setBusy(null);
    if (res.ok) {
      setNotice({ kind: "ok", text: t.changeCanceled });
      router.refresh();
    } else {
      setNotice({ kind: "error", text: res.message });
    }
  }

  return (
    <div className="gh-patient-manage-panel grid gap-5">
      {banner ? (
        <div
          className="flex items-start gap-3 rounded-[12px] p-4 text-sm"
          style={
            banner.kind === "ok"
              ? { background: "#ECFDF5", color: "#166534", border: "1px solid #BBF7D0" }
              : banner.kind === "warn"
                ? { background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }
                : { background: "var(--portal-well)", color: "var(--portal-text-2)", border: "1px solid var(--portal-line)" }
          }
          role="status"
        >
          {"spinner" in banner ? (
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />
          ) : banner.kind === "ok" ? (
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
            ) : "action" in banner && banner.action === "refresh" ? (
              <button
                type="button"
                onClick={() => router.refresh()}
                className="mt-2 font-semibold underline"
              >
                {t.return.refresh}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <AdminCard>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--portal-muted)" }}>
              {t.currentPlan}
            </p>
            <h2 className="mt-1 font-extrabold tracking-[-0.02em]" style={{ fontSize: "1.4rem", color: "var(--portal-text)" }}>
              {props.planName}
            </h2>
          </div>
          <Pill tone={meta.tone} withDot>
            {meta.label}
          </Pill>
        </div>

        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs" style={{ color: "var(--portal-muted)" }}>{t.monthlyPrice}</dt>
            <dd className="mt-0.5 font-semibold" style={{ color: "var(--portal-text)" }}>{props.priceLabel}</dd>
          </div>
          {props.nextBillingLabel ? (
            <div>
              <dt className="text-xs" style={{ color: "var(--portal-muted)" }}>{t.nextBilling}</dt>
              <dd className="mt-0.5 font-semibold" style={{ color: "var(--portal-text)" }}>{props.nextBillingLabel}</dd>
            </div>
          ) : null}
        </dl>

        {props.cancelAtPeriodEnd && props.nextBillingLabel ? (
          <p className="mt-4 text-sm" style={{ color: "#92400E" }}>
            {interpolate(t.cancelAtPeriodEnd, { date: props.nextBillingLabel })}
          </p>
        ) : null}
        {props.pendingChangePlanName && props.pendingChangeDate ? (
          <div
            className="mt-4 rounded-[10px] p-3"
            style={{ background: "var(--portal-well)", border: "1px solid var(--portal-line)" }}
          >
            <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
              {interpolate(t.pendingChange, { plan: props.pendingChangePlanName, date: props.pendingChangeDate })}
            </p>
            <button
              type="button"
              onClick={doCancelChange}
              disabled={busy === "cancelChange"}
              className="mt-2 text-xs font-semibold underline disabled:opacity-60"
              style={{ color: "var(--portal-primary)" }}
            >
              {busy === "cancelChange" ? t.cancelingChange : t.cancelChange}
            </button>
          </div>
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
          <p className="text-sm font-semibold" style={{ color: "var(--portal-text)" }}>{t.upgrade}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--portal-muted)" }}>
            {props.nextBillingLabel
              ? interpolate(t.changeEffective, { date: props.nextBillingLabel })
              : t.changeNote}
          </p>
          <div className="gh-patient-form-actions mt-4 grid gap-3 sm:grid-cols-[minmax(0,20rem)_auto] sm:items-center">
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="gh-input w-full"
              aria-label={t.change}
            >
              <option value="">{t.change}…</option>
              {props.planOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.priceCents > props.currentPriceCents ? t.upgradeLabel : t.downgradeLabel}: {p.name} — {p.priceLabel}
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

      <div className="gh-patient-form-actions grid gap-3 sm:flex sm:flex-wrap sm:items-center">
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
        <Link href={props.pricingHref} className="inline-flex justify-center text-sm font-semibold underline sm:inline" style={{ color: "var(--portal-primary)" }}>
          {t.change}
        </Link>
      </div>
    </div>
  );
}
