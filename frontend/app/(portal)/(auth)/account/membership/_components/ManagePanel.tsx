"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, X } from "lucide-react";
import {
  cancelScheduledChange,
  cancelSubscription,
  changePlan,
  getBillingPortalUrl,
  getSubscription,
} from "@/lib/api/me-subscription";
import { formatAppDate } from "@/lib/format-datetime";
import { interpolate } from "@/lib/subscription/format";
import { AdminCard, Btn, SectionHeader } from "@/components/portal-atoms";
import { PortalDialog } from "@/components/PortalDialog";

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

// Row copy lives in the account bundle (account.membership.*) — same strings
// the benefits and timeline sections use.
type MembershipCopy = ReturnType<
  typeof import("@/lib/i18n/load-locale")["loadLocaleBundle"]
>["account"]["membership"];

export interface ManagePanelProps {
  t: ManageCopy;
  /** account.membership — the row titles and "when it takes effect" copy. */
  m: MembershipCopy;
  status: string;
  /** Current plan monthly price in cents — to classify changes up/down. */
  currentPriceCents: number;
  nextBillingLabel: string | null;
  cancelAtPeriodEnd: boolean;
  pendingChangePlanName: string | null;
  pendingChangeDate: string | null;
  planOptions: PlanOption[];
  /** Preselects the change-plan dropdown (from pricing "Switch to this plan"). */
  initialPlanId?: string | null;
  returnState: string | null;
  pricingHref: string;
}

