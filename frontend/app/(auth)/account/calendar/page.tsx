import { CalendarRange } from "lucide-react";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { PatientCalendarUI } from "./ui";
import { AdminSummaryStrip } from "@/components/portal-atoms";

export const dynamic = "force-dynamic";

function getRequestNowMs() {
  return Date.now();
}

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
  const now = getRequestNowMs();
  const upcoming = items.filter((item) => new Date(item.startAt).getTime() >= now).length;
  const meetReady = items.filter((item) => item.meta?.meetingUrl).length;
  const countries = new Set(items.map((item) => item.meta?.countryCode).filter(Boolean)).size;

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

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: "Scheduled", value: String(items.length), hint: "Consultations on calendar" },
          { label: "Upcoming", value: String(upcoming), hint: "Future appointments" },
          { label: "Meet links", value: String(meetReady), hint: "Ready to join" },
          { label: "Markets", value: String(countries), hint: "Countries represented" },
        ]}
      />

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
