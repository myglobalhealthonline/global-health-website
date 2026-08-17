import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, ClipboardList, ExternalLink, Receipt, UserRound, Users } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  cancelCorporateRequest,
  fetchCorporateBeneficiaries,
  fetchCorporateCompanyById,
  fetchCorporateEmployees,
  fetchCorporateInvoices,
  fetchCorporateRequests,
  patchCorporateBeneficiary,
  patchCorporateCompany,
  patchCorporateEmployee,
  postCorporateAdminInvite,
  postCorporateEmployee,
  postCorporateRequest,
  resendCorporateBeneficiaryInvite,
  resendCorporateEmployeeInvite,
  type CorporateBeneficiaryAction,
  type CorporateEmployeeAction,
  type CorporateInvoiceDocument,
  type CorporateInvoiceDocumentType,
  type CorporateRequestType,
} from "@/lib/admin/admin-api/corporate";
import { InvoiceRowActions } from "../../invoices/_components/invoice-row-actions";
import { formatPrice } from "@/lib/format-currency";
import {
  AdminCard,
  AdminEmptyState,
  AdminTable,
  Btn,
  PageHeader,
  Pill,
  SectionHeader,
  Td,
  Th,
  Thead,
  Tr,
} from "../../_components/atoms";
import {
  companyStatusLabel,
  companyStatusTone,
  formatCents,
  formatDate,
  isRequestCancellable,
  memberStatusLabel,
  memberStatusTone,
  requestStatusLabel,
  requestStatusTone,
  REQUEST_TYPE_LABELS,
} from "../_lib";
import { SetCrumbTitle } from "@/components/crumb-title";

export const dynamic = "force-dynamic";

const TABS = ["overview", "employees", "beneficiaries", "requests", "invoices", "settings"] as const;
type Tab = (typeof TABS)[number];

/** Statuses SUSPEND is actually reachable from. Rendering the button on the
 *  others guaranteed the "Only active members can be suspended" refusal. Keep
 *  in sync with the transition tables in
 *  backend/src/modules/corporate/corporate-shared.ts. */
const SUSPENDABLE_EMPLOYEE_STATUSES = new Set([
  "REGISTERED",
  "PROFILE_INCOMPLETE",
  "PROFILE_COMPLETE",
  "PREASSESSMENT_PENDING",
  "PREASSESSMENT_BOOKED",
  "ACTIVE",
]);
const SUSPENDABLE_BENEFICIARY_STATUSES = new Set([
  "REGISTERED",
  "PROFILE_INCOMPLETE",
  "ACTIVE",
]);

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string; success?: string; error?: string }>;
};

function backTo(companyId: string, tab: Tab, params: Record<string, string>): never {
  const qs = new URLSearchParams({ tab, ...params }).toString();
  redirect(`/admin/corporate/${companyId}?${qs}`);
}

/* ── Server actions ──────────────────────────────────────────────────────── */

async function updateCompanyAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const companyId = String(formData.get("companyId") ?? "");
  const optional = (field: string) => {
    const raw = String(formData.get(field) ?? "").trim();
    return raw === "" ? undefined : raw;
  };
  const result = await patchCorporateCompany(companyId, {
    name: optional("name"),
    registrationNumber: optional("registrationNumber") ?? null,
    addressLine1: optional("addressLine1") ?? null,
    addressLine2: optional("addressLine2") ?? null,
    city: optional("city") ?? null,
    postalCode: optional("postalCode") ?? null,
    billingEmail: optional("billingEmail"),
    contactName: optional("contactName"),
    contactEmail: optional("contactEmail"),
    contactPhone: optional("contactPhone") ?? null,
    status: optional("status"),
    contractEndAt: optional("contractEndAt") ?? null,
  });
  if (!result.ok) backTo(companyId, "overview", { error: result.message });
  revalidatePath(`/admin/corporate/${companyId}`);
  backTo(companyId, "overview", { success: "Company updated" });
}

