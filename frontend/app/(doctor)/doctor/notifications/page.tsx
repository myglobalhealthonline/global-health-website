import Link from "next/link";
import { fetchDoctorNotifications } from "@/lib/api/doctor-api";
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
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Doctor
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
            Notifications
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {result.data.unreadCount} unread · {result.data.items.length} total
          </p>
        </div>
      </header>

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
