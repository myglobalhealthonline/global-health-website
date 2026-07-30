import type { SubscriptionStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { recordAudit } from "../audit/audit.service.js";
import { processInvoicePaid, type BillingReason } from "./subscription-grant.service.js";
import { writeSubscriptionInvoice } from "./subscription-invoice.service.js";
import { reconcileRefund } from "./refund.service.js";
import { emitOpsAlert } from "./ops/ops-alert.js";
import {
  notifyPerkUnlocked,
  notifySubscriptionConfirmed,
  notifySubscriptionRenewed,
  notifyWellnessEarned,
} from "./subscription-emails.service.js";

/**
 * Subscription webhook side-effects (§25.3/§36.2/§38.7). The dispatch entry
 * `handleSubscriptionEvent` is called by payments.route.ts for live events AND
 * by tests with CANNED Stripe fixtures (no keys/signature needed).
 *
 * Event ordering is tolerant: status writes are monotonic, the period-keyed
 * grant is the idempotency backstop, and a ProcessedWebhookEvent row dedupes
 * exact event-id retries.
 */

export interface MinimalStripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Stripe emits `invoice.paid` AND `invoice.payment_succeeded` for the SAME
 * invoice (aliases) — two event ids, ~0.3s apart, both subscribed on the live
 * endpoint. The period-keyed grant already made the second a no-op, but only
 * after re-running the whole 20s grant transaction and re-upserting the mirrored
 * invoice. Dedupe on the invoice id instead so the money path runs once.
 */
export function invoiceAliasKey(event: MinimalStripeEvent): string | null {
  if (event.type !== "invoice.paid" && event.type !== "invoice.payment_succeeded") {
    return null;
  }
  const invoiceId = str(event.data.object.id);
  return invoiceId ? `invoice-paid:${invoiceId}` : null;
}

export interface SubscriptionEventResult {
  handled: boolean;
  detail?: string;
}

const SUBSCRIPTION_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  // `invoice.paid` is a Stripe alias of `invoice.payment_succeeded` — accept it
  // as free hardening in case an endpoint is subscribed only to `invoice.paid`.
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.finalization_failed",
  "charge.refunded",
  "charge.dispute.created",
]);

/** True when the route should hand this event to the subscription handler. */
export function isSubscriptionEvent(event: MinimalStripeEvent): boolean {
  if (!SUBSCRIPTION_EVENT_TYPES.has(event.type)) return false;
  const obj = event.data.object;
  // checkout.session is a subscription event only in subscription mode.
  if (event.type === "checkout.session.completed") {
    return obj.mode === "subscription" || obj.kind === "subscription" ||
      (obj.metadata as Record<string, string> | undefined)?.kind === "subscription";
  }
  // charge.refunded / charge.dispute.created (B2): a charge belongs to a
  // subscription ONLY when it was raised against an invoice. One-off order &
  // appointment charges use payment-mode Checkout (no invoice), so they must
  // fall through to the order/appointment refund branch in the route — a
  // blanket match here would swallow every consultation-order refund and,
  // worse, let an unrelated one-off refund cancel the customer's subscription.
  if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    return Boolean(obj.invoice);
  }
  return true;
}

export async function handleSubscriptionEvent(
  event: MinimalStripeEvent,
): Promise<SubscriptionEventResult> {
  // Exact event-id dedupe (retries). Period-keyed grant covers same-period
  // duplicate invoices with different event ids.
  const aliasKey = invoiceAliasKey(event);
  const dedupeKeys = aliasKey ? [event.id, aliasKey] : [event.id];
  const already = await prisma.processedWebhookEvent.findFirst({
    where: { stripeEventId: { in: dedupeKeys } },
    select: { id: true },
  });
  if (already) return { handled: true, detail: "deduped" };

  let result: SubscriptionEventResult;
  switch (event.type) {
    case "checkout.session.completed":
      result = await onCheckoutCompleted(event);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      result = await onSubscriptionSynced(event);
      break;
    case "customer.subscription.deleted":
      result = await onSubscriptionDeleted(event);
      break;
    case "invoice.payment_succeeded":
    case "invoice.paid":
      result = await onInvoicePaid(event);
      break;
    case "invoice.payment_failed":
      result = await onInvoiceFailed(event);
      break;
    case "invoice.payment_action_required":
    case "invoice.finalization_failed":
      result = await onScaRequired(event);
      break;
    case "charge.refunded":
    case "charge.dispute.created":
      result = await onRefundOrDispute(event);
      break;
    default:
      result = { handled: false, detail: "ignored" };
  }

  if (result.handled) {
    await prisma.processedWebhookEvent
      .createMany({
        data: dedupeKeys.map((stripeEventId) => ({ stripeEventId, eventType: event.type })),
        skipDuplicates: true,
      })
      .catch(() => {
        // A concurrent retry may have inserted it first — safe to ignore.
      });
  }
  return result;
}

