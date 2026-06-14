import Link from "next/link";
import { Zap } from "lucide-react";
import { fetchAdminAutomationCatalog, fetchAdminAutomationRuns } from "@/lib/admin/admin-api";
import { AdminCard, PageHeader } from "../_components/atoms";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

const STATUS_TONE: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-rose-100 text-rose-800",
  SKIPPED: "bg-slate-200 text-slate-700",
  PENDING: "bg-amber-100 text-amber-900",
  RUNNING: "bg-sky-100 text-sky-800",
  CANCELLED: "bg-violet-100 text-violet-800",
};

export default async function AdminAutomationPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const page = Number(pick(sp, "page") ?? "1") || 1;
  const automationKey = pick(sp, "automationKey");

  const [runsRes, catalogRes] = await Promise.all([
    fetchAdminAutomationRuns({ page, pageSize: 50, automationKey }),
    fetchAdminAutomationCatalog(),
  ]);

  const runs = runsRes.ok ? runsRes.data.items : [];
  const total = runsRes.ok ? runsRes.data.total : 0;
  const catalog = catalogRes.ok ? catalogRes.data.items : [];
  const pageSize = runsRes.ok ? runsRes.data.pageSize : 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Zap className="size-3.5" aria-hidden /> Operations
          </span>
        }
        title="Automation"
        description="WhatsApp, email, and cron steps for booking and payment flows. Latest runs appear first."
      />

      {!runsRes.ok ? (
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load automation runs: {runsRes.message}
          </p>
        </AdminCard>
      ) : null}

      <AdminCard className="mb-6">
        <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Automation catalog</h2>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          Registered flows — filter the log below by key prefix.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {catalog.map((item) => (
            <div
              key={item.key}
              className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-bold text-[var(--color-text-primary)]">{item.name}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {item.flow}
                  </p>
                </div>
                <Link
                  href={`/admin/automation?automationKey=${encodeURIComponent(item.key)}`}
                  className="text-[12px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                >
                  View runs
                </Link>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
                {item.description}
              </p>
              <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                Channels: {item.channels.join(", ")} · Stages: {item.maxStages}
              </p>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard padding={0}>
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Run log</h2>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            {total} run{total === 1 ? "" : "s"}
            {automationKey ? ` · filtered by ${automationKey}` : ""}
            {automationKey ? (
              <>
                {" "}
                ·{" "}
                <Link href="/admin/automation" className="font-semibold underline">
                  Clear filter
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Automation</th>
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Channel</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Summary</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    No automation runs yet.
                  </td>
                </tr>
              ) : (
                runs.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-border)] align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--color-text-primary)]">{row.automationName}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{row.flow}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.orderId ? (
                        <>
                          <Link
                            href={`/admin/orders?cursor=${encodeURIComponent(row.orderId)}`}
                            className="font-semibold text-[var(--color-brand-primary)] hover:underline"
                          >
                            #{row.orderNumber}
                          </Link>
                          {row.orderPaymentStatus ? (
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              {row.orderPaymentStatus}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">{row.channel ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          STATUS_TONE[row.status] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.status}
                      </span>
                      {row.error ? (
                        <p className="mt-1 max-w-[220px] text-[11px] text-rose-700">{row.error}</p>
                      ) : null}
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-[var(--color-text-muted)]">
                      {row.summary ?? "—"}
                      {row.recipient ? (
                        <p className="mt-1 truncate text-[11px]">→ {row.recipient}</p>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-4 text-[13px]">
          {page > 1 ? (
            <Link
              href={`/admin/automation?page=${page - 1}${automationKey ? `&automationKey=${encodeURIComponent(automationKey)}` : ""}`}
              className="font-semibold underline"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/automation?page=${page + 1}${automationKey ? `&automationKey=${encodeURIComponent(automationKey)}` : ""}`}
              className="font-semibold underline"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </AdminCard>
    </>
  );
}
