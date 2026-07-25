import { ListPageSkeleton } from "@/components/portal-skeletons";

export default function AccountMedicalFilesLoading() {
  return <ListPageSkeleton rows={5} columns={3} summaryItems={0} />;
}