// ── handlers ────────────────────────────────────────────────────────────────

/**
 * We received an event for a Stripe subscription we can't resolve. Two very
 * different causes, and acking both was a silent data-loss bug: the caller
 * records the event id as processed, so Stripe never retries and whatever the
 * event carried (ACTIVE + the billing period, a cancel, a PAST_DUE flip) is
 * gone for good.
 *
 * Distinguish them by the CUSTOMER: when that customer still has a
 * UserSubscription row with no `stripeSubscriptionId`, the linking
 * `checkout.session.completed` simply hasn't landed yet → return unhandled so
 * the route 500s and Stripe redelivers. Otherwise the subscription genuinely
 * isn't ours (a Dashboard-created sub, another environment sharing the
 * account) → ack it, or we'd 500 on every retry for three days.
 */
async function deferWhenLinkPending(
  customerId: string | null,
  ackDetail: string,
): Promise<SubscriptionEventResult> {
  if (!customerId) return { handled: true, detail: `${ackDetail}:no-customer` };
  const linkPending = await prisma.userSubscription.findFirst({
    where: { stripeCustomerId: customerId, stripeSubscriptionId: null },
    select: { id: true },
  });
  return linkPending
    ? { handled: false, detail: "link-pending" }
    : { handled: true, detail: ackDetail };
}

async function onCheckoutCompleted(
  event: MinimalStripeEvent,
): Promise<SubscriptionEventResult> {
  const obj = event.data.object;
  const metadata = (obj.metadata as Record<string, string> | undefined) ?? {};
  const internalSubId = metadata.internalSubId ?? null;
  const stripeSubscriptionId = str(obj.subscription);
  const stripeCustomerId = str(obj.customer);
  if (!internalSubId || !stripeSubscriptionId) {
    return { handled: true, detail: "missing-ids" };
  }

  const sub = await prisma.userSubscription.findUnique({ where: { id: internalSubId } });
  if (!sub) return { handled: true, detail: "sub-not-found" };

  // Link Stripe ids; status stays INCOMPLETE until the first invoice is paid.
  await prisma.userSubscription.update({
    where: { id: sub.id },
    data: {
      stripeSubscriptionId,
      stripeCustomerId: stripeCustomerId ?? sub.stripeCustomerId,
    },
  });
  await recordAudit({
    action: "SUBSCRIPTION_CREATED",
    entityType: "UserSubscription",
    entityId: sub.id,
    actorUserId: sub.userId,
    metadata: { stripeSubscriptionId },
  });
  return { handled: true, detail: "linked" };
}

async function onSubscriptionSynced(
  event: MinimalStripeEvent,
): Promise<SubscriptionEventResult> {
  const obj = event.data.object;
  const stripeSubscriptionId = str(obj.id);
  if (!stripeSubscriptionId) return { handled: true, detail: "no-id" };
  const sub = await prisma.userSubscription.findUnique({
    where: { stripeSubscriptionId },
  });
  if (!sub) return deferWhenLinkPending(str(obj.customer), "sub-not-found");

  const stripeStatus = mapStripeStatus(str(obj.status));
  const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
  const periodEnd = unixToDate(obj.current_period_end);
  const periodStart = unixToDate(obj.current_period_start);

  // Monotonic guard (§38.7): never resurrect a CANCELED sub from a stale event,
  // and never rewind the period.
  if (sub.status === "CANCELED" && stripeStatus !== "CANCELED") {
    return { handled: true, detail: "stale-ignored" };
  }
  if (periodStart && sub.currentPeriodStart && periodStart < sub.currentPeriodStart) {
    return { handled: true, detail: "stale-period" };
  }

  // Don't downgrade ACTIVE→INCOMPLETE on a late created/updated echo.
  const nextStatus =
    sub.status === "ACTIVE" && stripeStatus === "INCOMPLETE" ? "ACTIVE" : stripeStatus;

  await prisma.userSubscription.update({
    where: { id: sub.id },
    data: {
      status: nextStatus,
      cancelAtPeriodEnd,
      // Write periodStart too (the stale-period guard above already rejects a
      // rewind, so this only ever moves it forward — the grant path still owns
      // the authoritative period, this just keeps the sync echo complete).
      ...(periodStart ? { currentPeriodStart: periodStart } : {}),
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
    },
  });
  return { handled: true, detail: `synced:${nextStatus}` };
}

