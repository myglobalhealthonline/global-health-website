import AdminServicesPage, {
  type AdminServicesPageProps,
} from "@/app/(admin)/admin/services/page";

export default function AdminHomeDeliveryPage({
  searchParams,
}: Pick<AdminServicesPageProps, "searchParams">) {
  return <AdminServicesPage searchParams={searchParams} forcedKind="HOME_DELIVERY" showKindTabs={false} />;
}
