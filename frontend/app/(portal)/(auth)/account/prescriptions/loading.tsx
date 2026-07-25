import { ListPageSkeleton } from "@/components/portal-skeletons";

export default function AccountPrescriptionsLoading() {
  return <ListPageSkeleton rows={5} columns={4} summaryItems={0} />;
}