async function adminInviteAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const companyId = String(formData.get("companyId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  if (!email) backTo(companyId, "overview", { error: "Enter an email address" });
  const result = await postCorporateAdminInvite(companyId, email);
  if (!result.ok) backTo(companyId, "overview", { error: result.message });
  revalidatePath(`/admin/corporate/${companyId}`);
  backTo(companyId, "overview", { success: "Corporate-admin invite sent" });
}

async function addEmployeeAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const companyId = String(formData.get("companyId") ?? "");
  const optional = (field: string) => {
    const raw = String(formData.get(field) ?? "").trim();
    return raw === "" ? undefined : raw;
  };
  const result = await postCorporateEmployee(companyId, {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: optional("phone"),
    department: optional("department"),
    jobTitle: optional("jobTitle"),
  });
  if (!result.ok) backTo(companyId, "employees", { error: result.message });
  revalidatePath(`/admin/corporate/${companyId}`);
  backTo(companyId, "employees", { success: "Employee added — invite sent" });
}

async function employeeActionAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const companyId = String(formData.get("companyId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (action === "RESEND") {
    const result = await resendCorporateEmployeeInvite(employeeId);
    if (!result.ok) backTo(companyId, "employees", { error: result.message });
    revalidatePath(`/admin/corporate/${companyId}`);
    backTo(companyId, "employees", { success: "Invite resent" });
  }
  const result = await patchCorporateEmployee(employeeId, action as CorporateEmployeeAction);
  if (!result.ok) backTo(companyId, "employees", { error: result.message });
  revalidatePath(`/admin/corporate/${companyId}`);
  backTo(companyId, "employees", { success: "Employee updated" });
}

async function beneficiaryActionAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const companyId = String(formData.get("companyId") ?? "");
  const beneficiaryId = String(formData.get("beneficiaryId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (action === "RESEND") {
    const result = await resendCorporateBeneficiaryInvite(beneficiaryId);
    if (!result.ok) backTo(companyId, "beneficiaries", { error: result.message });
    revalidatePath(`/admin/corporate/${companyId}`);
    backTo(companyId, "beneficiaries", { success: "Invite resent" });
  }
  const result = await patchCorporateBeneficiary(
    beneficiaryId,
    action as CorporateBeneficiaryAction,
  );
  if (!result.ok) backTo(companyId, "beneficiaries", { error: result.message });
  revalidatePath(`/admin/corporate/${companyId}`);
  backTo(companyId, "beneficiaries", { success: "Beneficiary updated" });
}

async function createRequestAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const companyId = String(formData.get("companyId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!employeeId || (type !== "ILLNESS_BENEFIT" && type !== "FIT_FOR_WORK")) {
    backTo(companyId, "requests", { error: "Pick an employee and a request type" });
  }
  const result = await postCorporateRequest(companyId, {
    employeeId,
    type: type as CorporateRequestType,
    ...(reason ? { reason } : {}),
  });
  if (!result.ok) backTo(companyId, "requests", { error: result.message });
  revalidatePath(`/admin/corporate/${companyId}`);
  backTo(companyId, "requests", { success: "Request created — employee notified" });
}

