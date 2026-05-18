import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Calendar,
  ChevronRight,
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
  Btn,
  PageHeader,
  SectionHeader,
  StatCard,
} from "@/components/portal-atoms";
import { formatAppTime } from "@/lib/format-datetime";

export const dynamic = "force-dynamic";

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export default async function DoctorOverviewPage() {
  const result = await fetchDoctorMe();
  if (!result.ok) {
    return (
      <AdminCard>
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {result.message}
        </p>
        {result.status === 403 ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Your account isn&apos;t linked to a doctor profile yet. Ask an
            admin to set it under <span className="font-mono">/admin/users</span>.
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

  const subtitle =
    `${doctor.title} · ${doctor.country.name}` +
    (doctor.additionalCountries.length > 0
      ? ` + ${doctor.additionalCountries.map((c) => c.country.name).join(", ")}`
      : "");

  return (
    <>
      <PageHeader
        eyebrow="Welcome"
        title={doctor.fullName}
        description={subtitle}
      />

      {/* ── Stat tiles ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          tone="brand"
          label="Today"
          value={stats.todayCount}
          hint="Scheduled appointments"
          icon={<Calendar className="size-5" aria-hidden />}
        />
        <StatCard
          tone="accent"
          label="This week"
          value={stats.weekCount}
          hint="Scheduled within 7 days"
          icon={<Calendar className="size-5" aria-hidden />}
        />
        <StatCard
          label="Open"
          value={stats.totalActive}
          hint="Not cancelled or completed"
          icon={<Stethoscope className="size-5" aria-hidden />}
        />
      </div>

      {/* ── Pending-action banner ─────────────────────────────────── */}
      {missingMeetingLink.length > 0 ? (
        <div className="mt-6">
          <AdminCard
            style={{ borderLeft: "3px solid var(--color-status-warning-text)" }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="size-5 shrink-0"
                style={{ color: "var(--color-status-warning-text)" }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[var(--color-text-primary)]">
                  {missingMeetingLink.length} appointment
                  {missingMeetingLink.length === 1 ? "" : "s"} within 24h
                  without a meeting link
                </p>
                <ul className="mt-2 grid gap-1">
                  {missingMeetingLink.slice(0, 5).map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 text-[13px]"
                    >
                      <span className="truncate text-[var(--color-text-primary)]">
                        {a.fullName}
                        <span className="ml-2 text-[var(--color-text-muted)]">
                          {a.scheduledAt ? formatAppTime(a.scheduledAt) : ""}
                        </span>
                      </span>
                      <Link
                        href={`/doctor/appointments/${a.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                      >
                        Add link <ChevronRight className="size-3" />
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
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <AdminCard padding={0} className="lg:col-span-2">
          <SectionHeader
            title="Today's schedule"
            description="Open or upcoming appointments scheduled today."
          />
          <div className="p-5">
            {todayAppointments.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                Nothing on the calendar for today. Browse the full list at{" "}
                <Link
                  href="/doctor/appointments"
                  className="font-semibold text-[var(--color-brand-primary)] hover:underline"
                >
                  My appointments
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {todayAppointments.slice(0, 8).map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                        {a.scheduledAt ? formatAppTime(a.scheduledAt) : "Unscheduled"}{" "}
                        · {a.fullName}
                      </p>
                      <p className="text-[12px] text-[var(--color-text-muted)]">
                        {a.consultationType} · {a.status}
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
                          Join
                        </Btn>
                      ) : null}
                      <Btn
                        href={`/doctor/appointments/${a.id}`}
                        variant="secondary"
                        size="sm"
                        iconRight={<ChevronRight className="size-3.5" />}
                      >
                        Open
                      </Btn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AdminCard>

        <AdminCard padding={0}>
          <SectionHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Bell className="size-4" aria-hidden /> Unread notifications
              </span>
            }
          />
          <div className="p-5">
            {unreadNotifs.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                You&apos;re caught up.
              </p>
            ) : (
              <ul className="grid gap-3">
                {unreadNotifs.slice(0, 6).map((n) => (
                  <li key={n.id} className="text-[13px]">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {n.type.replace(/_/g, " ").toLowerCase()}
                    </p>
                    {n.payload?.snippet ? (
                      <p className="line-clamp-2 text-[12px] text-[var(--color-text-muted)]">
                        {n.payload.snippet}
                      </p>
                    ) : null}
                    {n.payload?.appointmentId ? (
                      <Link
                        href={`/doctor/appointments/${n.payload.appointmentId}`}
                        className="text-[11.5px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                      >
                        Open →
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/doctor/notifications"
              className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-brand-primary)] hover:underline"
            >
              See all <ChevronRight className="size-3" />
            </Link>
          </div>
        </AdminCard>
      </div>

      {/* ── Quick links ───────────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <QuickActionCard
          href="/doctor/patients"
          icon={<Users className="size-5" aria-hidden />}
          label="My patients"
          hint="Search + history"
        />
        <QuickActionCard
          href="/doctor/forms"
          icon={<Calendar className="size-5" aria-hidden />}
          label="Forms"
          hint="Intake / pre-consult / follow-up"
        />
        <QuickActionCard
          href="/doctor/invoices"
          icon={<Stethoscope className="size-5" aria-hidden />}
          label="Invoices"
          hint="Payment status + history"
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
      className="block transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[var(--shadow-card-hover)]"
      style={{
        background: "var(--color-background-page)",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        boxShadow: "var(--shadow-soft)",
        padding: 20,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(200,230,160,0.30)",
            color: "var(--color-brand-primary)",
          }}
        >
          {icon}
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--color-text-primary)]">{label}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
        </div>
      </div>
    </Link>
  );
}
