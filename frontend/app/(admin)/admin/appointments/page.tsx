import Link from "next/link";
import { ExternalLink, CalendarClock } from "lucide-react";
import { fetchAdminAppointments, fetchAdminCountries, fetchAdminDoctors } from "@/lib/admin/admin-api";
import { getActiveCountry, scopedCountryCode } from "@/lib/admin/admin-scope";
import { FlagBadge } from "../_components/flag-badge";
import { ScopeBanner } from "../_components/scope-banner";
import { PortalMobileCard, type PortalMobileCardTone } from "@/components/PortalMobileCard";
import { AppointmentCard, type AppointmentCardTone } from "@/components/AppointmentCard";
import { formatAppTime } from "@/lib/format-datetime";
import {
  AdminCard,
  Btn,
  IconBtn,
  PageHeader,
  Pill,
  type PillTone,
} from "../_components/atoms";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "REQUEST_RECEIVED", label: "Request received" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "COMPLETED", label: "Completed" },
] as const;

const CONSULT_OPTIONS = [
  { value: "", label: "All types" },
  { value: "general", label: "General" },
  { value: "specialist", label: "Specialist" },
  { value: "follow-up", label: "Follow-up" },
] as const;

function spRead(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function buildFilterQuery(
  sp: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  return {
    page: spRead(sp, "page"),
    pageSize: spRead(sp, "pageSize"),
    status: spRead(sp, "status"),
    countryCode: spRead(sp, "countryCode"),
    consultationType: spRead(sp, "consultationType"),
    search: spRead(sp, "search"),
    doctorName: spRead(sp, "doctorName"),
    dateFrom: spRead(sp, "dateFrom"),
    dateTo: spRead(sp, "dateTo"),
  };
}

function buildQueueHref(
  filters: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
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

function statusToneFor(status: string): PillTone {
  if (status === "COMPLETED") return "published";
  if (status === "CANCELLED") return "inactive";
  if (status === "CONTACTED") return "active";
  if (status === "UNDER_REVIEW") return "pending";
  return "neutral";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toLowerCase();
}

function statusToneForCard(status: string): PortalMobileCardTone {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "CONTACTED") return "info";
  if (status === "UNDER_REVIEW") return "warning";
  return "neutral";
}

function statusToneForAppointmentCard(status: string): AppointmentCardTone {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "CONTACTED") return "info";
  if (status === "UNDER_REVIEW") return "warning";
  return "neutral";
}

// Same "in progress now" shape as the Doctor CommandBand instrument and
// AppointmentCard on /doctor/appointments (DESIGN.md §6.1, §5.20):
// scheduled time has passed, the row hasn't been finalized, and we're
// still inside the live window — stale open rows must not glow forever.
const LIVE_WINDOW_MS = 90 * 60 * 1000;