export function ManagePanel(props: ManagePanelProps) {
  const { t, m } = props;
  const router = useRouter();
  const [busy, setBusy] = useState<null | "portal" | "cancel" | "change" | "cancelChange">(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>(props.initialPlanId ?? "");
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmChangeOpen, setConfirmChangeOpen] = useState(false);
  const [alreadyActiveDismissed, setAlreadyActiveDismissed] = useState(false);

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
      // Sync confirm phase back to idle when the triggering prop clears.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (props.status === "PAUSED") return { kind: "info" as const, text: t.return.paused, action: "portal" as const };
    if (props.returnState === "ok" && props.status === "ACTIVE") return { kind: "ok" as const, text: t.return.ok };
    if (props.returnState === "cancelled") return { kind: "info" as const, text: t.return.cancelled };
    if (props.returnState === "already-active" && !alreadyActiveDismissed)
      return { kind: "info" as const, text: t.return.alreadyActive, dismissible: true as const };
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

  function doCancel() {
    setConfirmCancelOpen(true);
  }

  async function confirmCancel() {
    setConfirmCancelOpen(false);
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

  function doChange() {
    if (!selectedPlan) return;
    // Confirm the deferred change up-front, showing the exact effective date —
    // the next billing date — so it's clear nothing changes (or is charged) today.
    setConfirmChangeOpen(true);
  }

  async function confirmChange() {
    setConfirmChangeOpen(false);
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

  const selectedPlanOption = props.planOptions.find((p) => p.id === selectedPlan);
  const changeConfirmMsg = interpolate(t.changeConfirm, {
    plan: selectedPlanOption?.name ?? "",
    date: props.nextBillingLabel ?? "",
  });

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
              ? { background: "var(--portal-success-soft)", color: "var(--portal-success-text)", border: "1px solid var(--portal-success)" }
              : banner.kind === "warn"
                ? { background: "var(--portal-warning-soft)", color: "var(--portal-warning-text)", border: "1px solid var(--portal-warning)" }
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
          <div className="flex-1">
            <p>{banner.text}</p>
            {"action" in banner && banner.action === "portal" ? (
              <button
                type="button"
                onClick={openPortal}
                className="mt-2 font-semibold underline"
                disabled={busy === "portal"}
              >
                {props.status === "PAUSED" ? t.manageBilling : t.return.completePayment}
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
          {"dismissible" in banner && banner.dismissible ? (
            <button
              type="button"
              onClick={() => setAlreadyActiveDismissed(true)}
              className="shrink-0 rounded-full p-1 opacity-70 hover:opacity-100"
              aria-label={t.return.dismiss}
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Scheduled changes only. Plan name, price, renewal and status live on
          the membership card and its facts panel above — this panel is the
          actions surface, not a second copy of the plan. */}
      {(props.cancelAtPeriodEnd && props.nextBillingLabel) ||
      (props.pendingChangePlanName && props.pendingChangeDate) ? (
        <AdminCard>
          {props.cancelAtPeriodEnd && props.nextBillingLabel ? (
            <p className="text-sm" style={{ color: "var(--portal-warning-text)" }}>
              {interpolate(t.cancelAtPeriodEnd, { date: props.nextBillingLabel })}
            </p>
          ) : null}
          {props.pendingChangePlanName && props.pendingChangeDate ? (
            <>
              <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
                {interpolate(t.pendingChange, { plan: props.pendingChangePlanName, date: props.pendingChangeDate })}
              </p>
              <div className="gh-patient-form-actions mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={doCancelChange}
                  disabled={busy === "cancelChange"}
                  className="text-xs font-semibold underline disabled:opacity-60"
                  style={{ color: "var(--portal-primary)" }}
                >
                  {busy === "cancelChange" ? t.cancelingChange : t.cancelChange}
                </button>
              </div>
            </>
          ) : null}
        </AdminCard>
      ) : null}

      {notice ? (
        <p
          className="rounded-md px-3 py-2 text-sm"
          style={
            notice.kind === "ok"
              ? { background: "var(--portal-success-soft)", color: "var(--portal-success-text)" }
              : { background: "var(--portal-danger-soft)", color: "var(--portal-danger-text)" }
          }
          role="status"
        >
          {notice.text}
        </p>
      ) : null}

      {/* Everything you can DO, one labelled row each: what it does and when
          it takes effect, then the control. The old panel showed bare buttons
          and left the consequences to a confirm dialog. */}
      <AdminCard padding={0}>
        <SectionHeader as="h2" title={m.manageTitle} description={m.manageDesc} />
        <div className="p-5">
          {canChange ? (
            <div className="gh-membership-do">
              <div>
                <h3 className="gh-membership-do__title">{m.rowSwitchTitle}</h3>
                <p className="gh-membership-do__body">
                  {props.nextBillingLabel
                    ? interpolate(m.rowSwitchBody, { date: props.nextBillingLabel })
                    : m.rowSwitchBodyPending}
                </p>
              </div>
              <div className="gh-membership-do__ctl">
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="gh-input"
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
            </div>
          ) : null}

          <div className="gh-membership-do">
            <div>
              <h3 className="gh-membership-do__title">{m.rowBillingTitle}</h3>
              <p className="gh-membership-do__body">{m.rowBillingBody}</p>
            </div>
            <div className="gh-membership-do__ctl">
              <Btn
                variant="primary"
                onClick={openPortal}
                disabled={busy === "portal"}
                iconLeft={busy === "portal" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
              >
                {t.manageBilling}
              </Btn>
            </div>
          </div>

          <div className="gh-membership-do">
            <div>
              <h3 className="gh-membership-do__title">{t.browseAllPlans}</h3>
              <p className="gh-membership-do__body">{t.changeNote}</p>
            </div>
            <div className="gh-membership-do__ctl">
              <Link
                href={props.pricingHref}
                className="text-sm font-semibold underline"
                style={{ color: "var(--portal-primary)" }}
              >
                {t.browsePlans}
              </Link>
            </div>
          </div>

          {canCancel ? (
            <div className="gh-membership-do">
              <div>
                <h3 className="gh-membership-do__title">{m.rowCancelTitle}</h3>
                <p className="gh-membership-do__body">
                  {props.nextBillingLabel
                    ? interpolate(m.rowCancelBody, { date: props.nextBillingLabel })
                    : m.rowCancelBodyPending}
                </p>
              </div>
              <div className="gh-membership-do__ctl">
                <Btn
                  variant="ghost"
                  onClick={doCancel}
                  disabled={busy === "cancel"}
                  iconLeft={busy === "cancel" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : undefined}
                >
                  {busy === "cancel" ? t.canceling : t.cancel}
                </Btn>
              </div>
            </div>
          ) : null}
        </div>
      </AdminCard>

      <PortalDialog
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        title={t.cancel}
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmCancelOpen(false)}>
              Back
            </Btn>
            <Btn variant="danger" onClick={() => void confirmCancel()}>
              {t.cancel}
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          {t.cancelConfirm}
        </p>
      </PortalDialog>

      <PortalDialog
        open={confirmChangeOpen}
        onClose={() => setConfirmChangeOpen(false)}
        title={t.change}
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmChangeOpen(false)}>
              Back
            </Btn>
            <Btn variant="danger" onClick={() => void confirmChange()}>
              {t.change}
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          {changeConfirmMsg}
        </p>
      </PortalDialog>
    </div>
  );
}
