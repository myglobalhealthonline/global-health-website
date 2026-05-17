import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fetchDoctorInvoicesList } from "@/lib/api/doctor-api";

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

  const result = await fetchDoctorInvoicesList({
    page: String(page),
    pageSize: "25",
    ...(status ? { status } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  return (
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Doctor
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          Invoices & payments
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Read-only view of billing on your consultations. Admin issues
          and refunds; this surface flags Unpaid or Failed so you can
          chase before the next session.
        </p>
      </header>

      <div className="gh-card mb-4 p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-5">
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
          <div className="sm:col-span-5 flex items-center gap-2">
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
      ) : result.data.items.length === 0 ? (
        <div className="gh-card p-10 text-center text-sm text-[var(--color-text-muted)]">
          No invoices match those filters.
        </div>
      ) : (
        <div className="gh-card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-background-soft)] text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.data.items.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {row.fullName}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
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
                  <td className="px-4 py-3 text-xs capitalize">{row.consultationType}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {fmtMoney(row.amountCents, row.currencyCode)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                        PAYMENT_TONE[row.paymentStatus] ??
                        "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {row.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{row.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/doctor/appointments/${row.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                    >
                      Open <ChevronRight className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.data.pagination.totalPages > 1 ? (
            <div className="border-t border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
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