function isAppointmentLive(a: { scheduledAt: string | null; status: string }): boolean {
  if (!a.scheduledAt || a.status === "COMPLETED" || a.status === "CANCELLED") return false;
  const start = new Date(a.scheduledAt).getTime();
  const now = Date.now();
  return start <= now && now <= start + LIVE_WINDOW_MS;
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAppointmentsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};

  // Resolve cookie-scoped country and apply as default countryCode filter.
  const countriesResult = await fetchAdminCountries();
  const countriesForScope = countriesResult.ok ? countriesResult.data.countries : [];
  const activeCountry = await getActiveCountry(countriesForScope);

  const baseFilters = buildFilterQuery(sp);
  const filters: Record<string, string | undefined> = {
    ...baseFilters,
    countryCode: scopedCountryCode(baseFilters.countryCode, activeCountry),
  };
  // Doctor filter options are scoped to the same country as the queue. No
  // isActive filter — deactivated doctors still own historical rows, and
  // dropping them would make those appointments unfilterable.
  const [result, doctorsResult] = await Promise.all([
    fetchAdminAppointments(filters),
    fetchAdminDoctors({ countryCode: filters.countryCode, pageSize: "100" }),
  ]);

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Appointment queue" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load appointments: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const { items, pagination } = result.data;
  const hasRows = items.length > 0;
  const { page, pageSize, total, totalPages } = pagination;

  const countryOptions = [
    { value: "", label: "All countries" },
    ...countriesForScope
      .filter((c) => c.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ value: c.code, label: c.name })),
  ];

  // `doctorName` is matched server-side as a case-insensitive substring
  // against the doctor's full name and login email, so the option value is
  // the full name itself — no backend change needed.
  const activeDoctorName = filters.doctorName ?? "";
  const doctorNames = doctorsResult.ok
    ? Array.from(new Set(doctorsResult.data.items.map((d) => d.fullName))).sort((a, b) =>
        a.localeCompare(b),
      )
    : [];
  const doctorOptions = [
    { value: "", label: "All doctors" },
    ...doctorNames.map((name) => ({ value: name, label: name })),
    // A doctorName arriving by URL (or an email) must stay selected rather
    // than silently resetting to "All doctors" on the next Apply.
    ...(activeDoctorName && !doctorNames.includes(activeDoctorName)
      ? [{ value: activeDoctorName, label: activeDoctorName }]
      : []),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Appointment queue"
        description="Internal review queue. Filters and pagination run on the server; status moves follow rules on the detail page."
        icon={<CalendarClock aria-hidden />}
        actions={
          <Btn
            href={
              activeCountry?.code
                ? `/admin/appointments/new?countryCode=${activeCountry.code}`
                : "/admin/appointments/new"
            }
            variant="primary"
          >
            + New manual booking
          </Btn>
        }
      />

      <ScopeBanner activeCountry={activeCountry} clearHref="/admin/appointments" />

      {/* Filters */}
      <AdminCard padding={0} className="mb-4 overflow-hidden">
        <form method="get" className="gh-admin-appointment-filters px-5 py-4">
          <div className="gh-admin-appointment-filter-grid">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Status</span>
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="gh-select min-w-0"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Country</span>
              <select
                name="countryCode"
                defaultValue={filters.countryCode ?? ""}
                className="gh-select min-w-0"
              >
                {countryOptions.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Consultation type</span>
              <select
                name="consultationType"
                defaultValue={filters.consultationType ?? ""}
                className="gh-select min-w-0"
              >
                {CONSULT_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Search</span>
              <input
                type="search"
                name="search"
                defaultValue={filters.search ?? ""}
                placeholder="Name, email, phone"
                className="gh-input min-w-0"
                maxLength={120}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Doctor</span>
              {doctorNames.length > 0 ? (
                <select
                  name="doctorName"
                  defaultValue={activeDoctorName}
                  className="gh-select min-w-0"
                >
                  {doctorOptions.map((o) => (
                    <option key={o.value || "all"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                /* Doctors endpoint unavailable, or no doctors in this country:
                   keep the free-text filter usable instead of an empty select. */
                <input
                  type="search"
                  name="doctorName"
                  defaultValue={activeDoctorName}
                  placeholder="Doctor name or email"
                  className="gh-input min-w-0"
                  maxLength={120}
                />
              )}
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Date &amp; time from</span>
              <input
                type="datetime-local"
                name="dateFrom"
                defaultValue={filters.dateFrom ?? ""}
                className="gh-input min-w-0"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Date &amp; time to</span>
              <input
                type="datetime-local"
                name="dateTo"
                defaultValue={filters.dateTo ?? ""}
                className="gh-input min-w-0"
              />
            </label>
          </div>
          <input type="hidden" name="page" value="1" />
          <div className="gh-admin-appointment-actions mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className="gh-btn gh-btn-primary min-h-9">
              Apply filters
            </button>
            <Link
              href="/admin/appointments"
              className="text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Clear filters
            </Link>
            <span className="ml-auto text-portal-meta text-[var(--color-text-muted)]">
              {total === 0
                ? "No appointments match these filters."
                : `Showing ${items.length} of ${total} appointment${total === 1 ? "" : "s"}.`}
            </span>
          </div>
        </form>
      </AdminCard>

      {/* Table */}
      <AdminCard padding={0} className="overflow-hidden">
        {!hasRows ? (
          <div className="px-5 py-16 text-center">
            <p className="text-portal-body font-bold text-[var(--color-text-primary)]">
              Nothing in this view yet
            </p>
            <p className="mt-2 text-portal-compact text-[var(--color-text-muted)]">
              Try widening filters or check back after new booking requests arrive.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid gap-2 p-3">
              {items.map((appointment) => {
                const live = isAppointmentLive(appointment);
                return (
                  <AppointmentCard
                    key={appointment.id}
                    href={`/admin/appointments/${appointment.id}`}
                    time={appointment.scheduledAt ? formatAppTime(appointment.scheduledAt) : "—"}
                    timeMeta={
                      appointment.scheduledAt
                        ? new Date(appointment.scheduledAt).toLocaleDateString("en-GB", {
                            month: "short",
                            day: "2-digit",
                          })
                        : `Created ${formatDate(appointment.createdAt)}`
                    }
                    person={appointment.fullName}
                    service={
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <FlagBadge code={appointment.country} size={12} />
                        <span className="truncate">
                          {appointment.consultationType} · {appointment.doctorName ?? "Unassigned"}
                        </span>
                      </span>
                    }
                    tone={statusToneForAppointmentCard(appointment.status)}
                    live={live}
                    statusPill={
                      <Pill tone={live ? "live" : statusToneFor(appointment.status)} withDot>
                        {live ? "Live now" : statusLabel(appointment.status)}
                      </Pill>
                    }
                    action={
                      <IconBtn
                        ariaLabel={`Open ${appointment.fullName}`}
                        href={`/admin/appointments/${appointment.id}`}
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                      </IconBtn>
                    }
                  />
                );
              })}
            </div>

            <div className="gh-admin-appointment-mobile-list">
              {items.map((appointment) => {
                const live = isAppointmentLive(appointment);
                return (
                  <PortalMobileCard
                    key={appointment.id}
                    tone={statusToneForCard(appointment.status)}
                    live={live}
                    title={appointment.fullName}
                    subtitle={appointment.email}
                    statusPill={
                      <Pill tone={live ? "live" : statusToneFor(appointment.status)}>
                        {live ? "Live now" : statusLabel(appointment.status)}
                      </Pill>
                    }
                    meta={[
                      {
                        label: "Country",
                        value: (
                          <span className="inline-flex items-center gap-2">
                            <FlagBadge code={appointment.country} size={14} />
                            <span>{appointment.country.toUpperCase()}</span>
                          </span>
                        ),
                      },
                      { label: "Consultation", value: appointment.consultationType },
                      { label: "Doctor", value: appointment.doctorName ?? "Unassigned" },
                      { label: "Created", value: formatDate(appointment.createdAt) },
                      {
                        label: "Notes",
                        value: (
                          <span className="block max-w-[14rem] truncate" title={appointment.notesPreview ?? undefined}>
                            {appointment.notesPreview ?? "No notes"}
                          </span>
                        ),
                      },
                    ]}
                    actions={
                      <IconBtn
                        ariaLabel={`Open ${appointment.fullName}`}
                        href={`/admin/appointments/${appointment.id}`}
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                      </IconBtn>
                    }
                  />
                );
              })}
            </div>
          </>
        )}

        {totalPages > 1 ? (
          <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-background-soft)] px-5 py-3 text-portal-compact">
            <div className="text-[var(--color-text-muted)]">
              Page {page} of {totalPages} · {pageSize} per page
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildQueueHref(filters, { page: String(Math.max(1, page - 1)) })}
                className={`gh-admin-pager-btn gh-btn gh-btn-soft text-portal-compact ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Previous
              </Link>
              <Link
                href={buildQueueHref(filters, {
                  page: String(Math.min(totalPages, page + 1)),
                })}
                className={`gh-admin-pager-btn gh-btn gh-btn-primary text-portal-compact ${
                  page >= totalPages ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Next
              </Link>
            </div>
          </nav>
        ) : null}
      </AdminCard>
    </>
  );
}
