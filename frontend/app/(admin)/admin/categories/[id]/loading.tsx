import { FormSkeleton, PageHeaderSkeleton } from "../../_components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FormSkeleton sections={1} />
    </div>
  );
}
