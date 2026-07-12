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
    supportedLocales: Array<{ code: string; isDefault: boolean }>;
    translations: Array<{ locale: string; bio: string | null }>;
    additionalCountries: Array<{
      country: { code: string; name: string; slug: string };
    }>;
    specialties: Array<{ specialty: { name: string; slug: string } }>;
    profileImagePath: string | null;
    /** Masked payout bank details — the full IBAN never leaves the server. */
    bank: {
      accountHolder: string | null;
      bic: string | null;
      ibanLast4: string | null;
      ibanMasked: string | null;
      ibanSet: boolean;
    };
    markets: Array<{
      id: string;
      countryId: string;
      active: boolean;
      country: { id: string; code: string; name: string; slug: string; defaultLocale: string };
      supportedLocales: Array<{ code: string; isDefault: boolean }>;
      chamberEntity: string | null;
      registrationNumber: string | null;
      division: string | null;
      isVerified: boolean;
      verifiedAt: string | null;
      translations: Array<{
        id: string;
        locale: string;
        bio: string | null;
        seoTitle: string | null;
        seoDescription: string | null;
        seoKeywords: string[];
      }>;
      bank: {
        accountHolder: string | null;
        bic: string | null;
        ibanLast4: string | null;
        ibanMasked: string | null;
        ibanSet: boolean;
      };
    }>;
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

export type DoctorComplianceStatus = {
  confidentialityAccepted: boolean;
  twoFactorEnabled: boolean;
};

export async function fetchDoctorComplianceStatus() {
  return doctorRequest<DoctorComplianceStatus>("/api/doctor/compliance-status");
}

export type DoctorConfidentialityAgreement = {
  accepted: boolean;
  acceptedAt: string | null;
  agreementVersion: string;
  currentVersion: string;
  agreementText: string;
};

export async function fetchDoctorConfidentialityAgreement() {
  return doctorRequest<DoctorConfidentialityAgreement>("/api/doctor/confidentiality-agreement");
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
  finalized?: boolean;
  manualEntry?: boolean;
};

export async function fetchDoctorUnreadMessageCount(): Promise<number> {
  const result = await doctorRequest<{ unreadCount: number }>("/api/doctor/messages/unread");
  return result.ok && typeof result.data.unreadCount === "number" ? result.data.unreadCount : 0;
}

export type DoctorMessageThread = {
  appointmentId: string;
  orderNumber: string | null;
  patientName: string;
  patientEmail: string | null;
  consultationType: string;
  countryCode: string;
  lastMessage: {
    body: string | null;
    authorRole: "PATIENT" | "DOCTOR";
    createdAt: string;
  } | null;
  unreadCount: number;
};

export async function fetchDoctorMessageThreads() {
  return doctorRequest<{ items: DoctorMessageThread[] }>(
    "/api/doctor/message-threads",
  );
}

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
  /** URL-safe email — used as the route slug for /doctor/patients/[email].
   *  Frontend MUST NOT render this as visible text per GDPR plan. */
  email: string;
  fullName: string;
  countryCode: string;
  firstSeen: string;
  appointmentCount: number;
};

export async function fetchDoctorPatients() {
  return doctorRequest<{ items: DoctorPatient[] }>("/api/doctor/patients");
}

export type DoctorPatientDetail = {
  patient: {
    /** URL-safe email — passed through for navigation + chat thread
     *  routing only. NOT rendered as visible text in the doctor UI. */
    email: string;
    fullName: string;
    countryCode: string;
    dateOfBirth: string | null;
    firstSeen: string;
    appointmentCount: number;
    signedConsultCount: number;
  };
  appointments: Array<{
    id: string;
    consultationType: string;
    countryCode: string;
    status: string;
    paymentStatus: string;
    scheduledAt: string | null;
    meetingUrl: string | null;
    createdAt: string;
    consultation: {
      id: string;
      status: "DRAFT" | "SIGNED";
      signedAt: string | null;
    } | null;
  }>;
};

export async function fetchDoctorPatientDetail(email: string) {
  return doctorRequest<DoctorPatientDetail>(
    `/api/doctor/patients/${encodeURIComponent(email)}`,
  );
}

export type DoctorPatientDocumentsPayload = {
  uploads: Array<{
    id: string;
    appointmentId: string;
    label: string;
    fileName?: string;
    mimetype: string;
    byteSize: number;
    createdAt: string;
  }>;
  generated: Array<{
    id: string;
    appointmentId: string;
    fileName: string;
    documentType: string;
    sentToPatient: boolean;
    metadata: unknown;
    createdAt: string;
  }>;
};

