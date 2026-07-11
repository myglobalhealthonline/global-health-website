"use client";

import { Edit3, Eye, Globe2 } from "lucide-react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { AdminEmptyState, Btn, IconBtn, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import { FlagBadge } from "../../_components/flag-badge";
import type { AdminCountryDto } from "@/lib/admin/admin-api/countries";

export function AdminCountriesTable({
  rows,
  deleteCountryAction,
}: {
  rows: AdminCountryDto[];
  deleteCountryAction: (formData: FormData) => void;
}) {
  const fields: ColumnPriorityField<AdminCountryDto>[] = [
    {
      key: "country",
      label: "Country",
      priority: 1,
      render: (c) => (
        <span className="inline-flex items-center gap-2.5">
          <FlagBadge code={c.slug} size={18} />
          <span className="font-bold text-[var(--color-text-primary)]">{c.name}</span>
        </span>
      ),
    },
    {
      key: "code",
      label: "Code",
      priority: 2,
      render: (c) => <span className="font-mono text-portal-meta text-[var(--color-text-body)]">{c.code.toUpperCase()}</span>,
    },
    {
      key: "locale",
      label: "Locale",
      priority: 3,
      render: (c) => <span className="text-[var(--color-text-muted)]">{c.defaultLocale}</span>,
    },
    {
      key: "currency",
      label: "Currency",
      priority: 2,
      render: (c) => <span className="font-mono text-portal-meta text-[var(--color-text-body)]">{c.currency.code}</span>,
    },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (c) => <Pill tone={c.isActive ? "published" : "inactive"}>{c.isActive ? "Active" : "Inactive"}</Pill>,
    },
    {
      key: "keyRoutes",
      label: "Key routes",
      priority: 3,
      render: (c) => (
        <div className="max-w-[14rem]">
          <div className="truncate font-mono text-portal-thead text-[var(--color-text-muted)]">{c.legacyHomePath}</div>
          <div className="truncate font-mono text-portal-thead text-[var(--color-text-muted)] opacity-70">{c.teamPath}</div>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      align: "right",
      desktopOnly: true,
      render: (c) => (
        <div className="gh-admin-country-row-actions flex justify-end gap-1.5">
          <IconBtn ariaLabel={`View ${c.name}`} href={`/admin/countries/${c.id}`}>
            <Eye className="size-3.5" aria-hidden />
          </IconBtn>
          <IconBtn ariaLabel={`Edit ${c.name}`} href={`/admin/countries/${c.id}/edit`}>
            <Edit3 className="size-3.5" aria-hidden />
          </IconBtn>
          <form action={deleteCountryAction} className="inline-flex">
            <input type="hidden" name="id" value={c.id} />
            <ConfirmDeleteButton
              title={`Delete ${c.name}?`}
              message={`Delete ${c.name}? This deactivates the country and cannot be undone from this action.`}
              ariaLabel={`Delete ${c.name}`}
              requireTypedConfirmation={c.slug}
            />
          </form>
        </div>
      ),
    },
  ];

  return (
    <ColumnPriorityTable
      fields={fields}
      rows={rows}
      getRowKey={(c) => c.id}
      cardTone={(c) => (c.isActive ? "success" : "neutral")}
      emptyState={
        <AdminEmptyState
          icon={<Globe2 className="size-8" aria-hidden />}
          title="No markets configured"
          description="Create a country to unlock localized services, doctors, legal pages, currencies, and booking routes."
          action={
            <Btn href="/admin/countries/new" variant="soft" size="sm">
              Add country
            </Btn>
          }
        />
      }
      cardActions={(c) => (
        <span onClick={(ev) => ev.stopPropagation()} className="inline-flex items-center gap-1.5">
          <IconBtn ariaLabel={`View ${c.name}`} href={`/admin/countries/${c.id}`}>
            <Eye className="size-3.5" aria-hidden />
          </IconBtn>
          <IconBtn ariaLabel={`Edit ${c.name}`} href={`/admin/countries/${c.id}/edit`}>
            <Edit3 className="size-3.5" aria-hidden />
          </IconBtn>
        </span>
      )}
    />
  );
}
