import { CommandBandSkeleton, StatGridSkeleton } from "@/components/portal-skeletons";

export default function DoctorDashboardLoading() {
  return (
    <div className="grid gap-4" aria-label="Loading doctor dashboard">
      <CommandBandSkeleton metrics={3} />
      <StatGridSkeleton items={3} />
      <div className="gh-doctor-overview-grid grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="gh-card p-5">
            <div className="gh-skeleton-bar h-4 w-36" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 4 }).map((__, row) => (
                <div key={row} className="gh-skeleton-bar h-12" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
