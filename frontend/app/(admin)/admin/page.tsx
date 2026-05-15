import Link from "next/link";
import { cookies } from "next/headers";
import {
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
  fetchAdminPages,
  fetchAdminServices,
  type AdminPageDto,
} from "@/lib/admin/admin-api";
import { COUNTRY_PREF_COOKIE } from "./_components/country-picker-constants";
import { FlagBadge } from "./_components/flag-badge";
import {
  AdminCard,
  AdminTable,
  Btn,
  PageHeader,
  Pill,
  SectionHeader,
  StatCard,
  Td,
  Th,
  Thead,
  Tr,
} from "./_components/atoms";

export const dynamic = "force-dynamic";

const NON_TERMINAL_STATUSES = new Set([
  "REQUEST_RECEIVED",
  "UNDER_REVIEW",
  "CONTACTED",
]);

const EXPECTED_PAGE_KEYS_PER_COUNTRY = 4; // HOME · DOCTORS_INDEX · GENERAL · SPECIALIST

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

type ActivityItem = {
  id: string;
  kind: "booking" | "page";
  timestamp: Date;
  countrySlug: string | null;
  primary: string; // bold lead text
  verb: string;
  target: string; // bold trailing text
};

export default async function AdminDashboardPage() {
  const user = await getServerAuthUser();
  const jar = await cookies();
  const activeCountrySlug = jar.get(COUNTRY_PREF_COOKIE)?.value ?? null;

  // Fetch everything in parallel. Country/service/page/doctor/appointment
  // queries accept a `countryCode` filter on the backend; we pass the active
  // slug→code so per-country scopes are honored without re-filtering client-side.
  const countriesRes = await fetchAdminCountries();
  const countries = countriesRes.ok ? countriesRes.data.countries : [];
  const activeCountry = activeCountrySlug
    ? countries.find((c) => c.slug === activeCountrySlug) ?? null
    : null;
  const scopeQuery: Record<string, string> = activeCountry
    ? { countryId: activeCountry.id }
    : {};

  const [doctorsRes, servicesRes, appointmentsRes, pagesRes] = await Promise.all([
    fetchAdminDoctors(scopeQuery),
    fetchAdminServices(scopeQuery),
    fetchAdminAppointments(activeCountry ? { countryCode: activeCountry.code } : undefined),
    fetchAdminPages({ ...scopeQuery, pageSize: "100" }),
  ]);

  const doctorsTotal = doctorsRes.ok ? doctorsRes.data.pagination.total : 0;
  const doctorsActive = doctorsRes.ok
    ? doctorsRes.data.items.filter((d) => d.active).length
    : 0;

  const servicesItems = servicesRes.ok ? servicesRes.data.items : [];
  // Only count consultation services that map to public pages — Phase 1
  // surfaces GENERAL + SPECIALIST. Prescriptions / health tests are tracked
  // in their own sections.
  const consultationServices = servicesItems.filter(
    (s) => s.kind === "GENERAL" || s.kind === "SPECIALIST",
  );
  const publishedServices = consultationServices.filter((s) => s.isActive).length;
  const draftServices = consultationServices.filter((s) => !s.isActive).length;

  const appointments = appointmentsRes.ok ? appointmentsRes.data.items : [];
  const pendingAppointments = appointments.filter((a) =>
    NON_TERMINAL_STATUSES.has(a.status),
  ).length;

  const pages: AdminPageDto[] = pagesRes.ok ? pagesRes.data.items : [];
  const publishedPages = pages.filter((p) => p.status === "PUBLISHED" && p.isActive);
  const expectedPages = activeCountry
    ? EXPECTED_PAGE_KEYS_PER_COUNTRY
    : countries.length * EXPECTED_PAGE_KEYS_PER_COUNTRY;

  // Per-country aggregation (only used in global scope).
  const allDoctors = doctorsRes.ok ? doctorsRes.data.items : [];
  const allServices = servicesItems;
  const allPages = pages;
  const countryRows = countries
    .filter((c) => c.isActive)
    .map((c) => {
      const docs = allDoctors.filter((d) => d.country?.id === c.id && d.active).length;
      const svcs = allServices.filter(
        (s) =>
          s.country?.id === c.id &&
          s.isActive &&
          (s.kind === "GENERAL" || s.kind === "SPECIALIST"),
      ).length;
      const pgs = allPages.filter(
        (p) => p.countryId === c.id && p.status === "PUBLISHED" && p.isActive,
      ).length;
      const pending = appointments.filter(
        (a) =>
          a.country?.toLowerCase() === c.code.toLowerCase() &&
          NON_TERMINAL_STATUSES.has(a.status),
      ).length;
      return { country: c, docs, svcs, pgs, pending };
    });

  // Activity feed — merge appointments + recently-updated pages, sorted desc.
  const activity: ActivityItem[] = [];
  for (const a of appointments) {
    activity.push({
      id: `appt:${a.id}`,
      kind: "booking",
      timestamp: new Date(a.createdAt),
      countrySlug:
        countries.find((c) => c.code.toLowerCase() === a.country.toLowerCase())?.slug ?? null,
      primary: a.fullName?.trim() || a.email,
      verb: "booked",
      target: a.consultationType,
    });
  }
  for (const p of pages.slice(0, 12)) {
    activity.push({
      id: `page:${p.id}`,
      kind: "page",
      timestamp: new Date(p.updatedAt),
      countrySlug: p.country?.slug ?? null,
      primary: "Admin",
      verb: p.status === "PUBLISHED" ? "published" : "edited",
      target: `${p.pageKey.replace(/_/g, " ").toLowerCase()} · ${p.locale}`,
    });
  }
  activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const recentActivity = activity.slice(0, 7);

  const firstName = (user?.fullName?.trim() || user?.email?.split("@")[0] || "Admin")
    .split(/\s+/)[0];

  const countryHomeHref = activeCountry
    ? `/admin/pages?countryId=${activeCountry.id}&pageKey=HOME`
    : "/admin/country-home";

  const quickActions = [
    {
      icon: FileText,
      label: activeCountry ? `Edit ${activeCountry.name} home` : "Edit country home",
      sub: activeCountry ? "Hero, copy, CTA, SEO" : "Pick a country first",
      href: countryHomeHref,
    },
    {
      icon: UserRound,
      label: "Add a new doctor",
      sub: activeCountry ? `Assign to ${activeCountry.name}` : "Assign to a country",
      href: "/admin/doctors/create",
    },
    {
      icon: Globe2,
      label: "Enable a new country",
      sub: "Locales, currency, default home",
      href: "/admin/countries/new",
    },
    {
      icon: CalendarClock,
      label: "Review bookings",
      sub: `${pendingAppointments} pending${activeCountry ? " in " + activeCountry.name : " across countries"}`,
      href: "/admin/appointments",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={activeCountry ? `Scope · ${activeCountry.name}` : "Scope · All countries"}
        title={`${greeting()}, ${firstName}`}
        description={
          activeCountry
            ? `Activity scoped to ${activeCountry.name}. Switch the country in the top-right to change scope.`
            : "Activity across all countries. Pick a country in the top-right to drill in."
        }
        actions={
          <>
            <Btn
              href={activeCountry ? `/${activeCountry.slug}` : "/"}
              variant="secondary"
              size="md"
              iconLeft={<Eye className="size-3.5" aria-hidden />}
            >
              View public site
            </Btn>
            <Btn
              href="/admin/pages/new"
              variant="primary"
              size="md"
              iconLeft={<Plus className="size-3.5" aria-hidden />}
            >
              New page
            </Btn>
          </>
        }
      />

      {/* Stat strip — 5 up */}
      <section
        className="mb-6 grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
      >
        <StatCard
          label="Active countries"
          value={countries.filter((c) => c.isActive).length}
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
          label="Pages published"
          value={publishedPages.length}
          hint={`Target ${expectedPages}`}
          icon={<FileText className="size-[18px]" aria-hidden />}
          tone={
            publishedPages.length >= expectedPages ? "brand" : "neutral"
          }
          href={activeCountry ? `/admin/pages?countryId=${activeCountry.id}` : "/admin/pages"}
        />
        <StatCard
          label="Services published"
          value={publishedServices}
          hint={`${draftServices} draft${draftServices === 1 ? "" : "s"}`}
          icon={<Layers className="size-[18px]" aria-hidden />}
          tone="neutral"
          href="/admin/general-consultations"
        />
        <StatCard
          label="Bookings pending"
          value={pendingAppointments}
          hint={pendingAppointments > 0 ? "Needs reply" : "All clear"}
          icon={<CalendarClock className="size-[18px]" aria-hidden />}
          tone={pendingAppointments > 0 ? "accent" : "neutral"}
          href="/admin/appointments"
        />
      </section>

      {/* Two-column body: activity + quick actions */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
      >
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader
            title="Recent activity"
            description={
              activeCountry
                ? `Latest bookings and content edits for ${activeCountry.name}`
                : "Latest bookings and content edits across all countries"
            }
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
                New booking requests and content edits will appear here.
              </p>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {recentActivity.map((row, i) => {
                const isLast = i === recentActivity.length - 1;
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-3.5 px-5 py-3.5"
                    style={{
                      borderBottom: isLast ? "none" : "1px solid var(--color-border)",
                    }}
                  >
                    {row.countrySlug ? (
                      <FlagBadge code={row.countrySlug} size={14} />
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
                          {row.primary}
                        </strong>{" "}
                        <span className="text-[var(--color-text-muted)]">{row.verb}</span>{" "}
                        <strong className="font-bold text-[var(--color-text-primary)]">
                          {row.target}
                        </strong>
                      </p>
                    </div>
                    <Pill tone={row.kind === "booking" ? "pending" : "neutral"}>
                      {row.kind}
                    </Pill>
                    <span className="ml-2 shrink-0 whitespace-nowrap text-[12px] text-[var(--color-text-muted)]">
                      {timeAgo(row.timestamp)}
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

      {/* Country health — only shown when no specific country is scoped.
          One row per active country with at-a-glance counts. Clicking a flag
          jumps into that country's pages list. */}
      {!activeCountry && countryRows.length > 0 ? (
        <AdminCard padding={0} className="mt-4 overflow-hidden">
          <SectionHeader
            title="Country health"
            description="Per-country counts. Click a row to scope the portal to that country."
          />
          <AdminTable>
            <Thead>
              <Th>Country</Th>
              <Th align="right">Doctors</Th>
              <Th align="right">Services</Th>
              <Th align="right">Pages</Th>
              <Th align="right">Pending bookings</Th>
              <Th align="right"></Th>
            </Thead>
            <tbody>
              {countryRows.map((row) => {
                const pagesOk = row.pgs >= EXPECTED_PAGE_KEYS_PER_COUNTRY;
                return (
                  <Tr key={row.country.id}>
                    <Td>
                      <span className="inline-flex items-center gap-2.5">
                        <FlagBadge code={row.country.slug} size={16} />
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {row.country.name}
                        </span>
                      </span>
                    </Td>
                    <Td align="right">{row.docs}</Td>
                    <Td align="right">{row.svcs}</Td>
                    <Td align="right">
                      <span
                        className={
                          pagesOk
                            ? "font-semibold text-[var(--color-brand-primary)]"
                            : "font-semibold text-amber-700"
                        }
                      >
                        {row.pgs} / {EXPECTED_PAGE_KEYS_PER_COUNTRY}
                      </span>
                    </Td>
                    <Td align="right">
                      {row.pending > 0 ? (
                        <Pill tone="pending">{row.pending}</Pill>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">0</span>
                      )}
                    </Td>
                    <Td align="right">
                      <Link
                        href={`/admin/pages?countryId=${row.country.id}`}
                        className="text-[13px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                      >
                        Open
                      </Link>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </AdminTable>
        </AdminCard>
      ) : null}
    </>
  );
}
