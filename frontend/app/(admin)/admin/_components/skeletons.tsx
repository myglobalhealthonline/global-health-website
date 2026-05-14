function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[var(--color-background-soft)] ${className}`} />;
}

export function PageHeaderSkeleton() {
  return (
    <header className="space-y-2">
      <Bar className="h-3 w-24" />
      <Bar className="h-7 w-48" />
      <Bar className="h-4 w-72" />
    </header>
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
    <section className="gh-card overflow-hidden p-0">
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
    <div className="grid gap-5">
      {Array.from({ length: sections }).map((_, i) => (
        <section key={i} className="gh-card grid gap-4 p-6">
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
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={rows} columns={columns} />
    </div>
  );
}
