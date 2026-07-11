"use client";

import { Edit3, Eye, ImageIcon } from "lucide-react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { AdminEmptyState, Btn, IconBtn, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import { FlagBadge } from "../../_components/flag-badge";
import type { AdminAssetDto } from "@/lib/admin/admin-api";
import { adminAssetPreviewable, type AdminAssetKind } from "@/lib/admin/asset-preview";

function PreviewCell({ item }: { item: AdminAssetDto }) {
  const ok = adminAssetPreviewable(item.kind as AdminAssetKind, item.path);
  if (!ok) {
    return <span className="text-[var(--color-text-muted)]">—</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.path}
      alt={item.altText ?? ""}
      className="max-h-10 max-w-[100px] rounded border border-[var(--color-border)] object-contain"
      loading="lazy"
    />
  );
}

export function AdminAssetsTable({
  items,
  deleteAssetAction,
}: {
  items: AdminAssetDto[];
  deleteAssetAction: (formData: FormData) => void;
}) {
  const fields: ColumnPriorityField<AdminAssetDto>[] = [
    {
      key: "preview",
      label: "Preview",
      priority: 1,
      render: (a) => <PreviewCell item={a} />,
    },
    {
      key: "key",
      label: "Key",
      priority: 1,
      render: (a) => (
        <span className="font-mono text-[11px] text-[var(--color-text-primary)]">{a.key}</span>
      ),
    },
    {
      key: "kind",
      label: "Kind",
      priority: 2,
      render: (a) => (
        <span className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          {a.kind}
        </span>
      ),
    },
    {
      key: "country",
      label: "Country",
      priority: 2,
      render: (a) =>
        a.country ? (
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={a.country.code} size={14} />
            <span className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              {a.country.code}
            </span>
          </span>
        ) : (
          <span className="text-[var(--color-text-placeholder)]">—</span>
        ),
    },
    {
      key: "alt",
      label: "Alt",
      priority: 3,
      render: (a) => (
        <span className="block max-w-[12rem] truncate text-[13px] text-[var(--color-text-muted)]">
          {a.altText ?? "—"}
        </span>
      ),
    },
    {
      key: "usage",
      label: "Usage",
      priority: 3,
      render: (a) => (
        <span className="block max-w-[14rem] truncate text-[13px] text-[var(--color-text-muted)]">
          {a.usageNote ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (a) => <Pill tone={a.isActive ? "published" : "draft"}>{a.isActive ? "Active" : "Inactive"}</Pill>,
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      align: "right",
      desktopOnly: true,
      render: (a) => (
        <div className="gh-admin-asset-row-actions flex justify-end gap-1.5">
          <IconBtn ariaLabel={`View ${a.key}`} href={`/admin/assets/${a.id}`}>
            <Eye className="size-3.5" aria-hidden />
          </IconBtn>
          <IconBtn ariaLabel={`Edit ${a.key}`} href={`/admin/assets/${a.id}/edit`}>
            <Edit3 className="size-3.5" aria-hidden />
          </IconBtn>
          <form action={deleteAssetAction} className="inline-flex">
            <input type="hidden" name="id" value={a.id} />
            <ConfirmDeleteButton
              message={`Permanently delete asset "${a.key}"? This cannot be undone.`}
              ariaLabel={`Delete ${a.key}`}
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
      getRowKey={(a) => a.id}
      cardTone={(a) => (a.isActive ? "success" : "neutral")}
      emptyState={
        <AdminEmptyState
          icon={<ImageIcon className="size-8" aria-hidden />}
          title="No assets match these filters"
          description="Clear the current filters or add a scoped asset for country heroes, logos, badges, and social previews."
          action={
            <Btn href="/admin/assets/new" variant="soft" size="sm">
              Add asset
            </Btn>
          }
        />
      }
      cardActions={(a) => (
        <span onClick={(ev) => ev.stopPropagation()} className="inline-flex items-center gap-1.5">
          <IconBtn ariaLabel={`View ${a.key}`} href={`/admin/assets/${a.id}`}>
            <Eye className="size-3.5" aria-hidden />
          </IconBtn>
          <IconBtn ariaLabel={`Edit ${a.key}`} href={`/admin/assets/${a.id}/edit`}>
            <Edit3 className="size-3.5" aria-hidden />
          </IconBtn>
        </span>
      )}
    />
  );
}
