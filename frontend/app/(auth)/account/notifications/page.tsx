import type { Metadata } from "next";
import { getServerNotifications } from "@/lib/api/me-subscription-server";
import { PatientNotificationList } from "./_components/patient-notification-list";
import { AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountNotificationsPage() {
  const data = await getServerNotifications();
  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="gh-patient-page gh-patient-notifications-page">
      <PageHeader
        eyebrow="Account"
        title="Notifications"
        description={`${unread} unread · ${items.length} total`}
      />

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: "Unread", value: String(unread), hint: "Needs attention" },
          { label: "Total", value: String(items.length), hint: "All account alerts" },
          {
            label: "Status",
            value: unread > 0 ? "Review needed" : "Caught up",
            hint: "Appointments, payments, and documents",
          },
        ]}
      />

      <PatientNotificationList initial={items} />
    </div>
  );
}
