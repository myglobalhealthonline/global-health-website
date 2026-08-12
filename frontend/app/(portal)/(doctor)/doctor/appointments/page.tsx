import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  SearchX,
  Video,
} from "lucide-react";
import {
  fetchDoctorAppointments,
  fetchDoctorBookingOptions,
  type DoctorAppointment,
} from "@/lib/api/doctor-api";
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
  type PillTone,
} from "@/components/portal-atoms";
import { PortalMobileCard } from "@/components/PortalMobileCard";
import { AppointmentCard, type AppointmentCardTone } from "@/components/AppointmentCard";
import { NotifyDoctorReadyButton } from "@/components/NotifyDoctorReadyButton";
import {
  formatAppDateTimeShort,
  formatAppDayMonth,
  formatAppTime,
  type AppointmentDayBucket,
} from "@/lib/format-datetime";
import { groupAppointmentsByDay } from "@/lib/appointment-day-groups";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { DoctorTourDemo } from "@/components/doctor-tour-demo";

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

// "Notify ready" stops making sense once the consultation's own time window
// has closed — `endAt` is the real slot/service span (see
// resolveConsultationEndAt on the backend); COMPLETED/CANCELLED rows are
// over regardless of the clock.
function isConsultationOver(a: Pick<DoctorAppointment, "endAt" | "status">): boolean {
  if (a.status === "COMPLETED" || a.status === "CANCELLED") return true;
  if (!a.endAt) return false;
  return new Date(a.endAt).getTime() < Date.now();
}

