import {
  FilterBarSkeleton,
  PageHeaderSkeleton,
  SummaryStripSkeleton,
  TableSkeleton,
} from "@/components/portal-skeletons";

/**
 * The parent /doctor/reports error boundary already covers this segment, so
 * only the skeleton is overridden — this page is a filtered list (strip +
 * filter form + table), not the reports overview's tiles-and-breakdowns layout.
 */
export default function DoctorCountryConsultationsLoading() {
  return (
    <div className="grid gap-4">
      <PageHeaderSkeleton />
      <SummaryStripSkeleton items={4} />
      <FilterBarSkeleton fields={8} />
      <TableSkeleton columns={6} />
    </div>
  );
}
