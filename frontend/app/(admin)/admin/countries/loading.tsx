import { ListPageSkeleton } from "../_components/skeletons";

export default function Loading() {
  return (
    <div className="gh-admin-country-loading">
      <ListPageSkeleton rows={5} columns={6} />
    </div>
  );
}