function statusToneForAppointmentCard(status: string): AppointmentCardTone {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

const DAY_BUCKET_TONE: Record<AppointmentDayBucket | "unscheduled", PillTone> = {
  today: "brand",
  tomorrow: "info",
  later: "neutral",
  unscheduled: "neutral",
};

export const dynamic = "force-dynamic";

/**
 * New-system cutover date. Consultations scheduled before this are hidden from
 * the queue and its summary counts — pre-launch/migrated bookings are noise the
 * doctor doesn't act on. Sent to the API as `notBefore`; not a user filter.
 */
const QUEUE_START_DATE = "2026-07-15";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

type Block = {
  key: string;
  label: ReactNode | null;
  collapsible?: boolean;
  items: DoctorAppointment[];
};

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
  const notifyReadyCopy = {
    button: d.appointments.notifyReadyButton,
    sending: d.appointments.notifyReadySending,
    sent: d.appointments.notifyReadySent,
    partial: d.appointments.notifyReadyPartial,
    failed: d.appointments.notifyReadyFailed,
  };
  const sp = searchParams ? await searchParams : {};
  const view = pick(sp, "view");
  const search = pick(sp, "search");
  const from = pick(sp, "from");
  const to = pick(sp, "to");
  const consultationType = pick(sp, "consultationType");
  const openOnly = pick(sp, "openOnly");
  const finalized = pick(sp, "finalized");
  const open = pick(sp, "open");
  const notFinalized = pick(sp, "notFinalized");
  const page = Number(pick(sp, "page") ?? "1") || 1;
  const filterValues = [
    view,
    search,
    from,
    to,
    consultationType,
    openOnly,
    finalized,
    open,
    notFinalized,
  ];
  const hasActiveFilters = filterValues.some(Boolean);
  const activeFilterCount = filterValues.filter(Boolean).length;
  // Same-URL link (not router.refresh — this is a server component page)
  // to give the error state a working "Try again" that re-triggers the fetch.
  const currentQuery = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      typeof v === "string" ? [[k, v]] : [],
    ),
  ).toString();
  const currentUrl = currentQuery ? `/doctor/appointments?${currentQuery}` : "/doctor/appointments";
  // Link to another page, preserving every active filter. `page` is dropped
  // when 1 so the first page stays on the clean base URL.
  const pageHref = (target: number) => {
    const params = new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) =>
        typeof v === "string" && k !== "page" ? [[k, v]] : [],
      ),
    );
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `/doctor/appointments?${qs}` : "/doctor/appointments";
  };

  // Booking permission decides whether the "New booking" action renders.
  // Fetched alongside the queue so the header doesn't wait on a second
  // round-trip; the backend re-checks the flag when the booking is posted.
  const [result, bookingOptions] = await Promise.all([
    fetchDoctorAppointments({
      page: String(page),
      pageSize: "25",
      ...(view ? { view } : {}),
      ...(search ? { search } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(consultationType ? { consultationType } : {}),
      ...(openOnly ? { openOnly: "true" } : {}),
      ...(finalized ? { finalized } : {}),
      ...(open ? { open: "true" } : {}),
      ...(notFinalized ? { notFinalized: "true" } : {}),
      notBefore: QUEUE_START_DATE,
      includeSummary: "true",
    }),
    fetchDoctorBookingOptions(),
  ]);
  const canBookManually =
    bookingOptions.ok && bookingOptions.data.canCreateManualAppointments;
  const appointments = result.ok ? result.data.items : [];
  // Backend returns two buckets (upcoming asc, then past/concluded desc) in one
  // flat list. We further split upcoming rows by calendar day (Today /
  // Tomorrow / Wed 23 Jul …) so proximity is visible at a glance, and tuck
  // the past bucket behind a collapsed `<details>` — grouping only applies
  // on the default unfiltered view where both buckets are present.
  // eslint-disable-next-line react-hooks/purity -- Server Component: evaluated once per request, no client re-render
  const nowMs = Date.now();
  const isUpcomingRow = (a: DoctorAppointment) =>
    a.status !== "CANCELLED" &&
    a.status !== "COMPLETED" &&
    (!a.scheduledAt ||
      new Date(a.scheduledAt).getTime() + LIVE_WINDOW_MS >= nowMs);
  const upcomingRows = appointments.filter(isUpcomingRow);
  const pastRows = appointments.filter((a) => !isUpcomingRow(a));
  const showGrouped = !view && upcomingRows.length > 0 && pastRows.length > 0;
  const blocks: Block[] = showGrouped
    ? [...buildDayBlocks(upcomingRows, d), buildPastBlock(pastRows, d)]
    : [{ key: "all", label: null, items: appointments }];
  // Queue-wide totals from the backend — deliberately not derived from
  // `appointments`, which is only the current page and only the current filter.
  const openAppointments = result.ok ? (result.data.summary?.openConsults ?? 0) : 0;
  const unfinalized = result.ok ? (result.data.summary?.notFinalized ?? 0) : 0;

  return (
    <>
      <PageHeader
        eyebrow={d.appointments.eyebrow}
        title={d.appointments.title}
        description={d.appointments.description}
        icon={<CalendarDays aria-hidden />}
        actions={
          <span className="inline-flex flex-wrap items-center gap-2">
            {/* Only rendered for doctors an admin has granted manual entry.
                The page behind it re-checks, and so does the POST. */}
            {canBookManually ? (
              <Link href="/doctor/appointments/new" className="gh-btn gh-btn-primary text-sm">
                <CalendarPlus className="size-3.5" aria-hidden />{" "}
                {d.manualBooking.newBooking}
              </Link>
            ) : null}
            <Link href="/doctor/calendar" className="gh-btn gh-btn-soft text-sm">
              {d.appointments.calendarView}
            </Link>
          </span>
        }
      />

      {/* Only shown when the doctor has no real appointments — the tour
          walks a real one through the actual workspace tabs instead
          (app/(doctor)/doctor/layout.tsx picks the id). */}
      {appointments.length === 0 ? <DoctorTourDemo strings={d.tour.demo} /> : null}

      {result.ok ? (
        <div data-tour="appointments-summary">
          <AdminSummaryStrip
            className="mb-4"
            items={[
              {
                label: d.appointments.openConsults,
                value: openAppointments,
                hint: d.appointments.openConsultsHint,
                tone: openAppointments > 0 ? "warning" : "neutral",
                icon: <AlertTriangle aria-hidden />,
                href: "/doctor/appointments?open=true",
              },
              {
                label: d.appointments.notFinalized,
                value: unfinalized,
                hint: d.appointments.notFinalizedHint,
                tone: unfinalized > 0 ? "warning" : "neutral",
                icon: <CheckCircle2 aria-hidden />,
                href: "/doctor/appointments?notFinalized=true",
              },
            ]}
          />
        </div>
      ) : null}

      <details className="gh-card gh-doctor-filter-card mb-4 p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <span>{d.common.filters}</span>
          {activeFilterCount > 0 ? (
            <Pill tone="brand">{d.common.activeCount.replace("{count}", String(activeFilterCount))}</Pill>
          ) : null}
        </summary>
        <form className="gh-doctor-filter-grid mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {/* Tile filters have no control of their own — carry them through a
              GET submit so narrowing by type/date doesn't drop them. Reset
              links to the bare path, which still clears them. */}
          {open ? <input type="hidden" name="open" value="true" /> : null}
          {notFinalized ? <input type="hidden" name="notFinalized" value="true" /> : null}
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
          <div className="gh-doctor-filter-actions sm:col-span-2 lg:col-span-6 flex items-center gap-2">
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
          <div className="hidden md:block space-y-5 p-3">
            {blocks.map((block) => (
              <BlockWrap key={block.key} block={block}>
                <div className="grid gap-2">
                  {block.items.map((a) => {
                    const live = isAppointmentLive(a);
                    return (
                      <AppointmentCard
                        key={a.id}
                        time={a.scheduledAt ? formatAppTime(a.scheduledAt) : "—"}
                        timeMeta={
                          a.scheduledAt
                            ? formatAppDayMonth(a.scheduledAt)
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
                              <NotifyDoctorReadyButton
                                appointmentId={a.id}
                                copy={notifyReadyCopy}
                                disabled={isConsultationOver(a)}
                              />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <span className="hidden text-xs text-[var(--portal-muted)] lg:inline">
                                {d.appointments.meetingLinkNotCreated}
                              </span>
                              <Btn href={`/doctor/appointments/${a.id}`} variant="secondary" size="sm">
                                {d.common.open}
                              </Btn>
                            </span>
                          )
                        }
                      />
                    );
                  })}
                </div>
              </BlockWrap>
            ))}
          </div>
          <div className="space-y-5 p-3 md:hidden">
            {blocks.map((block) => (
              <BlockWrap key={block.key} block={block}>
                <div className="grid gap-3">
                  {block.items.map((a) => {
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
                              ? formatAppDateTimeShort(a.scheduledAt)
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
                            {a.meetingUrl ? (
                              <NotifyDoctorReadyButton
                                appointmentId={a.id}
                                copy={notifyReadyCopy}
                                disabled={isConsultationOver(a)}
                              />
                            ) : null}
                          </>
                        }
                      />
                    );
                  })}
                </div>
              </BlockWrap>
            ))}
          </div>
          {result.data.pagination.totalPages > 1 ? (
            <div className="border-t border-[var(--portal-line)] flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-[var(--portal-muted)]">
              <span>
                {d.common.pagination
                  .replace("{page}", String(result.data.pagination.page))
                  .replace("{totalPages}", String(result.data.pagination.totalPages))
                  .replace("{total}", String(result.data.pagination.total))}
              </span>
              <div className="flex items-center gap-2">
                {result.data.pagination.page > 1 ? (
                  <Link
                    href={pageHref(result.data.pagination.page - 1)}
                    rel="prev"
                    className="gh-btn gh-btn-soft text-xs"
                  >
                    {d.common.previous}
                  </Link>
                ) : (
                  <span aria-disabled="true" className="gh-btn gh-btn-soft pointer-events-none text-xs opacity-40">
                    {d.common.previous}
                  </span>
                )}
                {result.data.pagination.page < result.data.pagination.totalPages ? (
                  <Link
                    href={pageHref(result.data.pagination.page + 1)}
                    rel="next"
                    className="gh-btn gh-btn-soft text-xs"
                  >
                    {d.common.next}
                  </Link>
                ) : (
                  <span aria-disabled="true" className="gh-btn gh-btn-soft pointer-events-none text-xs opacity-40">
                    {d.common.next}
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

// Wraps the shared day-grouping (groupAppointmentsByDay) with this page's
// Pill-header rendering.
function buildDayBlocks(
  rows: DoctorAppointment[],
  d: ReturnType<typeof loadLocaleBundle>["doctor"],
): Block[] {
  return groupAppointmentsByDay(rows).map((group) => {
    const text =
      group.bucket === "unscheduled"
        ? d.appointments.sectionUpcoming
        : group.bucket === "today"
          ? d.common.today
          : group.bucket === "tomorrow"
            ? d.common.tomorrow
            : group.label;
    return {
      key: group.key,
      label: (
        <Pill tone={DAY_BUCKET_TONE[group.bucket]} withDot>
          {text}
        </Pill>
      ),
      items: group.items,
    };
  });
}

function buildPastBlock(rows: DoctorAppointment[], d: ReturnType<typeof loadLocaleBundle>["doctor"]): Block {
  return {
    key: "past",
    label: `${d.appointments.sectionPast} (${rows.length})`,
    collapsible: true,
    items: rows,
  };
}

// Renders a block's header (plain or a collapsed `<details>` for the past
// bucket) around its row list. `label === null` (single flat block, e.g. any
// filtered view) renders no header at all.
function BlockWrap({ block, children }: { block: Block; children: ReactNode }) {
  if (block.collapsible) {
    return (
      <details className="gh-doctor-past-group">
        <summary className="mb-2 flex cursor-pointer items-center gap-1 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--portal-muted)]">
          {block.label}
        </summary>
        <div className="pt-2">{children}</div>
      </details>
    );
  }
  return (
    <div>
      {block.label ? <div className="mb-2 px-1">{block.label}</div> : null}
      {children}
    </div>
  );
}
