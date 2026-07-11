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
    back({ error: "First name, last name and email are required" });
  }
  const result = await postCorporateEmployee(input);
  if (!result.ok) back({ error: result.message });
  revalidatePath("/corporate/employees");
  back({ success: `Employee added — invite ${result.ok && result.data.status === "INVITE_FAILED" ? "could not be sent (resend below)" : "sent"}` });
}

async function employeeRowAction(formData: FormData) {
  "use server";
  const id = String(formData.get("employeeId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!id || !action) back({ error: "Invalid action" });
  if (action === "RESEND") {
    const result = await resendCorporateEmployeeInvite(id);
    if (!result.ok) back({ error: result.message });
    revalidatePath("/corporate/employees");
    back({ success: "Invite resent" });
  }
  const result = await patchCorporateEmployee(id, {
    action: action as "SUSPEND" | "REACTIVATE" | "REMOVE",
  });
  if (!result.ok) back({ error: result.message });
  revalidatePath("/corporate/employees");
  back({
    success:
      action === "SUSPEND"
        ? "Employee suspended — their benefits stop immediately"
        : action === "REACTIVATE"
          ? "Employee reactivated"
          : "Employee removed",
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
  const result = await fetchCorporateEmployees({ query: sp.query, status: sp.status });

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Employees"
        description="Enroll employees, track onboarding, and manage who holds corporate benefits. Invites go out by email — and WhatsApp when a phone number is provided."
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
            Add employee
          </summary>
          <form action={addEmployeeAction} className="border-t border-[var(--color-border)] px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                <span className="gh-field-label">Phone (WhatsApp)</span>
                <input name="phone" maxLength={40} className="gh-input" placeholder="+353…" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Date of birth</span>
                <input name="dateOfBirth" type="date" className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Employee code</span>
                <input name="employeeCode" maxLength={64} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Address</span>
                <input name="addressLine1" maxLength={240} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">City</span>
                <input name="city" maxLength={120} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Postal code</span>
                <input name="postalCode" maxLength={24} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Department</span>
                <input name="department" maxLength={120} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Job title</span>
                <input name="jobTitle" maxLength={120} className="gh-input" />
              </label>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Btn type="submit" variant="primary" size="sm">
                Save + send invite
              </Btn>
              <span className="text-xs text-[var(--color-text-muted)]">
                The invite goes out as soon as you save.
              </span>
            </div>
          </form>
        </details>
      </AdminCard>

      {/* Bulk upload */}
      <BulkUploadForm action={bulkUploadAction} />

      {/* Table */}
      <AdminCard padding={0} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
          <form method="get" className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              name="query"
              placeholder="Search employees…"
              defaultValue={sp.query ?? ""}
              className="gh-input w-full sm:max-w-xs"
            />
            <select name="status" defaultValue={sp.status ?? ""} className="gh-select">
              <option value="">All statuses</option>
              <option value="INVITE_SENT">Invite sent</option>
              <option value="INVITE_FAILED">Invite failed</option>
              <option value="REGISTERED">Registered</option>
              <option value="PROFILE_COMPLETE">Profile complete</option>
              <option value="PREASSESSMENT_PENDING">Pre-assessment pending</option>
              <option value="PREASSESSMENT_BOOKED">Pre-assessment booked</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REMOVED">Removed</option>
            </select>
            <Btn type="submit" variant="ghost" size="sm">
              Filter
            </Btn>
          </form>
          {result.ok ? (
            <span className="ml-auto text-[13px] text-[var(--color-text-muted)]">
              {result.data.employees.length} employees
            </span>
          ) : null}
        </div>

        {!result.ok ? (
          <p className="gh-status-warning m-5 rounded-md border px-4 py-3 text-sm">
            Could not load employees: {result.message}
          </p>
        ) : (
          <EmployeesTable
            employees={result.data.employees}
            employeeRowAction={employeeRowAction}
            getEmployeeDetail={getEmployeeDetail}
          />
        )}
      </AdminCard>
    </>
  );
}
