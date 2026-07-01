import Link from "next/link";
import { CalendarDays, ChevronRight, SearchX, Video } from "lucide-react";
import { fetchDoctorAppointments, type DoctorAppointment } from "@/lib/api/doctor-api";
import { appointmentStatusLabel } from "@/lib/api/appointment-status-labels";
import {
  AdminEmptyState,
  AdminSummaryStrip,
  PageHeader,
  Pill,
} from "@/components/portal-atoms";

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
  const from = pick(sp, "from");
  const to = pick(sp, "to");
  const consultationType = pick(sp, "consultationType");
  const openOnly = pick(sp, "openOnly");
  const finalized = pick(sp, "finalized");
  const page = Number(pick(sp, "page") ?? "1") || 1;

  const result = await fetchDoctorAppointments({
    page: String(page),
    pageSize: "25",
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(consultationType ? { consultationType } : {}),
    ...(openOnly ? { openOnly: "true" } : {}),
    ...(finalized ? { finalized } : {}),
  });
  const appointments = result.ok ? result.data.items : [];
  const openAppointments = appointments.filter(
    (item) => item.status !== "COMPLETED" && item.status !== "CANCELLED",
  ).length;
  const readyToJoin = appointments.filter((item) => item.meetingUrl).length;
  const unfinalized = appointments.filter((item) => !item.finalized).length;

  return (
    <>
      <PageHeader
        eyebrow="Consultation queue"
        title="My appointments"
        description="Review today's queue, find patient context quickly, and open the consultation workspace without scanning a wide table."
        actions={
          <Link href="/doctor/calendar" className="gh-btn gh-btn-soft text-sm">
            Calendar view
          </Link>
        }
      />

      {result.ok ? (
        <AdminSummaryStrip
          className="mb-4"
          items={[
            {
              label: "Visible results",
              value: appointments.length,
              hint: `${result.data.pagination.total} total`,
              tone: "brand",
            },
            {
              label: "Open consults",
              value: openAppointments,
              hint: "Need clinical attention",
              tone: openAppointments > 0 ? "warning" : "neutral",
            },
            {
              label: "Meeting links",
              value: readyToJoin,
              hint: "Ready to join",
              tone: readyToJoin > 0 ? "success" : "neutral",
            },
            {
              label: "Not finalized",
              value: unfinalized,
              hint: "Notes or documents pending",
              tone: unfinalized > 0 ? "warning" : "neutral",
            },
          ]}
        />
      ) : null}

      <div className="gh-card gh-doctor-filter-card mb-4 p-4">
        <form className="gh-doctor-filter-grid grid grid-cols-1 gap-3 sm:grid-cols-6">
          <label className="flex flex-col gap-1 sm:col-span-2">
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
              <option value="REQUEST_RECEIVED">Created</option>
              <option value="UNDER_REVIEW">Sent</option>
              <option value="CONTACTED">Contacted</option>
              <option value="COMPLETED">Concluded</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Type</span>
            <select
              name="consultationType"
              defaultValue={consultationType ?? ""}
              className="gh-select"
            >
              <option value="">Any</option>
              <option value="general">General</option>
              <option value="specialist">Specialist</option>
              <option value="prescription">Prescription</option>
              <option value="health-test">Health test</option>
              <option value="follow-up">Follow-up</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">From</span>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">To</span>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Finalized</span>
            <select name="finalized" defaultValue={finalized ?? ""} className="gh-select">
              <option value="">Any</option>
              <option value="false">Open (not finalized)</option>
              <option value="true">Finalized</option>
            </select>
          </label>
          <label className="gh-doctor-check-row flex items-end gap-2 pb-2 sm:col-span-2">
            <input
              type="checkbox"
              name="openOnly"
              value="true"
              defaultChecked={openOnly === "true"}
              className="size-4"
            />
            <span className="text-sm">Legacy open window (30h)</span>
          </label>
          <div className="gh-doctor-filter-actions sm:col-span-6 flex items-center gap-2">
            <button type="submit" className="gh-btn gh-btn-primary text-sm">
              Apply
            </button>
            <Link
              href="/doctor/appointments"
              className="gh-btn gh-btn-soft text-sm"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      {!result.ok ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </div>
      ) : appointments.length === 0 ? (
        <AdminEmptyState
          className="gh-doctor-empty-state"
          icon={<SearchX className="size-5" aria-hidden />}
          title="No appointments match these filters"
          description="Try widening the date range or clearing status filters. New assigned consultations appear here as soon as they are scheduled."
          action={
            <Link href="/doctor/appointments" className="gh-btn gh-btn-soft text-sm">
              Clear filters
            </Link>
          }
        />
      ) : (
        <div className="gh-card gh-doctor-table-card p-0 overflow-hidden">
          <div className="hidden md:block gh-doctor-table-wrap overflow-x-auto">
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
              {appointments.map((a: DoctorAppointment) => (
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
                  <td className="px-4 py-3 text-xs">
                    <Pill tone={a.status === "COMPLETED" ? "active" : a.status === "CANCELLED" ? "inactive" : "pending"} withDot>
                      {appointmentStatusLabel(a.status)}
                    </Pill>
                  </td>
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
          </div>
          <div className="grid gap-3 p-3 md:hidden">
            {appointments.map((a) => (
              <article
                key={a.id}
                className="gh-doctor-mobile-card rounded-[10px] border border-[var(--color-border)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                      {a.fullName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                      {a.email}
                    </p>
                  </div>
                  <Pill tone={a.status === "COMPLETED" ? "active" : a.status === "CANCELLED" ? "inactive" : "pending"} withDot>
                    {appointmentStatusLabel(a.status)}
                  </Pill>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Type</dt>
                    <dd className="font-semibold capitalize text-[var(--color-text-primary)]">
                      {a.consultationType}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Scheduled</dt>
                    <dd className="font-semibold text-[var(--color-text-primary)]">
                      {a.scheduledAt
                        ? new Date(a.scheduledAt).toLocaleString(undefined, {
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Unscheduled"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Payment</dt>
                    <dd className="font-semibold text-[var(--color-text-primary)]">
                      {a.paymentStatus}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Meeting</dt>
                    <dd className="font-semibold text-[var(--color-text-primary)]">
                      {a.meetingUrl ? "Ready" : "Not set"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 grid gap-2">
                  {a.meetingUrl ? (
                    <a
                      href={a.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gh-btn gh-btn-primary text-sm"
                    >
                      <Video className="size-3.5" aria-hidden /> Join session
                    </a>
                  ) : null}
                  <Link
                    href={`/doctor/appointments/${a.id}`}
                    className="gh-btn gh-btn-soft text-sm"
                  >
                    <CalendarDays className="size-3.5" aria-hidden /> Open workspace
                  </Link>
                </div>
              </article>
            ))}
          </div>
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
