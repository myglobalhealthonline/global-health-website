"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { Btn, IconBtn, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import type { AdminPlanListItem } from "@/lib/admin/plans-api";

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

export function AdminPlansTable({
  plans,
  countryId,
  movePlanAction,
  deactivatePlanAction,
}: {
  plans: AdminPlanListItem[];
  countryId: string;
  movePlanAction: (formData: FormData) => void;
  deactivatePlanAction: (formData: FormData) => void;
}) {
  const fields: ColumnPriorityField<AdminPlanListItem>[] = [
    {
      key: "plan",
      label: "Plan",
      priority: 1,
      render: (plan) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--color-text-primary)]">
            {plan.name}
            {plan.isFeatured ? (
              <span className="ml-2 align-middle">
                <Pill tone="brand">{plan.badgeLabel ?? "Featured"}</Pill>
              </span>
            ) : null}
          </span>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">{plan.slug}</span>
        </div>
      ),
    },
    {
      key: "price",
      label: "Price / mo",
      priority: 1,
      render: (plan) => formatMoney(plan.monthlyPriceCents, plan.currencyCode),
    },
    {
      key: "credits",
      label: "Credits (GP / wellness)",
      priority: 2,
      render: (plan) => `${plan.monthlyConsultationCredits} / ${plan.wellnessCreditsPerMonth}`,
    },
    {
      key: "setup",
      label: "What's set up",
      priority: 3,
      render: (plan) => (
        <span className="text-[13px] text-[var(--color-text-muted)]">
          {plan._count.consultationRules} visits · {plan._count.perkRules} perks
          {plan._count.healthTestRules > 0 ? ` · ${plan._count.healthTestRules} kits` : ""}
        </span>
      ),
    },
    {
      key: "subscribers",
      label: "Subscribers",
      priority: 2,
      render: (plan) => plan._count.subscriptions,
    },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (plan) => (plan.isActive ? <Pill tone="active">Active</Pill> : <Pill tone="inactive">Inactive</Pill>),
    },
    {
      key: "order",
      label: "Order",
      priority: 3,
      desktopOnly: true,
      render: (plan) => {
        const index = plans.findIndex((p) => p.id === plan.id);
        return (
          <div className="flex items-center gap-1">
            <form action={movePlanAction}>
              <input type="hidden" name="id" value={plan.id} />
              <input type="hidden" name="direction" value="up" />
              <input type="hidden" name="countryId" value={countryId} />
              <IconBtn type="submit" ariaLabel={`Move ${plan.name} up`} disabled={index === 0}>
                <ChevronUp className="size-4" />
              </IconBtn>
            </form>
            <form action={movePlanAction}>
              <input type="hidden" name="id" value={plan.id} />
              <input type="hidden" name="direction" value="down" />
              <input type="hidden" name="countryId" value={countryId} />
              <IconBtn type="submit" ariaLabel={`Move ${plan.name} down`} disabled={index === plans.length - 1}>
                <ChevronDown className="size-4" />
              </IconBtn>
            </form>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      desktopOnly: true,
      render: (plan) => (
        <div className="gh-admin-plan-row-actions flex items-center gap-3">
          <Link
            href={`/admin/plans/${plan.id}/edit`}
            className="text-[13px] font-semibold text-[var(--color-brand-primary)] hover:underline"
          >
            Edit
          </Link>
          {plan.isActive ? (
            <form action={deactivatePlanAction}>
              <input type="hidden" name="id" value={plan.id} />
              <ConfirmDeleteButton
                message={`Deactivate "${plan.name}"? Existing subscribers keep their plan; it just hides from new signups.`}
                className="text-[13px] font-semibold text-[var(--color-status-error-text)] hover:underline"
              >
                Deactivate
              </ConfirmDeleteButton>
            </form>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <ColumnPriorityTable
      fields={fields}
      rows={plans}
      getRowKey={(plan) => plan.id}
      cardTone={(plan) => (plan.isActive ? "success" : "neutral")}
      cardActions={(plan) => {
        const index = plans.findIndex((p) => p.id === plan.id);
        return (
          <div className="flex items-center gap-2" onClick={(ev) => ev.stopPropagation()}>
            <form action={movePlanAction}>
              <input type="hidden" name="id" value={plan.id} />
              <input type="hidden" name="direction" value="up" />
              <input type="hidden" name="countryId" value={countryId} />
              <IconBtn type="submit" ariaLabel={`Move ${plan.name} up`} disabled={index === 0}>
                <ChevronUp className="size-4" />
              </IconBtn>
            </form>
            <form action={movePlanAction}>
              <input type="hidden" name="id" value={plan.id} />
              <input type="hidden" name="direction" value="down" />
              <input type="hidden" name="countryId" value={countryId} />
              <IconBtn type="submit" ariaLabel={`Move ${plan.name} down`} disabled={index === plans.length - 1}>
                <ChevronDown className="size-4" />
              </IconBtn>
            </form>
            <Btn href={`/admin/plans/${plan.id}/edit`} variant="soft" size="sm">
              Edit plan
            </Btn>
          </div>
        );
      }}
    />
  );
}
