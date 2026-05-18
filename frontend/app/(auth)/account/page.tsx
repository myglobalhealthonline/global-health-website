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
import {
  AdminCard,
  Btn,
  PageHeader,
  Pill,
  SectionHeader,
  StatCard,
} from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";
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

  // ── Next scheduled call ────────────────────────────────────────────
  const nextCall = appointments
    .filter((a) => a.scheduledAt && new Date(a.scheduledAt).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt as string).getTime() -
        new Date(b.scheduledAt as string).getTime(),
    )[0];

  // ── Recent activity ───────────────────────────────────────────────
  const recent = [...appointments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const emailUnverified = user && !user.emailVerifiedAt;

  return (
    <>
      <PageHeader
        eyebrow="Welcome"
        title={user?.fullName || user?.email || "My account"}
        description="Track bookings, payments, and prescriptions — all in one place."
      />

      {/* ── Stat tiles ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          tone="brand"
          label="Open"
          value={openCount}
          hint="Active booking requests"
          icon={<CalendarDays className="size-5" aria-hidden />}
        />
        <StatCard
          tone="accent"
          label="This week"
          value={upcomingWeek}
          hint="Scheduled within 7 days"
          icon={<Clock className="size-5" aria-hidden />}
        />
        <StatCard
          label="Total"
          value={totalBookings}
          hint="All-time bookings"
          icon={<Stethoscope className="size-5" aria-hidden />}
        />
      </div>

      {/* ── Email verification banner ──────────────────────────────── */}
      {emailUnverified ? (
        <div className="mt-6">
          <Link
            href="/account/security"
            className="block transition hover:shadow-[var(--shadow-card-hover)]"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <AdminCard
              style={{ borderLeft: "3px solid var(--color-status-warning-text)" }}
            >
              <div className="flex items-start gap-3">
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
                    We sent a link to {user.email}. Click it to confirm — or
                    resend from Security.
                  </p>
                </div>
                <ChevronRight
                  className="size-5 shrink-0 text-[var(--color-text-muted)]"
                  aria-hidden
                />
              </div>
            </AdminCard>
          </Link>
        </div>
      ) : null}

      {/* ── Next scheduled call ────────────────────────────────────── */}
      {nextCall ? (
        <div className="mt-6">
          <AdminCard style={{ borderLeft: "3px solid var(--color-brand-primary)" }}>
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
                <Btn
                  href={nextCall.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                  size="sm"
                  iconLeft={<Video className="size-4" />}
                >
                  Join call
                </Btn>
              ) : (
                <Btn href="/account/bookings" variant="secondary" size="sm">
                  View details
                </Btn>
              )}
            </div>
          </AdminCard>
        </div>
      ) : null}

      {/* ── Main grid: Recent bookings + Quick actions ────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <AdminCard padding={0} className="lg:col-span-2">
          <SectionHeader
            title="Recent bookings"
            right={
              <Link
                href="/account/bookings"
                className="text-[13px] font-semibold text-[var(--color-brand-primary)] hover:underline"
              >
                See all →
              </Link>
            }
          />
          <div className="p-5">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] px-6 py-10 text-center">
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
                <Btn
                  href="/"
                  variant="primary"
                  size="sm"
                  iconRight={<ChevronRight className="size-4" />}
                >
                  Book consultation
                </Btn>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
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
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        <span>Booked {formatAppDateTime(b.createdAt)}</span>
                        <Pill tone={statusTone(b.status)}>
                          {b.status.replace(/_/g, " ").toLowerCase()}
                        </Pill>
                      </p>
                    </div>
                    <Btn
                      href="/account/bookings"
                      variant="secondary"
                      size="sm"
                      iconRight={<ChevronRight className="size-3.5" />}
                    >
                      Open
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AdminCard>

        <AdminCard padding={0}>
          <SectionHeader
            title="Quick actions"
            description="Jump to the most-used parts of your account."
          />
          <div className="p-5">
            <nav className="flex flex-col gap-2">
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
          </div>
        </AdminCard>
      </div>
    </>
  );
}

function statusTone(status: string): PillTone {
  if (status === "COMPLETED") return "published";
  if (status === "CANCELLED") return "inactive";
  if (status === "CONTACTED") return "active";
  if (status === "UNDER_REVIEW") return "pending";
  return "neutral";
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
