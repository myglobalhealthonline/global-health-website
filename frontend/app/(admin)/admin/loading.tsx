import { ListPageSkeleton } from "./_components/skeletons";

export default function AdminDashboardLoading() {
  return (
    <div className="gh-admin-loading-state">
      <ListPageSkeleton rows={6} columns={5} />
    </div>
  );
}