export async function fetchDoctorPatientDocuments(email: string) {
  return doctorRequest<DoctorPatientDocumentsPayload>(
    `/api/doctor/patients/${encodeURIComponent(email)}/documents`,
  );
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
  consultationMode?: "ONLINE" | "IN_PERSON";
  followUpFromAppointmentId?: string | null;
  finalized?: boolean;
  notesUploaded?: boolean;
  filesUploaded?: boolean;
  manualEntry?: boolean;
  pharmacy?: string | null;
  symptoms?: string | null;
  /** IANA tz the patient was in at booking. Doctor portal uses this to
   *  show patient-local time alongside doctor-local time. Null on legacy
   *  appointments that pre-date the booking-fields migration. */
  patientTimezone?: string | null;
  /** Clinic timezone (Country.bookingSetting.timezone) for this appointment's
   *  country. Drives the doctor-local time shown in the portal. Defaults to
   *  "UTC" when the country has no booking setting. */
  clinicTimezone?: string;
  /** BCP-47 language the patient selected at booking (e.g. "en", "pt"). */
  consultationLanguageCode?: string | null;
  /** Patient's Global Health Number — shown in appointment/medical context only. */
  globalHealthNumber?: string | null;
  createdAt: string;
};

export async function fetchDoctorConsultation(appointmentId: string) {
  return doctorRequest<{
    appointment: AppointmentDetailDto;
    consultation: ConsultationDto | null;
  }>(`/api/doctor/appointments/${appointmentId}/consultation`);
}

export type DoctorDocumentDto = {
  id: string;
  label: string;
  mimetype: string;
  byteSize: number;
  url: string;
  createdAt: string;
};

export async function fetchDoctorDocuments(appointmentId: string) {
  return doctorRequest<{ items: DoctorDocumentDto[] }>(
    `/api/doctor/appointments/${appointmentId}/documents`,
  );
}

export type GeneratedDocumentListItem = {
  id: string;
  documentType: string;
  fileName: string;
  sentToPatient: boolean;
  createdAt: string;
};

export async function fetchDoctorGeneratedDocuments(appointmentId: string) {
  return doctorRequest<{
    items: GeneratedDocumentListItem[];
    queue: GeneratedDocumentListItem[];
    history: GeneratedDocumentListItem[];
  }>(`/api/doctor/appointments/${appointmentId}/documents/generated`);
}

export type ExamResultDto = {
  id: string;
  appointmentId: string;
  doctorId: string;
  testName: string;
  status: "REQUESTED" | "COMPLETED";
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
  // Service names are translatable; backend resolves against ?locale=, so
  // thread the doctor's UI language (gh_locale cookie) through.
  const locale = (await cookies()).get("gh_locale")?.value;
  const qs = locale ? `?locale=${encodeURIComponent(locale.toUpperCase())}` : "";
  return doctorRequest<{ items: ConsultationServiceLineDto[] }>(
    `/api/doctor/consultations/${consultationId}/services${qs}`,
  );
}

// Invoice (per-appointment, embedded on workspace)
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
  lineTotalsByCurrency: Record<string, number>;
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

// Invoices index
export type DoctorInvoiceRow = {
  id: string;
  fullName: string;
  email: string;
  consultationType: string;
  countryCode: string;
  status: string;
  paymentStatus: string;
  amountCents: number | null;
  /** Admin-set payout to the doctor for this consultation, in cents.
   *  Null = no payout set for the booked service (shows "Not set"). This is
   *  the value the doctor sees as AMOUNT — not the patient's gross price. */
  doctorAmountCents: number | null;
  currencyCode: string | null;
  paidAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
};

export async function fetchDoctorInvoicesList(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") params.set(k, v);
    }
  }
  const qs = params.toString();
  return doctorRequest<{
    items: DoctorInvoiceRow[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>(qs ? `/api/doctor/invoices?${qs}` : "/api/doctor/invoices");
}

// Reports
export type DoctorReportsDto = {
  range: { from: string; to: string };
  filters: {
    consultationType: string | null;
    paymentStatus: string | null;
    status: string | null;
  };
  appointments: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    byConsultationType: Array<{ consultationType: string; count: number }>;
  };
  signedConsults: number;
  followUps: number;
  distinctPatients: number;
  revenueByCurrency: Record<string, number>;
};

export async function fetchDoctorReports(query?: {
  from?: string;
  to?: string;
  consultationType?: string;
  paymentStatus?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (query?.from) params.set("from", query.from);
  if (query?.to) params.set("to", query.to);
  if (query?.consultationType)
    params.set("consultationType", query.consultationType);
  if (query?.paymentStatus) params.set("paymentStatus", query.paymentStatus);
  if (query?.status) params.set("status", query.status);
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

export type DoctorServiceAssignment = {
  id: string;
  serviceId: string;
  status: "pending" | "active" | "rejected" | "disabled";
  selectedBy: "admin" | "doctor";
  isActive: boolean;
  /** Admin-set payout to this doctor for this service, in cents. Read-only
   *  for the doctor. Null = not set. */
  doctorAmountCents: number | null;
};

export type DoctorSelectableService = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION";
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  countryId: string;
  countryName: string;
  countryCode: string;
  assignment: DoctorServiceAssignment | null;
};

export type DoctorServicesPayload = {
  approvalRequired: boolean;
  items: DoctorSelectableService[];
};

export async function fetchDoctorServices() {
  // Service names/summaries are translatable; backend resolves against
  // ?locale=, so thread the doctor's UI language (gh_locale cookie) through.
  const locale = (await cookies()).get("gh_locale")?.value;
  const qs = locale ? `?locale=${encodeURIComponent(locale.toUpperCase())}` : "";
  return doctorRequest<DoctorServicesPayload>(`/api/doctor/services${qs}`);
}
