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
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

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
  const locale = await getPageLocale();
  const { requests: r } = loadLocaleBundle(locale).corporate;
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!employeeId || (type !== "ILLNESS_BENEFIT" && type !== "FIT_FOR_WORK")) {
    back({ error: r.errors.pickEmployeeAndType });
  }
  const result = await postCorporatePortalRequest({
    employeeId,
    type: type as "ILLNESS_BENEFIT" | "FIT_FOR_WORK",
    ...(reason ? { reason } : {}),
  });
  if (!result.ok) back({ error: result.message });
  revalidatePath("/corporate/requests");
  back({ success: r.success.created });
}

async function cancelRequestAction(formData: FormData) {
  "use server";
  const locale = await getPageLocale();
  const { requests: r } = loadLocaleBundle(locale).corporate;
  const id = String(formData.get("requestId") ?? "");
  if (!id) back({ error: r.errors.invalidRequest });
  const result = await cancelCorporatePortalRequest(id);
  if (!result.ok) back({ error: result.message });
  revalidatePath("/corporate/requests");
  back({ success: r.success.cancelled });
}

export default async function CorporateRequestsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const [requestsResult, employeesResult, locale] = await Promise.all([
    fetchCorporatePortalRequests(sp.status),
    fetchCorporateEmployees(),
    getPageLocale(),
  ]);
  const { requests: r, common } = loadLocaleBundle(locale).corporate;
  // Requests are only actionable for employees who exist and aren't removed.
  const selectableEmployees = employeesResult.ok
    ? employeesResult.data.employees.filter((e) => e.status !== "REMOVED")
    : [];

  return (
    <>
      <PageHeader
        eyebrow={r.eyebrow}
        title={r.title}
        description={r.description}
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
            {r.newRequest.summary}
          </summary>
          <form
            action={createRequestAction}
            className="border-t border-[var(--color-border)] px-5 py-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{r.newRequest.employee}</span>
                <select name="employeeId" required className="gh-select" defaultValue="">
                  <option value="" disabled>
                    {r.newRequest.selectEmployee}
                  </option>
                  {selectableEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} — {e.email}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="flex flex-col gap-1 border-0 p-0">
                <legend className="gh-field-label">{r.newRequest.type}</legend>
                <div className="flex items-center gap-4 pt-1.5">
                  <label className="inline-flex items-center gap-1.5 text-sm">
                    <input type="radio" name="type" value="ILLNESS_BENEFIT" required />{" "}
                    {r.newRequest.typeIllnessBenefit}
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-sm">
                    <input type="radio" name="type" value="FIT_FOR_WORK" /> {r.newRequest.typeFitForWork}
                  </label>
                </div>
              </fieldset>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="gh-field-label">{r.newRequest.reason}</span>
                <textarea name="reason" rows={2} maxLength={2000} className="gh-input" />
              </label>
            </div>
            <div className="mt-4">
              <Btn type="submit" variant="primary" size="sm">
                {r.newRequest.submit}
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
              <option value="">{r.filter.allStatuses}</option>
              <option value="REQUESTED">{r.filter.statusRequested}</option>
              <option value="EMPLOYEE_NOTIFIED">{r.filter.statusEmployeeNotified}</option>
              <option value="BOOKED">{r.filter.statusBooked}</option>
              <option value="COMPLETED">{r.filter.statusCompleted}</option>
              <option value="CANCELLED">{r.filter.statusCancelled}</option>
              <option value="EXPIRED">{r.filter.statusExpired}</option>
            </select>
            <Btn type="submit" variant="ghost" size="sm">
              {common.filter}
            </Btn>
          </form>
        </div>

        {!requestsResult.ok ? (
          <p className="gh-status-warning m-5 rounded-md border px-4 py-3 text-sm">
            {r.loadErrorPrefix}: {requestsResult.message}
          </p>
        ) : (
          <RequestsTable
            requests={requestsResult.data.requests}
            cancelRequestAction={cancelRequestAction}
            t={r.table}
          />
        )}
      </AdminCard>
    </>
  );
}
