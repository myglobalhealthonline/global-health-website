import { ListPageSkeleton } from "@/components/portal-skeletons";

export default function DoctorAppointmentsLoading() {
  return <ListPageSkeleton rows={8} columns={6} summaryItems={4} />;
}
