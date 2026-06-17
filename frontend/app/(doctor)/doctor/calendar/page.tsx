import { CalendarRange } from "lucide-react";
import { PageHeader, AdminCard } from "@/components/portal-atoms";
import { fetchDoctorAvailabilityRange } from "@/lib/api/doctor-availability-server";
import { fetchDoctorAppointments } from "@/lib/api/doctor-api";
import { monthGridRangeIso } from "@/components/calendar/calendar-utils";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import type { DoctorTimeSlotView } from "@/lib/api/doctor-availability-types";
import { DoctorCalendarUI } from "./ui";

export const dynamic = "force-dynamic";

export default async function DoctorCalendarPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { fromIso, toIso } = monthGridRangeIso(year, month);

  const [availability, appointments] = await Promise.all([
    fetchDoctorAvailabilityRange(fromIso, toIso),
    fetchDoctorAppointments({ pageSize: "100" }),
  ]);

  if (!availability.ok) {
    return (
      <>
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <CalendarRange className="size-3.5" aria-hidden /> Schedule
            </span>
          }
          title="Calendar"
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
    .filter((a) => a.scheduledAt)
    .map((a) => ({
      id: a.id,
      kind: "consultation" as const,
      startAt: a.scheduledAt as string,
      endAt: null,
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
            <CalendarRange className="size-3.5" aria-hidden /> Schedule
          </span>
        }
        title="Calendar"
        description="Your consultations and available slots in one view. Click a day to see its agenda, block individual slots, or set time off. Blocked slots disappear from the public booking page automatically."
      />

      <DoctorCalendarUI
        initialYear={year}
        initialMonth={month}
        initialSlots={initialSlots}
        consultations={consultations}
        clinicTimezone={clinicTimezone}
        availableTimezones={availableTimezones}
      />
    </>
  );
}
