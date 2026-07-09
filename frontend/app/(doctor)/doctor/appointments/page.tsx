import Link from "next/link";
import { CalendarDays, ChevronRight, SearchX, Video } from "lucide-react";
import { fetchDoctorAppointments, type DoctorAppointment } from "@/lib/api/doctor-api";
import {
  doctorAppointmentView,
  doctorAppointmentViewTone,
} from "@/lib/api/appointment-status-labels";
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
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

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
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const viewStatusText: Record<string, string> = {
    waiting_payment: d.appointments.statusWaitingPayment,
    confirmed: d.appointments.statusConfirmed,
    cancelled: d.appointments.statusCancelled,
    concluded: d.appointments.statusConcluded,
  };
  const sp = searchParams ? await searchParams : {};
  const view = pick(sp, "view");
  const search = pick(sp, "search");
  const from = pick(sp, "from");
  const to = pick(sp, "to");
  const consultationType = pick(sp, "consultationType");
  const openOnly = pick(sp, "openOnly");
  const finalized = pick(sp, "finalized");
  const page = Number(pick(sp, "page") ?? "1") || 1;
  const hasActiveFilters = Boolean(
    view || search || from || to || consultationType || openOnly || finalized,
  );
  const activeFilterCount = [view, search, from, to, consultationType, openOnly, finalized].filter(
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
    ...(view ? { view } : {}),
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
        eyebrow={d.appointments.eyebrow}
        title={d.appointments.title}
        description={d.appointments.description}
        actions={
          <Link href="/doctor/calendar" className="gh-btn gh-btn-soft text-sm">
            {d.appointments.calendarView}
          </Link>
        }
      />

      {result.ok ? (
        <AdminSummaryStrip
          className="mb-4"
          items={[
            {
              label: d.appointments.visibleResults,
              value: appointments.length,
              hint: d.common.totalHint.replace("{total}", String(result.data.pagination.total)),
              tone: "brand",
            },
            {
              label: d.appointments.openConsults,
              value: openAppointments,
              hint: d.appointments.openConsultsHint,
              tone: openAppointments > 0 ? "warning" : "neutral",
            },
            {
              label: d.appointments.meetingLinks,
              value: readyToJoin,
              hint: d.appointments.meetingLinksHint,
              tone: readyToJoin > 0 ? "success" : "neutral",
            },
            {
              label: d.appointments.notFinalized,
              value: unfinalized,
              hint: d.appointments.notFinalizedHint,
              tone: unfinalized > 0 ? "warning" : "neutral",
            },
          ]}
        />
      ) : null}

      <details className="gh-card gh-doctor-filter-card mb-4 p-4" open>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold sm:pointer-events-none sm:cursor-default">
          <span>{d.common.filters}</span>
          {activeFilterCount > 0 ? (
            <Pill tone="brand">{d.common.activeCount.replace("{count}", String(activeFilterCount))}</Pill>
          ) : null}
        </summary>
        <form className="gh-doctor-filter-grid mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="gh-field-label">{d.common.search}</span>
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder={d.appointments.searchPlaceholder}
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{d.common.status}</span>
            <select name="view" defaultValue={view ?? ""} className="gh-select">
              <option value="">{d.common.any}</option>
              <option value="waiting_payment">{d.appointments.statusWaitingPayment}</option>
              <option value="confirmed">{d.appointments.statusConfirmed}</option>
              <option value="cancelled">{d.appointments.statusCancelled}</option>
              <option value="concluded">{d.appointments.statusConcluded}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{d.common.type}</span>
            <select
              name="consultationType"
              defaultValue={consultationType ?? ""}
              className="gh-select"
            >
              <option value="">{d.common.any}</option>
              <option value="general">{d.appointments.typeGeneral}</option>
              <option value="specialist">{d.appointments.typeSpecialist}</option>
              <option value="prescription">{d.appointments.typePrescription}</option>
              <option value="health-test">{d.appointments.typeHealthTest}</option>
              <option value="follow-up">{d.appointments.typeFollowUp}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{d.common.from}</span>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{d.common.to}</span>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{d.appointments.finalized}</span>
            <select name="finalized" defaultValue={finalized ?? ""} className="gh-select">
              <option value="">{d.common.any}</option>
              <option value="false">{d.appointments.finalizedOpen}</option>
              <option value="true">{d.appointments.finalizedDone}</option>
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
            <span className="text-sm">{d.appointments.legacyOpenWindow}</span>
          </label>
          <div className="gh-doctor-filter-actions sm:col-span-6 flex items-center gap-2">
            <button type="submit" className="gh-btn gh-btn-primary text-sm">
              {d.common.apply}
            </button>
            <Link
              href="/doctor/appointments"
              className="gh-btn gh-btn-soft text-sm"
            >
              {d.common.reset}
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
            {d.common.tryAgain}
          </Link>
        </div>
      ) : appointments.length === 0 ? (
        hasActiveFilters ? (
          <AdminEmptyState
            className="gh-doctor-empty-state"
            icon={<SearchX className="size-5" aria-hidden />}
            assetSrc="/images/portal/obsidian/empty-queue.svg"
            title={d.appointments.emptyFilteredTitle}
            description={d.appointments.emptyFilteredDesc}
            action={
              <Link href="/doctor/appointments" className="gh-btn gh-btn-soft text-sm">
                {d.common.clearFilters}
              </Link>
            }
          />
        ) : (
          <AdminEmptyState
            className="gh-doctor-empty-state"
            icon={<CalendarDays className="size-5" aria-hidden />}
            assetSrc="/images/portal/obsidian/empty-queue.svg"
            title={d.appointments.emptyTitle}
            description={d.appointments.emptyDesc}
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
                      : d.common.unscheduled
                  }
                  person={a.fullName}
                  service={<span className="capitalize">{a.consultationType}</span>}
                  tone={statusToneForAppointmentCard(a.status)}
                  live={live}
                  statusPill={
                    <Pill
                      tone={live ? "live" : doctorAppointmentViewTone(doctorAppointmentView(a.status, a.paymentStatus))}
                      withDot
                    >
                      {live ? d.common.liveNow : viewStatusText[doctorAppointmentView(a.status, a.paymentStatus)]}
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
                          {d.common.join}
                        </Btn>
                        <Btn href={`/doctor/appointments/${a.id}`} variant="secondary" size="sm">
                          {d.common.open}
                        </Btn>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-xs text-[var(--portal-muted)]">
                        {d.appointments.meetingLinkNotCreated}
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
                    <Pill
                      tone={live ? "live" : doctorAppointmentViewTone(doctorAppointmentView(a.status, a.paymentStatus))}
                      withDot
                    >
                      {live ? d.common.liveNow : viewStatusText[doctorAppointmentView(a.status, a.paymentStatus)]}
                    </Pill>
                  }
                  tone={a.status === "COMPLETED" ? "success" : a.status === "CANCELLED" ? "danger" : "neutral"}
                  live={live}
                  meta={[
                    { label: d.common.type, value: <span className="capitalize">{a.consultationType}</span> },
                    {
                      label: d.appointments.scheduled,
                      value: a.scheduledAt
                        ? new Date(a.scheduledAt).toLocaleString(undefined, {
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : d.common.unscheduled,
                    },
                    { label: d.common.payment, value: a.paymentStatus },
                    { label: d.appointments.meeting, value: a.meetingUrl ? d.appointments.ready : d.common.notSet },
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
                          <Video className="size-3.5" aria-hidden /> {d.appointments.joinSession}
                        </a>
                      ) : null}
                      <Link
                        href={`/doctor/appointments/${a.id}`}
                        className="gh-btn gh-btn-soft text-sm"
                      >
                        <CalendarDays className="size-3.5" aria-hidden /> {d.appointments.openWorkspace}
                      </Link>
                    </>
                  }
                />
              );
            })}
          </div>
          {result.data.pagination.totalPages > 1 ? (
            <div className="border-t border-[var(--portal-line)] px-4 py-3 text-xs text-[var(--portal-muted)]">
              {d.common.pagination
                .replace("{page}", String(result.data.pagination.page))
                .replace("{totalPages}", String(result.data.pagination.totalPages))
                .replace("{total}", String(result.data.pagination.total))}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
