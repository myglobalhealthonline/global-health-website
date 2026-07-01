import Link from "next/link";
import { Zap, ArrowLeft, ChevronRight } from "lucide-react";
import {
  fetchAdminAutomationCatalog,
  fetchAdminAutomationRuns,
  fetchAdminAutomationOrders,
} from "@/lib/admin/admin-api";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, PageHeader } from "../_components/atoms";

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

const PAYMENT_TONE: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  UNPAID: "bg-amber-100 text-amber-900",
  FAILED: "bg-rose-100 text-rose-800",
  PENDING: "bg-slate-200 text-slate-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`gh-admin-ops-badge inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
        STATUS_TONE[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminAutomationPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const page = Number(pick(sp, "page") ?? "1") || 1;
  const orderId = pick(sp, "orderId");
  const automationKey = pick(sp, "automationKey");

  // ── Order detail view ──────────────────────────────────────────────────────
  if (orderId) {
    const runsRes = await fetchAdminAutomationRuns({ orderId, pageSize: 200 });

    const runs = runsRes.ok ? runsRes.data.items : [];

    // Group runs by automationKey (preserving insertion order = chronological)
    const groups = new Map<string, typeof runs>();
    for (const run of runs) {
      const key = run.automationKey;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(run);
    }

    const firstRun = runs[0];
    const orderNumber = firstRun?.orderNumber ?? orderId.slice(-8).toUpperCase();
    const orderEmail = firstRun?.orderEmail;
    const paymentStatus = firstRun?.orderPaymentStatus;

    return (
      <>
        <PageHeader
          className="gh-admin-area-hero gh-admin-area-automation"
          eyebrow={
            <Link
              href="/admin/automation"
              className="inline-flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <ArrowLeft className="size-3" />
              All orders
            </Link>
          }
          title={`Order ${orderNumber}`}
          description={[orderEmail, paymentStatus].filter(Boolean).join(" · ")}
        />

        {!runsRes.ok ? (
          <AdminCard>
            <p className="text-sm text-rose-700">Could not load runs: {runsRes.message}</p>
          </AdminCard>
        ) : runs.length === 0 ? (
          <AdminCard>
            <AdminEmptyState
              icon={<Zap className="size-8" aria-hidden />}
              title="No automation runs for this order"
              description="This order has not triggered any notification or payment automation yet."
            />
          </AdminCard>
        ) : (
          <div className="gh-admin-area-hero gh-admin-area-automation gh-admin-automation-groups space-y-4">
            {Array.from(groups.entries()).map(([key, groupRuns]) => {
              const name = groupRuns[0]?.automationName ?? key;
              const flow = groupRuns[0]?.flow ?? "—";
              const hasFailed = groupRuns.some((r) => r.status === "FAILED");

              return (
                <AdminCard key={key} padding={0}>
                  <div className="gh-admin-area-hero gh-admin-area-automation gh-admin-automation-group-head flex items-start justify-between border-b border-[var(--color-border)] px-5 py-3">
                    <div>
                      <p className="text-[13px] font-bold text-[var(--color-text-primary)]">
                        {name}
                        {hasFailed && (
                          <span className="gh-admin-area-hero gh-admin-area-automation gh-admin-ops-badge ml-2 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                            has failures
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                        {flow}
                      </p>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {groupRuns.length} run{groupRuns.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {groupRuns.map((run) => (
                      <div
                        key={run.id}
                        className="gh-admin-area-hero gh-admin-area-automation gh-admin-automation-run-row grid grid-cols-[1fr_80px_80px_160px] items-start gap-3 px-5 py-3 text-[13px]"
                      >
                        <div>
                          <p className="text-[var(--color-text-primary)]">
                            {run.summary ?? "—"}
                          </p>
                          {run.recipient && (
                            <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                              → {run.recipient}
                            </p>
                          )}
                          {run.error && (
                            <p className="mt-0.5 text-[11px] text-rose-700">{run.error}</p>
                          )}
                        </div>
                        <p className="capitalize text-[var(--color-text-muted)]">
                          {run.channel ?? "—"}
                        </p>
                        <StatusBadge status={run.status} />
                        <p className="text-right text-[var(--color-text-muted)]">
                          {timeAgo(run.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </AdminCard>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ── automationKey filter view (from catalog "View runs") ───────────────────
  if (automationKey) {
    const [runsRes, catalogRes] = await Promise.all([
      fetchAdminAutomationRuns({ page, pageSize: 50, automationKey }),
      fetchAdminAutomationCatalog(),
    ]);

    const runs = runsRes.ok ? runsRes.data.items : [];
    const total = runsRes.ok ? runsRes.data.total : 0;
    const catalog = catalogRes.ok ? catalogRes.data.items : [];
    const pageSize = runsRes.ok ? runsRes.data.pageSize : 50;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const catalogEntry = catalog.find((c) => automationKey.startsWith(c.key));

    return (
      <>
        <PageHeader
          className="gh-admin-area-hero gh-admin-area-automation"
          eyebrow={
            <Link
              href="/admin/automation"
              className="inline-flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <ArrowLeft className="size-3" />
              All orders
            </Link>
          }
          title={catalogEntry?.name ?? automationKey}
          description={`${total} run${total === 1 ? "" : "s"} matching key prefix`}
        />

        <AdminCard padding={0}>
          <div className="border-b border-[var(--color-border)] px-4 pt-4">
            <AdminSummaryStrip
              items={[
                {
                  label: "Runs shown",
                  value: runs.length,
                  hint: `${total} total`,
                  tone: "brand",
                },
                {
                  label: "Failures",
                  value: runs.filter((run) => run.status === "FAILED").length,
                  hint: "Visible page",
                  tone: runs.some((run) => run.status === "FAILED") ? "warning" : "success",
                },
                {
                  label: "Channels",
                  value: new Set(runs.map((run) => run.channel).filter(Boolean)).size,
                  hint: "Visible page",
                  tone: "neutral",
                },
              ]}
            />
          </div>
          <div className="gh-admin-area-hero gh-admin-area-automation gh-admin-ops-table-wrap gh-admin-deep-table-wrap overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Order</th>
                  <th className="px-4 py-2">Channel</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Summary</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                      No runs yet for this automation.
                    </td>
                  </tr>
                ) : (
                  runs.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-border)] align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">
                        {timeAgo(row.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {row.orderId ? (
                          <Link
                            href={`/admin/automation?orderId=${encodeURIComponent(row.orderId)}`}
                            className="font-semibold text-[var(--color-brand-primary)] hover:underline"
                          >
                            {row.orderNumber}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize">{row.channel ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                        {row.error && (
                          <p className="mt-1 max-w-[200px] text-[11px] text-rose-700">{row.error}</p>
                        )}
                      </td>
                      <td className="max-w-[260px] px-4 py-3 text-[var(--color-text-muted)]">
                        {row.summary ?? "—"}
                        {row.recipient && (
                          <p className="mt-0.5 truncate text-[11px]">→ {row.recipient}</p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {runs.length === 0 ? (
            <AdminEmptyState
              icon={<Zap className="size-8" aria-hidden />}
              title="No runs yet for this automation"
              description="Runs will appear here once orders trigger this automation key."
            />
          ) : (
            <div className="gh-admin-mobile-list">
              {runs.map((row) => (
                <article key={row.id} className="gh-admin-mobile-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="gh-admin-mobile-card-title">
                        {row.orderNumber ?? "No order"}
                      </h3>
                      <p className="gh-admin-mobile-card-meta">{timeAgo(row.createdAt)}</p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="grid gap-1 text-[12px] text-[var(--color-text-muted)]">
                    <span>Channel: {row.channel ?? "-"}</span>
                    <span>{row.summary ?? "No summary"}</span>
                    {row.recipient ? <span className="break-all">To: {row.recipient}</span> : null}
                    {row.error ? <span className="text-rose-700">{row.error}</span> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="gh-admin-area-hero gh-admin-area-automation gh-admin-ops-pagination flex items-center justify-between px-5 py-4 text-[13px]">
            {page > 1 ? (
              <Link
                href={`/admin/automation?page=${page - 1}&automationKey=${encodeURIComponent(automationKey)}`}
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
                href={`/admin/automation?page=${page + 1}&automationKey=${encodeURIComponent(automationKey)}`}
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

  // ── Default: orders list + catalog ─────────────────────────────────────────
  const [ordersRes, catalogRes] = await Promise.all([
    fetchAdminAutomationOrders({ page, pageSize: 25 }),
    fetchAdminAutomationCatalog(),
  ]);

  const orders = ordersRes.ok ? ordersRes.data.items : [];
  const ordersTotal = ordersRes.ok ? ordersRes.data.total : 0;
  const catalog = catalogRes.ok ? catalogRes.data.items : [];
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(ordersTotal / pageSize));
  const failedOrderCount = orders.filter((order) => order.failedRuns > 0).length;
  const totalRunsShown = orders.reduce((sum, order) => sum + order.totalRuns, 0);

  return (
    <>
      <PageHeader
        className="gh-admin-area-hero gh-admin-area-automation"
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Zap className="size-3.5" aria-hidden /> Operations
          </span>
        }
        title="Automation"
        description="Booking and payment notification sequences by order. Click an order to see its full run history."
      />

      {!ordersRes.ok ? (
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load automation data: {ordersRes.message}
          </p>
        </AdminCard>
      ) : null}

      {/* Orders list */}
      <AdminCard padding={0} className="gh-admin-area-hero gh-admin-area-automation gh-admin-automation-orders mb-6">
        <div className="border-b border-[var(--color-border)] px-4 pt-4">
          <AdminSummaryStrip
            items={[
              {
                label: "Orders tracked",
                value: ordersTotal,
                hint: "With automation activity",
                tone: "brand",
              },
              {
                label: "Runs visible",
                value: totalRunsShown,
                hint: "Current page",
                tone: totalRunsShown > 0 ? "success" : "neutral",
              },
              {
                label: "Orders with failures",
                value: failedOrderCount,
                hint: "Current page",
                tone: failedOrderCount > 0 ? "warning" : "success",
              },
            ]}
          />
        </div>
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Orders</h2>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            {ordersTotal} order{ordersTotal === 1 ? "" : "s"} with automation activity · most recent first
          </p>
        </div>

        {orders.length === 0 ? (
          <AdminEmptyState
            icon={<Zap className="size-8" aria-hidden />}
            title="No automation runs yet"
            description="Order notification runs will appear here after bookings, payments, or follow-up events trigger automation."
          />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {orders.map((order) => (
              <Link
                key={order.orderId}
                href={`/admin/automation?orderId=${encodeURIComponent(order.orderId)}`}
                className="gh-admin-area-hero gh-admin-area-automation gh-admin-automation-order-row flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-bg-subtle)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-bold text-[var(--color-text-primary)]">
                      {order.orderNumber}
                    </span>
                    {order.paymentStatus && (
                      <span
                        className={`gh-admin-ops-badge rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          PAYMENT_TONE[order.paymentStatus] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    )}
                    {order.failedRuns > 0 && (
                      <span className="gh-admin-area-hero gh-admin-area-automation gh-admin-ops-badge rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                        {order.failedRuns} failed
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-muted)]">
                    {[order.fullName, order.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-right">
                  <div>
                    <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                      {order.totalRuns} run{order.totalRuns === 1 ? "" : "s"}
                    </p>
                    {order.lastRunAt && (
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {timeAgo(order.lastRunAt)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-[var(--color-text-muted)]" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="gh-admin-area-hero gh-admin-area-automation gh-admin-ops-pagination flex items-center justify-between border-t border-[var(--color-border)] px-5 py-4 text-[13px]">
          {page > 1 ? (
            <Link href={`/admin/automation?page=${page - 1}`} className="font-semibold underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`/admin/automation?page=${page + 1}`} className="font-semibold underline">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </AdminCard>

      {/* Catalog */}
      <AdminCard className="mb-6">
        <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Automation catalog</h2>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          Registered flows — click &quot;View runs&quot; to filter the log by key prefix.
        </p>
        <div className="gh-admin-area-hero gh-admin-area-automation gh-admin-automation-catalog-grid mt-4 grid gap-3 lg:grid-cols-2">
          {catalog.map((item) => (
            <div
              key={item.key}
              className="gh-admin-area-hero gh-admin-area-automation gh-admin-automation-catalog-card rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4"
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
    </>
  );
}
