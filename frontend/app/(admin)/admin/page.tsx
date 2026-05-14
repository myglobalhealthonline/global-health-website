import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  FileText,
  Globe2,
  Layers,
  Plus,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  fetchAdminAppointments,
  fetchAdminCountries,
  fetchAdminDoctors,
  fetchAdminServices,
} from "@/lib/admin/admin-api";
import { FlagBadge } from "./_components/flag-badge";

export const dynamic = "force-dynamic";

const NON_TERMINAL_STATUSES = new Set([
  "REQUEST_RECEIVED",
  "UNDER_REVIEW",
  "CONTACTED",
]);

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toISOString().slice(0, 10);
}

function statusLabel(status: string): string {
  const lower = status.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default async function AdminDashboardPage() {
  const user = await getServerAuthUser();

  const [countriesRes, doctorsRes, servicesRes, appointmentsRes] = await Promise.all([
    fetchAdminCountries(),
    fetchAdminDoctors(),
    fetchAdminServices(),
    fetchAdminAppointments(),
  ]);

  const countries = countriesRes.ok ? countriesRes.data.countries : [];
  const activeCountries = countries.filter((c) => c.isActive).length;

  const doctorsTotal = doctorsRes.ok ? doctorsRes.data.pagination.total : 0;
  const doctorsActive = doctorsRes.ok
    ? doctorsRes.data.items.filter((d) => d.active).length
    : 0;

  const servicesItems = servicesRes.ok ? servicesRes.data.items : [];
  const publishedServices = servicesItems.filter((s) => s.isActive).length;
  const draftServices = servicesItems.filter((s) => !s.isActive).length;

  const appointments = appointmentsRes.ok ? appointmentsRes.data.items : [];
  const pendingAppointments = appointments.filter((a) =>
    NON_TERMINAL_STATUSES.has(a.status),
  ).length;

  // TODO: replace with audit log when available
  const recentActivity = [...appointments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  // Country lookup by code (appointment.country is lowercase ISO code or slug).
  const countryByCode = new Map(
    countries.map((c) => [c.code.toLowerCase(), c] as const),
  );
  const countryBySlug = new Map(countries.map((c) => [c.slug, c] as const));

  const stats = [
    {
      label: "Active countries",
      value: activeCountries,
      hint: `${countries.length} total`,
      icon: Globe2,
      tone: "brand" as const,
      href: "/admin/countries",
    },
    {
      label: "Doctors live",
      value: doctorsActive,
      hint:
        doctorsTotal === doctorsActive
          ? "Public profiles"
          : `${doctorsTotal - doctorsActive} inactive`,
      icon: Stethoscope,
      tone: "neutral" as const,
      href: "/admin/doctors",
    },
    {
      label: "Services published",
      value: publishedServices,
      hint: `${draftServices} drafts`,
      icon: Layers,
      tone: "neutral" as const,
      href: "/admin/general-consultations",
    },
    {
      label: "Bookings pending",
      value: pendingAppointments,
      hint: "Avg 24h reply",
      icon: CalendarClock,
      tone: "accent" as const,
      href: "/admin/appointments",
    },
  ];

  const quickActions = [
    { href: "/admin/countries/new", label: "Add country", icon: Globe2 },
    { href: "/admin/doctors/create", label: "Add doctor", icon: UserRound },
    { href: "/admin/general-consultations/new", label: "Add service", icon: Stethoscope },
    { href: "/admin/specialties", label: "Add category", icon: Layers },
  ];

  const displayName = user?.fullName?.trim() || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="space-y-8">
      <header>
        <p className="gh-eyebrow">Welcome back</p>
        <h1 className="gh-h2 mt-2">{displayName}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Manage every country, doctor, and service from one place.
        </p>
      </header>

      {/* Stat cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="gh-card group flex flex-col gap-3 p-5 transition hover:-translate-y-px hover:shadow-[var(--shadow-card-hover)]"
            >
              <div className="flex items-start justify-between">
                <span
                  className="inline-flex size-11 items-center justify-center rounded-2xl"
                  style={{
                    background:
                      s.tone === "brand"
                        ? "var(--color-brand-primary)"
                        : s.tone === "accent"
                          ? "var(--color-brand-accent)"
                          : "var(--color-background-soft)",
                    color: s.tone === "brand" ? "white" : "var(--color-brand-primary)",
                  }}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <ArrowRight
                  className="size-4 text-[var(--color-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-brand-primary)]"
                  aria-hidden
                />
              </div>
              <div>
                <p className="text-3xl font-extrabold leading-none tracking-tight text-[var(--color-text-primary)]">
                  {s.value}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                  {s.label}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">{s.hint}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Recent activity */}
        <section className="gh-card p-6">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="gh-eyebrow">Activity</p>
              <h2 className="gh-h3 mt-1">Recent bookings</h2>
            </div>
            <Link
              href="/admin/appointments"
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-brand-primary)] hover:underline"
            >
              View all <ArrowRight className="size-3" aria-hidden />
            </Link>
          </header>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <FileText className="size-8 text-[var(--color-text-muted)]" aria-hidden />
              <p className="text-sm text-[var(--color-text-muted)]">
                No admin activity yet. New booking requests will show up here.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {recentActivity.map((row) => {
                const key = row.country.toLowerCase();
                const country = countryByCode.get(key) ?? countryBySlug.get(key);
                const actor = row.fullName || row.email;
                const initials = (row.fullName || row.email)
                  .split(/\s+|@/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? "")
                  .join("");
                return (
                  <li
                    key={row.id}
                    className="flex items-start gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-page,#fff)] p-3"
                  >
                    <span
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
                      style={{ background: "var(--color-brand-primary)" }}
                    >
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--color-text-primary)]">
                        <span className="font-semibold">{actor}</span>{" "}
                        <span className="text-[var(--color-text-muted)]">
                          booked {row.consultationType}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                        {statusLabel(row.status)}
                        {row.email ? ` · ${row.email}` : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                      {country ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                          <FlagBadge code={country.slug} size={12} />
                          {country.code}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                          {row.country}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {timeAgo(new Date(row.createdAt))}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Quick actions */}
        <aside className="gh-card flex flex-col gap-4 p-6">
          <header>
            <p className="gh-eyebrow">Shortcuts</p>
            <h2 className="gh-h3 mt-1">Quick actions</h2>
          </header>
          <div className="grid gap-2">
            {quickActions.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.href}
                  href={q.href}
                  className="group flex items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-page,#fff)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)]"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-[var(--color-brand-primary)]" aria-hidden />
                    {q.label}
                  </span>
                  <Plus
                    className="size-3.5 text-[var(--color-text-muted)] transition group-hover:text-[var(--color-brand-primary)]"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
          <div
            className="mt-2 rounded-[var(--radius-card-sm)] p-4 text-xs leading-relaxed text-[var(--color-text-muted)]"
            style={{ background: "var(--color-background-soft)" }}
          >
            <p className="font-semibold text-[var(--color-text-primary)]">Scope reminder</p>
            <p className="mt-1">
              Doctors are public profiles only. Payments are not enabled yet. Patient portal is v2.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
