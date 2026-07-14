"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreVertical, Users } from "lucide-react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import {
  RecordDetailsDrawer,
  RecordDetailsSection,
  RecordDetailsField,
} from "@/components/RecordDetailsDrawer";
import { AppMenu, AppMenuItem } from "@/components/AppMenu";
import { AdminEmptyState, Btn, IconBtn, Pill } from "@/components/portal-atoms";
import { memberStatusLabel, memberStatusTone, formatDate } from "@/app/(admin)/admin/corporate/_lib";
import type { CorporatePortalEmployeeDto, CorporateEmployeeDetailDto } from "@/lib/corporate/corporate-api";

const INVITE_STATUSES = ["DRAFT", "INVITED", "INVITE_SENT", "INVITE_FAILED"];

/** Same row-action forms rendered in both the desktop action cell and the
 *  drawer footer — identical `<form action={employeeRowAction}>` POSTs. */
function EmployeeActionForms({
  employee,
  employeeRowAction,
}: {
  employee: CorporatePortalEmployeeDto;
  employeeRowAction: (formData: FormData) => void;
}) {
  return (
    <>
      {INVITE_STATUSES.includes(employee.status) ? (
        <form action={employeeRowAction}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <input type="hidden" name="action" value="RESEND" />
          <Btn type="submit" variant="ghost" size="sm">
            Resend invite
          </Btn>
        </form>
      ) : null}
      {employee.status === "SUSPENDED" ? (
        <form action={employeeRowAction}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <input type="hidden" name="action" value="REACTIVATE" />
          <Btn type="submit" variant="ghost" size="sm">
            Reactivate
          </Btn>
        </form>
      ) : employee.status !== "REMOVED" ? (
        <form action={employeeRowAction}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <input type="hidden" name="action" value="SUSPEND" />
          <Btn type="submit" variant="ghost" size="sm">
            Suspend
          </Btn>
        </form>
      ) : null}
      {employee.status !== "REMOVED" ? (
        <form action={employeeRowAction}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <input type="hidden" name="action" value="REMOVE" />
          <Btn type="submit" variant="danger" size="sm">
            Remove
          </Btn>
        </form>
      ) : null}
    </>
  );
}

