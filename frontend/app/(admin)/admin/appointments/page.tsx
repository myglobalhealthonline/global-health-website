import Link from "next/link";
import { fetchAdminAppointments } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "REQUEST_RECEIVED", label: "REQUEST_RECEIVED" },
  { value: "UNDER_REVIEW", label: "UNDER_REVIEW" },
  { value: "CONTACTED", label: "CONTACTED" },
  { value: "CANCELLED", label: "CANCELLED" },
  { value: "COMPLETED", label: "COMPLETED" },
] as const;

const COUNTRY_OPTIONS = [
  { value: "", label: "All countries" },
  { value: "ie", label: "Ireland (ie)" },
  { value: "pt", label: "Portugal (pt)" },
  { value: "sp", label: "Spain (sp)" },
  { value: "cz", label: "Czechia (cz)" },
  { value: "rm", label: "Romania (rm)" },
] as const;

const CONSULT_OPTIONS = [
  { value: "", label: "All types" },
  { value: "general", label: "general" },
  { value: "specialist", label: "specialist" },
  { value: "follow-up", label: "follow-up" },
] as const;

function spRead(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function buildFilterQuery(sp: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return {
    page: spRead(sp, "page"),
    pageSize: spRead(sp, "pageSize"),
    status: spRead(sp, "status"),
    countryCode: spRead(sp, "countryCode"),
    consultationType: spRead(sp, "consultationType"),
    search: spRead(sp, "search"),
  };
}

function buildQueueHref(filters: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...filters, ...patch })) {
    if (v !== undefined && v !== "") {
      merged[k] = v;
    }
  }
  const params = new URLSearchParams(merged);
  const qs = params.toString();
  return qs ? `/admin/appointments?${qs}` : "/admin/appointments";
}

function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAppointmentsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const filters = buildFilterQuery(sp);
  const result = await fetchAdminAppointments(filters);

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Appointment Queue</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load appointments: {result.message}
        </p>
      </section>
    );
  }

  const { items, pagination } = result.data;
  const hasRows = items.length > 0;
  const { page, pageSize, total, totalPages } = pagination;

  return (
    <section className="gh-card p-6 sm:p-8">
      <h1 className="gh-h2 text-[var(--color-text-primary)]">Appointment Queue</h1>
      <p className="gh-body mt-3 text-[var(--color-text-muted)]">
        Internal review queue. Filters and pagination run on the server; status moves follow rules on the detail page.
      </p>

      <form method="get" className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-2">
            <span className="gh-field-label">Status</span>
            <select name="status" defaultValue={filters.status ?? ""} className="gh-select min-w-0">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <span className="gh-field-label">Country</span>
            <select name="countryCode" defaultValue={filters.countryCode ?? ""} className="gh-select min-w-0">
              {COUNTRY_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <span className="gh-field-label">Consultation type</span>
            <select name="consultationType" defaultValue={filters.consultationType ?? ""} className="gh-select min-w-0">
              {CONSULT_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <span className="gh-field-label">Search</span>
            <input
              type="search"
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Name, email, or phone"
              className="gh-input min-w-0"
              maxLength={120}
            />
          </label>
        </div>
        <input type="hidden" name="page" value="1" />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Apply filters
          </button>
          <Link href="/admin/appointments" className="gh-link text-sm text-[var(--color-text-muted)]">
            Clear filters
          </Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        {total === 0 ? "No appointments match the current filters." : `Showing ${items.length} of ${total} appointment${total === 1 ? "" : "s"}.`}
      </p>

      {!hasRows ? (
        <div className="mt-8 rounded-[var(--radius-card-sm)] border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] px-6 py-12 text-center">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Nothing in this view yet</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Try widening filters, clearing search, or check back after new booking requests arrive.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="px-3 py-2 font-semibold">Patient</th>
                <th className="px-3 py-2 font-semibold">Contact</th>
                <th className="px-3 py-2 font-semibold">Country</th>
                <th className="px-3 py-2 font-semibold">Consultation</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Created</th>
                <th className="px-3 py-2 font-semibold">Notes</th>
                <th className="px-3 py-2 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {items.map((appointment) => (
                <tr key={appointment.id} className="border-b border-[var(--color-border)] align-top">
                  <td className="px-3 py-3 font-medium text-[var(--color-text-primary)]">{appointment.fullName}</td>
                  <td className="px-3 py-3 text-[var(--color-text-muted)]">
                    <div>{appointment.email}</div>
                    <div>{appointment.phone ?? "No phone"}</div>
                  </td>
                  <td className="px-3 py-3 uppercase text-[var(--color-text-muted)]">{appointment.country}</td>
                  <td className="px-3 py-3 text-[var(--color-text-muted)]">{appointment.consultationType}</td>
                  <td className="px-3 py-3 text-[var(--color-text-primary)]">{appointment.status}</td>
                  <td className="px-3 py-3 text-[var(--color-text-muted)]">{formatDate(appointment.createdAt)}</td>
                  <td className="max-w-[20rem] px-3 py-3 text-[var(--color-text-muted)]">
                    {appointment.notesPreview ?? "No notes"}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/appointments/${appointment.id}`} className="gh-link text-[var(--color-brand-primary)]">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6 text-sm">
          <div className="text-[var(--color-text-muted)]">
            Page {page} of {totalPages} · {pageSize} per page
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildQueueHref(filters, { page: String(Math.max(1, page - 1)) })}
              className={`gh-btn ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
              aria-disabled={page <= 1}
            >
              Previous
            </Link>
            <Link
              href={buildQueueHref(filters, { page: String(Math.min(totalPages, page + 1)) })}
              className={`gh-btn ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
              aria-disabled={page >= totalPages}
            >
              Next
            </Link>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
