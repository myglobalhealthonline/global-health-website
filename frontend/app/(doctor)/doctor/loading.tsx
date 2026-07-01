export default function DoctorDashboardLoading() {
  return (
    <div className="grid gap-4" aria-label="Loading doctor dashboard">
      <div className="gh-portal-page-header animate-pulse">
        <div className="h-3 w-32 rounded-full bg-[var(--color-border)]" />
        <div className="mt-4 h-8 w-full max-w-md rounded-full bg-[var(--color-border)]" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-[var(--color-border)]" />
      </div>
      <div className="gh-admin-summary-strip animate-pulse">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="gh-admin-summary-item">
            <div className="h-3 w-24 rounded-full bg-[var(--color-border)]" />
            <div className="mt-3 h-7 w-16 rounded-full bg-[var(--color-border)]" />
            <div className="mt-2 h-3 w-28 rounded-full bg-[var(--color-border)]" />
          </div>
        ))}
      </div>
      <div className="gh-doctor-stat-grid grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="gh-card gh-stat-card animate-pulse p-5">
            <div className="h-3 w-20 rounded-full bg-[var(--color-border)]" />
            <div className="mt-5 h-9 w-14 rounded-full bg-[var(--color-border)]" />
            <div className="mt-3 h-3 w-32 rounded-full bg-[var(--color-border)]" />
          </div>
        ))}
      </div>
      <div className="gh-doctor-overview-grid grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="gh-card animate-pulse p-5">
            <div className="h-4 w-36 rounded-full bg-[var(--color-border)]" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 4 }).map((__, row) => (
                <div key={row} className="h-12 rounded-md bg-[var(--color-background-soft)]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
