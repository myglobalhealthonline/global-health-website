import { PageHeaderSkeleton, TableSkeleton } from "@/components/portal-skeletons";

export default function Loading() {
  return (
    <div className="gh-skeleton-list space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
}
