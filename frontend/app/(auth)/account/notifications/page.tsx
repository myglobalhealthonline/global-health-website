import type { Metadata } from "next";
import { getServerNotifications } from "@/lib/api/me-subscription-server";
import { PatientNotificationList } from "./_components/patient-notification-list";
import { AdminSummaryStrip } from "@/components/portal-atoms";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountNotificationsPage() {
  const data = await getServerNotifications();
  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="gh-patient-page gh-patient-notifications-page">
      <header className="gh-patient-page-header mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--portal-muted)" }}>
          Account
        </p>
        <h1 className="mt-1 text-2xl font-bold" style={{ color: "var(--portal-text)" }}>
          Notifications
        </h1>
        <p className="text-sm" style={{ color: "var(--portal-muted)" }}>
          {unread} unread · {items.length} total
        </p>
      </header>

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
