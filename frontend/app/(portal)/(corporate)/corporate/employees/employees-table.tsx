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
import { memberStatusLabel, memberStatusTone, formatDate } from "@/app/(portal)/(admin)/admin/corporate/_lib";
import type { CorporatePortalEmployeeDto, CorporateEmployeeDetailDto } from "@/lib/corporate/corporate-api";
import type { loadLocaleBundle } from "@/lib/i18n/load-locale";

type EmployeesTableLocale = ReturnType<typeof loadLocaleBundle>["corporate"]["employees"]["table"];

const INVITE_STATUSES = ["DRAFT", "INVITED", "INVITE_SENT", "INVITE_FAILED"];

/** Statuses the backend's employee transition table actually allows SUSPEND
 *  from. Rendering the button anywhere else guaranteed the "Only active
 *  members can be suspended" refusal. Keep in sync with EMPLOYEE_TRANSITIONS
 *  in backend/src/modules/corporate/corporate-shared.ts. */
const SUSPENDABLE_STATUSES = [
  "REGISTERED",
  "PROFILE_INCOMPLETE",
  "PROFILE_COMPLETE",
  "PREASSESSMENT_PENDING",
  "PREASSESSMENT_BOOKED",
  "ACTIVE",
];

/** Same row-action forms rendered in both the desktop action cell and the
 *  drawer footer — identical `<form action={employeeRowAction}>` POSTs. */
