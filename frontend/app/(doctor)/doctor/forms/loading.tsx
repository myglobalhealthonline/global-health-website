import { ListPageSkeleton } from "@/components/portal-skeletons";

export default function DoctorFormsLoading() {
  return <ListPageSkeleton rows={5} columns={4} summaryItems={0} />;
}
