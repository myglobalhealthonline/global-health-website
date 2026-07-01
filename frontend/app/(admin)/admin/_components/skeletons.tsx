function Bar({ className = "" }: { className?: string }) {
  return <div className={`gh-skeleton-bar animate-pulse rounded ${className}`} />;
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
          <tr className="border-b border-[var(--color-border)]">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-3 py-3">
                <Bar className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-[var(--color-border)]">
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
