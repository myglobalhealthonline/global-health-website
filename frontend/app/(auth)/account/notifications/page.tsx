import type { Metadata } from "next";
import { getServerNotifications } from "@/lib/api/me-subscription-server";
import { PatientNotificationList } from "./_components/patient-notification-list";
import { PageHeader } from "@/components/portal-atoms";
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

      {/* Rule S3 (audit 07-002): the header description already states
          unread/total — the stat-card strip was pure duplication. */}
      <PatientNotificationList initial={items} i18n={n} />
    </div>
  );
}
