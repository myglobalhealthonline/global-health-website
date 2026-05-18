import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  PillBottle,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Video,
} from "lucide-react";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import { fetchAccountPayments } from "@/lib/api/account-payments-api";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { formatAppDateTime } from "@/lib/format-datetime";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = new Set([
  "REQUEST_RECEIVED",
  "UNDER_REVIEW",
  "CONTACTED",
]);

export default async function AccountOverviewPage() {
  const user = await getServerAuthUser();

  const [apptRes, payRes] = await Promise.all([
    fetchAccountAppointments(),
    fetchAccountPayments(),
  ]);

  const appointments = apptRes.ok ? apptRes.data.items : [];
  const payments = payRes.ok ? payRes.data.items : [];

  // ── Stat counts ────────────────────────────────────────────────────
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const openCount = appointments.filter((a) => ACTIVE_STATUSES.has(a.status)).length;
  const upcomingWeek = appointments.filter(
    (a) =>
      a.scheduledAt &&
      new Date(a.scheduledAt).getTime() >= now &&
      new Date(a.scheduledAt).getTime() <= now + sevenDaysMs,
  ).length;
  const totalBookings = appointments.length;

  // ── Next scheduled call (the soonest upcoming with scheduledAt) ────
  const nextCall = appointments
    .filter((a) => a.scheduledAt && new Date(a.scheduledAt).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt as string).getTime() -
        new Date(b.scheduledAt as string).getTime(),
    )[0];

  // ── Recent activity (latest 5 bookings) ────────────────────────────
  const recent = [...appointments]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  // ── Email verification banner ──────────────────────────────────────
  const emailUnverified = user && !user.emailVerifiedAt;

  return (
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Welcome
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          {user?.fullName || user?.email || "My account"}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Track bookings, payments, and prescriptions — all in one place.
        </p>
      </header>

      {/* ── Stat tiles ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={<CalendarDays className="size-5" aria-hidden />}
          label="Open"
          value={String(openCount)}
          hint="Active booking requests"
        />
        <StatTile
          icon={<Clock className="size-5" aria-hidden />}
          label="This week"
          value={String(upcomingWeek)}
          hint="Scheduled within 7 days"
        />
        <StatTile
          icon={<Stethoscope className="size-5" aria-hidden />}
          label="Total"
          value={String(totalBookings)}
          hint="All-time bookings"
        />
      </div>

      {/* ── Email verification banner ──────────────────────────────── */}
      {emailUnverified ? (
        <Link
          href="/account/security"
          className="mt-6 gh-card flex items-start gap-3 p-5 transition hover:shadow-[var(--shadow-card-hover)]"
          style={{ borderLeft: "3px solid var(--color-status-warning-text)" }}
        >
          <AlertCircle
            className="size-5 shrink-0"
            style={{ color: "var(--color-status-warning-text)" }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              Verify your email
            </p>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              We sent a link to {user.email}. Click it to confirm — or resend
              from Security.
            </p>
          </div>
          <ChevronRight
            className="size-5 shrink-0 text-[var(--color-text-muted)]"
            aria-hidden
          />
        </Link>
      ) : null}

      {/* ── Next scheduled call ────────────────────────────────────── */}
      {nextCall ? (
        <div
          className="mt-6 gh-card p-5"
          style={{ borderLeft: "3px solid var(--color-brand-primary)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Clock
                className="size-5 shrink-0 text-[var(--color-brand-primary)]"
                aria-hidden
              />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                  Next consultation
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--color-text-primary)]">
                  {formatAppDateTime(nextCall.scheduledAt as string)} ·{" "}
                  {nextCall.consultationType}
                </p>
              </div>
            </div>
            {nextCall.meetingUrl ? (
              <a
                href={nextCall.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                <Video className="size-4" aria-hidden />
                Join call
              </a>
            ) : (
              <Link
                href="/account/bookings"
                className="text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
              >
                View details →
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Main grid: Recent bookings (2/3) + Quick links (1/3) ───── */}
      <div
        className="mt-6 grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <section className="gh-card p-6">
          <div className="flex items-center justify-between gap-3">
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Recent bookings
            </h3>
            <Link
              href="/account/bookings"
              className="text-[13px] font-semibold text-[var(--color-brand-primary)] hover:underline"
            >
              See all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="mt-5 flex flex-col items-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] px-6 py-10 text-center">
              <CalendarDays
                className="size-8 text-[var(--color-border-strong)]"
                aria-hidden
              />
              <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
                No bookings yet
              </p>
              <p className="mt-1 max-w-xs text-xs text-[var(--color-text-muted)]">
                Book your first consultation to see it here.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Book consultation
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--color-border)]">
              {recent.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {b.consultationType}{" "}
                      <span className="text-[var(--color-text-muted)]">
                        · {b.countryCode.toUpperCase()}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Booked {formatAppDateTime(b.createdAt)} ·{" "}
                      <StatusPill status={b.status} />
                    </p>
                  </div>
                  <Link
                    href="/account/bookings"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                  >
                    Open
                    <ChevronRight className="size-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="gh-card p-6">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Quick actions
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Jump to the most-used parts of your account.
          </p>
          <nav className="mt-4 flex flex-col gap-2">
            <QuickLink
              href="/account/bookings"
              icon={<CalendarDays className="size-4" aria-hidden />}
              label="My bookings"
              hint={`${totalBookings} total`}
            />
            <QuickLink
              href="/account/prescriptions"
              icon={<PillBottle className="size-4" aria-hidden />}
              label="Prescriptions"
              hint="Issued meds"
            />
            <QuickLink
              href="/account/payments"
              icon={<CreditCard className="size-4" aria-hidden />}
              label="Payments"
              hint={`${payments.length} receipt${payments.length === 1 ? "" : "s"}`}
            />
            <QuickLink
              href="/account/profile"
              icon={<UserRound className="size-4" aria-hidden />}
              label="Profile"
              hint="Name, phone"
            />
            <QuickLink
              href="/account/security"
              icon={<ShieldCheck className="size-4" aria-hidden />}
              label="Security"
              hint="Password, email"
            />
          </nav>

          <Link
            href="/"
            className="mt-4 flex items-center justify-between rounded-md bg-[var(--color-background-soft)] px-3 py-2.5 text-sm font-bold text-[var(--color-brand-primary)] hover:bg-[var(--color-background-page)]"
          >
            <span className="inline-flex items-center gap-2">
              <Stethoscope className="size-4" aria-hidden />
              Book a consultation
            </span>
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </aside>
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
    <div className="gh-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {label}
        </p>
        <span className="gh-icon-circle">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "COMPLETED"
      ? "text-emerald-700"
      : status === "CANCELLED"
        ? "text-rose-700"
        : status === "CONTACTED"
          ? "text-blue-700"
          : status === "UNDER_REVIEW"
            ? "text-amber-700"
            : "text-[var(--color-text-muted)]";
  return (
    <span className={`font-semibold ${tone}`}>
      {status
        .toLowerCase()
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ")}
    </span>
  );
}

function QuickLink({
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
      className="flex items-center justify-between gap-2 rounded-md px-3 py-2.5 transition-colors hover:bg-[var(--color-background-soft)]"
    >
      <span className="inline-flex items-center gap-2.5">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-background-soft)] text-[var(--color-brand-primary)]">
          {icon}
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            {label}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">{hint}</span>
        </span>
      </span>
      <ChevronRight className="size-4 text-[var(--color-text-muted)]" aria-hidden />
    </Link>
  );
}
