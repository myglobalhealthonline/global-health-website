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

export function RequestsTable({
  requests,
  cancelRequestAction,
}: {
  requests: CorporatePortalRequestDto[];
  cancelRequestAction: (formData: FormData) => void;
}) {
  const fields: ColumnPriorityField<CorporatePortalRequestDto>[] = [
    {
      key: "employee",
      label: "Employee",
      priority: 1,
      render: (r) => (
        <>
          <span className="font-bold text-[var(--color-text-primary)]">
            {r.employeeName ?? "—"}
          </span>
          {r.reason ? (
            <p className="max-w-[26rem] truncate text-xs text-[var(--color-text-muted)]">
              {r.reason}
            </p>
          ) : null}
        </>
      ),
    },
    {
      key: "type",
      label: "Type",
      priority: 2,
      render: (r) => REQUEST_TYPE_LABELS[r.type] ?? r.type,
    },
    {
      key: "status",
      label: "Status",
      priority: 2,
      render: (r) => <Pill tone={requestStatusTone(r.status)}>{requestStatusLabel(r.status)}</Pill>,
    },
    {
      key: "booked",
      label: "Booked",
      priority: 2,
      render: (r) => (r.hasAppointment ? "✓" : "—"),
    },
    {
      key: "created",
      label: "Created",
      priority: 3,
      render: (r) => (
        <span className="text-[var(--color-text-muted)]">{formatDate(r.createdAt)}</span>
      ),
    },
    {
      key: "expires",
      label: "Expires",
      priority: 4,
      render: (r) => (
        <span className="text-[var(--color-text-muted)]">{formatDate(r.expiresAt)}</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      priority: 2,
      align: "right",
      render: (r) =>
        isRequestCancellable(r.status) && r.status !== "BOOKED" ? (
          <form action={cancelRequestAction}>
            <input type="hidden" name="requestId" value={r.id} />
            <Btn type="submit" variant="ghost" size="sm">
              Cancel
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
          title="No requests"
          description="Create a request to have an employee attend an illness-benefit or fit-for-work consultation."
        />
      }
    />
  );
}
