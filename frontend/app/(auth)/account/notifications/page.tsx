import type { Metadata } from "next";
import { getServerNotifications } from "@/lib/api/me-subscription-server";
import { PatientNotificationList } from "./_components/patient-notification-list";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountNotificationsPage() {
  const data = await getServerNotifications();
  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="gh-patient-page gh-patient-notifications-page">
      <header className="gh-patient-page-header mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-muted)" }}>
          Account
        </p>
        <h1 className="mt-1 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Notifications
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {unread} unread · {items.length} total
        </p>
      </header>

      <PatientNotificationList initial={items} />
    </div>
  );
}
