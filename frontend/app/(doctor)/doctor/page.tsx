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

export const dynamic = "force-dynamic";

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export default async function DoctorOverviewPage() {
  const result = await fetchDoctorMe();
  if (!result.ok) {
    return (
      <div className="gh-card p-6">
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {result.message}
        </p>
        {result.status === 403 ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Your account isn&apos;t linked to a doctor profile yet. Ask an
            admin to set it under <span className="font-mono">/admin/users</span>.
          </p>
        ) : null}
      </div>
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

  // Pending-action queue:
  //   • Appointments scheduled within 24h that don't have a meeting URL set
  //   • Plus the first few unread notifications
  const upcoming24h = todayAppointments.filter(
    (a) =>
      a.scheduledAt &&
      new Date(a.scheduledAt).getTime() <= now.getTime() + 24 * 60 * 60 * 1000,
  );
  const missingMeetingLink = upcoming24h.filter((a) => !a.meetingUrl);
  const unreadNotifs = notifRes.ok ? notifRes.data.items : [];

  return (
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Welcome
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          {doctor.fullName}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {doctor.title} · {doctor.country.name}
          {doctor.additionalCountries.length > 0
            ? " + " +
              doctor.additionalCountries.map((c) => c.country.name).join(", ")
            : ""}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={<Calendar className="size-5" aria-hidden />}
          label="Today"
          value={String(stats.todayCount)}
          hint="Scheduled appointments"
        />
        <StatTile
          icon={<Calendar className="size-5" aria-hidden />}
          label="This week"
          value={String(stats.weekCount)}
          hint="Scheduled within 7 days"
        />
        <StatTile
          icon={<Stethoscope className="size-5" aria-hidden />}
          label="Open"
          value={String(stats.totalActive)}
          hint="Not cancelled or completed"
        />
      </div>

      {missingMeetingLink.length > 0 ? (
        <div
          className="mt-6 gh-card p-5"
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
                        {a.scheduledAt
                          ? new Date(a.scheduledAt).toLocaleString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
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
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="gh-card p-6 lg:col-span-2">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Today&apos;s schedule
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Open or upcoming appointments scheduled today.
          </p>
          {todayAppointments.length === 0 ? (
            <p className="mt-4 text-[13px] text-[var(--color-text-muted)]">
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
            <ul className="mt-4 divide-y divide-[var(--color-border)]">
              {todayAppointments.slice(0, 8).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                      {a.scheduledAt
                        ? new Date(a.scheduledAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Unscheduled"}{" "}
                      · {a.fullName}
                    </p>
                    <p className="text-[12px] text-[var(--color-text-muted)]">
                      {a.consultationType} · {a.status}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    {a.meetingUrl ? (
                      <a
                        href={a.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800"
                      >
                        <Video className="size-3.5" /> Join
                      </a>
                    ) : null}
                    <Link
                      href={`/doctor/appointments/${a.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                    >
                      Open <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gh-card p-6">
          <h3
            className="m-0 inline-flex items-center gap-2 text-[var(--color-text-primary)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            <Bell className="size-4" aria-hidden /> Unread notifications
          </h3>
          {unreadNotifs.length === 0 ? (
            <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
              You&apos;re caught up.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2">
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
        </section>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link
          href="/doctor/patients"
          className="gh-card gh-card-interactive flex items-center gap-4 p-5"
        >
          <span className="gh-icon-circle">
            <Users className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              My patients
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Search + history
            </p>
          </div>
        </Link>
        <Link
          href="/doctor/forms"
          className="gh-card gh-card-interactive flex items-center gap-4 p-5"
        >
          <span className="gh-icon-circle">
            <Calendar className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              Forms
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Intake / pre-consult / follow-up
            </p>
          </div>
        </Link>
        <Link
          href="/doctor/invoices"
          className="gh-card gh-card-interactive flex items-center gap-4 p-5"
        >
          <span className="gh-icon-circle">
            <Stethoscope className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              Invoices
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Payment status + history
            </p>
          </div>
        </Link>
      </div>
    </>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="gh-card flex items-start gap-4 p-5">
      <span className="gh-icon-circle">{icon}</span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className="mt-1 text-3xl font-bold text-[var(--color-text-primary)]">
          {value}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      </div>
    </div>
  );
}
