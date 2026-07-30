import Link from "next/link";
import { Building2, CalendarCheck2, CheckCircle2, ClipboardList, Mail, UserCheck, Users } from "lucide-react";
import {
  fetchCorporateOverview,
  fetchCorporatePortalRequests,
} from "@/lib/corporate/corporate-api";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  PageHeader,
  Pill,
  SectionHeader,
} from "@/components/portal-atoms";
import {
  companyStatusLabel,
  companyStatusTone,
  formatCents,
  requestStatusLabel,
  requestStatusTone,
  REQUEST_TYPE_LABELS,
} from "@/app/(portal)/(admin)/admin/corporate/_lib";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

export default async function CorporateDashboardPage() {
  const locale = await getPortalLocale();
  const { corporate: t } = loadLocaleBundle(locale);
  const d = t.dashboard;

  /** Onboarding funnel buckets — collapses the 12-state machine into the
   *  four stages a company admin actually tracks. */
  const FUNNEL: { label: string; statuses: string[] }[] = [
    { label: d.funnelInvited, statuses: ["DRAFT", "INVITED", "INVITE_SENT", "INVITE_FAILED"] },
    {
      label: d.funnelRegistered,
      statuses: ["REGISTERED", "PROFILE_INCOMPLETE", "PROFILE_COMPLETE", "PREASSESSMENT_PENDING"],
    },
    { label: d.funnelPreassessmentBooked, statuses: ["PREASSESSMENT_BOOKED"] },
    { label: d.funnelActive, statuses: ["ACTIVE"] },
  ];

  const [overviewResult, requestsResult] = await Promise.all([
    fetchCorporateOverview(),
    fetchCorporatePortalRequests(),
  ]);

  if (!overviewResult.ok) {
    return (
      <>
        <PageHeader eyebrow={d.eyebrow} title={t.nav.dashboard} />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {d.loadErrorPrefix}: {overviewResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const overview = overviewResult.data;
  const funnel = FUNNEL.map((bucket) => ({
    label: bucket.label,
    count: bucket.statuses.reduce((sum, s) => sum + (overview.statusCounts[s] ?? 0), 0),
  }));
  const recentRequests = requestsResult.ok ? requestsResult.data.requests.slice(0, 6) : [];
  const FUNNEL_ICONS = [
    <Mail key="invited" aria-hidden />,
    <UserCheck key="registered" aria-hidden />,
    <CalendarCheck2 key="preassessment" aria-hidden />,
    <CheckCircle2 key="active" aria-hidden />,
  ];

  return (
    <>
      <PageHeader
        eyebrow={d.eyebrow}
        title={overview.companyName}
        description={d.planDescription.replace("{plan}", overview.planName)}
        icon={<Building2 aria-hidden />}
        actions={
          <Pill tone={companyStatusTone(overview.companyStatus)}>
            {companyStatusLabel(overview.companyStatus)}
          </Pill>
        }
      />

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: d.summaryEmployeesLabel,
            value: overview.employeeTotal,
            hint: d.summaryEmployeesHint,
            tone: "brand",
            icon: <Users aria-hidden />,
          },
          ...funnel.map((bucket, i) => ({
            label: bucket.label,
            value: bucket.count,
            tone: "neutral" as const,
            icon: FUNNEL_ICONS[i],
          })),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Billing */}
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader
            title={d.billingTitle}
            description={d.billingDescription}
          />
          <div className="border-t border-[var(--color-border)] px-5 py-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              {d.billingLine
                .replace("{count}", String(overview.billing.employeeCount))
                .replace("{price}", formatCents(overview.billing.pricePerEmployeeCents, overview.billing.currencyCode))}
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
              {formatCents(overview.billing.totalAnnualCents, overview.billing.currencyCode)}
              <span className="ml-1.5 text-sm font-normal text-[var(--color-text-muted)]">
                {d.billingPerYear}
              </span>
            </p>
            <Link
              href="/corporate/employees"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)] hover:underline"
            >
              <Users className="size-4" aria-hidden /> {d.manageEmployees}
            </Link>
          </div>
        </AdminCard>

        {/* Recent requests */}
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader
            title={d.recentRequestsTitle}
            description={d.openRequestsCount.replace("{count}", String(overview.openRequests))}
          />
          <div className="border-t border-[var(--color-border)]">
            {recentRequests.length === 0 ? (
              <AdminEmptyState
                icon={<ClipboardList className="size-5" aria-hidden />}
                title={d.noRequestsTitle}
                description={d.noRequestsDescription}
                action={
                  <Link href="/corporate/requests" className="gh-btn gh-btn-soft text-sm">
                    {d.newRequest}
                  </Link>
                }
              />
            ) : (
              <ul className="m-0 list-none divide-y divide-[var(--color-border)] p-0">
                {recentRequests.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]" title={r.employeeName ?? undefined}>
                        {r.employeeName ?? d.employeeFallback}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {REQUEST_TYPE_LABELS[r.type] ?? r.type} ·{" "}
                        {new Date(r.createdAt).toLocaleDateString("en-IE", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <Pill tone={requestStatusTone(r.status)}>{requestStatusLabel(r.status)}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {recentRequests.length > 0 ? (
            <div className="border-t border-[var(--color-border)] px-5 py-3">
              <Link href="/corporate/requests" className="text-sm font-semibold hover:underline">
                {d.viewAllRequests}
              </Link>
            </div>
          ) : null}
        </AdminCard>
      </div>
    </>
  );
}
