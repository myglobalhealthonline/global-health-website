"use client";

import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { AdminEmptyState, Btn, Pill } from "@/components/portal-atoms";
import { ClipboardList } from "lucide-react";
import {
  formatDate,
  isRequestCancellable,
  requestStatusLabel,
  requestStatusTone,
  REQUEST_TYPE_LABELS,
} from "@/app/(admin)/admin/corporate/_lib";
import type { CorporatePortalRequestDto } from "@/lib/corporate/corporate-api";
import type { loadLocaleBundle } from "@/lib/i18n/load-locale";

type RequestsTableLocale = ReturnType<typeof loadLocaleBundle>["corporate"]["requests"]["table"];

export function RequestsTable({
  requests,
  cancelRequestAction,
  t,
}: {
  requests: CorporatePortalRequestDto[];
  cancelRequestAction: (formData: FormData) => void;
  t: RequestsTableLocale;
}) {
  const fields: ColumnPriorityField<CorporatePortalRequestDto>[] = [
    {
      key: "employee",
      label: t.colEmployee,
      priority: 1,
      render: (r) => (
        <>
          <span className="font-bold text-[var(--color-text-primary)]">
            {r.employeeName ?? "—"}
          </span>
          {r.reason ? (
            <p className="max-w-[26rem] truncate text-xs text-[var(--color-text-muted)]" title={r.reason}>
              {r.reason}
            </p>
          ) : null}
        </>
      ),
    },
    {
      key: "type",
      label: t.colType,
      priority: 2,
      render: (r) => REQUEST_TYPE_LABELS[r.type] ?? r.type,
    },
    {
      key: "status",
      label: t.colStatus,
      priority: 2,
      render: (r) => <Pill tone={requestStatusTone(r.status)}>{requestStatusLabel(r.status)}</Pill>,
    },
    {
      key: "booked",
      label: t.colBooked,
      priority: 2,
      render: (r) => (r.hasAppointment ? "✓" : "—"),
    },
    {
      key: "created",
      label: t.colCreated,
      priority: 3,
      render: (r) => (
        <span className="text-[var(--color-text-muted)]">{formatDate(r.createdAt)}</span>
      ),
    },
    {
      key: "expires",
      label: t.colExpires,
      priority: 4,
      render: (r) => (
        <span className="text-[var(--color-text-muted)]">{formatDate(r.expiresAt)}</span>
      ),
    },
    {
      key: "actions",
      label: t.colActions,
      priority: 2,
      align: "right",
      render: (r) =>
        isRequestCancellable(r.status) && r.status !== "BOOKED" ? (
          <form action={cancelRequestAction}>
            <input type="hidden" name="requestId" value={r.id} />
            <Btn type="submit" variant="ghost" size="sm">
              {t.cancel}
            </Btn>
          </form>
        ) : null,
    },
  ];

  return (
    <ColumnPriorityTable
      fields={fields}
      rows={requests}
      getRowKey={(r) => r.id}
      emptyState={
        <AdminEmptyState
          icon={<ClipboardList className="size-8" aria-hidden />}
          title={t.emptyTitle}
          description={t.emptyDescription}
        />
      }
    />
  );
}
