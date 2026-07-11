import Link from "next/link";
import { ClipboardList, Users } from "lucide-react";
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
} from "@/app/(admin)/admin/corporate/_lib";

export const dynamic = "force-dynamic";

/** Onboarding funnel buckets — collapses the 12-state machine into the four
 *  stages a company admin actually tracks. */
const FUNNEL: { label: string; statuses: string[] }[] = [
  { label: "Invited", statuses: ["DRAFT", "INVITED", "INVITE_SENT", "INVITE_FAILED"] },
  {
    label: "Registered",
    statuses: ["REGISTERED", "PROFILE_INCOMPLETE", "PROFILE_COMPLETE", "PREASSESSMENT_PENDING"],
  },
  { label: "Pre-assessment booked", statuses: ["PREASSESSMENT_BOOKED"] },
  { label: "Active", statuses: ["ACTIVE"] },
];

export default async function CorporateDashboardPage() {
  const [overviewResult, requestsResult] = await Promise.all([
    fetchCorporateOverview(),
    fetchCorporatePortalRequests(),
  ]);

  if (!overviewResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Corporate" title="Dashboard" />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            Could not load your company: {overviewResult.message}
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

  return (
    <>
      <PageHeader
        eyebrow="Corporate"
        title={overview.companyName}
        description={`${overview.planName} plan — employee benefits, onboarding, and billing at a glance.`}
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
            label: "Employees",
            value: overview.employeeTotal,
            hint: "Enrolled (excludes drafts + removed)",
            tone: "brand",
          },
          ...funnel.map((bucket) => ({
            label: bucket.label,
            value: bucket.count,
            tone: "neutral" as const,
          })),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Billing */}
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader
            title="Billing summary"
            description="Annual, invoiced to your company — never to employees."
          />
          <div className="border-t border-[var(--color-border)] px-5 py-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              {overview.billing.employeeCount} employees ×{" "}
              {formatCents(overview.billing.pricePerEmployeeCents, overview.billing.currencyCode)}{" "}
              / year
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
              {formatCents(overview.billing.totalAnnualCents, overview.billing.currencyCode)}
              <span className="ml-1.5 text-sm font-normal text-[var(--color-text-muted)]">
                per year
              </span>
            </p>
            <Link
              href="/corporate/employees"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)] hover:underline"
            >
              <Users className="size-4" aria-hidden /> Manage employees
            </Link>
          </div>
        </AdminCard>

        {/* Recent requests */}
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader
            title="Recent requests"
            description={`${overview.openRequests} open consultation requests`}
          />
          <div className="border-t border-[var(--color-border)]">
            {recentRequests.length === 0 ? (
              <AdminEmptyState
                icon={<ClipboardList className="size-5" aria-hidden />}
                title="No requests yet"
                description="Request an illness-benefit or fit-for-work consultation for an employee."
                action={
                  <Link href="/corporate/requests" className="gh-btn gh-btn-soft text-sm">
                    New request
                  </Link>
                }
              />
            ) : (
              <ul className="m-0 list-none divide-y divide-[var(--color-border)] p-0">
                {recentRequests.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]" title={r.employeeName ?? undefined}>
                        {r.employeeName ?? "Employee"}
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
                View all requests →
              </Link>
            </div>
          ) : null}
        </AdminCard>
      </div>
    </>
  );
}
