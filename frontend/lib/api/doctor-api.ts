import "server-only";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * Server-side fetchers for the doctor portal. Each call forwards the
 * `gh_auth` cookie to the backend; the backend's `verifyDoctorAccess`
 * helper enforces role + doctorId scoping so a misrouted request can't
 * leak another doctor's data.
 */

type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

async function doctorRequest<T>(path: string): Promise<ApiResult<T>> {
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return { ok: false, message: "Backend is not configured" };
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  try {
    const res = await fetch(`${apiUrl}${path}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: T;
      message?: string;
    };
    if (!res.ok || !json.ok || json.data === undefined) {
      return {
        ok: false,
        status: res.status,
        message: json.message ?? "Doctor portal request failed",
      };
    }
    return { ok: true, data: json.data as T, message: json.message };
  } catch {
    return { ok: false, message: "Backend is unavailable" };
  }
}

export type DoctorMe = {
  doctor: {
    id: string;
    slug: string;
    fullName: string;
    title: string;
    bio: string | null;
    qualifications: string[];
    languages: string[];
    whatsappNumber: string | null;
    country: { code: string; name: string; slug: string; defaultLocale: string };
    additionalCountries: Array<{
      country: { code: string; name: string; slug: string };
    }>;
    specialties: Array<{ specialty: { name: string; slug: string } }>;
    profileImagePath: string | null;
  };
  stats: {
    todayCount: number;
    weekCount: number;
    totalActive: number;
  };
};

export async function fetchDoctorMe() {
  return doctorRequest<DoctorMe>("/api/doctor/me");
}

export type DoctorAppointment = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  consultationType: string;
  countryCode: string;
  status: string;
  paymentStatus: string;
  scheduledAt: string | null;
  meetingUrl: string | null;
  createdAt: string;
  notesPreview: string | null;
};

export async function fetchDoctorAppointments(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/doctor/appointments?${qs}` : "/api/doctor/appointments";
  return doctorRequest<{
    items: DoctorAppointment[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>(path);
}

export type DoctorPatient = {
  email: string;
  fullName: string;
  phone: string | null;
  countryCode: string;
  firstSeen: string;
  appointmentCount: number;
};

export async function fetchDoctorPatients() {
  return doctorRequest<{ items: DoctorPatient[] }>("/api/doctor/patients");
}

export type ConsultationDto = {
  id: string;
  appointmentId: string;
  doctorId: string;
  chiefComplaint: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  status: "DRAFT" | "SIGNED";
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentDetailDto = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  consultationType: string;
  countryCode: string;
  status: string;
  scheduledAt: string | null;
  meetingUrl: string | null;
  notes: string | null;
  dateOfBirth: string | null;
  createdAt: string;
};

export async function fetchDoctorConsultation(appointmentId: string) {
  return doctorRequest<{
    appointment: AppointmentDetailDto;
    consultation: ConsultationDto | null;
  }>(`/api/doctor/appointments/${appointmentId}/consultation`);
}

export type ExamResultDto = {
  id: string;
  appointmentId: string;
  doctorId: string;
  testName: string;
  performedAt: string | null;
  notes: string | null;
  externalUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchDoctorExams(appointmentId: string) {
  return doctorRequest<{ items: ExamResultDto[] }>(
    `/api/doctor/appointments/${appointmentId}/exams`,
  );
}

export type InternalMessageDto = {
  id: string;
  authorRole: "DOCTOR" | "ADMIN";
  authorName: string;
  body: string;
  createdAt: string;
};

export async function fetchDoctorInternalMessages(appointmentId: string) {
  return doctorRequest<{ items: InternalMessageDto[] }>(
    `/api/doctor/appointments/${appointmentId}/internal-messages`,
  );
}

// Forms
export type FormFieldDef = {
  key: string;
  label: string;
  type: "text" | "longtext" | "choice" | "number" | "date";
  required?: boolean;
  options?: string[];
  helper?: string;
};

export type FormTemplateDto = {
  id: string;
  doctorId: string | null;
  ownedBySelf: boolean;
  title: string;
  description: string | null;
  fields: FormFieldDef[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function fetchDoctorFormTemplates() {
  return doctorRequest<{ items: FormTemplateDto[] }>(
    "/api/doctor/form-templates",
  );
}

export type FormSubmissionDto = {
  id: string;
  template: { id: string; title: string; fields: FormFieldDef[] };
  answers: Array<{ key: string; value: string | number | boolean | null }>;
  submittedAt: string;
};

export async function fetchDoctorFormSubmissions(appointmentId: string) {
  return doctorRequest<{ items: FormSubmissionDto[] }>(
    `/api/doctor/appointments/${appointmentId}/form-submissions`,
  );
}

// Consultation services-used
export type ConsultationServiceLineDto = {
  id: string;
  serviceId: string | null;
  service: { id: string; name: string; basePriceCents: number | null; currencyCode: string | null } | null;
  customLabel: string | null;
  quantity: number;
  unitPriceCents: number | null;
  currencyCode: string | null;
  createdAt: string;
};

export async function fetchDoctorConsultationServices(consultationId: string) {
  return doctorRequest<{ items: ConsultationServiceLineDto[] }>(
    `/api/doctor/consultations/${consultationId}/services`,
  );
}

// Invoice
export type DoctorInvoiceLine = {
  id: string;
  label: string;
  quantity: number;
  unitPriceCents: number | null;
  currencyCode: string | null;
};

export type DoctorInvoiceDto = {
  paymentStatus: string;
  amountCents: number | null;
  currencyCode: string | null;
  paidAt: string | null;
  stripeSessionId: string | null;
  lines: DoctorInvoiceLine[];
  lineTotalCents: number;
  payments: Array<{
    id: string;
    amountCents: number;
    currencyCode: string;
    status: string;
    createdAt: string;
  }>;
};

export async function fetchDoctorInvoice(appointmentId: string) {
  return doctorRequest<{ invoice: DoctorInvoiceDto }>(
    `/api/doctor/appointments/${appointmentId}/invoice`,
  );
}

// Reports
export type DoctorReportsDto = {
  range: { from: string; to: string };
  appointments: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    byConsultationType: Array<{ consultationType: string; count: number }>;
  };
  signedConsults: number;
  distinctPatients: number;
  revenueByCurrency: Record<string, number>;
};

export async function fetchDoctorReports(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return doctorRequest<DoctorReportsDto>(
    qs ? `/api/doctor/reports?${qs}` : "/api/doctor/reports",
  );
}

// Notifications
export type DoctorNotificationDto = {
  id: string;
  type:
    | "APPOINTMENT_ASSIGNED"
    | "INTERNAL_MESSAGE"
    | "CONSULT_SIGNED"
    | "EXAM_LOGGED"
    | "FORM_SUBMITTED";
  payload: {
    appointmentId?: string;
    snippet?: string;
    byUserName?: string;
    byRole?: "DOCTOR" | "ADMIN";
  };
  readAt: string | null;
  createdAt: string;
};

export async function fetchDoctorNotifications(onlyUnread = false) {
  const path = onlyUnread
    ? "/api/doctor/notifications?onlyUnread=1"
    : "/api/doctor/notifications";
  return doctorRequest<{
    items: DoctorNotificationDto[];
    unreadCount: number;
  }>(path);
}
