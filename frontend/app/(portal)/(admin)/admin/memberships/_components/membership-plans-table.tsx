"use client";

import Link from "next/link";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { Btn, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import type { MembershipPlanListItem } from "@/lib/admin/memberships-api";
import { displayNameFrom } from "@/lib/admin/display-name";

export function MembershipPlansTable({
  plans,
  deactivatePlanAction,
}: {
  plans: MembershipPlanListItem[];
  deactivatePlanAction: (formData: FormData) => void;
}) {
  const fields: ColumnPriorityField<MembershipPlanListItem>[] = [
    {
      key: "plan",
      label: "Programme",
      priority: 1,
      cardPrimary: true,
      render: (plan) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--color-text-primary)]">
            {displayNameFrom(plan.name, plan.translations)}
          </span>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">{plan.slug}</span>
        </div>
      ),
    },
    {
      key: "payer",
      label: "Payer",
      cardLabel: "Payer",
      priority: 3,
      render: (plan) => (
        <span className="text-portal-compact text-[var(--color-text-muted)]">
          {plan.payerName ?? "—"}
        </span>
      ),
    },
    {
      key: "levels",
      label: "Levels",
      priority: 2,
      render: (plan) => plan._count.levels,
    },
    {
      key: "members",
      label: "Members",
      priority: 2,
      render: (plan) => plan._count.enrollments,
    },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (plan) =>
        plan.isActive ? <Pill tone="active">Active</Pill> : <Pill tone="inactive">Inactive</Pill>,
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      desktopOnly: true,
      render: (plan) => (
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/memberships/${plan.id}`}
            className="text-portal-compact font-semibold text-[var(--color-brand-primary)] hover:underline"
          >
            Open
          </Link>
          {plan.isActive ? (
            <form action={deactivatePlanAction}>
              <input type="hidden" name="id" value={plan.id} />
              <ConfirmDeleteButton
                message={`Deactivate "${plan.name}"? Members keep their enrollment and their history; the programme just stops applying to new bookings.`}
                className="text-portal-compact font-semibold text-[var(--color-status-error-text)] hover:underline"
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
      cardActions={(plan) => (
        <div className="flex items-center gap-2" onClick={(ev) => ev.stopPropagation()}>
          <Btn href={`/admin/memberships/${plan.id}`} variant="soft" size="sm">
            Open
          </Btn>
        </div>
      )}
    />
  );
}
