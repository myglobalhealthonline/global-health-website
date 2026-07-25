import { DoctorTeamTemplate } from "@/components/templates/DoctorTeamTemplate";
import { FeaturedDoctor } from "@/components/sections/FeaturedDoctor";
import { DoctorFilters } from "@/components/sections/DoctorFilters";
import type { DoctorDirectoryView as DoctorDirectoryViewModel } from "@/lib/content/doctor-directory";

/**
 * Pure presentational render of a computed directory view model. No hooks —
 * safe to render from the server (the no-filter Suspense fallback) or from
 * the client (`DoctorsDirectoryClient`, after applying the URL filters).
 */
export function DoctorDirectoryView({ view }: { view: DoctorDirectoryViewModel }) {
  const { countryName, bookingHref, bookingLabel, i18n, doctorCards, spotlight, totalDoctorCount, filterGroups, hasActive, clearHref, clearLabel, filtersLabel } = view;

  return (
    <DoctorTeamTemplate
      countryName={countryName}
      doctors={doctorCards}
      totalDoctorCount={totalDoctorCount}
      bookingHref={bookingHref}
      bookingLabel={bookingLabel}
      i18n={i18n}
      showBottomCta
      spotlight={
        spotlight ? (
          <div key="featured-spotlight" className="mb-10">
            <FeaturedDoctor standalone={false} doctor={spotlight} />
          </div>
        ) : null
      }
      filters={
        <DoctorFilters
          key="doctor-filters"
          groups={filterGroups}
          clearHref={clearHref}
          hasActive={hasActive}
          clearLabel={clearLabel}
          filtersLabel={filtersLabel}
          dark
        />
      }
    />
  );
}
