import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import type {
  MembershipUsageReport,
  MembershipUsageRow,
} from "@/lib/admin/memberships-api";
import { AdminCard, SectionHeader } from "../../_components/atoms";

/**
 * Per-plan usage report (§15/§32).
 *
 * The one thing this layout has to get right is the override line. Goodwill is
 * excluded from the plan's consultation count, from "total discount given" and
 * from allowance-used — it is our cost, not the partner's consumption — so it
 * gets its own block with its reasons visible. A figure that appears in neither
 * category is a figure nobody reviews.
 *
 * Booking metadata only: date, service, doctor, price, benefit, order number.
 */

function money(cents: number, currency: string | null): string {
  return `${(cents / 100).toFixed(2)}${currency ? ` ${currency}` : ""}`;
}

function day(value: string): string {
  return new Date(value).toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="gh-field-label">{label}</p>
      <p className="text-lg font-semibold text-[var(--color-text-primary)]">{value}</p>
      {hint ? <p className="text-portal-meta text-[var(--color-text-muted)]">{hint}</p> : null}
    </div>
  );
}

/**
 * One field config drives both the desktop table and the mobile card
 * (CLAUDE.md: never hand-write twin table + card markup).
 */
export function usageFields(
  currency: string | null,
  options: { showMember: boolean; showReason: boolean },
): ColumnPriorityField<MembershipUsageRow>[] {
  const fields: ColumnPriorityField<MembershipUsageRow>[] = [
    { key: "date", label: "Date", priority: 1, render: (row) => day(row.bookedAt) },
  ];
  if (options.showMember) {
    fields.push({
      key: "member",
      label: "Member",
      priority: 1,
      cardPrimary: true,
      render: (row) => (
        <>
          {row.memberName ?? "—"}
          <span className="block text-portal-meta text-[var(--color-text-muted)]">
            {/* A goodwill grant to someone on no plan has no enrollment to name,
              * and saying so beats an empty cell that reads as missing data. */}
            {row.membershipId ?? "no enrollment"}
          </span>
        </>
      ),
    });
  }
  fields.push(
    { key: "service", label: "Service", priority: 1, render: (row) => row.serviceName },
    { key: "doctor", label: "Doctor", priority: 3, render: (row) => row.doctorName ?? "—" },
    {
      key: "list",
      label: "List",
      priority: 4,
      align: "right",
      render: (row) => money(row.listPriceCents, currency),
    },
    {
      key: "paid",
      label: "Paid",
      priority: 2,
      align: "right",
      render: (row) => money(row.pricePaidCents, currency),
    },
    {
      key: "benefit",
      label: "Benefit",
      priority: 2,
      render: (row) => (
        <>
          {row.benefitType ?? "—"}
          {row.allowanceUsed ? (
            <span className="block text-portal-meta text-[var(--color-text-muted)]">
              allowance unit used
            </span>
          ) : null}
        </>
      ),
    },
  );
  if (options.showReason) {
    fields.push({
      key: "reason",
      label: "Reason",
      priority: 2,
      render: (row) => row.overrideReason ?? "—",
    });
  }
  fields.push({
    key: "order",
    label: "Order",
    priority: 4,
    render: (row) => row.orderNumber || "—",
  });
  return fields;
}

function UsageTable({
  rows,
  currency,
  showMember,
  showReason,
  emptyLabel,
}: {
  rows: MembershipUsageRow[];
  currency: string | null;
  showMember: boolean;
  showReason: boolean;
  emptyLabel: string;
}) {
  return (
    <ColumnPriorityTable
      fields={usageFields(currency, { showMember, showReason })}
      rows={rows}
      getRowKey={(row) => row.orderItemId}
      emptyState={
        <p className="p-6 text-sm text-[var(--color-text-muted)]">{emptyLabel}</p>
      }
    />
  );
}

/**
 * The per-member drill-down's table (§15). Overrides are listed alongside real
 * usage with their reasons, not filtered out — "which of their visits were
 * overrides" is the question the drill-down exists to answer, and a table that
 * hid them could not.
 */
export function MemberUsageTable({
  rows,
  currency,
}: {
  rows: MembershipUsageRow[];
  currency: string | null;
}) {
  return (
    <UsageTable
      rows={rows}
      currency={currency}
      showMember={false}
      showReason
      emptyLabel="No bookings on this membership yet."
    />
  );
}

export function MembershipUsageReportView({ report }: { report: MembershipUsageReport }) {
  const currency = report.currencyCode;
  const statuses = report.membersByStatus;
  const types = report.usage.byBenefitType;

  return (
    <div className="flex flex-col gap-6">
      <AdminCard padding={0}>
        <SectionHeader
          title="Members"
          description="Current state of the programme — not filtered by the date range."
        />
        <div className="grid gap-4 p-6 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Active" value={String(statuses.ACTIVE)} />
          <Stat label="Pending" value={String(statuses.PENDING)} hint="not linked yet" />
          <Stat label="Suspended" value={String(statuses.SUSPENDED)} />
          <Stat label="Expired" value={String(statuses.EXPIRED)} />
          <Stat label="Removed" value={String(statuses.REMOVED)} />
        </div>
      </AdminCard>

      <AdminCard padding={0}>
        <SectionHeader
          title="Usage"
          description="Consultations booked on this programme in the selected range. Goodwill overrides are excluded and shown separately below."
        />
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Consultations" value={String(report.usage.consultations)} />
          <Stat
            label="Discount given"
            value={money(report.usage.totalDiscountCents, currency)}
            hint="excludes overrides"
          />
          <Stat label="Charged" value={money(report.usage.totalChargedCents, currency)} />
          <Stat
            label="Allowance units"
            value={`${report.allowance.used} / ${report.allowance.allocated}`}
            hint="used of allocated, across the plan"
          />
        </div>
        <div className="grid gap-4 border-t border-[var(--color-border)] p-6 sm:grid-cols-3">
          <Stat label="Allowance bookings" value={String(types.ALLOWANCE)} />
          <Stat label="Percent bookings" value={String(types.PERCENT)} />
          <Stat label="Fixed-price bookings" value={String(types.FIXED)} />
        </div>
        <div className="border-t border-[var(--color-border)]">
          <UsageTable
            rows={report.usage.rows}
            currency={currency}
            showMember
            showReason={false}
            emptyLabel="No member bookings in this range."
          />
        </div>
      </AdminCard>

      <AdminCard padding={0}>
        <SectionHeader
          title="Goodwill overrides"
          description="Benefits applied by a super admin to patients not entitled to them. Excluded from the usage and discount totals above — this is our cost, not the partner's consumption — and never charged against anyone's allowance."
        />
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Stat label="Overrides" value={String(report.overrides.consultations)} />
          <Stat
            label="Value given away"
            value={money(report.overrides.totalValueCents, currency)}
          />
        </div>
        <div className="border-t border-[var(--color-border)]">
          <UsageTable
            rows={report.overrides.rows}
            currency={currency}
            showMember
            showReason
            emptyLabel="No goodwill overrides in this range."
          />
        </div>
      </AdminCard>
    </div>
  );
}
