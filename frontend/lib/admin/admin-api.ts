import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";

const DEFAULT_ADMIN_API_BASE_URL = "http://localhost:4000";

function getAdminApiBaseUrl() {
  return (
    process.env.ADMIN_API_BASE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    DEFAULT_ADMIN_API_BASE_URL
  );
}

function getAdminApiToken() {
  return process.env.ADMIN_API_TOKEN ?? "";
}

function isAdminTokenFallbackEnabled() {
  const raw = process.env.ADMIN_TOKEN_FALLBACK_ENABLED;
  // Default ON only in local development — matches the backend rule in
  // backend/src/config/env.ts. Staging/preview (NODE_ENV !== "development")
  // must opt in explicitly so the Bearer-token admin bypass never ships
  // silently to an internet-reachable non-prod environment.
  if (raw === undefined) return process.env.NODE_ENV === "development";
  return raw === "true";
}

type AdminApiResponse<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

type AdminErrorDetails = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

function formatAdminErrorMessage(message: string | undefined, details: unknown) {
  const fallback = message ?? "Admin request failed";
  if (!details || typeof details !== "object") return fallback;

  const typed = details as AdminErrorDetails;
  const formError = typed.formErrors?.find(Boolean);
  if (formError) {
    return `${fallback}: ${formError}`;
  }

  const fieldEntry = Object.entries(typed.fieldErrors ?? {}).find(([, errors]) => Array.isArray(errors) && errors.length > 0);
  if (!fieldEntry) return fallback;

  const [field, errors] = fieldEntry;
  return `${fallback}: ${field} ${errors![0]}`;
}

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

export type AdminClinicDto = {
  id: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  name: string;
  slug: string;
  city: string | null;
  active: boolean;
};

export type AdminCurrencyDto = {
  id: string;
  code: string;
  symbol: string;
  decimals: number;
};

export type AdminCountryLocaleDto = {
  id: string;
  locale: string;
  isDefault: boolean;
};

export type AdminCountryDomainDto = {
  id: string;
  domain: string;
  isPrimary: boolean;
};

