import { PageHeaderSkeleton, FormSkeleton } from "@/components/portal-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FormSkeleton sections={2} />
    </div>
  );
}
