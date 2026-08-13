import Link from "next/link";
import { fetchDoctorNotifications } from "@/lib/api/doctor-api";
import { PageHeader } from "@/components/portal-atoms";
import { NotificationListClient } from "./_components/notification-list";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

export default async function DoctorNotificationsPage() {
  const [result, locale] = await Promise.all([fetchDoctorNotifications(), getPortalLocale()]);
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

      <p className="mt-6 text-portal-meta text-[var(--portal-muted)]">
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
