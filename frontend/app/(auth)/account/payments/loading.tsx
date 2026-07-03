import { ListPageSkeleton } from "@/components/portal-skeletons";

export default function AccountPaymentsLoading() {
  return <ListPageSkeleton rows={6} columns={4} summaryItems={3} />;
}
