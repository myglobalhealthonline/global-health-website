"use client";

import { ChevronDown, ChevronUp, Edit3, Eye, FlaskConical } from "lucide-react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { AdminEmptyState, Btn, IconBtn, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import { FlagBadge } from "../../_components/flag-badge";
import type { AdminHealthTestDto } from "@/lib/admin/admin-api/health-tests";
import { displayNameFrom } from "@/lib/admin/display-name";

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

export function AdminHealthTestsTable({
  items,
  currentQs,
  moveRowAction,
  deleteAction,
}: {
  items: AdminHealthTestDto[];
  currentQs: string;
  moveRowAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
}) {
  const fields: ColumnPriorityField<AdminHealthTestDto>[] = [
    {
      key: "title",
      label: "Title",
      priority: 1,
      render: (t) => (
        <span className="font-bold text-[var(--color-text-primary)]">
          {displayNameFrom(t.title, t.translations, "title")}
        </span>
      ),
    },
    {
      key: "slug",
      label: "Slug",
      priority: 3,
      render: (t) => <span className="font-mono text-portal-thead text-[var(--color-text-muted)]">{t.slug}</span>,
    },
    {
      key: "country",
      label: "Country",
      priority: 2,
      render: (t) => (
        <span className="inline-flex items-center gap-2">
          <FlagBadge code={t.country.code} size={14} />
          <span className="text-portal-meta uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            {t.country.code}
          </span>
        </span>
      ),
    },
    {
      key: "price",
      label: "Price",
      priority: 1,
      align: "right",
      render: (t) => (
        <span className="font-bold text-[var(--color-text-primary)]">
          {formatMoney(t.priceCents, t.currencyCode)}
        </span>
      ),
    },
    {
      key: "sample",
      label: "Sample / results",
      priority: 2,
      render: (t) => (
        <span className="text-portal-compact text-[var(--color-text-muted)]">
          {[t.sampleType, t.resultsTimeline].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
    },
    {
      key: "order",
      label: "Order",
      priority: 3,
      align: "right",
      desktopOnly: true,
      render: (t) => {
        const index = items.findIndex((i) => i.id === t.id);
        const prev = items[index - 1];
        const next = items[index + 1];
        const isFirstInCountry = !prev || prev.countryId !== t.countryId;
        const isLastInCountry = !next || next.countryId !== t.countryId;
        return (
          <div className="flex items-center justify-end gap-1">
            <form action={moveRowAction} className="inline-flex">
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="direction" value="up" />
              <input type="hidden" name="_qs" value={currentQs} />
              <button
                type="submit"
                disabled={isFirstInCountry}
                aria-label={`Move ${t.title} up`}
                className="inline-flex items-center justify-center border-0 bg-transparent p-0.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)] disabled:cursor-default disabled:opacity-35 disabled:hover:text-[var(--color-text-muted)]"
              >
                <ChevronUp className="size-3.5" aria-hidden />
              </button>
            </form>
            <form action={moveRowAction} className="inline-flex">
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="direction" value="down" />
              <input type="hidden" name="_qs" value={currentQs} />
              <button
                type="submit"
                disabled={isLastInCountry}
                aria-label={`Move ${t.title} down`}
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
      key: "status",
      label: "Status",
      priority: 1,
      render: (t) => <Pill tone={t.isActive ? "published" : "draft"}>{t.isActive ? "Active" : "Inactive"}</Pill>,
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      align: "right",
      desktopOnly: true,
      render: (t) => (
        <div className="gh-admin-health-actions gh-admin-health-actions--row flex justify-end gap-1.5">
          <IconBtn ariaLabel={`View ${t.title}`} href={`/admin/health-tests/${t.id}`}>
            <Eye className="size-3.5" aria-hidden />
          </IconBtn>
          <IconBtn ariaLabel={`Edit ${t.title}`} href={`/admin/health-tests/${t.id}/edit`}>
            <Edit3 className="size-3.5" aria-hidden />
          </IconBtn>
          <form action={deleteAction} className="inline-flex">
            <input type="hidden" name="id" value={t.id} />
            <ConfirmDeleteButton
              message={`Permanently delete health test "${t.title}"? This cannot be undone.`}
              ariaLabel={`Delete ${t.title}`}
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
      getRowKey={(t) => t.id}
      cardTone={(t) => (t.isActive ? "success" : "neutral")}
      emptyState={
        <AdminEmptyState
          icon={<FlaskConical className="size-8" aria-hidden />}
          title="No health tests match these filters"
          description="Broaden the country or status filters, or add a test with pricing, sample type, and result timing."
          action={
            <Btn href="/admin/health-tests/new" variant="soft" size="sm">
              Add health test
            </Btn>
          }
        />
      }
      cardActions={(t) => (
        <span onClick={(ev) => ev.stopPropagation()} className="inline-flex items-center gap-1.5">
          <IconBtn ariaLabel={`View ${t.title}`} href={`/admin/health-tests/${t.id}`}>
            <Eye className="size-3.5" aria-hidden />
          </IconBtn>
          <IconBtn ariaLabel={`Edit ${t.title}`} href={`/admin/health-tests/${t.id}/edit`}>
            <Edit3 className="size-3.5" aria-hidden />
          </IconBtn>
        </span>
      )}
    />
  );
}
