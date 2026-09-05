"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RefreshCw, RotateCw, Banknote } from "lucide-react";
import {
  AdminTable,
  IconBtn,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
  Btn,
  type PillTone,
} from "@/components/portal-atoms";
import { PortalMobileCard, type PortalMobileCardTone } from "@/components/PortalMobileCard";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import { AdminSubscriberLedger } from "../../_components/subscriber-ledger";
import {
  RecordDetailsDrawer,
  RecordDetailsSection,
  RecordDetailsField,
} from "@/components/RecordDetailsDrawer";
import type { AdminSubscriptionListItem, CreditKind } from "@/lib/admin/plans-api";

function statusTone(status: string): PillTone {
  if (status === "ACTIVE") return "active";
  if (status === "PAST_DUE" || status === "INCOMPLETE") return "pending";
  if (status === "CANCELED") return "inactive";
  return "neutral";
}

function statusCardTone(status: string): PortalMobileCardTone {
  if (status === "ACTIVE") return "success";
  if (status === "PAST_DUE" || status === "INCOMPLETE") return "warning";
  if (status === "CANCELED") return "danger";
  return "neutral";
}

function balanceOf(balances: Array<{ kind: CreditKind; balance: number }>, kind: CreditKind): number {
  return balances.find((b) => b.kind === kind)?.balance ?? 0;
}

/** en-GB so admins read 26 Aug 2026, not the ambiguous 08/26/2026. */
function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  }).format(cents / 100);
}

/**
 * What the member is actually charged: the snapshotted price, not the plan's
 * live column. Stripe Prices are immutable and existing subscribers stay on the
 * one they signed up at (D22), so after an admin price edit the plan row quotes
 * a number this member is not paying.
 */
function billedPrice(sub: AdminSubscriptionListItem): string {
  return formatMoney(
    sub.planSnapshot?.monthlyPriceCents ?? sub.plan.monthlyPriceCents,
    sub.planSnapshot?.currencyCode ?? sub.plan.currencyCode,
  );
}

/**
 * The date money next moves. A subscription set to cancel still runs to the end
 * of the paid period, so `currentPeriodEnd` is the ACCESS end date there, not a
 * charge date — labelling it "next payment" would tell the admin a cancelled
 * member is about to be billed.
 */
function nextPayment(sub: AdminSubscriptionListItem): string | null {
  if (sub.status === "CANCELED" || sub.cancelAtPeriodEnd) return null;
  return formatDate(sub.currentPeriodEnd);
}

const refundConfirmMessage = (sub: AdminSubscriptionListItem) =>
  `This refunds ${sub.user.fullName ?? sub.user.email}'s latest paid period at the provider, claws back unused consultation/wellness credits for that period, and cancels the subscription. This moves real money and cannot be undone from here. Denied if outside the 7-day window or a consultation credit was already used this period.`;

