"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { AppMenu, AppMenuItem } from "@/components/AppMenu";
import { IconBtn, Pill } from "../../_components/atoms";
import type { MembershipEnrollment, MembershipEnrollmentStatus } from "@/lib/admin/memberships-api";

const STATUS_TONE: Record<
  MembershipEnrollmentStatus,
  "active" | "inactive" | "pending" | "brand" | "neutral"
> = {
  ACTIVE: "active",
  PENDING: "brand",
  SUSPENDED: "pending",
  EXPIRED: "neutral",
  REMOVED: "inactive",
};

const STATUS_LABEL: Record<MembershipEnrollmentStatus, string> = {
  ACTIVE: "Active",
  PENDING: "Awaiting sign-in",
  SUSPENDED: "Suspended",
  EXPIRED: "Expired",
  REMOVED: "Removed",
};

function formatDay(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * The plan's member list (§9.2), as a `ColumnPriorityTable` config so the
 * desktop table and the mobile cards come from one source.
 *
 * Row actions are `<form>` POSTs to one server action, so they work with
 * JavaScript disabled and need no client state — the same shape the corporate
 * employees table already uses.
 */
export function MembershipMemberTable({
  enrollments,
  planId,
  rowAction,
}: {
  enrollments: MembershipEnrollment[];
  planId: string;
  rowAction: (formData: FormData) => void;
}) {
  const fields: ColumnPriorityField<MembershipEnrollment>[] = [
    {
      key: "name",
      label: "Member",
      priority: 1,
      cardPrimary: true,
      render: (row) => (
        <div className="flex flex-col">
          <Link
            href={`/admin/memberships/${planId}/members/${row.id}`}
            className="font-semibold text-[var(--color-text-primary)] hover:underline"
          >
            {row.firstName} {row.lastName}
          </Link>
          <span className="text-xs text-[var(--color-text-muted)]">
            {row.memberType === "DEPENDENT" ? "Dependent" : row.level.name}
          </span>
        </div>
      ),
    },
    {
      key: "membershipId",
      label: "Membership ID",
      priority: 1,
      render: (row) => <span className="font-mono text-portal-compact">{row.membershipId}</span>,
    },
    { key: "email", label: "Email", priority: 2, render: (row) => row.email },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (row) => <Pill tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Pill>,
    },
    {
      key: "term",
      label: "Term",
      priority: 3,
      render: (row) => `${formatDay(row.startDate)} → ${row.endDate ? formatDay(row.endDate) : "open"}`,
    },
    {
      key: "account",
      label: "Account",
      priority: 4,
      render: (row) =>
        row.userId ? (
          // "Linked" here means a verified account claimed it — the only state
          // in which benefits apply (§5.2).
          <span className="text-portal-compact">Linked {formatDay(row.linkedAt)}</span>
        ) : (
          <span className="text-portal-compact text-[var(--color-text-muted)]">Not linked yet</span>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      render: (row) => (
        <AppMenu
          contentClassName="gh-portal-menu-content"
          trigger={
            <IconBtn ariaLabel={`Actions for ${row.firstName} ${row.lastName}`} type="button">
              <MoreVertical className="size-4" aria-hidden />
            </IconBtn>
          }
        >
          <AppMenuItem asChild>
            <Link
              href={`/admin/memberships/${planId}/members/${row.id}`}
              className="gh-portal-menu-item"
            >
              View member
            </Link>
          </AppMenuItem>
          {row.status !== "REMOVED" ? (
            <form action={rowAction}>
              <input type="hidden" name="enrollmentId" value={row.id} />
              <input type="hidden" name="action" value="INVITE" />
              <AppMenuItem asChild>
                <button type="submit" className="gh-portal-menu-item">
                  Send invite email
                </button>
              </AppMenuItem>
            </form>
          ) : null}
          {row.status === "SUSPENDED" ? (
            <form action={rowAction}>
              <input type="hidden" name="enrollmentId" value={row.id} />
              <input type="hidden" name="action" value="REACTIVATE" />
              <AppMenuItem asChild>
                <button type="submit" className="gh-portal-menu-item">
                  Reactivate
                </button>
              </AppMenuItem>
            </form>
          ) : null}
          {row.status !== "SUSPENDED" && row.status !== "REMOVED" ? (
            <form action={rowAction}>
              <input type="hidden" name="enrollmentId" value={row.id} />
              <input type="hidden" name="action" value="SUSPEND" />
              <AppMenuItem asChild>
                <button type="submit" className="gh-portal-menu-item">
                  Suspend
                </button>
              </AppMenuItem>
            </form>
          ) : null}
          {row.status !== "REMOVED" ? (
            <form action={rowAction}>
              <input type="hidden" name="enrollmentId" value={row.id} />
              <input type="hidden" name="action" value="REMOVE" />
              <AppMenuItem asChild>
                <button
                  type="submit"
                  className="gh-portal-menu-item text-[var(--color-status-error-text)]"
                >
                  Remove
                </button>
              </AppMenuItem>
            </form>
          ) : null}
        </AppMenu>
      ),
    },
  ];

  return (
    <ColumnPriorityTable
      fields={fields}
      rows={enrollments}
      getRowKey={(row) => row.id}
      cardTone={(row) => (row.status === "ACTIVE" ? "success" : "neutral")}
    />
  );
}
