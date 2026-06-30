import { CalendarRange } from "lucide-react";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { PatientCalendarUI } from "./ui";

export const dynamic = "force-dynamic";

export default async function AccountCalendarPage() {
  const history = await fetchAccountAppointments();
  const items: CalendarItem[] = history.ok
    ? history.data.items
        .filter((a) => a.scheduledAt)
        .map((a) => ({
          id: a.id,
          kind: "consultation" as const,
          startAt: a.scheduledAt as string,
          endAt: null,
          status: a.status,
          title: a.doctorName ? a.doctorName : a.consultationType,
          meta: {
            doctorName: a.doctorName ?? null,
            consultationType: a.consultationType,
            meetingUrl: a.meetingUrl,
            countryCode: a.countryCode,
            patientTimezone: a.patientTimezone ?? null,
          },
        }))
    : [];

  const defaultTz =
    history.ok
      ? history.data.items.find((a) => a.patientTimezone)?.patientTimezone ?? null
      : null;

  return (
    <div className="gh-patient-page gh-patient-calendar-page">
      <header className="gh-patient-page-header mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          My schedule
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
          <CalendarRange className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
          Calendar
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Your scheduled consultations. Pick a day to see details and join links.
        </p>
      </header>

      {history.ok ? (
        <PatientCalendarUI items={items} defaultTz={defaultTz} />
      ) : (
        <div className="gh-patient-empty-state rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-panel)] px-5 py-4">
          <p className="text-sm text-[var(--color-text-muted)]">{history.message}</p>
        </div>
      )}
    </div>
  );
}
