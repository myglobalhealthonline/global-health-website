import AdminServicesPage, {
  type AdminServicesPageProps,
} from "@/app/(admin)/admin/services/page";

export default function AdminSpecialistConsultationsPage({
  searchParams,
}: Pick<AdminServicesPageProps, "searchParams">) {
  return <AdminServicesPage searchParams={searchParams} forcedKind="SPECIALIST" showKindTabs={false} />;
}
