import { CalendarClock } from "lucide-react";
import { fetchDoctorAvailability } from "@/lib/api/doctor-availability-server";
import { fetchDoctorAppointments } from "@/lib/api/doctor-api";
import { AdminCard, PageHeader } from "@/components/portal-atoms";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { todayKey } from "@/components/calendar/calendar-utils";
import { DoctorAvailabilityUI } from "./_components/availability-ui";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

export default async function DoctorAvailabilityPage() {
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const [result, appointments] = await Promise.all([
    fetchDoctorAvailability(14),
    fetchDoctorAppointments({ pageSize: "100", excludeLegacy: "true" }),
  ]);

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="size-3.5" aria-hidden /> {d.availability.eyebrow}
            </span>
          }
          title={d.availability.title}
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const clinicTimezone = result.data.clinicTimezone;

  // All scheduled consultations, placed on the week grid by local day.
  const consultations: CalendarItem[] = (
    appointments.ok ? appointments.data.items : []
  )
    .filter((a) => a.scheduledAt)
    .map((a) => ({
      id: a.id,
      kind: "consultation" as const,
      startAt: a.scheduledAt as string,
      endAt: a.endAt,
      status: a.status,
      title: a.fullName,
      meta: {
        patientName: a.fullName,
        consultationType: a.consultationType,
        meetingUrl: a.meetingUrl,
        countryCode: a.countryCode,
      },
    }));

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <CalendarClock className="size-3.5" aria-hidden /> {d.availability.eyebrow}
          </span>
        }
        title={d.availability.title}
        description={d.availability.description}
      />

      <DoctorAvailabilityUI
        initialWindows={result.data.windows}
        initialSlots={result.data.slots}
        consultations={consultations}
        initialWeekAnchor={todayKey(clinicTimezone)}
        countryTimeZone={clinicTimezone}
        strings={d.availability}
        common={d.common}
        eventDetailStrings={d.calendar}
      />
    </>
  );
}
