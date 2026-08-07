"use client";

import { useState } from "react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { PortalDialog } from "@/components/PortalDialog";
import { Btn, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import {
  KIND_LABEL,
  MembershipBenefitFields,
  money,
  type ServiceOption,
} from "./membership-benefit-fields";
import type { MembershipBenefit } from "@/lib/admin/memberships-api";

export type { ServiceOption } from "./membership-benefit-fields";

function describeValue(benefit: MembershipBenefit): string {
  switch (benefit.benefitType) {
    case "ALLOWANCE":
      return `${benefit.allowanceCount ?? 0} included`;
    case "PERCENT":
      return `${benefit.percentOff ?? 0}% off`;
    case "FIXED":
      return benefit.fixedPriceCents == null
        ? "—"
        : money(benefit.fixedPriceCents, benefit.service?.currencyCode ?? null);
    case "EXCLUDED":
      return "No benefit";
    default:
      return "—";
  }
}

function describeFallback(benefit: MembershipBenefit): string {
  if (benefit.benefitType !== "ALLOWANCE" || benefit.fallbackType === "NONE") return "—";
  if (benefit.fallbackType === "PERCENT") return `then ${benefit.fallbackPercent ?? 0}% off`;
  return benefit.fallbackFixedCents == null
    ? "—"
    : `then ${money(benefit.fallbackFixedCents, benefit.service?.currencyCode ?? null)}`;
}

/**
 * The level's benefit rows plus the add form (§9.1).
 *
 * Editing opens a dialog rather than turning the row into inputs: the value
 * fields depend on the chosen type, and this table renders as cards below the
 * table breakpoint where there is no row to expand. Both the dialog and the add
 * form render the same `MembershipBenefitFields`, so they post identical field
 * names and cannot drift.
 *
 * Editing exists because the alternative — remove then re-add — leaves the level
 * without that benefit in between. An admin interrupted mid-way silently drops
 * every member on the level to list price, with no error and no empty state to
 * notice.
 */
export function MembershipBenefitTable({
  benefits,
  services,
  createBenefitAction,
  updateBenefitAction,
  deleteBenefitAction,
}: {
  benefits: MembershipBenefit[];
  services: ServiceOption[];
  createBenefitAction: (formData: FormData) => void;
  updateBenefitAction: (formData: FormData) => void;
  deleteBenefitAction: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState<MembershipBenefit | null>(null);

  const fields: ColumnPriorityField<MembershipBenefit>[] = [
    {
      key: "target",
      label: "Applies to",
      priority: 1,
      cardPrimary: true,
      render: (benefit) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--color-text-primary)]">
            {benefit.service
              ? benefit.service.name
              : (KIND_LABEL[benefit.serviceKind ?? ""] ?? benefit.serviceKind ?? "—")}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {benefit.service ? "This service only" : "Every service of this type"}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      priority: 2,
      render: (benefit) => benefit.benefitType.toLowerCase(),
    },
    {
      key: "value",
      label: "Member gets",
      priority: 1,
      render: (benefit) => describeValue(benefit),
    },
    {
      key: "fallback",
      label: "After the allowance",
      cardLabel: "After the allowance",
      priority: 3,
      render: (benefit) => describeFallback(benefit),
    },
    {
      key: "status",
      label: "Status",
      priority: 2,
      render: (benefit) =>
        benefit.isActive ? <Pill tone="active">Active</Pill> : <Pill tone="inactive">Inactive</Pill>,
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      render: (benefit) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(benefit)}
            className="text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            Edit
          </button>
          <form action={deleteBenefitAction}>
            <input type="hidden" name="benefitId" value={benefit.id} />
            <ConfirmDeleteButton
              message="Remove this benefit? Bookings already made keep the price they were charged."
              className="text-portal-compact font-semibold text-[var(--color-status-error-text)] hover:underline"
            >
              Remove
            </ConfirmDeleteButton>
          </form>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {benefits.length > 0 ? (
        <ColumnPriorityTable
          fields={fields}
          rows={benefits}
          getRowKey={(benefit) => benefit.id}
          cardTone={(benefit) => (benefit.isActive ? "success" : "neutral")}
        />
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">
          No benefits yet. Until you add one, this level gives members nothing.
        </p>
      )}

      <PortalDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit benefit"
        width="lg"
      >
        {editing ? (
          // Remounts per row, so the fields re-read their prefill instead of
          // keeping the previously-opened row's state.
          <form key={editing.id} action={updateBenefitAction} className="flex flex-col gap-4">
            <input type="hidden" name="benefitId" value={editing.id} />
            <MembershipBenefitFields services={services} benefit={editing} />
            <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
              <Btn type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Btn>
              <Btn type="submit">Save benefit</Btn>
            </div>
          </form>
        ) : null}
      </PortalDialog>

      <form action={createBenefitAction} className="flex flex-col gap-4 border-t border-[var(--color-border)] pt-6">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Add a benefit</h4>
        <MembershipBenefitFields services={services} />
        <div className="flex justify-end">
          <Btn type="submit">Add benefit</Btn>
        </div>
      </form>
    </div>
  );
}
