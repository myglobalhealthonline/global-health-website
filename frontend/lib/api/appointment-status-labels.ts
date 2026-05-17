/**
 * Plan-aligned doctor-portal labels for the internal Appointment status
 * enum. The backend enum predates the doctor dashboard plan (which
 * speaks "Created / Sent / Concluded …"); rather than rename the
 * enum and break the existing admin surfaces, we map at the UI layer.
 *
 * Keep both the short status code (for filters) AND the doctor-facing
 * label so admin pages can stay on the technical name if they prefer.
 */

export const APPOINTMENT_STATUS_VALUES = [
  "REQUEST_RECEIVED",
  "UNDER_REVIEW",
  "CONTACTED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type AppointmentStatusValue = (typeof APPOINTMENT_STATUS_VALUES)[number];

const LABELS: Record<AppointmentStatusValue, string> = {
  REQUEST_RECEIVED: "Created",
  UNDER_REVIEW: "Sent",
  CONTACTED: "Contacted",
  COMPLETED: "Concluded",
  CANCELLED: "Cancelled",
};

export function appointmentStatusLabel(status: string): string {
  return (LABELS as Record<string, string>)[status] ?? status;
}
