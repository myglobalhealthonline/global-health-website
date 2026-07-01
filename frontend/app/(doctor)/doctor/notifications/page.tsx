import Link from "next/link";
import { Bell } from "lucide-react";
import { fetchDoctorNotifications } from "@/lib/api/doctor-api";
import { AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { NotificationListClient } from "./_components/notification-list";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  APPOINTMENT_ASSIGNED: "Appointment assigned",
  INTERNAL_MESSAGE: "Internal message",
  CONSULT_SIGNED: "Consultation signed",
  EXAM_LOGGED: "Exam result logged",
  FORM_SUBMITTED: "Form submitted",
};

export default async function DoctorNotificationsPage() {
  const result = await fetchDoctorNotifications();

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
        eyebrow="Attention queue"
        title="Notifications"
        description="Appointment assignments, internal messages, signed consults, submitted forms, and logged exam results that may need follow-up."
      />

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: "Unread",
            value: result.data.unreadCount,
            hint: "Needs review",
            tone: result.data.unreadCount > 0 ? "warning" : "neutral",
          },
          {
            label: "Total",
            value: result.data.items.length,
            hint: "Recent notifications",
            tone: "brand",
          },
          {
            label: "Source",
            value: <Bell className="size-5" aria-hidden />,
            hint: "Consultation workflow",
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
      />

      <p className="mt-6 text-[12px] text-[var(--color-text-muted)]">
        See an appointment in the list? Open it from{" "}
        <Link
          href="/doctor/appointments"
          className="font-semibold text-[var(--color-brand-primary)] underline-offset-2 hover:underline"
        >
          My appointments
        </Link>
        .
      </p>
    </>
  );
}
