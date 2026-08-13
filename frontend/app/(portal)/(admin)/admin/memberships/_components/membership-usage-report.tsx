import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import type {
  MembershipUsageCountrySection,
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

/**
 * Render a currency-keyed total, e.g. `{ EUR: 7500, CZK: 8000 }` → "75.00 EUR ·
 * 80.00 CZK". Never sums across keys — a member drill-down can hold rows in
 * more than one currency (§23), and adding them the way a single scalar would
 * mixes EUR with CZK. Sorted so the same map renders identically every time.
 */
export function moneyByCurrency(byCurrency: Record<string, number>): string {
  const entries = Object.entries(byCurrency).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return "—";
  return entries.map(([currency, cents]) => money(cents, currency)).join(" · ");
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
  options: { showMember: boolean; showReason: boolean; showCountry?: boolean },
): ColumnPriorityField<MembershipUsageRow>[] {
  const fields: ColumnPriorityField<MembershipUsageRow>[] = [
    { key: "date", label: "Date", priority: 1, render: (row) => day(row.bookedAt) },
  ];
  // Only where rows can span countries — inside a per-country section it would
  // repeat the section heading on every line. A member who travelled, though,
  // has rows in several currencies and the country is what tells them apart.
  if (options.showCountry) {
    fields.push({
      key: "country",
      label: "Country",
      priority: 2,
      render: (row) => row.countryCode ?? "—",
    });
  }
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
      // The row's OWN currency wins over the table-wide one: inside a
      // per-country section every row already shares it, so this is a no-op
      // there — but the member drill-down passes no fixed currency at all
      // (rows can span markets), and falling back to the table prop there
      // would print a bare number with no unit, or worse, the wrong one.
      render: (row) => money(row.listPriceCents, row.currencyCode ?? currency),
    },
    {
      key: "paid",
      label: "Paid",
      priority: 2,
      align: "right",
      render: (row) => money(row.pricePaidCents, row.currencyCode ?? currency),
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
  showCountry,
  emptyLabel,
}: {
  rows: MembershipUsageRow[];
  currency: string | null;
  showMember: boolean;
  showReason: boolean;
  showCountry?: boolean;
  emptyLabel: string;
}) {
  return (
    <ColumnPriorityTable
      fields={usageFields(currency, { showMember, showReason, showCountry })}
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
  // A member of a multi-country plan can book abroad, and those rows are in the
  // booking country's currency. Naming the country is the cheapest way to stop
  // two different currencies reading as one column of comparable numbers.
  const spansCountries = new Set(rows.map((row) => row.countryCode)).size > 1;
  return (
    <UsageTable
      rows={rows}
      currency={currency}
      showMember={false}
      showReason
      showCountry={spansCountries}
      emptyLabel="No bookings on this membership yet."
    />
  );
}

/**
 * One country's usage and goodwill (§23, phase 7f). Every money figure inside is
 * in this section's own currency and none of them is ever added to another
 * section's — there is no exchange rate anywhere in the product.
 */
function CountrySection({
  section,
  isPrimary,
}: {
  section: MembershipUsageCountrySection;
  isPrimary: boolean;
}) {
  const currency = section.currencyCode;
  const types = section.usage.byBenefitType;
  const nothing = section.usage.consultations === 0 && section.overrides.consultations === 0;

  return (
    <AdminCard padding={0}>
      <SectionHeader
        title={`${section.countryCode}${isPrimary ? " — primary" : ""}`}
        description={
          nothing
            ? section.covered
              ? "Covered, with no bookings in this range."
              : "No longer covered. Bookings made while it was keep the price they were charged."
            : `Consultations booked in ${section.countryCode} in the selected range${
                currency ? `, in ${currency}` : ""
              }. Goodwill overrides are on their own line below and excluded from these totals.`
        }
      />
      {nothing ? null : (
        <>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Consultations" value={String(section.usage.consultations)} />
            <Stat
              label="Discount given"
              value={money(section.usage.totalDiscountCents, currency)}
              hint="excludes overrides"
            />
            <Stat label="Charged" value={money(section.usage.totalChargedCents, currency)} />
            <Stat
              label="Goodwill given away"
              value={money(section.overrides.totalValueCents, currency)}
              hint={`${section.overrides.consultations} override${
                section.overrides.consultations === 1 ? "" : "s"
              }`}
            />
          </div>
          <div className="grid gap-4 border-t border-[var(--color-border)] p-6 sm:grid-cols-3">
            <Stat label="Allowance bookings" value={String(types.ALLOWANCE)} />
            <Stat label="Percent bookings" value={String(types.PERCENT)} />
            <Stat label="Fixed-price bookings" value={String(types.FIXED)} />
          </div>
          <div className="border-t border-[var(--color-border)]">
            <UsageTable
              rows={section.usage.rows}
              currency={currency}
              showMember
              showReason={false}
              emptyLabel={`No member bookings in ${section.countryCode} in this range.`}
            />
          </div>
          {section.overrides.consultations > 0 ? (
            <div className="border-t border-[var(--color-border)]">
              <p className="px-6 pt-6 text-sm font-semibold text-[var(--color-text-primary)]">
                Goodwill overrides in {section.countryCode}
              </p>
              <p className="px-6 pb-2 text-portal-compact text-[var(--color-text-muted)]">
                Benefits applied by a super admin to patients not entitled to them. Our cost, not
                the partner&apos;s consumption, and never charged against anyone&apos;s allowance.
              </p>
              <UsageTable
                rows={section.overrides.rows}
                currency={currency}
                showMember
                showReason
                emptyLabel=""
              />
            </div>
          ) : null}
        </>
      )}
    </AdminCard>
  );
}

export function MembershipUsageReportView({ report }: { report: MembershipUsageReport }) {
  const statuses = report.membersByStatus;

  return (
    <div className="flex flex-col gap-6">
      <AdminCard padding={0}>
        <SectionHeader
          title="Members"
          description="Current state of the programme — not filtered by the date range, and not split by country: a member belongs to the programme, not to a market."
        />
        <div className="grid gap-4 p-6 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Active" value={String(statuses.ACTIVE)} />
          <Stat label="Pending" value={String(statuses.PENDING)} hint="not linked yet" />
          <Stat label="Suspended" value={String(statuses.SUSPENDED)} />
          <Stat label="Expired" value={String(statuses.EXPIRED)} />
          <Stat label="Removed" value={String(statuses.REMOVED)} />
        </div>
        <div className="border-t border-[var(--color-border)] p-6">
          <Stat
            label="Allowance units"
            value={`${report.allowance.used} / ${report.allowance.allocated}`}
            hint="used of allocated — one shared pool, spendable in every configured country"
          />
        </div>
      </AdminCard>

      {/* No cross-country total anywhere, deliberately (§39). Each country is
          its own currency and there is no exchange rate in the product, so a
          headline figure could only be wrong — and it is the one number a
          partner would quote back. */}
      {report.countries.length > 1 ? (
        <p className="text-portal-compact text-[var(--color-text-muted)]">
          Usage is reported per country, each in its own currency. Figures are never added across
          countries — there is no exchange rate.
        </p>
      ) : null}

      {report.countries.map((section) => (
        <CountrySection
          key={section.countryCode}
          section={section}
          isPrimary={section.countryCode === report.plan.countryCode.toUpperCase()}
        />
      ))}
    </div>
  );
}
