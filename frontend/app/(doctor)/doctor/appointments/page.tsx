import Link from "next/link";
import { CalendarDays, ChevronRight, SearchX, Video } from "lucide-react";
import { fetchDoctorAppointments, type DoctorAppointment } from "@/lib/api/doctor-api";
import { appointmentStatusLabel } from "@/lib/api/appointment-status-labels";
import {
  AdminEmptyState,
  AdminSummaryStrip,
  Btn,
  PageHeader,
  Pill,
} from "@/components/portal-atoms";
import { PortalMobileCard } from "@/components/PortalMobileCard";
import { AppointmentCard, type AppointmentCardTone } from "@/components/AppointmentCard";
import { formatAppTime } from "@/lib/format-datetime";

// Same-shape "in progress now" check as the CommandBand instrument on
// /doctor (DESIGN.md §6.1) — scheduled time has passed, the row is still
// open (not finalized to COMPLETED/CANCELLED), and we're still inside the
// live window. Without the window cap, every stale never-finalized row
// reads "Live now" forever.
const LIVE_WINDOW_MS = 90 * 60 * 1000;

function isAppointmentLive(a: Pick<DoctorAppointment, "scheduledAt" | "status">): boolean {
  if (!a.scheduledAt || a.status === "COMPLETED" || a.status === "CANCELLED") return false;
  const start = new Date(a.scheduledAt).getTime();
  const now = Date.now();
  return start <= now && now <= start + LIVE_WINDOW_MS;
}

function statusToneForAppointmentCard(status: string): AppointmentCardTone {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

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
  const hasActiveFilters = Boolean(
    status || search || from || to || consultationType || openOnly || finalized,
  );
  const activeFilterCount = [status, search, from, to, consultationType, openOnly, finalized].filter(
    Boolean,
  ).length;
  // Same-URL link (not router.refresh — this is a server component page)
  // to give the error state a working "Try again" that re-triggers the fetch.
  const currentQuery = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      typeof v === "string" ? [[k, v]] : [],
    ),
  ).toString();
  const currentUrl = currentQuery ? `/doctor/appointments?${currentQuery}` : "/doctor/appointments";

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

      <details className="gh-card gh-doctor-filter-card mb-4 p-4" open>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold sm:pointer-events-none sm:cursor-default">
          <span>Filters</span>
          {activeFilterCount > 0 ? (
            <Pill tone="brand">{activeFilterCount} active</Pill>
          ) : null}
        </summary>
        <form className="gh-doctor-filter-grid mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
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
      </details>

      {!result.ok ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
          <Link href={currentUrl} className="gh-btn gh-btn-soft text-sm mt-3 inline-flex">
            Try again
          </Link>
        </div>
      ) : appointments.length === 0 ? (
        hasActiveFilters ? (
          <AdminEmptyState
            className="gh-doctor-empty-state"
            icon={<SearchX className="size-5" aria-hidden />}
            assetSrc="/images/portal/obsidian/empty-queue.svg"
            title="No appointments match these filters"
            description="Try widening the date range or clearing status filters. New assigned consultations appear here as soon as they are scheduled."
            action={
              <Link href="/doctor/appointments" className="gh-btn gh-btn-soft text-sm">
                Clear filters
              </Link>
            }
          />
        ) : (
          <AdminEmptyState
            className="gh-doctor-empty-state"
            icon={<CalendarDays className="size-5" aria-hidden />}
            assetSrc="/images/portal/obsidian/empty-queue.svg"
            title="No appointments yet"
            description="New assigned consultations will appear here as soon as they are scheduled."
          />
        )
      ) : (
        <div className="gh-card gh-card-jewel gh-doctor-table-card p-0 overflow-hidden">
          <div className="hidden md:grid gap-2 p-3">
            {appointments.map((a: DoctorAppointment) => {
              const live = isAppointmentLive(a);
              return (
                <AppointmentCard
                  key={a.id}
                  href={a.meetingUrl ? undefined : `/doctor/appointments/${a.id}`}
                  time={a.scheduledAt ? formatAppTime(a.scheduledAt) : "—"}
                  timeMeta={
                    a.scheduledAt
                      ? new Date(a.scheduledAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "2-digit",
                        })
                      : "Unscheduled"
                  }
                  person={a.fullName}
                  service={<span className="capitalize">{a.consultationType}</span>}
                  tone={statusToneForAppointmentCard(a.status)}
                  live={live}
                  statusPill={
                    <Pill tone={live ? "live" : a.status === "COMPLETED" ? "active" : a.status === "CANCELLED" ? "inactive" : "pending"} withDot>
                      {live ? "Live now" : appointmentStatusLabel(a.status)}
                    </Pill>
                  }
                  action={
                    a.meetingUrl ? (
                      <span className="inline-flex items-center gap-2">
                        <Btn
                          href={a.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="primary"
                          size="sm"
                          iconLeft={<Video className="size-3.5" aria-hidden />}
                        >
                          Join
                        </Btn>
                        <Btn href={`/doctor/appointments/${a.id}`} variant="secondary" size="sm">
                          Open
                        </Btn>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-xs text-[var(--portal-muted)]">
                        Meeting link not yet created
                        <ChevronRight className="size-4" aria-hidden />
                      </span>
                    )
                  }
                />
              );
            })}
          </div>
          <div className="grid gap-3 p-3 md:hidden">
            {appointments.map((a) => {
              const live = isAppointmentLive(a);
              return (
                <PortalMobileCard
                  key={a.id}
                  title={a.fullName}
                  subtitle={a.email}
                  statusPill={
                    <Pill tone={live ? "live" : a.status === "COMPLETED" ? "active" : a.status === "CANCELLED" ? "inactive" : "pending"} withDot>
                      {live ? "Live now" : appointmentStatusLabel(a.status)}
                    </Pill>
                  }
                  tone={a.status === "COMPLETED" ? "success" : a.status === "CANCELLED" ? "danger" : "neutral"}
                  live={live}
                  meta={[
                    { label: "Type", value: <span className="capitalize">{a.consultationType}</span> },
                    {
                      label: "Scheduled",
                      value: a.scheduledAt
                        ? new Date(a.scheduledAt).toLocaleString(undefined, {
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Unscheduled",
                    },
                    { label: "Payment", value: a.paymentStatus },
                    { label: "Meeting", value: a.meetingUrl ? "Ready" : "Not set" },
                  ]}
                  actions={
                    <>
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
                    </>
                  }
                />
              );
            })}
          </div>
          {result.data.pagination.totalPages > 1 ? (
            <div className="border-t border-[var(--portal-line)] px-4 py-3 text-xs text-[var(--portal-muted)]">
              Page {result.data.pagination.page} of {result.data.pagination.totalPages} ({result.data.pagination.total} total)
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
