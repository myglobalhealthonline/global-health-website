import "server-only";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import type { SupportMessage } from "@/lib/api/support-chat-api";

/**
 * Server-side fetchers for the doctor portal. Each call forwards the
 * `gh_auth` cookie to the backend; the backend's `verifyDoctorAccess`
 * helper enforces role + doctorId scoping so a misrouted request can't
 * leak another doctor's data.
 */

/** Structured deny-reason payload a 403 from the medical-access guard carries
 *  in `details` (see backend/src/utils/guard-medical-read.ts
 *  `medicalAccessDeniedResponse`). `remedy` is server-authored English —
 *  doctor-portal UI should prefer looking up `reasonCode` against
 *  doctor.json's `medicalAccessDenied` keys and only fall back to `remedy`
 *  for an uncatalogued code, so the notice stays translatable. */
export type MedicalAccessDeniedDetails = {
  reasonCode: string;
  remedy: string;
  selfFixable: boolean;
  canRequestAccess: boolean;
};

type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number; deniedAccess?: MedicalAccessDeniedDetails };

function isMedicalAccessDeniedDetails(v: unknown): v is MedicalAccessDeniedDetails {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { reasonCode?: unknown }).reasonCode === "string" &&
    typeof (v as { canRequestAccess?: unknown }).canRequestAccess === "boolean"
  );
}

