import { redirect } from "next/navigation";

export default function AdminNewHomeDeliveryPage() {
  redirect("/admin/services/new?kind=HOME_DELIVERY");
}
