import Link from "next/link";
import { ChevronRight, Video } from "lucide-react";
import { fetchDoctorAppointments, type DoctorAppointment } from "@/lib/api/doctor-api";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export default async function DoctorAppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const status = pick(sp, "status");
  const search = pick(sp, "search");
  const page = Number(pick(sp, "page") ?? "1") || 1;

  const result = await fetchDoctorAppointments({
    page: String(page),
    pageSize: "25",
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
  });

  return (
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Doctor
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          My appointments
        </h2>
      </header>

      <div className="gh-card mb-4 p-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Search</span>
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Patient name or email"
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Status</span>
            <select name="status" defaultValue={status ?? ""} className="gh-select">
              <option value="">Any</option>
              <option value="REQUEST_RECEIVED">Request received</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="CONTACTED">Contacted</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <button type="submit" className="gh-btn gh-btn-primary text-sm">
            Apply
          </button>
        </form>
      </div>

      {!result.ok ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </div>
      ) : result.data.items.length === 0 ? (
        <div className="gh-card p-10 text-center text-sm text-[var(--color-text-muted)]">
          No appointments match those filters.
        </div>
      ) : (
        <div className="gh-card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-background-soft)] text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Scheduled</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.data.items.map((a: DoctorAppointment) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {a.fullName}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">{a.email}</p>
                    {a.phone ? (
                      <p className="text-xs text-[var(--color-text-muted)]">{a.phone}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize">{a.consultationType}</td>
                  <td className="px-4 py-3">
                    {a.scheduledAt
                      ? new Date(a.scheduledAt).toLocaleString(undefined, {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{a.status}</td>
                  <td className="px-4 py-3 text-xs">{a.paymentStatus}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {a.meetingUrl ? (
                        <a
                          href={a.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800"
                        >
                          <Video className="size-3.5" aria-hidden /> Join
                        </a>
                      ) : null}
                      <Link
                        href={`/doctor/appointments/${a.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                      >
                        Open <ChevronRight className="size-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.data.pagination.totalPages > 1 ? (
            <div className="border-t border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
              Page {result.data.pagination.page} of {result.data.pagination.totalPages} ({result.data.pagination.total} total)
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
