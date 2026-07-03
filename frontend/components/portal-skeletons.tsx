/**
 * Portal loading-state kit (DESIGN.md §5.16). Shimmer geometry mirrors the
 * real component so load → content never jumps. Promoted from
 * `app/(admin)/admin/_components/skeletons.tsx`, which now re-exports this
 * file so existing Admin `loading.tsx` imports keep working.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`gh-skeleton-bar ${className}`} />;
}

/** Dark dashboard band — mirrors CommandBand's own markup so the existing
 *  `.gh-command-band--skeleton` shimmer CSS applies without needing real
 *  metric data (route `loading.tsx` files render before data is fetched). */
export function CommandBandSkeleton({ metrics = 3 }: { metrics?: number }) {
  return (
    <section className="gh-command-band gh-command-band--skeleton" aria-hidden>
      <div className="min-w-0">
        <p className="gh-command-band__context">&nbsp;</p>
        <h2 className="gh-command-band__title">&nbsp;</h2>
      </div>
      <div className="gh-command-band__metrics">
        {Array.from({ length: metrics }).map((_, i) => (
          <div key={i} className="gh-command-band__metric">
            <p className="gh-command-band__metric-label">&nbsp;</p>
            <p className="gh-command-band__metric-value">&nbsp;</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StatGridSkeleton({ items = 6 }: { items?: number }) {
  return (
    <section className="gh-admin-dashboard-stats mb-5 grid gap-3" aria-hidden>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="gh-admin-card gh-stat-card" style={{ padding: 18 }}>
          <div className="flex items-start justify-between">
            <Bar className="h-3 w-20" />
            <Bar className="h-10 w-10 rounded-[var(--portal-radius)]" />
          </div>
          <Bar className="mt-3 h-8 w-16" />
          <Bar className="mt-2 h-3 w-24" />
        </div>
      ))}
    </section>
  );
}

export function CalendarMonthSkeleton() {
  return (
    <div className="gh-calendar-panel gh-card overflow-hidden p-0" aria-hidden>
      <div className="flex items-center justify-between px-4 py-3">
        <Bar className="h-5 w-32" />
        <Bar className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-7 gap-px p-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Bar key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ChatThreadSkeleton({ bubbles = 4 }: { bubbles?: number }) {
  return (
    <div className="gh-chat-panel flex h-[480px] flex-col p-4" aria-hidden>
      {Array.from({ length: bubbles }).map((_, i) => (
        <div key={i} className={`mb-3 flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
          <Bar className="h-10 w-[60%] rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <header className="gh-portal-page-header gh-skeleton-header space-y-2">
      <Bar className="h-3 w-24" />
      <Bar className="h-7 w-48" />
      <Bar className="h-4 w-72" />
    </header>
  );
}

export function SummaryStripSkeleton({ items = 3 }: { items?: number }) {
  return (
    <section className="gh-admin-summary-strip gh-skeleton-summary">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="gh-admin-summary-item">
          <Bar className="h-3 w-20" />
          <Bar className="h-6 w-16" />
          <Bar className="h-3 w-28" />
        </div>
      ))}
    </section>
  );
}

export function FilterBarSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <section className="gh-card gh-skeleton-filter grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="grid gap-2">
          <Bar className="h-3 w-16" />
          <Bar className="h-10 w-full" />
        </div>
      ))}
    </section>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <section className="gh-card gh-skeleton-table overflow-hidden p-0">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--portal-line-strong)]">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-3 py-3">
                <Bar className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-[var(--portal-line-soft)]">
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-3 py-3">
                  <Bar className={c === 0 ? "h-4 w-40" : c === columns - 1 ? "h-3 w-16" : "h-3 w-24"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="gh-skeleton-form grid gap-5">
      {Array.from({ length: sections }).map((_, i) => (
        <section key={i} className="gh-card gh-skeleton-section grid gap-4 p-6">
          <Bar className="h-5 w-32" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Bar className="h-12" />
            <Bar className="h-12" />
            <Bar className="h-12" />
            <Bar className="h-12" />
          </div>
        </section>
      ))}
    </div>
  );
}

export function DashboardSkeleton({ statItems = 6 }: { statItems?: number }) {
  return (
    <div className="gh-skeleton-dashboard">
      <CommandBandSkeleton />
      <StatGridSkeleton items={statItems} />
    </div>
  );
}

export function ListPageSkeleton({
  rows = 6,
  columns = 5,
  summaryItems = 3,
}: {
  rows?: number;
  columns?: number;
  summaryItems?: number;
}) {
  return (
    <div className="gh-skeleton-list space-y-6">
      <PageHeaderSkeleton />
      <SummaryStripSkeleton items={summaryItems} />
      <FilterBarSkeleton fields={Math.min(columns, 4)} />
      <TableSkeleton rows={rows} columns={columns} />
    </div>
  );
}
