import { DashboardSkeleton } from "./_components/skeletons";

export default function AdminDashboardLoading() {
  return (
    <div className="gh-admin-loading-state">
      <DashboardSkeleton />
    </div>
  );
}
