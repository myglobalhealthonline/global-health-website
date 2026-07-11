import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, Receipt, SearchX } from "lucide-react";
import { fetchDoctorInvoicesList } from "@/lib/api/doctor-api";
import {
  AdminEmptyState,
  AdminSummaryStrip,
  PageHeader,
  Pill,
} from "@/components/portal-atoms";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { PayoutInvoicePanel, type InvoiceStrings } from "./_components/payout-invoice-panel";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

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
}: {
  column: SortBy;
  label: string;
  currentSortBy: SortBy;
  currentSortOrder: SortOrder;
  sp: SearchParams;
}) {
  const active = currentSortBy === column;
  return (
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
  );
}

export default async function DoctorInvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
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
  const fields: ColumnPriorityField<(typeof invoices)[number]>[] = [
    {
      key: "patient",
      label: d.invoices.colPatient,
      priority: 1,
      render: (row) => (
        <>
          <p className="font-semibold text-[var(--portal-text)]">{row.fullName}</p>
          <p className="text-xs text-[var(--portal-muted)]">{row.email}</p>
        </>
      ),
    },
    {
      key: "when",
      label: <SortHeader column="date" label={d.invoices.colWhen} currentSortBy={sortBy} currentSortOrder={sortOrder} sp={sp} />,
      cardLabel: d.invoices.colWhen,
      priority: 2,
      render: (row) => (
        <span className="text-xs">
          {row.scheduledAt
            ? new Date(row.scheduledAt).toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
            : new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    { key: "type", label: d.invoices.colType, priority: 3, render: (row) => <span className="text-xs capitalize">{row.consultationType}</span> },
    {
      key: "amount",
      label: <SortHeader column="amount" label={d.invoices.colAmount} currentSortBy={sortBy} currentSortOrder={sortOrder} sp={sp} />,
      cardLabel: d.invoices.colAmount,
      priority: 2,
      render: (row) => <span className="font-mono text-xs">{row.doctorAmountCents == null ? d.common.notSet : fmtMoney(row.doctorAmountCents, row.currencyCode)}</span>,
    },
    {
      key: "payment",
      label: d.invoices.colPayment,
      priority: 2,
      render: (row) => <Pill tone={paymentTone(row.paymentStatus)} withDot>{row.paymentStatus}</Pill>,
    },
    { key: "status", label: d.invoices.colStatus, priority: 3, render: (row) => <span className="text-xs">{row.status}</span> },
    {
      key: "open",
      label: d.invoices.colOpen,
      priority: 2,
      align: "right",
      desktopOnly: true,
      render: (row) => (
        <Link href={`/doctor/appointments/${row.id}`} className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2.5 py-1.5 text-xs font-semibold text-[var(--portal-text)] hover:bg-[var(--portal-well)]">
          {d.common.open} <ChevronRight className="size-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={d.invoices.eyebrow}
        title={d.invoices.title}
        description={d.invoices.description}
      />

      <PayoutInvoicePanel strings={d.invoices as InvoiceStrings} />

      {result.ok ? (
        <AdminSummaryStrip
          className="mb-4"
          items={[
            {
              label: d.invoices.visibleInvoices,
              value: invoices.length,
              hint: d.common.totalHint.replace("{total}", String(result.data.pagination.total)),
              tone: "brand",
            },
            {
              label: d.invoices.visibleValue,
              value: fmtMoney(totalCents, currencyCode),
              hint: d.invoices.currentPage,
              tone: "neutral",
            },
            {
              label: d.invoices.paid,
              value: paidCount,
              hint: d.invoices.settled,
              tone: "success",
            },
            {
              label: d.invoices.needsAttention,
              value: attentionCount,
              hint: d.invoices.attentionHint,
              tone: attentionCount > 0 ? "warning" : "neutral",
            },
          ]}
        />
      ) : null}

      <div className="gh-card gh-doctor-filter-card mb-4 p-4">
        <form className="gh-doctor-filter-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{d.common.status}</span>
            <select name="status" defaultValue={status ?? ""} className="gh-select">
              <option value="">{d.common.any}</option>
              <option value="UNPAID">{d.invoices.statusUnpaid}</option>
              <option value="PENDING">{d.invoices.statusPending}</option>
              <option value="PAID">{d.invoices.statusPaid}</option>
              <option value="REFUNDED">{d.invoices.statusRefunded}</option>
              <option value="FAILED">{d.invoices.statusFailed}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{d.common.from}</span>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{d.common.to}</span>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="gh-input"
            />
          </label>
          <div className="gh-doctor-filter-actions sm:col-span-2 lg:col-span-5 flex items-center gap-2">
            <button type="submit" className="gh-btn gh-btn-primary text-sm">
              {d.common.apply}
            </button>
            <Link href="/doctor/invoices" className="gh-btn gh-btn-soft text-sm">
              {d.common.reset}
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
          title={status || from || to ? d.invoices.emptyFilteredTitle : d.invoices.emptyTitle}
          description={
            status || from || to
              ? d.invoices.emptyFilteredDesc
              : d.invoices.emptyDesc
          }
          action={
            status || from || to ? (
              <Link href="/doctor/invoices" className="gh-btn gh-btn-soft text-sm">
                {d.common.clearFilters}
              </Link>
            ) : (
              <Link href="/doctor/appointments" className="gh-btn gh-btn-primary text-sm">
                {d.invoices.viewAppointments}
              </Link>
            )
          }
        />
      ) : (
        <div className="gh-card gh-doctor-table-card p-0 overflow-hidden">
          <ColumnPriorityTable
            fields={fields}
            rows={invoices}
            getRowKey={(row) => row.id}
            cardTone={(row) => {
              const tone = paymentTone(row.paymentStatus);
              return tone === "active" ? "success" : tone === "inactive" ? "danger" : tone === "pending" ? "warning" : "neutral";
            }}
            cardActions={(row) => (
              <Link href={`/doctor/appointments/${row.id}`} className="gh-btn gh-btn-soft text-sm">
                {d.invoices.openConsultation} <ChevronRight className="size-3.5" />
              </Link>
            )}
          />
          {result.data.pagination.totalPages > 1 ? (
            <div className="border-t border-[var(--portal-line)] px-4 py-3 text-xs text-[var(--portal-muted)]">
              {d.common.pagination
                .replace("{page}", String(result.data.pagination.page))
                .replace("{totalPages}", String(result.data.pagination.totalPages))
                .replace("{total}", String(result.data.pagination.total))}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