export type AdminBookingSettingDto = {
  id: string;
  countryId: string;
  bookingEnabled: boolean;
  requirePhone: boolean;
  requireDateOfBirth: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminCountryDto = {
  id: string;
  code: string;
  name: string;
  slug: string;
  legacyHomePath: string;
  teamPath: string;
  generalConsultationPath: string;
  specialistConsultationPath: string;
  defaultLocale: string;
  currencyId: string;
  isActive: boolean;
  /** Country-scoped sidebar feature toggles. Each entry is a slug from
   *  the admin nav (`country-home`, `services`, `health-tests`, …). When
   *  absent (older row), treat as "all enabled" for backward-compat. */
  enabledFeatures?: string[];
  createdAt: string;
  updatedAt: string;
  currency: AdminCurrencyDto;
  countryLocales: AdminCountryLocaleDto[];
  domains: AdminCountryDomainDto[];
  /** Per-country booking-intake settings. `null` if no row yet — admin
   *  upserts on first edit; schema defaults apply otherwise. */
  bookingSetting: AdminBookingSettingDto | null;
};

/** Canonical list of country-scoped sidebar features. Stays in lockstep
 *  with backend `COUNTRY_FEATURE_KEYS`. */
export const COUNTRY_FEATURE_KEYS = [
  "country-home",
  "country-content",
  "pages",
  "footer",
  "services",
  "general-consultations",
  "specialist-consultations",
  "online-prescriptions",
  "health-tests",
  "appointments",
] as const;
export type CountryFeatureKey = (typeof COUNTRY_FEATURE_KEYS)[number];

type AdminCountriesListPayload = {
  countries: AdminCountryDto[];
};

type AdminCountryDetailPayload = {
  country: AdminCountryDto;
};

type AdminCurrenciesListPayload = {
  currencies: AdminCurrencyDto[];
};

// RFC 6265 token rule for cookie names: no control chars, separators, or
// whitespace. Earlier we shipped a bug that briefly stored a stub function
// body as a cookie name (whitespace + braces). If that cookie is still in a
// user's browser, forwarding it via the `Cookie` header corrupts the request
// and the backend rejects it. We filter defensively so the bad cookie can't
// poison any future admin save.
const VALID_COOKIE_NAME = /^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/;

async function adminRequest<T>(
  path: string,
  init?: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
  },
): Promise<AdminApiResponse<T>> {
  const allCookies = (await cookies()).getAll();
  const validCookies = allCookies.filter((entry) => VALID_COOKIE_NAME.test(entry.name));
  if (validCookies.length !== allCookies.length && process.env.NODE_ENV !== "production") {
    // Dev-only diagnostic — this is a stale-localhost-cookie hint, not a
    // production concern, so don't spam prod logs on every request.
    const dropped = allCookies
      .filter((entry) => !VALID_COOKIE_NAME.test(entry.name))
      .map((entry) => entry.name.slice(0, 40));

    console.warn(
      `[admin-api] Dropped ${dropped.length} malformed cookie(s) before forwarding to backend. ` +
        "Clear localhost cookies in DevTools to remove them from your browser.",
    );
  }
  const cookieHeader = validCookies
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
  const token = getAdminApiToken();
  const tokenFallbackEnabled = isAdminTokenFallbackEnabled();

  try {
    const headers: Record<string, string> = {};
    if (init?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }
    if (!cookieHeader && tokenFallbackEnabled && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

    const json = (await response.json()) as {
      ok?: boolean;
      message?: string;
      data?: T;
      details?: unknown;
    };

    if (!response.ok || !json.ok) {
      return {
        ok: false,
        message: formatAdminErrorMessage(json.message, json.details),
        status: response.status,
      };
    }

    return {
      ok: true,
      data: json.data as T,
      message: json.message,
    };
  } catch {
    return { ok: false, message: "Admin backend is unavailable" };
  }
}

export async function adminUploadFile(
  file: File,
): Promise<AdminApiResponse<{ key: string; publicUrl: string }>> {
  const allCookies = (await cookies()).getAll();
  const validCookies = allCookies.filter((entry) => VALID_COOKIE_NAME.test(entry.name));
  const cookieHeader = validCookies.map((e) => `${e.name}=${e.value}`).join("; ");
  const token = getAdminApiToken();
  const tokenFallbackEnabled = isAdminTokenFallbackEnabled();

  const body = new FormData();
  body.append("file", file);

  try {
    const headers: Record<string, string> = {};
    if (cookieHeader) headers.cookie = cookieHeader;
    if (!cookieHeader && tokenFallbackEnabled && token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${getAdminApiBaseUrl()}/api/admin/media/upload`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    const json = (await response.json()) as { ok?: boolean; message?: string; data?: { key: string; publicUrl: string } };
    if (!response.ok || !json.ok) {
      return { ok: false, message: json.message ?? "Upload failed", status: response.status };
    }
    return { ok: true, data: json.data as { key: string; publicUrl: string }, message: json.message };
  } catch {
    return { ok: false, message: "Admin backend is unavailable" };
  }
}

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
  doctorId?: string | null;
  scheduledAt?: string | null;
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

export const fetchAdminClinicsByCountryCode = cache(async (countryCode: string) => {
  const code = countryCode.trim().toUpperCase();
  const path = code
    ? `/api/admin/clinics?countryCode=${encodeURIComponent(code)}`
    : "/api/admin/clinics";
  return adminRequest<{ clinics: AdminClinicDto[] }>(path);
});

// `cache()` deduplicates identical reads within a single SSR request.
// Many admin pages call `fetchAdminCountries()` (layout + page + ScopeBanner
// resolver), and previously each triggered a fresh round-trip to the backend.
// The wrapper collapses them to one fetch per request.
export const fetchAdminCountries = cache(async () => {
  return adminRequest<AdminCountriesListPayload>("/api/admin/countries");
});

export const fetchAdminCountryById = cache(async (id: string) => {
  return adminRequest<AdminCountryDetailPayload>(`/api/admin/countries/${id}`);
});

export const fetchAdminCurrencies = cache(async () => {
  return adminRequest<AdminCurrenciesListPayload>("/api/admin/currencies");
});

export async function postAdminCountry(body: unknown) {
  return adminRequest<AdminCountryDetailPayload>("/api/admin/countries", {
    method: "POST",
    body,
  });
}

export async function patchAdminCountry(id: string, body: unknown) {
  return adminRequest<AdminCountryDetailPayload>(`/api/admin/countries/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminCountry(id: string) {
  return adminRequest<AdminCountryDetailPayload>(`/api/admin/countries/${id}`, {
    method: "DELETE",
  });
}

export async function purgeAdminCountry(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/countries/${id}/purge`, {
    method: "DELETE",
  });
}

// ── CountryLegalProfile ──────────────────────────────────────────────────────

export type CountryLegalProfileDto = {
  id: string;
  countryId: string;
  legalCompanyName: string | null;
  legalAddress: string | null;
  publicPhones: string[];
  publicEmails: string[];
  supportEmail: string | null;
  billingEmail: string | null;
  companyRegistrationNumber: string | null;
  taxVatNumber: string | null;
  medicalRegistrationNumber: string | null;
  healthcareLicenseDetails: string | null;
  regulatorName: string | null;
  regulatorWebsite: string | null;
  providerRegistrationLabel: string | null;
  providerRegistrationNumber: string | null;
  providerRegistrationUrl: string | null;
  emergencyNumber: string | null;
  emergencyNotice: string | null;
  nonEmergencyHealthLine: string | null;
  companyRegistryUrl: string | null;
  medicalRegulatorUrl: string | null;
  healthcareAuthorityUrl: string | null;
  dataProtectionAuthorityUrl: string | null;
  disputeResolutionUrl: string | null;
  consumerProtectionUrl: string | null;
  dataProtectionLawName: string | null;
  dataProtectionPolicyTitle: string | null;
  dpoName: string | null;
  dpoEmail: string | null;
  disputeBodyName: string | null;
  disputeEmail: string | null;
  disputePhone: string | null;
  disputeProcessText: string | null;
  legalJurisdictionText: string | null;
  consumerRightsText: string | null;
};

export async function fetchAdminCountryLegalProfile(countryId: string) {
  return adminRequest<{ legalProfile: CountryLegalProfileDto | null }>(
    `/api/admin/countries/${countryId}/legal`,
  );
}

export async function putAdminCountryLegalProfile(countryId: string, body: unknown) {
  return adminRequest<{ legalProfile: CountryLegalProfileDto }>(
    `/api/admin/countries/${countryId}/legal`,
    { method: "PUT", body },
  );
}

// ── CountryAuthorityLink ─────────────────────────────────────────────────────

export type AdminAuthorityLinkDto = {
  id: string;
  countryId: string;
  name: string;
  abbreviation: string | null;
  url: string;
  category: string;
  description: string | null;
  showInFooter: boolean;
  showInSchema: boolean;
  sortOrder: number;
  isActive: boolean;
};

export async function fetchAdminAuthorityLinks(countryId: string) {
  return adminRequest<{ authorityLinks: AdminAuthorityLinkDto[] }>(
    `/api/admin/countries/${countryId}/authority-links`,
  );
}

export async function createAdminAuthorityLink(countryId: string, body: unknown) {
  return adminRequest<{ authorityLink: AdminAuthorityLinkDto }>(
    `/api/admin/countries/${countryId}/authority-links`,
    { method: "POST", body },
  );
}

export async function updateAdminAuthorityLink(countryId: string, linkId: string, body: unknown) {
  return adminRequest<{ authorityLink: AdminAuthorityLinkDto }>(
    `/api/admin/countries/${countryId}/authority-links/${linkId}`,
    { method: "PATCH", body },
  );
}

export async function deleteAdminAuthorityLink(countryId: string, linkId: string) {
  return adminRequest<{ deleted: boolean }>(
    `/api/admin/countries/${countryId}/authority-links/${linkId}`,
    { method: "DELETE" },
  );
}

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

// ── Partners (per-country "Our partners" marquee) ───────────────────────────

export type AdminPartnerDto = {
  id: string;
  countryId: string;
  name: string;
  websiteUrl: string | null;
  logoPath: string | null;
  sortOrder: number;
  active: boolean;
};

export async function fetchAdminPartners(countryId: string) {
  return adminRequest<{ partners: AdminPartnerDto[] }>(
    `/api/admin/partners?countryId=${encodeURIComponent(countryId)}`,
  );
}

export async function createAdminPartner(body: unknown) {
  return adminRequest<{ partner: AdminPartnerDto }>(`/api/admin/partners`, {
    method: "POST",
    body,
  });
}

export async function updateAdminPartner(id: string, body: unknown) {
  return adminRequest<{ partner: AdminPartnerDto }>(`/api/admin/partners/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminPartner(id: string) {
  return adminRequest<{ deleted: boolean }>(`/api/admin/partners/${id}`, {
    method: "DELETE",
  });
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

// ── CountryLegalDocument ─────────────────────────────────────────────────────

export type LegalDocumentType =
  | "TERMS_OF_SERVICE"
  | "PRIVACY_POLICY"
  | "COOKIE_POLICY"
  | "GDPR_NOTICE"
  | "DATA_PROCESSING_AGREEMENT"
  | "REFUND_POLICY"
  | "MEDICAL_DISCLAIMER"
  | "ACCESSIBILITY_STATEMENT";

export type CountryLegalDocumentDto = {
  id: string;
  countryId: string;
  type: LegalDocumentType;
  title: string;
  content: string | null;
  pdfPath: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  locale: string;
  version: number;
};

export async function fetchAdminCountryLegalDocuments(countryId: string) {
  return adminRequest<{ documents: CountryLegalDocumentDto[] }>(
    `/api/admin/countries/${countryId}/legal-documents`,
  );
}

export async function putAdminCountryLegalDocument(countryId: string, body: unknown) {
  return adminRequest<{ document: CountryLegalDocumentDto }>(
    `/api/admin/countries/${countryId}/legal-documents`,
    { method: "PUT", body },
  );
}

export async function deleteAdminCountryLegalDocument(countryId: string, docId: string) {
  return adminRequest<Record<string, never>>(
    `/api/admin/countries/${countryId}/legal-documents/${docId}`,
    { method: "DELETE" },
  );
}

export type AdminSpecialtyTranslationDto = {
  id: string;
  locale: string;
  name: string;
  cardSummary: string | null;
};

export type AdminSpecialtyOptionDto = {
  id: string;
  countryId: string;
  slug: string;
  name: string;
  cardSummary: string | null;
  cardThemeColor: string | null;
  sortOrder: number;
  primaryServiceId: string | null;
  active: boolean;
  /** Per-locale CMS content for the translation tabs. */
  translations: AdminSpecialtyTranslationDto[];
  createdAt: string;
  updatedAt: string;
  primaryService: {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
  } | null;
  assets: Array<{
    id: string;
    kind: string;
    key: string;
    path: string;
    altText: string | null;
    usageNote: string | null;
  }>;
};

export type AdminServiceKind =
  | "GENERAL"
  | "SPECIALIST"
  | "PRESCRIPTION"
  | "HEALTH_TEST"
  | "HOME_DELIVERY";

export type AdminServiceTranslationDto = {
  id: string;
  locale: string;
  name: string;
  summary: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  ctaLabel: string | null;
};

export type AdminServiceDto = {
  id: string;
  countryId: string;
  specialtyId: string | null;
  kind: AdminServiceKind;
  slug: string;
  name: string;
  summary: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  ctaLabel: string | null;
  legacyPath: string | null;
  sortOrder: number;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  isActive: boolean;
  /** Per-locale CMS content for the translation tabs. The default-locale
   *  row mirrors the base display columns above; absent rows fall back to
   *  base at read time. */
  translations: AdminServiceTranslationDto[];
  /** Shipping fee charged per item at checkout (cents). 0 = no
   *  shipping line (the default — online consultations don't ship). */
  shippingCents: number;
  /** Additional product images. Hero image lives on `assets[0]`. */
  galleryImagePaths: string[];
  /** Doctor join rows for the admin assignment multi-select. Empty
   *  array means no doctors are bookable for this service yet. */
  assignedDoctors: Array<{
    id: string;
    serviceId: string;
    doctorId: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    doctor: {
      id: string;
      slug: string;
      fullName: string;
      countryId: string;
      active: boolean;
    };
  }>;
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; name: string };
  specialty: {
    id: string;
    countryId: string;
    slug: string;
    name: string;
    cardSummary: string | null;
    cardThemeColor: string | null;
    sortOrder: number;
    primaryServiceId: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  assets: Array<{
    id: string;
    kind: string;
    key: string;
    path: string;
    altText: string | null;
    usageNote: string | null;
  }>;
};

type AdminServicesListPayload = {
  items: AdminServiceDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminServiceDetailPayload = {
  service: AdminServiceDto;
};

type AdminSpecialtiesPayload = {
  specialties: AdminSpecialtyOptionDto[];
};

export async function fetchAdminServices(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/services?${qs}` : "/api/admin/services";
  return adminRequest<AdminServicesListPayload>(path);
}

export const fetchAdminServiceById = cache(async (id: string) => {
  return adminRequest<AdminServiceDetailPayload>(`/api/admin/services/${id}`);
});

export const fetchAdminSpecialties = cache(async (countryId: string) => {
  const params = new URLSearchParams({ countryId });
  return adminRequest<AdminSpecialtiesPayload>(`/api/admin/specialties?${params.toString()}`);
});

export const fetchAdminSpecialtyById = cache(async (id: string) => {
  return adminRequest<AdminSpecialtyDetailPayload>(`/api/admin/specialties/${id}`);
});

type AdminSpecialtyDetailPayload = {
  specialty: AdminSpecialtyOptionDto;
};

export async function postAdminSpecialty(body: unknown) {
  return adminRequest<AdminSpecialtyDetailPayload>("/api/admin/specialties", {
    method: "POST",
    body,
  });
}

export async function patchAdminSpecialty(id: string, body: unknown) {
  return adminRequest<AdminSpecialtyDetailPayload>(`/api/admin/specialties/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminSpecialty(id: string) {
  return adminRequest<AdminSpecialtyDetailPayload>(`/api/admin/specialties/${id}`, {
    method: "DELETE",
  });
}

export async function purgeAdminSpecialty(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/specialties/${id}/purge`, {
    method: "DELETE",
  });
}

export async function patchAdminServicesReorder(
  items: Array<{ id: string; sortOrder: number }>,
) {
  return adminRequest<Record<string, never>>("/api/admin/services/reorder", {
    method: "PATCH",
    body: { items },
  });
}

export async function patchAdminSpecialtiesReorder(
  items: Array<{ id: string; sortOrder: number }>,
) {
  return adminRequest<Record<string, never>>("/api/admin/specialties/reorder", {
    method: "PATCH",
    body: { items },
  });
}

export async function postAdminService(body: unknown) {
  return adminRequest<AdminServiceDetailPayload>("/api/admin/services", {
    method: "POST",
    body,
  });
}

export async function patchAdminService(id: string, body: unknown) {
  return adminRequest<AdminServiceDetailPayload>(`/api/admin/services/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminService(id: string) {
  return adminRequest<AdminServiceDetailPayload>(`/api/admin/services/${id}`, {
    method: "DELETE",
  });
}

export type AdminPeakPricingDto = {
  id: string;
  serviceId: string;
  enabled: boolean;
  /** Legacy single-window columns (nullable, superseded by `windows`). */
  peakStartMinute: number | null;
  peakEndMinute: number | null;
  peakPriceCents: number;
  offPeakPriceCents: number;
  currencyCode: string;
  /** One or more peak windows (clinic-local minute-of-day). */
  windows: Array<{ startMinute: number; endMinute: number }>;
};

export async function fetchAdminServicePeakPricing(id: string) {
  return adminRequest<{ config: AdminPeakPricingDto | null }>(
    `/api/admin/services/${id}/peak-pricing`,
  );
}

export async function putAdminServicePeakPricing(id: string, body: unknown) {
  return adminRequest<{ config: AdminPeakPricingDto }>(
    `/api/admin/services/${id}/peak-pricing`,
    { method: "PUT", body },
  );
}

export async function purgeAdminService(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/services/${id}/purge`, {
    method: "DELETE",
  });
}

// ─── Service FAQ admin API ────────────────────────────────────────────────────

export type AdminServiceFaqDto = {
  id: string;
  serviceId: string;
  question: string;
  answer: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function fetchAdminServiceFaqs(serviceId: string) {
  return adminRequest<{ faqs: AdminServiceFaqDto[] }>(
    `/api/admin/services/${serviceId}/faqs`,
  );
}

export async function createAdminServiceFaq(
  serviceId: string,
  body: { question: string; answer: string; isVisible?: boolean },
) {
  return adminRequest<{ faq: AdminServiceFaqDto }>(
    `/api/admin/services/${serviceId}/faqs`,
    { method: "POST", body },
  );
}

export async function updateAdminServiceFaq(
  serviceId: string,
  faqId: string,
  body: { question?: string; answer?: string; sortOrder?: number; isVisible?: boolean },
) {
  return adminRequest<{ faq: AdminServiceFaqDto }>(
    `/api/admin/services/${serviceId}/faqs/${faqId}`,
    { method: "PATCH", body },
  );
}

export async function deleteAdminServiceFaq(serviceId: string, faqId: string) {
  return adminRequest<Record<string, never>>(
    `/api/admin/services/${serviceId}/faqs/${faqId}`,
    { method: "DELETE" },
  );
}

export async function reorderAdminServiceFaqs(serviceId: string, orderedIds: string[]) {
  return adminRequest<{ faqs: AdminServiceFaqDto[] }>(
    `/api/admin/services/${serviceId}/faqs/reorder`,
    { method: "PATCH", body: { orderedIds } },
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

/** Is this doctor the featured one for its country? (drives the toggle). */
export async function fetchAdminDoctorFeatured(id: string) {
  return adminRequest<{ featured: boolean }>(
    `/api/admin/doctors/${id}/featured`,
  );
}

/** Set/clear the featured doctor for its country. Setting one featured
 *  replaces the previous one (one featured doctor per country). */
export async function setAdminDoctorFeatured(id: string, featured: boolean) {
  return adminRequest<{ featured: boolean }>(
    `/api/admin/doctors/${id}/featured`,
    { method: "PUT", body: { featured } },
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

/** Audit-log row (append-only). */
export type AdminAuditLogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  ipAddress: string | null;
  actorUserId: string | null;
  actorRole: string | null;
  actor: { fullName: string; email: string; role: string } | null;
  createdAt: string;
};

export async function fetchAdminAuditLog(query?: {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
}) {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.action) params.set("action", query.action);
  if (query?.entityType) params.set("entityType", query.entityType);
  if (query?.entityId) params.set("entityId", query.entityId);
  if (query?.actorUserId) params.set("actorUserId", query.actorUserId);
  const qs = params.toString();
  return adminRequest<{
    items: AdminAuditLogRow[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>(qs ? `/api/admin/audit-log?${qs}` : "/api/admin/audit-log");
}

export type AdminAutomationCatalogItem = {
  key: string;
  name: string;
  flow: string;
  description: string;
  channels: string[];
  maxStages: number;
};

export type AdminAutomationRunRow = {
  id: string;
  automationKey: string;
  automationName: string;
  flow: string;
  orderId: string | null;
  orderNumber: string | null;
  orderEmail: string | null;
  orderPaymentStatus: string | null;
  orderStatus: string | null;
  appointmentId: string | null;
  status: string;
  channel: string | null;
  recipient: string | null;
  summary: string | null;
  error: string | null;
  scheduledFor: string | null;
  executedAt: string | null;
  createdAt: string;
};

export async function fetchAdminAutomationCatalog() {
  return adminRequest<{ items: AdminAutomationCatalogItem[] }>("/api/admin/automation/catalog");
}

export async function fetchAdminAutomationRuns(query?: {
  page?: number;
  pageSize?: number;
  automationKey?: string;
  orderId?: string;
}) {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.automationKey) params.set("automationKey", query.automationKey);
  if (query?.orderId) params.set("orderId", query.orderId);
  const qs = params.toString();
  return adminRequest<{
    items: AdminAutomationRunRow[];
    total: number;
    page: number;
    pageSize: number;
  }>(qs ? `/api/admin/automation/runs?${qs}` : "/api/admin/automation/runs");
}

/** Per-appointment doctor ↔ admin notes (NOT patient-visible). */
export type AdminInternalMessage = {
  id: string;
  authorRole: "DOCTOR" | "ADMIN";
  authorName: string;
  body: string;
  createdAt: string;
};

export async function fetchAdminInternalMessages(appointmentId: string) {
  return adminRequest<{ items: AdminInternalMessage[] }>(
    `/api/admin/appointments/${appointmentId}/internal-messages`,
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
    specialty: { id: string; name: string; slug: string } | null;
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
) {
  return adminRequest<{ assignment: AdminDoctorServiceAssignmentDto }>(
    `/api/admin/doctors/${doctorId}/services`,
    { method: "POST", body: { serviceId } },
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

export async function adminRemoveDoctorService(
  doctorId: string,
  serviceDoctorId: string,
) {
  return adminRequest<Record<string, never>>(
    `/api/admin/doctors/${doctorId}/services/${serviceDoctorId}`,
    { method: "DELETE" },
  );
}

export async function purgeAdminDoctor(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/doctors/${id}/purge`, {
    method: "DELETE",
  });
}

// ── Admin users (patients + admin accounts) ─────────────────────────────

export type AdminUserRole = "PATIENT" | "ADMIN" | "DOCTOR";

export type AdminUserDto = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: AdminUserRole;
  isActive: boolean;
  /** When set, this user logs in as a clinician and sees /doctor/*
   *  scoped to this Doctor profile id. Set role=DOCTOR + assign
   *  doctorId via the admin user detail page. */
  doctorId: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AdminUsersListPayload = {
  items: AdminUserDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminUserDetailPayload = {
  user: AdminUserDto;
  stats: { appointmentCount: number };
};

export async function fetchAdminUsers(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/users?${qs}` : "/api/admin/users";
  return adminRequest<AdminUsersListPayload>(path);
}

export const fetchAdminUserById = cache(async (id: string) => {
  return adminRequest<AdminUserDetailPayload>(`/api/admin/users/${id}`);
});

export async function patchAdminUser(
  id: string,
  body: { isActive?: boolean; role?: AdminUserRole; doctorId?: string | null },
) {
  return adminRequest<{ user: AdminUserDto }>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function resetAdminUserPassword(id: string, password: string) {
  return adminRequest<{ reset: true }>(
    `/api/admin/users/${id}/reset-password`,
    { method: "POST", body: { password } },
  );
}

export type VerificationStatus = "NOT_VERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export type AdminPatientProfileDto = {
  id: string;
  email: string;
  userId: string | null;
  fullName: string | null;
  globalHealthNumber: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  weightKg: number | null;
  heightM: number | null;
  bmi: number | null;
  bloodType: string | null;
  allergies: string[];
  chronicDiseases: string[];
  familyHistory: string[];
  socialHabits: string[];
  surgeries: string[];
  nationalIdNumber: string | null;
  taxIdNumber: string | null;
  passportNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressCountryCode: string | null;
  preferredPharmacy: string | null;
  statusAlert: string | null;
  clinicAlert: string | null;
  pricingPlanId: string | null;
  idVerificationStatus: VerificationStatus;
  phoneVerificationStatus: VerificationStatus;
  emailVerificationStatus: VerificationStatus;
  insuranceDocumentStatus: VerificationStatus;
  idDocumentKey: string | null;
  idDocumentType: string | null;
  insuranceProviderName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPatientSearchItem = {
  id: string;
  email: string;
  fullName: string | null;
  globalHealthNumber: string | null;
  idVerificationStatus: VerificationStatus;
  emailVerificationStatus: VerificationStatus;
  phoneVerificationStatus: VerificationStatus;
  createdAt: string;
};

export type AdminPatientNationalityDoc = {
  id: string;
  slotNumber: 1 | 2;
  nationalityCountry: string;
  documentType: string;
  documentNumber: string | null;
  expiryDate: string | null;
  verificationStatus: VerificationStatus;
  adminNotes: string | null;
  createdAt: string;
};

export type AdminPatientConsentItem = {
  consentType: string;
  label: string;
  description: string;
  consentValue: boolean | null;
  consentVersion: string | null;
  lastUpdatedAt: string | null;
};

export type AdminPatientConsentHistoryItem = {
  id: string;
  consentType: string;
  consentValue: boolean;
  consentVersion: string | null;
  source: string | null;
  createdAt: string;
};

export type AdminPatientAccessLogItem = {
  id: string;
  accessedByName: string | null;
  accessedByRole: string;
  accessedResourceType: string;
  accessAction: string;
  accessReason: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export type AdminPatientPaymentItem = {
  id: string;
  appointmentId: string;
  serviceName: string | null;
  doctorName: string | null;
  status: string;
  amountCents: number;
  currencyCode: string;
  eventType: string;
  bookedAt: string;
  paidAt: string;
};

export const fetchAdminPatientProfile = cache(async (email: string) => {
  return adminRequest<{ profile: AdminPatientProfileDto | null }>(
    `/api/admin/patients/${encodeURIComponent(email)}/profile`,
  );
});

export async function patchAdminPatientProfile(
  email: string,
  body: Partial<
    Pick<
      AdminPatientProfileDto,
      | "fullName"
      | "phone"
      | "dateOfBirth"
      | "weightKg"
      | "heightM"
      | "bmi"
      | "bloodType"
      | "allergies"
      | "chronicDiseases"
      | "familyHistory"
      | "socialHabits"
      | "surgeries"
      | "nationalIdNumber"
      | "taxIdNumber"
      | "passportNumber"
      | "addressLine1"
      | "addressLine2"
      | "addressCity"
      | "addressPostalCode"
      | "addressCountryCode"
      | "preferredPharmacy"
      | "statusAlert"
      | "clinicAlert"
      | "pricingPlanId"
    >
  >,
) {
  return adminRequest<{ profile: AdminPatientProfileDto | null }>(
    `/api/admin/patients/${encodeURIComponent(email)}/profile`,
    { method: "PATCH", body },
  );
}

export async function fetchAdminPatients(query: { ghn?: string; email?: string; page?: string; pageSize?: string }) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params.set(k, v);
  }
  return adminRequest<{
    items: AdminPatientSearchItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>(`/api/admin/patients/search?${params.toString()}`);
}

export const fetchAdminPatientNationality = cache(async (email: string) => {
  return adminRequest<{ nationalityDocuments: AdminPatientNationalityDoc[] }>(
    `/api/admin/patients/${encodeURIComponent(email)}/nationality`,
  );
});

export const fetchAdminPatientConsents = cache(async (email: string) => {
  return adminRequest<{
    consents: AdminPatientConsentItem[];
    history: AdminPatientConsentHistoryItem[];
  }>(`/api/admin/patients/${encodeURIComponent(email)}/consents`);
});

export const fetchAdminPatientAccessLog = cache(async (email: string) => {
  return adminRequest<{ logs: AdminPatientAccessLogItem[]; pagination: { total: number } }>(
    `/api/admin/patients/${encodeURIComponent(email)}/access-log?limit=50`,
  );
});

export const fetchAdminPatientPayments = cache(async (email: string) => {
  return adminRequest<{ items: AdminPatientPaymentItem[]; total: number }>(
    `/api/admin/patients/${encodeURIComponent(email)}/payments`,
  );
});

export type AdminHealthTestExtraSectionDto = {
  heading: string;
  body: string;
};

export type AdminHealthTestTranslationDto = {
  id: string;
  locale: string;
  title: string;
  shortDescription: string | null;
  sampleType: string | null;
  resultsTimeline: string | null;
  heroButtonLabel: string | null;
  detailIntro: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type AdminHealthTestDto = {
  id: string;
  countryId: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  priceCents: number;
  currencyCode: string;
  productImagePath: string;
  galleryImagePaths: string[];
  sampleType: string | null;
  resultsTimeline: string | null;
  heroButtonLabel: string | null;
  detailIntro: string | null;
  whatThisTestCovers: string[];
  whyGetTested: string[];
  extraSections: AdminHealthTestExtraSectionDto[] | null;
  sortOrder: number;
  isActive: boolean;
  /** null = unlimited inventory; 0 = sold out; 1–5 surfaces a
   *  "Only N left" badge on the public card. */
  stock: number | null;
  /** Shipping fee charged per kit at checkout (cents). 0 = free. */
  shippingCents: number;
  seoTitle: string | null;
  seoDescription: string | null;
  legacyPath: string | null;
  /** Per-locale CMS content for the translation tabs. */
  translations: AdminHealthTestTranslationDto[];
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; name: string };
};

type AdminHealthTestsListPayload = {
  items: AdminHealthTestDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminHealthTestDetailPayload = {
  healthTest: AdminHealthTestDto;
};

export async function fetchAdminHealthTests(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/health-tests?${qs}` : "/api/admin/health-tests";
  return adminRequest<AdminHealthTestsListPayload>(path);
}

export const fetchAdminHealthTestById = cache(async (id: string) => {
  return adminRequest<AdminHealthTestDetailPayload>(`/api/admin/health-tests/${id}`);
});

export async function postAdminHealthTest(body: unknown) {
  return adminRequest<AdminHealthTestDetailPayload>("/api/admin/health-tests", {
    method: "POST",
    body,
  });
}

export async function patchAdminHealthTest(id: string, body: unknown) {
  return adminRequest<AdminHealthTestDetailPayload>(`/api/admin/health-tests/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminHealthTest(id: string) {
  return adminRequest<AdminHealthTestDetailPayload>(`/api/admin/health-tests/${id}`, {
    method: "DELETE",
  });
}

export async function purgeAdminHealthTest(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/health-tests/${id}/purge`, {
    method: "DELETE",
  });
}

export type AdminAssetKind = "IMAGE" | "ICON" | "LOGO" | "BADGE" | "SOCIAL";

export type AdminAssetDto = {
  id: string;
  countryId: string | null;
  doctorId: string | null;
  kind: AdminAssetKind;
  key: string;
  path: string;
  altText: string | null;
  usageNote: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; name: string } | null;
  doctor: { id: string; fullName: string; slug: string } | null;
};

type AdminAssetsListPayload = {
  items: AdminAssetDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminAssetDetailPayload = {
  asset: AdminAssetDto;
};

export async function fetchAdminAssets(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/assets?${qs}` : "/api/admin/assets";
  return adminRequest<AdminAssetsListPayload>(path);
}

export const fetchAdminAssetById = cache(async (id: string) => {
  return adminRequest<AdminAssetDetailPayload>(`/api/admin/assets/${id}`);
});

export async function postAdminAsset(body: unknown) {
  return adminRequest<AdminAssetDetailPayload>("/api/admin/assets", {
    method: "POST",
    body,
  });
}

export async function patchAdminAsset(id: string, body: unknown) {
  return adminRequest<AdminAssetDetailPayload>(`/api/admin/assets/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminAsset(id: string) {
  return adminRequest<AdminAssetDetailPayload>(`/api/admin/assets/${id}`, {
    method: "DELETE",
  });
}

export async function purgeAdminAsset(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/assets/${id}/purge`, {
    method: "DELETE",
  });
}

export function adminAssetPreviewable(kind: AdminAssetKind, path: string): boolean {
  if (kind !== "IMAGE" && kind !== "LOGO") return false;
  return path.startsWith("/") || path.startsWith("https://");
}

export type AdminPageKey =
  | "HOME"
  | "DOCTORS_INDEX"
  | "GENERAL_CONSULTATION"
  | "SPECIALIST_CONSULTATION"
  | "PRESCRIPTIONS"
  | "HEALTH_TESTS";

export type AdminPageLocale = "EN" | "PT" | "ES" | "CS" | "RO" | "DE";

export type AdminPageStatus = "DRAFT" | "PUBLISHED";

export type AdminPageDto = {
  id: string;
  countryId: string;
  pageKey: AdminPageKey;
  locale: AdminPageLocale;
  status: AdminPageStatus;
  title: string;
  body: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageAssetId: string | null;
  heroImagePath: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  ogImageAssetId: string | null;
  ogImagePath: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  lastReviewedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; slug: string; name: string; defaultLocale: AdminPageLocale } | null;
  heroImage: { id: string; kind: string; key: string; path: string; altText: string | null } | null;
  ogImage: { id: string; kind: string; key: string; path: string; altText: string | null } | null;
};

type AdminPagesListPayload = {
  items: AdminPageDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminPageDetailPayload = {
  page: AdminPageDto;
};

export const ADMIN_PAGE_KEY_LABELS: Record<AdminPageKey, string> = {
  HOME: "Home",
  DOCTORS_INDEX: "Doctors index",
  GENERAL_CONSULTATION: "GP consultation",
  SPECIALIST_CONSULTATION: "Specialist consultation",
  PRESCRIPTIONS: "Prescriptions",
  HEALTH_TESTS: "Health tests",
};

export const ADMIN_PAGE_KEYS: AdminPageKey[] = [
  "HOME",
  "DOCTORS_INDEX",
  "GENERAL_CONSULTATION",
  "SPECIALIST_CONSULTATION",
  "PRESCRIPTIONS",
  "HEALTH_TESTS",
];

export async function fetchAdminPages(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/pages?${qs}` : "/api/admin/pages";
  return adminRequest<AdminPagesListPayload>(path);
}

export const fetchAdminPageById = cache(async (id: string) => {
  return adminRequest<AdminPageDetailPayload>(`/api/admin/pages/${id}`);
});

export async function postAdminPage(body: unknown) {
  return adminRequest<AdminPageDetailPayload>("/api/admin/pages", {
    method: "POST",
    body,
  });
}

export async function patchAdminPage(id: string, body: unknown) {
  return adminRequest<AdminPageDetailPayload>(`/api/admin/pages/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminPage(id: string) {
  return adminRequest<AdminPageDetailPayload>(`/api/admin/pages/${id}`, {
    method: "DELETE",
  });
}

export async function purgeAdminPage(id: string) {
  return adminRequest<{ deleted: true }>(`/api/admin/pages/${id}/purge`, {
    method: "DELETE",
  });
}



/* ─────────────────────────────────────────────────────────────
   Blog posts (admin) — backed by /api/admin/blog
   ───────────────────────────────────────────────────────────── */

export type AdminBlogStatus = "DRAFT" | "PUBLISHED";
export type AdminBlogLocale = "EN" | "PT" | "ES" | "CS" | "RO" | "DE";

export const ADMIN_BLOG_LOCALES: AdminBlogLocale[] = ["EN", "PT", "ES", "CS", "RO", "DE"];

export type BlogTranslationDto = {
  id: string;
  postId: string;
  locale: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlogPostCountryDto = {
  id: string;
  postId: string;
  countryId: string;
  country: { id: string; code: string; name: string };
  createdAt: string;
};

export type AdminBlogDto = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: AdminBlogStatus;
  locale: AdminBlogLocale;
  category: string | null;
  authorDisplayName: string | null;
  reviewerDisplayName: string | null;
  authorDoctorId: string | null;
  reviewerDoctorId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  countryId: string | null;
  publishedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; slug: string; name: string } | null;
  coverAsset: { id: string; path: string; altText: string | null } | null;
  translations: BlogTranslationDto[];
  countries: BlogPostCountryDto[];
};

type AdminBlogListPayload = {
  items: AdminBlogDto[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

type AdminBlogDetailPayload = { post: AdminBlogDto };

export async function fetchAdminBlogPosts(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/blog?${qs}` : "/api/admin/blog";
  return adminRequest<AdminBlogListPayload>(path);
}

export const fetchAdminBlogPostById = cache(async (id: string) => {
  return adminRequest<AdminBlogDetailPayload>(`/api/admin/blog/${id}`);
});

export async function postAdminBlogPost(body: unknown) {
  return adminRequest<AdminBlogDetailPayload>("/api/admin/blog", {
    method: "POST",
    body,
  });
}

export async function patchAdminBlogPost(id: string, body: unknown) {
  return adminRequest<AdminBlogDetailPayload>(`/api/admin/blog/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function purgeAdminBlogPost(id: string) {
  return adminRequest<{ deleted: true }>(`/api/admin/blog/${id}/purge`, {
    method: "DELETE",
  });
}

export async function fetchAdminBlogTranslations(postId: string) {
  return adminRequest<{ translations: BlogTranslationDto[] }>(
    `/api/admin/blog/${postId}/translations`,
  );
}

export async function putAdminBlogTranslation(postId: string, locale: string, body: unknown) {
  return adminRequest<{ translation: BlogTranslationDto }>(
    `/api/admin/blog/${postId}/translations/${locale}`,
    { method: "PUT", body },
  );
}

export async function deleteAdminBlogTranslation(postId: string, locale: string) {
  return adminRequest<Record<string, never>>(
    `/api/admin/blog/${postId}/translations/${locale}`,
    { method: "DELETE" },
  );
}

export async function putAdminBlogPostCountries(postId: string, countryIds: string[]) {
  return adminRequest<Record<string, never>>(
    `/api/admin/blog/${postId}/countries`,
    { method: "PUT", body: { countryIds } },
  );
}

/* ─────────────────────────────────────────────────────────────
   Per-country footer (admin) — backed by /api/admin/countries/:id/footer
   ───────────────────────────────────────────────────────────── */

export type AdminFooterCustomColumn = {
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
};

export type AdminCountryFooterDto = {
  id: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  tagline: string | null;
  contactAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactHours: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  customColumns: AdminFooterCustomColumn[];
  copyrightLine: string | null;
  isActive: boolean;
  updatedAt: string;
};

export type AdminCountryFooterFetchPayload = {
  footer: AdminCountryFooterDto | null;
  country: { id: string; code: string; name: string };
};

export async function fetchAdminCountryFooter(countryId: string) {
  return adminRequest<AdminCountryFooterFetchPayload>(
    `/api/admin/countries/${countryId}/footer`,
  );
}

export async function putAdminCountryFooter(countryId: string, body: unknown) {
  return adminRequest<{ footer: AdminCountryFooterDto }>(
    `/api/admin/countries/${countryId}/footer`,
    { method: "PUT", body },
  );
}

export type NewsletterSubscriberDto = {
  id: string;
  email: string;
  countryCode: string | null;
  locale: string | null;
  source: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

export async function fetchNewsletterSubscribers() {
  return adminRequest<{ items: NewsletterSubscriberDto[] }>(
    "/api/admin/newsletter",
  );
}
