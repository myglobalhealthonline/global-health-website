import { redirect } from "next/navigation";

// Only one settings category exists today (Reviews) — this index exists
// purely so "/admin/settings" is a real, linkable breadcrumb prefix (see
// tests/unit/portal-breadcrumb-routes.test.ts) instead of a dead crumb.
// Add more `/admin/settings/<x>` pages here as they show up; this page can
// grow into a real settings index if/when there's more than one.
export default function AdminSettingsIndexPage() {
  redirect("/admin/settings/reviews");
}
