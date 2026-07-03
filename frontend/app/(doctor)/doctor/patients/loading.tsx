import { ListPageSkeleton } from "@/components/portal-skeletons";

export default function DoctorPatientsLoading() {
  return <ListPageSkeleton rows={6} columns={5} summaryItems={3} />;
}