async function onSubscriptionDeleted(
  event: MinimalStripeEvent,
): Promise<SubscriptionEventResult> {
  const stripeSubscriptionId = str(event.data.object.id);
  if (!stripeSubscriptionId) return { handled: true, detail: "no-id" };
  const sub = await prisma.userSubscription.findUnique({
    where: { stripeSubscriptionId },
  });
  if (!sub) return deferWhenLinkPending(str(event.data.object.customer), "sub-not-found");
  await prisma.userSubscription.update({
    where: { id: sub.id },
    data: { status: "CANCELED", canceledAt: sub.canceledAt ?? new Date() },
  });
  await recordAudit({
    action: "SUBSCRIPTION_CANCELED",
    entityType: "UserSubscription",
    entityId: sub.id,
    actorUserId: sub.userId,
    metadata: { reason: "stripe_deleted" },
  });
  return { handled: true, detail: "canceled" };
}

/**
 * A paid subscription invoice → grant + mirror + notify. The ONE place that
 * turns money into an ACTIVE membership, shared by the webhook handler and the
 * provider-sync fallback (`syncSubscriptionFromProvider`) so a sync can never
 * drift from what a webhook would have done. Idempotent via the period key.
 */
export async function applyPaidInvoice(input: {
  stripeSubscriptionId: string;
  billingReason: string | null;
  amountPaidCents: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  stripeInvoiceId: string;
  number?: string | null;
  currency?: string | null;
  taxCents?: number | null;
  hostedInvoiceUrl?: string | null;
  pdfUrl?: string | null;
  status?: string | null;
}): Promise<SubscriptionEventResult> {
  const { periodStart, periodEnd } = input;

  // An immediate UPGRADE bills a prorated `subscription_update` invoice. The
  // plan swap, perk unlock and credit delta were already applied synchronously
  // by changePlan, so this must NOT grant — but it still has to appear in the
  // patient's invoice history, which the old blanket early-return skipped.
  if (!isGrantingReason(input.billingReason)) {
    const sub = await prisma.userSubscription.findUnique({
      where: { stripeSubscriptionId: input.stripeSubscriptionId },
      select: { id: true },
    });
    if (!sub) return { handled: true, detail: "non-granting-invoice" };
    await writeSubscriptionInvoice({
      userSubscriptionId: sub.id,
      stripeInvoiceId: input.stripeInvoiceId,
      number: input.number ?? null,
      amountPaidCents: input.amountPaidCents,
      currency: input.currency ?? "eur",
      taxCents: input.taxCents ?? 0,
      periodStart: periodStart ?? new Date(),
      hostedInvoiceUrl: input.hostedInvoiceUrl ?? null,
      pdfUrl: input.pdfUrl ?? null,
      status: input.status ?? null,
    });
    return { handled: true, detail: "mirrored-not-granted" };
  }

  if (!periodStart || !periodEnd) {
    return { handled: true, detail: "no-period" };
  }

  const grant = await processInvoicePaid({
    stripeSubscriptionId: input.stripeSubscriptionId,
    periodStart,
    periodEnd,
    billingReason: input.billingReason as BillingReason,
    amountPaid: input.amountPaidCents,
  });

  // Mirror the Stripe-hosted invoice for the account page (§38.1).
  if (grant.subscriptionId) {
    await writeSubscriptionInvoice({
      userSubscriptionId: grant.subscriptionId,
      stripeInvoiceId: input.stripeInvoiceId,
      number: input.number ?? null,
      amountPaidCents: input.amountPaidCents,
      currency: input.currency ?? "eur",
      taxCents: input.taxCents ?? 0,
      periodStart,
      hostedInvoiceUrl: input.hostedInvoiceUrl ?? null,
      pdfUrl: input.pdfUrl ?? null,
      status: input.status ?? null,
    });
  }

  if (!grant.handled) return { handled: false, detail: "sub-not-linked-yet" };

  if (grant.granted && grant.subscriptionId && grant.userId) {
    fireGrantAudits(grant.subscriptionId, grant.userId, grant);
    fireSubscriptionEmails(grant.subscriptionId, input.billingReason, grant);
  }
  return { handled: true, detail: grant.granted ? "granted" : "duplicate-period" };
}

