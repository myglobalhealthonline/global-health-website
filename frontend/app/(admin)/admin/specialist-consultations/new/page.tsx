import { redirect } from "next/navigation";

export default function AdminNewSpecialistConsultationPage() {
  redirect("/admin/services/new?kind=SPECIALIST");
}
