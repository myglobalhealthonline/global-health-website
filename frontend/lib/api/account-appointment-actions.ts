import { apiRequest } from "./client";

type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

/**
 * Patient self-service cancel. Goes through the same-origin Next.js proxy
 * (`/api/account/appointments/[id]/cancel`) so the httpOnly session cookie
 * reaches the backend — same reasoning as chat-api.ts.
 */
export async function cancelAccountAppointment(
  appointmentId: string,
): Promise<ApiResult<{ appointment: { id: string; status: string } }>> {
  return apiRequest(`/api/account/appointments/${appointmentId}/cancel`, {
    method: "POST",
    credentials: "include",
    body: {},
    sameOrigin: true,
  });
}

/** Resolve a live Stripe Checkout URL to resume payment on an unpaid/failed booking. */
export async function fetchAppointmentPaymentUrl(
  appointmentId: string,
): Promise<ApiResult<{ url: string }>> {
  return apiRequest(`/api/account/appointments/${appointmentId}/payment-url`, {
    credentials: "include",
    sameOrigin: true,
  });
}

export type RescheduleAppointmentDetail = {
  id: string;
  status: string;
  doctorId: string | null;
  doctorSlug: string | null;
  countryCode: string;
  timeSlotId: string | null;
  scheduledAt: string | null;
};

/** Detail needed to drive the reschedule picker (which doctor's availability to load). */
export async function fetchAppointmentForReschedule(
  appointmentId: string,
): Promise<ApiResult<{ appointment: RescheduleAppointmentDetail }>> {
  return apiRequest(`/api/account/appointments/${appointmentId}/reschedule`, {
    credentials: "include",
    sameOrigin: true,
  });
}

/** Patient self-service reschedule onto a new OPEN slot (same doctor). */
export async function rescheduleAccountAppointment(
  appointmentId: string,
  newTimeSlotId: string,
): Promise<ApiResult<{ appointment: { id: string; status: string; scheduledAt: string | null } }>> {
  return apiRequest(`/api/account/appointments/${appointmentId}/reschedule`, {
    method: "PATCH",
    credentials: "include",
    body: { newTimeSlotId },
    sameOrigin: true,
  });
}