async function onInvoicePaid(event: MinimalStripeEvent): Promise<SubscriptionEventResult> {
  const inv = event.data.object;
  const stripeSubscriptionId = resolveInvoiceSubscriptionId(inv);
  if (!stripeSubscriptionId) return { handled: true, detail: "non-granting-invoice" };
  const { periodStart, periodEnd } = resolveInvoicePeriod(inv);
  return applyPaidInvoice({
    stripeSubscriptionId,
    billingReason: str(inv.billing_reason),
    amountPaidCents: num(inv.amount_paid) ?? 0,
    periodStart,
    periodEnd,
    stripeInvoiceId: str(inv.id) ?? `${event.id}-inv`,
    number: str(inv.number),
    currency: str(inv.currency),
    taxCents: num(inv.tax),
    hostedInvoiceUrl: str(inv.hosted_invoice_url),
    pdfUrl: str(inv.invoice_pdf),
    status: str(inv.status),
  });
}

/**
 * Patient subscription emails (§30) — fire-and-forget, never blocks the money
 * path. First paid invoice → confirmation; each renewal → renewal+credits;
 * plus wellness-earned and per-perk-unlocked when those happen this cycle.
 * No failed-payment email here (Stripe owns dunning, §38.5).
 */
function fireSubscriptionEmails(
  subscriptionId: string,
  billingReason: string | null,
  grant: Awaited<ReturnType<typeof processInvoicePaid>>,
): void {
  const credits = grant.consultationCreditsGranted ?? 0;
  const swallow = () => {};
  if (billingReason === "subscription_create") {
    void notifySubscriptionConfirmed(subscriptionId, credits).catch(swallow);
  } else {
    void notifySubscriptionRenewed(subscriptionId, credits).catch(swallow);
  }
  if ((grant.wellnessCreditsGranted ?? 0) > 0) {
    void notifyWellnessEarned(subscriptionId, grant.wellnessCreditsGranted ?? 0).catch(swallow);
  }
  for (const perkKey of grant.newlyUnlockedPerks) {
    void notifyPerkUnlocked(subscriptionId, perkKey).catch(swallow);
  }
}

function fireGrantAudits(
  subscriptionId: string,
  userId: string,
  grant: Awaited<ReturnType<typeof processInvoicePaid>>,
): void {
  void recordAudit({
    action: "CONSULTATION_CREDIT_GRANTED",
    entityType: "UserSubscription",
    entityId: subscriptionId,
    actorUserId: userId,
    metadata: { credits: grant.consultationCreditsGranted ?? 0 },
  });
  if ((grant.wellnessCreditsGranted ?? 0) > 0) {
    void recordAudit({
      action: "WELLNESS_CREDIT_EARNED",
      entityType: "UserSubscription",
      entityId: subscriptionId,
      actorUserId: userId,
      metadata: { credits: grant.wellnessCreditsGranted ?? 0 },
    });
  }
  for (const perkKey of grant.newlyUnlockedPerks) {
    void recordAudit({
      action: "PERK_UNLOCKED",
      entityType: "UserSubscription",
      entityId: subscriptionId,
      actorUserId: userId,
      metadata: { perkKey },
    });
  }
}

async function onInvoiceFailed(event: MinimalStripeEvent): Promise<SubscriptionEventResult> {
  const stripeSubscriptionId = resolveInvoiceSubscriptionId(event.data.object);
  if (!stripeSubscriptionId) return { handled: true, detail: "no-sub" };
  const sub = await prisma.userSubscription.findUnique({
    where: { stripeSubscriptionId },
  });
  if (!sub) return deferWhenLinkPending(str(event.data.object.customer), "sub-not-found");
  // PAST_DUE, no credits. Stripe owns dunning (§38.5). Benefits persist to
  // currentPeriodEnd (Q5=A) — handled by the eligibility predicate.
  if (sub.status === "ACTIVE" || sub.status === "INCOMPLETE") {
    await prisma.userSubscription.update({
      where: { id: sub.id },
      data: { status: "PAST_DUE" },
    });
  }
  return { handled: true, detail: "past_due" };
}

/**
 * SCA / 3-D-Secure authentication required on a renewal (§38.2). NOT a hard fail
 * — never cancel. Stripe owns the hosted authentication email (it sends the
 * customer the auth link). We surface it for ops visibility + audit so a stuck
 * off-session renewal isn't silent. The patient also sees the action-required
 * state on their account return screen.
 */
async function onScaRequired(event: MinimalStripeEvent): Promise<SubscriptionEventResult> {
  const obj = event.data.object;
  const stripeCustomerId = str(obj.customer);
  const hostedUrl = str((obj as { hosted_invoice_url?: unknown }).hosted_invoice_url);
  const sub = stripeCustomerId
    ? await prisma.userSubscription.findFirst({
        where: { stripeCustomerId },
        orderBy: { createdAt: "desc" },
        select: { id: true, userId: true },
      })
    : null;

  if (sub) {
    void recordAudit({
      action: "SUBSCRIPTION_UPDATED",
      entityType: "UserSubscription",
      entityId: sub.id,
      actorUserId: sub.userId,
      metadata: { event: event.type, scaRequired: true, hostedInvoiceUrl: hostedUrl || null },
    });
  }
  void emitOpsAlert({
    severity: "warning",
    title: "Subscription renewal needs customer authentication (SCA)",
    detail: `${event.type} — Stripe is sending the auth link; renewal pending until completed`,
    context: { subscriptionId: sub?.id ?? null, hostedInvoiceUrl: hostedUrl || null },
  });
  return { handled: true, detail: "sca_required_no_cancel" };
}

