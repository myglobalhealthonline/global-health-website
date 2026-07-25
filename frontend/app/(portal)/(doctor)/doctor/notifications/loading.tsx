import { ListPageSkeleton } from "@/components/portal-skeletons";

export default function DoctorNotificationsLoading() {
  return <ListPageSkeleton rows={6} columns={3} summaryItems={0} />;
}
