import type { Metadata } from "next";
import { getServerNotifications } from "@/lib/api/me-subscription-server";
import { PatientNotificationList } from "./_components/patient-notification-list";
import { AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountNotificationsPage() {
  const [data, locale] = await Promise.all([getServerNotifications(), getPageLocale()]);
  const { account: a } = loadLocaleBundle(locale);
  const n = a.notificationsPage;
  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="gh-patient-page gh-patient-notifications-page">
      <PageHeader
        eyebrow={n.eyebrow}
        title={n.title}
        description={n.summary.replace("{unread}", String(unread)).replace("{total}", String(items.length))}
      />

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: n.unread, value: String(unread), hint: n.unreadHint },
          { label: n.total, value: String(items.length), hint: n.totalHint },
          {
            label: n.statusLabel,
            value: unread > 0 ? n.reviewNeeded : n.caughtUp,
            hint: n.statusHint,
          },
        ]}
      />

      <PatientNotificationList initial={items} i18n={n} />
    </div>
  );
}