async function cancelRequestAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const companyId = String(formData.get("companyId") ?? "");
  const requestId = String(formData.get("requestId") ?? "");
  const result = await cancelCorporateRequest(requestId);
  if (!result.ok) backTo(companyId, "requests", { error: result.message });
  revalidatePath(`/admin/corporate/${companyId}`);
  backTo(companyId, "requests", { success: "Request cancelled" });
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function AdminCorporateCompanyPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "overview";

  const companyResult = await fetchCorporateCompanyById(id);
  if (!companyResult.ok) {
    if (companyResult.status === 404) notFound();
    return (
      <>
        <PageHeader eyebrow="Global" title="Corporate company" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            {companyResult.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const company = companyResult.data;

  const [employeesResult, beneficiariesResult, requestsResult, invoicesResult] =
    await Promise.all([
      tab === "employees" || tab === "requests"
        ? fetchCorporateEmployees(id)
        : Promise.resolve(null),
      tab === "beneficiaries" ? fetchCorporateBeneficiaries(id) : Promise.resolve(null),
      tab === "requests" ? fetchCorporateRequests(id) : Promise.resolve(null),
      tab === "invoices" ? fetchCorporateInvoices(id) : Promise.resolve(null),
    ]);

  return (
    <>
      <SetCrumbTitle label={company.name} />
      <PageHeader
        eyebrow="Global"
        title={company.name}
        description={`${company.plan.name} · ${company.countryCode.toUpperCase()} · ${
          company.billing.employeeCount
        } billable employees`}
        actions={
          <div className="flex items-center gap-2">
            <Pill tone={companyStatusTone(company.status)}>
              {companyStatusLabel(company.status)}
            </Pill>
            <Btn
              href="/admin/corporate"
              variant="ghost"
              size="md"
              iconLeft={<ArrowLeft className="size-3.5" aria-hidden />}
            >
              Back
            </Btn>
          </div>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}

      {/* Tabs — real route navigation (each tab is a server-rendered page
          section with its own data fetch), so these stay <Link>s rather
          than becoming a PortalTabs button tablist. Styled with the same
          .gh-portal-tabs/.gh-portal-tab underline skin + portal tokens so
          it reads as one shared tab system, not a bespoke pill nav. */}
      <nav className="gh-portal-tabs mb-4" aria-label="Company sections">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/corporate/${id}?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className="gh-portal-tab capitalize"
            data-active={tab === t || undefined}
          >
            {t}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <AdminCard padding={0} className="overflow-hidden">
            <SectionHeader title="Company details" />
            <form
              action={updateCompanyAction}
              className="grid grid-cols-1 gap-4 border-t border-[var(--color-border)] px-5 py-5 sm:grid-cols-2"
            >
              <input type="hidden" name="companyId" value={company.id} />
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="gh-field-label">Company name</span>
                <input name="name" defaultValue={company.name} maxLength={240} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Registration number</span>
                <input
                  name="registrationNumber"
                  defaultValue={company.registrationNumber ?? ""}
                  maxLength={120}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Status</span>
                <select name="status" defaultValue={company.status} className="gh-select">
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended — benefits pause</option>
                  <option value="EXPIRED">Expired — benefits stop</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Billing email</span>
                <input
                  name="billingEmail"
                  type="email"
                  defaultValue={company.billingEmail}
                  maxLength={320}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Contact name</span>
                <input
                  name="contactName"
                  defaultValue={company.contactName}
                  maxLength={240}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Contact email</span>
                <input
                  name="contactEmail"
                  type="email"
                  defaultValue={company.contactEmail}
                  maxLength={320}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Contact phone</span>
                <input
                  name="contactPhone"
                  defaultValue={company.contactPhone ?? ""}
                  maxLength={40}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Address line 1</span>
                <input
                  name="addressLine1"
                  defaultValue={company.addressLine1 ?? ""}
                  maxLength={240}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Address line 2</span>
                <input
                  name="addressLine2"
                  defaultValue={company.addressLine2 ?? ""}
                  maxLength={240}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">City</span>
                <input name="city" defaultValue={company.city ?? ""} maxLength={120} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Postal code</span>
                <input
                  name="postalCode"
                  defaultValue={company.postalCode ?? ""}
                  maxLength={24}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Contract end date</span>
                <input
                  name="contractEndAt"
                  type="date"
                  defaultValue={company.contractEndAt?.slice(0, 10) ?? ""}
                  className="gh-input"
                />
                <span className="text-portal-meta text-[var(--color-text-muted)]">
                  Leave empty for open-ended. Past date stops all discounts + cards.
                </span>
              </label>
              <div className="sm:col-span-2">
                <Btn type="submit" variant="primary" size="sm">
                  Save company
                </Btn>
              </div>
            </form>
          </AdminCard>

          <div className="flex flex-col gap-4">
            <AdminCard padding={0} className="overflow-hidden">
              <SectionHeader title="Billing" description="Annual, invoiced offline" />
              <div className="border-t border-[var(--color-border)] px-5 py-4">
                <p className="text-sm text-[var(--color-text-muted)]">
                  {company.billing.employeeCount} employees ×{" "}
                  {formatCents(company.billing.pricePerEmployeeCents, company.billing.currencyCode)}
                </p>
                <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                  {formatCents(company.billing.totalAnnualCents, company.billing.currencyCode)}
                  <span className="ml-1.5 text-sm font-normal text-[var(--color-text-muted)]">
                    / year
                  </span>
                </p>
              </div>
            </AdminCard>

            <AdminCard padding={0} className="overflow-hidden">
              <SectionHeader
                title="Corporate-admin login"
                description="Who manages this company's portal"
              />
              <div className="border-t border-[var(--color-border)] px-5 py-4">
                {company.adminLogin ? (
                  <p className="mb-3 text-sm text-[var(--color-text-primary)]">
                    <UserRound className="mr-1.5 inline size-4 align-[-2px]" aria-hidden />
                    {company.adminLogin.email}{" "}
                    <Pill tone={company.adminLogin.active ? "active" : "pending"}>
                      {company.adminLogin.active ? "Active" : "Invite pending"}
                    </Pill>
                  </p>
                ) : (
                  <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                    No corporate-admin login yet.
                  </p>
                )}
                <form action={adminInviteAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="companyId" value={company.id} />
                  <input
                    type="email"
                    name="email"
                    placeholder="hr@company.com"
                    defaultValue={company.adminLogin?.email ?? ""}
                    required
                    className="gh-input w-56"
                  />
                  <Btn type="submit" variant="secondary" size="sm">
                    {company.adminLogin ? "Resend / replace invite" : "Send invite"}
                  </Btn>
                </form>
              </div>
            </AdminCard>
          </div>
        </div>
      ) : null}

      {tab === "employees" ? (
        <>
          <AdminCard padding={0} className="mb-4 overflow-hidden">
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-bold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
                <Users className="size-4" aria-hidden /> Add employee
              </summary>
              <form
                action={addEmployeeAction}
                className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:grid-cols-3"
              >
                <input type="hidden" name="companyId" value={company.id} />
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">First name *</span>
                  <input name="firstName" required maxLength={120} className="gh-input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Last name *</span>
                  <input name="lastName" required maxLength={120} className="gh-input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Email *</span>
                  <input name="email" type="email" required maxLength={320} className="gh-input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Phone</span>
                  <input name="phone" maxLength={40} className="gh-input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Department</span>
                  <input name="department" maxLength={120} className="gh-input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Job title</span>
                  <input name="jobTitle" maxLength={120} className="gh-input" />
                </label>
                <div className="sm:col-span-3">
                  <Btn type="submit" variant="primary" size="sm">
                    Add + send invite
                  </Btn>
                </div>
              </form>
            </details>
          </AdminCard>

          <AdminCard padding={0} className="overflow-hidden">
            {!employeesResult || !employeesResult.ok ? (
              <p className="gh-status-warning m-5 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
                Could not load employees{employeesResult ? `: ${employeesResult.message}` : ""}
              </p>
            ) : employeesResult.data.employees.length === 0 ? (
              <AdminEmptyState
                icon={<Users className="size-8" aria-hidden />}
                title="No employees"
                description="Add employees here or let the corporate admin enroll them from their portal."
              />
            ) : (
              <div className="overflow-x-auto">
                <AdminTable>
                  <Thead>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Status</Th>
                    <Th>Pre-assessment</Th>
                    <Th align="right">Beneficiaries</Th>
                    <Th align="right">Actions</Th>
                  </Thead>
                  <tbody>
                    {employeesResult.data.employees.map((e) => (
                      <Tr key={e.id}>
                        <Td>
                          <span className="font-bold text-[var(--color-text-primary)]">
                            {e.firstName} {e.lastName}
                          </span>
                          {e.department ? (
                            <p className="text-xs text-[var(--color-text-muted)]">{e.department}</p>
                          ) : null}
                        </Td>
                        <Td>{e.email}</Td>
                        <Td>
                          <Pill tone={memberStatusTone(e.status)}>
                            {memberStatusLabel(e.status)}
                          </Pill>
                        </Td>
                        <Td>{e.preAssessmentBooked ? "Booked" : "—"}</Td>
                        <Td align="right">{e.beneficiaryCount}</Td>
                        <Td align="right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {["DRAFT", "INVITED", "INVITE_SENT", "INVITE_FAILED"].includes(
                              e.status,
                            ) ? (
                              <form action={employeeActionAction}>
                                <input type="hidden" name="companyId" value={company.id} />
                                <input type="hidden" name="employeeId" value={e.id} />
                                <input type="hidden" name="action" value="RESEND" />
                                <Btn type="submit" variant="ghost" size="sm">
                                  Resend
                                </Btn>
                              </form>
                            ) : null}
                            {!["ACTIVE", "REMOVED", "DRAFT", "INVITED", "INVITE_SENT", "INVITE_FAILED"].includes(
                              e.status,
                            ) ? (
                              <form action={employeeActionAction}>
                                <input type="hidden" name="companyId" value={company.id} />
                                <input type="hidden" name="employeeId" value={e.id} />
                                <input type="hidden" name="action" value="FORCE_ACTIVATE" />
                                <Btn type="submit" variant="ghost" size="sm">
                                  Force-activate
                                </Btn>
                              </form>
                            ) : null}
                            {e.status === "SUSPENDED" ? (
                              <form action={employeeActionAction}>
                                <input type="hidden" name="companyId" value={company.id} />
                                <input type="hidden" name="employeeId" value={e.id} />
                                <input type="hidden" name="action" value="REACTIVATE" />
                                <Btn type="submit" variant="ghost" size="sm">
                                  Reactivate
                                </Btn>
                              </form>
                            ) : SUSPENDABLE_EMPLOYEE_STATUSES.has(e.status) ? (
                              <form action={employeeActionAction}>
                                <input type="hidden" name="companyId" value={company.id} />
                                <input type="hidden" name="employeeId" value={e.id} />
                                <input type="hidden" name="action" value="SUSPEND" />
                                <Btn type="submit" variant="ghost" size="sm">
                                  Suspend
                                </Btn>
                              </form>
                            ) : null}
                            {e.status !== "REMOVED" ? (
                              <form action={employeeActionAction}>
                                <input type="hidden" name="companyId" value={company.id} />
                                <input type="hidden" name="employeeId" value={e.id} />
                                <input type="hidden" name="action" value="REMOVE" />
                                <Btn type="submit" variant="danger" size="sm">
                                  Remove
                                </Btn>
                              </form>
                            ) : null}
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </AdminTable>
              </div>
            )}
          </AdminCard>
        </>
      ) : null}

      {tab === "beneficiaries" ? (
        <AdminCard padding={0} className="overflow-hidden">
          {!beneficiariesResult || !beneficiariesResult.ok ? (
            <p className="gh-status-warning m-5 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
              Could not load beneficiaries
              {beneficiariesResult ? `: ${beneficiariesResult.message}` : ""}
            </p>
          ) : beneficiariesResult.data.beneficiaries.length === 0 ? (
            <AdminEmptyState
              icon={<Users className="size-8" aria-hidden />}
              title="No beneficiaries"
              description="Employees add their own beneficiaries (up to the plan limit) from the patient portal."
            />
          ) : (
            <div className="overflow-x-auto">
              <AdminTable>
                <Thead>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Relationship</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </Thead>
                <tbody>
                  {beneficiariesResult.data.beneficiaries.map((b) => (
                    <Tr key={b.id}>
                      <Td>
                        <span className="font-bold text-[var(--color-text-primary)]">
                          {b.firstName} {b.lastName}
                        </span>
                      </Td>
                      <Td>{b.email ?? "—"}</Td>
                      <Td>{b.relationship ?? "—"}</Td>
                      <Td>
                        <Pill tone={memberStatusTone(b.status)}>{memberStatusLabel(b.status)}</Pill>
                      </Td>
                      <Td align="right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {["INVITED", "INVITE_SENT", "INVITE_FAILED"].includes(b.status) ? (
                            <form action={beneficiaryActionAction}>
                              <input type="hidden" name="companyId" value={company.id} />
                              <input type="hidden" name="beneficiaryId" value={b.id} />
                              <input type="hidden" name="action" value="RESEND" />
                              <Btn type="submit" variant="ghost" size="sm">
                                Resend
                              </Btn>
                            </form>
                          ) : null}
                          {b.status === "SUSPENDED" ? (
                            <form action={beneficiaryActionAction}>
                              <input type="hidden" name="companyId" value={company.id} />
                              <input type="hidden" name="beneficiaryId" value={b.id} />
                              <input type="hidden" name="action" value="REACTIVATE" />
                              <Btn type="submit" variant="ghost" size="sm">
                                Reactivate
                              </Btn>
                            </form>
                          ) : SUSPENDABLE_BENEFICIARY_STATUSES.has(b.status) ? (
                            <form action={beneficiaryActionAction}>
                              <input type="hidden" name="companyId" value={company.id} />
                              <input type="hidden" name="beneficiaryId" value={b.id} />
                              <input type="hidden" name="action" value="SUSPEND" />
                              <Btn type="submit" variant="ghost" size="sm">
                                Suspend
                              </Btn>
                            </form>
                          ) : null}
                          {b.status !== "REMOVED" ? (
                            <form action={beneficiaryActionAction}>
                              <input type="hidden" name="companyId" value={company.id} />
                              <input type="hidden" name="beneficiaryId" value={b.id} />
                              <input type="hidden" name="action" value="REMOVE" />
                              <Btn type="submit" variant="danger" size="sm">
                                Remove
                              </Btn>
                            </form>
                          ) : null}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </AdminTable>
            </div>
          )}
        </AdminCard>
      ) : null}

      {tab === "requests" ? (
        <>
          <AdminCard padding={0} className="mb-4 overflow-hidden">
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-bold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
                <ClipboardList className="size-4" aria-hidden /> New request
              </summary>
              <form
                action={createRequestAction}
                className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:grid-cols-2"
              >
                <input type="hidden" name="companyId" value={company.id} />
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Employee *</span>
                  <select name="employeeId" required defaultValue="" className="gh-select">
                    <option value="" disabled>
                      Select employee…
                    </option>
                    {(employeesResult?.ok ? employeesResult.data.employees : [])
                      .filter((e) => e.status !== "REMOVED")
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} — {e.email}
                        </option>
                      ))}
                  </select>
                </label>
                <fieldset className="flex flex-col gap-1 border-0 p-0">
                  <legend className="gh-field-label">Type *</legend>
                  <div className="flex items-center gap-4 pt-1.5">
                    <label className="inline-flex items-center gap-1.5 text-sm">
                      <input type="radio" name="type" value="ILLNESS_BENEFIT" required /> Illness
                      benefit
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-sm">
                      <input type="radio" name="type" value="FIT_FOR_WORK" /> Fit for work
                    </label>
                  </div>
                </fieldset>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="gh-field-label">Reason (optional)</span>
                  <textarea name="reason" rows={2} maxLength={2000} className="gh-input" />
                </label>
                <div className="sm:col-span-2">
                  <Btn type="submit" variant="primary" size="sm">
                    Create request
                  </Btn>
                </div>
              </form>
            </details>
          </AdminCard>

          <AdminCard padding={0} className="overflow-hidden">
            {!requestsResult || !requestsResult.ok ? (
              <p className="gh-status-warning m-5 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
                Could not load requests{requestsResult ? `: ${requestsResult.message}` : ""}
              </p>
            ) : requestsResult.data.requests.length === 0 ? (
              <AdminEmptyState
                icon={<ClipboardList className="size-8" aria-hidden />}
                title="No requests"
                description="Illness-benefit and fit-for-work requests appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <AdminTable>
                  <Thead>
                    <Th>Employee</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th>Expires</Th>
                    <Th align="right">Actions</Th>
                  </Thead>
                  <tbody>
                    {requestsResult.data.requests.map((r) => (
                      <Tr key={r.id}>
                        <Td>
                          <span className="font-bold text-[var(--color-text-primary)]">
                            {r.employeeName ?? "—"}
                          </span>
                          {r.reason ? (
                            <p className="max-w-[24rem] truncate text-xs text-[var(--color-text-muted)]" title={r.reason}>
                              {r.reason}
                            </p>
                          ) : null}
                        </Td>
                        <Td>{REQUEST_TYPE_LABELS[r.type] ?? r.type}</Td>
                        <Td>
                          <Pill tone={requestStatusTone(r.status)}>
                            {requestStatusLabel(r.status)}
                          </Pill>
                        </Td>
                        <Td>
                          <span className="text-[var(--color-text-muted)]">
                            {formatDate(r.createdAt)}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-[var(--color-text-muted)]">
                            {formatDate(r.expiresAt)}
                          </span>
                        </Td>
                        <Td align="right">
                          {isRequestCancellable(r.status) ? (
                            <form action={cancelRequestAction}>
                              <input type="hidden" name="companyId" value={company.id} />
                              <input type="hidden" name="requestId" value={r.id} />
                              <Btn type="submit" variant="ghost" size="sm">
                                Cancel
                              </Btn>
                            </form>
                          ) : null}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </AdminTable>
              </div>
            )}
          </AdminCard>
        </>
      ) : null}

      {tab === "invoices" ? (
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader
            title="Employee consultation documents"
            description="Invoices and receipts from consultations booked by this company's employees. The company's own annual plan is invoiced offline under contract — no document is issued here."
          />
          {!invoicesResult || !invoicesResult.ok ? (
            <p className="gh-status-warning m-5 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
              Could not load documents{invoicesResult ? `: ${invoicesResult.message}` : ""}
            </p>
          ) : invoicesResult.data.consultations.length === 0 ? (
            <AdminEmptyState
              icon={<Receipt className="size-8" aria-hidden />}
              title="No consultation documents"
              description="Once employees book and pay for consultations, their invoices/receipts appear here."
            />
          ) : (
            <div className="flex flex-col gap-2 border-t border-[var(--color-border)] px-4 py-4">
              {invoicesResult.data.consultations.map((doc) => (
                <CorporateInvoiceRow key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </AdminCard>
      ) : null}

      {tab === "settings" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard padding={0} className="overflow-hidden">
            <SectionHeader
              title="Plan"
              description="Shared plan settings — edit on the Corporate overview page."
            />
            <dl className="m-0 grid grid-cols-1 gap-y-3 border-t border-[var(--color-border)] px-5 py-4 text-sm">
              <div>
                <dt className="gh-field-label">Plan</dt>
                <dd className="m-0 mt-0.5 font-semibold text-[var(--color-text-primary)]">
                  {company.plan.name}
                </dd>
              </div>
              <div>
                <dt className="gh-field-label">Annual price / employee</dt>
                <dd className="m-0 mt-0.5 text-[var(--color-text-primary)]">
                  {formatCents(company.plan.annualPricePerEmployeeCents, company.plan.currencyCode)}
                </dd>
              </div>
              <div>
                <dt className="gh-field-label">Max beneficiaries / employee</dt>
                <dd className="m-0 mt-0.5 text-[var(--color-text-primary)]">
                  {company.plan.maxBeneficiariesPerEmployee}
                </dd>
              </div>
            </dl>
            <div className="border-t border-[var(--color-border)] px-5 py-3">
              <Link
                href="/admin/corporate"
                className="text-sm font-semibold text-[var(--color-text-primary)] hover:underline"
              >
                Edit plan + benefit rules →
              </Link>
            </div>
          </AdminCard>
        </div>
      ) : null}
    </>
  );
}

/* ── Corporate invoice document row ──────────────────────────────────────── */

const DOC_TYPE_META: Record<
  CorporateInvoiceDocumentType,
  { label: string; className: string }
> = {
  INVOICE: { label: "Invoice · Unpaid", className: "bg-amber-100 text-amber-800" },
  RECEIPT: { label: "Receipt", className: "bg-sky-100 text-sky-800" },
  INVOICE_RECEIPT: { label: "Invoice / Receipt", className: "bg-emerald-100 text-emerald-800" },
  CREDIT_NOTE: { label: "Credit Note", className: "bg-rose-100 text-rose-800" },
};

function CorporateInvoiceRow({ doc }: { doc: CorporateInvoiceDocument }) {
  const meta = DOC_TYPE_META[doc.documentType] ?? DOC_TYPE_META.INVOICE_RECEIPT;
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={`gh-admin-ops-badge inline-block rounded-full px-2 py-0.5 text-portal-micro font-bold uppercase ${meta.className}`}
        >
          {meta.label}
        </span>
        <span className="font-mono text-portal-compact font-bold text-[var(--color-text-primary)]">
          {doc.invoiceNumber}
        </span>
        <span className="text-portal-thead text-[var(--color-text-muted)]">
          {formatPrice(doc.totalCents, doc.currencyCode)} · {formatDate(doc.generatedAt)}
        </span>
        <span
          className={`gh-admin-ops-badge inline-block rounded-full px-2 py-0.5 text-portal-micro font-bold uppercase ${
            doc.emailSentAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {doc.emailSentAt ? "Sent" : "Pending"}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Link
          href={`/print/order-invoices/${doc.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-portal-thead font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
        >
          <ExternalLink className="size-3" aria-hidden />
          View
        </Link>
        {/* Download PDF + Send to billing email (email / WhatsApp) — reuses the
            same per-invoice endpoints as the main Invoices page. */}
        <InvoiceRowActions invoiceId={doc.id} variant="card" />
      </div>
    </div>
  );
}
