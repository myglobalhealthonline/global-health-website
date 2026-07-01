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
import { fetchAccountAppointments, fetchTrustpilotReminder, fetchAccountGhn } from "@/lib/api/account-appointments-api";
import { fetchAccountPayments } from "@/lib/api/account-payments-api";
import { resolveBookConsultationHref } from "@/lib/api/last-booking-country";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import {
  AdminCard,
  AdminSummaryStrip,
  Btn,
  PageHeader,
  Pill,
  SectionHeader,
  StatCard,
} from "@/components/portal-atoms";
import { Star } from "lucide-react";
import type { PillTone } from "@/components/portal-atoms";
import { formatAppDateTime } from "@/lib/format-datetime";
import { SubscriptionDashboard } from "./_components/SubscriptionDashboard";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = new Set([
  "REQUEST_RECEIVED",
  "UNDER_REVIEW",
  "CONTACTED",
]);

export default async function AccountOverviewPage() {
  const user = await getServerAuthUser();

  const [apptRes, payRes, bookHref, locale, trustpilot, ghn] = await Promise.all([
    fetchAccountAppointments(),
    fetchAccountPayments(),
    resolveBookConsultationHref(),
    getPageLocale(),
    fetchTrustpilotReminder(),
    fetchAccountGhn(),
  ]);
  const { account: a } = loadLocaleBundle(locale);

  const appointments = apptRes.ok ? apptRes.data.items : [];
  const payments = payRes.ok ? payRes.data.items : [];

  // ── Stat counts ────────────────────────────────────────────────────
  // Server component — `Date.now()` is evaluated once per request, not
  // during a client re-render. The react-hooks/purity lint rule fires
  // because it can't tell server from client, but for an SSR-only page
  // this is fine. (If this file ever becomes "use client", revisit.)
  // eslint-disable-next-line react-hooks/purity
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
  const paidPayments = payments.filter((payment) => payment.status === "PAID").length;
  const paymentActionCount = payments.filter((payment) =>
    ["FAILED", "REQUIRES_ACTION", "UNPAID"].includes(payment.status),
  ).length;

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
    <div className="gh-patient-page gh-patient-overview">
      <PageHeader
        eyebrow={a.dashboard.welcome}
        title={user?.fullName || user?.email || "My account"}
        description={
          ghn ? (
            <span>
              {a.dashboard.subtitle}{" "}
              <code className="rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-xs font-bold">
                {ghn}
              </code>
            </span>
          ) : (
            a.dashboard.subtitle
          )
        }
      />

      {/* ── Stat tiles ─────────────────────────────────────────────── */}
      <div className="gh-patient-stat-grid grid gap-3 sm:grid-cols-[1fr_0.9fr_1.1fr]">
        <StatCard
          tone="brand"
          label={a.dashboard.openLabel}
          value={openCount}
          hint={a.dashboard.activeBookings}
          icon={<CalendarDays className="size-5" aria-hidden />}
        />
        <StatCard
          tone="accent"
          label={a.dashboard.thisWeek}
          value={upcomingWeek}
          hint={a.dashboard.scheduledThisWeek}
          icon={<Clock className="size-5" aria-hidden />}
        />
        <StatCard
          label={a.dashboard.totalLabel}
          value={totalBookings}
          hint={a.dashboard.allTimeBookings}
          icon={<Stethoscope className="size-5" aria-hidden />}
        />
      </div>

      <AdminSummaryStrip
        className="mt-4"
        items={[
          {
            label: "Next appointment",
            value: nextCall?.scheduledAt ? formatAppDateTime(nextCall.scheduledAt) : "Not scheduled",
            hint: nextCall?.meetingUrl ? "Meet link ready" : "Book or wait for scheduling",
          },
          {
            label: "Payments",
            value: paymentActionCount > 0 ? `${paymentActionCount} needs action` : `${paidPayments} paid`,
            hint: `${payments.length} receipt${payments.length === 1 ? "" : "s"} on file`,
          },
          {
            label: "Records",
            value: ghn ? "GHN active" : "Profile pending",
            hint: "Used for prescriptions and medical documents",
          },
          {
            label: "Quick path",
            value: "Book care",
            hint: "Start a consultation or review appointments",
          },
        ]}
      />

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
                    {a.dashboard.verifyEmail}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                    {a.dashboard.verifyEmailBody.replace("{email}", user.email)}
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

      {/* ── Trustpilot review reminder ────────────────────────────── */}
      {trustpilot.showCta && trustpilot.trustpilotUrl ? (
        <div className="mt-6">
          <AdminCard style={{ borderLeft: "3px solid #00b67a" }}>
            <div className="gh-patient-alert-row flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Star
                  className="size-5 shrink-0"
                  style={{ color: "#00b67a" }}
                  aria-hidden
                />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#00b67a" }}>
                    Share your experience
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-[var(--color-text-primary)]">
                    Your consultation is complete — leave us a review on Trustpilot
                  </p>
                </div>
              </div>
              <Btn
                href={trustpilot.trustpilotUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                size="sm"
                iconLeft={<Star className="size-4" />}
              >
                Write a review
              </Btn>
            </div>
          </AdminCard>
        </div>
      ) : null}

      {/* ── Next scheduled call ────────────────────────────────────── */}
      {nextCall ? (
        <div className="mt-6">
          <AdminCard style={{ borderLeft: "3px solid var(--color-brand-primary)" }}>
            <div className="gh-patient-alert-row flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Clock
                  className="size-5 shrink-0 text-[var(--color-brand-primary)]"
                  aria-hidden
                />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                    {a.dashboard.nextConsultation}
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
                  {a.dashboard.joinCall}
                </Btn>
              ) : (
                <Btn href="/account/bookings" variant="secondary" size="sm">
                  {a.dashboard.viewDetails}
                </Btn>
              )}
            </div>
          </AdminCard>
        </div>
      ) : null}

      {/* ── Subscription dashboard (renders nothing for non-subscribers) ── */}
      <SubscriptionDashboard locale={locale} />

      {/* ── Main grid: Recent bookings + Quick actions ────────────── */}
      <div className="gh-patient-overview-grid mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <AdminCard padding={0}>
          <SectionHeader
            title={a.dashboard.recentBookings}
            right={
              <Link
                href="/account/bookings"
                className="text-[13px] font-semibold text-[var(--color-brand-primary)] hover:underline"
              >
                {a.dashboard.seeAll}
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
                  {a.dashboard.noBookings}
                </p>
                <p className="mt-1 max-w-xs text-xs text-[var(--color-text-muted)]">
                  {a.dashboard.noBookingsBody}
                </p>
                <Btn
                  href={bookHref}
                  variant="primary"
                  size="sm"
                  iconRight={<ChevronRight className="size-4" />}
                >
                  {a.dashboard.bookConsultation}
                </Btn>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {recent.map((b) => (
                  <li
                    key={b.id}
                    className="gh-patient-list-row flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {b.consultationType}{" "}
                        <span className="text-[var(--color-text-muted)]">
                          · {b.countryCode.toUpperCase()}
                        </span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        <span>{a.dashboard.booked.replace("{date}", formatAppDateTime(b.createdAt))}</span>
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
                      {a.dashboard.openLabel}
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AdminCard>

        <AdminCard padding={0}>
          <SectionHeader
            title={a.dashboard.quickActions}
            description={a.dashboard.quickActionsBody}
          />
          <div className="p-5">
            <nav className="flex flex-col gap-2">
              <QuickLink
                href="/account/bookings"
                icon={<CalendarDays className="size-4" aria-hidden />}
                label={a.dashboard.goToBookings}
                hint={`${totalBookings} total`}
              />
              <QuickLink
                href="/account/prescriptions"
                icon={<PillBottle className="size-4" aria-hidden />}
                label={a.dashboard.goToPrescriptions}
                hint={a.dashboard.prescriptionsHint}
              />
              <QuickLink
                href="/account/payments"
                icon={<CreditCard className="size-4" aria-hidden />}
                label={a.dashboard.goToPayments}
                hint={`${payments.length} receipt${payments.length === 1 ? "" : "s"}`}
              />
              <QuickLink
                href="/account/profile"
                icon={<UserRound className="size-4" aria-hidden />}
                label={a.dashboard.goToProfile}
                hint={a.dashboard.profileHint}
              />
              <QuickLink
                href="/account/security"
                icon={<ShieldCheck className="size-4" aria-hidden />}
                label={a.dashboard.goToSecurity}
                hint={a.dashboard.securityHint}
              />
            </nav>

            <Link
              href={bookHref}
              className="mt-4 flex items-center justify-between rounded-md bg-[var(--color-background-soft)] px-3 py-2.5 text-sm font-bold text-[var(--color-brand-primary)] hover:bg-[var(--color-background-page)]"
            >
              <span className="inline-flex items-center gap-2">
                <Stethoscope className="size-4" aria-hidden />
                {a.dashboard.bookCta}
              </span>
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        </AdminCard>
      </div>
    </div>
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
      className="gh-patient-quick-link flex items-center justify-between gap-2 rounded-md px-3 py-2.5 transition-colors hover:bg-[var(--color-background-soft)]"
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
