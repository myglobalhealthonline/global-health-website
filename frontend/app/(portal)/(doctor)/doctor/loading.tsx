import { CommandBandSkeleton, StatGridSkeleton } from "@/components/portal-skeletons";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export default async function DoctorDashboardLoading() {
  const locale = await getPortalLocale();
  const { doctor: d } = loadLocaleBundle(locale);

  return (
    <div className="grid gap-4" aria-label={d.dashboard.loadingAriaLabel}>
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
