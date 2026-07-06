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

/**
 * Doctor-portal appointment lifecycle — the plan collapses the internal
 * enum + payment state into exactly FOUR patient-facing statuses:
 *
 *   - "waiting_payment" — Booked, waiting payment. The booking exists and
 *     the payment link was sent, but the order isn't paid yet.
 *   - "confirmed"       — Booking confirmed. Order paid, consult not yet
 *     concluded.
 *   - "cancelled"       — Cancelled manually, or payment never arrived.
 *   - "concluded"       — Doctor registered the appointment as concluded.
 *
 * These are the only options the doctor filter offers, and the only labels
 * shown on the queue.
 */
export const DOCTOR_APPOINTMENT_VIEWS = [
  "waiting_payment",
  "confirmed",
  "cancelled",
  "concluded",
] as const;

export type DoctorAppointmentView = (typeof DOCTOR_APPOINTMENT_VIEWS)[number];

const VIEW_LABELS: Record<DoctorAppointmentView, string> = {
  waiting_payment: "Booked – waiting payment",
  confirmed: "Booking confirmed",
  cancelled: "Cancelled",
  concluded: "Concluded",
};

export function doctorAppointmentViewLabel(view: DoctorAppointmentView): string {
  return VIEW_LABELS[view];
}

/** Collapse (status, paymentStatus) into one of the four doctor views. */
export function doctorAppointmentView(
  status: string,
  paymentStatus: string,
): DoctorAppointmentView {
  if (status === "CANCELLED") return "cancelled";
  if (status === "COMPLETED") return "concluded";
  return paymentStatus === "PAID" ? "confirmed" : "waiting_payment";
}

/** Doctor-facing label for a single row, derived from status + payment. */
export function doctorAppointmentStatusLabel(
  status: string,
  paymentStatus: string,
): string {
  return VIEW_LABELS[doctorAppointmentView(status, paymentStatus)];
}

/** Pill tone per doctor view (matches PillTone in the portal atoms). */
export function doctorAppointmentViewTone(
  view: DoctorAppointmentView,
): "pending" | "brand" | "active" | "inactive" {
  switch (view) {
    case "waiting_payment":
      return "pending";
    case "confirmed":
      return "brand";
    case "concluded":
      return "active";
    case "cancelled":
      return "inactive";
  }
}
