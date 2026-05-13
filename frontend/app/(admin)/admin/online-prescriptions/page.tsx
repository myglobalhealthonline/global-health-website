import AdminServicesPage, {
  type AdminServicesPageProps,
} from "@/app/(admin)/admin/services/page";

export default function AdminOnlinePrescriptionsPage({
  searchParams,
}: Pick<AdminServicesPageProps, "searchParams">) {
  return <AdminServicesPage searchParams={searchParams} forcedKind="PRESCRIPTION" showKindTabs={false} />;
}
