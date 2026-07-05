import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { getDoctorAvailability } from "@/lib/content/get-doctor-availability";
import { PageHeader, AdminEmptyState, Btn } from "@/components/portal-atoms";
import { ReschedulePicker } from "./reschedule-picker";

export const dynamic = "force-dynamic";

type RescheduleAppointmentDetail = {
  id: string;
  status: string;
  doctorId: string | null;
  doctorSlug: string | null;
  countryCode: string;
  timeSlotId: string | null;
  scheduledAt: string | null;
};

// Mirrors backend appointment-status-transitions.ts — only a non-terminal
// status can be rescheduled. Kept in sync with CANCELLABLE_STATUSES in
// ../ui.tsx.
const RESCHEDULABLE_STATUSES = new Set(["REQUEST_RECEIVED", "UNDER_REVIEW", "CONTACTED"]);

async function fetchAppointmentForReschedule(id: string): Promise<RescheduleAppointmentDetail | null> {
  const backend = getBackendOrigin();
  if (!backend) return null;
  const store = await cookies();
  const cookieHeader = store.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  try {
    const res = await fetch(`${backend}/api/account/appointments/${encodeURIComponent(id)}/reschedule`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await res.json()) as { ok?: boolean; data?: { appointment?: RescheduleAppointmentDetail } };
    if (!res.ok || !json.ok || !json.data?.appointment) return null;
    return json.data.appointment;
  } catch {
    return null;
  }
}

export default async function RescheduleAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const appointment = await fetchAppointmentForReschedule(id);

  if (!appointment) {
    notFound();
  }

  if (!RESCHEDULABLE_STATUSES.has(appointment.status)) {
    return (
      <div className="gh-patient-page">
        <PageHeader eyebrow="Bookings" title="Reschedule booking" />
        <AdminEmptyState
          className="mt-6"
          tone="danger"
          title="This booking can't be rescheduled"
          description="This appointment has already been completed or cancelled, so it no longer accepts a new time."
          action={
            <Btn href="/account/bookings" variant="ghost" size="sm">
              Back to bookings
            </Btn>
          }
        />
      </div>
    );
  }

  if (!appointment.doctorSlug) {
    return (
      <div className="gh-patient-page">
        <PageHeader eyebrow="Bookings" title="Reschedule booking" />
        <AdminEmptyState
          className="mt-6"
          tone="danger"
          title="No clinician assigned yet"
          description="This request hasn't been matched with a clinician yet, so there's no availability to reschedule against. Message the clinic if you need a different time."
          action={
            <Btn href="/account/bookings" variant="ghost" size="sm">
              Back to bookings
            </Btn>
          }
        />
      </div>
    );
  }

  const { slots, clinicTimezone } = await getDoctorAvailability(
    appointment.countryCode,
    appointment.doctorSlug,
  );

  return (
    <div className="gh-patient-page">
      <PageHeader
        eyebrow="Bookings"
        title="Reschedule booking"
        description="Pick a new time with your current clinician. Your existing slot stays held until you confirm a new one."
        actions={
          <Btn href="/account/bookings" variant="ghost" size="sm">
            Cancel
          </Btn>
        }
      />
      <div className="gh2-card-ivory mt-6 p-5">
        <ReschedulePicker
          appointmentId={appointment.id}
          slots={slots}
          clinicTimezone={clinicTimezone}
          currentTimeSlotId={appointment.timeSlotId}
        />
      </div>
    </div>
  );
}
