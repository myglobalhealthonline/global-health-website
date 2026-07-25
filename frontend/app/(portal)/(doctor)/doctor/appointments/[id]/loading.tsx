import { PageHeaderSkeleton } from "@/components/portal-skeletons";

export default function DoctorAppointmentDetailLoading() {
  return (
    <div className="grid gap-4">
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
        <div className="gh-card grid gap-3 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="gh-skeleton-bar h-10" />
          ))}
        </div>
        <div className="gh-card grid gap-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="gh-skeleton-bar h-8" />
          ))}
        </div>
      </div>
    </div>
  );
}
