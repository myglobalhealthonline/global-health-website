import { redirect } from "next/navigation";

export default function AdminNewOnlinePrescriptionPage() {
  redirect("/admin/services/new?kind=PRESCRIPTION");
}
