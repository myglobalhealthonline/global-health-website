import { ListPageSkeleton } from "@/components/portal-skeletons";

export default function AccountAccessHistoryLoading() {
  return <ListPageSkeleton rows={6} columns={4} summaryItems={0} />;
}
