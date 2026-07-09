import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { getDoctorAvailability } from "@/lib/content/get-doctor-availability";
import { PageHeader, AdminEmptyState, Btn } from "@/components/portal-atoms";
import { ReschedulePicker } from "./reschedule-picker";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

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
  const [{ id }, locale] = await Promise.all([params, getPageLocale()]);
  const appointment = await fetchAppointmentForReschedule(id);
  const { account: a } = loadLocaleBundle(locale);
  const r = a.reschedule;

  if (!appointment) {
    notFound();
  }

  if (!RESCHEDULABLE_STATUSES.has(appointment.status)) {
    return (
      <div className="gh-patient-page">
        <PageHeader eyebrow={r.breadcrumb} title={r.title} />
        <AdminEmptyState
          className="mt-6"
          tone="danger"
          title={r.cantRescheduleTitle}
          description={r.cantRescheduleBody}
          action={
            <Btn href="/account/bookings" variant="ghost" size="sm">
              {r.backToBookings}
            </Btn>
          }
        />
      </div>
    );
  }

  if (!appointment.doctorSlug) {
    return (
      <div className="gh-patient-page">
        <PageHeader eyebrow={r.breadcrumb} title={r.title} />
        <AdminEmptyState
          className="mt-6"
          tone="danger"
          title={r.noClinicianTitle}
          description={r.noClinicianBody}
          action={
            <Btn href="/account/bookings" variant="ghost" size="sm">
              {r.backToBookings}
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
        eyebrow={r.breadcrumb}
        title={r.title}
        description={r.subtitle}
        actions={
          <Btn href="/account/bookings" variant="ghost" size="sm">
            {r.cancel}
          </Btn>
        }
      />
      <div className="gh2-card-ivory mt-6 p-5">
        <ReschedulePicker
          appointmentId={appointment.id}
          slots={slots}
          clinicTimezone={clinicTimezone}
          currentTimeSlotId={appointment.timeSlotId}
          i18n={r}
        />
      </div>
    </div>
  );
}
