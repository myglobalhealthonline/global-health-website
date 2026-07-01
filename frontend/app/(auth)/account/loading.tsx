export default function AccountLoading() {
  return (
    <div className="gh-patient-page grid gap-6">
      <header className="gh-patient-page-header">
        <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--color-background-soft)]" />
        <div className="mt-3 h-8 w-64 max-w-full animate-pulse rounded-full bg-[var(--color-background-soft)]" />
        <div className="mt-3 h-4 w-[min(100%,28rem)] animate-pulse rounded-full bg-[var(--color-background-soft)]" />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-panel)]"
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="h-80 animate-pulse rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-panel)]" />
        <div className="h-80 animate-pulse rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-panel)]" />
      </div>
    </div>
  );
}
