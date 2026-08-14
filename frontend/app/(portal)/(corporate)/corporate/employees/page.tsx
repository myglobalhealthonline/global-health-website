import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import {
  fetchCorporateEmployeeById,
  fetchCorporateEmployees,
  patchCorporateEmployee,
  postCorporateEmployee,
  postCorporateEmployeesBulk,
  resendCorporateEmployeeInvite,
  type CorporateEmployeeDetailDto,
  type CorporateEmployeeInput,
} from "@/lib/corporate/corporate-api";
import { AdminCard, Btn, PageHeader } from "@/components/portal-atoms";
import { BulkUploadForm } from "./bulk-upload-form";
import { EmployeesTable } from "./employees-table";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    query?: string;
    status?: string;
    success?: string;
    error?: string;
    employee?: string;
  }>;
};

function back(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  redirect(`/corporate/employees${qs ? `?${qs}` : ""}`);
}

async function addEmployeeAction(formData: FormData) {
  "use server";
  const locale = await getPortalLocale();
  const { employees: e } = loadLocaleBundle(locale).corporate;
  const read = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value || undefined;
  };
  const input: CorporateEmployeeInput = {
    firstName: read("firstName") ?? "",
    lastName: read("lastName") ?? "",
    email: read("email") ?? "",
    phone: read("phone"),
    addressLine1: read("addressLine1"),
    city: read("city"),
    postalCode: read("postalCode"),
    dateOfBirth: read("dateOfBirth"),
    employeeCode: read("employeeCode"),
    department: read("department"),
    jobTitle: read("jobTitle"),
  };
  if (!input.firstName || !input.lastName || !input.email) {
    back({ error: e.errors.requiredFields });
  }
  const result = await postCorporateEmployee(input);
  if (!result.ok) back({ error: result.message });
  revalidatePath("/corporate/employees");
  back({ success: result.ok && result.data.status === "INVITE_FAILED" ? e.success.addedFailed : e.success.addedSent });
}

async function employeeRowAction(formData: FormData) {
  "use server";
  const locale = await getPortalLocale();
  const { employees: e } = loadLocaleBundle(locale).corporate;
  const id = String(formData.get("employeeId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!id || !action) back({ error: e.errors.invalidAction });
  if (action === "RESEND") {
    const result = await resendCorporateEmployeeInvite(id);
    if (!result.ok) back({ error: result.message });
    revalidatePath("/corporate/employees");
    back({ success: e.success.inviteResent });
  }
  const result = await patchCorporateEmployee(id, {
    action: action as "SUSPEND" | "REACTIVATE" | "REMOVE",
  });
  if (!result.ok) back({ error: result.message });
  revalidatePath("/corporate/employees");
  back({
    success:
      action === "SUSPEND"
        ? e.success.suspended
        : action === "REACTIVATE"
          ? e.success.reactivated
          : e.success.removed,
  });
}

async function bulkUploadAction(employees: CorporateEmployeeInput[]) {
  "use server";
  const result = await postCorporateEmployeesBulk(employees);
  if (!result.ok) {
    return { ok: false as const, message: result.message };
  }
  revalidatePath("/corporate/employees");
  return { ok: true as const, results: result.data.results };
}

async function getEmployeeDetail(id: string): Promise<CorporateEmployeeDetailDto | null> {
  "use server";
  const result = await fetchCorporateEmployeeById(id);
  return result.ok ? result.data : null;
}

export default async function CorporateEmployeesPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const [result, locale] = await Promise.all([
    fetchCorporateEmployees({ query: sp.query, status: sp.status }),
    getPortalLocale(),
  ]);
  const { employees: e, common } = loadLocaleBundle(locale).corporate;

  return (
    <>
      <PageHeader
        eyebrow={e.eyebrow}
        title={e.title}
        description={e.description}
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">{sp.error}</p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-md border px-4 py-3 text-sm">{sp.success}</p>
      ) : null}

      {/* Add single employee */}
      <AdminCard padding={0} className="mb-4 overflow-hidden">
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-bold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
            <UserPlus className="size-4" aria-hidden />
            {e.addEmployee.summary}
          </summary>
          <form action={addEmployeeAction} className="border-t border-[var(--color-border)] px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{e.addEmployee.firstName}</span>
                <input name="firstName" required maxLength={120} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{e.addEmployee.lastName}</span>
                <input name="lastName" required maxLength={120} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{e.addEmployee.email}</span>
                <input name="email" type="email" required maxLength={320} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{e.addEmployee.phone}</span>
                <input name="phone" maxLength={40} className="gh-input" placeholder={e.addEmployee.phonePlaceholder} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{e.addEmployee.dateOfBirth}</span>
                <input name="dateOfBirth" type="date" className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{e.addEmployee.employeeCode}</span>
                <input name="employeeCode" maxLength={64} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{e.addEmployee.address}</span>
                <input name="addressLine1" maxLength={240} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{e.addEmployee.city}</span>
                <input name="city" maxLength={120} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{e.addEmployee.postalCode}</span>
                <input name="postalCode" maxLength={24} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{e.addEmployee.department}</span>
                <input name="department" maxLength={120} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{e.addEmployee.jobTitle}</span>
                <input name="jobTitle" maxLength={120} className="gh-input" />
              </label>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Btn type="submit" variant="primary" size="sm">
                {e.addEmployee.submit}
              </Btn>
              <span className="text-xs text-[var(--color-text-muted)]">
                {e.addEmployee.hint}
              </span>
            </div>
          </form>
        </details>
      </AdminCard>

      {/* Bulk upload */}
      <BulkUploadForm action={bulkUploadAction} t={e.bulkUpload} />

      {/* Table */}
      <AdminCard padding={0} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
          <form method="get" className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              name="query"
              placeholder={e.search.placeholder}
              defaultValue={sp.query ?? ""}
              className="gh-input w-full sm:max-w-xs"
            />
            <select name="status" defaultValue={sp.status ?? ""} className="gh-select">
              <option value="">{e.search.allStatuses}</option>
              <option value="INVITE_SENT">{e.search.statusInviteSent}</option>
              <option value="INVITE_FAILED">{e.search.statusInviteFailed}</option>
              {/* REGISTERED / PROFILE_COMPLETE are never written — invite
                  accept goes straight to PROFILE_INCOMPLETE or
                  PREASSESSMENT_PENDING — so offering them was a filter that
                  always returned nothing. */}
              <option value="PROFILE_INCOMPLETE">{e.search.statusProfileIncomplete}</option>
              <option value="PREASSESSMENT_PENDING">{e.search.statusPreassessmentPending}</option>
              <option value="PREASSESSMENT_BOOKED">{e.search.statusPreassessmentBooked}</option>
              <option value="ACTIVE">{e.search.statusActive}</option>
              <option value="SUSPENDED">{e.search.statusSuspended}</option>
              <option value="REMOVED">{e.search.statusRemoved}</option>
            </select>
            <Btn type="submit" variant="ghost" size="sm">
              {common.filter}
            </Btn>
          </form>
          {result.ok ? (
            <span className="ml-auto text-portal-compact text-[var(--color-text-muted)]">
              {result.data.employees.length} {e.employeesCountSuffix}
            </span>
          ) : null}
        </div>

        {!result.ok ? (
          <p className="gh-status-warning m-5 rounded-md border px-4 py-3 text-sm">
            {e.loadErrorPrefix}: {result.message}
          </p>
        ) : (
          <EmployeesTable
            employees={result.data.employees}
            employeeRowAction={employeeRowAction}
            getEmployeeDetail={getEmployeeDetail}
            t={e.table}
          />
        )}
      </AdminCard>
    </>
  );
}