async function onRefundOrDispute(event: MinimalStripeEvent): Promise<SubscriptionEventResult> {
  const obj = event.data.object;
  const isDispute = event.type === "charge.dispute.created";
  const stripeInvoiceId = str(obj.invoice);
  const stripeCustomerId = str(obj.customer);

  // Resolve the subscription by the charge's INVOICE first — an invoice belongs
  // to exactly ONE subscription, so this targets the correct sub even when the
  // customer has since started a different one. Only fall back to newest-by-
  // customer when the invoice isn't mirrored yet (B18/#19: newest-by-customer
  // alone could claw back the wrong subscription).
  let sub: { id: string } | null = null;
  if (stripeInvoiceId) {
    const inv = await prisma.subscriptionInvoice.findUnique({
      where: { stripeInvoiceId },
      select: { userSubscriptionId: true },
    });
    if (inv) sub = { id: inv.userSubscriptionId };
  }
  if (!sub && stripeCustomerId) {
    sub = await prisma.userSubscription.findFirst({
      where: { stripeCustomerId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
  }
  if (!sub) return { handled: true, detail: "sub-not-found" };

  // Partial-refund guard (D19 = full-refund-only): a partial charge.refunded
  // (amount_refunded < amount) must NOT clawback + CANCEL the whole membership —
  // flag it for ops instead (#20). Disputes always reconcile.
  if (!isDispute) {
    const amount = num(obj.amount);
    const refunded = num(obj.amount_refunded);
    if (amount != null && refunded != null && refunded > 0 && refunded < amount) {
      void emitOpsAlert({
        severity: "warning",
        title: "Partial subscription refund — not auto-reconciled",
        detail: `sub ${sub.id} refunded ${refunded}/${amount}; review + reconcile manually`,
        context: { subscriptionId: sub.id, amount, refunded },
      });
      return { handled: true, detail: "partial-refund-skipped" };
    }
  }

  // 7-day window check from the charge.created epoch (UTC) — a Dashboard refund
  // can bypass our pre-refund guard, so flag a breach for ops review (§36.5).
  const created = (obj as { created?: unknown }).created;
  const sevenDayBreach =
    !isDispute && typeof created === "number"
      ? Date.now() - created * 1000 > 7 * 24 * 60 * 60 * 1000
      : false;

  // Idempotent clawback (consultation + this-month wellness) + CANCEL + audit +
  // ops alert on violation. Shared with the admin/patient refund action.
  const result = await reconcileRefund({
    subscriptionId: sub.id,
    reasonKey: event.id,
    source: "webhook",
    isDispute,
    sevenDayBreach,
  });
  return { handled: true, detail: result.policyViolation ? "clawback+violation" : "clawback" };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function isGrantingReason(reason: string | null): boolean {
  return reason === "subscription_create" || reason === "subscription_cycle";
}

function mapStripeStatus(status: string | null): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "paused":
      return "PAUSED";
    default:
      return "INCOMPLETE";
  }
}

function resolveInvoiceSubscriptionId(inv: Record<string, unknown>): string | null {
  const direct = str(inv.subscription);
  if (direct) return direct;
  // Newer API nests it under parent.subscription_details.subscription.
  const parent = inv.parent as Record<string, unknown> | undefined;
  const details = parent?.subscription_details as Record<string, unknown> | undefined;
  return str(details?.subscription);
}

function resolveInvoicePeriod(inv: Record<string, unknown>): {
  periodStart: Date | null;
  periodEnd: Date | null;
} {
  const lines = inv.lines as { data?: Array<Record<string, unknown>> } | undefined;
  const linePeriod = lines?.data?.[0]?.period as Record<string, unknown> | undefined;
  const start = unixToDate(linePeriod?.start) ?? unixToDate(inv.period_start);
  const end = unixToDate(linePeriod?.end) ?? unixToDate(inv.period_end);
  return { periodStart: start, periodEnd: end };
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}
function unixToDate(v: unknown): Date | null {
  return typeof v === "number" && v > 0 ? new Date(v * 1000) : null;
}