export function AdminSubscriptionsTable({
  items,
  canAdjustCredits,
  resyncAction,
  regrantAction,
  refundAction,
}: {
  items: AdminSubscriptionListItem[];
  canAdjustCredits: boolean;
  resyncAction: (formData: FormData) => void | Promise<void>;
  regrantAction: (formData: FormData) => void | Promise<void>;
  refundAction: (formData: FormData) => void | Promise<void>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [quickViewId, setQuickViewId] = useState<string | null>(() => searchParams.get("sub"));

  const quickViewSub = quickViewId ? items.find((s) => s.id === quickViewId) ?? null : null;

  function openQuickView(id: string) {
    setQuickViewId(id);
    const next = new URLSearchParams(searchParams.toString());
    next.set("sub", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const repairActions = (sub: AdminSubscriptionListItem) => (
    <>
      <form action={resyncAction}>
        <input type="hidden" name="subscriptionId" value={sub.id} />
        <IconBtn
          type="submit"
          ariaLabel="Resync from Stripe"
          title="Resync from Stripe"
          style={{ minHeight: 32, minWidth: 32 }}
        >
          <RefreshCw className="size-3.5" />
        </IconBtn>
      </form>
      <form action={regrantAction}>
        <input type="hidden" name="subscriptionId" value={sub.id} />
        <IconBtn
          type="submit"
          ariaLabel="Re-run period grant"
          title="Re-run period grant"
          style={{ minHeight: 32, minWidth: 32 }}
        >
          <RotateCw className="size-3.5" />
        </IconBtn>
      </form>
      {canAdjustCredits ? (
        <form action={refundAction}>
          <input type="hidden" name="subscriptionId" value={sub.id} />
          <ConfirmDeleteButton
            title="Issue refund?"
            message={refundConfirmMessage(sub)}
            ariaLabel="Issue refund"
          >
            <Banknote className="size-3.5" aria-hidden />
          </ConfirmDeleteButton>
        </form>
      ) : null}
    </>
  );

  return (
    <>
      <div className="gh-admin-plan-table-wrap gh-cpt-table-wrap overflow-x-auto">
        <AdminTable>
          <Thead>
            <Th>Subscriber</Th>
            <Th>Plan</Th>
            <Th>Status</Th>
            <Th>Next payment</Th>
            <Th>Credits (GP / wellness)</Th>
            <Th align="right">Actions</Th>
          </Thead>
          <tbody>
            {items.map((sub) => (
              <Tr key={sub.id}>
                <Td onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => openQuickView(sub.id)}
                    aria-label={`View subscription details for ${sub.user.fullName ?? sub.user.email}`}
                    className="block w-full cursor-pointer text-left"
                    style={{ background: "none", border: "none", padding: 0, font: "inherit" }}
                  >
                    <span className="block font-semibold text-[var(--color-text-primary)]">
                      {sub.user.fullName ?? sub.user.email}
                    </span>
                    <span className="block text-xs text-[var(--color-text-muted)]">
                      {sub.user.email} · {sub.countryCode.toUpperCase()}
                    </span>
                  </button>
                </Td>
                <Td>{sub.plan.name}</Td>
                <Td>
                  <Pill tone={statusTone(sub.status)}>{sub.status}</Pill>
                  {sub.cancelAtPeriodEnd ? (
                    <span className="ml-1">
                      <Pill tone="draft">cancels</Pill>
                    </span>
                  ) : null}
                </Td>
                <Td>
                  <span className="block text-[var(--color-text-primary)]">
                    {nextPayment(sub) ?? "—"}
                  </span>
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    {sub.paidMonthsCount} paid month{sub.paidMonthsCount === 1 ? "" : "s"}
                  </span>
                </Td>
                <Td>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {balanceOf(sub.balances, "CONSULTATION")} / {balanceOf(sub.balances, "WELLNESS")}
                  </span>
                </Td>
                <Td align="right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">{repairActions(sub)}</div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </AdminTable>
      </div>

      <div className="gh-admin-mobile-list gh-cpt-mobile-list">
        {items.map((sub) => (
          <PortalMobileCard
            key={sub.id}
            tone={statusCardTone(sub.status)}
            title={sub.user.fullName ?? sub.user.email}
            subtitle={`${sub.user.email} - ${sub.countryCode.toUpperCase()}`}
            statusPill={<Pill tone={statusTone(sub.status)}>{sub.status}</Pill>}
            meta={[
              { label: "Plan", value: `${sub.plan.name} · ${billedPrice(sub)}` },
              {
                label: sub.cancelAtPeriodEnd ? "Access ends" : "Next payment",
                value:
                  (sub.cancelAtPeriodEnd ? formatDate(sub.currentPeriodEnd) : nextPayment(sub)) ?? "—",
              },
              { label: "Paid months", value: sub.paidMonthsCount },
              {
                label: "Balances",
                value: `GP ${balanceOf(sub.balances, "CONSULTATION")} / wellness ${balanceOf(sub.balances, "WELLNESS")}`,
              },
              ...(sub.cancelAtPeriodEnd
                ? [{ label: "Renewal", value: <Pill tone="draft">cancels at period end</Pill> }]
                : []),
            ]}
            actions={
              <>
                {/* The desktop table opens the drawer from the subscriber
                    cell; below 760px that cell is the card title, so the
                    quick view needs its own control here. Same handler, so
                    the `sub` param and the page's filters are preserved. */}
                <button
                  type="button"
                  onClick={() => openQuickView(sub.id)}
                  aria-label={`Quick view subscription for ${sub.user.fullName ?? sub.user.email}`}
                  className="gh-btn gh-btn-soft text-sm"
                >
                  Quick view
                </button>
                {repairActions(sub)}
              </>
            }
          />
        ))}
      </div>

      <RecordDetailsDrawer
        open={quickViewSub !== null}
        onOpenChange={(next) => {
          if (!next) setQuickViewId(null);
        }}
        paramKey="sub"
        paramValue={quickViewSub?.id}
        title={quickViewSub ? quickViewSub.user.fullName ?? quickViewSub.user.email : ""}
        summary={
          quickViewSub ? (
            <div className="gh-order-drawer-summary flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="font-semibold text-[var(--portal-text)]">{quickViewSub.plan.name}</span>
              <Pill tone={statusTone(quickViewSub.status)}>{quickViewSub.status}</Pill>
              {quickViewSub.cancelAtPeriodEnd ? <Pill tone="draft">cancels</Pill> : null}
            </div>
          ) : null
        }
        footer={
          quickViewSub ? (
            <>
              <Btn variant="ghost" onClick={() => setQuickViewId(null)}>
                Close
              </Btn>
              {repairActions(quickViewSub)}
            </>
          ) : null
        }
      >
        {quickViewSub ? (
          <>
            <RecordDetailsSection title="Membership">
              <RecordDetailsField label="Plan" value={quickViewSub.plan.name} />
              <RecordDetailsField label="Monthly price" value={billedPrice(quickViewSub)} />
              <RecordDetailsField label="Member since" value={formatDate(quickViewSub.startedAt)} />
              <RecordDetailsField label="Paid months" value={quickViewSub.paidMonthsCount} />
              <RecordDetailsField
                label="Current period"
                value={
                  formatDate(quickViewSub.currentPeriodStart) && formatDate(quickViewSub.currentPeriodEnd)
                    ? `${formatDate(quickViewSub.currentPeriodStart)} → ${formatDate(quickViewSub.currentPeriodEnd)}`
                    : null
                }
              />
              <RecordDetailsField
                label={quickViewSub.cancelAtPeriodEnd ? "Access ends" : "Next payment"}
                value={
                  quickViewSub.cancelAtPeriodEnd
                    ? formatDate(quickViewSub.currentPeriodEnd)
                    : nextPayment(quickViewSub) &&
                      `${nextPayment(quickViewSub)} · ${billedPrice(quickViewSub)}`
                }
              />
              {quickViewSub.canceledAt ? (
                <RecordDetailsField label="Canceled on" value={formatDate(quickViewSub.canceledAt)} />
              ) : null}
            </RecordDetailsSection>

            <RecordDetailsSection title="Credits">
              <RecordDetailsField
                label="Consultation balance"
                value={balanceOf(quickViewSub.balances, "CONSULTATION")}
              />
              <RecordDetailsField
                label="Wellness balance"
                value={balanceOf(quickViewSub.balances, "WELLNESS")}
              />
              <RecordDetailsField
                label="Perks unlocked"
                value={
                  quickViewSub.perkGrants.length === 0
                    ? null
                    : quickViewSub.perkGrants
                        .map((p) => `${p.perkKey.replaceAll("_", " ").toLowerCase()} (${p.status.toLowerCase()})`)
                        .join(", ")
                }
              />
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <AdminSubscriberLedger subscriptionId={quickViewSub.id} />
              </div>
            </RecordDetailsSection>

            <RecordDetailsSection title="Payment history">
              {quickViewSub.invoices.length === 0 ? (
                <p className="text-portal-meta text-[var(--color-text-muted)]">
                  No payments recorded yet.
                </p>
              ) : (
                <ul className="gh-admin-sub-payments m-0 flex list-none flex-col gap-1 p-0">
                  {quickViewSub.invoices.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-[var(--color-border)] py-1.5 last:border-b-0"
                    >
                      <span className="text-portal-meta text-[var(--color-text-muted)]">
                        {formatDate(inv.periodStart) ?? formatDate(inv.createdAt)}
                        {inv.number ? ` · ${inv.number}` : ""}
                      </span>
                      <span className="text-portal-meta font-semibold text-[var(--color-text-primary)]">
                        {inv.hostedInvoiceUrl ? (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-brand-primary)] underline-offset-2 hover:underline"
                          >
                            {formatMoney(inv.amountPaidCents, inv.currency)}
                          </a>
                        ) : (
                          formatMoney(inv.amountPaidCents, inv.currency)
                        )}
                        {inv.status && inv.status !== "paid" ? ` · ${inv.status}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </RecordDetailsSection>

            <RecordDetailsSection title="Billing linkage">
              <RecordDetailsField label="Country" value={quickViewSub.countryCode.toUpperCase()} />
              <RecordDetailsField
                label="Cancels at period end"
                value={quickViewSub.cancelAtPeriodEnd ? "Yes" : "No"}
              />
              <RecordDetailsField
                label="Stripe subscription"
                // No id = no card on file at the provider yet (a checkout that
                // never completed, or a member imported from another platform).
                // Nothing will be charged at the next period end until it links.
                value={quickViewSub.stripeSubscriptionId ?? "Not linked — no card on file"}
              />
              <RecordDetailsField label="Stripe customer" value={quickViewSub.stripeCustomerId} />
              <a
                href={`/admin/audit-log?entityType=UserSubscription&entityId=${quickViewSub.id}`}
                className="text-portal-thead font-semibold text-[var(--color-brand-primary)] underline-offset-2 hover:underline"
              >
                View audit trail
              </a>
            </RecordDetailsSection>
          </>
        ) : null}
      </RecordDetailsDrawer>
    </>
  );
}
