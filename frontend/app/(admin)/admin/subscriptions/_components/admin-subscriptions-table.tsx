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
      <div className="gh-admin-plan-table-wrap gh-admin-deep-table-wrap overflow-x-auto">
        <AdminTable>
          <Thead>
            <Th>Subscriber</Th>
            <Th>Plan</Th>
            <Th>Status</Th>
            <Th>Credits (GP / wellness)</Th>
            <Th align="right">Actions</Th>
          </Thead>
          <tbody>
            {items.map((sub) => (
              <Tr key={sub.id} onClick={() => openQuickView(sub.id)} className="cursor-pointer">
                <Td onClick={(e) => e.stopPropagation()}>
                  <span
                    onClick={() => openQuickView(sub.id)}
                    style={{ cursor: "pointer", display: "block" }}
                  >
                    <span className="block font-semibold text-[var(--color-text-primary)]">
                      {sub.user.fullName ?? sub.user.email}
                    </span>
                    <span className="block text-xs text-[var(--color-text-muted)]">
                      {sub.user.email} · {sub.countryCode.toUpperCase()}
                    </span>
                  </span>
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

      <div className="gh-admin-mobile-list">
        {items.map((sub) => (
          <PortalMobileCard
            key={sub.id}
            tone={statusCardTone(sub.status)}
            title={sub.user.fullName ?? sub.user.email}
            subtitle={`${sub.user.email} - ${sub.countryCode.toUpperCase()}`}
            statusPill={<Pill tone={statusTone(sub.status)}>{sub.status}</Pill>}
            onClick={() => openQuickView(sub.id)}
            meta={[
              { label: "Plan", value: sub.plan.name },
              {
                label: "Balances",
                value: `GP ${balanceOf(sub.balances, "CONSULTATION")} / wellness ${balanceOf(sub.balances, "WELLNESS")}`,
              },
              ...(sub.cancelAtPeriodEnd
                ? [{ label: "Renewal", value: <Pill tone="draft">cancels at period end</Pill> }]
                : []),
            ]}
            actions={repairActions(sub)}
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
            <RecordDetailsSection title="Credits">
              <RecordDetailsField
                label="Consultation balance"
                value={balanceOf(quickViewSub.balances, "CONSULTATION")}
              />
              <RecordDetailsField
                label="Wellness balance"
                value={balanceOf(quickViewSub.balances, "WELLNESS")}
              />
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <AdminSubscriberLedger subscriptionId={quickViewSub.id} />
              </div>
            </RecordDetailsSection>

            <RecordDetailsSection title="Billing linkage">
              <RecordDetailsField label="Plan" value={quickViewSub.plan.name} />
              <RecordDetailsField label="Country" value={quickViewSub.countryCode.toUpperCase()} />
              <RecordDetailsField
                label="Cancels at period end"
                value={quickViewSub.cancelAtPeriodEnd ? "Yes" : "No"}
              />
              <a
                href={`/admin/audit-log?entityType=UserSubscription&entityId=${quickViewSub.id}`}
                className="text-[11px] font-semibold text-[var(--color-brand-primary)] underline-offset-2 hover:underline"
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
