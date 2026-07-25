import { ListPageSkeleton } from "../_components/skeletons";

export default function Loading() {
  return (
    <div className="gh-admin-specialty-loading">
      <ListPageSkeleton rows={6} columns={5} />
    </div>
  );
}