export function EmployeesTable({
  employees,
  employeeRowAction,
  getEmployeeDetail,
}: {
  employees: CorporatePortalEmployeeDto[];
  employeeRowAction: (formData: FormData) => void;
  getEmployeeDetail: (id: string) => Promise<CorporateEmployeeDetailDto | null>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("employee");
  const selected = selectedId ? (employees.find((e) => e.id === selectedId) ?? null) : null;

  const [detail, setDetail] = useState<CorporateEmployeeDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) {
      // Reset is tied to the async fetch below (same effect owns both); a
      // clean derivation would need a bigger data-fetching refactor
      // (cache/suspense) than this lint fix warrants.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEmployeeDetail(selected.id)
      .then((data) => {
        if (cancelled) return;
        if (!data) setError("Could not load employee details");
        else setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load employee details");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const openEmployee = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("employee", id);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const fields: ColumnPriorityField<CorporatePortalEmployeeDto>[] = [
    {
      key: "name",
      label: "Name",
      priority: 1,
      render: (e) => (
        <>
          <Link
            href={`/corporate/employees/${e.id}`}
            className="font-bold text-[var(--color-text-primary)] hover:underline"
            onClick={(ev) => ev.stopPropagation()}
          >
            {e.firstName} {e.lastName}
          </Link>
          {e.jobTitle ? (
            <p className="text-xs text-[var(--color-text-muted)]">{e.jobTitle}</p>
          ) : null}
        </>
      ),
    },
    { key: "email", label: "Email", priority: 2, render: (e) => e.email },
    { key: "department", label: "Department", priority: 2, render: (e) => e.department ?? "—" },
    {
      key: "status",
      label: "Status",
      priority: 2,
      render: (e) => <Pill tone={memberStatusTone(e.status)}>{memberStatusLabel(e.status)}</Pill>,
    },
    {
      key: "beneficiaries",
      label: "Beneficiaries",
      priority: 2,
      align: "right",
      render: (e) => e.beneficiaryCount,
    },
    {
      key: "actions",
      label: "Actions",
      priority: 2,
      align: "right",
      desktopOnly: true,
      render: (e) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <EmployeeActionForms employee={e} employeeRowAction={employeeRowAction} />
        </div>
      ),
    },
  ];

  return (
    <>
      <ColumnPriorityTable
        fields={fields}
        rows={employees}
        getRowKey={(e) => e.id}
        onRowClick={(e) => openEmployee(e.id)}
        emptyState={
          <AdminEmptyState
            icon={<Users className="size-8" aria-hidden />}
            title="No employees yet"
            description="Add employees one by one or paste a list — each gets an invite to join your corporate plan."
          />
        }
        cardActions={(e) => (
          <span onClick={(ev) => ev.stopPropagation()}>
            <AppMenu
              trigger={
                <IconBtn ariaLabel="Employee actions" type="button">
                  <MoreVertical className="size-4" aria-hidden />
                </IconBtn>
              }
            >
              <AppMenuItem asChild>
                <button
                  type="button"
                  className="gh-portal-menu-item"
                  onClick={() => openEmployee(e.id)}
                >
                  View details
                </button>
              </AppMenuItem>
              {INVITE_STATUSES.includes(e.status) ? (
                <form action={employeeRowAction}>
                  <input type="hidden" name="employeeId" value={e.id} />
                  <input type="hidden" name="action" value="RESEND" />
                  <AppMenuItem asChild>
                    <button type="submit" className="gh-portal-menu-item">
                      Resend invite
                    </button>
                  </AppMenuItem>
                </form>
              ) : null}
              {e.status === "SUSPENDED" ? (
                <form action={employeeRowAction}>
                  <input type="hidden" name="employeeId" value={e.id} />
                  <input type="hidden" name="action" value="REACTIVATE" />
                  <AppMenuItem asChild>
                    <button type="submit" className="gh-portal-menu-item">
                      Reactivate
                    </button>
                  </AppMenuItem>
                </form>
              ) : e.status !== "REMOVED" ? (
                <form action={employeeRowAction}>
                  <input type="hidden" name="employeeId" value={e.id} />
                  <input type="hidden" name="action" value="SUSPEND" />
                  <AppMenuItem asChild>
                    <button type="submit" className="gh-portal-menu-item">
                      Suspend
                    </button>
                  </AppMenuItem>
                </form>
              ) : null}
              {e.status !== "REMOVED" ? (
                <form action={employeeRowAction}>
                  <input type="hidden" name="employeeId" value={e.id} />
                  <input type="hidden" name="action" value="REMOVE" />
                  <AppMenuItem asChild>
                    <button type="submit" className="gh-portal-menu-item text-red-600">
                      Remove
                    </button>
                  </AppMenuItem>
                </form>
              ) : null}
            </AppMenu>
          </span>
        )}
      />

      <RecordDetailsDrawer
        open={!!selected}
        onOpenChange={() => {
          // Open state is derived from the `?employee=` URL param above;
          // RecordDetailsDrawer itself clears the param on close (paramKey).
        }}
        paramKey="employee"
        paramValue={selected?.id}
        eyebrow="Employee"
        title={selected ? `${selected.firstName} ${selected.lastName}` : ""}
        summary={
          selected ? (
            <>
              <span>{selected.email}</span>
              <Pill tone={memberStatusTone(selected.status)}>
                {memberStatusLabel(selected.status)}
              </Pill>
            </>
          ) : null
        }
        loading={loading}
        error={error}
        onRetry={selected ? () => openEmployee(selected.id) : undefined}
        footer={
          selected ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <EmployeeActionForms employee={selected} employeeRowAction={employeeRowAction} />
            </div>
          ) : null
        }
      >
        {selected && detail ? (
          <>
            <RecordDetailsSection title="Invitation">
              {detail.invites.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No invites sent yet.</p>
              ) : (
                detail.invites.map((invite, i) => (
                  <div key={i}>
                    <RecordDetailsField label="Sent" value={formatDate(invite.createdAt)} />
                    <RecordDetailsField
                      label="Status"
                      value={
                        invite.usedAt
                          ? `Accepted ${formatDate(invite.usedAt)}`
                          : [
                              invite.emailSentAt ? "email delivered" : "email pending",
                              invite.whatsappSentAt ? "WhatsApp delivered" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")
                      }
                    />
                  </div>
                ))
              )}
            </RecordDetailsSection>
            <RecordDetailsSection title="Beneficiaries">
              <RecordDetailsField
                label="Count"
                value={`${detail.beneficiaryCount} beneficiar${detail.beneficiaryCount === 1 ? "y" : "ies"}`}
              />
            </RecordDetailsSection>
            <RecordDetailsSection title="Department">
              <RecordDetailsField label="Department" value={detail.department} />
              <RecordDetailsField label="Job title" value={detail.jobTitle} />
              <RecordDetailsField label="Employee code" value={detail.employeeCode} />
            </RecordDetailsSection>
          </>
        ) : null}
      </RecordDetailsDrawer>
    </>
  );
}
