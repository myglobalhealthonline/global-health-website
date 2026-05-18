import { CalendarClock } from "lucide-react";
import { fetchDoctorAvailability } from "@/lib/api/doctor-availability-server";
import { AdminCard, PageHeader } from "@/components/portal-atoms";
import { DoctorAvailabilityUI } from "./_components/availability-ui";

export const dynamic = "force-dynamic";

export default async function DoctorAvailabilityPage() {
  const result = await fetchDoctorAvailability(14);

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="size-3.5" aria-hidden /> Schedule
            </span>
          }
          title="Availability"
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <CalendarClock className="size-3.5" aria-hidden /> Schedule
          </span>
        }
        title="Availability"
        description="Manage your weekly hours and block individual time-slots when you're busy. Patients only see slots marked Open."
      />

      <DoctorAvailabilityUI
        initialWindows={result.data.windows}
        initialSlots={result.data.slots}
      />
    </>
  );
}
