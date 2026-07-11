"use client";

import { ChevronDown, ChevronUp, Edit3, Eye } from "lucide-react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { AdminEmptyState, Btn, IconBtn } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import { FlagBadge } from "../../_components/flag-badge";
import { adminHrefForService } from "@/lib/admin/service-kind";
import type { AdminServiceDto } from "@/lib/admin/admin-api/services";

function formatMoney(cents: number | null, currency: string | null) {
  if (cents === null || cents === undefined) return "—";
  const code = currency?.trim().toUpperCase() || "EUR";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${code} ${(cents / 100).toFixed(2)}`;
  }
}

export function AdminServicesTable({
  items,
  basePath,
  currentQs,
  toggleServiceAction,
  moveRowAction,
  deleteServiceAction,
}: {
  items: AdminServiceDto[];
  basePath: string;
  currentQs: string;
  toggleServiceAction: (formData: FormData) => void;
  moveRowAction: (formData: FormData) => void;
  deleteServiceAction: (formData: FormData) => void;
}) {
  const fields: ColumnPriorityField<AdminServiceDto>[] = [
    {
      key: "name",
      label: "Title",
      priority: 1,
      render: (s) => <span className="font-bold text-[var(--color-text-primary)]">{s.name}</span>,
    },
    {
      key: "slug",
      label: "Slug",
      priority: 3,
      render: (s) => <span className="font-mono text-portal-thead text-[var(--color-text-muted)]">{s.slug}</span>,
    },
    {
      key: "country",
      label: "Country",
      priority: 2,
      render: (s) => (
        <span className="inline-flex items-center gap-2">
          <FlagBadge code={s.country.code} size={14} />
          <span className="text-portal-meta uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            {s.country.code}
          </span>
        </span>
      ),
    },
    {
      key: "price",
      label: "Price",
      priority: 1,
      align: "right",
      render: (s) => (
        <span className="font-bold text-[var(--color-text-primary)]">
          {formatMoney(s.basePriceCents, s.currencyCode)}
        </span>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      priority: 2,
      align: "right",
      render: (s) => (
        <span className="text-[var(--color-text-muted)]">
          {s.durationMinutes != null ? `${s.durationMinutes} min` : "—"}
        </span>
      ),
    },
    {
      key: "doctors",
      label: "Doctors",
      priority: 3,
      align: "right",
      render: (s) => (
        <span className="font-bold text-[var(--color-text-primary)]">
          {s.assignedDoctors.filter((d) => d.isActive).length}
        </span>
      ),
    },
    {
      key: "order",
      label: "Order",
      priority: 3,
      align: "right",
      desktopOnly: true,
      render: (s) => {
        const index = items.findIndex((i) => i.id === s.id);
        const prev = items[index - 1];
        const next = items[index + 1];
        const isFirstInCountry = !prev || prev.countryId !== s.countryId;
        const isLastInCountry = !next || next.countryId !== s.countryId;
        return (
          <div className="flex items-center justify-end gap-1">
            <form action={moveRowAction} className="inline-flex">
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="direction" value="up" />
              <input type="hidden" name="_qs" value={currentQs} />
              <button
                type="submit"
                disabled={isFirstInCountry}
                aria-label={`Move ${s.name} up`}
                className="inline-flex items-center justify-center border-0 bg-transparent p-0.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)] disabled:cursor-default disabled:opacity-35 disabled:hover:text-[var(--color-text-muted)]"
              >
                <ChevronUp className="size-3.5" aria-hidden />
              </button>
            </form>
            <form action={moveRowAction} className="inline-flex">
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="direction" value="down" />
              <input type="hidden" name="_qs" value={currentQs} />
              <button
                type="submit"
                disabled={isLastInCountry}
                aria-label={`Move ${s.name} down`}
                className="inline-flex items-center justify-center border-0 bg-transparent p-0.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)] disabled:cursor-default disabled:opacity-35 disabled:hover:text-[var(--color-text-muted)]"
              >
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            </form>
          </div>
        );
      },
    },
    {
      key: "active",
      label: "Active",
      priority: 1,
      render: (s) => (
        <form action={toggleServiceAction} className="gh-admin-service-toggle-form inline-flex">
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="next" value={s.isActive ? "false" : "true"} />
          <button
            type="submit"
            role="switch"
            aria-checked={s.isActive}
            aria-label={`${s.isActive ? "Deactivate" : "Activate"} ${s.name}`}
            title={s.isActive ? "Active - click to deactivate" : "Inactive - click to activate"}
            className={`gh-admin-status-toggle ${
              s.isActive ? "gh-admin-status-toggle-on" : "gh-admin-status-toggle-off"
            }`}
          >
            <span className="gh-admin-status-toggle__track" aria-hidden>
              <span className="gh-admin-status-toggle__thumb" />
            </span>
            <span className="gh-admin-status-toggle__label">{s.isActive ? "Active" : "Inactive"}</span>
          </button>
        </form>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      align: "right",
      desktopOnly: true,
      render: (s) => (
        <div className="gh-admin-service-row-actions flex justify-end gap-1.5">
          <IconBtn ariaLabel={`View ${s.name}`} href={adminHrefForService(s)}>
            <Eye className="size-3.5" aria-hidden />
          </IconBtn>
          <IconBtn ariaLabel={`Edit ${s.name}`} href={adminHrefForService(s, "edit")}>
            <Edit3 className="size-3.5" aria-hidden />
          </IconBtn>
          <form action={deleteServiceAction} className="inline-flex">
            <input type="hidden" name="id" value={s.id} />
            <ConfirmDeleteButton
              message={`Permanently delete service "${s.name}"? This cannot be undone.`}
              ariaLabel={`Delete ${s.name}`}
            />
          </form>
        </div>
      ),
    },
  ];

  return (
    <ColumnPriorityTable
      fields={fields}
      rows={items}
      getRowKey={(s) => s.id}
      cardTone={(s) => (s.isActive ? "success" : "neutral")}
      emptyState={
        <AdminEmptyState
          assetSrc="/images/portal/obsidian/empty-content.svg"
          title="No services match these filters"
          description="Clear search, market, or status filters to review the full service catalog."
          action={
            <Btn href={basePath} variant="secondary" size="sm">
              Clear filters
            </Btn>
          }
        />
      }
      cardActions={(s) => (
        <span onClick={(ev) => ev.stopPropagation()} className="inline-flex items-center gap-1.5">
          <IconBtn ariaLabel={`View ${s.name}`} href={adminHrefForService(s)}>
            <Eye className="size-3.5" aria-hidden />
          </IconBtn>
          <IconBtn ariaLabel={`Edit ${s.name}`} href={adminHrefForService(s, "edit")}>
            <Edit3 className="size-3.5" aria-hidden />
          </IconBtn>
          <form action={deleteServiceAction} className="inline-flex">
            <input type="hidden" name="id" value={s.id} />
            <ConfirmDeleteButton
              message={`Permanently delete service "${s.name}"? This cannot be undone.`}
              ariaLabel={`Delete ${s.name}`}
            />
          </form>
        </span>
      )}
    />
  );
}
