import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import {
  cancelCorporatePortalRequest,
  fetchCorporateEmployees,
  fetchCorporatePortalRequests,
  postCorporatePortalRequest,
} from "@/lib/corporate/corporate-api";
import { AdminCard, Btn, PageHeader } from "@/components/portal-atoms";
import { RequestsTable } from "./requests-table";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ status?: string; success?: string; error?: string }>;
};

function back(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  redirect(`/corporate/requests${qs ? `?${qs}` : ""}`);
}

async function createRequestAction(formData: FormData) {
  "use server";
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!employeeId || (type !== "ILLNESS_BENEFIT" && type !== "FIT_FOR_WORK")) {
    back({ error: "Pick an employee and a request type" });
  }
  const result = await postCorporatePortalRequest({
    employeeId,
    type: type as "ILLNESS_BENEFIT" | "FIT_FOR_WORK",
    ...(reason ? { reason } : {}),
  });
  if (!result.ok) back({ error: result.message });
  revalidatePath("/corporate/requests");
  back({ success: "Request created — the employee has been notified to book" });
}

async function cancelRequestAction(formData: FormData) {
  "use server";
  const id = String(formData.get("requestId") ?? "");
  if (!id) back({ error: "Invalid request" });
  const result = await cancelCorporatePortalRequest(id);
  if (!result.ok) back({ error: result.message });
  revalidatePath("/corporate/requests");
  back({ success: "Request cancelled" });
}

export default async function CorporateRequestsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const [requestsResult, employeesResult] = await Promise.all([
    fetchCorporatePortalRequests(sp.status),
    fetchCorporateEmployees(),
  ]);
  // Requests are only actionable for employees who exist and aren't removed.
  const selectableEmployees = employeesResult.ok
    ? employeesResult.data.employees.filter((e) => e.status !== "REMOVED")
    : [];

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Consultation requests"
        description="Ask an employee to attend an illness-benefit or fit-for-work consultation. They get notified and book themselves — you see status only, never medical content."
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">{sp.error}</p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-md border px-4 py-3 text-sm">{sp.success}</p>
      ) : null}

      {/* New request */}
      <AdminCard padding={0} className="mb-4 overflow-hidden">
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-bold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
            <Plus className="size-4" aria-hidden />
            New request
          </summary>
          <form
            action={createRequestAction}
            className="border-t border-[var(--color-border)] px-5 py-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Employee *</span>
                <select name="employeeId" required className="gh-select" defaultValue="">
                  <option value="" disabled>
                    Select employee…
                  </option>
                  {selectableEmployees.map((e) => (
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
                <span className="gh-field-label">Reason (optional — visible to the employee)</span>
                <textarea name="reason" rows={2} maxLength={2000} className="gh-input" />
              </label>
            </div>
            <div className="mt-4">
              <Btn type="submit" variant="primary" size="sm">
                Create request + notify employee
              </Btn>
            </div>
          </form>
        </details>
      </AdminCard>

      {/* List */}
      <AdminCard padding={0} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
          <form method="get" className="flex flex-wrap items-center gap-2">
            <select name="status" defaultValue={sp.status ?? ""} className="gh-select">
              <option value="">All statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="EMPLOYEE_NOTIFIED">Employee notified</option>
              <option value="BOOKED">Booked</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <Btn type="submit" variant="ghost" size="sm">
              Filter
            </Btn>
          </form>
        </div>

        {!requestsResult.ok ? (
          <p className="gh-status-warning m-5 rounded-md border px-4 py-3 text-sm">
            Could not load requests: {requestsResult.message}
          </p>
        ) : (
          <RequestsTable
            requests={requestsResult.data.requests}
            cancelRequestAction={cancelRequestAction}
          />
        )}
      </AdminCard>
    </>
  );
}
