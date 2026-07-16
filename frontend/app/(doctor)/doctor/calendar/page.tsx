import { Ban, CalendarCheck2, CalendarRange, Clock, Globe2 } from "lucide-react";
import { PageHeader, AdminCard, AdminSummaryStrip } from "@/components/portal-atoms";
import { fetchDoctorAvailabilityRange } from "@/lib/api/doctor-availability-server";
import { fetchDoctorAppointments } from "@/lib/api/doctor-api";
import { monthGridRangeIso } from "@/components/calendar/calendar-utils";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import type { DoctorTimeSlotView } from "@/lib/api/doctor-availability-types";
import { DoctorCalendarUI } from "./ui";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

export default async function DoctorCalendarPage() {
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { fromIso, toIso } = monthGridRangeIso(year, month);

  const [availability, appointments] = await Promise.all([
    fetchDoctorAvailabilityRange(fromIso, toIso),
    fetchDoctorAppointments({ pageSize: "100", excludeLegacy: "true" }),
  ]);

  if (!availability.ok) {
    return (
      <>
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <CalendarRange className="size-3.5" aria-hidden /> {d.calendar.eyebrowLabel}
            </span>
          }
          title={d.calendar.title}
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {availability.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const clinicTimezone = availability.data.clinicTimezone;
  const availableTimezones =
    availability.data.availableTimezones && availability.data.availableTimezones.length > 0
      ? availability.data.availableTimezones
      : [clinicTimezone];

  const initialSlots: DoctorTimeSlotView[] = availability.data.slots;

  // All scheduled consultations (placed by day client-side, any month).
  const consultations: CalendarItem[] = (appointments.ok ? appointments.data.items : [])
    .filter((a) => a.scheduledAt && a.status !== "CANCELLED")
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
  const openSlots = initialSlots.filter((slot) => slot.status === "OPEN").length;
  const blockedSlots = initialSlots.filter((slot) => slot.status === "BLOCKED").length;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <CalendarRange className="size-3.5" aria-hidden /> {d.calendar.eyebrowLabel}
          </span>
        }
        title={d.calendar.title}
        icon={<CalendarRange aria-hidden />}
      />

      <DoctorCalendarUI
        initialYear={year}
        initialMonth={month}
        initialSlots={initialSlots}
        consultations={consultations}
        clinicTimezone={clinicTimezone}
        availableTimezones={availableTimezones}
        strings={d.calendar}
        common={d.common}
        minutesShort={d.availability.minutesShort}
        errorEndAfterStart={d.availability.errorEndAfterStart}
        errorEndDateAfterStart={d.availability.errorEndDateAfterStart}
        statsSlot={
          <AdminSummaryStrip
            className="mb-4"
            items={[
              {
                label: d.calendar.statConsultations,
                value: consultations.length,
                hint: d.calendar.statConsultationsHint,
                tone: consultations.length > 0 ? "brand" : "neutral",
                icon: <CalendarCheck2 aria-hidden />,
              },
              {
                label: d.calendar.statOpenSlots,
                value: openSlots,
                hint: d.calendar.statOpenSlotsHint,
                tone: openSlots > 0 ? "success" : "warning",
                icon: <Clock aria-hidden />,
              },
              {
                label: d.calendar.statBlockedSlots,
                value: blockedSlots,
                hint: d.calendar.statBlockedSlotsHint,
                tone: blockedSlots > 0 ? "warning" : "neutral",
                icon: <Ban aria-hidden />,
              },
              {
                label: d.calendar.statTimezone,
                value: clinicTimezone.split("/").pop()?.replace(/_/g, " ") ?? clinicTimezone,
                hint: d.calendar.statTimezoneHint,
                tone: "neutral",
                icon: <Globe2 aria-hidden />,
              },
            ]}
          />
        }
      />
    </>
  );
}
