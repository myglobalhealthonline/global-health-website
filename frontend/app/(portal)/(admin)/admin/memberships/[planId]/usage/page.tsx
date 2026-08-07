import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { SetCrumbTitle } from "@/components/crumb-title";
import { fetchMembershipUsageReport } from "@/lib/admin/memberships-api";
import { displayNameFrom } from "@/lib/admin/display-name";
import { fetchMembershipPlan } from "@/lib/admin/memberships-api";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";
import { MembershipUsageReportView } from "../../_components/membership-usage-report";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ planId: string }>;
  searchParams?: Promise<{ from?: string; to?: string }>;
};

/**
 * Per-plan usage report (§15/§32).
 *
 * The date range rides the query string rather than component state so the view
 * an admin is looking at is a URL they can send to someone — which is also what
 * makes the CSV link below able to export exactly what is on screen, from the
 * same endpoint and therefore the same query.
 */
export default async function AdminMembershipUsagePage({ params, searchParams }: PageProps) {
  const { planId } = await params;
  const sp = searchParams ? await searchParams : {};
  const from = sp.from?.trim() || "";
  const to = sp.to?.trim() || "";

  const [reportResult, planResult] = await Promise.all([
    fetchMembershipUsageReport(planId, { from: from || null, to: to || null }),
    fetchMembershipPlan(planId),
  ]);

  if (!reportResult.ok) {
    if (reportResult.status === 404) notFound();
    return (
      <>
        <PageHeader eyebrow="Memberships" title="Usage" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load this report: {reportResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const report = reportResult.data;
  const planTitle = planResult.ok
    ? displayNameFrom(planResult.data.plan.name, planResult.data.plan.translations)
    : report.plan.name;

  const csvParams = new URLSearchParams({ format: "csv" });
  if (from) csvParams.set("from", from);
  if (to) csvParams.set("to", to);

  return (
    <>
      <SetCrumbTitle segment={planId} label={planTitle} />
      <SetCrumbTitle label="Usage" />
      <Link
        href={`/admin/memberships/${planId}`}
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to programme
      </Link>
      <PageHeader
        eyebrow="Membership usage"
        title={planTitle}
        description="Booking metadata only — date, service, doctor, price and benefit. No clinical content."
        actions={
          <Btn
            href={`/api/admin/membership-reports/${planId}/usage?${csvParams.toString()}`}
            variant="soft"
            size="sm"
          >
            <Download className="size-3.5" /> Export CSV
          </Btn>
        }
      />

      <AdminCard padding={0}>
        <form method="get" className="flex flex-wrap items-end justify-end gap-4 p-6">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">From</span>
            <input type="date" name="from" className="gh-input" defaultValue={from} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">To</span>
            <input type="date" name="to" className="gh-input" defaultValue={to} />
          </label>
          <button type="submit" className="gh-btn gh-btn-primary">
            Apply range
          </button>
        </form>
      </AdminCard>

      <div className="mt-6">
        <MembershipUsageReportView report={report} />
      </div>
    </>
  );
}
