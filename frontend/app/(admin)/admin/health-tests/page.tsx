import AdminServicesPage, {
  type AdminServicesPageProps,
} from "@/app/(admin)/admin/services/page";

export default function AdminHealthTestsPage({
  searchParams,
}: Pick<AdminServicesPageProps, "searchParams">) {
  return <AdminServicesPage searchParams={searchParams} forcedKind="HEALTH_TEST" showKindTabs={false} />;
}