async function doctorRequest<T>(path: string): Promise<ApiResult<T>> {
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return { ok: false, message: "Backend is not configured" };
  try {
    const cookieHeader = (await cookies())
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const res = await fetch(`${apiUrl}${path}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: T;
      message?: string;
      details?: unknown;
    };
    if (!res.ok || !json.ok || json.data === undefined) {
      return {
        ok: false,
        status: res.status,
        message: json.message ?? "Doctor portal request failed",
        deniedAccess:
          res.status === 403 && isMedicalAccessDeniedDetails(json.details)
            ? json.details
            : undefined,
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
    profileImageFocalX?: number;
    profileImageFocalY?: number;
    profileImageZoom?: number;
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

export type DoctorPermissions = {
  doctorId: string;
  canCreateManualAppointments: boolean;
  canRequestCrossJurisdictionRx: boolean;
  /** True only when the master flag is on AND at least one market is granted —
   *  the backend ANDs the two, so this can be trusted to gate the nav entry
   *  without the caller also checking `directorCountries.length`. */
  isCountryDirector: boolean;
  directorCountries: Array<{ code: string; name: string }>;
};

export async function fetchDoctorPermissions() {
  return doctorRequest<DoctorPermissions>("/api/doctor/me/permissions");
}

export type CrossBorderRxInboxItem = {
  id: string;
  status: string;
  patientFullName: string;
  clinicalSummary: string;
  soap: {
    chiefComplaint: string | null;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
    noteFormat: "SOAP" | "FREEFORM";
    note: string | null;
  };
  asyncAppointmentId: string | null;
  sourceDoctorName: string | null;
  createdAt: string;
};

export async function fetchCrossBorderRxInbox() {
  return doctorRequest<{ items: CrossBorderRxInboxItem[] }>("/api/doctor/cross-border-rx");
}

/* ── Admin-approved profile fields ────────────────────────────────── */

/**
 * The doctor's name, qualifications, per-market bio + registration, and photo
 * are admin-locked: editing them raises a request that an admin approves, and
 * the live profile above is unchanged until they do. Mirrors the doctor-service
 * approval flow, except the pending value lives in its own row rather than on
 * the live one (a half-approved name still has to render somewhere).
 */
export type DoctorProfileChangeField =
  | "fullName"
  | "qualifications"
  | "bio"
  | "registration"
  | "photo";

export type DoctorProfileChangeStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

/** Shape of `proposedValue` / `previousValue`, keyed by `field`. */
export type DoctorProfileChangeValue =
  | { value: string }
  | { value: string[] }
  | { translations: Array<{ locale: string; bio: string | null }> }
  | {
      chamberEntity: string | null;
      registrationNumber: string | null;
      division: string | null;
    }
  | { removed: true }
  | {
      removed: false;
      path: string;
      storageKey: string | null;
      focalX: number;
      focalY: number;
      zoom: number;
    };

export type DoctorProfileChangeRequest = {
  id: string;
  doctorId: string;
  field: DoctorProfileChangeField;
  /** Null for the global fields (name, qualifications, photo). */
  countryId: string | null;
  status: DoctorProfileChangeStatus;
  proposedValue: DoctorProfileChangeValue;
  previousValue: DoctorProfileChangeValue | null;
  doctorNote: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** The latest request per (field, market) — pending means the field is locked. */
export async function fetchDoctorProfileChangeRequests() {
  return doctorRequest<{ items: DoctorProfileChangeRequest[] }>(
    "/api/doctor/profile/change-requests",
  );
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
  /** True end of the consultation (claimed slot's span, else service duration).
   *  Null when neither is known — the calendar falls back to its own default. */
  endAt: string | null;
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

/** Unread admin replies in the doctor's support thread — drives the Account
 *  nav badge. Returns 0 on any failure so a nav render never breaks. */
export async function fetchDoctorSupportUnread(): Promise<number> {
  const result = await doctorRequest<{ unreadCount: number }>("/api/doctor/support/unread");
  return result.ok && typeof result.data.unreadCount === "number" ? result.data.unreadCount : 0;
}

/** Server-side first paint of the support thread. The client component keeps it
 *  fresh by polling the same-origin proxy afterwards. */
export async function fetchDoctorSupportThread() {
  return doctorRequest<{ threadId: string; items: SupportMessage[] }>(
    "/api/doctor/support/thread",
  );
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
    /** Queue-wide tile counts, legacy imports excluded. Present only when the
     *  caller passes `includeSummary=true`; unaffected by the list filters. */
    summary?: { openConsults: number; notFinalized: number };
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
    /** Booked Service name (or OrderItem snapshot); falls back to the
     *  formatted consultationType for legacy rows with neither. Optional
     *  because a backend older than this build omits it — callers must
     *  fall back to `consultationType` or the cell renders empty. */
    consultationName?: string;
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
  // Patient Medical Files uploads (no appointment scope) surfaced as
  // "Uploaded document" so the patient upload flow stays in sync.
  patientUploads?: Array<{
    id: string;
    title: string;
    fileName: string;
    mimetype: string;
    byteSize: number;
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
  noteFormat: "SOAP" | "FREEFORM";
  note: string | null;
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
  /** Coarse paid/unpaid flag (no amounts) — drives the same booking-state
   *  wording the appointments list uses (see appointment-status-labels.ts). */
  paymentStatus: string;
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
  /** Patient's home address (PatientProfile, not the per-order shipping
   *  address). Already doctor-visible on the patient chart; repeated here so
   *  the consult card is self-sufficient. */
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  /** Brazil's UF (Estado). Null in every other market. */
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountryCode?: string | null;
  /** The PatientProfile's own date of birth, as distinct from `dateOfBirth`
   *  above, which is the booking-time snapshot. The card's editable row reads
   *  and writes this one, so a save can't look like it reverted. */
  profileDateOfBirth?: string | null;
  /** Número de Utente — the PT SNS number, needed for electronic prescription.
   *  Disclosed in every market (a number already on file is readable by the
   *  treating doctor regardless of whether that market's booking form asks
   *  for one); simply absent for patients who have none. */
  utenteNumber?: string | null;
  /** Fiscal number — PT's NIF, BR's CPF, elsewhere just a tax ID. One column,
   *  the label is the only market-specific part. Printed on PT/BR documents by
   *  `buildPatientIdLine`. */
  taxIdNumber?: string | null;
  /** National ID — PT's Cartão de Cidadão. Often absent: most booking forms
   *  don't ask for it. */
  nationalIdNumber?: string | null;
  /** Passport number. Collected by the manual-booking forms, so the treating
   *  doctor can already see and set it there. */
  passportNumber?: string | null;
  /** Patient's usual pharmacy from their profile (PatientProfile.
   *  preferredPharmacy). Distinct from `pharmacy`, which is the per-visit
   *  value captured on the appointment. */
  preferredPharmacy?: string | null;
  /** Which identity fields render as editable rows. Every market gets the full
   *  set today; still decided server-side (see patient-identity-fields.ts) so
   *  the rows can never offer more than was actually disclosed. */
  identityFields?: string[] | null;
  /** Cross-jurisdiction prescription only: the referring doctor's consultation
   *  record, as the patient consented to disclose it. Null on every ordinary
   *  appointment, and for any viewer who is not the prescribing doctor. */
  crossBorderSource?: {
    requestId: string;
    status: string;
    requestedAt: string;
    sourceDoctorName: string | null;
    clinicalSummary: string;
    soap: {
      chiefComplaint: string | null;
      subjective: string | null;
      objective: string | null;
      assessment: string | null;
      plan: string | null;
      noteFormat: "SOAP" | "FREEFORM";
      note: string | null;
    };
  } | null;
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
  /** Who actually produced the file. Normally the appointment's own doctor,
   *  but a cross-border disclosure is owned by the doctor who RECEIVED it, so
   *  this names the referring doctor instead. Optional — older cached payloads
   *  and other callers fall back to the workspace doctor's name. */
  uploadedBy?: string | null;
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
  // thread the doctor's UI language (their own saved selection) through.
  const locale = await getPortalLocale();
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
    countryCode: string | null;
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
  countryCode?: string;
  consultationType?: string;
  paymentStatus?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (query?.from) params.set("from", query.from);
  if (query?.to) params.set("to", query.to);
  if (query?.countryCode) params.set("countryCode", query.countryCode);
  if (query?.consultationType)
    params.set("consultationType", query.consultationType);
  if (query?.paymentStatus) params.set("paymentStatus", query.paymentStatus);
  if (query?.status) params.set("status", query.status);
  const qs = params.toString();
  return doctorRequest<DoctorReportsDto>(
    qs ? `/api/doctor/reports?${qs}` : "/api/doctor/reports",
  );
}

// Country-director consultation oversight. Unlike every other fetcher in this
// file, the rows are NOT this doctor's own — they cover every doctor in the
// markets an admin granted. Payload is deliberately narrow: patient name only
// (no email/phone), no clinical content, no money.
export type DoctorCountryConsultationsDto = {
  range: { from: string; to: string };
  filters: {
    countryCode: string | null;
    consultationType: string | null;
    status: string | null;
    paymentStatus: string | null;
    doctorId: string | null;
    search: string | null;
  };
  items: Array<{
    id: string;
    createdAt: string;
    scheduledAt: string | null;
    patientName: string;
    countryCode: string;
    consultationType: string;
    status: string;
    paymentStatus: string;
    doctorId: string | null;
    doctorName: string | null;
  }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  counts: {
    byStatus: Array<{ status: string; count: number }>;
    byPayment: Array<{ paymentStatus: string; count: number }>;
  };
  /** The granted markets — drives the country filter, so it stays populated
   *  even when the current range has no rows. */
  countries: Array<{ code: string; name: string }>;
  doctors: Array<{ id: string; fullName: string }>;
};

export async function fetchDoctorCountryConsultations(query?: {
  from?: string;
  to?: string;
  countryCode?: string;
  consultationType?: string;
  status?: string;
  paymentStatus?: string;
  doctorId?: string;
  search?: string;
  page?: string;
  pageSize?: string;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  const qs = params.toString();
  return doctorRequest<DoctorCountryConsultationsDto>(
    qs
      ? `/api/doctor/country-consultations?${qs}`
      : "/api/doctor/country-consultations",
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
  // ?locale=, so thread the doctor's UI language (their own saved selection).
  const locale = await getPortalLocale();
  const qs = locale ? `?locale=${encodeURIComponent(locale.toUpperCase())}` : "";
  return doctorRequest<DoctorServicesPayload>(`/api/doctor/services${qs}`);
}

/* ── Manual booking (walk-in / phone-in taken by the doctor) ───────── */

/**
 * A service this doctor may book a patient onto. Price fields are absent by
 * design: the doctor portal never renders what the patient is charged — the
 * backend mints the Stripe link at the published catalogue price.
 */
export type DoctorBookableService = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  durationMinutes: number | null;
  countryCode: string;
  countryName: string;
};

export type DoctorBookingClinic = {
  id: string;
  name: string;
  city: string | null;
  countryCode: string;
};

export type DoctorBookingOptions = {
  /** Admin-granted per-doctor permission (`Doctor.canCreateManualAppointments`).
   *  Gates the booking entry point; the backend re-checks it on POST. */
  canCreateManualAppointments: boolean;
  services: DoctorBookableService[];
  clinics: DoctorBookingClinic[];
};

export async function fetchDoctorBookingOptions() {
  return doctorRequest<DoctorBookingOptions>("/api/doctor/booking-options");
}
