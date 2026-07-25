import { ListPageSkeleton } from "../_components/skeletons";

export default function Loading() {
  return (
    <div className="gh-admin-doctor-loading">
      <ListPageSkeleton rows={6} columns={6} />
    </div>
  );
}
