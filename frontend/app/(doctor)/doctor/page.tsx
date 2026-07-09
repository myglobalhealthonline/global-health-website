import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Calendar,
  ChevronRight,
  ClipboardList,
  FileText,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import {
  fetchDoctorAppointments,
  fetchDoctorMe,
  fetchDoctorNotifications,
} from "@/lib/api/doctor-api";
import {
  AdminCard,
  AdminEmptyState,
  Btn,
  CommandBand,
  SectionHeader,
  StatCard,
} from "@/components/portal-atoms";
import { formatAppTime } from "@/lib/format-datetime";
import { doctorAppointmentView } from "@/lib/api/appointment-status-labels";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export default async function DoctorOverviewPage() {
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const NOTIF_TYPE_LABEL: Record<string, string> = {
    APPOINTMENT_ASSIGNED: d.notifications.appointmentAssigned,
    INTERNAL_MESSAGE: d.notifications.internalMessage,
    PATIENT_MESSAGE: d.notifications.patientMessage,
    CONSULT_SIGNED: d.notifications.consultSigned,
    EXAM_LOGGED: d.notifications.examLogged,
    FORM_SUBMITTED: d.notifications.formSubmitted,
  };
  const viewStatusText: Record<string, string> = {
    waiting_payment: d.appointments.statusWaitingPayment,
    confirmed: d.appointments.statusConfirmed,
    cancelled: d.appointments.statusCancelled,
    concluded: d.appointments.statusConcluded,
  };
  const result = await fetchDoctorMe();
  if (!result.ok) {
    return (
      <AdminCard>
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {result.message}
        </p>
        {result.status === 403 ? (
          <p className="mt-3 text-sm text-[var(--portal-muted)]">
            {d.dashboard.notLinked}
          </p>
        ) : null}
      </AdminCard>
    );
  }
  const { doctor, stats } = result.data;

  // Today's schedule + pending-action list. We fetch a wide window
  // and filter locally so a single roundtrip serves both panels.
  const now = new Date();
  const todayStart = startOfDayUtc(now);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const [todayRes, notifRes] = await Promise.all([
    fetchDoctorAppointments({
      page: "1",
      pageSize: "50",
      from: todayStart.toISOString().slice(0, 10),
      to: todayEnd.toISOString().slice(0, 10),
    }),
    fetchDoctorNotifications(true),
  ]);
  const todayAppointments = todayRes.ok
    ? todayRes.data.items.filter(
        (a) => a.status !== "CANCELLED" && a.status !== "COMPLETED",
      )
    : [];

  // Pending-action queue: appointments scheduled within 24h that don't
  // have a meeting URL set + first unread notifications.
  const upcoming24h = todayAppointments.filter(
    (a) =>
      a.scheduledAt &&
      new Date(a.scheduledAt).getTime() <= now.getTime() + 24 * 60 * 60 * 1000,
  );
  const missingMeetingLink = upcoming24h.filter((a) => !a.meetingUrl);
  const unreadNotifs = notifRes.ok ? notifRes.data.items : [];
  const nextAppointment = todayAppointments
    .filter((a) => a.scheduledAt)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt ?? 0).getTime() -
        new Date(b.scheduledAt ?? 0).getTime(),
    )[0];

  const subtitle =
    `${doctor.title} · ${doctor.country.name}` +
    (doctor.additionalCountries.length > 0
      ? ` + ${doctor.additionalCountries.map((c) => c.country.name).join(", ")}`
      : "");

  // "Now" instrument (DESIGN.md §6.1) — is the next appointment already
  // underway? Open list already excludes CANCELLED/COMPLETED; the live
  // window cap keeps stale never-finalized rows from reading live forever.
  const LIVE_WINDOW_MS = 90 * 60 * 1000;
  const isLive = Boolean(
    nextAppointment?.scheduledAt &&
      new Date(nextAppointment.scheduledAt) <= now &&
      now.getTime() <= new Date(nextAppointment.scheduledAt).getTime() + LIVE_WINDOW_MS,
  );

  return (
    <>
      <CommandBand
        context={isLive ? d.dashboard.consultationLive : d.dashboard.nextConsultation}
        title={nextAppointment ? nextAppointment.fullName : d.dashboard.noConsultsToday}
        chip={subtitle}
        metrics={[
          {
            label: d.dashboard.time,
            value: nextAppointment?.scheduledAt ? formatAppTime(nextAppointment.scheduledAt) : "—",
            signal: Boolean(nextAppointment),
            live: isLive ? d.common.liveNow : undefined,
          },
          { label: d.dashboard.today, value: stats.todayCount },
          { label: d.dashboard.thisWeek, value: stats.weekCount },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {nextAppointment?.meetingUrl ? (
              <Btn
                href={nextAppointment.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                size="sm"
                iconLeft={<Video className="size-3.5" aria-hidden />}
              >
                {d.common.join}
              </Btn>
            ) : null}
            <Btn href="/doctor/calendar" variant="on-chrome" size="sm">
              {d.dashboard.calendar}
            </Btn>
            <Btn href="/doctor/availability" variant="on-chrome" size="sm">
              {d.dashboard.availability}
            </Btn>
          </div>
        }
      />

      {/* ── Stat tiles ─────────────────────────────────────────────── */}
      <div className="gh-doctor-stat-grid grid gap-3 sm:grid-cols-[1fr_0.9fr_1.1fr]">
        <StatCard
          tone="brand"
          label={d.dashboard.today}
          value={stats.todayCount}
          hint={d.dashboard.scheduledAppointments}
          icon={<Calendar className="size-5" aria-hidden />}
        />
        <StatCard
          tone="accent"
          label={d.dashboard.thisWeek}
          value={stats.weekCount}
          hint={d.dashboard.scheduledWithin7Days}
          icon={<Calendar className="size-5" aria-hidden />}
        />
        <StatCard
          label={d.dashboard.open}
          value={stats.totalActive}
          hint={d.dashboard.notCancelledOrCompleted}
          icon={<Stethoscope className="size-5" aria-hidden />}
        />
      </div>

      {/* ── Pending-action banner ─────────────────────────────────── */}
      {missingMeetingLink.length > 0 ? (
        <div className="gh-doctor-alert-stack mt-6">
          <AdminCard
            style={{ borderLeft: "3px solid var(--portal-warning-text)" }}
          >
            <div className="gh-doctor-alert-row flex items-start gap-3">
              <AlertTriangle
                className="size-5 shrink-0"
                style={{ color: "var(--portal-warning-text)" }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[var(--portal-text)]">
                  {missingMeetingLink.length === 1
                    ? d.dashboard.missingLinkOne
                    : d.dashboard.missingLinkMany.replace(
                        "{count}",
                        String(missingMeetingLink.length),
                      )}
                </p>
                <ul className="mt-2 grid gap-1">
                  {missingMeetingLink.slice(0, 5).map((a) => (
                    <li
                      key={a.id}
                      className="gh-doctor-alert-list-row flex items-center justify-between gap-2 text-[13px]"
                    >
                      <span className="truncate text-[var(--portal-text)]">
                        {a.fullName}
                        <span className="ml-2 text-[var(--portal-muted)]">
                          {a.scheduledAt ? formatAppTime(a.scheduledAt) : ""}
                        </span>
                      </span>
                      <Link
                        href={`/doctor/appointments/${a.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--portal-primary)] hover:underline"
                      >
                        {d.dashboard.addLink} <ChevronRight className="size-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AdminCard>
        </div>
      ) : null}

      {/* ── Main grid: schedule + notifications ─────────────────── */}
      <div className="gh-doctor-overview-grid mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <AdminCard padding={0} className="gh-doctor-panel">
          <SectionHeader
            title={d.dashboard.todaysSchedule}
            description={d.dashboard.todaysScheduleDesc}
          />
          <div className="p-5">
            {todayAppointments.length === 0 ? (
              <AdminEmptyState
                className="gh-doctor-empty-state"
                icon={<Calendar className="size-5" aria-hidden />}
                assetSrc="/images/portal/obsidian/empty-queue.svg"
                title={d.dashboard.emptyTodayTitle}
                description={d.dashboard.emptyTodayDesc}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Btn href="/doctor/appointments" variant="soft" size="sm">
                      {d.dashboard.myAppointments}
                    </Btn>
                    <Btn href="/doctor/availability" variant="secondary" size="sm">
                      {d.dashboard.addAvailability}
                    </Btn>
                  </div>
                }
              />
            ) : (
              <ul className="gh-doctor-schedule-list divide-y divide-[var(--portal-line)]">
                {todayAppointments.slice(0, 8).map((a) => (
                  <li
                    key={a.id}
                    className="gh-doctor-schedule-row flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--portal-text)]">
                        {a.scheduledAt ? formatAppTime(a.scheduledAt) : d.common.unscheduled}{" "}
                        · {a.fullName}
                      </p>
                      <p className="text-[12px] text-[var(--portal-muted)]">
                        {a.consultationType} · {viewStatusText[doctorAppointmentView(a.status, a.paymentStatus)]}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      {a.meetingUrl ? (
                        <Btn
                          href={a.meetingUrl}
                          variant="primary"
                          size="sm"
                          target="_blank"
                          rel="noopener noreferrer"
                          iconLeft={<Video className="size-3.5" />}
                        >
                          {d.common.join}
                        </Btn>
                      ) : null}
                      <Btn
                        href={`/doctor/appointments/${a.id}`}
                        variant="secondary"
                        size="sm"
                        iconRight={<ChevronRight className="size-3.5" />}
                      >
                        {d.dashboard.open}
                      </Btn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AdminCard>

        <AdminCard padding={0} className="gh-doctor-panel">
          <SectionHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Bell className="size-4" aria-hidden /> {d.dashboard.unreadNotifications}
              </span>
            }
          />
          <div className="p-5">
            {unreadNotifs.length === 0 ? (
              <AdminEmptyState
                className="gh-doctor-empty-state"
                icon={<Bell className="size-5" aria-hidden />}
                assetSrc="/images/portal/obsidian/empty-notifications.svg"
                title={d.dashboard.emptyNotifsTitle}
                description={d.dashboard.emptyNotifsDesc}
              />
            ) : (
              <ul className="gh-doctor-notification-mini-list grid gap-3">
                {unreadNotifs.slice(0, 6).map((n) => (
                  <li key={n.id} className="text-[13px]">
                    <p className="font-semibold text-[var(--portal-text)]">
                      {NOTIF_TYPE_LABEL[n.type] ?? n.type.replace(/_/g, " ").toLowerCase()}
                    </p>
                    {n.payload?.snippet ? (
                      <p className="line-clamp-2 text-[12px] text-[var(--portal-muted)]">
                        {n.payload.snippet}
                      </p>
                    ) : null}
                    {n.payload?.appointmentId ? (
                      <Link
                        href={`/doctor/appointments/${n.payload.appointmentId}`}
                        className="text-[11.5px] font-semibold text-[var(--portal-primary)] hover:underline"
                      >
                        {d.dashboard.openArrow}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/doctor/notifications"
              className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--portal-primary)] hover:underline"
            >
              {d.common.seeAll} <ChevronRight className="size-3" />
            </Link>
          </div>
        </AdminCard>
      </div>

      {/* ── Quick links ───────────────────────────────────────────── */}
      <div className="gh-doctor-quick-grid mt-5 grid gap-3 sm:grid-cols-[1.1fr_0.9fr_1fr]">
        <QuickActionCard
          href="/doctor/patients"
          icon={<Users className="size-5" aria-hidden />}
          label={d.dashboard.myPatients}
          hint={d.dashboard.patientsHint}
        />
        <QuickActionCard
          href="/doctor/forms"
          icon={<ClipboardList className="size-5" aria-hidden />}
          label={d.dashboard.forms}
          hint={d.dashboard.formsHint}
        />
        <QuickActionCard
          href="/doctor/invoices"
          icon={<FileText className="size-5" aria-hidden />}
          label={d.dashboard.invoices}
          hint={d.dashboard.invoicesHint}
        />
      </div>
    </>
  );
}

function QuickActionCard({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="gh-doctor-quick-card block"
      style={{
        padding: "18px 20px",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="gh-doctor-quick-card__tile inline-flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--portal-radius)",
            color: "var(--portal-accent-text)",
          }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="gh-doctor-quick-card__label text-sm font-bold text-[var(--portal-text)]">{label}</p>
          <p className="text-xs text-[var(--portal-muted)]">{hint}</p>
        </div>
      </div>
    </Link>
  );
}
