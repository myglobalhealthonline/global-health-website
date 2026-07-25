import { redirect } from "next/navigation";

export default function AdminNewGeneralConsultationPage() {
  redirect("/admin/services/new?kind=GENERAL");
}
