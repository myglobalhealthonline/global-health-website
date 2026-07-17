import { cache } from "react";
import { adminRequest } from "./core";
import type { AdminServiceKind, AdminSpecialtyOptionDto } from "./services";

// ── DoctorCredential ─────────────────────────────────────────────────────────

export type AdminDoctorCredentialDto = {
  id: string;
  doctorId: string;
  countryCode: string | null;
  label: string;
  bodyName: string;
  bodyUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export async function fetchAdminDoctorCredentials(doctorId: string) {
  return adminRequest<{ credentials: AdminDoctorCredentialDto[] }>(
    `/api/admin/doctors/${doctorId}/credentials`,
  );
}

// ── Doctor payout bank details ───────────────────────────────────────────────

export type AdminDoctorBankDto = {
  accountHolder: string | null;
  bic: string | null;
  ibanLast4: string | null;
  ibanMasked: string | null;
  ibanSet: boolean;
  /** Full decrypted IBAN — only present when fetched with reveal=true (audited). */
  iban?: string | null;
};

/** Read a doctor's payout bank details. `reveal` returns the full IBAN and is
 *  audited server-side (DOCTOR_BANK_VIEWED) — use only when processing a payout. */
export async function fetchAdminDoctorBank(doctorId: string, reveal = false) {
  const qs = reveal ? "?reveal=1" : "";
  return adminRequest<{ bank: AdminDoctorBankDto }>(
    `/api/admin/doctors/${doctorId}/bank${qs}`,
  );
}

export type AdminDoctorMarketTranslationDto = {
  id: string;
  locale: string;
  title: string | null;
  bio: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
};

export type AdminDoctorMarketDto = {
  id: string;
  doctorId: string;
  countryId: string;
  active: boolean;
  sortOrder: number;
  country: { id: string; code: string; name: string; slug: string; defaultLocale: string };
  supportedLocales: Array<{ code: string; isDefault: boolean }>;
  chamberEntity: string | null;
  registrationNumber: string | null;
  registrationUrl: string | null;
  division: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  translations: AdminDoctorMarketTranslationDto[];
  bank: AdminDoctorBankDto;
  createdAt: string;
};

export type AdminDoctorFaqDto = {
  id: string;
  locale: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type AdminDoctorFaqsDto = {
  doctorId: string;
  defaultLocale: string;
  supportedLocales: Array<{ code: string; isDefault: boolean }>;
  faqs: AdminDoctorFaqDto[];
};

export const fetchAdminDoctorFaqs = cache(async (doctorId: string) => {
  return adminRequest<AdminDoctorFaqsDto>(`/api/admin/doctors/${doctorId}/faqs`);
});

export async function putAdminDoctorFaqs(
  doctorId: string,
  faqs: Array<{
    locale: string;
    question: string;
    answer: string;
    category: string | null;
    sortOrder: number;
    isActive: boolean;
  }>,
) {
  return adminRequest<{ faqs: AdminDoctorFaqDto[] }>(
    `/api/admin/doctors/${doctorId}/faqs`,
    { method: "PUT", body: { faqs } },
  );
}

export const fetchAdminDoctorMarkets = cache(async (doctorId: string) => {
  return adminRequest<{
    doctorId: string;
    primaryCountryId: string;
    markets: AdminDoctorMarketDto[];
  }>(`/api/admin/doctors/${doctorId}/markets`);
});

export async function patchAdminDoctorMarket(
  doctorId: string,
  countryId: string,
  body: unknown,
) {
  return adminRequest<{ market: AdminDoctorMarketDto }>(
    `/api/admin/doctors/${doctorId}/markets/${countryId}`,
    { method: "PATCH", body },
  );
}

export async function fetchAdminDoctorMarketBank(
  doctorId: string,
  countryId: string,
  reveal = false,
) {
  const qs = reveal ? "?reveal=1" : "";
  return adminRequest<{ bank: AdminDoctorBankDto }>(
    `/api/admin/doctors/${doctorId}/markets/${countryId}/bank${qs}`,
  );
}

export async function createAdminDoctorCredential(doctorId: string, body: unknown) {
  return adminRequest<{ credential: AdminDoctorCredentialDto }>(
    `/api/admin/doctors/${doctorId}/credentials`,
    { method: "POST", body },
  );
}

export async function updateAdminDoctorCredential(doctorId: string, credentialId: string, body: unknown) {
  return adminRequest<{ credential: AdminDoctorCredentialDto }>(
    `/api/admin/doctors/${doctorId}/credentials/${credentialId}`,
    { method: "PATCH", body },
  );
}

export async function deleteAdminDoctorCredential(doctorId: string, credentialId: string) {
  return adminRequest<{ deleted: boolean }>(
    `/api/admin/doctors/${doctorId}/credentials/${credentialId}`,
    { method: "DELETE" },
  );
}

export type AdminDoctorSpecialtyLinkDto = {
  id: string;
  doctorId: string;
  specialtyId: string;
  specialty: AdminSpecialtyOptionDto;
};

export type AdminDoctorAssetDto = {
  id: string;
  kind: string;
  key: string;
  path: string;
  altText: string | null;
  title: string | null;
  caption: string | null;
  description: string | null;
  focalX: number;
  focalY: number;
  zoom: number;
};

export type AdminDoctorTranslationDto = {
  id: string;
  locale: string;
  title: string;
  bio: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type AdminDoctorDto = {
  id: string;
  countryId: string;
  slug: string;
  fullName: string;
  title: string;
  bio: string | null;
  /** Per-locale CMS content for the translation tabs. */
  translations: AdminDoctorTranslationDto[];
  imcRegistration: string | null;
  medicalRegistrationUrl: string | null;
  qualifications: string[];
  whatsappNumber: string | null;
  languages: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; name: string; slug: string; defaultLocale: string };
  /** Extra country listings beyond the primary one above. Empty array
   *  means the doctor is only listed in their primary country. */
  additionalCountries: Array<{
    id: string;
    countryId: string;
    active: boolean;
    sortOrder: number;
    country: { id: string; code: string; name: string; slug: string; defaultLocale: string };
  }>;
  specialties: AdminDoctorSpecialtyLinkDto[];
  /** Active service assignments — used for consultation-type column and
   *  manual-booking doctor filter. serviceId enables client-side narrowing. */
  assignedServices: Array<{
    serviceId: string;
    service: { kind: AdminServiceKind };
  }>;
  assets: AdminDoctorAssetDto[];
  /** Linked login user. Null when no account exists yet. */
  loginUser: {
    id: string;
    email: string;
    fullName: string;
    emailVerifiedAt: string | null;
    isActive: boolean;
    createdAt: string;
  } | null;
  /** When true the doctor's own portal can create manual appointments.
   *  Default false — admin grants per doctor. ADMIN role always bypasses. */
  canCreateManualAppointments?: boolean;
};

export type AdminDoctorRegistrationDto = {
  id: string;
  doctorId: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  chamberEntity: string | null;
  registrationNumber: string | null;
  division: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  active: boolean;
};

type AdminDoctorsListPayload = {
  items: AdminDoctorDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminDoctorDetailPayload = {
  doctor: AdminDoctorDto;
  /** Populated by PATCH when the primary country changed — lets the caller
   *  invalidate caches for the OLD country code in addition to the new one. */
  countryChange?: {
    fromCountryId: string;
    fromCountryCode: string | null;
    toCountryId: string;
    toCountryCode: string | null;
  } | null;
};

/** Canonical public profile URL for a doctor. The new public route shape
 *  is `/{countrySlug}/{lang}/doctors/{doctorSlug}`. Caller supplies the
 *  country (with its admin-edited `slug` + `defaultLocale`) and the doctor
 *  slug — we build the URL from those alone, ignoring the legacy
 *  `teamPath` field that pointed at Wix-era redirect targets. */
export function doctorPublicProfilePath(
  country: { slug: string; defaultLocale: string },
  doctorSlug: string,
): string {
  const lang = (country.defaultLocale ?? "EN").toLowerCase();
  return `/${country.slug}/${lang}/doctors/${doctorSlug}`;
}

export async function fetchAdminDoctors(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/doctors?${qs}` : "/api/admin/doctors";
  return adminRequest<AdminDoctorsListPayload>(path);
}

export const fetchAdminDoctorById = cache(async (id: string) => {
  return adminRequest<AdminDoctorDetailPayload>(`/api/admin/doctors/${id}`);
});

export type AdminPendingServiceRequest = {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSlug: string;
  serviceId: string;
  serviceName: string;
  serviceKind: string;
  countryCode: string;
  countryName: string;
  createdAt: string;
};

type AdminPendingServiceRequestsPayload = {
  count: number;
  items: AdminPendingServiceRequest[];
};

/** Pending doctor-initiated service requests awaiting admin approval. */
export async function fetchAdminPendingServiceRequests(
  query?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs
    ? `/api/admin/doctor-service-requests?${qs}`
    : "/api/admin/doctor-service-requests";
  return adminRequest<AdminPendingServiceRequestsPayload>(path);
}

/* ── Doctor profile change requests ───────────────────────────────── */

export type AdminDoctorProfileChangeField =
  | "fullName"
  | "qualifications"
  | "bio"
  | "registration"
  | "photo";

export type AdminDoctorProfileChangeStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

/** Shape of `proposedValue` / `previousValue`, keyed by `field`. */
export type AdminDoctorProfileChangeValue =
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

export type AdminDoctorProfileChangeRequest = {
  id: string;
  doctorId: string;
  field: AdminDoctorProfileChangeField;
  countryId: string | null;
  status: AdminDoctorProfileChangeStatus;
  proposedValue: AdminDoctorProfileChangeValue;
  previousValue: AdminDoctorProfileChangeValue | null;
  doctorNote: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  doctorName: string;
  doctorSlug: string;
  countryCode: string;
  countryName: string;
  isGlobal: boolean;
};

/** Pending doctor-initiated profile edits awaiting admin approval. */
export async function fetchAdminPendingProfileChangeRequests(
  query?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
  }
  const qs = params.toString();
  return adminRequest<{ count: number; items: AdminDoctorProfileChangeRequest[] }>(
    qs
      ? `/api/admin/doctor-profile-change-requests?${qs}`
      : "/api/admin/doctor-profile-change-requests",
  );
}

export async function fetchAdminDoctorProfileChangeRequests(doctorId: string) {
  return adminRequest<{ items: AdminDoctorProfileChangeRequest[] }>(
    `/api/admin/doctors/${doctorId}/profile-change-requests`,
  );
}

/**
 * Approve (applying the proposal to the live profile) or reject one request.
 * `markVerified` only means anything for a `registration` change — it is the
 * admin confirming they have sighted the documentation.
 */
export async function reviewDoctorProfileChangeRequest(
  doctorId: string,
  requestId: string,
  body: {
    status: "approved" | "rejected";
    reviewNote?: string | null;
    markVerified?: boolean;
  },
) {
  return adminRequest<{
    request: AdminDoctorProfileChangeRequest;
    cache: {
      countryCode: string;
      slug: string;
      additionalCountryCodes: string[];
    } | null;
  }>(`/api/admin/doctors/${doctorId}/profile-change-requests/${requestId}`, {
    method: "PATCH",
    body,
  });
}

export async function postAdminDoctor(body: unknown) {
  return adminRequest<AdminDoctorDetailPayload>("/api/admin/doctors", {
    method: "POST",
    body,
  });
}

export async function patchAdminDoctor(id: string, body: unknown) {
  return adminRequest<AdminDoctorDetailPayload>(`/api/admin/doctors/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminDoctor(id: string) {
  return adminRequest<AdminDoctorDetailPayload>(`/api/admin/doctors/${id}`, {
    method: "DELETE",
  });
}

/** Returns all country codes where this doctor is the Clinical Director. */
export async function fetchAdminDoctorFeatured(id: string) {
  return adminRequest<{ featuredCountries: string[] }>(
    `/api/admin/doctors/${id}/featured`,
  );
}

/** Set/clear Clinical Director for a specific country the doctor belongs to.
 *  countryCode defaults to the doctor's primary country when omitted. */
export async function setAdminDoctorFeatured(
  id: string,
  featured: boolean,
  countryCode?: string,
) {
  return adminRequest<{ featured: boolean; countryCode: string }>(
    `/api/admin/doctors/${id}/featured`,
    { method: "PUT", body: { featured, ...(countryCode ? { countryCode } : {}) } },
  );
}

/** Mint or refresh a doctor portal invite. Idempotent — second call for
 *  the same doctor "resends" with a new token. */
export type AdminDoctorInvitePayload = {
  user: {
    id: string;
    email: string;
    fullName: string;
    emailVerifiedAt: string | null;
  };
  resend: boolean;
  emailed: boolean;
};

export async function postAdminDoctorInvite(
  doctorId: string,
  body: { email: string; fullName?: string },
) {
  return adminRequest<AdminDoctorInvitePayload>(
    `/api/admin/doctors/${doctorId}/invite`,
    { method: "POST", body },
  );
}

export const fetchAdminDoctorRegistrations = cache(async (doctorId: string) => {
  return adminRequest<{ registrations: AdminDoctorRegistrationDto[] }>(
    `/api/admin/doctors/${doctorId}/registrations`,
  );
});

export async function patchAdminDoctorRegistration(
  doctorId: string,
  countryId: string,
  body: {
    chamberEntity?: string | null;
    registrationNumber?: string | null;
    division?: string | null;
    isVerified?: boolean;
  },
) {
  return adminRequest<{ registration: AdminDoctorRegistrationDto }>(
    `/api/admin/doctors/${doctorId}/registrations/${countryId}`,
    { method: "PATCH", body },
  );
}

/** Doctor availability windows (recurring weekly slots). */
export type AdminAvailabilityRow = {
  id: string;
  weekday: number; // 0 = Sun … 6 = Sat
  startMinute: number;
  endMinute: number;
  slotDurationMinutes: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  isActive: boolean;
};

export async function fetchAdminDoctorAvailability(id: string) {
  return adminRequest<{ items: AdminAvailabilityRow[] }>(
    `/api/admin/doctors/${id}/availability`,
  );
}

export async function postAdminDoctorAvailability(
  id: string,
  body: {
    weekday: number;
    startMinute: number;
    endMinute: number;
    slotDurationMinutes?: number;
    effectiveFrom?: string | null;
    effectiveUntil?: string | null;
  },
) {
  return adminRequest<{ availability: AdminAvailabilityRow }>(
    `/api/admin/doctors/${id}/availability`,
    { method: "POST", body },
  );
}

export async function patchAdminDoctorAvailability(
  id: string,
  availabilityId: string,
  body: Partial<AdminAvailabilityRow>,
) {
  return adminRequest<{ availability: AdminAvailabilityRow }>(
    `/api/admin/doctors/${id}/availability/${availabilityId}`,
    { method: "PATCH", body },
  );
}

export async function deleteAdminDoctorAvailability(
  id: string,
  availabilityId: string,
) {
  return adminRequest<{ deleted: boolean }>(
    `/api/admin/doctors/${id}/availability/${availabilityId}`,
    { method: "DELETE" },
  );
}

export type AdminDoctorServiceAssignmentDto = {
  id: string;
  serviceId: string;
  doctorId: string;
  status: "pending" | "active" | "rejected" | "disabled";
  selectedBy: "admin" | "doctor";
  isActive: boolean;
  sortOrder: number;
  /** Admin-set payout for this doctor+service, in cents. Null = not set. */
  doctorAmountCents: number | null;
  createdAt: string;
  updatedAt: string;
  service: {
    id: string;
    slug: string;
    name: string;
    kind: AdminServiceKind;
    durationMinutes: number | null;
    basePriceCents: number | null;
    currencyCode: string | null;
    isActive: boolean;
  };
};

export async function fetchAdminDoctorServices(doctorId: string) {
  return adminRequest<{ items: AdminDoctorServiceAssignmentDto[] }>(
    `/api/admin/doctors/${doctorId}/services`,
  );
}

export async function adminAssignServiceToDoctor(
  doctorId: string,
  serviceId: string,
  doctorAmountCents?: number | null,
) {
  return adminRequest<{ assignment: AdminDoctorServiceAssignmentDto }>(
    `/api/admin/doctors/${doctorId}/services`,
    {
      method: "POST",
      body: {
        serviceId,
        ...(doctorAmountCents !== undefined ? { doctorAmountCents } : {}),
      },
    },
  );
}

export async function approveRejectDoctorService(
  doctorId: string,
  serviceDoctorId: string,
  status: "pending" | "active" | "rejected" | "disabled",
) {
  return adminRequest<{ assignment: AdminDoctorServiceAssignmentDto }>(
    `/api/admin/doctors/${doctorId}/services/${serviceDoctorId}`,
    { method: "PATCH", body: { status } },
  );
}

/** Update only the admin-set doctor payout for an assignment (cents, or null to clear). */
export async function updateDoctorServicePayout(
  doctorId: string,
  serviceDoctorId: string,
  doctorAmountCents: number | null,
) {
  return adminRequest<{ assignment: AdminDoctorServiceAssignmentDto }>(
    `/api/admin/doctors/${doctorId}/services/${serviceDoctorId}`,
    { method: "PATCH", body: { doctorAmountCents } },
  );
}

export async function adminRemoveDoctorService(
  doctorId: string,
  serviceDoctorId: string,
) {
  return adminRequest<Record<string, never>>(
    `/api/admin/doctors/${doctorId}/services/${serviceDoctorId}`,
    { method: "DELETE" },
  );
}

export type DoctorDeleteBlockers = {
  consultations: number;
  prescriptions: number;
  examResults: number;
  generatedDocuments: number;
  appointmentDocuments: number;
  medicalNotes: number;
};

export type DoctorDeleteImpact = {
  futureAppointments: number;
  pastAppointments: number;
  blockers: DoctorDeleteBlockers;
  /** True when retained medical records exist — the purge cannot proceed. */
  blocked: boolean;
};

/** What a hard delete would touch. Drives the confirm dialog's copy. */
export async function getAdminDoctorDeleteImpact(id: string) {
  return adminRequest<DoctorDeleteImpact>(`/api/admin/doctors/${id}/delete-impact`);
}

/**
 * Hard-delete a doctor. Pass `force` only after the admin has confirmed the
 * future-appointment warning — the backend rejects an unforced purge when
 * future appointments exist, and rejects it outright when medical records do.
 */
export async function purgeAdminDoctor(id: string, options?: { force?: boolean }) {
  const query = options?.force ? "?force=true" : "";
  return adminRequest<{ unassignedAppointments: number }>(
    `/api/admin/doctors/${id}/purge${query}`,
    { method: "DELETE" },
  );
}
