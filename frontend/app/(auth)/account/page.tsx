import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
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
  CommandBand,
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
  // Paid / needs-action counts mirror the bookings screen, which reads the
  // authoritative `Appointment.paymentStatus`. The separate Payment ledger
  // (`fetchAccountPayments`) can be empty or lag for appointments marked paid
  // outside Stripe (e.g. admin/manual bookings), which showed "0 paid" on the
  // dashboard even though the bookings list said PAID. The Payment ledger is
  // still used below for the "receipts on file" hint.
  const paidPayments = appointments.filter(
    (a) => a.paymentStatus === "PAID",
  ).length;
  const unpaidAppointments = appointments.filter(
    (a) =>
      (a.amountCents ?? 0) > 0 &&
      ["FAILED", "REQUIRES_ACTION", "UNPAID"].includes(a.paymentStatus),
  );
  const paymentActionCount = unpaidAppointments.length;
  const awaitingConfirmation = appointments.filter(
    (a) => a.status === "REQUEST_RECEIVED" || a.status === "UNDER_REVIEW",
  ).length;

  // ── Needs attention band ───────────────────────────────────────────
  // Built only from data already fetched above (appointments) — no extra
  // API calls. Unpaid bookings get one row each (deep-links to the exact
  // booking); requests awaiting confirmation collapse into a single row.
  type NeedsAttentionRow = { key: string; icon: ReactNode; label: string; href: string; action: string };
  const needsAttention: NeedsAttentionRow[] = [
    ...unpaidAppointments.map((appt) => ({
      key: `pay-${appt.id}`,
      icon: <CreditCard className="size-4 shrink-0" style={{ color: "var(--portal-warning-text)" }} aria-hidden />,
      label: a.dashboard.needsAttentionPaymentRow.replace("{type}", appt.consultationType),
      href: `/account/bookings?booking=${appt.id}`,
      action: a.dashboard.payNow,
    })),
    ...(awaitingConfirmation > 0
      ? [
          {
            key: "awaiting-confirmation",
            icon: <Clock className="size-4 shrink-0" style={{ color: "var(--portal-warning-text)" }} aria-hidden />,
            label:
              awaitingConfirmation === 1
                ? a.dashboard.needsAttentionAwaitingOne
                : a.dashboard.needsAttentionAwaitingMany.replace("{count}", String(awaitingConfirmation)),
            href: "/account/bookings",
            action: a.dashboard.reviewAction,
          },
        ]
      : []),
  ];

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
      <CommandBand
        context={a.dashboard.welcome}
        title={user?.fullName || user?.email || "My account"}
        chip={
          ghn ? (
            <>
              {a.dashboard.subtitle} <code>{ghn}</code>
            </>
          ) : undefined
        }
        metrics={
          nextCall
            ? [
                {
                  label: a.dashboard.nextConsultation,
                  value: formatAppDateTime(nextCall.scheduledAt as string),
                  signal: true,
                },
                { label: a.dashboard.openLabel, value: openCount },
                { label: a.dashboard.thisWeek, value: upcomingWeek },
              ]
            : [{ label: a.dashboard.totalLabel, value: totalBookings }]
        }
        action={
          nextCall?.meetingUrl ? (
            <Btn
              href={nextCall.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="sm"
              iconLeft={<Video className="size-3.5" aria-hidden />}
            >
              {a.dashboard.joinCall}
            </Btn>
          ) : (
            <Btn
              href={bookHref}
              variant="on-chrome"
              size="sm"
              iconLeft={<Stethoscope className="size-3.5" aria-hidden />}
            >
              {a.dashboard.bookCta}
            </Btn>
          )
        }
      />

      {/* ── Needs attention (conditional, stat cards below stay) ────── */}
      {needsAttention.length > 0 ? (
        <div
          className="mt-4 rounded-[var(--radius-card)] border-2 px-4 py-4"
          style={{ borderColor: "var(--portal-warning)", background: "var(--portal-warning-soft)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0" style={{ color: "var(--portal-warning-text)" }} aria-hidden />
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--portal-warning-text)" }}>
              {a.dashboard.needsAttentionTitle}
            </h2>
          </div>
          <ul className="divide-y divide-[var(--portal-line)]">
            {needsAttention.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--portal-text)]">
                  {row.icon}
                  <span className="truncate">{row.label}</span>
                </span>
                <Link
                  href={row.href}
                  className="shrink-0 text-portal-compact font-semibold text-[var(--portal-primary)] hover:underline"
                >
                  {row.action}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Stat tiles ─────────────────────────────────────────────── */}
      <div
        className="gh-patient-stat-grid gh-portal-stat-row grid gap-3"
        style={{ "--card-count": 3 } as CSSProperties}
      >
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
            className="block transition hover:shadow-[var(--portal-shadow-hover)]"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <AdminCard
              style={{ borderLeft: "3px solid var(--portal-warning-text)" }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className="size-5 shrink-0"
                  style={{ color: "var(--portal-warning-text)" }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--portal-text)]">
                    {a.dashboard.verifyEmail}
                  </p>
                  <p className="mt-1 text-portal-compact text-[var(--portal-muted)]">
                    {a.dashboard.verifyEmailBody.replace("{email}", user.email)}
                  </p>
                </div>
                <ChevronRight
                  className="size-5 shrink-0 text-[var(--portal-muted)]"
                  aria-hidden
                />
              </div>
            </AdminCard>
          </Link>
        </div>
      ) : null}

      {/* ── Trustpilot review reminder ────────────────────────────── */}
      {/* Trustpilot green (#00b67a) is the third-party brand's own color,
          not a design-system token — scoped as a local CSS var rather than
          forced into --portal-accent, which would misrepresent the brand. */}
      {trustpilot.showCta && trustpilot.trustpilotUrl ? (
        <div className="mt-6" style={{ ["--trustpilot-green" as string]: "#00b67a" }}>
          <AdminCard style={{ borderLeft: "3px solid var(--trustpilot-green)" }}>
            <div className="gh-patient-alert-row flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Star
                  className="size-5 shrink-0"
                  style={{ color: "var(--trustpilot-green)" }}
                  aria-hidden
                />
                <div>
                  <p className="text-portal-thead font-bold uppercase tracking-[0.18em]" style={{ color: "var(--trustpilot-green)" }}>
                    Share your experience
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-[var(--portal-text)]">
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
                className="text-portal-compact font-semibold text-[var(--portal-primary)] hover:underline"
              >
                {a.dashboard.seeAll}
              </Link>
            }
          />
          <div className="p-5">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center rounded-md border border-dashed border-[var(--portal-line)] bg-[var(--portal-well)] px-6 py-10 text-center">
                <CalendarDays
                  className="size-8 text-[var(--portal-line-strong)]"
                  aria-hidden
                />
                <p className="mt-3 text-sm font-semibold text-[var(--portal-text)]">
                  {a.dashboard.noBookings}
                </p>
                <p className="mt-1 max-w-xs text-xs text-[var(--portal-muted)]">
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
              <ul className="divide-y divide-[var(--portal-line)]">
                {recent.map((b) => (
                  <li
                    key={b.id}
                    className="gh-patient-list-row flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--portal-text)]">
                        {b.consultationType}{" "}
                        <span className="text-[var(--portal-muted)]">
                          · {b.countryCode.toUpperCase()}
                        </span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--portal-muted)]">
                        <span>{a.dashboard.booked.replace("{date}", formatAppDateTime(b.createdAt))}</span>
                        <Pill tone={statusTone(b.status)}>
                          {b.status.replace(/_/g, " ").toLowerCase()}
                        </Pill>
                      </p>
                    </div>
                    <Btn
                      href={`/account/bookings?booking=${b.id}`}
                      variant="secondary"
                      size="sm"
                      iconRight={<ChevronRight className="size-3.5" />}
                    >
                      {a.dashboard.viewDetails}
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
              className="mt-4 flex items-center justify-between rounded-md bg-[var(--portal-well)] px-3 py-2.5 text-sm font-bold text-[var(--portal-primary)] hover:bg-[var(--portal-surface)]"
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
      className="gh-patient-quick-link flex items-center justify-between gap-2 rounded-md px-3 py-2.5 transition-colors hover:bg-[var(--portal-well)]"
    >
      <span className="inline-flex items-center gap-2.5">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--portal-well)] text-[var(--portal-primary)]">
          {icon}
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--portal-text)]">
            {label}
          </span>
          <span className="text-portal-thead text-[var(--portal-muted)]">{hint}</span>
        </span>
      </span>
      <ChevronRight className="size-4 text-[var(--portal-muted)]" aria-hidden />
    </Link>
  );
}
