import { PageHeaderSkeleton, FormSkeleton } from "../../_components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-5 lg:grid-cols-2">
        <FormSkeleton sections={2} />
        <FormSkeleton sections={2} />
      </div>
    </div>
  );
}
