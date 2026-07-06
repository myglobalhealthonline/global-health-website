import { cache } from "react";
import { adminRequest } from "./core";

type AdminAppointmentsListPayload = {
  items: Array<{
    id: string;
    country: string;
    consultationType: string;
    fullName: string;
    email: string;
    phone: string | null;
    notesPreview: string | null;
    status: string;
    createdAt: string;
    /** In-progress detection for the queue's live-halo state (AppointmentCard). */
    scheduledAt: string | null;
    doctorId: string | null;
    doctorName: string | null;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminAppointmentDetailPayload = {
  appointment: {
    id: string;
    country: string;
    consultationType: string;
    fullName: string;
    email: string;
    phone: string | null;
    notes: string | null;
    status: string;
    scheduledAt: string | null;
    meetingUrl: string | null;
    paymentStatus: string;
    amountCents: number | null;
    currencyCode: string | null;
    consultationMode: string | null;
    clinicId: string | null;
    locationAddress: string | null;
    doctorId: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export async function fetchAdminAppointments(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/appointments?${qs}` : "/api/admin/appointments";
  return adminRequest<AdminAppointmentsListPayload>(path);
}

export const fetchAdminAppointmentById = cache(async (id: string) => {
  return adminRequest<AdminAppointmentDetailPayload>(`/api/admin/appointments/${id}`);
});

export type AdminCalendarSlot = {
  id: string;
  doctorId: string;
  doctorName: string;
  startAt: string;
  endAt: string;
  status: string;
  blockReason: string | null;
};

export type AdminCalendarConsultation = {
  id: string;
  doctorId: string | null;
  doctorName: string | null;
  patientName: string;
  consultationType: string;
  status: string;
  scheduledAt: string;
  meetingUrl: string | null;
  countryCode: string;
};

export type AdminCalendarPayload = {
  slots: AdminCalendarSlot[];
  consultations: AdminCalendarConsultation[];
};

/** Cross-doctor calendar aggregate (read-only). `from`/`to` are ISO UTC
 *  instants; the optional filters narrow to one doctor / type / country. */
export async function fetchAdminCalendar(query: {
  from: string;
  to: string;
  doctorId?: string;
  consultationType?: string;
  countryCode?: string;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  return adminRequest<AdminCalendarPayload>(`/api/admin/calendar?${params.toString()}`);
}

/** Body for POST /api/admin/appointments — admin-initiated manual
 *  appointment creation. Server upserts the patient User, generates a
 *  unique temp password, and emails both a Stripe payment link AND a
 *  set-password link. Response carries the temp password + set-password
 *  URL so the admin UI can show a recovery banner if the email fails. */
export type CreateManualAppointmentInput = {
  patient: {
    email: string;
    fullName: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    nationalIdNumber?: string | null;
    taxIdNumber?: string | null;
    passportNumber?: string | null;
    addressLine1?: string | null;
    addressCity?: string | null;
    addressCountryCode?: string | null;
  };
  serviceId: string;
  /** Required — the assigned doctor whose open slot is being booked. */
  doctorId: string;
  /** Required — id of the first base time slot to claim. The backend
   *  consumes consecutive base slots covering `durationMinutes` and derives
   *  scheduledAt from the slot's start time. */
  timeSlotId: string;
  /** Consultation length in minutes. Omit to use the service's duration;
   *  the booking dialog can override it. */
  durationMinutes?: number | null;
  consultationMode: "ONLINE" | "IN_PERSON";
  clinicId?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
  countryCode: string;
  returnTo?: string;
};

export type CreateManualAppointmentResult = {
  appointmentId: string;
  orderId: string;
  patientUserId: string;
  paymentUrl: string | null;
  paymentSessionId: string | null;
  /** Null when an existing patient was matched by email — we don't
   *  rotate live credentials silently. The set-password URL is the
   *  recovery path in that case. */
  tempPassword: string | null;
  setPasswordUrl: string;
  emailQueued: boolean;
};

export async function postAdminManualBooking(input: CreateManualAppointmentInput) {
  return adminRequest<CreateManualAppointmentResult>("/api/admin/appointments", {
    method: "POST",
    body: input,
  });
}

export async function patchAdminAppointmentStatus(id: string, status: string) {
  return adminRequest<AdminAppointmentDetailPayload>(`/api/admin/appointments/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

/** Set/clear the call slot, meeting URL, and (for IN_PERSON visits) the
 *  clinic FK or free-text locationAddress. Each field is independently
 *  optional; omitting one leaves the existing value alone. The backend
 *  enforces that clinicId and locationAddress are mutually exclusive
 *  AND that IN_PERSON appointments end up with at least one of them. */
export async function patchAdminAppointmentSchedule(
  id: string,
  input: {
    scheduledAt?: string | null;
    meetingUrl?: string | null;
    consultationMode?: "ONLINE" | "IN_PERSON";
    clinicId?: string | null;
    locationAddress?: string | null;
  },
) {
  // Response includes `emailed: boolean` — true when the schedule email
  // actually fired (changed values + both fields set). Used to tailor the
  // admin success toast.
  return adminRequest<AdminAppointmentDetailPayload & { emailed?: boolean }>(
    `/api/admin/appointments/${id}/schedule`,
    { method: "PATCH", body: input },
  );
}

export type AdminAppointmentUpdateResult = {
  appointment: AdminAppointmentDetailPayload["appointment"];
  orderId: string | null;
  meetingUrl: string | null;
  notificationsSent: boolean;
};

/** Change consultation date/time and/or doctor from the admin order page. */
export async function patchAdminAppointmentUpdate(
  id: string,
  input: {
    scheduledAt?: string | null;
    doctorId?: string | null;
    changeReason: string;
  },
) {
  return adminRequest<AdminAppointmentUpdateResult>(
    `/api/admin/appointments/${id}/update`,
    { method: "PATCH", body: input },
  );
}
