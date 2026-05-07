import AdminServicesPage, {
  type AdminServicesPageProps,
} from "@/app/(admin)/admin/services/page";

export default function AdminGeneralConsultationsPage({
  searchParams,
}: Pick<AdminServicesPageProps, "searchParams">) {
  return <AdminServicesPage searchParams={searchParams} forcedKind="GENERAL" showKindTabs={false} />;
}
