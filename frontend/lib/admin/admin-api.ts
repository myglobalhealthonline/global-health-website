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
  if (raw === undefined) return process.env.NODE_ENV !== "production";
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
    createdAt: string;
    updatedAt: string;
  };
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
  createdAt: string;
  updatedAt: string;
  currency: AdminCurrencyDto;
  countryLocales: AdminCountryLocaleDto[];
  domains: AdminCountryDomainDto[];
  /** Per-country booking-intake settings. `null` if no row yet — admin
   *  upserts on first edit; schema defaults apply otherwise. */
  bookingSetting: AdminBookingSettingDto | null;
};

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
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
  },
): Promise<AdminApiResponse<T>> {
  const allCookies = (await cookies()).getAll();
  const validCookies = allCookies.filter((entry) => VALID_COOKIE_NAME.test(entry.name));
  if (validCookies.length !== allCookies.length) {
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

export async function patchAdminAppointmentStatus(id: string, status: string) {
  return adminRequest<AdminAppointmentDetailPayload>(`/api/admin/appointments/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

/** Set/clear the call slot + meeting URL. Each field is independently
 *  optional; omitting one leaves the existing value alone. */
export async function patchAdminAppointmentSchedule(
  id: string,
  input: { scheduledAt?: string | null; meetingUrl?: string | null },
) {
  // Response includes `emailed: boolean` — true when the schedule email
  // actually fired (changed values + both fields set). Used to tailor the
  // admin success toast.
  return adminRequest<AdminAppointmentDetailPayload & { emailed?: boolean }>(
    `/api/admin/appointments/${id}/schedule`,
    { method: "PATCH", body: input },
  );
}

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

export type AdminServiceDto = {
  id: string;
  countryId: string;
  specialtyId: string | null;
  kind: AdminServiceKind;
  slug: string;
  name: string;
  summary: string | null;
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

export async function purgeAdminService(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/services/${id}/purge`, {
    method: "DELETE",
  });
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

export type AdminDoctorDto = {
  id: string;
  countryId: string;
  slug: string;
  fullName: string;
  title: string;
  bio: string | null;
  imcRegistration: string | null;
  medicalRegistrationUrl: string | null;
  qualifications: string[];
  whatsappNumber: string | null;
  languages: string[];
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
  assets: AdminDoctorAssetDto[];
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

export type AdminHealthTestExtraSectionDto = {
  heading: string;
  body: string;
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
  seoTitle: string | null;
  seoDescription: string | null;
  legacyPath: string | null;
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