function EmployeeActionForms({
  employee,
  employeeRowAction,
  t,
}: {
  employee: CorporatePortalEmployeeDto;
  employeeRowAction: (formData: FormData) => void;
  t: EmployeesTableLocale;
}) {
  return (
    <>
      {INVITE_STATUSES.includes(employee.status) ? (
        <form action={employeeRowAction}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <input type="hidden" name="action" value="RESEND" />
          <Btn type="submit" variant="ghost" size="sm">
            {t.resendInvite}
          </Btn>
        </form>
      ) : null}
      {employee.status === "SUSPENDED" ? (
        <form action={employeeRowAction}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <input type="hidden" name="action" value="REACTIVATE" />
          <Btn type="submit" variant="ghost" size="sm">
            {t.reactivate}
          </Btn>
        </form>
      ) : SUSPENDABLE_STATUSES.includes(employee.status) ? (
        <form action={employeeRowAction}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <input type="hidden" name="action" value="SUSPEND" />
          <Btn type="submit" variant="ghost" size="sm">
            {t.suspend}
          </Btn>
        </form>
      ) : null}
      {employee.status !== "REMOVED" ? (
        <form action={employeeRowAction}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <input type="hidden" name="action" value="REMOVE" />
          <Btn type="submit" variant="danger" size="sm">
            {t.remove}
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
  t,
}: {
  employees: CorporatePortalEmployeeDto[];
  employeeRowAction: (formData: FormData) => void;
  getEmployeeDetail: (id: string) => Promise<CorporateEmployeeDetailDto | null>;
  t: EmployeesTableLocale;
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
        if (!data) setError(t.detailLoadError);
        else setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setError(t.detailLoadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  /** URL the quick-view drawer opens at - `?employee=<id>` on top of whatever
   *  filters are already in the query. Open state is derived from this param
   *  (`selectedId` above), so it is a real destination and can be linked to. */
  const quickViewHref = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("employee", id);
      return `${pathname}?${next.toString()}`;
    },
    [pathname, searchParams],
  );

  const openEmployee = useCallback(
    (id: string) => {
      router.replace(quickViewHref(id), { scroll: false });
    },
    [quickViewHref, router],
  );

  const fields: ColumnPriorityField<CorporatePortalEmployeeDto>[] = [
    {
      key: "name",
      label: t.colName,
      priority: 1,
      render: (e) => (
        <>
          <Link
            href={`/corporate/employees/${e.id}`}
            className="font-bold text-[var(--color-text-primary)] hover:underline"
          >
            {e.firstName} {e.lastName}
          </Link>
          {e.jobTitle ? (
            <p className="text-xs text-[var(--color-text-muted)]">{e.jobTitle}</p>
          ) : null}
        </>
      ),
    },
    { key: "email", label: t.colEmail, priority: 2, render: (e) => e.email },
    { key: "department", label: t.colDepartment, priority: 2, render: (e) => e.department ?? "—" },
    {
      key: "status",
      label: t.colStatus,
      priority: 2,
      render: (e) => <Pill tone={memberStatusTone(e.status)}>{memberStatusLabel(e.status)}</Pill>,
    },
    {
      key: "beneficiaries",
      label: t.colBeneficiaries,
      priority: 2,
      align: "right",
      render: (e) => e.beneficiaryCount,
    },
    {
      key: "actions",
      label: t.colActions,
      priority: 2,
      align: "right",
      desktopOnly: true,
      render: (e) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {/* Desktop path to the ?employee= quick view. It used to be the
              row's click handler; `cardActions` (which carries the same item)
              renders in the mobile card only, so without this the drawer had
              no desktop entry point at all. A plain link, because the drawer's
              open state is derived from the URL param - same destination and
              same replace/no-scroll semantics as `openEmployee`. */}
          <Link
            href={quickViewHref(e.id)}
            replace
            scroll={false}
            className="text-portal-compact font-semibold text-[var(--color-brand-primary)] hover:underline"
          >
            {t.viewDetails}
          </Link>
          <EmployeeActionForms employee={e} employeeRowAction={employeeRowAction} t={t} />
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
        // No `onRowClick`: the name cell already carries its own <Link> to
        // /corporate/employees/{id}, and ColumnPriorityTable wraps the first
        // cell in a <button> when a row handler is passed - which nested that
        // anchor inside a button (invalid HTML, undefined activation) and hid
        // its name behind the button's aria-label. The `?employee=` quick-view
        // drawer keeps its own control on both breakpoints: the "View details"
        // link in the desktop actions cell above, and the actions menu in
        // `cardActions` below (which renders in the mobile card only).
        emptyState={
          <AdminEmptyState
            icon={<Users className="size-8" aria-hidden />}
            title={t.emptyTitle}
            description={t.emptyDescription}
          />
        }
        cardActions={(e) => (
          <span>
            <AppMenu
              trigger={
                <IconBtn ariaLabel={t.employeeActionsAriaLabel} type="button">
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
                  {t.viewDetails}
                </button>
              </AppMenuItem>
              {INVITE_STATUSES.includes(e.status) ? (
                <form action={employeeRowAction}>
                  <input type="hidden" name="employeeId" value={e.id} />
                  <input type="hidden" name="action" value="RESEND" />
                  <AppMenuItem asChild>
                    <button type="submit" className="gh-portal-menu-item">
                      {t.resendInvite}
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
                      {t.reactivate}
                    </button>
                  </AppMenuItem>
                </form>
              ) : SUSPENDABLE_STATUSES.includes(e.status) ? (
                <form action={employeeRowAction}>
                  <input type="hidden" name="employeeId" value={e.id} />
                  <input type="hidden" name="action" value="SUSPEND" />
                  <AppMenuItem asChild>
                    <button type="submit" className="gh-portal-menu-item">
                      {t.suspend}
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
                      {t.remove}
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
        eyebrow={t.drawerEyebrow}
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
              <EmployeeActionForms employee={selected} employeeRowAction={employeeRowAction} t={t} />
            </div>
          ) : null
        }
      >
        {selected && detail ? (
          <>
            <RecordDetailsSection title={t.sectionInvitation}>
              {detail.invites.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">{t.noInvitesSent}</p>
              ) : (
                detail.invites.map((invite, i) => (
                  <div key={i}>
                    <RecordDetailsField label={t.inviteSentLabel} value={formatDate(invite.createdAt)} />
                    <RecordDetailsField
                      label={t.inviteStatusLabel}
                      value={
                        invite.usedAt
                          ? t.inviteAccepted.replace("{date}", formatDate(invite.usedAt))
                          : [
                              invite.emailSentAt ? t.inviteEmailDelivered : t.inviteEmailPending,
                              invite.whatsappSentAt ? t.inviteWhatsappDelivered : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")
                      }
                    />
                  </div>
                ))
              )}
            </RecordDetailsSection>
            <RecordDetailsSection title={t.sectionBeneficiaries}>
              <RecordDetailsField
                label={t.beneficiaryCountLabel}
                value={detail.beneficiaryCount === 1
                  ? t.beneficiaryCount.replace("{count}", String(detail.beneficiaryCount))
                  : t.beneficiaryCountPlural.replace("{count}", String(detail.beneficiaryCount))}
              />
            </RecordDetailsSection>
            <RecordDetailsSection title={t.sectionDepartment}>
              <RecordDetailsField label={t.fieldDepartment} value={detail.department} />
              <RecordDetailsField label={t.fieldJobTitle} value={detail.jobTitle} />
              <RecordDetailsField label={t.fieldEmployeeCode} value={detail.employeeCode} />
            </RecordDetailsSection>
          </>
        ) : null}
      </RecordDetailsDrawer>
    </>
  );
}
