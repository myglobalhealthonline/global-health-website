import Link from "next/link";
import { Bell } from "lucide-react";
import { fetchDoctorNotifications } from "@/lib/api/doctor-api";
import { AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { NotificationListClient } from "./_components/notification-list";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

export default async function DoctorNotificationsPage() {
  const [result, locale] = await Promise.all([fetchDoctorNotifications(), getPageLocale()]);
  const { doctor: d } = loadLocaleBundle(locale);
  const TYPE_LABEL: Record<string, string> = {
    APPOINTMENT_ASSIGNED: d.notifications.appointmentAssigned,
    INTERNAL_MESSAGE: d.notifications.internalMessage,
    CONSULT_SIGNED: d.notifications.consultSigned,
    EXAM_LOGGED: d.notifications.examLogged,
    FORM_SUBMITTED: d.notifications.formSubmitted,
  };

  if (!result.ok) {
    return (
      <div className="gh-card p-6">
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {result.message}
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={d.notificationsPage.eyebrow}
        title={d.notificationsPage.title}
        description={d.notificationsPage.description}
      />

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: d.notificationsPage.unread,
            value: result.data.unreadCount,
            hint: d.notificationsPage.needsReview,
            tone: result.data.unreadCount > 0 ? "warning" : "neutral",
          },
          {
            label: d.notificationsPage.total,
            value: result.data.items.length,
            hint: d.notificationsPage.recentHint,
            tone: "brand",
          },
          {
            label: d.notificationsPage.source,
            value: <Bell className="size-5" aria-hidden />,
            hint: d.notificationsPage.sourceHint,
            tone: "success",
          },
        ]}
      />

      <NotificationListClient
        initial={result.data.items.map((n) => ({
          id: n.id,
          type: n.type,
          label: TYPE_LABEL[n.type] ?? n.type,
          appointmentId: n.payload?.appointmentId,
          snippet: n.payload?.snippet,
          byUserName: n.payload?.byUserName,
          byRole: n.payload?.byRole,
          readAt: n.readAt,
          createdAt: n.createdAt,
        }))}
        strings={d.notificationsPage}
      />

      <p className="mt-6 text-[12px] text-[var(--portal-muted)]">
        {d.notificationsPage.footerHint}{" "}
        <Link
          href="/doctor/appointments"
          className="font-semibold text-[var(--portal-primary)] underline-offset-2 hover:underline"
        >
          {d.notificationsPage.myAppointments}
        </Link>
        .
      </p>
    </>
  );
}
