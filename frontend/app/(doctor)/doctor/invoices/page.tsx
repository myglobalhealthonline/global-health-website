import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, Receipt, SearchX } from "lucide-react";
import { fetchDoctorInvoicesList } from "@/lib/api/doctor-api";
import {
  AdminEmptyState,
  AdminSummaryStrip,
  PageHeader,
  Pill,
} from "@/components/portal-atoms";
import { PortalMobileCard } from "@/components/PortalMobileCard";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function fmtMoney(cents: number | null, code: string | null) {
  if (cents == null) return "—";
  const v = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code ?? "USD",
    }).format(v);
  } catch {
    return `${v.toFixed(2)} ${code ?? ""}`;
  }
}

const PAYMENT_TONE: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  UNPAID: "bg-rose-100 text-rose-800",
  REFUNDED: "bg-slate-100 text-slate-700",
  FAILED: "bg-rose-100 text-rose-800",
};

function paymentTone(status: string): "active" | "inactive" | "pending" | "neutral" {
  if (status === "PAID") return "active";
  if (status === "FAILED" || status === "UNPAID") return "inactive";
  if (status === "PENDING") return "pending";
  return "neutral";
}

type SortBy = "date" | "amount";
type SortOrder = "asc" | "desc";

function sortHref(
  sp: SearchParams,
  column: SortBy,
  currentSortBy: SortBy,
  currentSortOrder: SortOrder,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "sortBy" || k === "sortOrder" || k === "page") continue;
    if (typeof v === "string" && v.trim() !== "") params.set(k, v);
  }
  const nextOrder: SortOrder =
    currentSortBy === column && currentSortOrder === "desc" ? "asc" : "desc";
  params.set("sortBy", column);
  params.set("sortOrder", nextOrder);
  return `/doctor/invoices?${params.toString()}`;
}

function SortHeader({
  column,
  label,
  currentSortBy,
  currentSortOrder,
  sp,
  className,
}: {
  column: SortBy;
  label: string;
  currentSortBy: SortBy;
  currentSortOrder: SortOrder;
  sp: SearchParams;
  className?: string;
}) {
  const active = currentSortBy === column;
  return (
    <th className={`px-4 py-3 font-semibold ${className ?? ""}`}>
      <Link
        href={sortHref(sp, column, currentSortBy, currentSortOrder)}
        className="inline-flex items-center gap-1 hover:text-[var(--portal-text)]"
      >
        {label}
        {active ? (
          currentSortOrder === "asc" ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )
        ) : null}
      </Link>
    </th>
  );
}

