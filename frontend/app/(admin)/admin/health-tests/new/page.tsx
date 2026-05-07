import { redirect } from "next/navigation";

export default function AdminNewHealthTestPage() {
  redirect("/admin/services/new?kind=HEALTH_TEST");
}
