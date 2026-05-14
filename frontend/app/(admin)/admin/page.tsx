import Link from "next/link";
import {
  Briefcase,
  CalendarClock,
  ChevronRight,
  Eye,
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
import {
  AdminCard,
  Btn,
  PageHeader,
  SectionHeader,
  StatCard,
} from "./_components/atoms";

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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
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

  // Sorted most-recent-first. Once an audit log exists, swap this in.
  const recentActivity = [...appointments]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6);

  const countryByCode = new Map(
    countries.map((c) => [c.code.toLowerCase(), c] as const),
  );
  const countryBySlug = new Map(countries.map((c) => [c.slug, c] as const));

  const firstName = (user?.fullName?.trim() || user?.email?.split("@")[0] || "Admin")
    .split(/\s+/)[0];

  const quickActions = [
    {
      icon: Plus,
      label: "Add a new doctor",
      sub: "Assign to one or more countries",
      href: "/admin/doctors/create",
    },
    {
      icon: Globe2,
      label: "Enable a new country",
      sub: "Hero, currency, languages",
      href: "/admin/countries/new",
    },
    {
      icon: Briefcase,
      label: "Publish a service",
      sub: "General, specialist, prescription, test",
      href: "/admin/general-consultations/new",
    },
    {
      icon: CalendarClock,
      label: "Review bookings",
      sub: `${pendingAppointments} pending across countries`,
      href: "/admin/appointments",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`${greeting()}, ${firstName}`}
        description="Activity across all five countries. Pick a country in the top-right to scope the rest of the portal."
        actions={
          <>
            <Btn
              href="/"
              variant="secondary"
              size="md"
              iconLeft={<Eye className="size-3.5" aria-hidden />}
            >
              View public site
            </Btn>
            <Btn
              href="/admin/general-consultations/new"
              variant="primary"
              size="md"
              iconLeft={<Plus className="size-3.5" aria-hidden />}
            >
              New service
            </Btn>
          </>
        }
      />

      {/* Stat cards — 4-up grid */}
      <section
        className="mb-6 grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        <StatCard
          label="Active countries"
          value={activeCountries}
          hint={`${countries.length} total`}
          icon={<Globe2 className="size-[18px]" aria-hidden />}
          tone="brand"
          href="/admin/countries"
        />
        <StatCard
          label="Doctors live"
          value={doctorsActive}
          hint={
            doctorsTotal === doctorsActive
              ? "Public profiles"
              : `${doctorsTotal - doctorsActive} inactive`
          }
          icon={<Stethoscope className="size-[18px]" aria-hidden />}
          tone="neutral"
          href="/admin/doctors"
        />
        <StatCard
          label="Services published"
          value={publishedServices}
          hint={`${draftServices} drafts`}
          icon={<Layers className="size-[18px]" aria-hidden />}
          tone="neutral"
          href="/admin/general-consultations"
        />
        <StatCard
          label="Bookings pending"
          value={pendingAppointments}
          hint="Avg 24h reply"
          icon={<CalendarClock className="size-[18px]" aria-hidden />}
          tone="accent"
          href="/admin/appointments"
        />
      </section>

      {/* Two-column: activity (1.4fr) + quick actions (1fr) */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
      >
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader
            title="Recent activity"
            description="Last 24 hours · across all countries"
            right={
              <Btn
                href="/admin/appointments"
                variant="ghost"
                size="sm"
                iconRight={<ChevronRight className="size-3" aria-hidden />}
              >
                View all
              </Btn>
            }
          />
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="gh-icon-tile gh-icon-tile-lg mb-2">
                <FileText className="size-5" aria-hidden />
              </span>
              <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                No activity yet
              </p>
              <p className="max-w-xs text-[12px] text-[var(--color-text-muted)]">
                New booking requests will appear here.
              </p>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {recentActivity.map((row, i) => {
                const key = row.country.toLowerCase();
                const country = countryByCode.get(key) ?? countryBySlug.get(key);
                const actor = row.fullName?.trim() || row.email;
                const verb = "booked";
                const isLast = i === recentActivity.length - 1;
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-3.5 px-5 py-3.5"
                    style={{
                      borderBottom: isLast ? "none" : "1px solid var(--color-border)",
                    }}
                  >
                    {country ? (
                      <FlagBadge code={country.slug} size={14} />
                    ) : (
                      <span
                        aria-hidden
                        style={{
                          width: 20,
                          height: 14,
                          borderRadius: 3,
                          background: "var(--color-background-soft)",
                          border: "1px solid var(--color-border)",
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[13px] text-[var(--color-text-body)]">
                        <strong className="font-bold text-[var(--color-text-primary)]">
                          {actor}
                        </strong>{" "}
                        <span className="text-[var(--color-text-muted)]">{verb}</span>{" "}
                        <strong className="font-bold text-[var(--color-text-primary)]">
                          {row.consultationType}
                        </strong>
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[12px] text-[var(--color-text-muted)]">
                      {timeAgo(new Date(row.createdAt))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminCard>

        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader
            title="Quick actions"
            description="Shortcuts to common tasks"
          />
          <div className="grid gap-2 p-4">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.label}
                  href={a.href}
                  className="group flex items-center gap-3 transition-all duration-150"
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-background-page)",
                    textDecoration: "none",
                  }}
                >
                  <span
                    className="inline-flex shrink-0 items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(200,230,160,0.30)",
                      color: "var(--color-brand-primary)",
                    }}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[13px] font-bold text-[var(--color-text-primary)]">
                      {a.label}
                    </p>
                    <p className="m-0 mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                      {a.sub}
                    </p>
                  </div>
                  <ChevronRight
                    className="size-3.5 shrink-0 text-[var(--color-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-brand-primary)]"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
