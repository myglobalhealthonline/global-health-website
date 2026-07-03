import { PageHeaderSkeleton, StatGridSkeleton } from "@/components/portal-skeletons";

export default function DoctorReportsLoading() {
  return (
    <div className="grid gap-4">
      <PageHeaderSkeleton />
      <StatGridSkeleton items={3} />
    </div>
  );
}