export default async function DoctorInvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const status = pick(sp, "status");
  const from = pick(sp, "from");
  const to = pick(sp, "to");
  const page = Number(pick(sp, "page") ?? "1") || 1;
  const sortBy: SortBy = pick(sp, "sortBy") === "amount" ? "amount" : "date";
  const sortOrder: SortOrder = pick(sp, "sortOrder") === "asc" ? "asc" : "desc";

  const result = await fetchDoctorInvoicesList({
    page: String(page),
    pageSize: "25",
    sortBy,
    sortOrder,
    ...(status ? { status } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });
  const invoices = result.ok ? result.data.items : [];
  // AMOUNT is the admin-set doctor payout, not the patient's gross price.
  // Visible value sums only the payouts that have been set.
  const totalCents = invoices.reduce(
    (sum, row) => sum + (row.doctorAmountCents ?? 0),
    0,
  );
  const paidCount = invoices.filter((row) => row.paymentStatus === "PAID").length;
  // Needs attention = payment problems OR an unset payout (admin must set it).
  const attentionCount = invoices.filter(
    (row) =>
      ["UNPAID", "FAILED", "PENDING"].includes(row.paymentStatus) ||
      row.doctorAmountCents == null,
  ).length;
  const currencyCode = invoices.find((row) => row.currencyCode)?.currencyCode ?? "USD";

  return (
    <>
      <PageHeader
        eyebrow="Billing visibility"
        title="Invoices and payments"
        description="Read-only billing context for your consultations. Unpaid, pending, and failed payments are highlighted so follow-up can happen before the next session."
      />

      {result.ok ? (
        <AdminSummaryStrip
          className="mb-4"
          items={[
            {
              label: "Visible invoices",
              value: invoices.length,
              hint: `${result.data.pagination.total} total`,
              tone: "brand",
            },
            {
              label: "Visible value",
              value: fmtMoney(totalCents, currencyCode),
              hint: "Current filtered page",
              tone: "neutral",
            },
            {
              label: "Paid",
              value: paidCount,
              hint: "Settled consults",
              tone: "success",
            },
            {
              label: "Needs attention",
              value: attentionCount,
              hint: "Unpaid, pending, or failed",
              tone: attentionCount > 0 ? "warning" : "neutral",
            },
          ]}
        />
      ) : null}

      <div className="gh-card gh-doctor-filter-card mb-4 p-4">
        <form className="gh-doctor-filter-grid grid grid-cols-1 gap-3 sm:grid-cols-5">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Status</span>
            <select name="status" defaultValue={status ?? ""} className="gh-select">
              <option value="">Any</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="REFUNDED">Refunded</option>
              <option value="FAILED">Failed</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">From</span>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">To</span>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="gh-input"
            />
          </label>
          <div className="gh-doctor-filter-actions sm:col-span-5 flex items-center gap-2">
            <button type="submit" className="gh-btn gh-btn-primary text-sm">
              Apply
            </button>
            <Link href="/doctor/invoices" className="gh-btn gh-btn-soft text-sm">
              Reset
            </Link>
          </div>
        </form>
      </div>

      {!result.ok ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </div>
      ) : invoices.length === 0 ? (
        <AdminEmptyState
          className="gh-doctor-empty-state"
          icon={status || from || to ? <SearchX className="size-5" aria-hidden /> : <Receipt className="size-5" aria-hidden />}
          assetSrc={status || from || to ? undefined : "/images/portal/obsidian/empty-payments.svg"}
          title={status || from || to ? "No invoices match these filters" : "No invoices yet"}
          description={
            status || from || to
              ? "Clear the payment status or date range to review more billing records."
              : "Invoices will appear here after consultations are booked and billing records are created."
          }
          action={
            status || from || to ? (
              <Link href="/doctor/invoices" className="gh-btn gh-btn-soft text-sm">
                Clear filters
              </Link>
            ) : (
              <Link href="/doctor/appointments" className="gh-btn gh-btn-primary text-sm">
                View appointments
              </Link>
            )
          }
        />
      ) : (
        <div className="gh-card gh-doctor-table-card p-0 overflow-hidden">
          <div className="hidden md:block gh-doctor-table-wrap overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--portal-well)] text-left text-xs uppercase tracking-wider text-[var(--portal-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <SortHeader
                  column="date"
                  label="When"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  sp={sp}
                />
                <th className="hidden lg:table-cell px-4 py-3 font-semibold">Type</th>
                <SortHeader
                  column="amount"
                  label="Amount"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  sp={sp}
                />
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="hidden lg:table-cell px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--portal-line)]">
              {invoices.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--portal-text)]">
                      {row.fullName}
                    </p>
                    <p className="text-xs text-[var(--portal-muted)]">
                      {row.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.scheduledAt
                      ? new Date(row.scheduledAt).toLocaleString(undefined, {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-xs capitalize">{row.consultationType}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.doctorAmountCents == null
                      ? "Not set"
                      : fmtMoney(row.doctorAmountCents, row.currencyCode)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                        PAYMENT_TONE[row.paymentStatus] ??
                        "bg-[var(--portal-well)] text-[var(--portal-muted)]"
                      }`}
                    >
                      {row.paymentStatus}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-xs">{row.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/doctor/appointments/${row.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2.5 py-1.5 text-xs font-semibold text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
                    >
                      Open <ChevronRight className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="grid gap-3 p-3 md:hidden">
            {invoices.map((row) => {
              const tone = paymentTone(row.paymentStatus);
              return (
                <PortalMobileCard
                  key={row.id}
                  title={row.fullName}
                  subtitle={<span className="capitalize">{row.consultationType}</span>}
                  statusPill={
                    <Pill tone={tone} withDot>
                      {row.paymentStatus}
                    </Pill>
                  }
                  tone={tone === "active" ? "success" : tone === "inactive" ? "danger" : tone === "pending" ? "warning" : "neutral"}
                  meta={[
                    {
                      label: "Amount",
                      value:
                        row.doctorAmountCents == null
                          ? "Not set"
                          : fmtMoney(row.doctorAmountCents, row.currencyCode),
                    },
                    {
                      label: "When",
                      value: row.scheduledAt
                        ? new Date(row.scheduledAt).toLocaleDateString()
                        : new Date(row.createdAt).toLocaleDateString(),
                    },
                  ]}
                  actions={
                    <Link
                      href={`/doctor/appointments/${row.id}`}
                      className="gh-btn gh-btn-soft text-sm"
                    >
                      Open consultation <ChevronRight className="size-3.5" />
                    </Link>
                  }
                />
              );
            })}
          </div>
          {result.data.pagination.totalPages > 1 ? (
            <div className="border-t border-[var(--portal-line)] px-4 py-3 text-xs text-[var(--portal-muted)]">
              Page {result.data.pagination.page} of{" "}
              {result.data.pagination.totalPages} (
              {result.data.pagination.total} total)
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
