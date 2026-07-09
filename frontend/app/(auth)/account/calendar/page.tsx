import { CalendarRange } from "lucide-react";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { PatientCalendarUI } from "./ui";
import { AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

function getRequestNowMs() {
  return Date.now();
}

export default async function AccountCalendarPage() {
  const [history, locale] = await Promise.all([fetchAccountAppointments(), getPageLocale()]);
  const { account: a } = loadLocaleBundle(locale);
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
      <PageHeader
        eyebrow={a.calendar.eyebrow}
        title={
          <span className="inline-flex items-center gap-2">
            <CalendarRange className="size-6 text-[var(--portal-primary)]" aria-hidden />
            {a.calendar.title}
          </span>
        }
        description={a.calendar.subtitle}
      />

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: a.calendar.sumScheduled, value: String(items.length), hint: a.calendar.sumScheduledHint },
          { label: a.calendar.sumUpcoming, value: String(upcoming), hint: a.calendar.sumUpcomingHint },
          { label: a.calendar.sumMeetLinks, value: String(meetReady), hint: a.calendar.sumMeetLinksHint },
          { label: a.calendar.sumMarkets, value: String(countries), hint: a.calendar.sumMarketsHint },
        ]}
      />

      {history.ok ? (
        <PatientCalendarUI items={items} defaultTz={defaultTz} emptyLabel={a.calendar.emptyDay} />
      ) : (
        <div className="gh-patient-empty-state rounded-[var(--radius-card-sm)] border border-[var(--portal-line)] bg-[var(--portal-surface-elevated)] px-5 py-4">
          <p className="text-sm text-[var(--portal-muted)]">{history.message}</p>
        </div>
      )}
    </div>
  );
}
