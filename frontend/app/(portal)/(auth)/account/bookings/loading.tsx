import { ListPageSkeleton } from "@/components/portal-skeletons";

export default function AccountBookingsLoading() {
  return <ListPageSkeleton rows={6} columns={4} summaryItems={3} />;
}
